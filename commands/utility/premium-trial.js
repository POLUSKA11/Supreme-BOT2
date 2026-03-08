const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage.js');
const { query } = require('../../utils/db');

const ADMIN_USER_ID = '982731220913913856';
const TRIAL_DAYS = parseInt(process.env.PREMIUM_TRIAL_DAYS || '3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium-trial')
        .setDescription('Start or manage premium trials for servers')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription(`Start a ${TRIAL_DAYS}-day free premium trial for this server`)
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Check the premium/trial status of this server')
        )
        .addSubcommand(sub =>
            sub.setName('grant')
                .setDescription('[Admin] Grant premium trial to any server')
                .addStringOption(opt =>
                    opt.setName('guild_id')
                        .setDescription('The server ID to grant premium to')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('days')
                        .setDescription('Number of days (default: 3)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(365)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // ─── /premium-trial status ─────────────────────────────
        if (sub === 'status') {
            await interaction.deferReply({ ephemeral: true });
            const guildId = interaction.guild.id;
            const premiumData = storage.get(guildId, 'premium');
            const isPremium = premiumData && premiumData.expiresAt && Date.now() < premiumData.expiresAt;

            let trialUsed = false;
            try {
                const rows = await query('SELECT * FROM premium_trials WHERE guild_id = ?', [guildId]);
                trialUsed = rows && rows.length > 0;
            } catch {}

            const embed = new EmbedBuilder()
                .setTitle('👑 Premium Status')
                .setColor(isPremium ? 0xF59E0B : 0x6B7280)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: 'Server', value: interaction.guild.name, inline: true },
                    { name: 'Status', value: isPremium ? '✅ Active' : '❌ Inactive', inline: true },
                    {
                        name: 'Plan',
                        value: isPremium ? `**${premiumData.plan?.toUpperCase() || 'PRO'}**` : 'Free',
                        inline: true,
                    },
                    {
                        name: 'Expires',
                        value: isPremium
                            ? `<t:${Math.floor(premiumData.expiresAt / 1000)}:F>`
                            : 'N/A',
                        inline: true,
                    },
                    {
                        name: 'Trial Available',
                        value: !trialUsed && !isPremium ? `✅ Yes (${TRIAL_DAYS} days)` : '❌ Used',
                        inline: true,
                    },
                    {
                        name: 'Payment Method',
                        value: isPremium ? (premiumData.paymentMethod?.replace(/_/g, ' ') || 'admin') : 'N/A',
                        inline: true,
                    }
                )
                .setFooter({ text: 'Visit the dashboard to upgrade your plan' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ─── /premium-trial start ──────────────────────────────
        if (sub === 'start') {
            await interaction.deferReply({ ephemeral: true });
            const guildId = interaction.guild.id;
            const userId  = interaction.user.id;

            // Check if user has Manage Guild permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.editReply({
                    content: '❌ You need the **Manage Server** permission to start a premium trial.',
                });
            }

            // Check if already premium
            const premiumData = storage.get(guildId, 'premium');
            if (premiumData && premiumData.expiresAt && Date.now() < premiumData.expiresAt) {
                return interaction.editReply({
                    content: `❌ This server already has an active **${premiumData.plan?.toUpperCase()}** subscription.\nExpires: <t:${Math.floor(premiumData.expiresAt / 1000)}:F>`,
                });
            }

            // Check if trial already used
            try {
                const rows = await query('SELECT * FROM premium_trials WHERE guild_id = ?', [guildId]);
                if (rows && rows.length > 0) {
                    return interaction.editReply({
                        content: '❌ This server has already used its free trial. Please upgrade via the dashboard.',
                    });
                }
            } catch (err) {
                console.error('[TRIAL CMD] DB check error:', err.message);
            }

            // Activate trial
            try {
                const expiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
                await query(
                    'INSERT INTO premium_trials (guild_id, user_id, expires_at) VALUES (?, ?, ?)',
                    [guildId, userId, expiresAt]
                );

                const premiumRecord = {
                    plan:          'pro',
                    paymentMethod: 'trial',
                    transactionId: `trial_${guildId}_${Date.now()}`,
                    activatedBy:   userId,
                    activatedAt:   Date.now(),
                    expiresAt:     expiresAt.getTime(),
                };
                await storage.set(guildId, 'premium', premiumRecord);

                await query(
                    `INSERT INTO premium_subscriptions
                        (guild_id, plan, payment_method, transaction_id, activated_at, expires_at, user_id)
                     VALUES (?, ?, ?, ?, NOW(), ?, ?)
                     ON DUPLICATE KEY UPDATE
                        plan = VALUES(plan),
                        payment_method = VALUES(payment_method),
                        transaction_id = VALUES(transaction_id),
                        activated_at = NOW(),
                        expires_at = VALUES(expires_at),
                        user_id = VALUES(user_id)`,
                    [guildId, 'pro', 'trial', premiumRecord.transactionId, expiresAt, userId]
                );

                const embed = new EmbedBuilder()
                    .setTitle('🎉 Free Trial Activated!')
                    .setColor(0x22C55E)
                    .setDescription(`Your **${TRIAL_DAYS}-day Pro trial** has been activated for **${interaction.guild.name}**!`)
                    .addFields(
                        { name: '📅 Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                        { name: '⚡ Plan', value: 'Pro', inline: true },
                        { name: '💡 Tip', value: 'Visit the dashboard to explore all premium features!', inline: false }
                    )
                    .setFooter({ text: 'Upgrade to keep premium after the trial ends' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error('[TRIAL CMD] Activation error:', err.message);
                return interaction.editReply({ content: '❌ Failed to activate trial. Please try again.' });
            }
        }

        // ─── /premium-trial grant (Admin only) ────────────────
        if (sub === 'grant') {
            if (interaction.user.id !== ADMIN_USER_ID) {
                return interaction.reply({ content: '❌ This command is restricted to the bot administrator.', ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });
            const targetGuildId = interaction.options.getString('guild_id');
            const days          = interaction.options.getInteger('days') || TRIAL_DAYS;

            try {
                const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                const premiumRecord = {
                    plan:          'pro',
                    paymentMethod: 'admin_trial',
                    transactionId: `admin_trial_${targetGuildId}_${Date.now()}`,
                    activatedBy:   interaction.user.id,
                    activatedAt:   Date.now(),
                    expiresAt:     expiresAt.getTime(),
                };
                await storage.set(targetGuildId, 'premium', premiumRecord);
                await query(
                    `INSERT INTO premium_subscriptions
                        (guild_id, plan, payment_method, transaction_id, activated_at, expires_at, granted_by)
                     VALUES (?, ?, ?, ?, NOW(), ?, ?)
                     ON DUPLICATE KEY UPDATE
                        plan = VALUES(plan),
                        payment_method = VALUES(payment_method),
                        transaction_id = VALUES(transaction_id),
                        activated_at = NOW(),
                        expires_at = VALUES(expires_at),
                        granted_by = VALUES(granted_by)`,
                    [targetGuildId, 'pro', 'admin_trial', premiumRecord.transactionId, expiresAt, interaction.user.id]
                );

                const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
                const guildName   = targetGuild?.name || targetGuildId;

                const embed = new EmbedBuilder()
                    .setTitle('✅ Premium Trial Granted')
                    .setColor(0xF59E0B)
                    .addFields(
                        { name: 'Server', value: guildName, inline: true },
                        { name: 'Days', value: `${days}`, inline: true },
                        { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                        { name: 'Granted By', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error('[TRIAL CMD] Grant error:', err.message);
                return interaction.editReply({ content: `❌ Failed to grant premium: ${err.message}` });
            }
        }
    },
};

/**
 * /level-config — Admin command to configure the leveling system.
 * Subcommands:
 *   set-role       — Assign a role reward for a specific level
 *   remove-role    — Remove a role reward for a specific level
 *   list-roles     — List all configured role rewards
 *   set-channel    — Set the level-up announcement channel
 *   toggle         — Enable or disable the leveling system
 *   ignore-channel — Ignore a channel (no XP granted there)
 *   unignore-channel — Remove a channel from the ignore list
 *   reset-user     — Reset a user's XP and level
 *   add-xp         — Manually add XP to a user
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const levelSystem = require('../../utils/levelSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level-config')
        .setDescription('Configure the leveling system (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        // ── set-role ──────────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('set-role')
               .setDescription('Assign a role reward when a member reaches a specific level')
               .addIntegerOption(opt =>
                   opt.setName('level').setDescription('Level required').setMinValue(1).setRequired(true)
               )
               .addRoleOption(opt =>
                   opt.setName('role').setDescription('Role to assign').setRequired(true)
               )
        )

        // ── remove-role ───────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('remove-role')
               .setDescription('Remove a role reward for a specific level')
               .addIntegerOption(opt =>
                   opt.setName('level').setDescription('Level to remove reward from').setMinValue(1).setRequired(true)
               )
        )

        // ── list-roles ────────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('list-roles')
               .setDescription('List all configured level role rewards')
        )

        // ── set-channel ───────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('set-channel')
               .setDescription('Set the channel where level-up messages are sent')
               .addChannelOption(opt =>
                   opt.setName('channel').setDescription('Announcement channel').setRequired(true)
               )
        )

        // ── toggle ────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('toggle')
               .setDescription('Enable or disable the leveling system')
               .addStringOption(opt =>
                   opt.setName('state')
                      .setDescription('Enable or disable')
                      .addChoices(
                          { name: 'Enable', value: 'enable' },
                          { name: 'Disable', value: 'disable' }
                      )
                      .setRequired(true)
               )
        )

        // ── ignore-channel ────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('ignore-channel')
               .setDescription('Ignore a channel so messages there earn no XP')
               .addChannelOption(opt =>
                   opt.setName('channel').setDescription('Channel to ignore').setRequired(true)
               )
        )

        // ── unignore-channel ──────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('unignore-channel')
               .setDescription('Remove a channel from the ignore list')
               .addChannelOption(opt =>
                   opt.setName('channel').setDescription('Channel to unignore').setRequired(true)
               )
        )

        // ── reset-user ────────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('reset-user')
               .setDescription('Reset a user\'s XP and level to 0')
               .addUserOption(opt =>
                   opt.setName('user').setDescription('User to reset').setRequired(true)
               )
        )

        // ── add-xp ────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('add-xp')
               .setDescription('Manually add XP to a user')
               .addUserOption(opt =>
                   opt.setName('user').setDescription('Target user').setRequired(true)
               )
               .addIntegerOption(opt =>
                   opt.setName('amount').setDescription('XP amount to add').setMinValue(1).setRequired(true)
               )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const { guild } = interaction;

        // ── set-role ──────────────────────────────────────────────
        if (sub === 'set-role') {
            const level = interaction.options.getInteger('level');
            const role  = interaction.options.getRole('role');

            if (role.managed) {
                return interaction.editReply({ content: '❌ Cannot assign bot-managed roles as rewards.' });
            }

            await levelSystem.setLevelRole(guild.id, level, role.id);
            return interaction.editReply({
                embeds: [successEmbed(`✅ Role Reward Set`, `Members who reach **Level ${level}** will now receive the <@&${role.id}> role.`)]
            });
        }

        // ── remove-role ───────────────────────────────────────────
        if (sub === 'remove-role') {
            const level = interaction.options.getInteger('level');
            await levelSystem.removeLevelRole(guild.id, level);
            return interaction.editReply({
                embeds: [successEmbed(`✅ Role Reward Removed`, `Removed the role reward for **Level ${level}**.`)]
            });
        }

        // ── list-roles ────────────────────────────────────────────
        if (sub === 'list-roles') {
            const roles = await levelSystem.getLevelRoles(guild.id);
            if (roles.length === 0) {
                return interaction.editReply({ content: '📭 No level role rewards configured yet. Use `/level-config set-role` to add some!' });
            }

            const lines = roles.map(r => {
                const role = guild.roles.cache.get(r.role_id);
                return `**Level ${r.level}** → ${role ? `<@&${role.id}>` : `~~Deleted Role (${r.role_id})~~`}`;
            });

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🏆 Level Role Rewards')
                .setDescription(lines.join('\n'))
                .setFooter({ text: 'Nexus Leveling System', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── set-channel ───────────────────────────────────────────
        if (sub === 'set-channel') {
            const channel = interaction.options.getChannel('channel');
            await levelSystem.setConfig(guild.id, 'announce_channel', channel.id);
            return interaction.editReply({
                embeds: [successEmbed('✅ Announcement Channel Set', `Level-up messages will now be sent to <#${channel.id}>.`)]
            });
        }

        // ── toggle ────────────────────────────────────────────────
        if (sub === 'toggle') {
            const state = interaction.options.getString('state');
            await levelSystem.setConfig(guild.id, 'enabled', state === 'enable' ? '1' : '0');
            return interaction.editReply({
                embeds: [successEmbed(
                    state === 'enable' ? '✅ Leveling Enabled' : '⛔ Leveling Disabled',
                    state === 'enable'
                        ? 'The leveling system is now **active**. Members will earn XP for messages, links, and images.'
                        : 'The leveling system is now **disabled**. No XP will be awarded.'
                )]
            });
        }

        // ── ignore-channel ────────────────────────────────────────
        if (sub === 'ignore-channel') {
            const channel = interaction.options.getChannel('channel');
            const current = (await levelSystem.getConfig(guild.id, 'ignored_channels', ''))
                .split(',').filter(Boolean);

            if (!current.includes(channel.id)) {
                current.push(channel.id);
                await levelSystem.setConfig(guild.id, 'ignored_channels', current.join(','));
            }

            return interaction.editReply({
                embeds: [successEmbed('✅ Channel Ignored', `Messages in <#${channel.id}> will no longer earn XP.`)]
            });
        }

        // ── unignore-channel ──────────────────────────────────────
        if (sub === 'unignore-channel') {
            const channel = interaction.options.getChannel('channel');
            const current = (await levelSystem.getConfig(guild.id, 'ignored_channels', ''))
                .split(',').filter(id => id && id !== channel.id);

            await levelSystem.setConfig(guild.id, 'ignored_channels', current.join(','));

            return interaction.editReply({
                embeds: [successEmbed('✅ Channel Unignored', `Messages in <#${channel.id}> will now earn XP again.`)]
            });
        }

        // ── reset-user ────────────────────────────────────────────
        if (sub === 'reset-user') {
            const user = interaction.options.getUser('user');
            const { query } = require('../../utils/db');
            await query(
                'DELETE FROM levels WHERE guild_id = ? AND user_id = ?',
                [guild.id, user.id]
            );
            return interaction.editReply({
                embeds: [successEmbed('✅ User Reset', `<@${user.id}>'s XP and level have been reset to **0**.`)]
            });
        }

        // ── add-xp ────────────────────────────────────────────────
        if (sub === 'add-xp') {
            const user   = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            const userData = await levelSystem.getUserData(guild.id, user.id);
            const newXp = userData.xp + amount;
            const { level: newLevel } = levelSystem.getLevelFromXp(newXp);

            const { query } = require('../../utils/db');
            await query(`
                INSERT INTO levels (guild_id, user_id, xp, level, messages, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    xp = VALUES(xp), level = VALUES(level), updated_at = VALUES(updated_at)
            `, [guild.id, user.id, newXp, newLevel, userData.messages, Date.now()]);

            return interaction.editReply({
                embeds: [successEmbed(
                    '✅ XP Added',
                    `Added **+${amount} XP** to <@${user.id}>.\nThey are now at **Level ${newLevel}** with **${newXp.toLocaleString()} XP**.`
                )]
            });
        }
    }
};

function successEmbed(title, description) {
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

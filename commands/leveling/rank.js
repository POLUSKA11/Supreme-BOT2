/**
 * ============================================================
 *  NEXUS BOT 2 — /rank
 *  Show your current level, XP, and rank on the leaderboard.
 *  Now displays a beautiful visual rank card image!
 * ============================================================
 */
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const levelSystem          = require('../../utils/levelSystem');
const { generateRankCard } = require('../../utils/rankCardGenerator');

// Level milestone colors
const LEVEL_COLORS = [
    '#00FFFF', '#00FF88', '#FFAA00', '#FF5500',
    '#FF0055', '#AA00FF', '#0088FF', '#FF00AA', '#FFFFFF', '#FFD700',
];

function getLevelColor(level) {
    return LEVEL_COLORS[Math.min(Math.floor(level / 10), 9)];
}

async function getCardSettings(guildId, userId) {
    const raw = await levelSystem.getConfig(guildId, `card_settings_${userId}`, null);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your current level and XP progress')
        .addUserOption(opt =>
            opt.setName('user')
               .setDescription('The user to check (defaults to yourself)')
               .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const target  = interaction.options.getUser('user') || interaction.user;
        const { guild } = interaction;

        const userData = await levelSystem.getUserData(guild.id, target.id);
        const { level, currentXp, xpNeeded } = levelSystem.getLevelFromXp(userData.xp);

        // Rank position
        const leaderboard = await levelSystem.getLeaderboard(guild.id, 100);
        const rankPos     = leaderboard.findIndex(u => u.user_id === target.id) + 1;

        // Level color
        const color = getLevelColor(level);

        // Load card settings (use target's settings for their own card)
        const cardSettings = await getCardSettings(guild.id, target.id);
        if (!cardSettings.mainColor) cardSettings.mainColor = color;

        // Find current and next reward roles
        const levelRoles    = await levelSystem.getLevelRoles(guild.id);
        const currentReward = levelRoles.filter(r => r.level <= level).pop();
        const nextReward    = levelRoles.find(r => r.level > level);

        // ── Generate rank card image ──────────────────────────
        let cardAttachment = null;
        try {
            const cardBuf = await generateRankCard({
                username:    target.username,
                avatarUrl:   target.displayAvatarURL({ extension: 'png', size: 256 }),
                level,
                rank:        rankPos,
                currentXp,
                xpNeeded,
                totalXp:     userData.xp,
                cardSettings,
            });
            cardAttachment = new AttachmentBuilder(cardBuf, { name: 'rank-card.png' });
        } catch (err) {
            console.error('[RANK CMD] Card generation error:', err.message);
        }

        // ── Build embed ───────────────────────────────────────
        const embed = new EmbedBuilder()
            .setColor(cardSettings.mainColor || color)
            .setAuthor({
                name:    `${target.username}'s Rank Card`,
                iconURL: target.displayAvatarURL({ dynamic: true }),
            })
            .addFields(
                { name: '🏅 Level',    value: `**${level}**`,                                     inline: true },
                { name: '⭐ Total XP', value: `**${userData.xp.toLocaleString()} XP**`,           inline: true },
                { name: '📊 Rank',     value: rankPos > 0 ? `**#${rankPos}**` : '**Unranked**',   inline: true },
                { name: '💬 Messages', value: `**${userData.messages.toLocaleString()}**`,         inline: true },
                {
                    name:  `Progress to Level ${level + 1}`,
                    value: `\`${currentXp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP\``,
                    inline: false,
                }
            );

        if (currentReward) {
            const role = guild.roles.cache.get(currentReward.role_id);
            if (role) embed.addFields({ name: '🏆 Current Role Reward', value: `<@&${role.id}>`, inline: true });
        }

        if (nextReward) {
            const role = guild.roles.cache.get(nextReward.role_id);
            if (role) embed.addFields({
                name:  '🎯 Next Reward',
                value: `<@&${role.id}> at Level **${nextReward.level}**`,
                inline: true,
            });
        }

        embed
            .setFooter({
                text:    'Nexus Leveling System • Use /rank-card to customize your card',
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setTimestamp();

        if (cardAttachment) {
            embed.setImage('attachment://rank-card.png');
        }

        const replyOptions = { embeds: [embed] };
        if (cardAttachment) replyOptions.files = [cardAttachment];

        await interaction.editReply(replyOptions);
    },
};

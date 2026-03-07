/**
 * ============================================================
 *  NEXUS BOT 2 — /rank
 *  Show your current level, XP, and rank on the leaderboard.
 *  Displays only the beautiful visual rank card image!
 * ============================================================
 */
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const levelSystem          = require('../../utils/levelSystem');
const { generateRankCard } = require('../../utils/rankCardGenerator');

async function getCardSettings(guildId, userId) {
    function parseSettings(raw) {
        try {
            const s = JSON.parse(raw);
            // Normalize backgroundImage: treat empty string as null
            if (s.backgroundImage === '') s.backgroundImage = null;
            return s;
        } catch (e) { return null; }
    }

    // 1. Try to get user-specific settings
    const userRaw = await levelSystem.getConfig(guildId, `card_settings_${userId}`, null);
    if (userRaw) {
        const parsed = parseSettings(userRaw);
        if (parsed) return parsed;
    }

    // 2. Fallback to server-wide default settings
    const defaultRaw = await levelSystem.getConfig(guildId, 'card_settings_default', null);
    if (defaultRaw) {
        const parsed = parseSettings(defaultRaw);
        if (parsed) return parsed;
    }

    return {};
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

        // Load card settings
        const cardSettings = await getCardSettings(guild.id, target.id);

        // ── Generate rank card image ──────────────────────────
        try {
            const cardBuf = await generateRankCard({
                username:    target.username,
                avatarUrl:   target.displayAvatarURL({ extension: 'png', size: 256 }),
                level,
                rank:        rankPos > 0 ? rankPos : 1,
                currentXp,
                xpNeeded,
                totalXp:     userData.xp,
                cardSettings,
            });
            
            const cardAttachment = new AttachmentBuilder(cardBuf, { name: 'rank-card.png' });
            await interaction.editReply({ files: [cardAttachment] });
        } catch (err) {
            console.error('[RANK CMD] Card generation error:', err.message);
            await interaction.editReply({ content: `**${target.username}** is Level **${level}** with **${userData.xp.toLocaleString()} XP**.` });
        }
    },
};

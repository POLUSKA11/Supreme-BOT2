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
            if (s.backgroundImage === '') s.backgroundImage = null;
            return s;
        } catch (e) { 
            console.error('[RANK] Failed to parse settings:', raw, e);
            return null; 
        }
    }

    try {
        // 1. Load server-wide default settings
        let settings = {};
        const defaultRaw = await levelSystem.getConfig(guildId, 'card_settings_default', null);
        if (defaultRaw) {
            const parsed = parseSettings(defaultRaw);
            if (parsed) settings = { ...parsed };
        }

        // 2. Overlay user-specific settings if they exist
        const userRaw = await levelSystem.getConfig(guildId, `card_settings_${userId}`, null);
        if (userRaw) {
            const parsed = parseSettings(userRaw);
            if (parsed) settings = { ...settings, ...parsed };
        }

        console.log(`[RANK] Final merged settings for user ${userId}:`, settings);
        return settings;
    } catch (err) {
        console.error('[RANK] Error loading card settings:', err);
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

        // 1. Bot check
        if (target.bot) {
            return interaction.editReply({ content: `**${target.username}** is a bot! Bots aren't invited to the super fancy /rank party.` });
        }

        // Explicitly use the current guild's ID to prevent cross-server data leakage
        const currentGuildId = guild.id;
        const userData = await levelSystem.getUserData(currentGuildId, target.id);
        const { level, currentXp, xpNeeded } = levelSystem.getLevelFromXp(userData.xp);

        // 2. Level 1 requirement check
        if (level < 1) {
            return interaction.editReply({ content: `**${target.username}** isn't ranked yet! They need to reach at least **Level 1** to get a rank card.` });
        }

        // Rank position within the current guild
        const leaderboard = await levelSystem.getLeaderboard(currentGuildId, 100);
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
                guildName:   guild.name,
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

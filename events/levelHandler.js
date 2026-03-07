/**
 * ============================================================
 *  NEXUS BOT 2 — Level Handler Event
 *  Hooks into every message to award XP, announce level-ups,
 *  and assign reward roles automatically.
 *  Now includes a beautiful rank card image on level-up!
 * ============================================================
 */

const { Events, AttachmentBuilder } = require('discord.js');
const levelSystem        = require('../utils/levelSystem');
const { generateRankCard } = require('../utils/rankCardGenerator');

// ─── Load card settings for a user ───────────────────────────
async function getCardSettings(guildId, userId) {
    // 1. Try to get user-specific settings
    const userRaw = await levelSystem.getConfig(guildId, `card_settings_${userId}`, null);
    if (userRaw) {
        try { return JSON.parse(userRaw); } catch (e) {}
    }

    // 2. Fallback to server-wide default settings
    const defaultRaw = await levelSystem.getConfig(guildId, 'card_settings_default', null);
    if (defaultRaw) {
        try { return JSON.parse(defaultRaw); } catch (e) {}
    }

    return {};
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Only process guild messages from real users
        if (!message.guild || message.author.bot) return;

        try {
            const result = await levelSystem.processMessage(message);
            if (!result) return; // On cooldown, disabled, or ignored channel

            if (!result.leveledUp) return; // No level-up, nothing to announce

            const { newLevel } = result;
            const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
            if (!member) return;

            // ── 1. Assign Level Roles ─────────────────────────────
            const levelRoles = await levelSystem.getLevelRoles(message.guild.id);

            try {
                const rolesToAdd = levelRoles.filter(r => r.level <= newLevel);
                for (const { role_id } of rolesToAdd) {
                    const role = message.guild.roles.cache.get(role_id);
                    if (role && !member.roles.cache.has(role_id)) {
                        await member.roles.add(role, `Level ${newLevel} reward`).catch(() => null);
                    }
                }
            } catch (roleErr) {
                console.error('[LEVEL] Role assignment error:', roleErr.message);
            }

            // ── 2. Determine Announcement Channel ─────────────────
            const announceChanId = await levelSystem.getConfig(message.guild.id, 'announce_channel', null);
            const announceChannel = announceChanId
                ? (message.guild.channels.cache.get(announceChanId) || message.channel)
                : message.channel;

            // ── 3. Gather data for the rank card ──────────────────
            const { level: _, currentXp, xpNeeded } = levelSystem.getLevelFromXp(result.newXp);
            const leaderboard = await levelSystem.getLeaderboard(message.guild.id, 100);
            const rankPos = leaderboard.findIndex(u => u.user_id === message.author.id) + 1;

            // ── 4. Load user's card customization settings ────────
            const cardSettings = await getCardSettings(message.guild.id, message.author.id);

            // ── 5. Generate the rank card image ───────────────────
            try {
                const cardBuf = await generateRankCard({
                    username:    message.author.username,
                    avatarUrl:   message.author.displayAvatarURL({ extension: 'png', size: 256 }),
                    level:       newLevel,
                    rank:        rankPos > 0 ? rankPos : 1,
                    currentXp,
                    xpNeeded,
                    totalXp:     result.newXp,
                    cardSettings,
                });
                
                const cardAttachment = new AttachmentBuilder(cardBuf, { name: 'level-up-card.png' });
                
                // ── 6. Send simple announcement with image ────────────
                await announceChannel.send({
                    content: `🎉 **Level Up!** <@${message.author.id}> reached Level **${newLevel}**!`,
                    files: [cardAttachment]
                });
            } catch (cardErr) {
                console.error('[LEVEL CARD] Card generation failed:', cardErr.message);
                await announceChannel.send(`🎉 **Level Up!** <@${message.author.id}> reached Level **${newLevel}**!`);
            }

        } catch (err) {
            console.error('[LEVEL HANDLER] Error:', err.message);
        }
    }
};

/**
 * ============================================================
 *  NEXUS BOT 2 — Level Handler Event
 *  Hooks into every message to award XP, announce level-ups,
 *  and assign reward roles automatically.
 *  Now includes a beautiful rank card image on level-up!
 * ============================================================
 */

const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const levelSystem        = require('../utils/levelSystem');
const { generateRankCard } = require('../utils/rankCardGenerator');

// XP type display labels
const XP_TYPE_LABELS = {
    MESSAGE: '💬 Message',
    LINK:    '🔗 Link',
    IMAGE:   '🖼️ Image',
    MIXED:   '🔗🖼️ Link + Image',
};

// Level milestone colors (cycles every 10 levels)
const LEVEL_COLORS = [
    '#00FFFF', // 1-9:   Cyan
    '#00FF88', // 10-19: Green
    '#FFAA00', // 20-29: Gold
    '#FF5500', // 30-39: Orange
    '#FF0055', // 40-49: Red
    '#AA00FF', // 50-59: Purple
    '#0088FF', // 60-69: Blue
    '#FF00AA', // 70-79: Pink
    '#FFFFFF', // 80-89: White
    '#FFD700', // 90+:   Gold
];

function getLevelColor(level) {
    const idx = Math.min(Math.floor(level / 10), LEVEL_COLORS.length - 1);
    return LEVEL_COLORS[idx];
}

// ─── Load card settings for a user ───────────────────────────
async function getCardSettings(guildId, userId) {
    const raw = await levelSystem.getConfig(guildId, `card_settings_${userId}`, null);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
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

            const { newLevel, xpGained, xpType } = result;
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
            const color   = getLevelColor(newLevel);

            // ── 4. Load user's card customization settings ────────
            const cardSettings = await getCardSettings(message.guild.id, message.author.id);

            // If user has a mainColor set, use it; otherwise use level milestone color
            if (!cardSettings.mainColor) {
                cardSettings.mainColor = color;
            }

            // ── 5. Generate the rank card image ───────────────────
            let cardAttachment = null;
            try {
                const cardBuf = await generateRankCard({
                    username:    message.author.username,
                    avatarUrl:   message.author.displayAvatarURL({ extension: 'png', size: 256 }),
                    level:       newLevel,
                    rank:        rankPos,
                    currentXp,
                    xpNeeded,
                    totalXp:     result.newXp,
                    cardSettings,
                });
                cardAttachment = new AttachmentBuilder(cardBuf, { name: 'level-up-card.png' });
            } catch (cardErr) {
                console.error('[LEVEL CARD] Card generation failed:', cardErr.message);
                // Fall through — we'll still send the embed without the card
            }

            // ── 6. Build Level-Up Embed ────────────────────────────
            const nextReward    = levelRoles.find(r => r.level > newLevel);
            const currentReward = levelRoles.filter(r => r.level <= newLevel).pop();

            const embed = new EmbedBuilder()
                .setColor(cardSettings.mainColor || color)
                .setTitle(`🎉 Level Up! ${message.author.username} reached Level ${newLevel}!`)
                .setDescription(
                    `<@${message.author.id}> just leveled up! Keep chatting to reach Level **${newLevel + 1}**! 🚀`
                )
                .addFields(
                    {
                        name: `${XP_TYPE_LABELS[xpType] || '💬 Message'} XP Gained`,
                        value: `**+${xpGained} XP**`,
                        inline: true,
                    },
                    {
                        name: '📊 Progress to Next Level',
                        value: `\`${currentXp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP\``,
                        inline: true,
                    }
                );

            // Show role reward if one was just earned at this exact level
            if (currentReward && levelRoles.find(r => r.level === newLevel)) {
                const rewardRole = message.guild.roles.cache.get(currentReward.role_id);
                if (rewardRole) {
                    embed.addFields({
                        name: '🏆 Role Reward Unlocked!',
                        value: `You earned the <@&${rewardRole.id}> role!`,
                        inline: false,
                    });
                }
            }

            // Show next reward hint
            if (nextReward) {
                const nextRole = message.guild.roles.cache.get(nextReward.role_id);
                if (nextRole) {
                    embed.addFields({
                        name: '🎯 Next Reward',
                        value: `Reach **Level ${nextReward.level}** to earn <@&${nextRole.id}>`,
                        inline: false,
                    });
                }
            }

            embed
                .setFooter({
                    text: `Nexus Leveling System • Total XP: ${result.newXp.toLocaleString()} • Customize on the web dashboard`,
                    iconURL: message.client.user.displayAvatarURL(),
                })
                .setTimestamp();

            // Attach card image as embed image if generated successfully
            if (cardAttachment) {
                embed.setImage('attachment://level-up-card.png');
            }

            // ── 7. Send announcement ──────────────────────────────
            const sendOptions = { embeds: [embed] };
            if (cardAttachment) sendOptions.files = [cardAttachment];

            await announceChannel.send(sendOptions);

        } catch (err) {
            console.error('[LEVEL HANDLER] Error:', err.message);
        }
    }
};

// ─── Progress Bar Builder (kept for legacy use) ───────────────
function buildProgressBar(current, needed, length = 20) {
    const filled = Math.round((current / needed) * length);
    const empty = length - filled;
    const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
    const pct = Math.round((current / needed) * 100);
    return `\`[${bar}]\` **${pct}%**`;
}

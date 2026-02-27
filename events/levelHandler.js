/**
 * ============================================================
 *  NEXUS BOT 2 — Level Handler Event
 *  Hooks into every message to award XP, announce level-ups,
 *  and assign reward roles automatically.
 * ============================================================
 */

const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const levelSystem = require('../utils/levelSystem');

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
            // Fetch level roles once and reuse throughout this handler
            const levelRoles = await levelSystem.getLevelRoles(message.guild.id);

            try {
                const rolesToAdd = levelRoles.filter(r => r.level <= newLevel);

                for (const { role_id } of rolesToAdd) {
                    const role = message.guild.roles.cache.get(role_id);
                    if (role && !member.roles.cache.has(role_id)) {
                        await member.roles.add(role, `Level ${newLevel} reward`).catch(() => null);
                    }
                }

                // Remove roles for levels above current (optional: keep all earned roles)
                // Uncomment below if you want "replace" behavior instead of "stack" behavior:
                // const rolesToRemove = levelRoles.filter(r => r.level > newLevel);
                // for (const { role_id } of rolesToRemove) {
                //     if (member.roles.cache.has(role_id)) {
                //         await member.roles.remove(role_id, 'Level role update').catch(() => null);
                //     }
                // }
            } catch (roleErr) {
                console.error('[LEVEL] Role assignment error:', roleErr.message);
            }

            // ── 2. Determine Announcement Channel ─────────────────
            const announceChanId = await levelSystem.getConfig(message.guild.id, 'announce_channel', null);
            const announceChannel = announceChanId
                ? (message.guild.channels.cache.get(announceChanId) || message.channel)
                : message.channel;

            // ── 3. Build Level-Up Embed ────────────────────────────
            const { level: _, currentXp, xpNeeded } = levelSystem.getLevelFromXp(result.newXp);
            const progressBar = buildProgressBar(currentXp, xpNeeded);
            const color = getLevelColor(newLevel);

            // Reuse the levelRoles already fetched above
            const nextReward = levelRoles.find(r => r.level > newLevel);
            const currentReward = levelRoles.filter(r => r.level <= newLevel).pop();

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({
                    name: `${message.author.username} leveled up!`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true }),
                })
                .setTitle(`🎉 Level ${newLevel} Unlocked!`)
                .setDescription(
                    `<@${message.author.id}> just reached **Level ${newLevel}**! Keep it up! 🚀\n\n` +
                    `${progressBar}`
                )
                .addFields(
                    {
                        name: '📊 Progress',
                        value: `\`${currentXp} / ${xpNeeded} XP\` to Level ${newLevel + 1}`,
                        inline: true,
                    },
                    {
                        name: `${XP_TYPE_LABELS[xpType] || '💬 Message'} XP Gained`,
                        value: `**+${xpGained} XP**`,
                        inline: true,
                    }
                );

            // Show role reward if one was just earned
            if (currentReward && levelRoles.find(r => r.level === newLevel)) {
                const rewardRole = message.guild.roles.cache.get(currentReward.role_id);
                if (rewardRole) {
                    embed.addFields({
                        name: '🏆 Role Reward Unlocked',
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

            embed.setFooter({
                text: `Nexus Leveling System • Total XP: ${result.newXp.toLocaleString()}`,
                iconURL: message.client.user.displayAvatarURL(),
            }).setTimestamp();

            await announceChannel.send({ embeds: [embed] });

        } catch (err) {
            console.error('[LEVEL HANDLER] Error:', err.message);
        }
    }
};

// ─── Progress Bar Builder ─────────────────────────────────────
function buildProgressBar(current, needed, length = 20) {
    const filled = Math.round((current / needed) * length);
    const empty = length - filled;
    const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
    const pct = Math.round((current / needed) * 100);
    return `\`[${bar}]\` **${pct}%**`;
}

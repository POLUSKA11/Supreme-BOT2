/**
 * /rank — Show your current level, XP, and rank on the leaderboard.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelSystem = require('../../utils/levelSystem');

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

        const target = interaction.options.getUser('user') || interaction.user;
        const { guild } = interaction;

        const userData = await levelSystem.getUserData(guild.id, target.id);
        const { level, currentXp, xpNeeded } = levelSystem.getLevelFromXp(userData.xp);

        // Get rank position
        const leaderboard = await levelSystem.getLeaderboard(guild.id, 100);
        const rankPos = leaderboard.findIndex(u => u.user_id === target.id) + 1;

        // Progress bar
        const filled = Math.round((currentXp / xpNeeded) * 20);
        const empty = 20 - filled;
        const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
        const pct = Math.round((currentXp / xpNeeded) * 100);

        // Level color
        const LEVEL_COLORS = [
            '#00FFFF','#00FF88','#FFAA00','#FF5500',
            '#FF0055','#AA00FF','#0088FF','#FF00AA','#FFFFFF','#FFD700'
        ];
        const color = LEVEL_COLORS[Math.min(Math.floor(level / 10), 9)];

        // Find current and next reward roles
        const levelRoles = await levelSystem.getLevelRoles(guild.id);
        const currentReward = levelRoles.filter(r => r.level <= level).pop();
        const nextReward = levelRoles.find(r => r.level > level);

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: `${target.username}'s Rank`,
                iconURL: target.displayAvatarURL({ dynamic: true }),
            })
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🏅 Level',    value: `**${level}**`,                                     inline: true },
                { name: '⭐ Total XP', value: `**${userData.xp.toLocaleString()} XP**`,           inline: true },
                { name: '📊 Rank',     value: rankPos > 0 ? `**#${rankPos}**` : '**Unranked**',   inline: true },
                { name: '💬 Messages', value: `**${userData.messages.toLocaleString()}**`,         inline: true },
                {
                    name: `Progress to Level ${level + 1}`,
                    value: `\`[${bar}]\` **${pct}%**\n\`${currentXp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP\``,
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
                name: '🎯 Next Reward',
                value: `<@&${role.id}> at Level **${nextReward.level}**`,
                inline: true,
            });
        }

        embed
            .setFooter({ text: 'Nexus Leveling System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

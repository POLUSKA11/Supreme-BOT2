/**
 * /leaderboard — Show the top 10 most active members by XP.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelSystem = require('../../utils/levelSystem');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top 10 most active members by XP')
        .addIntegerOption(opt =>
            opt.setName('page')
               .setDescription('Page number (10 users per page)')
               .setMinValue(1)
               .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const page = (interaction.options.getInteger('page') || 1) - 1;
        const limit = 10;
        const offset = page * limit;

        const { guild } = interaction;

        // Fetch top 100 and slice for pagination
        const all = await levelSystem.getLeaderboard(guild.id, 100);
        const slice = all.slice(offset, offset + limit);
        const totalPages = Math.ceil(all.length / limit);

        if (slice.length === 0) {
            return interaction.editReply({ content: '📭 No data yet! Start chatting to earn XP.' });
        }

        // Build leaderboard lines
        const lines = await Promise.all(slice.map(async (entry, i) => {
            const pos = offset + i + 1;
            const medal = MEDALS[pos - 1] || `**${pos}.**`;
            const { level } = levelSystem.getLevelFromXp(entry.xp);

            // Try to get member display name
            let displayName;
            try {
                const member = await guild.members.fetch(entry.user_id).catch(() => null);
                displayName = member ? member.displayName : `<@${entry.user_id}>`;
            } catch {
                displayName = `<@${entry.user_id}>`;
            }

            return `${medal} **${displayName}** — Level **${level}** • ${entry.xp.toLocaleString()} XP`;
        }));

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`🏆 XP Leaderboard — ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setDescription(lines.join('\n'))
            .setFooter({
                text: `Page ${page + 1} of ${totalPages} • Nexus Leveling System`,
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setTimestamp();

        // Show caller's rank
        const callerPos = all.findIndex(u => u.user_id === interaction.user.id) + 1;
        if (callerPos > 0) {
            const callerData = all[callerPos - 1];
            const { level } = levelSystem.getLevelFromXp(callerData.xp);
            embed.addFields({
                name: '📍 Your Position',
                value: `**#${callerPos}** — Level **${level}** • ${callerData.xp.toLocaleString()} XP`,
                inline: false,
            });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};

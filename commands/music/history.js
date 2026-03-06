const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useHistory } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('📜 View recently played tracks in this session'),

    async execute(interaction) {
        await interaction.deferReply();

        const history = useHistory(interaction.guild.id);
        if (!history || history.isEmpty()) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('No track history available for this session!', interaction.client)]
            });
        }

        const tracks = history.tracks.toArray().slice(0, 15);

        const embed = new EmbedBuilder()
            .setColor(COLORS.QUEUE)
            .setAuthor({ name: '📜 Recently Played', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(
                tracks.map((t, i) =>
                    `\`${i + 1}.\` **[${t.title.substring(0, 50)}](${t.url})**\n` +
                    `   👤 ${t.author} • ⏱️ \`${formatDuration(t.durationMS)}\``
                ).join('\n\n')
            )
            .setFooter({
                text: `${tracks.length} track(s) in history • Use /previous to go back`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

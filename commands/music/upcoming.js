const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS, getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upcoming')
        .setDescription('🔮 View the next tracks coming up in the queue'),

    async execute(interaction) {
        await interaction.deferReply();

        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)] });
        }

        const tracks = queue.tracks.toArray().slice(0, 10);
        if (tracks.length === 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.INFO)
                    .setDescription('📭 No upcoming tracks in the queue. Use `/play` to add more!')
                    .setTimestamp()]
            });
        }

        const totalDuration = tracks.reduce((acc, t) => acc + (t.durationMS || 0), 0);

        const embed = new EmbedBuilder()
            .setColor(COLORS.QUEUE)
            .setAuthor({ name: '🔮 Upcoming Tracks', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(
                tracks.map((t, i) =>
                    `\`${i + 1}.\` **[${t.title.substring(0, 50)}](${t.url})**\n` +
                    `   👤 ${t.author} • ⏱️ \`${formatDuration(t.durationMS)}\` • 🙋 ${t.requestedBy?.tag || 'Unknown'}`
                ).join('\n\n')
            )
            .addFields(
                { name: '🎵 Currently Playing', value: queue.currentTrack?.title?.substring(0, 60) || 'None', inline: false },
                { name: '📋 Showing', value: `\`${tracks.length}/${queue.tracks.size}\` tracks`, inline: true },
                { name: '⏱️ Total Duration', value: `\`${formatDuration(totalDuration)}\``, inline: true },
            )
            .setFooter({ text: 'Use /queue to see the full queue with pagination' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

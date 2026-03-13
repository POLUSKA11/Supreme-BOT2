const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildNowPlayingEmbed, buildErrorEmbed, buildMusicControlsRow, getGlobalPlayer } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('🎵 Show information about the currently playing track'),

    async execute(interaction) {
        await interaction.deferReply();

        // Get the global player instance
        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Music player is not initialized. Please try again in a moment.', interaction.client)]
            });
        }

        // Get the queue for this guild using the global player
        const queue = player.nodes.cache.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Nothing is currently playing! Use `/play` to start music.', interaction.client)]
            });
        }

        const track = queue.currentTrack;
        if (!track) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('No track is currently playing.', interaction.client)]
            });
        }

        const embed = buildNowPlayingEmbed(track, queue, interaction.client);
        const row = buildMusicControlsRow(queue.node.isPaused());

        return interaction.editReply({ embeds: [embed], components: [row] });
    }
};

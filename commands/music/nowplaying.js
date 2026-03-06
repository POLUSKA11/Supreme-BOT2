const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildNowPlayingEmbed, buildErrorEmbed, buildMusicControlsRow } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('🎵 Show information about the currently playing track'),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
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

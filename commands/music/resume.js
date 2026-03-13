const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, buildNowPlayingEmbed, buildMusicControlsRow, formatDuration, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('▶️ Resume the paused track'),

    async execute(interaction) {
        await interaction.deferReply();

        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
        if (!queue) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is in the queue!', interaction.client)] });
        }

        if (!queue.node.isPaused()) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('The track is already playing! Use `/pause` to pause.', interaction.client)]
            });
        }

        queue.node.resume();
        const track = queue.currentTrack;

        const embed = buildNowPlayingEmbed(track, queue, interaction.client);
        const row = buildMusicControlsRow(false);

        return interaction.editReply({ embeds: [embed], components: [row] });
    }
};

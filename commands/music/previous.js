const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue, useHistory } = require('discord-player');
const { buildErrorEmbed, buildNowPlayingEmbed, buildMusicControlsRow, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('previous')
        .setDescription('⏮️ Go back to the previous track'),

    async execute(interaction) {
        await interaction.deferReply();

        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
        if (!queue) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)] });
        }

        const history = useHistory(interaction.guild.id);
        if (!history || history.isEmpty()) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('No previous track in history!', interaction.client)]
            });
        }

        try {
            await history.previous();
            const track = queue.currentTrack;

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setAuthor({ name: '⏮️ Playing Previous Track', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(track?.title?.substring(0, 256) || 'Unknown Track')
                .setURL(track?.url || null)
                .setThumbnail(track?.thumbnail || null)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            const row = buildMusicControlsRow(false);
            return interaction.editReply({ embeds: [embed], components: [row] });
        } catch (err) {
            return interaction.editReply({
                embeds: [buildErrorEmbed(`Could not go to previous track: ${err.message}`, interaction.client)]
            });
        }
    }
};

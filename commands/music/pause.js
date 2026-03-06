const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('⏸️ Pause the currently playing track'),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)] });
        }

        if (queue.node.isPaused()) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('The track is already paused! Use `/resume` to continue.', interaction.client)]
            });
        }

        queue.node.pause();
        const track = queue.currentTrack;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PAUSE)
            .setAuthor({ name: '⏸️ Track Paused', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track?.title?.substring(0, 256) || 'Unknown Track')
            .setThumbnail(track?.thumbnail || null)
            .addFields(
                { name: '👤 Artist', value: track?.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: `\`${formatDuration(track?.durationMS)}\``, inline: true },
            )
            .setDescription('Use `/resume` to continue playback.')
            .setFooter({ text: `Paused by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

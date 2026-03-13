const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('🗑️ Remove a track from the queue')
        .addIntegerOption(opt =>
            opt.setName('position')
                .setDescription('Position of the track to remove (1 = first in queue)')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
        if (!queue || queue.tracks.size === 0) {
            return interaction.editReply({ embeds: [buildErrorEmbed('The queue is empty!', interaction.client)] });
        }

        const position = interaction.options.getInteger('position', true);
        const tracks = queue.tracks.toArray();

        if (position > tracks.length) {
            return interaction.editReply({
                embeds: [buildErrorEmbed(`Invalid position. Queue only has **${tracks.length}** tracks.`, interaction.client)]
            });
        }

        const track = tracks[position - 1];
        queue.removeTrack(position - 1);

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setAuthor({ name: '🗑️ Track Removed', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track.title.substring(0, 256))
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: '📍 Position', value: `\`#${position}\``, inline: true },
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: `\`${formatDuration(track.durationMS)}\``, inline: true },
                { name: '📋 Remaining', value: `\`${queue.tracks.size} track(s)\``, inline: true },
            )
            .setFooter({ text: `Removed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

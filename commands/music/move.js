const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('↕️ Move a track to a different position in the queue')
        .addIntegerOption(opt =>
            opt.setName('from')
                .setDescription('Current position of the track')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(opt =>
            opt.setName('to')
                .setDescription('New position for the track')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
        if (!queue || queue.tracks.size < 2) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Need at least **2 tracks** in the queue to move!', interaction.client)]
            });
        }

        const from = interaction.options.getInteger('from', true);
        const to = interaction.options.getInteger('to', true);
        const tracks = queue.tracks.toArray();

        if (from > tracks.length || to > tracks.length) {
            return interaction.editReply({
                embeds: [buildErrorEmbed(`Invalid position. Queue only has **${tracks.length}** tracks.`, interaction.client)]
            });
        }

        if (from === to) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('The `from` and `to` positions cannot be the same!', interaction.client)]
            });
        }

        const track = tracks[from - 1];
        // Remove and re-insert
        queue.removeTrack(from - 1);
        queue.insertTrack(track, to - 1);

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: '↕️ Track Moved', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track.title.substring(0, 256))
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: '📍 From Position', value: `\`#${from}\``, inline: true },
                { name: '📍 To Position', value: `\`#${to}\``, inline: true },
                { name: '⏱️ Duration', value: `\`${formatDuration(track.durationMS)}\``, inline: true },
            )
            .setFooter({ text: `Moved by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

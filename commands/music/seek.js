const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, createProgressBar, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');

function parseTimeToMs(timeStr) {
    if (!timeStr) return null;
    // Handle mm:ss or hh:mm:ss
    const colonParts = timeStr.split(':');
    if (colonParts.length === 2) {
        return (parseInt(colonParts[0]) * 60 + parseInt(colonParts[1])) * 1000;
    }
    if (colonParts.length === 3) {
        return (parseInt(colonParts[0]) * 3600 + parseInt(colonParts[1]) * 60 + parseInt(colonParts[2])) * 1000;
    }
    // Handle Xs, Xm, Xh or combinations
    let ms = 0;
    const hourMatch = timeStr.match(/(\d+)h/);
    const minMatch = timeStr.match(/(\d+)m(?!s)/);
    const secMatch = timeStr.match(/(\d+)s/);
    if (hourMatch) ms += parseInt(hourMatch[1]) * 3600000;
    if (minMatch) ms += parseInt(minMatch[1]) * 60000;
    if (secMatch) ms += parseInt(secMatch[1]) * 1000;
    // Plain number = seconds
    if (!hourMatch && !minMatch && !secMatch) {
        const num = parseInt(timeStr);
        if (!isNaN(num)) ms = num * 1000;
    }
    return ms || null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('⏩ Seek to a specific position in the current track')
        .addStringOption(opt =>
            opt.setName('position')
                .setDescription('Time position (e.g. 1:30, 1m30s, 90s, 2:45:00)')
                .setRequired(true)
        ),

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

        const positionStr = interaction.options.getString('position', true);
        const positionMs = parseTimeToMs(positionStr);

        if (!positionMs && positionMs !== 0) {
            return interaction.editReply({
                embeds: [buildErrorEmbed(
                    'Invalid time format! Use formats like:\n• `1:30` (1 min 30 sec)\n• `1m30s`\n• `90s`\n• `2:45:00`',
                    interaction.client
                )]
            });
        }

        const track = queue.currentTrack;
        if (positionMs > track.durationMS) {
            return interaction.editReply({
                embeds: [buildErrorEmbed(
                    `Position \`${positionStr}\` exceeds track duration of \`${formatDuration(track.durationMS)}\`!`,
                    interaction.client
                )]
            });
        }

        await queue.node.seek(positionMs);
        const progress = createProgressBar(positionMs, track.durationMS);

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: '⏩ Seeked', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track.title.substring(0, 256))
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: '📍 Position', value: `\`${formatDuration(positionMs)}\` / \`${formatDuration(track.durationMS)}\``, inline: true },
            )
            .setDescription(`\`${progress}\``)
            .setFooter({ text: `Seeked by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

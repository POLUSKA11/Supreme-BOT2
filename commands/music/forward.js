const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, createProgressBar, COLORS, getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forward')
        .setDescription('⏩ Fast forward the current track')
        .addStringOption(opt =>
            opt.setName('time')
                .setDescription('Time to forward (e.g. 30s, 1m, 1m30s). Default: 30 seconds')
                .setRequired(false)
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

        const timeStr = interaction.options.getString('time') || '30s';
        let ms = 30000;

        const hourMatch = timeStr.match(/(\d+)h/);
        const minMatch = timeStr.match(/(\d+)m(?!s)/);
        const secMatch = timeStr.match(/(\d+)s/);
        if (hourMatch || minMatch || secMatch) {
            ms = 0;
            if (hourMatch) ms += parseInt(hourMatch[1]) * 3600000;
            if (minMatch) ms += parseInt(minMatch[1]) * 60000;
            if (secMatch) ms += parseInt(secMatch[1]) * 1000;
        } else {
            const num = parseInt(timeStr);
            if (!isNaN(num)) ms = num * 1000;
        }

        const track = queue.currentTrack;
        const timestamp = queue.node.getTimestamp();
        const current = timestamp?.current?.value || 0;
        const newPosition = Math.min(current + ms, track.durationMS - 1000);

        await queue.node.seek(newPosition);
        const progress = createProgressBar(newPosition, track.durationMS);

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: '⏩ Fast Forwarded', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track.title.substring(0, 256))
            .setDescription(`\`${progress}\``)
            .addFields(
                { name: '⏩ Forwarded By', value: `\`${formatDuration(ms)}\``, inline: true },
                { name: '📍 New Position', value: `\`${formatDuration(newPosition)} / ${formatDuration(track.durationMS)}\``, inline: true },
            )
            .setFooter({ text: `Forwarded by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

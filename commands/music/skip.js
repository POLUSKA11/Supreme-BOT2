const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, buildSuccessEmbed, formatDuration, COLORS, getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('⏭️ Skip the current track or skip to a specific position')
        .addIntegerOption(opt =>
            opt.setName('to')
                .setDescription('Skip to a specific track number in the queue')
                .setRequired(false)
                .setMinValue(1)
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

        const skipTo = interaction.options.getInteger('to');
        const current = queue.currentTrack;

        if (skipTo) {
            const tracks = queue.tracks.toArray();
            if (skipTo > tracks.length) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`Invalid position. Queue only has **${tracks.length}** tracks.`, interaction.client)]
                });
            }
            // Remove tracks before the target
            for (let i = 0; i < skipTo - 1; i++) {
                queue.removeTrack(0);
            }
            queue.node.skip();
            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setAuthor({ name: '⏭️ Skipped To Track', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`Jumped to track **#${skipTo}**: **${tracks[skipTo - 1]?.title || 'Unknown'}**`)
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        const skippedTitle = current?.title || 'Unknown Track';
        queue.node.skip();

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: '⏭️ Track Skipped', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Skipped **${skippedTitle}**`)
            .addFields(
                { name: '⏱️ Duration', value: `\`${formatDuration(current?.durationMS)}\``, inline: true },
                { name: '📋 Remaining', value: `\`${queue.tracks.size} track(s)\``, inline: true },
            )
            .setFooter({ text: `Skipped by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildQueueEmbed, buildErrorEmbed, formatDuration, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('📋 View the current music queue')
        .addIntegerOption(opt =>
            opt.setName('page')
                .setDescription('Page number to view')
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
        if (!queue || (!queue.isPlaying() && queue.tracks.size === 0)) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('The queue is empty! Use `/play` to add songs.', interaction.client)]
            });
        }

        const tracks = queue.tracks.toArray();
        const tracksPerPage = 10;
        const totalPages = Math.ceil(tracks.length / tracksPerPage) || 1;
        let page = interaction.options.getInteger('page') || 1;
        page = Math.min(Math.max(page, 1), totalPages);

        const embed = buildQueueEmbed(queue, page, interaction.client);

        // Pagination buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('queue_first')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId('queue_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId('queue_info')
                .setLabel(`${page} / ${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('queue_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages),
            new ButtonBuilder()
                .setCustomId('queue_last')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages),
        );

        const msg = await interaction.editReply({ embeds: [embed], components: totalPages > 1 ? [row] : [] });

        if (totalPages <= 1) return;

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: 120000,
        });

        collector.on('collect', async (btnInteraction) => {
            await btnInteraction.deferUpdate();

            const currentQueue = useQueue(interaction.guild.id);
            if (!currentQueue) {
                collector.stop();
                return interaction.editReply({ components: [] }).catch(() => {});
            }

            if (btnInteraction.customId === 'queue_first') page = 1;
            else if (btnInteraction.customId === 'queue_prev') page = Math.max(1, page - 1);
            else if (btnInteraction.customId === 'queue_next') page = Math.min(totalPages, page + 1);
            else if (btnInteraction.customId === 'queue_last') page = totalPages;

            const newEmbed = buildQueueEmbed(currentQueue, page, interaction.client);
            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('queue_first').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
                new ButtonBuilder().setCustomId('queue_prev').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 1),
                new ButtonBuilder().setCustomId('queue_info').setLabel(`${page} / ${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('queue_next').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages),
                new ButtonBuilder().setCustomId('queue_last').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages),
            );

            await interaction.editReply({ embeds: [newEmbed], components: [newRow] });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};

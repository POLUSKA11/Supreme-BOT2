const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS, getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('swap')
        .setDescription('🔄 Swap the positions of two tracks in the queue')
        .addIntegerOption(opt =>
            opt.setName('track1')
                .setDescription('Position of the first track')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(opt =>
            opt.setName('track2')
                .setDescription('Position of the second track')
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
        if (!queue || queue.tracks.size < 2) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Need at least **2 tracks** in the queue to swap!', interaction.client)]
            });
        }

        const pos1 = interaction.options.getInteger('track1', true);
        const pos2 = interaction.options.getInteger('track2', true);

        if (pos1 === pos2) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Cannot swap a track with itself!', interaction.client)]
            });
        }

        const tracks = queue.tracks.toArray();
        if (pos1 > tracks.length || pos2 > tracks.length) {
            return interaction.editReply({
                embeds: [buildErrorEmbed(`Invalid position. Queue only has **${tracks.length}** tracks.`, interaction.client)]
            });
        }

        const track1 = tracks[pos1 - 1];
        const track2 = tracks[pos2 - 1];

        // Swap by removing and re-inserting
        queue.removeTrack(pos1 - 1);
        queue.insertTrack(track2, pos1 - 1);
        queue.removeTrack(pos2 - 1);
        queue.insertTrack(track1, pos2 - 1);

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: '🔄 Tracks Swapped', iconURL: interaction.client.user.displayAvatarURL() })
            .addFields(
                {
                    name: `#${pos1} ↔️ #${pos2}`,
                    value: `**${track1.title.substring(0, 40)}** ↔️ **${track2.title.substring(0, 40)}**`,
                    inline: false
                },
                { name: `New #${pos1}`, value: track2.title.substring(0, 60), inline: true },
                { name: `New #${pos2}`, value: track1.title.substring(0, 60), inline: true },
            )
            .setFooter({ text: `Swapped by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

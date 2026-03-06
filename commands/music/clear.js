const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🗑️ Clear all tracks from the queue (keeps current track playing)'),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
        if (!queue) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is in the queue!', interaction.client)] });
        }

        if (queue.tracks.size === 0) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('The queue is already empty!', interaction.client)]
            });
        }

        const count = queue.tracks.size;
        queue.tracks.clear();

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setAuthor({ name: '🗑️ Queue Cleared', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Removed **${count}** track(s) from the queue.`)
            .addFields(
                { name: '🎵 Still Playing', value: queue.currentTrack?.title?.substring(0, 60) || 'Nothing', inline: true },
            )
            .setFooter({ text: `Cleared by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

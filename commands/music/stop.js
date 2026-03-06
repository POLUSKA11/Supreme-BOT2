const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('⏹️ Stop music and clear the queue'),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
        if (!queue) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)] });
        }

        const trackCount = queue.tracks.size;
        const currentTrack = queue.currentTrack;

        queue.delete();

        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setAuthor({ name: '⏹️ Music Stopped', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription('Music has been stopped and the queue has been cleared.')
            .addFields(
                { name: '🎵 Last Track', value: currentTrack?.title?.substring(0, 60) || 'None', inline: true },
                { name: '📋 Tracks Removed', value: `\`${trackCount}\``, inline: true },
            )
            .setFooter({ text: `Stopped by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

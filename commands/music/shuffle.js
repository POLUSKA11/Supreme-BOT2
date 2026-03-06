const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('🔀 Shuffle the current queue'),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)] });
        }

        if (queue.tracks.size < 2) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Need at least **2 tracks** in the queue to shuffle!', interaction.client)]
            });
        }

        const trackCount = queue.tracks.size;
        queue.tracks.shuffle();

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: '🔀 Queue Shuffled', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Successfully shuffled **${trackCount}** tracks in the queue!`)
            .addFields(
                { name: '🎵 Now Playing', value: queue.currentTrack?.title?.substring(0, 60) || 'None', inline: true },
                { name: '📋 Queue Size', value: `\`${trackCount} track(s)\``, inline: true },
            )
            .setFooter({ text: `Shuffled by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

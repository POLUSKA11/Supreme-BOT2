const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, COLORS, getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeduplicates')
        .setDescription('🔄 Remove all duplicate tracks from the queue'),

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

        const tracks = queue.tracks.toArray();
        const seen = new Set();
        const duplicates = [];

        tracks.forEach((track, index) => {
            if (seen.has(track.url)) {
                duplicates.push(index);
            } else {
                seen.add(track.url);
            }
        });

        if (duplicates.length === 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.INFO)
                    .setDescription('✅ No duplicate tracks found in the queue!')
                    .setTimestamp()]
            });
        }

        // Remove in reverse order to preserve indices
        for (let i = duplicates.length - 1; i >= 0; i--) {
            queue.removeTrack(duplicates[i]);
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: '🔄 Duplicates Removed', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Removed **${duplicates.length}** duplicate track(s) from the queue.`)
            .addFields(
                { name: '📋 Remaining Tracks', value: `\`${queue.tracks.size}\``, inline: true },
            )
            .setFooter({ text: `Cleaned by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

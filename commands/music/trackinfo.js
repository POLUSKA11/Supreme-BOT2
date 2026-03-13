const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue, useMainPlayer, QueryType } = require('discord-player');
const { buildErrorEmbed, formatDuration, getPlatformEmoji, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trackinfo')
        .setDescription('ℹ️ Get detailed information about the current or a specific track')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Track name or URL to look up (leave empty for current track)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        let track;

        if (query) {
            const player = useMainPlayer();
            const result = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO,
            });
            if (!result || result.isEmpty()) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`No results found for **${query}**.`, interaction.client)]
                });
            }
            track = result.tracks[0];
        } else {
            const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
            if (!queue?.currentTrack) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed('Nothing is playing! Use `/trackinfo <query>` to look up a track.', interaction.client)]
                });
            }
            track = queue.currentTrack;
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setAuthor({ name: 'ℹ️ Track Information', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track.title.substring(0, 256))
            .setURL(track.url)
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: '👤 Artist / Author', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: `\`${formatDuration(track.durationMS)}\``, inline: true },
                { name: '🌐 Platform', value: `${getPlatformEmoji(track.url)} ${track.source || 'Unknown'}`, inline: true },
                { name: '🔗 URL', value: `[Open Link](${track.url})`, inline: true },
                { name: '📅 Requested By', value: track.requestedBy?.tag || 'N/A', inline: true },
                { name: '🎵 Live', value: track.durationMS === Infinity ? '`Yes`' : '`No`', inline: true },
            )
            .setFooter({ text: 'Supreme Music Bot', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

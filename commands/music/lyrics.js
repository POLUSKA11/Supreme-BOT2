const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue, lrclib } = require('discord-player');
const { buildErrorEmbed, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('📝 Get lyrics for the current or specified song')
        .addStringOption(opt =>
            opt.setName('song')
                .setDescription('Song name to search lyrics for (leave empty for current track)')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('artist')
                .setDescription('Artist name (optional, helps narrow down results)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
        const songQuery = interaction.options.getString('song');
        const artistQuery = interaction.options.getString('artist');

        let title, author;

        if (songQuery) {
            title = songQuery;
            author = artistQuery || '';
        } else if (queue?.currentTrack) {
            title = queue.currentTrack.title;
            author = queue.currentTrack.author;
        } else {
            return interaction.editReply({
                embeds: [buildErrorEmbed(
                    'Nothing is playing and no song was specified!\n\nUse `/lyrics <song name>` to search for lyrics.',
                    interaction.client
                )]
            });
        }

        try {
            // Use discord-player's built-in LrcLib lyrics fetcher
            const lyrics = await lrclib.search({
                q: `${title} ${author}`.trim(),
            });

            if (!lyrics || lyrics.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        `No lyrics found for **${title}**${author ? ` by **${author}**` : ''}.\n\nTry a different song name or artist.`,
                        interaction.client
                    )]
                });
            }

            const song = lyrics[0];
            const lyricsText = song.plainLyrics || song.syncedLyrics || 'No lyrics available.';

            // Split lyrics into chunks of 4000 chars max
            const chunks = [];
            let remaining = lyricsText;
            while (remaining.length > 0) {
                const chunk = remaining.substring(0, 3900);
                const lastNewline = chunk.lastIndexOf('\n');
                if (lastNewline > 0 && remaining.length > 3900) {
                    chunks.push(remaining.substring(0, lastNewline));
                    remaining = remaining.substring(lastNewline + 1);
                } else {
                    chunks.push(chunk);
                    remaining = remaining.substring(chunk.length);
                }
            }

            const embed = new EmbedBuilder()
                .setColor(COLORS.MUSIC)
                .setAuthor({ name: '📝 Lyrics', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(`${song.trackName || title}`)
                .setDescription(chunks[0] || 'No lyrics available.')
                .addFields(
                    { name: '👤 Artist', value: song.artistName || author || 'Unknown', inline: true },
                    { name: '💿 Album', value: song.albumName || 'Unknown', inline: true },
                    { name: '📊 Source', value: '[LrcLib](https://lrclib.net)', inline: true },
                )
                .setFooter({
                    text: chunks.length > 1 ? `Page 1/${chunks.length} • Lyrics may be truncated` : 'Powered by LrcLib',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            if (queue?.currentTrack?.thumbnail) {
                embed.setThumbnail(queue.currentTrack.thumbnail);
            }

            await interaction.editReply({ embeds: [embed] });

            // Send additional pages if lyrics are long
            for (let i = 1; i < Math.min(chunks.length, 3); i++) {
                const pageEmbed = new EmbedBuilder()
                    .setColor(COLORS.MUSIC)
                    .setTitle(`${song.trackName || title} (Page ${i + 1}/${chunks.length})`)
                    .setDescription(chunks[i])
                    .setTimestamp();
                await interaction.followUp({ embeds: [pageEmbed] });
            }

        } catch (err) {
            console.error('[LYRICS CMD ERROR]', err);
            return interaction.editReply({
                embeds: [buildErrorEmbed(`Failed to fetch lyrics: ${err.message}`, interaction.client)]
            });
        }
    }
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useMainPlayer, QueryType } = require('discord-player');
const {
    validateVoiceChannel,
    buildTrackAddedEmbed,
    buildPlaylistAddedEmbed,
    buildErrorEmbed,
    buildNowPlayingEmbed,
    buildMusicControlsRow,
    formatDuration,
    COLORS,
} = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('🎵 Play a song or playlist from YouTube, Spotify, SoundCloud, Apple Music & more')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Song name, URL (YouTube/Spotify/SoundCloud/Apple Music), or playlist URL')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(opt =>
            opt.setName('source')
                .setDescription('Force a specific platform source')
                .setRequired(false)
                .addChoices(
                    { name: '▶️ YouTube', value: 'youtube' },
                    { name: '🟢 Spotify', value: 'spotify' },
                    { name: '☁️ SoundCloud', value: 'soundcloud' },
                    { name: '🍎 Apple Music', value: 'apple_music' },
                )
        )
        .addBooleanOption(opt =>
            opt.setName('shuffle')
                .setDescription('Shuffle the playlist before adding to queue')
                .setRequired(false)
        )
        .addBooleanOption(opt =>
            opt.setName('insert')
                .setDescription('Insert track right after the current track')
                .setRequired(false)
        ),

    async autocomplete(interaction) {
        const query = interaction.options.getFocused();
        if (!query || query.length < 2) return interaction.respond([]);
        try {
            const player = useMainPlayer();
            const results = await player.search(query, {
                requestedBy: interaction.user,
            });
            const tracks = results.tracks.slice(0, 10);
            await interaction.respond(
                tracks.map(t => ({
                    name: `${t.title} — ${t.author} [${formatDuration(t.durationMS)}]`.substring(0, 100),
                    value: t.url || t.title,
                }))
            );
        } catch (err) {
            // Ignore "Unknown interaction" (10062) — the interaction expired before
            // we could respond.  For all other errors, attempt an empty respond.
            if (err?.code !== 10062 && err?.message !== 'Unknown interaction') {
                try { await interaction.respond([]); } catch { /* already expired */ }
            }
        }
    },

    async execute(interaction) {
        await interaction.deferReply();

        const { valid, error, voiceChannel } = validateVoiceChannel(interaction);
        if (!valid) {
            return interaction.editReply({
                embeds: [buildErrorEmbed(error, interaction.client)]
            });
        }

        const query = interaction.options.getString('query', true);
        const sourceOpt = interaction.options.getString('source');
        const shuffle = interaction.options.getBoolean('shuffle') || false;
        const insert = interaction.options.getBoolean('insert') || false;

        const player = useMainPlayer();

        // Map source option to QueryType
        const queryTypeMap = {
            youtube: QueryType.YOUTUBE_SEARCH,
            spotify: QueryType.SPOTIFY_SEARCH,
            soundcloud: QueryType.SOUNDCLOUD_SEARCH,
            apple_music: QueryType.APPLE_MUSIC_SEARCH,
        };
        const searchEngine = sourceOpt ? queryTypeMap[sourceOpt] : QueryType.AUTO;

        try {
            const result = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine,
            });

            if (!result || result.isEmpty()) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        `No results found for **${query}**.\n\nTry:\n• A different search term\n• Pasting a direct URL\n• Using the \`source\` option to specify a platform`,
                        interaction.client
                    )]
                });
            }

            const queue = player.nodes.create(interaction.guild, {
                metadata: {
                    channel: interaction.channel,
                    requestedBy: interaction.user,
                },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 30000,
                leaveOnEnd: false,
                leaveOnEndCooldown: 30000,
                skipOnNoStream: true,
                // Voice Fixes:
                connectionTimeout: 30000,
                bufferingTimeout: 3000,
            });

            if (!queue.connection) {
                await queue.connect(voiceChannel);
            }

            if (result.hasPlaylist()) {
                let tracks = result.tracks;
                if (shuffle) {
                    tracks = [...tracks].sort(() => Math.random() - 0.5);
                }
                if (insert) {
                    // Insert playlist tracks after current
                    tracks.reverse().forEach(t => queue.insertTrack(t, 0));
                } else {
                    queue.addTrack(tracks);
                }

                if (!queue.isPlaying()) await queue.node.play();

                const embed = buildPlaylistAddedEmbed(result.playlist, tracks, queue, interaction.client);
                return interaction.editReply({ embeds: [embed] });
            } else {
                const track = result.tracks[0];
                if (insert && queue.currentTrack) {
                    queue.insertTrack(track, 0);
                } else {
                    queue.addTrack(track);
                }

                if (!queue.isPlaying()) await queue.node.play();

                const isNowPlaying = !queue.isPlaying() || queue.tracks.size === 0;
                const embed = isNowPlaying
                    ? buildNowPlayingEmbed(track, queue, interaction.client)
                    : buildTrackAddedEmbed(track, queue, interaction.client);

                const row = buildMusicControlsRow(false);
                return interaction.editReply({ embeds: [embed], components: [row] });
            }
        } catch (err) {
            console.error('[PLAY CMD ERROR]', err);
            return interaction.editReply({
                embeds: [buildErrorEmbed(
                    `Failed to play track: ${err.message}\n\nMake sure the link is valid or try a different search term.`,
                    interaction.client
                )]
            });
        }
    }
};

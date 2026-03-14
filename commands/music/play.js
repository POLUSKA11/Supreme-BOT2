const { SlashCommandBuilder } = require("discord.js");
const { useMainPlayer, QueryType } = require("discord-player");
const {
  validateVoiceChannel,
  buildTrackAddedEmbed,
  buildPlaylistAddedEmbed,
  buildErrorEmbed,
  buildNowPlayingEmbed,
  buildMusicControlsRow,
  formatDuration,
  getGlobalPlayer,
} = require("../../utils/musicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription(
      "🎵 Play a song or playlist from YouTube, Spotify, SoundCloud, Apple Music & more"
    )
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription(
          "Song name, URL (YouTube/Spotify/SoundCloud/Apple Music), or playlist URL"
        )
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("source")
        .setDescription("Force a specific platform source")
        .setRequired(false)
        .addChoices(
          { name: "▶️ YouTube", value: "youtube" },
          { name: "🟢 Spotify", value: "spotify" },
          { name: "☁️ SoundCloud", value: "soundcloud" },
          { name: "🍎 Apple Music", value: "apple_music" }
        )
    )
    .addBooleanOption((opt) =>
      opt
        .setName("shuffle")
        .setDescription("Shuffle the playlist before adding to queue")
        .setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName("insert")
        .setDescription("Insert track right after the current track")
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
        tracks.map((t) => ({
          name: `${t.title} — ${t.author} [${formatDuration(
            t.durationMS
          )}]`.substring(0, 100),
          value: t.url || t.title,
        }))
      );
    } catch (err) {
      if (err?.code !== 10062 && err?.message !== "Unknown interaction") {
        try {
          await interaction.respond([]);
        } catch {}
      }
    }
  },

  async execute(interaction) {
    console.log("[PLAY CMD] Received /play command");
    await interaction.deferReply();
    console.log("[PLAY CMD] Deferred reply");

    const { valid, error, voiceChannel } = validateVoiceChannel(interaction);
    if (!valid) {
      console.log("[PLAY CMD] Voice channel validation failed:", error);
      return interaction.editReply({
        embeds: [buildErrorEmbed(error, interaction.client)],
      });
    }
    console.log("[PLAY CMD] Voice channel validated successfully");

    const query = interaction.options.getString("query", true);
    let sourceOpt = interaction.options.getString("source");
    const shuffle = interaction.options.getBoolean("shuffle") || false;
    const insert = interaction.options.getBoolean("insert") || false;
    console.log(`[PLAY CMD] Query: ${query}, Source: ${sourceOpt}`);

    // Use the global player instance that was initialized at startup
    const player = getGlobalPlayer();
    if (!player) {
      console.error('[PLAY CMD] Global player instance not found!');
      return interaction.editReply({
        embeds: [buildErrorEmbed('Music player is not initialized. Please try again in a moment.', interaction.client)],
      });
    }

    const queryTypeMap = {
      youtube: QueryType.YOUTUBE_SEARCH,
      spotify: QueryType.SPOTIFY_SEARCH,
      soundcloud: QueryType.SOUNDCLOUD_SEARCH,
      apple_music: QueryType.APPLE_MUSIC_SEARCH,
    };
    let searchEngine = sourceOpt ? queryTypeMap[sourceOpt] : QueryType.AUTO;

    // Explicitly handle SoundCloud URLs to ensure correct extractor usage
    if (!sourceOpt && (query.includes("soundcloud.com/playlist/") || query.includes("soundcloud.com/sets/"))) {
        searchEngine = QueryType.SOUNDCLOUD_PLAYLIST;
        console.log("[PLAY CMD] Detected SoundCloud playlist URL, forcing searchEngine to SOUNDCLOUD_PLAYLIST");
    } else if (!sourceOpt && query.includes("soundcloud.com/")) {
        searchEngine = QueryType.SOUNDCLOUD_TRACK;
        console.log("[PLAY CMD] Detected SoundCloud track URL, forcing searchEngine to SOUNDCLOUD_TRACK");
    }

    try {
      console.log(`[PLAY CMD] Searching for track(s) with searchEngine: ${searchEngine}...`);
      const result = await player.search(query, {
        requestedBy: interaction.user,
        searchEngine,
      });
      console.log("[PLAY CMD] Search complete");

      if (!result || result.isEmpty()) {
        console.log("[PLAY CMD] No results found");
        return interaction.editReply({
          embeds: [
            buildErrorEmbed(
              `No results found for **${query}**.\n\nTry:\n• A different search term\n• Pasting a direct URL\n• Using the \`source\` option to specify a platform`,
              interaction.client
            ),
          ],
        });
      }

      console.log("[PLAY CMD] Creating or getting queue...");
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
        connectionTimeout: 30000,
        bufferingTimeout: 3000,
      });
      console.log("[PLAY CMD] Queue created or retrieved");

      if (!queue.connection) {
        console.log("[PLAY CMD] Connecting to voice channel...");
        await queue.connect(voiceChannel);
        console.log("[PLAY CMD] Connected to voice channel");
      } else if (queue.connection.channel.id !== voiceChannel.id) {
        console.log("[PLAY CMD] Switching voice channel...");
        await queue.connect(voiceChannel);
        console.log("[PLAY CMD] Switched voice channel");
      }

      if (result.hasPlaylist()) {
        console.log("[PLAY CMD] Playlist found");
        let tracks = result.tracks;
        if (shuffle) {
          tracks = [...tracks].sort(() => Math.random() - 0.5);
        }
        if (insert) {
          tracks.reverse().forEach((t) => queue.insertTrack(t, 0));
        } else {
          queue.addTrack(tracks);
        }

        console.log(`[PLAY CMD] Added ${tracks.length} tracks to queue. First track duration: ${formatDuration(tracks[0]?.durationMS)}, isLive: ${tracks[0]?.isLive}`);
        const isNowPlaying = !queue.isPlaying();
        if (isNowPlaying) {
          console.log("[PLAY CMD] Starting playback of playlist...");
          await queue.node.play();
          console.log("[PLAY CMD] Playback started");
        }

        const embed = isNowPlaying
          ? buildNowPlayingEmbed(tracks[0], queue, interaction.client)
          : buildPlaylistAddedEmbed(result.playlist, tracks, queue, interaction.client);
        
        const row = buildMusicControlsRow(false);
        return interaction.editReply({ embeds: [embed], components: isNowPlaying ? [row] : [] });
      } else {
        console.log("[PLAY CMD] Single track found");
        const track = result.tracks[0];
        if (insert && queue.currentTrack) {
          queue.insertTrack(track, 0);
        } else {
          queue.addTrack(track);
        }

        console.log(`[PLAY CMD] Added single track to queue. Duration: ${formatDuration(track?.durationMS)}, isLive: ${track?.isLive}`);
        const isNowPlaying = !queue.isPlaying();
        if (isNowPlaying) {
          console.log("[PLAY CMD] Starting playback of single track...");
          await queue.node.play();
          console.log("[PLAY CMD] Playback started");
        }

        const embed = isNowPlaying
          ? buildNowPlayingEmbed(track, queue, interaction.client)
          : buildTrackAddedEmbed(track, queue, interaction.client);

        const row = buildMusicControlsRow(false);
        return interaction.editReply({ embeds: [embed], components: [row] });
      }
    } catch (err) {
      console.error("[PLAY CMD ERROR]", err);
      return interaction.editReply({
        embeds: [
          buildErrorEmbed(
            `Failed to play track: ${err.message}\n\nMake sure the link is valid or try a different search term.`,
            interaction.client
          ),
        ],
      });
    }
  },
};

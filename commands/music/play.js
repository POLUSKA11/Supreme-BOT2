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
    const sourceOpt = interaction.options.getString("source");
    const shuffle = interaction.options.getBoolean("shuffle") || false;
    const insert = interaction.options.getBoolean("insert") || false;
    console.log(`[PLAY CMD] Query: ${query}, Source: ${sourceOpt}`);

    const player = useMainPlayer();

    const queryTypeMap = {
      youtube: QueryType.YOUTUBE_SEARCH,
      spotify: QueryType.SPOTIFY_SEARCH,
      soundcloud: QueryType.SOUNDCLOUD_SEARCH,
      apple_music: QueryType.APPLE_MUSIC_SEARCH,
    };
    const searchEngine = sourceOpt ? queryTypeMap[sourceOpt] : QueryType.AUTO;

    try {
      console.log("[PLAY CMD] Searching for track...");
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

        if (!queue.isPlaying()) {
          console.log("[PLAY CMD] Starting playback of playlist...");
          await queue.node.play();
          console.log("[PLAY CMD] Playback started");
        }

        const embed = buildPlaylistAddedEmbed(
          result.playlist,
          tracks,
          queue,
          interaction.client
        );
        return interaction.editReply({ embeds: [embed] });
      } else {
        console.log("[PLAY CMD] Single track found");
        const track = result.tracks[0];
        if (insert && queue.currentTrack) {
          queue.insertTrack(track, 0);
        } else {
          queue.addTrack(track);
        }

        if (!queue.isPlaying()) {
          console.log("[PLAY CMD] Starting playback of single track...");
          await queue.node.play();
          console.log("[PLAY CMD] Playback started");
        }

        const isNowPlaying =
          !queue.isPlaying() || queue.tracks.size === 0;
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

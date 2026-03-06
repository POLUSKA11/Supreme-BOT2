/**
 * Supreme BOT2 - Music Player Manager
 * Built on discord-player v7 with multi-platform support
 * Platforms: YouTube, Spotify, SoundCloud, Apple Music, Vimeo, Reverbnation, Attachments
 */

const { Player, GuildQueueEvent } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ─── Colour Palette ──────────────────────────────────────────────────────────
const COLORS = {
    PRIMARY:  0x5865F2,   // Discord blurple
    SUCCESS:  0x57F287,   // Green
    WARNING:  0xFEE75C,   // Yellow
    ERROR:    0xED4245,   // Red
    INFO:     0x5865F2,   // Blurple
    MUSIC:    0xFF6B6B,   // Warm red/pink for music
    PAUSE:    0xFFA500,   // Orange
    QUEUE:    0x9B59B6,   // Purple
};

// ─── Platform Detection ───────────────────────────────────────────────────────
function detectPlatform(url) {
    if (!url) return '🎵';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return '<:youtube:1234> YouTube';
    if (url.includes('spotify.com')) return '<:spotify:1234> Spotify';
    if (url.includes('soundcloud.com')) return '☁️ SoundCloud';
    if (url.includes('music.apple.com')) return '🍎 Apple Music';
    if (url.includes('vimeo.com')) return '🎬 Vimeo';
    if (url.includes('reverbnation.com')) return '🎸 ReverbNation';
    return '🎵 Unknown';
}

function getPlatformEmoji(url) {
    if (!url) return '🎵';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return '▶️';
    if (url.includes('spotify.com')) return '🟢';
    if (url.includes('soundcloud.com')) return '☁️';
    if (url.includes('music.apple.com')) return '🍎';
    if (url.includes('vimeo.com')) return '🎬';
    return '🎵';
}

// ─── Duration Formatter ───────────────────────────────────────────────────────
function formatDuration(ms) {
    if (!ms || ms === Infinity) return '🔴 LIVE';
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function createProgressBar(current, total, size = 15) {
    if (!total || total === Infinity) return '🔴 ━━━━━━━━━━━━━━━ LIVE';
    const percentage = current / total;
    const filled = Math.round(size * percentage);
    const empty = size - filled;
    const bar = '▬'.repeat(Math.max(0, filled - 1)) + (filled > 0 ? '🔘' : '') + '▬'.repeat(empty);
    return bar;
}

// ─── Track Embed Builders ─────────────────────────────────────────────────────
function buildNowPlayingEmbed(track, queue, client) {
    const timestamp = queue.node.getTimestamp();
    const current = timestamp?.current?.value || 0;
    const total = timestamp?.total?.value || track.durationMS;
    const progress = createProgressBar(current, total);
    const currentTime = formatDuration(current);
    const totalTime = formatDuration(total);

    const loopMode = ['🔁 Off', '🔂 Track', '🔁 Queue', '🔀 Auto'][queue.repeatMode] || '🔁 Off';

    return new EmbedBuilder()
        .setColor(COLORS.MUSIC)
        .setAuthor({
            name: '🎵 Now Playing',
            iconURL: client?.user?.displayAvatarURL() || undefined
        })
        .setTitle(track.title.length > 256 ? track.title.substring(0, 253) + '...' : track.title)
        .setURL(track.url)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: `\`${currentTime} / ${totalTime}\``, inline: true },
            { name: '🎚️ Volume', value: `\`${queue.node.volume}%\``, inline: true },
            { name: '📋 Queue', value: `\`${queue.tracks.size} track(s) remaining\``, inline: true },
            { name: '🔁 Loop', value: loopMode, inline: true },
            { name: '🌐 Source', value: getPlatformEmoji(track.url) + ' ' + (track.source || 'Unknown'), inline: true },
            { name: '📊 Progress', value: `\`${progress}\`\n\`${currentTime}\` / \`${totalTime}\``, inline: false },
        )
        .setFooter({
            text: `Requested by ${track.requestedBy?.tag || 'Unknown'}`,
            iconURL: track.requestedBy?.displayAvatarURL() || undefined
        })
        .setTimestamp();
}

function buildQueueEmbed(queue, page = 1, client) {
    const tracksPerPage = 10;
    const tracks = queue.tracks.toArray();
    const totalPages = Math.ceil(tracks.length / tracksPerPage) || 1;
    const start = (page - 1) * tracksPerPage;
    const end = start + tracksPerPage;
    const pageTracks = tracks.slice(start, end);

    const current = queue.currentTrack;
    const description = pageTracks.length > 0
        ? pageTracks.map((t, i) =>
            `\`${start + i + 1}.\` [${t.title.substring(0, 45)}](${t.url})\n` +
            `   ⏱️ \`${formatDuration(t.durationMS)}\` • 👤 ${t.requestedBy?.tag || 'Unknown'}`
          ).join('\n\n')
        : '*Queue is empty*';

    const embed = new EmbedBuilder()
        .setColor(COLORS.QUEUE)
        .setAuthor({
            name: '📋 Music Queue',
            iconURL: client?.user?.displayAvatarURL() || undefined
        })
        .setDescription(description)
        .setFooter({ text: `Page ${page}/${totalPages} • ${tracks.length} total track(s) • Use /queue <page> to navigate` })
        .setTimestamp();

    if (current) {
        embed.addFields({
            name: '🎵 Currently Playing',
            value: `[${current.title.substring(0, 60)}](${current.url}) • \`${formatDuration(current.durationMS)}\``,
            inline: false
        });
    }

    return embed;
}

function buildTrackAddedEmbed(track, queue, client) {
    const position = queue.tracks.size;
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setAuthor({ name: '✅ Track Added to Queue', iconURL: client?.user?.displayAvatarURL() || undefined })
        .setTitle(track.title.length > 256 ? track.title.substring(0, 253) + '...' : track.title)
        .setURL(track.url)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: `\`${formatDuration(track.durationMS)}\``, inline: true },
            { name: '📍 Position', value: `\`#${position}\``, inline: true },
            { name: '🌐 Source', value: getPlatformEmoji(track.url) + ' ' + (track.source || 'Unknown'), inline: true },
        )
        .setFooter({ text: `Requested by ${track.requestedBy?.tag || 'Unknown'}`, iconURL: track.requestedBy?.displayAvatarURL() || undefined })
        .setTimestamp();
}

function buildPlaylistAddedEmbed(playlist, tracks, queue, client) {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setAuthor({ name: '✅ Playlist Added to Queue', iconURL: client?.user?.displayAvatarURL() || undefined })
        .setTitle(playlist?.title?.substring(0, 256) || 'Playlist')
        .setURL(playlist?.url || null)
        .setThumbnail(playlist?.thumbnail || tracks[0]?.thumbnail || null)
        .addFields(
            { name: '🎵 Tracks Added', value: `\`${tracks.length}\``, inline: true },
            { name: '📋 Queue Size', value: `\`${queue.tracks.size}\``, inline: true },
            { name: '🌐 Source', value: getPlatformEmoji(playlist?.url) + ' ' + (tracks[0]?.source || 'Unknown'), inline: true },
        )
        .setFooter({ text: `Requested by ${tracks[0]?.requestedBy?.tag || 'Unknown'}`, iconURL: tracks[0]?.requestedBy?.displayAvatarURL() || undefined })
        .setTimestamp();
}

function buildErrorEmbed(message, client) {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setAuthor({ name: '❌ Music Error', iconURL: client?.user?.displayAvatarURL() || undefined })
        .setDescription(message)
        .setTimestamp();
}

function buildSuccessEmbed(message, client) {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setDescription(`✅ ${message}`)
        .setTimestamp();
}

function buildInfoEmbed(title, message, client) {
    return new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setAuthor({ name: title, iconURL: client?.user?.displayAvatarURL() || undefined })
        .setDescription(message)
        .setTimestamp();
}

// ─── Music Controls Row ───────────────────────────────────────────────────────
function buildMusicControlsRow(paused = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_prev')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_pause_resume')
            .setEmoji(paused ? '▶️' : '⏸️')
            .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('music_skip')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_stop')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('music_queue')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary),
    );
}

// ─── Player Initializer ───────────────────────────────────────────────────────
async function initializePlayer(client) {
    const player = new Player(client, {
        skipFFmpeg: false,
        useLegacyFFmpeg: false,
    });

    // Load YouTube extractor (youtubei - no API key needed)
    await player.extractors.register(YoutubeiExtractor, {});

    // Load all default extractors (Spotify, SoundCloud, Apple Music, Vimeo, etc.)
    await player.extractors.loadMulti(DefaultExtractors);

    // ─── Player Events ────────────────────────────────────────────────────────
    player.events.on(GuildQueueEvent.playerStart, (queue, track) => {
        const channel = queue.metadata?.channel;
        if (!channel) return;
        const embed = buildNowPlayingEmbed(track, queue, client);
        const row = buildMusicControlsRow(false);
        channel.send({ embeds: [embed], components: [row] }).catch(() => {});
    });

    player.events.on(GuildQueueEvent.audioTrackAdd, (queue, track) => {
        const channel = queue.metadata?.channel;
        if (!channel || queue.isPlaying()) return;
        // Only show "added" embed when something is already playing
    });

    player.events.on(GuildQueueEvent.disconnect, (queue) => {
        const channel = queue.metadata?.channel;
        if (!channel) return;
        channel.send({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setDescription('👋 Disconnected from voice channel. Queue cleared.')
                .setTimestamp()]
        }).catch(() => {});
    });

    player.events.on(GuildQueueEvent.emptyQueue, (queue) => {
        const channel = queue.metadata?.channel;
        if (!channel) return;
        channel.send({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setDescription('✅ Queue finished! Add more songs with `/play`.')
                .setTimestamp()]
        }).catch(() => {});
    });

    player.events.on(GuildQueueEvent.emptyChannel, (queue) => {
        const channel = queue.metadata?.channel;
        if (!channel) return;
        channel.send({
            embeds: [new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setDescription('⚠️ Voice channel is empty. Leaving in 30 seconds...')
                .setTimestamp()]
        }).catch(() => {});
    });

    player.events.on(GuildQueueEvent.error, (queue, error) => {
        console.error('[MUSIC ERROR]', error);
        const channel = queue.metadata?.channel;
        if (!channel) return;
        channel.send({
            embeds: [buildErrorEmbed(`An error occurred: ${error.message}`, client)]
        }).catch(() => {});
    });

    player.events.on(GuildQueueEvent.playerError, (queue, error) => {
        console.error('[MUSIC PLAYER ERROR]', error);
        const channel = queue.metadata?.channel;
        if (!channel) return;
        channel.send({
            embeds: [buildErrorEmbed(`Player error: ${error.message}. Skipping track...`, client)]
        }).catch(() => {});
    });

    console.log('🎵 [MUSIC] Player initialized with extractors:', player.extractors.store.size);
    return player;
}

// ─── Voice Channel Validation ─────────────────────────────────────────────────
function validateVoiceChannel(interaction) {
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
        return { valid: false, error: 'You must be in a voice channel to use music commands!' };
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions?.has('Connect')) {
        return { valid: false, error: 'I do not have permission to join your voice channel!' };
    }
    if (!permissions?.has('Speak')) {
        return { valid: false, error: 'I do not have permission to speak in your voice channel!' };
    }

    return { valid: true, voiceChannel };
}

module.exports = {
    initializePlayer,
    validateVoiceChannel,
    buildNowPlayingEmbed,
    buildQueueEmbed,
    buildTrackAddedEmbed,
    buildPlaylistAddedEmbed,
    buildErrorEmbed,
    buildSuccessEmbed,
    buildInfoEmbed,
    buildMusicControlsRow,
    formatDuration,
    createProgressBar,
    detectPlatform,
    getPlatformEmoji,
    COLORS,
};

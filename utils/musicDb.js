/**
 * Supreme BOT2 — Music Database Layer (TiDB)
 *
 * Tables managed here:
 *   music_play_history   — per-guild/user persistent play history
 *   music_saved_tracks   — per-user saved/favourited tracks
 *   music_playlists      — per-user named playlists
 *   music_playlist_tracks— tracks inside a playlist
 *   music_guild_settings — per-guild music settings (volume, DJ role, etc.)
 */

const { query } = require('./db');

// ─── Schema Initialisation ────────────────────────────────────────────────────
async function initMusicSchema() {
    // Play history — every track played is recorded
    await query(`
        CREATE TABLE IF NOT EXISTS music_play_history (
            id            BIGINT AUTO_INCREMENT PRIMARY KEY,
            guild_id      VARCHAR(32)  NOT NULL,
            user_id       VARCHAR(32)  NOT NULL,
            track_title   VARCHAR(512) NOT NULL,
            track_url     VARCHAR(1024),
            track_author  VARCHAR(256),
            track_duration BIGINT DEFAULT 0,
            track_source  VARCHAR(64),
            thumbnail     VARCHAR(1024),
            played_at     BIGINT NOT NULL,
            INDEX idx_guild_played  (guild_id, played_at),
            INDEX idx_user_played   (user_id, played_at),
            INDEX idx_guild_user    (guild_id, user_id)
        )
    `);

    // Saved tracks — user bookmarks a track
    await query(`
        CREATE TABLE IF NOT EXISTS music_saved_tracks (
            id            BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id       VARCHAR(32)  NOT NULL,
            guild_id      VARCHAR(32)  NOT NULL,
            track_title   VARCHAR(512) NOT NULL,
            track_url     VARCHAR(1024),
            track_author  VARCHAR(256),
            track_duration BIGINT DEFAULT 0,
            track_source  VARCHAR(64),
            thumbnail     VARCHAR(1024),
            note          VARCHAR(512),
            saved_at      BIGINT NOT NULL,
            INDEX idx_user_saved    (user_id, saved_at),
            INDEX idx_guild_saved   (guild_id, saved_at)
        )
    `);

    // User playlists
    await query(`
        CREATE TABLE IF NOT EXISTS music_playlists (
            id            BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id       VARCHAR(32)  NOT NULL,
            guild_id      VARCHAR(32)  NOT NULL,
            name          VARCHAR(128) NOT NULL,
            description   VARCHAR(512),
            created_at    BIGINT NOT NULL,
            updated_at    BIGINT NOT NULL,
            UNIQUE KEY uq_user_playlist (user_id, name),
            INDEX idx_user_playlists (user_id)
        )
    `);

    // Tracks inside a playlist
    await query(`
        CREATE TABLE IF NOT EXISTS music_playlist_tracks (
            id            BIGINT AUTO_INCREMENT PRIMARY KEY,
            playlist_id   BIGINT NOT NULL,
            track_title   VARCHAR(512) NOT NULL,
            track_url     VARCHAR(1024),
            track_author  VARCHAR(256),
            track_duration BIGINT DEFAULT 0,
            track_source  VARCHAR(64),
            thumbnail     VARCHAR(1024),
            position      INT NOT NULL DEFAULT 0,
            added_at      BIGINT NOT NULL,
            INDEX idx_playlist_pos  (playlist_id, position)
        )
    `);

    // Per-guild music settings
    await query(`
        CREATE TABLE IF NOT EXISTS music_guild_settings (
            guild_id      VARCHAR(32) PRIMARY KEY,
            default_volume INT DEFAULT 80,
            dj_role_id    VARCHAR(32),
            announce_channel VARCHAR(32),
            leave_on_empty  TINYINT(1) DEFAULT 1,
            leave_timeout   INT DEFAULT 30,
            max_queue_size  INT DEFAULT 500,
            updated_at    BIGINT NOT NULL
        )
    `);


}

// ─── Play History ─────────────────────────────────────────────────────────────

/**
 * Record a track play event.
 * @param {string} guildId
 * @param {string} userId
 * @param {object} track  discord-player Track object
 */
async function recordPlay(guildId, userId, track) {
    try {
        await query(
            `INSERT INTO music_play_history
                (guild_id, user_id, track_title, track_url, track_author, track_duration, track_source, thumbnail, played_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                guildId,
                userId,
                track.title?.substring(0, 512) || 'Unknown',
                track.url || null,
                track.author?.substring(0, 256) || null,
                track.durationMS || 0,
                track.source || null,
                track.thumbnail || null,
                Date.now(),
            ]
        );
    } catch (err) {
        console.error('❌ [MUSIC DB] recordPlay error:', err.message);
    }
}

/**
 * Fetch guild play history (most recent first).
 * @param {string} guildId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getGuildHistory(guildId, limit = 20) {
    try {
        return await query(
            `SELECT * FROM music_play_history
             WHERE guild_id = ?
             ORDER BY played_at DESC
             LIMIT ?`,
            [guildId, limit]
        );
    } catch (err) {
        console.error('❌ [MUSIC DB] getGuildHistory error:', err.message);
        return [];
    }
}

/**
 * Fetch a user's personal play history in a guild.
 * @param {string} guildId
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getUserHistory(guildId, userId, limit = 20) {
    try {
        return await query(
            `SELECT * FROM music_play_history
             WHERE guild_id = ? AND user_id = ?
             ORDER BY played_at DESC
             LIMIT ?`,
            [guildId, userId, limit]
        );
    } catch (err) {
        console.error('❌ [MUSIC DB] getUserHistory error:', err.message);
        return [];
    }
}

/**
 * Get top tracks played in a guild.
 * @param {string} guildId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getTopTracks(guildId, limit = 10) {
    try {
        return await query(
            `SELECT track_title, track_url, track_author, track_source, thumbnail,
                    COUNT(*) AS play_count
             FROM music_play_history
             WHERE guild_id = ?
             GROUP BY track_url, track_title, track_author, track_source, thumbnail
             ORDER BY play_count DESC
             LIMIT ?`,
            [guildId, limit]
        );
    } catch (err) {
        console.error('❌ [MUSIC DB] getTopTracks error:', err.message);
        return [];
    }
}

/**
 * Clear history for a guild.
 * @param {string} guildId
 */
async function clearGuildHistory(guildId) {
    try {
        await query(`DELETE FROM music_play_history WHERE guild_id = ?`, [guildId]);
    } catch (err) {
        console.error('❌ [MUSIC DB] clearGuildHistory error:', err.message);
    }
}

// ─── Saved Tracks ─────────────────────────────────────────────────────────────

/**
 * Save a track for a user.
 * @param {string} userId
 * @param {string} guildId
 * @param {object} track
 * @param {string|null} note
 * @returns {Promise<number>} inserted id
 */
async function saveTrack(userId, guildId, track, note = null) {
    const result = await query(
        `INSERT INTO music_saved_tracks
            (user_id, guild_id, track_title, track_url, track_author, track_duration, track_source, thumbnail, note, saved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            guildId,
            track.title?.substring(0, 512) || 'Unknown',
            track.url || null,
            track.author?.substring(0, 256) || null,
            track.durationMS || 0,
            track.source || null,
            track.thumbnail || null,
            note ? note.substring(0, 512) : null,
            Date.now(),
        ]
    );
    return result.insertId;
}

/**
 * Get saved tracks for a user.
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getSavedTracks(userId, limit = 25) {
    try {
        return await query(
            `SELECT * FROM music_saved_tracks
             WHERE user_id = ?
             ORDER BY saved_at DESC
             LIMIT ?`,
            [userId, limit]
        );
    } catch (err) {
        console.error('❌ [MUSIC DB] getSavedTracks error:', err.message);
        return [];
    }
}

/**
 * Remove a saved track by id.
 * @param {string} userId
 * @param {number} trackId
 */
async function removeSavedTrack(userId, trackId) {
    await query(
        `DELETE FROM music_saved_tracks WHERE id = ? AND user_id = ?`,
        [trackId, userId]
    );
}

// ─── Playlists ────────────────────────────────────────────────────────────────

/**
 * Create a new playlist.
 * @param {string} userId
 * @param {string} guildId
 * @param {string} name
 * @param {string|null} description
 * @returns {Promise<number>} playlist id
 */
async function createPlaylist(userId, guildId, name, description = null) {
    const now = Date.now();
    const result = await query(
        `INSERT INTO music_playlists (user_id, guild_id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, guildId, name.substring(0, 128), description ? description.substring(0, 512) : null, now, now]
    );
    return result.insertId;
}

/**
 * Get playlists for a user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getUserPlaylists(userId) {
    try {
        return await query(
            `SELECT p.*, COUNT(pt.id) AS track_count
             FROM music_playlists p
             LEFT JOIN music_playlist_tracks pt ON pt.playlist_id = p.id
             WHERE p.user_id = ?
             GROUP BY p.id
             ORDER BY p.updated_at DESC`,
            [userId]
        );
    } catch (err) {
        console.error('❌ [MUSIC DB] getUserPlaylists error:', err.message);
        return [];
    }
}

/**
 * Get a single playlist by name for a user.
 * @param {string} userId
 * @param {string} name
 * @returns {Promise<object|null>}
 */
async function getPlaylistByName(userId, name) {
    try {
        const rows = await query(
            `SELECT * FROM music_playlists WHERE user_id = ? AND name = ?`,
            [userId, name]
        );
        return rows[0] || null;
    } catch (err) {
        console.error('❌ [MUSIC DB] getPlaylistByName error:', err.message);
        return null;
    }
}

/**
 * Add a track to a playlist.
 * @param {number} playlistId
 * @param {object} track
 * @returns {Promise<number>} inserted id
 */
async function addTrackToPlaylist(playlistId, track) {
    // Get current max position
    const rows = await query(
        `SELECT COALESCE(MAX(position), -1) AS max_pos FROM music_playlist_tracks WHERE playlist_id = ?`,
        [playlistId]
    );
    const position = (rows[0]?.max_pos ?? -1) + 1;

    const result = await query(
        `INSERT INTO music_playlist_tracks
            (playlist_id, track_title, track_url, track_author, track_duration, track_source, thumbnail, position, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            playlistId,
            track.title?.substring(0, 512) || 'Unknown',
            track.url || null,
            track.author?.substring(0, 256) || null,
            track.durationMS || 0,
            track.source || null,
            track.thumbnail || null,
            position,
            Date.now(),
        ]
    );

    // Update playlist updated_at
    await query(
        `UPDATE music_playlists SET updated_at = ? WHERE id = ?`,
        [Date.now(), playlistId]
    );

    return result.insertId;
}

/**
 * Get tracks in a playlist.
 * @param {number} playlistId
 * @returns {Promise<Array>}
 */
async function getPlaylistTracks(playlistId) {
    try {
        return await query(
            `SELECT * FROM music_playlist_tracks WHERE playlist_id = ? ORDER BY position ASC`,
            [playlistId]
        );
    } catch (err) {
        console.error('❌ [MUSIC DB] getPlaylistTracks error:', err.message);
        return [];
    }
}

/**
 * Delete a playlist and all its tracks.
 * @param {string} userId
 * @param {number} playlistId
 */
async function deletePlaylist(userId, playlistId) {
    await query(`DELETE FROM music_playlist_tracks WHERE playlist_id = ?`, [playlistId]);
    await query(`DELETE FROM music_playlists WHERE id = ? AND user_id = ?`, [playlistId, userId]);
}

// ─── Guild Settings ───────────────────────────────────────────────────────────

/**
 * Get guild music settings (with defaults).
 * @param {string} guildId
 * @returns {Promise<object>}
 */
async function getGuildSettings(guildId) {
    try {
        const rows = await query(
            `SELECT * FROM music_guild_settings WHERE guild_id = ?`,
            [guildId]
        );
        if (rows[0]) return rows[0];
        // Return defaults
        return {
            guild_id: guildId,
            default_volume: 80,
            dj_role_id: null,
            announce_channel: null,
            leave_on_empty: 1,
            leave_timeout: 30,
            max_queue_size: 500,
        };
    } catch (err) {
        console.error('❌ [MUSIC DB] getGuildSettings error:', err.message);
        return { guild_id: guildId, default_volume: 80, leave_on_empty: 1, leave_timeout: 30, max_queue_size: 500 };
    }
}

/**
 * Update guild music settings.
 * @param {string} guildId
 * @param {object} settings
 */
async function updateGuildSettings(guildId, settings) {
    const now = Date.now();
    await query(
        `INSERT INTO music_guild_settings
            (guild_id, default_volume, dj_role_id, announce_channel, leave_on_empty, leave_timeout, max_queue_size, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            default_volume   = COALESCE(VALUES(default_volume), default_volume),
            dj_role_id       = COALESCE(VALUES(dj_role_id), dj_role_id),
            announce_channel = COALESCE(VALUES(announce_channel), announce_channel),
            leave_on_empty   = COALESCE(VALUES(leave_on_empty), leave_on_empty),
            leave_timeout    = COALESCE(VALUES(leave_timeout), leave_timeout),
            max_queue_size   = COALESCE(VALUES(max_queue_size), max_queue_size),
            updated_at       = VALUES(updated_at)`,
        [
            guildId,
            settings.default_volume ?? 80,
            settings.dj_role_id ?? null,
            settings.announce_channel ?? null,
            settings.leave_on_empty ?? 1,
            settings.leave_timeout ?? 30,
            settings.max_queue_size ?? 500,
            now,
        ]
    );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Get total play count for a guild.
 * @param {string} guildId
 * @returns {Promise<number>}
 */
async function getGuildPlayCount(guildId) {
    try {
        const rows = await query(
            `SELECT COUNT(*) AS cnt FROM music_play_history WHERE guild_id = ?`,
            [guildId]
        );
        return rows[0]?.cnt || 0;
    } catch (err) {
        return 0;
    }
}

/**
 * Get top listeners in a guild.
 * @param {string} guildId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getTopListeners(guildId, limit = 5) {
    try {
        return await query(
            `SELECT user_id, COUNT(*) AS play_count
             FROM music_play_history
             WHERE guild_id = ?
             GROUP BY user_id
             ORDER BY play_count DESC
             LIMIT ?`,
            [guildId, limit]
        );
    } catch (err) {
        console.error('❌ [MUSIC DB] getTopListeners error:', err.message);
        return [];
    }
}

module.exports = {
    initMusicSchema,
    // History
    recordPlay,
    getGuildHistory,
    getUserHistory,
    getTopTracks,
    clearGuildHistory,
    // Saved tracks
    saveTrack,
    getSavedTracks,
    removeSavedTrack,
    // Playlists
    createPlaylist,
    getUserPlaylists,
    getPlaylistByName,
    addTrackToPlaylist,
    getPlaylistTracks,
    deletePlaylist,
    // Guild settings
    getGuildSettings,
    updateGuildSettings,
    // Stats
    getGuildPlayCount,
    getTopListeners,
};

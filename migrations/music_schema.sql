-- ============================================================
-- Supreme BOT2 — Music TiDB Schema Migration
-- Run this manually or it will be auto-applied on bot startup
-- ============================================================

-- Play history — every track played is recorded
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
);

-- Saved tracks — user bookmarks a track
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
);

-- User playlists
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
);

-- Tracks inside a playlist
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
);

-- Per-guild music settings
CREATE TABLE IF NOT EXISTS music_guild_settings (
    guild_id      VARCHAR(32) PRIMARY KEY,
    default_volume INT DEFAULT 80,
    dj_role_id    VARCHAR(32),
    announce_channel VARCHAR(32),
    leave_on_empty  TINYINT(1) DEFAULT 1,
    leave_timeout   INT DEFAULT 30,
    max_queue_size  INT DEFAULT 500,
    updated_at    BIGINT NOT NULL
);

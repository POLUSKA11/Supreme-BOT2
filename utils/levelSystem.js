/**
 * ============================================================
 *  NEXUS BOT 2 — Level System Core
 *  Handles XP tracking, level calculation, cooldowns,
 *  and role reward assignment.
 * ============================================================
 */

const { query } = require('./db');

// ─── XP Configuration ────────────────────────────────────────
const XP_CONFIG = {
    // Base XP ranges per message type (Uniform for all types)
    MESSAGE:  { min: 15, max: 25 },   // Normal text message
    LINK:     { min: 15, max: 25 },   // Message containing a URL
    IMAGE:    { min: 15, max: 25 },   // Message with attachment(s)
    MIXED:    { min: 15, max: 25 },   // Image + link in same message

    // Cooldown in milliseconds (per user, per guild)
    COOLDOWN_MS: 60_000,              // 60 seconds between XP grants
};

// ─── Level Formula ────────────────────────────────────────────
// XP required to reach level N:  xpForLevel(N) = 5 * N^2 + 50 * N + 100
function xpForLevel(level) {
    return 5 * level * level + 50 * level + 100;
}

// Total XP needed to reach level N from level 0
function totalXpForLevel(level) {
    let total = 0;
    for (let i = 0; i < level; i++) {
        total += xpForLevel(i);
    }
    return total;
}

// Calculate level from total XP
function getLevelFromXp(totalXp) {
    let level = 0;
    let xpNeeded = 0;
    while (xpNeeded + xpForLevel(level) <= totalXp) {
        xpNeeded += xpForLevel(level);
        level++;
    }
    return { level, currentXp: totalXp - xpNeeded, xpNeeded: xpForLevel(level) };
}

// ─── In-Memory Cooldown Map ───────────────────────────────────
// Key: `${guildId}:${userId}` → timestamp of last XP grant
const cooldowns = new Map();

function isOnCooldown(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const last = cooldowns.get(key) || 0;
    return Date.now() - last < XP_CONFIG.COOLDOWN_MS;
}

function setCooldown(guildId, userId) {
    cooldowns.set(`${guildId}:${userId}`, Date.now());
}

function getRemainingCooldown(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const last = cooldowns.get(key) || 0;
    const remaining = XP_CONFIG.COOLDOWN_MS - (Date.now() - last);
    return remaining > 0 ? remaining : 0;
}

// ─── Determine XP Type ────────────────────────────────────────
function detectXpType(message) {
    const hasAttachment = message.attachments.size > 0;
    const hasLink = /https?:\/\/\S+/.test(message.content);

    if (hasAttachment && hasLink) return 'MIXED';
    if (hasAttachment) return 'IMAGE';
    if (hasLink) return 'LINK';
    return 'MESSAGE';
}

function randomXp(type) {
    const { min, max } = XP_CONFIG[type];
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Database Helpers ─────────────────────────────────────────
async function ensureTables() {
    await query(`
        CREATE TABLE IF NOT EXISTS levels (
            guild_id   VARCHAR(255) NOT NULL,
            user_id    VARCHAR(255) NOT NULL,
            xp         BIGINT       NOT NULL DEFAULT 0,
            level      INT          NOT NULL DEFAULT 0,
            messages   BIGINT       NOT NULL DEFAULT 0,
            updated_at BIGINT       NOT NULL DEFAULT 0,
            PRIMARY KEY (guild_id, user_id),
            INDEX idx_guild_xp (guild_id, xp DESC)
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS level_roles (
            guild_id   VARCHAR(255) NOT NULL,
            level      INT          NOT NULL,
            role_id    VARCHAR(255) NOT NULL,
            PRIMARY KEY (guild_id, level),
            INDEX idx_guild (guild_id)
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS level_config (
            guild_id        VARCHAR(255) NOT NULL,
            config_key      VARCHAR(100) NOT NULL,
            config_value    TEXT,
            PRIMARY KEY (guild_id, config_key)
        )
    `);
}

async function getUserData(guildId, userId) {
    const rows = await query(
        'SELECT * FROM levels WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );
    if (rows.length === 0) {
        return { guild_id: guildId, user_id: userId, xp: 0, level: 0, messages: 0 };
    }
    return rows[0];
}

async function upsertUserData(guildId, userId, xp, level, messages) {
    await query(`
        INSERT INTO levels (guild_id, user_id, xp, level, messages, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            xp         = VALUES(xp),
            level      = VALUES(level),
            messages   = VALUES(messages),
            updated_at = VALUES(updated_at)
    `, [guildId, userId, xp, level, messages, Date.now()]);
}

async function getLevelRoles(guildId) {
    return await query(
        'SELECT level, role_id FROM level_roles WHERE guild_id = ? ORDER BY level ASC',
        [guildId]
    );
}

async function setLevelRole(guildId, level, roleId) {
    await query(`
        INSERT INTO level_roles (guild_id, level, role_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)
    `, [guildId, level, roleId]);
}

async function removeLevelRole(guildId, level) {
    await query(
        'DELETE FROM level_roles WHERE guild_id = ? AND level = ?',
        [guildId, level]
    );
}

async function getConfig(guildId, key, defaultValue = null) {
    const rows = await query(
        'SELECT config_value FROM level_config WHERE guild_id = ? AND config_key = ?',
        [guildId, key]
    );
    return rows.length > 0 ? rows[0].config_value : defaultValue;
}

async function setConfig(guildId, key, value) {
    await query(`
        INSERT INTO level_config (guild_id, config_key, config_value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
    `, [guildId, key, value]);
}

async function getLeaderboard(guildId, limit = 10) {
    if (!guildId) return [];
    const sanitizedLimit = Math.max(1, parseInt(limit, 10) || 10);
    return await query(
        `SELECT user_id, xp, level, messages FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ${sanitizedLimit}`,
        [guildId]
    );
}

// ─── Main XP Grant Function ───────────────────────────────────
/**
 * Process a message for XP. Returns levelUp info if the user leveled up.
 * @param {import('discord.js').Message} message
 * @returns {Promise<{leveledUp: boolean, oldLevel: number, newLevel: number, xpGained: number, newXp: number, newLevel: number} | null>}
 */
async function processMessage(message) {
    const { guild, author } = message;
    if (!guild || author.bot) return null;

    // Cooldown check
    if (isOnCooldown(guild.id, author.id)) return null;

    // Check if leveling is enabled for this guild
    const enabled = await getConfig(guild.id, 'enabled', '1');
    if (enabled === '0') return null;

    // Check if channel is ignored
    const ignoredChannels = await getConfig(guild.id, 'ignored_channels', '');
    if (ignoredChannels && ignoredChannels.split(',').includes(message.channel.id)) return null;

    // Detect type and award XP
    const xpType = detectXpType(message);
    let xpGained = randomXp(xpType);

    // Apply XP rate multiplier from guild config
    const xpRateStr = await getConfig(guild.id, 'xp_rate', '1.0');
    const xpRate = parseFloat(xpRateStr) || 1.0;
    if (xpRate !== 1.0) {
        xpGained = Math.max(1, Math.round(xpGained * xpRate));
    }

    // Fetch current data
    const userData = await getUserData(guild.id, author.id);
    const newXp = userData.xp + xpGained;
    const newMessages = userData.messages + 1;

    // Calculate levels
    const { level: newLevel } = getLevelFromXp(newXp);
    const oldLevel = userData.level;

    // Save
    await upsertUserData(guild.id, author.id, newXp, newLevel, newMessages);

    // Set cooldown
    setCooldown(guild.id, author.id);

    // Return level-up info if applicable
    if (newLevel > oldLevel) {
        return {
            leveledUp: true,
            oldLevel,
            newLevel,
            xpGained,
            newXp,
            xpType
        };
    }

    return { leveledUp: false, xpGained, newXp, xpType };
}

module.exports = {
    // Core
    processMessage,
    getUserData,
    getLevelFromXp,
    xpForLevel,
    totalXpForLevel,
    // Cooldowns
    isOnCooldown,
    getRemainingCooldown,
    // Roles
    getLevelRoles,
    setLevelRole,
    removeLevelRole,
    // Config
    getConfig,
    setConfig,
    // Leaderboard
    getLeaderboard,
    // DB Setup
    ensureTables,
    // Helpers
    detectXpType,
    XP_CONFIG,
};

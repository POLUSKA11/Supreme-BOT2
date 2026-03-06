const express = require('express');
const router = express.Router();
const { query } = require('../utils/db');
const storage = require('../commands/utility/storage.js');

// ============================================================
// ADMIN PANEL API — Restricted to Discord User 982731220913913856
// ============================================================

const ADMIN_USER_ID = '982731220913913856';

/**
 * Middleware: Only allow the designated admin user
 */
const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.session.user.id !== ADMIN_USER_ID) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

// ============================================================
// ENSURE TABLES EXIST
// ============================================================

async function ensureAdminTables() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS web_login_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(32) NOT NULL,
                username VARCHAR(100) NOT NULL,
                discriminator VARCHAR(10) DEFAULT '0',
                avatar VARCHAR(255),
                ip_address VARCHAR(64),
                user_agent TEXT,
                logged_in_at BIGINT NOT NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_logged_in_at (logged_in_at)
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS premium_subscriptions (
                guild_id VARCHAR(32) PRIMARY KEY,
                plan VARCHAR(32) NOT NULL,
                payment_method VARCHAR(32) NOT NULL DEFAULT 'admin',
                transaction_id VARCHAR(255),
                activated_at DATETIME NOT NULL,
                expires_at DATETIME NOT NULL,
                granted_by VARCHAR(32) DEFAULT NULL
            )
        `);
    } catch (err) {
        console.error('[ADMIN] Error ensuring admin tables:', err.message);
    }
}

ensureAdminTables();

// ============================================================
// PUBLIC: Log a web login (called from auth callback)
// ============================================================

/**
 * POST /api/admin/log-login
 * Called internally when a user successfully authenticates via OAuth
 */
router.post('/log-login', async (req, res) => {
    try {
        const { user_id, username, discriminator, avatar, ip_address, user_agent } = req.body;
        if (!user_id || !username) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        await query(
            `INSERT INTO web_login_logs (user_id, username, discriminator, avatar, ip_address, user_agent, logged_in_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user_id, username, discriminator || '0', avatar || null, ip_address || null, user_agent || null, Date.now()]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[ADMIN] Error logging login:', err.message);
        res.status(500).json({ error: 'Failed to log login' });
    }
});

// ============================================================
// ADMIN: Global Stats
// ============================================================

/**
 * GET /api/admin/stats
 */
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const client = req.app.locals.client;

        // Bot guild count
        const totalGuilds = client ? client.guilds.cache.size : 0;
        const totalUsers = client
            ? client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)
            : 0;

        // Premium count
        let premiumCount = 0;
        try {
            const premRows = await query(
                `SELECT COUNT(*) as cnt FROM premium_subscriptions WHERE expires_at > NOW()`
            );
            premiumCount = premRows[0]?.cnt || 0;
        } catch (_) {}

        // Unique web logins (all time)
        let totalWebLogins = 0;
        let uniqueWebUsers = 0;
        try {
            const loginRows = await query(`SELECT COUNT(*) as cnt, COUNT(DISTINCT user_id) as uniq FROM web_login_logs`);
            totalWebLogins = loginRows[0]?.cnt || 0;
            uniqueWebUsers = loginRows[0]?.uniq || 0;
        } catch (_) {}

        // Recent logins (last 24h)
        let recentLogins = 0;
        try {
            const recentRows = await query(
                `SELECT COUNT(*) as cnt FROM web_login_logs WHERE logged_in_at > ?`,
                [Date.now() - 86400000]
            );
            recentLogins = recentRows[0]?.cnt || 0;
        } catch (_) {}

        res.json({
            totalGuilds,
            totalUsers,
            premiumCount,
            totalWebLogins,
            uniqueWebUsers,
            recentLogins,
            botStatus: client ? (client.isReady() ? 'online' : 'connecting') : 'offline',
            botPing: client ? client.ws.ping : null,
            uptime: process.uptime(),
        });
    } catch (err) {
        console.error('[ADMIN] Stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ============================================================
// ADMIN: Web Login Logs
// ============================================================

/**
 * GET /api/admin/web-logins
 */
router.get('/web-logins', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = parseInt((page - 1) * limit);
        const search = req.query.search || '';

        let rows, countRows;

        if (search) {
            rows = await query(
                `SELECT * FROM web_login_logs WHERE username LIKE ? OR user_id LIKE ?
                 ORDER BY logged_in_at DESC LIMIT ${limit} OFFSET ${offset}`,
                [`%${search}%`, `%${search}%`]
            );
            countRows = await query(
                `SELECT COUNT(*) as cnt FROM web_login_logs WHERE username LIKE ? OR user_id LIKE ?`,
                [`%${search}%`, `%${search}%`]
            );
        } else {
            rows = await query(
                `SELECT * FROM web_login_logs ORDER BY logged_in_at DESC LIMIT ${limit} OFFSET ${offset}`,
                []
            );
            countRows = await query(`SELECT COUNT(*) as cnt FROM web_login_logs`);
        }

        const total = countRows[0]?.cnt || 0;

        res.json({
            logins: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('[ADMIN] Web logins error:', err.message);
        res.status(500).json({ error: 'Failed to fetch login logs' });
    }
});

/**
 * DELETE /api/admin/web-logins/clear
 * Clear all login logs
 */
router.delete('/web-logins/clear', requireAdmin, async (req, res) => {
    try {
        await query(`DELETE FROM web_login_logs`);
        res.json({ success: true });
    } catch (err) {
        console.error('[ADMIN] Clear logs error:', err.message);
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

// ============================================================
// ADMIN: Registered Users (unique Discord users who ever logged in)
// ============================================================

/**
 * GET /api/admin/registered-users
 */
router.get('/registered-users', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = parseInt((page - 1) * limit);
        const search = req.query.search || '';

        let rows, countRows;

        if (search) {
            rows = await query(
                `SELECT user_id, username, discriminator, avatar,
                         COUNT(*) as login_count,
                         MAX(logged_in_at) as last_login,
                         MIN(logged_in_at) as first_login
                 FROM web_login_logs
                 WHERE username LIKE ? OR user_id LIKE ?
                 GROUP BY user_id, username, discriminator, avatar
                 ORDER BY last_login DESC LIMIT ${limit} OFFSET ${offset}`,
                [`%${search}%`, `%${search}%`]
            );
            countRows = await query(
                `SELECT COUNT(DISTINCT user_id) as cnt FROM web_login_logs WHERE username LIKE ? OR user_id LIKE ?`,
                [`%${search}%`, `%${search}%`]
            );
        } else {
            rows = await query(
                `SELECT user_id, username, discriminator, avatar,
                         COUNT(*) as login_count,
                         MAX(logged_in_at) as last_login,
                         MIN(logged_in_at) as first_login
                 FROM web_login_logs
                 GROUP BY user_id, username, discriminator, avatar
                 ORDER BY last_login DESC LIMIT ${limit} OFFSET ${offset}`,
                []
            );
            countRows = await query(`SELECT COUNT(DISTINCT user_id) as cnt FROM web_login_logs`);
        }

        const total = countRows[0]?.cnt || 0;

        res.json({
            users: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('[ADMIN] Registered users error:', err.message);
        res.status(500).json({ error: 'Failed to fetch registered users' });
    }
});

// ============================================================
// ADMIN: Premium Management
// ============================================================

/**
 * GET /api/admin/premium/all
 */
router.get('/premium/all', requireAdmin, async (req, res) => {
    try {
        const client = req.app.locals.client;
         const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = parseInt((page - 1) * limit);
        let rows = [];
        let total = 0;

        try {
            const countRows = await query(`SELECT COUNT(*) as cnt FROM premium_subscriptions`);
            total = countRows[0]?.cnt || 0;

            rows = await query(
                `SELECT * FROM premium_subscriptions ORDER BY expires_at DESC LIMIT ${limit} OFFSET ${offset}`,
                []
            );
        } catch (dbErr) {
            console.error('[ADMIN] Premium DB error:', dbErr.message);
        }

        // Enrich with guild names from Discord client
        const enriched = rows.map((row) => {
            let guildName = row.guild_id;
            let guildIcon = null;
            let memberCount = null;
            if (client) {
                const guild = client.guilds.cache.get(row.guild_id);
                if (guild) {
                    guildName = guild.name;
                    guildIcon = guild.icon
                        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                        : null;
                    memberCount = guild.memberCount;
                }
            }
            const now = new Date();
            const expiresAt = new Date(row.expires_at);
            const isActive = expiresAt > now;
            const daysLeft = isActive
                ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
                : 0;

            return {
                ...row,
                guildName,
                guildIcon,
                memberCount,
                isActive,
                daysLeft,
            };
        });

        res.json({
            subscriptions: enriched,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('[ADMIN] Premium all error:', err.message);
        res.status(500).json({ error: 'Failed to fetch premium subscriptions' });
    }
});

/**
 * POST /api/admin/premium/grant
 * Body: { guildId, plan, duration (days) }
 */
router.post('/premium/grant', requireAdmin, async (req, res) => {
    try {
        const { guildId, plan, duration } = req.body;
        if (!guildId || !plan) {
            return res.status(400).json({ error: 'guildId and plan are required' });
        }

        const validPlans = ['pro', 'ultimate'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan. Must be: pro, ultimate' });
        }

        const days = parseInt(duration) || 30;
        const adminId = req.session.user.id;

        // Update in-memory storage
        const premiumData = {
            plan,
            paymentMethod: 'admin_grant',
            transactionId: `admin_${adminId}_${Date.now()}`,
            activatedAt: Date.now(),
            expiresAt: Date.now() + days * 24 * 60 * 60 * 1000,
        };
        storage.set(guildId, 'premium', premiumData);

        // Upsert in DB
        await query(
            `INSERT INTO premium_subscriptions (guild_id, plan, payment_method, transaction_id, activated_at, expires_at, granted_by)
             VALUES (?, ?, 'admin_grant', ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), ?)
             ON DUPLICATE KEY UPDATE
               plan = VALUES(plan),
               payment_method = 'admin_grant',
               transaction_id = VALUES(transaction_id),
               activated_at = NOW(),
               expires_at = DATE_ADD(NOW(), INTERVAL ? DAY),
               granted_by = VALUES(granted_by)`,
            [guildId, plan, `admin_${adminId}_${Date.now()}`, days, adminId, days]
        );

        // Get guild name if available
        const client = req.app.locals.client;
        let guildName = guildId;
        if (client) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guildName = guild.name;
        }

        res.json({ success: true, guildId, guildName, plan, days, premiumData });
    } catch (err) {
        console.error('[ADMIN] Premium grant error:', err.message);
        res.status(500).json({ error: 'Failed to grant premium' });
    }
});

/**
 * POST /api/admin/premium/revoke
 * Body: { guildId }
 */
router.post('/premium/revoke', requireAdmin, async (req, res) => {
    try {
        const { guildId } = req.body;
        if (!guildId) {
            return res.status(400).json({ error: 'guildId is required' });
        }

        // Remove from in-memory storage
        storage.set(guildId, 'premium', null);

        // Remove from DB
        await query(`DELETE FROM premium_subscriptions WHERE guild_id = ?`, [guildId]);

        res.json({ success: true, guildId });
    } catch (err) {
        console.error('[ADMIN] Premium revoke error:', err.message);
        res.status(500).json({ error: 'Failed to revoke premium' });
    }
});

/**
 * POST /api/admin/premium/extend
 * Body: { guildId, days }
 */
router.post('/premium/extend', requireAdmin, async (req, res) => {
    try {
        const { guildId, days } = req.body;
        if (!guildId || !days) {
            return res.status(400).json({ error: 'guildId and days are required' });
        }

        const extendDays = parseInt(days);
        if (isNaN(extendDays) || extendDays <= 0) {
            return res.status(400).json({ error: 'days must be a positive integer' });
        }

        // Update DB
        const result = await query(
            `UPDATE premium_subscriptions
             SET expires_at = DATE_ADD(GREATEST(expires_at, NOW()), INTERVAL ? DAY)
             WHERE guild_id = ?`,
            [extendDays, guildId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No premium subscription found for this guild' });
        }

        // Update in-memory storage
        const existing = storage.get(guildId, 'premium');
        if (existing) {
            const currentExpiry = existing.expiresAt || Date.now();
            existing.expiresAt = Math.max(currentExpiry, Date.now()) + extendDays * 24 * 60 * 60 * 1000;
            storage.set(guildId, 'premium', existing);
        }

        res.json({ success: true, guildId, extendedDays: extendDays });
    } catch (err) {
        console.error('[ADMIN] Premium extend error:', err.message);
        res.status(500).json({ error: 'Failed to extend premium' });
    }
});

// ============================================================
// ADMIN: All Bot Guilds
// ============================================================

/**
 * GET /api/admin/guilds
 */
router.get('/guilds', requireAdmin, async (req, res) => {
    try {
        const client = req.app.locals.client;
        if (!client) {
            return res.status(503).json({ error: 'Bot client not available' });
        }

        // Get all premium guild IDs
        let premiumGuildIds = new Set();
        try {
            const premRows = await query(
                `SELECT guild_id FROM premium_subscriptions WHERE expires_at > NOW()`
            );
            premRows.forEach((r) => premiumGuildIds.add(r.guild_id));
        } catch (_) {}

        const guilds = client.guilds.cache.map((guild) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                : null,
            memberCount: guild.memberCount,
            isPremium: premiumGuildIds.has(guild.id),
            ownerId: guild.ownerId,
            joinedAt: guild.joinedAt,
        }));

        // Sort by member count desc
        guilds.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));

        res.json({ guilds, total: guilds.length });
    } catch (err) {
        console.error('[ADMIN] Guilds error:', err.message);
        res.status(500).json({ error: 'Failed to fetch guilds' });
    }
});

// ============================================================
// ADMIN: Check if current user is admin
// ============================================================

/**
 * GET /api/admin/check
 */
router.get('/check', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.json({ isAdmin: false });
    }
    res.json({
        isAdmin: req.session.user.id === ADMIN_USER_ID,
        userId: req.session.user.id,
    });
});

module.exports = router;

/**
 * ============================================================
 *  SUPREME BOT 2 — Leveling API Routes
 *  Provides REST endpoints for the dashboard to manage
 *  the leveling system without touching existing APIs.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const levelSystem = require('../utils/levelSystem');
const { query } = require('../utils/db');

// ─── Auth Middleware (reuse session from dashboardApi) ────────
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// ─── GET /api/leveling/:guildId/leaderboard ───────────────────
router.get('/:guildId/leaderboard', requireAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
        const data = await levelSystem.getLeaderboard(guildId, limit);

        const client = req.app.locals.client;
        const guild = client?.guilds.cache.get(guildId);

        const enriched = await Promise.all(data.map(async (entry, i) => {
            const { level, currentXp, xpNeeded } = levelSystem.getLevelFromXp(entry.xp);
            let username = entry.user_id;
            let avatar = null;

            if (guild) {
                const member = await guild.members.fetch(entry.user_id).catch(() => null);
                if (member) {
                    username = member.displayName;
                    avatar = member.user.displayAvatarURL({ size: 64 });
                }
            }

            return {
                rank: i + 1,
                userId: entry.user_id,
                username,
                avatar,
                level,
                xp: entry.xp,
                currentXp,
                xpNeeded,
                messages: entry.messages,
            };
        }));

        res.json({ success: true, data: enriched });
    } catch (err) {
        console.error('[LEVELING API] Leaderboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/leveling/:guildId/user/:userId ──────────────────
router.get('/:guildId/user/:userId', requireAuth, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const userData = await levelSystem.getUserData(guildId, userId);
        const { level, currentXp, xpNeeded } = levelSystem.getLevelFromXp(userData.xp);

        const all = await levelSystem.getLeaderboard(guildId, 1000);
        const rank = all.findIndex(u => u.user_id === userId) + 1;

        res.json({
            success: true,
            data: {
                userId,
                level,
                xp: userData.xp,
                currentXp,
                xpNeeded,
                messages: userData.messages,
                rank: rank > 0 ? rank : null,
            }
        });
    } catch (err) {
        console.error('[LEVELING API] User fetch error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/leveling/:guildId/roles ─────────────────────────
router.get('/:guildId/roles', requireAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const roles = await levelSystem.getLevelRoles(guildId);
        res.json({ success: true, data: roles });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/leveling/:guildId/roles ────────────────────────
router.post('/:guildId/roles', requireAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { level, roleId } = req.body;

        if (!level || !roleId) {
            return res.status(400).json({ error: 'level and roleId are required' });
        }

        await levelSystem.setLevelRole(guildId, parseInt(level), roleId);
        res.json({ success: true, message: `Role reward set for Level ${level}` });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── DELETE /api/leveling/:guildId/roles/:level ───────────────
router.delete('/:guildId/roles/:level', requireAuth, async (req, res) => {
    try {
        const { guildId, level } = req.params;
        await levelSystem.removeLevelRole(guildId, parseInt(level));
        res.json({ success: true, message: `Role reward removed for Level ${level}` });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/leveling/:guildId/config ────────────────────────
router.get('/:guildId/config', requireAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const enabled = await levelSystem.getConfig(guildId, 'enabled', '1');
        const announceChannel = await levelSystem.getConfig(guildId, 'announce_channel', null);
        const ignoredChannels = await levelSystem.getConfig(guildId, 'ignored_channels', '');

        res.json({
            success: true,
            data: {
                enabled: enabled === '1',
                announceChannel,
                ignoredChannels: ignoredChannels ? ignoredChannels.split(',').filter(Boolean) : [],
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PATCH /api/leveling/:guildId/config ──────────────────────
router.patch('/:guildId/config', requireAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { enabled, announceChannel, ignoredChannels } = req.body;

        if (enabled !== undefined) {
            await levelSystem.setConfig(guildId, 'enabled', enabled ? '1' : '0');
        }
        if (announceChannel !== undefined) {
            await levelSystem.setConfig(guildId, 'announce_channel', announceChannel);
        }
        if (ignoredChannels !== undefined) {
            await levelSystem.setConfig(guildId, 'ignored_channels',
                Array.isArray(ignoredChannels) ? ignoredChannels.join(',') : ignoredChannels
            );
        }

        res.json({ success: true, message: 'Config updated' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/leveling/:guildId/user/:userId/add-xp ─────────
router.post('/:guildId/user/:userId/add-xp', requireAuth, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const { amount } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Valid positive amount is required' });
        }

        const userData = await levelSystem.getUserData(guildId, userId);
        const newXp = userData.xp + parseInt(amount, 10);
        const { level: newLevel } = levelSystem.getLevelFromXp(newXp);

        await query(`
            INSERT INTO levels (guild_id, user_id, xp, level, messages, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                xp = VALUES(xp), level = VALUES(level), updated_at = VALUES(updated_at)
        `, [guildId, userId, newXp, newLevel, userData.messages, Date.now()]);

        res.json({ success: true, data: { newXp, newLevel } });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── DELETE /api/leveling/:guildId/user/:userId ───────────────
router.delete('/:guildId/user/:userId', requireAuth, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        await query('DELETE FROM levels WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
        res.json({ success: true, message: 'User XP reset' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

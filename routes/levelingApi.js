/**
 * ============================================================
 *  NEXUS BOT 2 — Leveling API Routes
 *  Provides REST endpoints for the dashboard to manage
 *  the leveling system without touching existing APIs.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const levelSystem = require('../utils/levelSystem');
const { query } = require('../utils/db');
const { generateRankCard } = require('../utils/rankCardGenerator');
const { PermissionFlagsBits } = require('discord.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage_module = require('../commands/utility/storage.js');

// ─── Multer Setup for Background Uploads ─────────────────────
const uploadDir = path.join(__dirname, '..', 'data', 'uploads', 'backgrounds');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `bg_${req.params.guildId}_${Date.now()}${ext}`;
        cb(null, safeName);
    }
});

const bgUpload = multer({
    storage: multerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'));
        }
    }
});

// ─── Auth Middleware (aligned with dashboardApi.js) ──────────
const requireAuth = (req, res, next) => {
    // dashboardApi.js uses req.session.user
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// ─── Guild Access Middleware (aligned with dashboardApi.js) ──
const requireGuildAccess = async (req, res, next) => {
    const { guildId } = req.params;
    const client = req.app.locals.client;
    const guild = client?.guilds.cache.get(guildId);
    
    if (!guild) {
        return res.status(404).json({ error: 'Server not found' });
    }
    
    const userId = req.session.user.id;
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this server' });
        }
        
        // Check if user has Administrator or Manage Server permissions
        if (!member.permissions.has(PermissionFlagsBits.Administrator) && 
            !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return res.status(403).json({ error: 'You do not have permission to manage this server' });
        }
        
        next();
    } catch (error) {
        console.error('[LEVELING API] Guild access check error:', error);
        res.status(500).json({ error: 'Failed to verify permissions' });
    }
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
router.get('/:guildId/roles', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const { guildId } = req.params;
        const roles = await levelSystem.getLevelRoles(guildId);
        res.json({ success: true, data: roles });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/leveling/:guildId/roles ────────────────────────
router.post('/:guildId/roles', requireAuth, requireGuildAccess, async (req, res) => {
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
router.delete('/:guildId/roles/:level', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const { guildId, level } = req.params;
        await levelSystem.removeLevelRole(guildId, parseInt(level));
        res.json({ success: true, message: `Role reward removed for Level ${level}` });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/leveling/:guildId/config ────────────────────────
router.get('/:guildId/config', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const { guildId } = req.params;
        const enabled = await levelSystem.getConfig(guildId, 'enabled', '1');
        const announceChannel = await levelSystem.getConfig(guildId, 'announce_channel', null);
        const ignoredChannels = await levelSystem.getConfig(guildId, 'ignored_channels', '');
        const xpRate = await levelSystem.getConfig(guildId, 'xp_rate', '1.0');
        const noExtraXpForPremium = await levelSystem.getConfig(guildId, 'no_extra_xp_premium', '0');

        res.json({
            success: true,
            data: {
                enabled: enabled === '1',
                announceChannel,
                ignoredChannels: ignoredChannels ? ignoredChannels.split(',').filter(Boolean) : [],
                xpRate: parseFloat(xpRate),
                noExtraXpForPremium: noExtraXpForPremium === '1'
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PATCH /api/leveling/:guildId/config ──────────────────────
router.patch('/:guildId/config', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { enabled, announceChannel, ignoredChannels, xpRate, noExtraXpForPremium } = req.body;

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
        if (xpRate !== undefined) {
            await levelSystem.setConfig(guildId, 'xp_rate', xpRate.toString());
        }
        if (noExtraXpForPremium !== undefined) {
            await levelSystem.setConfig(guildId, 'no_extra_xp_premium', noExtraXpForPremium ? '1' : '0');
        }

        res.json({ success: true, message: 'Config updated' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/leveling/:guildId/user/:userId/add-xp ─────────
router.post('/:guildId/user/:userId/add-xp', requireAuth, requireGuildAccess, async (req, res) => {
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
router.delete('/:guildId/user/:userId', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        await query('DELETE FROM levels WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
        res.json({ success: true, message: 'User XP reset' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Rank Card Customization Endpoints ────────────────────────

/**
 * GET /api/leveling/:guildId/card-settings/:userId
 * Fetch rank card customization settings for a user.
 * If userId is 'default', fetches server-wide default settings.
 */
router.get('/:guildId/card-settings/:userId', requireAuth, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const raw = await levelSystem.getConfig(guildId, `card_settings_${userId}`, null);
        const settings = raw ? JSON.parse(raw) : {};
        // Normalize backgroundImage: treat empty string as null
        if (settings.backgroundImage === '') settings.backgroundImage = null;
        res.json({ success: true, data: settings });
    } catch (err) {
        console.error('[LEVELING API] Error fetching card settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/leveling/:guildId/card-settings/:userId
 * Save rank card customization settings for a user.
 * If userId is 'default', saves server-wide default settings.
 */
router.post('/:guildId/card-settings/:userId', requireAuth, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        
        // If userId is 'default', only allow admins
        if (userId === 'default') {
            const client = req.app.locals.client;
            const guild = client?.guilds.cache.get(guildId);
            if (!guild) return res.status(404).json({ error: 'Server not found. Make sure the bot is in your server.' });
            
            const member = await guild.members.fetch(req.session.user.id).catch(() => null);
            if (!member) {
                return res.status(403).json({ error: 'You are not a member of this server.' });
            }
            if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return res.status(403).json({ error: 'Forbidden: Only admins can edit default settings.' });
            }
        } else if (req.session.user.id !== userId) {
            // Only allow users to edit their own settings
            return res.status(403).json({ error: 'Forbidden: You can only edit your own settings.' });
        }

        const settings = req.body;

        // Normalize backgroundImage: treat empty string as null
        if (settings.backgroundImage === '') settings.backgroundImage = null;

        // Validate required fields
        if (settings.mainColor && !/^#[0-9A-Fa-f]{6}$/.test(settings.mainColor)) {
            return res.status(400).json({ error: 'Invalid mainColor. Use format: #RRGGBB' });
        }
        if (settings.backgroundColor && !/^#[0-9A-Fa-f]{6}$/.test(settings.backgroundColor)) {
            return res.status(400).json({ error: 'Invalid backgroundColor. Use format: #RRGGBB' });
        }

        await levelSystem.setConfig(guildId, `card_settings_${userId}`, JSON.stringify(settings));
        console.log(`[LEVELING API] Saved card settings for guild=${guildId} userId=${userId}:`, settings);
        res.json({ success: true, message: 'Rank card settings saved' });
    } catch (err) {
        console.error('[LEVELING API] Error saving card settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/leveling/:guildId/card-preview/:userId
 * Generate a preview of the rank card with current or pending settings.
 */
router.get('/:guildId/card-preview/:userId', requireAuth, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const client = req.app.locals.client;
        const guild = client?.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });

        let username = 'User';
        let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
        let level = 12;
        let rankPos = 44;
        let currentXp = 429;
        let xpNeeded = 1337;
        let totalXp = 429;

        // Use the requested userId for the preview data
        // If 'default', it uses the placeholder data above
        if (userId !== 'default') {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
                username = member.user.username;
                avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
            }

            const userData = await levelSystem.getUserData(guildId, userId);
            const levelData = levelSystem.getLevelFromXp(userData.xp);
            level = levelData.level;
            currentXp = levelData.currentXp;
            xpNeeded = levelData.xpNeeded;
            totalXp = userData.xp;
            
            const leaderboard = await levelSystem.getLeaderboard(guildId, 100);
            rankPos = leaderboard.findIndex(u => u.user_id === userId) + 1;
            if (rankPos === 0) rankPos = 1;
        }

        // Get settings from query params (for live preview) or DB
        let cardSettings = {};
        if (req.query.settings) {
            try {
                cardSettings = JSON.parse(req.query.settings);
                // Normalize backgroundImage
                if (cardSettings.backgroundImage === '') cardSettings.backgroundImage = null;
            } catch (e) {}
        } else {
            // 1. Load server-wide default settings
            const defaultRaw = await levelSystem.getConfig(guildId, 'card_settings_default', null);
            if (defaultRaw) {
                try {
                    const parsed = JSON.parse(defaultRaw);
                    if (parsed) cardSettings = { ...parsed };
                } catch (e) {}
            }

            // 2. Overlay user-specific settings if they exist
            const userRaw = await levelSystem.getConfig(guildId, `card_settings_${userId}`, null);
            if (userRaw) {
                try {
                    const parsed = JSON.parse(userRaw);
                    if (parsed) cardSettings = { ...cardSettings, ...parsed };
                } catch (e) {}
            }
            
            // Normalize
            if (cardSettings.backgroundImage === '') cardSettings.backgroundImage = null;
        }

        const cardBuf = await generateRankCard({
            username,
            avatarUrl,
            level,
            rank: rankPos,
            currentXp,
            xpNeeded,
            totalXp,
            cardSettings,
        });

        res.set('Content-Type', 'image/png');
        res.send(cardBuf);
    } catch (err) {
        console.error('[LEVELING API] Error generating card preview:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/leveling/:guildId/premium-check ────────────────
/**
 * Check if the current user has premium or is the server owner.
 * Used by the frontend to conditionally show/enable premium features.
 */
router.get('/:guildId/premium-check', requireAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.app.locals.client;
        const guild = client?.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Server not found.' });

        const userId = req.session.user.id;

        // Check if user is server owner
        const isOwner = guild.ownerId === userId;

        // Check premium status
        const premiumData = storage_module.get(guildId, 'premium');
        const isPremium = !!(premiumData && (!premiumData.expiresAt || Date.now() < premiumData.expiresAt));

        res.json({
            success: true,
            isPremium,
            isOwner,
            canAccessPremiumFeatures: isPremium || isOwner
        });
    } catch (err) {
        console.error('[LEVELING API] Premium check error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/leveling/:guildId/upload-background ─────────────
/**
 * Upload a custom background image for the rank card.
 * Requires: Premium subscription OR server owner.
 * Validates: file type (image only), file size (max 5MB).
 */
router.post('/:guildId/upload-background', requireAuth, requireGuildAccess, (req, res, next) => {
    bgUpload.single('background')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = req.app.locals.client;
        const guild = client?.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Server not found.' });

        const userId = req.session.user.id;

        // Check if user is server owner
        const isOwner = guild.ownerId === userId;

        // Check premium status
        const premiumData = storage_module.get(guildId, 'premium');
        const isPremium = premiumData && (!premiumData.expiresAt || Date.now() < premiumData.expiresAt);

        if (!isOwner && !isPremium) {
            // Remove the uploaded file if not authorized
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(403).json({
                error: 'You need a Premium subscription or be the server owner to upload a custom background.'
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Please select an image file.' });
        }

        // Double-check file type by extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.' });
        }

        // Build public URL for the uploaded file
        const baseUrl = process.env.BASE_URL || 'https://breakable-tiger-nexusbot1-d8a3b39c.koyeb.app';
        const fileUrl = `${baseUrl}/api/leveling/backgrounds/${req.file.filename}`;

        console.log(`[LEVELING API] Background uploaded for guild=${guildId} by user=${userId}: ${req.file.filename}`);

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            message: 'Background uploaded successfully!'
        });
    } catch (err) {
        console.error('[LEVELING API] Background upload error:', err);
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(500).json({ error: 'Internal server error during upload.' });
    }
});

// ─── GET /api/leveling/backgrounds/:filename ─────────────────
// Serve uploaded background images
router.get('/backgrounds/:filename', (req, res) => {
    const { filename } = req.params;
    // Sanitize filename to prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(uploadDir, safeName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Background not found.' });
    }
    res.sendFile(filePath);
});

module.exports = router;

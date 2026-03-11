const express = require('express');
const router = express.Router();
const storage = require('../commands/utility/storage.js');
const { PermissionFlagsBits } = require('discord.js');

/**
 * Middleware to check if user is authenticated
 */
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

/**
 * Middleware to verify user has manage permissions in the specified guild
 */
const requireGuildPermission = async (req, res, next) => {
    const { guildId } = req.params;
    const client = req.app.get('client') || req.app.locals.client;

    if (!client) {
        return res.status(500).json({ error: 'Bot client not available' });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        return res.status(404).json({ error: 'Bot is not in this server. Please add the bot first.' });
    }

    const userId = req.session.user.id;
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this server' });
        }

        if (!member.permissions.has(PermissionFlagsBits.Administrator) &&
            !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return res.status(403).json({ error: 'You do not have permission to manage this server' });
        }

        // Attach guild to request for downstream use
        req.targetGuild = guild;
        next();
    } catch (error) {
        console.error('[Welcome API] Permission check error:', error);
        res.status(500).json({ error: 'Failed to verify permissions' });
    }
};

/**
 * GET /api/welcome/:guildId
 * Get welcome message configuration for a guild
 */
router.get('/:guildId', requireAuth, requireGuildPermission, (req, res) => {
    try {
        const { guildId } = req.params;
        const config = storage.get(guildId, 'welcome_config') || {};
        
        res.json({
            enabled: !!config.channelId,
            channelId: config.channelId || null,
            title: config.title || '',
            description: config.description || '',
            bannerUrl: config.bannerUrl || '',
        });
    } catch (error) {
        console.error('[Welcome API] Error fetching config:', error);
        res.status(500).json({ error: 'Failed to fetch welcome configuration' });
    }
});

/**
 * POST /api/welcome/:guildId
 * Update welcome message configuration for a guild
 */
router.post('/:guildId', requireAuth, requireGuildPermission, (req, res) => {
    try {
        const { guildId } = req.params;
        const { enabled, channelId, title, description, bannerUrl } = req.body;

        if (!enabled) {
            // Disable welcome messages
            storage.delete(guildId, 'welcome_config');
            return res.json({ success: true, message: 'Welcome messages disabled' });
        }

        if (!channelId) {
            return res.status(400).json({ error: 'Channel ID is required when enabled' });
        }

        // Verify the channel exists in the guild
        const guild = req.targetGuild;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            return res.status(400).json({ error: 'Channel not found in this server' });
        }

        const config = {
            channelId,
            title: title || '',
            description: description || '',
            bannerUrl: bannerUrl || '',
        };

        storage.set(guildId, 'welcome_config', config);
        
        res.json({ 
            success: true, 
            message: 'Welcome configuration saved',
            config 
        });
    } catch (error) {
        console.error('[Welcome API] Error saving config:', error);
        res.status(500).json({ error: 'Failed to save welcome configuration' });
    }
});

/**
 * GET /api/goodbye/:guildId
 * Get goodbye message configuration for a guild
 */
router.get('/goodbye/:guildId', requireAuth, requireGuildPermission, (req, res) => {
    try {
        const { guildId } = req.params;
        const config = storage.get(guildId, 'goodbye_config') || {};
        
        res.json({
            enabled: !!config.channelId,
            channelId: config.channelId || null,
            title: config.title || '',
            description: config.description || '',
            bannerUrl: config.bannerUrl || '',
        });
    } catch (error) {
        console.error('[Goodbye API] Error fetching config:', error);
        res.status(500).json({ error: 'Failed to fetch goodbye configuration' });
    }
});

/**
 * POST /api/goodbye/:guildId
 * Update goodbye message configuration for a guild
 */
router.post('/goodbye/:guildId', requireAuth, requireGuildPermission, (req, res) => {
    try {
        const { guildId } = req.params;
        const { enabled, channelId, title, description, bannerUrl } = req.body;

        if (!enabled) {
            // Disable goodbye messages
            storage.delete(guildId, 'goodbye_config');
            return res.json({ success: true, message: 'Goodbye messages disabled' });
        }

        if (!channelId) {
            return res.status(400).json({ error: 'Channel ID is required when enabled' });
        }

        // Verify the channel exists in the guild
        const guild = req.targetGuild;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            return res.status(400).json({ error: 'Channel not found in this server' });
        }

        const config = {
            channelId,
            title: title || '',
            description: description || '',
            bannerUrl: bannerUrl || '',
        };

        storage.set(guildId, 'goodbye_config', config);
        
        res.json({ 
            success: true, 
            message: 'Goodbye configuration saved',
            config 
        });
    } catch (error) {
        console.error('[Goodbye API] Error saving config:', error);
        res.status(500).json({ error: 'Failed to save goodbye configuration' });
    }
});

/**
 * GET /api/welcome/:guildId/channels
 * Get list of text channels in the guild
 */
router.get('/:guildId/channels', requireAuth, requireGuildPermission, (req, res) => {
    try {
        const guild = req.targetGuild;

        const channels = guild.channels.cache
            .filter(channel => channel.isTextBased() && !channel.isThread())
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({ channels });
    } catch (error) {
        console.error('[Welcome API] Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

module.exports = router;

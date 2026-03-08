/**
 * ============================================================
 *  NEXUS BOT 2 — PayPal Payment API Routes
 *  Handles automated PayPal checkout and premium activation.
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const paypal = require('@paypal/checkout-server-sdk');
const storage = require('../commands/utility/storage.js');
const { query } = require('../utils/db');

// ─── PayPal Configuration ────────────────────────────────────
// These should be in your .env file
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'YOUR_PAYPAL_CLIENT_SECRET';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'

const environment = PAYPAL_MODE === 'live' 
    ? new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);

const client = new paypal.core.PayPalHttpClient(environment);

// ─── Plan Definitions ────────────────────────────────────────
const PLANS = {
    'pro': { name: 'Pro', price: '4.99', durationDays: 30 },
    'ultimate': { name: 'Ultimate', price: '9.99', durationDays: 30 }
};

// ─── Auth Middleware ─────────────────────────────────────────
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

const requireGuildAccess = async (req, res, next) => {
    const discordClient = req.app.locals.client;
    const guildId = req.session.selectedGuildId;
    
    if (!guildId) return res.status(404).json({ error: 'No server selected' });
    
    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Server not found' });
    
    const userId = req.session.user.id;
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(403).json({ error: 'Not a member of this server' });
        
        // Check for Administrator or Manage Guild permissions
        const { PermissionFlagsBits } = require('discord.js');
        if (!member.permissions.has(PermissionFlagsBits.Administrator) && 
            !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── POST /api/payments/paypal/create-order ──────────────────
router.post('/paypal/create-order', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const { plan: planId } = req.body;
        const plan = PLANS[planId];
        
        if (!plan) return res.status(400).json({ error: 'Invalid plan selected' });

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: plan.price
                },
                description: `Nexus Bot Premium - ${plan.name} Plan`,
                custom_id: `${req.session.selectedGuildId}:${planId}:${req.session.user.id}`
            }]
        });

        const order = await client.execute(request);
        res.json({ id: order.result.id });
    } catch (err) {
        console.error('[PAYPAL] Create order error:', err);
        res.status(500).json({ error: 'Failed to create PayPal order' });
    }
});

// ─── POST /api/payments/paypal/capture-order ─────────────────
router.post('/paypal/capture-order', requireAuth, async (req, res) => {
    try {
        const { orderID } = req.body;
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});

        const capture = await client.execute(request);
        
        if (capture.result.status === 'COMPLETED') {
            const purchaseUnit = capture.result.purchase_units[0];
            const customId = purchaseUnit.payments.captures[0].custom_id;
            const [guildId, planId, userId] = customId.split(':');
            
            const plan = PLANS[planId];
            const expiresAt = Date.now() + (plan.durationDays * 24 * 60 * 60 * 1000);

            // 1. Update Storage Module (for immediate bot access)
            await storage.set(guildId, 'premium', {
                plan: planId,
                expiresAt: expiresAt,
                activatedBy: userId,
                orderId: orderID,
                activatedAt: Date.now()
            });

            // 2. Update TiDB Database (for persistence)
            try {
                await query(
                    'INSERT INTO premium_subscriptions (guild_id, user_id, plan, expires_at, order_id) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE plan = ?, expires_at = ?, order_id = ?',
                    [guildId, userId, planId, new Date(expiresAt), orderID, planId, new Date(expiresAt), orderID]
                );
            } catch (dbErr) {
                console.error('[PAYPAL] DB Update error:', dbErr);
                // Storage is already updated, so we continue
            }

            console.log(`[PAYPAL] Premium activated for guild=${guildId}, plan=${planId}, user=${userId}`);

            res.json({ 
                success: true, 
                message: 'Premium activated successfully!',
                plan: planId,
                expiresAt: expiresAt
            });
        } else {
            res.status(400).json({ error: 'Payment not completed' });
        }
    } catch (err) {
        console.error('[PAYPAL] Capture order error:', err);
        res.status(500).json({ error: 'Failed to capture PayPal order' });
    }
});

// ─── GET /api/payments/status ────────────────────────────────
router.get('/status', requireAuth, async (req, res) => {
    try {
        const guildId = req.session.selectedGuildId;
        if (!guildId) return res.status(404).json({ error: 'No server selected' });

        const premiumData = storage.get(guildId, 'premium');
        
        if (premiumData && (!premiumData.expiresAt || Date.now() < premiumData.expiresAt)) {
            res.json({
                isPremium: true,
                plan: premiumData.plan,
                expiresAt: premiumData.expiresAt
            });
        } else {
            res.json({ isPremium: false });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

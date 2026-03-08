/**
 * ============================================================
 *  NEXUS BOT 2 — Unified Payment API
 *  PayPal (auto-capture + webhook) + Crypto (multi-coin, QR codes, auto-verify)
 *  + Free Trial system
 * ============================================================
 */
const express = require('express');
const router = express.Router();
const paypal = require('@paypal/checkout-server-sdk');
const QRCode = require('qrcode');
const axios = require('axios');
const crypto = require('crypto');
const storage = require('../commands/utility/storage.js');
const { query } = require('../utils/db');

// ─── PayPal Configuration ────────────────────────────────────
const PAYPAL_CLIENT_ID     = process.env.PAYPAL_CLIENT_ID     || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE          = process.env.PAYPAL_MODE          || 'sandbox';
const PAYPAL_WEBHOOK_ID    = process.env.PAYPAL_WEBHOOK_ID    || '';

let paypalClient = null;
function getPaypalClient() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) return null;
    if (!paypalClient) {
        const env = PAYPAL_MODE === 'live'
            ? new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
            : new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
        paypalClient = new paypal.core.PayPalHttpClient(env);
    }
    return paypalClient;
}

// ─── Plan Definitions ────────────────────────────────────────
const PLANS = {
    pro:      { name: 'Pro',      price: '4.99',  durationDays: 30 },
    ultimate: { name: 'Ultimate', price: '9.99',  durationDays: 30 },
};

// ─── Crypto Wallet Configuration ─────────────────────────────
const MAX_VERIFY_RETRIES = 3;
const VERIFY_RETRY_DELAY_MS = 5000; // 5 seconds

const CRYPTO_WALLETS = {
    BTC: {
        name: 'Bitcoin', symbol: 'BTC',
        address: process.env.CRYPTO_WALLET_BTC || '',
        network: 'Bitcoin', icon: '₿', color: '#F7931A',
        uriPrefix: 'bitcoin', confirmations: 1, decimals: 8,
    },
    ETH: {
        name: 'Ethereum', symbol: 'ETH',
        address: process.env.CRYPTO_WALLET_ETH || '',
        network: 'ERC-20', icon: 'Ξ', color: '#627EEA',
        uriPrefix: 'ethereum', confirmations: 12, decimals: 18,
    },
    LTC: {
        name: 'Litecoin', symbol: 'LTC',
        address: process.env.CRYPTO_WALLET_LTC || '',
        network: 'Litecoin', icon: 'Ł', color: '#BFBBBB',
        uriPrefix: 'litecoin', confirmations: 6, decimals: 8,
    },
    USDT_TRC20: {
        name: 'USDT (TRC-20)', symbol: 'USDT',
        address: process.env.CRYPTO_WALLET_USDT_TRC20 || '',
        network: 'TRC-20', icon: '₮', color: '#26A17B',
        uriPrefix: 'tron', confirmations: 20, decimals: 6,
    },
    USDT_ERC20: {
        name: 'USDT (ERC-20)', symbol: 'USDT',
        address: process.env.CRYPTO_WALLET_USDT_ERC20 || '',
        network: 'ERC-20', icon: '₮', color: '#26A17B',
        uriPrefix: 'ethereum', confirmations: 12, decimals: 6,
    },
    BNB: {
        name: 'BNB (BSC)', symbol: 'BNB',
        address: process.env.CRYPTO_WALLET_BNB || '',
        network: 'BEP-20', icon: '⬡', color: '#F3BA2F',
        uriPrefix: 'binance', confirmations: 15, decimals: 18,
    },
    SOL: {
        name: 'Solana', symbol: 'SOL',
        address: process.env.CRYPTO_WALLET_SOL || '',
        network: 'Solana', icon: '◎', color: '#9945FF',
        uriPrefix: 'solana', confirmations: 32, decimals: 9,
    },
};

// ─── Ensure DB Tables ────────────────────────────────────────
async function ensurePaymentTables() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS premium_subscriptions (
                guild_id       VARCHAR(32)   PRIMARY KEY,
                plan           VARCHAR(32)   NOT NULL,
                payment_method VARCHAR(64)   NOT NULL DEFAULT 'admin',
                transaction_id VARCHAR(255),
                activated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at     DATETIME      NOT NULL,
                granted_by     VARCHAR(32)   DEFAULT NULL,
                user_id        VARCHAR(32)   DEFAULT NULL
            )
        `);
        await query(`
            CREATE TABLE IF NOT EXISTS crypto_payments (
                id             VARCHAR(64)   PRIMARY KEY,
                guild_id       VARCHAR(32)   NOT NULL,
                user_id        VARCHAR(32)   NOT NULL,
                plan           VARCHAR(32)   NOT NULL,
                coin           VARCHAR(32)   NOT NULL,
                wallet_address VARCHAR(255)  NOT NULL,
                amount_usd     DECIMAL(10,2) NOT NULL,
                amount_crypto  DECIMAL(20,8) NOT NULL,
                status         VARCHAR(32)   NOT NULL DEFAULT 'pending',
                created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at     DATETIME      NOT NULL,
                confirmed_at   DATETIME      DEFAULT NULL,
                tx_hash        VARCHAR(255)  DEFAULT NULL,
                INDEX idx_guild_user (guild_id, user_id),
                INDEX idx_status     (status),
                INDEX idx_expires    (expires_at)
            )
        `);
        await query(`
            CREATE TABLE IF NOT EXISTS premium_trials (
                guild_id   VARCHAR(32) PRIMARY KEY,
                user_id    VARCHAR(32) NOT NULL,
                started_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME    NOT NULL
            )
        `);
    } catch (err) {
        console.error('[PAYMENT] Error ensuring payment tables:', err.message);
    }
}
ensurePaymentTables();

// ─── Auth Middleware ─────────────────────────────────────────
const requireAuth = (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
};

const requireGuildAccess = async (req, res, next) => {
    const discordClient = req.app.locals.client;
    const guildId = req.session.selectedGuildId;
    if (!guildId) return res.status(400).json({ error: 'No server selected' });
    const guild = discordClient?.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Server not found' });
    const userId = req.session.user.id;
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(403).json({ error: 'Not a member of this server' });
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

// ─── Shared Premium Activation Helper ────────────────────────
async function activatePremium({ guildId, userId, plan, paymentMethod, transactionId, durationDays = 30 }) {
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const premiumData = {
        plan, paymentMethod, transactionId,
        activatedBy: userId,
        activatedAt: Date.now(),
        expiresAt:   expiresAt.getTime(),
    };
    await storage.set(guildId, 'premium', premiumData);
    await query(
        `INSERT INTO premium_subscriptions
            (guild_id, plan, payment_method, transaction_id, activated_at, expires_at, user_id)
         VALUES (?, ?, ?, ?, NOW(), ?, ?)
         ON DUPLICATE KEY UPDATE
            plan = VALUES(plan),
            payment_method = VALUES(payment_method),
            transaction_id = VALUES(transaction_id),
            activated_at = NOW(),
            expires_at = VALUES(expires_at),
            user_id = VALUES(user_id)`,
        [guildId, plan, paymentMethod, transactionId, expiresAt, userId]
    );
    console.log(`[PAYMENT] Premium activated: guild=${guildId} plan=${plan} method=${paymentMethod} expires=${expiresAt.toISOString()}`);
    return premiumData;
}

// ═══════════════════════════════════════════════════════════════
//  CONFIG & STATUS
// ═══════════════════════════════════════════════════════════════

// GET /api/payments/config
router.get('/config', (req, res) => {
    const wallets = {};
    for (const [coin, info] of Object.entries(CRYPTO_WALLETS)) {
        wallets[coin] = {
            name: info.name, symbol: info.symbol, network: info.network,
            icon: info.icon, color: info.color, enabled: !!info.address,
        };
    }
    res.json({
        paypal: {
            clientId: PAYPAL_CLIENT_ID || null,
            mode:     PAYPAL_MODE,
            enabled:  !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET),
        },
        crypto: {
            wallets,
            enabled: Object.values(CRYPTO_WALLETS).some(w => !!w.address),
        },
        plans: PLANS,
    });
});

// GET /api/payments/status
router.get('/status', requireAuth, async (req, res) => {
    try {
        const guildId = req.session.selectedGuildId;
        if (!guildId) return res.json({ isPremium: false });

        let premiumData = storage.get(guildId, 'premium');
        if (!premiumData) {
            const rows = await query(
                'SELECT * FROM premium_subscriptions WHERE guild_id = ?', [guildId]
            ).catch(() => []);
            if (rows && rows.length > 0) {
                const row = rows[0];
                premiumData = {
                    plan:          row.plan,
                    paymentMethod: row.payment_method,
                    transactionId: row.transaction_id,
                    activatedAt:   row.activated_at ? new Date(row.activated_at).getTime() : null,
                    expiresAt:     row.expires_at   ? new Date(row.expires_at).getTime()   : null,
                };
                await storage.set(guildId, 'premium', premiumData);
            }
        }

        if (!premiumData || (premiumData.expiresAt && Date.now() > premiumData.expiresAt)) {
            if (premiumData) await storage.set(guildId, 'premium', null);
            return res.json({ isPremium: false });
        }

        res.json({
            isPremium:     true,
            plan:          premiumData.plan,
            expiresAt:     premiumData.expiresAt,
            activatedAt:   premiumData.activatedAt,
            paymentMethod: premiumData.paymentMethod,
        });
    } catch (err) {
        console.error('[PAYMENT] Status error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ═══════════════════════════════════════════════════════════════
//  PAYPAL
// ═══════════════════════════════════════════════════════════════

// POST /api/payments/paypal/create-order
router.post('/paypal/create-order', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const ppClient = getPaypalClient();
        if (!ppClient) return res.status(503).json({ error: 'PayPal is not configured. Please contact the administrator.' });

        const { plan: planId } = req.body;
        const plan = PLANS[planId];
        if (!plan) return res.status(400).json({ error: 'Invalid plan selected' });

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: { currency_code: 'USD', value: plan.price },
                description: `Nexus Bot Premium — ${plan.name} Plan (30 days)`,
                custom_id: `${req.session.selectedGuildId}:${planId}:${req.session.user.id}`,
            }],
            application_context: {
                brand_name: 'Nexus Bot',
                landing_page: 'NO_PREFERENCE',
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING',
            },
        });

        const order = await ppClient.execute(request);
        res.json({ id: order.result.id });
    } catch (err) {
        console.error('[PAYPAL] Create order error:', err);
        res.status(500).json({ error: 'Failed to create PayPal order' });
    }
});

// POST /api/payments/paypal/capture-order
router.post('/paypal/capture-order', requireAuth, async (req, res) => {
    try {
        const ppClient = getPaypalClient();
        if (!ppClient) return res.status(503).json({ error: 'PayPal is not configured' });

        const { orderID } = req.body;
        if (!orderID) return res.status(400).json({ error: 'orderID is required' });

        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});
        const capture = await ppClient.execute(request);

        if (capture.result.status !== 'COMPLETED') {
            return res.status(400).json({ error: `Payment status: ${capture.result.status}` });
        }

        const purchaseUnit = capture.result.purchase_units[0];
        const captureData  = purchaseUnit.payments.captures[0];
        const customId     = captureData.custom_id || '';
        const [guildId, planId, userId] = customId.split(':');

        if (!guildId || !planId || !PLANS[planId]) {
            return res.status(400).json({ error: 'Invalid order metadata' });
        }

        const plan = PLANS[planId];
        const paidAmount = parseFloat(captureData.amount.value);
        if (paidAmount < parseFloat(plan.price) - 0.01) {
            return res.status(400).json({ error: 'Payment amount mismatch' });
        }

        const premiumData = await activatePremium({
            guildId, userId, plan: planId,
            paymentMethod: 'paypal',
            transactionId: captureData.id,
            durationDays:  plan.durationDays,
        });

        res.json({
            success:   true,
            message:   `Premium ${plan.name} activated for 30 days!`,
            plan:      planId,
            expiresAt: premiumData.expiresAt,
        });
    } catch (err) {
        console.error('[PAYPAL] Capture order error:', err);
        res.status(500).json({ error: 'Failed to capture PayPal order' });
    }
});

// POST /api/payments/paypal/webhook  (PayPal sends events here)
router.post('/paypal/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const ppClient = getPaypalClient();
        if (!ppClient) return res.status(200).send('OK');

        const body      = req.body.toString('utf8');
        const eventBody = JSON.parse(body);

        if (PAYPAL_WEBHOOK_ID) {
            try {
                const verifyReq = new paypal.notifications.VerifyWebhookSignatureRequest();
                verifyReq.requestBody({
                    auth_algo:         req.headers['paypal-auth-algo'],
                    cert_url:          req.headers['paypal-cert-url'],
                    transmission_id:   req.headers['paypal-transmission-id'],
                    transmission_sig:  req.headers['paypal-transmission-sig'],
                    transmission_time: req.headers['paypal-transmission-time'],
                    webhook_id:        PAYPAL_WEBHOOK_ID,
                    webhook_event:     eventBody,
                });
                const verifyRes = await ppClient.execute(verifyReq);
                if (verifyRes.result.verification_status !== 'SUCCESS') {
                    return res.status(400).send('Signature verification failed');
                }
            } catch (verifyErr) {
                console.error('[PAYPAL WEBHOOK] Verify error:', verifyErr.message);
            }
        }

        if (eventBody.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
            const captureData = eventBody.resource;
            const customId    = captureData.custom_id || '';
            const [guildId, planId, userId] = customId.split(':');
            if (guildId && planId && PLANS[planId]) {
                const existing = storage.get(guildId, 'premium');
                if (!existing || existing.transactionId !== captureData.id) {
                    await activatePremium({
                        guildId, userId: userId || 'webhook', plan: planId,
                        paymentMethod: 'paypal_webhook',
                        transactionId: captureData.id,
                        durationDays:  PLANS[planId].durationDays,
                    });
                }
            }
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('[PAYPAL WEBHOOK] Error:', err);
        res.status(200).send('OK');
    }
});

// ═══════════════════════════════════════════════════════════════
//  CRYPTO PAYMENTS
// ═══════════════════════════════════════════════════════════════

async function getCryptoPrice(symbol) {
    try {
        // Using Binance API for more reliable price fetching
        if (symbol === 'USDT_TRC20' || symbol === 'USDT_ERC20') {
            return 1.0; // USDT is a stablecoin, always $1
        }

        const binanceSymbol = {
            BTC: 'BTCUSDT', ETH: 'ETHUSDT', LTC: 'LTCUSDT',
            BNB: 'BNBUSDT', SOL: 'SOLUSDT',
        }[symbol];
        if (!binanceSymbol) return null;

        const resp = await axios.get(
            `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
            { timeout: 8000 }
        );
        return parseFloat(resp.data.price) || null;
    } catch { return null; }
}

async function generateQR(text) {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M', type: 'image/png',
        width: 256, margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
    });
}

function buildPaymentURI(coin, address, amount) {
    const amountStr = amount.toFixed(8);
    switch (coin) {
        case 'BTC':        return `bitcoin:${address}?amount=${amountStr}`;
        case 'ETH':        return `ethereum:${address}?value=${amountStr}`;
        case 'LTC':        return `litecoin:${address}?amount=${amountStr}`;
        case 'USDT_TRC20': return `tron:${address}?amount=${amountStr}`;
        case 'USDT_ERC20': return `ethereum:${address}?value=${amountStr}`;
        case 'BNB':        return `binance:${address}?amount=${amountStr}`;
        case 'SOL':        return `solana:${address}?amount=${amountStr}`;
        default:           return address;
    }
}

// GET /api/payments/crypto/coins
router.get('/crypto/coins', async (req, res) => {
    try {
        const coins = [];
        for (const [key, wallet] of Object.entries(CRYPTO_WALLETS)) {
            if (!wallet.address) continue;
            const price = await getCryptoPrice(key).catch(() => null);
            coins.push({
                key, name: wallet.name, symbol: wallet.symbol,
                network: wallet.network, icon: wallet.icon, color: wallet.color,
                priceUsd: price, enabled: true,
            });
        }
        res.json({ coins });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch coin list' });
    }
});

// POST /api/payments/crypto/create-order
router.post('/crypto/create-order', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const { plan: planId, coin } = req.body;
        const plan   = PLANS[planId];
        const wallet = CRYPTO_WALLETS[coin];

        if (!plan)            return res.status(400).json({ error: 'Invalid plan selected' });
        if (!wallet)          return res.status(400).json({ error: 'Invalid coin selected' });
        if (!wallet.address)  return res.status(400).json({ error: `${coin} wallet not configured. Please contact the administrator.` });

        const guildId   = req.session.selectedGuildId;
        const userId    = req.session.user.id;
        const amountUsd = parseFloat(plan.price);

        const priceUsd = await getCryptoPrice(coin);
        if (!priceUsd) return res.status(503).json({ error: 'Unable to fetch crypto price. Please try again.' });

        const amountCrypto = amountUsd / priceUsd;
        const orderId      = `crypto_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        const paymentURI   = buildPaymentURI(coin, wallet.address, amountCrypto);
        const qrDataUrl    = await generateQR(paymentURI);
        const expiresAt    = new Date(Date.now() + 30 * 60 * 1000); // 30 min

        await query(
            `INSERT INTO crypto_payments
                (id, guild_id, user_id, plan, coin, wallet_address, amount_usd, amount_crypto, status, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [orderId, guildId, userId, planId, coin, wallet.address, amountUsd, amountCrypto, expiresAt]
        );

        res.json({
            orderId,
            coin, coinName: wallet.name, network: wallet.network,
            address:      wallet.address,
            amountCrypto: parseFloat(amountCrypto.toFixed(8)),
            amountUsd, priceUsd,
            qrCode:       qrDataUrl,
            paymentURI,
            expiresAt:    expiresAt.getTime(),
            plan: planId, planName: plan.name,
        });
    } catch (err) {
        console.error('[CRYPTO] Create order error:', err);
        res.status(500).json({ error: 'Failed to create crypto order' });
    }
});

// GET /api/payments/crypto/check/:orderId
router.get('/crypto/check/:orderId', requireAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const rows = await query('SELECT * FROM crypto_payments WHERE id = ?', [orderId]);
        if (!rows || rows.length === 0) return res.status(404).json({ error: 'Order not found' });
        const order = rows[0];

        if (order.status === 'confirmed') {
            return res.json({ status: 'confirmed', confirmed: true });
        }
        if (new Date(order.expires_at) < new Date()) {
            await query('UPDATE crypto_payments SET status = ? WHERE id = ?', ['expired', orderId]);
            return res.json({ status: 'expired', confirmed: false });
        }

        const confirmed = await verifyCryptoPayment(order);
        if (confirmed) {
            await query('UPDATE crypto_payments SET status = ?, confirmed_at = NOW() WHERE id = ?', ['confirmed', orderId]);
            const plan = PLANS[order.plan];
            const premiumData = await activatePremium({
                guildId: order.guild_id, userId: order.user_id, plan: order.plan,
                paymentMethod: `crypto_${order.coin.toLowerCase()}`,
                transactionId: orderId,
                durationDays:  plan?.durationDays || 30,
            });
            return res.json({
                status: 'confirmed', confirmed: true,
                plan: order.plan, expiresAt: premiumData.expiresAt,
            });
        }

        res.json({ status: 'pending', confirmed: false });
    } catch (err) {
        console.error('[CRYPTO] Check order error:', err);
        res.status(500).json({ error: 'Failed to check payment status' });
    }
});

// POST /api/payments/crypto/manual-confirm
router.post('/crypto/manual-confirm', requireAuth, async (req, res) => {
    try {
        const { orderId, txHash } = req.body;
        if (!orderId || !txHash) return res.status(400).json({ error: 'orderId and txHash are required' });

        const rows = await query('SELECT * FROM crypto_payments WHERE id = ?', [orderId]);
        if (!rows || rows.length === 0) return res.status(404).json({ error: 'Order not found' });
        if (rows[0].status === 'confirmed') return res.json({ success: true, message: 'Already confirmed' });

        await query('UPDATE crypto_payments SET tx_hash = ?, status = ? WHERE id = ?', [txHash, 'pending_review', orderId]);
        res.json({ success: true, message: 'Transaction hash submitted. Your payment will be verified within a few minutes.' });
    } catch (err) {
        console.error('[CRYPTO] Manual confirm error:', err);
        res.status(500).json({ error: 'Failed to submit transaction hash' });
    }
});

// ─── Blockchain Verification ──────────────────────────────────
async function verifyCryptoPayment(order) {
    try {
        const { coin, wallet_address, amount_crypto } = order;
        const minAmount = parseFloat(amount_crypto) * 0.98;

        switch (coin) {
            case 'BTC': {
                let resp;
                for (let i = 0; i < MAX_VERIFY_RETRIES; i++) {
                    try {
                        resp = await axios.get(`https://blockstream.info/api/address/${wallet_address}/txs`, { timeout: 8000 });
                        break;
                    } catch (err) {
                        console.warn(`[CRYPTO VERIFY] BTC: Attempt ${i + 1}/${MAX_VERIFY_RETRIES} failed: ${err.message}`);
                        if (i < MAX_VERIFY_RETRIES - 1) {
                            await new Promise(resolve => setTimeout(resolve, VERIFY_RETRY_DELAY_MS * (i + 1)));
                        } else {
                            throw err; // Re-throw if max retries reached
                        }
                    }
                }
                if (!resp) return false; // Should not happen if retries are exhausted

                const orderTime = new Date(order.created_at).getTime() / 1000;
                for (const tx of (resp.data || [])) {
                    if (tx.status?.block_time && tx.status.block_time < orderTime) continue;
                    const received = (tx.vout || []).filter(v => v.scriptpubkey_address === wallet_address)
                        .reduce((s, v) => s + (v.value || 0), 0) / 1e8;
                    if (received >= minAmount) return true;
                }
                return false;
            }
            case 'ETH':
            case 'USDT_ERC20': {
                const apiKey = process.env.ETHERSCAN_API_KEY || '';
                const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${wallet_address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
                const resp = await axios.get(url, { timeout: 8000 });
                const orderTime = new Date(order.created_at).getTime() / 1000;
                for (const tx of (resp.data?.result || [])) {
                    if (parseInt(tx.timeStamp) < orderTime) continue;
                    if (tx.to?.toLowerCase() !== wallet_address.toLowerCase()) continue;
                    if (parseFloat(tx.value) / 1e18 >= minAmount) return true;
                }
                return false;
            }
            case 'BNB': {
                const apiKey = process.env.BSCSCAN_API_KEY || '';
                const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${wallet_address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
                const resp = await axios.get(url, { timeout: 8000 });
                const orderTime = new Date(order.created_at).getTime() / 1000;
                for (const tx of (resp.data?.result || [])) {
                    if (parseInt(tx.timeStamp) < orderTime) continue;
                    if (tx.to?.toLowerCase() !== wallet_address.toLowerCase()) continue;
                    if (parseFloat(tx.value) / 1e18 >= minAmount) return true;
                }
                return false;
            }
            case 'LTC': {
                const resp = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${wallet_address}/full?limit=10`, { timeout: 8000 });
                const orderTime = new Date(order.created_at).getTime();
                for (const tx of (resp.data?.txs || [])) {
                    if (new Date(tx.received).getTime() < orderTime) continue;
                    const received = (tx.outputs || []).filter(o => o.addresses?.includes(wallet_address))
                        .reduce((s, o) => s + (o.value || 0), 0) / 1e8;
                    if (received >= minAmount) return true;
                }
                return false;
            }
            case 'USDT_TRC20': {
                const resp = await axios.get(
                    `https://apilist.tronscanapi.com/api/transaction?address=${wallet_address}&limit=10&start=0&sort=-timestamp&count=true&filterTokenValue=0`,
                    { timeout: 8000 }
                );
                const orderTime = new Date(order.created_at).getTime();
                for (const tx of (resp.data?.data || [])) {
                    if (tx.timestamp < orderTime) continue;
                    if (parseFloat(tx.contractData?.amount || 0) / 1e6 >= minAmount) return true;
                }
                return false;
            }
            case 'SOL': {
                let resp;
                for (let i = 0; i < MAX_VERIFY_RETRIES; i++) {
                    try {
                        resp = await axios.post('https://api.mainnet-beta.solana.com', {
                            jsonrpc: '2.0', id: 1,
                            method: 'getSignaturesForAddress',
                            params: [wallet_address, { limit: 10 }],
                        }, { timeout: 8000 });
                        break;
                    } catch (err) {
                        console.warn(`[CRYPTO VERIFY] SOL: Attempt ${i + 1}/${MAX_VERIFY_RETRIES} failed: ${err.message}`);
                        if (i < MAX_VERIFY_RETRIES - 1) {
                            await new Promise(resolve => setTimeout(resolve, VERIFY_RETRY_DELAY_MS * (i + 1)));
                        } else {
                            throw err; // Re-throw if max retries reached
                        }
                    }
                }
                if (!resp) return false; // Should not happen if retries are exhausted

                const orderTime = new Date(order.created_at).getTime() / 1000;
                for (const sig of (resp.data?.result || [])) {
                    if (sig.blockTime && sig.blockTime >= orderTime) return true;
                }
                return false;
            }
            default: return false;
        }
    } catch (err) {
        console.error(`[CRYPTO VERIFY] Error verifying ${order.coin}:`, err.message);
        return false;
    }
}

// ─── Background: Auto-check pending crypto payments ──────────
setInterval(async () => {
    try {
        const pending = await query(
            `SELECT * FROM crypto_payments WHERE status = 'pending' AND expires_at > NOW() LIMIT 20`
        );
        for (const order of (pending || [])) {
            const confirmed = await verifyCryptoPayment(order);
            if (confirmed) {
                await query('UPDATE crypto_payments SET status = ?, confirmed_at = NOW() WHERE id = ?', ['confirmed', order.id]);
                const plan = PLANS[order.plan];
                await activatePremium({
                    guildId: order.guild_id, userId: order.user_id, plan: order.plan,
                    paymentMethod: `crypto_${order.coin.toLowerCase()}`,
                    transactionId: order.id,
                    durationDays:  plan?.durationDays || 30,
                });
                console.log(`[CRYPTO AUTO-CHECK] Confirmed: order=${order.id} guild=${order.guild_id}`);
            }
        }
    } catch (err) {
        console.error('[CRYPTO AUTO-CHECK] Error:', err.message);
    }
}, 60 * 1000);

// ═══════════════════════════════════════════════════════════════
//  FREE TRIAL
// ═══════════════════════════════════════════════════════════════

// POST /api/payments/trial/start
router.post('/trial/start', requireAuth, requireGuildAccess, async (req, res) => {
    try {
        const guildId   = req.session.selectedGuildId;
        const userId    = req.session.user.id;
        const TRIAL_DAYS = parseInt(process.env.PREMIUM_TRIAL_DAYS || '3');

        const premiumData = storage.get(guildId, 'premium');
        if (premiumData?.expiresAt && Date.now() < premiumData.expiresAt) {
            return res.status(400).json({ error: 'This server already has an active premium subscription.' });
        }

        const trialRows = await query('SELECT * FROM premium_trials WHERE guild_id = ?', [guildId]);
        if (trialRows && trialRows.length > 0) {
            return res.status(400).json({ error: 'This server has already used its free trial.' });
        }

        const expiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        await query('INSERT INTO premium_trials (guild_id, user_id, expires_at) VALUES (?, ?, ?)', [guildId, userId, expiresAt]);

        const result = await activatePremium({
            guildId, userId, plan: 'pro',
            paymentMethod: 'trial',
            transactionId: `trial_${guildId}_${Date.now()}`,
            durationDays:  TRIAL_DAYS,
        });

        res.json({
            success: true,
            message: `Your ${TRIAL_DAYS}-day free trial has started!`,
            plan: 'pro', expiresAt: result.expiresAt, trialDays: TRIAL_DAYS,
        });
    } catch (err) {
        console.error('[TRIAL] Start error:', err);
        res.status(500).json({ error: 'Failed to start trial' });
    }
});

// GET /api/payments/trial/status
router.get('/trial/status', requireAuth, async (req, res) => {
    try {
        const guildId = req.session.selectedGuildId;
        if (!guildId) return res.json({ eligible: false });

        const trialRows   = await query('SELECT * FROM premium_trials WHERE guild_id = ?', [guildId]);
        const usedTrial   = trialRows && trialRows.length > 0;
        const premiumData = storage.get(guildId, 'premium');
        const isPremium   = !!(premiumData?.expiresAt && Date.now() < premiumData.expiresAt);

        res.json({
            eligible:  !usedTrial && !isPremium,
            usedTrial,
            trialDays: parseInt(process.env.PREMIUM_TRIAL_DAYS || '3'),
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check trial status' });
    }
});

module.exports = router;

/**
 * ============================================================
 *  NEXUS BOT 2 — Rank Card Generator
 *  Generates a beautiful visual rank card image similar to MEE6.
 *  Supports full customization: background, colors, font, overlay.
 * ============================================================
 */
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── Register Fonts ───────────────────────────────────────────
const FONTS_DIR = path.join(__dirname, '../assets/fonts');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Montserrat.ttf'), 'Montserrat');

// ─── Card Dimensions ─────────────────────────────────────────
const CARD_WIDTH  = 934;
const CARD_HEIGHT = 282;

// ─── Default Card Settings ────────────────────────────────────
const DEFAULTS = {
    mainColor:       '#00FFFF',   // Progress bar & accent color
    backgroundColor: '#23272A',   // Solid background fallback
    overlayOpacity:  0.6,         // Background image overlay darkness (0-1)
    font:            'Montserrat', // Font family
    backgroundImage: null,        // URL or null
};

// ─── Available Preset Colors ──────────────────────────────────
const PRESET_COLORS = {
    cyan:    '#00FFFF',
    green:   '#00FF88',
    gold:    '#FFD700',
    orange:  '#FF8C00',
    red:     '#FF4444',
    pink:    '#FF69B4',
    purple:  '#AA00FF',
    blue:    '#0088FF',
    white:   '#FFFFFF',
    discord: '#5865F2',
};

// ─── Available Fonts ──────────────────────────────────────────
const AVAILABLE_FONTS = ['Montserrat', 'sans-serif', 'serif', 'monospace'];

/**
 * Fetch an image from a URL, returning a Buffer.
 */
function fetchImageBuffer(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Draw a rounded rectangle path.
 */
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Draw a circular avatar with a colored ring.
 */
async function drawAvatar(ctx, avatarUrl, x, y, size, ringColor) {
    const radius = size / 2;
    const cx = x + radius;
    const cy = y + radius;

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = ringColor;
    ctx.fill();

    // Clip circle for avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    try {
        const buf = await fetchImageBuffer(avatarUrl);
        const img = await loadImage(buf);
        ctx.drawImage(img, x, y, size, size);
    } catch {
        // Fallback: grey circle
        ctx.fillStyle = '#555555';
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Draw the XP progress bar.
 */
function drawProgressBar(ctx, x, y, width, height, progress, mainColor) {
    const radius = height / 2;

    // Background track
    roundRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();

    // Filled portion
    const fillWidth = Math.max(radius * 2, width * Math.min(1, Math.max(0, progress)));
    roundRect(ctx, x, y, fillWidth, height, radius);

    // Gradient fill
    const grad = ctx.createLinearGradient(x, y, x + fillWidth, y);
    grad.addColorStop(0, mainColor);
    grad.addColorStop(1, lightenColor(mainColor, 40));
    ctx.fillStyle = grad;
    ctx.fill();
}

/**
 * Lighten a hex color by a given amount.
 */
function lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Main card generation function.
 * @param {object} options
 * @param {string} options.username        - Discord username
 * @param {string} options.avatarUrl       - Avatar URL (CDN)
 * @param {number} options.level           - Current level
 * @param {number} options.rank            - Leaderboard rank position
 * @param {number} options.currentXp       - XP within current level
 * @param {number} options.xpNeeded        - XP needed for next level
 * @param {number} options.totalXp         - Total XP accumulated
 * @param {object} options.cardSettings    - Customization settings from DB
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateRankCard(options) {
    const {
        username,
        avatarUrl,
        level,
        rank,
        currentXp,
        xpNeeded,
        totalXp,
        cardSettings = {},
    } = options;

    const settings = { ...DEFAULTS, ...cardSettings };
    const fontFamily = AVAILABLE_FONTS.includes(settings.font) ? settings.font : DEFAULTS.font;

    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx    = canvas.getContext('2d');

    // ── 1. Background ─────────────────────────────────────────
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 24);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fill();

    // Background image (if set)
    if (settings.backgroundImage) {
        try {
            const bgBuf = await fetchImageBuffer(settings.backgroundImage);
            const bgImg = await loadImage(bgBuf);

            ctx.save();
            roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 24);
            ctx.clip();
            // Cover-fit the image
            const scale = Math.max(CARD_WIDTH / bgImg.width, CARD_HEIGHT / bgImg.height);
            const bw = bgImg.width  * scale;
            const bh = bgImg.height * scale;
            const bx = (CARD_WIDTH  - bw) / 2;
            const by = (CARD_HEIGHT - bh) / 2;
            ctx.drawImage(bgImg, bx, by, bw, bh);
            ctx.restore();

            // Overlay
            roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 24);
            ctx.fillStyle = `rgba(0,0,0,${settings.overlayOpacity})`;
            ctx.fill();
        } catch {
            // Background image failed, keep solid color
        }
    }

    // ── 2. Avatar ─────────────────────────────────────────────
    const AVATAR_SIZE = 160;
    const AVATAR_X    = 40;
    const AVATAR_Y    = (CARD_HEIGHT - AVATAR_SIZE) / 2;

    await drawAvatar(ctx, avatarUrl, AVATAR_X, AVATAR_Y, AVATAR_SIZE, settings.mainColor);

    // ── 3. Username ───────────────────────────────────────────
    const TEXT_X = AVATAR_X + AVATAR_SIZE + 30;

    ctx.font      = `bold 32px "${fontFamily}"`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(username, TEXT_X, 90);

    // ── 4. Rank & Level badges ────────────────────────────────
    // Rank badge (top-right area)
    const BADGE_Y = 36;

    // "Rank" label
    ctx.font      = `22px "${fontFamily}"`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'right';
    ctx.fillText('Rank', CARD_WIDTH - 220, BADGE_Y);

    // Rank number
    ctx.font      = `bold 38px "${fontFamily}"`;
    ctx.fillStyle = settings.mainColor;
    ctx.fillText(`#${rank > 0 ? rank : '?'}`, CARD_WIDTH - 140, BADGE_Y + 4);

    // "Level" label
    ctx.font      = `22px "${fontFamily}"`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Level', CARD_WIDTH - 80, BADGE_Y);

    // Level number
    ctx.font      = `bold 38px "${fontFamily}"`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${level}`, CARD_WIDTH - 20, BADGE_Y + 4);

    ctx.textAlign = 'left';

    // ── 5. XP Text ────────────────────────────────────────────
    const xpText = `${currentXp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`;
    ctx.font      = `18px "${fontFamily}"`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(xpText, CARD_WIDTH - 20, 130);
    ctx.textAlign = 'left';

    // ── 6. Progress Bar ───────────────────────────────────────
    const BAR_X      = TEXT_X;
    const BAR_Y      = 148;
    const BAR_WIDTH  = CARD_WIDTH - TEXT_X - 20;
    const BAR_HEIGHT = 28;
    const progress   = xpNeeded > 0 ? currentXp / xpNeeded : 0;

    drawProgressBar(ctx, BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT, progress, settings.mainColor);

    // ── 7. Total XP footer ────────────────────────────────────
    ctx.font      = `16px "${fontFamily}"`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(`Total XP: ${totalXp.toLocaleString()}`, TEXT_X, CARD_HEIGHT - 24);

    // ── 8. Subtle bottom border accent ───────────────────────
    ctx.beginPath();
    ctx.moveTo(24, CARD_HEIGHT - 6);
    ctx.lineTo(CARD_WIDTH - 24, CARD_HEIGHT - 6);
    ctx.strokeStyle = settings.mainColor;
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    return canvas.toBuffer('image/png');
}

module.exports = {
    generateRankCard,
    PRESET_COLORS,
    AVAILABLE_FONTS,
    DEFAULTS,
};

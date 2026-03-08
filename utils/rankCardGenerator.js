/**
 * ============================================================
 *  NEXUS BOT 2 — Rank Card Generator
 *  Generates a beautiful visual rank card image similar to MEE6.
 *  Uses high-DPI super-sampling (3x) then downsamples to base
 *  resolution for maximum font sharpness and clarity.
 * ============================================================
 */
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── Register Fonts ───────────────────────────────────────────
const FONTS_DIR = path.join(__dirname, '../assets/fonts');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Montserrat.ttf'), 'Montserrat');
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Montserrat-Bold.ttf'), 'Montserrat-Bold');

// ─── Card Dimensions ─────────────────────────────────────────
const BASE_WIDTH  = 934;
const BASE_HEIGHT = 282;
// Render at 3x internally, then downsample to BASE size for crisp output.
// This is the correct high-DPI technique: render large, export small.
const SCALE = 3;

// ─── Default Card Settings ────────────────────────────────────
const DEFAULTS = {
    mainColor:       '#00FFFF',   // Progress bar & accent color
    backgroundColor: '#000000',   // Darker background matching reference
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
 * Draw a circular avatar with a colored accent ring.
 */
async function drawAvatar(ctx, avatarUrl, x, y, size, accentColor = '#00FFFF') {
    const radius = size / 2;
    const cx = x + radius;
    const cy = y + radius;

    // Outer glow shadow
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = accentColor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Dark backing circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.fill();
    ctx.restore();

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
        ctx.fillStyle = '#333333';
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
    if (progress > 0) {
        const fillWidth = Math.max(radius * 2, width * Math.min(1, progress));
        roundRect(ctx, x, y, fillWidth, height, radius);
        ctx.fillStyle = mainColor;
        ctx.fill();
    }
}

/**
 * Formats XP numbers (e.g., 1780 -> 1.78K)
 */
function formatXP(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toString();
}

/**
 * Main card generation function.
 * Renders at SCALE x resolution internally, then downsamples to BASE
 * dimensions for crisp, sharp text in the final PNG output.
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
    const isMontserrat = settings.font === 'Montserrat';
    
    // Explicitly use Montserrat fonts
    const boldFont    = isMontserrat ? '"Montserrat-Bold"' : `bold "${settings.font}"`;
    const regularFont = isMontserrat ? '"Montserrat"'      : `"${settings.font}"`;

    // ── High-DPI render canvas (SCALE x internal resolution) ──
    const hiCanvas = createCanvas(BASE_WIDTH * SCALE, BASE_HEIGHT * SCALE);
    const ctx      = hiCanvas.getContext('2d');

    // Scale all drawing operations so we can use BASE coordinates throughout
    ctx.scale(SCALE, SCALE);

    // Enable geometric precision text rendering (supported by @napi-rs/canvas)
    ctx.textRendering = 'geometricPrecision';

    // ── 1. Background ─────────────────────────────────────────
    roundRect(ctx, 0, 0, BASE_WIDTH, BASE_HEIGHT, 15);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fill();

    // Background image (if set)
    if (settings.backgroundImage) {
        try {
            const bgBuf = await fetchImageBuffer(settings.backgroundImage);
            const bgImg = await loadImage(bgBuf);

            ctx.save();
            roundRect(ctx, 0, 0, BASE_WIDTH, BASE_HEIGHT, 15);
            ctx.clip();
            const scale = Math.max(BASE_WIDTH / bgImg.width, BASE_HEIGHT / bgImg.height);
            const bw = bgImg.width  * scale;
            const bh = bgImg.height * scale;
            const bx = (BASE_WIDTH  - bw) / 2;
            const by = (BASE_HEIGHT - bh) / 2;
            ctx.drawImage(bgImg, bx, by, bw, bh);
            ctx.restore();

            // Overlay
            roundRect(ctx, 0, 0, BASE_WIDTH, BASE_HEIGHT, 15);
            ctx.fillStyle = `rgba(0,0,0,${settings.overlayOpacity})`;
            ctx.fill();
        } catch {}
    }

    // ── 2. Avatar ─────────────────────────────────────────────
    const AVATAR_SIZE = 165;
    const AVATAR_X    = 50;
    const AVATAR_Y    = (BASE_HEIGHT - AVATAR_SIZE) / 2;
    await drawAvatar(ctx, avatarUrl, AVATAR_X, AVATAR_Y, AVATAR_SIZE, settings.mainColor);

    // ── 3. Username ───────────────────────────────────────────
    const TEXT_X = AVATAR_X + AVATAR_SIZE + 45;
    ctx.textAlign = 'left';
    ctx.font      = `48px ${boldFont}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(username, TEXT_X, 150);

    // ── 4. Rank & Level badges ────────────────────────────────
    const BADGE_Y = 85;

    // "LEVEL" label & number
    ctx.textAlign = 'right';
    ctx.font      = `42px ${boldFont}`;
    ctx.fillStyle = settings.mainColor;
    ctx.fillText(`${level}`, BASE_WIDTH - 50, BADGE_Y);
    
    const levelWidth = ctx.measureText(`${level}`).width;
    ctx.font      = `22px ${regularFont}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('LEVEL', BASE_WIDTH - 50 - levelWidth - 12, BADGE_Y - 3);

    // "RANK" label & number
    const rankText = `#${rank > 0 ? rank : '1'}`;
    const levelLabelWidth = ctx.measureText('LEVEL').width;
    const RANK_X_OFFSET = 50 + levelWidth + 12 + levelLabelWidth + 35;
    
    ctx.font      = `64px ${boldFont}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(rankText, BASE_WIDTH - RANK_X_OFFSET, BADGE_Y + 5);
    
    const rankWidth = ctx.measureText(rankText).width;
    ctx.font      = `22px ${regularFont}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('RANK', BASE_WIDTH - RANK_X_OFFSET - rankWidth - 10, BADGE_Y - 3);

    // ── 5. XP Text ────────────────────────────────────────────
    const xpCurrentFormatted = formatXP(currentXp);
    const xpNeededFormatted  = formatXP(xpNeeded);
    
    ctx.textAlign = 'right';
    ctx.font      = `24px ${regularFont}`;
    
    const totalXPText = ` / ${xpNeededFormatted} XP`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(totalXPText, BASE_WIDTH - 50, 150);
    
    const totalXPWidth = ctx.measureText(totalXPText).width;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${xpCurrentFormatted}`, BASE_WIDTH - 50 - totalXPWidth, 150);

    // ── 6. Progress Bar ───────────────────────────────────────
    const BAR_X      = TEXT_X;
    const BAR_Y      = 180;
    const BAR_WIDTH  = BASE_WIDTH - TEXT_X - 50;
    const BAR_HEIGHT = 40;
    const progress   = xpNeeded > 0 ? currentXp / xpNeeded : 0;

    drawProgressBar(ctx, BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT, progress, settings.mainColor);

    // ── 7. Total XP label (bottom-left) ──────────────────────
    ctx.textAlign = 'left';
    ctx.font      = `20px ${regularFont}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`Total XP: ${totalXp ? totalXp.toLocaleString() : '0'}`, TEXT_X, BASE_HEIGHT - 18);

    // ── 8. Bottom accent line ─────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(15, BASE_HEIGHT - 3);
    ctx.lineTo(BASE_WIDTH - 15, BASE_HEIGHT - 3);
    ctx.strokeStyle = settings.mainColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── 9. Downsample to BASE resolution for sharp output ─────
    // Draw the high-DPI canvas onto a final BASE-sized canvas.
    // This is the key step: the browser/Discord receives a correctly-sized
    // image with all the sharpness benefits of the 3x internal render.
    const outCanvas = createCanvas(BASE_WIDTH, BASE_HEIGHT);
    const outCtx    = outCanvas.getContext('2d');
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(hiCanvas, 0, 0, BASE_WIDTH * SCALE, BASE_HEIGHT * SCALE, 0, 0, BASE_WIDTH, BASE_HEIGHT);

    return outCanvas.toBuffer('image/png');
}

module.exports = {
    generateRankCard,
    PRESET_COLORS,
    AVAILABLE_FONTS,
    DEFAULTS,
};

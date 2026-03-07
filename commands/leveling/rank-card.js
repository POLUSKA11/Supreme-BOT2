/**
 * ============================================================
 *  NEXUS BOT 2 — /rank-card
 *  Lets users customize their personal rank card appearance:
 *  main color, background color, background image, overlay
 *  opacity, and font. Preview is shown instantly.
 * ============================================================
 */
const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
} = require('discord.js');
const levelSystem        = require('../../utils/levelSystem');
const { generateRankCard, PRESET_COLORS, AVAILABLE_FONTS } = require('../../utils/rankCardGenerator');

// ─── Helpers ─────────────────────────────────────────────────
function isValidHex(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function isValidUrl(url) {
    try { new URL(url); return true; } catch { return false; }
}

async function getCardSettings(guildId, userId) {
    const raw = await levelSystem.getConfig(guildId, `card_settings_${userId}`, null);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
}

async function saveCardSettings(guildId, userId, settings) {
    await levelSystem.setConfig(guildId, `card_settings_${userId}`, JSON.stringify(settings));
}

// ─── Color choices for the command ───────────────────────────
const COLOR_CHOICES = Object.entries(PRESET_COLORS).map(([name, value]) => ({
    name: `${name.charAt(0).toUpperCase() + name.slice(1)} (${value})`,
    value,
}));

// ─── Font choices ─────────────────────────────────────────────
const FONT_CHOICES = [
    { name: 'Default (Montserrat)', value: 'Montserrat' },
    { name: 'Sans-Serif',           value: 'sans-serif'  },
    { name: 'Serif',                value: 'serif'        },
    { name: 'Monospace',            value: 'monospace'    },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank-card')
        .setDescription('Customize your personal rank card appearance')
        // ── Subcommands ──────────────────────────────────────
        .addSubcommand(sub => sub
            .setName('preview')
            .setDescription('Preview your current rank card')
            .addUserOption(opt => opt
                .setName('user')
                .setDescription('User to preview (defaults to yourself)')
                .setRequired(false)
            )
        )
        .addSubcommand(sub => sub
            .setName('color')
            .setDescription('Set the main accent color (progress bar, ring, rank number)')
            .addStringOption(opt => opt
                .setName('preset')
                .setDescription('Choose a preset color')
                .setRequired(false)
                .addChoices(...COLOR_CHOICES)
            )
            .addStringOption(opt => opt
                .setName('hex')
                .setDescription('Or enter a custom hex color (e.g. #FF5500)')
                .setRequired(false)
            )
        )
        .addSubcommand(sub => sub
            .setName('background-color')
            .setDescription('Set the solid background color (used when no image is set)')
            .addStringOption(opt => opt
                .setName('preset')
                .setDescription('Choose a preset color')
                .setRequired(false)
                .addChoices(
                    { name: 'Dark (Default)',    value: '#23272A' },
                    { name: 'Darker Discord',    value: '#2C2F33' },
                    { name: 'Black',             value: '#0D0D0D' },
                    { name: 'Navy',              value: '#0A1628' },
                    { name: 'Deep Purple',       value: '#1A0A2E' },
                    { name: 'Dark Green',        value: '#0A1F0A' },
                    { name: 'Dark Red',          value: '#1F0A0A' },
                )
            )
            .addStringOption(opt => opt
                .setName('hex')
                .setDescription('Or enter a custom hex color (e.g. #1A1A2E)')
                .setRequired(false)
            )
        )
        .addSubcommand(sub => sub
            .setName('background-image')
            .setDescription('Set a background image for your rank card')
            .addStringOption(opt => opt
                .setName('url')
                .setDescription('Direct image URL (jpg/png/gif) — leave empty to remove')
                .setRequired(false)
            )
        )
        .addSubcommand(sub => sub
            .setName('overlay')
            .setDescription('Set the background image overlay darkness (0 = transparent, 10 = very dark)')
            .addIntegerOption(opt => opt
                .setName('opacity')
                .setDescription('Overlay darkness level (0–10, default: 6)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(10)
            )
        )
        .addSubcommand(sub => sub
            .setName('font')
            .setDescription('Set the font for your rank card')
            .addStringOption(opt => opt
                .setName('style')
                .setDescription('Choose a font style')
                .setRequired(true)
                .addChoices(...FONT_CHOICES)
            )
        )
        .addSubcommand(sub => sub
            .setName('reset')
            .setDescription('Reset your rank card to default settings')
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const sub    = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // ── preview ──────────────────────────────────────────
        if (sub === 'preview') {
            const target = interaction.options.getUser('user') || interaction.user;
            const userData = await levelSystem.getUserData(guildId, target.id);
            const { level, currentXp, xpNeeded } = levelSystem.getLevelFromXp(userData.xp);
            const leaderboard = await levelSystem.getLeaderboard(guildId, 100);
            const rankPos = leaderboard.findIndex(u => u.user_id === target.id) + 1;
            const cardSettings = await getCardSettings(guildId, target.id);

            let cardBuf;
            try {
                cardBuf = await generateRankCard({
                    username:    target.username,
                    avatarUrl:   target.displayAvatarURL({ extension: 'png', size: 256 }),
                    level,
                    rank:        rankPos,
                    currentXp,
                    xpNeeded,
                    totalXp:     userData.xp,
                    cardSettings,
                });
            } catch (err) {
                console.error('[RANK CARD] Generation error:', err);
                return interaction.editReply({ content: '❌ Failed to generate rank card. Please try again.' });
            }

            const attachment = new AttachmentBuilder(cardBuf, { name: 'rank-card.png' });
            return interaction.editReply({ files: [attachment] });
        }

        // ── color ────────────────────────────────────────────
        if (sub === 'color') {
            const preset = interaction.options.getString('preset');
            const hex    = interaction.options.getString('hex');
            const color  = preset || hex;

            if (!color) {
                return interaction.editReply({
                    embeds: [errorEmbed('Please provide either a preset or a hex color.')],
                });
            }
            if (!isValidHex(color)) {
                return interaction.editReply({
                    embeds: [errorEmbed(`Invalid hex color \`${color}\`. Use format: \`#RRGGBB\``)],
                });
            }

            const settings = await getCardSettings(guildId, userId);
            settings.mainColor = color;
            await saveCardSettings(guildId, userId, settings);

            return interaction.editReply({
                embeds: [successEmbed('✅ Main Color Updated', `Your rank card accent color is now \`${color}\`.`)
                    .setColor(color)],
            });
        }

        // ── background-color ─────────────────────────────────
        if (sub === 'background-color') {
            const preset = interaction.options.getString('preset');
            const hex    = interaction.options.getString('hex');
            const color  = preset || hex;

            if (!color) {
                return interaction.editReply({
                    embeds: [errorEmbed('Please provide either a preset or a hex color.')],
                });
            }
            if (!isValidHex(color)) {
                return interaction.editReply({
                    embeds: [errorEmbed(`Invalid hex color \`${color}\`. Use format: \`#RRGGBB\``)],
                });
            }

            const settings = await getCardSettings(guildId, userId);
            settings.backgroundColor = color;
            await saveCardSettings(guildId, userId, settings);

            return interaction.editReply({
                embeds: [successEmbed('✅ Background Color Updated', `Your rank card background color is now \`${color}\`.`)
                    .setColor(color)],
            });
        }

        // ── background-image ─────────────────────────────────
        if (sub === 'background-image') {
            const url = interaction.options.getString('url');
            const settings = await getCardSettings(guildId, userId);

            if (!url) {
                // Remove background image
                settings.backgroundImage = null;
                await saveCardSettings(guildId, userId, settings);
                return interaction.editReply({
                    embeds: [successEmbed('✅ Background Image Removed', 'Your rank card will now use the solid background color.')],
                });
            }

            if (!isValidUrl(url)) {
                return interaction.editReply({
                    embeds: [errorEmbed('Invalid URL. Please provide a direct link to an image (jpg/png/gif).')],
                });
            }

            settings.backgroundImage = url;
            await saveCardSettings(guildId, userId, settings);

            return interaction.editReply({
                embeds: [successEmbed('✅ Background Image Updated', `Your rank card background image has been set.\nUse \`/rank-card preview\` to see how it looks.`)],
            });
        }

        // ── overlay ──────────────────────────────────────────
        if (sub === 'overlay') {
            const opacityLevel = interaction.options.getInteger('opacity');
            const opacity = opacityLevel / 10; // Convert 0-10 to 0.0-1.0

            const settings = await getCardSettings(guildId, userId);
            settings.overlayOpacity = opacity;
            await saveCardSettings(guildId, userId, settings);

            return interaction.editReply({
                embeds: [successEmbed(
                    '✅ Overlay Opacity Updated',
                    `Background overlay darkness set to **${opacityLevel}/10** (${Math.round(opacity * 100)}%).\nUse \`/rank-card preview\` to see the result.`
                )],
            });
        }

        // ── font ─────────────────────────────────────────────
        if (sub === 'font') {
            const font = interaction.options.getString('style');
            const settings = await getCardSettings(guildId, userId);
            settings.font = font;
            await saveCardSettings(guildId, userId, settings);

            return interaction.editReply({
                embeds: [successEmbed('✅ Font Updated', `Your rank card font is now set to **${font}**.\nUse \`/rank-card preview\` to see the result.`)],
            });
        }

        // ── reset ─────────────────────────────────────────────
        if (sub === 'reset') {
            await saveCardSettings(guildId, userId, {});
            return interaction.editReply({
                embeds: [successEmbed('✅ Rank Card Reset', 'Your rank card settings have been reset to defaults.')],
            });
        }
    },
};

// ─── Embed Helpers ────────────────────────────────────────────
function successEmbed(title, description) {
    return new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function errorEmbed(description) {
    return new EmbedBuilder()
        .setColor('#FF4444')
        .setTitle('❌ Error')
        .setDescription(description)
        .setTimestamp();
}

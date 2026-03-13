const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');

// Valid filter names as defined in discord-player's AudioFilters
// Note: 8D audio uses '8D' (uppercase) — not '8d'
const FILTERS = {
    bassboost:      { label: '🔊 Bass Boost',      description: 'Enhance low-frequency bass (medium)' },
    bassboost_high: { label: '🔊 Bass Boost High', description: 'Heavy bass enhancement' },
    nightcore:      { label: '🌙 Nightcore',        description: 'Speed up and pitch up the track' },
    vaporwave:      { label: '🌊 Vaporwave',        description: 'Slow down and pitch down the track' },
    '8D':           { label: '🎧 8D Audio',         description: 'Surround sound 8D pulsator effect' },
    tremolo:        { label: '🎵 Tremolo',          description: 'Tremolo amplitude modulation effect' },
    vibrato:        { label: '🎶 Vibrato',          description: 'Vibrato pitch modulation effect' },
    reverse:        { label: '⏪ Reverse',          description: 'Play the track in reverse' },
    normalizer:     { label: '📊 Normalizer',       description: 'Normalize audio levels (compressor)' },
    lofi:           { label: '📻 Lo-Fi',            description: 'Lo-fi music effect' },
    karaoke:        { label: '🎤 Karaoke',          description: 'Remove vocals from the track' },
    earrape:        { label: '💥 Earrape',          description: 'Extreme volume distortion effect' },
    chorus:         { label: '🎼 Chorus',           description: 'Chorus effect' },
    phaser:         { label: '🔄 Phaser',           description: 'Phaser effect' },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('🎛️ Apply or toggle audio filters/effects on the music')
        .addStringOption(opt =>
            opt.setName('effect')
                .setDescription('Audio filter to toggle')
                .setRequired(true)
                .addChoices(
                    { name: '🔊 Bass Boost',          value: 'bassboost' },
                    { name: '🔊 Bass Boost High',     value: 'bassboost_high' },
                    { name: '🌙 Nightcore',            value: 'nightcore' },
                    { name: '🌊 Vaporwave',            value: 'vaporwave' },
                    { name: '🎧 8D Audio',             value: '8D' },
                    { name: '🎵 Tremolo',              value: 'tremolo' },
                    { name: '🎶 Vibrato',              value: 'vibrato' },
                    { name: '⏪ Reverse',              value: 'reverse' },
                    { name: '📊 Normalizer',           value: 'normalizer' },
                    { name: '📻 Lo-Fi',                value: 'lofi' },
                    { name: '🎤 Karaoke',              value: 'karaoke' },
                    { name: '💥 Earrape',              value: 'earrape' },
                    { name: '🎼 Chorus',               value: 'chorus' },
                    { name: '🔄 Phaser',               value: 'phaser' },
                    { name: '✨ Clear All Filters',    value: 'clear' },
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)]
            });
        }

        const effect = interaction.options.getString('effect', true);

        try {
            // ── Clear all filters ─────────────────────────────────────────────
            if (effect === 'clear') {
                await queue.filters.ffmpeg.setFilters([]);
                const embed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setAuthor({ name: '✨ Filters Cleared', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription('All audio filters have been removed.')
                    .addFields({ name: '🎵 Currently Playing', value: queue.currentTrack?.title?.substring(0, 60) || 'None', inline: true })
                    .setFooter({ text: `Cleared by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            // ── Toggle the selected filter ────────────────────────────────────
            const filterInfo = FILTERS[effect];
            if (!filterInfo) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`Unknown filter: \`${effect}\``, interaction.client)]
                });
            }

            // Use the correct API: queue.filters.ffmpeg.getFiltersEnabled() returns array
            const currentFilters = queue.filters.ffmpeg.getFiltersEnabled();
            const isActive = currentFilters.includes(effect);

            if (isActive) {
                // Disable: remove from list
                await queue.filters.ffmpeg.setFilters(currentFilters.filter(f => f !== effect));
            } else {
                // Enable: add to list
                await queue.filters.ffmpeg.setFilters([...currentFilters, effect]);
            }

            const newFilters = queue.filters.ffmpeg.getFiltersEnabled();

            const embed = new EmbedBuilder()
                .setColor(isActive ? COLORS.WARNING : COLORS.SUCCESS)
                .setAuthor({
                    name: `🎛️ Filter ${isActive ? 'Disabled' : 'Enabled'}`,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setDescription(`${filterInfo.label} has been **${isActive ? 'disabled ❌' : 'enabled ✅'}**.\n\n*${filterInfo.description}*`)
                .addFields(
                    {
                        name: '🎛️ Active Filters',
                        value: newFilters.length > 0
                            ? newFilters.map(f => `\`${f}\``).join(', ')
                            : '*None*',
                        inline: false
                    },
                    {
                        name: '🎵 Currently Playing',
                        value: queue.currentTrack?.title?.substring(0, 60) || 'None',
                        inline: true
                    }
                )
                .setFooter({ text: `Changed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('[FILTER CMD ERROR]', err);
            return interaction.editReply({
                embeds: [buildErrorEmbed(`Failed to apply filter: ${err.message}`, interaction.client)]
            });
        }
    }
};

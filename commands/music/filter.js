const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, COLORS } = require('../../utils/musicPlayer');

const FILTERS = {
    bassboost: { label: '🔊 Bass Boost', description: 'Enhance low-frequency bass', filter: 'bassboost_low' },
    bassboost_high: { label: '🔊 Bass Boost High', description: 'Heavy bass enhancement', filter: 'bassboost_high' },
    nightcore: { label: '🌙 Nightcore', description: 'Speed up and pitch up the track', filter: 'nightcore' },
    vaporwave: { label: '🌊 Vaporwave', description: 'Slow down and pitch down the track', filter: 'vaporwave' },
    '8d': { label: '🎧 8D Audio', description: 'Surround sound 8D effect', filter: '8d' },
    tremolo: { label: '🎵 Tremolo', description: 'Tremolo effect', filter: 'tremolo' },
    vibrato: { label: '🎶 Vibrato', description: 'Vibrato effect', filter: 'vibrato' },
    reverse: { label: '⏪ Reverse', description: 'Play the track in reverse', filter: 'reverse' },
    normalizer: { label: '📊 Normalizer', description: 'Normalize audio levels', filter: 'normalizer' },
    lofi: { label: '📻 Lo-Fi', description: 'Lo-fi music effect', filter: 'lofi' },
    clear: { label: '✨ Clear All', description: 'Remove all active filters', filter: null },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('🎛️ Apply audio filters/effects to the music')
        .addStringOption(opt =>
            opt.setName('effect')
                .setDescription('Audio filter to apply')
                .setRequired(true)
                .addChoices(
                    { name: '🔊 Bass Boost', value: 'bassboost' },
                    { name: '🔊 Bass Boost High', value: 'bassboost_high' },
                    { name: '🌙 Nightcore', value: 'nightcore' },
                    { name: '🌊 Vaporwave', value: 'vaporwave' },
                    { name: '🎧 8D Audio', value: '8d' },
                    { name: '🎵 Tremolo', value: 'tremolo' },
                    { name: '🎶 Vibrato', value: 'vibrato' },
                    { name: '📻 Lo-Fi', value: 'lofi' },
                    { name: '📊 Normalizer', value: 'normalizer' },
                    { name: '✨ Clear All Filters', value: 'clear' },
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)] });
        }

        const effect = interaction.options.getString('effect', true);
        const filterInfo = FILTERS[effect];

        try {
            if (effect === 'clear') {
                await queue.filters.ffmpeg.setFilters([]);
                const embed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setAuthor({ name: '✨ Filters Cleared', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription('All audio filters have been removed.')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            // Toggle filter
            const currentFilters = queue.filters.ffmpeg.filters;
            const isActive = currentFilters.includes(filterInfo.filter);

            if (isActive) {
                await queue.filters.ffmpeg.setFilters(currentFilters.filter(f => f !== filterInfo.filter));
            } else {
                await queue.filters.ffmpeg.setFilters([...currentFilters, filterInfo.filter]);
            }

            const newFilters = queue.filters.ffmpeg.filters;
            const embed = new EmbedBuilder()
                .setColor(isActive ? COLORS.WARNING : COLORS.SUCCESS)
                .setAuthor({ name: `🎛️ Filter ${isActive ? 'Disabled' : 'Enabled'}`, iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`${filterInfo.label} has been **${isActive ? 'disabled' : 'enabled'}**.\n\n*${filterInfo.description}*`)
                .addFields(
                    {
                        name: '🎛️ Active Filters',
                        value: newFilters.length > 0
                            ? newFilters.map(f => `\`${f}\``).join(', ')
                            : '*None*',
                        inline: false
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

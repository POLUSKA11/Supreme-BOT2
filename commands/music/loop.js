const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');
const { buildErrorEmbed, COLORS, getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('🔁 Set the loop/repeat mode for the queue')
        .addStringOption(opt =>
            opt.setName('mode')
                .setDescription('Loop mode to set')
                .setRequired(true)
                .addChoices(
                    { name: '🔁 Off — Disable looping', value: 'off' },
                    { name: '🔂 Track — Repeat current track', value: 'track' },
                    { name: '🔁 Queue — Repeat entire queue', value: 'queue' },
                    { name: '🔀 Autoplay — Auto-queue similar tracks', value: 'autoplay' },
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
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)] });
        }

        const mode = interaction.options.getString('mode', true);
        const modeMap = {
            off: QueueRepeatMode.OFF,
            track: QueueRepeatMode.TRACK,
            queue: QueueRepeatMode.QUEUE,
            autoplay: QueueRepeatMode.AUTOPLAY,
        };

        const modeDetails = {
            off: { emoji: '🔁', label: 'Off', description: 'Looping disabled. Tracks will play once and be removed.', color: COLORS.INFO },
            track: { emoji: '🔂', label: 'Track', description: 'The current track will repeat indefinitely.', color: COLORS.SUCCESS },
            queue: { emoji: '🔁', label: 'Queue', description: 'The entire queue will repeat when it ends.', color: COLORS.SUCCESS },
            autoplay: { emoji: '🔀', label: 'Autoplay', description: 'Similar tracks will be automatically added when the queue ends.', color: COLORS.MUSIC },
        };

        queue.setRepeatMode(modeMap[mode]);
        const details = modeDetails[mode];

        const embed = new EmbedBuilder()
            .setColor(details.color)
            .setAuthor({ name: `${details.emoji} Loop Mode: ${details.label}`, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(details.description)
            .addFields(
                { name: '🎵 Current Track', value: queue.currentTrack?.title?.substring(0, 60) || 'None', inline: true },
                { name: '📋 Queue Size', value: `\`${queue.tracks.size} track(s)\``, inline: true },
            )
            .setFooter({ text: `Changed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');
const { buildErrorEmbed, COLORS, getGlobalPlayer } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('🎤 Make the bot join your voice channel'),

    async execute(interaction) {
        await interaction.deferReply();

        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('You must be in a voice channel!', interaction.client)]
            });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('I do not have permission to join or speak in your voice channel!', interaction.client)]
            });
        }

        try {
            const player = getGlobalPlayer();
            if (!player) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)]
                });
            }
            const queue = player.nodes.create(interaction.guild, {
                metadata: { channel: interaction.channel, requestedBy: interaction.user },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 30000,
                leaveOnEnd: false,
                // Voice Fixes:
                connectionTimeout: 30000,
                bufferingTimeout: 3000,
            });

            if (!queue.connection) {
                await queue.connect(voiceChannel);
            }

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setAuthor({ name: '🎤 Joined Voice Channel', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`Connected to **${voiceChannel.name}**!\n\nUse \`/play\` to start playing music.`)
                .addFields(
                    { name: '📢 Channel', value: voiceChannel.name, inline: true },
                    { name: '👥 Members', value: `${voiceChannel.members.size}`, inline: true },
                )
                .setFooter({ text: `Summoned by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('[JOIN CMD ERROR]', err);
            return interaction.editReply({
                embeds: [buildErrorEmbed(`Failed to join: ${err.message}`, interaction.client)]
            });
        }
    }
};

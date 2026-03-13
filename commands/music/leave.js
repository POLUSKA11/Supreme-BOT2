const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('👋 Make the bot leave the voice channel and clear the queue'),

    async execute(interaction) {
        await interaction.deferReply();

        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
        const botVoiceChannel = interaction.guild.members.me?.voice?.channel;

        if (!botVoiceChannel) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('I am not in a voice channel!', interaction.client)]
            });
        }

        const channelName = botVoiceChannel.name;
        const trackCount = queue?.tracks?.size || 0;
        const currentTrack = queue?.currentTrack;

        if (queue) {
            queue.delete();
        } else {
            // Force disconnect if no queue
            try { await interaction.guild.members.me.voice.disconnect(); } catch {}
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setAuthor({ name: '👋 Left Voice Channel', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Disconnected from **${channelName}** and cleared the queue.`)
            .addFields(
                { name: '🎵 Last Track', value: currentTrack?.title?.substring(0, 60) || 'None', inline: true },
                { name: '📋 Tracks Removed', value: `\`${trackCount}\``, inline: true },
            )
            .setFooter({ text: `Disconnected by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

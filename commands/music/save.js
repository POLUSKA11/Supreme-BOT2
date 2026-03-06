const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('save')
        .setDescription('💾 Save the current track to your DMs')
        .addStringOption(opt =>
            opt.setName('note')
                .setDescription('Add a personal note to the saved track')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Nothing is currently playing!', interaction.client)]
            });
        }

        const track = queue.currentTrack;
        const note = interaction.options.getString('note');

        const embed = new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setAuthor({ name: '💾 Track Saved', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track.title.substring(0, 256))
            .setURL(track.url)
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: `\`${formatDuration(track.durationMS)}\``, inline: true },
                { name: '🌐 Source', value: track.source || 'Unknown', inline: true },
                { name: '🔗 URL', value: `[Click to play](${track.url})`, inline: false },
            )
            .setTimestamp();

        if (note) {
            embed.addFields({ name: '📝 Your Note', value: note, inline: false });
        }

        embed.setFooter({ text: `Saved from ${interaction.guild.name} • ${new Date().toLocaleDateString()}` });

        try {
            await interaction.user.send({ embeds: [embed] });
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setDescription(`✅ **${track.title.substring(0, 60)}** has been saved to your DMs!`)
                    .setTimestamp()]
            });
        } catch (err) {
            return interaction.editReply({
                embeds: [buildErrorEmbed(
                    'Could not send you a DM! Please enable DMs from server members in your privacy settings.',
                    interaction.client
                )]
            });
        }
    }
};

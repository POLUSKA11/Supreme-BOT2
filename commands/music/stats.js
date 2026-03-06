const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { buildErrorEmbed, formatDuration, COLORS } = require('../../utils/musicPlayer');
const { getTopTracks, getTopListeners, getGuildPlayCount } = require('../../utils/musicDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📊 View music statistics for this server (powered by TiDB)')
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('What stats to view')
                .setRequired(false)
                .addChoices(
                    { name: '🎵 Top Tracks — Most played songs', value: 'tracks' },
                    { name: '👤 Top Listeners — Most active users', value: 'listeners' },
                    { name: '📈 Overview — General server stats', value: 'overview' },
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const type = interaction.options.getString('type') || 'overview';

        if (type === 'overview') {
            const totalPlays = await getGuildPlayCount(interaction.guild.id);
            const topTracks = await getTopTracks(interaction.guild.id, 3);
            const topListeners = await getTopListeners(interaction.guild.id, 3);

            const embed = new EmbedBuilder()
                .setColor(COLORS.MUSIC)
                .setAuthor({ name: '📊 Music Stats Overview', iconURL: interaction.client.user.displayAvatarURL() })
                .setThumbnail(interaction.guild.iconURL())
                .addFields(
                    {
                        name: '🎵 Total Plays',
                        value: `\`${totalPlays.toLocaleString()}\` tracks played`,
                        inline: true
                    },
                    {
                        name: '🏆 Top Track',
                        value: topTracks[0]
                            ? `**${topTracks[0].track_title.substring(0, 40)}** (\`${topTracks[0].play_count}x\`)`
                            : '*No data yet*',
                        inline: true
                    },
                    {
                        name: '👑 Top Listener',
                        value: topListeners[0]
                            ? `<@${topListeners[0].user_id}> (\`${topListeners[0].play_count}x\`)`
                            : '*No data yet*',
                        inline: true
                    },
                )
                .setFooter({ text: `${interaction.guild.name} • Powered by TiDB`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        if (type === 'tracks') {
            const tracks = await getTopTracks(interaction.guild.id, 10);
            if (!tracks || tracks.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed('No track history found yet! Play some music first.', interaction.client)]
                });
            }
            const embed = new EmbedBuilder()
                .setColor(COLORS.MUSIC)
                .setAuthor({ name: '🎵 Top Tracks', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(
                    tracks.map((t, i) => {
                        const medal = ['🥇', '🥈', '🥉'][i] || `\`${i + 1}.\``;
                        return (
                            `${medal} **[${t.track_title.substring(0, 50)}](${t.track_url || '#'})**\n` +
                            `   👤 ${t.track_author || 'Unknown'} • ⏱️ \`${formatDuration(t.track_duration)}\` • 🎵 \`${t.play_count}x played\``
                        );
                    }).join('\n\n')
                )
                .setFooter({ text: `${interaction.guild.name} • Powered by TiDB`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        if (type === 'listeners') {
            const listeners = await getTopListeners(interaction.guild.id, 10);
            if (!listeners || listeners.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed('No listener data found yet! Play some music first.', interaction.client)]
                });
            }
            const embed = new EmbedBuilder()
                .setColor(COLORS.MUSIC)
                .setAuthor({ name: '👤 Top Listeners', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(
                    listeners.map((l, i) => {
                        const medal = ['🥇', '🥈', '🥉'][i] || `\`${i + 1}.\``;
                        return `${medal} <@${l.user_id}> — \`${l.play_count}\` tracks played`;
                    }).join('\n')
                )
                .setFooter({ text: `${interaction.guild.name} • Powered by TiDB`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }
    }
};

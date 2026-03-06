const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useHistory } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS } = require('../../utils/musicPlayer');
const { getGuildHistory, getUserHistory, clearGuildHistory } = require('../../utils/musicDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('📜 View play history — session or persistent database')
        .addStringOption(opt =>
            opt.setName('scope')
                .setDescription('Which history to view')
                .setRequired(false)
                .addChoices(
                    { name: '🕐 Session — Tracks played this session (in-memory)', value: 'session' },
                    { name: '📚 Server — All-time server history (TiDB)', value: 'server' },
                    { name: '👤 Mine — Your personal history (TiDB)', value: 'mine' },
                )
        )
        .addIntegerOption(opt =>
            opt.setName('limit')
                .setDescription('Number of tracks to show (default: 15, max: 25)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)
        )
        .addBooleanOption(opt =>
            opt.setName('clear')
                .setDescription('Clear the server history (Admin only)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const scope = interaction.options.getString('scope') || 'session';
        const limit = interaction.options.getInteger('limit') || 15;
        const doClear = interaction.options.getBoolean('clear') || false;

        // Clear history (admin only)
        if (doClear) {
            if (!interaction.member.permissions.has('ManageGuild')) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed('You need **Manage Server** permission to clear history!', interaction.client)]
                });
            }
            await clearGuildHistory(interaction.guild.id);
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setDescription('🗑️ Server music history has been cleared.')
                    .setTimestamp()]
            });
        }

        // Session history (in-memory, current session only)
        if (scope === 'session') {
            const history = useHistory(interaction.guild.id);
            if (!history || history.isEmpty()) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        'No track history for this session!\n\nTip: Use `/history scope:Server` to view the persistent all-time history.',
                        interaction.client
                    )]
                });
            }
            const tracks = history.tracks.toArray().slice(0, limit);
            const embed = new EmbedBuilder()
                .setColor(COLORS.QUEUE)
                .setAuthor({ name: '🕐 Session History', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(
                    tracks.map((t, i) =>
                        `\`${i + 1}.\` **[${t.title.substring(0, 50)}](${t.url})**\n` +
                        `   👤 ${t.author} • ⏱️ \`${formatDuration(t.durationMS)}\``
                    ).join('\n\n')
                )
                .setFooter({
                    text: `${tracks.length} track(s) this session • Use /previous to go back`,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // Server history (TiDB)
        if (scope === 'server') {
            const rows = await getGuildHistory(interaction.guild.id, limit);
            if (!rows || rows.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        'No server history found in the database yet!\n\nPlay some tracks first — they are automatically saved.',
                        interaction.client
                    )]
                });
            }
            const embed = new EmbedBuilder()
                .setColor(COLORS.QUEUE)
                .setAuthor({ name: '📚 Server Play History', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(
                    rows.map((r, i) => {
                        const date = new Date(r.played_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        return (
                            `\`${i + 1}.\` **[${r.track_title.substring(0, 50)}](${r.track_url || '#'})**\n` +
                            `   👤 ${r.track_author || 'Unknown'} • ⏱️ \`${formatDuration(r.track_duration)}\` • 📅 ${date} • <@${r.user_id}>`
                        );
                    }).join('\n\n')
                )
                .setFooter({
                    text: `Showing last ${rows.length} track(s) • Powered by TiDB`,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // Personal history (TiDB)
        if (scope === 'mine') {
            const rows = await getUserHistory(interaction.guild.id, interaction.user.id, limit);
            if (!rows || rows.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        "You haven't played any tracks in this server yet!",
                        interaction.client
                    )]
                });
            }
            const embed = new EmbedBuilder()
                .setColor(COLORS.MUSIC)
                .setAuthor({
                    name: `👤 ${interaction.user.username}'s History`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setDescription(
                    rows.map((r, i) => {
                        const date = new Date(r.played_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        return (
                            `\`${i + 1}.\` **[${r.track_title.substring(0, 50)}](${r.track_url || '#'})**\n` +
                            `   👤 ${r.track_author || 'Unknown'} • ⏱️ \`${formatDuration(r.track_duration)}\` • 📅 ${date}`
                        );
                    }).join('\n\n')
                )
                .setFooter({
                    text: `Showing your last ${rows.length} track(s) • Powered by TiDB`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }
    }
};

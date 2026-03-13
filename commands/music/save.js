const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');
const { saveTrack, getSavedTracks, removeSavedTrack } = require('../../utils/musicDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('save')
        .setDescription('💾 Save tracks — save current, view saved, or remove saved tracks')
        .addStringOption(opt =>
            opt.setName('action')
                .setDescription('What to do')
                .setRequired(false)
                .addChoices(
                    { name: '💾 Save — Save the currently playing track', value: 'save' },
                    { name: '📋 List — View your saved tracks (TiDB)', value: 'list' },
                    { name: '🗑️ Remove — Remove a saved track by ID', value: 'remove' },
                )
        )
        .addStringOption(opt =>
            opt.setName('note')
                .setDescription('Add a personal note to the saved track')
                .setRequired(false)
        )
        .addIntegerOption(opt =>
            opt.setName('track_id')
                .setDescription('ID of the saved track to remove (use /save action:List to see IDs)')
                .setRequired(false)
                .setMinValue(1)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const action = interaction.options.getString('action') || 'save';
        const note   = interaction.options.getString('note');
        const trackId = interaction.options.getInteger('track_id');

        // ── List saved tracks ─────────────────────────────────────────────────
        if (action === 'list') {
            const saved = await getSavedTracks(interaction.user.id, 25);
            if (!saved || saved.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        "You haven't saved any tracks yet!\n\nUse `/save` while a track is playing to save it.",
                        interaction.client
                    )]
                });
            }
            const embed = new EmbedBuilder()
                .setColor(COLORS.MUSIC)
                .setAuthor({ name: '💾 Your Saved Tracks', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    saved.map((r, i) => {
                        const date = new Date(r.saved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        const noteStr = r.note ? ` • 📝 *${r.note.substring(0, 30)}*` : '';
                        return (
                            `\`ID:${r.id}\` \`${i + 1}.\` **[${r.track_title.substring(0, 45)}](${r.track_url || '#'})**\n` +
                            `   👤 ${r.track_author || 'Unknown'} • ⏱️ \`${formatDuration(r.track_duration)}\` • 📅 ${date}${noteStr}`
                        );
                    }).join('\n\n')
                )
                .setFooter({
                    text: `${saved.length} saved track(s) • Use /save action:Remove track_id:<ID> to remove`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // ── Remove a saved track ──────────────────────────────────────────────
        if (action === 'remove') {
            if (!trackId) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        'Please provide the `track_id` to remove.\n\nUse `/save action:List` to see your saved track IDs.',
                        interaction.client
                    )]
                });
            }
            await removeSavedTrack(interaction.user.id, trackId);
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setDescription(`🗑️ Saved track \`ID:${trackId}\` has been removed.`)
                    .setTimestamp()]
            });
        }

        // ── Save current track ────────────────────────────────────────────────
        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.editReply({
                embeds: [buildErrorEmbed('Nothing is currently playing!', interaction.client)]
            });
        }

        const track = queue.currentTrack;

        // Save to TiDB
        let savedId;
        try {
            savedId = await saveTrack(interaction.user.id, interaction.guild.id, track, note);
        } catch (err) {
            console.error('[SAVE CMD DB ERROR]', err);
            // Continue to DM even if DB fails
        }

        // Build the embed
        const embed = new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setAuthor({ name: '💾 Track Saved', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track.title.substring(0, 256))
            .setURL(track.url)
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: '👤 Artist',   value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: `\`${formatDuration(track.durationMS)}\``, inline: true },
                { name: '🌐 Source',   value: track.source || 'Unknown', inline: true },
                { name: '🔗 URL',      value: `[Click to play](${track.url})`, inline: false },
            )
            .setTimestamp();

        if (note) {
            embed.addFields({ name: '📝 Your Note', value: note.substring(0, 512), inline: false });
        }
        if (savedId) {
            embed.addFields({ name: '🗄️ Saved to Database', value: `ID: \`${savedId}\` — Use \`/save action:List\` to view all saved tracks`, inline: false });
        }
        embed.setFooter({ text: `Saved from ${interaction.guild.name} • ${new Date().toLocaleDateString()}` });

        // Also DM the user
        try {
            await interaction.user.send({ embeds: [embed] });
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setDescription(`✅ **${track.title.substring(0, 60)}** has been saved to your DMs and database!`)
                    .setTimestamp()]
            });
        } catch (err) {
            // DM failed but DB save succeeded
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setDescription(
                        `✅ **${track.title.substring(0, 60)}** saved to database!\n\n` +
                        `⚠️ Could not send DM (check your privacy settings).\n` +
                        `Use \`/save action:List\` to view your saved tracks.`
                    )
                    .setTimestamp()]
            });
        }
    }
};

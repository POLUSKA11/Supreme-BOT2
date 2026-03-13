const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { useQueue, useMainPlayer, QueryType } = require('discord-player');
const { buildErrorEmbed, buildTrackAddedEmbed, buildMusicControlsRow, validateVoiceChannel, formatDuration, COLORS getGlobalPlayer, } = require('../../utils/musicPlayer');
const {
    createPlaylist, getUserPlaylists, getPlaylistByName,
    addTrackToPlaylist, getPlaylistTracks, deletePlaylist
} = require('../../utils/musicDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('🎶 Manage your personal playlists (stored in TiDB)')
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Create a new playlist')
                .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('Optional description').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add the currently playing track to a playlist')
                .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View all your playlists')
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View tracks in a playlist')
                .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Queue all tracks from a playlist')
                .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Delete a playlist')
                .addStringOption(opt => opt.setName('name').setDescription('Playlist name').setRequired(true))
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();

        // ── Create ────────────────────────────────────────────────────────────
        if (sub === 'create') {
            const name = interaction.options.getString('name', true);
            const description = interaction.options.getString('description');

            // Check for duplicate
            const existing = await getPlaylistByName(interaction.user.id, name);
            if (existing) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`A playlist named **${name}** already exists!`, interaction.client)]
                });
            }

            const id = await createPlaylist(interaction.user.id, interaction.guild.id, name, description);
            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setAuthor({ name: '🎶 Playlist Created', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`**${name}** has been created!\n\nUse \`/playlist add name:${name}\` while a track is playing to add songs.`)
                .addFields(
                    { name: '🆔 ID', value: `\`${id}\``, inline: true },
                    { name: '📝 Description', value: description || '*None*', inline: true },
                )
                .setFooter({ text: `Created by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // ── Add current track ─────────────────────────────────────────────────
        if (sub === 'add') {
            const name = interaction.options.getString('name', true);
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

            const playlist = await getPlaylistByName(interaction.user.id, name);
            if (!playlist) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`Playlist **${name}** not found!\n\nCreate it first with \`/playlist create name:${name}\``, interaction.client)]
                });
            }

            const track = queue.currentTrack;
            await addTrackToPlaylist(playlist.id, track);

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setAuthor({ name: '✅ Track Added to Playlist', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(track.title.substring(0, 256))
                .setURL(track.url)
                .setThumbnail(track.thumbnail || null)
                .addFields(
                    { name: '🎶 Playlist', value: `**${name}**`, inline: true },
                    { name: '👤 Artist',   value: track.author || 'Unknown', inline: true },
                    { name: '⏱️ Duration', value: `\`${formatDuration(track.durationMS)}\``, inline: true },
                )
                .setFooter({ text: `Added by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // ── List playlists ────────────────────────────────────────────────────
        if (sub === 'list') {
            const playlists = await getUserPlaylists(interaction.user.id);
            if (!playlists || playlists.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        "You don't have any playlists yet!\n\nCreate one with `/playlist create name:<name>`",
                        interaction.client
                    )]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(COLORS.QUEUE)
                .setAuthor({ name: `🎶 ${interaction.user.username}'s Playlists`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    playlists.map((p, i) =>
                        `\`${i + 1}.\` **${p.name}** — \`${p.track_count} track(s)\`\n` +
                        `   ${p.description ? `*${p.description.substring(0, 60)}*` : '*No description*'}`
                    ).join('\n\n')
                )
                .setFooter({
                    text: `${playlists.length} playlist(s) • Use /playlist view name:<name> to see tracks`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // ── View playlist tracks ──────────────────────────────────────────────
        if (sub === 'view') {
            const name = interaction.options.getString('name', true);
            const playlist = await getPlaylistByName(interaction.user.id, name);
            if (!playlist) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`Playlist **${name}** not found!`, interaction.client)]
                });
            }

            const tracks = await getPlaylistTracks(playlist.id);
            if (!tracks || tracks.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(
                        `**${name}** is empty!\n\nAdd tracks with \`/playlist add name:${name}\` while a track is playing.`,
                        interaction.client
                    )]
                });
            }

            const totalDuration = tracks.reduce((sum, t) => sum + (t.track_duration || 0), 0);
            const embed = new EmbedBuilder()
                .setColor(COLORS.QUEUE)
                .setAuthor({ name: `🎶 Playlist: ${name}`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    tracks.slice(0, 15).map((t, i) =>
                        `\`${i + 1}.\` **[${t.track_title.substring(0, 50)}](${t.track_url || '#'})**\n` +
                        `   👤 ${t.track_author || 'Unknown'} • ⏱️ \`${formatDuration(t.track_duration)}\``
                    ).join('\n\n') +
                    (tracks.length > 15 ? `\n\n*...and ${tracks.length - 15} more*` : '')
                )
                .addFields(
                    { name: '🎵 Total Tracks', value: `\`${tracks.length}\``, inline: true },
                    { name: '⏱️ Total Duration', value: `\`${formatDuration(totalDuration)}\``, inline: true },
                )
                .setFooter({
                    text: `Use /playlist play name:${name} to queue all tracks`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // ── Play playlist ─────────────────────────────────────────────────────
        if (sub === 'play') {
            const name = interaction.options.getString('name', true);
            const { valid, error, voiceChannel } = validateVoiceChannel(interaction);
            if (!valid) {
                return interaction.editReply({ embeds: [buildErrorEmbed(error, interaction.client)] });
            }

            const playlist = await getPlaylistByName(interaction.user.id, name);
            if (!playlist) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`Playlist **${name}** not found!`, interaction.client)]
                });
            }

            const tracks = await getPlaylistTracks(playlist.id);
            if (!tracks || tracks.length === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`**${name}** is empty!`, interaction.client)]
                });
            }

            const player = useMainPlayer();
            const queue = player.nodes.create(interaction.guild, {
                metadata: { channel: interaction.channel, requestedBy: interaction.user },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 30000,
                leaveOnEnd: false,
                skipOnNoStream: true,
            });

            if (!queue.connection) await queue.connect(voiceChannel);

            let addedCount = 0;
            for (const t of tracks) {
                if (!t.track_url) continue;
                try {
                    const result = await player.search(t.track_url, {
                        requestedBy: interaction.user,
                        searchEngine: QueryType.AUTO,
                    });
                    if (result && !result.isEmpty()) {
                        queue.addTrack(result.tracks[0]);
                        addedCount++;
                    }
                } catch (err) {
                    console.error(`[PLAYLIST PLAY] Failed to search track: ${t.track_title}`, err.message);
                }
            }

            if (addedCount === 0) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed('Could not load any tracks from the playlist!', interaction.client)]
                });
            }

            if (!queue.isPlaying()) await queue.node.play();

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setAuthor({ name: '🎶 Playlist Queued', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(name.substring(0, 256))
                .addFields(
                    { name: '🎵 Tracks Added', value: `\`${addedCount}\``, inline: true },
                    { name: '📋 Queue Size',   value: `\`${queue.tracks.size}\``, inline: true },
                )
                .setFooter({ text: `Queued by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
            const row = buildMusicControlsRow(false);
            return interaction.editReply({ embeds: [embed], components: [row] });
        }

        // ── Delete playlist ───────────────────────────────────────────────────
        if (sub === 'delete') {
            const name = interaction.options.getString('name', true);
            const playlist = await getPlaylistByName(interaction.user.id, name);
            if (!playlist) {
                return interaction.editReply({
                    embeds: [buildErrorEmbed(`Playlist **${name}** not found!`, interaction.client)]
                });
            }

            await deletePlaylist(interaction.user.id, playlist.id);
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setDescription(`🗑️ Playlist **${name}** and all its tracks have been deleted.`)
                    .setTimestamp()]
            });
        }
    }
};

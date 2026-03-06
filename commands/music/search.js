const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { useMainPlayer, QueryType } = require('discord-player');
const { validateVoiceChannel, buildErrorEmbed, buildTrackAddedEmbed, buildMusicControlsRow, formatDuration, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('🔍 Search for tracks and select one to play interactively')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Search term for the track')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('source')
                .setDescription('Platform to search on')
                .setRequired(false)
                .addChoices(
                    { name: '▶️ YouTube', value: 'youtube' },
                    { name: '🟢 Spotify', value: 'spotify' },
                    { name: '☁️ SoundCloud', value: 'soundcloud' },
                    { name: '🍎 Apple Music', value: 'apple_music' },
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const { valid, error, voiceChannel } = validateVoiceChannel(interaction);
        if (!valid) return interaction.editReply({ embeds: [buildErrorEmbed(error, interaction.client)] });

        const query = interaction.options.getString('query', true);
        const sourceOpt = interaction.options.getString('source');

        const queryTypeMap = {
            youtube: QueryType.YOUTUBE_SEARCH,
            spotify: QueryType.SPOTIFY_SEARCH,
            soundcloud: QueryType.SOUNDCLOUD_SEARCH,
            apple_music: QueryType.APPLE_MUSIC_SEARCH,
        };
        const searchEngine = sourceOpt ? queryTypeMap[sourceOpt] : QueryType.YOUTUBE_SEARCH;

        const player = useMainPlayer();

        try {
            const result = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine,
            });

            if (!result || result.isEmpty()) {
                return interaction.editReply({ embeds: [buildErrorEmbed(`No results found for **${query}**.`, interaction.client)] });
            }

            const tracks = result.tracks.slice(0, 10);

            const searchEmbed = new EmbedBuilder()
                .setColor(COLORS.QUEUE)
                .setAuthor({ name: '🔍 Search Results', iconURL: interaction.client.user.displayAvatarURL() })
                .setTitle(`Results for: "${query}"`)
                .setDescription(
                    tracks.map((t, i) =>
                        `\`${i + 1}.\` **[${t.title.substring(0, 50)}](${t.url})**\n` +
                        `   👤 ${t.author} • ⏱️ \`${formatDuration(t.durationMS)}\``
                    ).join('\n\n')
                )
                .setFooter({ text: 'Select a track using the buttons below • Expires in 60s' })
                .setTimestamp();

            // Build number buttons (up to 5 per row, max 2 rows = 10 tracks)
            const rows = [];
            const chunk1 = tracks.slice(0, 5);
            const chunk2 = tracks.slice(5, 10);

            const row1 = new ActionRowBuilder().addComponents(
                chunk1.map((_, i) =>
                    new ButtonBuilder()
                        .setCustomId(`search_select_${i}`)
                        .setLabel(`${i + 1}`)
                        .setStyle(ButtonStyle.Primary)
                )
            );
            rows.push(row1);

            if (chunk2.length > 0) {
                const row2 = new ActionRowBuilder().addComponents(
                    chunk2.map((_, i) =>
                        new ButtonBuilder()
                            .setCustomId(`search_select_${i + 5}`)
                            .setLabel(`${i + 6}`)
                            .setStyle(ButtonStyle.Primary)
                    )
                );
                rows.push(row2);
            }

            const cancelRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('search_cancel')
                    .setLabel('❌ Cancel')
                    .setStyle(ButtonStyle.Danger)
            );
            rows.push(cancelRow);

            const msg = await interaction.editReply({ embeds: [searchEmbed], components: rows });

            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 60000,
            });

            collector.on('collect', async (btnInteraction) => {
                await btnInteraction.deferUpdate();
                collector.stop();

                if (btnInteraction.customId === 'search_cancel') {
                    return interaction.editReply({ embeds: [buildErrorEmbed('Search cancelled.', interaction.client)], components: [] });
                }

                const index = parseInt(btnInteraction.customId.replace('search_select_', ''));
                const track = tracks[index];

                const queueNode = player.nodes.create(interaction.guild, {
                    metadata: { channel: interaction.channel, requestedBy: interaction.user },
                    selfDeaf: true,
                    volume: 80,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 30000,
                    leaveOnEnd: false,
                    skipOnNoStream: true,
                });

                if (!queueNode.connection) await queueNode.connect(voiceChannel);
                queueNode.addTrack(track);
                if (!queueNode.isPlaying()) await queueNode.node.play();

                const embed = buildTrackAddedEmbed(track, queueNode, interaction.client);
                const row = buildMusicControlsRow(false);
                await interaction.editReply({ embeds: [embed], components: [row] });
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ components: [] }).catch(() => {});
                }
            });

        } catch (err) {
            console.error('[SEARCH CMD ERROR]', err);
            return interaction.editReply({ embeds: [buildErrorEmbed(`Search failed: ${err.message}`, interaction.client)] });
        }
    }
};

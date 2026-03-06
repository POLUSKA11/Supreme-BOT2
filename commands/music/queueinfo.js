const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queueinfo')
        .setDescription('📊 Get detailed statistics about the current queue'),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = useQueue(interaction.guild.id);
        if (!queue || (!queue.isPlaying() && queue.tracks.size === 0)) {
            return interaction.editReply({ embeds: [buildErrorEmbed('The queue is empty!', interaction.client)] });
        }

        const tracks = queue.tracks.toArray();
        const allTracks = queue.currentTrack ? [queue.currentTrack, ...tracks] : tracks;

        const totalDuration = allTracks.reduce((acc, t) => acc + (t.durationMS || 0), 0);

        // Requester stats
        const requesterMap = {};
        allTracks.forEach(t => {
            const tag = t.requestedBy?.tag || 'Unknown';
            requesterMap[tag] = (requesterMap[tag] || 0) + 1;
        });
        const topRequester = Object.entries(requesterMap).sort((a, b) => b[1] - a[1])[0];

        // Source stats
        const sourceMap = {};
        allTracks.forEach(t => {
            const src = t.source || 'unknown';
            sourceMap[src] = (sourceMap[src] || 0) + 1;
        });

        const loopModes = ['Off', 'Track', 'Queue', 'Autoplay'];

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setAuthor({ name: '📊 Queue Statistics', iconURL: interaction.client.user.displayAvatarURL() })
            .addFields(
                { name: '🎵 Total Tracks', value: `\`${allTracks.length}\``, inline: true },
                { name: '⏱️ Total Duration', value: `\`${formatDuration(totalDuration)}\``, inline: true },
                { name: '🔁 Loop Mode', value: `\`${loopModes[queue.repeatMode] || 'Off'}\``, inline: true },
                { name: '🔊 Volume', value: `\`${queue.node.volume}%\``, inline: true },
                { name: '⏸️ Status', value: queue.node.isPaused() ? '`Paused`' : '`Playing`', inline: true },
                { name: '🎤 Voice Channel', value: queue.channel?.name ? `\`${queue.channel.name}\`` : '`Unknown`', inline: true },
                {
                    name: '🏆 Top Requester',
                    value: topRequester ? `**${topRequester[0]}** — ${topRequester[1]} track(s)` : 'N/A',
                    inline: false
                },
                {
                    name: '🌐 Sources',
                    value: Object.entries(sourceMap).map(([src, count]) => `\`${src}\`: ${count}`).join(' • ') || 'N/A',
                    inline: false
                },
            )
            .setTimestamp();

        if (queue.currentTrack) {
            embed.setThumbnail(queue.currentTrack.thumbnail || null);
            embed.setDescription(`**Now Playing:** [${queue.currentTrack.title.substring(0, 60)}](${queue.currentTrack.url})`);
        }

        return interaction.editReply({ embeds: [embed] });
    }
};

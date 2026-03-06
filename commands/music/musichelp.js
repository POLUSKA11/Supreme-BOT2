const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('musichelp')
        .setDescription('🎵 View all music commands and supported platforms'),

    async execute(interaction) {
        await interaction.deferReply();

        const embed = new EmbedBuilder()
            .setColor(COLORS.MUSIC)
            .setAuthor({
                name: '🎵 Supreme Music — Command Guide',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTitle('All Music Commands')
            .setDescription(
                'Supreme Music supports **YouTube**, **Spotify**, **SoundCloud**, **Apple Music**, **Vimeo**, **Reverbnation**, and **direct file attachments**.\n\n' +
                'Simply paste any URL or search by name — the bot will automatically detect the platform!'
            )
            .addFields(
                {
                    name: '▶️ Playback',
                    value: [
                        '`/play <query>` — Play a song, playlist, or URL',
                        '`/search <query>` — Search and select a track interactively',
                        '`/pause` — Pause the current track',
                        '`/resume` — Resume playback',
                        '`/stop` — Stop music and clear the queue',
                        '`/skip [to]` — Skip current or jump to a position',
                        '`/previous` — Go back to the previous track',
                        '`/restart` — Restart the current track',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⏩ Track Controls',
                    value: [
                        '`/seek <time>` — Seek to a position (e.g. `1:30`, `90s`)',
                        '`/forward [time]` — Fast forward (default: 30s)',
                        '`/rewind [time]` — Rewind (default: 30s)',
                        '`/volume [0-200]` — Set or check volume',
                        '`/loop <mode>` — Set loop mode (off/track/queue/autoplay)',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📋 Queue Management',
                    value: [
                        '`/queue [page]` — View the queue with pagination',
                        '`/upcoming` — See the next 10 tracks',
                        '`/queueinfo` — Queue statistics',
                        '`/shuffle` — Shuffle the queue',
                        '`/clear` — Clear all queued tracks',
                        '`/remove <pos>` — Remove a specific track',
                        '`/move <from> <to>` — Move a track to a new position',
                        '`/swap <track1> <track2>` — Swap two tracks',
                        '`/removeduplicates` — Remove duplicate tracks',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎛️ Effects & Filters',
                    value: [
                        '`/filter <effect>` — Apply audio effects:',
                        '`bass boost` • `nightcore` • `vaporwave` • `8D audio`',
                        '`tremolo` • `vibrato` • `lo-fi` • `normalizer`',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📝 Information',
                    value: [
                        '`/nowplaying` — Current track with progress bar',
                        '`/lyrics [song]` — Get song lyrics',
                        '`/trackinfo [query]` — Detailed track info',
                        '`/history` — Recently played tracks',
                        '`/save [note]` — Save current track to DMs',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎤 Voice Channel',
                    value: [
                        '`/join` — Join your voice channel',
                        '`/leave` — Leave and clear the queue',
                        '`/voteskip` — Start a vote to skip the current track',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🌐 Supported Platforms',
                    value: '▶️ YouTube • 🟢 Spotify • ☁️ SoundCloud • 🍎 Apple Music • 🎬 Vimeo • 🎸 ReverbNation • 📎 File Attachments',
                    inline: false
                },
            )
            .setFooter({
                text: 'Supreme BOT2 • Music powered by discord-player v7',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

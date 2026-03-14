const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, COLORS, getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('🔊 Set or check the playback volume')
        .addIntegerOption(opt =>
            opt.setName('level')
                .setDescription('Volume level (0-200). Leave empty to check current volume.')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(200)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const player = getGlobalPlayer();
        if (!player) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Music player is not initialized.', interaction.client)] });
        }
        const queue = player.nodes.cache.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.editReply({ embeds: [buildErrorEmbed('Nothing is playing!', interaction.client)] });
        }

        const level = interaction.options.getInteger('level');

        if (level === null || level === undefined) {
            // Show current volume
            const current = queue.node.volume;
            const bar = createVolumeBar(current);
            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setAuthor({ name: '🔊 Current Volume', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`${bar}\n\n**Volume:** \`${current}%\``)
                .setFooter({ text: 'Use /volume <0-200> to change the volume' })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        const oldVolume = queue.node.volume;
        queue.node.setVolume(level);

        const emoji = level === 0 ? '🔇' : level < 50 ? '🔈' : level < 100 ? '🔉' : '🔊';
        const bar = createVolumeBar(level);

        const embed = new EmbedBuilder()
            .setColor(level > 100 ? COLORS.WARNING : COLORS.SUCCESS)
            .setAuthor({ name: `${emoji} Volume Changed`, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`${bar}\n\n**Volume:** \`${oldVolume}%\` → \`${level}%\``)
            .addFields(
                level > 150 ? { name: '⚠️ Warning', value: 'Volume above 150% may cause audio distortion.', inline: false } : { name: '\u200b', value: '\u200b', inline: false }
            )
            .setFooter({ text: `Changed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

function createVolumeBar(volume) {
    const max = 200;
    const filled = Math.round((volume / max) * 20);
    const empty = 20 - filled;
    const emoji = volume === 0 ? '🔇' : volume < 50 ? '🔈' : volume < 100 ? '🔉' : '🔊';
    return `${emoji} \`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` \`${volume}%\``;
}

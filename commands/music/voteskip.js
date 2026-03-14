const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { useQueue } = require('discord-player');
const { buildErrorEmbed, formatDuration, COLORS, getGlobalPlayer, } = require('../../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voteskip')
        .setDescription('🗳️ Start a vote to skip the current track'),

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

        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.editReply({ embeds: [buildErrorEmbed('You must be in a voice channel!', interaction.client)] });
        }

        const members = voiceChannel.members.filter(m => !m.user.bot);
        const requiredVotes = Math.ceil(members.size * 0.5); // 50% majority
        const votes = new Set([interaction.user.id]);

        const track = queue.currentTrack;

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setAuthor({ name: '🗳️ Vote Skip', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(track?.title?.substring(0, 256) || 'Unknown Track')
            .setThumbnail(track?.thumbnail || null)
            .setDescription(`**${interaction.user.tag}** started a vote to skip!\n\nVotes: **${votes.size}/${requiredVotes}** needed`)
            .addFields(
                { name: '⏱️ Duration', value: `\`${formatDuration(track?.durationMS)}\``, inline: true },
                { name: '👥 Listeners', value: `\`${members.size}\``, inline: true },
                { name: '📊 Required', value: `\`${requiredVotes} vote(s)\``, inline: true },
            )
            .setFooter({ text: 'Vote expires in 30 seconds' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('voteskip_yes')
                .setLabel(`✅ Skip (${votes.size}/${requiredVotes})`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('voteskip_no')
                .setLabel('❌ Keep')
                .setStyle(ButtonStyle.Danger),
        );

        const msg = await interaction.editReply({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => {
                const inChannel = voiceChannel.members.has(i.user.id);
                if (!inChannel) {
                    i.reply({ content: '❌ You must be in the voice channel to vote!', ephemeral: true });
                    return false;
                }
                return true;
            },
            time: 30000,
        });

        collector.on('collect', async (btnInteraction) => {
            await btnInteraction.deferUpdate();

            if (btnInteraction.customId === 'voteskip_yes') {
                votes.add(btnInteraction.user.id);
            } else if (btnInteraction.customId === 'voteskip_no') {
                votes.delete(btnInteraction.user.id);
            }

            if (votes.size >= requiredVotes) {
                collector.stop('passed');
                const currentQueue = useQueue(interaction.guild.id);
                if (currentQueue?.isPlaying()) currentQueue.node.skip();

                const successEmbed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setAuthor({ name: '✅ Vote Skip Passed!', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`**${votes.size}/${requiredVotes}** votes — Skipping **${track?.title?.substring(0, 60) || 'Unknown'}**!`)
                    .setTimestamp();
                return interaction.editReply({ embeds: [successEmbed], components: [] });
            }

            // Update vote count
            const updatedEmbed = EmbedBuilder.from(embed)
                .setDescription(`**${interaction.user.tag}** started a vote to skip!\n\nVotes: **${votes.size}/${requiredVotes}** needed`);
            const updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('voteskip_yes')
                    .setLabel(`✅ Skip (${votes.size}/${requiredVotes})`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('voteskip_no')
                    .setLabel('❌ Keep')
                    .setStyle(ButtonStyle.Danger),
            );
            await interaction.editReply({ embeds: [updatedEmbed], components: [updatedRow] });
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'passed') {
                const failEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setDescription(`❌ Vote skip failed. Only **${votes.size}/${requiredVotes}** votes collected.`)
                    .setTimestamp();
                interaction.editReply({ embeds: [failEmbed], components: [] }).catch(() => {});
            }
        });
    }
};

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('./storage.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-create')
        .setDescription('Create a giveaway')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(opt => opt.setName('prize').setDescription('The name of the prize for the giveaway').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('The Duration for the giveaway (e.g., 3w, 2h, 1m 30s)').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('The number of winners').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Which channel should the giveaway be in').setRequired(true).addChannelTypes(ChannelType.GuildText)),

    async execute(interaction) {
        const prize = interaction.options.getString('prize');
        const durationStr = interaction.options.getString('duration');
        const winnersCount = interaction.options.getInteger('winners');
        // getChannel returns a partial channel - fetch the full channel object to ensure .send() works
        const channelOption = interaction.options.getChannel('channel');

        function parseDuration(str) {
            const regex = /(\d+)\s*([smhdw])/g;
            let totalMs = 0;
            let match;
            while ((match = regex.exec(str.toLowerCase())) !== null) {
                const value = parseInt(match[1]);
                const unit = match[2];
                switch (unit) {
                    case 's': totalMs += value * 1000; break;
                    case 'm': totalMs += value * 60 * 1000; break;
                    case 'h': totalMs += value * 60 * 60 * 1000; break;
                    case 'd': totalMs += value * 24 * 60 * 60 * 1000; break;
                    case 'w': totalMs += value * 7 * 24 * 60 * 60 * 1000; break;
                }
            }
            return totalMs;
        }

        const durationMs = parseDuration(durationStr);
        if (durationMs <= 0) {
            return interaction.reply({ content: '❌ Invalid duration format! Use something like `1h`, `30m`, or `1d`.', ephemeral: true });
        }

        // Fetch the full channel object from the guild cache to ensure .send() is available
        const channel = interaction.guild.channels.cache.get(channelOption.id) 
            || await interaction.client.channels.fetch(channelOption.id).catch(() => null);

        if (!channel || !channel.isTextBased()) {
            return interaction.reply({ content: '❌ Could not access the specified channel. Make sure the bot has permission to send messages there.', ephemeral: true });
        }

        const endTime = Math.floor((Date.now() + durationMs) / 1000);
        const dot = '<:dot:1460754381447237785>';

        const embed = new EmbedBuilder()
            .setTitle(prize)
            .setDescription(`${dot} Hosted by ${interaction.user}\n${dot} Ends: <t:${endTime}:F> (<t:${endTime}:R>)\n${dot} Winners: **${winnersCount}**\n\n${dot} Participants: **0**`)
            .setColor('#5865F2')
            .setFooter({ 
                text: 'Supreme Bot', 
                iconURL: interaction.client.user.displayAvatarURL() 
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway_entry_${endTime}_${winnersCount}`)
                .setLabel('Entry')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`giveaway_participants_${endTime}`)
                .setLabel('Participants')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Secondary)
        );

        try {
            const giveawayMsg = await channel.send({ embeds: [embed], components: [row] });
            
            // Initialize storage immediately so management commands can find it
            const giveawayId = `giveaway_${giveawayMsg.id}`;
            await storage.set(interaction.guild.id, giveawayId, []);

            // Store giveaway metadata for dashboard and persistence
            await storage.set(interaction.guild.id, `giveaway_meta_${giveawayMsg.id}`, {
                messageId: giveawayMsg.id,
                channelId: channel.id,
                prize: prize,
                winnersCount: winnersCount,
                hostId: interaction.user.id,
                hostTag: interaction.user.username,
                endTime: endTime,
                createdAt: Date.now(),
                status: 'active'
            });

            // Track active giveaways for /giveaway-list and dashboard
            const allGiveaways = storage.get(interaction.guild.id, 'all_giveaways') || [];
            if (!allGiveaways.includes(giveawayMsg.id)) {
                allGiveaways.push(giveawayMsg.id);
                await storage.set(interaction.guild.id, 'all_giveaways', allGiveaways);
            }

            await interaction.reply({ content: `✅ Giveaway started in ${channel}!`, ephemeral: true });

            // Schedule the giveaway end
            setTimeout(async () => {
                try {
                    const participants = storage.get(interaction.guild.id, giveawayId) || [];
                    
                    let winners = [];
                    if (participants.length > 0) {
                        const shuffled = [...participants].sort(() => 0.5 - Math.random());
                        winners = shuffled.slice(0, winnersCount);
                    }

                    const winnersText = winners.length > 0 
                        ? winners.map(id => `<@${id}>`).join(', ') 
                        : 'No winners (no participants)';

                    const endedEmbed = new EmbedBuilder()
                        .setTitle(prize)
                        .setDescription(`${dot} Ended: <t:${endTime}:R> (<t:${endTime}:F>)\n${dot} Hosted by: ${interaction.user}\n${dot} Participants: **${participants.length}**\n${dot} Winners: ${winnersText}`)
                        .setColor('#2F3136')
                        .setFooter({ 
                            text: 'Supreme Bot', 
                            iconURL: interaction.client.user.displayAvatarURL() 
                        })
                        .setTimestamp(endTime * 1000);

                    await giveawayMsg.edit({ embeds: [endedEmbed], components: [] });
                    
                    // Re-fetch channel in case it was evicted from cache
                    const endChannel = interaction.guild.channels.cache.get(channel.id)
                        || await interaction.client.channels.fetch(channel.id).catch(() => null);
                    
                    if (endChannel) {
                        if (winners.length > 0) {
                            await endChannel.send(`🎉 Congratulations ${winnersText}! You won the **${prize}**!`);
                        } else {
                            await endChannel.send(`The giveaway for **${prize}** has ended, but no one participated.`);
                        }
                    }

                    // Update metadata to ended
                    const meta = storage.get(interaction.guild.id, `giveaway_meta_${giveawayMsg.id}`);
                    if (meta) {
                        meta.status = 'ended';
                        meta.winners = winners;
                        meta.participantCount = participants.length;
                        await storage.set(interaction.guild.id, `giveaway_meta_${giveawayMsg.id}`, meta);
                    }
                } catch (e) {
                    console.error('Error ending giveaway:', e);
                }
            }, durationMs);

        } catch (error) {
            console.error('Giveaway Send Error:', error);
            await interaction.reply({ content: '❌ Failed to send giveaway message. Make sure the bot has permission to send messages in that channel.', ephemeral: true });
        }
    }
};

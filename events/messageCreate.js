const { Events, PermissionFlagsBits } = require('discord.js');
const storage = require('../commands/utility/storage.js');

const CONTROL_CHANNEL_ID = '1470577900540661925';

module.exports = {
    name: Events.MessageCreate,
	    async execute(message) {
	        if (message.author.bot || !message.guild) return;
	
	        const { guild, author, channel, mentions, member, content } = message;

	        // --- ANTI-RAID SYSTEM ---
	        const antiRaidConfig = storage.get(guild.id, 'anti_raid_config');
	        if (antiRaidConfig && !member.permissions.has(PermissionFlagsBits.ManageMessages)) {
	            let shouldDelete = false;
	            let reason = "";

	            // 1. Lockdown Mode
	            if (antiRaidConfig.lockdown) {
	                shouldDelete = true;
	                reason = "Server is in Lockdown Mode";
	            }

	            // 2. Anti-Link & Anti-Promotion
	            const linkRegex = /(https?:\/\/[^\s]+)/g;
	            const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/i;
	            
	            if (!shouldDelete && antiRaidConfig.anti_promo && inviteRegex.test(content)) {
	                shouldDelete = true;
	                reason = "Discord Invite/Promotion Link";
	            } else if (!shouldDelete && antiRaidConfig.anti_link && linkRegex.test(content)) {
	                shouldDelete = true;
	                reason = "External Link";
	            }

	            // 3. Anti-BadWords
	            if (!shouldDelete && antiRaidConfig.anti_badwords && antiRaidConfig.banned_words?.length > 0) {
	                const lowerContent = content.toLowerCase();
	                if (antiRaidConfig.banned_words.some(word => lowerContent.includes(word.toLowerCase()))) {
	                    shouldDelete = true;
	                    reason = "Banned Word Usage";
	                }
	            }

	            // 4. Anti-Spam (Simple Rate Limiting)
	            if (!shouldDelete && antiRaidConfig.anti_spam) {
	                const now = Date.now();
	                const userSpamKey = `spam_${guild.id}_${author.id}`;
	                let userMsgs = storage.get(guild.id, userSpamKey) || [];
	                userMsgs = userMsgs.filter(timestamp => now - timestamp < 5000); // Keep last 5s
	                userMsgs.push(now);
	                storage.set(guild.id, userSpamKey, userMsgs);

	                if (userMsgs.length > (antiRaidConfig.spam_threshold || 5)) {
	                    shouldDelete = true;
	                    reason = "Message Spamming";
	                }
	            }

	            if (shouldDelete) {
	                await message.delete().catch(() => null);
	                
	                // Log to channel if configured
	                if (antiRaidConfig.log_channel) {
	                    const logChannel = guild.channels.cache.get(antiRaidConfig.log_channel);
	                    if (logChannel) {
	                        const logEmbed = {
	                            title: '🛡️ Anti-Raid Action',
	                            color: 0xFF0000,
	                            fields: [
	                                { name: 'User', value: `${author.tag} (${author.id})`, inline: true },
	                                { name: 'Channel', value: `<#${channel.id}>`, inline: true },
	                                { name: 'Reason', value: reason, inline: true },
	                                { name: 'Message Content', value: content.substring(0, 1024) || "*No Content*" }
	                            ],
	                            timestamp: new Date().toISOString()
	                        };
	                        logChannel.send({ embeds: [logEmbed] }).catch(() => null);
	                    }
	                }

	                const warning = await channel.send(`⚠️ <@${author.id}>, your message was removed: **${reason}**`).catch(() => null);
	                if (warning) setTimeout(() => warning.delete().catch(() => null), 5000);
	                return;
	            }
	        }

        // Handle persistent control room mute/unmute logic
        if (channel.id === CONTROL_CHANNEL_ID) {
            const vcAction = storage.get(guild.id, `vc_action_${author.id}`);
            
            if (vcAction) {
                const targetUser = mentions.users.first();
                
                if (targetUser) {
                    try {
                        const voiceChannel = await guild.channels.fetch(vcAction.channelId).catch(() => null);
                        if (voiceChannel) {
                            if (vcAction.action === 'mute') {
                                await voiceChannel.permissionOverwrites.edit(targetUser.id, { [PermissionFlagsBits.Speak]: false });
                                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                                if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
                                    await targetMember.voice.setMute(true);
                                }
                                const reply = await message.reply(`✅ <@${targetUser.id}> has been **muted** in your room.`);
                                setTimeout(() => {
                                    message.delete().catch(() => null);
                                    reply.delete().catch(() => null);
                                }, 5000);
                            } else if (vcAction.action === 'unmute') {
                                await voiceChannel.permissionOverwrites.edit(targetUser.id, { [PermissionFlagsBits.Speak]: true });
                                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                                if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
                                    await targetMember.voice.setMute(false);
                                }
                                const reply = await message.reply(`✅ <@${targetUser.id}> has been **unmuted** in your room.`);
                                setTimeout(() => {
                                    message.delete().catch(() => null);
                                    reply.delete().catch(() => null);
                                }, 5000);
                            } else if (vcAction.action === 'permit') {
                                await voiceChannel.permissionOverwrites.edit(targetUser.id, { [PermissionFlagsBits.Connect]: true, [PermissionFlagsBits.ViewChannel]: true });
                                const reply = await message.reply(`✅ <@${targetUser.id}> is now **permitted** to join your room.`);
                                setTimeout(() => {
                                    message.delete().catch(() => null);
                                    reply.delete().catch(() => null);
                                }, 5000);
                            } else if (vcAction.action === 'reject') {
                                await voiceChannel.permissionOverwrites.edit(targetUser.id, { [PermissionFlagsBits.Connect]: false, [PermissionFlagsBits.ViewChannel]: false });
                                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                                if (targetMember && targetMember.voice.channelId === voiceChannel.id) await targetMember.voice.disconnect();
                                const reply = await message.reply(`❌ <@${targetUser.id}> has been **rejected** from your room.`);
                                setTimeout(() => {
                                    message.delete().catch(() => null);
                                    reply.delete().catch(() => null);
                                }, 5000);
                            } else if (vcAction.action === 'kick') {
                                const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
                                if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
                                    await targetMember.voice.disconnect();
                                    const reply = await message.reply(`👞 <@${targetUser.id}> has been **kicked** from your room.`);
                                    setTimeout(() => {
                                        message.delete().catch(() => null);
                                        reply.delete().catch(() => null);
                                    }, 5000);
                                } else {
                                    const reply = await message.reply("❌ That user is not in your voice channel.");
                                    setTimeout(() => {
                                        message.delete().catch(() => null);
                                        reply.delete().catch(() => null);
                                    }, 5000);
                                }
                            }
                        } else {
                            const reply = await message.reply("❌ Your voice channel no longer exists.");
                            setTimeout(() => {
                                message.delete().catch(() => null);
                                reply.delete().catch(() => null);
                            }, 5000);
                        }
                    } catch (err) {
                        console.error('[VOICE CONTROL] Error:', err);
                        const reply = await message.reply("❌ An error occurred while processing the request.");
                        setTimeout(() => {
                            message.delete().catch(() => null);
                            reply.delete().catch(() => null);
                        }, 5000);
                    } finally {
                        // Re-lock the channel for the owner
                        await channel.permissionOverwrites.edit(author.id, { [PermissionFlagsBits.SendMessages]: false });
                        // Clear the action state
                        await storage.delete(guild.id, `vc_action_${author.id}`);
                    }
                } else {
                    // If they sent a message but didn't mention anyone, we might want to wait or cancel
                    // For now, let's just cancel if it's not a mention to avoid locking them out without a way to finish
                    if (message.content.toLowerCase() === 'cancel') {
                        await channel.permissionOverwrites.edit(author.id, { [PermissionFlagsBits.SendMessages]: false });
                        await storage.delete(guild.id, `vc_action_${author.id}`);
                        const reply = await message.reply("❌ Action cancelled. Channel re-locked.");
                        setTimeout(() => {
                            message.delete().catch(() => null);
                            reply.delete().catch(() => null);
                        }, 5000);
                    } else {
                        // If they sent a message but didn't mention anyone and didn't say cancel
                        const reply = await message.reply(`⚠️ Please **@mention** a user to perform this action, or type \`cancel\` to stop.`);
                        setTimeout(() => {
                            message.delete().catch(() => null);
                            reply.delete().catch(() => null);
                        }, 5000);
                    }
                }
                return;
            } else {
                // If anyone sends a message in the control room without an active action
                // We delete it to keep the room clean
                setTimeout(() => {
                    message.delete().catch(() => null);
                }, 1000);
                return;
            }
        }

        // Handle DM responses for MM Application
        if (!message.guild && message.channel.type === 1) {
            const appManager = require('../applicationManager.js');
            await appManager.handleDMResponse(message, message.client);
            return;
        }
    }
};

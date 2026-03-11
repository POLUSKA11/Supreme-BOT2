const { Events, EmbedBuilder } = require('discord.js');
const storage = require('../commands/utility/storage.js');
const inviteManager = require('../inviteManager.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            const guildId = member.guild.id;
            const userId = member.id;
            
            // 1. Fetch join data to identify the inviter and current status
            const joinData = await inviteManager.getJoinData(guildId, userId);
            
            if (!joinData || !joinData.inviterId) {
                console.log(`[INVITES] No inviter found for ${member.user.tag}. Skipping "Left" logic.`);
            } else if (joinData.isFake) {
                console.log(`[INVITES] Fake member ${member.user.tag} left. Ignoring.`);
            } else {
                // 2. ATOMIC LOCK: Attempt to mark the user as 'left' in the database.
                const wasSuccessfullyMarkedAsLeft = await inviteManager.recordLeave(guildId, userId);
                
                if (!wasSuccessfullyMarkedAsLeft) {
                    console.log(`[INVITES] ${member.user.tag} already counted as Left (Database Lock). Skipping increment.`);
                } else {
                    // 3. SYNC STATS
                    const inviterId = joinData.inviterId;
                    await inviteManager.syncUserInvites(guildId, inviterId);
                    console.log(`[INVITES] SUCCESS: ${member.user.tag} left. Inviter ${inviterId} stats synchronized and healed.`);
                }
            }
        } catch (error) {
            console.error('[INVITES ERROR] Fatal error in guildMemberRemove:', error);
        }

        // --- 4. GOODBYE MESSAGE LOGIC ---
        try {
            const guildId = member.guild.id;
            const goodbyeConfig = storage.get(guildId, 'goodbye_config');
            
            // Check if goodbye is enabled and has a valid channel configured
            if (!goodbyeConfig || !goodbyeConfig.channelId) {
                console.log(`[GOODBYE] Goodbye messages not configured for guild ${guildId}`);
                return;
            }

            const channel = member.guild.channels.cache.get(goodbyeConfig.channelId);
            if (!channel) {
                console.warn(`[GOODBYE] Channel ${goodbyeConfig.channelId} not found for guild ${guildId}`);
                return;
            }

            // Build the goodbye embed with Nexus branding
            const embed = new EmbedBuilder()
                .setTitle(goodbyeConfig.title || `Goodbye ${member.user.username}`)
                .setDescription(goodbyeConfig.description || `${member.user.username} has left the server.`)
                .setColor('#FF6B6B') // Red color for goodbye
                .setFooter({ 
                    text: `We hope to see you again in ${member.guild.name}!`, 
                    iconURL: member.client.user.displayAvatarURL() // Use bot's avatar as Nexus logo
                })
                .setTimestamp();

            // Add banner/GIF if provided and valid
            if (goodbyeConfig.bannerUrl && goodbyeConfig.bannerUrl.trim()) {
                embed.setImage(goodbyeConfig.bannerUrl);
            }

            // Add thumbnail with bot avatar (Nexus logo)
            embed.setThumbnail(member.client.user.displayAvatarURL());

            // Send the goodbye message
            await channel.send({ 
                content: `${member.user.username} has left the server.`,
                embeds: [embed]
            });

            console.log(`[GOODBYE] ✅ Goodbye message sent for ${member.user.tag} in ${member.guild.name}`);
        } catch (error) {
            console.error(`[GOODBYE] ❌ Error sending goodbye message:`, error.message);
        }
    },
};

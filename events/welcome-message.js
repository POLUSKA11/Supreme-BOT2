const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const storage = require('../commands/utility/storage.js');
const inviteManager = require('../inviteManager.js');

// Nexus Bot Logo (Cyan/Blue gradient circle)
const NEXUS_LOGO_URL = 'https://cdn.discordapp.com/avatars/1234567890/abcdef.png'; // Replace with actual bot avatar URL

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // Safety check: Ensure member and guild are valid
        if (!member || !member.guild) {
            console.warn('[WELCOME] Invalid member or guild data received');
            return;
        }
        const guildId = member.guild.id;

        // --- 1. AUTO-ROLE LOGIC ---
        // This uses the 'autoRoleId' key from your /auto-role command
        const autoRoleId = storage.get(guildId, 'autoRoleId');
        if (autoRoleId) {
            try {
                const role = member.guild.roles.cache.get(autoRoleId);
                if (role) {
                    await member.roles.add(role);
                    console.log(`[ROLES] Assigned auto-role ${role.name} to ${member.user.tag}`);
                }
            } catch (err) {
                console.error('[ROLES] Failed to assign auto-role:', err);
            }
        }

        // --- 2. INVITE TRACKING LOGIC ---
        let inviterMention = "Unknown";
        try {
            const newInvites = await member.guild.invites.fetch();
            const cachedInvites = member.client.invites.get(guildId);
            
            // CRITICAL CHECK: Ensure cache is initialized
            if (!cachedInvites) {
                console.error(`[INVITES] ❌ Cache not initialized for guild ${guildId}! Initializing now...`);
                // Emergency initialization
                const inviteMap = new Map(newInvites.map(inv => [inv.code, inv.uses]));
                member.client.invites.set(guildId, inviteMap);
                console.warn(`[INVITES] ⚠️ Cache initialized on-the-fly. Invite tracking may be inaccurate for this join.`);
                inviterMention = "Unknown (Cache Error)";
                // Continue with welcome message but skip tracking
                throw new Error('Cache was not initialized');
            }
            
            console.log(`[INVITES] 🔍 Checking invites for ${member.user.tag}. Cached: ${cachedInvites.size}, Current: ${newInvites.size}`);
            
            // 1. Find the invite used
            let invite = newInvites.find(i => {
                const cachedUses = cachedInvites.get(i.code) || 0;
                const currentUses = i.uses || 0;
                if (currentUses > cachedUses) {
                    console.log(`[INVITES] 🎯 Found used invite: ${i.code} (${cachedUses} -> ${currentUses})`);
                    return true;
                }
                return false;
            });
            
            // 2. Check for Vanity URL if no regular invite was found
            let isVanity = false;
            if (!invite && member.guild.features.includes('VANITY_URL')) {
                const vanityData = await member.guild.fetchVanityData().catch(() => null);
                if (vanityData) {
                    const cachedVanityUses = cachedInvites.get('VANITY') || 0;
                    if (vanityData.uses > cachedVanityUses) {
                        isVanity = true;
                        inviterMention = "Vanity URL (Custom)";
                        // Update cache for vanity
                        cachedInvites.set('VANITY', vanityData.uses);
                    }
                }
            }

            // Update cache for all regular invites
            newInvites.forEach(i => cachedInvites.set(i.code, i.uses));
            member.client.invites.set(guildId, cachedInvites);

            // 3. Handle Attribution
            if (invite || isVanity) {
                const inviterId = isVanity ? "VANITY" : (invite.inviter ? invite.inviter.id : "UNKNOWN");
                console.log(`[INVITES] 👤 Inviter identified: ${inviterId} (Vanity: ${isVanity})`);
                
                if (!isVanity && inviterId !== "UNKNOWN") {
                    inviterMention = `<@${inviterId}>`;
                } else if (isVanity) {
                    inviterMention = "Vanity URL (Custom)";
                }

                let isFake = inviteManager.isFakeMember(member);
                const joinedBefore = await inviteManager.hasJoinedBefore(guildId, member.id);

                // ANTI-FARM: Self-Invite Protection
                if (inviterId === member.id) {
                    console.log(`[ANTI-FARM] ${member.user.tag} tried to invite themselves. Flagging as fake.`);
                    isFake = true;
                }
                
                console.log(`[INVITES] Member status: Fake=${isFake}, JoinedBefore=${joinedBefore}`);
                
                // ALWAYS record the join and RESET has_left
                await inviteManager.recordJoin(guildId, member.id, inviterId, isFake);
                console.log(`[INVITES] ✅ Join recorded in database`);

                if (!joinedBefore) {
                    // Credit the inviter and sync stats to ensure accuracy
                    await inviteManager.syncUserInvites(guildId, inviterId);
                    console.log(`[INVITES] ✅ New member ${member.user.tag} joined via ${isVanity ? 'Vanity' : inviterId}. Stats synced.`);
                } else {
                    // Still sync stats for the inviter who originally invited them, 
                    // just in case their 'left' count needs healing.
                    await inviteManager.syncUserInvites(guildId, inviterId);
                    console.log(`[INVITES] 🔄 Returning member ${member.user.tag} joined. Stats synced (Antifarm).`);
                }
            } else {
                console.warn(`[INVITES] ⚠️ No invite found for ${member.user.tag}. Possible reasons: Bot invite, OAuth2, or cache desync.`);
                inviterMention = "Unknown (No Invite Found)";
            }
        } catch (e) { 
            console.error('[INVITES] ❌ Error tracking join:', e);
            console.error('[INVITES] Stack trace:', e.stack);
        }

        // --- 3. WELCOME MESSAGE LOGIC ---
        const config = storage.get(guildId, 'welcome_config');
        
        // Check if welcome is enabled and has a valid channel configured
        if (!config || !config.channelId) {
            console.log(`[WELCOME] Welcome messages not configured for guild ${guildId}`);
            return;
        }

        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) {
            console.warn(`[WELCOME] Channel ${config.channelId} not found for guild ${guildId}`);
            return;
        }

        try {
            // Build the welcome embed with Nexus branding
            const embed = new EmbedBuilder()
                .setTitle(config.title || `Welcome ${member.user.username}!`)
                .setDescription(`${config.description || 'Welcome to the server!'}\n\n**Invited by:** ${inviterMention}`)
                .setColor('#00B4D8') // Cyan/Blue color for Nexus
                .setFooter({ 
                    text: `Thank you for choosing ${member.guild.name}!`, 
                    iconURL: member.client.user.displayAvatarURL() // Use bot's avatar as Nexus logo
                })
                .setTimestamp();

            // Add banner/GIF if provided and valid
            if (config.bannerUrl && config.bannerUrl.trim()) {
                embed.setImage(config.bannerUrl);
            }

            // Add thumbnail with bot avatar (Nexus logo)
            embed.setThumbnail(member.client.user.displayAvatarURL());

            // Send the welcome message
            await channel.send({ 
                content: `${member} Welcome To ${member.guild.name}!`,
                embeds: [embed]
            });

            console.log(`[WELCOME] ✅ Welcome message sent for ${member.user.tag} in ${member.guild.name}`);
        } catch (error) {
            console.error(`[WELCOME] ❌ Error sending welcome message for ${member.user.tag}:`, error.message);
        }
    },
};
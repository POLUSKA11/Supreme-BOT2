const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display all available commands and bot information'),
    async execute(interaction) {
        const { client } = interaction;
        
        const helpEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: 'Nexus Support', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTitle('Bot Command Directory')
            .setDescription('Welcome to the **Nexus** command menu. Below you will find all available commands categorized by their functionality.')
            .setColor('#FF0000')
            .addFields(
                { 
                    name: '🛡️ Information & Support', 
                    value: '• `/help` - Show this menu\n• `/about` - Information about Nexus\n• `/info ping` - Check bot latency\n• `/info server` - Get server information\n• `/info user` - Get user information\n• `/info avatar` - Get a user\'s avatar',
                    inline: false 
                },
                { 
                    name: '📈 Invite Tracking', 
                    value: '• `/invites` - Check your or another user\'s invites\n• `/invite-leaderboard` - View the top inviters',
                    inline: false 
                },
                { 
                    name: '🎫 Tickets & Applications', 
                    value: '• `/mm-apply` - Apply for Middleman Trainee\n• `/send-middleman-info` - Get information about our MM service',
                    inline: false 
                },
                { 
                    name: '🎉 Giveaways', 
                    value: '• `/giveaway-list` - List all active giveaways',
                    inline: false 
                },
                {
                    name: '⭐ Leveling System',
                    value: '• `/rank` - Check your level and XP progress\n• `/leaderboard` - View the top XP earners\n• `/levels` - View level rewards and XP requirements\n• `/level-config` - *(Admin)* Configure the leveling system',
                    inline: false
                },
                {
                    name: '🎵 Music',
                    value: '• `/play` - Play from YouTube, Spotify, SoundCloud, Apple Music\n• `/search` - Interactive track search\n• `/nowplaying` - Current track info & progress\n• `/queue` - View queue with pagination\n• `/skip` `/pause` `/resume` `/stop` - Playback controls\n• `/loop` `/shuffle` `/volume` - Queue controls\n• `/lyrics` - Get song lyrics\n• `/filter` - Audio effects (bass boost, nightcore, 8D...)\n• `/musichelp` - Full music command reference',
                    inline: false
                }
            )
            .setFooter({ text: 'Nexus | Professional Discord Solutions', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed] });
    }
};

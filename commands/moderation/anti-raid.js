const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../utility/storage.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anti-raid')
        .setDescription('Configure the anti-raid and security system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View the current anti-raid configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable a security module')
                .addStringOption(option =>
                    option.setName('module')
                        .setDescription('The module to toggle')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Anti-Link', value: 'anti_link' },
                            { name: 'Anti-Spam', value: 'anti_spam' },
                            { name: 'Anti-Promotion', value: 'anti_promo' },
                            { name: 'Anti-BadWords', value: 'anti_badwords' },
                            { name: 'Lockdown', value: 'lockdown' }
                        )
                )
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Whether the module should be enabled')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Configure specific module settings')
                .addStringOption(option =>
                    option.setName('setting')
                        .setDescription('The setting to change')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Log Channel', value: 'log_channel' },
                            { name: 'Banned Words (comma separated)', value: 'banned_words' },
                            { name: 'Spam Threshold (messages/5s)', value: 'spam_threshold' }
                        )
                )
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('The value for the setting')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const { guild, options } = interaction;
        const subcommand = options.getSubcommand();

        // Default config
        const defaultConfig = {
            anti_link: false,
            anti_spam: false,
            anti_promo: false,
            anti_badwords: false,
            lockdown: false,
            log_channel: null,
            banned_words: [],
            spam_threshold: 5
        };

        // Always fetch fresh data from storage to ensure sync with dashboard
        let config = storage.get(guild.id, 'anti_raid_config');
        
        // If no config exists, use defaults but don't save yet to avoid clutter
        if (!config) {
            config = { ...defaultConfig };
        }

        if (subcommand === 'status') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Anti-Raid Configuration')
                .setColor('#FF0000')
                .addFields(
                    { name: '🔗 Anti-Link', value: config.anti_link ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '⚡ Anti-Spam', value: config.anti_spam ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '📢 Anti-Promotion', value: config.anti_promo ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '🤬 Anti-BadWords', value: config.anti_badwords ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '🔒 Lockdown Mode', value: config.lockdown ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '📜 Log Channel', value: config.log_channel ? `<#${config.log_channel}>` : 'None Set', inline: true },
                    { name: '📝 Banned Words', value: (config.banned_words && config.banned_words.length > 0) ? config.banned_words.join(', ') : 'None', inline: false }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            const moduleName = options.getString('module');
            const enabled = options.getBoolean('enabled');

            config[moduleName] = enabled;
            storage.set(guild.id, 'anti_raid_config', config);

            return interaction.reply({ 
                content: `✅ **${moduleName.replace('_', ' ').toUpperCase()}** has been ${enabled ? 'enabled' : 'disabled'}.`,
                ephemeral: true 
            });
        }

        if (subcommand === 'settings') {
            const setting = options.getString('setting');
            const value = options.getString('value');

            if (setting === 'log_channel') {
                const channelId = value.replace(/[<#>]/g, '');
                const channel = guild.channels.cache.get(channelId);
                if (!channel) return interaction.reply({ content: '❌ Invalid channel ID.', ephemeral: true });
                config.log_channel = channelId;
            } else if (setting === 'banned_words') {
                config.banned_words = value.split(',').map(w => w.trim().toLowerCase());
            } else if (setting === 'spam_threshold') {
                const threshold = parseInt(value);
                if (isNaN(threshold)) return interaction.reply({ content: '❌ Threshold must be a number.', ephemeral: true });
                config.spam_threshold = threshold;
            }

            storage.set(guild.id, 'anti_raid_config', config);

            return interaction.reply({ 
                content: `✅ **${setting.replace('_', ' ').toUpperCase()}** has been updated.`,
                ephemeral: true 
            });
        }
    }
};

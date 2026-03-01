/**
 * Personal AI Command
 * Premium AI assistant for Discord ID 982731220913913856
 * Supports: unlimited files, images, conversation memory, multi-AI
 */

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
} = require('discord.js');

const personalAiDb = require('../../utils/personalAiDb');
const aiService = require('../../services/aiService');

const SPECIAL_USER_ID = '982731220913913856';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('🤖 Personal AI Assistant - Premium features for special needs')
        .addSubcommand(sub =>
            sub
                .setName('chat')
                .setDescription('Start or continue a conversation with your personal AI')
                .addStringOption(opt =>
                    opt
                        .setName('message')
                        .setDescription('Your message to the AI')
                        .setRequired(true)
                        .setMaxLength(2000)
                )
                .addStringOption(opt =>
                    opt
                        .setName('ai')
                        .setDescription('Choose AI model')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Groq (Fast)', value: 'groq' },
                            { name: 'OpenAI (GPT-4)', value: 'openai' },
                            { name: 'Claude (Anthropic)', value: 'claude' },
                            { name: 'Gemini (Google)', value: 'gemini' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('upload')
                .setDescription('Upload a file or image for AI analysis')
                .addAttachmentOption(opt =>
                    opt
                        .setName('file')
                        .setDescription('File or image to upload')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('description')
                        .setDescription('What would you like me to analyze?')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('history')
                .setDescription('View your conversation history')
                .addIntegerOption(opt =>
                    opt
                        .setName('limit')
                        .setDescription('Number of messages to show (1-50)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(50)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('settings')
                .setDescription('Configure your AI preferences')
                .addStringOption(opt =>
                    opt
                        .setName('setting')
                        .setDescription('Setting to configure')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Default AI Model', value: 'default_ai' },
                            { name: 'View Preferences', value: 'view_prefs' },
                            { name: 'Clear History', value: 'clear_history' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('stats')
                .setDescription('View your AI usage statistics')
        ),

    async execute(interaction) {
        // Check if user is the special user
        if (interaction.user.id !== SPECIAL_USER_ID) {
            return await interaction.reply({
                content: '❌ This premium feature is only available for special users.',
                ephemeral: true,
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'chat':
                    await handleChat(interaction);
                    break;
                case 'upload':
                    await handleUpload(interaction);
                    break;
                case 'history':
                    await handleHistory(interaction);
                    break;
                case 'settings':
                    await handleSettings(interaction);
                    break;
                case 'stats':
                    await handleStats(interaction);
                    break;
            }
        } catch (error) {
            console.error('❌ [AI COMMAND] Error:', error);
            await interaction.reply({
                content: '❌ An error occurred. Please try again later.',
                ephemeral: true,
            });
        }
    },
};

// ─── Chat Handler ─────────────────────────────────────────────────────────────

async function handleChat(interaction) {
    await interaction.deferReply();

    const userMessage = interaction.options.getString('message');
    const aiModel = interaction.options.getString('ai') || 'groq';

    try {
        // Ensure user exists in DB
        await personalAiDb.ensureUserExists(
            interaction.user.id,
            interaction.user.username,
            interaction.user.displayAvatarURL()
        );

        const user = await personalAiDb.getUserByDiscordId(interaction.user.id);

        // Get or create conversation
        let conversations = await personalAiDb.getRecentConversations(user.id, 1);
        let conversation = conversations[0];

        if (!conversation) {
            const result = await personalAiDb.createConversation(user.id, aiModel);
            conversation = await personalAiDb.getConversation(result.id);
        }

        // Save user message
        await personalAiDb.saveMessage(conversation.id, user.id, 'user', userMessage);

        // Get conversation history
        const history = await personalAiDb.getConversationHistory(conversation.id, 20);

        // Prepare messages for AI
        const messages = history.map(msg => ({
            role: msg.role,
            content: msg.content,
        }));

        // Get AI response
        const aiResponse = await aiService.processMessage(aiModel, messages);

        // Save AI response
        await personalAiDb.saveMessage(
            conversation.id,
            user.id,
            'assistant',
            aiResponse.content,
            aiResponse.tokensUsed
        );

        // Record usage
        await personalAiDb.recordUsage(user.id, aiModel, 1, 0, aiResponse.tokensUsed);

        // Create response embed
        const embed = new EmbedBuilder()
            .setAuthor({
                name: '🤖 Lyra - Personal AI',
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setDescription(aiResponse.content.substring(0, 4096))
            .setFooter({
                text: `Model: ${aiModel} | Tokens: ${aiResponse.tokensUsed}`,
            })
            .setColor('#7C3AED') // Purple
            .setTimestamp();

        // Create action row with buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ai_copy_${conversation.id}`)
                .setLabel('📋 Copy Response')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ai_history_${conversation.id}`)
                .setLabel('📜 View History')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ai_new_chat`)
                .setLabel('➕ New Chat')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
            embeds: [embed],
            components: [row],
        });
    } catch (error) {
        console.error('❌ [AI CHAT] Error:', error);
        await interaction.editReply({
            content: `❌ Error: ${error.message}`,
        });
    }
}

// ─── Upload Handler ───────────────────────────────────────────────────────────

async function handleUpload(interaction) {
    await interaction.deferReply();

    const file = interaction.options.getAttachment('file');
    const description = interaction.options.getString('description') || 'Please analyze this file.';

    try {
        // Ensure user exists
        await personalAiDb.ensureUserExists(
            interaction.user.id,
            interaction.user.username,
            interaction.user.displayAvatarURL()
        );

        const user = await personalAiDb.getUserByDiscordId(interaction.user.id);

        // Get or create conversation
        let conversations = await personalAiDb.getRecentConversations(user.id, 1);
        let conversation = conversations[0];

        if (!conversation) {
            const result = await personalAiDb.createConversation(user.id);
            conversation = await personalAiDb.getConversation(result.id);
        }

        // Determine file type
        const fileType = file.contentType?.startsWith('image/') ? 'image' : 'document';

        // Save upload to DB
        const uploadId = await personalAiDb.saveUpload(
            user.id,
            conversation.id,
            file.name,
            fileType,
            file.contentType,
            file.size,
            file.url,
            file.url,
            { uploadedAt: new Date().toISOString() }
        );

        // Process with AI if it's an image
        let aiResponse = null;
        if (fileType === 'image') {
            aiResponse = await aiService.processImage(file.url, description, 'gemini');
        } else {
            aiResponse = {
                content: `📄 File received: ${file.name}\n\nFile Type: ${file.contentType}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nUser Request: ${description}`,
                model: 'system',
            };
        }

        // Save AI analysis
        await personalAiDb.saveMessage(
            conversation.id,
            user.id,
            'user',
            `[FILE UPLOAD] ${file.name}: ${description}`
        );

        await personalAiDb.saveMessage(
            conversation.id,
            user.id,
            'assistant',
            aiResponse.content
        );

        // Update upload status
        await personalAiDb.updateUploadStatus(uploadId, 'completed', {
            analyzed: true,
            analysisModel: aiResponse.model,
        });

        // Record usage
        await personalAiDb.recordUsage(user.id, aiResponse.model, 1, 1, 0);

        // Create response embed
        const embed = new EmbedBuilder()
            .setAuthor({
                name: '🤖 Lyra - File Analysis',
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setTitle(`📄 ${file.name}`)
            .setDescription(aiResponse.content.substring(0, 4096))
            .setThumbnail(fileType === 'image' ? file.url : null)
            .setFooter({
                text: `File Size: ${(file.size / 1024).toFixed(2)} KB | Model: ${aiResponse.model}`,
            })
            .setColor('#7C3AED')
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed],
        });
    } catch (error) {
        console.error('❌ [AI UPLOAD] Error:', error);
        await interaction.editReply({
            content: `❌ Error: ${error.message}`,
        });
    }
}

// ─── History Handler ──────────────────────────────────────────────────────────

async function handleHistory(interaction) {
    await interaction.deferReply();

    const limit = interaction.options.getInteger('limit') || 20;

    try {
        const user = await personalAiDb.getUserByDiscordId(interaction.user.id);
        if (!user) {
            return await interaction.editReply('❌ No conversation history found.');
        }

        const conversations = await personalAiDb.getRecentConversations(user.id, 10);

        if (conversations.length === 0) {
            return await interaction.editReply('❌ No conversations found.');
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: '🤖 Lyra - Conversation History',
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setDescription('Your recent conversations')
            .setColor('#7C3AED')
            .setTimestamp();

        conversations.slice(0, 5).forEach((conv, idx) => {
            embed.addFields({
                name: `${idx + 1}. ${conv.title}`,
                value: `Messages: ${conv.message_count} | Model: ${conv.ai_model} | Created: <t:${Math.floor(new Date(conv.created_at).getTime() / 1000)}:R>`,
                inline: false,
            });
        });

        await interaction.editReply({
            embeds: [embed],
        });
    } catch (error) {
        console.error('❌ [AI HISTORY] Error:', error);
        await interaction.editReply({
            content: `❌ Error: ${error.message}`,
        });
    }
}

// ─── Settings Handler ─────────────────────────────────────────────────────────

async function handleSettings(interaction) {
    const setting = interaction.options.getString('setting');

    try {
        const user = await personalAiDb.getUserByDiscordId(interaction.user.id);

        if (setting === 'view_prefs') {
            const context = await personalAiDb.getUserContext(user.id);
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: '🤖 Lyra - Your Preferences',
                    iconURL: interaction.client.user.displayAvatarURL(),
                })
                .addFields({
                    name: 'Default AI Model',
                    value: user.preferred_ai || 'groq',
                    inline: true,
                })
                .setColor('#7C3AED')
                .setTimestamp();

            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        } else if (setting === 'default_ai') {
            const modal = new ModalBuilder()
                .setCustomId('ai_settings_modal')
                .setTitle('AI Preferences');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('preferred_ai')
                        .setLabel('Preferred AI Model')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('groq, openai, claude, gemini')
                        .setValue(user.preferred_ai || 'groq')
                )
            );

            return await interaction.showModal(modal);
        } else if (setting === 'clear_history') {
            // Implement clear history logic
            return await interaction.reply({
                content: '✅ History clearing feature coming soon!',
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error('❌ [AI SETTINGS] Error:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true,
        });
    }
}

// ─── Stats Handler ────────────────────────────────────────────────────────────

async function handleStats(interaction) {
    await interaction.deferReply();

    try {
        const user = await personalAiDb.getUserByDiscordId(interaction.user.id);
        if (!user) {
            return await interaction.editReply('❌ No usage data found.');
        }

        const stats = await personalAiDb.getUsageStats(user.id, 30);

        if (stats.length === 0) {
            return await interaction.editReply('❌ No usage statistics available.');
        }

        const totalMessages = stats.reduce((sum, s) => sum + s.messages_sent, 0);
        const totalFiles = stats.reduce((sum, s) => sum + s.files_uploaded, 0);
        const totalTokens = stats.reduce((sum, s) => sum + s.total_tokens_used, 0);
        const totalCost = stats.reduce((sum, s) => sum + parseFloat(s.total_cost), 0);

        const embed = new EmbedBuilder()
            .setAuthor({
                name: '🤖 Lyra - Usage Statistics (30 days)',
                iconURL: interaction.client.user.displayAvatarURL(),
            })
            .addFields(
                { name: '💬 Total Messages', value: `${totalMessages}`, inline: true },
                { name: '📁 Files Uploaded', value: `${totalFiles}`, inline: true },
                { name: '🔤 Tokens Used', value: `${totalTokens.toLocaleString()}`, inline: true },
                { name: '💰 Estimated Cost', value: `$${totalCost.toFixed(4)}`, inline: true }
            )
            .setColor('#7C3AED')
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed],
        });
    } catch (error) {
        console.error('❌ [AI STATS] Error:', error);
        await interaction.editReply({
            content: `❌ Error: ${error.message}`,
        });
    }
}

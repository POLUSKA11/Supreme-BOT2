/**
 * AI Interaction Handler
 * Handles button clicks and modal submissions for the personal AI system
 */

const { Events, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const personalAiDb = require('../utils/personalAiDb');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        const SPECIAL_USER_ID = '982731220913913856';

        // Check if user is special user
        if (interaction.user.id !== SPECIAL_USER_ID) return;

        try {
            // ─── Button Interactions ──────────────────────────────────────────

            if (interaction.isButton()) {
                const customId = interaction.customId;

                // Copy response button
                if (customId.startsWith('ai_copy_')) {
                    const conversationId = customId.replace('ai_copy_', '');
                    const conversation = await personalAiDb.getConversation(parseInt(conversationId));

                    if (!conversation) {
                        return await interaction.reply({
                            content: '❌ Conversation not found.',
                            ephemeral: true,
                        });
                    }

                    const messages = await personalAiDb.getConversationHistory(conversation.id, 1);
                    const lastMessage = messages[messages.length - 1];

                    if (!lastMessage || lastMessage.role !== 'assistant') {
                        return await interaction.reply({
                            content: '❌ No AI response to copy.',
                            ephemeral: true,
                        });
                    }

                    // Copy to clipboard (Discord limitation - we'll show it in a code block)
                    const embed = new EmbedBuilder()
                        .setTitle('📋 Response Copied')
                        .setDescription(`\`\`\`\n${lastMessage.content.substring(0, 2000)}\n\`\`\``)
                        .setColor('#7C3AED')
                        .setTimestamp();

                    return await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                }

                // View history button
                if (customId.startsWith('ai_history_')) {
                    const conversationId = customId.replace('ai_history_', '');
                    const conversation = await personalAiDb.getConversation(parseInt(conversationId));

                    if (!conversation) {
                        return await interaction.reply({
                            content: '❌ Conversation not found.',
                            ephemeral: true,
                        });
                    }

                    const messages = await personalAiDb.getConversationHistory(conversation.id, 10);

                    if (messages.length === 0) {
                        return await interaction.reply({
                            content: '❌ No messages in this conversation.',
                            ephemeral: true,
                        });
                    }

                    let historyText = '';
                    messages.forEach((msg, idx) => {
                        const role = msg.role === 'assistant' ? '🤖 Lyra' : '👤 You';
                        historyText += `\n**${role}:** ${msg.content.substring(0, 200)}...\n`;
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('📜 Conversation History')
                        .setDescription(historyText.substring(0, 4096))
                        .setFooter({
                            text: `Total messages: ${conversation.message_count}`,
                        })
                        .setColor('#7C3AED')
                        .setTimestamp();

                    return await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                }

                // New chat button
                if (customId === 'ai_new_chat') {
                    return await interaction.reply({
                        content: '✅ Use `/ai chat` to start a new conversation!',
                        ephemeral: true,
                    });
                }
            }

            // ─── Modal Submissions ────────────────────────────────────────────

            if (interaction.isModalSubmit()) {
                const customId = interaction.customId;

                // Settings modal
                if (customId === 'ai_settings_modal') {
                    const preferredAi = interaction.fields.getTextInputValue('preferred_ai');

                    const validModels = ['groq', 'openai', 'claude', 'gemini'];
                    if (!validModels.includes(preferredAi.toLowerCase())) {
                        return await interaction.reply({
                            content: `❌ Invalid AI model. Choose from: ${validModels.join(', ')}`,
                            ephemeral: true,
                        });
                    }

                    const user = await personalAiDb.getUserByDiscordId(interaction.user.id);
                    await personalAiDb.setPreferredAI(interaction.user.id, preferredAi.toLowerCase());

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Preferences Updated')
                        .setDescription(`Default AI model set to: **${preferredAi.toLowerCase()}**`)
                        .setColor('#7C3AED')
                        .setTimestamp();

                    return await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                }
            }
        } catch (error) {
            console.error('❌ [AI INTERACTION] Error:', error);
            await interaction.reply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true,
            });
        }
    },
};

/**
 * Multi-AI Integration Service
 * Supports: OpenAI, Claude (Anthropic), Groq, Google Gemini
 */

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Groq } = require('groq-sdk');
require('dotenv').config();

class AIService {
    constructor() {
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        this.gemini = process.env.GOOGLE_API_KEY ? 
            new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

        this.openaiKey = process.env.OPENAI_API_KEY;
        this.claudeKey = process.env.CLAUDE_API_KEY;
    }

    /**
     * System prompt for the personal AI
     * Tailored for special needs support
     */
    getSystemPrompt() {
        return `You are Lyra, a premium personal AI assistant designed specifically for Discord user 982731220913913856.

Your purpose is to provide:
- Personalized support tailored to their special needs
- Detailed analysis of uploaded files and images
- Comprehensive conversation memory and context awareness
- Professional, empathetic, and helpful responses
- Unlimited file and image processing capabilities

Guidelines:
- Always maintain context from previous conversations
- Be thorough and detailed in your responses
- Support multiple file formats (images, documents, etc.)
- Remember user preferences and special requirements
- Provide clear, structured information
- Be proactive in offering help and suggestions
- Maintain absolute confidentiality and privacy

You have access to:
- Full conversation history
- Uploaded files and images
- User preferences and settings
- Previous context and memories

Always respond with care, precision, and dedication to this user's needs.`;
    }

    /**
     * Process message with selected AI
     */
    async processMessage(aiModel, messages, options = {}) {
        const model = aiModel?.toLowerCase() || 'groq';

        try {
            switch (model) {
                case 'groq':
                    return await this.processWithGroq(messages, options);
                case 'openai':
                    return await this.processWithOpenAI(messages, options);
                case 'claude':
                    return await this.processWithClaude(messages, options);
                case 'gemini':
                    return await this.processWithGemini(messages, options);
                default:
                    return await this.processWithGroq(messages, options);
            }
        } catch (error) {
            console.error(`❌ [AI SERVICE] Error processing with ${model}:`, error);
            throw error;
        }
    }

    /**
     * Groq API Integration
     */
    async processWithGroq(messages, options = {}) {
        try {
            const systemMessage = {
                role: 'system',
                content: this.getSystemPrompt(),
            };

            const response = await this.groq.chat.completions.create({
                model: options.model || 'mixtral-8x7b-32768',
                messages: [systemMessage, ...messages],
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2048,
                top_p: options.topP || 1,
            });

            return {
                content: response.choices[0].message.content,
                tokensUsed: response.usage.total_tokens,
                model: 'groq',
                finishReason: response.choices[0].finish_reason,
            };
        } catch (error) {
            console.error('❌ [GROQ] Error:', error);
            throw error;
        }
    }

    /**
     * OpenAI API Integration
     */
    async processWithOpenAI(messages, options = {}) {
        try {
            if (!this.openaiKey) {
                throw new Error('OpenAI API key not configured');
            }

            const systemMessage = {
                role: 'system',
                content: this.getSystemPrompt(),
            };

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: options.model || 'gpt-4-turbo',
                    messages: [systemMessage, ...messages],
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 2048,
                    top_p: options.topP || 1,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                content: response.data.choices[0].message.content,
                tokensUsed: response.data.usage.total_tokens,
                model: 'openai',
                finishReason: response.data.choices[0].finish_reason,
            };
        } catch (error) {
            console.error('❌ [OPENAI] Error:', error);
            throw error;
        }
    }

    /**
     * Claude API Integration (Anthropic)
     */
    async processWithClaude(messages, options = {}) {
        try {
            if (!this.claudeKey) {
                throw new Error('Claude API key not configured');
            }

            const systemMessage = this.getSystemPrompt();

            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: options.model || 'claude-3-opus-20240229',
                    max_tokens: options.maxTokens || 2048,
                    system: systemMessage,
                    messages: messages,
                    temperature: options.temperature || 0.7,
                },
                {
                    headers: {
                        'x-api-key': this.claudeKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                content: response.data.content[0].text,
                tokensUsed: response.data.usage.input_tokens + response.data.usage.output_tokens,
                model: 'claude',
                finishReason: response.data.stop_reason,
            };
        } catch (error) {
            console.error('❌ [CLAUDE] Error:', error);
            throw error;
        }
    }

    /**
     * Google Gemini API Integration
     */
    async processWithGemini(messages, options = {}) {
        try {
            if (!this.gemini) {
                throw new Error('Google API key not configured');
            }

            const model = this.gemini.getGenerativeModel({
                model: options.model || 'gemini-pro',
                systemInstruction: this.getSystemPrompt(),
            });

            const chat = model.startChat({
                history: messages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                })),
            });

            const result = await chat.sendMessage(
                messages[messages.length - 1]?.content || 'Continue'
            );

            const response = await result.response;

            return {
                content: response.text(),
                tokensUsed: 0, // Gemini doesn't provide token count in free tier
                model: 'gemini',
                finishReason: 'stop',
            };
        } catch (error) {
            console.error('❌ [GEMINI] Error:', error);
            throw error;
        }
    }

    /**
     * Process image with vision capabilities
     */
    async processImage(imageUrl, prompt, aiModel = 'groq') {
        try {
            const model = aiModel?.toLowerCase() || 'groq';

            if (model === 'gemini') {
                return await this.processImageWithGemini(imageUrl, prompt);
            } else if (model === 'openai') {
                return await this.processImageWithOpenAI(imageUrl, prompt);
            } else if (model === 'claude') {
                return await this.processImageWithClaude(imageUrl, prompt);
            }

            throw new Error(`Image processing not supported for ${model}`);
        } catch (error) {
            console.error('❌ [AI SERVICE] Error processing image:', error);
            throw error;
        }
    }

    /**
     * Process image with Gemini Vision
     */
    async processImageWithGemini(imageUrl, prompt) {
        try {
            if (!this.gemini) {
                throw new Error('Google API key not configured');
            }

            const model = this.gemini.getGenerativeModel({
                model: 'gemini-pro-vision',
                systemInstruction: this.getSystemPrompt(),
            });

            const result = await model.generateContent([
                {
                    inlineData: {
                        data: imageUrl,
                        mimeType: 'image/jpeg',
                    },
                },
                prompt,
            ]);

            const response = await result.response;

            return {
                content: response.text(),
                model: 'gemini',
            };
        } catch (error) {
            console.error('❌ [GEMINI VISION] Error:', error);
            throw error;
        }
    }

    /**
     * Process image with OpenAI Vision
     */
    async processImageWithOpenAI(imageUrl, prompt) {
        try {
            if (!this.openaiKey) {
                throw new Error('OpenAI API key not configured');
            }

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4-vision-preview',
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt(),
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: { url: imageUrl },
                                },
                                {
                                    type: 'text',
                                    text: prompt,
                                },
                            ],
                        },
                    ],
                    max_tokens: 2048,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                content: response.data.choices[0].message.content,
                model: 'openai',
            };
        } catch (error) {
            console.error('❌ [OPENAI VISION] Error:', error);
            throw error;
        }
    }

    /**
     * Process image with Claude Vision
     */
    async processImageWithClaude(imageUrl, prompt) {
        try {
            if (!this.claudeKey) {
                throw new Error('Claude API key not configured');
            }

            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: 'claude-3-opus-20240229',
                    max_tokens: 2048,
                    system: this.getSystemPrompt(),
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image',
                                    source: {
                                        type: 'url',
                                        url: imageUrl,
                                    },
                                },
                                {
                                    type: 'text',
                                    text: prompt,
                                },
                            ],
                        },
                    ],
                },
                {
                    headers: {
                        'x-api-key': this.claudeKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                content: response.data.content[0].text,
                model: 'claude',
            };
        } catch (error) {
            console.error('❌ [CLAUDE VISION] Error:', error);
            throw error;
        }
    }
}

module.exports = new AIService();

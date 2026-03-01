/**
 * Personal AI Configuration & Branding
 * Lyra - Premium AI Assistant
 */

const aiConfig = {
    // ─── Bot Identity ─────────────────────────────────────────────────────────

    name: 'Lyra',
    description: 'Premium Personal AI Assistant',
    specialUserId: '982731220913913856',

    // ─── Branding ─────────────────────────────────────────────────────────────

    branding: {
        primaryColor: '#7C3AED', // Purple/Violet
        secondaryColor: '#A78BFA', // Light Purple
        accentColor: '#EC4899', // Pink
        darkBg: '#0F172A', // Deep Navy
        lightBg: '#F8FAFC', // Light Gray
    },

    // ─── Emoji & Icons ────────────────────────────────────────────────────────

    emojis: {
        ai: '🤖',
        chat: '💬',
        upload: '📤',
        file: '📄',
        image: '🖼️',
        history: '📜',
        settings: '⚙️',
        stats: '📊',
        success: '✅',
        error: '❌',
        loading: '⏳',
        star: '⭐',
        premium: '👑',
        rocket: '🚀',
    },

    // ─── AI Models Configuration ───────────────────────────────────────────────

    models: {
        groq: {
            name: 'Groq',
            displayName: 'Groq (Fast)',
            model: 'mixtral-8x7b-32768',
            maxTokens: 8192,
            temperature: 0.7,
            speed: 'Very Fast',
            cost: 'Free',
            icon: '⚡',
            description: 'Fast and efficient for real-time conversations',
            recommended: true,
        },
        openai: {
            name: 'OpenAI',
            displayName: 'OpenAI (GPT-4)',
            model: 'gpt-4-turbo',
            maxTokens: 4096,
            temperature: 0.7,
            speed: 'Fast',
            cost: '$0.01-0.03 per 1K tokens',
            icon: '🔮',
            description: 'Advanced reasoning and complex tasks',
            recommended: false,
        },
        claude: {
            name: 'Claude',
            displayName: 'Claude (Anthropic)',
            model: 'claude-3-opus-20240229',
            maxTokens: 4096,
            temperature: 0.7,
            speed: 'Moderate',
            cost: '$0.015-0.075 per 1K tokens',
            icon: '🧠',
            description: 'Nuanced responses with long context',
            recommended: false,
        },
        gemini: {
            name: 'Gemini',
            displayName: 'Gemini (Google)',
            model: 'gemini-pro',
            maxTokens: 2048,
            temperature: 0.7,
            speed: 'Fast',
            cost: 'Free',
            icon: '✨',
            description: 'Excellent for image analysis and vision tasks',
            recommended: false,
        },
    },

    // ─── File Upload Configuration ─────────────────────────────────────────────

    uploads: {
        maxFileSize: 104857600, // 100MB
        maxFilesPerDay: 1000, // Unlimited for special user
        supportedFormats: {
            image: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp'],
            document: ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
            video: ['mp4', 'webm', 'avi', 'mov', 'mkv'],
            audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
        },
        storageProvider: 'tidb', // Can be extended to S3, etc.
    },

    // ─── Conversation Configuration ────────────────────────────────────────────

    conversation: {
        maxHistoryLength: 50, // Messages to load per conversation
        autoTitleLength: 50, // Characters for auto-generated title
        sessionTimeout: 86400000, // 24 hours
        maxConcurrentConversations: 100,
    },

    // ─── Premium Features ──────────────────────────────────────────────────────

    premiumFeatures: [
        'unlimited_uploads',
        'priority_processing',
        'advanced_analytics',
        'multi_ai_support',
        'conversation_memory',
        'file_analysis',
        'image_vision',
        'batch_processing',
        'custom_system_prompt',
        'api_access',
    ],

    // ─── Rate Limiting ────────────────────────────────────────────────────────

    rateLimits: {
        messagesPerMinute: 10,
        filesPerDay: 1000,
        tokensPerDay: 1000000,
        requestsPerSecond: 5,
    },

    // ─── System Prompt Customization ──────────────────────────────────────────

    systemPrompt: {
        base: `You are Lyra, a premium personal AI assistant designed specifically for Discord user 982731220913913856.

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

Always respond with care, precision, and dedication to this user's needs.`,

        imageAnalysis: `You are Lyra, analyzing an image for the special user. Provide:
1. Detailed description of what you see
2. Key elements and their relationships
3. Relevant insights or analysis
4. Suggestions or recommendations if applicable
5. Any text visible in the image (OCR)`,

        documentAnalysis: `You are Lyra, analyzing a document for the special user. Provide:
1. Summary of the document
2. Key points and takeaways
3. Important sections highlighted
4. Actionable insights
5. Recommendations based on content`,
    },

    // ─── Database Configuration ────────────────────────────────────────────────

    database: {
        connectionPool: 10,
        queryTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
    },

    // ─── Logging Configuration ────────────────────────────────────────────────

    logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        logToFile: true,
        logDirectory: './logs/ai',
        maxLogSize: 10485760, // 10MB
        maxLogFiles: 10,
    },

    // ─── Feature Flags ────────────────────────────────────────────────────────

    features: {
        enableImageAnalysis: true,
        enableDocumentAnalysis: true,
        enableVoiceTranscription: false, // Coming soon
        enableBatchProcessing: false, // Coming soon
        enableApiAccess: false, // Coming soon
        enableScheduledConversations: false, // Coming soon
    },

    // ─── Error Messages ───────────────────────────────────────────────────────

    messages: {
        unauthorized: '❌ This premium feature is only available for special users.',
        notFound: '❌ Resource not found.',
        error: '❌ An error occurred. Please try again later.',
        success: '✅ Operation completed successfully.',
        processing: '⏳ Processing your request...',
        uploadSuccess: '✅ File uploaded successfully.',
        uploadError: '❌ File upload failed.',
        conversationNotFound: '❌ Conversation not found.',
        noHistory: '❌ No conversation history found.',
        rateLimitExceeded: '❌ Rate limit exceeded. Please wait before trying again.',
    },

    // ─── Analytics Configuration ──────────────────────────────────────────────

    analytics: {
        trackUsage: true,
        trackCosts: true,
        trackPerformance: true,
        retentionDays: 90,
    },

    // ─── Webhook Configuration (Future) ────────────────────────────────────────

    webhooks: {
        onMessageReceived: null,
        onFileUploaded: null,
        onAnalysisComplete: null,
        onErrorOccurred: null,
    },
};

module.exports = aiConfig;

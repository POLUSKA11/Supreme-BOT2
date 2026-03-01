# 🤖 Lyra - Personal AI Assistant

## Overview

**Lyra** is a premium personal AI assistant built into your Discord bot, designed specifically for user `982731220913913856`. It provides unlimited file/image uploads, full conversation memory, and multi-AI support (Groq, OpenAI, Claude, Gemini) with TiDB persistence.

## Quick Start

### 1. Install & Setup

```bash
# Install dependencies
npm install

# Run database migration
mysql -h <host> -u <user> -p<password> <db> < migrations/001_personal_ai_schema.sql

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys
```

### 2. Required Environment Variables

```env
# Discord
TOKEN=your_bot_token

# TiDB
TIDB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=your_user
TIDB_PASSWORD=your_password
TIDB_DB=your_database

# AI APIs (at least one required)
GROQ_API_KEY=your_groq_key          # Recommended - Free
OPENAI_API_KEY=your_openai_key      # Optional
CLAUDE_API_KEY=your_claude_key      # Optional
GOOGLE_API_KEY=your_google_key      # Optional
```

### 3. Start the Bot

```bash
npm start
```

## Features

### 💬 Chat
Start conversations with intelligent AI responses:
```
/ai chat message: "Hello Lyra" ai: "groq"
```

**Capabilities:**
- Multi-AI model selection
- Full conversation memory
- Token usage tracking
- Automatic conversation creation
- Context awareness across sessions

### 📤 File Upload
Upload and analyze any file or image:
```
/ai upload file: [attachment] description: "Analyze this"
```

**Supported:**
- **Images**: JPEG, PNG, WebP, GIF (Vision analysis)
- **Documents**: PDF, TXT, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Videos**: MP4, WebM, AVI, MOV, MKV
- **Audio**: MP3, WAV, OGG, M4A, FLAC
- **Any file**: Stored for reference and analysis

**Features:**
- Unlimited uploads (no size limits)
- Automatic vision analysis for images
- Document content extraction
- File metadata tracking
- Batch processing ready

### 📜 History
View your conversation history:
```
/ai history limit: 20
```

**Shows:**
- Recent conversations
- Message counts
- AI models used
- Creation timestamps
- Quick access buttons

### ⚙️ Settings
Configure your preferences:
```
/ai settings setting: "default_ai"
```

**Options:**
- Set default AI model
- View current preferences
- Clear conversation history
- Manage permissions

### 📊 Statistics
Track your usage:
```
/ai stats
```

**Metrics:**
- Total messages sent
- Files uploaded
- Tokens used
- Estimated costs
- 30-day history

## AI Models

### Groq ⚡ (Recommended)
- **Speed**: Very Fast
- **Cost**: Free
- **Best for**: Real-time chat, quick responses
- **Model**: Mixtral 8x7B
- **Tokens**: 100K free monthly

### OpenAI 🔮
- **Speed**: Fast
- **Cost**: ~$0.01-0.03 per 1K tokens
- **Best for**: Complex reasoning, advanced tasks
- **Model**: GPT-4 Turbo
- **Vision**: ✅ Supported

### Claude 🧠
- **Speed**: Moderate
- **Cost**: ~$0.015-0.075 per 1K tokens
- **Best for**: Long context, nuanced responses
- **Model**: Claude 3 Opus
- **Vision**: ✅ Supported

### Gemini ✨
- **Speed**: Fast
- **Cost**: Free tier available
- **Best for**: Image analysis, vision tasks
- **Model**: Gemini Pro Vision
- **Vision**: ✅ Supported

## System Architecture

### Database Schema

The system uses TiDB with the following tables:

```
personal_ai_users          → User profiles and preferences
ai_conversations           → Chat sessions
ai_messages               → Full message history
ai_uploads                → File/image storage metadata
ai_usage_stats            → Analytics and metrics
ai_context                → User memory and preferences
ai_permissions            → Feature access control
```

### File Structure

```
Supreme-BOT2/
├── commands/ai/
│   └── personal-ai.js              # Main command
├── events/
│   └── aiInteractionCreate.js       # Button/Modal handlers
├── services/
│   └── aiService.js                 # Multi-AI integration
├── utils/
│   ├── personalAiDb.js              # Database helpers
│   └── db.js                        # Connection pool
├── config/
│   └── aiConfig.js                  # Configuration
├── migrations/
│   └── 001_personal_ai_schema.sql   # Database schema
├── PERSONAL_AI_SETUP.md             # Detailed setup guide
└── PERSONAL_AI_README.md            # This file
```

## Usage Examples

### Example 1: Get Writing Help

```
User: /ai chat message: "Help me write a professional email"
Lyra: [Provides email template and suggestions]
```

### Example 2: Analyze an Image

```
User: /ai upload file: [screenshot.png] description: "What's wrong with this UI?"
Lyra: [Analyzes screenshot and provides UX feedback]
```

### Example 3: Research with Memory

```
User (Session 1): /ai chat message: "I'm researching machine learning"
Lyra: [Provides ML overview]

User (Session 2): /ai chat message: "Tell me more about neural networks"
Lyra: [Remembers previous context, provides detailed explanation]
```

### Example 4: Switch AI Models

```
User: /ai chat message: "Analyze this complex problem" ai: "openai"
Lyra: [Uses GPT-4 for advanced reasoning]
```

## Premium Features

✅ **Unlimited Uploads**
- No file size limits
- Unlimited concurrent uploads
- Full processing for all file types

✅ **Conversation Memory**
- Full history retention
- Context awareness across sessions
- Automatic conversation titling

✅ **Multi-AI Support**
- Switch between models per message
- Automatic fallback if service is down
- Optimized routing by task type

✅ **Advanced Analytics**
- Token tracking
- Cost estimation
- Performance metrics
- 30-day history

✅ **Priority Processing**
- Faster response times
- Queue priority
- Dedicated resources

✅ **File Analysis**
- Vision capabilities
- Document extraction
- Metadata analysis

## API Reference

### Database Helpers (`personalAiDb`)

```javascript
// User Management
await personalAiDb.ensureUserExists(discordId, username, avatarUrl);
await personalAiDb.getUserByDiscordId(discordId);
await personalAiDb.setPreferredAI(discordId, aiModel);

// Conversations
await personalAiDb.createConversation(userId, aiModel, title);
await personalAiDb.getConversation(conversationId);
await personalAiDb.getRecentConversations(userId, limit);

// Messages
await personalAiDb.saveMessage(conversationId, userId, role, content, tokensUsed);
await personalAiDb.getConversationHistory(conversationId, limit);

// Files
await personalAiDb.saveUpload(userId, conversationId, filename, fileType, ...);
await personalAiDb.getUserUploads(userId, limit);
await personalAiDb.updateUploadStatus(uploadId, status, metadata);

// Context & Memory
await personalAiDb.setContext(userId, contextKey, contextValue, contextType);
await personalAiDb.getContext(userId, contextKey);
await personalAiDb.getUserContext(userId);

// Analytics
await personalAiDb.recordUsage(userId, aiModel, messages, files, tokens, cost);
await personalAiDb.getUsageStats(userId, days);

// Permissions
await personalAiDb.grantPermission(userId, featureName, expiresAt);
await personalAiDb.hasPermission(userId, featureName);
```

### AI Service (`aiService`)

```javascript
// Process message with any AI
const response = await aiService.processMessage(aiModel, messages, options);

// Process image with vision
const analysis = await aiService.processImage(imageUrl, prompt, aiModel);

// Supported models: 'groq', 'openai', 'claude', 'gemini'
```

## Configuration

Edit `config/aiConfig.js` to customize:

- **Colors & Branding**: Primary/secondary colors, emojis
- **AI Models**: Default models, parameters, costs
- **File Uploads**: Max size, supported formats
- **Rate Limits**: Messages/minute, files/day, tokens/day
- **System Prompt**: Customize AI behavior
- **Feature Flags**: Enable/disable features

## Troubleshooting

### Database Connection Failed
```
Error: PROTOCOL_CONNECTION_LOST
```
**Solution**: Verify TiDB credentials and network connectivity

### API Key Invalid
```
Error: Invalid API key
```
**Solution**: Check API keys in `.env` and ensure they're active

### File Upload Failed
```
Error: File too large
```
**Solution**: Check Discord limits (25MB for regular users)

### No Conversation History
```
Error: Conversation not found
```
**Solution**: Create a new conversation with `/ai chat`

## Performance Tips

1. **Use Groq for Speed**: Fastest response times, free tier
2. **Batch Uploads**: Upload multiple files at once
3. **Monitor Tokens**: Check stats to manage costs
4. **Archive Old Conversations**: Keep active chats for faster retrieval
5. **Use Appropriate Models**: Match model to task complexity

## Security

- ✅ API keys stored securely in environment variables
- ✅ TiDB connections use SSL/TLS encryption
- ✅ User validation (special user only)
- ✅ Rate limiting to prevent abuse
- ✅ Data privacy maintained throughout

## Monitoring

Monitor these metrics:
- API response times
- Database query performance
- Token usage per user
- Error rates by service
- File upload success rates

## Future Enhancements

- [ ] Voice message transcription
- [ ] Real-time streaming responses
- [ ] Custom AI model fine-tuning
- [ ] Advanced analytics dashboard
- [ ] Scheduled conversations
- [ ] Multi-language support
- [ ] Integration with external services

## Support

For issues:
1. Check the troubleshooting section
2. Review error logs in `./logs/ai`
3. Verify environment variables
4. Test API keys independently
5. Check database connectivity

## License

MIT

---

**Version**: 1.0.0
**Status**: Production Ready ✅
**Last Updated**: March 1, 2026

**Built with ❤️ for special needs support**

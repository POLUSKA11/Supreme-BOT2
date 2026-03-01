# 🤖 Personal AI System - Setup Guide

This document outlines the setup and configuration for the premium Personal AI system designed for Discord ID `982731220913913856`.

## Overview

The Personal AI system provides:
- **Multi-AI Support**: Groq, OpenAI (GPT-4), Claude (Anthropic), Google Gemini
- **Unlimited File/Image Uploads**: Full vision and document analysis
- **Conversation Memory**: Full history and context awareness
- **TiDB Database**: Persistent storage of all conversations and files
- **Premium Features**: Priority processing, advanced analytics, special branding

## Installation

### 1. Install Dependencies

```bash
npm install
```

New packages added:
- `uuid` - For generating unique session IDs
- `openai` - OpenAI API integration
- `@anthropic-ai/sdk` - Claude API integration
- `groq-sdk` - Already included
- `@google/generative-ai` - Already included

### 2. Database Setup

Run the migration to create the required tables:

```bash
mysql -h <TIDB_HOST> -P <TIDB_PORT> -u <TIDB_USER> -p<TIDB_PASSWORD> <TIDB_DB> < migrations/001_personal_ai_schema.sql
```

Or manually execute the SQL in `migrations/001_personal_ai_schema.sql` against your TiDB instance.

### 3. Environment Variables

Add the following to your `.env` file:

```env
# Discord Bot
TOKEN=your_discord_bot_token
DISCORD_TOKEN=your_discord_bot_token

# TiDB Configuration
TIDB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=your_tidb_user
TIDB_PASSWORD=your_tidb_password
TIDB_DB=your_database_name

# AI API Keys (at least one required)
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
CLAUDE_API_KEY=your_claude_api_key
GOOGLE_API_KEY=your_google_api_key
```

### 4. Obtain API Keys

#### Groq (Recommended - Fast & Free)
1. Visit https://console.groq.com
2. Sign up or login
3. Create an API key
4. Add to `.env`

#### OpenAI
1. Visit https://platform.openai.com/api-keys
2. Create an API key
3. Add to `.env`

#### Claude (Anthropic)
1. Visit https://console.anthropic.com
2. Create an API key
3. Add to `.env`

#### Google Gemini
1. Visit https://makersuite.google.com/app/apikey
2. Create an API key
3. Add to `.env`

## Features

### 1. Chat Command

Start conversations with the personal AI:

```
/ai chat message: "Your message here" ai: "groq"
```

**Parameters:**
- `message` (required): Your message (up to 2000 characters)
- `ai` (optional): AI model choice (groq, openai, claude, gemini)

**Features:**
- Full conversation memory
- Token usage tracking
- Multi-model support
- Automatic conversation creation

### 2. File Upload

Upload and analyze files and images:

```
/ai upload file: [attachment] description: "What to analyze"
```

**Supported:**
- Images (JPEG, PNG, WebP, GIF)
- Documents (PDF, TXT, etc.)
- Videos (MP4, WebM, etc.)
- Any file type (stored for reference)

**Features:**
- Vision analysis for images
- Document processing
- Automatic metadata extraction
- File size tracking (unlimited)

### 3. Conversation History

View past conversations:

```
/ai history limit: 20
```

**Features:**
- Recent conversation list
- Message counts
- AI model used
- Timestamps
- Quick access buttons

### 4. Settings

Configure preferences:

```
/ai settings setting: "default_ai"
```

**Options:**
- `default_ai`: Set preferred AI model
- `view_prefs`: View current preferences
- `clear_history`: Clear conversation history

### 5. Statistics

View usage analytics:

```
/ai stats
```

**Metrics:**
- Total messages sent
- Files uploaded
- Tokens used
- Estimated costs
- 30-day history

## System Architecture

### Database Schema

```
personal_ai_users
├── id (PK)
├── discord_id (UNIQUE)
├── username
├── avatar_url
├── preferred_ai
└── timestamps

ai_conversations
├── id (PK)
├── user_id (FK)
├── session_id (UNIQUE)
├── title
├── ai_model
├── message_count
└── timestamps

ai_messages
├── id (PK)
├── conversation_id (FK)
├── user_id (FK)
├── role (user/assistant)
├── content
├── tokens_used
└── created_at

ai_uploads
├── id (PK)
├── user_id (FK)
├── conversation_id (FK)
├── filename
├── file_type
├── mime_type
├── file_size
├── file_url
├── storage_path
├── processing_status
├── metadata (JSON)
└── timestamps

ai_usage_stats
├── id (PK)
├── user_id (FK)
├── date
├── messages_sent
├── files_uploaded
├── total_tokens_used
├── total_cost
└── ai_model

ai_context
├── id (PK)
├── user_id (FK)
├── context_key
├── context_value
├── context_type
└── timestamps

ai_permissions
├── id (PK)
├── user_id (FK)
├── feature_name
├── is_enabled
├── expires_at
└── created_at
```

### File Structure

```
Supreme-BOT2/
├── commands/
│   └── ai/
│       └── personal-ai.js          # Main AI command
├── events/
│   └── aiInteractionCreate.js       # Button/Modal handlers
├── services/
│   └── aiService.js                 # Multi-AI integration
├── utils/
│   ├── db.js                        # Database connection
│   └── personalAiDb.js              # AI database helpers
├── migrations/
│   └── 001_personal_ai_schema.sql   # Database schema
└── PERSONAL_AI_SETUP.md             # This file
```

## API Integration Details

### Groq Integration
- **Model**: `mixtral-8x7b-32768`
- **Speed**: Very fast (ideal for real-time chat)
- **Cost**: Free tier available
- **Tokens**: ~100K free monthly

### OpenAI Integration
- **Model**: `gpt-4-turbo`
- **Vision**: Supported
- **Cost**: ~$0.01-0.03 per 1K tokens
- **Best for**: Complex reasoning

### Claude Integration
- **Model**: `claude-3-opus-20240229`
- **Vision**: Supported
- **Cost**: ~$0.015-0.075 per 1K tokens
- **Best for**: Long context, nuanced responses

### Gemini Integration
- **Model**: `gemini-pro-vision`
- **Vision**: Supported
- **Cost**: Free tier available
- **Best for**: Image analysis

## System Prompt

The personal AI uses a specialized system prompt designed for the special user:

```
You are Lyra, a premium personal AI assistant designed specifically for Discord user 982731220913913856.

Your purpose is to provide:
- Personalized support tailored to their special needs
- Detailed analysis of uploaded files and images
- Comprehensive conversation memory and context awareness
- Professional, empathetic, and helpful responses
- Unlimited file and image processing capabilities
```

This can be customized in `services/aiService.js` in the `getSystemPrompt()` method.

## Premium Features

### Unlimited Uploads
- No file size limits
- Unlimited concurrent uploads
- Full processing for all file types

### Conversation Memory
- Full history retention
- Context awareness across sessions
- Automatic conversation titling

### Multi-AI Support
- Switch between models per message
- Automatic fallback if one service is down
- Optimized routing based on task type

### Usage Analytics
- Token tracking
- Cost estimation
- Performance metrics
- 30-day history

## Troubleshooting

### Database Connection Issues
```
Error: PROTOCOL_CONNECTION_LOST
```
**Solution**: Check TiDB credentials and network connectivity

### API Key Errors
```
Error: Invalid API key
```
**Solution**: Verify API keys in `.env` and ensure they're valid

### File Upload Failures
```
Error: File too large
```
**Solution**: Check Discord file size limits (25MB for regular users)

### Conversation Not Found
```
Error: Conversation not found
```
**Solution**: Create a new conversation with `/ai chat`

## Performance Optimization

### Database Indexes
All critical queries have indexes for fast retrieval:
- User lookups by Discord ID
- Conversation queries by user
- Message history by conversation
- Upload status tracking

### Caching Strategy
Consider implementing Redis caching for:
- Recent conversations
- User preferences
- Token usage stats

### Rate Limiting
Implement rate limits to prevent abuse:
- 10 messages per minute per user
- 50 files per day per user
- 100K tokens per day per user

## Security Considerations

1. **API Keys**: Store securely in environment variables
2. **Database**: Use SSL/TLS for TiDB connections
3. **User Validation**: Only special user ID can access features
4. **Data Privacy**: All data encrypted in transit
5. **Access Control**: Role-based permissions system

## Monitoring

Monitor these metrics:
- API response times
- Database query performance
- Token usage per user
- Error rates by service
- File upload success rates

## Support & Maintenance

### Regular Tasks
- Monitor API usage and costs
- Check database performance
- Review error logs
- Update dependencies monthly

### Scaling Considerations
- Database connection pooling (currently 10 connections)
- Message pagination for large histories
- Async processing for large files
- CDN for file storage

## Future Enhancements

- [ ] Voice message transcription
- [ ] Real-time streaming responses
- [ ] Custom AI model fine-tuning
- [ ] Advanced analytics dashboard
- [ ] Scheduled conversations
- [ ] AI-powered file organization
- [ ] Multi-language support
- [ ] Integration with external services

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review error logs
3. Verify environment variables
4. Test API keys independently
5. Contact support with detailed error messages

---

**Last Updated**: March 1, 2026
**Version**: 1.0.0
**Status**: Production Ready

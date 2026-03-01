/**
 * Personal AI Database Helper
 * Handles all database operations for the personal AI system
 */

const { query } = require('./db');
const { v4: uuidv4 } = require('uuid');

class PersonalAiDb {
    // ─── User Management ─────────────────────────────────────────────────────

    async ensureUserExists(discordId, username, avatarUrl) {
        try {
            const result = await query(
                `INSERT INTO personal_ai_users (discord_id, username, avatar_url) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 username = VALUES(username), 
                 avatar_url = VALUES(avatar_url),
                 updated_at = CURRENT_TIMESTAMP`,
                [discordId, username, avatarUrl]
            );
            return result;
        } catch (error) {
            console.error('❌ [AI DB] Error ensuring user exists:', error);
            throw error;
        }
    }

    async getUserByDiscordId(discordId) {
        try {
            const results = await query(
                'SELECT * FROM personal_ai_users WHERE discord_id = ?',
                [discordId]
            );
            return results[0] || null;
        } catch (error) {
            console.error('❌ [AI DB] Error getting user:', error);
            throw error;
        }
    }

    async setPreferredAI(discordId, aiModel) {
        try {
            await query(
                'UPDATE personal_ai_users SET preferred_ai = ? WHERE discord_id = ?',
                [aiModel, discordId]
            );
        } catch (error) {
            console.error('❌ [AI DB] Error setting preferred AI:', error);
            throw error;
        }
    }

    // ─── Conversation Management ─────────────────────────────────────────────

    async createConversation(userId, aiModel = 'groq', title = null) {
        try {
            const sessionId = uuidv4();
            const result = await query(
                `INSERT INTO ai_conversations (user_id, session_id, ai_model, title) 
                 VALUES (?, ?, ?, ?)`,
                [userId, sessionId, aiModel, title || `Chat ${new Date().toLocaleString()}`]
            );
            return { id: result.insertId, sessionId };
        } catch (error) {
            console.error('❌ [AI DB] Error creating conversation:', error);
            throw error;
        }
    }

    async getConversation(conversationId) {
        try {
            const results = await query(
                'SELECT * FROM ai_conversations WHERE id = ?',
                [conversationId]
            );
            return results[0] || null;
        } catch (error) {
            console.error('❌ [AI DB] Error getting conversation:', error);
            throw error;
        }
    }

    async getRecentConversations(userId, limit = 10) {
        try {
            const results = await query(
                `SELECT * FROM ai_conversations 
                 WHERE user_id = ? AND is_archived = FALSE 
                 ORDER BY created_at DESC LIMIT ?`,
                [userId, limit]
            );
            return results;
        } catch (error) {
            console.error('❌ [AI DB] Error getting conversations:', error);
            throw error;
        }
    }

    async updateConversationTitle(conversationId, title) {
        try {
            await query(
                'UPDATE ai_conversations SET title = ? WHERE id = ?',
                [title, conversationId]
            );
        } catch (error) {
            console.error('❌ [AI DB] Error updating conversation title:', error);
            throw error;
        }
    }

    // ─── Message Management ──────────────────────────────────────────────────

    async saveMessage(conversationId, userId, role, content, tokensUsed = 0) {
        try {
            const result = await query(
                `INSERT INTO ai_messages (conversation_id, user_id, role, content, tokens_used) 
                 VALUES (?, ?, ?, ?, ?)`,
                [conversationId, userId, role, content, tokensUsed]
            );

            // Update message count
            await query(
                'UPDATE ai_conversations SET message_count = message_count + 1 WHERE id = ?',
                [conversationId]
            );

            return result.insertId;
        } catch (error) {
            console.error('❌ [AI DB] Error saving message:', error);
            throw error;
        }
    }

    async getConversationHistory(conversationId, limit = 50) {
        try {
            const results = await query(
                `SELECT * FROM ai_messages 
                 WHERE conversation_id = ? 
                 ORDER BY created_at ASC LIMIT ?`,
                [conversationId, limit]
            );
            return results;
        } catch (error) {
            console.error('❌ [AI DB] Error getting conversation history:', error);
            throw error;
        }
    }

    // ─── File/Upload Management ──────────────────────────────────────────────

    async saveUpload(userId, conversationId, filename, fileType, mimeType, fileSize, fileUrl, storagePath, metadata = {}) {
        try {
            const result = await query(
                `INSERT INTO ai_uploads 
                 (user_id, conversation_id, filename, file_type, mime_type, file_size, file_url, storage_path, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, conversationId, filename, fileType, mimeType, fileSize, fileUrl, storagePath, JSON.stringify(metadata)]
            );
            return result.insertId;
        } catch (error) {
            console.error('❌ [AI DB] Error saving upload:', error);
            throw error;
        }
    }

    async getUpload(uploadId) {
        try {
            const results = await query(
                'SELECT * FROM ai_uploads WHERE id = ?',
                [uploadId]
            );
            return results[0] || null;
        } catch (error) {
            console.error('❌ [AI DB] Error getting upload:', error);
            throw error;
        }
    }

    async getUserUploads(userId, limit = 50) {
        try {
            const results = await query(
                `SELECT * FROM ai_uploads 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC LIMIT ?`,
                [userId, limit]
            );
            return results;
        } catch (error) {
            console.error('❌ [AI DB] Error getting user uploads:', error);
            throw error;
        }
    }

    async updateUploadStatus(uploadId, status, metadata = {}) {
        try {
            await query(
                `UPDATE ai_uploads 
                 SET processing_status = ?, is_processed = ?, metadata = ? 
                 WHERE id = ?`,
                [status, status === 'completed' ? true : false, JSON.stringify(metadata), uploadId]
            );
        } catch (error) {
            console.error('❌ [AI DB] Error updating upload status:', error);
            throw error;
        }
    }

    // ─── Context/Memory Management ───────────────────────────────────────────

    async setContext(userId, contextKey, contextValue, contextType = 'memory') {
        try {
            await query(
                `INSERT INTO ai_context (user_id, context_key, context_value, context_type) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 context_value = VALUES(context_value),
                 updated_at = CURRENT_TIMESTAMP`,
                [userId, contextKey, contextValue, contextType]
            );
        } catch (error) {
            console.error('❌ [AI DB] Error setting context:', error);
            throw error;
        }
    }

    async getContext(userId, contextKey) {
        try {
            const results = await query(
                'SELECT context_value FROM ai_context WHERE user_id = ? AND context_key = ?',
                [userId, contextKey]
            );
            return results[0]?.context_value || null;
        } catch (error) {
            console.error('❌ [AI DB] Error getting context:', error);
            throw error;
        }
    }

    async getUserContext(userId) {
        try {
            const results = await query(
                'SELECT context_key, context_value FROM ai_context WHERE user_id = ?',
                [userId]
            );
            const context = {};
            results.forEach(row => {
                context[row.context_key] = row.context_value;
            });
            return context;
        } catch (error) {
            console.error('❌ [AI DB] Error getting user context:', error);
            throw error;
        }
    }

    // ─── Usage Statistics ────────────────────────────────────────────────────

    async recordUsage(userId, aiModel, messagesSent = 1, filesUploaded = 0, tokensUsed = 0, cost = 0) {
        try {
            const today = new Date().toISOString().split('T')[0];
            await query(
                `INSERT INTO ai_usage_stats 
                 (user_id, date, messages_sent, files_uploaded, total_tokens_used, total_cost, ai_model) 
                 VALUES (?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 messages_sent = messages_sent + VALUES(messages_sent),
                 files_uploaded = files_uploaded + VALUES(files_uploaded),
                 total_tokens_used = total_tokens_used + VALUES(total_tokens_used),
                 total_cost = total_cost + VALUES(total_cost)`,
                [userId, today, messagesSent, filesUploaded, tokensUsed, cost, aiModel]
            );
        } catch (error) {
            console.error('❌ [AI DB] Error recording usage:', error);
            throw error;
        }
    }

    async getUsageStats(userId, days = 30) {
        try {
            const results = await query(
                `SELECT * FROM ai_usage_stats 
                 WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                 ORDER BY date DESC`,
                [userId, days]
            );
            return results;
        } catch (error) {
            console.error('❌ [AI DB] Error getting usage stats:', error);
            throw error;
        }
    }

    // ─── Permissions ─────────────────────────────────────────────────────────

    async grantPermission(userId, featureName, expiresAt = null) {
        try {
            await query(
                `INSERT INTO ai_permissions (user_id, feature_name, expires_at) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 is_enabled = TRUE,
                 expires_at = VALUES(expires_at)`,
                [userId, featureName, expiresAt]
            );
        } catch (error) {
            console.error('❌ [AI DB] Error granting permission:', error);
            throw error;
        }
    }

    async hasPermission(userId, featureName) {
        try {
            const results = await query(
                `SELECT is_enabled FROM ai_permissions 
                 WHERE user_id = ? AND feature_name = ? 
                 AND (expires_at IS NULL OR expires_at > NOW())`,
                [userId, featureName]
            );
            return results.length > 0 && results[0].is_enabled;
        } catch (error) {
            console.error('❌ [AI DB] Error checking permission:', error);
            throw error;
        }
    }
}

module.exports = new PersonalAiDb();

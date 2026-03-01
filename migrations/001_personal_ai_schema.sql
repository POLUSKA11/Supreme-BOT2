-- Personal AI System Schema for TiDB
-- Supports unlimited file/image uploads, conversation memory, and multi-AI integration

-- Personal AI User Settings
CREATE TABLE IF NOT EXISTS personal_ai_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    discord_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    preferred_ai VARCHAR(50) DEFAULT 'groq', -- 'openai', 'claude', 'groq', 'gemini'
    INDEX idx_discord_id (discord_id)
);

-- Conversation Sessions
CREATE TABLE IF NOT EXISTS ai_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255),
    ai_model VARCHAR(50) DEFAULT 'groq',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    message_count INT DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES personal_ai_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at)
);

-- Conversation Messages (with full history)
CREATE TABLE IF NOT EXISTS ai_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content LONGTEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES personal_ai_users(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- File/Image Uploads
CREATE TABLE IF NOT EXISTS ai_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    conversation_id INT,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image', 'document', 'video', etc.
    mime_type VARCHAR(100),
    file_size BIGINT,
    file_url TEXT,
    storage_path VARCHAR(500),
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(50), -- 'pending', 'processing', 'completed', 'failed'
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES personal_ai_users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_created_at (created_at),
    INDEX idx_file_type (file_type)
);

-- AI Usage Statistics
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    messages_sent INT DEFAULT 0,
    files_uploaded INT DEFAULT 0,
    total_tokens_used INT DEFAULT 0,
    total_cost DECIMAL(10, 4) DEFAULT 0,
    ai_model VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES personal_ai_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date)
);

-- AI Context/Memory (for maintaining context across sessions)
CREATE TABLE IF NOT EXISTS ai_context (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    context_key VARCHAR(255) NOT NULL,
    context_value LONGTEXT,
    context_type VARCHAR(50), -- 'preference', 'memory', 'setting', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES personal_ai_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_key (user_id, context_key),
    INDEX idx_user_id (user_id)
);

-- Premium Features/Permissions
CREATE TABLE IF NOT EXISTS ai_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    feature_name VARCHAR(100) NOT NULL, -- 'unlimited_uploads', 'priority_processing', etc.
    is_enabled BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES personal_ai_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_feature (user_id, feature_name),
    INDEX idx_user_id (user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_ai_messages_timestamp ON ai_messages(created_at DESC);
CREATE INDEX idx_ai_uploads_status ON ai_uploads(processing_status);
CREATE INDEX idx_ai_conversations_timestamp ON ai_conversations(created_at DESC);

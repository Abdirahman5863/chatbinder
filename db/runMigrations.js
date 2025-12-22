require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrations() {
    try {
        logger.info('Running database migrations...');
        
        // Test connection first
        const { error: testError } = await supabase
            .from('chats')
            .select('id')
            .limit(1);

        if (testError && testError.code !== 'PGRST116') {
            throw new Error(`Database connection failed: ${testError.message}`);
        }

        logger.info('✓ Database connection successful');
        logger.info('Tables check passed');
        
        logger.info('');
        logger.info('=== IMPORTANT ===');
        logger.info('To create tables, go to Supabase Dashboard:');
        logger.info('1. SQL Editor');
        logger.info('2. New Query');
        logger.info('3. Paste this SQL and run it:');
        logger.info('');
        logger.info(`
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chats
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT,
    source TEXT CHECK (source IN ('chatgpt', 'claude', 'gemini')),
    message_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat chunks
CREATE TABLE IF NOT EXISTS chat_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Embeddings
CREATE TABLE IF NOT EXISTS chat_chunk_embeddings (
    chunk_id UUID PRIMARY KEY REFERENCES chat_chunks(id) ON DELETE CASCADE,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Binders
CREATE TABLE IF NOT EXISTS binders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Binder chats
CREATE TABLE IF NOT EXISTS binder_chats (
    binder_id UUID NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (binder_id, chat_id)
);

-- Binder summaries
CREATE TABLE IF NOT EXISTS binder_summaries (
    binder_id UUID PRIMARY KEY REFERENCES binders(id) ON DELETE CASCADE,
    summary TEXT,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- Merged docs
CREATE TABLE IF NOT EXISTS binder_merged_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    binder_id UUID NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
    document TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_chunks_chat_id ON chat_chunks(chat_id);
CREATE INDEX IF NOT EXISTS idx_binder_chats_binder_id ON binder_chats(binder_id);
CREATE INDEX IF NOT EXISTS idx_binder_chats_chat_id ON binder_chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_binders_created_at ON binders(created_at);
        `);
        
        logger.info('After running SQL, you\'re ready to use ChatBinder!');
        process.exit(0);
    } catch (error) {
        logger.error('Error:', error.message);
        process.exit(1);
    }
}

runMigrations();
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT,
    source TEXT CHECK (source IN ('chatgpt', 'claude', 'gemini')),
    message_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat chunks (for storing message segments)
CREATE TABLE IF NOT EXISTS chat_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Embeddings (vector storage with pgvector)
CREATE TABLE IF NOT EXISTS chat_chunk_embeddings (
    chunk_id UUID PRIMARY KEY REFERENCES chat_chunks(id) ON DELETE CASCADE,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Binders (folders/collections of chats)
CREATE TABLE IF NOT EXISTS binders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Binder-Chat junction table
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

-- Merged documents
CREATE TABLE IF NOT EXISTS binder_merged_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    binder_id UUID NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
    document TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_chunks_chat_id ON chat_chunks(chat_id);
CREATE INDEX IF NOT EXISTS idx_binder_chats_binder_id ON binder_chats(binder_id);
CREATE INDEX IF NOT EXISTS idx_binder_chats_chat_id ON binder_chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_binders_created_at ON binders(created_at);

-- Create IVFFLAT index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON chat_chunk_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_chat_chunks(
    query_embedding vector,
    match_threshold float8 DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    chat_id UUID,
    content TEXT,
    similarity FLOAT
) AS $
BEGIN
    RETURN QUERY
    SELECT
        cc.id,
        cc.chat_id,
        cc.content,
        (1 - (cce.embedding <=> query_embedding)) as similarity
    FROM chat_chunk_embeddings cce
    JOIN chat_chunks cc ON cce.chunk_id = cc.id
    WHERE 1 - (cce.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$ LANGUAGE plpgsql;
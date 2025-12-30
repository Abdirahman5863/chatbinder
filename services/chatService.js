const { supabase } = require('../config/database');
const embeddingService = require('./embeddingService');
const chunkText = require('../utils/chunking'); // Fixed: should work now
const logger = require('../utils/logger');

async function saveChat(userId, title, url, source, messages) {
    try {
        logger.info(`Saving chat "${title}" for user: ${userId}`);
        logger.info(`Messages count: ${messages.length}`);
        
        // Create chat record
        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert([{
                user_id: userId,
                title: title || 'Untitled Chat',
                url: url || '',
                source: source || 'chatgpt',
                message_count: messages.length
            }])
            .select()
            .single();

        if (chatError) {
            logger.error(`Error creating chat: ${chatError.message}`);
            throw chatError;
        }

        logger.info(`Chat created with ID: ${chat.id}`);

        // Combine all messages into text
        const fullText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        
        // Chunk the conversation
        const chunks = chunkText(fullText, messages);
        logger.info(`Created ${chunks.length} chunks for chat ${chat.id}`);

        // Save chunks
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            const { data: savedChunk, error: chunkError } = await supabase
                .from('chat_chunks')
                .insert([{
                    chat_id: chat.id,
                    content: chunk,
                    chunk_index: i
                }])
                .select()
                .single();

            if (chunkError) {
                logger.error(`Error saving chunk ${i}: ${chunkError.message}`);
                continue;
            }

            logger.info(`Saved chunk ${i + 1}/${chunks.length} for chat ${chat.id}`);

            // Generate embedding (optional - can fail without breaking)
            try {
                const embedding = await embeddingService.generateEmbedding(chunk);
                
                await supabase
                    .from('chat_chunk_embeddings')
                    .insert([{
                        chunk_id: savedChunk.id,
                        embedding: embedding
                    }]);
                
                logger.info(`Generated embedding for chunk ${i + 1}`);
            } catch (embError) {
                logger.error(`Error generating embedding for chunk ${i}: ${embError.message}`);
                // Continue even if embedding fails
            }
        }

        logger.info(`Successfully saved chat ${chat.id} with ${chunks.length} chunks`);
        return chat;
        
    } catch (error) {
        logger.error(`Error in saveChat: ${error.message}`);
        logger.error(error.stack);
        throw error;
    }
}

async function getChat(chatId, userId) {
    logger.info(`Getting chat ${chatId} for user: ${userId}`);
    
    const { data, error } = await supabase
        .from('chats')
        .select(`
            *,
            chat_chunks(*)
        `)
        .eq('id', chatId)
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        logger.error(`Error getting chat: ${error.message}`);
        throw error;
    }

    return data;
}

async function listChats(userId) {
    logger.info(`Listing chats for user: ${userId}`);
    
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        logger.error(`Error listing chats: ${error.message}`);
        throw error;
    }

    return data;
}

async function deleteChat(chatId, userId) {
    logger.info(`Deleting chat ${chatId} for user: ${userId}`);
    
    // Verify ownership
    const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .eq('user_id', userId)
        .single();

    if (!chat) {
        throw new Error('Chat not found or access denied');
    }

    const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', userId);

    if (error) {
        logger.error(`Error deleting chat: ${error.message}`);
        throw error;
    }

    return true;
}

module.exports = {
    saveChat,
    getChat,
    listChats,
    deleteChat
};
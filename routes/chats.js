const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database');
const logger = require('../utils/logger');
const { identifyUser } = require('../middleware/auth');

// Apply auth middleware
router.use(identifyUser);

// Search binders (user's only)
router.get('/chats', async (req, res, next) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter required' });
        }

        logger.info(`Searching binders for "${query}" for user: ${req.userId}`);

        // Search in binder names and descriptions
        const { data: binderResults, error: binderError } = await supabase
            .from('binders')
            .select(`
                id,
                name,
                description,
                created_at
            `)
            .eq('user_id', req.userId)
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(10);

        if (binderError) {
            logger.error(`Binder search error: ${binderError.message}`);
            throw binderError;
        }

        // Also search in chat content within user's binders
        const { data: userChats } = await supabase
            .from('chats')
            .select('id')
            .eq('user_id', req.userId);

        const chatIds = userChats?.map(c => c.id) || [];

        let contentResults = [];
        if (chatIds.length > 0) {
            const { data: chunkResults, error: chunkError } = await supabase
                .from('chat_chunks')
                .select(`
                    id,
                    content,
                    chat_id,
                    chats!inner(
                        title,
                        source,
                        created_at
                    )
                `)
                .in('chat_id', chatIds)
                .ilike('content', `%${query}%`)
                .limit(10);

            if (!chunkError && chunkResults) {
                // Get binder info for each chat
                for (const result of chunkResults) {
                    const { data: binderChat } = await supabase
                        .from('binder_chats')
                        .select(`
                            binder_id,
                            binders(name)
                        `)
                        .eq('chat_id', result.chat_id)
                        .limit(1)
                        .single();

                    contentResults.push({
                        type: 'content',
                        binder_id: binderChat?.binder_id,
                        binder_name: binderChat?.binders?.name,
                        chat_title: result.chats?.title,
                        chat_source: result.chats?.source,
                        content: result.content,
                        chat_date: result.chats?.created_at
                    });
                }
            }
        }

        // Combine results
        const formattedBinderResults = binderResults.map(b => ({
            type: 'binder',
            binder_id: b.id,
            binder_name: b.name,
            description: b.description,
            created_at: b.created_at
        }));

        const allResults = [...formattedBinderResults, ...contentResults];

        logger.info(`Found ${allResults.length} results for "${query}"`);
        res.json(allResults);

    } catch (error) {
        logger.error(`Error searching: ${error.message}`);
        next(error);
    }
});

module.exports = router;
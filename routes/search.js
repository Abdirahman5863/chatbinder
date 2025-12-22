const express = require('express');
const router = express.Router();
const { supabase } = require('../config/database');
const logger = require('../utils/logger');
const { identifyUser } = require('../middleware/auth');

// Apply auth middleware
router.use(identifyUser);

// Search chats (user's only)
router.get('/chats', async (req, res, next) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter required' });
        }

        logger.info(`Searching for "${query}" for user: ${req.userId}`);

        // First get user's chat IDs
        const { data: userChats } = await supabase
            .from('chats')
            .select('id')
            .eq('user_id', req.userId);

        if (!userChats || userChats.length === 0) {
            return res.json([]);
        }

        const chatIds = userChats.map(c => c.id);

        // Search in chunks for those chats only
        const { data: results, error } = await supabase
            .from('chat_chunks')
            .select(`
                id,
                content,
                chat_id,
                chats!inner(
                    title,
                    source,
                    created_at,
                    user_id
                )
            `)
            .in('chat_id', chatIds)
            .ilike('content', `%${query}%`)
            .limit(20);

        if (error) {
            logger.error(`Search error: ${error.message}`);
            throw error;
        }

        // Format results
        const formatted = results.map(r => ({
            chunk_id: r.id,
            content: r.content,
            chat_id: r.chat_id,
            chat_title: r.chats?.title,
            chat_source: r.chats?.source,
            chat_date: r.chats?.created_at
        }));

        res.json(formatted);
    } catch (error) {
        logger.error(`Error searching: ${error.message}`);
        next(error);
    }
});

module.exports = router;
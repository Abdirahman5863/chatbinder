const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const binderService = require('../services/binderService');
const logger = require('../utils/logger');
const { identifyUser } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(identifyUser);

// Save a new chat
router.post('/save', async (req, res, next) => {
    try {
        const { title, url, source, messages, binderId } = req.body;
        
        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'No messages provided' });
        }

        logger.info(`Saving chat for user: ${req.userId}`);
        
        // Save chat with user_id
        const chat = await chatService.saveChat(
            req.userId,
            title,
            url,
            source,
            messages
        );

        // If binderId provided, add to binder
        if (binderId) {
            await binderService.addChatToBinder(binderId, chat.id, req.userId);
            logger.info(`Chat ${chat.id} added to binder ${binderId}`);
        }

        res.json(chat);
    } catch (error) {
        logger.error(`Error saving chat: ${error.message}`);
        next(error);
    }
});

// Get a specific chat (user's only)
router.get('/:chatId', async (req, res, next) => {
    try {
        logger.info(`Getting chat ${req.params.chatId} for user: ${req.userId}`);
        const chat = await chatService.getChat(req.params.chatId, req.userId);
        
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        
        res.json(chat);
    } catch (error) {
        logger.error(`Error getting chat: ${error.message}`);
        next(error);
    }
});

// List user's chats
router.get('/', async (req, res, next) => {
    try {
        logger.info(`Listing chats for user: ${req.userId}`);
        const chats = await chatService.listChats(req.userId);
        res.json(chats);
    } catch (error) {
        logger.error(`Error listing chats: ${error.message}`);
        next(error);
    }
});

// Delete a chat (user's only)
router.delete('/:chatId', async (req, res, next) => {
    try {
        logger.info(`Deleting chat ${req.params.chatId} for user: ${req.userId}`);
        await chatService.deleteChat(req.params.chatId, req.userId);
        res.json({ success: true });
    } catch (error) {
        logger.error(`Error deleting chat: ${error.message}`);
        next(error);
    }
});

module.exports = router;
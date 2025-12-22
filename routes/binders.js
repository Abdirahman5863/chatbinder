const express = require('express');
const router = express.Router();
const binderService = require('../services/binderService');
const logger = require('../utils/logger');
const { identifyUser } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(identifyUser);

// List user's binders only
router.get('/list', async (req, res, next) => {
    try {
        logger.info(`Listing binders for user: ${req.userId}`);
        const binders = await binderService.listBinders(req.userId);
        res.json(binders);
    } catch (error) {
        logger.error(`Error listing binders: ${error.message}`);
        next(error);
    }
});

// Create binder for user
router.post('/create', async (req, res, next) => {
    try {
        const { name, description } = req.body;
        logger.info(`Creating binder for user: ${req.userId}`);
        const binder = await binderService.createBinder(req.userId, name, description);
        res.json(binder);
    } catch (error) {
        logger.error(`Error creating binder: ${error.message}`);
        next(error);
    }
});

// Get user's binder
router.get('/:binderId', async (req, res, next) => {
    try {
        logger.info(`Getting binder ${req.params.binderId} for user: ${req.userId}`);
        const binder = await binderService.getBinder(req.params.binderId, req.userId);
        if (!binder) {
            return res.status(404).json({ error: 'Binder not found' });
        }
        res.json(binder);
    } catch (error) {
        logger.error(`Error getting binder: ${error.message}`);
        next(error);
    }
});

// Merge binder (user's only)
router.get('/merge/:binderId', async (req, res, next) => {
    try {
        logger.info(`Merging binder ${req.params.binderId} for user: ${req.userId}`);
        const merged = await binderService.mergeBinder(req.params.binderId, req.userId);
        res.json({ document: merged });
    } catch (error) {
        logger.error(`Error merging binder: ${error.message}`);
        next(error);
    }
});

// Delete user's binder
router.delete('/:binderId', async (req, res, next) => {
    try {
        logger.info(`Deleting binder ${req.params.binderId} for user: ${req.userId}`);
        await binderService.deleteBinder(req.params.binderId, req.userId);
        res.json({ success: true });
    } catch (error) {
        logger.error(`Error deleting binder: ${error.message}`);
        next(error);
    }
});

module.exports = router;
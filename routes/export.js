const express = require('express');
const router = express.Router();
const binderService = require('../services/binderService');
const exportService = require('../services/exportService');
const logger = require('../utils/logger');
const { identifyUser } = require('../middleware/auth');

// Apply auth middleware
router.use(identifyUser);

// Export binder as PDF (user's only)
router.get('/binder/:binderId/pdf', async (req, res, next) => {
    try {
        logger.info(`PDF export requested for binder: ${req.params.binderId} by user: ${req.userId}`);
        
        const binder = await binderService.getBinder(req.params.binderId, req.userId);
        if (!binder) {
            logger.warn(`Binder not found or access denied: ${req.params.binderId}`);
            return res.status(404).json({ error: 'Binder not found' });
        }
        
        const pdfBuffer = await exportService.exportToPDF(binder);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${binder.name}.pdf"`);
        res.send(pdfBuffer);
        
        logger.info(`PDF exported: ${req.params.binderId}`);
    } catch (error) {
        logger.error(`PDF export error: ${error.message}`);
        next(error);
    }
});

// Export binder as markdown (user's only)
router.get('/binder/:binderId/markdown', async (req, res, next) => {
    try {
        logger.info(`Markdown export requested for binder: ${req.params.binderId} by user: ${req.userId}`);
        
        const binder = await binderService.getBinder(req.params.binderId, req.userId);
        if (!binder) {
            logger.warn(`Binder not found or access denied: ${req.params.binderId}`);
            return res.status(404).json({ error: 'Binder not found' });
        }
        
        const markdown = await exportService.exportToMarkdown(binder);
        
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${binder.name}.md"`);
        res.send(markdown);
        
        logger.info(`Markdown exported: ${req.params.binderId}`);
    } catch (error) {
        logger.error(`Markdown export error: ${error.message}`);
        next(error);
    }
});

module.exports = router;
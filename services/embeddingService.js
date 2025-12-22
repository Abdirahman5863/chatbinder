const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function embed(text) {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text
        });
        
        return response.data[0].embedding;
    } catch (error) {
        logger.error(`Error generating embedding: ${error.message}`);
        throw error;
    }
}

module.exports = { embed };
const { OpenAI } = require('openai');
const { supabase } = require('../config/database');
const logger = require('../utils/logger');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function mergeBinder(binder) {
    try {
        logger.info(`Starting merge for binder: ${binder.id}`);
        
        if (!binder.binder_chats || binder.binder_chats.length === 0) {
            logger.warn('No chats in binder');
            return '# ' + binder.name + '\n\nNo chats in this binder.';
        }
        
        logger.info(`Found ${binder.binder_chats.length} chats in binder`);
        
        // Build content from chats
        let allContent = `# ${binder.name}\n\n`;
        
        for (const bc of binder.binder_chats) {
            const chat = bc.chats;
            if (!chat) continue;
            
            allContent += `\n## Chat: ${chat.title}\n`;
            allContent += `**Source:** ${chat.source} | **Date:** ${new Date(chat.created_at).toLocaleDateString()}\n\n`;
            
            // Add chunks
            if (chat.chunks && chat.chunks.length > 0) {
                chat.chunks.forEach(chunk => {
                    allContent += chunk.content + '\n\n';
                });
            }
        }
        
        logger.info(`Total content length: ${allContent.length} chars`);
        
        // Use GPT-4 to synthesize (with fallback)
        let mergedDocument = '';
        
        try {
            logger.info('Calling OpenAI for synthesis...');
            
            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at analyzing and synthesizing AI conversations. 
                        Merge the following chat conversations into a clear, structured document with these sections:
                        1. Context & Background
                        2. Key Topics Discussed
                        3. Main Decisions & Conclusions
                        4. Action Items & Next Steps
                        5. Relevant Code Snippets (if any)
                        6. Key Learnings
                        
                        Use clear markdown formatting. Be concise and accurate.`
                    },
                    {
                        role: 'user',
                        content: `Please merge and structure these conversations:\n\n${allContent.substring(0, 8000)}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 3000,
                timeout: 30000
            });
            
            mergedDocument = response.choices[0].message.content;
            logger.info('OpenAI synthesis successful');
            
        } catch (openaiError) {
            logger.warn(`OpenAI error: ${openaiError.message}. Using raw content instead.`);
            // Fallback: use formatted content if OpenAI fails
            mergedDocument = allContent;
        }
        
        // Save merged document
        try {
            const { error: saveError } = await supabase.from('binder_merged_docs').insert({
                binder_id: binder.id,
                document: mergedDocument,
                created_at: new Date().toISOString()
            });
            
            if (saveError) {
                logger.warn(`Error saving merged doc: ${saveError.message}`);
            }
        } catch (err) {
            logger.warn(`Error saving to DB: ${err.message}`);
        }
        
        logger.info(`Binder merged successfully: ${binder.id}`);
        return mergedDocument;
        
    } catch (error) {
        logger.error(`Error merging binder: ${error.message}`);
        throw error;
    }
}

module.exports = { mergeBinder };
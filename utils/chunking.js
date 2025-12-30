const CHUNK_SIZE = 3000; // Increased for better context
const CHUNK_OVERLAP = 500;

function chunkMessages(messages) {
    // Convert messages to structured format first
    const formattedMessages = messages.map(msg => {
        return {
            role: msg.role,
            content: msg.content,
            formatted: `[${msg.role.toUpperCase()}]:\n${msg.content}\n`
        };
    });
    
    // Group messages into chunks while preserving message boundaries
    const chunks = [];
    let currentChunk = '';
    let currentIndex = 0;
    let chunkNumber = 0;
    
    for (const msg of formattedMessages) {
        const msgLength = msg.formatted.length;
        
        // If adding this message would exceed chunk size AND we have content, start new chunk
        if (currentChunk.length + msgLength > CHUNK_SIZE && currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.trim(),
                index: chunkNumber,
                messageCount: currentIndex
            });
            chunkNumber++;
            
            // Add overlap for context
            currentChunk = currentChunk.slice(-CHUNK_OVERLAP) + msg.formatted;
        } else {
            currentChunk += msg.formatted;
        }
        
        currentIndex++;
    }
    
    // Add remaining content
    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.trim(),
            index: chunkNumber,
            messageCount: currentIndex
        });
    }
    
    return chunks.length > 0 ? chunks : [{
        content: formattedMessages.map(m => m.formatted).join(''),
        index: 0,
        messageCount: formattedMessages.length
    }];
}

function chunkText(text, messages = null, maxChunkSize = 3000) {
    const chunks = [];
    
    // If messages are provided, chunk by message boundaries
    if (messages && Array.isArray(messages)) {
        let currentChunk = '';
        
        for (const msg of messages) {
            const messageText = `${msg.role}: ${msg.content}\n\n`;
            
            // If adding this message would exceed max size, save current chunk and start new one
            if (currentChunk.length + messageText.length > maxChunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            currentChunk += messageText;
        }
        
        // Add the last chunk if it has content
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
    } else {
        // Simple text chunking
        const words = text.split(/\s+/);
        let currentChunk = '';
        
        for (const word of words) {
            if (currentChunk.length + word.length + 1 > maxChunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += (currentChunk ? ' ' : '') + word;
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
    }
    
    // Ensure we always return at least one chunk
    if (chunks.length === 0 && text) {
        chunks.push(text.substring(0, maxChunkSize));
    }
    
    return chunks;
}

module.exports = {chunkText,chunkMessages}
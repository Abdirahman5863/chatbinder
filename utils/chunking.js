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

function chunkText(text) {
    const chunks = [];
    const words = text.split(/\s+/);
    let currentChunk = '';
    let chunkIndex = 0;
    
    words.forEach(word => {
        if (currentChunk.length + word.length + 1 > CHUNK_SIZE) {
            if (currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk.trim(),
                    index: chunkIndex++
                });
            }
            currentChunk = word;
        } else {
            currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
        }
    });
    
    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex
        });
    }
    
    return chunks;
}

module.exports = {
    chunkMessages,
    chunkText
};
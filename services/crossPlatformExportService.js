// ===== services/crossPlatformExportService.js =====
// Export in multiple formats (JSON, CSV, HTML)

async function exportAsJSON(binderId) {
    try {
        const { supabase } = require('../config/database');
        
        const { data: binder } = await supabase
            .from('binders')
            .select(`
                *,
                binder_chats (
                    chat_id,
                    chats (*)
                )
            `)
            .eq('id', binderId)
            .single();
        
        if (!binder) throw new Error('Binder not found');
        
        // Fetch all chunks for each chat
        const enrichedChats = [];
        for (const bc of binder.binder_chats) {
            const { data: chunks } = await supabase
                .from('chat_chunks')
                .select('*')
                .eq('chat_id', bc.chat_id);
            
            enrichedChats.push({
                ...bc.chats,
                chunks: chunks || []
            });
        }
        
        const jsonData = {
            binder: {
                id: binder.id,
                name: binder.name,
                description: binder.description,
                created_at: binder.created_at
            },
            chats: enrichedChats,
            exportedAt: new Date().toISOString()
        };
        
        return JSON.stringify(jsonData, null, 2);
    } catch (error) {
        logger.error(`Error exporting JSON: ${error.message}`);
        throw error;
    }
}

async function exportAsCSV(binderId) {
    try {
        const { supabase } = require('../config/database');
        
        const { data: binder } = await supabase
            .from('binders')
            .select(`
                *,
                binder_chats (
                    chat_id,
                    chats (id, title, source)
                )
            `)
            .eq('id', binderId)
            .single();
        
        if (!binder) throw new Error('Binder not found');
        
        let csv = 'Chat Title,Source,Date,Message Count,URL\n';
        
        for (const bc of binder.binder_chats) {
            const chat = bc.chats;
            csv += `"${chat.title}","${chat.source}","${new Date(chat.created_at).toLocaleDateString()}","${chat.message_count}","${chat.url || 'N/A'}"\n`;
        }
        
        return csv;
    } catch (error) {
        logger.error(`Error exporting CSV: ${error.message}`);
        throw error;
    }
}

async function exportAsHTML(binderId) {
    try {
        const { supabase } = require('../config/database');
        
        const { data: binder } = await supabase
            .from('binders')
            .select(`
                *,
                binder_chats (
                    chat_id,
                    chats (*)
                )
            `)
            .eq('id', binderId)
            .single();
        
        if (!binder) throw new Error('Binder not found');
        
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${binder.name}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
        h1 { color: #667eea; }
        .chat { margin: 20px 0; padding: 15px; border-left: 4px solid #667eea; background: #f9f9f9; }
        .chat-title { font-size: 18px; font-weight: bold; color: #333; }
        .chat-meta { font-size: 12px; color: #999; margin: 5px 0; }
        .content { margin-top: 10px; font-size: 13px; line-height: 1.6; }
    </style>
</head>
<body>
    <h1>${binder.name}</h1>
    <p>${binder.description || ''}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
`;
        
        for (const bc of binder.binder_chats) {
            const chat = bc.chats;
            html += `
    <div class="chat">
        <div class="chat-title">${chat.title}</div>
        <div class="chat-meta">Source: ${chat.source} | Date: ${new Date(chat.created_at).toLocaleDateString()}</div>
`;
            
            const { data: chunks } = await supabase
                .from('chat_chunks')
                .select('content')
                .eq('chat_id', chat.id);
            
            if (chunks) {
                chunks.forEach(chunk => {
                    html += `<div class="content">${chunk.content.replace(/\n/g, '<br>')}</div>`;
                });
            }
            
            html += '</div>';
        }
        
        html += '</body></html>';
        return html;
    } catch (error) {
        logger.error(`Error exporting HTML: ${error.message}`);
        throw error;
    }
}

module.exports = { exportAsJSON, exportAsCSV, exportAsHTML };

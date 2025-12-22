const { supabase } = require('../config/database');
const logger = require('../utils/logger');

async function createBinder(userId, name, description) {
    logger.info(`Creating binder "${name}" for user: ${userId}`);
    
    const { data, error } = await supabase
        .from('binders')
        .insert([{ 
            user_id: userId, 
            name, 
            description: description || '' 
        }])
        .select()
        .single();

    if (error) {
        logger.error(`Error creating binder: ${error.message}`);
        throw error;
    }
    
    return data;
}

async function listBinders(userId) {
    logger.info(`Listing binders for user: ${userId}`);
    
    const { data, error } = await supabase
        .from('binders')
        .select(`
            id,
            name,
            description,
            created_at,
            updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        logger.error(`Error listing binders: ${error.message}`);
        throw error;
    }

    // Get chat counts for each binder
    const bindersWithCounts = await Promise.all(
        data.map(async (binder) => {
            const { count } = await supabase
                .from('binder_chats')
                .select('*', { count: 'exact', head: true })
                .eq('binder_id', binder.id);
            
            return {
                ...binder,
                chat_count: count || 0
            };
        })
    );

    return bindersWithCounts;
}

async function getBinder(binderId, userId) {
    logger.info(`Getting binder ${binderId} for user: ${userId}`);
    
    const { data, error } = await supabase
        .from('binders')
        .select(`
            *,
            binder_chats(
                chat_id,
                added_at
            )
        `)
        .eq('id', binderId)
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // Binder not found
        }
        logger.error(`Error getting binder: ${error.message}`);
        throw error;
    }

    // Fetch chat details and chunks for each chat in the binder
    if (data.binder_chats && data.binder_chats.length > 0) {
        const chatsWithChunks = await Promise.all(
            data.binder_chats.map(async (bc) => {
                // Get chat details
                const { data: chat } = await supabase
                    .from('chats')
                    .select('*')
                    .eq('id', bc.chat_id)
                    .single();

                if (chat) {
                    // Get chunks
                    const { data: chunks } = await supabase
                        .from('chat_chunks')
                        .select('*')
                        .eq('chat_id', chat.id)
                        .order('chunk_index');

                    chat.chunks = chunks || [];
                }

                return {
                    ...bc,
                    chat: chat
                };
            })
        );

        data.binder_chats = chatsWithChunks;
    }

    return data;
}

async function mergeBinder(binderId, userId) {
    logger.info(`Merging binder ${binderId} for user: ${userId}`);
    
    const binder = await getBinder(binderId, userId);
    if (!binder) {
        throw new Error('Binder not found or access denied');
    }

    let merged = `# ${binder.name}\n\n`;

    if (binder.description) {
        merged += `${binder.description}\n\n`;
    }

    merged += `---\n\n`;

    if (binder.binder_chats && binder.binder_chats.length > 0) {
        binder.binder_chats.forEach((bc, index) => {
            if (bc.chat && bc.chat.chunks) {
                merged += `## Chat ${index + 1}: ${bc.chat.title}\n\n`;
                merged += `**Source:** ${bc.chat.source} | **Date:** ${new Date(bc.chat.created_at).toLocaleDateString()}\n\n`;
                
                bc.chat.chunks.forEach(chunk => {
                    merged += chunk.content + '\n\n';
                });
                
                merged += `---\n\n`;
            }
        });
    } else {
        merged += `*This binder is empty. Add chats to get started.*\n\n`;
    }

    return merged;
}

async function deleteBinder(binderId, userId) {
    logger.info(`Deleting binder ${binderId} for user: ${userId}`);
    
    // Verify ownership before deleting
    const { data: binder } = await supabase
        .from('binders')
        .select('id')
        .eq('id', binderId)
        .eq('user_id', userId)
        .single();

    if (!binder) {
        throw new Error('Binder not found or access denied');
    }

    const { error } = await supabase
        .from('binders')
        .delete()
        .eq('id', binderId)
        .eq('user_id', userId);

    if (error) {
        logger.error(`Error deleting binder: ${error.message}`);
        throw error;
    }

    return true;
}

async function addChatToBinder(binderId, chatId, userId) {
    logger.info(`Adding chat ${chatId} to binder ${binderId} for user: ${userId}`);
    
    // Verify binder ownership
    const { data: binder } = await supabase
        .from('binders')
        .select('id')
        .eq('id', binderId)
        .eq('user_id', userId)
        .single();

    if (!binder) {
        throw new Error('Binder not found or access denied');
    }

    // Check if chat already in binder
    const { data: existing } = await supabase
        .from('binder_chats')
        .select('*')
        .eq('binder_id', binderId)
        .eq('chat_id', chatId)
        .single();

    if (existing) {
        return existing; // Already exists
    }

    const { data, error } = await supabase
        .from('binder_chats')
        .insert([{
            binder_id: binderId,
            chat_id: chatId
        }])
        .select()
        .single();

    if (error) {
        logger.error(`Error adding chat to binder: ${error.message}`);
        throw error;
    }

    return data;
}

module.exports = {
    createBinder,
    listBinders,
    getBinder,
    mergeBinder,
    deleteBinder,
    addChatToBinder
};
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test connection
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
        
        if (error) throw error;
        logger.info('Database connection successful');
    } catch (error) {
        logger.error('Database connection failed:', error.message);
        throw error;
    }
}

module.exports = { supabase, testConnection };
// Simple user identification middleware
async function identifyUser(req, res, next) {
    // Get user ID from header (Chrome extension will send this)
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }
    
    req.userId = userId;
    next();
}

module.exports = { identifyUser };
const Joi = require('joi');

const schemas = {
    saveChatSchema: Joi.object({
        messages: Joi.array().items(
            Joi.object({
                role: Joi.string().valid('user', 'assistant').required(),
                content: Joi.string().required()
            })
        ).required(),
        url: Joi.string().uri(),
        title: Joi.string(),
        source: Joi.string().valid('chatgpt', 'claude', 'gemini')
    }),
    
    createBinderSchema: Joi.object({
        name: Joi.string().min(1).max(255).required(),
        description: Joi.string().max(1000)
    })
};

function validate(data, schema) {
    const { error, value } = schema.validate(data, { abortEarly: false });
    
    if (error) {
        const messages = error.details.map(d => d.message).join(', ');
        throw new Error(`Validation error: ${messages}`);
    }
    
    return value;
}

module.exports = { validate, schemas };
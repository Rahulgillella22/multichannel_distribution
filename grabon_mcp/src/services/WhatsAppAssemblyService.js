const TemplateRepository = require('../repositories/TemplateRepository');

async function assemble(template_id, variables) {
    const template = await TemplateRepository.findById(template_id);

    // Don't crash the entire send loop for a missing template.
    // Log and return a fallback so other channels/users still get delivered.
    if (!template) {
        console.error(`[WhatsAppAssembly] ⚠️ Template not found: '${template_id}'. Returning fallback message.`);
        const vars = typeof variables === 'string' ? JSON.parse(variables || '{}') : (variables || {});
        const discount = vars.discount || '';
        const merchant = vars.merchant || '';
        const expiry = vars.expiry || '';
        return `${merchant} special offer! ${discount} off. Valid till ${expiry}. Grab now!`;
    }

    let message = template.structure;
    const vars = typeof variables === 'string' ? JSON.parse(variables) : variables;

    Object.entries(vars).forEach(([key, value]) => {
        message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    return message;
}

module.exports = { assemble };

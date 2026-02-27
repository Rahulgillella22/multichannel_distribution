const TemplateRepository = require('../repositories/TemplateRepository');

async function assemble(template_id, variables) {
    const template = await TemplateRepository.findById(template_id);
    if (!template) throw new Error(`Template not found: ${template_id}`);

    let message = template.structure;
    const vars = typeof variables === 'string' ? JSON.parse(variables) : variables;

    Object.entries(vars).forEach(([key, value]) => {
        message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    return message;
}

module.exports = { assemble };

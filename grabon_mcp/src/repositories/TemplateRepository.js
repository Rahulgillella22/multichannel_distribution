const { supabase } = require('../config/supabase');

async function getAllForCategory(category_id) {
    const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .or(`category_id.eq.${category_id},category_id.eq.general`);
    if (error) return [];
    return data;
}

async function findById(template_id) {
    const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_id', template_id)
        .single();
    if (error) return null;
    return data;
}

async function findByFilter(category_id, language, variant) {
    const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('category_id', category_id)
        .eq('language', language)
        .eq('variant', variant)
        .single();
    if (error) return null;
    return data;
}

async function getAllForCategoryGrouped(category_id) {
    const templates = await getAllForCategory(category_id);
    const grouped = { english: {}, hindi: {}, telugu: {} };
    templates.forEach(t => {
        if (grouped[t.language]) {
            grouped[t.language][t.variant] = {
                template_id: t.template_id,
                structure: t.structure,
                use_when: t.use_when,
                variables_needed: extractVariables(t.structure)
            };
        }
    });
    return grouped;
}

function extractVariables(structure) {
    const matches = structure.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

module.exports = { getAllForCategory, findById, findByFilter, getAllForCategoryGrouped };

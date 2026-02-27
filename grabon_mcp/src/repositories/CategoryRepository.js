const { supabase } = require('../config/supabase');

async function findByName(category_name) {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .ilike('category_name', category_name)
        .single();
    if (error) return null;
    return data;
}

async function findById(category_id) {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('category_id', category_id)
        .single();
    if (error) return null;
    return data;
}

async function findAll() {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return [];
    return data;
}

module.exports = { findByName, findById, findAll };

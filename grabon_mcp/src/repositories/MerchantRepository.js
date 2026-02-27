const { supabase } = require('../config/supabase');

async function findById(merchant_id) {
    const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('merchant_id', merchant_id)
        .eq('is_active', true)
        .single();
    if (error) return null;
    return data;
}

async function findAll() {
    const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true);
    if (error) return [];
    return data;
}

module.exports = { findById, findAll };

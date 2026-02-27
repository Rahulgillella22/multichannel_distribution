const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

async function storeAll(coupon_id, contentArray) {
    const rows = contentArray.map(item => ({
        content_id: uuidv4(),
        coupon_id,
        channel: item.channel,
        language: item.language,
        variant: item.variant,
        content: item.content || '',
        subject_line: item.subject_line || null,
        cta_text: item.cta_text || null,
        template_id: item.template_id || null,
        variables: item.variables ? JSON.stringify(item.variables) : null,
        char_count: (item.content || '').length,
        created_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('generated_content').insert(rows);
    if (error) throw new Error(`Failed to store content: ${error.message}`);
    return rows.length;
}

async function findMatch(coupon_id, channel, language, variant) {
    const { data, error } = await supabase
        .from('generated_content')
        .select('*')
        .eq('coupon_id', coupon_id)
        .eq('channel', channel)
        .eq('language', language)
        .eq('variant', variant)
        .single();
    if (error) return null;
    return data;
}

async function countByCoupon(coupon_id) {
    const { count, error } = await supabase
        .from('generated_content')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon_id);
    if (error) return 0;
    return count;
}

module.exports = { storeAll, findMatch, countByCoupon };

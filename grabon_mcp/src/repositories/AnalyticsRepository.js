const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

async function upsert(merchant_id, coupon_id, stats) {
    const date = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
        .from('analytics')
        .select('*')
        .eq('merchant_id', merchant_id)
        .eq('coupon_id', coupon_id)
        .single();

    const delivery_rate = stats.total_sent > 0
        ? (stats.total_delivered / stats.total_sent) * 100
        : 0;

    if (existing) {
        await supabase
            .from('analytics')
            .update({ ...stats, delivery_rate, date })
            .eq('merchant_id', merchant_id)
            .eq('coupon_id', coupon_id);
    } else {
        await supabase.from('analytics').insert([{
            analytics_id: uuidv4(),
            merchant_id,
            coupon_id,
            ...stats,
            delivery_rate,
            date
        }]);
    }
}

async function getMerchantStats(merchant_id = null, date_filter = null) {
    const date = date_filter || new Date().toISOString().split('T')[0];
    let query = supabase
        .from('analytics')
        .select('*, merchants(merchant_name)')
        .eq('date', date);

    if (merchant_id) query = query.eq('merchant_id', merchant_id);
    const { data, error } = await query;
    if (error) return [];
    return data;
}

module.exports = { upsert, getMerchantStats };

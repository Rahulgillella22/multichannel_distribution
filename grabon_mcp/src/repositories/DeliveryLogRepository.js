const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

async function create(logData) {
    const row = {
        log_id: uuidv4(),
        ...logData,
        retry_count: 0,
        sent_at: new Date().toISOString()
    };
    const { error } = await supabase.from('delivery_logs').insert([row]);
    if (error) throw new Error(`Failed to create log: ${error.message}`);
    return row;
}

async function updateRetry(log_id, status, retry_count) {
    const { error } = await supabase
        .from('delivery_logs')
        .update({ status, retry_count, last_retry_at: new Date().toISOString() })
        .eq('log_id', log_id);
    if (error) throw new Error(`Failed to update log: ${error.message}`);
}

async function getFailedLogs(coupon_id) {
    const { data, error } = await supabase
        .from('delivery_logs')
        .select('*')
        .eq('coupon_id', coupon_id)
        .eq('status', 'failed')
        .lt('retry_count', 3);
    if (error) return [];
    return data;
}

async function getSummaryByCoupon(coupon_id) {
    const { data, error } = await supabase
        .from('delivery_logs')
        .select('channel, status')
        .eq('coupon_id', coupon_id);
    if (error) return {};

    const summary = {};
    data.forEach(row => {
        if (!summary[row.channel]) {
            summary[row.channel] = { sent: 0, delivered: 0, failed: 0, retried: 0 };
        }
        summary[row.channel].sent++;
        if (row.status === 'delivered') summary[row.channel].delivered++;
        if (row.status === 'failed' || row.status === 'permanently_failed') summary[row.channel].failed++;
    });

    return summary;
}

module.exports = { create, updateRetry, getFailedLogs, getSummaryByCoupon };

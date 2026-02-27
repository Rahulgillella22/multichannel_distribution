const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

async function create(coupon_id, scheduled_at) {
    const row = {
        queue_id: uuidv4(),
        coupon_id,
        scheduled_at,
        status: 'waiting',
        created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
        .from('schedule_queue')
        .insert([row])
        .select()
        .single();
    if (error) throw new Error(`Failed to queue: ${error.message}`);
    return data;
}

async function getDueItems() {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('schedule_queue')
        .select('*')
        .lte('scheduled_at', now)
        .eq('status', 'waiting');
    if (error) return [];
    return data;
}

async function updateStatus(queue_id, status) {
    const { error } = await supabase
        .from('schedule_queue')
        .update({ status })
        .eq('queue_id', queue_id);
    if (error) throw new Error(`Failed to update queue: ${error.message}`);
}

module.exports = { create, getDueItems, updateStatus };

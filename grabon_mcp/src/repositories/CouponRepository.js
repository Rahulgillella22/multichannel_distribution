const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

async function create(couponData) {
    const newCoupon = {
        coupon_id: uuidv4(),
        ...couponData,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('coupons')
        .insert([newCoupon])
        .select()
        .single();

    if (error) throw new Error(`Failed to create coupon: ${error.message}`);
    return data;
}

async function findById(coupon_id) {
    const { data, error } = await supabase
        .from('coupons')
        .select('*, merchants(merchant_name), categories(category_name)')
        .eq('coupon_id', coupon_id)
        .single();
    if (error) return null;
    return data;
}

async function updateStatus(coupon_id, status) {
    const { error } = await supabase
        .from('coupons')
        .update({ status })
        .eq('coupon_id', coupon_id);
    if (error) throw new Error(`Failed to update coupon status: ${error.message}`);
}

async function getTodayCoupons(merchant_id = null) {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
        .from('coupons')
        .select('*')
        .gte('created_at', `${today}T00:00:00`);

    if (merchant_id) query = query.eq('merchant_id', merchant_id);
    const { data, error } = await query;
    if (error) return [];
    return data;
}

module.exports = { create, findById, updateStatus, getTodayCoupons };

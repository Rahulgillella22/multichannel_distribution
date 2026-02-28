const MerchantRepository = require('../repositories/MerchantRepository');
const CategoryRepository = require('../repositories/CategoryRepository');

const VALID_CATEGORIES = ['food', 'jewellery', 'fashion', 'travel', 'electronics', 'grocery'];
const VALID_URGENCY = ['emergency', 'scheduled'];
const VALID_DISCOUNT_TYPES = ['percentage', 'flat'];

// In-memory rate limiting
const rateLimitMap = new Map();

async function validate(params) {
    const errors = [];

    // merchant_id
    const merchant = await MerchantRepository.findById(params.merchant_id);
    if (!merchant) errors.push('Merchant not found or inactive');

    // category
    if (!VALID_CATEGORIES.includes(params.category)) {
        errors.push(`Invalid category. Valid: ${VALID_CATEGORIES.join('/')}`);
    }

    // discount_type
    if (!VALID_DISCOUNT_TYPES.includes(params.discount_type)) {
        errors.push('discount_type must be percentage or flat');
    }

    // discount_value
    const dv = Number(params.discount_value);
    if (!dv || dv <= 0) errors.push('discount_value must be a positive number');
    if (params.discount_type === 'percentage' && dv >= 96) errors.push('Percentage discount cannot be 96% or above — maximum allowed is 95%');
    if (params.discount_type === 'flat' && dv > 1000) errors.push('Flat discount cannot exceed ₹1000');

    // expiry_timestamp
    const expiry = new Date(params.expiry_timestamp);
    if (isNaN(expiry.getTime())) errors.push('expiry_timestamp must be a valid ISO datetime');
    else if (expiry <= new Date()) errors.push('Expiry must be a future date');

    // min_order_value
    if (params.min_order_value !== undefined && Number(params.min_order_value) < 0) {
        errors.push('Min order cannot be negative');
    }

    // max_redemptions
    if (params.max_redemptions !== undefined && params.max_redemptions !== null) {
        if (!Number.isInteger(Number(params.max_redemptions)) || Number(params.max_redemptions) <= 0) {
            errors.push('max_redemptions must be a positive integer');
        }
    }

    // urgency
    const urgency = params.urgency || 'scheduled';
    if (!VALID_URGENCY.includes(urgency)) {
        errors.push('urgency must be emergency or scheduled');
    }

    // Rate limiting: max 10 deals per minute per merchant
    if (merchant) {
        const now = Date.now();
        const key = params.merchant_id;
        const entry = rateLimitMap.get(key) || { count: 0, window_start: now };
        if (now - entry.window_start > 60000) {
            rateLimitMap.set(key, { count: 1, window_start: now });
        } else {
            entry.count++;
            if (entry.count > 10) {
                errors.push('Rate limit exceeded. Max 10 deals per minute per merchant.');
            }
            rateLimitMap.set(key, entry);
        }
    }

    return { valid: errors.length === 0, errors, merchant };
}

module.exports = { validate };

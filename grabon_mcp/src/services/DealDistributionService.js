const InputValidator = require('../validators/InputValidator');
const MerchantRepository = require('../repositories/MerchantRepository');
const CouponRepository = require('../repositories/CouponRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const UserRepository = require('../repositories/UserRepository');
const TemplateRepository = require('../repositories/TemplateRepository');

const CULTURAL_INSTRUCTIONS = {
    telugu: `Write Telugu like a friend from Hyderabad texting on WhatsApp.
Use natural spoken Telugu — NOT formal bookish Telugu.
Telugu urgency uses community and family context more than individual FOMO.
Urgency phrases: ఇప్పుడే తీసుకోండి, అవకాశం వదులుకోకండి, చాలా తక్కువ సమయం.
Value phrases: బాగా ఆదా అవుతుంది, చాలా మంచి డీల్.
NEVER directly translate English idioms — rewrite culturally.
Food deals: warmth, home cooking comfort, family meal references.
Jewellery: gold is auspicious — use precious, occasion-based, celebratory references.`,

    hindi: `Write Hindi like a Delhi or Mumbai friend texting casually.
Hinglish (Hindi + English mix) is completely natural and acceptable.
Hindi urgency is more direct and assertive than Telugu.
Urgency phrases: अभी लो, मौका मत गँवाओ, सीमित समय.
Value phrases: बचाओ पैसे, धमाकेदार डील, बढ़िया offer.
Food deals: relatable everyday language, chai-break casual tone.
Jewellery: aspirational and festive — Diwali and shaadi references work well.`,

    english: `Write Indian English for urban Indian millennials.
Not American English. Not British English.
Always use ₹ symbol — never Rs or INR in copy.
Time references in IST context.
Casual and fun for food and fashion categories.
Premium and sophisticated for jewellery and exclusive deals.`
};

const CHANNEL_LIMITS = {
    email: 'subject_line + headline + cta_text — no char limit — must have all three fields',
    whatsapp: 'MUST use provided templates ONLY — fill variables only — do NOT write free-form text',
    push: 'format as "title|body" — title max 50 chars + body max 100 chars — separate with pipe character',
    glance: 'max 160 chars — must work standalone without any context',
    payu: 'max 40 chars — must be action-oriented — start with a verb',
    instagram: 'caption + minimum 3 hashtags — max 100 char limit'
};

async function initiateDeal(params) {
    // Validate
    const validation = await InputValidator.validate(params);
    if (!validation.valid) {
        return { error: true, errors: validation.errors };
    }

    const merchant = validation.merchant;
    const category_name = params.category;

    // Get or create category_id
    const category = await CategoryRepository.findByName(category_name);
    const category_id = category ? category.category_id : category_name;

    // Create coupon in DB
    const coupon = await CouponRepository.create({
        merchant_id: params.merchant_id,
        category_id,
        discount_value: Number(params.discount_value),
        discount_type: params.discount_type,
        expiry_timestamp: params.expiry_timestamp,
        min_order_value: Number(params.min_order_value || 0),
        max_redemptions: params.max_redemptions || null,
        exclusive_flag: params.exclusive_flag || false,
        urgency: params.urgency || 'scheduled'
    });

    // Get category style
    const categoryStyle = category ? {
        tone: category.tone,
        style_guide: category.style_guide,
        example_words: category.example_words,
        avoid: category.avoid || 'formal / passive / generic language'
    } : {
        tone: 'friendly and engaging',
        style_guide: 'Write clearly and persuasively for Indian urban audience',
        example_words: 'Grab, Save, Exclusive, Now, Deal',
        avoid: 'formal language'
    };

    // Get eligible users summary
    const eligibleUsersSummary = await UserRepository.getEligibleUsersSummary(category_id);

    // Get WhatsApp templates
    const waTemplates = await TemplateRepository.getAllForCategoryGrouped(category_id);

    return {
        coupon_id: coupon.coupon_id,
        validation: 'passed',
        merchant_name: merchant.merchant_name,
        category_style: categoryStyle,
        eligible_users_summary: eligibleUsersSummary,
        whatsapp_templates: waTemplates,
        cultural_instructions: CULTURAL_INSTRUCTIONS,
        channel_limits: CHANNEL_LIMITS
    };
}

module.exports = { initiateDeal };

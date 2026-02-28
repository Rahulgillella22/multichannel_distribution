const DealDistributionService = require('../services/DealDistributionService');
const OutputValidator = require('../validators/OutputValidator');
const GeneratedContentRepository = require('../repositories/GeneratedContentRepository');
const WebhookService = require('../services/WebhookService');
const SchedulerService = require('../services/SchedulerService');
const AnalyticsService = require('../services/AnalyticsService');
const CategoryRepository = require('../repositories/CategoryRepository');
const UserRepository = require('../repositories/UserRepository');
const TemplateRepository = require('../repositories/TemplateRepository');

function ok(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(message) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: true, message }, null, 2) }], isError: true };
}

const TOOL_DEFINITIONS = [
    {
        name: 'distribute_deal',
        description: `PRIMARY ENTRY POINT for the entire deal distribution pipeline.
Call this when a merchant wants to distribute a deal across all channels.
This tool:
1. Validates all inputs (merchant exists, category valid, discount valid, expiry future)
2. Saves deal to coupons table in Supabase with unique coupon_id
3. Returns category style guide so Claude knows the tone to use
4. Returns eligible user summary so Claude knows audience and languages needed
5. Returns ALL WhatsApp template structures for all language+variant combinations
6. Returns cultural instructions per language
7. Returns channel character limits
After calling this tool Claude must:
- Read category_style carefully before writing any content
- Read cultural_instructions before writing in Telugu or Hindi
- For WhatsApp: fill variables into provided templates ONLY — never free-form text
- For push: format content as "title|body" separated by pipe character
- For all other channels: write freely using category style and cultural instructions
- Generate all 54 strings (6 channels × 3 variants × 3 languages)
- Then call store_generated_content with all 54 strings
- Then call send_to_webhooks_immediate if urgency=emergency
- Or call store_in_schedule_queue if urgency=scheduled`,
        inputSchema: {
            type: 'object',
            properties: {
                merchant_id: { type: 'string', description: 'Must exist in merchants table in Supabase' },
                category: { type: 'string', description: 'food/jewellery/fashion/travel/electronics/grocery' },
                discount_value: { type: 'number', description: 'e.g. 30 for 30% or 150 for flat ₹150 off' },
                discount_type: { type: 'string', description: 'percentage or flat' },
                expiry_timestamp: { type: 'string', description: 'ISO datetime e.g. 2025-03-02T23:59:00' },
                min_order_value: { type: 'number', description: 'optional, default 0' },
                max_redemptions: { type: 'number', description: 'optional, default unlimited' },
                exclusive_flag: { type: 'boolean', description: 'optional, default false' },
                urgency: { type: 'string', description: 'emergency or scheduled' }
            },
            required: ['merchant_id', 'category', 'discount_value', 'discount_type', 'expiry_timestamp', 'urgency']
        }
    },
    {
        name: 'store_generated_content',
        description: `Call this after generating ALL 54 strings.
Pass complete array of all 54 content objects.
This tool validates every string before storing:
VALIDATION RULES:
- push content must be formatted as "title|body" — title <= 50 chars, body <= 100 chars
- glance content must be <= 160 chars
- payu banner_text must be <= 40 chars
- email must have subject_line, content (headline), and cta_text
- instagram must have minimum 3 hashtags (#) in content
- all 54 combinations must be present (6 channels × 3 variants × 3 languages)
- urgency and value variants must not be identical for same channel+language
WHATSAPP RULE:
- WhatsApp entries must have template_id and variables object
- WhatsApp content field should be empty string
If any validation fails this tool returns exactly which strings failed
so Claude can regenerate ONLY those specific strings and call this tool again.`,
        inputSchema: {
            type: 'object',
            properties: {
                coupon_id: { type: 'string' },
                content_array: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            channel: { type: 'string' },
                            language: { type: 'string' },
                            variant: { type: 'string' },
                            content: { type: 'string' },
                            subject_line: { type: 'string' },
                            cta_text: { type: 'string' },
                            template_id: { type: 'string' },
                            variables: { type: 'object' }
                        },
                        required: ['channel', 'language', 'variant', 'content']
                    }
                }
            },
            required: ['coupon_id', 'content_array']
        }
    },
    {
        name: 'send_to_webhooks_immediate',
        description: `Use ONLY for emergency deals after store_generated_content returns success.
This tool handles ALL sending internally — Claude does not need to loop through users.
Internally this tool:
1. Fetches all eligible users from Supabase (filtered by category preference)
2. For each user determines correct language (from user profile or city)
3. For each user determines correct variant (from user activity history)
4. Fetches matching content from generated_content table
5. For WhatsApp: assembles final message from template + variables
6. Fires HTTP POST to all 6 mock channel endpoints for each user
7. Logs every attempt to delivery_logs table
8. Automatically retries failed deliveries (up to 3 attempts, after 5 minutes)
9. Updates analytics table
10. Returns complete delivery report`,
        inputSchema: {
            type: 'object',
            properties: {
                coupon_id: { type: 'string', description: 'The coupon_id returned by distribute_deal' }
            },
            required: ['coupon_id']
        }
    },
    {
        name: 'store_in_schedule_queue',
        description: `Use for non-emergency scheduled deals after store_generated_content returns success.
Category timing rules:
  food        → next 11:30 or 18:30
  jewellery   → next 10:00 or 18:00
  fashion     → next 10:00 or 20:00
  travel      → next Friday 18:00
  electronics → next Saturday 10:00
  grocery     → next Sunday 09:00
After calling this tool Claude's job is COMPLETE. 
The scheduler handles all sending at the correct time automatically.`,
        inputSchema: {
            type: 'object',
            properties: {
                coupon_id: { type: 'string' },
                category: { type: 'string', description: 'Used to calculate correct send_at time' }
            },
            required: ['coupon_id', 'category']
        }
    },
    {
        name: 'get_delivery_report',
        description: 'Fetches complete delivery status report for a specific coupon. Shows per-channel delivery rates, retry counts, and overall success rate.',
        inputSchema: {
            type: 'object',
            properties: {
                coupon_id: { type: 'string' }
            },
            required: ['coupon_id']
        }
    },
    {
        name: 'get_merchant_analytics',
        description: 'Fetches analytics for merchant reporting. If merchant_id is empty returns all merchants and company totals.',
        inputSchema: {
            type: 'object',
            properties: {
                merchant_id: { type: 'string', description: 'Optional — empty string for all merchants' },
                date_filter: { type: 'string', description: 'Optional ISO date — defaults to today' }
            }
        }
    },
    {
        name: 'get_category_style',
        description: 'Fetches tone, style guide, example words and things to avoid for a given category. NOTE: distribute_deal already returns this inside category_style.',
        inputSchema: {
            type: 'object',
            properties: {
                category: { type: 'string' }
            },
            required: ['category']
        }
    },
    {
        name: 'get_eligible_users',
        description: 'Fetches summary of all users eligible for a deal of given category. Returns count and breakdown by language and city.',
        inputSchema: {
            type: 'object',
            properties: {
                category: { type: 'string' },
                location_filter: { type: 'string', description: 'Optional — filter by city' }
            },
            required: ['category']
        }
    },
    {
        name: 'get_whatsapp_templates',
        description: `Fetches available pre-defined WhatsApp template structures.
CRITICAL RULE — Claude must follow this always:
  Claude must NEVER write free-form WhatsApp text.
  Claude must ONLY fill {{variables}} in pre-defined template structures.
  Variables: {{merchant}} {{discount}} {{min_order}} {{expiry}} {{product_type}} {{destination}}
NOTE: distribute_deal already returns all WA templates. Only call this separately if needed.`,
        inputSchema: {
            type: 'object',
            properties: {
                category: { type: 'string' },
                language: { type: 'string', description: 'english/hindi/telugu' },
                variant: { type: 'string', description: 'urgency/value/social_proof' }
            },
            required: ['category', 'language', 'variant']
        }
    }
];

async function handleToolCall(name, args) {
    // 🔒 SAFETY GUARD: Block any tool name that suggests destructive operations
    const BLOCKED_KEYWORDS = ['delete', 'remove', 'drop', 'truncate', 'destroy', 'clear', 'purge', 'wipe'];
    if (BLOCKED_KEYWORDS.some(kw => name.toLowerCase().includes(kw))) {
        return err('🚫 Destructive operations are permanently disabled on this MCP server. Claude cannot delete any database records.');
    }

    switch (name) {
        case 'distribute_deal': {
            const result = await DealDistributionService.initiateDeal(args);
            if (result.error) return err(result.errors.join(', '));
            return ok(result);
        }

        case 'store_generated_content': {
            const { coupon_id, content_array } = args;
            const validation = OutputValidator.validateAll(content_array);
            if (!validation.valid) {
                return ok({
                    success: false,
                    stored_count: 0,
                    failed_validations: validation.errors,
                    message: 'Fix the above validation errors and call store_generated_content again with corrected strings.'
                });
            }
            const count = await GeneratedContentRepository.storeAll(coupon_id, content_array);
            return ok({ success: true, stored_count: count, coupon_id });
        }

        case 'send_to_webhooks_immediate': {
            const result = await WebhookService.sendImmediate(args.coupon_id);
            return ok(result);
        }

        case 'store_in_schedule_queue': {
            const { coupon_id, category } = args;
            const result = await SchedulerService.queueDeal(coupon_id, category);
            const sendTime = new Date(result.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            return ok({
                success: true,
                coupon_id,
                scheduled_at: result.scheduled_at,
                scheduled_at_IST: sendTime,
                category,
                message: `Deal queued. Scheduler will send at ${sendTime} IST. Claude job complete.`
            });
        }

        case 'get_delivery_report': {
            const report = await AnalyticsService.getDeliveryReport(args.coupon_id);
            return ok(report);
        }

        case 'get_merchant_analytics': {
            const report = await AnalyticsService.getMerchantAnalytics(args.merchant_id || null, args.date_filter || null);
            return ok(report);
        }

        case 'get_category_style': {
            const category = await CategoryRepository.findByName(args.category);
            if (!category) return err(`Category '${args.category}' not found`);
            return ok({ category: args.category, tone: category.tone, style_guide: category.style_guide, example_words: category.example_words });
        }

        case 'get_eligible_users': {
            const summary = await UserRepository.getEligibleUsersSummary(args.category);
            return ok(summary);
        }

        case 'get_whatsapp_templates': {
            const template = await TemplateRepository.findByFilter(args.category, args.language, args.variant);
            return ok(template ? [template] : []);
        }

        default:
            return err(`Unknown tool: ${name}`);
    }
}

module.exports = { TOOL_DEFINITIONS, handleToolCall };

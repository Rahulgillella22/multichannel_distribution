const CHANNELS = ['email', 'whatsapp', 'push', 'glance', 'payu', 'instagram'];
const VARIANTS = ['urgency', 'value', 'social_proof'];
const LANGUAGES = ['english', 'hindi', 'telugu'];

function validateAll(contentArray) {
    const errors = [];
    const seen = new Set();

    contentArray.forEach((item, idx) => {
        const key = `${item.channel}-${item.language}-${item.variant}`;
        seen.add(key);

        if (item.channel === 'push') {
            const parts = item.content.split('|');
            const title = (parts[0] || '').trim();
            const body = (parts[1] || '').trim();
            if (title.length > 50) {
                errors.push({
                    channel: item.channel, language: item.language, variant: item.variant,
                    error: `push title ${title.length} chars, max 50`
                });
            }
            if (body.length > 100) {
                errors.push({
                    channel: item.channel, language: item.language, variant: item.variant,
                    error: `push body ${body.length} chars, max 100`
                });
            }
        }

        if (item.channel === 'glance' && (item.content || '').length > 160) {
            errors.push({
                channel: item.channel, language: item.language, variant: item.variant,
                error: `glance ${item.content.length} chars, max 160`
            });
        }

        if (item.channel === 'payu' && (item.content || '').length > 40) {
            errors.push({
                channel: item.channel, language: item.language, variant: item.variant,
                error: `payu ${item.content.length} chars, max 40`
            });
        }

        if (item.channel === 'email') {
            if (!item.subject_line) errors.push({ channel: 'email', language: item.language, variant: item.variant, error: 'email missing subject_line' });
            if (!item.content) errors.push({ channel: 'email', language: item.language, variant: item.variant, error: 'email missing content (headline)' });
            if (!item.cta_text) errors.push({ channel: 'email', language: item.language, variant: item.variant, error: 'email missing cta_text' });
        }

        if (item.channel === 'instagram') {
            const hashtagCount = (item.content || '').split('#').length - 1;
            if (hashtagCount < 3) {
                errors.push({
                    channel: 'instagram', language: item.language, variant: item.variant,
                    error: `instagram needs minimum 3 hashtags, found ${hashtagCount}`
                });
            }
        }

        if (item.channel === 'whatsapp') {
            if (!item.template_id) {
                errors.push({
                    channel: 'whatsapp', language: item.language, variant: item.variant,
                    error: 'whatsapp must use template_id — not free-form content'
                });
            }
            if (!item.variables || Object.keys(item.variables || {}).length === 0) {
                errors.push({
                    channel: 'whatsapp', language: item.language, variant: item.variant,
                    error: 'whatsapp variables object is missing or empty'
                });
            }
        }
    });

    // Check all 54 combinations present
    const missing = [];
    CHANNELS.forEach(ch => {
        VARIANTS.forEach(v => {
            LANGUAGES.forEach(lang => {
                if (!seen.has(`${ch}-${lang}-${v}`)) {
                    missing.push(`${ch}-${lang}-${v}`);
                }
            });
        });
    });
    if (missing.length > 0) {
        errors.push({ error: `Missing combinations: ${missing.join(', ')}` });
    }

    // Variant diversity check
    CHANNELS.forEach(ch => {
        LANGUAGES.forEach(lang => {
            const u = contentArray.find(i => i.channel === ch && i.language === lang && i.variant === 'urgency');
            const v = contentArray.find(i => i.channel === ch && i.language === lang && i.variant === 'value');
            const s = contentArray.find(i => i.channel === ch && i.language === lang && i.variant === 'social_proof');
            if (u && v && u.content && v.content && u.content === v.content) {
                errors.push({ error: `Variants identical for ${ch}-${lang}: urgency and value are same string` });
            }
        });
    });

    return { valid: errors.length === 0, errors };
}

module.exports = { validateAll };

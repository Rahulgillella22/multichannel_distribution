const http = require('http');
const UserRepository = require('../repositories/UserRepository');
const GeneratedContentRepository = require('../repositories/GeneratedContentRepository');
const DeliveryLogRepository = require('../repositories/DeliveryLogRepository');
const AnalyticsRepository = require('../repositories/AnalyticsRepository');
const CouponRepository = require('../repositories/CouponRepository');
const WhatsAppAssemblyService = require('./WhatsAppAssemblyService');

const TELUGU_CITIES = ['hyderabad', 'vijayawada', 'vizag', 'visakhapatnam', 'warangal', 'tirupati'];
const HINDI_CITIES = ['mumbai', 'delhi', 'jaipur', 'lucknow', 'agra', 'bhopal', 'indore', 'kanpur'];

function determineLanguage(user) {
    if (user.preferred_language) return user.preferred_language;
    const city = (user.locations?.city || '').toLowerCase();
    if (TELUGU_CITIES.some(c => city.includes(c))) return 'telugu';
    if (HINDI_CITIES.some(c => city.includes(c))) return 'hindi';
    return 'english';
}

function determineVariant(user) {
    const now = new Date();
    const lastActive = new Date(user.last_active_at || user.created_at);
    const created = new Date(user.created_at);
    const daysSinceActive = (now - lastActive) / (1000 * 60 * 60 * 24);
    const accountAgeDays = (now - created) / (1000 * 60 * 60 * 24);
    if (daysSinceActive > 30) return 'social_proof';
    if (accountAgeDays < 7) return 'value';
    return 'urgency';
}

function shouldSendChannel(channel, user) {
    const hour = new Date().getHours();
    if (channel === 'push') {
        if (hour >= 22 || hour < 8) return false;
        return !!user.device_token;
    }
    if (channel === 'whatsapp') return !!user.phone;
    if (channel === 'email') return !!user.email;
    return true; // glance, payu, instagram always
}

function buildPayload(channel, content, user) {
    const base = { coupon_id: content.coupon_id, language: content.language, variant: content.variant };
    switch (channel) {
        case 'email': return { ...base, subject: content.subject_line, content: content.content, cta_text: content.cta_text };
        case 'whatsapp': return { ...base, assembled_message: content._assembled };
        case 'push': {
            const [title, body] = content.content.split('|').map(s => s.trim());
            return { ...base, title, body };
        }
        case 'glance': return { ...base, content: content.content };
        case 'payu': return { ...base, banner_text: content.content };
        case 'instagram': return { ...base, caption: content.content };
        default: return base;
    }
}

async function postToWebhook(channel, payload) {
    return new Promise((resolve) => {
        const data = JSON.stringify(payload);
        const req = http.request({
            hostname: 'localhost', port: 3001,
            path: `/mock/${channel}`, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch { resolve({ status: 'failed' }); }
            });
        });
        req.on('error', () => resolve({ status: 'failed' }));
        req.write(data);
        req.end();
    });
}

async function retryFailedLogs(coupon_id, category_id) {
    const failed = await DeliveryLogRepository.getFailedLogs(coupon_id);
    for (const log of failed) {
        const content = await GeneratedContentRepository.findMatch(coupon_id, log.channel, log.language, log.variant);
        if (!content) continue;

        let processedContent = { ...content, coupon_id };
        if (log.channel === 'whatsapp' && content.template_id) {
            processedContent._assembled = await WhatsAppAssemblyService.assemble(content.template_id, content.variables);
        }

        const payload = buildPayload(log.channel, processedContent, {});
        const result = await postToWebhook(log.channel, payload);
        const newStatus = result.status === 'delivered' ? 'delivered' : (log.retry_count >= 2 ? 'permanently_failed' : 'failed');
        await DeliveryLogRepository.updateRetry(log.log_id, newStatus, log.retry_count + 1);
    }
}

async function sendImmediate(coupon_id) {
    const coupon = await CouponRepository.findById(coupon_id);
    if (!coupon) throw new Error('Coupon not found');

    const category_id = coupon.category_id;
    const users = await UserRepository.getEligibleUsersForCategory(category_id);
    const channels = ['email', 'whatsapp', 'push', 'glance', 'payu', 'instagram'];

    const summary = {};
    channels.forEach(ch => { summary[ch] = { sent: 0, delivered: 0, failed: 0 }; });

    for (const user of users) {
        const language = determineLanguage(user);
        const variant = determineVariant(user);

        for (const channel of channels) {
            if (!shouldSendChannel(channel, user)) continue;

            const content = await GeneratedContentRepository.findMatch(coupon_id, channel, language, variant);
            if (!content) continue;

            let processedContent = { ...content, coupon_id };
            if (channel === 'whatsapp' && content.template_id) {
                processedContent._assembled = await WhatsAppAssemblyService.assemble(content.template_id, content.variables);
            }

            const payload = buildPayload(channel, processedContent, user);
            const result = await postToWebhook(channel, payload);
            const status = result.status || 'failed';

            await DeliveryLogRepository.create({ coupon_id, channel, language, variant, status });
            summary[channel].sent++;
            if (status === 'delivered') summary[channel].delivered++;
            else summary[channel].failed++;
        }
    }

    // Retry failed deliveries after delay (non-blocking)
    setTimeout(() => retryFailedLogs(coupon_id, category_id), 5 * 60 * 1000);

    // Analytics
    const totalSent = Object.values(summary).reduce((a, s) => a + s.sent, 0);
    const totalDelivered = Object.values(summary).reduce((a, s) => a + s.delivered, 0);
    const totalFailed = Object.values(summary).reduce((a, s) => a + s.failed, 0);
    await AnalyticsRepository.upsert(coupon.merchant_id, coupon_id, {
        total_sent: totalSent, total_delivered: totalDelivered, total_failed: totalFailed
    });

    await CouponRepository.updateStatus(coupon_id, 'sent');

    const deliverySummary = {};
    channels.forEach(ch => {
        const s = summary[ch];
        const rate = s.sent > 0 ? ((s.delivered / s.sent) * 100).toFixed(1) + '%' : 'N/A';
        deliverySummary[ch] = { ...s, rate };
    });

    const overallRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) + '%' : '0%';

    return {
        coupon_id,
        total_users_targeted: users.length,
        delivery_summary: deliverySummary,
        overall_delivery_rate: overallRate,
        retry_summary: 'Failed deliveries queued for retry in 5 minutes (up to 3 attempts)'
    };
}

module.exports = { sendImmediate };

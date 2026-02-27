const express = require('express');
const app = express();
app.use(express.json());

const CHANNELS = ['email', 'whatsapp', 'push', 'glance', 'payu', 'instagram'];

function randomStatus() {
    const r = Math.random();
    if (r < 0.80) return 'delivered';
    if (r < 0.95) return 'failed';
    return 'pending';
}

function makeEndpoint(channel, validateFn) {
    return (req, res) => {
        const body = req.body;
        const validationError = validateFn(body);
        if (validationError) {
            return res.status(400).json({ status: 'failed', channel, error: validationError, timestamp: new Date().toISOString() });
        }
        const status = randomStatus();
        return res.json({ status, channel, coupon_id: body.coupon_id, timestamp: new Date().toISOString() });
    };
}

app.post('/mock/email', makeEndpoint('email', (b) => {
    if (!b.subject || !b.content) return 'subject and content are required';
    return null;
}));

app.post('/mock/whatsapp', makeEndpoint('whatsapp', (b) => {
    if (!b.assembled_message) return 'assembled_message is required';
    return null;
}));

app.post('/mock/push', makeEndpoint('push', (b) => {
    if (!b.title || !b.body) return 'title and body are required';
    return null;
}));

app.post('/mock/glance', makeEndpoint('glance', (b) => {
    if (!b.content) return 'content is required';
    return null;
}));

app.post('/mock/payu', makeEndpoint('payu', (b) => {
    if (!b.banner_text) return 'banner_text is required';
    return null;
}));

app.post('/mock/instagram', makeEndpoint('instagram', (b) => {
    if (!b.caption) return 'caption is required';
    return null;
}));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', endpoints: CHANNELS.map(c => `/mock/${c}`) });
});

function startMockWebhookServer() {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        process.stderr.write(`Mock webhook server running on port ${PORT}\n`);
    });
}

module.exports = { startMockWebhookServer, app };

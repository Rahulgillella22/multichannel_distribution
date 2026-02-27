const schedule = require('node-schedule');
const ScheduleQueueRepository = require('../repositories/ScheduleQueueRepository');
const WebhookService = require('./WebhookService');

const CATEGORY_SEND_TIMES = {
    food: [{ hour: 11, minute: 30 }, { hour: 18, minute: 30 }],
    jewellery: [{ hour: 10, minute: 0 }, { hour: 18, minute: 0 }],
    fashion: [{ hour: 10, minute: 0 }, { hour: 20, minute: 0 }],
    travel: [{ hour: 18, minute: 0, weekday: 5 }], // Friday
    electronics: [{ hour: 10, minute: 0, weekday: 6 }], // Saturday
    grocery: [{ hour: 9, minute: 0, weekday: 0 }]  // Sunday
};

function calculateSendTime(category) {
    const now = new Date();
    const slots = CATEGORY_SEND_TIMES[category];
    if (!slots) {
        const next = new Date(now.getTime() + 60 * 60 * 1000);
        return next.toISOString();
    }

    for (const slot of slots) {
        const candidate = new Date(now);
        if (slot.weekday !== undefined) {
            const daysUntil = (slot.weekday - now.getDay() + 7) % 7 || 7;
            candidate.setDate(candidate.getDate() + daysUntil);
        }
        candidate.setHours(slot.hour, slot.minute, 0, 0);
        if (candidate > now) return candidate.toISOString();
    }

    // All slots today passed — use first slot tomorrow
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(slots[0].hour, slots[0].minute, 0, 0);
    return next.toISOString();
}

async function queueDeal(coupon_id, category) {
    const scheduled_at = calculateSendTime(category);

    // Reject if less than 15 minutes ahead
    const minutesUntil = (new Date(scheduled_at) - new Date()) / 60000;
    if (minutesUntil < 15) {
        throw new Error('Please schedule minimum 15 minutes ahead or use urgency=emergency');
    }

    const queueItem = await ScheduleQueueRepository.create(coupon_id, scheduled_at);

    // Schedule the job
    schedule.scheduleJob(scheduled_at, async () => {
        await processQueueItem(queueItem.queue_id, coupon_id);
    });

    return { queue_id: queueItem.queue_id, scheduled_at };
}

async function processQueueItem(queue_id, coupon_id) {
    try {
        await ScheduleQueueRepository.updateStatus(queue_id, 'processing');
        await WebhookService.sendImmediate(coupon_id);
        await ScheduleQueueRepository.updateStatus(queue_id, 'sent');
    } catch (err) {
        await ScheduleQueueRepository.updateStatus(queue_id, 'failed');
        process.stderr.write(`Scheduler error for ${coupon_id}: ${err.message}\n`);
    }
}

async function initScheduler() {
    // On startup: catch up on any missed scheduled items
    const dueItems = await ScheduleQueueRepository.getDueItems();
    for (const item of dueItems) {
        process.stderr.write(`Catching up missed schedule: ${item.queue_id}\n`);
        await processQueueItem(item.queue_id, item.coupon_id);
    }
    process.stderr.write(`Scheduler initialized. ${dueItems.length} missed items processed.\n`);
}

module.exports = { queueDeal, initScheduler, calculateSendTime };

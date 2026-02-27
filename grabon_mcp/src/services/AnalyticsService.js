const AnalyticsRepository = require('../repositories/AnalyticsRepository');
const DeliveryLogRepository = require('../repositories/DeliveryLogRepository');
const CouponRepository = require('../repositories/CouponRepository');
const MerchantRepository = require('../repositories/MerchantRepository');

async function getDeliveryReport(coupon_id) {
    const coupon = await CouponRepository.findById(coupon_id);
    if (!coupon) throw new Error('Coupon not found');

    const channelSummary = await DeliveryLogRepository.getSummaryByCoupon(coupon_id);

    let totalSent = 0, totalDelivered = 0, totalFailed = 0;
    Object.values(channelSummary).forEach(s => {
        totalSent += s.sent;
        totalDelivered += s.delivered;
        totalFailed += s.failed;
    });

    const overallRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) + '%' : '0%';

    return {
        coupon_id,
        merchant: coupon.merchants?.merchant_name || coupon.merchant_id,
        category: coupon.category_id,
        urgency: coupon.urgency,
        status: coupon.status,
        total_strings_generated: 54,
        channels: channelSummary,
        overall_delivery_rate: overallRate
    };
}

async function getMerchantAnalytics(merchant_id = null, date_filter = null) {
    const stats = await AnalyticsRepository.getMerchantStats(merchant_id, date_filter);
    const merchants = await MerchantRepository.findAll();
    const merchantMap = {};
    merchants.forEach(m => { merchantMap[m.merchant_id] = m.merchant_name; });

    const merchantReports = stats.map(s => ({
        merchant_id: s.merchant_id,
        merchant_name: s.merchants?.merchant_name || merchantMap[s.merchant_id] || s.merchant_id,
        coupons_today: 1,
        total_delivered: s.total_delivered,
        total_failed: s.total_failed,
        delivery_rate: s.delivery_rate ? s.delivery_rate.toFixed(1) + '%' : '0%'
    }));

    const totalDeals = stats.length;
    const totalDelivered = stats.reduce((a, s) => a + s.total_delivered, 0);
    const totalSent = stats.reduce((a, s) => a + s.total_sent, 0);
    const overallRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) + '%' : '0%';

    const topMerchant = merchantReports.sort((a, b) => b.total_delivered - a.total_delivered)[0];

    return {
        date: date_filter || new Date().toISOString().split('T')[0],
        top_merchant_today: topMerchant ? `${topMerchant.merchant_name} — ${topMerchant.coupons_today} deals` : 'No data',
        merchants: merchantReports,
        company_totals: {
            total_deals_today: totalDeals,
            total_strings_generated: totalDeals * 54,
            overall_delivery_rate: overallRate
        }
    };
}

module.exports = { getDeliveryReport, getMerchantAnalytics };

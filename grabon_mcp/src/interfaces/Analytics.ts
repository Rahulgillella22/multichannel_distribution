export interface Analytics {
    analytics_id: string;
    merchant_id: string;
    coupon_id: string;
    total_sent: number;
    total_delivered: number;
    total_failed: number;
    delivery_rate: number;
    date: string;
}

export interface MerchantAnalyticsReport {
    merchant_id: string;
    merchant_name: string;
    coupons_today: number;
    total_delivered: number;
    total_failed: number;
    delivery_rate: string;
    best_channel: string;
}

export interface CompanyAnalyticsReport {
    date: string;
    top_merchant_today: string;
    merchants: MerchantAnalyticsReport[];
    company_totals: {
        total_deals_today: number;
        total_strings_generated: number;
        overall_delivery_rate: string;
    };
}

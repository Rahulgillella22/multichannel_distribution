export type UrgencyType = 'emergency' | 'scheduled';
export type DiscountType = 'percentage' | 'flat';
export type CouponStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface Coupon {
    coupon_id: string;
    merchant_id: string;
    category_id: string;
    discount_value: number;
    discount_type: DiscountType;
    expiry_timestamp: string;
    min_order_value: number;
    max_redemptions: number | null;
    exclusive_flag: boolean;
    urgency: UrgencyType;
    status: CouponStatus;
    created_at: string;
}

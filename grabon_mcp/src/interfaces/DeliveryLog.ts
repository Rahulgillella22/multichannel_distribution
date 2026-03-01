export type DeliveryStatus = 'delivered' | 'failed' | 'pending' | 'permanently_failed';

export interface DeliveryLog {
    log_id: string;
    coupon_id: string;
    user_id?: string;       // FK to users table — tracks per-user delivery
    user_name?: string;     // Denormalised for fast log reads without joins
    channel: string;
    language: string;
    variant: string;
    status: DeliveryStatus;
    retry_count: number;
    sent_at: string;
    last_retry_at?: string;
}

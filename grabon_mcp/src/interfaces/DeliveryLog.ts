export type DeliveryStatus = 'delivered' | 'failed' | 'pending' | 'permanently_failed';

export interface DeliveryLog {
    log_id: string;
    coupon_id: string;
    channel: string;
    language: string;
    variant: string;
    status: DeliveryStatus;
    retry_count: number;
    sent_at: string;
    last_retry_at?: string;
}

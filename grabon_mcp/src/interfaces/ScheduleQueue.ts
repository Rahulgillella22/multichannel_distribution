export type QueueStatus = 'waiting' | 'processing' | 'sent' | 'failed';

export interface ScheduleQueue {
    queue_id: string;
    coupon_id: string;
    scheduled_at: string;
    status: QueueStatus;
    created_at: string;
}

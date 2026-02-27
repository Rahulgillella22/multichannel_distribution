export interface Category {
    category_id: string;
    category_name: string;
    tone: string;
    style_guide: string;
    send_times: string; // JSON string array e.g. '["12:00","18:30"]'
    example_words: string;
}

export type ChannelType = 'email' | 'whatsapp' | 'push' | 'glance' | 'payu' | 'instagram';
export type LanguageType = 'english' | 'hindi' | 'telugu';
export type VariantType = 'urgency' | 'value' | 'social_proof';

export interface GeneratedContent {
    content_id: string;
    coupon_id: string;
    channel: ChannelType;
    language: LanguageType;
    variant: VariantType;
    content: string;
    subject_line?: string;  // email only
    cta_text?: string;      // email only
    template_id?: string;   // whatsapp only
    variables?: string;     // whatsapp only — JSON stringified WhatsAppVariables
    char_count: number;
    created_at: string;
}

export interface ContentInput {
    channel: ChannelType;
    language: LanguageType;
    variant: VariantType;
    content: string;
    subject_line?: string;
    cta_text?: string;
    template_id?: string;
    variables?: object;
}

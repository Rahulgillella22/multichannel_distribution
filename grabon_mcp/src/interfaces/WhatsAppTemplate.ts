export type VariantType = 'urgency' | 'value' | 'social_proof';
export type LanguageType = 'english' | 'hindi' | 'telugu';

export interface WhatsAppTemplate {
    template_id: string;
    category_id: string;
    language: LanguageType;
    variant: VariantType;
    structure: string;       // contains {{merchant}} {{discount}} etc
    use_when: string;        // Claude reads this to decide which template to pick
    char_limit_safe: number; // pre-calculated safe char count with typical variables
}

export interface WhatsAppVariables {
    merchant: string;
    discount: string;
    min_order?: string;
    expiry: string;
    product_type?: string;  // jewellery/fashion specific
    destination?: string;   // travel specific
}

export interface FilledWhatsAppTemplate {
    template_id: string;
    variables: WhatsAppVariables;
    language: LanguageType;
    variant: VariantType;
}

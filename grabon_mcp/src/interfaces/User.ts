export interface User {
    user_id: string;
    name: string;
    phone: string;
    email: string;
    device_token: string;
    location_id: string;
    preferred_language: 'english' | 'hindi' | 'telugu';
    is_active: boolean;
    created_at: string;
    last_active_at: string; // used for variant selection: inactive >30 days → social_proof
}

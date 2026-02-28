const { supabase } = require('../config/supabase');

async function getEligibleUsersSummary(category_id) {
    const cat_id = category_id.startsWith('cat_') ? category_id : `cat_${category_id}`;
    const { data, error } = await supabase
        .from('user_preferences')
        .select('users(user_id, preferred_language, location_id, locations(city))')
        .eq('category_id', cat_id)
        .eq('opted_in', true);

    if (error || !data) return { total_users: 0, languages_needed: [], cities: [] };

    const users = data.map(p => p.users).filter(Boolean);
    const languageCounts = {};
    const cities = new Set();

    users.forEach(u => {
        const lang = u.preferred_language || 'english';
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        if (u.locations) cities.add(u.locations.city);
    });

    return {
        total_users: users.length,
        languages_needed: Object.keys(languageCounts),
        language_breakdown: languageCounts,
        cities: Array.from(cities)
    };
}

async function getEligibleUsers(category_id) {
    const cat_id = category_id.startsWith('cat_') ? category_id : `cat_${category_id}`;
    const { data, error } = await supabase
        .from('user_preferences')
        .select('users(*, locations(city, region))')
        .eq('category_id', cat_id)
        .eq('opted_in', true);

    if (error || !data) return [];
    return data.map(p => p.users).filter(Boolean);
}

async function getEligibleUsersForCategory(category_id) {
    const cat_id = category_id.startsWith('cat_') ? category_id : `cat_${category_id}`;
    const { data, error } = await supabase
        .from('user_preferences')
        .select('user_id, users!inner(user_id, name, phone, email, device_token, preferred_language, last_active_at, created_at, locations(city))')
        .eq('category_id', cat_id)
        .eq('opted_in', true);

    if (error || !data) return [];
    return data.map(p => p.users).filter(Boolean);
}

module.exports = { getEligibleUsersSummary, getEligibleUsers, getEligibleUsersForCategory };

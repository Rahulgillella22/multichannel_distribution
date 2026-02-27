-- ============================================================
-- GrabOn MCP — Complete Database Setup for Supabase
-- Run this entire file in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- SECTION 1: CREATE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  location_id TEXT PRIMARY KEY,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  region      TEXT CHECK(region IN ('north','south','east','west')),
  tier        TEXT CHECK(tier IN ('metro','tier1','tier2'))
);

CREATE TABLE IF NOT EXISTS merchants (
  merchant_id   TEXT PRIMARY KEY,
  merchant_name TEXT NOT NULL,
  location_id   TEXT REFERENCES locations(location_id),
  api_key       TEXT UNIQUE NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  category_id   TEXT PRIMARY KEY,
  category_name TEXT NOT NULL,
  tone          TEXT NOT NULL,
  style_guide   TEXT NOT NULL,
  send_times    TEXT NOT NULL,
  example_words TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id            TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  phone              TEXT,
  email              TEXT,
  device_token       TEXT,
  location_id        TEXT REFERENCES locations(location_id),
  preferred_language TEXT CHECK(preferred_language IN ('english','hindi','telugu')),
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  last_active_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  preference_id TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(user_id),
  category_id   TEXT REFERENCES categories(category_id),
  opted_in      BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS coupons (
  coupon_id        TEXT PRIMARY KEY,
  merchant_id      TEXT REFERENCES merchants(merchant_id),
  category_id      TEXT REFERENCES categories(category_id),
  discount_value   NUMERIC NOT NULL,
  discount_type    TEXT CHECK(discount_type IN ('percentage','flat')),
  expiry_timestamp TIMESTAMPTZ NOT NULL,
  min_order_value  NUMERIC DEFAULT 0,
  max_redemptions  INTEGER,
  exclusive_flag   BOOLEAN DEFAULT FALSE,
  urgency          TEXT CHECK(urgency IN ('emergency','scheduled')),
  status           TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  template_id     TEXT PRIMARY KEY,
  category_id     TEXT REFERENCES categories(category_id),
  language        TEXT CHECK(language IN ('english','hindi','telugu')),
  variant         TEXT CHECK(variant IN ('urgency','value','social_proof')),
  structure       TEXT NOT NULL,
  use_when        TEXT NOT NULL,
  char_limit_safe INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_queue (
  queue_id     TEXT PRIMARY KEY,
  coupon_id    TEXT REFERENCES coupons(coupon_id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT DEFAULT 'waiting',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_content (
  content_id   TEXT PRIMARY KEY,
  coupon_id    TEXT REFERENCES coupons(coupon_id),
  channel      TEXT NOT NULL,
  language     TEXT NOT NULL,
  variant      TEXT NOT NULL,
  content      TEXT NOT NULL,
  subject_line TEXT,
  cta_text     TEXT,
  template_id  TEXT,
  variables    TEXT,
  char_count   INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_logs (
  log_id        TEXT PRIMARY KEY,
  coupon_id     TEXT REFERENCES coupons(coupon_id),
  channel       TEXT NOT NULL,
  language      TEXT NOT NULL,
  variant       TEXT NOT NULL,
  status        TEXT CHECK(status IN ('delivered','failed','pending','permanently_failed')),
  retry_count   INTEGER DEFAULT 0,
  sent_at       TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS analytics (
  analytics_id    TEXT PRIMARY KEY,
  merchant_id     TEXT REFERENCES merchants(merchant_id),
  coupon_id       TEXT REFERENCES coupons(coupon_id),
  total_sent      INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed    INTEGER DEFAULT 0,
  delivery_rate   NUMERIC DEFAULT 0,
  date            TEXT NOT NULL
);

-- Performance index for fast per-user content lookup at send time
CREATE INDEX IF NOT EXISTS idx_generated_content_lookup
ON generated_content(coupon_id, channel, language, variant);


-- ============================================================
-- SECTION 2: SEED — LOCATIONS
-- ============================================================

INSERT INTO locations (location_id, city, state, region, tier) VALUES
  ('loc_hyd',    'Hyderabad',   'Telangana',      'south', 'metro'),
  ('loc_mum',    'Mumbai',      'Maharashtra',    'west',  'metro'),
  ('loc_del',    'Delhi',       'Delhi',          'north', 'metro'),
  ('loc_ban',    'Bangalore',   'Karnataka',      'south', 'metro'),
  ('loc_chen',   'Chennai',     'Tamil Nadu',     'south', 'metro'),
  ('loc_jaipur', 'Jaipur',      'Rajasthan',      'north', 'tier1'),
  ('loc_vizag',  'Visakhapatnam','Andhra Pradesh','south', 'tier1'),
  ('loc_pune',   'Pune',        'Maharashtra',    'west',  'tier1')
ON CONFLICT (location_id) DO NOTHING;


-- ============================================================
-- SECTION 3: SEED — CATEGORIES
-- ============================================================

INSERT INTO categories (category_id, category_name, tone, style_guide, send_times, example_words) VALUES
  ('cat_food',
   'food',
   'informal energetic fun',
   'Write like a food-loving friend recommending a deal. Use energy, excitement and mouth-watering descriptions. Short sentences. Active voice. Create FOMO without being aggressive.',
   '["11:30","18:30"]',
   'Hungry, Grab, Yummy, Sizzling, Delicious, Don''t miss, Hot'),

  ('cat_jewellery',
   'jewellery',
   'premium sophisticated aspirational',
   'Write with elegance and prestige. Use occasion-based and aspirational language. For Indian context, reference festivals, auspicious occasions, gifts. Never feel cheap or discount-heavy.',
   '["10:00","18:00"]',
   'Exclusive, Precious, Timeless, Elegant, Coveted, Rare, Auspicious'),

  ('cat_fashion',
   'fashion',
   'trendy stylish confident',
   'Write like a style-conscious friend sharing a hot tip. Use fashion vocabulary, trend references, season context and FOMO triggers.',
   '["10:00","20:00"]',
   'Style, Trendy, Must-have, Chic, Look, Season, Fresh, New'),

  ('cat_travel',
   'travel',
   'adventurous aspirational wanderlust',
   'Paint vivid destination pictures. Use escape and adventure language. Reference weekends and getaways.',
   '["18:00"]',
   'Explore, Getaway, Adventure, Escape, Journey, Discover, Wander'),

  ('cat_electronics',
   'electronics',
   'tech-savvy smart value-focused',
   'Speak to the smart buyer. Reference specs, savings and smart decisions. Use upgrade language.',
   '["10:00"]',
   'Upgrade, Smart buy, Tech, Power, Performance, Save, Deal'),

  ('cat_grocery',
   'grocery',
   'practical helpful family-oriented',
   'Write like a helpful neighbor sharing a good deal. Focus on savings, family needs, and weekly planning.',
   '["09:00"]',
   'Fresh, Save, Weekly, Family, Home, Essentials, Stock up')
ON CONFLICT (category_id) DO NOTHING;


-- ============================================================
-- SECTION 4: SEED — MERCHANTS
-- ============================================================

INSERT INTO merchants (merchant_id, merchant_name, location_id, api_key, is_active) VALUES
  ('zomato_01',   'Zomato',       'loc_mum',    'api_zomato_key_001',   TRUE),
  ('tanishq_01',  'Tanishq',      'loc_mum',    'api_tanishq_key_001',  TRUE),
  ('myntra_01',   'Myntra',       'loc_ban',    'api_myntra_key_001',   TRUE),
  ('mmt_01',      'MakeMyTrip',   'loc_del',    'api_mmt_key_001',      TRUE),
  ('croma_01',    'Croma',        'loc_mum',    'api_croma_key_001',    TRUE),
  ('swiggy_01',   'Swiggy',       'loc_ban',    'api_swiggy_key_001',   TRUE),
  ('bigbasket_01','BigBasket',    'loc_ban',    'api_bigbasket_key_001',TRUE)
ON CONFLICT (merchant_id) DO NOTHING;


-- ============================================================
-- SECTION 5: SEED — USERS
-- ============================================================

INSERT INTO users (user_id, name, phone, email, device_token, location_id, preferred_language, is_active, created_at, last_active_at) VALUES
  -- Telugu users (Hyderabad)
  ('user_001', 'Rahul Reddy',    '+919876543200', 'rahul@example.com',    'tok_001', 'loc_hyd', 'telugu',  TRUE, NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 day'),
  ('user_002', 'Priya Sharma',   '+919876543201', 'priya@example.com',    'tok_002', 'loc_hyd', 'telugu',  TRUE, NOW() - INTERVAL '1 year',   NOW() - INTERVAL '35 days'),
  ('user_003', 'Venkat Rao',     '+919876543202', 'venkat@example.com',   'tok_003', 'loc_hyd', 'telugu',  TRUE, NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 days'),
  ('user_004', 'Lakshmi Devi',   '+919876543203', 'lakshmi@example.com',  'tok_004', 'loc_vizag','telugu', TRUE, NOW() - INTERVAL '2 months', NOW() - INTERVAL '3 days'),
  ('user_005', 'Kiran Kumar',    '+919876543204', 'kiran@example.com',    'tok_005', 'loc_hyd', 'telugu',  TRUE, NOW() - INTERVAL '4 days',   NOW() - INTERVAL '1 day'),

  -- Hindi users (Delhi/Mumbai/Jaipur)
  ('user_006', 'Arjun Singh',    '+919876543205', 'arjun@example.com',    'tok_006', 'loc_del', 'hindi',   TRUE, NOW() - INTERVAL '8 months', NOW() - INTERVAL '2 days'),
  ('user_007', 'Sneha Gupta',    '+919876543206', 'sneha@example.com',    'tok_007', 'loc_mum', 'hindi',   TRUE, NOW() - INTERVAL '1 year',   NOW() - INTERVAL '45 days'),
  ('user_008', 'Rohit Verma',    '+919876543207', 'rohit@example.com',    'tok_008', 'loc_del', 'hindi',   TRUE, NOW() - INTERVAL '5 months', NOW() - INTERVAL '1 day'),
  ('user_009', 'Kavya Patel',    '+919876543208', 'kavya@example.com',    'tok_009', 'loc_jaipur','hindi', TRUE, NOW() - INTERVAL '3 days',   NOW() - INTERVAL '1 day'),
  ('user_010', 'Amit Sharma',    '+919876543209', 'amit@example.com',     'tok_010', 'loc_mum', 'hindi',   TRUE, NOW() - INTERVAL '2 years',  NOW() - INTERVAL '5 days'),

  -- English users (Bangalore/Chennai/Pune)
  ('user_011', 'Anika Mehta',    '+919876543210', 'anika@example.com',    'tok_011', 'loc_ban', 'english', TRUE, NOW() - INTERVAL '7 months', NOW() - INTERVAL '1 day'),
  ('user_012', 'Dev Nair',       '+919876543211', 'dev@example.com',      'tok_012', 'loc_chen', 'english',TRUE, NOW() - INTERVAL '1 year',   NOW() - INTERVAL '40 days'),
  ('user_013', 'Riya Joshi',     '+919876543212', 'riya@example.com',     'tok_013', 'loc_pune', 'english',TRUE, NOW() - INTERVAL '4 months', NOW() - INTERVAL '3 days'),
  ('user_014', 'Sai Krishnan',   '+919876543213', 'sai@example.com',      'tok_014', 'loc_ban', 'english', TRUE, NOW() - INTERVAL '5 days',   NOW() - INTERVAL '1 day'),
  ('user_015', 'Meera Pillai',   '+919876543214', 'meera@example.com',    'tok_015', 'loc_chen', 'english',TRUE, NOW() - INTERVAL '9 months', NOW() - INTERVAL '2 days')
ON CONFLICT (user_id) DO NOTHING;


-- ============================================================
-- SECTION 6: SEED — USER PREFERENCES
-- (Each user opts into 2-3 categories)
-- ============================================================

INSERT INTO user_preferences (preference_id, user_id, category_id, opted_in) VALUES
  -- Food preferences
  ('pref_001', 'user_001', 'cat_food', TRUE),
  ('pref_002', 'user_002', 'cat_food', TRUE),
  ('pref_003', 'user_003', 'cat_food', TRUE),
  ('pref_004', 'user_006', 'cat_food', TRUE),
  ('pref_005', 'user_007', 'cat_food', TRUE),
  ('pref_006', 'user_008', 'cat_food', TRUE),
  ('pref_007', 'user_011', 'cat_food', TRUE),
  ('pref_008', 'user_012', 'cat_food', TRUE),
  ('pref_009', 'user_014', 'cat_food', TRUE),

  -- Jewellery preferences
  ('pref_010', 'user_002', 'cat_jewellery', TRUE),
  ('pref_011', 'user_004', 'cat_jewellery', TRUE),
  ('pref_012', 'user_007', 'cat_jewellery', TRUE),
  ('pref_013', 'user_010', 'cat_jewellery', TRUE),
  ('pref_014', 'user_011', 'cat_jewellery', TRUE),
  ('pref_015', 'user_013', 'cat_jewellery', TRUE),
  ('pref_016', 'user_015', 'cat_jewellery', TRUE),

  -- Fashion preferences
  ('pref_017', 'user_003', 'cat_fashion', TRUE),
  ('pref_018', 'user_005', 'cat_fashion', TRUE),
  ('pref_019', 'user_009', 'cat_fashion', TRUE),
  ('pref_020', 'user_011', 'cat_fashion', TRUE),
  ('pref_021', 'user_013', 'cat_fashion', TRUE),
  ('pref_022', 'user_014', 'cat_fashion', TRUE),

  -- Travel preferences
  ('pref_023', 'user_006', 'cat_travel', TRUE),
  ('pref_024', 'user_008', 'cat_travel', TRUE),
  ('pref_025', 'user_012', 'cat_travel', TRUE),
  ('pref_026', 'user_014', 'cat_travel', TRUE),

  -- Electronics preferences
  ('pref_027', 'user_001', 'cat_electronics', TRUE),
  ('pref_028', 'user_006', 'cat_electronics', TRUE),
  ('pref_029', 'user_010', 'cat_electronics', TRUE),
  ('pref_030', 'user_011', 'cat_electronics', TRUE),

  -- Grocery preferences
  ('pref_031', 'user_004', 'cat_grocery', TRUE),
  ('pref_032', 'user_007', 'cat_grocery', TRUE),
  ('pref_033', 'user_010', 'cat_grocery', TRUE),
  ('pref_034', 'user_015', 'cat_grocery', TRUE)
ON CONFLICT (preference_id) DO NOTHING;


-- ============================================================
-- SECTION 7: SEED — WHATSAPP TEMPLATES
-- ============================================================

INSERT INTO whatsapp_templates (template_id, category_id, language, variant, structure, use_when, char_limit_safe) VALUES

  -- FOOD — ENGLISH
  ('WA_FOOD_EN_URGENCY',   'cat_food', 'english', 'urgency',
   '⚡ {{merchant}} Flash Sale! {{discount}} on orders above {{min_order}}. Ends {{expiry}}! Grab now →',
   'Emergency food deals, any restaurant or delivery app, expiring within hours.',
   120),

  ('WA_FOOD_EN_VALUE',     'cat_food', 'english', 'value',
   'Save big with {{merchant}}! {{discount}} on your next order. Min order {{min_order}}. Valid till {{expiry}} 🍽️',
   'Scheduled food deals where saving money is the main message.',
   115),

  ('WA_FOOD_EN_SOCIAL',    'cat_food', 'english', 'social_proof',
   'Thousands already ordered! {{merchant}} {{discount}} off. Min {{min_order}}. Don''t miss — ends {{expiry}} 🔥',
   'Food deals where community proof is the hook. Re-engaging inactive users.',
   118),

  -- FOOD — HINDI
  ('WA_FOOD_HI_URGENCY',   'cat_food', 'hindi', 'urgency',
   '⚡ {{merchant}} का धमाका! {{discount}} की छूट। {{min_order}} से ऑर्डर करें। {{expiry}} तक!',
   'Emergency food deals for Hindi speaking users. Assertive urgent tone.',
   110),

  ('WA_FOOD_HI_VALUE',     'cat_food', 'hindi', 'value',
   'पैसे बचाओ! {{merchant}} पर {{discount}} की छूट। Min ऑर्डर {{min_order}}। {{expiry}} तक valid 🍛',
   'Scheduled food deals for Hindi users emphasizing savings.',
   108),

  ('WA_FOOD_HI_SOCIAL',    'cat_food', 'hindi', 'social_proof',
   'हजारों ने order किया! {{merchant}} {{discount}} off। {{min_order}} से। {{expiry}} से पहले लो 🔥',
   'Social proof food deals for Hindi users. Re-engagement.',
   112),

  -- FOOD — TELUGU
  ('WA_FOOD_TE_URGENCY',   'cat_food', 'telugu', 'urgency',
   '⚡ {{merchant}} లో సేల్! {{discount}} తగ్గింపు. {{min_order}} పైన ఆర్డర్. {{expiry}} వరకే!',
   'Emergency food deals for Telugu speaking users. Community and family warmth.',
   105),

  ('WA_FOOD_TE_VALUE',     'cat_food', 'telugu', 'value',
   '{{merchant}} లో {{discount}} ఆదా చేయండి! {{min_order}} పైన ఆర్డర్ చేయండి. {{expiry}} వరకు valid 🍱',
   'Scheduled food deals for Telugu users emphasizing savings.',
   110),

  ('WA_FOOD_TE_SOCIAL',    'cat_food', 'telugu', 'social_proof',
   'వేలమంది ఆర్డర్ చేశారు! {{merchant}} {{discount}} తగ్గింపు. {{min_order}} పైన. {{expiry}} లోపు తీసుకోండి',
   'Social proof food deals for Telugu users. Re-engagement.',
   112),

  -- JEWELLERY — ENGLISH
  ('WA_JEWEL_EN_URGENCY',  'cat_jewellery', 'english', 'urgency',
   'Exclusive! {{merchant}} — {{discount}} on {{product_type}}. Timeless elegance awaits. Till {{expiry}} ✨',
   'Urgent premium jewellery deals. Prestigious tone required.',
   115),

  ('WA_JEWEL_EN_VALUE',    'cat_jewellery', 'english', 'value',
   '{{merchant}} precious savings! {{discount}} off on {{product_type}}. A rare offer. Valid till {{expiry}} 💎',
   'Scheduled jewellery deals emphasizing value and rarity.',
   112),

  ('WA_JEWEL_EN_SOCIAL',   'cat_jewellery', 'english', 'social_proof',
   'Coveted by thousands! {{merchant}} {{discount}} on {{product_type}}. Limited pieces. Till {{expiry}} 👑',
   'Social proof jewellery deals. Exclusivity angle.',
   110),

  -- JEWELLERY — HINDI
  ('WA_JEWEL_HI_URGENCY',  'cat_jewellery', 'hindi', 'urgency',
   'विशेष अवसर! {{merchant}} पर {{product_type}} में {{discount}} की छूट। {{expiry}} तक सीमित ✨',
   'Urgent jewellery deals for Hindi users. Festive and occasion context.',
   108),

  ('WA_JEWEL_HI_VALUE',    'cat_jewellery', 'hindi', 'value',
   '{{merchant}} का शानदार offer! {{product_type}} पर {{discount}} की बचत। {{expiry}} तक valid 💎',
   'Scheduled jewellery deals for Hindi users. Aspirational value.',
   108),

  ('WA_JEWEL_HI_SOCIAL',   'cat_jewellery', 'hindi', 'social_proof',
   'हजारों ने पसंद किया! {{merchant}} {{product_type}} पर {{discount}} छूट। सीमित stock। {{expiry}} तक 👑',
   'Social proof jewellery for Hindi users.',
   110),

  -- JEWELLERY — TELUGU
  ('WA_JEWEL_TE_URGENCY',  'cat_jewellery', 'telugu', 'urgency',
   'ప్రత్యేక ఆఫర్! {{merchant}} లో {{product_type}} పై {{discount}} తగ్గింపు. {{expiry}} వరకు మాత్రమే ✨',
   'Urgent jewellery deals for Telugu users. Auspicious and precious references.',
   108),

  ('WA_JEWEL_TE_VALUE',    'cat_jewellery', 'telugu', 'value',
   '{{merchant}} లో {{product_type}} పై {{discount}} ఆదా చేయండి. అద్భుతమైన అవకాశం. {{expiry}} వరకు 💎',
   'Scheduled jewellery deals for Telugu users. Precious savings tone.',
   110),

  ('WA_JEWEL_TE_SOCIAL',   'cat_jewellery', 'telugu', 'social_proof',
   'వేలమంది ఇష్టపడ్డారు! {{merchant}} లో {{product_type}} పై {{discount}} తగ్గింపు. {{expiry}} వరకే 👑',
   'Social proof jewellery for Telugu users.',
   110),

  -- FASHION — ENGLISH
  ('WA_FASHION_EN_URGENCY','cat_fashion', 'english', 'urgency',
   '🔥 {{merchant}} style drop! {{discount}} off. This season''s must-haves. Ends {{expiry}}. Shop now!',
   'Urgent fashion deals. Trend and season context.',
   112),

  ('WA_FASHION_EN_VALUE',  'cat_fashion', 'english', 'value',
   '{{merchant}} sale! {{discount}} on this season''s best looks. Min order {{min_order}}. Valid till {{expiry}} 👗',
   'Scheduled fashion deals. Value focus.',
   115),

  ('WA_FASHION_EN_SOCIAL', 'cat_fashion', 'english', 'social_proof',
   'Everyone''s shopping {{merchant}}! {{discount}} off trends. Don''t be left out. Ends {{expiry}} 💃',
   'Social proof fashion. FOMO and community angle.',
   113),

  -- FASHION — HINDI
  ('WA_FASHION_HI_URGENCY','cat_fashion', 'hindi', 'urgency',
   '🔥 {{merchant}} sale! {{discount}} की छूट। इस season के best looks। {{expiry}} तक!',
   'Urgent fashion deals for Hindi users.',
   108),

  ('WA_FASHION_HI_VALUE',  'cat_fashion', 'hindi', 'value',
   '{{merchant}} पर {{discount}} की बचत। शानदार fashion deals। Min {{min_order}}। {{expiry}} तक 👗',
   'Scheduled fashion deals for Hindi users.',
   110),

  ('WA_FASHION_HI_SOCIAL', 'cat_fashion', 'hindi', 'social_proof',
   'सब खरीद रहे हैं! {{merchant}} पर {{discount}} छूट। {{expiry}} से पहले लो 💃',
   'Social proof fashion for Hindi users.',
   105),

  -- FASHION — TELUGU
  ('WA_FASHION_TE_URGENCY','cat_fashion', 'telugu', 'urgency',
   '🔥 {{merchant}} సేల్! {{discount}} తగ్గింపు. ఈ సీజన్ బెస్ట్ స్టైల్స్. {{expiry}} వరకే!',
   'Urgent fashion deals for Telugu users.',
   108),

  ('WA_FASHION_TE_VALUE',  'cat_fashion', 'telugu', 'value',
   '{{merchant}} లో {{discount}} ఆదా చేయండి. ఫ్యాషన్ డీల్స్. Min {{min_order}}. {{expiry}} వరకు 👗',
   'Scheduled fashion deals for Telugu users.',
   110),

  ('WA_FASHION_TE_SOCIAL', 'cat_fashion', 'telugu', 'social_proof',
   'అందరూ కొంటున్నారు! {{merchant}} లో {{discount}} తగ్గింపు. {{expiry}} లోపు తీసుకోండి 💃',
   'Social proof fashion for Telugu users.',
   108),

  -- GENERAL FALLBACKS
  ('WA_GENERAL_EN', 'cat_food', 'english', 'urgency',
   '{{merchant}} special offer! {{discount}} off. Valid till {{expiry}}. Grab now! 🎉',
   'Fallback for any category when no specific template matches.',
   100),

  ('WA_GENERAL_HI', 'cat_food', 'hindi', 'urgency',
   '{{merchant}} का special offer! {{discount}} की छूट। {{expiry}} तक। अभी लो! 🎉',
   'Hindi fallback for any category.',
   100),

  ('WA_GENERAL_TE', 'cat_food', 'telugu', 'urgency',
   '{{merchant}} స్పెషల్ ఆఫర్! {{discount}} తగ్గింపు. {{expiry}} వరకు. ఇప్పుడే తీసుకోండి! 🎉',
   'Telugu fallback for any category.',
   100)

ON CONFLICT (template_id) DO NOTHING;


-- ============================================================
-- SECTION 8: VERIFY (run these SELECTs after inserting)
-- ============================================================
-- SELECT COUNT(*) FROM locations;          -- should be 8
-- SELECT COUNT(*) FROM merchants;          -- should be 7
-- SELECT COUNT(*) FROM categories;         -- should be 6
-- SELECT COUNT(*) FROM users;              -- should be 15
-- SELECT COUNT(*) FROM user_preferences;   -- should be 34
-- SELECT COUNT(*) FROM whatsapp_templates; -- should be 30

-- ============================================================
-- ALL DONE — Your Supabase DB is ready for the MCP server
-- ============================================================

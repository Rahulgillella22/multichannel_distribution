-- ============================================================
-- STEP 1: Add push_style column to categories table
-- ============================================================
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS push_style JSONB DEFAULT NULL;

-- ============================================================
-- STEP 2: Seed push_style data for each category
-- Run this after the ALTER TABLE above
-- ============================================================

UPDATE categories SET push_style = '{
  "personality": "Zomato-style: witty, sarcastic, makes the user feel like eating RIGHT NOW. Reference time of day. Make the food sound irresistible. Use hunger guilt.",
  "urgency_example": "title: Your stomach just texted us 👀 | body: {{merchant}} {{discount}} off ends tonight. Your dinner plans just got a glow-up.",
  "value_example": "title: Broke but hungry? We got you 🍕 | body: Save big on {{merchant}}. {{discount}} off, no judgment.",
  "social_proof_example": "title: Half your office already ordered 😏 | body: {{merchant}} deals flying off — {{discount}} off. Dont be the only one eating sad food.",
  "rules": [
    "Reference hunger, food cravings, meal time",
    "Be sarcastic but lovable — like a funny friend",
    "Use emojis sparingly — max 1-2",
    "Title must feel like a text message, not an ad",
    "Never use Grab, Avail, Utilize — too corporate"
  ]
}'::jsonb
WHERE category_name ILIKE 'food';

UPDATE categories SET push_style = '{
  "personality": "Tanishq-style: graceful, occasion-aware, aspirational. Never feels cheap. Appeals to gifting, festivals, milestones. No sarcasm.",
  "urgency_example": "title: This wont wait for you ✨ | body: {{merchant}} — {{discount}} on precious pieces. Some moments deserve the finest.",
  "value_example": "title: Rare savings, rarer beauty 💎 | body: {{merchant}} exclusive — {{discount}} off. A piece for every memory.",
  "social_proof_example": "title: Everyones making it special 👑 | body: {{merchant}} — the choice of thousands this season. {{discount}} off, limited time.",
  "rules": [
    "Never say cheap, deal, grab or steal",
    "Reference occasions — festivals, anniversaries, gifting",
    "Sophisticated vocabulary — timeless, precious, rare, heirloom",
    "Title should feel like a whisper, not a shout",
    "Emojis — only elegant ones: ✨ 💎 👑"
  ]
}'::jsonb
WHERE category_name ILIKE 'jewellery';

UPDATE categories SET push_style = '{
  "personality": "Myntra-style: confident, trend-obsessed, FOMO-heavy. Fashion is identity. Use season, styling, and everyone is wearing this angles.",
  "urgency_example": "title: This seasons look wont wait 🔥 | body: {{merchant}} — {{discount}} off. Miss this and explain your boring outfit forever.",
  "value_example": "title: Style upgrade incoming 👗 | body: {{merchant}} sale — {{discount}} off on this seasons hottest looks. Budget-friendly, taste-proof.",
  "social_proof_example": "title: Your feed is already full of this look 💃 | body: {{merchant}} — {{discount}} off trending styles. Everyones wearing it. Now its your turn.",
  "rules": [
    "Reference current season, trends, the look",
    "FOMO is your friend — mild peer pressure is acceptable",
    "Use fashion vocabulary: drop, collab, aesthetic, edit, lookbook",
    "Title must feel like a DM from a stylish friend",
    "Body max 1 sentence + offer info"
  ]
}'::jsonb
WHERE category_name ILIKE 'fashion';

UPDATE categories SET push_style = '{
  "personality": "MakeMyTrip-style: wanderlust, escape, your next trip starts here. Paint a destination picture in a single line. Weekend escape angle.",
  "urgency_example": "title: That trip you keep postponing? ✈️ | body: {{merchant}} deal — {{discount}} off. Your weekend escape wont book itself.",
  "value_example": "title: Adventure just got affordable 🏖️ | body: {{merchant}} — {{discount}} off. Pack light, save big, leave Mondays problems behind.",
  "social_proof_example": "title: Everyone from work is already there 🗺️ | body: {{merchant}} — {{discount}} off hot destinations. Dont be the only one without stories.",
  "rules": [
    "Paint a destination picture in title",
    "Reference weekends, getaways, your next trip",
    "Avoid corporate phrases like avail booking discount",
    "Use escapism — Monday blues, office stress relief angle",
    "Emojis: ✈️ 🏖️ 🗺️ 🏔️ — max 1"
  ]
}'::jsonb
WHERE category_name ILIKE 'travel';

UPDATE categories SET push_style = '{
  "personality": "Croma-style: smart, specs-aware, youve been waiting for this. Speaks to the researcher who deliberates before buying. Smart-buy validation.",
  "urgency_example": "title: That tab you left open? Its on sale 📱 | body: {{merchant}} — {{discount}} off. Your wishlist just became your cart.",
  "value_example": "title: Smart buy alert 🎯 | body: {{merchant}} — {{discount}} off premium tech. Your wallet called. It said go for it.",
  "social_proof_example": "title: The review scores are insane 🔋 | body: {{merchant}} — {{discount}} off. Thousands upgraded already. Your turn.",
  "rules": [
    "Reference wishlist, research, youve been eyeing this",
    "Validate the smart-buyer identity — you know a deal when you see one",
    "Specs, performance, upgrade language",
    "Avoid hype-y language — this buyer is rational",
    "Emojis: 📱 💻 🎯 🔋 — max 1"
  ]
}'::jsonb
WHERE category_name ILIKE 'electronics';

UPDATE categories SET push_style = '{
  "personality": "Blinkit-style: practical, fast, no-nonsense. Speaks to the busy person who doesnt want to think much. Weekly savings, family angle, speed.",
  "urgency_example": "title: Running out? Restock now 🛒 | body: {{merchant}} — {{discount}} off essentials. Before the weekend rush hits.",
  "value_example": "title: Weekly savings just landed 🧾 | body: {{merchant}} — {{discount}} off groceries. Your familys budget says thank you.",
  "social_proof_example": "title: Your neighbors already stocked up 📦 | body: {{merchant}} deals going fast — {{discount}} off. Dont wait for the shelf to be empty.",
  "rules": [
    "Keep it simple and fast — no poetry",
    "Family, home, practical savings angle",
    "Reference weekly shopping, stocking up",
    "Urgency from scarcity (stock running out) not FOMO",
    "Emojis: 🛒 🧾 📦 — max 1"
  ]
}'::jsonb
WHERE category_name ILIKE 'grocery';

-- ============================================================
-- VERIFY: Check all categories have push_style set
-- ============================================================
SELECT category_id, category_name,
       CASE WHEN push_style IS NOT NULL THEN '✅ Set' ELSE '❌ Missing' END AS push_style_status
FROM categories
ORDER BY category_name;

# GrabOn Project 06: Multi-Channel Deal Distribution MCP
## Complete Project Documentation — Node.js + TypeScript — For LLM Implementation

---

## 1. PROJECT OVERVIEW

### What This Project Is
Build an MCP (Model Context Protocol) server that takes one merchant deal and automatically
distributes it across 6 channels simultaneously — formatted, localized in 3 languages,
with 3 A/B variants per channel.

### Core Equation
```
1 merchant deal upload
= 6 channels × 3 variants × 3 languages
= 54 total formatted strings
+ webhook delivery simulation
+ delivery logs
```

### What You Are Building
- MCP Server (Node.js/TypeScript) — exposes tools to Claude Desktop
- SQLite Database — stores everything locally
- Mock Webhook Endpoints (Express) — simulate channel delivery
- node-schedule — handles time-based deal distribution
- WhatsApp Template System — pre-defined structures with variable filling
- NO separate frontend. NO user-facing REST API.
- Claude Desktop chat window IS the interface.

### Demo Flow
```
Evaluator opens Claude Desktop
Types: "Distribute this Zomato deal — 30% off food,
        expires Sunday, min order ₹199, emergency"
Claude Desktop connects to MCP server locally via stdio
Claude calls tools, generates 54 strings,
fires mock webhooks, shows delivery report
All output visible directly in Claude Desktop chat
```

---

## 2. TECHNOLOGY STACK

```
Runtime:          Node.js 18+
Language:         TypeScript (interfaces ONLY — src/interfaces/*.ts)
                  JavaScript (all logic — database, services, repositories, mcp)
MCP Framework:    @modelcontextprotocol/sdk (Anthropic official Node SDK)
Database:         Supabase (hosted PostgreSQL) via @supabase/supabase-js
Mock Webhooks:    Express.js (port 3001)
Scheduler:        node-schedule (cron-style, runs inside same process)
Architecture:     3-Tier — MCP Tools → Service → Repository
Config:           claude_desktop_config.json (registers MCP server)
                  .env (SUPABASE_URL + SUPABASE_ANON_KEY)
```

---

## 3. COMPLETE FOLDER STRUCTURE

```
grabon_mcp/
│
├── src/
│   │
│   ├── interfaces/                    ← TypeScript interfaces ONLY (.ts)
│   │   ├── Merchant.ts
│   │   ├── User.ts
│   │   ├── Coupon.ts
│   │   ├── Category.ts
│   │   ├── Location.ts
│   │   ├── UserPreference.ts
│   │   ├── WhatsAppTemplate.ts
│   │   ├── GeneratedContent.ts
│   │   ├── ScheduleQueue.ts
│   │   ├── DeliveryLog.ts
│   │   └── Analytics.ts
│   │
│   ├── config/                        ← Supabase client init (.js)
│   │   └── supabase.js                ← createClient(URL, KEY) — shared across all repos
│   │
│   ├── repositories/                  ← DB operations ONLY, zero business logic (.js)
│   │   ├── MerchantRepository.js
│   │   ├── UserRepository.js
│   │   ├── CouponRepository.js
│   │   ├── CategoryRepository.js
│   │   ├── TemplateRepository.js
│   │   ├── GeneratedContentRepository.js
│   │   ├── ScheduleQueueRepository.js
│   │   ├── DeliveryLogRepository.js
│   │   └── AnalyticsRepository.js
│   │
│   ├── services/                      ← all business logic lives here (.js)
│   │   ├── DealDistributionService.js ← orchestrates entire pipeline
│   │   ├── ContentValidationService.js← input + output validation logic
│   │   ├── WebhookService.js          ← fires mock endpoints, handles retries
│   │   ├── SchedulerService.js        ← node-schedule logic, timing rules
│   │   ├── AnalyticsService.js        ← analytics calculations
│   │   └── WhatsAppAssemblyService.js ← assembles WA messages from templates
│   │
│   ├── controllers/                   ← Express mock webhook endpoints (.js)
│   │   └── MockWebhookController.js   ← all 6 channel mock endpoints
│   │
│   ├── validators/                    ← (.js)
│   │   ├── InputValidator.js          ← validates before Claude sees data
│   │   └── OutputValidator.js         ← validates after Claude generates content
│   │
│   ├── mcp/                           ← (.js)
│   │   ├── server.js                  ← MCP server setup and registration
│   │   └── tools.js                   ← all 9 tool definitions (thin entry layer)
│   │
│   └── data/
│       ├── whatsapp_templates.json    ← all pre-defined WA template structures
│       └── category_styles.json       ← tone, style and timing per category
│
├── .env                               ← SUPABASE_URL + SUPABASE_ANON_KEY (share with evaluator)
├── .env.example                       ← template showing which keys are needed
├── claude_desktop_config.json         ← tells Claude Desktop where MCP server is
├── package.json
└── tsconfig.json                      ← compiles only src/interfaces/*.ts
```

---

## 4. TYPESCRIPT INTERFACES

### Merchant.ts
```typescript
export interface Merchant {
  merchant_id: string;
  merchant_name: string;
  location_id: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}
```

### User.ts
```typescript
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
  last_active_at: string;    // used for variant selection: inactive >30 days → social_proof
}
```

### Coupon.ts
```typescript
export type UrgencyType = 'emergency' | 'scheduled';
export type DiscountType = 'percentage' | 'flat';
export type CouponStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface Coupon {
  coupon_id: string;
  merchant_id: string;
  category_id: string;
  discount_value: number;
  discount_type: DiscountType;
  expiry_timestamp: string;
  min_order_value: number;
  max_redemptions: number | null;
  exclusive_flag: boolean;
  urgency: UrgencyType;
  status: CouponStatus;
  created_at: string;
}
```

### Category.ts
```typescript
export interface Category {
  category_id: string;
  category_name: string;
  tone: string;
  style_guide: string;
  send_times: string;        // JSON string array e.g. '["12:00","18:30"]'
  example_words: string;
}
```

### Location.ts
```typescript
export type RegionType = 'north' | 'south' | 'east' | 'west';
export type TierType = 'metro' | 'tier1' | 'tier2';

export interface Location {
  location_id: string;
  city: string;
  state: string;
  region: RegionType;
  tier: TierType;
}
```

### UserPreference.ts
```typescript
export interface UserPreference {
  preference_id: string;
  user_id: string;
  category_id: string;
  opted_in: boolean;
}
```

### WhatsAppTemplate.ts
```typescript
export type VariantType = 'urgency' | 'value' | 'social_proof';
export type LanguageType = 'english' | 'hindi' | 'telugu';

export interface WhatsAppTemplate {
  template_id: string;
  category_id: string;
  language: LanguageType;
  variant: VariantType;
  structure: string;           // contains {{merchant}} {{discount}} etc
  use_when: string;            // Claude reads this to decide which template to pick
  char_limit_safe: number;     // pre-calculated safe char count with typical variables
}

export interface WhatsAppVariables {
  merchant: string;
  discount: string;
  min_order?: string;
  expiry: string;
  product_type?: string;       // jewellery/fashion specific
  destination?: string;        // travel specific
}

export interface FilledWhatsAppTemplate {
  template_id: string;
  variables: WhatsAppVariables;
  language: LanguageType;
  variant: VariantType;
}
```

### GeneratedContent.ts
```typescript
export type ChannelType = 'email' | 'whatsapp' | 'push' | 'glance' | 'payu' | 'instagram';

export interface GeneratedContent {
  content_id: string;
  coupon_id: string;
  channel: ChannelType;
  language: LanguageType;
  variant: VariantType;
  content: string;
  subject_line?: string;       // email only
  cta_text?: string;           // email only
  template_id?: string;        // whatsapp only
  variables?: string;          // whatsapp only — JSON stringified WhatsAppVariables
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
  variables?: WhatsAppVariables;
}
```

### ScheduleQueue.ts
```typescript
export type QueueStatus = 'waiting' | 'processing' | 'sent' | 'failed';

export interface ScheduleQueue {
  queue_id: string;
  coupon_id: string;
  scheduled_at: string;
  status: QueueStatus;
  created_at: string;
}
```

### DeliveryLog.ts
```typescript
export type DeliveryStatus = 'delivered' | 'failed' | 'pending' | 'permanently_failed';

export interface DeliveryLog {
  log_id: string;
  coupon_id: string;
  channel: ChannelType;
  language: LanguageType;
  variant: VariantType;
  status: DeliveryStatus;
  retry_count: number;
  sent_at: string;
  last_retry_at?: string;
}
```

### Analytics.ts
```typescript
export interface Analytics {
  analytics_id: string;
  merchant_id: string;
  coupon_id: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  date: string;
}

export interface MerchantAnalyticsReport {
  merchant_id: string;
  merchant_name: string;
  coupons_today: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: string;
  best_channel: string;
}

export interface CompanyAnalyticsReport {
  date: string;
  top_merchant_today: string;
  merchants: MerchantAnalyticsReport[];
  company_totals: {
    total_deals_today: number;
    total_strings_generated: number;
    overall_delivery_rate: string;
  };
}
```

---

## 5. DATABASE DESIGN — ALL TABLES (Supabase / PostgreSQL)

> **Setup:** Run these SQL statements once in your Supabase project dashboard
> under **SQL Editor**. Foreign keys are enforced by default in PostgreSQL.
> No local DB file — all data lives in your Supabase project.

```sql

CREATE TABLE locations (
  location_id TEXT PRIMARY KEY,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  region      TEXT CHECK(region IN ('north','south','east','west')),
  tier        TEXT CHECK(tier IN ('metro','tier1','tier2'))
);

CREATE TABLE merchants (
  merchant_id   TEXT PRIMARY KEY,
  merchant_name TEXT NOT NULL,
  location_id   TEXT REFERENCES locations(location_id),
  api_key       TEXT UNIQUE NOT NULL,
  is_active     INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  category_id   TEXT PRIMARY KEY,
  category_name TEXT NOT NULL,
  tone          TEXT NOT NULL,
  style_guide   TEXT NOT NULL,
  send_times    TEXT NOT NULL,
  example_words TEXT NOT NULL
);

CREATE TABLE users (
  user_id            TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  phone              TEXT,
  email              TEXT,
  device_token       TEXT,
  location_id        TEXT REFERENCES locations(location_id),
  preferred_language TEXT CHECK(preferred_language IN ('english','hindi','telugu')),
  is_active          INTEGER DEFAULT 1,
  created_at         TEXT DEFAULT (datetime('now')),
  last_active_at     TEXT DEFAULT (datetime('now'))  -- variant selection: >30 days inactive → social_proof
);

CREATE TABLE user_preferences (
  preference_id TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(user_id),
  category_id   TEXT REFERENCES categories(category_id),
  opted_in      INTEGER DEFAULT 1
);

CREATE TABLE coupons (
  coupon_id        TEXT PRIMARY KEY,
  merchant_id      TEXT REFERENCES merchants(merchant_id),
  category_id      TEXT REFERENCES categories(category_id),
  discount_value   REAL NOT NULL,
  discount_type    TEXT CHECK(discount_type IN ('percentage','flat')),
  expiry_timestamp TEXT NOT NULL,
  min_order_value  REAL DEFAULT 0,
  max_redemptions  INTEGER,
  exclusive_flag   INTEGER DEFAULT 0,
  urgency          TEXT CHECK(urgency IN ('emergency','scheduled')),
  status           TEXT DEFAULT 'pending',
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE whatsapp_templates (
  template_id     TEXT PRIMARY KEY,
  category_id     TEXT REFERENCES categories(category_id),
  language        TEXT CHECK(language IN ('english','hindi','telugu')),
  variant         TEXT CHECK(variant IN ('urgency','value','social_proof')),
  structure       TEXT NOT NULL,
  use_when        TEXT NOT NULL,
  char_limit_safe INTEGER NOT NULL
);

CREATE TABLE schedule_queue (
  queue_id     TEXT PRIMARY KEY,
  coupon_id    TEXT REFERENCES coupons(coupon_id),
  scheduled_at TEXT NOT NULL,
  status       TEXT DEFAULT 'waiting',
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE generated_content (
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
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Performance index: WebhookService fetches content per user using these 4 fields
-- Without index: full table scan per user → slow at scale
-- With index: instant O(1) lookup per user at send time
CREATE INDEX idx_generated_content_lookup
ON generated_content(coupon_id, channel, language, variant);

CREATE TABLE delivery_logs (
  log_id        TEXT PRIMARY KEY,
  coupon_id     TEXT REFERENCES coupons(coupon_id),
  channel       TEXT NOT NULL,
  language      TEXT NOT NULL,
  variant       TEXT NOT NULL,
  status        TEXT CHECK(status IN ('delivered','failed','pending','permanently_failed')),
  retry_count   INTEGER DEFAULT 0,
  sent_at       TEXT,
  last_retry_at TEXT
);

CREATE TABLE analytics (
  analytics_id    TEXT PRIMARY KEY,
  merchant_id     TEXT REFERENCES merchants(merchant_id),
  coupon_id       TEXT REFERENCES coupons(coupon_id),
  total_sent      INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed    INTEGER DEFAULT 0,
  delivery_rate   REAL DEFAULT 0,
  date            TEXT NOT NULL
);
```

---

## 6. ALL 9 MCP TOOLS — COMPLETE DEFINITIONS

### How Tools Work
```
Claude Desktop reads each tool NAME and DESCRIPTION
Claude decides when and how to call each tool
Tools in tools.ts are THIN — receive call, pass to service, return result
All business logic lives in services layer
Claude never touches database directly — only through these tools
```

---

### TOOL 1: distribute_deal
```
Name: distribute_deal

Description (Claude reads this):
"PRIMARY ENTRY POINT for the entire deal distribution pipeline.
 Call this when a merchant wants to distribute a deal across all channels.
 This tool:
 1. Validates all inputs (merchant exists, category valid, discount valid, expiry future)
 2. Saves deal to coupons table in database with unique coupon_id
 3. Returns category style guide so Claude knows the tone to use
 4. Returns eligible user summary so Claude knows audience and languages needed
 5. Returns ALL WhatsApp template structures for all language+variant combinations
 6. Returns cultural instructions per language
 7. Returns channel character limits
 After calling this tool Claude must:
 - Read category_style carefully before writing any content
 - Read cultural_instructions before writing in Telugu or Hindi
 - For WhatsApp: fill variables into provided templates ONLY — never free-form text
 - For all other channels: write freely using category style and cultural instructions
 - Generate all 54 strings (6 channels × 3 variants × 3 languages)
 - Then call store_generated_content with all 54 strings
 - Then call send_to_webhooks_immediate if urgency=emergency
 - Or call store_in_schedule_queue if urgency=scheduled"

Parameters:
  merchant_id       STRING   required  "Must exist in merchants table"
  category          STRING   required  "food/jewellery/fashion/travel/electronics/grocery"
  discount_value    NUMBER   required  "e.g. 30 for 30% or 150 for flat ₹150 off"
  discount_type     STRING   required  "percentage or flat"
  expiry_timestamp  STRING   required  "ISO datetime e.g. 2025-03-02T23:59:00"
  min_order_value   NUMBER   optional  "default 0"
  max_redemptions   NUMBER   optional  "default unlimited"
  exclusive_flag    BOOLEAN  optional  "default false"
  urgency           STRING   required  "emergency or scheduled"

Returns to Claude:
  {
    coupon_id: "uuid-generated",
    validation: "passed",
    category_style: {
      tone: "informal energetic fun",
      style_guide: "full writing instructions for this category",
      example_words: "words Claude should use",
      avoid: "words and tones to avoid"
    },
    eligible_users_summary: {
      total_users: 150,
      languages_needed: ["english", "hindi", "telugu"],
      cities: ["Hyderabad", "Mumbai", "Delhi"]
    },
    whatsapp_templates: {
      english: {
        urgency:      { template_id, structure, use_when, variables_needed },
        value:        { template_id, structure, use_when, variables_needed },
        social_proof: { template_id, structure, use_when, variables_needed }
      },
      hindi: {
        urgency:      { template_id, structure, use_when, variables_needed },
        value:        { template_id, structure, use_when, variables_needed },
        social_proof: { template_id, structure, use_when, variables_needed }
      },
      telugu: {
        urgency:      { template_id, structure, use_when, variables_needed },
        value:        { template_id, structure, use_when, variables_needed },
        social_proof: { template_id, structure, use_when, variables_needed }
      }
    },
    cultural_instructions: {
      telugu: "Write like Hyderabad friend texting on WhatsApp...",
      hindi: "Write like Delhi/Mumbai friend, Hinglish acceptable...",
      english: "Indian English for urban millennials, use ₹ always..."
    },
    channel_limits: {
      email:     "subject_line + headline + cta_text — no char limit — must have all three",
      whatsapp:  "MUST use provided templates ONLY — fill variables only — do NOT write free-form",
      push:      "title max 50 chars + body max 100 chars",
      glance:    "max 160 chars — must work standalone without any context",
      payu:      "max 40 chars — must be action-oriented — start with a verb",
      instagram: "caption + minimum 3 hashtags — no strict char limit"
    }
  }
```

---

### TOOL 2: store_generated_content
```
Name: store_generated_content

Description (Claude reads this):
"Call this after generating ALL 54 strings.
 Pass complete array of all 54 content objects.
 This tool validates every string before storing:
 VALIDATION RULES:
 - push title must be <= 50 chars
 - push body must be <= 100 chars
 - glance content must be <= 160 chars
 - payu banner_text must be <= 40 chars
 - email must have subject_line, content (headline), and cta_text
 - instagram must have minimum 3 hashtags in content
 - all 54 combinations must be present (6 channels × 3 variants × 3 languages)
 - urgency and value variants must not be identical for same channel+language
 WHATSAPP RULE:
 - WhatsApp entries must have template_id and variables object
 - WhatsApp content field should be empty string
 - WhatsApp char count is NOT validated (templates pre-validated)
 If any validation fails this tool returns exactly which strings failed
 so Claude can regenerate ONLY those specific strings and call this tool again."

Parameters:
  coupon_id      STRING  required
  content_array  ARRAY   required
    Each item in array:
      channel       STRING   "email/whatsapp/push/glance/payu/instagram"
      language      STRING   "english/hindi/telugu"
      variant       STRING   "urgency/value/social_proof"
      content       STRING   "generated string — empty string for whatsapp"
      subject_line  STRING   "email ONLY — email subject"
      cta_text      STRING   "email ONLY — call to action"
      template_id   STRING   "whatsapp ONLY — which template was used"
      variables     OBJECT   "whatsapp ONLY — { merchant, discount, min_order, expiry, ... }"

Returns to Claude:
  Success:
  { success: true, stored_count: 54, coupon_id: "..." }

  Failure:
  {
    success: false,
    stored_count: 51,
    failed_validations: [
      { channel: "push", language: "hindi", variant: "urgency",
        error: "title exceeds 50 chars — current length: 63" },
      { channel: "payu", language: "telugu", variant: "value",
        error: "exceeds 40 chars — current length: 47" },
      { channel: "whatsapp", language: "english", variant: "urgency",
        error: "template_id missing — must use template not free-form text" }
    ]
  }
```

---

### TOOL 3: send_to_webhooks_immediate
```
Name: send_to_webhooks_immediate

Description (Claude reads this):
"Use ONLY for emergency deals after store_generated_content returns success.
 This tool handles ALL sending internally — Claude does not need to loop through users.
 Internally this tool:
 1. Fetches all eligible users from DB (filtered by category preference)
 2. For each user determines correct language (from user profile or city)
 3. For each user determines correct variant (from user activity history)
 4. Fetches matching content from generated_content table
 5. For WhatsApp: calls WhatsAppAssemblyService to replace {{variables}}
    in template structure with stored variable values — produces final message
 6. Fires HTTP POST to all 6 mock channel endpoints for each user
 7. Logs every attempt to delivery_logs table
 8. Automatically retries failed deliveries (up to 3 attempts)
 9. Updates analytics table
 10. Returns complete delivery report"

Parameters:
  coupon_id  STRING  required

Returns to Claude:
  {
    coupon_id: "...",
    total_users_targeted: 150,
    delivery_summary: {
      email:     { sent: 150, delivered: 142, failed: 8,  rate: "94.7%" },
      whatsapp:  { sent: 120, delivered: 115, failed: 5,  rate: "95.8%" },
      push:      { sent: 140, delivered: 131, failed: 9,  rate: "93.6%" },
      glance:    { sent: 150, delivered: 148, failed: 2,  rate: "98.7%" },
      payu:      { sent: 150, delivered: 144, failed: 6,  rate: "96.0%" },
      instagram: { sent: 150, delivered: 139, failed: 11, rate: "92.7%" }
    },
    overall_delivery_rate: "95.2%",
    retry_summary: "12 failed deliveries queued for retry in 5 minutes"
  }
```

---

### TOOL 4: store_in_schedule_queue
```
Name: store_in_schedule_queue

Description (Claude reads this):
"Use for non-emergency scheduled deals after store_generated_content returns success.
 This tool saves the deal to schedule_queue with the correct send_at time
 based on category timing rules:
   food        → next occurrence of 11:30 or 18:30
   jewellery   → next occurrence of 10:00 or 18:00
   fashion     → next occurrence of 10:00 or 20:00
   travel      → next Friday at 18:00
   electronics → next Saturday at 10:00
   grocery     → next Sunday at 09:00
 IMPORTANT: After calling this tool Claude's job is COMPLETE for this deal.
 The scheduler (node-schedule running inside the server) will handle
 all sending at the correct time automatically.
 No further Claude involvement needed for scheduled deals."

Parameters:
  coupon_id  STRING  required
  category   STRING  required  "used to calculate correct send_at time"

Returns to Claude:
  {
    success: true,
    coupon_id: "...",
    scheduled_at: "2025-03-01T11:30:00",
    category: "food",
    eligible_users: 150,
    message: "Deal queued. Scheduler will send at 11:30 IST today to 150 eligible users. Claude job complete."
  }
```

---

### TOOL 5: get_delivery_report
```
Name: get_delivery_report

Description (Claude reads this):
"Fetches complete delivery status report for a specific coupon.
 Shows per-channel delivery rates, total sent, delivered, failed,
 retry counts, variant performance and current deal status.
 Use this to check status of any deal — works for both
 emergency deals (after sending) and scheduled deals (after scheduler fires)."

Parameters:
  coupon_id  STRING  required

Returns to Claude:
  {
    coupon_id: "...",
    merchant: "Zomato",
    category: "food",
    urgency: "emergency",
    status: "sent",
    total_strings_generated: 54,
    channels: {
      email:     { sent: 150, delivered: 142, failed: 8,  retried: 3 },
      whatsapp:  { sent: 120, delivered: 118, failed: 2,  retried: 2 },
      push:      { sent: 140, delivered: 135, failed: 5,  retried: 5 },
      glance:    { sent: 150, delivered: 149, failed: 1,  retried: 1 },
      payu:      { sent: 150, delivered: 145, failed: 5,  retried: 4 },
      instagram: { sent: 150, delivered: 140, failed: 10, retried: 6 }
    },
    overall_delivery_rate: "95.1%",
    variants_performance: {
      urgency:      "sent to 60 users — 95.0% delivered",
      value:        "sent to 50 users — 94.0% delivered",
      social_proof: "sent to 40 users — 97.5% delivered"
    }
  }
```

---

### TOOL 6: get_merchant_analytics
```
Name: get_merchant_analytics

Description (Claude reads this):
"Fetches analytics for merchant reporting and company-level overview.
 Returns coupons uploaded today per merchant, delivery success rates,
 best performing channels, and top merchant of the day.
 If merchant_id is provided returns only that merchant's data.
 If merchant_id is empty string or not provided returns all merchants
 and company totals — useful for GrabOn internal analytics view."

Parameters:
  merchant_id  STRING  optional  "empty string for all merchants company view"
  date_filter  STRING  optional  "ISO date format — defaults to today"

Returns to Claude:
  {
    date: "2025-02-27",
    top_merchant_today: "Zomato — 5 deals uploaded",
    merchants: [
      {
        merchant_id: "zomato_01",
        merchant_name: "Zomato",
        coupons_today: 5,
        total_delivered: 234,
        total_failed: 12,
        delivery_rate: "95.1%",
        best_channel: "whatsapp"
      }
    ],
    company_totals: {
      total_deals_today: 15,
      total_strings_generated: 810,
      overall_delivery_rate: "93.2%"
    }
  }
```

---

### TOOL 7: get_category_style
```
Name: get_category_style

Description (Claude reads this):
"Fetches tone, style guide, example words and things to avoid
 for a given category. Helps Claude understand how to write
 content matching the category brand voice.
 NOTE: distribute_deal already returns this inside category_style.
 Only call this separately if you need style info without distributing a deal
 or if you want to verify style rules for content quality check."

Parameters:
  category  STRING  required

Returns to Claude:
  {
    category: "food",
    tone: "informal energetic fun",
    style_guide: "Write like a food-loving friend recommending a deal...",
    example_words: "Hungry, Grab, Yummy, Sizzling, Delicious, Don't miss",
    avoid: "formal language, corporate tone, passive voice, complex sentences"
  }
```

---

### TOOL 8: get_eligible_users
```
Name: get_eligible_users

Description (Claude reads this):
"Fetches summary of all users eligible for a deal of given category.
 Returns only users with opted_in=true for that category in user_preferences.
 Returns count and breakdown by language and city — not full user list.
 NOTE: distribute_deal already returns eligible_users_summary.
 Only call this separately if you need user info without distributing a deal
 or to verify audience before generating content."

Parameters:
  category        STRING  required
  location_filter STRING  optional  "filter by specific city"

Returns to Claude:
  {
    total_eligible: 150,
    by_language: {
      telugu: 60,
      hindi: 55,
      english: 35
    },
    by_city: {
      Hyderabad: 60,
      Mumbai: 45,
      Delhi: 30,
      others: 15
    }
  }
```

---

### TOOL 9: get_whatsapp_templates
```
Name: get_whatsapp_templates

Description (Claude reads this):
"Fetches available pre-defined WhatsApp template structures for
 a specific category, language and variant combination.
 Returns template_id, structure with {{variable}} placeholders,
 use_when description and list of variables needed.
 CRITICAL RULE — Claude must follow this always:
   Claude must NEVER write free-form WhatsApp text.
   Claude must ONLY fill {{variables}} in pre-defined template structures.
   Variables Claude can fill: {{merchant}} {{discount}} {{min_order}}
   {{expiry}} {{product_type}} {{destination}}
   After picking template based on use_when description Claude fills
   variables and passes template_id + variables object to store_generated_content.
   Claude must NOT pass assembled WhatsApp text — pass template_id + variables.
 NOTE: distribute_deal already returns all WA templates for all combinations.
 Only call this separately if you need templates for one specific combination."

Parameters:
  category  STRING  required
  language  STRING  required  "english/hindi/telugu"
  variant   STRING  required  "urgency/value/social_proof"

Returns to Claude:
  [
    {
      template_id: "WA_FOOD_EN_URGENCY",
      structure: "⚡ {{merchant}} Flash Sale! {{discount}} on orders above {{min_order}}. Ends {{expiry}}!",
      use_when: "Use for food/restaurant deals marked emergency or expiring within 3 hours. Strong urgency needed.",
      variables_needed: ["merchant", "discount", "min_order", "expiry"]
    }
  ]
```

---

## 7. COMPLETE LAYER-BY-LAYER FLOW

### How Every Tool Call Travels Through Architecture

```
CLAUDE DESKTOP
calls: distribute_deal(params)
          ↓
src/mcp/tools.ts  ← THIN LAYER
receives MCP call
calls: DealDistributionService.initiateDeal(params)
          ↓
src/services/DealDistributionService.ts  ← BUSINESS LOGIC
calls InputValidator.validate(params)
  → if fails: returns error to tools.ts → back to Claude
calls MerchantRepository.findById(merchant_id)
  → if not found: returns error to tools.ts → back to Claude
calls CouponRepository.create(couponData)
  → coupon_id generated and saved to DB
calls CategoryRepository.findByName(category)
  → returns category style, timing, tone
calls UserRepository.getEligibleUsersSummary(category)
  → returns language breakdown and city breakdown
calls TemplateRepository.getAllWATemplatesForCategory(category)
  → returns all 9 WA template structures (3 languages × 3 variants)
assembles full response object
returns to tools.ts
          ↓
src/mcp/tools.ts
returns assembled response to Claude Desktop
          ↓

CLAUDE DESKTOP — reads response
generates 54 strings using context:
  Reads category_style → knows tone and vocabulary
  Reads cultural_instructions → knows how to write Telugu/Hindi
  Reads whatsapp_templates → picks correct template per language+variant
  For WhatsApp: fills variables only — does NOT write free-form
  For email/push/glance/payu/instagram: writes freely
          ↓

CLAUDE DESKTOP
calls: store_generated_content(coupon_id, content_array)
          ↓
src/mcp/tools.ts
calls: OutputValidator.validateAll(content_array)
  → checks push char limits, glance limits, payu limits
  → checks email fields present
  → checks instagram has hashtags
  → checks all 54 present
  → checks variants not identical
  → if any fail: returns validation errors to Claude
calls: GeneratedContentRepository.storeAll(coupon_id, content_array)
  → stores all 54 rows to generated_content table
  → for whatsapp: stores template_id + variables JSON (not assembled text)
returns success to tools.ts → back to Claude
          ↓

IF urgency = emergency:
CLAUDE DESKTOP
calls: send_to_webhooks_immediate(coupon_id)
          ↓
src/mcp/tools.ts
calls: WebhookService.sendImmediate(coupon_id)
          ↓
src/services/WebhookService.ts
calls UserRepository.getEligibleUsers(category)
  → returns full user list with language + city
for each user:
  determines language: user.preferred_language || city-based default
  determines variant: based on user activity in delivery_logs
  calls GeneratedContentRepository.findMatch(coupon_id, channel, language, variant)
  if channel = whatsapp:
    calls WhatsAppAssemblyService.assemble(template_id, variables)
    → TemplateRepository.findById(template_id) → gets structure
    → replaces {{merchant}} → variable value
    → replaces {{discount}} → variable value
    → replaces {{min_order}} → variable value
    → replaces {{expiry}} → variable value
    → returns final assembled message string
  calls POST http://localhost:3001/mock/{channel} with content
    → MockWebhookController receives
    → returns { status: "delivered"/"failed"/"pending" }
  calls DeliveryLogRepository.create(log data)
  if status = failed → schedule retry after 5 minutes
calculates per-channel delivery rates
calls AnalyticsRepository.upsert(analytics data)
returns delivery summary to tools.ts → back to Claude

CLAUDE DESKTOP shows delivery report in chat
          ↓

IF urgency = scheduled:
CLAUDE DESKTOP
calls: store_in_schedule_queue(coupon_id, category)
          ↓
src/mcp/tools.ts
calls: SchedulerService.calculateSendTime(category)
  → reads category send_times from DB
  → calculates next occurrence from now
calls: ScheduleQueueRepository.create(coupon_id, send_at)
returns confirmation to tools.ts → back to Claude

CLAUDE DESKTOP session can end — Claude done

SCHEDULER (node-schedule, runs 24/7 inside server process)
at calculated send_at time:
  reads schedule_queue for due items
  for each due item: runs same sending logic as WebhookService.sendImmediate
  marks queue item status = sent
  logs all deliveries
  updates analytics
  NO CLAUDE INVOLVED AT ALL
```

---

## 8. WHATSAPP EXACT FLOW — STEP BY STEP

```
STEP 1 — distribute_deal returns WA templates to Claude:
  whatsapp_templates.english.urgency = {
    template_id: "WA_FOOD_EN_URGENCY",
    structure: "⚡ {{merchant}} Flash Sale! {{discount}} on orders above {{min_order}}. Ends {{expiry}}!",
    use_when: "Use for emergency food deals"
  }
  whatsapp_templates.telugu.urgency = {
    template_id: "WA_FOOD_TE_URGENCY",
    structure: "⚡ {{merchant}} లో సేల్! {{discount}} తగ్గింపు. {{min_order}} పైన ఆర్డర్. {{expiry}} వరకే!",
    use_when: "Emergency food deals for Telugu users"
  }

STEP 2 — Claude reads use_when for each template
  Claude picks which template fits current deal based on use_when description
  For Zomato food emergency → picks urgency templates for all 3 languages

STEP 3 — Claude fills ONLY the variable values
  Claude does NOT assemble the final message string
  Claude decides what each variable should say:

  For English urgency template:
  {
    template_id: "WA_FOOD_EN_URGENCY",
    variables: {
      merchant: "Zomato",
      discount: "30% off",
      min_order: "₹199",
      expiry: "Sunday midnight"
    }
  }

  For Telugu urgency template:
  {
    template_id: "WA_FOOD_TE_URGENCY",
    variables: {
      merchant: "Zomato",
      discount: "30% తగ్గింపు",       ← Claude translates variable value to Telugu
      min_order: "₹199",
      expiry: "ఆదివారం అర్థరాత్రి"    ← Claude translates variable value to Telugu
    }
  }

  For Hindi urgency template:
  {
    template_id: "WA_FOOD_HI_URGENCY",
    variables: {
      merchant: "Zomato",
      discount: "30% की छूट",          ← Claude translates variable value to Hindi
      min_order: "₹199",
      expiry: "रविवार आधी रात"         ← Claude translates variable value to Hindi
    }
  }

STEP 4 — Claude calls store_generated_content
  WhatsApp entries passed as:
  {
    channel: "whatsapp",
    language: "telugu",
    variant: "urgency",
    content: "",                        ← empty string for whatsapp
    template_id: "WA_FOOD_TE_URGENCY", ← which template
    variables: {                        ← filled values
      merchant: "Zomato",
      discount: "30% తగ్గింపు",
      min_order: "₹199",
      expiry: "ఆదివారం అర్థరాత్రి"
    }
  }

STEP 5 — GeneratedContentRepository stores to DB:
  generated_content table row:
  {
    content_id: "uuid",
    coupon_id: "zomato_001",
    channel: "whatsapp",
    language: "telugu",
    variant: "urgency",
    content: "",
    template_id: "WA_FOOD_TE_URGENCY",
    variables: '{"merchant":"Zomato","discount":"30% తగ్గింపు","min_order":"₹199","expiry":"ఆదివారం అర్థరాత్రి"}'
  }

STEP 6 — At send time (emergency: WebhookService / scheduled: SchedulerService)
  WhatsAppAssemblyService.assemble() is called:
  1. Receives template_id and variables JSON string
  2. Calls TemplateRepository.findById("WA_FOOD_TE_URGENCY")
     → returns structure: "⚡ {{merchant}} లో సేల్! {{discount}} తగ్గింపు. {{min_order}} పైన ఆర్డర్. {{expiry}} వరకే!"
  3. Parses variables JSON
  4. Replaces {{merchant}} → "Zomato"
  5. Replaces {{discount}} → "30% తగ్గింపు"
  6. Replaces {{min_order}} → "₹199"
  7. Replaces {{expiry}} → "ఆదివారం అర్థరాత్రి"
  8. Final assembled message:
     "⚡ Zomato లో సేల్! 30% తగ్గింపు తగ్గింపు. ₹199 పైన ఆర్డర్. ఆదివారం అర్థరాత్రి వరకే!"
  9. POST /mock/whatsapp with assembled message
  10. Log delivery status

  CLAUDE NEVER ASSEMBLES THE FINAL WHATSAPP MESSAGE
  ASSEMBLY ALWAYS HAPPENS IN WhatsAppAssemblyService AT SEND TIME
```

---

## 9. SCHEDULER — COMPLETE LOGIC

### Setup
node-schedule runs inside same Node.js process as MCP server.
Starts automatically when server starts.
Runs silently in background 24/7.

### Category Timing Rules
```
food        → ["11:30", "18:30"]   before lunch and dinner
jewellery   → ["10:00", "18:00"]   morning browse and evening
fashion     → ["10:00", "20:00"]   morning and late evening
travel      → ["Friday 18:00"]     weekend planning time
electronics → ["Saturday 10:00"]   weekend purchase time
grocery     → ["Sunday 09:00"]     weekly shopping planning
```

### Per-User Decision Logic at Send Time
```
LANGUAGE:
  if user.preferred_language set → use it
  else if city in [Hyderabad, Vijayawada, Vizag] → telugu
  else if city in [Mumbai, Delhi, Jaipur, Lucknow] → hindi
  else → english

VARIANT:
  if last active > 30 days → social_proof (re-engage with community proof)
  if account age < 7 days → value (new user needs reason)
  else → urgency (regular active user)

CHANNELS TO SEND:
  if time > 22:00 OR time < 08:00 → skip push notification
  if user.phone exists → include whatsapp
  if user.email exists → include email
  if user.device_token exists AND time ok → include push
  always include: glance, payu, instagram
```

### Retry Logic
```
webhook returns "failed":
  schedule retry in 5 minutes

second failure:
  schedule retry in 15 minutes

third failure:
  mark status = permanently_failed
  no more retries
  log final failure

server restart catch-up:
  on startup check schedule_queue:
  SELECT * WHERE scheduled_at < NOW() AND status = 'waiting'
  process immediately — log as sent_late
```

### Edge Case — Last Minute Upload
```
when deal enters schedule_queue:
  if (scheduled_at - NOW) < 15 minutes:
    if urgency = emergency → already handled by immediate path
    if urgency = scheduled → reject:
      return "Please schedule minimum 15 minutes ahead or use emergency"

  on every new queue INSERT:
    immediately notify node-schedule of new job
    scheduler adjusts without restart
```

---

## 10. VALIDATION — INPUT AND OUTPUT

### InputValidator.ts — Before Claude Sees Anything
```
merchant_id:
  SELECT from merchants WHERE merchant_id = ? AND is_active = 1
  if not found → error: "Merchant not found or inactive"

category:
  must be in: ['food','jewellery','fashion','travel','electronics','grocery']
  if not valid → error: "Invalid category. Valid: food/jewellery/fashion/travel/electronics/grocery"

discount_value:
  must be numeric AND > 0
  if discount_type = percentage → must be <= 100
  if discount_type = flat → must be <= 10000
  error: "Invalid discount value"

expiry_timestamp:
  must be valid ISO datetime parseable
  must be > Date.now()
  error: "Expiry must be a future date"

min_order_value:
  if provided → must be >= 0
  error: "Min order cannot be negative"

max_redemptions:
  if provided → must be positive integer
  error: "Max redemptions must be a positive integer"

urgency:
  must be 'emergency' or 'scheduled'
  if not provided → default to 'scheduled' (no error)
  error: "Urgency must be emergency or scheduled"
```

### OutputValidator.ts — After Claude Generates Content
```
NOTE: WhatsApp is NOT char-validated here.
WhatsApp uses pre-defined templates validated when stored in whatsapp_templates table.
WhatsApp entries must have template_id and variables — not content string.

push.title:
  must be <= 50 characters (content.split('|')[0] for push)
  error: { channel, language, variant, error: "push title X chars, max 50" }

push.body:
  must be <= 100 characters
  error: { channel, language, variant, error: "push body X chars, max 100" }

glance:
  content must be <= 160 characters
  error: { channel, language, variant, error: "glance X chars, max 160" }

payu:
  content must be <= 40 characters
  error: { channel, language, variant, error: "payu X chars, max 40" }

email:
  subject_line must not be empty
  content (headline) must not be empty
  cta_text must not be empty
  error: "email missing subject_line/content/cta_text"

instagram:
  content must contain >= 3 occurrences of '#' character
  content must not be empty
  error: "instagram needs minimum 3 hashtags"

whatsapp:
  template_id must not be empty
  variables must not be empty object
  content field should be empty string (not free-form text)
  error: "whatsapp must use template_id and variables — not free-form content"

completeness:
  count items per combination: 6 channels × 3 variants × 3 languages = 54
  find any missing combinations
  error: "Missing combinations: push-hindi-value, glance-telugu-social_proof"

variant diversity:
  for each channel+language combo:
    urgency.content must not === value.content
    urgency.content must not === social_proof.content
    value.content must not === social_proof.content
  error: "Variants identical for email-english — urgency and value are same string"
```

---

## 11. MOCK WEBHOOK ENDPOINTS

### MockWebhookController.ts — Express on port 3001
```
All endpoints simulate real-world delivery with random outcomes:
  80% → "delivered"
  15% → "failed"    (triggers WebhookService retry logic)
  5%  → "pending"   (triggers follow-up check)

POST /mock/email
  accepts: { subject, content, cta_text, language, variant, coupon_id }
  validates: subject not empty AND content not empty
  returns: { status, channel: "email", timestamp }

POST /mock/whatsapp
  accepts: { assembled_message, language, variant, coupon_id }
  validates: assembled_message not empty
  NOTE: char limit NOT checked — WhatsAppAssemblyService ensures correct length
  returns: { status, channel: "whatsapp", timestamp }

POST /mock/push
  accepts: { title, body, language, variant, coupon_id }
  validates: title not empty AND body not empty
  NOTE: char limits validated in OutputValidator before this point
  returns: { status, channel: "push", timestamp }

POST /mock/glance
  accepts: { content, language, variant, coupon_id }
  validates: content not empty
  returns: { status, channel: "glance", timestamp }

POST /mock/payu
  accepts: { banner_text, language, variant, coupon_id }
  validates: banner_text not empty
  returns: { status, channel: "payu", timestamp }

POST /mock/instagram
  accepts: { caption, language, variant, coupon_id }
  validates: caption not empty
  returns: { status, channel: "instagram", timestamp }
```

---

## 12. WHATSAPP TEMPLATES — COMPLETE LIBRARY

### Food Category
```
WA_FOOD_EN_URGENCY:
  structure: "⚡ {{merchant}} Flash Sale! {{discount}} on orders above {{min_order}}. Ends {{expiry}}!"
  use_when: "Emergency food deals, any restaurant or delivery app, expiring within hours"

WA_FOOD_EN_VALUE:
  structure: "Save big with {{merchant}}! {{discount}} on your next order. Min order {{min_order}}. Valid till {{expiry}}"
  use_when: "Scheduled food deals where saving money is the main message"

WA_FOOD_EN_SOCIAL:
  structure: "Thousands already ordered! {{merchant}} {{discount}} off. Min {{min_order}}. Don't miss — ends {{expiry}}"
  use_when: "Food deals where community proof is the hook"

WA_FOOD_HI_URGENCY:
  structure: "⚡ {{merchant}} का धमाका! {{discount}} की छूट। {{min_order}} से ऑर्डर करें। {{expiry}} तक!"
  use_when: "Emergency food deals for Hindi speaking users — assertive urgent tone"

WA_FOOD_HI_VALUE:
  structure: "पैसे बचाओ! {{merchant}} पर {{discount}} की छूट। Min ऑर्डर {{min_order}}। {{expiry}} तक valid"
  use_when: "Scheduled food deals for Hindi users emphasizing savings"

WA_FOOD_HI_SOCIAL:
  structure: "हजारों ने order किया! {{merchant}} {{discount}} off। {{min_order}} से। {{expiry}} से पहले लो"
  use_when: "Social proof food deals for Hindi users"

WA_FOOD_TE_URGENCY:
  structure: "⚡ {{merchant}} లో సేల్! {{discount}} తగ్గింపు. {{min_order}} పైన ఆర్డర్. {{expiry}} వరకే!"
  use_when: "Emergency food deals for Telugu speaking users — community and family warmth"

WA_FOOD_TE_VALUE:
  structure: "{{merchant}} లో {{discount}} ఆదా చేయండి! {{min_order}} పైన ఆర్డర్ చేయండి. {{expiry}} వరకు valid"
  use_when: "Scheduled food deals for Telugu users emphasizing savings"

WA_FOOD_TE_SOCIAL:
  structure: "వేలమంది ఆర్డర్ చేశారు! {{merchant}} {{discount}} తగ్గింపు. {{min_order}} పైన. {{expiry}} లోపు తీసుకోండి"
  use_when: "Social proof food deals for Telugu users"
```

### Jewellery Category
```
WA_JEWEL_EN_URGENCY:
  structure: "Exclusive! {{merchant}} — {{discount}} on {{product_type}}. Timeless elegance awaits. Till {{expiry}}"
  use_when: "Urgent premium jewellery deals — prestigious tone"

WA_JEWEL_EN_VALUE:
  structure: "{{merchant}} precious savings! {{discount}} off on {{product_type}}. A rare offer. Valid till {{expiry}}"
  use_when: "Scheduled jewellery deals emphasizing value and rarity"

WA_JEWEL_EN_SOCIAL:
  structure: "Coveted by thousands! {{merchant}} {{discount}} on {{product_type}}. Limited pieces. Till {{expiry}}"
  use_when: "Social proof jewellery deals — exclusivity angle"

WA_JEWEL_HI_URGENCY:
  structure: "विशेष अवसर! {{merchant}} पर {{product_type}} में {{discount}} की छूट। {{expiry}} तक सीमित"
  use_when: "Urgent jewellery deals for Hindi users — festive and occasion context"

WA_JEWEL_HI_VALUE:
  structure: "{{merchant}} का शानदार offer! {{product_type}} पर {{discount}} की बचत। {{expiry}} तक valid"
  use_when: "Scheduled jewellery deals for Hindi users — aspirational value"

WA_JEWEL_TE_URGENCY:
  structure: "ప్రత్యేక ఆఫర్! {{merchant}} లో {{product_type}} పై {{discount}} తగ్గింపు. {{expiry}} వరకు మాత్రమే"
  use_when: "Urgent jewellery deals for Telugu users — auspicious precious references"

WA_JEWEL_TE_VALUE:
  structure: "{{merchant}} లో {{product_type}} పై {{discount}} ఆదా చేయండి. అద్భుతమైన అవకాశం. {{expiry}} వరకు"
  use_when: "Scheduled jewellery deals for Telugu users — precious savings tone"
```

### General Fallback (all categories)
```
WA_GENERAL_EN:
  structure: "{{merchant}} special offer! {{discount}} off. Valid till {{expiry}}. Grab now!"
  use_when: "Use when no specific category template matches. Works for any deal type."

WA_GENERAL_HI:
  structure: "{{merchant}} का special offer! {{discount}} की छूट। {{expiry}} तक। अभी लो!"
  use_when: "Hindi fallback for any category when specific template missing"

WA_GENERAL_TE:
  structure: "{{merchant}} స్పెషల్ ఆఫర్! {{discount}} తగ్గింపు. {{expiry}} వరకు. ఇప్పుడే తీసుకోండి!"
  use_when: "Telugu fallback for any category when specific template missing"
```

---

## 13. CULTURAL GUARDRAILS

### Returned by distribute_deal inside cultural_instructions

#### Telugu
```
"Write Telugu like a friend from Hyderabad texting on WhatsApp.
 Use natural spoken Telugu — NOT formal bookish Telugu from textbooks.
 Telugu urgency uses community and family context more than individual FOMO.
 Natural Telugu urgency phrases to use:
   ఇప్పుడే తీసుకోండి — take it now
   అవకాశం వదులుకోకండి — do not miss the chance
   చాలా తక్కువ సమయం — very little time remaining
 Natural Telugu value phrases to use:
   బాగా ఆదా అవుతుంది — good savings happen
   చాలా మంచి డీల్ — very good deal
 NEVER directly translate English idioms to Telugu — rewrite culturally.
 Food deals: use warmth, home cooking comfort, family meal references.
 Jewellery deals: gold is auspicious in Telugu culture — use precious,
 occasion-based, and celebratory references — not just luxury."
```

#### Hindi
```
"Write Hindi like a Delhi or Mumbai friend texting casually.
 Hinglish (Hindi + English mix) is completely natural and acceptable.
 Hindi urgency is more direct and assertive than Telugu.
 Natural Hindi urgency phrases:
   अभी लो — grab it now
   मौका मत गँवाओ — don't miss the chance
   सीमित समय — limited time
 Natural Hindi value phrases:
   बचाओ पैसे — save money
   धमाकेदार डील — blockbuster deal
   बढ़िया offer — great offer
 Food deals: relatable everyday language, chai-break casual tone.
 Jewellery: aspirational and festive — Diwali and shaadi references work well."
```

#### English
```
"Write Indian English for urban Indian millennials.
 Not American English. Not British English.
 Always use ₹ symbol for Indian Rupee — never Rs or INR in copy.
 Time references in IST context.
 Casual and fun for food and fashion categories.
 Premium and sophisticated for jewellery and exclusive deals.
 Use references relatable to Indian urban context."
```

---

## 14. SECURITY

### Implemented In This Project

#### 1. Input Validation — First Line of Defense
All inputs validated before Claude or database are touched.
Full rules in Section 10 InputValidator.

#### 2. MCP Server Localhost Only
```
MCP server uses stdio transport
Registered in claude_desktop_config.json as local command
Not exposed on any network port
Only Claude Desktop on same machine can connect
```

#### 3. SQLite Foreign Key Constraints
```
PRAGMA foreign_keys = ON; on every DB connection
Enforces:
  coupons.merchant_id → merchants.merchant_id
  coupons.category_id → categories.category_id
  user_preferences.user_id → users.user_id
  user_preferences.category_id → categories.category_id
  delivery_logs.coupon_id → coupons.coupon_id
  schedule_queue.coupon_id → coupons.coupon_id
```

#### 4. Rate Limiting on distribute_deal
```
In-memory Map tracking calls per merchant_id:
  key: merchant_id
  value: { count, window_start_ms }

if count > 10 within 60000ms:
  reject: "Rate limit exceeded. Max 10 deals per minute per merchant."
Reset count after 60 second window passes.
```

#### 5. Output Validation — Second Line of Defense
All Claude-generated content validated before storing to DB.
Full rules in Section 10 OutputValidator.

#### 6. Merchant Active Check on Every Tool
Any tool that uses merchant_id first verifies:
  merchant exists in DB
  merchant.is_active = true
  Reject immediately if either fails.

---

## 15. ANALYTICS

### What Is Tracked

#### Merchant Level
```
Total coupons uploaded per merchant per day
Total delivered per merchant
Delivery success rate per merchant
Best performing channel per merchant
Top merchant by volume today
```

#### Deal Level
```
Per channel delivery rate
Emergency vs scheduled count
Which variant performed best
```

#### Location Level (Schema Ready — Data Starts Accumulating Now)
```
locations table linked to both users and merchants
As delivery_logs fill up with real data:
  delivery rates by city become queryable
  delivery rates by region become queryable
  delivery rates by tier (metro vs tier2) become queryable
Future redemption tracking: add coupon_activity table
  coupon_id, user_id, location_id, action, timestamp
  No schema changes needed — just new table
```

---

## 16. 3-TIER ARCHITECTURE — LAYER RESPONSIBILITIES

### Layer 1 — MCP Tools (src/mcp/tools.ts)
```
Responsibility: Entry point only
Does: Receives MCP tool call from Claude Desktop
Does: Calls correct service method with params
Does: Returns service result back to Claude Desktop
Does NOT: Business logic
Does NOT: Direct DB queries
Does NOT: Validation (calls validators before calling service)
```

### Layer 2 — Services (src/services/)
```
Responsibility: All business logic
Does: Orchestrates multi-step operations
Does: Calls repositories for data access
Does: Calls other services when needed
Does: Calculates derived values (rates, timing, send_at)
Does NOT: Direct SQL queries (delegates to repositories)
Does NOT: MCP protocol handling (that is tools layer)
```

### Layer 3 — Repositories (src/repositories/)
```
Responsibility: Database access only
Does: Supabase client queries (supabase.from('table').select/insert/update)
Does: Maps response rows to JavaScript objects
Does: Basic Supabase error handling
Does NOT: Business logic of any kind
Does NOT: Calling other repositories in chains
Does NOT: Validation
```

---

## 17. IMPLEMENTATION ORDER

### Day 1 — Foundation
```
Morning:
  npm init -y
  Install: @modelcontextprotocol/sdk @supabase/supabase-js express node-schedule uuid
  Install dev: typescript @types/node @types/express @types/uuid dotenv
  Create .env with SUPABASE_URL and SUPABASE_ANON_KEY
  Create .env.example (keys without values — safe to commit)
  Create src/config/supabase.js — shared Supabase client
  Create all TypeScript interfaces (src/interfaces/ — all 11 .ts files)
  Run schema SQL in Supabase dashboard SQL Editor — all 10 tables
  Run seed SQL in Supabase dashboard — 5 merchants, 50 users, 6 categories, WA templates
  Verify data in Supabase Table Editor

Afternoon:
  Create all 9 Repository files in .js (use supabase client, not raw SQL)
  Create src/validators/InputValidator.js
  Create src/validators/OutputValidator.js
  Create src/controllers/MockWebhookController.js (6 Express endpoints)
  Test mock endpoints with curl — verify random status responses

Evening:
  Create src/mcp/server.js — basic MCP server with stdio transport
  Create claude_desktop_config.json with absolute path
  Open Claude Desktop → Settings → MCP Servers → add config
  Verify Claude Desktop connects to MCP server successfully
```

### Day 2 — Core Pipeline
```
Morning:
  Create src/services/WhatsAppAssemblyService.js
  Create src/services/DealDistributionService.js
  Implement distribute_deal tool end to end in tools.js
  Implement store_generated_content tool
  Test: Claude types distribute command → 54 strings → stored in DB

Afternoon:
  Create src/services/WebhookService.js
  Implement send_to_webhooks_immediate tool
  Test complete emergency path end to end
  Verify delivery logs written to DB

Evening:
  Refine cultural prompts — test Telugu output quality
  Verify variant diversity — urgency vs value vs social proof are genuinely different
  Fix any validation failures
```

### Day 3 — Scheduler + Analytics + Polish
```
Morning:
  Create src/services/SchedulerService.js (node-schedule)
  Implement store_in_schedule_queue tool
  Test scheduled path end to end
  Implement retry logic in WebhookService.js

Afternoon:
  Create src/services/AnalyticsService.js
  Implement get_delivery_report tool
  Implement get_merchant_analytics tool
  Test all 9 tools with 3 different merchant deals

Evening:
  Add rate limiting to distribute_deal
  Final end-to-end testing — 3 merchant deals complete
  Prepare demo script
  Practice all 4 demo commands in Claude Desktop
```

---

## 18. DEMO SCRIPT

### Command 1 — Emergency Food Deal
```
"Distribute this deal — merchant Zomato, food category,
 30% percentage off, minimum order ₹199, expires Sunday midnight, emergency"

Expected in Claude Desktop:
✓ Coupon saved: zomato_001
✓ 54 strings generated across 6 channels × 3 variants × 3 languages
✓ WhatsApp: templates filled for English, Hindi, Telugu — no free-form text
✓ Webhooks fired immediately to all 6 channels
✓ Delivery rate: 94.2% overall
✓ Per channel breakdown shown
✓ Failed deliveries retried automatically
```

### Command 2 — Scheduled Jewellery Deal
```
"Schedule this deal — merchant Tanishq, jewellery category,
 20% off gold jewellery, expires next Friday, scheduled delivery"

Expected:
✓ 54 strings generated in premium royal tone
✓ Content stored — not sent yet
✓ Queued for 10:00 IST tomorrow (jewellery morning slot)
✓ 80 eligible users in jewellery preference segment
```

### Command 3 — Analytics
```
"Show me merchant analytics for today"

Expected:
✓ Top merchant: Zomato — 3 deals
✓ Total deals processed: 8
✓ Overall delivery rate: 93.1%
✓ Best channel: WhatsApp 96.2%
```

### Command 4 — Delivery Report
```
"Show delivery report for the Zomato deal"

Expected:
✓ Per channel breakdown with sent/delivered/failed
✓ Variant performance comparison
✓ Retry count summary
✓ Final success rate
```

---

## 19. CLAUDE DESKTOP CONFIG

```json
{
  "mcpServers": {
    "grabon-deal-distributor": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "cwd": "/absolute/path/to/grabon_mcp"
    }
  }
}
```

Location on Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
Location on Windows: %APPDATA%\Claude\claude_desktop_config.json

---

## 20. PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "@supabase/supabase-js": "^2.0.0",
    "express": "^4.18.0",
    "node-schedule": "^2.1.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/node-schedule": "^2.1.0",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "tsc",
    "start": "node src/mcp/server.js",
    "dev": "node src/mcp/server.js"
  }
}
```

---

*Complete project documentation. Node.js — TypeScript interfaces + JavaScript logic. 3-tier architecture.
All 9 MCP tools with exact descriptions, parameters and return values.
WhatsApp template system with full step-by-step flow.
Cultural guardrails for Telugu, Hindi, English.
Input validation, output validation, security, scheduler, analytics all covered.
Database: Supabase (PostgreSQL) — schema runs in Supabase dashboard, repos use @supabase/supabase-js client.
Interfaces in src/interfaces/*.ts — all other source files in plain .js.
Any LLM reading this document has complete context to implement the full system.*
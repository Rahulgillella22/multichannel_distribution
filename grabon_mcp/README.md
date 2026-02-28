# GrabOn MCP — Multi-Channel Deal Distribution Server

> **MCP server that turns one merchant deal into 54 formatted, localized deal placements across 6 channels — simultaneously.**

---

## ⚡ Quick Setup (Evaluator — Start Here)

### Prerequisites
- [Claude Desktop](https://claude.ai/download) installed
- [Node.js](https://nodejs.org) v18+ installed

### One-Command Setup

1. **Clone / unzip** the project folder
2. **Run the setup script** — right-click `setup.ps1` → **"Run with PowerShell"**
   ```
   This auto-detects your Node path, installs dependencies,
   creates .env, and configures Claude Desktop correctly.
   ```
3. **Fully quit Claude Desktop** (right-click tray icon → Quit)
4. **Reopen Claude Desktop**
5. Go to **Settings → Developer** — confirm `grabon-deal-distributor` shows 🟢 **running**

---

## 🧪 Testing the MCP Server

### Test 1 — Run a Full Emergency Deal (Main Demo)

Open a **new chat** in Claude Desktop and type:

> *"Distribute an emergency food deal for merchant M001, 30% discount, expires 2026-03-30T23:59:00, min order ₹199. Complete the full pipeline."*

**What Claude will do automatically:**
1. `distribute_deal` → validates merchant, saves coupon to Supabase
2. Generates **54 content strings** (6 channels × 3 variants × 3 languages)
3. `store_generated_content` → validates + stores all 54 strings
4. `send_to_webhooks_immediate` → fires to all 6 mock endpoints per user
5. Shows **delivery report** with per-channel success rates

---

### Test 2 — Scheduled Deal

> *"Schedule a fashion deal for merchant M002, flat ₹150 off, expires 2026-04-01T23:59:00."*

Claude queues it for the next fashion send slot (10:00 or 20:00 IST).

---

### Test 3 — Analytics

> *"Show me analytics for all merchants today."*

---

### Test 4 — Eligible Users

> *"How many users are eligible for a jewellery deal?"*

---

## 🏗️ Architecture

```
Claude Desktop  ←—stdio—→  MCP Server (Node.js)
                                  ↓
                         Supabase (PostgreSQL)
                         ┌────────────────────┐
                         │ merchants          │
                         │ coupons            │
                         │ users              │
                         │ user_preferences   │
                         │ generated_content  │
                         │ delivery_logs      │
                         │ analytics          │
                         │ whatsapp_templates │
                         └────────────────────┘
                                  ↓
                    Mock Webhook Server (port 3001)
                    /mock/email  /mock/whatsapp
                    /mock/push   /mock/glance
                    /mock/payu   /mock/instagram
```

---

## 📦 MCP Tools Exposed

| Tool | Description |
|------|-------------|
| `distribute_deal` | **PRIMARY** — validates deal, saves coupon, returns style guide + templates |
| `store_generated_content` | Validates all 54 strings and stores to DB |
| `send_to_webhooks_immediate` | Fires to all 6 mock channels, logs delivery |
| `store_in_schedule_queue` | Queues deal for category-appropriate send time |
| `get_delivery_report` | Per-channel + per-user delivery status |
| `get_merchant_analytics` | Deal metrics across all merchants |
| `get_eligible_users` | User count by category, language, city |
| `get_whatsapp_templates` | Fetch pre-defined WhatsApp templates |
| `get_category_style` | Tone + style guide per category |

---

## 📊 Output Specification

For each merchant deal, the system generates **54 strings**:

| | English | Hindi | Telugu |
|---|---|---|---|
| **Email** | ✅ | ✅ | ✅ |
| **WhatsApp** | ✅ | ✅ | ✅ |
| **Push** | ✅ | ✅ | ✅ |
| **Glance** | ✅ | ✅ | ✅ |
| **PayU** | ✅ | ✅ | ✅ |
| **Instagram** | ✅ | ✅ | ✅ |

Each cell has **3 A/B variants**: `urgency` / `value` / `social_proof`

---

## 🔒 Safety Features
- Claude **cannot delete** any database records (proxy guard + tool name guard)
- All delivery failures are **auto-retried** up to 3 times after 5 minutes
- Webhook delivery is **simulated** (80% delivered, 15% failed, 5% pending)

---

## 🗂️ Project Structure

```
grabon_mcp/
├── setup.ps1                          ← Run this first!
├── claude_desktop_config.json         ← Template (auto-updated by setup.ps1)
├── src/
│   ├── mcp/
│   │   ├── server.js                  ← MCP entry point (stdio)
│   │   └── tools.js                   ← Tool definitions + handler
│   ├── services/
│   │   ├── DealDistributionService.js
│   │   ├── WebhookService.js          ← Delivery + retry logic
│   │   ├── SchedulerService.js
│   │   ├── AnalyticsService.js
│   │   └── WhatsAppAssemblyService.js
│   ├── repositories/                  ← All Supabase queries
│   ├── validators/
│   │   ├── InputValidator.js
│   │   └── OutputValidator.js         ← 54-string validation
│   ├── controllers/
│   │   └── MockWebhookController.js   ← Mock endpoints on :3001
│   ├── config/
│   │   └── supabase.js                ← Read/write-only guarded client
│   └── data/
│       ├── category_styles.json
│       └── whatsapp_templates.json
└── database.sql                       ← Full schema
```

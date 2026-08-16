# 🛒 ShopEasy — Full-Stack E-Commerce with MCP + Claude AI

A complete, production-shaped shopping website with AI built in:

```
┌──────────────────────────────────────────────────────────────┐
│  USER BROWSER                                                │
│     │                                                        │
│     ▼                                                        │
│  NEXT.JS FRONTEND (React + TailwindCSS)                      │
│  ├── Home · Products · Product Detail                        │
│  ├── Cart · Checkout (Stripe) · Order History                │
│  ├── Admin Dashboard (products / orders / analytics)         │
│  └── 🤖 AI Chat Widget ──────────────┐                       │
│     │                                │                       │
│     ▼                                ▼                       │
│  NODE.JS + EXPRESS API          MCP SERVER (Python)          │
│  ├── Auth (JWT + bcrypt)        ├── search_products()        │
│  ├── Product CRUD               ├── get_recommendations()    │
│  ├── Cart / Orders              ├── add_to_cart()            │
│  ├── Payments (Stripe)          ├── ai_analysis()            │
│  └── Redis cache                └── chat()  🧠 Claude brain  │
│     │                                │                       │
│     ▼                                ▼                       │
│  POSTGRESQL DATABASE        CLAUDE AI (Anthropic, optional)  │
└──────────────────────────────────────────────────────────────┘
```

## ✨ Features

| Core | AI (MCP) |
| --- | --- |
| 🏠 Home with featured products & banners | 🧠 AI product recommendations |
| 🔍 Search, filter, sort, pagination | 💬 AI shopping chatbot (floating widget) |
| 📦 Product detail pages | 🔎 Smart search — “wireless headphones under $100” |
| 🛒 Cart (guest + account sync) | 📊 AI analytics dashboard with written insights |
| 👤 JWT + bcrypt auth (customer / admin) | |
| 💳 Stripe Checkout (demo mode included) | |
| 📋 Order history + tracking | |
| 👨‍💼 Admin: add/edit/delete products, manage orders | |

## 🏗️ Architecture

```
shopeasy/
├── shopping-frontend/   Next.js 14 (Pages Router) + React 18 + Tailwind + zustand
├── shopping-backend/    Express + PostgreSQL (pg) + Redis (ioredis) + Stripe + JWT
├── mcp-server/          Python MCP server (JSON-RPC over stdio) + Claude brain
└── docker-compose.yml   PostgreSQL 16 + Redis 7 for local dev
```

**Zero-setup demo mode:** without any `.env` values the backend runs on
**embedded PostgreSQL (PGlite — real Postgres compiled to WASM)** with an
in-memory cache and **simulated Stripe payments**. Everything works out of
the box; add real services whenever you're ready.

## 🚀 Quickstart

```bash
# 1. Backend (port 5000)
cd shopping-backend
npm install
npm run seed        # optional — auto-seeds on first boot anyway
npm start

# 2. Frontend (port 3000)
cd ../shopping-frontend
npm install
npm run dev

# 3. Open http://localhost:3000
```

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@shopeasy.dev` | `admin123` |
| Customer | `demo@shopeasy.dev` | `demo123` |

### Try the AI

- Click the **🤖 sparkle button** (bottom-right) on any page → *“Recommend a gift under $80”*, *“yoga mats under $60”*, *“track SHOP-…”*
- On `/products`, toggle **✨ AI Search** and type a sentence
- On `/admin` (dashboard), read the **AI Analytics** insights written by the MCP server

## 🔌 Going production

```bash
# Real PostgreSQL + Redis
docker compose up -d

# Backend
cp shopping-backend/.env.example shopping-backend/.env
# edit .env → set DATABASE_URL, REDIS_URL, JWT_SECRET, STRIPE_SECRET_KEY, FRONTEND_URL
cd shopping-backend && npm run seed && npm start

# Frontend
cp shopping-frontend/.env.local.example shopping-frontend/.env.local
# edit → set API_URL to your deployed backend
cd shopping-frontend && npm run build && npm start
```

| Service | Where | Notes |
| --- | --- | --- |
| Frontend | **Vercel** | `npm run build`; set `API_URL` env |
| Backend | **Railway** (or Render/Fly) | `npm start`; attach Postgres + Redis |
| Postgres | Railway / Neon / Supabase | set `DATABASE_URL` |
| Redis | Railway / Upstash | set `REDIS_URL` |
| Stripe | dashboard.stripe.com | set `STRIPE_SECRET_KEY` + webhook → `/api/payments/webhook` |
| Claude | console.anthropic.com | set `ANTHROPIC_API_KEY` in the backend env |

> **MCP server in production:** set `DATABASE_URL` in the backend env and
> `pip install psycopg2-binary` — the MCP server then queries PostgreSQL
> directly. With `ANTHROPIC_API_KEY` (+ `pip install anthropic`) the chatbot
> and analytics insights are written by Claude using its MCP tool access.

## 🧪 MCP server standalone

```bash
cd mcp-server
python3 mcp_server.py --self-test          # verify the 7 tools
# drive it over stdio (any MCP client can):
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_products","arguments":{"query":"sneakers under 100"}}}' \
  | python3 mcp_server.py
```

## 📡 API overview

```
POST /api/auth/register · /api/auth/login · GET /api/auth/me
GET  /api/products?search=&category=&min_price=&max_price=&sort=&page=
GET  /api/products/featured · /api/products/:id
GET/POST/PATCH/DELETE /api/cart/*          (JWT)
POST /api/orders · GET /api/orders · GET /api/orders/:orderNumber
POST /api/payments/checkout · /demo-pay · /confirm · /webhook
POST /api/ai/chat · GET /api/ai/recommendations · /api/ai/search · /api/ai/analytics
GET  /api/admin/dashboard · CRUD /api/admin/products · /api/admin/orders  (admin JWT)
```

## 🧰 Stack

**Backend:** express · cors · pg · bcryptjs · jsonwebtoken · stripe · multer · helmet · dotenv · ioredis · @electric-sql/pglite · morgan · nodemon
**Frontend:** next · react · tailwindcss · axios · zustand · react-hot-toast · lucide-react · react-hook-form · @stripe/react-stripe-js · swiper
**AI:** Python MCP server (pure stdlib) · anthropic (optional) · psycopg2 (optional)

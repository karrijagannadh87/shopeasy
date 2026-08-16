# 🛒 ShopEasy — Full-Stack E-Commerce with MCP + Claude AI

<p align="center">
  <img src="docs/banner.png" alt="ShopEasy — full-stack e-commerce with MCP + Claude AI" width="100%" />
</p>

<p align="center">
  <a href="https://karrijagannadh87.github.io/shopeasy/"><img src="https://img.shields.io/badge/LIVE%20DEMO-GitHub%20Pages-4f46e5?style=for-the-badge&logo=githubpages&logoColor=white" alt="Live demo" /></a>
  <img src="https://img.shields.io/badge/Next.js%2014-React%20%2B%20Tailwind-black?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Express-PostgreSQL%20%2B%20Redis-339933?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Stripe%20Payments-635bff?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/AI-MCP%20%2B%20Claude-d97757?style=for-the-badge&logo=anthropic&logoColor=white" alt="MCP + Claude" />
</p>

> 🚀 **Try the live demo:** [**karrijagannadh87.github.io/shopeasy**](https://karrijagannadh87.github.io/shopeasy/) — a fully interactive static build where the AI chat, smart search, cart, checkout and admin dashboard all work in your browser (backed by a service-worker mock of the API).
> Sign in with `demo@shopeasy.dev / demo123` or `admin@shopeasy.dev / admin123`.

---

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

```
shopeasy/
├── shopping-frontend/   Next.js 14 (Pages Router) + React 18 + Tailwind + zustand
├── shopping-backend/    Express + PostgreSQL (pg) + Redis (ioredis) + Stripe + JWT
├── mcp-server/          Python MCP server (JSON-RPC over stdio) + Claude brain
├── docs/banner.png      README banner
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

## 🌐 Live demo (GitHub Pages)

The [live demo](https://karrijagannadh87.github.io/shopeasy/) is a static export of the
frontend (`.github/workflows/pages.yml` deploys it automatically on every push).
Because GitHub Pages can't run the Express/Python backend, the demo registers a
**service worker** (`shopping-frontend/public/sw.js`) that answers every `/api/*`
call from bundled demo data + localStorage — the same endpoints, same response
shapes, so the whole experience works: browsing, AI chat, smart search, cart
sync, checkout, order history and the admin dashboard.

```bash
# Build the static demo locally
cd shopping-frontend
NEXT_PUBLIC_STATIC_DEMO=true NEXT_PUBLIC_BASE_PATH=/shopeasy npm run build
npx serve out
```

> ⚠️ The demo is a *frontend-only* experience. Real authentication, Stripe
> charges, Postgres and the Python MCP server run with the backend (below).

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

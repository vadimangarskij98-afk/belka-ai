# BELKA AI

**Multi-agent AI coding platform** — chat with intelligent agents that think, write, and ship code like a senior developer.

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Express](https://img.shields.io/badge/Express-5-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

---

## Features

- **Multi-Agent Chat** — Create conversations with specialized AI agents (Coder, Architect, Reviewer, DevOps, etc.)
- **Voice Assistant** — Talk to BELKA CODER using speech recognition and text-to-speech
- **Real-time Code Generation** — Streaming responses with syntax-highlighted code blocks
- **Workspace** — Integrated terminal and file preview
- **Referral System** — Invite friends, both get 7 bonus requests
- **Subscription Plans** — Free, Pro, Enterprise with promo code support
- **Admin Panel** — Real-time analytics, user management, referral settings, model configuration
- **Security Hardened** — Helmet, CORS whitelist, rate limiting, JWT auth on all routes
- **Bilingual UI** — Russian and English with automatic detection
- **Dark Theme** — Beautiful glassmorphism design with animated backgrounds
- **Share Chats** — Generate public links to share conversations
- **MCP Protocol Support** — Connect external tools via Model Context Protocol

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Express 5, TypeScript, Pino logger |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | JWT (jsonwebtoken), bcrypt (cost 12) |
| AI | External API (BELKA CODER engine) |
| Security | Helmet, express-rate-limit, CORS |
| Build | esbuild, pnpm workspaces |
| API Codegen | Orval (OpenAPI 3.1) |

---

## Project Structure

```
belka-ai/
├── artifacts/
│   ├── belka-ai/              # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── pages/         # Home, Auth, Chat, Docs, Admin, Profile
│   │   │   ├── components/    # Modals, Layout, UI components
│   │   │   ├── lib/           # Auth, i18n, theme, utils
│   │   │   └── hooks/         # Custom React hooks
│   │   └── public/            # Static assets
│   └── api-server/            # Express API server
│       └── src/
│           ├── routes/        # auth, admin, conversations, referrals, etc.
│           ├── lib/           # logger, middleware
│           └── index.ts       # Server entry
├── lib/
│   ├── db/                    # Drizzle ORM schema + connection
│   ├── api-spec/              # OpenAPI specification
│   └── api-client-react/      # Generated React Query hooks
└── pnpm-workspace.yaml
```

---

## Database Schema

### Core Tables

| Table | Description |
|---|---|
| `users` | User accounts with email, password hash, role, plan, referral code |
| `conversations` | Chat conversations with title, agent association |
| `messages` | Individual messages (user/assistant) with content |
| `agents` | AI agent definitions (role, system prompt, capabilities) |
| `ai_models` | Configured AI models (admin-only) |

### Subscription & Billing

| Table | Description |
|---|---|
| `subscription_plans` | Plan definitions (free/pro/enterprise) with pricing |
| `promo_codes` | Discount codes with usage limits and expiry |
| `token_usage` | Daily token consumption tracking per user |

### Referral System

| Table | Description |
|---|---|
| `referrals` | Tracks referrer -> referred user relationships |
| `referral_settings` | Global config (bonus amount, active/inactive) |
| `api_requests` | API call logging for analytics |

### Other

| Table | Description |
|---|---|
| `memory_entries` | Long-term memory storage for agents |

---

## API Endpoints

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Conversations

| Method | Path | Description |
|---|---|---|
| GET | `/api/conversations` | List user conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Get conversation with messages |
| DELETE | `/api/conversations/:id` | Delete conversation |

### Chat

| Method | Path | Description |
|---|---|---|
| POST | `/api/belka/chat` | Send message (streaming SSE response) |

### Referrals

| Method | Path | Description |
|---|---|---|
| GET | `/api/referrals/my-code` | Get user's referral code |
| POST | `/api/referrals/apply` | Apply a referral code |
| GET | `/api/referrals/stats` | Get referral statistics |

### Admin (requires admin role)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/analytics` | 7-day usage analytics |
| GET/POST/PUT/DELETE | `/api/admin/models` | CRUD AI models |
| GET/PUT/DELETE | `/api/admin/users` | Manage users, roles, plans |
| GET/PUT | `/api/admin/subscriptions` | Manage subscription plans |
| GET/POST/PUT/DELETE | `/api/admin/promo-codes` | Manage promo codes |
| GET/PUT | `/api/admin/referral-settings` | Referral program config |
| GET | `/api/admin/referrals` | View all referrals |

### Subscriptions

| Method | Path | Description |
|---|---|---|
| GET | `/api/subscriptions/plans` | List available plans |
| POST | `/api/subscriptions/subscribe` | Subscribe to a plan |
| POST | `/api/subscriptions/apply-promo` | Validate promo code |

---

## Security

- **Helmet** — HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** — Configurable origin whitelist via `ALLOWED_ORIGINS` env var
- **Rate Limiting**:
  - Global: 500 requests / 15 minutes
  - Auth routes: 20 requests / 15 minutes
  - Chat routes: 30 requests / minute
- **JWT Authentication** — All protected routes require valid Bearer token
- **Password Hashing** — bcrypt with cost factor 12
- **Trust Proxy** — Properly configured for reverse proxy environments
- **Input Validation** — Email format, password length, username rules

---

## Referral System

Users can invite friends to earn bonus requests:

1. Every user gets a unique referral code on registration
2. New users can enter a referral code during or after registration
3. When a referral is applied, both the referrer and referred user get bonus requests
4. Default bonus: **7 free requests** per successful referral
5. Admin can configure bonus amount and enable/disable the program

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | No |
| `PORT` | API server port (default: 8080) | No |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+

### Installation

```bash
# Clone the repository
git clone https://github.com/vadimangarskij98-afk/belka-ai.git
cd belka-ai

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Push database schema
pnpm --filter @workspace/db run db:push

# Start development servers
pnpm --filter @workspace/api-server run dev    # API on port 8080
pnpm --filter @workspace/belka-ai run dev      # Frontend on port 5000
```

### Creating an Admin User

Register a regular user via the UI, then promote to admin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Deployment

The app is designed to run behind a reverse proxy. Key configuration:

- API server binds to `PORT` env var (default 8080)
- Frontend is a static Vite build served by any static host
- Database requires PostgreSQL 16+ with the schema pushed via Drizzle

```bash
# Build frontend
pnpm --filter @workspace/belka-ai run build

# Build API server
pnpm --filter @workspace/api-server run build

# Start API server in production
NODE_ENV=production pnpm --filter @workspace/api-server run start
```

---

## License

MIT

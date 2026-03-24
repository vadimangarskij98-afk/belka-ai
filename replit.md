# BELKA AI Workspace

## Overview

BELKA AI — платформа для работы с AI-агентами и чатами. pnpm workspace монорепозиторий на TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenRouter API (primary: Google Gemini 2.5 Flash, fallback models available)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT + bcrypt

## Structure

```text
workspace/
├── artifacts/              # Deployable applications
│   ├── belka-ai/           # React frontend (port 5000, path /)
│   └── api-server/         # Express API server (port 8080, path /api)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace config + catalog
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Database Tables

- `users` — пользователи
- `conversations` — разговоры (с полями `is_archived`, `archived_at` для архивации)
- `messages` — сообщения
- `agents` — AI-агенты
- `ai_models` — AI-модели
- `memory` — память агентов
- `subscription_plans` — планы подписки
- `token_usage` — использование запросов (requests)
- `repositories` — репозитории
- `promo_codes` — промокоды

## Workflows

- **BELKA AI Frontend** — `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/belka-ai run dev`
- **artifacts/api-server: API Server** — `PORT=8080 pnpm --filter @workspace/api-server run dev`

## Key Commands

- `pnpm --filter @workspace/api-spec run codegen` — регенерировать клиент и схемы из OpenAPI
- `pnpm --filter @workspace/db run push` — применить схему к базе данных
- `pnpm run typecheck` — полная проверка типов
- `pnpm --filter @workspace/api-server run seed:agents` — заполнить агентов в БД

## Agent System (artifacts/api-server/src/agent/)

Full multi-agent AI system:

- **core.ts** — BelkaAgent class: intent classification, memory-augmented prompts, web search integration, brainstorm orchestration
- **system-prompts.ts** — System prompts for all 6 agents
- **memory.ts** — MemoryManager: per-user isolated memory
- **web-search.ts** — WebSearch: Brave/Serper/DuckDuckGo fallback chain
- **external-agents.ts** — ExternalAgents: Claude, Gemini, OpenAI routing with streaming
- **orchestrator.ts** — BrainStormOrchestrator: multi-agent brainstorming
- **mcp-client.ts** — MCPClient: Model Context Protocol integration stub
- **error-monitor.ts** — Logger, AutoFixer, HealthMonitor

## API Routes

All routes prefixed with `/api`:
- `/api/auth/*` — authentication (login, register, logout, me)
- `/api/conversations/*` — conversations (with `?archived=true` filter)
- `/api/conversations/:id/archive` — PATCH to archive a conversation
- `/api/conversations/:id/unarchive` — PATCH to unarchive
- `/api/conversations/:id/messages` — messages
- `/api/agents/*` — AI agents
- `/api/admin/*` — administration
- `/api/healthz` — health check
- `/api/github/*` — GitHub OAuth + CRUD
- `/api/subscriptions/*` — subscriptions
- `/api/voice/*` — voice
- `/api/memory/*` — agent memory
- `/api/repositories/*` — repositories
- `/api/search/*` — search
- `/api/belka/chat` — POST proxy to belka-coder-api on Render
- `/api/code/run` — POST execute code (auth required)
- `/api/code/preview` — POST assemble HTML preview

## Environment Variables Required

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `OPENROUTER_API_KEY` — OpenRouter API key for AI models
- `JWT_SECRET` — JWT signing secret (defaults to "belka-ai-secret-key-2024")
- `GITHUB_CLIENT_ID` — GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth app client secret

## Code Runner

- **Route**: `/api/code/run` (POST, requires JWT auth)
- **Languages**: JavaScript (.mjs), TypeScript (tsx), Python, Bash removed for security
- **Security**: Sandboxed env (no process.env leakage), JWT auth required, 100KB code limit, 10s timeout
- **Preview**: `/api/code/preview` (POST) — assembles HTML/CSS/JS into full page

## UI Features

- **Sidebar**: Collapsible "Недавние чаты" with smooth max-height animation; click-outside-to-close; collapsed shows 5 recent with "Показать ещё"; dates shown, no icons before chat titles; initialLoadDone ref prevents flickering on refetch
- **Delete chat**: Hover shows trash icon, click opens dialog with Delete/Cancel/Archive options
- **Archive**: Sidebar has "Архив" section; archived chats stored 30 days; unarchive available
- **Gradient buttons**: `.belka-gradient` CSS class — animated dark blue/indigo/purple shimmer for buttons
- **Markdown rendering**: Chat messages rendered with `react-markdown` + `remark-gfm` (bold, lists, tables, inline code, links)
- **Streaming cursor**: Blinking cursor during AI response generation
- **Code preview**: Play button on HTML/CSS/JS code blocks opens preview iframe; Chat.tsx has preview modal with `buildPreviewFromMessages()`
- **Voice assistant**: Expanded phrase database; sidebar open/close, preview run, mode switch, navigation commands; fallback doesn't write to chat
- **Admin Agents panel**: Functional edit-prompt modal, capabilities modal, active toggle; response status checked before UI update
- **IDE features**: Real terminal (WebSocket sessions + execSync), file CRUD in workspace, git clone/commit/push, preview server management
- **Mode switcher**: Glass-effect animated pill indicator with 4 modes: Код, Чат, Мультиагент, Изображение; ResizeObserver for pill position stability
- **Image generation**: Mode "image" triggers Pollinations.ai; image displayed in streaming + persisted in message metadata; download button overlay on hover
- **Streaming indicators**: Thinking timer (seconds counter per step), tool_call/tool_result blocks for file operations, thinking_start/thinking_end SSE events
- **Workspace**: Default ~/belka-workspace; user can set custom path; agent auto-creates files from code blocks
- **Terminal**: POST /api/terminal/exec for one-shot commands, /api/terminal/create + /api/terminal/:id/write for sessions
- **Git**: /api/git/clone, /api/git/status, /api/git/commit, /api/git/push, /api/git/log, /api/git/init
- **Preview server**: /api/preview/start (auto-detect npm/python), /api/preview/stop, /api/preview/status with live logs

## External Agent (belka-coder-api)

- **URL**: `https://belka-coder-api-production.up.railway.app`
- **Hosted on**: Railway.app (auto-deploy from GitHub)
- **GitHub repo**: `vadimangarskij98-afk/belka-coder-api`
- **Flow**: Chat → API server `callBelkaCoder()` → Railway → response; if Railway fails → fallback to direct OpenRouter
- **Endpoints**: POST `/chat`, GET `/health`

## GitHub

- **Repos**: `vadimangarskij98-afk/belka-ai` (main), `vadimangarskij98-afk/belka-coder-api` (agent)
- **Push method**: GitHub REST API (chunked tree creation for large repos)

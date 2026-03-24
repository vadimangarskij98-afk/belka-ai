# BELKA AI

Multi-agent AI chat platform with code generation, voice assistant, and integrated development tools.

## Features

### AI Chat
- Multi-agent system with Code, Chat, Multi-Agent, and Image generation modes
- Real-time streaming responses via external AI backend
- Conversation history with archiving support
- File attachments and image preview with click-to-enlarge
- Markdown rendering with syntax-highlighted code blocks

### Development Tools
- **Preview Server** — Draggable, resizable floating window with live iframe preview of user projects. Start/stop dev servers with custom commands, view logs, errors, and fullscreen mode
- **Terminal** — Floating draggable terminal with full bash command execution, command history (arrow keys), session persistence, and fullscreen support
- **Workspace Folder** — File browser with directory tree navigation. Select any folder as workspace, browse files/folders, persistent workspace path
- **GitHub Integration** — Connect repositories, push/pull code, manage files directly from the platform

### Voice Assistant
- Full Russian-language voice control via Web Speech API
- 900+ trigger phrases for navigation, commands, and conversation
- Voice commands for all UI actions: open terminal, preview, docs, profile, settings, pricing
- Dictation mode for hands-free message input
- Interrupt handling with natural responses
- Pre-recorded MP3 audio with speechSynthesis fallback
- ElevenLabs API integration for high-quality TTS

### User System
- JWT authentication with bcrypt password hashing
- User profiles with DiceBear 3D avatars (per-user scoped)
- Subscription plans (Free / Pro / Enterprise) with request tracking
- Admin dashboard with user management, model configuration, and voice settings
- Promo code support for subscriptions

### UI/UX
- Dark/light theme support
- Responsive design
- Documentation modal with search, sections, and FAQ tabs
- Profile modal with view/edit modes
- Pricing modal with plan comparison and payment flow
- MCP server connections panel

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + TypeScript + esbuild
- **Database**: PostgreSQL + Drizzle ORM
- **AI Backend**: External Railway-hosted agent API
- **Auth**: JWT + bcrypt
- **Monorepo**: pnpm workspaces
- **API**: OpenAPI spec + Orval codegen + React Query
- **Voice**: Web Speech API + ElevenLabs
- **Avatars**: DiceBear API v9.x

## Project Structure

```
workspace/
├── artifacts/
│   ├── belka-ai/          # React frontend (Vite)
│   └── api-server/        # Express API server
├── lib/
│   ├── api-spec/          # OpenAPI specification
│   ├── api-client-react/  # Generated React Query hooks
│   ├── api-zod/           # Generated Zod schemas
│   └── db/                # Drizzle ORM schema + migrations
├── scripts/               # Utility scripts
└── package.json           # Root workspace config
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Start API server
PORT=8080 pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/belka-ai run dev
```

## Recent Changes

### v1.2 — Development Tools & Voice Upgrade
- Rewrote Preview Server as draggable/resizable floating window with live iframe preview
- Rewrote Terminal as floating draggable window with real bash execution
- Upgraded Workspace Picker with full directory tree browser
- Added voice commands for terminal, preview server, and documentation
- Added DocsModal with search, sections, and FAQ tabs
- Profile modal with view/edit modes and per-user DiceBear avatars
- Replaced "tokens" terminology with "requests" throughout the app
- Fixed plan synchronization between server and localStorage
- Per-user scoped avatar, bio, and display name storage

### v1.1 — UI Improvements
- Moved toolbar icons (MCP, Terminal, Preview, Folder) to chat header
- Added image preview modal for attached/generated images
- Created comprehensive documentation system
- Subscription plan sync fixes

### v1.0 — Initial Release
- Multi-agent AI chat with streaming
- GitHub integration
- Voice assistant with 900+ phrases
- User authentication and subscription system
- Admin dashboard

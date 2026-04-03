# Hermes Admin Dashboard

A comprehensive web dashboard for managing and monitoring the [Hermes AI Agent](https://github.com/nousresearch/hermes-agent) — system stats, AI model routing, configuration, logs, sessions, cron jobs, skills, and more, all in one place.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?logo=playwright)

## Screenshots

> Glassmorphic dark theme with gradient accents, responsive sidebar navigation, real-time system monitoring, and AI model routing overview.

## Features

### 16 Pages

| Page | Description |
|------|-------------|
| **Dashboard** | System overview — CPU, memory, disk, uptime, gateway status, Hermes version, AI model routing (main/cheap/auxiliary providers), connected platforms with live activity + per-platform restart buttons |
| **Configuration** | View and edit `config.yaml` — structured form editor with raw YAML toggle, real-time validation (model check, API key detection, empty field warnings, duplicate providers), visual border indicators, unsaved changes badge |
| **Env Variables** | View and edit `.env` file — masked sensitive values, organized by category |
| **Logs** | Browse and view Hermes log files with search + live streaming |
| **Memory** | View and manage user profile, agent memory, and soul data |
| **Files** | Browse the Hermes filesystem — navigate directories, view files, absolute path support |
| **Sessions** | Browse conversation history with search, pagination, and detail view with message timeline |
| **Cron Jobs** | Full CRUD — create/run/pause/resume/delete jobs, inline prompt editing, run history timeline with success/fail dots, schedule presets, delivery target selection |
| **Skills** | Browse installed skills with descriptions, categories, and linked files |
| **Alert Rules** | Create and manage alert rules — CPU/memory/disk thresholds, cron job failures, gateway status with delivery to Telegram |
| **Audit Log** | Track all dashboard actions — config changes, cron operations, platform restarts, with timestamps |
| **Config Backups** | Automatic config backups before edits, restore any previous version, backup history |
| **Processes** | View background processes managed by Hermes |
| **Agent MD** | View and edit `AGENTS.md` — the agent's development guide |
| **Soul MD** | View and edit `SOUL.md` — the agent's personality and behavior config |
| **Model Playground** | Test LLM models interactively — auto-discovers all providers (Z.AI, Anthropic, Google, Groq, DeepSeek, OpenRouter, Ollama), send prompts, measure latency, compare responses |

### Key Capabilities

- **AI Model Routing overview** — home page shows smart routing status, main model, cheap model for simple queries, and all auxiliary provider roles (vision, compression, approval, etc.)
- **Multi-provider playground** — auto-discovers providers from `config.yaml`, `.env` API keys, and local servers (Ollama). Supports OpenAI-compatible, Anthropic, and Ollama API formats out of the box
- **Real-time platform detection** — checks both `config.yaml` and `.env` for platform credentials (Telegram, Discord, Slack, WhatsApp, Signal, Home Assistant)
- **Config validation** — detects empty API keys, validates model names against known providers, warns about env var override behavior, flags duplicate providers
- **Cron job management** — full lifecycle from creation to deletion, with one-click run, inline prompt editing, and visual run history
- **Audit trail** — all dashboard actions logged with timestamps for accountability
- **Config safety** — automatic backups before any config change, one-click restore
- **Glassmorphic UI** — dark theme with glass-card effects, gradient accents, smooth animations, responsive layout, light/dark mode toggle
- **Keyboard shortcuts** — quick navigation between pages
- **JWT auth** — secure middleware-based route protection with bcrypt password hashing

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Standalone mode)
- **UI:** React 19, Tailwind CSS 4, Lucide React icons, next-themes (dark/light)
- **Charts:** Recharts
- **Auth:** JWT (jose) + bcryptjs, middleware-based route protection
- **Data:** Reads directly from Hermes sources — SQLite (sessions), YAML (config), log files, cron state, env files
- **Exposure:** Cloudflare Tunnel (zero open ports, auto HTTPS)
- **Testing:** Playwright (18 E2E tests)
- **Runtime:** Node.js standalone server

## Getting Started

### Prerequisites

- Node.js 18+
- Hermes Agent running on the same machine (for data sources)
- npm or pnpm

### Install

```bash
git clone git@github.com:vinoth12940/hermes-dashboard.git
cd hermes-dashboard
npm install
```

### Configure Auth

Create `auth.json` in the project root:

```json
{
  "username": "admin",
  "passwordHash": "$2b$10$..."
}
```

Generate a password hash:

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 10))"
```

Or set environment variables:

```bash
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=$2b$10$...
JWT_SECRET=your-jwt-secret
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → login → dashboard.

### Production Build

```bash
npm run build
```

**Important:** Next.js standalone mode doesn't include static assets automatically. After every build, copy them:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Then run:

```bash
cd .next/standalone
node server.js
```

### Quick Deploy Script

```bash
# Build + copy statics + restart
bash deploy.sh
```

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/       # Protected pages (require auth)
│   │   ├── page.tsx       # Dashboard overview + AI model routing card
│   │   ├── config/        # Configuration editor with validation
│   │   ├── env-vars/      # Environment variables editor
│   │   ├── logs/          # Log viewer with live streaming
│   │   ├── memory/        # Memory viewer
│   │   ├── files/         # File browser
│   │   ├── sessions/      # Session history with detail view
│   │   ├── cron/          # Cron job CRUD + management
│   │   ├── skills/        # Skills browser
│   │   ├── alerts/        # Alert rules manager
│   │   ├── audit/         # Audit log viewer
│   │   ├── backups/       # Config backup history
│   │   ├── processes/     # Background process viewer
│   │   ├── playground/    # Multi-provider model playground
│   │   ├── agent-md/      # AGENTS.md editor
│   │   └── soul-md/       # SOUL.md editor
│   ├── api/               # API routes
│   │   ├── auth/          # login, logout, me
│   │   ├── config/        # config.yaml CRUD + validation
│   │   ├── cron/          # cron job list, create, run, pause, resume, delete
│   │   ├── files/         # file browser
│   │   ├── logs/          # log file listing + content + streaming
│   │   ├── memory/        # memory/user/soul data
│   │   ├── sessions/      # session list + detail
│   │   ├── skills/        # skills list
│   │   ├── agent-md/      # AGENTS.md read/write
│   │   ├── soul-md/       # SOUL.md read/write
│   │   ├── env-vars/      # .env file CRUD
│   │   ├── platforms/     # platform status + restart
│   │   ├── processes/     # background process list
│   │   ├── alerts/        # alert rules CRUD
│   │   ├── audit/         # audit log read + write
│   │   ├── backups/       # config backup list + restore
│   │   ├── playground/    # multi-provider model API (GET providers, POST test)
│   │   ├── system/stats/  # CPU, memory, disk stats
│   │   └── gateway/restart/
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles (dark/light theme, glassmorphic)
│   └── middleware.ts      # Auth middleware
├── components/
│   ├── AppShell.tsx       # App layout wrapper
│   ├── AuthLayout.tsx     # Login layout
│   ├── Badge.tsx          # Status badges (success, error, warning, default)
│   ├── ConfirmDialog.tsx  # Confirmation modal
│   ├── DashboardShell.tsx # Dashboard layout with sidebar
│   ├── KeyboardShortcuts.tsx # Global keyboard shortcuts
│   ├── Sidebar.tsx        # Navigation sidebar with section grouping
│   └── StatsCard.tsx      # Stat display card with gradients
└── lib/
    ├── api-utils.ts       # Auth helper, system stats, path safety
    └── auth.ts            # JWT + bcrypt utilities

tests/
└── e2e/
    └── dashboard.spec.ts  # Playwright E2E tests
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Authenticate and set JWT cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Get current user |
| GET/PUT | `/api/config` | Read/update `config.yaml` + validation |
| GET/PUT | `/api/env-vars` | Read/update `.env` file |
| GET | `/api/system/stats` | CPU, memory, disk, uptime, gateway, Hermes version |
| GET | `/api/platforms` | Platform status (config + env var detection) |
| POST | `/api/platforms` | Platform actions (restart) |
| GET | `/api/cron` | List cron jobs |
| POST | `/api/cron` | Cron actions (create, run, pause, resume, update, delete) |
| GET/POST | `/api/logs` | List/view log files |
| GET | `/api/logs/stream` | Server-sent events for live log streaming |
| GET | `/api/memory` | User, memory, soul data |
| GET | `/api/sessions` | Session list with search + pagination |
| GET | `/api/sessions/[id]` | Session detail with message timeline |
| GET | `/api/files` | File browser (navigate, read) |
| GET | `/api/skills` | Installed skills |
| GET/PUT | `/api/agent-md` | Read/write AGENTS.md |
| GET/PUT | `/api/soul-md` | Read/write SOUL.md |
| GET | `/api/processes` | Background process list |
| GET/POST/DELETE | `/api/alerts` | Alert rules CRUD |
| GET | `/api/audit` | Audit log |
| GET/POST | `/api/backups` | Config backup list + restore |
| GET | `/api/playground` | List discovered providers (config + env + local) |
| POST | `/api/playground` | Send prompt to model (OpenAI/Anthropic/Ollama compatible) |
| POST | `/api/gateway/restart` | Restart Hermes gateway |

## Deployment

### Standalone Server

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd .next/standalone && node server.js
```

### Cloudflare Tunnel (Recommended)

Zero open ports, automatic HTTPS, DDoS protection:

```bash
cloudflared tunnel --url http://localhost:3000
```

With a named tunnel and config:

```yaml
# ~/.cloudflared/config.yml
tunnel: <tunnel-id>
credentials-file: ~/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: dashboard.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### Systemd Service

```ini
[Unit]
Description=Hermes Dashboard
After=network.target

[Service]
Type=simple
User=hermes
WorkingDirectory=/opt/hermes-dashboard/.next/standalone
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Testing

E2E tests with Playwright:

```bash
# Install browsers (first time)
npx playwright install chromium

# Run tests
npx playwright test

# Run with UI
npx playwright test --ui
```

Currently 18 tests covering:
- Login page rendering (CSS, form elements)
- Authentication flow and redirect
- All pages load with content
- Dashboard shows system stats
- Config has structured view
- Memory shows user/soul/memory content
- Agent MD and Soul MD load file content
- Sidebar navigation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `fallback-secret-change-me` |
| `AUTH_USERNAME` | Admin username (if no auth.json) | `admin` |
| `AUTH_PASSWORD_HASH` | bcrypt hash (if no auth.json) | — |
| `PORT` | Server port | `3000` |
| `HERMES_HOME` | Hermes home directory | `~/.hermes` |

## Architecture Notes

- **No database** — the dashboard reads directly from existing Hermes data sources (SQLite, YAML, log files, env files). No additional infrastructure needed.
- **Provider discovery** — the playground auto-discovers AI providers from three sources: (1) `config.yaml` model/auxiliary config, (2) `.env` API keys (OpenAI, Anthropic, Google, Groq, DeepSeek, OpenRouter, etc.), (3) local servers like Ollama via HTTP probe. Supports OpenAI-compatible, Anthropic, and Ollama chat API formats.
- **Platform detection** — platforms are detected from both `config.yaml` top-level keys AND environment variables (e.g., `TELEGRAM_BOT_TOKEN` in `.env`). A platform is "enabled" if either source has its credentials configured.
- **Hermes binary path** — the dashboard uses `$HOME/.local/bin/hermes` for version detection since the Next.js server PATH may not include user-local bin directories.
- **Config validation** — the config API runs 6+ checks including empty API key detection (critical: `api_key: ''` in YAML overrides env vars), model name validation, duplicate provider detection, and schedule expression validation.
- **Security** — path traversal protection on all file operations, blocked system directories (`/proc`, `/sys`, `/dev`), auth middleware on all routes except `/login` and `/api/auth/*`.

## License

Private — All rights reserved.

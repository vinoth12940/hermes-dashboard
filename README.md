# Hermes Admin Dashboard

A comprehensive web dashboard for managing and monitoring the [Hermes AI Agent](https://github.com/nousresearch/hermes-agent) — system stats, configuration, logs, sessions, cron jobs, skills, and more, all in one place.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?logo=playwright)

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | System overview — CPU, memory, disk, uptime, gateway status, connected platforms |
| **Configuration** | View and edit `config.yaml` — structured form editor with raw YAML toggle |
| **Logs** | Browse and view Hermes log files with search |
| **Memory** | View and manage user profile, agent memory, and soul data |
| **Files** | Browse the Hermes filesystem — navigate directories, view files |
| **Sessions** | Browse conversation history with search and detail view |
| **Cron Jobs** | View scheduled tasks, run history, status, and delivery targets |
| **Skills** | Browse installed skills with descriptions and categories |
| **Agent MD** | View and edit `AGENTS.md` — the agent's development guide |
| **Soul MD** | View and edit `SOUL.md` — the agent's personality and behavior config |

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Standalone mode)
- **UI:** React 19, Tailwind CSS 4, Lucide React icons
- **Charts:** Recharts
- **Auth:** JWT (jose) + bcryptjs, middleware-based route protection
- **Data:** Reads directly from Hermes sources — SQLite (sessions), YAML (config), log files, cron state
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
AUTH_PASSWORD_HASH=<bcrypt_hash>
JWT_SECRET=<random-secret>
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
│   │   ├── page.tsx       # Dashboard overview
│   │   ├── config/        # Configuration editor
│   │   ├── logs/          # Log viewer
│   │   ├── memory/        # Memory viewer
│   │   ├── files/         # File browser
│   │   ├── sessions/      # Session history
│   │   ├── cron/          # Cron job management
│   │   ├── skills/        # Skills browser
│   │   ├── agent-md/      # AGENTS.md editor
│   │   └── soul-md/       # SOUL.md editor
│   ├── api/               # API routes
│   │   ├── auth/          # login, logout, me
│   │   ├── config/        # config.yaml CRUD
│   │   ├── cron/          # cron job list + actions
│   │   ├── files/         # file browser
│   │   ├── logs/          # log file listing + content
│   │   ├── memory/        # memory/user/soul data
│   │   ├── sessions/      # session list + detail
│   │   ├── skills/        # skills list
│   │   ├── agent-md/      # AGENTS.md read/write
│   │   ├── soul-md/       # SOUL.md read/write
│   │   ├── system/stats/  # CPU, memory, disk stats
│   │   └── gateway/restart/
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles (dark theme)
│   └── middleware.ts      # Auth middleware
├── components/
│   ├── AppShell.tsx       # App layout wrapper
│   ├── AuthLayout.tsx     # Login layout
│   ├── Badge.tsx          # Status badges
│   ├── ConfirmDialog.tsx  # Confirmation modal
│   ├── DashboardShell.tsx # Dashboard layout with sidebar
│   ├── Sidebar.tsx        # Navigation sidebar
│   └── StatsCard.tsx      # Stat display card
└── lib/
    ├── api-utils.ts       # Auth helper for API routes
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
| GET/PUT | `/api/config` | Read/update `config.yaml` |
| GET | `/api/system/stats` | CPU, memory, disk, uptime |
| GET | `/api/cron` | List cron jobs |
| POST | `/api/cron` | Cron actions (run, pause, resume, delete) |
| GET | `/api/logs` | List/view log files |
| GET | `/api/memory` | User, memory, soul data |
| GET | `/api/sessions` | Session list with search |
| GET | `/api/sessions/[id]` | Session detail |
| GET | `/api/files` | File browser (navigate, read) |
| GET | `/api/skills` | Installed skills |
| GET/PUT | `/api/agent-md` | Read/write AGENTS.md |
| GET/PUT | `/api/soul-md` | Read/write SOUL.md |
| POST | `/api/gateway/restart` | Restart Hermes gateway |

## Deployment

### Standalone Server

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd .next/standalone && node server.js
```

### Reverse Proxy (Caddy)

Automatic HTTPS with Caddy:

```
dashboard.yourdomain.com {
    reverse_proxy localhost:3000
}
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
- All 10 pages load with content
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

## License

Private — All rights reserved.

# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── kite-exchange/      # BASONCE/KITE Crypto Exchange (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## DEPLOYMENT ARCHITECTURE (as of April 2026)

### Production: 100% Netlify (Replit-independent)
- **basonce.com** → Netlify (DNS points to Netlify)
- **Frontend**: `artifacts/kite-exchange` → built with `pnpm --filter @workspace/kite-exchange run build` → uploaded to Netlify via ZIP API
- **Backend API**: `netlify/functions/api-proxy.js` (full Express-equivalent logic in one file, no Replit dependency)
  - Crypto prices: KuCoin direct fetch
  - TradFi prices: Yahoo Finance direct fetch
  - Match controls: Supabase Storage (`sport-controls/controls.json`)
  - Sport bets: Supabase Storage (`sport-bets-data/{id}.json`)
  - Anon sessions: Supabase Storage (`visitor-sessions/sessions.json`)
  - Push subscriptions: Supabase Storage (`push-data/subscriptions.json`)
  - Admin routes: Supabase REST API
  - web-push: bundled in `netlify/functions/node_modules/`
- **Database**: Supabase (`jfjjymprvjfltpvmfptj.supabase.co`) — not Replit PostgreSQL
- **Env vars on Netlify**: SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

### How to deploy updates:
```bash
pnpm --filter @workspace/kite-exchange run build
cd /tmp/netlify-fn && node -e "JSZip deploy script..."
```

### Replit deployment: BROKEN (PostgreSQL dev DB unreachable) — NOT used for production

## Admin Monitor PWA (artifacts/admin-monitor)

Glassmorphism admin monitoring PWA for BASONCE/KITE Exchange. Path: `/admin-monitor/`.

### Features
- **PIN Lock**: Default PIN `1332`, stored in `sessionStorage`. Change PIN in Settings.
- **Real-time Alarms**: 10 Supabase Realtime channels (futures, spot, transactions, withdrawals, support, wallets, users)
- **Web Push Notifications**: Works even when phone screen is locked/in pocket via VAPID push
- **Service Worker**: `/admin-monitor/public/sw.js`, scope `/admin-monitor/`
- **PWA Manifest**: `/admin-monitor/public/manifest.json` with icons icon-192.png, badge-72.png
- **Audio Alarms**: Web Audio API beeps + silent loop (prevents iOS throttling)
- **Wake Lock**: Prevents phone screen from sleeping while app is open
- **Health Ping**: Supabase connectivity check every 2 minutes
- **Settings**: Sound toggles, alarm thresholds, PIN change, push status, test push

### Web Push Architecture
- **VAPID keys**: Set as shared environment variables `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
- **Subscription endpoint**: `POST /api-server/api/push/subscribe`
- **Send endpoint**: `POST /api-server/api/push/send` (title, body, severity, tag)
- **Status endpoint**: `GET /api-server/api/push/status`
- **Server-side monitor**: Supabase Realtime + 30s polling in `artifacts/api-server/src/lib/push-monitor.ts`
- **Subscriptions stored**: `artifacts/api-server/data/push_subs.json`
- **Validation**: Only 65-byte p256dh + ≥16-byte auth subscriptions are stored

### API Server Push Routes
- Routes mounted at BOTH `/api/push/...` and `/api-server/api/push/...` (Replit proxy doesn't strip prefix)

### Tech Stack
- React 18 + TypeScript + Vite + TailwindCSS v4
- Supabase Realtime (10 channels)
- Web Push API + Service Worker
- Wouter (routing), Zustand-like store

## KITE Exchange (artifacts/kite-exchange)

Full-featured crypto exchange platform (BASONCE Exchange). Built with React + Vite + TypeScript + TailwindCSS v4.

### Features
- **Home Page**: Market overview, Gainers/Losers/24h Vol/Basonce Alpha tabs, campaigns, live chat
- **Markets Page**: Full crypto market list with real-time prices
- **Trade Page**: Spot trading with charts
- **Futures Page**: Futures trading with leverage
- **Mining Page**: Crypto mining simulation with machine upgrades
- **Assets Page**: Portfolio overview and wallet management
- **Profile Page**: User profile, KYC, settings
- **AI Bot Page**: AI trading bot
- **Admin Dashboard**: Full admin panel (admin users only)

### Backend: Supabase (paponce — migrated 2026-04-03)
- **Project**: paponce (`jfjjymprvjfltpvmfptj.supabase.co`)
- 129 tables, all data migrated (258 coins, 184 networks, 12,837+ social posts)
- Uses Supabase Auth, Database, Storage, and Realtime
- Credentials in `artifacts/kite-exchange/.env` (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
- Admin Monitor also updated to paponce: `artifacts/admin-monitor/src/lib/supabase.ts`
- API Server hardcoded to paponce: `artifacts/api-server/src/lib/supabase-config.ts`
- Coin logo storage still served from old project storage (URLs accessible, not migrated)

### Activity Tracking
- `activity_log` table: 22 dedicated columns (ip_address, country, city, device_type, browser, os, session_id, element_text, element_type, x/y pos, screen dimensions + metadata JSONB)
- Realtime enabled on `activity_log` for live admin feed
- Tracker: `artifacts/kite-exchange/src/lib/activity-tracker.ts`
- Live admin panel: `artifacts/kite-exchange/src/components/LiveActivityPanel.tsx` + `artifacts/admin-monitor/src/components/LiveActivityPanel.tsx`
- Admin PIN: `1332`

### Games Section (GamesSection.tsx) — Key Features
- **Realistic match clock**: 45+X'/90+X' stoppage time format. Phases: `first_half → ht_break (3 ticks) → second_half → ft_stoppage → finished`. HT break freezes clock at "HT", FT stoppage shows "90+3'" etc.
- **Match simulation stats**: Each match tracks `homeAttack[]`, `awayAttack[]` (intensity 0–100 per minute), `matchStats` (shots, corners, possession) — all updated live on each tick.
- **Binance-style "All markets" modal**: Clicking the "All markets" row opens `MatchSimModal` — full-screen overlay with SVG attack-intensity chart (home up / away down mirrored area chart), possession bar, shots/corners stats, goal timeline, quick-bet row, and full extended markets grid.
- Storage read: Supabase public URL (CTRL_PUBLIC_URL). Storage write: `PUT /api-server/api/sport/controls` with `x-requester-id` header (service-role on server side to bypass RLS).

### Tech Stack
- React 18 + TypeScript
- Vite 7 with @tailwindcss/vite (Tailwind v4)
- @supabase/supabase-js
- @tanstack/react-query
- lightweight-charts (TradingView charts)
- wagmi + viem + ethers (Web3/wallet connection)
- lucide-react (icons)

### Important Notes
- Tailwind v4 custom theme defined in `src/index.css` via `@theme` directive (NOT tailwind.config.js)
- `global: 'globalThis'` and `process.env: {}` defined in vite.config.ts for wagmi/ethers compatibility
- All 224 source files + 112 public assets included from original project

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`).

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package.

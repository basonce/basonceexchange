---
name: basonce deploy topology
description: How basonce.com (kite-exchange artifact) is hosted and deployed to production.
---

# basonce.com production topology

- The LIVE backend serving `https://basonce.com/api/*` is the **Cloudflare Pages** deployment using `artifacts/kite-exchange/cf-worker/_worker.js` (Pages advanced mode — `_worker.js` at the root of the published bundle). Confirm with `curl https://basonce.com/api/healthz` → `{"status":"ok","platform":"cloudflare"}`.
- The frontend SPA (built from `dist/public`) is served by the **same** Cloudflare Pages project (`basonce`), bundled together with `_worker.js`.
- `netlify.toml` + `netlify/functions/api-proxy.js` exist in the repo but are **NOT serving production**. `api-proxy.js` has its own duplicated Supabase logic and has no miner routes. Do not assume editing it affects prod.

## Deploying

- Use the hardened script: `bash artifacts/kite-exchange/scripts/deploy.sh`.
- It builds the package, stages `dist/public` + copies `cf-worker/_worker.js` into the bundle, runs `npx wrangler@4 pages deploy ... --project-name=basonce --branch=main`, then verifies the live site serves the freshly-built chunk and that chunks are reachable (guards against the stale-bundle "Güncelleniyor..." infinite-spinner failure).
- Requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (available as Replit secrets).

**Why:** code edits to `_worker.js` and frontend do NOT go live until this deploy runs — there is no git-push auto-deploy in the dev environment. A 404 on a new `/api/...` route at basonce.com usually means "built but not yet deployed", not a code bug.

## Cloudflare Pages env vars

- Worker reads `env.SUPABASE_SERVICE_ROLE_KEY` (and others) from **Cloudflare Pages → Settings → env vars**, set in the dashboard, NOT from this repo. The live project already has a valid service-role key for Supabase project `jfjjymprvjfltpvmfptj`, so newly-deployed handlers that read the same env work without extra setup.
- `SUPABASE_URL` is hardcoded in `_worker.js` to `https://jfjjymprvjfltpvmfptj.supabase.co`.
- Cron: `wrangler.toml` cron triggers are ignored by Pages Functions deploys; cron must be set in the dashboard or via an external pinger to `/api/cron/...`.

## Deploy gotchas (learned the hard way)

- **Backgrounded `npx wrangler@4` deploys can die silently** (empty log, no deployment created) when npx must first *download* wrangler (the npx package cache gets cleared periodically). Pre-warm once in the foreground: `npx wrangler@4 --version` (installs to cache), then run the deploy. Once cached, a foreground `npx wrangler@4 pages deploy <dir> --project-name=basonce --commit-dirty=true --branch=main` finishes in well under the 120s tool limit.
- **`deploy.sh`'s build step can hang/stall** ("transforming...") when run detached. Workaround that always works: build in the foreground (`pnpm --filter @workspace/kite-exchange run build` ≈ 26s), then `cp cf-worker/_worker.js dist/public/_worker.js` and `wrangler pages deploy dist/public` directly — skips the slow rebuild and the staging `cp -r` (which also stalls under IO contention).
- **Chunk-hash is the deploy oracle.** After deploy, `curl https://basonce.com/?z=$(date +%s%N)` and confirm the `/assets/index-*.js` hash equals the freshly-built one. If a rebuild yields the *same old* chunk hash, your source changes aren't in the bundle — and Cloudflare will dedupe the identical upload to the *prior* deployment ID instead of creating a new one.
- **basonce.com always serves the LATEST production (branch=main) deployment.** A later deploy of an old bundle silently supersedes yours, even with `no-store` headers (not an edge-cache issue). Verify live == built every time; check recent deploys via `GET /accounts/{acct}/pages/projects/basonce/deployments`.

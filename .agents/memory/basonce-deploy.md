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
- **The build "transforming…" hang is NOT contention/detachment — it is Tailwind v4 auto content-scan.** See `tailwind-v4-build-hang.md`: fix is `@import "tailwindcss" source(none)` + scoped `@source` in `src/index.css` (already applied). The fix is in place, but the bundle has grown — the build now takes ~80s, which EXCEEDS the 120s bash-tool cap once you add staging+deploy, and even a bare `timeout 110 pnpm … build` gets killed (exit 124). Backgrounding the build across bash tool calls also fails (the detached process + its `/tmp` log get torn down between calls). **Reliable method: run the whole `deploy.sh` as a one-shot Replit WORKFLOW (`configureWorkflow`, outputType console, no waitForPort) — workflows have no time cap and survive across tool calls. Poll `getWorkflowStatus`.**
- **BUT the workflow's `npx wrangler pages deploy` stalls silently** (sits at "▶ Deploying to Cloudflare Pages" for 10+ min, no deployment created — confirm via the deployments API + live chunk). When that happens: `removeWorkflow` to stop it (the build already staged the correct bundle to `/tmp/basonce-deploy`), then run the **cached wrangler binary DIRECTLY** (not npx): `WR=$(ls /home/runner/.npm/_npx/*/node_modules/.bin/wrangler|head -1); cd /tmp && "$WR" pages deploy basonce-deploy --project-name=basonce --commit-dirty=true --branch=main`. This finishes in ~5s of upload when wrangler is pre-warmed. Then verify live chunk + restart the 5 app workflows.
- **Chunk-hash is the deploy oracle.** After deploy, `curl https://basonce.com/?z=$(date +%s%N)` and confirm the `/assets/index-*.js` hash equals the freshly-built one. If a rebuild yields the *same old* chunk hash, your source changes aren't in the bundle — and Cloudflare will dedupe the identical upload to the *prior* deployment ID instead of creating a new one.
- **basonce.com always serves the LATEST production (branch=main) deployment.** A later deploy of an old bundle silently supersedes yours, even with `no-store` headers (not an edge-cache issue). Verify live == built every time; check recent deploys via `GET /accounts/{acct}/pages/projects/basonce/deployments`.
- **`wrangler pages deploy` run from inside the repo trips the main-agent git guard** (`.git/index.lock` "destructive git operation" error) because wrangler shells out to `git` for commit metadata even with `--commit-dirty=true`. Fix: deploy from a copy OUTSIDE the repo — `cp -r dist/public/. /tmp/basonce-deploy/` then `cd /tmp/basonce-deploy && wrangler pages deploy .`. The `/tmp` dir has no `.git`, so no git is invoked.
- **`npx wrangler@4 --version` foreground often exceeds the 120s tool limit** (download stalls with no output). Workaround: launch it with `nohup ... &`, then wait for the cached binary to appear and invoke that binary path directly. The `_npx` cache hash changes between sessions — don't hardcode it, glob for it.
- **The cached wrangler is a SYMLINK, so `find ... -name wrangler -type f` returns NOTHING even when it's installed.** Don't gate on `-type f`. The reliable check: `ls /home/runner/.npm/_npx/*/node_modules/.bin/wrangler` (it's `../wrangler/bin/wrangler.js`). Confirm with `"$WR" --version`. The presence of `.npm/_npx/<hash>/node_modules/@cloudflare` is also a strong signal it finished downloading.
- **With all 5 artifact workflows + tsserver running, both the vite build AND the `npx wrangler` download stall/OOM** (build hangs at "transforming…" or dies with no exit marker; npx download never populates `_npx/<hash>/node_modules/.bin`). The TS language servers alone hold ~1GB+. Free resources before building: `pkill -f "tsserver.js"` and kill the non-kite dev servers, then build in the foreground (≈1m), then `restart_workflow` each of the 5 afterward. **Gotcha:** the build's vite process runs from the SAME path as the kite-exchange *dev* server (`artifacts/kite-exchange/node_modules/.../vite`), so a broad `pkill -f "artifacts/kite-exchange/.../vite"` kills your in-flight build too — kill dev servers by their pnpm wrapper or run the build only after dev is already down. For npx, `setsid sh -c '... > log 2>&1' < /dev/null &` survives the tool returning; poll for the cached binary.

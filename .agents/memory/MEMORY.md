# Memory Index

- [basonce deploy topology](basonce-deploy.md) — live backend is Cloudflare Pages (`_worker.js`); deploy via `scripts/deploy.sh`; Netlify `api-proxy.js` is NOT serving prod.
- [basonce Supabase admin access](basonce-supabase-admin.md) — DB admin only via Supabase Management API; Replit `SUPABASE_*` env keys are stale/wrong-project.
- [TON upgrade front-run prevention](ton-upgrade-intent-binding.md) — bind each on-chain payment to one user via a server-reserved UNIQUE amount (purchase intent), never trust client sender_address.

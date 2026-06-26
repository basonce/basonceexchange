---
name: basonce predictions route parity
description: The /predictions/* API exists in TWO places that must be edited in lockstep.
---

# Basonce predictions API — dual-environment route parity

The prediction-market API (`/predictions/*`, including `/activity` and
`/history/:id`) is implemented twice and BOTH must change together:

- **Production:** `artifacts/kite-exchange/cf-worker/_worker.js` (Cloudflare
  Pages `_worker.js`) — this is what serves `https://basonce.com/api/*`.
- **Dev mirror:** `artifacts/api-server/src/routes/predictions.ts` — used by
  the local api-server in the Replit preview.

**Why:** they query the same Supabase project but are separate code. Editing
only the dev mirror makes a new field/route work in preview but 404 / miss the
field on basonce.com (and vice-versa). E.g. adding `market_id` to the
`/activity` select had to be done in both for the Live Bets feed to be
clickable in prod.

**How to apply:** any change to a `/predictions/*` shape, field, or route must
be applied to both files, then the prod change only goes live after the
Cloudflare Pages deploy (see basonce-deploy.md). Verify on basonce.com, not
just the preview.

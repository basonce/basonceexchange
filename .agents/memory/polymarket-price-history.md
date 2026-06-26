---
name: Polymarket price-history pipeline
description: How to fetch REAL Polymarket price history + recent activity for Basonce Markets, and the live-tape refresh discipline.
---

# Polymarket REAL price-history pipeline

To get a market's real price series for our pm_markets row:
1. Read `source_id` from our `pm_markets` row.
2. Gamma: `GET {PM_GAMMA}/markets?id=<source_id>&limit=1` (with PM_UA headers) → array, take `[0]`.
3. Parse `outcomes` and `clobTokenIds` with `pmParseArr` (they arrive as JSON-encoded strings).
4. Find the index of the `"yes"` outcome; use the **same index** into `clobTokenIds` to get the Yes token.
5. CLOB: `GET https://clob.polymarket.com/prices-history?market=<token>&interval=<i>&fidelity=<f>` → `{history:[{t,p}]}`.

interval→fidelity map used: 1h→1, 6h→10, 1d→30, 1w→180, max→720.

**Why / rules:**
- If the `"yes"` outcome is NOT found, return `{points:[]}` — do NOT fall back to index 0 (mislabels the chart). Same for any upstream failure: return empty, never fabricate points. The user forbids fabricated data absolutely.
- Recent public activity feed (`/predictions/activity`) must select only `id,outcome,amount,created_at,pm_markets(question,image,category)` from `pm_bets` — never expose user identity.

**Live-tape refresh discipline (DesktopMarket):**
- The 1s "Updated Ns ago" clock uses a throwaway `setTick` re-render trigger; do NOT feed that 1s tick into any data-fetch effect's deps or you create a 1-request-per-second storm against the backend. Live tapes own their own ~12s interval; market odds auto-refresh is ~15s.

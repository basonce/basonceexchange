---
name: basonce P2P spinner — chunk-load loop + preview CANCEL
description: Two distinct "P2P spinning" causes — a real production infinite-spinner from lazy-chunk + unbounded reload, and a benign dev-preview screenshot CANCEL.
---

## Real production bug: perpetual spinner on /#p2p (desktop web)
**Symptom:** basonce.com/#p2p showed the desktop nav + a lone centered spinner
forever, never the P2P page.

**Root cause:** the desktop P2P page was a *separate lazy chunk* (React.lazy +
Suspense inside DesktopApp). Every chunk returned 200 server-side, but if that one
chunk fails to resolve client-side (poisoned browser cache / flaky network for
that specific asset URL), BOTH reload handlers — the global ones in `main.tsx`
(`unhandledrejection`/`error`) and `PageErrorBoundary` in `App.tsx` — called
`window.location.reload()` with **no attempt cap**, producing an infinite
reload→spinner→reload loop.

**Fix (durable rule):**
1. For critical routes, **eager-import** the page into a chunk that is already
   proven to load (DesktopApp loads fine — the nav renders), instead of a separate
   lazy chunk. No separate chunk = nothing to hang on.
2. **Always cap chunk-error reloads** (max ~2 within a 30s sessionStorage window),
   then show actionable error UI — never an unbounded `location.reload()`.

**Why:** an unbounded reload-on-chunk-error is indistinguishable from a hang and is
worse — it loops forever. A 200 from `curl` does NOT prove the user's browser can
load the chunk; cache/network can poison a single asset.

## Note on the mock fallback
DesktopP2P DOES render `generateMerchantsForCountry` as a fallback so it always
shows content once mounted. (Earlier note claimed the fallback was intentionally
unused — that was wrong; desktop uses it. Mobile `P2PModal` still has none.)

## Benign: dev-preview screenshot always CANCELs on /#p2p
In replit.dev/localhost preview, P2P `API_BASE` points to production
(`https://basonce.com/api/...`) and polls every 30s cross-origin, so the network
never goes idle → the app-preview screenshot tool aborts with `code: CANCEL`. This
is NOT a crash and NOT the infinite spinner above. Home page screenshots fine.

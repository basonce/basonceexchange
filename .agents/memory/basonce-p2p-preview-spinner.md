---
name: basonce P2P preview screenshot CANCEL
description: Why the P2P page screenshot always CANCELs in dev preview, and how P2P loads live data.
---

P2P pages (DesktopP2P + mobile P2PModal) fetch live aggregator ads (Binance/
Bybit/OKX/KuCoin) cross-origin from `https://basonce.com/api/p2p/aggregate` when
running in the replit.dev/localhost preview (their `API_BASE` points to production
because that route exists ONLY in the cf-worker, not the local api-server). The
production cf-worker has `access-control-allow-origin:*` and responds fast
(~0.5–1s warm), so the page DOES load — but it also polls every 30s.

**Why screenshots CANCEL:** the app-preview screenshot tool waits for network
idle; the 30s P2P polling + cross-origin keepalive means the network never goes
idle on the P2P route, so the tool aborts with `code: CANCEL`. This is NOT a crash
and NOT an infinite spinner — the home page (same-origin polling) screenshots fine.
Do not chase a "P2P crash" from a CANCEL alone.

**Why a user may still perceive "spinning":** if the live fetch is slow/stalled
and the table is empty, a bare centered spinner reads as broken. Mitigations now in
place: AbortController + 12s timeout on initial fetch AND the 30s refresh (so it
can never hang), a mountedRef guard so the background refresh never setState after
unmount, and skeleton rows (instead of a lone spinner) so the page looks populated
instantly. Mock seed data (generateMerchantsForCountry) is intentionally NOT used
as a fallback — fake merchants would deep-link to non-existent trades.

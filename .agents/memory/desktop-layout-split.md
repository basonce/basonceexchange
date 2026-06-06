---
name: kite-exchange desktop layout split
description: How the >=1024px Binance-style desktop site coexists with the untouched mobile app
---

# Desktop / mobile split (kite-exchange)

kite-exchange ships TWO completely separate UI trees keyed off viewport width:

- **Mobile (<1024px):** the original app, locked to `max-w-[428px]`, state-routed
  via `mobileTab`. This render path in `App.tsx` is intentionally left untouched —
  treat it as frozen. Never refactor it to "share" with desktop.
- **Desktop (>=1024px):** a Binance-style tree under `src/desktop/` (shell
  `DesktopApp.tsx`, pages in `src/desktop/pages/`, nav/footer in
  `src/desktop/components/`). Entry is an additive early-return branch in `App.tsx`
  (`if (isDesktop) return <DesktopApp .../>`) placed AFTER the admin and miner
  early-returns, BEFORE the mobile return.

**Why:** money app, live in production; the mobile UX must not regress, so desktop
is purely additive rather than responsive refactors of shared components.

**How to apply:**
- Breakpoint decided: `>=1024px` desktop (tablets stay mobile). Hook:
  `src/hooks/use-desktop.tsx` `useIsDesktop()` — initialize state synchronously
  from `window.innerWidth` to avoid a mobile-layout flash on desktop first paint.
- Desktop reuses the SAME data layer as mobile: `useMarkets` (in `src/desktop/`)
  wraps `PriceCache` singleton + independent coin managers (BNC/EQ/PAYAI/SGP/
  PowerAI/SZNP/Punch) + CoinGecko fallback, exactly like `MarketsPage`.
- Brand palette: dark `#0B0E11` / panel `#181A20` / border `#2B3139` / yellow
  `#F0B90B`, green `#0ECB81`, red `#F6465D`. All desktop copy in English.
- Pages without a dedicated desktop layout yet are rendered via a centered
  `FramedPage` wrapper around the existing mobile page component — keeps full
  functionality (incl. real-money trade) with zero risk while redesign proceeds.

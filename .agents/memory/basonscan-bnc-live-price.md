---
name: BasonScan BNC live price consistency
description: Every BNC display in the BasonScan explorer must consume the shared exchange engine, never a static price.
---

The BasonScan explorer (artifacts/basoncescan) shows BNC price + 24h % that must
MATCH the Kite Exchange / Basonce Wallet at the same UTC moment. It does this with
a copy of the deterministic engine `src/lib/bncMarket.ts` (`computeBncMarket()` +
`bncSparkline()`), identical to the wallet/exchange versions.

**Rule:** EVERY surface that shows a BNC price, 24h %, market cap, volume, or price
sparkline must derive it from `computeBncMarket()` — never from a hardcoded
constant. Known surfaces in `mock-data.ts`: `getNetworkStats` (header + home card),
`getGasOracle` (bncPrice), `getTopTokens` (BNC row), `getToken`/`tokenMeta` (token
detail), `getHomeAnalytics` (Top Tokens widget marketCap), and the `priceSeries`
sparkline.

**Why:** A perfectionist user. A code review caught the header showing live
`$2.27 / +2906%` while the Top Tokens table + token detail still showed the static
`BNC_PRICE = 2.43 / -0.99%` — a visible contradiction. Static BNC values anywhere
in the explorer are a drift bug.

**Note on the %:** `change24h` is an intentionally always-positive green momentum
number (formula, not a true 24h delta) because it must mirror the exchange's
display. Do not "fix" it to a real delta — that would desync it from the exchange.

**How to apply:** If you add or edit any BNC-showing surface, route it through
`computeBncMarket()`. `BNC_PRICE` (2.43) and `format.ts`'s `BNC_PRICE` remain only
as fallback/USD-conversion constants — do not use them for live BNC displays.

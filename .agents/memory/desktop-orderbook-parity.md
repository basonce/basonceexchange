---
name: desktop order book / recent-trades parity
description: how the desktop trading terminal keeps its order book + tape numerically consistent with the mobile pages
---

# Desktop order book / recent-trades parity (kite-exchange)

The desktop terminal's order book + recent trades must REPLICATE the mobile generation
logic, not invent its own. Source of truth:
- order book: `FuturesPage.generateOrderBook` (Binance-depth wave/spike path + independent/TradFi
  synthetic ladder using `getPriceDecimals` tickSize, askBase/bidBase, organicQty).
- recent trades: `FuturesRecentTrades` (30 initial, 3s cadence, buyAmt/sellAmt + price-variation formulas).
Ported into `src/desktop/hooks/useOrderBook.ts`.

**Why:** values are `Math.random()`-driven per session, so "consistent with mobile" means
identical *generation rules + formatting*, never identical values. Each device draws its own tape.

**How to apply:**
- Pass a symbol that triggers `INDEPENDENT_PRICE_MANAGERS[symbol]` detection: futures →
  `${symbol}USDT`; spot → `binanceSymbol || ${symbol}USDT`. If you pass the raw `binanceSymbol`
  (which is '' for independent coins), the indep ladder never fires.
- Render order-book / trade PRICES with `formatPrice` (decimal-aware via getPriceDecimals),
  NOT the desktop `fmt()` helper — `fmt` forces 2 decimals for 1<=n<1000, which collapses a
  low-priced coin's whole ladder into one repeated price (the BNCUSDT "all 2.28" bug).

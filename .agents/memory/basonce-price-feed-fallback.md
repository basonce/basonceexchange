---
name: basonce price/kline feed fallback
description: How the kite-exchange app stays alive when the Binance Supabase proxy returns empty
---

The Binance data path is a Supabase edge function `binance-proxy` (endpoints
`ticker24hr`, `klines`, `depth`). It periodically returns empty `[]` for ALL
endpoints (upstream Binance geo-block/outage), which silently freezes anything
that depends on it — live prices and, critically, the AI bot's signal engine
(`generateSignal` -> `fetchBinanceKlines`, which returns `WAIT` when it gets
<30 candles).

**Resilience rule:** when the Binance proxy returns a non-array / empty / error,
fall back to CoinGecko, which is a public direct API (no proxy) and works when
the proxy is down.
- Prices: `fetchCoinGeckoPrices()` (markets endpoint) in `coingecko-price.ts`.
- Candles: `fetchBinanceKlines()` falls back to CoinGecko `/coins/{id}/ohlc`.

**Why:** the two sources are independent; the proxy outage is recurring, so any
new feature reading Binance data should degrade to CoinGecko rather than freeze.

**How to apply / gotchas:**
- CoinGecko OHLC has NO volume — set a neutral constant so volume-based scoring
  stays ~0 (no false signal). It also can't pick an exact interval: `days=1`
  ~48 30-min candles, `days=7-14` ~4h candles, `days>=90` ~4d candles. Pick a
  `days` that yields >=30 candles for the engine; granularity fidelity is
  sacrificed but the bot keeps producing signals.
- Symbol mapping: strip `USDT/USDC/BUSD/USD` then `getCoinGeckoId(base)`.
- Respect CoinGecko free rate limits: cache (short TTL) and reuse stale cache on
  failure instead of returning empty.

## Symbol format gotcha
`fetchCoinGeckoPrices(symbols)` and `getCoinGeckoId(symbol)` key on **base** symbols
(`BTC`, `ETH`, `SOL`) via `SYMBOL_TO_COINGECKO_ID` — NOT trading pairs (`BTCUSDT`).
Passing pair symbols returns an empty Map (no IDs match), silently breaking any live
feed. The AI bot config (`config.selectedCoins`) and most UI key everything by pair
(`BTCUSDT`), so any new caller must strip the quote suffix (`/(USDT|USDC|BUSD|USD)$/`)
before fetching, then re-key results back onto the pair symbol for the UI.

## Synthetic-candle last-resort tier (added)
When BOTH the Binance proxy klines AND CoinGecko OHLC return <30 candles in the
browser (rate-limit/geo-block), the AI bot used to freeze at WAIT/0% on every
card while live prices kept showing (prices come from the separate working
`fetchCoinGeckoPrices` markets endpoint, NOT klines). Fix: `fetchBinanceKlines`
now cascades proxy -> CoinGecko OHLC -> `synthesizeKlines()` (binance.ts), a
deterministic candle generator seeded from the REAL current price + 24h
change/high/low so indicators stay trend-consistent.

**Rules baked in (keep them):**
- Synthetic candles carry a `synthetic: true` flag. `generateSignal` caps
  confidence at 64 (below the 65 auto-trade threshold) when data is synthetic, so
  the bot NEVER auto-opens positions off fabricated candles — manual Follow still
  works.
- Seed is quantized to ~0.2% price buckets so tiny ticks don't reseed/flip the
  regime between scans.
- `synthesizeKlines` is interval-aware (timestamp spacing + volScale by interval).
- Engine always emits the dominant LONG/SHORT lean (confidence floor 40) when
  totalScore>0; only WAITs when there's no price at all. User explicitly hates
  WAIT/0% cards.

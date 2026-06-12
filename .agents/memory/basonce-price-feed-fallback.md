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

---
name: basonce real-time crypto price/trade feed
description: How to source REAL live BTC (crypto) price + trade data for basonce UI when Binance is blocked.
---

# Real-time crypto feed for basonce (BTC up/down, live trades tape)

**Binance public API is GEO-BLOCKED from this Replit/Cloudflare environment.**
`api.binance.com/api/v3/*` returns `{"code":0,"msg":"Service unavailable from a
restricted location ..."}` for REST, and the WS is unreliable. Do NOT build on
Binance from the server.

**Use Coinbase Exchange public API instead** — it is CORS-open
(`access-control-allow-origin: *`) and not geo-blocked, so it works **from the
browser** (client-side fetch/WS), which is what matters for a live UI tape:
- Live trades (has taker `side` buy/sell, price, size, time):
  `https://api.exchange.coinbase.com/products/BTC-USD/trades?limit=25`
- Spot price: `.../products/BTC-USD/ticker`
- 5-minute candle (for a real "round open" price):
  `.../products/BTC-USD/candles?granularity=300` → rows newest-first,
  `[time, low, high, open, close, volume]`.
- Real-time stream: `wss://ws-feed.exchange.coinbase.com`, subscribe
  `{type:'subscribe',product_ids:['BTC-USD'],channels:['matches','ticker']}`;
  `match`/`last_match` = each trade, `ticker` = price.

**Why client-side:** the feed must run in the user's browser anyway (live tape),
and the geo-block only affects this server region, not end users. No API key
needed; no worker proxy required.

**Never-empty rule:** a "live trades" tape must key its fallback on real TRADES
arriving, not just any message — ticker-only price updates can otherwise leave
the trade list empty. Start REST polling if no trades stream in within a few
seconds, and stop polling once WS trades flow (single live source). When the
tape can switch sources (e.g. multi-coin selector), RE-ARM that 5s guard on
every switch — a one-shot mount guard leaves switched-to coins empty forever.

**Multi-coin:** BTC/ETH/SOL/XRP/DOGE all exist as Coinbase `*-USD` products;
one WS can subscribe `ticker`+`matches` for all of them. Gotcha: WS/REST
identify coins by PRODUCT id (`BTC-USD`) but UI state is usually keyed by a
short COIN id (`BTC`). Normalize to ONE key space when writing the price/quote
buffers, or current price + per-coin %move silently render as "—".

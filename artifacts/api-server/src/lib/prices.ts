// Shared USD price helpers for server-side money math (e.g. swaps).
// BNC uses the same deterministic engine the wallet/kite frontends use so the
// server and client always agree on the price at a given instant.

const PERIOD_S = 12 * 3600;
const PRICE_MIN = 0.01;
const PRICE_MAX = 2.37;

export function bncPriceNow(nowMs: number = Date.now()): number {
  const s = nowMs / 1000;
  const t = (s % PERIOD_S) / PERIOD_S;
  const base = PRICE_MIN + (PRICE_MAX - PRICE_MIN) * t;
  const microPct =
    Math.sin(s / 37) * 0.018 +
    Math.sin(s / 9) * 0.008 +
    Math.sin(s / 2) * 0.003;
  return Math.max(0.001, base * (1 + microPct));
}

const STABLES = new Set(["USDT", "USD", "USDC", "BUSD", "DAI", "TUSD"]);

interface Ticker { price: number; change: number; }
let tickerCache: { data: Record<string, Ticker>; ts: number } | null = null;
const CACHE_TTL_MS = 15_000;

async function getAllTickers(): Promise<Record<string, Ticker>> {
  const now = Date.now();
  if (tickerCache && now - tickerCache.ts < CACHE_TTL_MS) return tickerCache.data;
  const res = await fetch("https://api.kucoin.com/api/v1/market/allTickers", {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`KuCoin HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { ticker?: Array<{ symbol: string; last: string; changeRate: string }> };
  };
  const out: Record<string, Ticker> = {};
  for (const t of json?.data?.ticker ?? []) {
    if (!t.symbol.endsWith("-USDT")) continue;
    const sym = t.symbol.replace("-USDT", "");
    const price = parseFloat(t.last);
    if (price > 0) out[sym] = { price, change: parseFloat(t.changeRate) * 100 };
  }
  tickerCache = { data: out, ts: now };
  return out;
}

// Returns the USD price of a symbol, or 0 if it cannot be priced.
export async function getUsdPrice(symbol: string): Promise<number> {
  const s = symbol.trim().toUpperCase();
  if (!s) return 0;
  if (STABLES.has(s)) return 1;
  if (s === "BNC") return bncPriceNow();
  try {
    const tickers = await getAllTickers();
    return tickers[s]?.price ?? 0;
  } catch {
    return 0;
  }
}

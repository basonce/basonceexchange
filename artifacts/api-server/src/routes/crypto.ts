import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface CryptoPrice {
  price: number;
  change: number;
  volume: number;
}

interface AllTickersCacheEntry {
  data: Record<string, CryptoPrice>;
  ts: number;
}

const CACHE_TTL_MS = 15_000;
let allTickersCache: AllTickersCacheEntry | null = null;

async function fetchAllKuCoinTickers(): Promise<Record<string, CryptoPrice>> {
  const res = await fetch("https://api.kucoin.com/api/v1/market/allTickers", {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`KuCoin HTTP ${res.status}`);
  const json = await res.json() as {
    data?: { ticker?: Array<{ symbol: string; last: string; changeRate: string; volValue?: string }> };
  };
  const tickers = json?.data?.ticker ?? [];
  const result: Record<string, CryptoPrice> = {};
  for (const t of tickers) {
    if (!t.symbol.endsWith("-USDT")) continue;
    const symbol = t.symbol.replace("-USDT", "");
    const price = parseFloat(t.last);
    const change = parseFloat(t.changeRate) * 100;
    const volume = t.volValue ? parseFloat(t.volValue) : 0;
    if (price > 0) {
      result[symbol] = { price, change, volume };
    }
  }
  return result;
}

router.get("/crypto-prices", async (req, res) => {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (allTickersCache && now - allTickersCache.ts < CACHE_TTL_MS) {
      const requestedSymbols = req.query["symbols"]
        ? (req.query["symbols"] as string).split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
        : null;

      const data = requestedSymbols
        ? Object.fromEntries(
            requestedSymbols
              .filter(s => allTickersCache!.data[s])
              .map(s => [s, allTickersCache!.data[s]])
          )
        : allTickersCache.data;

      res.json({ success: true, data, cached: true });
      return;
    }

    // Fetch fresh data
    const allData = await fetchAllKuCoinTickers();
    allTickersCache = { data: allData, ts: now };

    const requestedSymbols = req.query["symbols"]
      ? (req.query["symbols"] as string).split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
      : null;

    const data = requestedSymbols
      ? Object.fromEntries(
          requestedSymbols
            .filter(s => allData[s])
            .map(s => [s, allData[s]])
        )
      : allData;

    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[crypto-prices] Error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- Real sparklines (last 24h hourly closes) from KuCoin candles ----
interface SparkCacheEntry { data: number[]; ts: number; }
const SPARK_TTL_MS = 10 * 60 * 1000; // 10 min
const sparkCache = new Map<string, SparkCacheEntry>();

async function fetchSparkline(symbol: string): Promise<number[]> {
  const cached = sparkCache.get(symbol);
  const now = Date.now();
  if (cached && now - cached.ts < SPARK_TTL_MS) return cached.data;

  const endAt = Math.floor(now / 1000);
  const startAt = endAt - 24 * 3600;
  const url = `https://api.kucoin.com/api/v1/market/candles?type=1hour&symbol=${symbol}-USDT&startAt=${startAt}&endAt=${endAt}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`KuCoin candles HTTP ${res.status}`);
  const json = await res.json() as { data?: string[][] };
  // KuCoin returns newest-first arrays: [time, open, close, high, low, volume, turnover]
  const rows = json?.data ?? [];
  const closes = rows
    .map(r => parseFloat(r[2] ?? ""))
    .filter(n => Number.isFinite(n) && n > 0)
    .reverse();
  sparkCache.set(symbol, { data: closes, ts: now });
  return closes;
}

router.get("/crypto-sparklines", async (req, res) => {
  try {
    const symbols = req.query["symbols"]
      ? (req.query["symbols"] as string).split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
      : [];
    if (symbols.length === 0) {
      res.json({ success: true, data: {} });
      return;
    }
    const capped = symbols.slice(0, 40);
    const results = await Promise.allSettled(capped.map(s => fetchSparkline(s)));
    const data: Record<string, number[]> = {};
    capped.forEach((sym, i) => {
      const r = results[i];
      if (r && r.status === "fulfilled" && r.value.length > 1) data[sym] = r.value;
    });
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[crypto-sparklines] Error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

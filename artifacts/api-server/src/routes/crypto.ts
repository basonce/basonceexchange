import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface CryptoPrice {
  price: number;
  change: number;
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
    data?: { ticker?: Array<{ symbol: string; last: string; changeRate: string }> };
  };
  const tickers = json?.data?.ticker ?? [];
  const result: Record<string, CryptoPrice> = {};
  for (const t of tickers) {
    if (!t.symbol.endsWith("-USDT")) continue;
    const symbol = t.symbol.replace("-USDT", "");
    const price = parseFloat(t.last);
    const change = parseFloat(t.changeRate) * 100;
    if (price > 0) {
      result[symbol] = { price, change };
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

export default router;

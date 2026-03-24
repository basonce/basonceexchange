import { Router, type IRouter } from "express";
import YahooFinanceLib from "yahoo-finance2";

const yahooFinance = new YahooFinanceLib();

const router: IRouter = Router();

// Maps our internal symbol → Yahoo Finance symbol
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // Metals
  XAUUSDT: "GC=F",
  XAGUSDT: "SI=F",
  XPTUSDT: "PL=F",
  XPDUSDT: "PA=F",
  COPPERUSDT: "HG=F",

  // Stocks
  TSLAUSDT: "TSLA",
  AAPLUSDT: "AAPL",
  AMZNUSDT: "AMZN",
  MSTRUSDT: "MSTR",
  HOODUSDT: "HOOD",
  INTCUSDT: "INTC",
  CRCLUSDT: "CRCL",
  COINUSDT: "COIN",
  PLTRUSDT: "PLTR",
  NVIDAUSDT: "NVDA",
  GOOGLUSDT: "GOOGL",
  METAUSDT: "META",
  MSFTUSDT: "MSFT",
  AMDUSDT: "AMD",
  NFLXUSDT: "NFLX",
  DISNUSDT: "DIS",
  JPMUSDT: "JPM",
  BACUSDT: "BAC",
  GSUSDT: "GS",
  BRKBUSDT: "BRK-B",
  VISAUSDT: "V",
  MAUSDT: "MA",
  UBERUSDT: "UBER",
  SPOTUSDT: "SPOT",
  SNAPUSDT: "SNAP",
  JNJUSDT: "JNJ",
  WMTUSDT: "WMT",
  XOMUSDT: "XOM",
  KOUSDT: "KO",
  PFEUSDT: "PFE",
  SAPUSDT: "SAP",
  ASMUSDT: "ASML",
  NESNUSDT: "NSRGY",
  LVMHUSDT: "LVMHF",
  TMUSDT: "TM",
  TSMUSDT: "TSM",
  BABAUSDT: "BABA",
  NVOUSDT: "NVO",

  // Commodities
  WTIUSDT: "CL=F",
  BRENTUSDT: "BZ=F",
  NATGASUSDT: "NG=F",
  COFFEEUSDT: "KC=F",
  COCOAUSDT: "CC=F",
  SUGARUSDT: "SB=F",
  WHEATUSDT: "ZW=F",
  CORNUSDT: "ZC=F",
  SOYUSDT: "ZS=F",

  // Agriculture
  LUMBERUSDT: "LBS=F",
  FCATTLEUSDT: "FC=F",
  LHOGUSDT: "HE=F",

  // Indices
  SP500USDT: "^GSPC",
  NAS100USDT: "^NDX",
  DJIA30USDT: "^DJI",
  DAXUSDT: "^GDAXI",
  FTSE100USDT: "^FTSE",
  NI225USDT: "^N225",

  // Forex
  EURUSDUSDT: "EURUSD=X",
  GBPUSDUSDT: "GBPUSD=X",
  USDJPYUSDT: "JPY=X",
  USDTRYUSDT: "USDTRY=X",
  AUDUSDUSDT: "AUDUSD=X",
  USDCADUSDT: "USDCAD=X",

  // ETFs
  SPYUSDT: "SPY",
  QQQUSDT: "QQQ",
  GLDUSDT: "GLD",
  SLVUSDT: "SLV",
  ARKKUSDT: "ARKK",
};

interface PriceResult {
  price: number;
  change: number;
}

interface CacheEntry {
  data: Record<string, PriceResult>;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

async function fetchQuotes(yahooSymbols: string[]): Promise<Record<string, PriceResult>> {
  const result: Record<string, PriceResult> = {};

  // Batch into groups of 30
  const BATCH = 30;
  for (let i = 0; i < yahooSymbols.length; i += BATCH) {
    const batch = yahooSymbols.slice(i, i + BATCH);
    try {
      const quotes = await yahooFinance.quote(batch, {}, { validateResult: false });
      const arr = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of arr) {
        if (!q || !q.symbol) continue;
        const price = q.regularMarketPrice ?? 0;
        const change = q.regularMarketChangePercent ?? 0;
        if (price > 0) {
          result[q.symbol] = {
            price,
            change: parseFloat(change.toFixed(3)),
          };
        }
      }
    } catch (err) {
      // Log but don't throw — partial results are fine
      console.error("Yahoo Finance batch error:", err instanceof Error ? err.message : err);
    }
  }

  return result;
}

router.get("/tradfi-prices", async (req, res) => {
  try {
    const requestedSymbols: string[] = req.query["symbols"]
      ? (req.query["symbols"] as string).split(",").map((s) => s.trim()).filter(Boolean)
      : Object.keys(YAHOO_SYMBOL_MAP);

    const cacheKey = [...requestedSymbols].sort().join(",");
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      res.json({ success: true, data: cached.data, cached: true });
      return;
    }

    // Build yahoo symbols list and reverse map
    const yahooSymbols: string[] = [];
    const yahooToOur: Record<string, string> = {};
    for (const sym of requestedSymbols) {
      const yahoo = YAHOO_SYMBOL_MAP[sym];
      if (yahoo) {
        yahooSymbols.push(yahoo);
        yahooToOur[yahoo] = sym;
      }
    }

    if (yahooSymbols.length === 0) {
      res.json({ success: true, data: {} });
      return;
    }

    const yahooData = await fetchQuotes(yahooSymbols);

    // Remap yahoo symbols → our symbols
    const result: Record<string, PriceResult> = {};
    for (const [yahooSym, ourSym] of Object.entries(yahooToOur)) {
      const d = yahooData[yahooSym];
      if (d) result[ourSym] = d;
    }

    cache.set(cacheKey, { data: result, ts: Date.now() });
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

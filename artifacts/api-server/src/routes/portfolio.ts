import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { PAPONCE_URL, PAPONCE_SERVICE_KEY } from "../lib/supabase-config";

const router: IRouter = Router();

const supabaseAdmin = createClient(PAPONCE_URL, PAPONCE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CryptoPrice { price: number; change: number; }
interface PriceCacheEntry { data: Record<string, CryptoPrice>; ts: number; }

const PRICE_CACHE_TTL_MS = 10_000;
let cryptoPriceCache: PriceCacheEntry | null = null;
let tradfiPriceCache: PriceCacheEntry | null = null;

async function fetchCryptoPrices(): Promise<Record<string, CryptoPrice>> {
  if (cryptoPriceCache && Date.now() - cryptoPriceCache.ts < PRICE_CACHE_TTL_MS) {
    return cryptoPriceCache.data;
  }
  try {
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
      if (price > 0) result[symbol] = { price, change };
    }
    cryptoPriceCache = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    console.error("[portfolio] crypto fetch error:", err);
    return cryptoPriceCache?.data ?? {};
  }
}

async function fetchTradFiPrices(): Promise<Record<string, CryptoPrice>> {
  if (tradfiPriceCache && Date.now() - tradfiPriceCache.ts < PRICE_CACHE_TTL_MS) {
    return tradfiPriceCache.data;
  }
  try {
    const res = await fetch("http://localhost:" + (process.env["PORT"] || "3000") + "/api/tradfi-prices", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`tradfi HTTP ${res.status}`);
    const json = await res.json() as { success: boolean; data?: Record<string, CryptoPrice> };
    const data = json?.data ?? {};
    tradfiPriceCache = { data, ts: Date.now() };
    return data;
  } catch (err) {
    console.error("[portfolio] tradfi fetch error:", err);
    return tradfiPriceCache?.data ?? {};
  }
}

router.get("/portfolio-value", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      res.status(401).json({ success: false, error: "Missing auth token" });
      return;
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      res.status(401).json({ success: false, error: "Invalid auth token" });
      return;
    }
    const userId = userData.user.id;

    const [{ data: balanceRows }, { data: positions }, cryptoPrices, tradfiPrices] = await Promise.all([
      supabaseAdmin
        .from("user_balances")
        .select("symbol, balance, futures_balance")
        .eq("user_id", userId),
      supabaseAdmin
        .from("futures_positions")
        .select("symbol, side, entry_price, position_size")
        .eq("user_id", userId)
        .eq("status", "open"),
      fetchCryptoPrices(),
      fetchTradFiPrices(),
    ]);

    const rows = balanceRows ?? [];
    const spotBalances = rows.map(r => ({
      symbol: r.symbol as string,
      balance: parseFloat(r.balance) || 0,
    }));

    const usdtRow = rows.find(r => r.symbol === "USDT");
    const futuresWallet = parseFloat((usdtRow as { futures_balance?: string } | undefined)?.futures_balance || "0") || 0;

    const getPrice = (sym: string): number => {
      if (sym === "USDT") return 1;
      if (sym === "EQ" || sym === "EQL") return 0;
      if (cryptoPrices[sym]) return cryptoPrices[sym]!.price;
      if (tradfiPrices[sym]) return tradfiPrices[sym]!.price;
      return 0;
    };

    let spotTotal = 0;
    const missingPrices: string[] = [];
    for (const b of spotBalances) {
      if (b.symbol === "EQ" || b.symbol === "EQL") continue;
      if (b.balance <= 0) continue;
      const p = getPrice(b.symbol);
      if (p <= 0 && b.symbol !== "USDT") {
        missingPrices.push(b.symbol);
        continue;
      }
      spotTotal += b.balance * p;
    }

    let futuresUnrealizedPnL = 0;
    for (const pos of (positions ?? [])) {
      const coinSymbol = (pos.symbol as string).replace(/usdt$/i, "");
      const currentPrice = getPrice(coinSymbol);
      const entryPrice = parseFloat(pos.entry_price) || 0;
      const positionSize = parseFloat(pos.position_size) || 0;
      if (entryPrice <= 0 || positionSize <= 0 || currentPrice <= 0) continue;
      const quantity = positionSize / entryPrice;
      const pnl = pos.side === "LONG"
        ? (currentPrice - entryPrice) * quantity
        : (entryPrice - currentPrice) * quantity;
      futuresUnrealizedPnL += pnl;
    }

    const total = spotTotal + futuresWallet + futuresUnrealizedPnL;

    res.json({
      success: true,
      data: {
        total,
        spotTotal,
        futuresWallet,
        futuresUnrealizedPnL,
        spotBalances,
        missingPrices,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[portfolio-value] Error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { PAPONCE_URL, PAPONCE_SERVICE_KEY } from "../lib/supabase-config";

/**
 * Basonce Market — Polymarket-style prediction markets.
 * Parimutuel (pool) betting with real USDT. All money moves through the
 * service_role-locked pm_* RPCs; this route only authenticates the caller
 * and forwards. Mirrors the production Cloudflare Worker implementation.
 */
const router: IRouter = Router();

const admin = createClient(PAPONCE_URL, PAPONCE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function authedUserId(authHeader: string | undefined): Promise<string | null> {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

const MARKET_SELECT =
  "id,source_id,question,category,image,end_date,status,winning_outcome,live_yes,live_no,volume,yes_pool,no_pool,bet_count,featured";

router.get("/predictions/markets", async (req, res) => {
  try {
    let query = admin
      .from("pm_markets")
      .select(MARKET_SELECT)
      .eq("status", "open")
      .order("featured", { ascending: false })
      .order("volume", { ascending: false })
      .limit(150);
    const cat = typeof req.query.category === "string" && req.query.category !== "All" ? req.query.category : "";
    if (cat) query = query.eq("category", cat);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q) query = query.ilike("question", `%${q}%`);
    const { data: markets, error } = await query;
    if (error) throw error;

    const { data: cats } = await admin.from("pm_markets").select("category").eq("status", "open");
    const categories = [...new Set((cats || []).map((c) => c.category).filter(Boolean))].sort();
    res.json({ markets: markets || [], categories });
  } catch (e) {
    res.status(500).json({ error: "Failed to load markets" });
  }
});

router.get("/predictions/my-bets", async (req, res) => {
  try {
    const uid = await authedUserId(req.headers.authorization);
    if (!uid) {
      res.status(401).json({ error: "Sign in to view your bets" });
      return;
    }
    const { data: bets, error } = await admin
      .from("pm_bets")
      .select("*,pm_markets(question,image,status,winning_outcome,category)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ bets: bets || [] });
  } catch (e) {
    res.status(500).json({ error: "Failed to load bets" });
  }
});

router.get("/predictions/market/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { data: rows, error } = await admin.from("pm_markets").select("*").eq("id", id).limit(1);
    if (error) throw error;
    const market = rows && rows[0];
    if (!market) {
      res.status(404).json({ error: "Market not found" });
      return;
    }
    let myBets: unknown[] = [];
    const uid = await authedUserId(req.headers.authorization);
    if (uid) {
      const { data } = await admin
        .from("pm_bets")
        .select("*")
        .eq("market_id", id)
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      myBets = data || [];
    }
    res.json({ market, myBets });
  } catch (e) {
    res.status(500).json({ error: "Failed to load market" });
  }
});

router.post("/predictions/bet", async (req, res) => {
  try {
    const uid = await authedUserId(req.headers.authorization);
    if (!uid) {
      res.status(401).json({ error: "Sign in to place a bet" });
      return;
    }
    const { market_id, outcome, amount } = (req.body || {}) as {
      market_id?: unknown;
      outcome?: unknown;
      amount?: unknown;
    };
    const marketId = String(market_id || "");
    const side = String(outcome || "");
    const amt = Number(amount);
    if (!marketId) {
      res.status(400).json({ error: "market_id required" });
      return;
    }
    if (side !== "Yes" && side !== "No") {
      res.status(400).json({ error: "Outcome must be Yes or No" });
      return;
    }
    if (!Number.isFinite(amt) || amt < 1) {
      res.status(400).json({ error: "Minimum bet is 1 USDT" });
      return;
    }
    if (amt > 100000) {
      res.status(400).json({ error: "Maximum bet is 100000 USDT" });
      return;
    }
    const { data, error } = await admin.rpc("pm_place_bet", {
      p_user_id: uid,
      p_market_id: marketId,
      p_outcome: side,
      p_amount: Math.round(amt * 1e8) / 1e8,
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("INSUFFICIENT_BALANCE")) {
        res.status(400).json({ error: "Insufficient USDT balance" });
        return;
      }
      if (msg.includes("MARKET_CLOSED") || msg.includes("MARKET_ENDED")) {
        res.status(400).json({ error: "This market is closed" });
        return;
      }
      if (msg.includes("MARKET_NOT_FOUND")) {
        res.status(404).json({ error: "Market not found" });
        return;
      }
      if (msg.includes("INVALID_AMOUNT")) {
        res.status(400).json({ error: "Invalid bet amount" });
        return;
      }
      res.status(500).json({ error: "Bet failed, please try again" });
      return;
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Bet failed, please try again" });
  }
});

export default router;

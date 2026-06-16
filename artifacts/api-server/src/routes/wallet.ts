import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { PAPONCE_URL, PAPONCE_SERVICE_KEY } from "../lib/supabase-config";

const router: IRouter = Router();

const admin = createClient(PAPONCE_URL, PAPONCE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_HANDLE_RE = /^[A-Za-z0-9_.@-]{1,128}$/;

async function resolveRecipient(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;

  // Exact UUID (Basonce account id)
  if (UUID_RE.test(q)) {
    const { data } = await admin.from("user_profiles").select("id").eq("id", q).limit(1);
    if (data && data.length === 1) return data[0].id as string;
  }

  // Email (case-insensitive, must be unique)
  if (q.includes("@")) {
    const { data } = await admin.from("user_profiles").select("id").ilike("email", q).limit(2);
    if (data && data.length === 1) return data[0].id as string;
  }

  // user_id_display, then username — only safe handles, parameter-bound .eq
  if (SAFE_HANDLE_RE.test(q)) {
    const byDisplay = await admin.from("user_profiles").select("id").eq("user_id_display", q).limit(2);
    if (byDisplay.data && byDisplay.data.length === 1) return byDisplay.data[0].id as string;
    const byUsername = await admin.from("user_profiles").select("id").eq("username", q).limit(2);
    if (byUsername.data && byUsername.data.length === 1) return byUsername.data[0].id as string;
  }

  return null;
}

router.post("/wallet/transfer", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      res.status(401).json({ error: "Missing auth token" });
      return;
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      res.status(401).json({ error: "Invalid auth token" });
      return;
    }
    const senderId = userData.user.id;

    const { recipient, symbol, amount } = (req.body || {}) as {
      recipient?: unknown; symbol?: unknown; amount?: unknown;
    };

    if (typeof recipient !== "string" || !recipient.trim()) {
      res.status(400).json({ error: "Recipient is required" });
      return;
    }
    if (typeof symbol !== "string" || !symbol.trim()) {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const recipientId = await resolveRecipient(recipient);
    if (!recipientId) {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }
    if (recipientId === senderId) {
      res.status(400).json({ error: "You cannot send to yourself" });
      return;
    }

    const { data, error } = await admin.rpc("wallet_user_transfer", {
      p_sender: senderId,
      p_recipient: recipientId,
      p_symbol: symbol.trim().toUpperCase(),
      p_amount: amt,
    });

    if (error) {
      const msg = error.message || "Transfer failed";
      let status = 400;
      if (/RECIPIENT_NOT_FOUND/.test(msg)) status = 404;
      else if (/INSUFFICIENT_BALANCE/.test(msg)) status = 400;
      const clean =
        /INSUFFICIENT_BALANCE/.test(msg) ? "Insufficient balance" :
        /SELF_TRANSFER/.test(msg) ? "You cannot send to yourself" :
        /RECIPIENT_NOT_FOUND/.test(msg) ? "Recipient not found" :
        /INVALID_AMOUNT/.test(msg) ? "Invalid amount" :
        "Transfer failed";
      res.status(status).json({ error: clean });
      return;
    }

    res.json({ success: true, result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[wallet/transfer] Error:", message);
    res.status(500).json({ error: "Transfer failed" });
  }
});

export default router;

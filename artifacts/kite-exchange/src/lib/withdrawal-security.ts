import { supabase } from './supabase';

const AUTO_HOLD_THRESHOLD_USD = 500;
const STABLECOINS = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP']);

let priceCache: { ts: number; map: Record<string, number> } | null = null;

async function getUsdPrice(symbol: string): Promise<number> {
  const sym = symbol.toUpperCase();
  if (STABLECOINS.has(sym)) return 1;

  if (priceCache && Date.now() - priceCache.ts < 60_000 && priceCache.map[sym]) {
    return priceCache.map[sym];
  }

  try {
    const r = await fetch(`/api/crypto-prices?symbols=${sym}`, { signal: AbortSignal.timeout(5000) });
    const data: any = await r.json().catch(() => ({}));
    const price = Number(data?.[sym]?.price || data?.[sym] || 0);
    if (price > 0) {
      const map = priceCache?.map || {};
      map[sym] = price;
      priceCache = { ts: Date.now(), map };
      return price;
    }
  } catch {}
  return 0;
}

export async function computeUsdValue(symbol: string, amount: number): Promise<number> {
  const price = await getUsdPrice(symbol);
  return price * amount;
}

/**
 * Client-side classification — used purely for optimistic UI/initial insert status.
 * SERVER (cf-worker /api/security/notify-withdrawal) is the source of truth and
 * will FORCE status='hold' if USD value >= $500. So even if a malicious client
 * skips this and inserts status='pending', the server overrides it.
 */
export async function classifyWithdrawal(symbol: string, amount: number): Promise<{
  status: 'pending' | 'hold';
  usdValue: number;
}> {
  const usdValue = await computeUsdValue(symbol, amount);
  return {
    status: usdValue >= AUTO_HOLD_THRESHOLD_USD ? 'hold' : 'pending',
    usdValue,
  };
}

/**
 * Calls the worker which will:
 *  1. Verify the user's JWT
 *  2. Verify the withdrawal_id belongs to this user
 *  3. Recompute USD value server-side
 *  4. Force status='hold' if needed (server-authoritative)
 *  5. Send Telegram alert to admin
 */
export async function notifyWithdrawalToAdmin(payload: {
  withdrawal_id: string;
}): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    await fetch('/api/security/notify-withdrawal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ withdrawal_id: payload.withdrawal_id }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Fire-and-forget; never block the user
  }
}

export const AUTO_HOLD_THRESHOLD = AUTO_HOLD_THRESHOLD_USD;

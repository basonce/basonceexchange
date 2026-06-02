// Casino API client — calls the cf-worker /api/games/* endpoints.
// All outcomes are decided server-side; this only sends the bet + choices.
import { supabase } from './supabase';

const API_BASE = (() => {
  if (typeof window !== 'undefined' && /replit\.dev|localhost/.test(window.location.host)) {
    return 'https://basonce.com/api';
  }
  return '/api';
})();

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
    if (session?.user?.id) h['x-requester-id'] = session.user.id;
  } catch {}
  return h;
}

async function call<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = { ...(await authHeaders()), ...(opts.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = { error: txt }; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}

export type CasinoGame = 'crash' | 'plinko' | 'lootbox';
export type PlinkoRisk = 'low' | 'med' | 'high';

export interface PlayResult {
  won: boolean;
  multiplier: number;
  payout: number;
  balance: number;
  outcome: {
    crash?: number; cashout?: number;
    bucket?: number; risk?: PlinkoRisk;
    multiplier?: number;
  };
}

export interface BetRow {
  game: CasinoGame;
  bet_amount: number;
  multiplier: number;
  payout: number;
  won: boolean;
  outcome: any;
  created_at: string;
}

export const casinoApi = {
  // Aviator / Uçan Kite — auto cashout target decided up front, server picks the crash point.
  playCrash: (bet: number, cashout: number) =>
    call<PlayResult>('/games/play', { method: 'POST', body: JSON.stringify({ game: 'crash', bet, cashout }) }),

  playPlinko: (bet: number, risk: PlinkoRisk) =>
    call<PlayResult>('/games/play', { method: 'POST', body: JSON.stringify({ game: 'plinko', bet, risk }) }),

  playLootbox: (bet: number) =>
    call<PlayResult>('/games/play', { method: 'POST', body: JSON.stringify({ game: 'lootbox', bet }) }),

  history: () => call<{ bets: BetRow[] }>('/games/history', { method: 'POST', body: JSON.stringify({}) }),
};

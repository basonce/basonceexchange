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

export type CasinoGame = 'dice' | 'coinflip' | 'crash';

export interface PlayResult {
  won: boolean;
  multiplier: number;
  payout: number;
  balance: number;
  outcome: {
    roll?: number; target?: number; dir?: 'over' | 'under';
    result?: 'heads' | 'tails'; side?: 'heads' | 'tails';
    crash?: number; cashout?: number;
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
  playDice: (bet: number, target: number, dir: 'over' | 'under') =>
    call<PlayResult>('/games/play', { method: 'POST', body: JSON.stringify({ game: 'dice', bet, target, dir }) }),

  playCoin: (bet: number, side: 'heads' | 'tails') =>
    call<PlayResult>('/games/play', { method: 'POST', body: JSON.stringify({ game: 'coinflip', bet, side }) }),

  playCrash: (bet: number, cashout: number) =>
    call<PlayResult>('/games/play', { method: 'POST', body: JSON.stringify({ game: 'crash', bet, cashout }) }),

  history: () => call<{ bets: BetRow[] }>('/games/history', { method: 'POST', body: JSON.stringify({}) }),
};

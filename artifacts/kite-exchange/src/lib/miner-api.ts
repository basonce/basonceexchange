// BNC Miner API client — calls cf-worker /api/miner/* with Telegram initData auth.
const API_BASE = (() => {
  if (typeof window !== 'undefined' && /replit\.dev|localhost/.test(window.location.host)) {
    return 'https://basonce.com/api';
  }
  return '/api';
})();

function getInitData(): string {
  if (typeof window === 'undefined') return '';
  return (window as any).Telegram?.WebApp?.initData || '';
}

// True only when running inside a real Telegram WebApp (signed initData present).
export function hasTelegram(): boolean {
  return !!getInitData();
}

export interface ServerMinerState {
  hash_rate: number;
  bsc_balance: number;
  total_claimed: number;
  last_claim_at: number;
  boxes_owned: string[];
  tasks_done: string[];
  ref_by: string | null;
  invited_count: number;
  linked: boolean;
}

export class MinerApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function call<T = any>(path: string, body: Record<string, any> = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: getInitData(), ...body }),
  });
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = { error: txt }; }
  if (!res.ok) throw new MinerApiError(data?.error || `HTTP ${res.status}`, res.status, data);
  return data as T;
}

export const minerApi = {
  init: (ref_code?: string | null) =>
    call<{ state: ServerMinerState }>('/miner/init', ref_code ? { ref_code } : {}),
  claim: () =>
    call<{ earned: number; state: ServerMinerState }>('/miner/claim', {}),
  // Step 1: reserve a unique payment amount bound to this user (anti front-run).
  createUpgradeIntent: (box_tier: string) =>
    call<{ intent_id: string; expected_nano: string; expected_ton: number; operator_wallet: string; expires_at: string }>(
      '/miner/upgrade/intent', { box_tier },
    ),
  // Step 2: claim the box after paying the exact reserved amount.
  upgrade: (intent_id: string) =>
    call<{ state: ServerMinerState }>('/miner/upgrade', { intent_id }),
  task: (task_key: string) =>
    call<{ reward: number; state: ServerMinerState }>('/miner/task', { task_key }),
  link: (email: string) =>
    call<{ linked: boolean; state: ServerMinerState }>('/miner/link', { email }),
  withdraw: (email?: string) =>
    call<{ ok: boolean; usdt_credited: number; bsc_withdrawn: number; state: ServerMinerState }>(
      '/miner/withdraw', email ? { email } : {},
    ),
};

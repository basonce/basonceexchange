/**
 * User Restrictions — stored in Supabase Storage (user-restrictions bucket)
 * Each user's config is a public JSON file: /user-restrictions/{user_id}.json
 * Admin writes via service role key; user-facing reads via public URL.
 */

import { getCurrentUser } from './supabase';

const BASE_URL = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const PUBLIC_URL = `${BASE_URL}/storage/v1/object/public/user-restrictions`;

export interface UserRestrictions {
  user_id: string;
  pair_lock_enabled: boolean;
  allowed_pairs: string[];
  withdrawal_asset: string;
  withdrawal_fee_usdt: number;
  usdt_frozen: boolean;
  withdrawal_frozen: boolean;
  campaigns_blocked: boolean;
  mining_blocked: boolean;
  trc20_address?: string;
  vip_overdue_notice?: boolean;
  vip_overdue_message?: string;
  vip_overdue_amount?: number;
  /** Min lifetime trading volume (USDT) before bonus funds can be withdrawn. 0 = no requirement. */
  min_volume_usdt?: number;
  /** Min lifetime real deposit (USDT) before bonus funds can be withdrawn. 0 = no requirement. */
  min_deposit_usdt?: number;
  /** Master switch for bonus withdrawal lock — when false, min_volume_usdt/min_deposit_usdt are ignored. */
  bonus_lock_enabled?: boolean;
  /** Per-user custom spot trading fee percentage. e.g. 1 = 1%, 0.5 = 0.5%. 0/undefined = use default 0.1%. */
  custom_trade_fee_pct?: number;
  /** When true, ALL trading fees (spot + futures + metal) are forced to 0 for this user. Overrides custom_trade_fee_pct. */
  zero_fee?: boolean;
}

/** Global platform defaults, stored at user-restrictions/_global.json */
export interface GlobalDefaults {
  /** When true, any user WITHOUT a per-user restrictions file gets 0% fee automatically. */
  zero_fee_for_new_users?: boolean;
}

const DEFAULT: Omit<UserRestrictions, 'user_id'> = {
  pair_lock_enabled: false,
  allowed_pairs: [],
  withdrawal_asset: 'BTC',
  withdrawal_fee_usdt: 0,
  usdt_frozen: false,
  withdrawal_frozen: false,
  campaigns_blocked: false,
  mining_blocked: false,
  trc20_address: '',
  vip_overdue_notice: false,
  vip_overdue_message: '',
  vip_overdue_amount: 0,
};

// In-memory cache keyed by user_id
const cache: Map<string, { data: UserRestrictions; ts: number }> = new Map();
const CACHE_TTL = 30_000; // 30 seconds

// Sync-accessible custom fee % for the *currently signed-in* user.
// Updated whenever getUserRestrictions() resolves. Used by sync fee calculators (futures, metal cross, quick trade).
let _currentUserCustomFeePct = 0;
let _currentUserZeroFee = false;
let _globalZeroFeeForNewUsers = false;
let _currentUserHasOwnFile = false;

export function getCachedCustomFeePct(): number {
  return _currentUserCustomFeePct;
}
/** Sync accessor: is the current user paying 0% on all trading fees? */
export function isZeroFeeUser(): boolean {
  if (_currentUserZeroFee) return true;
  // Fall back to global default for users without their own restrictions file
  if (!_currentUserHasOwnFile && _globalZeroFeeForNewUsers) return true;
  return false;
}
/** Returns the effective spot/futures/metal fee RATE (e.g. 0.001 = 0.1%, 0.01 = 1%). */
export function getEffectiveFeeRate(defaultRate = 0.001): number {
  if (isZeroFeeUser()) return 0;
  const pct = _currentUserCustomFeePct;
  return pct > 0 ? pct / 100 : defaultRate;
}

/** Fetch global platform defaults (cached 60s). Used as fallback when a user has no per-user file. */
let _globalCache: { data: GlobalDefaults; ts: number } | null = null;
export async function fetchGlobalDefaults(): Promise<GlobalDefaults> {
  if (_globalCache && Date.now() - _globalCache.ts < 60_000) return _globalCache.data;
  try {
    const resp = await fetch(`${PUBLIC_URL}/_global.json?t=${Date.now()}`, { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json() as GlobalDefaults;
      _globalCache = { data, ts: Date.now() };
      _globalZeroFeeForNewUsers = !!data.zero_fee_for_new_users;
      return data;
    }
  } catch {}
  const empty: GlobalDefaults = {};
  _globalCache = { data: empty, ts: Date.now() };
  return empty;
}

/** Fetch restrictions for a given user_id from public storage (no auth needed) */
export async function fetchUserRestrictions(userId: string): Promise<UserRestrictions | null> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const resp = await fetch(`${PUBLIC_URL}/${userId}.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!resp.ok) {
      // No per-user file — record that and ensure global default is loaded
      _currentUserHasOwnFile = false;
      _currentUserZeroFee = false;
      _currentUserCustomFeePct = 0;
      fetchGlobalDefaults().catch(() => {});
      return null;
    }
    const data = await resp.json() as UserRestrictions;
    cache.set(userId, { data, ts: Date.now() });
    // Update sync caches for current user
    _currentUserHasOwnFile = true;
    const pct = parseFloat(((data as any).custom_trade_fee_pct ?? 0) as any) || 0;
    if (pct >= 0) _currentUserCustomFeePct = pct;
    _currentUserZeroFee = !!data.zero_fee;
    return data;
  } catch {
    return null;
  }
}

/** Get restrictions for the currently signed-in user */
export async function getUserRestrictions(): Promise<UserRestrictions | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    // Always make sure global default is fresh (parallel)
    fetchGlobalDefaults().catch(() => {});
    return fetchUserRestrictions(user.id);
  } catch {
    return null;
  }
}

export function clearRestrictionsCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export async function isPairLocked(): Promise<boolean> {
  const r = await getUserRestrictions();
  return r?.pair_lock_enabled ?? false;
}

export async function getAllowedPairs(): Promise<string[]> {
  const r = await getUserRestrictions();
  return r?.allowed_pairs ?? [];
}

export async function getWithdrawalFee(): Promise<number> {
  const r = await getUserRestrictions();
  return r?.withdrawal_fee_usdt ?? 0;
}

export async function getWithdrawalAsset(): Promise<string> {
  const r = await getUserRestrictions();
  return r?.withdrawal_asset ?? 'BTC';
}

/** Save restrictions for a user (admin action — uses service role key for upload) */
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmamp5bXBydmpmbHRwdm1mcHRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxMDU3OSwiZXhwIjoyMDg5NDg2NTc5fQ.oB_Z2Ygyd8foDjs_b5liOiBRcwx60pvvnWV-yJuERY0';

export async function saveUserRestrictions(restrictions: UserRestrictions): Promise<void> {
  const { user_id } = restrictions;
  const body = JSON.stringify(restrictions);

  // Try update first, then insert
  let resp = await fetch(`${BASE_URL}/storage/v1/object/user-restrictions/${user_id}.json`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body,
  });

  if (!resp.ok) {
    resp = await fetch(`${BASE_URL}/storage/v1/object/user-restrictions/${user_id}.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body,
    });
  }

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Storage write failed: ${err}`);
  }

  // Invalidate cache
  cache.delete(user_id);
}

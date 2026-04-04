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
};

// In-memory cache keyed by user_id
const cache: Map<string, { data: UserRestrictions; ts: number }> = new Map();
const CACHE_TTL = 30_000; // 30 seconds

/** Fetch restrictions for a given user_id from public storage (no auth needed) */
export async function fetchUserRestrictions(userId: string): Promise<UserRestrictions | null> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const resp = await fetch(`${PUBLIC_URL}/${userId}.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!resp.ok) return null;
    const data = await resp.json() as UserRestrictions;
    cache.set(userId, { data, ts: Date.now() });
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

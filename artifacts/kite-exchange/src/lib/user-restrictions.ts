import { supabase, getCurrentUser } from './supabase';

export interface UserRestrictions {
  id?: string;
  user_id: string;
  pair_lock_enabled: boolean;
  allowed_pairs: string[];
  withdrawal_asset: string;
  withdrawal_fee_usdt: number;
}

const DEFAULT_RESTRICTIONS: Omit<UserRestrictions, 'id' | 'user_id'> = {
  pair_lock_enabled: false,
  allowed_pairs: [],
  withdrawal_asset: 'BTC',
  withdrawal_fee_usdt: 0,
};

let cachedRestrictions: UserRestrictions | null = null;
let cacheUserId: string | null = null;

export async function getUserRestrictions(): Promise<UserRestrictions | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    if (cachedRestrictions && cacheUserId === user.id) {
      return cachedRestrictions;
    }

    const { data, error } = await supabase
      .from('user_restrictions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    cachedRestrictions = data as UserRestrictions;
    cacheUserId = user.id;
    return cachedRestrictions;
  } catch {
    return null;
  }
}

export function clearRestrictionsCache() {
  cachedRestrictions = null;
  cacheUserId = null;
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

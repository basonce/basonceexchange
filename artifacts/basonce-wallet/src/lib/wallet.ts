import { supabase, getAccessToken } from './supabase';
import { CRYPTO_NETWORKS, generateDepositAddress } from './networks';

export interface WalletBalance {
  symbol: string;
  balance: number;
  locked: number;
}

export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  userIdDisplay: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface TxRecord {
  id: string;
  kind: 'send' | 'receive' | 'deposit' | 'withdrawal' | 'other';
  symbol: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  status?: string;
  destination?: string | null;
}

// API base — secure server endpoints live behind the shared /api gateway
// (same one kite-exchange uses).
const API_BASE = '/api';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, username, user_id_display, full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email ?? null,
    username: data.username ?? null,
    userIdDisplay: data.user_id_display ?? null,
    fullName: data.full_name ?? null,
    avatarUrl: data.avatar_url ?? null,
  };
}

export async function getBalances(userId: string): Promise<WalletBalance[]> {
  const { data, error } = await supabase
    .from('user_balances')
    .select('symbol, balance, locked_balance, is_deleted')
    .eq('user_id', userId);
  if (error || !data) return [];

  // No unique constraint on (user_id, symbol) — aggregate duplicates safely.
  const map = new Map<string, WalletBalance>();
  for (const row of data) {
    if (row.is_deleted === true) continue;
    const symbol = String(row.symbol || '').toUpperCase();
    if (!symbol) continue;
    const balance = parseFloat(row.balance) || 0;
    const locked = parseFloat(row.locked_balance) || 0;
    const existing = map.get(symbol);
    if (existing) {
      existing.balance += balance;
      existing.locked += locked;
    } else {
      map.set(symbol, { symbol, balance, locked });
    }
  }
  return Array.from(map.values());
}

// Reads the user's deposit address for a coin/network; generates + persists a
// deterministic one if none exists yet (same algorithm & table as kite-exchange).
export async function getDepositAddress(coinSymbol: string, network: string, userId: string): Promise<string> {
  const { data } = await supabase
    .from('deposit_addresses')
    .select('address')
    .eq('user_id', userId)
    .eq('coin_symbol', coinSymbol)
    .eq('network', network)
    .maybeSingle();

  if (data?.address) return data.address as string;

  const address = generateDepositAddress(coinSymbol, network, userId);
  await supabase.from('deposit_addresses').insert({
    user_id: userId,
    coin_symbol: coinSymbol,
    network,
    address,
  });
  return address;
}

export interface WithdrawParams {
  userId: string;
  coinSymbol: string;
  networkId: string;
  amount: number;
  destinationAddress: string;
  /** USD value of the withdrawal — used for the admin-hold threshold. */
  usdValue: number;
}

export interface WithdrawResult {
  ok: boolean;
  error?: string;
  status?: 'pending' | 'hold';
  receiveAmount?: number;
}

// Mirrors kite-exchange's proven withdrawal flow:
//  - fee comes from CRYPTO_NETWORKS
//  - >= $500 USD goes to 'hold' (manual review), otherwise 'pending'
//  - balance is deducted immediately, withdrawal row inserted, admin notified
export async function submitWithdrawal(p: WithdrawParams): Promise<WithdrawResult> {
  const networks = CRYPTO_NETWORKS[p.coinSymbol] || [];
  const net = networks.find(n => n.id === p.networkId) || networks[0];
  if (!net) return { ok: false, error: 'Unsupported network' };
  if (p.amount < net.minWithdraw) {
    return { ok: false, error: `Minimum withdrawal is ${net.minWithdraw} ${p.coinSymbol}` };
  }

  // Verify current balance. There is no unique constraint on (user_id, symbol),
  // so read the raw rows and aggregate — a user may legitimately have duplicates.
  const symbolUpper = p.coinSymbol.toUpperCase();
  const { data: rawRows, error: rowsErr } = await supabase
    .from('user_balances')
    .select('id, balance, is_deleted')
    .eq('user_id', p.userId)
    .eq('symbol', symbolUpper);
  if (rowsErr) return { ok: false, error: 'Could not verify balance. Please try again.' };
  const liveRows = (rawRows || []).filter(r => r.is_deleted !== true);
  const available = liveRows.reduce((s, r) => s + (parseFloat(r.balance) || 0), 0);
  if (liveRows.length === 0 || available < p.amount) {
    return { ok: false, error: 'Insufficient balance' };
  }

  const fee = net.withdrawFee;
  const receiveAmount = Math.max(0, p.amount - fee);
  const status: 'pending' | 'hold' = p.usdValue >= 500 ? 'hold' : 'pending';

  // Deduct immediately (matches kite) but target rows by id: put the post-debit
  // total on the primary row and zero out any duplicates, so duplicate rows can
  // never inflate or corrupt the balance.
  const newBalance = available - p.amount;
  const [primary, ...dupes] = liveRows;
  const { error: updErr } = await supabase
    .from('user_balances')
    .update({ balance: newBalance.toString() })
    .eq('id', primary.id);
  if (updErr) return { ok: false, error: 'Could not reserve balance. Please try again.' };
  for (const d of dupes) {
    await supabase.from('user_balances').update({ balance: '0' }).eq('id', d.id);
  }

  const { data: inserted, error: insErr } = await supabase
    .from('withdrawal_transactions')
    .insert({
      user_id: p.userId,
      coin_symbol: p.coinSymbol.toUpperCase(),
      network: p.networkId,
      amount: p.amount,
      network_fee: fee,
      receive_amount: receiveAmount,
      destination_address: p.destinationAddress.trim(),
      status,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    // Roll the balance back onto the primary row (duplicates were zeroed, so the
    // full pre-debit total is restored) so the user isn't debited for a failure.
    await supabase
      .from('user_balances')
      .update({ balance: available.toString() })
      .eq('id', primary.id);
    return { ok: false, error: 'Could not submit withdrawal. Please try again.' };
  }

  // Best-effort admin notification (non-blocking for the user).
  try {
    const token = await getAccessToken();
    await fetch(`${API_BASE}/security/notify-withdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ withdrawal_id: inserted.id }),
    });
  } catch { /* notification is non-critical */ }

  return { ok: true, status, receiveAmount };
}

export async function getHistory(userId: string, limit = 100): Promise<TxRecord[]> {
  const [{ data: txs }, { data: withdrawals }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, type, symbol, amount, notes, created_at, is_deleted')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('withdrawal_transactions')
      .select('id, coin_symbol, amount, status, destination_address, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const records: TxRecord[] = [];

  for (const t of txs || []) {
    if (t.is_deleted === true) continue;
    const type = String(t.type || '').toLowerCase();
    let kind: TxRecord['kind'] = 'other';
    if (type.includes('send')) kind = 'send';
    else if (type.includes('receive')) kind = 'receive';
    else if (type.includes('deposit')) kind = 'deposit';
    else if (type.includes('withdraw')) kind = 'withdrawal';
    records.push({
      id: String(t.id),
      kind,
      symbol: String(t.symbol || '').toUpperCase(),
      amount: parseFloat(t.amount) || 0,
      notes: t.notes ?? null,
      createdAt: t.created_at,
    });
  }

  for (const w of withdrawals || []) {
    records.push({
      id: `w_${w.id}`,
      kind: 'withdrawal',
      symbol: String(w.coin_symbol || '').toUpperCase(),
      amount: -(parseFloat(w.amount) || 0),
      notes: null,
      status: w.status ?? undefined,
      destination: w.destination_address ?? null,
      createdAt: w.created_at,
    });
  }

  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return records.slice(0, limit);
}

export interface SendResult { ok: boolean; error?: string }

// Secure user-to-user transfer. The balance mutation happens ONLY server-side
// via a service_role-locked SECURITY DEFINER RPC — the client can never move
// another user's funds. We just authenticate and forward the request.
export async function sendToUser(recipient: string, symbol: string, amount: number): Promise<SendResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'You must be signed in' };
  try {
    const res = await fetch(`${API_BASE}/wallet/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipient: recipient.trim(), symbol: symbol.toUpperCase(), amount }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error || 'Transfer failed' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

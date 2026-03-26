import { supabase } from './supabase';

// ── Users ─────────────────────────────────────────────────────
export async function fetchUsers(limit = 100) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, is_admin, is_active, created_at, is_real_user')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function fetchUserBalances(userId: string) {
  const { data } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .order('symbol');
  return data || [];
}

export async function addBalance(userId: string, symbol: string, amount: number, notes: string) {
  const { data: existing } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .maybeSingle();

  const before = existing ? parseFloat(existing.balance) : 0;
  const after = before + amount;

  if (existing) {
    await supabase.from('user_balances')
      .update({ balance: after, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('user_balances')
      .insert({ user_id: userId, symbol, balance: amount, locked_balance: 0 });
  }

  await supabase.from('transactions').insert({
    user_id: userId, type: 'admin_credit', symbol, amount,
    balance_before: before, balance_after: after,
    notes: notes || `Admin credit: ${amount} ${symbol}`,
  });

  await supabase.from('admin_actions').insert({
    action_type: 'credit_balance', target_user_id: userId,
    details: { symbol, amount, notes },
  });
}

export async function sendCoins(_: boolean, toUserId: string, symbol: string, amount: number, notes: string) {
  const { data: dest } = await supabase
    .from('user_balances').select('*')
    .eq('user_id', toUserId).eq('symbol', symbol).maybeSingle();

  const before = dest ? parseFloat(dest.balance) : 0;
  const after = before + amount;

  if (dest) {
    await supabase.from('user_balances')
      .update({ balance: after, updated_at: new Date().toISOString() }).eq('id', dest.id);
  } else {
    await supabase.from('user_balances')
      .insert({ user_id: toUserId, symbol, balance: amount, locked_balance: 0 });
  }

  await supabase.from('transactions').insert({
    user_id: toUserId, type: 'admin_send', symbol, amount,
    balance_before: before, balance_after: after,
    notes: notes || `Admin send: ${amount} ${symbol}`,
  });
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await supabase.from('user_profiles')
    .update({ is_active: isActive }).eq('id', userId);
  await supabase.from('admin_actions').insert({
    action_type: isActive ? 'activate_user' : 'deactivate_user',
    target_user_id: userId, details: {},
  });
}

export async function searchUsersByEmail(email: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, is_active')
    .ilike('email', `%${email}%`).limit(10);
  return data || [];
}

// ── Platform Stats ────────────────────────────────────────────
export async function fetchPlatformStats() {
  const { data, error } = await supabase.from('admin_platform_stats').select('*').single();
  if (error) {
    const [{ count: uc }, { count: tc }] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
    ]);
    return { total_users: uc || 0, users_today: 0, active_users_24h: 0, open_positions: 0,
      total_position_value: 0, pending_withdrawals: 0, pending_withdrawal_amount: 0,
      total_usdt_balances: 0, deposits_24h: 0, withdrawals_24h: 0, total_transactions: tc || 0 };
  }
  return data;
}

export async function fetchFinancialStatus() {
  try { const { data } = await supabase.rpc('get_platform_financial_status'); return data?.[0] || null; }
  catch { return null; }
}

export async function fetchRiskMetrics() {
  try { const { data } = await supabase.rpc('get_platform_risk_metrics'); return data?.[0] || null; }
  catch { return null; }
}

// ── Exchange Mode ─────────────────────────────────────────────
export async function fetchExchangeMode() {
  const { data } = await supabase.from('exchange_mode_config').select('*').eq('id', 1).maybeSingle();
  return data;
}

export async function setExchangeMode(mode: 'live' | 'frozen') {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('exchange_mode_config').update({
    mode,
    frozen_at: mode === 'frozen' ? new Date().toISOString() : null,
    frozen_prices: mode === 'live' ? {} : undefined,
    activated_by: user?.id,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  await supabase.from('admin_actions').insert({
    action_type: `exchange_mode_${mode}`,
    details: { mode },
  });
}

// ── Withdrawals (real table: withdrawal_transactions) ─────────
export async function fetchWithdrawals(status: 'pending' | 'completed' | 'rejected' | 'all' = 'pending') {
  try {
    const { data, error } = await supabase.rpc('get_admin_withdrawals', {
      p_status: status === 'all' ? null : status
    });
    if (!error && data) return data;
  } catch {}

  // Fallback: direct query
  let q = supabase.from('withdrawal_transactions')
    .select('*, user_profiles(email, full_name)')
    .order('created_at', { ascending: false }).limit(60);
  if (status !== 'all') q = q.eq('status', status);
  const { data } = await q;
  return data || [];
}

export async function approveWithdrawal(id: string, txid?: string) {
  try {
    const { data } = await supabase.rpc('admin_approve_withdrawal', {
      p_withdrawal_id: id, p_txid: txid || null
    });
    if (data?.success) return { ok: true };
  } catch {}
  // Fallback
  await supabase.from('withdrawal_transactions')
    .update({ status: 'completed', reviewed_at: new Date().toISOString(), txid: txid || null })
    .eq('id', id);
  return { ok: true };
}

export async function rejectWithdrawal(id: string, notes: string) {
  try {
    const { data } = await supabase.rpc('admin_reject_withdrawal', {
      p_withdrawal_id: id, p_notes: notes
    });
    if (data?.success) return { ok: true };
  } catch {}
  await supabase.from('withdrawal_transactions')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), admin_notes: notes })
    .eq('id', id);
  return { ok: true };
}

export async function fetchTransactions(limit = 60) {
  const { data } = await supabase
    .from('transactions')
    .select('*, user_profiles(email)')
    .order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function manualDeposit(userId: string, amount: number, symbol: string, txHash: string) {
  await addBalance(userId, symbol, amount, `Manuel deposit: ${txHash}`);
  await supabase.from('admin_actions').insert({
    action_type: 'manual_deposit', target_user_id: userId,
    details: { amount, symbol, tx_hash: txHash },
  });
}

// ── Incoming Funds ────────────────────────────────────────────
export async function fetchIncomingFunds(limit = 50) {
  try {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*, user_profiles(email, full_name)')
      .order('created_at', { ascending: false }).limit(limit);
    return data || [];
  } catch {
    return [];
  }
}

export async function creditIncomingFund(txId: string, userId: string, amount: number, symbol: string) {
  await addBalance(userId, symbol, amount, `Gelen fon: ${txId}`);
  try {
    await supabase.from('wallet_transactions')
      .update({ user_id: userId, is_notified: true })
      .eq('id', txId);
  } catch {}
}

// ── Positions ────────────────────────────────────────────────
export async function fetchPositions() {
  try {
    const { data } = await supabase
      .from('futures_positions')
      .select('*, user_profiles(email, full_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100);
    return data || [];
  } catch { return []; }
}

export async function forceClosePosition(positionId: string, reason: string) {
  try {
    await supabase.from('futures_positions')
      .update({ status: 'closed', close_reason: reason, closed_at: new Date().toISOString() })
      .eq('id', positionId);
    await supabase.from('admin_actions').insert({
      action_type: 'force_close_position', details: { position_id: positionId, reason },
    });
  } catch {}
}

// ── Wallets ───────────────────────────────────────────────────
export async function fetchWalletPool() {
  try {
    const { data } = await supabase
      .from('deposit_wallets')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  } catch { return []; }
}

export async function fetchUserWallets() {
  try {
    const { data } = await supabase
      .from('user_wallet_assignments')
      .select('*, user_profiles(email, full_name)')
      .order('assigned_at', { ascending: false })
      .limit(80);
    return data || [];
  } catch { return []; }
}

// ── Admin Activity Log ────────────────────────────────────────
export async function fetchAdminLogs(category?: string) {
  try {
    const { data } = await supabase.rpc('get_recent_admin_actions', {
      p_limit: 100,
      p_action_category: category || null
    });
    return data || [];
  } catch {
    const { data } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    return data || [];
  }
}

// ── Analytics ────────────────────────────────────────────────
export async function fetchAnalyticsSummary() {
  try {
    const { data } = await supabase.rpc('get_analytics_summary');
    return data || null;
  } catch { return null; }
}

export async function fetchOnlineUsers() {
  try {
    const { data } = await supabase
      .from('analytics_online_users')
      .select('*')
      .order('last_activity_at', { ascending: false });
    return data || [];
  } catch { return []; }
}

// ── Support ───────────────────────────────────────────────────
export async function fetchSupportTickets() {
  const { data } = await supabase
    .from('support_tickets')
    .select('*, user_profiles(email, full_name)')
    .order('created_at', { ascending: false }).limit(50);
  return data || [];
}

export async function fetchSupportMessages(ticketId: string) {
  const { data } = await supabase
    .from('support_messages').select('*')
    .eq('ticket_id', ticketId).order('created_at', { ascending: true });
  return data || [];
}

export async function sendSupportReply(ticketId: string, message: string) {
  await supabase.from('support_messages').insert({
    ticket_id: ticketId, message, sender_type: 'admin', read: true,
  });
  await supabase.from('support_tickets')
    .update({ status: 'answered', updated_at: new Date().toISOString() }).eq('id', ticketId);
}

export async function closeSupportTicket(ticketId: string) {
  await supabase.from('support_tickets')
    .update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', ticketId);
}

export async function markMessagesRead(ticketId: string) {
  await supabase.from('support_messages')
    .update({ read: true })
    .eq('ticket_id', ticketId).eq('sender_type', 'customer');
}

export async function fetchUnreadSupportCount() {
  const { count } = await supabase
    .from('support_messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_type', 'customer').eq('read', false);
  return count || 0;
}

// ── VIP users ─────────────────────────────────────────────────
export async function fetchVIPUsers(limit = 5) {
  try {
    const { data } = await supabase.rpc('get_vip_users', { p_limit: limit });
    return data || [];
  } catch {
    const { data } = await supabase.from('user_balances')
      .select('user_id, balance, user_profiles(email, full_name)')
      .eq('symbol', 'USDT').order('balance', { ascending: false }).limit(limit);
    return data || [];
  }
}

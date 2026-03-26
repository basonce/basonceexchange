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
    user_id: userId,
    type: 'admin_credit',
    symbol,
    amount,
    balance_before: before,
    balance_after: after,
    notes: notes || `Admin credit: ${amount} ${symbol}`,
  });

  await supabase.from('admin_actions').insert({
    action_type: 'credit_balance',
    target_user_id: userId,
    details: { symbol, amount, notes },
  });
}

export async function sendCoins(fromAdmin: boolean, toUserId: string, symbol: string, amount: number, notes: string) {
  const { data: dest } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', toUserId)
    .eq('symbol', symbol)
    .maybeSingle();

  const before = dest ? parseFloat(dest.balance) : 0;
  const after = before + amount;

  if (dest) {
    await supabase.from('user_balances')
      .update({ balance: after, updated_at: new Date().toISOString() })
      .eq('id', dest.id);
  } else {
    await supabase.from('user_balances')
      .insert({ user_id: toUserId, symbol, balance: amount, locked_balance: 0 });
  }

  await supabase.from('transactions').insert({
    user_id: toUserId,
    type: 'admin_send',
    symbol,
    amount,
    balance_before: before,
    balance_after: after,
    notes: notes || `Admin send: ${amount} ${symbol}`,
  });
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await supabase.from('user_profiles')
    .update({ is_active: isActive })
    .eq('id', userId);
  await supabase.from('admin_actions').insert({
    action_type: isActive ? 'activate_user' : 'deactivate_user',
    target_user_id: userId,
    details: {},
  });
}

export async function searchUsersByEmail(email: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, is_active')
    .ilike('email', `%${email}%`)
    .limit(10);
  return data || [];
}

// ── Platform Stats ────────────────────────────────────────────
export async function fetchPlatformStats() {
  const { data, error } = await supabase
    .from('admin_platform_stats')
    .select('*')
    .single();
  if (error) {
    // Fallback: manual count
    const [{ count: uc }, { count: tc }] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
    ]);
    return { total_users: uc || 0, users_today: 0, active_users_24h: 0, open_positions: 0, total_position_value: 0, pending_withdrawals: 0, pending_withdrawal_amount: 0, total_usdt_balances: 0, deposits_24h: 0, withdrawals_24h: 0, total_transactions: tc || 0 };
  }
  return data;
}

export async function fetchFinancialStatus() {
  try {
    const { data } = await supabase.rpc('get_platform_financial_status');
    return data?.[0] || null;
  } catch { return null; }
}

export async function fetchRiskMetrics() {
  try {
    const { data } = await supabase.rpc('get_platform_risk_metrics');
    return data?.[0] || null;
  } catch { return null; }
}

// ── Withdrawals ───────────────────────────────────────────────
export async function fetchPendingWithdrawals() {
  const { data } = await supabase
    .from('withdrawal_requests')
    .select('*, user_profiles(email, full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function approveWithdrawal(id: string) {
  await supabase.from('withdrawal_requests')
    .update({ status: 'approved', processed_at: new Date().toISOString() })
    .eq('id', id);
  await supabase.from('admin_actions').insert({ action_type: 'approve_withdrawal', details: { withdrawal_id: id } });
}

export async function rejectWithdrawal(id: string, reason: string) {
  await supabase.from('withdrawal_requests')
    .update({ status: 'rejected', rejection_reason: reason, processed_at: new Date().toISOString() })
    .eq('id', id);
  await supabase.from('admin_actions').insert({ action_type: 'reject_withdrawal', details: { withdrawal_id: id, reason } });
}

export async function fetchTransactions(limit = 60) {
  const { data } = await supabase
    .from('transactions')
    .select('*, user_profiles(email)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── Support ───────────────────────────────────────────────────
export async function fetchSupportTickets() {
  const { data } = await supabase
    .from('support_tickets')
    .select('*, user_profiles(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function fetchSupportMessages(ticketId: string) {
  const { data } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function sendSupportReply(ticketId: string, message: string) {
  await supabase.from('support_messages').insert({
    ticket_id: ticketId,
    message,
    sender_type: 'admin',
    read: true,
  });
  await supabase.from('support_tickets')
    .update({ status: 'answered', updated_at: new Date().toISOString() })
    .eq('id', ticketId);
}

export async function closeSupportTicket(ticketId: string) {
  await supabase.from('support_tickets')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', ticketId);
}

export async function markMessagesRead(ticketId: string) {
  await supabase.from('support_messages')
    .update({ read: true })
    .eq('ticket_id', ticketId)
    .eq('sender_type', 'customer');
}

export async function fetchUnreadSupportCount() {
  const { count } = await supabase
    .from('support_messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_type', 'customer')
    .eq('read', false);
  return count || 0;
}

// ── VIP users ─────────────────────────────────────────────────
export async function fetchVIPUsers(limit = 5) {
  try {
    const { data } = await supabase.rpc('get_vip_users', { p_limit: limit });
    return data || [];
  } catch {
    const { data } = await supabase
      .from('user_balances')
      .select('user_id, balance, user_profiles(email, full_name)')
      .eq('symbol', 'USDT')
      .order('balance', { ascending: false })
      .limit(limit);
    return data || [];
  }
}

// ── Deposit (manual update) ──────────────────────────────────
export async function manualDeposit(userId: string, amount: number, symbol: string, txHash: string) {
  await addBalance(userId, symbol, amount, `Manual deposit: ${txHash}`);
  await supabase.from('admin_actions').insert({
    action_type: 'manual_deposit',
    target_user_id: userId,
    details: { amount, symbol, tx_hash: txHash },
  });
}

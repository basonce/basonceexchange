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

// ── User Restrictions ──────────────────────────────────────────
export interface UserRestrictions {
  id?: string;
  user_id: string;
  pair_lock_enabled: boolean;
  allowed_pairs: string[];
  withdrawal_asset: string;
  withdrawal_fee_usdt: number;
}

const STORAGE_BASE = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const STORAGE_PUBLIC = `${STORAGE_BASE}/storage/v1/object/public/user-restrictions`;
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmamp5bXBydmpmbHRwdm1mcHRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxMDU3OSwiZXhwIjoyMDg5NDg2NTc5fQ.oB_Z2Ygyd8foDjs_b5liOiBRcwx60pvvnWV-yJuERY0';

export async function fetchUserRestrictions(userId: string): Promise<UserRestrictions | null> {
  try {
    const resp = await fetch(`${STORAGE_PUBLIC}/${userId}.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!resp.ok) return null;
    return await resp.json() as UserRestrictions;
  } catch {
    return null;
  }
}

export async function saveUserRestrictions(r: UserRestrictions): Promise<{ ok: boolean; error?: string }> {
  const body = JSON.stringify(r);
  const headers = {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
    'Content-Type': 'application/json',
    'x-upsert': 'true',
  };
  let resp = await fetch(`${STORAGE_BASE}/storage/v1/object/user-restrictions/${r.user_id}.json`, {
    method: 'PUT', headers, body,
  });
  if (!resp.ok) {
    resp = await fetch(`${STORAGE_BASE}/storage/v1/object/user-restrictions/${r.user_id}.json`, {
      method: 'POST', headers: { ...headers }, body,
    });
  }
  if (!resp.ok) {
    return { ok: false, error: await resp.text() };
  }
  await supabase.from('admin_actions').insert({
    action_type: 'set_user_restrictions',
    target_user_id: r.user_id,
    details: r,
  }).then(() => {});
  return { ok: true };
}

// ── Platform Stats ────────────────────────────────────────────
export async function fetchPlatformStats() {
  // Always build stats from real tables — don't rely on admin_platform_stats view
  const [
    { count: userCount },
    { count: txCount },
    { data: pendingWds },
    { count: posCount },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase.from('withdrawal_transactions').select('id, amount').not('status', 'in', '(completed,rejected,cancelled)'),
    supabase.from('futures_positions').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const pendingCount = pendingWds?.length || 0;
  const pendingAmount = (pendingWds || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // Try to get extended stats from the view — merge on top
  try {
    const { data } = await supabase.from('admin_platform_stats').select('*').single();
    if (data) return {
      ...data,
      total_users: userCount || data.total_users || 0,
      pending_withdrawals: pendingCount,
      pending_withdrawal_amount: pendingAmount,
      open_positions: posCount || data.open_positions || 0,
      total_transactions: txCount || data.total_transactions || 0,
    };
  } catch {}

  return {
    total_users: userCount || 0,
    users_today: 0,
    active_users_24h: 0,
    open_positions: posCount || 0,
    total_position_value: 0,
    pending_withdrawals: pendingCount,
    pending_withdrawal_amount: pendingAmount,
    total_usdt_balances: 0,
    deposits_24h: 0,
    withdrawals_24h: 0,
    total_transactions: txCount || 0,
  };
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
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false }).limit(60);
  if (!tickets || tickets.length === 0) return [];

  // Enrich with user profile data separately (no FK join needed)
  const customerIds = [...new Set(tickets.map((t: any) => t.customer_id).filter(Boolean))];
  const profileMap: Record<string, any> = {};
  if (customerIds.length > 0) {
    const numericIds = customerIds.map(id => parseInt(id as string, 10)).filter(n => !isNaN(n));
    if (numericIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, user_id')
        .in('user_id', numericIds);
      (profiles || []).forEach((p: any) => { profileMap[String(p.user_id)] = p; });
    }
    // UUID-based lookups
    const uuidIds = customerIds.filter(id => isNaN(parseInt(id as string, 10)));
    if (uuidIds.length > 0) {
      const { data: profiles2 } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, user_id')
        .in('id', uuidIds);
      (profiles2 || []).forEach((p: any) => { profileMap[p.id] = p; });
    }
  }

  tickets.forEach((t: any) => {
    const p = profileMap[t.customer_id];
    t.user_profiles = p ? { email: p.email, full_name: p.full_name } : { email: t.email, full_name: t.email };
  });

  const ticketIds = tickets.map((t: any) => t.id);
  const { data: allMsgs } = await supabase
    .from('support_messages')
    .select('ticket_id, message, sender_type, created_at')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: false });

  const lastMsgMap: Record<string, any> = {};
  for (const m of (allMsgs || [])) {
    if (!lastMsgMap[m.ticket_id]) lastMsgMap[m.ticket_id] = m;
  }

  return tickets.map((t: any) => ({ ...t, last_message: lastMsgMap[t.id] || null }));
}

export async function fetchTicketUserProfile(customerId: string) {
  if (!customerId) return null;
  try {
    let profile: any = null;
    const numericId = parseInt(customerId, 10);
    if (!isNaN(numericId)) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', numericId)
        .maybeSingle();
      profile = data;
    }
    if (!profile) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();
      profile = data;
    }
    if (!profile) return null;

    const { data: balances } = await supabase
      .from('user_balances')
      .select('symbol, balance, locked_balance, futures_balance')
      .eq('user_id', profile.id);

    return { profile, balances: balances || [] };
  } catch { return null; }
}

export async function generateAISupportDraft(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  lang: string,
  agentName: string
): Promise<string | null> {
  try {
    const SUPABASE_URL = 'https://mgfviqdxeupajntpylig.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnZpcWR4ZXVwYWpudHB5bGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjgwNDksImV4cCI6MjA4NzA0NDA0OX0.zxca3lBfqHt4EQ1pFLGlDkZUQJY1iQXaZA0cOflJc18';
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-support-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, agentName, customerLanguage: lang }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response || null;
  } catch { return null; }
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

// ── Revenue / Commission ───────────────────────────────────────
export async function fetchRevenueSummary() {
  try {
    const now = new Date();
    const day1 = new Date(now); day1.setHours(0,0,0,0);
    const week1 = new Date(now); week1.setDate(now.getDate()-7);
    const month1 = new Date(now); month1.setDate(1); month1.setHours(0,0,0,0);

    const [{ data: dayTx }, { data: weekTx }, { data: monthTx }, { data: allTx }] = await Promise.all([
      supabase.from('transactions').select('amount,symbol').eq('type','trading_fee').gte('created_at', day1.toISOString()),
      supabase.from('transactions').select('amount,symbol').eq('type','trading_fee').gte('created_at', week1.toISOString()),
      supabase.from('transactions').select('amount,symbol').eq('type','trading_fee').gte('created_at', month1.toISOString()),
      supabase.from('transactions').select('amount,symbol').eq('type','trading_fee'),
    ]);

    const sum = (arr: any[]) => (arr||[]).reduce((s,r) => s + Number(r.amount||0), 0);
    return {
      today: sum(dayTx||[]),
      week: sum(weekTx||[]),
      month: sum(monthTx||[]),
      total: sum(allTx||[]),
      tx_count_today: (dayTx||[]).length,
      tx_count_month: (monthTx||[]).length,
    };
  } catch { return { today:0,week:0,month:0,total:0,tx_count_today:0,tx_count_month:0 }; }
}

export async function fetchTopTraders(limit = 10) {
  try {
    const { data } = await supabase
      .from('futures_positions')
      .select('user_id, realized_pnl, position_value, user_profiles(email,full_name)')
      .order('position_value', { ascending: false })
      .limit(limit * 3);

    if (!data) return [];
    const map: Record<string, any> = {};
    for (const p of data) {
      const uid = p.user_id;
      if (!map[uid]) map[uid] = { user_id: uid, email: (p as any).user_profiles?.email, pnl: 0, volume: 0, count: 0 };
      map[uid].pnl += Number(p.realized_pnl||0);
      map[uid].volume += Number(p.position_value||0);
      map[uid].count++;
    }
    return Object.values(map).sort((a,b) => b.volume - a.volume).slice(0, limit);
  } catch { return []; }
}

// ── IP Blocking ────────────────────────────────────────────────
export async function fetchBlockedIPs() {
  try {
    const { data } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  } catch { return []; }
}

export async function blockIP(ip: string, reason: string) {
  try {
    await supabase.from('blocked_ips').upsert({ ip_address: ip, reason, is_active: true, created_at: new Date().toISOString() }, { onConflict: 'ip_address' });
    await supabase.from('admin_actions').insert({ action_type: 'block_ip', details: { ip, reason } });
  } catch {
    await supabase.from('admin_actions').insert({ action_type: 'block_ip', details: { ip, reason } });
  }
}

export async function unblockIP(id: string) {
  try {
    await supabase.from('blocked_ips').update({ is_active: false }).eq('id', id);
    await supabase.from('admin_actions').insert({ action_type: 'unblock_ip', details: { id } });
  } catch {}
}

// ── Broadcast Notifications ────────────────────────────────────
export async function sendBroadcast(title: string, body: string, target: 'all'|'active'|'vip') {
  await supabase.from('admin_actions').insert({
    action_type: 'broadcast_notification',
    details: { title, body, target, sent_at: new Date().toISOString() },
  });
}

export async function fetchBroadcastHistory(limit = 20) {
  try {
    const { data } = await supabase
      .from('admin_actions')
      .select('*')
      .eq('action_type', 'broadcast_notification')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data||[]).map(r => ({ id: r.id, ...r.details, created_at: r.created_at }));
  } catch { return []; }
}

export async function fetchBannerMessage() {
  try {
    const { data } = await supabase.from('exchange_mode_config').select('banner_message,banner_type').eq('id',1).maybeSingle();
    return data || null;
  } catch { return null; }
}

export async function setBannerMessage(message: string, type: 'info'|'warning'|'success'|'') {
  try {
    await supabase.from('exchange_mode_config').update({ banner_message: message||null, banner_type: type||null }).eq('id',1);
    await supabase.from('admin_actions').insert({ action_type: 'set_banner', details: { message, type } });
  } catch {
    await supabase.from('admin_actions').insert({ action_type: 'set_banner', details: { message, type } });
  }
}

// ── Risk Management ────────────────────────────────────────────
export async function fetchDetailedRisk() {
  try {
    const { data: positions } = await supabase
      .from('futures_positions')
      .select('*,user_profiles(email)')
      .eq('status','open')
      .order('position_value', { ascending: false })
      .limit(200);

    const pos = positions||[];
    const totalValue = pos.reduce((s,p)=>s+Number(p.position_value||0),0);
    const totalPnl = pos.reduce((s,p)=>s+Number(p.unrealized_pnl||p.pnl||0),0);
    const nearLiq = pos.filter(p => {
      const entry = Number(p.entry_price||0);
      const liq = Number(p.liquidation_price||0);
      const mark = Number(p.mark_price||p.current_price||entry);
      if (!liq||!entry) return false;
      const isLong = (p.side||'').toLowerCase()==='long';
      const dist = isLong ? (mark-liq)/mark : (liq-mark)/mark;
      return dist < 0.05;
    });
    const highLev = pos.filter(p=>Number(p.leverage||1)>=50);
    const longs = pos.filter(p=>(p.side||'').toLowerCase()==='long');
    const shorts = pos.filter(p=>(p.side||'').toLowerCase()==='short');

    const userMap: Record<string,{email:string;count:number;value:number}> = {};
    for (const p of pos) {
      const uid = p.user_id;
      if (!userMap[uid]) userMap[uid] = { email:(p as any).user_profiles?.email||uid, count:0, value:0 };
      userMap[uid].count++;
      userMap[uid].value += Number(p.position_value||0);
    }
    const topUsers = Object.values(userMap).sort((a,b)=>b.value-a.value).slice(0,5);

    return { pos, totalValue, totalPnl, nearLiq, highLev, longs: longs.length, shorts: shorts.length, topUsers };
  } catch { return { pos:[], totalValue:0, totalPnl:0, nearLiq:[], highLev:[], longs:0, shorts:0, topUsers:[] }; }
}

export async function closeAllUserPositions(userId: string, reason: string) {
  try {
    await supabase.from('futures_positions')
      .update({ status: 'closed', close_reason: reason, closed_at: new Date().toISOString() })
      .eq('user_id', userId).eq('status', 'open');
    await supabase.from('admin_actions').insert({ action_type: 'close_all_user_positions', target_user_id: userId, details: { reason } });
  } catch {}
}

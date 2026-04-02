import { supabase, ensureAdminAuth } from './supabase';
import { fetchWithdrawals } from './admin-api';
import { useStore, isMuted } from './store';
import {
  startNewUserAlarm, startWithdrawalAlarm, startDepositAlarm,
  startSupportAlarm, startSecurityAlarm, startCriticalAlarm, startPositionAlarm,
  sendBrowserNotification,
} from './audio';

let initialized = false;
let monitorStartedAt = new Date().toISOString();

// ── Seen IDs — prevents duplicate alarms from polling ─────────
const seen = {
  withdrawals:      new Set<string>(),
  users:            new Set<string>(),
  tickets:          new Set<string>(),
  messages:         new Set<string>(),
  walletTx:         new Set<string>(),
  transactions:     new Set<string>(),
  futuresHistory:   new Set<string>(),
  spotOrders:       new Set<string>(),
  walletAddresses:  new Set<string>(),
};

// ── Fire alert ────────────────────────────────────────────────
type Severity = Parameters<ReturnType<typeof useStore.getState>['addAlert']>[0]['severity'];
type Category = Parameters<ReturnType<typeof useStore.getState>['addAlert']>[0]['category'];

function fireAlert(
  severity: Severity,
  category: Category,
  title: string,
  body: string,
  meta?: Record<string, string | number | boolean>,
  alarmFn?: () => void
) {
  const { addAlert, settings } = useStore.getState();
  addAlert({ severity, category, title, body, meta });
  if (isMuted(settings)) return;
  if (settings.alertSounds && alarmFn) { try { alarmFn(); } catch {} }
  if (settings.browserNotifications) { sendBrowserNotification(`[Admin] ${title}`, body); }
  console.log(`[monitor] 🔔 ${severity.toUpperCase()} — ${title} | ${body}`);
}

// ── Event handlers ────────────────────────────────────────────

function handleFuturesHistory(rec: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id || seen.futuresHistory.has(id)) return;
  seen.futuresHistory.add(id);
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const margin    = Number(rec.margin) || 0;
  const pnl       = Number(rec.realized_pnl) || 0;
  const symbol    = String(rec.symbol || 'UNKNOWN');
  const side      = String(rec.side || '').toUpperCase();
  const leverage  = Number(rec.leverage) || 1;
  const reason    = String(rec.close_reason || '');
  const isLiq     = reason === 'liquidated';
  const { settings } = useStore.getState();

  if (!isLiq && margin < settings.largeTradeThreshold) return;

  if (isLiq) {
    fireAlert('critical', 'finance',
      `💥 LİKİDASYON! ${symbol}`,
      `${side} ${leverage}x — Kayıp: $${Math.abs(pnl).toFixed(0)} | Margin: $${margin.toFixed(0)}`,
      { margin, symbol, pnl }, startCriticalAlarm);
  } else {
    fireAlert('medium', 'finance',
      `📊 Pozisyon Kapandı: ${symbol}`,
      `${side} ${leverage}x — PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)} | $${margin.toFixed(0)}`,
      { margin, symbol, pnl }, startPositionAlarm);
  }
}

function handleSpotOrder(rec: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id || seen.spotOrders.has(id)) return;
  seen.spotOrders.add(id);
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const total    = Number(rec.total) || 0;
  const symbol   = String(rec.symbol || '');
  const side     = String(rec.side || '').toUpperCase();
  const type     = String(rec.type || '');
  const qty      = Number(rec.quantity) || 0;
  const { settings } = useStore.getState();

  if (total < settings.largeTradeThreshold) return;

  const emoji = side === 'BUY' ? '🟢' : '🔴';
  fireAlert('medium', 'finance',
    `${emoji} Spot Emir: ${symbol}`,
    `${side} ${type} — ${qty.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} adet | $${total.toFixed(0)}`,
    { total, symbol }, startDepositAlarm);
}

function handleTransaction(rec: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id || seen.transactions.has(id)) return;
  seen.transactions.add(id);
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const amount = Number(rec.amount) || 0;
  const type   = String(rec.type || '');
  const symbol = String(rec.symbol || 'USDT');
  const { settings } = useStore.getState();

  if (type === 'deposit' || type === 'manual_deposit' || type === 'admin_credit') {
    if (amount < settings.depositThreshold) return;
    fireAlert('high', 'finance', '💰 Para Yatırıldı',
      `+$${amount.toFixed(2)} ${symbol}`, { amount }, startDepositAlarm);
  } else if (type === 'buy') {
    if (amount < settings.largeTradeThreshold) return;
    fireAlert('low', 'finance', `🟢 Alış: ${symbol}`,
      `$${amount.toFixed(0)} tutarında alış`, { amount, symbol }, startDepositAlarm);
  } else if (type === 'sell') {
    if (amount < settings.largeTradeThreshold) return;
    fireAlert('low', 'finance', `🔴 Satış: ${symbol}`,
      `$${amount.toFixed(0)} tutarında satış`, { amount, symbol }, startDepositAlarm);
  }
}

function handleWithdrawal(rec: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id || seen.withdrawals.has(id)) return;
  seen.withdrawals.add(id);
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const amount = Number(rec.amount) || 0;
  const coin   = String(rec.coin_symbol || 'USDT');
  const { settings } = useStore.getState();
  const isCritical = amount > settings.largeTradeThreshold;

  fireAlert(isCritical ? 'critical' : 'high', 'finance',
    '⚠️ Çekim Talebi!',
    `$${amount.toFixed(2)} ${coin} — onay bekliyor`,
    { amount }, isCritical ? startCriticalAlarm : startWithdrawalAlarm);
}

function handleSupportTicket(rec: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id || seen.tickets.has(id)) return;
  seen.tickets.add(id);
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const email = String(rec.email || '');
  const label = email ? `${email} destek açtı` : 'Yeni destek talebi';
  fireAlert('medium', 'support', '💬 Destek Talebi', label, { ticketId: id }, startSupportAlarm);
  useStore.getState().setStats({ pendingSupport: useStore.getState().pendingSupport + 1 });
}

function handleSupportMessage(rec: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id || seen.messages.has(id)) return;
  seen.messages.add(id);
  if (rec.sender_type === 'admin') return;
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const content = String(rec.message || rec.content || 'Yeni mesaj').slice(0, 100);
  const danger  = ['dolandırıcı', 'para gitmedi', 'scam', 'fraud', 'hack', 'şikayet', 'çaldı'];
  const isDanger = danger.some(w => content.toLowerCase().includes(w));
  fireAlert(isDanger ? 'critical' : 'medium', 'support',
    isDanger ? '🚨 ACİL Destek Mesajı' : '💬 Yeni Destek Mesajı',
    content, {}, isDanger ? startSecurityAlarm : startSupportAlarm);
}

function handleWalletTransaction(rec: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id || seen.walletTx.has(id)) return;
  seen.walletTx.add(id);
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const amount  = Number(rec.amount) || 0;
  const coin    = String(rec.token_symbol || 'USDT');
  const network = String(rec.network || '');
  const { settings } = useStore.getState();
  if (amount < settings.depositThreshold) return;

  fireAlert('high', 'finance', '🔗 Zincirden Transfer Geldi',
    `+${amount.toFixed(4)} ${coin}${network ? ` (${network})` : ''}`,
    { amount }, startDepositAlarm);
}

function handleWalletAddress(rec: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id || seen.walletAddresses.has(id)) return;
  seen.walletAddresses.add(id);
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const network = String(rec.network || rec.coin || '');
  const userId  = String(rec.user_id || '');
  fireAlert('info', 'user', '🔑 Cüzdan Atandı',
    `${network || 'Yeni'} cüzdan adresi atandı`,
    { userId }, undefined);
}

function handleNewUser(rec: Record<string, unknown>) {
  const id = String(rec.id || rec.user_id || '');
  if (!id || seen.users.has(id)) return;
  seen.users.add(id);
  if (!rec.created_at || new Date(String(rec.created_at)) < new Date(monitorStartedAt)) return;

  const name  = String(rec.full_name || rec.email || 'Bilinmeyen');
  const email = String(rec.email || '');
  fireAlert('high', 'user', '🆕 Yeni Üye Kaydı!',
    `${name}${email && name !== email ? ` (${email})` : ''} platforma katıldı`,
    { user: name, email }, startNewUserAlarm);
  useStore.getState().setStats({ totalUsers: useStore.getState().totalUsers + 1 });
}

const seenLogins = new Set<string>();

function handleUserLogin(rec: Record<string, unknown>, old: Record<string, unknown>) {
  const id = String(rec.id || '');
  if (!id) return;
  const newLogin = String(rec.last_login_at || '');
  const oldLogin = String(old.last_login_at || '');
  if (!newLogin || newLogin === oldLogin) return;
  const loginKey = `${id}_${newLogin}`;
  if (seenLogins.has(loginKey)) return;
  seenLogins.add(loginKey);
  if (new Date(newLogin) < new Date(monitorStartedAt)) return;

  const name   = String(rec.full_name || rec.email || 'Üye');
  const email  = String(rec.email || '');
  fireAlert('low', 'visitor', `🔑 Üye Giriş Yaptı`,
    `${name}${email && name !== email ? ` (${email})` : ''} sisteme giriş yaptı`,
    { user: name, email }, undefined);
}

// ── Seed existing IDs (prevents alarm for historical data) ─────
async function seedExisting() {
  // Withdrawals
  try {
    const wds = await fetchWithdrawals('all');
    wds?.forEach((r: { id: string }) => seen.withdrawals.add(r.id));
  } catch {}

  // Users via RPC
  try {
    const { data } = await supabase.rpc('admin_get_real_users_with_wallets');
    (data || []).forEach((r: { user_id: string }) => seen.users.add(r.user_id));
  } catch {}

  // Tables directly
  const seed = async (table: string, key: keyof typeof seen, limit = 500) => {
    try {
      const { data } = await supabase.from(table).select('id').order('created_at', { ascending: false }).limit(limit);
      data?.forEach((r: { id: string }) => seen[key].add(r.id));
      console.log(`[monitor] seed ${table}: ${data?.length || 0}`);
    } catch {}
  };

  await Promise.allSettled([
    seed('support_tickets',       'tickets'),
    seed('support_messages',      'messages'),
    seed('wallet_transactions',   'walletTx'),
    seed('transactions',          'transactions'),
    seed('futures_history',       'futuresHistory'),
    seed('spot_orders',           'spotOrders'),
    seed('wallet_addresses',      'walletAddresses'),
  ]);

  console.log('[monitor] seed tamamlandı — izleme başladı');
}

// ── Realtime subscriptions (instant push via WebSocket) ────────
const channels: ReturnType<typeof supabase.channel>[] = [];

function subscribeRealtime() {
  const sub = (name: string, table: string, handler: (r: Record<string, unknown>) => void) => {
    const ch = supabase.channel(`rt_${name}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table },
        p => handler(p.new as Record<string, unknown>))
      .subscribe(status => {
        if (status === 'SUBSCRIBED') console.log(`[rt] ✅ ${table} bağlandı`);
        if (status === 'CHANNEL_ERROR') console.warn(`[rt] ❌ ${table} hata`);
      });
    channels.push(ch);
  };

  sub('futures_history',       'futures_history',        handleFuturesHistory);
  sub('futures_positions',     'futures_positions',       r => {
    // Açılan pozisyon alarmı
    const margin = Number(r.margin) || 0;
    const symbol = String(r.symbol || '');
    const side   = String(r.side || '').toUpperCase();
    const lev    = Number(r.leverage) || 1;
    const { settings } = useStore.getState();
    if (margin < settings.largeTradeThreshold) return;
    fireAlert('medium', 'finance', `📈 Pozisyon Açıldı: ${symbol}`,
      `${side} ${lev}x — Margin: $${margin.toFixed(0)}`, { margin, symbol }, startPositionAlarm);
  });
  sub('spot_orders',           'spot_orders',             handleSpotOrder);
  sub('transactions',          'transactions',            handleTransaction);
  sub('withdrawal_transactions', 'withdrawal_transactions', handleWithdrawal);
  sub('support_tickets',       'support_tickets',         handleSupportTicket);
  sub('support_messages',      'support_messages',        handleSupportMessage);
  sub('wallet_transactions',   'wallet_transactions',     handleWalletTransaction);
  sub('wallet_addresses',      'wallet_addresses',        handleWalletAddress);
  sub('user_profiles',         'user_profiles',           handleNewUser);

  // Login tracking via UPDATE on user_profiles
  const loginCh = supabase.channel('rt_user_logins')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' },
      p => handleUserLogin(p.new as Record<string, unknown>, p.old as Record<string, unknown>))
    .subscribe(status => {
      if (status === 'SUBSCRIBED') console.log('[rt] ✅ user_logins bağlandı');
    });
  channels.push(loginCh);

  console.log('[monitor] 11 Realtime kanal başlatıldı');
}

// ── Polling (fallback — runs every 10s via silent-loop timer) ──
async function poll() {
  // 1. Withdrawals (via RPC — bypasses RLS)
  try {
    const data = await fetchWithdrawals('all');
    for (const r of data || []) handleWithdrawal(r as Record<string, unknown>);
  } catch {}

  // 2. Futures history (kapanan pozisyonlar + likidasyonlar)
  try {
    const { data } = await supabase
      .from('futures_history').select('id,symbol,side,leverage,margin,realized_pnl,close_reason,created_at')
      .gte('created_at', monitorStartedAt).order('created_at', { ascending: false }).limit(20);
    for (const r of data || []) handleFuturesHistory(r as Record<string, unknown>);
  } catch {}

  // 3. Spot orders (büyük emirler)
  try {
    const { data } = await supabase
      .from('spot_orders').select('id,symbol,side,type,quantity,total,created_at')
      .gte('created_at', monitorStartedAt).order('created_at', { ascending: false }).limit(20);
    for (const r of data || []) handleSpotOrder(r as Record<string, unknown>);
  } catch {}

  // 4. Transactions (yatırım, alım, satım)
  try {
    const { data } = await supabase
      .from('transactions').select('id,type,amount,symbol,created_at')
      .gte('created_at', monitorStartedAt).order('created_at', { ascending: false }).limit(30);
    for (const r of data || []) handleTransaction(r as Record<string, unknown>);
  } catch {}

  // 5. Support tickets
  try {
    const { data } = await supabase
      .from('support_tickets').select('id,email,status,created_at')
      .gte('created_at', monitorStartedAt).order('created_at', { ascending: false }).limit(10);
    for (const r of data || []) handleSupportTicket(r as Record<string, unknown>);
  } catch {}

  // 6. Support messages (kullanıcı mesajları)
  try {
    const { data } = await supabase
      .from('support_messages').select('id,message,content,sender_type,created_at')
      .gte('created_at', monitorStartedAt).order('created_at', { ascending: false }).limit(20);
    for (const r of data || []) handleSupportMessage(r as Record<string, unknown>);
  } catch {}

  // 7. Wallet transactions (zincir transferleri)
  try {
    const { data } = await supabase
      .from('wallet_transactions').select('id,amount,token_symbol,network,created_at')
      .gte('created_at', monitorStartedAt).order('created_at', { ascending: false }).limit(10);
    for (const r of data || []) handleWalletTransaction(r as Record<string, unknown>);
  } catch {}

  // 8. Wallet addresses (cüzdan atama)
  try {
    const { data } = await supabase
      .from('wallet_addresses').select('id,network,coin,user_id,created_at')
      .gte('created_at', monitorStartedAt).order('created_at', { ascending: false }).limit(10);
    for (const r of data || []) handleWalletAddress(r as Record<string, unknown>);
  } catch {}

  // 9. New users (via RPC — RLS bypass)
  try {
    const { data } = await supabase.rpc('admin_get_real_users_with_wallets');
    for (const r of (data || []) as Array<{ user_id: string; email: string; full_name: string; created_at: string }>) {
      handleNewUser({ id: r.user_id, ...r });
    }
  } catch {}

  // 10. New users (direct user_profiles SELECT — double coverage)
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('id,email,full_name,created_at')
      .gte('created_at', new Date(new Date(monitorStartedAt).getTime() - 60_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    for (const r of (data || [])) {
      handleNewUser(r as Record<string, unknown>);
    }
  } catch {}
}

// ── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  const { setStats } = useStore.getState();
  try {
    const { data } = await supabase.rpc('admin_get_real_users_with_wallets');
    if (data) setStats({ totalUsers: (data as Array<unknown>).length });
  } catch {}
  try {
    const { count } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
    if (count !== null) setStats({ pendingSupport: count });
  } catch {}
}

// ── Entry point ───────────────────────────────────────────────
export function startMonitor() {
  if (initialized) return;
  initialized = true;
  monitorStartedAt = new Date().toISOString();
  console.log(`[monitor] başlatıldı: ${monitorStartedAt}`);

  ensureAdminAuth().then(async () => {
    await seedExisting();

    // Realtime subscriptions (anlık bildirim)
    subscribeRealtime();

    // Polling fallback (10s — timer çalışır çünkü silent audio loop aktif)
    await poll();
    setInterval(poll, 10_000);

    // Stats
    loadStats();
    setInterval(loadStats, 3 * 60 * 1000);

    // Bağlantı sağlık kontrolü
    setInterval(async () => {
      try {
        const t0 = Date.now();
        await supabase.from('support_tickets').select('id', { count: 'exact', head: true });
        const ms = Date.now() - t0;
        console.log(`[monitor] ping: ${ms}ms`);
        if (ms > 4000) fireAlert('medium', 'system', '⚡ Yüksek Gecikme', `${ms}ms`, { ms });
      } catch {
        fireAlert('critical', 'system', '🔴 Bağlantı Hatası', 'Supabase erişilemiyor!', {}, startCriticalAlarm);
      }
    }, 2 * 60 * 1000);
  });
}

export function stopMonitor() {
  channels.forEach(ch => supabase.removeChannel(ch));
  channels.length = 0;
  initialized = false;
}

import { supabase } from './supabase';
import { fetchWithdrawals } from './admin-api';
import { useStore, isMuted } from './store';
import {
  startNewUserAlarm, startWithdrawalAlarm, startDepositAlarm,
  startSupportAlarm, startSecurityAlarm, startCriticalAlarm, startPositionAlarm,
  sendBrowserNotification,
} from './audio';

let initialized = false;
let monitorStartedAt = new Date().toISOString();

const seenIds = {
  withdrawals: new Set<string>(),
  users:       new Set<string>(),
  tickets:     new Set<string>(),
  messages:    new Set<string>(),
  incoming:    new Set<string>(),
  deposits:    new Set<string>(),
  positions:   new Set<string>(),
};

// ── Fire alert + sound (persists 1 min) ──────────────────────
function fireAlert(
  severity: Parameters<ReturnType<typeof useStore.getState>['addAlert']>[0]['severity'],
  category: Parameters<ReturnType<typeof useStore.getState>['addAlert']>[0]['category'],
  title: string,
  body: string,
  meta?: Record<string, string | number | boolean>,
  alarmFn?: () => void
) {
  const { addAlert, settings } = useStore.getState();
  addAlert({ severity, category, title, body, meta });

  if (isMuted(settings)) return; // muteAll=true → tamamen sessiz

  if (settings.alertSounds && alarmFn) {
    try { alarmFn(); } catch {}
  }
  if (settings.browserNotifications) {
    sendBrowserNotification(`[Admin] ${title}`, body);
  }
}

// ── Seed existing IDs (no alarm for old data) ─────────────────
async function seedExisting() {
  // Withdrawals via RPC (bypasses RLS)
  try {
    const wds = await fetchWithdrawals('all');
    wds?.forEach((r: { id: string }) => seenIds.withdrawals.add(r.id));
    console.log(`[monitor] seeded ${wds?.length || 0} withdrawal_transactions via API`);
  } catch (e) { console.warn('[monitor] seed withdrawals failed:', e); }

  // Others via direct query
  const seedDirect = async (table: string, key: keyof typeof seenIds, filter?: Record<string, string>) => {
    try {
      let q = supabase.from(table).select('id').order('created_at', { ascending: false }).limit(500);
      if (filter) Object.entries(filter).forEach(([k, v]) => { q = (q as typeof q).eq(k, v); });
      const { data } = await q;
      data?.forEach((r: { id: string }) => seenIds[key].add(r.id));
      console.log(`[monitor] seeded ${data?.length || 0} ${table}`);
    } catch {}
  };

  // Seed users via RPC (RLS blocks direct user_profiles query for anon)
  try {
    const { data: users } = await supabase.rpc('admin_get_real_users_with_wallets');
    (users || []).forEach((r: { user_id: string }) => seenIds.users.add(r.user_id));
    console.log(`[monitor] seeded ${(users || []).length} user_profiles via RPC`);
  } catch (e) { console.warn('[monitor] seed users failed:', e); }

  await Promise.allSettled([
    seedDirect('support_tickets', 'tickets'),
    seedDirect('support_messages', 'messages'),
    seedDirect('wallet_transactions', 'incoming'),
    seedDirect('transactions', 'deposits'),
    seedDirect('futures_positions', 'positions'),
  ]);
  console.log('[monitor] seed complete');
}

// ── POLL 1: Withdrawals (RPC) ─────────────────────────────────
async function checkWithdrawals() {
  try {
    const data = await fetchWithdrawals('all');
    const { settings } = useStore.getState();
    for (const rec of data || []) {
      if (seenIds.withdrawals.has(rec.id)) continue;
      seenIds.withdrawals.add(rec.id);
      // Only alarm records created AFTER monitor started
      if (rec.created_at && new Date(rec.created_at) < new Date(monitorStartedAt)) continue;
      const amount = Number(rec.amount) || 0;
      const coin = rec.coin_symbol || 'USDT';
      const isCritical = amount > settings.largeTradeThreshold;
      console.log(`[monitor] 🚨 YENİ ÇEKİM: $${amount} ${coin}`);
      fireAlert(
        isCritical ? 'critical' : 'high', 'finance',
        '⚠️ YENİ Çekim Talebi', `$${amount.toFixed(2)} ${coin} — onay bekliyor`,
        { amount, userId: rec.user_id ?? '' },
        isCritical ? startCriticalAlarm : startWithdrawalAlarm
      );
    }
  } catch (e) { console.warn('[monitor] checkWithdrawals error:', e); }
}

// ── POLL 2: New users (via RPC — RLS blocks direct query) ────
async function checkNewUsers() {
  try {
    const { data } = await supabase.rpc('admin_get_real_users_with_wallets');
    for (const rec of (data || []) as Array<{ user_id: string; email: string; full_name: string; created_at: string }>) {
      if (seenIds.users.has(rec.user_id)) continue;
      if (rec.created_at < monitorStartedAt) { seenIds.users.add(rec.user_id); continue; } // old record — seed silently
      seenIds.users.add(rec.user_id);
      const name = rec.full_name || rec.email || 'Bilinmeyen';
      console.log(`[monitor] 🆕 YENİ KULLANICI: ${name}`);
      fireAlert('high', 'user', '🆕 Yeni Üye Kaydı', `${name} platforma katıldı`, { user: name }, startNewUserAlarm);
      useStore.getState().setStats({ totalUsers: useStore.getState().totalUsers + 1 });
    }
  } catch {}
}

// ── POLL 3: Support tickets ───────────────────────────────────
async function checkSupportTickets() {
  try {
    const { data } = await supabase
      .from('support_tickets')
      .select('id, email, status, created_at')
      .gte('created_at', monitorStartedAt)
      .order('created_at', { ascending: false })
      .limit(10);
    for (const rec of data || []) {
      if (seenIds.tickets.has(rec.id)) continue;
      seenIds.tickets.add(rec.id);
      const label = rec.email ? `${rec.email} destek açtı` : 'Yeni destek talebi';
      console.log(`[monitor] 💬 YENİ TİCKET: ${label}`);
      fireAlert('medium', 'support', '💬 Destek Talebi', label, { ticketId: rec.id }, startSupportAlarm);
    }
  } catch {}
}

// ── POLL 4: Support messages ──────────────────────────────────
async function checkSupportMessages() {
  try {
    const { data } = await supabase
      .from('support_messages')
      .select('id, message, content, sender_type, created_at')
      .gte('created_at', monitorStartedAt)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const rec of data || []) {
      if (seenIds.messages.has(rec.id)) continue;
      seenIds.messages.add(rec.id);
      if (rec.sender_type === 'admin') continue; // admin kendi mesajına alarm vermesin
      const content = rec.message || rec.content || 'Yeni mesaj';
      const preview = String(content).slice(0, 60);
      const dangerWords = ['dolandırıcı', 'para gitmedi', 'scam', 'fraud', 'hack', 'şikayet'];
      const isDanger = dangerWords.some(w => preview.toLowerCase().includes(w));
      console.log(`[monitor] 💬 YENİ MESAJ: ${preview.slice(0, 30)}`);
      fireAlert(
        isDanger ? 'critical' : 'medium', 'support',
        isDanger ? '🚨 ACİL Destek Mesajı' : '💬 Yeni Destek Mesajı',
        preview, {},
        isDanger ? startSecurityAlarm : startSupportAlarm
      );
    }
  } catch {}
}

// ── POLL 5: Incoming on-chain funds ──────────────────────────
async function checkIncoming() {
  try {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('id, amount, token_symbol, network, created_at')
      .gte('created_at', monitorStartedAt)
      .order('created_at', { ascending: false })
      .limit(10);
    const { settings } = useStore.getState();
    for (const rec of data || []) {
      if (seenIds.incoming.has(rec.id)) continue;
      seenIds.incoming.add(rec.id);
      const amount = Number(rec.amount) || 0;
      if (amount < settings.depositThreshold) continue;
      const coin = rec.token_symbol || 'USDT';
      console.log(`[monitor] 🔗 ZİNCİR TRANSFER: +${amount} ${coin}`);
      fireAlert('high', 'finance', '🔗 Zincirden Transfer Geldi', `+${amount.toFixed(4)} ${coin}`, { amount }, startDepositAlarm);
    }
  } catch {}
}

// ── POLL 6: Balance deposits (transactions table) ─────────────
async function checkDeposits() {
  try {
    const { data } = await supabase
      .from('transactions')
      .select('id, type, amount, symbol, user_id, created_at')
      .in('type', ['deposit', 'manual_deposit', 'admin_credit'])
      .gte('created_at', monitorStartedAt)
      .order('created_at', { ascending: false })
      .limit(10);
    const { settings } = useStore.getState();
    for (const rec of data || []) {
      if (seenIds.deposits.has(rec.id)) continue;
      seenIds.deposits.add(rec.id);
      const amount = Number(rec.amount) || 0;
      if (amount < settings.depositThreshold) continue;
      console.log(`[monitor] 💰 YENİ YATIRIM: $${amount} ${rec.symbol}`);
      fireAlert('high', 'finance', '💰 Para Yatırıldı', `+$${amount.toFixed(2)} ${rec.symbol || 'USDT'}`, { amount }, startDepositAlarm);
    }
  } catch {}
}

// ── POLL 7: Futures positions ─────────────────────────────────
async function checkPositions() {
  try {
    const { data } = await supabase
      .from('futures_positions')
      .select('id, symbol, side, direction, position_value, margin_usdt, size, created_at')
      .gte('created_at', monitorStartedAt)
      .order('created_at', { ascending: false })
      .limit(10);
    const { settings } = useStore.getState();
    for (const rec of data || []) {
      if (seenIds.positions.has(rec.id)) continue;
      seenIds.positions.add(rec.id);
      const size = Number(rec.position_value) || Number(rec.margin_usdt) || Number(rec.size) || 0;
      if (size < settings.largeTradeThreshold) continue;
      const symbol = rec.symbol || 'UNKNOWN';
      const side = rec.side || rec.direction || '';
      console.log(`[monitor] 📊 BÜYÜK POZİSYON: ${symbol} ${side} $${size}`);
      fireAlert('medium', 'finance', `📊 Büyük Pozisyon`, `${symbol} ${side.toUpperCase()} $${size.toFixed(0)}`, { size, symbol }, startPositionAlarm);
    }
  } catch {}
}

// ── Stats refresh ─────────────────────────────────────────────
async function loadStats() {
  const { setStats } = useStore.getState();
  // User count via RPC (RLS blocks direct user_profiles count for anon)
  try {
    const { data: users } = await supabase.rpc('admin_get_real_users_with_wallets');
    if (users) setStats({ totalUsers: (users as Array<unknown>).length });
  } catch {}
  try {
    const { count } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
    if (count !== null) setStats({ pendingSupport: count });
  } catch {}
}

// ── Main poll ─────────────────────────────────────────────────
async function pollAll() {
  await Promise.allSettled([
    checkWithdrawals(),
    checkNewUsers(),
    checkSupportTickets(),
    checkSupportMessages(),
    checkIncoming(),
    checkDeposits(),
    checkPositions(),
  ]);
}

// ── Entry point ───────────────────────────────────────────────
export function startMonitor() {
  if (initialized) return;
  initialized = true;
  monitorStartedAt = new Date().toISOString();
  console.log(`[monitor] started at ${monitorStartedAt}`);

  loadStats();

  // Seed then poll
  seedExisting().then(() => {
    pollAll();
    setInterval(pollAll, 15_000);
  });

  // Stats every 5 min
  setInterval(loadStats, 5 * 60 * 1000);

  // Health check every 2 min
  setInterval(async () => {
    try {
      const start = Date.now();
      await supabase.from('user_profiles').select('id', { count: 'exact', head: true });
      const latency = Date.now() - start;
      if (latency > 4000) {
        fireAlert('medium', 'system', '⚡ Yüksek Gecikme', `Supabase: ${latency}ms`, { latency });
      }
    } catch {
      fireAlert('critical', 'system', '🔴 Bağlantı Hatası', 'Supabase erişilemiyor', {}, startCriticalAlarm);
    }
  }, 2 * 60 * 1000);
}

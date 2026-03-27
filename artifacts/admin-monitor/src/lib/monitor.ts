import { supabase } from './supabase';
import { fetchWithdrawals } from './admin-api';
import { useStore, isMuted } from './store';
import { sounds, startNewUserAlarm, sendBrowserNotification } from './audio';

let initialized = false;
let monitorStartedAt = new Date().toISOString(); // alarm only for records AFTER this time

const seenIds = {
  withdrawals: new Set<string>(),
  users: new Set<string>(),
  tickets: new Set<string>(),
  messages: new Set<string>(),
  incoming: new Set<string>(),
  deposits: new Set<string>(),
};

function fireAlert(
  severity: Parameters<ReturnType<typeof useStore.getState>['addAlert']>[0]['severity'],
  category: Parameters<ReturnType<typeof useStore.getState>['addAlert']>[0]['category'],
  title: string,
  body: string,
  meta?: Record<string, string | number | boolean>,
  sound?: () => void
) {
  const { addAlert, settings } = useStore.getState();
  addAlert({ severity, category, title, body, meta });
  const muted = isMuted(settings);
  if (!muted && settings.alertSounds && sound) {
    try { sound(); } catch {}
  }
  if (!muted && settings.browserNotifications) {
    sendBrowserNotification(`[Admin] ${title}`, body);
  }
}

// ── Seed existing record IDs so we don't alarm on old data ────
async function seedExisting() {
  const seedDirect = async (table: string, key: keyof typeof seenIds, filter?: Record<string, string>) => {
    try {
      let q = supabase.from(table).select('id').order('created_at', { ascending: false }).limit(200);
      if (filter) Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data } = await q;
      data?.forEach((r: { id: string }) => seenIds[key].add(r.id));
      console.log(`[monitor] seeded ${data?.length || 0} ${table} records`);
    } catch (e) { console.warn(`[monitor] seed ${table} failed:`, e); }
  };

  // Withdrawals: use the API (RPC-backed) to bypass RLS
  try {
    const wds = await fetchWithdrawals('all');
    wds?.forEach((r: { id: string }) => seenIds.withdrawals.add(r.id));
    console.log(`[monitor] seeded ${wds?.length || 0} withdrawal_transactions via API`);
  } catch (e) { console.warn('[monitor] seed withdrawals via API failed:', e); }

  await Promise.allSettled([
    seedDirect('user_profiles', 'users'),
    seedDirect('support_tickets', 'tickets'),
    seedDirect('support_messages', 'messages', { sender_type: 'customer' }),
    seedDirect('wallet_transactions', 'incoming'),
    seedDirect('transactions', 'deposits'),
  ]);
  console.log('[monitor] seed complete — polling starts now');
}

// ── Poll: use RPC (same as Finance page) to bypass RLS ──────
async function checkWithdrawals() {
  try {
    const data = await fetchWithdrawals('all');
    console.log(`[monitor] withdrawal poll via RPC: ${data?.length ?? 0} total, started=${monitorStartedAt}`);
    if (!data) return;

    const { settings } = useStore.getState();
    for (const rec of data) {
      // Skip already seen
      if (seenIds.withdrawals.has(rec.id)) continue;
      seenIds.withdrawals.add(rec.id);

      // Only alarm for records created AFTER monitor started (new ones)
      const recTime = rec.created_at ? new Date(rec.created_at).getTime() : 0;
      const startTime = new Date(monitorStartedAt).getTime();
      if (recTime < startTime) {
        console.log(`[monitor] skip old withdrawal ${rec.id} created_at=${rec.created_at}`);
        continue;
      }

      const amount = Number(rec.amount) || 0;
      const coin = rec.coin_symbol || 'USDT';
      const sev = amount > settings.largeTradeThreshold ? 'critical' : 'high';
      console.log(`[monitor] 🚨 NEW WITHDRAWAL: $${amount} ${coin} id=${rec.id}`);
      fireAlert(sev, 'finance', '⚠️ YENİ Çekim Talebi', `$${amount.toFixed(2)} ${coin} — işlem bekliyor`, { amount, userId: rec.user_id ?? '' }, () => sounds.withdrawal());
    }
  } catch (e) { console.warn('[monitor] checkWithdrawals error:', e); }
}

async function checkNewUsers() {
  try {
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!data) return;
    for (const rec of data) {
      if (seenIds.users.has(rec.id)) continue;
      seenIds.users.add(rec.id);
      const name = rec.full_name || rec.email || rec.id?.slice(0, 8) || 'Bilinmeyen';
      fireAlert('high', 'user', '🆕 Yeni Üye Kaydı', `${name} platforma katıldı`, { user: name }, () => startNewUserAlarm());
      useStore.getState().setStats({ totalUsers: useStore.getState().totalUsers + 1 });
    }
  } catch {}
}

async function checkSupportTickets() {
  try {
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, title, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!data) return;
    for (const rec of data) {
      if (seenIds.tickets.has(rec.id)) continue;
      seenIds.tickets.add(rec.id);
      const subject = rec.subject || rec.title || 'Yeni destek talebi';
      fireAlert('medium', 'support', '💬 Destek Talebi', subject, { ticketId: rec.id }, () => sounds.support());
    }
  } catch {}
}

async function checkSupportMessages() {
  try {
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('support_messages')
      .select('id, message, content, sender_type, created_at')
      .eq('sender_type', 'customer')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!data) return;
    for (const rec of data) {
      if (seenIds.messages.has(rec.id)) continue;
      seenIds.messages.add(rec.id);
      const content = rec.message || rec.content || 'Yeni mesaj';
      const preview = typeof content === 'string' ? content.slice(0, 60) : 'Yeni mesaj';
      const dangerWords = ['dolandırıcı', 'para gitmedi', 'scam', 'fraud', 'hack', 'şikayet', 'kayıp'];
      const isDanger = dangerWords.some(w => preview.toLowerCase().includes(w));
      fireAlert(isDanger ? 'critical' : 'medium', 'support', isDanger ? '🚨 ACİL Mesaj' : '💬 Yeni Destek Mesajı', preview, {}, isDanger ? () => sounds.security() : () => sounds.support());
    }
  } catch {}
}

async function checkIncoming() {
  try {
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('wallet_transactions')
      .select('id, amount, token_symbol, network, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!data) return;
    const { settings } = useStore.getState();
    for (const rec of data) {
      if (seenIds.incoming.has(rec.id)) continue;
      seenIds.incoming.add(rec.id);
      const amount = Number(rec.amount) || 0;
      if (amount >= settings.depositThreshold) {
        fireAlert('high', 'finance', '🔗 Zincirden Transfer Geldi', `+${amount.toFixed(4)} ${rec.token_symbol || 'USDT'}`, { amount }, () => sounds.deposit());
      }
    }
  } catch {}
}

async function loadStats() {
  const { setStats } = useStore.getState();
  try {
    const { count } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
    if (count !== null) setStats({ totalUsers: count });
  } catch {}
  try {
    const { count } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
    if (count !== null) setStats({ pendingSupport: count });
  } catch {}
}

async function pollAll() {
  await Promise.allSettled([
    checkWithdrawals(),
    checkNewUsers(),
    checkSupportTickets(),
    checkSupportMessages(),
    checkIncoming(),
  ]);
}

export function startMonitor() {
  if (initialized) return;
  initialized = true;
  monitorStartedAt = new Date().toISOString();
  console.log(`[monitor] started at ${monitorStartedAt}`);

  loadStats();

  // Seed ilk, sonra poll başlat
  seedExisting().then(() => {
    // İlk poll hemen çalışır (seed bitti)
    pollAll();
    // Her 15 saniyede tekrar
    setInterval(pollAll, 15_000);
  });

  // İstatistik yenileme (5 dk)
  setInterval(loadStats, 5 * 60 * 1000);

  // Sistem sağlık (2 dk)
  setInterval(async () => {
    try {
      const start = Date.now();
      await supabase.from('user_profiles').select('id', { count: 'exact', head: true });
      const latency = Date.now() - start;
      if (latency > 4000) fireAlert('medium', 'system', '⚡ Yüksek Gecikme', `Supabase: ${latency}ms`, { latency });
    } catch {
      fireAlert('critical', 'system', '🔴 Bağlantı Hatası', 'Supabase erişilemiyor', {}, () => sounds.critical());
    }
  }, 2 * 60 * 1000);
}

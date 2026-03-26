import { supabase } from './supabase';
import { useStore, isMuted } from './store';
import { sounds, startNewUserAlarm, sendBrowserNotification } from './audio';

let initialized = false;

// ── Seen ID sets (prevent double-alerting) ────────────────────
const seenWithdrawalIds = new Set<string>();
const seenDepositIds = new Set<string>();
const seenUserIds = new Set<string>();
const seenTicketIds = new Set<string>();
const seenMessageIds = new Set<string>();
const seenIncomingIds = new Set<string>();

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
  if (!muted) {
    if (settings.alertSounds && sound) {
      try { sound(); } catch {}
    }
    if (settings.browserNotifications) {
      sendBrowserNotification(`[Admin] ${title}`, body);
    }
  }
}

// ── POLLING CHECKS ────────────────────────────────────────────

async function checkWithdrawals() {
  try {
    const { data } = await supabase
      .from('withdrawal_transactions')
      .select('id, amount, coin_symbol, status, user_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return;
    const { settings } = useStore.getState();

    for (const rec of data) {
      if (seenWithdrawalIds.has(rec.id)) continue;
      seenWithdrawalIds.add(rec.id);

      const amount = Number(rec.amount) || 0;
      const coin = rec.coin_symbol || 'USDT';
      const sev = amount > settings.largeTradeThreshold ? 'critical' : 'high';

      fireAlert(
        sev, 'finance',
        '⚠️ Çekim Talebi Geldi',
        `$${amount.toFixed(2)} ${coin} — onay bekliyor`,
        { amount, userId: rec.user_id ?? '' },
        () => sounds.withdrawal()
      );
    }
  } catch (e) {
    console.warn('[monitor] withdrawal check failed:', e);
  }
}

async function checkNewUsers() {
  try {
    const since = new Date(Date.now() - 60 * 1000).toISOString(); // son 60 sn
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data) return;
    for (const rec of data) {
      if (seenUserIds.has(rec.id)) continue;
      seenUserIds.add(rec.id);
      const name = rec.full_name || rec.email || rec.id?.slice(0, 8) || 'Bilinmeyen';
      fireAlert('high', 'user', '🆕 Yeni Üye Kaydı', `${name} platforma katıldı`, { user: name }, () => startNewUserAlarm());
      useStore.getState().setStats({ totalUsers: useStore.getState().totalUsers + 1 });
    }
  } catch {}
}

async function checkSupportTickets() {
  try {
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, title, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data) return;
    for (const rec of data) {
      if (seenTicketIds.has(rec.id)) continue;
      seenTicketIds.add(rec.id);
      const subject = rec.subject || rec.title || 'Yeni destek talebi';
      fireAlert('medium', 'support', '💬 Destek Talebi', subject, { ticketId: rec.id }, () => sounds.support());
    }
  } catch {}
}

async function checkSupportMessages() {
  try {
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { data } = await supabase
      .from('support_messages')
      .select('id, message, content, sender_type, created_at')
      .eq('sender_type', 'customer')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data) return;
    for (const rec of data) {
      if (seenMessageIds.has(rec.id)) continue;
      seenMessageIds.add(rec.id);
      const content = rec.message || rec.content || 'Yeni mesaj';
      const preview = typeof content === 'string' ? content.slice(0, 60) : 'Yeni mesaj';
      const dangerWords = ['dolandırıcı', 'para gitmedi', 'scam', 'fraud', 'hack', 'şikayet', 'kayıp'];
      const isDanger = dangerWords.some(w => preview.toLowerCase().includes(w));
      fireAlert(
        isDanger ? 'critical' : 'medium', 'support',
        isDanger ? '🚨 ACİL Destek Mesajı' : '💬 Yeni Destek Mesajı',
        preview, {},
        isDanger ? () => sounds.security() : () => sounds.support()
      );
    }
  } catch {}
}

async function checkIncomingFunds() {
  try {
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { data } = await supabase
      .from('wallet_transactions')
      .select('id, amount, token_symbol, network, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data) return;
    const { settings } = useStore.getState();
    for (const rec of data) {
      if (seenIncomingIds.has(rec.id)) continue;
      seenIncomingIds.add(rec.id);
      const amount = Number(rec.amount) || 0;
      if (amount >= settings.depositThreshold) {
        const coin = rec.token_symbol || 'USDT';
        fireAlert('high', 'finance', '🔗 Zincirden Transfer Geldi', `+${amount.toFixed(4)} ${coin} — işleme hazır`, { amount }, () => sounds.deposit());
      }
    }
  } catch {}
}

async function checkBalanceDeposits() {
  try {
    const { data } = await supabase
      .from('transactions')
      .select('id, type, amount, symbol, user_id, created_at')
      .in('type', ['deposit', 'manual_deposit', 'admin_credit'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data) return;
    const { settings } = useStore.getState();
    for (const rec of data) {
      if (seenDepositIds.has(rec.id)) continue;
      seenDepositIds.add(rec.id);
      const amount = Number(rec.amount) || 0;
      if (amount >= settings.depositThreshold) {
        fireAlert('high', 'finance', '💰 Para Yatırıldı', `+$${amount.toFixed(2)} ${rec.symbol || 'USDT'}`, { amount, userId: rec.user_id ?? '' }, () => sounds.deposit());
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

// ── Seed existing IDs on startup (avoid false positives) ──────
async function seedExistingIds() {
  try {
    const { data: wds } = await supabase
      .from('withdrawal_transactions')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);
    wds?.forEach(r => seenWithdrawalIds.add(r.id));
  } catch {}

  try {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(100);
    users?.forEach(r => seenUserIds.add(r.id));
  } catch {}

  try {
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(50);
    tickets?.forEach(r => seenTicketIds.add(r.id));
  } catch {}

  try {
    const { data: msgs } = await supabase
      .from('support_messages')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(100);
    msgs?.forEach(r => seenMessageIds.add(r.id));
  } catch {}

  try {
    const { data: txs } = await supabase
      .from('transactions')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(100);
    txs?.forEach(r => seenDepositIds.add(r.id));
  } catch {}

  try {
    const { data: incoming } = await supabase
      .from('wallet_transactions')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(50);
    incoming?.forEach(r => seenIncomingIds.add(r.id));
  } catch {}
}

// ── Main polling loop ─────────────────────────────────────────
async function pollAll() {
  await Promise.allSettled([
    checkWithdrawals(),
    checkNewUsers(),
    checkSupportTickets(),
    checkSupportMessages(),
    checkIncomingFunds(),
    checkBalanceDeposits(),
  ]);
}

export function startMonitor() {
  if (initialized) return;
  initialized = true;

  // Önce mevcut kayıtları yükle (başlangıçta yanlış alarm çalmasın)
  seedExistingIds().then(() => {
    loadStats();
    // İlk poll: 5 saniye sonra başlar (seed bitmesini bekle)
    setTimeout(() => {
      pollAll();
      // Sonra her 15 saniyede bir kontrol
      setInterval(pollAll, 15_000);
    }, 5000);
  });

  // İstatistikleri her 5 dakikada yenile
  setInterval(loadStats, 5 * 60 * 1000);

  // Sistem sağlık kontrolü (2 dakika)
  setInterval(async () => {
    try {
      const start = Date.now();
      await supabase.from('user_profiles').select('id', { count: 'exact', head: true });
      const latency = Date.now() - start;
      if (latency > 4000) {
        fireAlert('medium', 'system', '⚡ Yüksek Gecikme', `Supabase: ${latency}ms`, { latency });
      }
    } catch {
      fireAlert('critical', 'system', '🔴 Bağlantı Hatası', 'Supabase erişilemiyor', {}, () => sounds.critical());
    }
  }, 2 * 60 * 1000);
}

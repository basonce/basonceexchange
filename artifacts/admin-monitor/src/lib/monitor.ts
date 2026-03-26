import { supabase } from './supabase';
import { useStore, isMuted } from './store';
import { sounds, startNewUserAlarm, sendBrowserNotification } from './audio';

let initialized = false;

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

async function loadInitialStats() {
  const { setStats } = useStore.getState();

  try {
    const { count: userCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    if (userCount !== null) setStats({ totalUsers: userCount });
  } catch {}

  try {
    const { count: supportCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');
    if (supportCount !== null) setStats({ pendingSupport: supportCount });
  } catch {}

  try {
    const { count: withdrawalCount } = await supabase
      .from('withdrawal_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (withdrawalCount !== null) setStats({ pendingSupport: withdrawalCount });
  } catch {}
}

export function startMonitor() {
  if (initialized) return;
  initialized = true;

  loadInitialStats();

  // 1. Yeni üye kaydı — user_profiles tablosu
  supabase
    .channel('monitor-profiles')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_profiles' }, (payload) => {
      const { new: rec } = payload;
      const name = rec.full_name || rec.email || rec.id?.slice(0, 8) || 'Bilinmeyen';
      fireAlert('high', 'user', '🆕 Yeni Üye Kaydı', `${name} platforma katıldı`, { user: name }, () => startNewUserAlarm());
      useStore.getState().setStats({ totalUsers: useStore.getState().totalUsers + 1 });
    })
    .subscribe();

  // 2. ÇEKİM TALEBİ — withdrawal_transactions (doğru tablo)
  supabase
    .channel('monitor-withdrawals')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'withdrawal_transactions' }, (payload) => {
      const { new: rec } = payload;
      const amount = Number(rec.amount) || 0;
      const coin = rec.coin_symbol || rec.currency || 'USDT';
      const { settings } = useStore.getState();
      const sev = amount > settings.largeTradeThreshold ? 'critical' : 'high';
      fireAlert(
        sev, 'finance',
        '⚠️ Çekim Talebi Geldi',
        `$${amount.toFixed(2)} ${coin} — onay bekliyor`,
        { amount, userId: rec.user_id },
        () => sounds.withdrawal()
      );
    })
    .subscribe();

  // Çekim durumu güncellemesi (onay/red)
  supabase
    .channel('monitor-withdrawal-updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'withdrawal_transactions' }, (payload) => {
      const { new: rec, old: prev } = payload;
      if (rec.status === prev?.status) return; // durum değişmemişse yoksay
      if (rec.status === 'completed') {
        fireAlert('medium', 'finance', '✅ Çekim Tamamlandı', `$${Number(rec.amount).toFixed(2)} ${rec.coin_symbol || 'USDT'}`, {});
      } else if (rec.status === 'rejected') {
        fireAlert('medium', 'finance', '🚫 Çekim Reddedildi', `$${Number(rec.amount).toFixed(2)} ${rec.coin_symbol || 'USDT'}`, {});
      }
    })
    .subscribe();

  // 3. Bakiye değişimi (yatırım)
  supabase
    .channel('monitor-balances')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_balances' }, (payload) => {
      const { new: rec, old: prev } = payload;
      const diff = (Number(rec.balance) || 0) - (Number(prev?.balance) || 0);
      const { settings } = useStore.getState();
      if (diff > settings.depositThreshold) {
        fireAlert('high', 'finance', '💰 Para Yatırıldı', `+$${diff.toFixed(2)} ${rec.symbol || 'USDT'}`, { amount: diff, userId: rec.user_id }, () => sounds.deposit());
        useStore.getState().setStats({ todayDeposits: useStore.getState().todayDeposits + diff });
      } else if (diff < -settings.depositThreshold) {
        fireAlert('medium', 'finance', '💸 Bakiye Azaldı', `-$${Math.abs(diff).toFixed(2)} ${rec.symbol || 'USDT'}`, { amount: diff, userId: rec.user_id }, () => sounds.withdrawal());
        useStore.getState().setStats({ todayWithdrawals: useStore.getState().todayWithdrawals + Math.abs(diff) });
      }
    })
    .subscribe();

  // 4. Zincirden gelen fonlar
  supabase
    .channel('monitor-incoming')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, (payload) => {
      const { new: rec } = payload;
      const amount = Number(rec.amount) || 0;
      const coin = rec.token_symbol || 'USDT';
      const { settings } = useStore.getState();
      if (amount >= settings.depositThreshold) {
        fireAlert('high', 'finance', '🔗 Zincirden Transfer Geldi', `+${amount.toFixed(4)} ${coin} — işleme hazır`, { amount }, () => sounds.deposit());
      }
    })
    .subscribe();

  // 5. Destek ticketı
  supabase
    .channel('monitor-support')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
      const { new: rec } = payload;
      const subject = rec.subject || rec.title || rec.message?.slice(0, 40) || 'Yeni destek talebi';
      fireAlert('medium', 'support', '💬 Destek Talebi', subject, { ticketId: rec.id }, () => sounds.support());
      useStore.getState().setStats({ pendingSupport: useStore.getState().pendingSupport + 1 });
    })
    .subscribe();

  // 6. Destek mesajı (kullanıcıdan gelen)
  supabase
    .channel('monitor-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
      const { new: rec } = payload;
      if (rec.sender_type === 'admin') return; // admin mesajlarını görmezden gel
      const content = rec.message || rec.content || 'Yeni mesaj';
      const preview = typeof content === 'string' ? content.slice(0, 60) : 'Yeni mesaj';
      const dangerWords = ['dolandırıcı', 'para gitmedi', 'scam', 'fraud', 'hack', 'şikayet', 'kayıp', 'çalmak'];
      const isDanger = dangerWords.some(w => preview.toLowerCase().includes(w));
      fireAlert(
        isDanger ? 'critical' : 'medium', 'support',
        isDanger ? '🚨 ACİL Destek Mesajı' : '💬 Yeni Destek Mesajı',
        preview, {},
        isDanger ? () => sounds.security() : () => sounds.support()
      );
    })
    .subscribe();

  // 7. Büyük futures pozisyonu açıldı
  supabase
    .channel('monitor-trades')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'futures_positions' }, (payload) => {
      const { new: rec } = payload;
      const size = Number(rec.position_value) || Number(rec.margin_usdt) || Number(rec.size) || 0;
      const { settings } = useStore.getState();
      if (size > settings.largeTradeThreshold) {
        const symbol = rec.symbol || rec.coin || 'UNKNOWN';
        const side = rec.side || rec.direction || '';
        fireAlert('medium', 'finance', `📊 Büyük Pozisyon Açıldı`, `${symbol} ${side.toUpperCase()} $${size.toFixed(0)}`, { size, symbol }, () => sounds.success());
      }
    })
    .subscribe();

  // 8. Güvenlik olayları
  supabase
    .channel('monitor-security')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_logs' }, (payload) => {
      const { new: rec } = payload;
      const action = rec.action || rec.event || 'suspicious_activity';
      const severity = ['banned', 'blocked', 'brute_force', 'admin_access'].some(k => action.includes(k)) ? 'critical' : 'high';
      fireAlert(severity, 'security', '🛡️ Güvenlik Olayı', `${action}: ${rec.ip || ''}`, { ip: rec.ip, action }, () => sounds.security());
    })
    .subscribe();

  // 9. Periyodik istatistik yenileme (5 dakika)
  setInterval(loadInitialStats, 5 * 60 * 1000);

  // 10. Sistem sağlık kontrolü (2 dakika)
  setInterval(async () => {
    try {
      const start = Date.now();
      await supabase.from('user_profiles').select('id', { count: 'exact', head: true });
      const latency = Date.now() - start;
      if (latency > 3000) {
        fireAlert('medium', 'system', '⚡ Yüksek Gecikme', `Supabase yanıt süresi: ${latency}ms`, { latency });
      }
    } catch {
      fireAlert('critical', 'system', '🔴 Veritabanı Bağlantı Hatası', 'Supabase erişilemiyor', {}, () => sounds.critical());
    }
  }, 2 * 60 * 1000);
}

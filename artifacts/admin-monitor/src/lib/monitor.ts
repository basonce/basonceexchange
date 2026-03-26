import { supabase } from './supabase';
import { useStore, isMuted } from './store';
import { sounds, startNewUserAlarm, sendBrowserNotification } from './audio';

let initialized = false;

function fireAlert(
  severity: Parameters<typeof useStore.getState>['0'] extends never ? never : Parameters<ReturnType<typeof useStore.getState>['addAlert']>[0]['severity'],
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
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (userCount !== null) setStats({ totalUsers: userCount });
  } catch {}

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: balanceData } = await supabase
      .from('user_balances')
      .select('balance')
      .gte('created_at', today);
    if (balanceData) {
      const total = balanceData.reduce((s, r) => s + (Number(r.balance) || 0), 0);
      setStats({ todayDeposits: total });
    }
  } catch {}

  try {
    const { count: supportCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');
    if (supportCount !== null) setStats({ pendingSupport: supportCount });
  } catch {}
}

export function startMonitor() {
  if (initialized) return;
  initialized = true;

  loadInitialStats();

  // 1. New user registrations
  supabase
    .channel('monitor-profiles')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
      const { new: rec } = payload;
      const name = rec.username || rec.email || rec.id?.slice(0, 8) || 'Unknown';
      fireAlert('high', 'user', '🆕 Yeni Üye Kaydı', `${name} platforma katıldı`, { user: name }, () => startNewUserAlarm());
      useStore.getState().setStats({ totalUsers: useStore.getState().totalUsers + 1 });
    })
    .subscribe();

  // 2. Balance / deposit changes
  supabase
    .channel('monitor-balances')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_balances' }, (payload) => {
      const { new: rec, old: prev } = payload;
      const diff = (Number(rec.balance) || 0) - (Number(prev?.balance) || 0);
      const { settings } = useStore.getState();
      if (diff > settings.depositThreshold) {
        fireAlert('high', 'finance', '💰 Para Yatırıldı', `+$${diff.toFixed(2)} USDT`, { amount: diff, userId: rec.user_id }, () => sounds.deposit());
        useStore.getState().setStats({ todayDeposits: useStore.getState().todayDeposits + diff });
      } else if (diff < -settings.depositThreshold) {
        fireAlert('medium', 'finance', '💸 Para Çekildi', `$${Math.abs(diff).toFixed(2)} USDT`, { amount: diff, userId: rec.user_id }, () => sounds.withdrawal());
        useStore.getState().setStats({ todayWithdrawals: useStore.getState().todayWithdrawals + Math.abs(diff) });
      }
    })
    .subscribe();

  // 3. Support tickets
  supabase
    .channel('monitor-support')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
      const { new: rec } = payload;
      const subject = rec.subject || rec.title || rec.message?.slice(0, 40) || 'Yeni mesaj';
      fireAlert('medium', 'support', '💬 Destek Talebi', subject, { ticketId: rec.id }, () => sounds.support());
      useStore.getState().setStats({ pendingSupport: useStore.getState().pendingSupport + 1 });
    })
    .subscribe();

  supabase
    .channel('monitor-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const { new: rec } = payload;
      const content = rec.content || rec.message || rec.body || 'Yeni mesaj';
      const preview = typeof content === 'string' ? content.slice(0, 60) : 'Yeni mesaj';
      const dangerWords = ['dolandırıcı', 'para gitmedi', 'scam', 'fraud', 'hack', 'şikayet'];
      const isDanger = dangerWords.some(w => preview.toLowerCase().includes(w));
      fireAlert(isDanger ? 'critical' : 'medium', 'support', isDanger ? '🚨 ACİL Mesaj' : '💬 Yeni Mesaj', preview, {}, isDanger ? () => sounds.security() : () => sounds.support());
    })
    .subscribe();

  // 4. Withdrawal requests
  supabase
    .channel('monitor-withdrawals')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'withdrawal_requests' }, (payload) => {
      const { new: rec } = payload;
      const amount = Number(rec.amount) || 0;
      const { settings } = useStore.getState();
      const sev = amount > settings.largeTradeThreshold ? 'critical' : 'high';
      fireAlert(sev, 'finance', '⚠️ Çekim Talebi', `$${amount.toFixed(2)} ${rec.currency || 'USDT'} — ${rec.status || 'pending'}`, { amount, userId: rec.user_id }, () => sounds.withdrawal());
    })
    .subscribe();

  // 5. Security: failed logins / suspicious activity
  supabase
    .channel('monitor-security')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_logs' }, (payload) => {
      const { new: rec } = payload;
      const action = rec.action || rec.event || 'suspicious_activity';
      const severity = ['banned', 'blocked', 'brute_force', 'admin_access'].some(k => action.includes(k)) ? 'critical' : 'high';
      fireAlert(severity, 'security', '🛡️ Güvenlik Olayı', `${action}: ${rec.ip || ''}`, { ip: rec.ip, action }, () => sounds.security());
    })
    .subscribe();

  // 6. Large futures trades
  supabase
    .channel('monitor-trades')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'futures_positions' }, (payload) => {
      const { new: rec } = payload;
      const size = Number(rec.size) || Number(rec.margin_usdt) || 0;
      const { settings } = useStore.getState();
      if (size > settings.largeTradeThreshold) {
        const symbol = rec.symbol || rec.coin || 'UNKNOWN';
        fireAlert('medium', 'finance', `📊 Büyük Pozisyon`, `${symbol} ${rec.direction || ''} $${size.toFixed(0)}`, { size, symbol }, () => sounds.success());
      }
    })
    .subscribe();

  // 7. Realtime visitor count (approximated via presence)
  const presenceChannel = supabase.channel('admin-presence', {
    config: { presence: { key: 'admin' } },
  });
  presenceChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ admin: true, ts: Date.now() });
    }
  });

  // 8. Periodic stats refresh
  setInterval(loadInitialStats, 5 * 60 * 1000);

  // 9. System health check (ping Supabase every 2 min)
  setInterval(async () => {
    try {
      const start = Date.now();
      await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const latency = Date.now() - start;
      if (latency > 3000) {
        fireAlert('medium', 'system', '⚡ Yüksek Gecikme', `Supabase yanıt süresi: ${latency}ms`, { latency });
      }
    } catch {
      fireAlert('critical', 'system', '🔴 Veritabanı Bağlantı Hatası', 'Supabase erişilemiyor', {}, () => sounds.critical());
    }
  }, 2 * 60 * 1000);
}

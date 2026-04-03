import { createClient } from '@supabase/supabase-js';
import { sendPushToAll, type PushPayload } from './push-sender.js';
import { logger } from './logger.js';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

let supabase: ReturnType<typeof createClient> | null = null;
let started = false;
const seenIds = new Set<string>();

async function getSupabase() {
  if (supabase) return supabase;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (error) logger.warn({ error: error.message }, '[push-monitor] Admin auth failed');
    else logger.info('[push-monitor] Admin auth OK');
  }
  return supabase;
}

function push(payload: PushPayload) {
  sendPushToAll(payload).catch(() => {});
}

function newId(id: string): boolean {
  if (seenIds.has(id)) return false;
  seenIds.add(id);
  if (seenIds.size > 5000) {
    const first = seenIds.values().next().value;
    if (first) seenIds.delete(first);
  }
  return true;
}

async function seedExisting(sb: ReturnType<typeof createClient>) {
  const tables = ['support_tickets', 'support_messages', 'wallet_transactions', 'transactions'];
  for (const t of tables) {
    try {
      const { data } = await sb.from(t).select('id').order('created_at', { ascending: false }).limit(200);
      data?.forEach((r: any) => seenIds.add(String(r.id)));
    } catch {}
  }
  try {
    const { data } = await sb.rpc('admin_get_real_users_with_wallets');
    (data || []).forEach((r: any) => seenIds.add(String(r.user_id)));
  } catch {}
  logger.info(`[push-monitor] ${seenIds.size} mevcut kayıt seed edildi`);
}

async function poll(sb: ReturnType<typeof createClient>, since: string) {
  const THRESHOLD_DEPOSIT = 100;
  const THRESHOLD_TRADE = 1000;

  try {
    const { data: wds } = await sb.rpc('get_admin_withdrawals', { p_status: 'pending' });
    for (const r of wds || []) {
      if (!newId(String(r.id))) continue;
      const amt = Number(r.amount) || 0;
      push({ title: '⚠️ Çekim Talebi!', body: `$${amt.toFixed(2)} ${r.coin_symbol || 'USDT'} — onay bekliyor`, severity: 'critical', tag: 'withdrawal' });
    }
  } catch {}

  try {
    const { data } = await sb.from('transactions')
      .select('id,type,amount,symbol,created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(30);
    for (const r of data || []) {
      if (!newId(String(r.id))) continue;
      const amt = Number(r.amount) || 0;
      const sym = String(r.symbol || 'USDT');
      if (r.type === 'deposit' && amt >= THRESHOLD_DEPOSIT) {
        push({ title: '💰 Para Yatırıldı', body: `+$${amt.toFixed(2)} ${sym}`, severity: 'high', tag: 'deposit' });
      } else if (r.type === 'buy' && amt >= THRESHOLD_TRADE) {
        push({ title: `🟢 Alış: ${sym}`, body: `$${amt.toFixed(0)} alış`, severity: 'medium', tag: 'trade' });
      } else if (r.type === 'sell' && amt >= THRESHOLD_TRADE) {
        push({ title: `🔴 Satış: ${sym}`, body: `$${amt.toFixed(0)} satış`, severity: 'medium', tag: 'trade' });
      }
    }
  } catch {}

  try {
    const { data } = await sb.from('support_tickets')
      .select('id,email,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5);
    for (const r of data || []) {
      if (!newId(String(r.id))) continue;
      push({ title: '💬 Yeni Destek Talebi', body: `${r.email || 'Kullanıcı'} destek açtı`, severity: 'medium', tag: 'support' });
    }
  } catch {}

  try {
    const { data } = await sb.from('support_messages')
      .select('id,message,sender_type,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(10);
    for (const r of data || []) {
      if (!newId(String(r.id)) || r.sender_type === 'admin') continue;
      const text = String(r.message || '').slice(0, 80);
      const danger = ['dolandırıcı','para gitmedi','scam','fraud','hack','şikayet','çaldı'];
      const isUrgent = danger.some(w => text.toLowerCase().includes(w));
      push({ title: isUrgent ? '🚨 ACİL Destek!' : '💬 Yeni Mesaj', body: text, severity: isUrgent ? 'critical' : 'medium', tag: 'support-msg' });
    }
  } catch {}

  try {
    const { data } = await sb.from('wallet_transactions')
      .select('id,amount,token_symbol,network,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(10);
    for (const r of data || []) {
      if (!newId(String(r.id))) continue;
      const amt = Number(r.amount) || 0;
      if (amt >= THRESHOLD_DEPOSIT) {
        push({ title: '🔗 Zincirden Transfer', body: `+${amt.toFixed(4)} ${r.token_symbol || 'USDT'} (${r.network || ''})`, severity: 'high', tag: 'chain' });
      }
    }
  } catch {}

  try {
    const { data } = await sb.rpc('admin_get_real_users_with_wallets');
    for (const r of (data || []) as any[]) {
      if (!newId(String(r.user_id))) continue;
      const name = r.full_name || r.email || 'Yeni kullanıcı';
      push({ title: '🆕 Yeni Üye Kaydı', body: `${name} platforma katıldı`, severity: 'high', tag: 'user' });
    }
  } catch {}
}

export async function startPushMonitor() {
  if (started) return;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logger.warn('[push-monitor] Supabase config eksik, devre dışı');
    return;
  }
  started = true;

  const sb = await getSupabase();
  if (!sb) return;

  await seedExisting(sb);
  const since = new Date().toISOString();

  const sub = (name: string, table: string, handler: (r: any) => void) => {
    sb.channel(`srv_${name}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, p => handler(p.new))
      .subscribe(status => {
        if (status === 'SUBSCRIBED') logger.info(`[push-monitor] ✅ ${table}`);
      });
  };

  sub('transactions', 'transactions', (r) => {
    if (!newId(String(r.id))) return;
    const amt = Number(r.amount) || 0;
    if (r.type === 'deposit' && amt >= 100)
      push({ title: '💰 Para Yatırıldı', body: `+$${amt.toFixed(2)} ${r.symbol || 'USDT'}`, severity: 'high', tag: 'deposit' });
    else if (r.type === 'buy' && amt >= 1000)
      push({ title: `🟢 Alış: ${r.symbol}`, body: `$${amt.toFixed(0)}`, severity: 'medium', tag: 'trade' });
    else if (r.type === 'sell' && amt >= 1000)
      push({ title: `🔴 Satış: ${r.symbol}`, body: `$${amt.toFixed(0)}`, severity: 'medium', tag: 'trade' });
  });

  sub('withdrawal_transactions', 'withdrawal_transactions', (r) => {
    if (!newId(String(r.id))) return;
    push({ title: '⚠️ Çekim Talebi!', body: `$${Number(r.amount).toFixed(2)} ${r.coin_symbol || 'USDT'}`, severity: 'critical', tag: 'withdrawal' });
  });

  sub('support_tickets', 'support_tickets', (r) => {
    if (!newId(String(r.id))) return;
    push({ title: '💬 Destek Talebi', body: `${r.email || 'Kullanıcı'} destek açtı`, severity: 'medium', tag: 'support' });
  });

  sub('support_messages', 'support_messages', (r) => {
    if (!newId(String(r.id)) || r.sender_type === 'admin') return;
    const text = String(r.message || '').slice(0, 80);
    const danger = ['dolandırıcı','scam','fraud','hack','şikayet','çaldı'];
    const isUrgent = danger.some(w => text.toLowerCase().includes(w));
    push({ title: isUrgent ? '🚨 ACİL!' : '💬 Yeni Mesaj', body: text, severity: isUrgent ? 'critical' : 'medium', tag: 'msg' });
  });

  sub('wallet_transactions', 'wallet_transactions', (r) => {
    if (!newId(String(r.id))) return;
    const amt = Number(r.amount) || 0;
    if (amt >= 100) push({ title: '🔗 Zincirden Transfer', body: `+${amt.toFixed(4)} ${r.token_symbol || 'USDT'}`, severity: 'high', tag: 'chain' });
  });

  sub('user_profiles', 'user_profiles', (r) => {
    if (!newId(String(r.id || r.user_id))) return;
    push({ title: '🆕 Yeni Üye', body: `${r.full_name || r.email || 'Yeni kullanıcı'} platforma katıldı`, severity: 'high', tag: 'user' });
  });

  setInterval(() => poll(sb, since), 30_000);
  logger.info('[push-monitor] Sunucu taraflı monitör başlatıldı');
}

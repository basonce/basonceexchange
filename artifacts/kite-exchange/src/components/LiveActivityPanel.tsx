import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { X, RefreshCw, AlertTriangle, Copy, Check, Zap, Clock, Eye } from 'lucide-react';

interface AnonSession {
  id: string;
  visitor_id: string;
  session_id: string;
  current_page: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  last_active: string;
  created_at: string;
}

interface ActivityRow {
  id: number;
  user_id: string;
  action: string;
  page: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  email?: string;
  full_name?: string;
  // Dedicated columns (new schema)
  session_id?: string;
  ip_address?: string;
  country?: string;
  city?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  element_text?: string;
  element_type?: string;
  screen_width?: number;
  screen_height?: number;
}

interface UserSummary {
  user_id: string;
  email: string;
  full_name: string;
  latest: string;
  count: number;
  lastAction: string;
  lastLabel: string;
  flag: string;
  country: string;
  ip: string;
  device: string;
  priority: boolean;
}

function timeAgo(ts: string) {
  const d = Date.now() - new Date(ts).getTime();
  const s = Math.floor(d / 1000);
  if (s < 5) return 'şimdi';
  if (s < 60) return `${s}sn`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)}g`;
}

function getLabel(meta: Record<string, unknown>, action: string): string {
  return (meta?.label as string) || action;
}

function getFlag(row: ActivityRow): string {
  // Use dedicated country column (has flag emoji) or fall back to metadata
  const c = row.country || (row.metadata?.country as string) || '';
  const flagMatch = c.match(/(\p{Emoji})/u);
  return flagMatch?.[1] || (row.metadata?.flag as string) || '🌍';
}
function getCountry(row: ActivityRow): string {
  // new schema: country column has "🇹🇷 Turkey", city column separate
  if (row.country) {
    const countryClean = row.country.replace(/^\p{Emoji}\s*/u, '');
    if (row.city && row.city !== countryClean) return `${row.city}, ${countryClean}`;
    return countryClean;
  }
  // fall back to metadata
  const city = row.metadata?.city as string;
  const country = row.metadata?.country as string;
  if (city && country && city !== country) return `${city}, ${country}`;
  return country || 'Bilinmiyor';
}
function getIP(row: ActivityRow): string {
  return row.ip_address || (row.metadata?.ip as string) || '';
}
function getDevice(row: ActivityRow): string {
  if (row.device_type && row.browser && row.os) {
    const icons: Record<string, string> = { mobile: '📱', tablet: '📟', desktop: '🖥️' };
    return `${icons[row.device_type] || '🖥️'} ${row.device_type} / ${row.browser} / ${row.os}`;
  }
  return (row.metadata?.device as string) || '';
}

const ACTIVITY_SELECT = 'id,user_id,action,page,metadata,created_at,session_id,ip_address,country,city,device_type,browser,os,element_text,element_type,screen_width,screen_height';

const HIGH_PRIORITY_ACTIONS = new Set([
  'withdraw_submit', 'trade_buy', 'trade_sell', 'futures_open', 'futures_close', 'support_send'
]);
const HIGH_PRIORITY_KEYWORDS = ['çekim', 'withdraw', 'buy', 'sell', 'gönder', 'deposit', 'yatır', 'transfer', 'ödeme', 'vip', 'pozisyon', 'futures', 'sat', 'al '];

function isPriority(action: string, label: string): boolean {
  if (HIGH_PRIORITY_ACTIONS.has(action)) return true;
  const l = label.toLowerCase();
  return HIGH_PRIORITY_KEYWORDS.some(k => l.includes(k));
}

const SETUP_SQL = `-- Tüm tabloları oluşturmak için paponce_migration.sql dosyasını indir ve çalıştır.
-- Veya sadece activity_log için bu SQL'i çalıştır:

CREATE TABLE IF NOT EXISTS activity_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  page text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_user_created_idx
  ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_created_idx
  ON activity_log(created_at DESC);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_log_allow_all ON activity_log;
CREATE POLICY activity_log_allow_all ON activity_log
  FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;`;

const ANON_ONLINE_MS = 2 * 60 * 1000; // 2 minutes = actively online

export default function LiveActivityPanel({ onBadgeChange }: { onBadgeChange?: (n: number) => void }) {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [tableReady, setTableReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'stream' | 'users' | 'visitors'>('stream');
  const [selected, setSelected] = useState<{ user_id: string; email: string; full_name: string } | null>(null);
  const [userActivities, setUserActivities] = useState<ActivityRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paused, setPaused] = useState(false);
  const [anonSessions, setAnonSessions] = useState<AnonSession[]>([]);
  const seenIds = useRef(new Set<number>());
  const unseenCount = useRef(0);
  const userMap = useRef(new Map<string, { email: string; full_name: string }>());
  const userActivityChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const enrichRow = useCallback(async (row: ActivityRow): Promise<ActivityRow> => {
    if (!userMap.current.has(row.user_id)) {
      const { data } = await supabase
        .from('user_profiles')
        .select('id,email,full_name')
        .eq('id', row.user_id)
        .maybeSingle();
      if (data) userMap.current.set(row.user_id, { email: data.email, full_name: data.full_name });
    }
    const u = userMap.current.get(row.user_id);
    return { ...row, email: u?.email || row.email, full_name: u?.full_name || row.full_name };
  }, []);

  const enrichMany = useCallback(async (rows: ActivityRow[]): Promise<ActivityRow[]> => {
    const missing = [...new Set(rows.filter(r => !userMap.current.has(r.user_id)).map(r => r.user_id))];
    if (missing.length > 0) {
      const { data } = await supabase.from('user_profiles').select('id,email,full_name').in('id', missing);
      (data || []).forEach((u: any) => userMap.current.set(u.id, { email: u.email, full_name: u.full_name }));
    }
    return rows.map(r => {
      const u = userMap.current.get(r.user_id);
      return { ...r, email: u?.email || r.email, full_name: u?.full_name || r.full_name };
    });
  }, []);

  const loadAnonSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/anon-sessions', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setAnonSessions(data as AnonSession[]);
    } catch {
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.from('activity_log').select('id').limit(1);
    if (error) {
      console.warn('[LiveActivity] Table check error:', error.code, error.message);
      setTableReady(false);
      setLoading(false);
      return;
    }
    setTableReady(true);
    const [activityRes] = await Promise.all([
      supabase
        .from('activity_log')
        .select(ACTIVITY_SELECT)
        .order('created_at', { ascending: false })
        .limit(150),
      loadAnonSessions(),
    ]);
    if (activityRes.data) {
      activityRes.data.forEach((r: any) => seenIds.current.add(r.id));
      const enriched = await enrichMany(activityRes.data as ActivityRow[]);
      setActivities(enriched);
    }
    setLoading(false);
  }, [enrichMany, loadAnonSessions]);

  useEffect(() => { loadInitial(); }, []);

  // Anonymous sessions: poll every 15s via API server
  useEffect(() => {
    const interval = setInterval(loadAnonSessions, 15_000);
    return () => clearInterval(interval);
  }, [loadAnonSessions]);

  // Real-time subscription
  useEffect(() => {
    if (tableReady !== true) return;
    const ch = supabase
      .channel('live_activity_rt_v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, async (payload) => {
        const rec = payload.new as ActivityRow;
        if (!rec?.id || seenIds.current.has(rec.id)) return;
        seenIds.current.add(rec.id);
        const enriched = await enrichRow(rec);
        if (!paused) {
          setActivities(prev => [enriched, ...prev].slice(0, 300));
        }
        unseenCount.current += 1;
        onBadgeChange?.(unseenCount.current);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tableReady, paused, enrichRow, onBadgeChange]);

  // Seçili kullanıcının yeni aktivitelerini gerçek zamanlı dinle
  useEffect(() => {
    if (userActivityChannelRef.current) {
      supabase.removeChannel(userActivityChannelRef.current);
      userActivityChannelRef.current = null;
    }
    if (!selected?.user_id || tableReady !== true) return;

    userActivityChannelRef.current = supabase
      .channel(`user_activity_live_${selected.user_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_log',
        filter: `user_id=eq.${selected.user_id}`,
      }, (payload) => {
        const rec = payload.new as ActivityRow;
        if (!rec?.id) return;
        const u = userMap.current.get(rec.user_id);
        const enriched = u ? { ...rec, email: u.email, full_name: u.full_name } : rec;
        setUserActivities(prev => [enriched, ...prev]);
      })
      .subscribe();

    return () => {
      if (userActivityChannelRef.current) {
        supabase.removeChannel(userActivityChannelRef.current);
        userActivityChannelRef.current = null;
      }
    };
  }, [selected?.user_id, tableReady]);

  function clearBadge() { unseenCount.current = 0; onBadgeChange?.(0); }

  async function openUser(a: ActivityRow) {
    setSelected({ user_id: a.user_id, email: a.email || a.user_id.slice(0,8), full_name: a.full_name || '' });
    setDetailLoading(true);
    const { data } = await supabase
      .from('activity_log')
      .select(ACTIVITY_SELECT)
      .eq('user_id', a.user_id)
      .order('created_at', { ascending: false })
      .limit(300);
    setUserActivities(data as ActivityRow[] || []);
    setDetailLoading(false);
  }

  // Build user summaries for "users" view
  const userSummaries: UserSummary[] = Object.values(
    activities.reduce((acc, a) => {
      if (!acc[a.user_id]) {
        acc[a.user_id] = {
          user_id: a.user_id,
          email: a.email || a.user_id.slice(0, 10),
          full_name: a.full_name || '',
          latest: a.created_at,
          count: 0,
          lastAction: a.action,
          lastLabel: getLabel(a.metadata, a.action),
          flag: getFlag(a),
          country: getCountry(a),
          ip: getIP(a),
          device: getDevice(a),
          priority: false,
        };
      }
      acc[a.user_id].count++;
      const lbl = getLabel(a.metadata, a.action);
      if (isPriority(a.action, lbl)) acc[a.user_id].priority = true;
      if (a.created_at >= acc[a.user_id].latest) {
        acc[a.user_id].latest = a.created_at;
        acc[a.user_id].lastAction = a.action;
        acc[a.user_id].lastLabel = lbl;
      }
      return acc;
    }, {} as Record<string, UserSummary>)
  ).sort((a, b) => b.latest.localeCompare(a.latest));

  // ── Setup Screen ──────────────────────────────────────────────────────────
  if (tableReady === false) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-black text-gray-900 text-lg mb-1">Son 1 Adım Kaldı</p>
          <p className="text-sm text-gray-500 mb-4">
            Paponce SQL Editor'da aşağıdaki adımı uygula:
          </p>

          {/* Step 1: Download full migration */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
            <p className="text-xs font-bold text-blue-800 mb-2">Adım 1 — Tam Şemayı İndir (127 tablo)</p>
            <a
              href="/paponce_migration.sql"
              download="paponce_migration.sql"
              className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-bold rounded-xl text-sm transition-colors mb-2"
            >
              ⬇️ paponce_migration.sql İndir
            </a>
            <a
              href="https://supabase.com/dashboard/project/jfjjymprvjfltpvmfptj/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center font-medium rounded-xl text-sm transition-colors"
            >
              → Paponce SQL Editor Aç
            </a>
            <p className="text-[10px] text-blue-600 mt-2 text-center">İndir → SQL Editor'ı aç → dosyayı aç/yapıştır → Ctrl+Enter</p>
          </div>

          {/* Step 2: Just activity_log */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3">
            <p className="text-xs font-bold text-gray-700 mb-2">veya Sadece Canlı Takip İçin (Hızlı)</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SETUP_SQL);
                setCopied(true);
                setTimeout(() => {
                  window.open('https://supabase.com/dashboard/project/jfjjymprvjfltpvmfptj/sql/new', '_blank');
                }, 300);
                setTimeout(() => setCopied(false), 4000);
              }}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                copied ? 'bg-green-500 text-white' : 'bg-[#F0B90B] hover:bg-yellow-400 text-black'
              }`}
            >
              {copied ? <><Check className="w-4 h-4" /> Kopyalandı! Ctrl+V → Ctrl+Enter</> : <>⚡ Activity Log SQL Kopyala + Aç</>}
            </button>
          </div>

          <button onClick={loadInitial} className="w-full py-3 bg-[#1E2329] text-gray-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-4 h-4" /> Çalıştırdım, kontrol et
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Kurulunca şunları göreceksin</p>
          {[
            ['🌍', 'IP adresi + Ülke + Şehir + Bayrak'],
            ['📱', 'Cihaz tipi (Mobil/PC) + Browser + OS'],
            ['👆', 'Hangi butona bastığı — tam metin'],
            ['💸', 'Çekim/yatırım her hareketi'],
            ['⏱️', 'Her sayfada ne kadar durduğu'],
            ['✏️', 'Hangi form alanlarını doldurdu'],
            ['👀', 'Sekmeyi kapayıp ne zaman geri döndü'],
            ['📊', 'Anlık canlı akış + kullanıcı bazlı özet'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
              <span className="text-lg">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main Panel ────────────────────────────────────────────────────────────
  return (
    <div onClick={clearBadge}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-black text-gray-900 text-sm">CANLI İZLEME</span>
          <span className="text-xs text-gray-400">{activities.length} kayıt</span>
          {anonSessions.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold border border-blue-100">
              <Eye className="w-2.5 h-2.5" />{anonSessions.length} ziyaretçi
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPaused(p => !p)}
            className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-colors ${paused ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}
          >
            {paused ? '⏸ Durduruldu' : '▶ Canlı'}
          </button>
          <button onClick={loadInitial} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <button
          onClick={() => setViewMode('stream')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'stream' ? 'bg-[#1E2329] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          📡 Canlı Akış
        </button>
        <button
          onClick={() => setViewMode('users')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'users' ? 'bg-[#1E2329] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          👥 Kullanıcılar
        </button>
        <button
          onClick={() => { setViewMode('visitors'); loadAnonSessions(); }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors relative ${viewMode === 'visitors' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          👤 Ziyaretçi
          {anonSessions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {anonSessions.length > 9 ? '9+' : anonSessions.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'stream' ? (
        /* ── Stream View ── */
        <div className="divide-y divide-gray-50">
          {activities.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <p className="text-3xl mb-2">👁️</p>
              <p className="text-sm font-medium">Henüz aktivite yok</p>
              <p className="text-xs mt-1">Bir kullanıcı sayfaları açınca burada belirir</p>
            </div>
          ) : activities.map((a) => {
            const label = getLabel(a.metadata, a.action);
            const flag = getFlag(a);
            const country = getCountry(a);
            const ip = getIP(a);
            const device = getDevice(a);
            const email = a.email || a.user_id.slice(0, 10);
            const hi = isPriority(a.action, label);
            return (
              <div
                key={a.id}
                onClick={() => openUser(a)}
                className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 ${hi ? 'bg-red-50 border-l-4 border-red-400' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1E2329] flex items-center justify-center text-[10px] text-[#F0B90B] font-black">
                    {email.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-gray-700 truncate max-w-[110px]">{email}</span>
                      {hi && <span className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded font-bold">⚠️ ÖNEMLİ</span>}
                    </div>
                    <p className="text-xs text-gray-800 leading-tight truncate">{label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-gray-400">{flag} {country}</span>
                      {ip && ip !== 'N/A' && <span className="text-[10px] font-mono text-gray-300">{ip}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-[10px] text-gray-400">{timeAgo(a.created_at)}</span>
                    <span className="text-[9px] text-gray-300">{device.split('/')[0]?.trim()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'visitors' ? (
        /* ── Anonymous Visitors View ── */
        <div className="divide-y divide-gray-100">
          {/* Header for visitors view */}
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <span className="text-[10px] text-blue-600 font-bold">Son 30 dakikadaki ziyaretçiler</span>
            <button onClick={loadAnonSessions} className="text-[10px] text-blue-500 flex items-center gap-1 hover:text-blue-700">
              <RefreshCw className="w-2.5 h-2.5" /> Yenile
            </button>
          </div>
          {anonSessions.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <p className="text-3xl mb-2">👤</p>
              <p className="text-sm font-medium">Şu an ziyaretçi yok</p>
              <p className="text-xs mt-1">Kayıtsız kullanıcılar siteyi açınca burada görünür</p>
              <p className="text-[10px] mt-2 text-gray-300">Son 30 dakika içinde ziyaret yok</p>
            </div>
          ) : anonSessions.map((s) => {
            const isOnline = Date.now() - new Date(s.last_active).getTime() < 2 * 60 * 1000;
            const deviceIcon = s.device_type === 'mobile' ? '📱' : s.device_type === 'tablet' ? '📟' : '🖥️';
            return (
              <div key={s.id} className="px-4 py-3 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                      👤
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-blue-700">Ziyaretçi</span>
                      <span className="text-[10px] text-gray-400 font-mono">{s.visitor_id.slice(0, 8)}</span>
                      {isOnline && (
                        <span className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-bold">● Çevrimiçi</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {s.current_page ? `📄 ${s.current_page}` : 'Ana Sayfa'} &nbsp;·&nbsp; {deviceIcon} {s.browser || ''} {s.os ? `/ ${s.os}` : ''}
                    </p>
                    {(s.country || s.city) && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        🌍 {[s.city, s.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-gray-400">{timeAgo(s.last_active)}</p>
                    <p className="text-[9px] text-gray-300 mt-0.5">{new Date(s.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── User Summary View ── */
        <div className="divide-y divide-gray-100">
          {userSummaries.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <p className="text-sm">Henüz kullanıcı verisi yok</p>
            </div>
          ) : userSummaries.map((u) => (
            <div
              key={u.user_id}
              onClick={() => openUser({ user_id: u.user_id, email: u.email, full_name: u.full_name, id: 0, action: '', page: null, metadata: {}, created_at: u.latest })}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${u.priority ? 'bg-red-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1E2329] flex items-center justify-center text-sm text-[#F0B90B] font-black flex-shrink-0">
                  {u.email.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-gray-800 truncate max-w-[140px]">{u.email}</span>
                    {u.priority && <span className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded font-bold">⚠️</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.lastLabel}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-gray-400">{u.flag} {u.country}</span>
                    {u.ip && u.ip !== 'N/A' && <span className="text-[10px] font-mono text-gray-300">{u.ip}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs font-black text-[#F0B90B] bg-[#1E2329] px-1.5 py-0.5 rounded-full">{u.count}</span>
                  <span className="text-[10px] text-gray-400">{timeAgo(u.latest)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelected(null)}>
          <div className="fixed inset-0 bg-black/60" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-9 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="px-5 pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-gray-900">{selected.email}</h3>
                  <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    Canlı
                  </span>
                </div>
                {selected.full_name && <p className="text-xs text-gray-500">{selected.full_name}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pb-8">
              {detailLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Geo Info Card */}
                  {userActivities[0] && (
                    <div className="m-4 bg-[#1E2329] rounded-2xl p-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Konum</p>
                        <p className="text-sm font-bold text-white">{getFlag(userActivities[0])} {getCountry(userActivities[0])}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">IP Adresi</p>
                        <p className="text-sm font-mono text-[#F0B90B]">{getIP(userActivities[0]) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Cihaz</p>
                        <p className="text-xs text-gray-300">{getDevice(userActivities[0]) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Toplam</p>
                        <p className="text-lg font-black text-[#F0B90B]">{userActivities.length} hareket</p>
                      </div>
                    </div>
                  )}

                  <div className="px-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-[#F0B90B]" />
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Tüm Hareketler — En Yeni Önce</p>
                    </div>
                    <div className="space-y-1">
                      {userActivities.map((a, i) => {
                        const label = getLabel(a.metadata, a.action);
                        const hi = isPriority(a.action, label);
                        return (
                          <div
                            key={a.id}
                            className={`flex items-start gap-2 px-3 py-2 rounded-xl ${hi ? 'bg-red-50 border border-red-100' : i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                          >
                            <span className="text-sm flex-shrink-0 mt-0.5">{label.split(' ')[0]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-800 font-medium leading-tight">
                                {label.split(' ').slice(1).join(' ') || label}
                              </p>
                              {hi && <span className="text-[9px] text-red-600 font-bold">⚠️ ÖNEMLİ İŞLEM</span>}
                            </div>
                            <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />{timeAgo(a.created_at)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

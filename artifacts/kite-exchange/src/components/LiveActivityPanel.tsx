import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ACTION_LABELS } from '../lib/activity-tracker';
import { X, RefreshCw, AlertTriangle, Copy, Check } from 'lucide-react';

interface ActivityRow {
  id: number;
  user_id: string;
  action: string;
  page: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  email?: string;
  full_name?: string;
}

interface UserDetail {
  id: string;
  email: string;
  full_name: string;
  activities: ActivityRow[];
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'şimdi';
  if (s < 60) return `${s}sn önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

function getActionLabel(action: string, meta: Record<string, unknown>): string {
  return (meta?.label as string) || ACTION_LABELS[action] || action;
}

function getFlag(meta: Record<string, unknown>): string {
  return (meta?.flag as string) || '🌍';
}

function getCountry(meta: Record<string, unknown>): string {
  const city = meta?.city as string;
  const country = meta?.country as string;
  if (city && country && city !== country) return `${city}, ${country}`;
  return country || 'Bilinmiyor';
}

function getIP(meta: Record<string, unknown>): string {
  return (meta?.ip as string) || '';
}

function getDevice(meta: Record<string, unknown>): string {
  return (meta?.device as string) || '';
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    session_start:   'bg-green-100 text-green-700',
    session_end:     'bg-gray-100 text-gray-600',
    page_view:       'bg-blue-50 text-blue-600',
    deposit_open:    'bg-emerald-100 text-emerald-700',
    withdraw_open:   'bg-red-100 text-red-700',
    withdraw_submit: 'bg-red-200 text-red-800 font-bold',
    trade_buy:       'bg-green-200 text-green-800 font-bold',
    trade_sell:      'bg-red-200 text-red-800 font-bold',
    futures_open:    'bg-orange-100 text-orange-700',
    futures_close:   'bg-orange-200 text-orange-800',
    support_open:    'bg-purple-100 text-purple-700',
    support_send:    'bg-purple-200 text-purple-800 font-bold',
    vip_pay_open:    'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors[action] || 'bg-gray-100 text-gray-600'}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

const SETUP_SQL = `-- Supabase SQL Editor'da çalıştır:
CREATE TABLE IF NOT EXISTS activity_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  page text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_user_created_idx ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log(created_at DESC);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_log_allow_all ON activity_log FOR ALL USING (true) WITH CHECK (true);`;

export default function LiveActivityPanel({ onBadgeChange }: { onBadgeChange?: (n: number) => void }) {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [tableReady, setTableReady] = useState<boolean | null>(null); // null=checking
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userEmailMap, setUserEmailMap] = useState<Map<string, { email: string; full_name: string }>>(new Map());
  const seenIds = useRef(new Set<number>());
  const unseenCount = useRef(0);
  const channelRef = useRef<any>(null);

  // Fetch user emails for an array of user_ids
  const enrichWithUsers = useCallback(async (rows: ActivityRow[]): Promise<ActivityRow[]> => {
    const unknownIds = rows.filter(r => !userEmailMap.has(r.user_id)).map(r => r.user_id);
    if (unknownIds.length > 0) {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', [...new Set(unknownIds)]);
      if (data) {
        const newMap = new Map(userEmailMap);
        data.forEach((u: any) => newMap.set(u.id, { email: u.email, full_name: u.full_name }));
        setUserEmailMap(newMap);
        return rows.map(r => ({
          ...r,
          email: newMap.get(r.user_id)?.email || r.email,
          full_name: newMap.get(r.user_id)?.full_name || r.full_name,
        }));
      }
    }
    return rows.map(r => ({
      ...r,
      email: userEmailMap.get(r.user_id)?.email || r.email,
      full_name: userEmailMap.get(r.user_id)?.full_name || r.full_name,
    }));
  }, [userEmailMap]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    // Check if table exists
    const { error: checkErr } = await supabase
      .from('activity_log')
      .select('id')
      .limit(1);
    if (checkErr && checkErr.code === '42P01') {
      setTableReady(false);
      setLoading(false);
      return;
    }
    setTableReady(true);

    const { data } = await supabase
      .from('activity_log')
      .select('id,user_id,action,page,metadata,created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      data.forEach((r: ActivityRow) => seenIds.current.add(r.id));
      const enriched = await enrichWithUsers(data as ActivityRow[]);
      setActivities(enriched);
    }
    setLoading(false);
  }, [enrichWithUsers]);

  useEffect(() => {
    loadInitial();
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (tableReady !== true) return;

    const ch = supabase
      .channel('live_activity_panel_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, async (payload) => {
        const rec = payload.new as ActivityRow;
        if (!rec?.id || seenIds.current.has(rec.id)) return;
        seenIds.current.add(rec.id);
        // Enrich with user info
        const enriched = await enrichWithUsers([rec]);
        const row = enriched[0];
        setActivities(prev => [row, ...prev].slice(0, 200));
        unseenCount.current += 1;
        onBadgeChange?.(unseenCount.current);
      })
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [tableReady, enrichWithUsers, onBadgeChange]);

  function clearBadge() {
    unseenCount.current = 0;
    onBadgeChange?.(0);
  }

  async function openUserDetail(userId: string, email: string, fullName: string) {
    setDetailLoading(true);
    setSelected({ id: userId, email, full_name: fullName, activities: [] });
    const { data } = await supabase
      .from('activity_log')
      .select('id,user_id,action,page,metadata,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    setSelected({ id: userId, email, full_name: fullName, activities: (data || []) as ActivityRow[] });
    setDetailLoading(false);
  }

  // Group activities by user session for display
  const grouped = activities.reduce((acc, a) => {
    const key = a.user_id;
    if (!acc[key]) acc[key] = { user_id: a.user_id, email: a.email || '', full_name: a.full_name || '', latest: a.created_at, count: 0, activities: [] };
    acc[key].count++;
    acc[key].activities.push(a);
    if (a.created_at > acc[key].latest) acc[key].latest = a.created_at;
    return acc;
  }, {} as Record<string, { user_id: string; email: string; full_name: string; latest: string; count: number; activities: ActivityRow[] }>);

  if (tableReady === false) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="font-bold text-amber-800">Canlı İzleme Tablosu Kurulmamış</p>
          </div>
          <p className="text-sm text-amber-700 mb-4">
            Bu panel için bir kez Supabase SQL çalıştırmanız gerekiyor. Sonrasında her kullanıcının her hareketini IP + ülke bilgisiyle görebilirsiniz.
          </p>
          <div className="bg-gray-900 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">SQL Kopyala</span>
              <button
                onClick={() => { navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
              >
                {copied ? <><Check className="w-3 h-3" /> Kopyalandı</> : <><Copy className="w-3 h-3" /> Kopyala</>}
              </button>
            </div>
            <pre className="text-green-400 text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap">{SETUP_SQL}</pre>
          </div>
          <a
            href="https://supabase.com/dashboard/project/mgfviqdxeupajntpylig/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-amber-500 hover:bg-amber-600 text-white text-center font-bold rounded-xl text-sm transition-colors"
          >
            Supabase SQL Editor Aç →
          </a>
          <button onClick={loadInitial} className="mt-2 w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> SQL Çalıştırdım, Kontrol Et
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-800 mb-2">Kurulunca ne göreceksin?</p>
          <div className="space-y-1.5 text-xs text-blue-700">
            {['🌍 Her kullanıcının IP adresi ve ülkesi', '📱 Cihaz türü (Mobil/PC/Tablet)', '🔴 Çekim butonuna bastı', '💳 Yatırım penceresini açtı', '📈 Futures pozisyon açtı', '💬 Destek mesajı gönderdi', '🔑 Oturum başlattı/kapattı', '📄 Her sayfa geçişi anlık'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0" onClick={clearBadge}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white border-b border-gray-100 z-10">
        <div>
          <h2 className="font-bold text-gray-900">🔴 Canlı İzleme</h2>
          <p className="text-xs text-gray-500">Tüm kullanıcı hareketleri — gerçek zamanlı</p>
        </div>
        <button onClick={loadInitial} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">👁️</p>
          <p className="font-medium">Henüz aktivite yok</p>
          <p className="text-xs mt-1">Bir kullanıcı sayfaları açtığında burada görünür</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {activities.map((a) => {
            const label = getActionLabel(a.action, a.metadata);
            const flag = getFlag(a.metadata);
            const country = getCountry(a.metadata);
            const ip = getIP(a.metadata);
            const device = getDevice(a.metadata);
            const email = a.email || a.user_id.slice(0, 8) + '...';
            const isHighPriority = ['withdraw_submit', 'trade_buy', 'trade_sell', 'support_send', 'futures_open'].includes(a.action);
            return (
              <div
                key={a.id}
                onClick={() => openUserDetail(a.user_id, email, a.full_name || '')}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${isHighPriority ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1E2329] flex items-center justify-center text-xs text-[#F0B90B] font-bold mt-0.5">
                    {(a.email || email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-800 truncate max-w-[130px]">{email}</span>
                      {isHighPriority && <span className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded font-bold">ÖNEMLİ</span>}
                    </div>
                    <p className="text-sm text-gray-700 leading-tight mt-0.5 truncate">{label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-gray-400">{flag} {country}</span>
                      {ip && ip !== 'N/A' && <span className="text-[10px] text-gray-300 font-mono">{ip}</span>}
                      {device && <span className="text-[10px] text-gray-300">{device}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 mt-1">{timeAgo(a.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelected(null)}>
          <div className="fixed inset-0 bg-black/50" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-base">{selected.email}</h3>
                <p className="text-xs text-gray-500">{selected.full_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selected.activities.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Bu kullanıcıya ait kayıt yok</p>
              ) : (
                <>
                  {/* Geo info from latest activity */}
                  {selected.activities[0]?.metadata && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-4 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">Ülke</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {getFlag(selected.activities[0].metadata)} {getCountry(selected.activities[0].metadata)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">IP Adresi</p>
                        <p className="text-sm font-mono text-gray-800">{getIP(selected.activities[0].metadata) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">Cihaz</p>
                        <p className="text-xs text-gray-700">{getDevice(selected.activities[0].metadata) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">Toplam Hareket</p>
                        <p className="text-sm font-bold text-[#F0B90B]">{selected.activities.length}</p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Tüm Hareketler (en yeni önce)</p>
                  <div className="space-y-1">
                    {selected.activities.map((a, i) => {
                      const label = getActionLabel(a.action, a.metadata);
                      const isHighPriority = ['withdraw_submit', 'trade_buy', 'trade_sell', 'support_send', 'futures_open'].includes(a.action);
                      return (
                        <div key={a.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isHighPriority ? 'bg-red-50 border border-red-100' : i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <span className="text-base flex-shrink-0">{label.split(' ')[0]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 font-medium truncate">{label.split(' ').slice(1).join(' ') || label}</p>
                            {isHighPriority && <span className="text-[9px] text-red-600 font-bold">⚠ ÖNEMLİ İŞLEM</span>}
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(a.created_at)}</span>
                        </div>
                      );
                    })}
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

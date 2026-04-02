import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface VisitorEvent {
  id: string;
  type: 'register' | 'login';
  email: string;
  full_name: string;
  ts: string;
  user_id: string;
}

interface UserDetail {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_login_at?: string;
  is_active?: boolean;
  user_level?: number;
  total_trades?: number;
  txCount: number;
  depositTotal: number;
  futuresCount: number;
  spotCount: number;
  supportCount: number;
  recentTx: Array<{ type: string; symbol: string; amount: number; created_at: string }>;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa önce`;
  const d = Math.floor(h / 24);
  return `${d}g önce`;
}

function fmt(n: number) {
  if (!n) return '$0';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function getEventColor(type: 'register' | 'login') {
  return type === 'register' ? '#0ECB81' : '#F0B90B';
}

function getEventIcon(type: 'register' | 'login') {
  return type === 'register' ? '🆕' : '🔑';
}

export default function Visitors() {
  const [events, setEvents] = useState<VisitorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'register' | 'login'>('all');
  const [liveCount, setLiveCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();

    channelRef.current = supabase.channel('visitors_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_profiles' }, (p) => {
        const r = p.new as any;
        const ev: VisitorEvent = {
          id: `reg_${r.id}`,
          type: 'register',
          email: r.email || 'Bilinmeyen',
          full_name: r.full_name || r.email || 'Yeni Üye',
          ts: r.created_at || new Date().toISOString(),
          user_id: r.id,
        };
        setEvents(prev => [ev, ...prev.slice(0, 199)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, (p) => {
        const r = p.new as any;
        if (!r.last_login_at) return;
        const old = p.old as any;
        if (old.last_login_at === r.last_login_at) return;
        const ev: VisitorEvent = {
          id: `login_${r.id}_${Date.now()}`,
          type: 'login',
          email: r.email || 'Bilinmeyen',
          full_name: r.full_name || r.email || 'Üye',
          ts: r.last_login_at,
          user_id: r.id,
        };
        setEvents(prev => [ev, ...prev.slice(0, 199)]);
      })
      .subscribe();

    const liveInterval = setInterval(loadLiveCount, 30000);
    loadLiveCount();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      clearInterval(liveInterval);
    };
  }, []);

  async function loadLiveCount() {
    try {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_login_at', since);
      setLiveCount(count || 0);
    } catch {}
  }

  async function load() {
    setLoading(true);
    try {
      const [{ data: recent }, { data: logins }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, email, full_name, created_at, last_login_at')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('user_profiles')
          .select('id, email, full_name, last_login_at, created_at')
          .not('last_login_at', 'is', null)
          .order('last_login_at', { ascending: false })
          .limit(100),
      ]);

      const evMap = new Map<string, VisitorEvent>();

      for (const r of recent || []) {
        evMap.set(`reg_${r.id}`, {
          id: `reg_${r.id}`,
          type: 'register',
          email: r.email || '',
          full_name: r.full_name || r.email || 'Üye',
          ts: r.created_at,
          user_id: r.id,
        });
      }

      for (const r of logins || []) {
        if (!r.last_login_at) continue;
        evMap.set(`login_${r.id}`, {
          id: `login_${r.id}`,
          type: 'login',
          email: r.email || '',
          full_name: r.full_name || r.email || 'Üye',
          ts: r.last_login_at,
          user_id: r.id,
        });
      }

      const sorted = Array.from(evMap.values()).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setEvents(sorted);
    } catch {}
    setLoading(false);
  }

  async function loadDetail(ev: VisitorEvent) {
    setDetailLoading(true);
    try {
      const [{ data: prof }, { data: txs }, { data: fut }, { data: spot }, { data: sup }] = await Promise.all([
        supabase.from('user_profiles').select('id,email,full_name,created_at,last_login_at,is_active,is_real_user,user_level,total_trades,total_volume_usdt').eq('id', ev.user_id).maybeSingle(),
        supabase.from('transactions').select('type,symbol,amount,created_at').eq('user_id', ev.user_id).order('created_at', { ascending: false }).limit(10),
        supabase.from('futures_history').select('id').eq('user_id', ev.user_id),
        supabase.from('spot_orders').select('id').eq('user_id', ev.user_id),
        supabase.from('support_tickets').select('id').eq('user_id', ev.user_id),
      ]);

      const deposits = (txs || []).filter((t: any) => t.type === 'deposit' || t.type === 'manual_deposit' || t.type === 'admin_credit');
      const depositTotal = deposits.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

      setSelected({
        id: ev.user_id,
        email: prof?.email || ev.email,
        full_name: prof?.full_name || ev.full_name,
        created_at: prof?.created_at || ev.ts,
        last_login_at: prof?.last_login_at,
        is_active: prof?.is_active,
        user_level: prof?.user_level,
        total_trades: prof?.total_trades,
        txCount: (txs || []).length,
        depositTotal,
        futuresCount: (fut || []).length,
        spotCount: (spot || []).length,
        supportCount: (sup || []).length,
        recentTx: (txs || []).slice(0, 6) as any,
      });
    } catch {}
    setDetailLoading(false);
  }

  const filtered = events.filter(e => filter === 'all' || e.type === filter);
  const registerCount = events.filter(e => e.type === 'register').length;
  const loginCount = events.filter(e => e.type === 'login').length;

  return (
    <div className="flex flex-col pb-20" style={{ background: '#050505', minHeight: '100vh' }}>
      <div className="sticky top-0 z-10 px-4 pt-safe" style={{ background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="text-white font-black text-lg leading-none">👁️ Gelenler</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Ziyaretçi & Üye Akışı</p>
          </div>
          <div className="flex items-center gap-2">
            {liveCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(14,203,129,0.15)', border: '1px solid rgba(14,203,129,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                <span className="text-[11px] font-bold text-[#0ECB81]">{liveCount} aktif</span>
              </div>
            )}
            <button onClick={load} className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: 'rgba(255,255,255,0.07)' }}>
              🔄
            </button>
          </div>
        </div>

        <div className="flex gap-2 pb-3">
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[11px] text-gray-500">Yeni Üye</div>
            <div className="text-lg font-black text-[#0ECB81]">{registerCount}</div>
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[11px] text-gray-500">Giriş</div>
            <div className="text-lg font-black text-[#F0B90B]">{loginCount}</div>
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[11px] text-gray-500">5dk Aktif</div>
            <div className="text-lg font-black text-[#3D7FFF]">{liveCount}</div>
          </div>
        </div>

        <div className="flex gap-2 pb-3">
          {(['all', 'register', 'login'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: filter === f ? '#F0B90B' : 'rgba(255,255,255,0.05)',
                color: filter === f ? '#000' : 'rgba(255,255,255,0.4)',
              }}>
              {f === 'all' ? 'Tümü' : f === 'register' ? '🆕 Kayıt' : '🔑 Giriş'}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-4 pb-20">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>←</button>
                <div>
                  <h2 className="text-white font-black text-base">{selected.full_name}</h2>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.email}</p>
                </div>
                <div className="ml-auto">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: selected.is_active ? 'rgba(14,203,129,0.2)' : 'rgba(246,70,93,0.2)', color: selected.is_active ? '#0ECB81' : '#F6465D' }}>
                    {selected.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>

              {detailLoading ? (
                <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Kayıt Tarihi', value: new Date(selected.created_at).toLocaleDateString('tr-TR') },
                      { label: 'Son Giriş', value: selected.last_login_at ? timeAgo(selected.last_login_at) : 'Giriş Yok' },
                      { label: 'Seviye', value: selected.user_level ? `Seviye ${selected.user_level}` : 'Standart' },
                      { label: 'İşlem Sayısı', value: selected.txCount.toString() },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="text-[10px] text-gray-500 mb-0.5">{item.label}</div>
                        <div className="text-white text-[12px] font-bold truncate">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Toplam Yatırım', value: fmt(selected.depositTotal), color: '#0ECB81' },
                      { label: 'Futures', value: selected.futuresCount.toString(), color: '#F0B90B' },
                      { label: 'Spot', value: selected.spotCount.toString(), color: '#3D7FFF' },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${item.color}25` }}>
                        <div className="text-[10px] text-gray-500 mb-0.5">{item.label}</div>
                        <div className="font-black text-base" style={{ color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {selected.recentTx.length > 0 && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <span className="text-white text-[12px] font-bold">Son İşlemler</span>
                      </div>
                      {selected.recentTx.map((tx, i) => {
                        const typeColors: Record<string, string> = {
                          deposit: '#0ECB81', manual_deposit: '#0ECB81', admin_credit: '#3D7FFF',
                          buy: '#3D7FFF', sell: '#F6465D', withdrawal: '#F6465D',
                          futures_open: '#F0B90B', futures_close: '#8B5CF6',
                        };
                        const typeLabels: Record<string, string> = {
                          deposit: 'Yatırım', manual_deposit: 'Manuel Yatırım', admin_credit: 'Admin Kredi',
                          buy: 'Alış', sell: 'Satış', withdrawal: 'Çekim',
                          futures_open: 'Futures Aç', futures_close: 'Futures Kapat', admin_send: 'Transfer',
                        };
                        const col = typeColors[tx.type] || '#888';
                        return (
                          <div key={i} className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                            <div>
                              <span className="text-[11px] font-semibold" style={{ color: col }}>{typeLabels[tx.type] || tx.type}</span>
                              <span className="text-gray-500 text-[10px] ml-1.5">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</span>
                            </div>
                            <span className="font-bold text-[12px]" style={{ color: col }}>
                              {tx.type === 'sell' || tx.type === 'withdrawal' ? '-' : '+'}{Number(tx.amount).toFixed(2)} {tx.symbol}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selected.supportCount > 0 && (
                    <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(246,70,93,0.08)', border: '1px solid rgba(246,70,93,0.2)' }}>
                      <span className="text-[13px] font-semibold text-white">💬 Destek Talepleri</span>
                      <span className="text-[#F6465D] font-black">{selected.supportCount}</span>
                    </div>
                  )}

                  <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-2">Aktivite Özeti</p>
                    {[
                      { icon: '📊', text: `Toplam ${selected.txCount} işlem gerçekleştirdi`, show: selected.txCount > 0 },
                      { icon: '💰', text: `${fmt(selected.depositTotal)} toplam yatırım yaptı`, show: selected.depositTotal > 0 },
                      { icon: '📈', text: `${selected.futuresCount} futures pozisyonu kapandı`, show: selected.futuresCount > 0 },
                      { icon: '🔵', text: `${selected.spotCount} spot emir verdi`, show: selected.spotCount > 0 },
                      { icon: '💬', text: `${selected.supportCount} destek talebi oluşturdu`, show: selected.supportCount > 0 },
                      { icon: '📅', text: `Kayıt: ${new Date(selected.created_at).toLocaleDateString('tr-TR')}`, show: true },
                      { icon: '🕐', text: `Son giriş: ${selected.last_login_at ? timeAgo(selected.last_login_at) : 'Henüz giriş yok'}`, show: true },
                    ].filter(i => i.show).map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-white text-[12px] leading-relaxed">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-3">
        {loading ? (
          <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">👁️</p>
            <p className="text-gray-500">Henüz kayıt yok</p>
            <p className="text-gray-600 text-sm mt-1">Gerçek zamanlı olarak izleniyor</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ev) => (
              <button
                key={ev.id}
                onClick={() => loadDetail(ev).then(() => {})}
                className="w-full rounded-xl p-3 flex items-center gap-3 text-left transition-all active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-none"
                  style={{ background: `${getEventColor(ev.type)}18` }}
                >
                  {getEventIcon(ev.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-[13px] font-bold truncate">{ev.full_name}</span>
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-none"
                      style={{
                        background: `${getEventColor(ev.type)}20`,
                        color: getEventColor(ev.type),
                      }}
                    >
                      {ev.type === 'register' ? 'YENİ ÜYE' : 'GİRİŞ'}
                    </span>
                  </div>
                  <div className="text-gray-500 text-[11px] truncate">{ev.email}</div>
                  {ev.device && <div className="text-gray-600 text-[10px] truncate">{ev.device}</div>}
                </div>
                <div className="flex-none text-right">
                  <div className="text-[10px]" style={{ color: getEventColor(ev.type) }}>{timeAgo(ev.ts)}</div>
                  <div className="text-gray-600 text-[9px] mt-0.5">›</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

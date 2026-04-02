import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, UserCheck, UserPlus, Clock, ChevronRight, X, Activity } from 'lucide-react';

interface VisitorEvent {
  id: string;
  type: 'register' | 'login';
  email: string;
  full_name: string;
  ts: string;
  user_id: string;
}

interface ActivityEntry {
  id: number;
  action: string;
  page: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UserDetail {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_login_at?: string;
  is_active?: boolean;
  user_level?: number;
  txCount: number;
  depositTotal: number;
  futuresCount: number;
  spotCount: number;
  supportCount: number;
  recentTx: Array<{ type: string; symbol: string; amount: number; created_at: string }>;
  activityLog: ActivityEntry[];
  hasActivityLog: boolean;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtUsd(n: number) {
  if (!n) return '$0';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function VisitorsPanel() {
  const [events, setEvents] = useState<VisitorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'register' | 'login'>('all');
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();
    loadLiveCount();

    channelRef.current = supabase.channel('kx_visitors_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_profiles' }, (p) => {
        const r = p.new as any;
        setEvents(prev => [{
          id: `reg_${r.id}`,
          type: 'register',
          email: r.email || '',
          full_name: r.full_name || r.email || 'New Member',
          ts: r.created_at || new Date().toISOString(),
          user_id: r.id,
        }, ...prev.slice(0, 199)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, (p) => {
        const r = p.new as any;
        const old = p.old as any;
        if (!r.last_login_at || r.last_login_at === old.last_login_at) return;
        setEvents(prev => [{
          id: `login_${r.id}_${Date.now()}`,
          type: 'login',
          email: r.email || '',
          full_name: r.full_name || r.email || 'Member',
          ts: r.last_login_at,
          user_id: r.id,
        }, ...prev.slice(0, 199)]);
        setLiveCount(c => c + 1);
      })
      .subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  async function loadLiveCount() {
    try {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
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
        evMap.set(`reg_${r.id}`, { id: `reg_${r.id}`, type: 'register', email: r.email || '', full_name: r.full_name || r.email || 'Member', ts: r.created_at, user_id: r.id });
      }
      for (const r of logins || []) {
        if (!r.last_login_at) continue;
        evMap.set(`login_${r.id}`, { id: `login_${r.id}`, type: 'login', email: r.email || '', full_name: r.full_name || r.email || 'Member', ts: r.last_login_at, user_id: r.id });
      }
      const sorted = Array.from(evMap.values()).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setEvents(sorted);
    } catch {}
    setLoading(false);
  }

  async function loadDetail(ev: VisitorEvent) {
    setDetailLoading(true);
    try {
      const [{ data: prof }, { data: txs }, { data: fut }, { data: spot }, { data: sup }, activityResult] = await Promise.all([
        supabase.from('user_profiles').select('id,email,full_name,created_at,last_login_at,is_active,user_level,total_trades').eq('id', ev.user_id).maybeSingle(),
        supabase.from('transactions').select('type,symbol,amount,created_at').eq('user_id', ev.user_id).order('created_at', { ascending: false }).limit(8),
        supabase.from('futures_history').select('id').eq('user_id', ev.user_id),
        supabase.from('spot_orders').select('id').eq('user_id', ev.user_id),
        supabase.from('support_tickets').select('id').eq('user_id', ev.user_id),
        supabase.from('activity_log').select('id,action,page,metadata,created_at').eq('user_id', ev.user_id).order('created_at', { ascending: false }).limit(30),
      ]);
      const deposits = (txs || []).filter((t: any) => ['deposit', 'manual_deposit', 'admin_credit'].includes(t.type));
      const depositTotal = deposits.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
      const activityLog = (activityResult.data || []) as ActivityEntry[];
      const hasActivityLog = !activityResult.error;
      setSelected({
        id: ev.user_id,
        email: prof?.email || ev.email,
        full_name: prof?.full_name || ev.full_name,
        created_at: prof?.created_at || ev.ts,
        last_login_at: prof?.last_login_at,
        is_active: prof?.is_active,
        user_level: prof?.user_level,
        txCount: (txs || []).length,
        depositTotal,
        futuresCount: (fut || []).length,
        spotCount: (spot || []).length,
        supportCount: (sup || []).length,
        recentTx: (txs || []).slice(0, 6) as any,
        activityLog,
        hasActivityLog,
      });
    } catch {}
    setDetailLoading(false);
  }

  const filtered = events.filter(e => filter === 'all' || e.type === filter);
  const regCount = events.filter(e => e.type === 'register').length;
  const loginCount = events.filter(e => e.type === 'login').length;

  const TX_COLORS: Record<string, string> = { deposit: '#16a34a', manual_deposit: '#16a34a', admin_credit: '#2563eb', buy: '#2563eb', sell: '#dc2626', withdrawal: '#dc2626' };
  const TX_LABELS: Record<string, string> = { deposit: 'Deposit', manual_deposit: 'Manual Dep.', admin_credit: 'Admin Credit', buy: 'Buy', sell: 'Sell', withdrawal: 'Withdraw', admin_send: 'Transfer' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          👁️ Gelenler
          <span className="text-sm font-normal text-gray-500">— Visitor & Member Stream</span>
        </h2>
        <button onClick={() => { load(); loadLiveCount(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-500">New Members</span>
          </div>
          <p className="text-2xl font-black text-green-600">{regCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-gray-500">Logins</span>
          </div>
          <p className="text-2xl font-black text-yellow-600">{loginCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Active (10m)</span>
          </div>
          <p className="text-2xl font-black text-blue-600">{liveCount}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'register', 'login'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filter === f ? 'bg-[#F0B90B] text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : f === 'register' ? '🆕 Registrations' : '🔑 Logins'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No data yet — monitoring in real-time</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(ev => (
              <button key={ev.id} onClick={() => loadDetail(ev)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-none ${ev.type === 'register' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {ev.type === 'register' ? <UserPlus className="w-4 h-4 text-green-600" /> : <UserCheck className="w-4 h-4 text-yellow-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm truncate">{ev.full_name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-none ${ev.type === 'register' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {ev.type === 'register' ? 'NEW' : 'LOGIN'}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs truncate block">{ev.email}</span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="text-xs text-gray-400">{timeAgo(ev.ts)}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="font-bold text-gray-900">{selected.full_name}</h3>
                <p className="text-gray-500 text-xs">{selected.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${selected.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {selected.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-gray-400">Loading user data...</div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Registered', value: new Date(selected.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
                    { label: 'Last Login', value: selected.last_login_at ? timeAgo(selected.last_login_at) : 'Never' },
                    { label: 'Level', value: selected.user_level ? `Level ${selected.user_level}` : 'Standard' },
                    { label: 'DB Transactions', value: selected.txCount.toString() },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">{item.label}</p>
                      <p className="text-gray-900 text-sm font-bold mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Deposits', value: fmtUsd(selected.depositTotal), color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Futures', value: selected.futuresCount.toString(), color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    { label: 'Spot Orders', value: selected.spotCount.toString(), color: 'text-blue-600', bg: 'bg-blue-50' },
                  ].map((item, i) => (
                    <div key={i} className={`${item.bg} rounded-xl p-3 text-center`}>
                      <p className="text-gray-500 text-[10px] font-semibold">{item.label}</p>
                      <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {selected.recentTx.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Transactions</p>
                    <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-100">
                      {selected.recentTx.map((tx, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <span className="text-sm font-semibold" style={{ color: TX_COLORS[tx.type] || '#666' }}>{TX_LABELS[tx.type] || tx.type}</span>
                            <span className="text-gray-400 text-xs ml-2">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <span className="font-bold text-sm" style={{ color: TX_COLORS[tx.type] || '#666' }}>
                            {['sell', 'withdrawal'].includes(tx.type) ? '-' : '+'}{Number(tx.amount).toFixed(2)} {tx.symbol}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.supportCount > 0 && (
                  <div className="bg-red-50 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">💬 Support Tickets</span>
                    <span className="text-red-600 font-black text-lg">{selected.supportCount}</span>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Activity Summary</p>
                  <div className="space-y-2">
                    {[
                      { show: selected.txCount > 0, icon: '📊', text: `Made ${selected.txCount} total transactions` },
                      { show: selected.depositTotal > 0, icon: '💰', text: `Deposited ${fmtUsd(selected.depositTotal)} total` },
                      { show: selected.futuresCount > 0, icon: '📈', text: `Closed ${selected.futuresCount} futures positions` },
                      { show: selected.spotCount > 0, icon: '🔵', text: `Placed ${selected.spotCount} spot orders` },
                      { show: selected.supportCount > 0, icon: '💬', text: `Opened ${selected.supportCount} support tickets` },
                      { show: true, icon: '📅', text: `Joined ${new Date(selected.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` },
                      { show: true, icon: '🕐', text: `Last login: ${selected.last_login_at ? timeAgo(selected.last_login_at) : 'Never logged in'}` },
                    ].filter(i => i.show).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span>{item.icon}</span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Log */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Son Hareketler</p>
                    {!selected.hasActivityLog && (
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        Tablo henüz kurulmadı
                      </span>
                    )}
                  </div>
                  {selected.hasActivityLog && selected.activityLog.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm">
                      Henüz aktivite kaydı yok
                    </div>
                  ) : selected.hasActivityLog ? (
                    <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto">
                      {selected.activityLog.map((a) => (
                        <div key={a.id} className="flex items-start gap-2 px-3 py-2">
                          <span className="text-base flex-shrink-0 mt-0.5">
                            {a.action === 'page_view' ? (
                              (a.metadata as any)?.label?.split(' ')[0] || '📄'
                            ) : '⚡'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium truncate">
                              {a.action === 'page_view'
                                ? (a.metadata as any)?.label?.split(' ').slice(1).join(' ') || a.page || 'Sayfa'
                                : a.action}
                            </p>
                            <p className="text-[10px] text-gray-400">{timeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
                      <p className="font-semibold mb-1">Aktivite logu için SQL çalıştır:</p>
                      <code className="text-xs bg-amber-100 px-2 py-1 rounded block">activity_log_migration.sql</code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

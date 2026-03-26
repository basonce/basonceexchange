import { useEffect, useState } from 'react';
import { useSearch } from 'wouter';
import { RefreshCw, TrendingUp, TrendingDown, Wallet, Activity, BarChart3, X, Globe, Eye, Copy, Shield } from 'lucide-react';
import { fetchPositions, forceClosePosition, fetchWalletPool, fetchUserWallets, fetchIncomingFunds, fetchAdminLogs, fetchAnalyticsSummary, fetchOnlineUsers } from '../lib/admin-api';
import { supabase } from '../lib/supabase';

type ToolTab = 'positions' | 'wallets' | 'log' | 'analytics';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>{children}</p>;
}

// ── Positions ─────────────────────────────────────────────────
function PositionsPane() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState<string|null>(null);
  const [closeModal, setCloseModal] = useState<any|null>(null);
  const [reason, setReason] = useState('');
  const [filter, setFilter] = useState<'all'|'long'|'short'>('all');

  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); setPositions(await fetchPositions()); setLoading(false); }

  async function doClose() {
    if (!closeModal) return;
    setClosing(closeModal.id);
    await forceClosePosition(closeModal.id, reason || 'Admin kapattı');
    await load();
    setCloseModal(null); setReason(''); setClosing(null);
  }

  function fmt(n: number) {
    if (!n) return '$0';
    if (Math.abs(n) >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }

  const filtered = filter === 'all' ? positions : positions.filter(p => (p.side||p.direction||'').toLowerCase() === filter);
  const totalPnl = positions.reduce((s,p) => s + (Number(p.unrealized_pnl||p.pnl||0)), 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Açık', val: positions.length, color: '#F0B90B' },
          { label: 'Unrealized P&L', val: (totalPnl >= 0 ? '+' : '') + fmt(totalPnl), color: totalPnl >= 0 ? '#00DC82' : '#FF4757' },
          { label: 'Toplam Değer', val: fmt(positions.reduce((s,p)=>s+Number(p.position_value||p.margin||0),0)), color: '#3D7FFF' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-base font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Refresh */}
      <div className="flex items-center gap-2">
        {(['all','long','short'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: filter === f ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.04)', color: filter === f ? '#F0B90B' : 'rgba(255,255,255,0.4)' }}>
            {f === 'all' ? 'Tümü' : f === 'long' ? '📈 Long' : '📉 Short'}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {loading ? Array.from({length:4}).map((_,i)=><div key={i} className="skeleton rounded-2xl h-20" />) :
       filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(0,220,130,0.04)', border: '1px solid rgba(0,220,130,0.1)' }}>
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm" style={{ color: '#00DC82' }}>Açık pozisyon yok</p>
        </div>
      ) : filtered.map(p => {
        const pnl = Number(p.unrealized_pnl || p.pnl || 0);
        const isLong = (p.side || p.direction || '').toLowerCase() === 'long';
        return (
          <div key={p.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-black text-white">{p.symbol || p.market || '—'}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                    background: isLong ? 'rgba(0,220,130,0.15)' : 'rgba(255,71,87,0.15)',
                    color: isLong ? '#00DC82' : '#FF4757',
                  }}>{isLong ? 'LONG' : 'SHORT'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                    {p.leverage || 1}×
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {p.user_profiles?.email?.split('@')[0] || 'Kullanıcı'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: pnl >= 0 ? '#00DC82' : '#FF4757' }}>
                  {pnl >= 0 ? '+' : ''}{fmt(pnl)}
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{fmt(Number(p.position_value || p.margin || 0))}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              {[
                { label: 'Giriş', val: `$${Number(p.entry_price||0).toFixed(2)}` },
                { label: 'Anlık', val: `$${Number(p.mark_price||p.current_price||0).toFixed(2)}` },
                { label: 'Likid.', val: `$${Number(p.liquidation_price||0).toFixed(2)}` },
              ].map(i => (
                <div key={i.label} className="rounded-xl py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs font-medium text-white">{i.val}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{i.label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setCloseModal(p)} disabled={closing === p.id}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-opacity"
              style={{ background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.25)', color: '#FF4757', opacity: closing === p.id ? 0.6 : 1 }}>
              {closing === p.id ? 'Kapatılıyor…' : 'Zorla Kapat'}
            </button>
          </div>
        );
      })}

      {/* Close confirm modal */}
      {closeModal && (
        <div className="fixed inset-0 z-[150]" onClick={() => setCloseModal(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-3xl p-5 pb-8 slide-up"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,71,87,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <p className="text-lg font-bold text-white mb-1">Pozisyonu Kapat</p>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {closeModal.symbol} {closeModal.side?.toUpperCase()} — {closeModal.user_profiles?.email || 'Kullanıcı'}
            </p>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Kapatma nedeni (isteğe bağlı)" rows={2}
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none mb-4"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCloseModal(null)} className="py-3.5 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>İptal</button>
              <button onClick={doClose} className="py-3.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,71,87,0.2)', border: '1px solid rgba(255,71,87,0.4)', color: '#FF4757' }}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wallets ───────────────────────────────────────────────────
function WalletsPane() {
  const [subTab, setSubTab] = useState<'pool'|'assigned'>('pool');
  const [pool, setPool] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => { load(); }, [subTab]);
  async function load() {
    setLoading(true);
    if (subTab === 'pool') setPool(await fetchWalletPool());
    else setAssigned(await fetchUserWallets());
    setLoading(false);
  }

  function copy(s: string) { navigator.clipboard.writeText(s).catch(()=>{}); setToast('📋 Kopyalandı'); setTimeout(()=>setToast(''),2000); }

  const data = subTab === 'pool' ? pool : assigned;

  return (
    <div className="flex flex-col gap-3">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-medium text-white slide-down"
          style={{ background: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>{toast}</div>
      )}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {([['pool','Cüzdan Havuzu'],['assigned','Kullanıcı-Cüzdan']] as const).map(([k,l]) => (
          <button key={k} onClick={() => setSubTab(k)}
            className="py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: subTab === k ? 'rgba(255,255,255,0.1)' : 'transparent', color: subTab === k ? '#F0B90B' : 'rgba(255,255,255,0.4)' }}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{data.length} kayıt</p>
        <button onClick={load} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {loading ? Array.from({length:4}).map((_,i)=><div key={i} className="skeleton rounded-xl h-16" />) :
       data.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Kayıt bulunamadı</p>
        </div>
      ) : data.map((item: any) => (
        <div key={item.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {subTab === 'pool' ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-bold" style={{
                    background: item.is_assigned ? 'rgba(61,127,255,0.15)' : 'rgba(0,220,130,0.12)',
                    color: item.is_assigned ? '#3D7FFF' : '#00DC82',
                  }}>
                    {item.is_assigned ? 'Tahsisli' : 'Müsait'}
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.network}</span>
                </div>
                <Shield size={14} color={item.is_verified ? '#00DC82' : 'rgba(255,255,255,0.25)'} />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-white flex-1 truncate">{item.address}</p>
                <button onClick={() => copy(item.address)}><Copy size={12} color="#F0B90B" /></button>
              </div>
              {item.label && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">{item.user_profiles?.email?.split('@')[0] || 'Bilinmeyen'}</p>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  {item.network || 'TRC20'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.wallet_address || item.address}</p>
                <button onClick={() => copy(item.wallet_address || item.address || '')}><Copy size={12} color="rgba(255,255,255,0.3)" /></button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Activity Log ──────────────────────────────────────────────
function LogPane() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');
  const [selected, setSelected] = useState<any|null>(null);

  useEffect(() => { load(); }, [cat]);
  async function load() { setLoading(true); setLogs(await fetchAdminLogs(cat || undefined)); setLoading(false); }

  const cats = ['','finance','user','withdrawal','system'];
  const catLabels: Record<string,string> = { '':'Tümü', finance:'Finans', user:'Kullanıcı', withdrawal:'Çekim', system:'Sistem' };

  function catColor(c: string) {
    const m: Record<string,string> = { finance:'#00DC82', user:'#3D7FFF', withdrawal:'#F0B90B', system:'rgba(255,255,255,0.5)' };
    return m[c] || '#F0B90B';
  }

  function getStatusIcon(status: string) {
    if (status === 'success') return '✅';
    if (status === 'failed') return '❌';
    return '⏳';
  }

  function timeAgo(dt: string) {
    const d = Date.now() - new Date(dt).getTime();
    if (d < 3600000) return `${Math.floor(d/60000)} dk`;
    if (d < 86400000) return `${Math.floor(d/3600000)} sa`;
    return `${Math.floor(d/86400000)} gün`;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className="flex-none px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: cat === c ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.04)', color: cat === c ? '#F0B90B' : 'rgba(255,255,255,0.4)', border: `1px solid ${cat === c ? 'rgba(240,185,11,0.3)' : 'transparent'}` }}>
            {catLabels[c]}
          </button>
        ))}
        <button onClick={load} className="flex-none p-2 rounded-xl ml-auto" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {loading ? Array.from({length:6}).map((_,i)=><div key={i} className="skeleton rounded-xl h-12" />) :
       logs.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Log kaydı bulunamadı</p>
        </div>
      ) : logs.map((l: any) => (
        <button key={l.id} onClick={() => setSelected(l === selected ? null : l)}
          className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-base">{getStatusIcon(l.status)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{l.action_type?.replace(/_/g,' ') || l.action_description || '—'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {l.action_category && (
                <span className="text-[10px] font-bold" style={{ color: catColor(l.action_category) }}>
                  {l.action_category}
                </span>
              )}
              {l.target_email && <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{l.target_email}</span>}
            </div>
          </div>
          <p className="text-xs flex-none" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(l.created_at)}</p>
        </button>
      ))}

      {/* Log detail */}
      {selected && (
        <div className="fixed inset-0 z-[150]" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] rounded-t-3xl p-5 pb-8 slide-up max-h-[80vh] overflow-y-auto"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-bold text-white">Log Detayı</p>
              <button onClick={() => setSelected(null)}><X size={18} color="rgba(255,255,255,0.4)" /></button>
            </div>
            {Object.entries(selected).map(([k,v]) => v != null && v !== '' ? (
              <div key={k} className="mb-3">
                <p className="text-xs mb-1 font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>{k.toUpperCase()}</p>
                <p className="text-sm text-white break-all font-mono">
                  {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                </p>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────
function AnalyticsPane() {
  const [summary, setSummary] = useState<any>(null);
  const [online, setOnline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    const ch = supabase.channel('analytics_tools')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_online_users' }, () => fetchOnlineUsers().then(setOnline))
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  async function load() {
    setLoading(true);
    const [s, u] = await Promise.all([fetchAnalyticsSummary(), fetchOnlineUsers()]);
    setSummary(s); setOnline(u);
    setLoading(false);
  }

  function device(d: string) { return d === 'mobile' ? '📱' : d === 'tablet' ? '📟' : '💻'; }
  function page(p: string) { const m: Record<string,string> = {'/':'Ana Sayfa','/futures':'Futures','/markets':'Piyasalar','/wallet':'Cüzdan','/trade':'Trade'}; return m[p] || p || '/'; }

  if (loading && !summary) return Array.from({length:4}).map((_,i)=><div key={i} className="skeleton rounded-2xl h-20 mt-2" />);

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      {summary && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '🟢 Şu An Çevrimiçi', val: summary.online_now || online.length, color: '#00DC82' },
              { label: '📅 Bugün Oturum', val: summary.total_sessions_today || 0, color: '#3D7FFF' },
              { label: '👤 Anonim', val: summary.anonymous_visitors_today || 0, color: 'rgba(255,255,255,0.5)' },
              { label: '🔐 Kayıtlı', val: summary.registered_users_today || 0, color: '#F0B90B' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3.5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Top countries */}
          {summary.top_countries?.length > 0 && (
            <div>
              <Label>ÜLKEler</Label>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                {summary.top_countries.slice(0,5).map((c: any, i: number) => {
                  const maxCount = summary.top_countries[0]?.count || 1;
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: 'rgba(255,255,255,0.02)' }}>
                      <Globe size={14} color="#3D7FFF" />
                      <p className="text-sm text-white flex-1">{c.country_name || c.country_code || 'Bilinmiyor'}</p>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(c.count / maxCount) * 100}%`, background: '#3D7FFF' }} />
                        </div>
                        <span className="text-sm font-bold text-white w-6 text-right">{c.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top pages */}
          {summary.top_pages?.length > 0 && (
            <div>
              <Label>EN ÇOK ZİYARET EDİLEN</Label>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                {summary.top_pages.slice(0,5).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: 'rgba(255,255,255,0.02)' }}>
                    <Eye size={14} color="#F0B90B" />
                    <p className="text-sm text-white flex-1">{page(p.page_path)}</p>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{p.total_views}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.unique_visitors} tekil</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Online users */}
      {online.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>CANLI KULLANICILAR</Label>
            <button onClick={load} className="p-1.5 rounded-lg -mt-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} color="rgba(255,255,255,0.3)" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {online.map((u: any, i: number) => (
              <div key={i} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(61,127,255,0.04)', border: '1px solid rgba(61,127,255,0.1)' }}>
                <span className="text-base">{device(u.device_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.username || 'Ziyaretçi'}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {page(u.current_page)} · {u.country_code || '??'}
                  </p>
                </div>
                <div className="text-right flex-none">
                  <div className="flex items-center gap-1.5 justify-end mb-0.5">
                    <span className="relative flex-none" style={{ width: 7, height: 7 }}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: '#00DC82' }} />
                      <span className="relative inline-flex rounded-full" style={{ width: 7, height: 7, background: '#00DC82' }} />
                    </span>
                    <span className="text-[10px]" style={{ color: '#00DC82' }}>Çevrimiçi</span>
                  </div>
                  {u.duration_on_current_page > 0 && (
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{u.duration_on_current_page}s</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Tools Page ───────────────────────────────────────────
export default function Tools() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTab = (params.get('tab') as ToolTab) || 'positions';
  const [tab, setTab] = useState<ToolTab>(initialTab);

  const tabs: { id: ToolTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'positions', label: 'Pozisyon', icon: <TrendingUp size={15} />, color: '#F0B90B' },
    { id: 'wallets',   label: 'Cüzdan',   icon: <Wallet size={15} />,    color: '#3D7FFF' },
    { id: 'log',       label: 'Admin Log', icon: <Activity size={15} />,  color: '#00DC82' },
    { id: 'analytics', label: 'Analitik',  icon: <BarChart3 size={15} />, color: '#FF9800' },
  ];

  return (
    <div className="flex flex-col pb-28">
      <div className="p-4 pt-6 flex flex-col gap-4">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#F0B90B', letterSpacing: '0.08em' }}>GELİŞMİŞ ARAÇLAR</p>
          <h1 className="text-2xl font-black text-white">Araçlar</h1>
        </div>

        {/* Tab bar - horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? `${t.color}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${tab === t.id ? `${t.color}33` : 'rgba(255,255,255,0.07)'}`,
                color: tab === t.id ? t.color : 'rgba(255,255,255,0.4)',
              }}>
              <span style={{ color: tab === t.id ? t.color : 'rgba(255,255,255,0.3)' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Pane */}
        {tab === 'positions' && <PositionsPane />}
        {tab === 'wallets'   && <WalletsPane />}
        {tab === 'log'       && <LogPane />}
        {tab === 'analytics' && <AnalyticsPane />}
      </div>
    </div>
  );
}

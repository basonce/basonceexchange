import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { RefreshCw, Users, DollarSign, AlertTriangle, Activity, Zap, Snowflake, Eye, Globe, TrendingUp, Gamepad2 } from 'lucide-react';
import { fetchPlatformStats, fetchFinancialStatus, fetchRiskMetrics, fetchVIPUsers, fetchExchangeMode, setExchangeMode, fetchOnlineUsers, fetchAnalyticsSummary } from '../lib/admin-api';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

function fmt(n: number) {
  if (!n) return '$0';
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function LiveDot({ color = '#00DC82' }: { color?: string }) {
  return (
    <span className="relative flex-none" style={{ width: 9, height: 9 }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color }} />
      <span className="relative inline-flex rounded-full" style={{ width: 9, height: 9, background: color }} />
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>{children}</p>;
}

function StatGrid({ items }: { items: { label: string; val: string | number; sub?: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(s => (
        <div key={s.label} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
          <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
          {s.sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Exchange Mode Widget ──────────────────────────────────────
function ExchangeModeWidget() {
  const [mode, setMode] = useState<{ mode: 'live' | 'frozen'; frozen_at: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExchangeMode().then(d => setMode(d));
    const ch = supabase.channel('ex_mode_cmd')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exchange_mode_config' },
        p => setMode(p.new as any))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const isFrozen = mode?.mode === 'frozen';

  async function toggle() {
    setSaving(true);
    try { await setExchangeMode(isFrozen ? 'live' : 'frozen'); }
    catch {}
    setSaving(false);
  }

  if (!mode) return null;

  return (
    <div className="rounded-2xl p-4" style={{
      background: isFrozen ? 'rgba(59,130,246,0.08)' : 'rgba(0,220,130,0.06)',
      border: `1px solid ${isFrozen ? 'rgba(59,130,246,0.25)' : 'rgba(0,220,130,0.2)'}`,
    }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isFrozen ? 'rgba(59,130,246,0.2)' : 'rgba(0,220,130,0.15)' }}>
            {isFrozen
              ? <Snowflake size={18} color="#60a5fa" className="animate-spin" style={{ animationDuration: '4s' }} />
              : <Zap size={18} color="#00DC82" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">Borsa Modu</p>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{
                background: isFrozen ? 'rgba(59,130,246,0.2)' : 'rgba(0,220,130,0.15)',
                color: isFrozen ? '#93c5fd' : '#00DC82',
              }}>
                {isFrozen ? '❄ FROZEN' : '⚡ LIVE'}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {isFrozen && mode.frozen_at
                ? `${new Date(mode.frozen_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} itibaren donduruldu`
                : 'Canlı fiyatlar aktif'}
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{
            background: isFrozen ? 'rgba(0,220,130,0.15)' : 'rgba(59,130,246,0.15)',
            border: `1px solid ${isFrozen ? 'rgba(0,220,130,0.3)' : 'rgba(59,130,246,0.3)'}`,
            color: isFrozen ? '#00DC82' : '#60a5fa',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '…' : isFrozen ? 'Canlıya Al' : 'Dondur'}
        </button>
      </div>
    </div>
  );
}

// ── Live Visitors Widget ──────────────────────────────────────
function LiveVisitorsWidget() {
  const [online, setOnline] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    const ch = supabase.channel('analytics_cmd')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_online_users' }, load)
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  async function load() {
    const [u, s] = await Promise.all([fetchOnlineUsers(), fetchAnalyticsSummary()]);
    setOnline(u.slice(0, 6));
    setSummary(s);
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(61,127,255,0.06)', border: '1px solid rgba(61,127,255,0.15)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LiveDot color="#3D7FFF" />
          <p className="text-sm font-bold text-white">Canlı Ziyaretçiler</p>
        </div>
        <span className="text-2xl font-black" style={{ color: '#3D7FFF' }}>
          {summary?.online_now ?? online.length}
        </span>
      </div>
      {summary && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Bugün Oturum', val: summary.total_sessions_today || 0, color: '#F0B90B' },
            { label: 'Anonim', val: summary.anonymous_visitors_today || 0, color: 'rgba(255,255,255,0.5)' },
            { label: 'Üye', val: summary.registered_users_today || 0, color: '#00DC82' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-base font-bold" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {online.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {online.map((u: any, i: number) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <LiveDot color="#3D7FFF" />
              <span className="text-xs text-white font-medium flex-1 truncate">{u.username || 'Ziyaretçi'}</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{u.current_page || '/'}</span>
              {u.country_code && <span className="text-xs">{u.country_code}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Command() {
  const [, nav] = useLocation();
  const { alerts } = useStore();
  const [ps, setPs] = useState<Record<string, number> | null>(null);
  const [fin, setFin] = useState<Record<string, number> | null>(null);
  const [risk, setRisk] = useState<Record<string, number> | null>(null);
  const [vip, setVip] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const criticals = alerts.filter(a => a.severity === 'critical' && !a.dismissed);
  const unread = alerts.filter(a => !a.read && !a.dismissed);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f, r, v] = await Promise.all([
        fetchPlatformStats(), fetchFinancialStatus(), fetchRiskMetrics(), fetchVIPUsers(5),
      ]);
      setPs(p); setFin(f); setRisk(r); setVip(v);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const isRiskHigh = fin && (fin.risk_ratio || 0) > 1.2;
  const hasPending = ps && (ps.pending_withdrawals || 0) > 0;

  return (
    <div className="flex flex-col gap-4 p-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest mb-0.5" style={{ color: '#F0B90B', letterSpacing: '0.1em' }}>ADMIN KOMUTA</p>
          <h1 className="text-2xl font-black text-white tracking-tight">KITE Exchange</h1>
          <div className="flex items-center gap-2 mt-1">
            <LiveDot color="#00DC82" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {lastRefresh.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium active:scale-95 transition-transform"
          style={{ background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.2)', color: '#F0B90B' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Exchange Mode */}
      <ExchangeModeWidget />

      {/* Critical Alert */}
      {(criticals.length > 0 || isRiskHigh || hasPending) && (
        <button onClick={() => nav('/alerts')}
          className="rounded-2xl p-4 flex items-center gap-3 flash-alert w-full text-left active:scale-[0.98] transition-transform"
          style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.3)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: 'rgba(255,71,87,0.18)' }}>
            <AlertTriangle size={20} color="#FF4757" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: '#FF4757' }}>
              {criticals.length > 0 ? `${criticals.length} Kritik Alarm` : 'Dikkat Gerekiyor'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,71,87,0.7)' }}>
              {[isRiskHigh && 'Yüksek risk oranı', hasPending && `${ps?.pending_withdrawals} bekleyen çekim`]
                .filter(Boolean).join(' · ') || 'Hemen kontrol et'}
            </p>
          </div>
          <span style={{ color: 'rgba(255,71,87,0.5)', fontSize: 20 }}>›</span>
        </button>
      )}

      {/* Platform stats */}
      <div>
        <Label>PLATFORM İSTATİSTİKLERİ</Label>
        <StatGrid items={[
          { label: 'Toplam Üye', val: loading ? '…' : (ps?.total_users || 0).toLocaleString(), sub: `+${ps?.users_today || 0} bugün`, color: '#3D7FFF' },
          { label: 'Aktif 24s', val: loading ? '…' : (ps?.active_users_24h || 0).toLocaleString(), sub: 'kullanıcı', color: '#00DC82' },
          { label: 'Açık Pozisyon', val: loading ? '…' : (ps?.open_positions || 0).toLocaleString(), sub: fmt(ps?.total_position_value || 0), color: '#F0B90B' },
          { label: 'Bekleyen Çekim', val: loading ? '…' : (ps?.pending_withdrawals || 0), sub: fmt(ps?.pending_withdrawal_amount || 0), color: (ps?.pending_withdrawals || 0) > 0 ? '#FF4757' : '#ffffff' },
        ]} />
      </div>

      {/* Financial bar */}
      {fin && (
        <div>
          <Label>FİNANSAL DURUM</Label>
          <div className="rounded-2xl p-4" style={{
            background: fin.risk_ratio > 1.2 ? 'rgba(255,71,87,0.07)' : fin.risk_ratio > 0.9 ? 'rgba(240,185,11,0.06)' : 'rgba(0,220,130,0.06)',
            border: `1px solid ${fin.risk_ratio > 1.2 ? 'rgba(255,71,87,0.25)' : fin.risk_ratio > 0.9 ? 'rgba(240,185,11,0.2)' : 'rgba(0,220,130,0.2)'}`,
          }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Risk Oranı (Borç/Varlık)</span>
              <span className="text-sm font-bold" style={{ color: fin.risk_ratio > 1.2 ? '#FF4757' : fin.risk_ratio > 0.9 ? '#F0B90B' : '#00DC82' }}>
                {fin.risk_ratio?.toFixed(3)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-1.5 rounded-full" style={{
                width: `${Math.min((fin.risk_ratio || 0) * 80, 100)}%`,
                background: fin.risk_ratio > 1.2 ? '#FF4757' : fin.risk_ratio > 0.9 ? '#F0B90B' : '#00DC82',
              }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Deposits', val: fmt(fin.total_deposits || 0), color: '#00DC82' },
                { label: 'Withdrawals', val: fmt(fin.total_withdrawals || 0), color: '#FF4757' },
                { label: 'Net', val: fmt(fin.net_deposits || 0), color: (fin.net_deposits || 0) >= 0 ? '#00DC82' : '#FF4757' },
              ].map(i => (
                <div key={i.label}>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{i.label}</p>
                  <p className="text-sm font-bold" style={{ color: i.color }}>{i.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk metrics */}
      {risk && (
        <div>
          <Label>RİSK METRİKLERİ</Label>
          <StatGrid items={[
            { label: 'Toplam Margin', val: fmt(risk.total_margin_used || 0), color: '#F0B90B' },
            { label: 'Unrealized P&L', val: fmt(risk.total_unrealized_pnl || 0), color: (risk.total_unrealized_pnl || 0) >= 0 ? '#00DC82' : '#FF4757' },
            { label: 'Likidite Riski', val: risk.positions_near_liquidation || 0, sub: 'pozisyon', color: (risk.positions_near_liquidation || 0) > 0 ? '#FF4757' : '#ffffff' },
            { label: 'Ort. Kaldıraç', val: `${(risk.avg_leverage || 0).toFixed(1)}×`, color: '#3D7FFF' },
          ]} />
        </div>
      )}

      {/* Live visitors */}
      <div>
        <Label>CANLI ZİYARETÇİLER</Label>
        <LiveVisitorsWidget />
      </div>

      {/* Quick actions */}
      <div>
        <Label>HIZLI İŞLEMLER</Label>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: <Users size={18} />, label: 'Kullanıcı Yönet', path: '/users', color: '#3D7FFF', bg: 'rgba(61,127,255,0.1)' },
            { icon: <DollarSign size={18} />, label: 'Çekim Onayla', path: '/finance', color: '#00DC82', bg: 'rgba(0,220,130,0.1)' },
            { icon: <Activity size={18} />, label: 'Pozisyonlar', path: '/tools?tab=positions', color: '#F0B90B', bg: 'rgba(240,185,11,0.1)' },
            { icon: <TrendingUp size={18} />, label: 'Gelen Fonlar', path: '/finance?tab=incoming', color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
          ].map(item => (
            <button key={item.path} onClick={() => nav(item.path)}
              className="rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-transform text-left"
              style={{ background: item.bg, border: `1px solid ${item.color}33` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: `${item.color}22`, color: item.color }}>
                {item.icon}
              </div>
              <span className="text-sm font-semibold text-white leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Matches Control */}
      <div>
        <Label>MAÇLAR</Label>
        <button onClick={() => nav('/matches')}
          className="w-full rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
          style={{ background: 'linear-gradient(135deg,rgba(240,185,11,0.1),rgba(255,152,0,0.06))', border: '1px solid rgba(240,185,11,0.22)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-none"
            style={{ background: 'rgba(240,185,11,0.18)', color: '#F0B90B' }}>
            <Gamepad2 size={22} />
          </div>
          <div className="flex-1">
            <p className="text-base font-black text-white">Maç Kontrolü</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Sonuç, skor belirle · Maçı üste sabitle</p>
          </div>
          <span style={{ color: 'rgba(240,185,11,0.5)', fontSize: 22, fontWeight: 700 }}>›</span>
        </button>
      </div>

      {/* VIP users */}
      {vip.length > 0 && (
        <div>
          <Label>VIP KULLANICILAR</Label>
          <div className="flex flex-col gap-2">
            {vip.slice(0, 4).map((u: any, i: number) => (
              <div key={i} className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(240,185,11,0.05)', border: '1px solid rgba(240,185,11,0.12)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(240,185,11,0.2)', color: '#F0B90B' }}>{i + 1}</div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {u.email?.split('@')[0] || u.full_name || `VIP #${i+1}`}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.open_positions || 0} pozisyon</p>
                  </div>
                </div>
                <p className="text-sm font-bold" style={{ color: '#F0B90B' }}>
                  {fmt(Number(u.current_balance || u.total_deposited || u.balance || 0))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent alerts */}
      {unread.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>SON ALARMLAR</Label>
            <button onClick={() => nav('/alerts')} className="text-xs font-medium -mt-3" style={{ color: '#F0B90B' }}>
              {unread.length} okunmamış ›
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {unread.slice(0, 4).map(a => (
              <button key={a.id} onClick={() => nav('/alerts')}
                className="rounded-xl px-4 py-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform w-full"
                style={{ background: a.severity === 'critical' ? 'rgba(255,71,87,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${a.severity === 'critical' ? 'rgba(255,71,87,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                <span className="text-base">{a.category === 'finance' ? '💰' : a.category === 'support' ? '💬' : a.category === 'user' ? '👤' : '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.title}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.body}</p>
                </div>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {new Date(a.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

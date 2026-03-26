import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { RefreshCw, TrendingUp, Users, DollarSign, AlertTriangle, Wallet, Activity, Eye, Shield, Zap } from 'lucide-react';
import { fetchPlatformStats, fetchFinancialStatus, fetchRiskMetrics, fetchVIPUsers } from '../lib/admin-api';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import GlassCard from '../components/ui/GlassCard';

function fmt(n: number) {
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function Skeleton() {
  return <div className="skeleton rounded-xl h-8 w-24" />;
}

function LiveDot({ color = '#00DC82' }: { color?: string }) {
  return (
    <span className="relative flex items-center justify-center" style={{ width: 10, height: 10 }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: color }} />
      <span className="relative inline-flex rounded-full" style={{ width: 7, height: 7, background: color }} />
    </span>
  );
}

interface Stat { label: string; val: string | number; sub?: string; color: string; }

function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
          <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
          {s.sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export default function Command() {
  const [, nav] = useLocation();
  const { alerts } = useStore();
  const [ps, setPs] = useState<Record<string, number> | null>(null);
  const [fin, setFin] = useState<Record<string, number> | null>(null);
  const [risk, setRisk] = useState<Record<string, number> | null>(null);
  const [vip, setVip] = useState<Array<Record<string, string | number>>>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'ok' | 'slow' | 'down'>('ok');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const criticals = alerts.filter(a => a.severity === 'critical' && !a.dismissed);
  const unread = alerts.filter(a => !a.read && !a.dismissed);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const [p, f, r, v] = await Promise.all([
        fetchPlatformStats(),
        fetchFinancialStatus(),
        fetchRiskMetrics(),
        fetchVIPUsers(5),
      ]);
      const ms = Date.now() - t;
      setDbStatus(ms > 3000 ? 'slow' : 'ok');
      setPs(p); setFin(f); setRisk(r); setVip(v);
      setLastRefresh(new Date());
    } catch { setDbStatus('down'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const isRiskHigh = fin && (fin.risk_ratio || 0) > 1.2;
  const hasPending = ps && (ps.pending_withdrawals || 0) > 0;
  const hasLiqRisk = risk && (risk.positions_near_liquidation || 0) > 0;

  const dbColor = dbStatus === 'ok' ? '#00DC82' : dbStatus === 'slow' ? '#F0B90B' : '#FF4757';

  return (
    <div className="flex flex-col gap-4 p-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest mb-1" style={{ color: '#F0B90B' }}>ADMIN KOMUTA</p>
          <h1 className="text-2xl font-black text-white tracking-tight">KITE Exchange</h1>
          <div className="flex items-center gap-2 mt-1">
            <LiveDot color={dbColor} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {dbStatus === 'ok' ? 'Sistem normal' : dbStatus === 'slow' ? 'Yüksek gecikme' : 'Bağlantı hatası'}
              {' · '}
              {lastRefresh.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={{ background: 'rgba(240,185,11,0.12)', border: '1px solid rgba(240,185,11,0.2)', color: '#F0B90B' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Critical Alert Banner */}
      {(criticals.length > 0 || isRiskHigh || hasPending || hasLiqRisk) && (
        <button
          onClick={() => nav('/alerts')}
          className="rounded-2xl p-4 flex items-center gap-3 flash-alert w-full text-left active:scale-[0.98] transition-transform"
          style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: 'rgba(255,71,87,0.2)' }}>
            <AlertTriangle size={20} color="#FF4757" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: '#FF4757' }}>
              {criticals.length > 0 ? `${criticals.length} Kritik Alarm` : 'Dikkat Gerekiyor'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,71,87,0.7)' }}>
              {[
                isRiskHigh && 'Yüksek risk oranı',
                hasPending && `${ps?.pending_withdrawals} bekleyen çekim`,
                hasLiqRisk && `${risk?.positions_near_liquidation} likidite riski`,
              ].filter(Boolean).join(' · ') || 'Hemen kontrol et'}
            </p>
          </div>
          <span style={{ color: 'rgba(255,71,87,0.6)', fontSize: 20 }}>›</span>
        </button>
      )}

      {/* Platform stats */}
      <div>
        <SectionTitle>Platform İstatistikleri</SectionTitle>
        <StatRow stats={[
          { label: 'Toplam Üye', val: loading ? '…' : (ps?.total_users || 0).toLocaleString(), sub: `+${ps?.users_today || 0} bugün`, color: '#3D7FFF' },
          { label: 'Aktif 24s', val: loading ? '…' : (ps?.active_users_24h || 0).toLocaleString(), sub: 'kullanıcı', color: '#00DC82' },
          { label: 'Açık Pozisyon', val: loading ? '…' : (ps?.open_positions || 0).toLocaleString(), sub: fmt(ps?.total_position_value || 0), color: '#F0B90B' },
          { label: 'Bekleyen Çekim', val: loading ? '…' : (ps?.pending_withdrawals || 0), sub: fmt(ps?.pending_withdrawal_amount || 0), color: (ps?.pending_withdrawals || 0) > 0 ? '#FF4757' : '#ffffff' },
        ]} />
      </div>

      {/* Financial status */}
      {fin && (
        <div>
          <SectionTitle>Finansal Durum</SectionTitle>
          <GlassCard variant={fin.risk_ratio > 1.2 ? 'red' : fin.risk_ratio > 0.9 ? 'gold' : 'green'} padding="">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Borç / Varlık Oranı</span>
                <span className="text-sm font-bold" style={{ color: fin.risk_ratio > 1.2 ? '#FF4757' : fin.risk_ratio > 0.9 ? '#F0B90B' : '#00DC82' }}>
                  {fin.risk_ratio?.toFixed(3)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((fin.risk_ratio || 0) * 100, 100)}%`,
                    background: fin.risk_ratio > 1.2 ? 'linear-gradient(90deg,#FF4757,#FF1744)' : fin.risk_ratio > 0.9 ? 'linear-gradient(90deg,#F0B90B,#FF9800)' : 'linear-gradient(90deg,#00DC82,#00BFA5)',
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Deposits</p>
                  <p className="text-sm font-bold" style={{ color: '#00DC82' }}>{fmt(fin.total_deposits || 0)}</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Withdrawals</p>
                  <p className="text-sm font-bold" style={{ color: '#FF4757' }}>{fmt(fin.total_withdrawals || 0)}</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Net</p>
                  <p className="text-sm font-bold" style={{ color: (fin.net_deposits || 0) >= 0 ? '#00DC82' : '#FF4757' }}>{fmt(fin.net_deposits || 0)}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Risk metrics */}
      {risk && (
        <div>
          <SectionTitle>Risk Metrikleri</SectionTitle>
          <StatRow stats={[
            { label: 'Toplam Margin', val: fmt(risk.total_margin_used || 0), color: '#F0B90B' },
            { label: 'Unrealized P&L', val: fmt(risk.total_unrealized_pnl || 0), color: (risk.total_unrealized_pnl || 0) >= 0 ? '#00DC82' : '#FF4757' },
            { label: 'Likidite Riski', val: risk.positions_near_liquidation || 0, sub: 'pozisyon', color: (risk.positions_near_liquidation || 0) > 0 ? '#FF4757' : '#ffffff' },
            { label: 'Ort. Kaldıraç', val: `${(risk.avg_leverage || 0).toFixed(1)}×`, color: '#3D7FFF' },
          ]} />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <SectionTitle>Hızlı İşlemler</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: <Users size={18} />, label: 'Kullanıcı Yönet', path: '/users', color: '#3D7FFF', bg: 'rgba(61,127,255,0.12)' },
            { icon: <DollarSign size={18} />, label: 'Çekim Onayla', path: '/finance', color: '#00DC82', bg: 'rgba(0,220,130,0.12)' },
            { icon: <MessageSquare2 />, label: 'Destek Yanıtla', path: '/support', color: '#F0B90B', bg: 'rgba(240,185,11,0.12)' },
            { icon: <Shield size={18} />, label: 'Güvenlik', path: '/alerts', color: '#FF4757', bg: 'rgba(255,71,87,0.12)' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => nav(item.path)}
              className="rounded-2xl p-4 flex items-center gap-3 active:scale-[0.97] transition-transform text-left"
              style={{ background: item.bg, border: `1px solid ${item.color}33` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: `${item.color}22`, color: item.color }}>
                {item.icon}
              </div>
              <span className="text-sm font-semibold text-white leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* VIP users */}
      {vip.length > 0 && (
        <div>
          <SectionTitle>VIP Kullanıcılar</SectionTitle>
          <div className="flex flex-col gap-2">
            {vip.slice(0, 4).map((u: Record<string, string | number>, i: number) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(240,185,11,0.05)', border: '1px solid rgba(240,185,11,0.12)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(240,185,11,0.2)', color: '#F0B90B' }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{u.email?.toString().split('@')[0] || u.full_name || `VIP #${i+1}`}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.open_positions || 0} açık pozisyon</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: '#F0B90B' }}>{fmt(Number(u.current_balance || u.total_deposited || 0))}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>bakiye</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitleInline>Son Alarmlar</SectionTitleInline>
          {unread.length > 0 && (
            <button onClick={() => nav('/alerts')} className="text-xs font-medium" style={{ color: '#F0B90B' }}>
              {unread.length} okunmamış ›
            </button>
          )}
        </div>
        {unread.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(0,220,130,0.04)', border: '1px solid rgba(0,220,130,0.1)' }}>
            <p className="text-lg mb-1">✅</p>
            <p className="text-sm" style={{ color: '#00DC82' }}>Tüm alarmlar okundu</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {unread.slice(0, 4).map(a => (
              <button
                key={a.id}
                onClick={() => nav('/alerts')}
                className="rounded-xl px-4 py-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform w-full"
                style={{ background: a.severity === 'critical' ? 'rgba(255,71,87,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${a.severity === 'critical' ? 'rgba(255,71,87,0.25)' : 'rgba(255,255,255,0.07)'}` }}
              >
                <span className="text-lg">{a.severity === 'critical' ? '🚨' : a.category === 'finance' ? '💰' : a.category === 'support' ? '💬' : a.category === 'user' ? '👤' : '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.title}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.body}</p>
                </div>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{new Date(a.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>{children}</p>;
}
function SectionTitleInline({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>{children}</p>;
}
function MessageSquare2() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }

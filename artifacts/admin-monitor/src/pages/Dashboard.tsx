import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

function StatCard({ icon, label, value, sub, color = 'yellow', onClick }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string; onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    yellow: 'text-yellow-400', green: 'text-green-400',
    red: 'text-red-400', blue: 'text-blue-400', purple: 'text-purple-400', orange: 'text-orange-400',
  };
  return (
    <button onClick={onClick} className="bg-[#111] rounded-2xl p-4 flex flex-col gap-2 text-left active:bg-[#1a1a1a] transition-colors w-full">
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-medium ${colors[color] || colors.yellow}`}>{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </button>
  );
}

function LiveDot({ color = 'green' }: { color?: string }) {
  const cls: Record<string, string> = { green: 'bg-green-400', red: 'bg-red-400', yellow: 'bg-yellow-400' };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cls[color] || cls.green} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cls[color] || cls.green}`} />
    </span>
  );
}

export default function Dashboard() {
  const [, nav] = useLocation();
  const { alerts, totalUsers, todayDeposits, pendingSupport, settings } = useStore();
  const [uptime, setUptime] = useState(0);
  const [dbStatus, setDbStatus] = useState<'ok' | 'slow' | 'down'>('ok');
  const [recentActivity, setRecentActivity] = useState<Array<{ icon: string; text: string; ts: number }>>([]);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function checkDb() {
      try {
        const t = Date.now();
        await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const ms = Date.now() - t;
        setDbStatus(ms > 2000 ? 'slow' : 'ok');
      } catch {
        setDbStatus('down');
      }
    }
    checkDb();
    const t = setInterval(checkDb, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const recent = alerts
      .filter(a => !a.dismissed)
      .slice(0, 5)
      .map(a => ({ icon: catIcon(a.category), text: a.title, ts: a.ts }));
    setRecentActivity(recent);
  }, [alerts]);

  function catIcon(cat: string) {
    const m: Record<string, string> = { user: '👤', finance: '💰', security: '🛡️', support: '💬', system: '⚙️', visitor: '👁️' };
    return m[cat] || '📌';
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.dismissed).length;
  const unreadCount = alerts.filter(a => !a.read && !a.dismissed).length;

  function fmt(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  const muted = settings.muteAll;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          <p className="text-xs text-gray-500">BASONCE/KITE Exchange</p>
        </div>
        <div className="flex items-center gap-2">
          {muted && (
            <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-lg">🔇 Sessiz</span>
          )}
          <div className="flex items-center gap-1.5 bg-[#111] px-3 py-1.5 rounded-xl">
            <LiveDot color={dbStatus === 'ok' ? 'green' : dbStatus === 'slow' ? 'yellow' : 'red'} />
            <span className="text-xs text-gray-400">
              {dbStatus === 'ok' ? 'Çevrimiçi' : dbStatus === 'slow' ? 'Yavaş' : 'Hata'}
            </span>
          </div>
        </div>
      </div>

      {/* Critical banner */}
      {criticalCount > 0 && (
        <button
          onClick={() => nav('/alerts')}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 flex items-center gap-3 alert-flash"
        >
          <span className="text-2xl">🚨</span>
          <div className="flex-1 text-left">
            <p className="text-red-400 font-bold text-sm">{criticalCount} Kritik Alarm</p>
            <p className="text-red-400/60 text-xs">Hemen kontrol et</p>
          </div>
          <span className="text-red-400">›</span>
        </button>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="👥" label="TOPLAM ÜYE" value={totalUsers.toLocaleString()} sub="Kayıtlı kullanıcı" color="blue" onClick={() => nav('/users')} />
        <StatCard icon="💰" label="BUGÜN YATIRIM" value={`$${todayDeposits.toFixed(0)}`} sub="USDT" color="green" onClick={() => nav('/finance')} />
        <StatCard icon="💬" label="BEKLEYEN DESTEK" value={pendingSupport} sub="Açık ticket" color={pendingSupport > 5 ? 'red' : 'orange'} onClick={() => nav('/alerts')} />
        <StatCard icon="🔔" label="OKUNMAYAN ALARM" value={unreadCount} sub="Bekliyor" color={unreadCount > 0 ? 'red' : 'yellow'} onClick={() => nav('/alerts')} />
      </div>

      {/* Uptime */}
      <div className="bg-[#111] rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LiveDot color="green" />
          <div>
            <p className="text-xs text-gray-500">Monitor Uptime</p>
            <p className="text-white font-mono font-bold">{fmt(uptime)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Supabase</p>
          <p className={`text-sm font-medium ${dbStatus === 'ok' ? 'text-green-400' : dbStatus === 'slow' ? 'text-yellow-400' : 'text-red-400'}`}>
            {dbStatus === 'ok' ? '✓ Normal' : dbStatus === 'slow' ? '⚠ Yavaş' : '✗ Hata'}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs text-gray-500 mb-2 px-1">Hızlı Erişim</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '👤', label: 'Üyeler', path: '/users' },
            { icon: '💰', label: 'Finans', path: '/finance' },
            { icon: '🛡️', label: 'Güvenlik', path: '/security' },
            { icon: '⚙️', label: 'Ayarlar', path: '/settings' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => nav(item.path)}
              className="bg-[#111] rounded-xl py-3 flex flex-col items-center gap-1 active:bg-[#1a1a1a] transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] text-gray-400">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs text-gray-500">Son Aktivite</p>
          <button onClick={() => nav('/alerts')} className="text-xs text-yellow-400">Tümü ›</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {recentActivity.length === 0 ? (
            <div className="bg-[#111] rounded-2xl p-6 text-center">
              <p className="text-gray-500 text-sm">Henüz alarm yok</p>
              <p className="text-gray-600 text-xs mt-1">İzleme aktif, bekleniyor…</p>
            </div>
          ) : recentActivity.map((item, i) => (
            <button
              key={i}
              onClick={() => nav('/alerts')}
              className="bg-[#111] rounded-xl px-4 py-3 flex items-center gap-3 text-left active:bg-[#1a1a1a]"
            >
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{item.text}</p>
                <p className="text-gray-500 text-xs">{new Date(item.ts).toLocaleTimeString('tr-TR')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

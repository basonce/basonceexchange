import { useState, useEffect, useRef } from 'react';
import { Switch, Route, Router as WouterRouter } from 'wouter';
import PinLock from './pages/PinLock';
import Command from './pages/Command';
import Alerts from './pages/Alerts';
import Users from './pages/Users';
import Finance from './pages/Finance';
import Support from './pages/Support';
import Settings from './pages/Settings';
import BottomNav from './components/BottomNav';
import { startMonitor } from './lib/monitor';
import { requestNotificationPermission } from './lib/audio';
import { useStore } from './lib/store';

const SESSION_KEY = 'admin-monitor-unlocked';

const SEV_BG: Record<string, string> = {
  critical: 'rgba(255,71,87,0.15)',
  high: 'rgba(255,152,0,0.15)',
  medium: 'rgba(240,185,11,0.12)',
  low: 'rgba(61,127,255,0.12)',
  info: 'rgba(136,136,136,0.1)',
};
const SEV_BORDER: Record<string, string> = {
  critical: 'rgba(255,71,87,0.4)',
  high: 'rgba(255,152,0,0.35)',
  medium: 'rgba(240,185,11,0.3)',
  low: 'rgba(61,127,255,0.3)',
  info: 'rgba(136,136,136,0.2)',
};
const SEV_COLOR: Record<string, string> = {
  critical: '#FF4757', high: '#FF9800', medium: '#F0B90B', low: '#3D7FFF', info: '#888',
};
const CAT_ICON: Record<string, string> = {
  user: '👤', finance: '💰', security: '🛡️', support: '💬', system: '⚙️', visitor: '👁️',
};

function InAppToast() {
  const { alerts } = useStore();
  const [latest, setLatest] = useState<typeof alerts[0] | null>(null);
  const [visible, setVisible] = useState(false);
  const lastIdRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const newest = alerts.find(a => !a.dismissed);
    if (newest && newest.id !== lastIdRef.current) {
      lastIdRef.current = newest.id;
      setLatest(newest);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 4500);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [alerts]);

  if (!visible || !latest) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-32px)] max-w-[396px] slide-down"
      onClick={() => setVisible(false)}
    >
      <div
        className="rounded-2xl p-3.5 flex items-start gap-3"
        style={{
          background: SEV_BG[latest.severity] || 'rgba(255,255,255,0.08)',
          border: `1px solid ${SEV_BORDER[latest.severity] || 'rgba(255,255,255,0.15)'}`,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-none"
          style={{ background: `${SEV_COLOR[latest.severity] || '#888'}25` }}
        >
          {CAT_ICON[latest.category] || '🔔'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold truncate leading-tight">{latest.title}</p>
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{latest.body}</p>
        </div>
        <button className="flex-none text-gray-500 p-0.5 text-lg leading-none">×</button>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col" style={{ maxWidth: 430, margin: '0 auto', background: '#050505' }}>
      <InAppToast />
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <div className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Command} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/users" component={Users} />
            <Route path="/finance" component={Finance} />
            <Route path="/support" component={Support} />
            <Route path="/settings" component={Settings} />
            <Route>
              <div className="flex items-center justify-center min-h-screen" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Sayfa bulunamadı
              </div>
            </Route>
          </Switch>
        </div>
        <BottomNav />
      </WouterRouter>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === 'true'; }
    catch { return false; }
  });

  function handleUnlock() {
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch {}
    setUnlocked(true);
    startMonitor();
    requestNotificationPermission();
  }

  useEffect(() => {
    if (unlocked) {
      startMonitor();
      requestNotificationPermission();
    }
  }, []);

  if (!unlocked) return <PinLock onUnlock={handleUnlock} />;
  return <AppContent />;
}

import { useState, useEffect } from 'react';
import { Switch, Route, Router as WouterRouter } from 'wouter';
import PinLock from './pages/PinLock';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Users from './pages/Users';
import Finance from './pages/Finance';
import Security from './pages/Security';
import Settings from './pages/Settings';
import BottomNav from './components/BottomNav';
import { startMonitor } from './lib/monitor';
import { requestNotificationPermission } from './lib/audio';
import { useStore } from './lib/store';

const SESSION_KEY = 'admin-monitor-unlocked';

function InAppAlert() {
  const { alerts } = useStore();
  const [latest, setLatest] = useState<typeof alerts[0] | null>(null);
  const [visible, setVisible] = useState(false);
  const [lastId, setLastId] = useState('');

  useEffect(() => {
    const newest = alerts.find(a => !a.dismissed);
    if (newest && newest.id !== lastId) {
      setLatest(newest);
      setVisible(true);
      setLastId(newest.id);
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [alerts]);

  if (!visible || !latest) return null;

  const colors: Record<string, string> = {
    critical: 'border-red-500 bg-red-500/10',
    high: 'border-orange-500 bg-orange-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-blue-500 bg-blue-500/10',
    info: 'border-gray-500 bg-gray-500/10',
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-[396px] slide-in">
      <div className={`rounded-2xl border p-3 backdrop-blur-sm ${colors[latest.severity] || colors.info}`}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{latest.title}</p>
            <p className="text-gray-400 text-xs truncate">{latest.body}</p>
          </div>
          <button onClick={() => setVisible(false)} className="text-gray-500 text-sm p-0.5 flex-none">×</button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col" style={{ maxWidth: 428, margin: '0 auto' }}>
      <InAppAlert />
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <div className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/users" component={Users} />
            <Route path="/finance" component={Finance} />
            <Route path="/security" component={Security} />
            <Route path="/settings" component={Settings} />
            <Route>
              <div className="flex items-center justify-center min-h-screen text-gray-500">Sayfa bulunamadı</div>
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
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored === 'true';
    } catch { return false; }
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

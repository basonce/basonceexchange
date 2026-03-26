import { useLocation } from 'wouter';
import { useStore } from '../lib/store';

const TABS = [
  { path: '/', icon: '📊', label: 'Panel' },
  { path: '/alerts', icon: '🔔', label: 'Alarmlar' },
  { path: '/users', icon: '👥', label: 'Üyeler' },
  { path: '/finance', icon: '💰', label: 'Finans' },
  { path: '/settings', icon: '⚙️', label: 'Ayarlar' },
];

export default function BottomNav() {
  const [loc, nav] = useLocation();
  const { alerts } = useStore();
  const unread = alerts.filter(a => !a.read && !a.dismissed).length;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-[#0d0d0d] border-t border-white/5 flex z-50">
      {TABS.map(tab => {
        const active = loc === tab.path || (tab.path !== '/' && loc.startsWith(tab.path));
        return (
          <button
            key={tab.path}
            onClick={() => nav(tab.path)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors relative ${
              active ? 'text-yellow-400' : 'text-gray-500'
            }`}
          >
            <span className="text-xl relative">
              {tab.icon}
              {tab.path === '/alerts' && unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium">{tab.label}</span>
            {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-yellow-400 rounded-b" />}
          </button>
        );
      })}
    </nav>
  );
}

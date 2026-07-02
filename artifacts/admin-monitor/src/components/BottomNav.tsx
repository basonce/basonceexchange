import { useLocation } from 'wouter';
import { useStore } from '../lib/store';

const TABS = [
  { path: '/',          icon: '🏠', label: 'Komuta' },
  { path: '/alerts',    icon: '🔔', label: 'Alarmlar' },
  { path: '/visitors',  icon: '👁️', label: 'Gelenler' },
  { path: '/users',     icon: '👥', label: 'Üyeler' },
  { path: '/finance',   icon: '💰', label: 'Finans' },
  { path: '/support',   icon: '💬', label: 'Destek' },
  { path: '/tools',     icon: '🔧', label: 'Araçlar' },
  { path: '/matches',   icon: '⚽', label: 'Maçlar' },
  { path: '/audit',     icon: '📒', label: 'Denetim' },
];

export default function BottomNav() {
  const [loc, nav] = useLocation();
  const { alerts } = useStore();
  const unread = alerts.filter(a => !a.read && !a.dismissed).length;

  function isActive(path: string) {
    if (path === '/') return loc === '/';
    return loc.startsWith(path);
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{ background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-stretch">
        {TABS.map(tab => {
          const active = isActive(tab.path);
          const badge = tab.path === '/alerts' && unread > 0 ? unread : 0;
          return (
            <button
              key={tab.path}
              onClick={() => nav(tab.path)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-all active:scale-95"
            >
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/2 translate-x-3.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background: '#FF4757', color: 'white' }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: '#F0B90B' }} />
              )}
              <span className="text-[22px] leading-none"
                style={{ filter: active ? 'none' : 'grayscale(1) opacity(0.4)', transition: 'filter 0.15s' }}>
                {tab.icon}
              </span>
              <span className="text-[10px] font-semibold leading-none tracking-tight"
                style={{ color: active ? '#F0B90B' : 'rgba(255,255,255,0.28)' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  );
}

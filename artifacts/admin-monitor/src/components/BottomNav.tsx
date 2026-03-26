import { useLocation } from 'wouter';
import { useStore } from '../lib/store';
import { Activity, Bell, Users, DollarSign, MessageSquare, Settings } from 'lucide-react';

const TABS = [
  { path: '/', Icon: Activity, label: 'Komuta' },
  { path: '/alerts', Icon: Bell, label: 'Alarmlar' },
  { path: '/users', Icon: Users, label: 'Üyeler' },
  { path: '/finance', Icon: DollarSign, label: 'Finans' },
  { path: '/support', Icon: MessageSquare, label: 'Destek' },
  { path: '/settings', Icon: Settings, label: 'Ayarlar' },
];

export default function BottomNav() {
  const [loc, nav] = useLocation();
  const { alerts } = useStore();
  const unread = alerts.filter(a => !a.read && !a.dismissed).length;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50">
      <div
        className="mx-3 mb-3 rounded-2xl flex"
        style={{
          background: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
      >
        {TABS.map(({ path, Icon, label }) => {
          const active = loc === path || (path !== '/' && loc.startsWith(path));
          const isAlert = path === '/alerts';
          return (
            <button
              key={path}
              onClick={() => nav(path)}
              className="flex-1 flex flex-col items-center py-3 gap-0.5 relative transition-all"
              style={{ color: active ? '#F0B90B' : 'rgba(255,255,255,0.3)' }}
            >
              {/* Glow bg for active */}
              {active && (
                <div
                  className="absolute inset-x-1 inset-y-1 rounded-xl"
                  style={{ background: 'rgba(240,185,11,0.08)' }}
                />
              )}
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {isAlert && unread > 0 && (
                  <span
                    className="absolute -top-1 -right-1.5 text-[9px] font-bold text-black rounded-full flex items-center justify-center"
                    style={{ background: '#FF4757', minWidth: 14, height: 14, padding: '0 3px' }}
                  >
                    {unread > 99 ? '99' : unread}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-medium tracking-wide" style={{ color: active ? '#F0B90B' : 'rgba(255,255,255,0.25)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { useState, useEffect } from 'react';
import { TrendingUp, LineChart, BarChart3, Pickaxe, Wallet, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const check = () => {
      setHidden(document.body.classList.contains('deposit-modal-open'));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tabs = [
    { id: 'home',    label: 'Home',    icon: null },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'trade',   label: 'Trade',   icon: LineChart },
    { id: 'futures', label: 'Futures', icon: BarChart3 },
    { id: 'mining',  label: 'Mining',  icon: Pickaxe },
    { id: 'assets',  label: 'Assets',  icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (hidden) return null;

  return (
    <div
      className="bottom-nav-bar fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-[428px] bg-[#181A20] border-t border-[#2B3139] z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-7 px-1 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isMining = tab.id === 'mining';

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 p-1.5 relative ${isMining && isActive ? 'animate-pulse' : ''}`}
            >
              {isMining && isActive && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#F0B90B]/20 to-transparent rounded-lg" />
              )}

              {tab.id === 'home' ? (
                <div className="w-7 h-7 flex items-center justify-center relative z-10">
                  <img
                    src="/image.png"
                    alt="BASONCE"
                    className={`max-w-full object-contain transition-all ${isActive ? 'brightness-100 saturate-150' : 'brightness-75 saturate-50 opacity-60'}`}
                    style={{
                      filter: isActive
                        ? 'drop-shadow(0 0 2px rgba(240, 185, 11, 0.5))'
                        : 'grayscale(20%)'
                    }}
                  />
                </div>
              ) : (
                Icon && (
                  <div className="relative z-10">
                    <Icon
                      className={`w-7 h-7 ${isMining ? 'text-[#F0B90B]' : isActive ? 'text-[#F0B90B]' : 'text-gray-400'}`}
                      style={isMining ? { filter: 'drop-shadow(0 0 3px rgba(240,185,11,0.15))' } : undefined}
                    />
                    {isMining && !isActive && (
                      <div className="absolute inset-0 bg-[#F0B90B] opacity-5 blur-sm rounded-full" />
                    )}
                  </div>
                )
              )}
              <span
                className={`text-[10px] font-medium relative z-10 leading-tight ${
                  isMining
                    ? isActive ? 'text-[#F0B90B] font-bold' : 'text-[#F0B90B] font-semibold'
                    : isActive ? 'text-[#F0B90B]' : 'text-gray-400'
                }`}
                style={isMining ? { filter: 'drop-shadow(0 0 2px rgba(240,185,11,0.2))' } : undefined}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

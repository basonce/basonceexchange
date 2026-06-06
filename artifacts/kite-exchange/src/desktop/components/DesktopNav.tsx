import { useState } from 'react';
import { Search, ChevronDown, Globe, Sun, Wallet, Download } from 'lucide-react';

export type DeskTab = 'home' | 'markets' | 'trade' | 'futures' | 'aibot' | 'mining' | 'assets' | 'profile' | 'sports';

interface DesktopNavProps {
  tab: string;
  onNavigate: (tab: DeskTab) => void;
  user: any;
  onAuth: (mode: 'login' | 'register') => void;
  onDeposit: () => void;
}

const NAV_ITEMS: { label: string; tab: DeskTab; dropdown?: { label: string; tab: DeskTab; desc: string }[] }[] = [
  { label: 'Buy Crypto', tab: 'markets' },
  { label: 'Markets', tab: 'markets' },
  {
    label: 'Trade', tab: 'trade', dropdown: [
      { label: 'Spot', tab: 'trade', desc: 'Buy and sell on the spot market' },
      { label: 'Futures', tab: 'futures', desc: 'Trade perpetual contracts with leverage' },
      { label: 'AI Trading Bot', tab: 'aibot', desc: 'Automated strategies that trade for you' },
    ],
  },
  { label: 'Futures', tab: 'futures' },
  {
    label: 'Earn', tab: 'mining', dropdown: [
      { label: 'Mining', tab: 'mining', desc: 'Earn daily rewards from cloud mining' },
      { label: 'AI Bot', tab: 'aibot', desc: 'Grow your assets automatically' },
    ],
  },
  { label: 'Sports', tab: 'sports' },
];

export default function DesktopNav({ tab, onNavigate, user, onAuth, onDeposit }: DesktopNavProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#181A20] border-b border-[#2B3139]">
      <div className="max-w-[1600px] mx-auto h-full px-6 flex items-center gap-8">
        {/* Logo */}
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 shrink-0">
          <img src="/basonce_logo_son_biten.png" alt="Basonce" className="h-7 w-auto" />
          <span className="text-[#EAECEF] font-bold text-xl tracking-tight hidden xl:block">BASONCE</span>
        </button>

        {/* Primary nav */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.dropdown && setOpenMenu(item.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => onNavigate(item.tab)}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  tab === item.tab ? 'text-[#F0B90B]' : 'text-[#EAECEF] hover:text-[#F0B90B]'
                }`}
              >
                {item.label}
                {item.dropdown && <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {item.dropdown && openMenu === item.label && (
                <div className="absolute top-full left-0 pt-2">
                  <div className="w-72 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 p-2">
                    {item.dropdown.map((d) => (
                      <button
                        key={d.label}
                        onClick={() => { onNavigate(d.tab); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#2B3139] transition-colors"
                      >
                        <div className="text-sm font-semibold text-[#EAECEF]">{d.label}</div>
                        <div className="text-xs text-[#848E9C] mt-0.5">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="p-2 text-[#848E9C] hover:text-[#EAECEF] transition-colors" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>

          {user ? (
            <>
              <button
                onClick={onDeposit}
                className="px-4 py-2 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-md transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => onNavigate('assets')}
                className={`p-2 transition-colors ${tab === 'assets' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-[#EAECEF]'}`}
                aria-label="Assets"
              >
                <Wallet className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F0B90B] to-[#FCD535] flex items-center justify-center text-black text-sm font-bold"
                aria-label="Profile"
              >
                {(user.email?.[0] || 'U').toUpperCase()}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onAuth('login')}
                className="px-4 py-2 text-[#EAECEF] hover:text-[#F0B90B] text-sm font-medium transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => onAuth('register')}
                className="px-4 py-2 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-md transition-colors"
              >
                Sign Up
              </button>
            </>
          )}

          <div className="flex items-center gap-0.5 ml-1 text-[#848E9C]">
            <button className="p-2 hover:text-[#EAECEF] transition-colors" aria-label="Download"><Download className="w-4.5 h-4.5" /></button>
            <button className="p-2 hover:text-[#EAECEF] transition-colors" aria-label="Language"><Globe className="w-4.5 h-4.5" /></button>
            <button className="p-2 hover:text-[#EAECEF] transition-colors" aria-label="Theme"><Sun className="w-4.5 h-4.5" /></button>
          </div>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, Globe, Wallet, Download, X, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLang } from '../i18n/LanguageContext';
import { useMarkets } from '../useMarkets';
import { supabase } from '../../lib/supabase';
import type { TKey } from '../i18n/translations';

export type DeskTab = 'home' | 'markets' | 'trade' | 'futures' | 'aibot' | 'mining' | 'assets' | 'profile' | 'sports';

interface DesktopNavProps {
  tab: string;
  onNavigate: (tab: DeskTab) => void;
  user: any;
  onAuth: (mode: 'login' | 'register') => void;
  onDeposit: () => void;
}

const NAV_ITEMS: { key: TKey; tab: DeskTab; dropdown?: { key: TKey; tab: DeskTab; desc: string }[] }[] = [
  { key: 'buyCrypto', tab: 'markets' },
  { key: 'markets', tab: 'markets' },
  {
    key: 'trade', tab: 'trade', dropdown: [
      { key: 'spot', tab: 'trade', desc: 'Buy and sell on the spot market' },
      { key: 'futures', tab: 'futures', desc: 'Trade perpetual contracts with leverage' },
      { key: 'aiTradingBot', tab: 'aibot', desc: 'Automated strategies that trade for you' },
    ],
  },
  { key: 'futures', tab: 'futures' },
  {
    key: 'earn', tab: 'mining', dropdown: [
      { key: 'mining', tab: 'mining', desc: 'Earn daily rewards from cloud mining' },
      { key: 'aiBot', tab: 'aibot', desc: 'Grow your assets automatically' },
    ],
  },
  { key: 'sports', tab: 'sports' },
];

export default function DesktopNav({ tab, onNavigate, user, onAuth, onDeposit }: DesktopNavProps) {
  const { t, lang, setLang, languages } = useLang();
  const { markets } = useMarkets();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | 'search' | 'lang' | 'download'>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (panel === 'search') setTimeout(() => searchRef.current?.focus(), 30);
    if (panel === null) setQuery('');
  }, [panel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = markets.filter(m => m.symbol !== 'USDT' && m.price > 0);
    const base = q
      ? list.filter(m => m.symbol.toLowerCase().includes(q) || m.fullName.toLowerCase().includes(q))
      : list;
    return base.slice(0, 8);
  }, [markets, query]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!user?.id) { setAvatarUrl(null); return; }
    supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (active) setAvatarUrl((data as any)?.avatar_url ?? null); });
    return () => { active = false; };
  }, [user?.id]);

  const selectCoin = (symbol: string) => {
    localStorage.setItem('selectedCoinSymbol', symbol);
    window.dispatchEvent(new CustomEvent('desk-select-coin', { detail: symbol }));
    onNavigate('trade');
    setPanel(null);
  };

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://basonce.com';

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#181A20] border-b border-[#2B3139]">
      <div className="max-w-[1600px] mx-auto h-full px-6 flex items-center gap-8">
        {/* Logo */}
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5 shrink-0">
          <span className="h-9 w-9 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/basonce_logo_son_biten.png" alt="Basonce" className="w-[175%] max-w-none mix-blend-lighten" />
          </span>
          <span className="text-[#EAECEF] font-semibold text-[17px] tracking-[0.22em] hidden xl:block">BASONCE</span>
        </button>

        {/* Primary nav */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.key}
              className="relative"
              onMouseEnter={() => item.dropdown && setOpenMenu(item.key)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => onNavigate(item.tab)}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  tab === item.tab ? 'text-[#F0B90B]' : 'text-[#EAECEF] hover:text-[#F0B90B]'
                }`}
              >
                {t(item.key)}
                {item.dropdown && <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {item.dropdown && openMenu === item.key && (
                <div className="absolute top-full left-0 pt-2">
                  <div className="w-72 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 p-2">
                    {item.dropdown.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => { onNavigate(d.tab); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#2B3139] transition-colors"
                      >
                        <div className="text-sm font-semibold text-[#EAECEF]">{t(d.key)}</div>
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
          {/* Search */}
          <div className="relative">
            <button
              onClick={() => setPanel(panel === 'search' ? null : 'search')}
              className={`p-2 transition-colors ${panel === 'search' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-[#EAECEF]'}`}
              aria-label={t('searchPlaceholder')}
            >
              <Search className="w-5 h-5" />
            </button>
            {panel === 'search' && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 p-3 z-50">
                <div className="flex items-center gap-2 bg-[#2B3139] rounded-lg px-3 py-2 mb-2">
                  <Search className="w-4 h-4 text-[#848E9C]" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="flex-1 bg-transparent text-sm text-[#EAECEF] placeholder-[#5E6673] outline-none"
                  />
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {results.length === 0 ? (
                    <div className="text-center text-[#5E6673] text-sm py-6">{t('noResults')}</div>
                  ) : results.map((m) => (
                    <button
                      key={m.symbol}
                      onClick={() => selectCoin(m.symbol)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#2B3139] transition-colors"
                    >
                      <img src={m.logo} alt="" className="w-7 h-7 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-semibold text-[#EAECEF] truncate">{m.symbol}<span className="text-[#5E6673] font-normal">/USDT</span></div>
                        <div className="text-xs text-[#848E9C] truncate">{m.fullName}</div>
                      </div>
                      <div className={`text-xs font-medium ${m.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <>
              <button
                onClick={onDeposit}
                className="px-4 py-2 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-md transition-colors"
              >
                {t('deposit')}
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
                className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#F0B90B] to-[#FCD535] flex items-center justify-center text-black text-sm font-bold"
                aria-label="Profile"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (user.email?.[0] || 'U').toUpperCase()
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onAuth('login')}
                className="px-4 py-2 text-[#EAECEF] hover:text-[#F0B90B] text-sm font-medium transition-colors"
              >
                {t('login')}
              </button>
              <button
                onClick={() => onAuth('register')}
                className="px-4 py-2 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-md transition-colors"
              >
                {t('signup')}
              </button>
            </>
          )}

          <div className="flex items-center gap-0.5 ml-1 text-[#848E9C]">
            {/* Download / QR */}
            <div className="relative">
              <button
                onClick={() => setPanel(panel === 'download' ? null : 'download')}
                className={`p-2 transition-colors ${panel === 'download' ? 'text-[#F0B90B]' : 'hover:text-[#EAECEF]'}`}
                aria-label={t('getApp')}
              >
                <Download className="w-[18px] h-[18px]" />
              </button>
              {panel === 'download' && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 p-4 z-50 flex flex-col items-center">
                  <div className="text-sm font-semibold text-[#EAECEF] mb-1">{t('getApp')}</div>
                  <div className="text-xs text-[#848E9C] mb-3 text-center">{t('scanToTrade')}</div>
                  <div className="bg-white p-2.5 rounded-lg">
                    <QRCodeSVG value={siteUrl} size={132} level="M" />
                  </div>
                  <div className="text-[11px] text-[#5E6673] mt-3 break-all text-center">{siteUrl.replace(/^https?:\/\//, '')}</div>
                </div>
              )}
            </div>

            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setPanel(panel === 'lang' ? null : 'lang')}
                className={`p-2 transition-colors ${panel === 'lang' ? 'text-[#F0B90B]' : 'hover:text-[#EAECEF]'}`}
                aria-label={t('language')}
              >
                <Globe className="w-[18px] h-[18px]" />
              </button>
              {panel === 'lang' && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 p-2 z-50">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                    <span className="text-xs font-semibold text-[#848E9C] uppercase tracking-wide">{t('language')}</span>
                    <button onClick={() => setPanel(null)} className="text-[#5E6673] hover:text-[#EAECEF]"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setPanel(null); }}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#2B3139] transition-colors"
                      >
                        <span className="text-base leading-none">{l.flag}</span>
                        <span className="flex-1 text-left text-sm text-[#EAECEF]">{l.native}</span>
                        {lang === l.code && <Check className="w-4 h-4 text-[#F0B90B]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click-away backdrop for popovers */}
      {panel && <div className="fixed inset-0 z-40" onClick={() => setPanel(null)} />}
    </header>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Search, ChevronDown, ChevronRight, Globe, Wallet, Download, X, Check,
  Crown, Users, UserPlus, Baby, Rocket, Gift, Pickaxe, Gem,
  CreditCard, Image as ImageIcon, Trophy, Boxes, GraduationCap, HeartHandshake, ShieldCheck,
  CandlestickChart, Building2, Scale, ArrowLeftRight, Repeat, Bot, Copy, KeyRound,
  Settings, LogOut, LayoutGrid, ArrowDownToLine, ArrowUpFromLine, History, Eye, EyeOff,
} from 'lucide-react';
import { PriceCache } from '../../lib/price-cache';
import { EarnQuestPriceManager } from '../../lib/earnquest-price';
import { QRCodeSVG } from 'qrcode.react';
import { useLang } from '../i18n/LanguageContext';
import { useMarkets } from '../useMarkets';
import { supabase } from '../../lib/supabase';
import type { TKey } from '../i18n/translations';

export type DeskTab =
  | 'home' | 'markets' | 'trade' | 'futures' | 'aibot' | 'mining' | 'assets' | 'profile' | 'sports' | 'market'
  | 'vip' | 'affiliate' | 'referral' | 'junior' | 'launchpool' | 'megadrop' | 'miningpool' | 'aipro'
  | 'pay' | 'nft' | 'fantoken' | 'wallet' | 'chain' | 'academy' | 'charity' | 'travelrule'
  | 'stock' | 'p2p' | 'convert' | 'dex' | 'alpha' | 'copytrading' | 'apikeys'
  | 'about' | 'careers' | 'press' | 'community' | 'announcements' | 'news' | 'notices'
  | 'api' | 'fees' | 'tradingrules' | 'helpcenter' | 'chatsupport' | 'submitrequest'
  | 'lawenforcement' | 'glossary' | 'guide' | 'terms' | 'privacy' | 'cookies' | 'riskwarning';

interface DesktopNavProps {
  tab: string;
  onNavigate: (tab: DeskTab) => void;
  user: any;
  onAuth: (mode: 'login' | 'register') => void;
  onDeposit: () => void;
}

const NAV_ITEMS: { key: TKey; tab: DeskTab; dropdown?: { key: TKey; tab: DeskTab; desc: string; icon?: LucideIcon }[] }[] = [
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
      { key: 'mining', tab: 'mining', desc: 'Earn daily rewards from cloud mining', icon: Pickaxe },
      { key: 'aiBot', tab: 'aibot', desc: 'Grow your assets automatically', icon: Bot },
    ],
  },
  { key: 'sports', tab: 'sports' },
  { key: 'market', tab: 'market' },
];

type TradeItem = { icon: LucideIcon; title: string; desc: string; tab?: DeskTab; badge?: string };

const TRADE_MENU: { heading: string; items: TradeItem[] }[] = [
  {
    heading: 'Basic',
    items: [
      { icon: CandlestickChart, title: 'Spot', desc: 'Trade Spot and Margin with advanced tools', tab: 'trade' },
      { icon: Building2, title: 'Stock', desc: 'Trade Stocks & ETFs with crypto', tab: 'stock', badge: 'New' },
      { icon: Scale, title: 'Margin', desc: 'Increase your profits with leverage', tab: 'futures' },
      { icon: ArrowLeftRight, title: 'P2P', desc: 'Buy & sell crypto with bank transfer and 800+ options', tab: 'p2p' },
      { icon: Repeat, title: 'Convert & Block Trade', desc: 'The easiest way to trade at all sizes', tab: 'convert' },
      { icon: GraduationCap, title: 'Demo Trading', desc: 'Use virtual funds to experience real trading with zero risk', tab: 'aibot' },
    ],
  },
  {
    heading: 'Advanced',
    items: [
      { icon: Boxes, title: 'DEX', desc: 'On-chain trading with Basonce Wallet', tab: 'dex', badge: 'Beta' },
      { icon: Gem, title: 'Alpha', desc: 'Quick access to Web3 via Alpha Trading', tab: 'alpha' },
      { icon: Bot, title: 'Trading Bots', desc: 'Trade smarter with our automated strategies', tab: 'aibot' },
      { icon: Copy, title: 'Copy Trading', desc: 'Follow the most popular traders', tab: 'copytrading' },
      { icon: KeyRound, title: 'APIs', desc: 'Unlimited opportunities with one key', tab: 'apikeys' },
    ],
  },
];

type MoreItem = { icon: LucideIcon; title: string; desc: string; tab?: DeskTab };

const MORE_MENU: MoreItem[][] = [
  [
    { icon: Crown, title: 'VIP & Institutional', desc: 'Trusted digital asset platform for VIPs and institutions', tab: 'vip' },
    { icon: Users, title: 'Affiliate', desc: 'Earn up to 50% commission per trade from referrals', tab: 'affiliate' },
    { icon: UserPlus, title: 'Referral', desc: 'Invite friends to earn a commission rebate or a one-time reward', tab: 'referral' },
    { icon: Baby, title: 'Basonce Junior', desc: 'A parent-supervised crypto account for kids and teens', tab: 'junior' },
    { icon: Rocket, title: 'Launchpool', desc: 'Discover and gain early access to new token launches', tab: 'launchpool' },
    { icon: Gift, title: 'Megadrop', desc: 'Lock tokens and complete quests for boosted airdrop rewards', tab: 'megadrop' },
    { icon: Pickaxe, title: 'Mining Pool', desc: 'Earn more rewards by connecting to the pool', tab: 'miningpool' },
    { icon: Gem, title: 'Basonce AI Pro', desc: 'Your AI-powered trading copilot', tab: 'aipro' },
  ],
  [
    { icon: CreditCard, title: 'Basonce Pay', desc: 'Send, receive and spend crypto', tab: 'pay' },
    { icon: ImageIcon, title: 'NFT', desc: 'Explore NFTs from creators worldwide', tab: 'nft' },
    { icon: Trophy, title: 'Fan Token', desc: 'Discover fandom and unlock unlimited fan experiences', tab: 'fantoken' },
    { icon: Wallet, title: 'Basonce Wallet', desc: 'Access and navigate Web3 effortlessly', tab: 'wallet' },
    { icon: Boxes, title: 'Chain', desc: 'A popular blockchain to build your own dApp', tab: 'chain' },
    { icon: GraduationCap, title: 'Basonce Academy', desc: 'Free crypto & blockchain education', tab: 'academy' },
    { icon: HeartHandshake, title: 'Charity', desc: 'Transparent, efficient and traceable blockchain giving', tab: 'charity' },
    { icon: ShieldCheck, title: 'Travel Rule', desc: 'Combat money laundering and terrorism financing', tab: 'travelrule' },
  ],
];

export default function DesktopNav({ tab, onNavigate, user, onAuth, onDeposit }: DesktopNavProps) {
  const { t, lang, setLang, languages } = useLang();
  const { markets } = useMarkets();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | 'search' | 'lang' | 'download' | 'wallet' | 'profile'>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [wallet, setWallet] = useState<{ spot: number; futures: number } | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [profileUserId, setProfileUserId] = useState<string>('');
  const [copiedField, setCopiedField] = useState<null | 'id' | 'email'>(null);
  useEffect(() => {
    let active = true;
    if (!user?.id) { setAvatarUrl(null); setProfileUserId(''); return; }
    supabase
      .from('user_profiles')
      .select('avatar_url, user_id')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setAvatarUrl((data as any)?.avatar_url ?? null);
        setProfileUserId(String((data as any)?.user_id ?? ''));
      });
    return () => { active = false; };
  }, [user?.id]);

  const copyValue = (value: string, field: 'id' | 'email') => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1500);
  };

  const fetchWallet = async () => {
    if (!user?.id) { setWallet(null); return; }
    setWalletLoading(true);
    try {
      const { data } = await supabase
        .from('user_balances')
        .select('symbol, balance, futures_balance')
        .eq('user_id', user.id);
      const pc = PriceCache.getInstance();
      const eq = EarnQuestPriceManager.getInstance();
      // futures_balance is a single account value stored on the USDT row only
      const SENTINEL = new Set(['WELCOME_CHEST', 'WELCOME_CHEST_SEEN']);
      let spot = 0;
      let futures = 0;
      (data || []).forEach((row: any) => {
        if (SENTINEL.has(row.symbol)) return;
        if (row.symbol === 'USDT') futures = parseFloat(row.futures_balance) || 0;
        const bal = parseFloat(row.balance) || 0;
        if (bal <= 0) return;
        let price = 0;
        if (row.symbol === 'USDT') price = 1;
        else if (row.symbol === 'EQ' || row.symbol === 'EQL') price = eq.getPrice() || 0;
        else price = pc.getBySymbol(row.symbol)?.price ?? pc.get(`${row.symbol}USDT`)?.price ?? 0;
        spot += bal * price;
      });
      setWallet({ spot, futures });
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    if (panel === 'wallet') fetchWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, user?.id]);

  const handleLogout = async () => {
    setPanel(null);
    await supabase.auth.signOut();
    onNavigate('home');
  };

  const fmtUsd = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const onMoreItem = (item: MoreItem) => {
    setOpenMenu(null);
    if (item.tab) { onNavigate(item.tab); return; }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(item.title);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const onTradeItem = (item: TradeItem) => {
    setOpenMenu(null);
    if (item.tab) { onNavigate(item.tab); return; }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(item.title);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

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
              {item.dropdown && openMenu === item.key && item.key === 'trade' && (
                <div className="absolute top-full left-0 pt-2">
                  <div className="w-[600px] max-w-[calc(100vw-3rem)] bg-[#1E2329] border border-[#2B3139] rounded-2xl shadow-2xl shadow-black/50 p-4 grid grid-cols-2 gap-x-4">
                    {TRADE_MENU.map((col) => (
                      <div key={col.heading} className="flex flex-col gap-0.5">
                        <div className="px-3 pt-1 pb-2 text-[11px] font-semibold text-[#5E6673] uppercase tracking-wider">{col.heading}</div>
                        {col.items.map((it) => {
                          const Icon = it.icon;
                          return (
                            <button
                              key={it.title}
                              onClick={() => onTradeItem(it)}
                              className="group flex items-start gap-3 px-3 py-2.5 rounded-xl border-l-2 border-transparent hover:border-[#F0B90B] hover:bg-[#2B3139] transition-colors text-left"
                            >
                              <span className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-[#2B3139] group-hover:bg-[#181A20] flex items-center justify-center text-[#F0B90B] transition-colors">
                                <Icon className="w-[18px] h-[18px]" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-[#EAECEF] group-hover:text-[#F0B90B] transition-colors whitespace-nowrap">{it.title}</span>
                                  {it.badge && <span className="text-[10px] font-bold text-[#F0B90B] bg-[#F0B90B1A] px-1.5 py-0.5 rounded whitespace-nowrap">{it.badge}</span>}
                                </span>
                                <span className="block text-xs text-[#848E9C] mt-0.5 leading-snug">{it.desc}</span>
                              </span>
                              <ChevronRight className="self-center shrink-0 w-4 h-4 text-[#F0B90B] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {item.dropdown && openMenu === item.key && item.key !== 'trade' && (
                <div className="absolute top-full left-0 pt-2">
                  <div className="w-72 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 p-2">
                    {item.dropdown.map((d) => {
                      const DropIcon = d.icon;
                      return (
                        <button
                          key={d.key}
                          onClick={() => { onNavigate(d.tab); setOpenMenu(null); }}
                          className="group w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border-l-2 border-transparent hover:border-[#F0B90B] hover:bg-[#2B3139] transition-colors"
                        >
                          {DropIcon && (
                            <span className="shrink-0 w-9 h-9 rounded-lg bg-[#2B3139] group-hover:bg-[#181A20] flex items-center justify-center text-[#F0B90B] transition-colors">
                              <DropIcon className="w-[18px] h-[18px]" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[#EAECEF] group-hover:text-[#F0B90B] transition-colors">{t(d.key)}</span>
                            <span className="block text-xs text-[#848E9C] mt-0.5">{d.desc}</span>
                          </span>
                          <ChevronRight className="shrink-0 w-4 h-4 text-[#F0B90B] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* More mega-menu */}
          <div
            className="relative"
            onMouseEnter={() => setOpenMenu('__more')}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                openMenu === '__more' ? 'text-[#F0B90B]' : 'text-[#EAECEF] hover:text-[#F0B90B]'
              }`}
            >
              {t('more')}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {openMenu === '__more' && (
              <div className="absolute top-full left-0 pt-2">
                <div className="w-[640px] max-w-[calc(100vw-3rem)] bg-[#1E2329] border border-[#2B3139] rounded-2xl shadow-2xl shadow-black/50 p-4 grid grid-cols-2 gap-x-4">
                  {MORE_MENU.map((col, ci) => (
                    <div key={ci} className="flex flex-col gap-1">
                      {col.map((m) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.title}
                            onClick={() => onMoreItem(m)}
                            className="group flex items-start gap-3 px-3 py-2.5 rounded-xl border-l-2 border-transparent hover:border-[#F0B90B] hover:bg-[#2B3139] transition-colors text-left"
                          >
                            <span className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-[#2B3139] group-hover:bg-[#181A20] flex items-center justify-center text-[#F0B90B] transition-colors">
                              <Icon className="w-[18px] h-[18px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-[#EAECEF] group-hover:text-[#F0B90B] transition-colors">{m.title}</span>
                              <span className="block text-xs text-[#848E9C] mt-0.5 leading-snug">{m.desc}</span>
                            </span>
                            <ChevronRight className="self-center shrink-0 w-4 h-4 text-[#F0B90B] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
              {/* Wallet dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPanel(panel === 'wallet' ? null : 'wallet')}
                  className={`p-2 transition-colors ${panel === 'wallet' || tab === 'assets' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-[#EAECEF]'}`}
                  aria-label="Wallet"
                >
                  <Wallet className="w-5 h-5" />
                </button>
                {panel === 'wallet' && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                    {/* Est. total balance */}
                    <div className="p-4 border-b border-[#2B3139]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs text-[#848E9C]">Est. Total Value</span>
                        <button
                          onClick={() => setHideBalance(v => !v)}
                          className="text-[#5E6673] hover:text-[#EAECEF] transition-colors"
                          aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                        >
                          {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="flex items-baseline gap-1.5 h-8">
                        {walletLoading && !wallet ? (
                          <span className="h-6 w-32 rounded bg-[#2B3139] animate-pulse" />
                        ) : (
                          <>
                            <span className="text-2xl font-semibold text-[#EAECEF] tabular-nums whitespace-nowrap">
                              {hideBalance ? '******' : (wallet ? fmtUsd(wallet.spot) : '0.00')}
                            </span>
                            <span className="text-sm text-[#848E9C]">USDT</span>
                          </>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[
                          { icon: ArrowDownToLine, label: 'Deposit', evt: 'desk-open-deposit' },
                          { icon: ArrowUpFromLine, label: 'Withdraw', evt: 'desk-open-withdraw' },
                          { icon: ArrowLeftRight, label: 'Transfer', evt: 'desk-open-transfer' },
                          { icon: History, label: 'History', evt: 'desk-open-history' },
                        ].map(({ icon: Icon, label, evt }) => (
                          <button
                            key={label}
                            onClick={() => { setPanel(null); (window as any).__deskAssetsIntent = label.toLowerCase(); onNavigate('assets'); window.dispatchEvent(new CustomEvent(evt)); }}
                            className="group flex flex-col items-center gap-1.5 py-2 rounded-lg hover:bg-[#2B3139] transition-colors"
                          >
                            <span className="w-9 h-9 rounded-full bg-[#2B3139] group-hover:bg-[#181A20] flex items-center justify-center text-[#F0B90B] transition-colors">
                              <Icon className="w-[18px] h-[18px]" />
                            </span>
                            <span className="text-[11px] text-[#B7BDC6] group-hover:text-[#EAECEF] whitespace-nowrap">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Account breakdown */}
                    <div className="p-2">
                      {[
                        { icon: Wallet, label: 'Spot Account', value: wallet?.spot ?? 0 },
                        { icon: CandlestickChart, label: 'Futures Account', value: wallet?.futures ?? 0 },
                      ].map(({ icon: Icon, label, value }) => (
                        <button
                          key={label}
                          onClick={() => { setPanel(null); onNavigate('assets'); }}
                          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[#2B3139] transition-colors text-left"
                        >
                          <span className="shrink-0 w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#848E9C]">
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="flex-1 min-w-0 text-sm text-[#EAECEF] truncate">{label}</span>
                          <span className="text-sm font-medium text-[#EAECEF] tabular-nums whitespace-nowrap">
                            {hideBalance ? '****' : fmtUsd(value)}
                          </span>
                          <ChevronRight className="shrink-0 w-4 h-4 text-[#5E6673]" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setPanel(null); onNavigate('assets'); }}
                      className="w-full px-4 py-3 border-t border-[#2B3139] text-sm font-medium text-[#F0B90B] hover:bg-[#2B3139] transition-colors"
                    >
                      View All Assets
                    </button>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPanel(panel === 'profile' ? null : 'profile')}
                  className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-black text-sm font-bold transition-shadow ${panel === 'profile' ? 'ring-2 ring-[#F0B90B]' : ''} bg-gradient-to-br from-[#F0B90B] to-[#FCD535]`}
                  aria-label="Profile"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (user.email?.[0] || 'U').toUpperCase()
                  )}
                </button>
                {panel === 'profile' && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                    {/* Identity header */}
                    <div className="flex items-center gap-3 p-4 border-b border-[#2B3139]">
                      <span className="shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#F0B90B] to-[#FCD535] flex items-center justify-center text-black text-base font-bold">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (user.email?.[0] || 'U').toUpperCase()
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-[#EAECEF] truncate">{user.email || 'Account'}</span>
                          {user.email && (
                            <button
                              onClick={() => copyValue(user.email, 'email')}
                              aria-label="Copy email"
                              title="Copy email"
                              className="shrink-0 w-6 h-6 rounded-md bg-[#2B3139] hover:bg-[#363C45] flex items-center justify-center transition-colors"
                            >
                              {copiedField === 'email' ? <Check className="w-3 h-3 text-[#0ECB81]" /> : <Copy className="w-3 h-3 text-[#848E9C]" />}
                            </button>
                          )}
                        </div>
                        {profileUserId && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs text-[#848E9C]">ID: <span className="text-[#B7BDC6] font-semibold tabular-nums">{profileUserId}</span></span>
                            <button
                              onClick={() => copyValue(profileUserId, 'id')}
                              aria-label="Copy ID"
                              title="Copy ID"
                              className="shrink-0 w-6 h-6 rounded-md bg-[#2B3139] hover:bg-[#363C45] flex items-center justify-center transition-colors"
                            >
                              {copiedField === 'id' ? <Check className="w-3 h-3 text-[#0ECB81]" /> : <Copy className="w-3 h-3 text-[#848E9C]" />}
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0ECB81] bg-[#0ECB811A] px-1.5 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                          <span className="text-[10px] font-bold text-[#F0B90B] bg-[#F0B90B1A] px-1.5 py-0.5 rounded">Regular</span>
                        </div>
                      </div>
                    </div>
                    {/* Menu */}
                    <div className="p-2">
                      {([
                        { icon: LayoutGrid, label: 'Dashboard', t: 'profile' as DeskTab },
                        { icon: Wallet, label: 'Assets', t: 'assets' as DeskTab },
                        { icon: Gift, label: 'Rewards Hub', t: 'megadrop' as DeskTab },
                        { icon: UserPlus, label: 'Referral', t: 'referral' as DeskTab },
                        { icon: Crown, label: 'VIP', t: 'vip' as DeskTab },
                        { icon: KeyRound, label: 'API Management', t: 'apikeys' as DeskTab },
                      ]).map(({ icon: Icon, label, t: target }) => (
                        <button
                          key={label}
                          onClick={() => { setPanel(null); onNavigate(target); }}
                          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[#2B3139] transition-colors text-left"
                        >
                          <Icon className="shrink-0 w-[18px] h-[18px] text-[#848E9C]" />
                          <span className="flex-1 min-w-0 text-sm text-[#EAECEF] truncate">{label}</span>
                          <ChevronRight className="shrink-0 w-4 h-4 text-[#5E6673]" />
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-[#2B3139]">
                      <button
                        onClick={() => { setPanel(null); onNavigate('profile'); }}
                        className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[#2B3139] transition-colors text-left"
                      >
                        <Settings className="shrink-0 w-[18px] h-[18px] text-[#848E9C]" />
                        <span className="flex-1 min-w-0 text-sm text-[#EAECEF] truncate">Security & Settings</span>
                        <ChevronRight className="shrink-0 w-4 h-4 text-[#5E6673]" />
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[#2B3139] transition-colors text-left"
                      >
                        <LogOut className="shrink-0 w-[18px] h-[18px] text-[#F6465D]" />
                        <span className="flex-1 min-w-0 text-sm text-[#F6465D] truncate">Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

      {/* Coming-soon toast for More items */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl shadow-black/50 px-5 py-3 flex items-center gap-3">
          <span className="text-sm font-semibold text-[#EAECEF]">{toast}</span>
          <span className="text-xs text-[#848E9C]">{t('comingSoon')}</span>
        </div>
      )}
    </header>
  );
}

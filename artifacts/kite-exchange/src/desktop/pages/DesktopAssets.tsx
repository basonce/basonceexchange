import { useEffect, useMemo, useState } from 'react';
import {
  Eye, EyeOff, ChevronDown, Search, History,
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Lock,
} from 'lucide-react';
import type { DeskTab } from '../components/DesktopNav';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { PriceCache } from '../../lib/price-cache';
import { EarnQuestPriceManager } from '../../lib/earnquest-price';
import { RealtimePnLService, type RealtimePnL } from '../../lib/realtime-pnl-service';
import { getCachedTradFiPrice, subscribeAllTradFiPrices } from '../../lib/tradfi-price-service';
import CoinLogo from '../../components/CoinLogo';
import MetalIcon, { isMetalSymbol } from '../../components/MetalIcon';
import TradFiIcon, { isTradFiIcon } from '../../components/TradFiIcon';
import DepositModal from '../../components/DepositModal';
import WithdrawalModal from '../../components/WithdrawalModal';
import DepositMethodModal from '../../components/DepositMethodModal';
import SendMethodModal from '../../components/SendMethodModal';
import TransferModal from '../../components/TransferModal';
import AssetsHistoryModal from '../../components/AssetsHistoryModal';
import WithdrawalProcessingBanner from '../../components/WithdrawalProcessingBanner';

interface Balance {
  symbol: string;
  name: string;
  logo: string;
  balance: number;
  locked_balance: number;
  futures_balance?: number;
  price: number;
  priceChange24h?: number;
}

type CurrencyType = 'USDT' | 'BTC' | 'ETH' | 'BNB';

const SUPPORTED_COINS = [
  { symbol: 'USDT', name: 'Tether', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  { symbol: 'EQ', name: 'EarnQuest', logo: '/earnquest-logo-icon-2.png' },
  { symbol: 'BTC', name: 'Bitcoin', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
  { symbol: 'ETH', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'BNB', name: 'BNB', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { symbol: 'SOL', name: 'Solana', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { symbol: 'XRP', name: 'Ripple', logo: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { symbol: 'ADA', name: 'Cardano', logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  { symbol: 'TRX', name: 'Tron', logo: 'https://cryptologos.cc/logos/tron-trx-logo.png' },
];
const BASE_TO_TRADFI: Record<string, string> = {
  OIL: 'WTIUSDT', SOYBEAN: 'SOYUSDT', SPX: 'SP500USDT', NDX: 'NAS100USDT',
  DJI: 'DJIA30USDT', FTSE: 'FTSE100USDT', NKY: 'NI225USDT',
};
const COIN_META = new Map(SUPPORTED_COINS.map(c => [c.symbol, c]));
const SENTINEL_SYMBOLS = new Set(['WELCOME_CHEST', 'WELCOME_CHEST_SEEN']);
const ASSETS_CACHE_KEY = 'basonce_assets_cache_v1';

const num = (v: number, min = 2, max = 2) =>
  v.toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });

interface DesktopAssetsProps {
  onNavigate: (tab: DeskTab) => void;
}

export default function DesktopAssets({ onNavigate }: DesktopAssetsProps) {
  const [balances, setBalances] = useState<Balance[]>(() => {
    try {
      const raw = localStorage.getItem(ASSETS_CACHE_KEY);
      if (raw) {
        const { ts, balances: cached } = JSON.parse(raw);
        if (Date.now() - ts < 30 * 1000 && Array.isArray(cached)) {
          return cached.map((b: any) => ({
            ...b,
            name: COIN_META.get(b.symbol)?.name || b.symbol,
            logo: COIN_META.get(b.symbol)?.logo || '',
          }));
        }
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(balances.length === 0);
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('USDT');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [gbpRate, setGbpRate] = useState(0.82);
  const [search, setSearch] = useState('');
  const [hideSmall, setHideSmall] = useState(false);
  const [realtimePnL, setRealtimePnL] = useState<RealtimePnL>({
    currentTotalValue: 0, startingValue: 0, dailyPnL: 0, dailyPnLPercentage: 0, balances: [],
  });

  const [depositMethodModal, setDepositMethodModal] = useState(false);
  const [sendMethodModal, setSendMethodModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [depositModal, setDepositModal] = useState<{ open: boolean; coin: string; name: string }>({ open: false, coin: '', name: '' });
  const [withdrawalModal, setWithdrawalModal] = useState<{ open: boolean; coin: string; name: string; balance: number }>({ open: false, coin: '', name: '', balance: 0 });

  useEffect(() => {
    fetchBalances();

    const pnlService = RealtimePnLService.getInstance();
    const unsubPnL = pnlService.subscribe((pnl) => setRealtimePnL(pnl));

    const priceCache = PriceCache.getInstance();
    const eqMgr = EarnQuestPriceManager.getInstance();

    const updateLivePrices = () => {
      const gbpUsd = priceCache.get('GBPUSDT');
      if (gbpUsd && gbpUsd.price > 0) setGbpRate(gbpUsd.price);
      setBalances(prev => prev.map(b => {
        if (b.symbol === 'USDT') return b;
        if (b.symbol === 'EQ' || b.symbol === 'EQL') {
          const p = eqMgr.getPrice();
          return p > 0 ? { ...b, price: p, priceChange24h: eqMgr.getChange() } : b;
        }
        const crypto = priceCache.get(`${b.symbol}USDT`);
        if (crypto && crypto.price > 0) return { ...b, price: crypto.price, priceChange24h: crypto.change24h };
        const tradfi = getCachedTradFiPrice(BASE_TO_TRADFI[b.symbol] || `${b.symbol}USDT`);
        if (tradfi && tradfi.price > 0) return { ...b, price: tradfi.price, priceChange24h: tradfi.change24h || 0 };
        return b;
      }));
    };

    const unsubCrypto = priceCache.subscribe(updateLivePrices);
    const unsubTradFi = subscribeAllTradFiPrices(updateLivePrices);
    const unsubEq = eqMgr.subscribe(updateLivePrices);

    const refreshCryptoPrices = async () => {
      try {
        const res = await fetch('/api/crypto-prices', { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const json: any = await res.json();
        const priceMap = json?.data && typeof json.data === 'object' ? json.data : json;
        if (!priceMap || typeof priceMap !== 'object') return;
        setBalances(prev => prev.map(b => {
          const d = priceMap[b.symbol];
          return d && typeof d.price === 'number' && d.price > 0 ? { ...b, price: d.price, priceChange24h: d.change ?? 0 } : b;
        }));
      } catch {}
    };
    const pollId = window.setInterval(refreshCryptoPrices, 10000);

    const channel = supabase
      .channel('desk_balance_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_balances' }, () => {
        try { localStorage.removeItem(ASSETS_CACHE_KEY); } catch {}
        try { localStorage.removeItem('basonce_pnl_cache_v1'); } catch {}
        fetchBalances();
        pnlService.refresh();
      })
      .subscribe();

    const clearIntent = () => { try { (window as any).__deskAssetsIntent = null; } catch {} };
    const openDeposit = () => { clearIntent(); setDepositMethodModal(true); };
    const openWithdraw = () => { clearIntent(); setSendMethodModal(true); };
    const openTransfer = () => { clearIntent(); setTransferModal(true); };
    const openHistory = () => { clearIntent(); setShowHistory(true); };
    window.addEventListener('desk-open-deposit', openDeposit);
    window.addEventListener('desk-open-withdraw', openWithdraw);
    window.addEventListener('desk-open-transfer', openTransfer);
    window.addEventListener('desk-open-history', openHistory);

    // Cold-load handoff: if intent was set before this lazy page mounted, the
    // synchronous dispatch was missed — consume the pending flag here instead.
    const pending = (window as any).__deskAssetsIntent as string | null | undefined;
    if (pending) {
      clearIntent();
      if (pending === 'deposit') setDepositMethodModal(true);
      else if (pending === 'withdraw') setSendMethodModal(true);
      else if (pending === 'transfer') setTransferModal(true);
      else if (pending === 'history') setShowHistory(true);
    }

    return () => {
      unsubPnL(); unsubCrypto(); unsubTradFi(); unsubEq();
      window.clearInterval(pollId);
      channel.unsubscribe();
      window.removeEventListener('desk-open-deposit', openDeposit);
      window.removeEventListener('desk-open-withdraw', openWithdraw);
      window.removeEventListener('desk-open-transfer', openTransfer);
      window.removeEventListener('desk-open-history', openHistory);
    };
  }, []);

  const fetchBalances = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setBalances(SUPPORTED_COINS.map(c => ({
          symbol: c.symbol, name: c.name, logo: c.logo,
          balance: 0, locked_balance: 0, futures_balance: 0,
          price: c.symbol === 'USDT' ? 1 : 0, priceChange24h: 0,
        })));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_balances')
        .select('symbol, balance, locked_balance, futures_balance')
        .eq('user_id', user.id);
      if (error) throw error;

      const map = new Map(
        (data || [])
          .filter(b => !SENTINEL_SYMBOLS.has(b.symbol))
          .map(b => [b.symbol, {
            balance: parseFloat(b.balance) || 0,
            locked: parseFloat(b.locked_balance) || 0,
            futures: parseFloat((b as any).futures_balance) || 0,
          }])
      );

      const priceCache = PriceCache.getInstance();
      const eqMgr = EarnQuestPriceManager.getInstance();

      const quick: Balance[] = SUPPORTED_COINS.map((c) => {
        const ub = map.get(c.symbol) || { balance: 0, locked: 0, futures: 0 };
        let price = 0, priceChange24h = 0;
        if (c.symbol === 'USDT') price = 1;
        else if (c.symbol === 'EQ' || c.symbol === 'EQL') { price = eqMgr.getPrice(); priceChange24h = eqMgr.getChange(); }
        else { const cached = priceCache.get(`${c.symbol}USDT`); if (cached) { price = cached.price; priceChange24h = cached.change24h; } }
        return { symbol: c.symbol, name: c.name, logo: c.logo, balance: ub.balance, locked_balance: ub.locked, futures_balance: ub.futures, price, priceChange24h };
      });

      const supportedSet = new Set(SUPPORTED_COINS.map(c => c.symbol));
      const extra: Balance[] = [];
      map.forEach(({ balance, locked }, sym) => {
        if (supportedSet.has(sym) || balance <= 0) return;
        const cached = priceCache.get(`${sym}USDT`) || getCachedTradFiPrice(BASE_TO_TRADFI[sym] || `${sym}USDT`);
        extra.push({ symbol: sym, name: sym, logo: '', balance, locked_balance: locked, price: cached?.price || 0, priceChange24h: (cached as any)?.change24h || 0 });
      });

      const all = [...quick, ...extra];
      setBalances(all);
      setLoading(false);
      try { localStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify({ ts: Date.now(), balances: all })); } catch {}

      try {
        const res = await fetch('/api/crypto-prices', { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const json: any = await res.json();
          const priceMap = json?.data && typeof json.data === 'object' ? json.data : json;
          if (priceMap && typeof priceMap === 'object') {
            setBalances(prev => prev.map(b => {
              const d = priceMap[b.symbol];
              return d && typeof d.price === 'number' && d.price > 0 ? { ...b, price: d.price, priceChange24h: d.change ?? 0 } : b;
            }));
          }
        }
      } catch {}
    } catch (e) {
      console.error('Error fetching balances:', e);
      setLoading(false);
    }
  };

  const currencyPrice = (cur: CurrencyType): number => {
    if (cur === 'USDT') return 1;
    const c = PriceCache.getInstance().get(`${cur}USDT`);
    return c && c.price > 0 ? c.price : (balances.find(b => b.symbol === cur)?.price || 0);
  };

  const eqHoldingsUSDT = useMemo(
    () => balances.filter(b => b.symbol === 'EQ' || b.symbol === 'EQL').reduce((s, b) => s + b.balance * b.price, 0),
    [balances]
  );
  const spotValueUSDT = useMemo(() => balances.reduce((s, b) => s + b.balance * b.price, 0), [balances]);
  const futuresValueUSDT = useMemo(() => balances.find(b => b.symbol === 'USDT')?.futures_balance || 0, [balances]);
  const totalValueUSDT = useMemo(() => {
    const spotPart = realtimePnL.currentTotalValue > 0
      ? realtimePnL.currentTotalValue
      : balances.filter(b => b.symbol !== 'EQ' && b.symbol !== 'EQL').reduce((s, b) => s + b.balance * b.price, 0);
    return spotPart + eqHoldingsUSDT;
  }, [balances, realtimePnL, eqHoldingsUSDT]);

  const btcPrice = currencyPrice('BTC');
  const displayTotal = totalValueUSDT / (currencyPrice(selectedCurrency) || 1);
  const currencyDecimals = selectedCurrency === 'USDT' ? 2 : selectedCurrency === 'BTC' ? 6 : 4;

  const pnlPositive = realtimePnL.dailyPnL >= 0;

  const rows = useMemo(() => {
    let r = balances.map(b => ({ ...b, value: b.balance * b.price }));
    if (hideSmall) r = r.filter(b => b.value >= 1);
    const q = search.trim().toUpperCase();
    if (q) r = r.filter(b => b.symbol.toUpperCase().includes(q) || b.name.toUpperCase().includes(q));
    return r.sort((a, b) => b.value - a.value);
  }, [balances, hideSmall, search]);

  const allocSpotPct = spotValueUSDT + futuresValueUSDT > 0 ? (spotValueUSDT / (spotValueUSDT + futuresValueUSDT)) * 100 : 100;

  const mask = (s: string) => (hideBalance ? '******' : s);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF]">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Page header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">Assets Overview</h1>
            <p className="text-sm text-[#848E9C] mt-1">Manage your Spot and Futures balances in one place</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2B3139] text-sm text-[#B7BDC6] hover:text-white hover:border-[#474D57] transition-colors"
            >
              <History className="w-4 h-4" /> Transaction History
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
          {/* Estimated balance */}
          <div className="xl:col-span-2 bg-[#181A20] border border-[#2B3139] rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-[#848E9C] text-sm">
                <span>Est. Total Value</span>
                <button onClick={() => setHideBalance(v => !v)} className="hover:text-[#EAECEF] transition-colors" aria-label="Toggle balance visibility">
                  {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyDropdown(v => !v)}
                  className="flex items-center gap-1 text-sm font-semibold text-[#EAECEF] hover:text-[#F0B90B] transition-colors"
                >
                  {selectedCurrency} <ChevronDown className="w-4 h-4" />
                </button>
                {showCurrencyDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyDropdown(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-[#1E2329] rounded-lg shadow-xl z-50 border border-[#2B3139] min-w-[120px] overflow-hidden">
                      {(['USDT', 'BTC', 'ETH', 'BNB'] as CurrencyType[]).map(cur => (
                        <button
                          key={cur}
                          onClick={() => { setSelectedCurrency(cur); setShowCurrencyDropdown(false); }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#2B3139] transition-colors ${selectedCurrency === cur ? 'text-[#F0B90B]' : 'text-[#EAECEF]'}`}
                        >
                          {cur}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="mt-3 h-12 w-72 max-w-full rounded-lg bg-[#2B3139] animate-pulse" />
            ) : (
              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl md:text-4xl font-semibold tabular-nums whitespace-nowrap">
                  {mask(num(displayTotal, currencyDecimals, currencyDecimals))}
                </span>
                <span className="text-base text-[#848E9C] font-medium">{selectedCurrency}</span>
              </div>
            )}

            <div className="mt-1 flex items-center gap-3 text-xs text-[#848E9C] flex-wrap">
              <span className="tabular-nums whitespace-nowrap">≈ £{mask(num(totalValueUSDT * gbpRate))}</span>
              {btcPrice > 0 && (
                <span className="tabular-nums whitespace-nowrap">≈ {mask(num(totalValueUSDT / btcPrice, 6, 6))} BTC</span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-[#848E9C]">Today's PnL</span>
              <span className={`tabular-nums whitespace-nowrap font-medium ${pnlPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {hideBalance ? '******' : `${pnlPositive ? '+' : ''}${num(realtimePnL.dailyPnL)} USDT`}
              </span>
              <span className={`tabular-nums whitespace-nowrap text-xs px-1.5 py-0.5 rounded ${pnlPositive ? 'text-[#0ECB81] bg-[#0ECB81]/10' : 'text-[#F6465D] bg-[#F6465D]/10'}`}>
                {pnlPositive ? '+' : ''}{num(realtimePnL.dailyPnLPercentage)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <button
                onClick={() => setDepositMethodModal(true)}
                className="flex items-center justify-center gap-2 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                <ArrowDownToLine className="w-4 h-4" /> Deposit
              </button>
              <button
                onClick={() => setSendMethodModal(true)}
                className="flex items-center justify-center gap-2 bg-[#2B3139] hover:bg-[#363D47] text-[#EAECEF] font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                <ArrowUpFromLine className="w-4 h-4" /> Withdraw
              </button>
              <button
                onClick={() => setTransferModal(true)}
                className="flex items-center justify-center gap-2 bg-[#2B3139] hover:bg-[#363D47] text-[#EAECEF] font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                <ArrowLeftRight className="w-4 h-4" /> Transfer
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center justify-center gap-2 bg-[#2B3139] hover:bg-[#363D47] text-[#EAECEF] font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                <History className="w-4 h-4" /> History
              </button>
            </div>
          </div>

          {/* Accounts allocation */}
          <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#EAECEF]">Account Allocation</h3>
            <div className="mt-4 h-2 w-full rounded-full bg-[#2B3139] overflow-hidden flex">
              <div className="h-full bg-[#F0B90B]" style={{ width: `${allocSpotPct}%` }} />
              <div className="h-full bg-[#3B7DDE]" style={{ width: `${100 - allocSpotPct}%` }} />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F0B90B] flex-shrink-0" />
                  <span className="text-sm text-[#B7BDC6] truncate">Spot Account</span>
                </div>
                <span className="text-sm font-medium tabular-nums whitespace-nowrap">{mask(num(spotValueUSDT))} USDT</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B7DDE] flex-shrink-0" />
                  <span className="text-sm text-[#B7BDC6] truncate">Futures Account</span>
                </div>
                <span className="text-sm font-medium tabular-nums whitespace-nowrap">{mask(num(futuresValueUSDT))} USDT</span>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-[#2B3139] flex items-center justify-between gap-3">
              <span className="text-sm text-[#848E9C] truncate">Total Estimated</span>
              <span className="text-sm font-semibold tabular-nums whitespace-nowrap">{mask(num(totalValueUSDT))} USDT</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <WithdrawalProcessingBanner />
        </div>

        {/* My Assets table */}
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl mt-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5 flex-wrap">
            <h3 className="text-base font-semibold">My Assets</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-[#B7BDC6] cursor-pointer select-none">
                <input type="checkbox" checked={hideSmall} onChange={e => setHideSmall(e.target.checked)} className="accent-[#F0B90B]" />
                Hide small balances
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search coin"
                  className="bg-[#0B0E11] border border-[#2B3139] rounded-lg pl-9 pr-3 py-2 text-sm text-[#EAECEF] placeholder-[#848E9C] focus:outline-none focus:border-[#474D57] w-44"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="text-xs text-[#848E9C] border-y border-[#2B3139]">
                  <th className="text-left font-medium px-5 py-3">Coin</th>
                  <th className="text-right font-medium px-5 py-3">Amount</th>
                  <th className="text-right font-medium px-5 py-3">Coin Price / 24h</th>
                  <th className="text-right font-medium px-5 py-3">Value (USDT)</th>
                  <th className="text-right font-medium px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#2B3139]/60">
                      <td className="px-5 py-4"><div className="h-8 w-32 rounded bg-[#2B3139] animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-20 ml-auto rounded bg-[#2B3139] animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-24 ml-auto rounded bg-[#2B3139] animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-24 ml-auto rounded bg-[#2B3139] animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-28 ml-auto rounded bg-[#2B3139] animate-pulse" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-[#848E9C] text-sm">No assets found</td>
                  </tr>
                ) : (
                  rows.map((coin) => {
                    const change = coin.priceChange24h || 0;
                    const up = change >= 0;
                    const canWithdraw = coin.balance > 0;
                    return (
                      <tr key={coin.symbol} className="border-b border-[#2B3139]/60 hover:bg-[#1E2329] transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 flex-shrink-0">
                              {isMetalSymbol(coin.symbol)
                                ? <MetalIcon symbol={coin.symbol} size={32} />
                                : isTradFiIcon(coin.symbol)
                                ? <TradFiIcon symbol={coin.symbol} size={32} />
                                : <CoinLogo symbol={coin.symbol} dbUrl={coin.logo} />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate">{coin.symbol}</div>
                              <div className="text-xs text-[#848E9C] truncate">{coin.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="text-sm font-medium tabular-nums whitespace-nowrap">{mask(num(coin.balance, 2, 6))}</div>
                          {coin.locked_balance > 0 && !hideBalance && (
                            <div className="text-xs text-[#F0B90B] flex items-center justify-end gap-1 tabular-nums whitespace-nowrap">
                              <Lock className="w-3 h-3" /> {num(coin.locked_balance, 2, 6)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="text-sm tabular-nums whitespace-nowrap">{coin.symbol === 'USDT' ? '1.00' : num(coin.price)}</div>
                          <div className={`text-xs tabular-nums whitespace-nowrap ${up ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {up ? '+' : ''}{num(change)}%
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="text-sm font-medium tabular-nums whitespace-nowrap">{mask(num(coin.value))}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-3 text-xs font-medium whitespace-nowrap">
                            <button
                              onClick={() => setDepositModal({ open: true, coin: coin.symbol, name: coin.name })}
                              className="text-[#F0B90B] hover:text-[#FCD535] transition-colors"
                            >
                              Deposit
                            </button>
                            {canWithdraw && (
                              <button
                                onClick={() => setWithdrawalModal({ open: true, coin: coin.symbol, name: coin.name, balance: coin.balance })}
                                className="text-[#B7BDC6] hover:text-white transition-colors"
                              >
                                Withdraw
                              </button>
                            )}
                            <button
                              onClick={() => onNavigate('trade')}
                              className="text-[#B7BDC6] hover:text-white transition-colors"
                            >
                              Trade
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DepositModal
        isOpen={depositModal.open}
        onClose={() => setDepositModal({ open: false, coin: '', name: '' })}
        coinSymbol={depositModal.coin}
        coinName={depositModal.name}
      />
      <WithdrawalModal
        isOpen={withdrawalModal.open}
        onClose={() => setWithdrawalModal({ open: false, coin: '', name: '', balance: 0 })}
        coinSymbol={withdrawalModal.coin}
        coinName={withdrawalModal.name}
        availableBalance={withdrawalModal.balance}
      />
      <DepositMethodModal isOpen={depositMethodModal} onClose={() => setDepositMethodModal(false)} />
      <SendMethodModal isOpen={sendMethodModal} onClose={() => setSendMethodModal(false)} />
      <TransferModal isOpen={transferModal} onClose={() => setTransferModal(false)} />
      {showHistory && <AssetsHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}

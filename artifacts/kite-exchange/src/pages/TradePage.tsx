import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Star, Bell, ChevronDown, TrendingUp, TrendingDown, X, Search, MoreHorizontal, RefreshCw } from 'lucide-react';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';
import { BNCPriceManager } from '../lib/bnc-price';
import { fetchBinanceTicker, fetchBinanceDepth } from '../lib/binance';
import { fetchCoinGeckoPrices } from '../lib/coingecko-price';
import { PriceCache } from '../lib/price-cache';
import { supabase, getCurrentUser } from '../lib/supabase';
import { TradingService } from '../lib/trading-service';
import QuickTradeModal from '../components/QuickTradeModal';
import SpotOpenOrders from '../components/SpotOpenOrders';
import BinanceLightweightChart from '../components/BinanceLightweightChart';
import CoinLogo from '../components/CoinLogo';
import { getProxiedLogoUrl } from '../lib/logo-utils';
import CopyTradingSection, { ActiveCopyPositions } from '../components/CopyTradingSection';
import { formatPrice as sharedFormatPrice, formatAmount as sharedFormatAmount, formatVolume as sharedFormatVolume, getPriceDecimals } from '../lib/format-utils';
import CoinInfoTab from '../components/CoinInfoTab';
import TradingDataTab from '../components/TradingDataTab';
import { getEQVolume } from '../lib/eq-volume-service';
import { getCachedTradFiPrice, startTradFiPriceUpdater } from '../lib/tradfi-price-service';
import MetalIcon, { isMetalSymbol } from '../components/MetalIcon';
import TradFiIcon, { isTradFiIcon } from '../components/TradFiIcon';
import { getUserRestrictions } from '../lib/user-restrictions';
import type { UserRestrictions } from '../lib/user-restrictions';

// ─── Metal × BTC/ETH cross pairs (Spot) ──────────────────────────────────────
interface MetalCrossPair {
  symbol: string;
  base: string;
  quote: 'BTC' | 'ETH';
  tradfiSymbol: string;
  name: string;
  logo: string;
}

const METAL_CROSS_PAIRS: MetalCrossPair[] = [
  // ── Precious Metals ──────────────────────────────────────────
  { symbol: 'XAUBTC',     base: 'XAU',    quote: 'BTC', tradfiSymbol: 'XAUUSDT',    name: 'Gold',           logo: 'https://assets.staticimg.com/cms/media/1lB3PkckFDyfxz6VudCEACBeRRBi6sQQ7DDjFFpvgUA.png' },
  { symbol: 'XAUETH',     base: 'XAU',    quote: 'ETH', tradfiSymbol: 'XAUUSDT',    name: 'Gold',           logo: 'https://assets.staticimg.com/cms/media/1lB3PkckFDyfxz6VudCEACBeRRBi6sQQ7DDjFFpvgUA.png' },
  { symbol: 'XAGBTC',     base: 'XAG',    quote: 'BTC', tradfiSymbol: 'XAGUSDT',    name: 'Silver',         logo: 'https://assets.staticimg.com/cms/media/3uuqWjtaP8Cn1nBpIL_Q6tB7C6jP5Q4G0L6Z1Q6uOlg.png' },
  { symbol: 'XAGETH',     base: 'XAG',    quote: 'ETH', tradfiSymbol: 'XAGUSDT',    name: 'Silver',         logo: 'https://assets.staticimg.com/cms/media/3uuqWjtaP8Cn1nBpIL_Q6tB7C6jP5Q4G0L6Z1Q6uOlg.png' },
  { symbol: 'XPTBTC',     base: 'XPT',    quote: 'BTC', tradfiSymbol: 'XPTUSDT',    name: 'Platinum',       logo: '' },
  { symbol: 'XPTETH',     base: 'XPT',    quote: 'ETH', tradfiSymbol: 'XPTUSDT',    name: 'Platinum',       logo: '' },
  { symbol: 'XPDBTC',     base: 'XPD',    quote: 'BTC', tradfiSymbol: 'XPDUSDT',    name: 'Palladium',      logo: '' },
  { symbol: 'XPDETH',     base: 'XPD',    quote: 'ETH', tradfiSymbol: 'XPDUSDT',    name: 'Palladium',      logo: '' },
  { symbol: 'COPPERBTC',  base: 'COPPER', quote: 'BTC', tradfiSymbol: 'COPPERUSDT', name: 'Copper',         logo: 'https://assets.parqet.com/logos/symbol/CPER?format=jpg' },
  { symbol: 'COPPERETH',  base: 'COPPER', quote: 'ETH', tradfiSymbol: 'COPPERUSDT', name: 'Copper',         logo: 'https://assets.parqet.com/logos/symbol/CPER?format=jpg' },
  // ── Energy ───────────────────────────────────────────────────
  { symbol: 'OILBTC',     base: 'OIL',    quote: 'BTC', tradfiSymbol: 'WTIUSDT',    name: 'Crude Oil (WTI)',logo: 'https://assets.parqet.com/logos/symbol/USO?format=jpg' },
  { symbol: 'OILETH',     base: 'OIL',    quote: 'ETH', tradfiSymbol: 'WTIUSDT',    name: 'Crude Oil (WTI)',logo: 'https://assets.parqet.com/logos/symbol/USO?format=jpg' },
  { symbol: 'BRTBTC',     base: 'BRENT',  quote: 'BTC', tradfiSymbol: 'BRENTUSDT',  name: 'Brent Oil',      logo: 'https://assets.parqet.com/logos/symbol/BNO?format=jpg' },
  { symbol: 'BRTETH',     base: 'BRENT',  quote: 'ETH', tradfiSymbol: 'BRENTUSDT',  name: 'Brent Oil',      logo: 'https://assets.parqet.com/logos/symbol/BNO?format=jpg' },
  { symbol: 'NATGASBTC',  base: 'NATGAS', quote: 'BTC', tradfiSymbol: 'NATGASUSDT', name: 'Natural Gas',    logo: 'https://assets.parqet.com/logos/symbol/UNG?format=jpg' },
  { symbol: 'NATGASETH',  base: 'NATGAS', quote: 'ETH', tradfiSymbol: 'NATGASUSDT', name: 'Natural Gas',    logo: 'https://assets.parqet.com/logos/symbol/UNG?format=jpg' },
  // ── Agriculture ──────────────────────────────────────────────
  { symbol: 'COFFEEBTC',  base: 'COFFEE', quote: 'BTC', tradfiSymbol: 'COFFEEUSDT', name: 'Coffee',         logo: 'https://assets.parqet.com/logos/symbol/JO?format=jpg' },
  { symbol: 'COFFEEETH',  base: 'COFFEE', quote: 'ETH', tradfiSymbol: 'COFFEEUSDT', name: 'Coffee',         logo: 'https://assets.parqet.com/logos/symbol/JO?format=jpg' },
  { symbol: 'COCOABTC',   base: 'COCOA',  quote: 'BTC', tradfiSymbol: 'COCOAUSDT',  name: 'Cocoa',          logo: 'https://assets.parqet.com/logos/symbol/NIB?format=jpg' },
  { symbol: 'COCOAETH',   base: 'COCOA',  quote: 'ETH', tradfiSymbol: 'COCOAUSDT',  name: 'Cocoa',          logo: 'https://assets.parqet.com/logos/symbol/NIB?format=jpg' },
  { symbol: 'SUGARBTC',   base: 'SUGAR',  quote: 'BTC', tradfiSymbol: 'SUGARUSDT',  name: 'Sugar',          logo: 'https://assets.parqet.com/logos/symbol/CANE?format=jpg' },
  { symbol: 'SUGARETH',   base: 'SUGAR',  quote: 'ETH', tradfiSymbol: 'SUGARUSDT',  name: 'Sugar',          logo: 'https://assets.parqet.com/logos/symbol/CANE?format=jpg' },
  { symbol: 'WHEATBTC',   base: 'WHEAT',  quote: 'BTC', tradfiSymbol: 'WHEATUSDT',  name: 'Wheat',          logo: 'https://assets.parqet.com/logos/symbol/WEAT?format=jpg' },
  { symbol: 'WHEATETH',   base: 'WHEAT',  quote: 'ETH', tradfiSymbol: 'WHEATUSDT',  name: 'Wheat',          logo: 'https://assets.parqet.com/logos/symbol/WEAT?format=jpg' },
  { symbol: 'CORNBTC',    base: 'CORN',   quote: 'BTC', tradfiSymbol: 'CORNUSDT',   name: 'Corn',           logo: 'https://assets.parqet.com/logos/symbol/CORN?format=jpg' },
  { symbol: 'CORNETH',    base: 'CORN',   quote: 'ETH', tradfiSymbol: 'CORNUSDT',   name: 'Corn',           logo: 'https://assets.parqet.com/logos/symbol/CORN?format=jpg' },
  { symbol: 'SOYBEANBTC', base: 'SOYBEAN',quote: 'BTC', tradfiSymbol: 'SOYUSDT',    name: 'Soybean',        logo: 'https://assets.parqet.com/logos/symbol/SOYB?format=jpg' },
  { symbol: 'SOYBEANETH', base: 'SOYBEAN',quote: 'ETH', tradfiSymbol: 'SOYUSDT',    name: 'Soybean',        logo: 'https://assets.parqet.com/logos/symbol/SOYB?format=jpg' },
  // ── Indices ──────────────────────────────────────────────────
  { symbol: 'SPXBTC',     base: 'SPX',    quote: 'BTC', tradfiSymbol: 'SP500USDT',  name: 'S&P 500',        logo: 'https://assets.parqet.com/logos/symbol/SPY?format=jpg' },
  { symbol: 'SPXETH',     base: 'SPX',    quote: 'ETH', tradfiSymbol: 'SP500USDT',  name: 'S&P 500',        logo: 'https://assets.parqet.com/logos/symbol/SPY?format=jpg' },
  { symbol: 'NDXBTC',     base: 'NDX',    quote: 'BTC', tradfiSymbol: 'NAS100USDT', name: 'Nasdaq 100',     logo: 'https://assets.parqet.com/logos/symbol/QQQ?format=jpg' },
  { symbol: 'NDXETH',     base: 'NDX',    quote: 'ETH', tradfiSymbol: 'NAS100USDT', name: 'Nasdaq 100',     logo: 'https://assets.parqet.com/logos/symbol/QQQ?format=jpg' },
  { symbol: 'DJIBTC',     base: 'DJI',    quote: 'BTC', tradfiSymbol: 'DJIA30USDT', name: 'Dow Jones',      logo: 'https://assets.parqet.com/logos/symbol/DIA?format=jpg' },
  { symbol: 'DJIETH',     base: 'DJI',    quote: 'ETH', tradfiSymbol: 'DJIA30USDT', name: 'Dow Jones',      logo: 'https://assets.parqet.com/logos/symbol/DIA?format=jpg' },
  { symbol: 'DAXBTC',     base: 'DAX',    quote: 'BTC', tradfiSymbol: 'DAXUSDT',    name: 'DAX 40',         logo: 'https://flagcdn.com/w80/de.png' },
  { symbol: 'DAXETH',     base: 'DAX',    quote: 'ETH', tradfiSymbol: 'DAXUSDT',    name: 'DAX 40',         logo: 'https://flagcdn.com/w80/de.png' },
  { symbol: 'FTSEBTC',    base: 'FTSE',   quote: 'BTC', tradfiSymbol: 'FTSE100USDT',name: 'FTSE 100',       logo: 'https://flagcdn.com/w80/gb.png' },
  { symbol: 'FTSEETH',    base: 'FTSE',   quote: 'ETH', tradfiSymbol: 'FTSE100USDT',name: 'FTSE 100',       logo: 'https://flagcdn.com/w80/gb.png' },
  { symbol: 'NKYBTC',     base: 'NKY',    quote: 'BTC', tradfiSymbol: 'NI225USDT',  name: 'Nikkei 225',     logo: 'https://flagcdn.com/w80/jp.png' },
  { symbol: 'NKYETH',     base: 'NKY',    quote: 'ETH', tradfiSymbol: 'NI225USDT',  name: 'Nikkei 225',     logo: 'https://flagcdn.com/w80/jp.png' },
];

const METAL_CROSS_SYMBOLS = new Set(METAL_CROSS_PAIRS.map(p => p.symbol));

const TRADFI_SECTIONS: { label: string; emoji: string; color: string; bases: Set<string> }[] = [
  { label: 'Precious Metals', emoji: '🥇', color: '#F0B90B', bases: new Set(['XAU','XAG','XPT','XPD','COPPER']) },
  { label: 'Energy',          emoji: '🛢️', color: '#F97316', bases: new Set(['OIL','BRENT','NATGAS']) },
  { label: 'Agriculture',     emoji: '🌾', color: '#84CC16', bases: new Set(['COFFEE','COCOA','SUGAR','WHEAT','CORN','SOYBEAN']) },
  { label: 'Indices',         emoji: '📈', color: '#3B82F6', bases: new Set(['SPX','NDX','DJI','DAX','FTSE','NKY']) },
];

function isMetalCross(sym: string): boolean { return METAL_CROSS_SYMBOLS.has(sym); }
function getMetalCross(sym: string): MetalCrossPair | undefined { return METAL_CROSS_PAIRS.find(p => p.symbol === sym); }

function computeMetalCrossPrice(pair: MetalCrossPair): number {
  const metalData = getCachedTradFiPrice(pair.tradfiSymbol);
  const metalUsd = metalData?.price || 0;
  const pc = PriceCache.getInstance();
  const quoteData = pc.get(`${pair.quote}USDT`);
  const quoteUsd = quoteData?.price || (pair.quote === 'BTC' ? 95000 : 1800);
  return metalUsd > 0 && quoteUsd > 0 ? metalUsd / quoteUsd : 0;
}

interface OrderBookItem {
  price: number;
  amount: number;
  total: number;
}

interface Trade {
  price: number;
  amount: number;
  time: string;
  isBuy: boolean;
}

interface Coin {
  symbol: string;
  name: string;
  logo: string;
  binance_symbol?: string;
}

const INDEPENDENT_SYMBOLS = new Set(['EQ', 'BNC', 'PAYAI', 'SGP', 'POWERAI', 'SZNP', 'PUNCH']);

function getIndepManager(symbol: string) {
  if (symbol === 'EQ') return EarnQuestPriceManager.getInstance();
  if (symbol === 'BNC') return BNCPriceManager.getInstance();
  if (symbol === 'PAYAI') return PayAIPriceManager.getInstance();
  if (symbol === 'SGP') return SGPPriceManager.getInstance();
  if (symbol === 'POWERAI') return PowerAIPriceManager.getInstance();
  if (symbol === 'SZNP') return SZNPPriceManager.getInstance();
  if (symbol === 'PUNCH') return PunchPriceManager.getInstance();
  return null;
}

function getInitialSymbol(): string {
  const stored = localStorage.getItem('selectedCoinSymbol');
  if (stored) return stored;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('symbol') || 'BTC';
}

export default function TradePage({ onBack }: { onBack?: () => void }) {
  const [allCoins, setAllCoins] = useState<Coin[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(getInitialSymbol);
  const [currentPrice, setCurrentPrice] = useState(() => {
    const sym = getInitialSymbol();
    const mgr = getIndepManager(sym);
    if (mgr) return mgr.getPrice() || 0;
    return 0;
  });
  const [change24h, setChange24h] = useState(() => {
    const sym = getInitialSymbol();
    const mgr = getIndepManager(sym);
    if (mgr) return mgr.getChange() || 0;
    return 0;
  });
  const safeHigh = (price: number, stored: number) => {
    if (price <= 0) return stored || 0;
    if (stored > 0 && stored >= price * 0.95 && stored <= price * 1.5) return stored;
    return price * (1.01 + Math.random() * 0.025);
  };
  const safeLow = (price: number, stored: number) => {
    if (price <= 0) return stored || 0;
    if (stored > 0 && stored < price) return stored;
    return price * (0.965 + Math.random() * 0.025);
  };

  const [high24h, setHigh24h] = useState(() => {
    const sym = getInitialSymbol();
    const mgr = getIndepManager(sym);
    if (mgr) return safeHigh(mgr.getPrice(), mgr.getHigh24h());
    return 0;
  });
  const [low24h, setLow24h] = useState(() => {
    const sym = getInitialSymbol();
    const mgr = getIndepManager(sym);
    if (mgr) return safeLow(mgr.getPrice(), mgr.getLow24h());
    return 0;
  });
  const [volume24h, setVolume24h] = useState(() => {
    const sym = getInitialSymbol();
    const mgr = getIndepManager(sym);
    if (mgr) return sym === 'EQ' ? getEQVolume() : (mgr.getMarketCap() || 0);
    return 0;
  });
  const [volumeBase, setVolumeBase] = useState(() => {
    const sym = getInitialSymbol();
    const mgr = getIndepManager(sym);
    if (mgr) return sym === 'EQ' ? getEQVolume() / 2 : ((mgr.getMarketCap() || 0) / 2);
    return 0;
  });
  const [activeTab, setActiveTab] = useState<'price' | 'info' | 'trading-data' | 'square' | 'trade'>('price');
  const [timeframe, setTimeframe] = useState('1M');
  const [activeIndicator, setActiveIndicator] = useState('MA');
  const [orderBookTab, setOrderBookTab] = useState<'order-book' | 'trades'>('order-book');
  const [bidOrders, setBidOrders] = useState<OrderBookItem[]>([]);
  const [askOrders, setAskOrders] = useState<OrderBookItem[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [showCoinSelector, setShowCoinSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');

  useEffect(() => {
    console.log('Order Type changed to:', orderType);
    console.log('Open Orders:', openOrders);
    console.log('Active Order Tab:', activeOrderTab);
  }, [orderType]);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [isManualAmountChange, setIsManualAmountChange] = useState(false);
  const [isManualPriceChange, setIsManualPriceChange] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [btcBalance, setBtcBalance] = useState(0);
  const [ethBalance, setEthBalance] = useState(0);
  const [selectorMarketTab, setSelectorMarketTab] = useState<'crypto' | 'metals'>('crypto');
  const [userRestrictions, setUserRestrictions] = useState<UserRestrictions | null>(null);
  const priceManager = useRef(EarnQuestPriceManager.getInstance());
  const orderBookScrollRef = useRef<HTMLDivElement>(null);
  const orderBookPriceRef = useRef<HTMLDivElement>(null);
  const hasScrolledToPrice = useRef(false);
  const [showQuickTrade, setShowQuickTrade] = useState(false);
  const [showUnitPreference, setShowUnitPreference] = useState(false);
  const [unitPreference, setUnitPreference] = useState<'asset' | 'usdt'>('asset');
  const [loading, setLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [activeOrderTab, setActiveOrderTab] = useState<'open' | 'holdings' | 'bots'>('open');
  const [coinPrices, setCoinPrices] = useState<Record<string, { price: number; change: number }>>({});
  const [activeCopyCount, setActiveCopyCount] = useState(0);
  const [showStopCopyConfirm, setShowStopCopyConfirm] = useState<string | null>(null);
  const activeSymbolRef = useRef(getInitialSymbol());
  const fetchGenRef = useRef(0);
  const currentPriceRef = useRef<number>(0);

  const changeSymbol = (newSymbol: string) => {
    activeSymbolRef.current = newSymbol;
    fetchGenRef.current += 1;
    setSelectedSymbol(newSymbol);
    setBidOrders([]);
    setAskOrders([]);
    setRecentTrades([]);
    setAmount('');
    setSliderValue(0);
    setIsManualPriceChange(false);
    setIsManualAmountChange(false);
    hasScrolledToPrice.current = false;

    const indepMgr = getIndepManager(newSymbol);
    if (indepMgr) {
      const p = indepMgr.getPrice();
      setCurrentPrice(p);
      setChange24h(indepMgr.getChange());
      setHigh24h(safeHigh(p, indepMgr.getHigh24h()));
      setLow24h(safeLow(p, indepMgr.getLow24h()));
      setVolume24h(newSymbol === 'EQ' ? getEQVolume() : indepMgr.getMarketCap());
      setVolumeBase(newSymbol === 'EQ' ? getEQVolume() / 2 : indepMgr.getMarketCap() / 2);
      setPrice(p.toFixed(getPriceDecimals(p)));
    } else {
      const pc = PriceCache.getInstance();
      const coin = allCoins.find(c => c.symbol === newSymbol);
      const bs = coin?.binance_symbol || `${newSymbol}USDT`;
      const cached = pc.get(bs);
      if (cached && cached.price > 0) {
        setCurrentPrice(cached.price);
        setChange24h(cached.change24h);
        setHigh24h(cached.high24h);
        setLow24h(cached.low24h);
        setVolume24h(cached.volume);
        setVolumeBase(cached.volume / 2);
        setPrice(cached.price.toFixed(getPriceDecimals(cached.price)));
      } else {
        setCurrentPrice(0);
        setChange24h(0);
        setHigh24h(0);
        setLow24h(0);
        setVolume24h(0);
        setVolumeBase(0);
        setPrice('');
      }
    }
  };

  useEffect(() => {
    const fetchCoins = async () => {
      const { data: coins, error } = await supabase
        .from('supported_coins')
        .select('symbol, name, logo_url, binance_symbol')
        .eq('is_active', true)
        .eq('is_spot_enabled', true)
        .order('sort_order');

      if (coins && !error) {
        const STABLECOINS = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'USDD', 'FRAX', 'PYUSD', 'EURC']);
        const PRIORITY = ['BNC', 'EQ', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT'];

        const mapped = coins
          .filter(coin => coin.symbol !== 'EQ' && coin.symbol !== 'BNC')
          .map(coin => ({
            symbol: coin.symbol,
            name: coin.name,
            logo: getProxiedLogoUrl(coin.logo_url) || '',
            binance_symbol: coin.binance_symbol
          }));

        mapped.sort((a, b) => {
          const aStable = STABLECOINS.has(a.symbol);
          const bStable = STABLECOINS.has(b.symbol);
          if (aStable && !bStable) return 1;
          if (!aStable && bStable) return -1;
          if (aStable && bStable) return a.symbol.localeCompare(b.symbol);
          const aPri = PRIORITY.indexOf(a.symbol);
          const bPri = PRIORITY.indexOf(b.symbol);
          if (aPri !== -1 && bPri !== -1) return aPri - bPri;
          if (aPri !== -1) return -1;
          if (bPri !== -1) return 1;
          return a.symbol.localeCompare(b.symbol);
        });

        const bncCoin = { symbol: 'BNC', name: 'Basonce', logo: '/bnc-logo.png', binance_symbol: null };
        const eqCoin = { symbol: 'EQ', name: 'EarnQuest', logo: '/earnquest-logo-icon-2.png', binance_symbol: null };
        const metalCoins = METAL_CROSS_PAIRS.map(p => ({
          symbol: p.symbol,
          name: `${p.name} / ${p.quote}`,
          logo: p.logo,
          binance_symbol: null,
        }));
        setAllCoins([bncCoin, eqCoin, ...mapped, ...metalCoins]);
      }
    };

    fetchCoins();

    const pc = PriceCache.getInstance();
    if (!pc.isReady()) {
      pc.init();
    }

    const stopTradFi = startTradFiPriceUpdater();

    localStorage.removeItem('selectedCoinSymbol');

    const storedSide = localStorage.getItem('selectedCoinSide');
    if (storedSide === 'buy' || storedSide === 'sell') {
      setTradeSide(storedSide);
      localStorage.removeItem('selectedCoinSide');
    }

    const urlSide = new URLSearchParams(window.location.search).get('side');
    if (urlSide === 'buy' || urlSide === 'sell') {
      setTradeSide(urlSide);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalances(session.user.id);
        getUserRestrictions().then(r => setUserRestrictions(r));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalances(session.user.id);
        getUserRestrictions().then(r => setUserRestrictions(r));
      } else {
        setUserRestrictions(null);
      }
    });

    const handleNavigateToTrade = (event: any) => {
      const { symbol, side } = event.detail || {};

      if (symbol) {
        changeSymbol(symbol);
      }

      if (side === 'buy' || side === 'sell') {
        setTradeSide(side);
      }
    };

    window.addEventListener('navigate-to-trade', handleNavigateToTrade);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('navigate-to-trade', handleNavigateToTrade);
    };
  }, []);

  useEffect(() => {
    fetchInitialData();
    if (user?.id) {
      loadBalances(user.id);
    }
  }, [selectedSymbol]);

  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  useEffect(() => {
    if (INDEPENDENT_SYMBOLS.has(selectedSymbol)) {
      const mgr = getIndepManager(selectedSymbol);
      // When price manager ticks → update price, orderbook, trades all at once
      const unsubscribe = mgr ? mgr.subscribe(() => {
        updatePrice();
        updateOrderBook();
        updateTrades();
      }) : () => {};

      // Fallback interval keeps things fresh if subscription misses a tick
      const interval = setInterval(() => {
        updateOrderBook();
        updateTrades();
      }, 3000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    } else {
      const priceInterval = setInterval(() => {
        updatePrice();
      }, 400);

      const orderBookInterval = setInterval(() => {
        updateOrderBook();
      }, 1500);

      const tradesInterval = setInterval(() => {
        updateTrades();
      }, 1200);

      return () => {
        clearInterval(priceInterval);
        clearInterval(orderBookInterval);
        clearInterval(tradesInterval);
      };
    }
  }, [selectedSymbol]);

  useEffect(() => {
    if (user?.id) {
      loadBalances(user.id);
      fetchOpenOrders();
      fetchOrderHistory();

      const ordersChannel = supabase
        .channel('spot_orders_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'spot_orders',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Order change detected:', payload);
            fetchOpenOrders();
            fetchOrderHistory();
          }
        )
        .subscribe();

      return () => {
        ordersChannel.unsubscribe();
      };
    }
  }, [selectedSymbol, user]);

  useEffect(() => {
    setAmount('');
    setSliderValue(0);
    setIsManualAmountChange(false);
  }, [tradeSide]);

  useEffect(() => {
    setAmount('');
    setSliderValue(0);
    setIsManualAmountChange(false);
  }, [unitPreference]);

  useEffect(() => {
    if (showCoinSelector) {
      const pc = PriceCache.getInstance();
      if (!pc.isReady()) {
        pc.init().then(() => loadCoinPricesFromCache());
      } else {
        loadCoinPricesFromCache();
      }

      const unsub = pc.subscribe(() => loadCoinPricesFromCache());
      return () => unsub();
    }
  }, [showCoinSelector, allCoins]);

  const loadCoinPricesFromCache = () => {
    const pc = PriceCache.getInstance();
    const prices: Record<string, { price: number; change: number }> = {};

    for (const coin of allCoins) {
      const indepMgr = getIndepManager(coin.symbol);
      if (indepMgr) {
        prices[coin.symbol] = {
          price: indepMgr.getPrice(),
          change: indepMgr.getChange()
        };
      } else {
        const binanceSymbol = coin.binance_symbol || `${coin.symbol}USDT`;
        const cached = pc.get(binanceSymbol);
        if (cached) {
          prices[coin.symbol] = { price: cached.price, change: cached.change24h };
        }
      }
    }

    setCoinPrices(prices);
  };

  useEffect(() => {
    if (isManualAmountChange) {
      return;
    }

    if (sliderValue > 0) {
      const metalInfo = getMetalCross(activeSymbolRef.current);
      const effectiveQuoteBal = metalInfo
        ? (metalInfo.quote === 'BTC' ? btcBalance : ethBalance)
        : usdtBalance;

      if (tradeSide === 'buy' && currentPrice > 0 && effectiveQuoteBal > 0) {
        const quoteToSpend = (effectiveQuoteBal * sliderValue) / 100;
        if (unitPreference === 'usdt') {
          setAmount(quoteToSpend.toFixed(metalInfo ? 8 : 2));
        } else {
          const calculatedAmount = quoteToSpend / currentPrice;
          setAmount(calculatedAmount.toFixed(8));
        }
      } else if (tradeSide === 'sell' && coinBalance > 0) {
        if (unitPreference === 'usdt') {
          const quoteValue = (coinBalance * sliderValue * currentPrice) / 100;
          setAmount(quoteValue.toFixed(metalInfo ? 8 : 2));
        } else {
          const calculatedAmount = (coinBalance * sliderValue) / 100;
          setAmount(calculatedAmount.toFixed(8));
        }
      }
    } else if (sliderValue === 0) {
      setAmount('');
    }
  }, [sliderValue, tradeSide, usdtBalance, btcBalance, ethBalance, coinBalance, isManualAmountChange, unitPreference, currentPrice]);

  const loadBalances = async (userId: string) => {
    const { data: balances } = await supabase
      .from('user_balances')
      .select('symbol, balance')
      .eq('user_id', userId);

    if (balances) {
      const usdt = balances.find(b => b.symbol === 'USDT');
      const btc  = balances.find(b => b.symbol === 'BTC');
      const eth  = balances.find(b => b.symbol === 'ETH');
      const metalPairInfo = getMetalCross(selectedSymbol);
      const coinSym = metalPairInfo ? metalPairInfo.base : selectedSymbol;
      const coin = balances.find(b => b.symbol === coinSym);

      setUsdtBalance(parseFloat(usdt?.balance || '0'));
      setBtcBalance(parseFloat(btc?.balance || '0'));
      setEthBalance(parseFloat(eth?.balance || '0'));
      setCoinBalance(parseFloat(coin?.balance || '0'));
    }
  };

  const fetchOpenOrders = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('No user found for fetching orders');
        return;
      }

      console.log('Fetching orders for user:', user.id);

      const { data, error } = await supabase
        .from('spot_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      console.log('Fetched orders:', data);
      setOpenOrders(data || []);
    } catch (error) {
      console.error('Error fetching open orders:', error);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('spot_orders')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['filled', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching order history:', error);
        throw error;
      }

      setOrderHistory(data || []);
    } catch (error) {
      console.error('Error fetching order history:', error);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('spot_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      setTradeSuccess('Order cancelled successfully');
      fetchOpenOrders();
      fetchOrderHistory();

      setTimeout(() => {
        setTradeSuccess('');
      }, 3000);
    } catch (error: any) {
      setTradeError(error.message || 'Failed to cancel order');
    }
  };

  const cancelAllOrders = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('spot_orders')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      setTradeSuccess(`All open orders cancelled successfully`);
      fetchOpenOrders();
      fetchOrderHistory();

      setTimeout(() => {
        setTradeSuccess('');
      }, 3000);
    } catch (error: any) {
      setTradeError(error.message || 'Failed to cancel orders');
    }
  };

  const handleTrade = async () => {
    setTradeError('');
    setTradeSuccess('');

    // ── Pair Lock check ───────────────────────────────────────────
    if (userRestrictions?.pair_lock_enabled) {
      const metalInfo = getMetalCross(selectedSymbol);
      const pairKey = metalInfo
        ? `${metalInfo.base}/${metalInfo.quote}`
        : `${selectedSymbol}/USDT`;
      if (!userRestrictions.allowed_pairs.includes(pairKey)) {
        setTradeError(`Bu parite kilitli. Yalnızca şu paritelerle işlem yapabilirsiniz: ${userRestrictions.allowed_pairs.join(', ')}`);
        return;
      }
    }

    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) {
      setTradeError('Please enter a valid amount');
      return;
    }

    let quantity = 0;
    let tradePrice = currentPrice;

    if (orderType === 'limit') {
      if (!price || parseFloat(price) <= 0) {
        setTradeError('Please enter a valid limit price');
        return;
      }
      tradePrice = parseFloat(price);
    }

    if (unitPreference === 'usdt') {
      quantity = amountValue / tradePrice;
    } else {
      quantity = amountValue;
    }

    const metalCrossInfo = getMetalCross(selectedSymbol);
    const quoteSymLocal = metalCrossInfo?.quote || 'USDT';
    const quoteBalLocal = metalCrossInfo ? (metalCrossInfo.quote === 'BTC' ? btcBalance : ethBalance) : usdtBalance;
    const baseSymLocal  = metalCrossInfo?.base || selectedSymbol;

    if (tradeSide === 'buy' && (quantity * tradePrice) > quoteBalLocal) {
      setTradeError(`Insufficient ${quoteSymLocal} balance`);
      return;
    }

    if (tradeSide === 'sell' && quantity > coinBalance) {
      setTradeError(`Insufficient ${baseSymLocal} balance`);
      return;
    }

    setLoading(true);

    try {
      if (metalCrossInfo) {
        const currentUser = await getCurrentUser();
        if (!currentUser) { setTradeError('Please login to trade'); return; }
        const total = quantity * tradePrice;
        if (tradeSide === 'buy') {
          await supabase.from('user_balances').update({ balance: (quoteBalLocal - total).toFixed(8) }).eq('user_id', currentUser.id).eq('symbol', quoteSymLocal);
          const { data: baseBal } = await supabase.from('user_balances').select('balance').eq('user_id', currentUser.id).eq('symbol', baseSymLocal).maybeSingle();
          const newBase = parseFloat(baseBal?.balance || '0') + quantity;
          if (baseBal) {
            await supabase.from('user_balances').update({ balance: newBase.toFixed(8) }).eq('user_id', currentUser.id).eq('symbol', baseSymLocal);
          } else {
            await supabase.from('user_balances').insert({ user_id: currentUser.id, symbol: baseSymLocal, balance: newBase.toFixed(8) });
          }
        } else {
          const newBase = coinBalance - quantity;
          await supabase.from('user_balances').update({ balance: newBase.toFixed(8) }).eq('user_id', currentUser.id).eq('symbol', baseSymLocal);
          const { data: quoteBal } = await supabase.from('user_balances').select('balance').eq('user_id', currentUser.id).eq('symbol', quoteSymLocal).maybeSingle();
          const newQuote = parseFloat(quoteBal?.balance || '0') + total;
          if (quoteBal) {
            await supabase.from('user_balances').update({ balance: newQuote.toFixed(8) }).eq('user_id', currentUser.id).eq('symbol', quoteSymLocal);
          } else {
            await supabase.from('user_balances').insert({ user_id: currentUser.id, symbol: quoteSymLocal, balance: newQuote.toFixed(8) });
          }
        }
        setTradeSuccess(`${tradeSide === 'buy' ? 'Bought' : 'Sold'} ${quantity.toFixed(6)} ${baseSymLocal} successfully!`);
        setAmount(''); setSliderValue(0);
        if (user) await loadBalances(user.id);
        setTimeout(() => setTradeSuccess(''), 3000);
      } else if (orderType === 'limit') {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setTradeError('Please login to trade');
          return;
        }

        const total = quantity * tradePrice;

        const { data, error } = await supabase
          .from('spot_orders')
          .insert({
            user_id: currentUser.id,
            symbol: selectedSymbol,
            side: tradeSide,
            type: 'limit',
            price: tradePrice,
            quantity: quantity,
            total: total,
            status: 'pending'
          })
          .select();

        if (error) {
          console.error('Error creating limit order:', error);
          throw error;
        }

        console.log('Limit order created:', data);
        setTradeSuccess(`Limit order placed: ${tradeSide} ${quantity.toFixed(8)} ${selectedSymbol} at ${tradePrice.toFixed(2)} USDT`);
        setAmount('');
        setSliderValue(0);

        await fetchOpenOrders();
        await fetchOrderHistory();

        setTimeout(() => {
          setTradeSuccess('');
        }, 3000);
      } else {
        const result = await TradingService.executeTrade(
          selectedSymbol,
          tradeSide,
          tradePrice,
          quantity
        );

        if (result.success) {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            const total = quantity * tradePrice;
            await supabase
              .from('spot_orders')
              .insert({
                user_id: currentUser.id,
                symbol: selectedSymbol,
                side: tradeSide,
                type: 'market',
                price: tradePrice,
                quantity: quantity,
                total: total,
                status: 'filled',
                filled: quantity
              });
          }

          setTradeSuccess(`${tradeSide === 'buy' ? 'Bought' : 'Sold'} ${quantity.toFixed(8)} ${selectedSymbol} successfully!`);
          setAmount('');
          setSliderValue(0);

          if (user) {
            await loadBalances(user.id);
          }

          await fetchOpenOrders();
          await fetchOrderHistory();

          setTimeout(() => {
            setTradeSuccess('');
          }, 3000);
        } else {
          setTradeError(result.error || 'Trade failed');
        }
      }
    } catch (err: any) {
      setTradeError(err.message || 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    const targetSymbol = activeSymbolRef.current;
    const gen = fetchGenRef.current;
    setIsManualPriceChange(false);
    setBidOrders([]);
    setAskOrders([]);
    setRecentTrades([]);
    const metalCrossPair = getMetalCross(targetSymbol);
    const indepMgr = getIndepManager(targetSymbol);
    if (metalCrossPair) {
      const p = computeMetalCrossPrice(metalCrossPair);
      const metalData = getCachedTradFiPrice(metalCrossPair.tradfiSymbol);
      const change = metalData?.change24h || 0;
      if (p > 0) {
        setCurrentPrice(p);
        setChange24h(change);
        setHigh24h(p * 1.015);
        setLow24h(p * 0.985);
        const vol = (metalCrossPair.tradfiSymbol.includes('XAU') ? 139_770_000 : 28_000_000);
        setVolume24h(vol);
        setVolumeBase(vol / p);
        setPrice(p.toFixed(getPriceDecimals(p)));
        generateOrderBook(p);
        generateInitialTrades(p);
      }
    } else if (indepMgr) {
      const p = indepMgr.getPrice();
      const change = indepMgr.getChange();
      setCurrentPrice(p);
      setChange24h(change);
      setHigh24h(safeHigh(p, indepMgr.getHigh24h()));
      setLow24h(safeLow(p, indepMgr.getLow24h()));
      setVolume24h(targetSymbol === 'EQ' ? getEQVolume() : indepMgr.getMarketCap());
      setVolumeBase(targetSymbol === 'EQ' ? getEQVolume() / 2 : indepMgr.getMarketCap() / 2);
      setPrice(p.toFixed(getPriceDecimals(p)));
      generateOrderBook(p);
      generateInitialTrades(p);
    } else {
      try {
        const coin = allCoins.find(c => c.symbol === targetSymbol);
        const binanceSymbol = coin?.binance_symbol || `${targetSymbol}USDT`;

        let fetchedPrice = 0;

        const pc = PriceCache.getInstance();
        if (!pc.isReady()) {
          await pc.init();
        }
        if (fetchGenRef.current !== gen) return;
        const cached = pc.get(binanceSymbol);
        if (cached && cached.price > 0) {
          fetchedPrice = cached.price;
          setCurrentPrice(cached.price);
          setChange24h(cached.change24h);
          setHigh24h(cached.high24h);
          setLow24h(cached.low24h);
          setVolume24h(cached.volume);
          setVolumeBase(cached.volume / 2);
          setPrice(cached.price.toFixed(getPriceDecimals(cached.price)));
        } else {
          const ticker = await fetchBinanceTicker(binanceSymbol);
          if (fetchGenRef.current !== gen) return;
          if (ticker) {
            const newPrice = parseFloat(ticker.lastPrice);
            fetchedPrice = newPrice;
            setCurrentPrice(newPrice);
            setChange24h(parseFloat(ticker.priceChangePercent));
            setHigh24h(parseFloat(ticker.highPrice));
            setLow24h(parseFloat(ticker.lowPrice));
            setVolume24h(parseFloat(ticker.quoteVolume));
            setVolumeBase(parseFloat(ticker.volume));
            setPrice(newPrice.toFixed(getPriceDecimals(newPrice)));
          }
        }

        if (fetchedPrice <= 0) {
          try {
            const cgMap = await fetchCoinGeckoPrices([targetSymbol]);
            if (fetchGenRef.current !== gen) return;
            const cgData = cgMap.get(targetSymbol);
            if (cgData && cgData.price > 0) {
              fetchedPrice = cgData.price;
              setCurrentPrice(cgData.price);
              setChange24h(cgData.change24h);
              setHigh24h(cgData.high24h);
              setLow24h(cgData.low24h);
              setVolume24h(cgData.volume);
              setVolumeBase(cgData.volume / 2);
              setPrice(cgData.price.toFixed(getPriceDecimals(cgData.price)));
            }
          } catch {}
        }

        if (fetchedPrice > 0) {
          generateInitialTrades(fetchedPrice);
        }

        const depth = await fetchBinanceDepth(binanceSymbol, 20);
        if (fetchGenRef.current !== gen) return;
        if (depth && depth.bids.length > 0 && depth.asks.length > 0) {
          const initWhalesBid = 3 + Math.floor(Math.random() * 4);
          const initWhaleIdxs = Array.from({ length: initWhalesBid }, () => Math.floor(Math.random() * 20));
          const bids: OrderBookItem[] = depth.bids.map(([price, amount], idx) => {
            const p = parseFloat(price);
            const a = parseFloat(amount);
            const boost = initWhaleIdxs.includes(idx) ? (40 + Math.random() * 80) : (12 + Math.random() * 12);
            return { price: p, amount: a * boost, total: p * a * boost };
          });
          const asks: OrderBookItem[] = depth.asks.map(([price, amount]) => {
            const p = parseFloat(price);
            const a = parseFloat(amount);
            const shrink = 0.03 + Math.random() * 0.07;
            return { price: p, amount: a * shrink, total: p * a * shrink };
          });
          setBidOrders(bids);
          setAskOrders(asks);
        } else if (fetchedPrice > 0) {
          generateOrderBook(fetchedPrice);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  };

  const updatePrice = async () => {
    const target = activeSymbolRef.current;
    const metalCross = getMetalCross(target);
    const indepMgr = getIndepManager(target);
    if (metalCross) {
      const p = computeMetalCrossPrice(metalCross);
      if (p > 0) {
        currentPriceRef.current = p;
        setCurrentPrice(p);
        const metalData = getCachedTradFiPrice(metalCross.tradfiSymbol);
        setChange24h(metalData?.change24h || 0);
        if (!isManualPriceChange) setPrice(p.toFixed(getPriceDecimals(p)));
      }
    } else if (indepMgr) {
      const p = indepMgr.getPrice();
      const c = indepMgr.getChange();
      currentPriceRef.current = p;
      setCurrentPrice(p);
      setChange24h(c);
      if (!isManualPriceChange) {
        setPrice(p.toFixed(getPriceDecimals(p)));
      }
    } else {
      try {
        const coin = allCoins.find(c => c.symbol === target);
        const binanceSymbol = coin?.binance_symbol || `${target}USDT`;
        const pc = PriceCache.getInstance();
        const cached = pc.get(binanceSymbol);
        if (cached && cached.price > 0) {
          if (activeSymbolRef.current !== target) return;
          setCurrentPrice(cached.price);
          setChange24h(cached.change24h);
          if (!isManualPriceChange) {
            setPrice(cached.price.toFixed(getPriceDecimals(cached.price)));
          }
        } else {
          const ticker = await fetchBinanceTicker(binanceSymbol);
          if (activeSymbolRef.current !== target) return;
          if (ticker) {
            const newPrice = parseFloat(ticker.lastPrice);
            setCurrentPrice(newPrice);
            setChange24h(parseFloat(ticker.priceChangePercent));
            if (!isManualPriceChange) {
              setPrice(newPrice.toFixed(getPriceDecimals(newPrice)));
            }
          } else {
            const cgMap = await fetchCoinGeckoPrices([target]);
            if (activeSymbolRef.current !== target) return;
            const cgData = cgMap.get(target);
            if (cgData && cgData.price > 0) {
              setCurrentPrice(cgData.price);
              setChange24h(cgData.change24h);
              if (!isManualPriceChange) {
                setPrice(cgData.price.toFixed(getPriceDecimals(cgData.price)));
              }
            }
          }
        }
      } catch (error) {
        console.error('Error updating price:', error);
      }
    }
  };

  const organicAmount = (base: number, idx: number, total: number): number => {
    const r = Math.random();
    const spike = Math.random() < 0.12 ? (2.5 + Math.random() * 4) : 1;
    const wave = 0.5 + 0.5 * Math.sin((idx / total) * Math.PI * (1.5 + Math.random()));
    return base * (0.25 + Math.pow(r, 0.55) * 1.8) * wave * spike;
  };

  const generateOrderBook = (basePrice?: number) => {
    const p = basePrice || currentPrice;
    if (p <= 0) return;
    const bids: OrderBookItem[] = [];
    const asks: OrderBookItem[] = [];

    const pp = Math.max(p, 0.0001);
    const spreadStep = p < 0.001 ? p * 0.003 : p < 0.1 ? p * 0.002 : p < 1 ? p * 0.0008 : p < 100 ? p * 0.0004 : p < 10000 ? p * 0.0002 : p * 0.0001;
    const bidBase = (2_000_000 + Math.random() * 8_000_000) / pp;
    const askBase = (800 + Math.random() * 4_200) / pp;

    for (let i = 0; i < 20; i++) {
      const jitter = 1 + (Math.random() - 0.5) * 0.25;
      const bidPrice = p - (i + 1) * spreadStep * jitter;
      bids.push({ price: bidPrice, amount: organicAmount(bidBase, i, 20), total: bidPrice * bidBase });

      const askPrice = p + (i + 1) * spreadStep * (1 + (Math.random() - 0.5) * 0.25);
      asks.push({ price: askPrice, amount: organicAmount(askBase, i, 20), total: askPrice * askBase });
    }

    setBidOrders(bids);
    setAskOrders(asks);
  };

  const jitterOrderBook = (p: number) => {
    const pp = Math.max(p, 0.0001);
    const step = p < 0.001 ? p * 0.003 : p < 0.1 ? p * 0.002 : p < 1 ? p * 0.0008 : p < 100 ? p * 0.0004 : p < 10000 ? p * 0.0002 : p * 0.0001;
    const bidBase = (2_000_000 + Math.random() * 8_000_000) / pp;
    const askBase = (800 + Math.random() * 4_200) / pp;
    setBidOrders(prev => {
      if (prev.length === 0) { generateOrderBook(p); return prev; }
      return prev.map((order, i) => {
        const drift = Math.random() < 0.3 ? organicAmount(bidBase, i, prev.length) : order.amount * (0.88 + Math.random() * 0.24);
        const newPrice = p - (i + 1) * step * (0.92 + Math.random() * 0.16);
        return { price: newPrice, amount: Math.max(drift, bidBase * 0.15), total: newPrice * drift };
      });
    });
    setAskOrders(prev => {
      if (prev.length === 0) return prev;
      return prev.map((order, i) => {
        const drift = Math.random() < 0.3 ? organicAmount(askBase, i, prev.length) : order.amount * (0.80 + Math.random() * 0.30);
        const newPrice = p + (i + 1) * step * (0.92 + Math.random() * 0.16);
        return { price: newPrice, amount: Math.max(drift, askBase * 0.05), total: newPrice * drift };
      });
    });
  };

  const updateOrderBook = async () => {
    const livePrice = currentPriceRef.current;
    if (INDEPENDENT_SYMBOLS.has(selectedSymbol)) {
      if (livePrice > 0) jitterOrderBook(livePrice);
    } else {
      try {
        const coin = allCoins.find(c => c.symbol === selectedSymbol);
        const binanceSymbol = coin?.binance_symbol || `${selectedSymbol}USDT`;
        const depth = await fetchBinanceDepth(binanceSymbol, 100);
        if (depth && depth.bids.length > 0 && depth.asks.length > 0) {
          const bids: OrderBookItem[] = depth.bids
            .slice(0, 20)
            .map(([price, amount], idx) => {
              const p = parseFloat(price);
              const a = parseFloat(amount);
              const spike = Math.random() < 0.18 ? (4 + Math.random() * 8) : 1;
              const wave = 0.6 + 0.4 * Math.abs(Math.sin((idx / 20) * Math.PI * (1.2 + Math.random() * 0.8)));
              const mod = (8 + Math.pow(Math.random(), 0.4) * 16) * wave * spike;
              return { price: p, amount: a * mod, total: p * a * mod };
            });

          const asks: OrderBookItem[] = depth.asks
            .slice(0, 20)
            .map(([price, amount], idx) => {
              const p = parseFloat(price);
              const a = parseFloat(amount);
              const wave = 0.4 + 0.6 * Math.abs(Math.sin((idx / 20) * Math.PI * (1.2 + Math.random() * 0.8)));
              const mod = (0.03 + Math.random() * 0.07) * wave;
              return { price: p, amount: a * mod, total: p * a * mod };
            });

          if (bids.length > 0) setBidOrders(bids);
          if (asks.length > 0) setAskOrders(asks);
        } else if (livePrice > 0) {
          jitterOrderBook(livePrice);
        }
      } catch {
        if (livePrice > 0) jitterOrderBook(livePrice);
      }
    }
  };

  const generateInitialTrades = (basePrice?: number) => {
    const p = basePrice || currentPrice;
    if (p <= 0) return;
    const pp = Math.max(p, 0.0001);
    const trades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      const isBuy = Math.random() > 0.12;
      const buyAmt = (80_000 + Math.random() * 920_000) / pp;
      const sellAmt = (200 + Math.random() * 1_800) / pp;
      trades.push({
        price: p * (0.999 + Math.random() * 0.002),
        amount: isBuy ? buyAmt : sellAmt,
        time: new Date().toLocaleTimeString().slice(-8),
        isBuy,
      });
    }
    setRecentTrades(trades);
  };

  const updateTrades = () => {
    const livePrice = currentPriceRef.current;
    if (livePrice <= 0) return;
    if (Math.random() > 0.25) {
      const count = Math.random() > 0.5 ? 2 : 1;
      const pp = Math.max(livePrice, 0.0001);
      const newTrades: Trade[] = [];
      for (let i = 0; i < count; i++) {
        const isBuy = Math.random() > 0.12;
        const buyAmt = (80_000 + Math.random() * 920_000) / pp;
        const sellAmt = (200 + Math.random() * 1_800) / pp;
        newTrades.push({
          price: livePrice * (0.9995 + Math.random() * 0.001),
          amount: isBuy ? buyAmt : sellAmt,
          time: new Date().toLocaleTimeString().slice(-8),
          isBuy,
        });
      }
      setRecentTrades(prev => [...newTrades, ...prev.slice(0, 49)]);
    }
  };

  const formatPrice = sharedFormatPrice;
  const formatAmount = sharedFormatAmount;

  const formatVolume = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const periodSeed = selectedSymbol.charCodeAt(0) + selectedSymbol.length;
  const pseudoRand = (i: number) => {
    const x = Math.sin(periodSeed * 100 + i * 7.3) * 10000;
    return x - Math.floor(x);
  };

  const _c = change24h;
  const _absC = Math.abs(_c);
  const _shortSign = _c >= 0 ? 1 : -1;
  const _longSign  = pseudoRand(20) > 0.42 ? 1 : -1;
  // cap: negative side max -99% (can't lose more than 100%), positive uncapped
  const _capV = (v: number) => Math.max(-99, v);

  const periodData = change24h !== 0 ? [
    // Today & 7D follow current price direction, scaled from change24h
    { label: 'Today',    value: _capV(_c * (0.35 + pseudoRand(1) * 0.35)) },
    { label: '7 Days',   value: _capV(_shortSign * _absC * (0.85 + pseudoRand(2) * 0.65)) },
    // 30D–1Y use fixed realistic % ranges (independent of extreme daily change)
    { label: '30 Days',  value: _capV(_longSign * (5  + pseudoRand(3) * 35)) },
    { label: '90 Days',  value: _capV(_longSign * (10 + pseudoRand(4) * 55)) },
    { label: '180 Days', value: _capV(_longSign * (15 + pseudoRand(5) * 85)) },
    { label: '1 Year',   value: _capV(_longSign * (25 + pseudoRand(6) * 175)) },
  ].map(d => ({ ...d, isPositive: d.value >= 0 })) : [
    { label: 'Today',    value: (pseudoRand(1) - 0.50) * 3,  isPositive: true },
    { label: '7 Days',   value: (pseudoRand(2) - 0.45) * 8,  isPositive: true },
    { label: '30 Days',  value: (pseudoRand(3) - 0.50) * 18, isPositive: true },
    { label: '90 Days',  value: (pseudoRand(4) - 0.45) * 28, isPositive: true },
    { label: '180 Days', value: (pseudoRand(5) - 0.45) * 40, isPositive: true },
    { label: '1 Year',   value: (pseudoRand(6) - 0.40) * 60, isPositive: true },
  ].map(d => ({ ...d, isPositive: d.value >= 0 }));

  const bidTotal = bidOrders.slice(0, 8).reduce((s, o) => s + o.amount, 0);
  const askTotal = askOrders.slice(0, 8).reduce((s, o) => s + o.amount, 0);
  const totalOB = bidTotal + askTotal;
  const bidPercentage = totalOB > 0 ? (bidTotal / totalOB) * 100 : 50;
  const askPercentage = 100 - bidPercentage;

  const filteredCoins = allCoins.filter(coin => {
    const isMetal = METAL_CROSS_SYMBOLS.has(coin.symbol);
    if (selectorMarketTab === 'metals' && !isMetal) return false;
    if (selectorMarketTab === 'crypto' && isMetal) return false;
    return (
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const activeMetal = getMetalCross(selectedSymbol);
  const quoteSymbol = activeMetal?.quote || 'USDT';
  const baseSymbol  = activeMetal?.base  || selectedSymbol;
  const quoteBalance = activeMetal ? (activeMetal.quote === 'BTC' ? btcBalance : ethBalance) : usdtBalance;
  const pairLabel = activeMetal ? `${activeMetal.base}/${activeMetal.quote}` : `${selectedSymbol}/USDT`;

  if (activeTab === 'trade') {
    return (
      <div className="min-h-screen bg-[#181A20] text-white pb-20 max-w-[480px] mx-auto">
        <div className="bg-[#181A20] px-4 py-3 sticky top-0 z-20 border-[#2B3139]">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setActiveTab('price')}
              className="flex items-center gap-2 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-gray-400">Convert</span>
            </button>
            <div className="flex items-center gap-4">
              <button className="font-semibold text-white">Spot</button>
              <button className="text-gray-400">Margin</button>
              <button className="text-gray-400">P2P</button>
              <button className="text-gray-400">Alpha</button>
            </div>
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-[#181A20] px-4 py-3 border-[#2B3139]">
          <button
            onClick={() => setShowCoinSelector(true)}
            className="flex items-center gap-2 mb-2"
          >
            {selectedSymbol === 'EQ' && (
              <img src="/earnquest-logo-icon-2.png" alt="EQ" className="w-6 h-6 rounded-full" />
            )}
            <span className="font-bold text-lg">{pairLabel}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[14px] font-bold ${change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[58%_42%] gap-0">
          <div className="bg-[#181A20] flex flex-col border-[#2B3139]">
            <div className="flex border-[#2B3139] relative">
              <button
                onClick={() => setTradeSide('buy')}
                className={`flex-1 py-3 text-[13px] font-semibold relative transition-all ${ tradeSide === 'buy' ? 'bg-[#0ECB81] text-white z-10' : 'bg-transparent text-gray-400' }`}
                style={tradeSide === 'buy' ? {
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)'
                } : undefined}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeSide('sell')}
                className={`flex-1 py-3 text-[13px] font-semibold transition-all ${ tradeSide === 'sell' ? 'bg-[#F6465D] text-white' : 'bg-transparent text-gray-400' }`}
              >
                Sell
              </button>
            </div>

            <div className="px-3 py-2 overflow-y-auto">
              <div className="mb-3">
                <button
                  onClick={() => setOrderType(orderType === 'market' ? 'limit' : 'market')}
                  className="w-full px-3 py-2 rounded bg-[#2B3139] text-white flex items-center justify-between"
                >
                  <span>{orderType === 'market' ? 'Market' : 'Limit'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {orderType === 'limit' ? (
                <div className="mb-3">
                  <div className="text-white mb-1.5">Limit Price</div>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => { setPrice(e.target.value); setIsManualPriceChange(true); }}
                    placeholder={formatPrice(currentPrice)}
                    className="w-full bg-[#2B3139] rounded px-3 py-2.5 text-[13px] outline-none placeholder-[#5E6673]"
                  />
                </div>
              ) : (
                <div className="mb-3">
                  <div className="text-[#5E6673] mb-1.5">Market Price</div>
                  <div className="bg-[#2B3139] rounded px-3 py-2.5 text-[13px] font-medium">
                    {formatPrice(currentPrice)}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <div className="text-[11px] mb-1.5 flex items-center justify-between">
                  <span className="text-white">Amount</span>
                  <button
                    onClick={() => setShowUnitPreference(true)}
                    className="flex items-center gap-1 text-white hover:text-[#0ECB81] transition-colors bg-[#2B3139] px-2 py-1 rounded"
                  >
                    {unitPreference === 'asset' ? baseSymbol : (activeMetal ? quoteSymbol : 'USDT')}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setIsManualAmountChange(true);
                    setSliderValue(0);
                  }}
                  placeholder={unitPreference === 'asset' ? `Enter ${baseSymbol} amount` : `Enter ${quoteSymbol} amount`}
                  className="w-full bg-[#2B3139] rounded px-3 py-2.5 text-[13px] outline-none placeholder-[#5E6673]"
                />
                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                  <span className="text-white">{quoteBalance.toFixed(quoteSymbol === 'USDT' ? 2 : 8)} {quoteSymbol}</span>
                  <span className="text-white">{coinBalance.toFixed(8)} {baseSymbol}</span>
                </div>
                {unitPreference === 'usdt' && amount && parseFloat(amount) > 0 && currentPrice > 0 && (
                  <div className="mt-1.5 text-[#0ECB81]">
                    ≈ {(parseFloat(amount) / currentPrice).toFixed(8)} {selectedSymbol}
                  </div>
                )}
                {unitPreference === 'asset' && amount && parseFloat(amount) > 0 && currentPrice > 0 && (
                  <div className="mt-1.5 text-[#0ECB81]">
                    ≈ {(parseFloat(amount) * currentPrice).toFixed(2)} USDT
                  </div>
                )}
              </div>

              <div className="relative mb-2 mt-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderValue}
                  onChange={(e) => {
                    setSliderValue(parseInt(e.target.value));
                    setIsManualAmountChange(false);
                  }}
                  className="w-full h-0.5 bg-[#2B3139] rounded-lg appearance-none cursor-pointer slider-input"
                  style={{
                    background: `linear-gradient(to right, ${tradeSide === 'buy' ? '#0ECB81' : '#F6465D'} ${sliderValue}%, #2B3139 ${sliderValue}%)`
                  }}
                />
              </div>

              <div className="flex gap-2 mb-4">
                {[25, 50, 75, 100].map(value => (
                  <button
                    key={value}
                    onClick={() => {
                      setSliderValue(value);
                      setIsManualAmountChange(false);
                    }}
                    className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-all ${ sliderValue === value ? 'bg-[#2B3139] text-white' : 'bg-transparent text-[#5E6673] hover:text-white' }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>

              <div className="mb-4 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#5E6673] bg-[#2B3139]" />
                  <span className="text-[#5E6673]">Slippage Tolerance</span>
                </label>
              </div>

              <div className="mb-3 text-[11px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[#5E6673]">Avbl <ChevronDown className="w-2.5 h-2.5 inline" /></span>
                  <span className="text-white flex items-center gap-1">
                    {activeMetal
                      ? `${quoteBalance.toFixed(8)} ${quoteSymbol}`
                      : unitPreference === 'usdt'
                        ? `${usdtBalance.toFixed(2)} USDT`
                        : `${(tradeSide === 'buy' ? usdtBalance / currentPrice : coinBalance).toFixed(8)} ${baseSymbol}`
                    }
                    <span className="bg-[#F0B90B] w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold">+</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5E6673]">{tradeSide === 'buy' ? 'Max Buy' : 'Max Sell'}</span>
                  <span className="text-white">
                    {activeMetal
                      ? tradeSide === 'buy'
                        ? `${currentPrice > 0 ? (quoteBalance / currentPrice).toFixed(8) : '0'} ${baseSymbol}`
                        : `${coinBalance.toFixed(8)} ${baseSymbol}`
                      : unitPreference === 'usdt'
                        ? `${(tradeSide === 'buy' ? usdtBalance : coinBalance * currentPrice).toFixed(2)} USDT`
                        : `${(tradeSide === 'buy' ? usdtBalance / currentPrice : coinBalance).toFixed(8)} ${baseSymbol}`
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[#5E6673]">Est. Fee</span>
                  <span className="text-white">
                    {activeMetal
                      ? `${(((parseFloat(amount) || 0)) * 0.001).toFixed(8)} ${baseSymbol}`
                      : unitPreference === 'usdt'
                        ? `${((parseFloat(amount) || 0) * 0.001).toFixed(2)} USDT`
                        : `${(((parseFloat(amount) || 0) / (unitPreference === 'usdt' ? currentPrice : 1)) * 0.001).toFixed(8)} ${baseSymbol}`
                    }
                  </span>
                </div>
              </div>

              {/* Pair Lock Banner */}
              {(() => {
                if (!userRestrictions?.pair_lock_enabled) return null;
                const metalInfo = getMetalCross(selectedSymbol);
                const pairKey = metalInfo ? `${metalInfo.base}/${metalInfo.quote}` : `${selectedSymbol}/USDT`;
                const isAllowed = userRestrictions.allowed_pairs.includes(pairKey);
                if (isAllowed) return null;
                return (
                  <div className="mb-3 rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <span className="text-red-400 mt-0.5 flex-shrink-0">🔒</span>
                    <div>
                      <p className="text-[12px] font-bold text-red-400">Parite Kilitli</p>
                      <p className="text-[11px] text-red-400/70 mt-0.5">
                        {userRestrictions.allowed_pairs.length > 0
                          ? `İzin verilen: ${userRestrictions.allowed_pairs.join(' · ')}`
                          : 'Hiçbir parite ile işlem yapma izniniz yok'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {tradeError && (
                <div className="mb-3 bg-[#F6465D]/10 border border-[#F6465D]/50 rounded px-3 py-2 text-[#F6465D] text-[12px]">
                  {tradeError}
                </div>
              )}

              {tradeSuccess && (
                <div className="mb-3 bg-[#0ECB81]/10 border border-[#0ECB81]/50 rounded px-3 py-2 text-[#0ECB81] text-[12px]">
                  {tradeSuccess}
                </div>
              )}

              {(() => {
                const metalInfo = getMetalCross(selectedSymbol);
                const pairKey = metalInfo ? `${metalInfo.base}/${metalInfo.quote}` : `${selectedSymbol}/USDT`;
                const isPairBlocked = userRestrictions?.pair_lock_enabled && !userRestrictions.allowed_pairs.includes(pairKey);
                return (
                  <button
                    onClick={handleTrade}
                    disabled={loading || !amount || parseFloat(amount) <= 0 || !!isPairBlocked}
                    className={`w-full py-3 rounded text-[14px] font-bold transition-all ${ tradeSide === 'buy' ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white' : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white' } disabled:opacity-50`}
                  >
                    {loading ? 'Processing...' : isPairBlocked ? '🔒 Kilitli Parite' : `${tradeSide === 'buy' ? 'Buy' : 'Sell'} ${selectedSymbol}`}
                  </button>
                );
              })()}
            </div>
          </div>

          <div className="bg-[#181A20] border-l border-[#2B3139]">
            <div className="flex items-center justify-between px-2 py-1 border-b border-[#2B3139]">
              <span className="text-[#848E9C] text-[10px]">Price({quoteSymbol})</span>
              <span className="text-[#848E9C] text-[10px] text-right">Amount({selectedSymbol})</span>
            </div>

            <div>
              {(() => {
                const slice = askOrders.slice(0, 8);
                const maxAmt = Math.max(...slice.map(o => o.amount), 1);
                return slice.reverse().map((order, index) => {
                  const ratio = order.amount / maxAmt;
                  const fillPct = ratio * 100;
                  const isLarge = ratio > 0.6;
                  return (
                    <div key={`ask-${index}`} className="relative flex items-center justify-between px-2 py-[3px]">
                      <div
                        className={`absolute right-0 top-0 bottom-0 bg-[#F6465D]/[0.13]${isLarge ? ' ob-sway' : ''}`}
                        style={{ width: `${fillPct}%` }}
                      />
                      <span className="relative z-10 text-[#F6465D] text-[11px] font-medium tabular-nums">{formatPrice(order.price)}</span>
                      <span className="relative z-10 text-[#EAECEF] text-[11px] tabular-nums">{formatAmount(order.amount)}</span>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex items-center justify-center py-1 px-2 border-y border-[#2B3139] bg-[#0B0E11]">
              <span className={`text-[15px] font-bold ${change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {formatPrice(currentPrice)}
              </span>
            </div>

            <div>
              {(() => {
                const slice = bidOrders.slice(0, 8);
                const maxAmt = Math.max(...slice.map(o => o.amount), 1);
                return slice.map((order, index) => {
                  const ratio = order.amount / maxAmt;
                  const fillPct = ratio * 100;
                  const isLarge = ratio > 0.6;
                  return (
                    <div key={`bid-${index}`} className="relative flex items-center justify-between px-2 py-[3px]">
                      <div
                        className={`absolute right-0 top-0 bottom-0 bg-[#0ECB81]/[0.13]${isLarge ? ' ob-sway' : ''}`}
                        style={{ width: `${fillPct}%` }}
                      />
                      <span className="relative z-10 text-[#0ECB81] text-[11px] font-medium tabular-nums">{formatPrice(order.price)}</span>
                      <span className="relative z-10 text-[#EAECEF] text-[11px] tabular-nums">{formatAmount(order.amount)}</span>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="px-2 py-1 border-t border-[#2B3139]">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[#0ECB81] text-[10px] font-medium">{bidPercentage.toFixed(2)}%</span>
                <div className="flex-1 h-1 flex rounded overflow-hidden">
                  <div className="bg-[#0ECB81] transition-all duration-300" style={{ width: `${bidPercentage}%` }} />
                  <div className="bg-[#F6465D] transition-all duration-300" style={{ width: `${askPercentage}%` }} />
                </div>
                <span className="text-[#F6465D] text-[10px] font-medium">{askPercentage.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <span className="text-[#848E9C] text-[10px]">
                    {currentPrice > 10000 ? '1' : currentPrice > 1000 ? '0.1' : currentPrice > 100 ? '0.01' : currentPrice > 10 ? '0.001' : currentPrice > 1 ? '0.0001' : currentPrice > 0.1 ? '0.00001' : currentPrice > 0.01 ? '0.000001' : '0.00000001'}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-[#848E9C]" />
                </div>
                <div className="flex items-center gap-1">
                  <button className="w-4 h-4 flex items-center justify-center">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="1" width="14" height="3" rx="0.5" fill="#F6465D" />
                      <rect x="1" y="6" width="14" height="3" rx="0.5" fill="#2B3139" />
                      <rect x="1" y="11" width="14" height="3" rx="0.5" fill="#0ECB81" />
                    </svg>
                  </button>
                  <button className="w-4 h-4 flex items-center justify-center opacity-40">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="1" width="14" height="3" rx="0.5" fill="#F6465D" />
                      <rect x="1" y="6" width="14" height="3" rx="0.5" fill="#F6465D" />
                      <rect x="1" y="11" width="14" height="3" rx="0.5" fill="#F6465D" />
                    </svg>
                  </button>
                  <button className="w-4 h-4 flex items-center justify-center opacity-40">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="1" y="1" width="14" height="3" rx="0.5" fill="#0ECB81" />
                      <rect x="1" y="6" width="14" height="3" rx="0.5" fill="#0ECB81" />
                      <rect x="1" y="11" width="14" height="3" rx="0.5" fill="#0ECB81" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#2B3139]">
          <div className="flex items-center gap-3 text-[11px] px-3 py-2.5 bg-[#181A20]">
            <button
              onClick={() => setActiveOrderTab('open')}
              className={`font-medium relative pb-1 ${activeOrderTab === 'open' ? 'text-white' : 'text-gray-400'}`}
            >
              Open Orders ({openOrders.length})
              {activeOrderTab === 'open' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B]"></div>}
            </button>
            <button
              onClick={() => setActiveOrderTab('holdings')}
              className={`font-medium relative pb-1 ${activeOrderTab === 'holdings' ? 'text-white' : 'text-gray-400'}`}
            >
              Holdings ({orderHistory.length})
              {activeOrderTab === 'holdings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B]"></div>}
            </button>
            <button
              onClick={() => setActiveOrderTab('bots')}
              className={`font-medium relative pb-1 ${activeOrderTab === 'bots' ? 'text-white' : 'text-gray-400'}`}
            >
              Bots{activeCopyCount > 0 && <span className="ml-0.5 text-[#FCD535]">({activeCopyCount})</span>}
              {activeOrderTab === 'bots' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B]"></div>}
            </button>
          </div>

          <div className="min-h-[120px] max-h-[250px] overflow-y-auto">
            {activeOrderTab === 'open' && (
              <SpotOpenOrders
                orders={openOrders}
                currentSymbol={selectedSymbol}
                onCancelOrder={cancelOrder}
                onCancelAll={cancelAllOrders}
                onRefresh={fetchOpenOrders}
              />
            )}

            {activeOrderTab === 'holdings' && (
              <div className="flex flex-col">
                {orderHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="w-12 h-12 rounded-full bg-[#2B3139] flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-[#5E6673]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="text-gray-400 text-xs">No Order History</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead className="sticky top-0 bg-[#181A20] z-10">
                        <tr className="text-gray-400">
                          <th className="text-left py-1.5 px-2 font-normal">Date</th>
                          <th className="text-left py-1.5 px-2 font-normal">Pair</th>
                          <th className="text-left py-1.5 px-2 font-normal">Side</th>
                          <th className="text-right py-1.5 px-2 font-normal">Price</th>
                          <th className="text-right py-1.5 px-2 font-normal">Amount</th>
                          <th className="text-right py-1.5 px-2 font-normal">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderHistory.map((order) => (
                          <tr key={order.id} className="hover:bg-[#2B3139]/30">
                            <td className="py-1.5 px-2 text-[#EAECEF]">
                              {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="text-[#EAECEF]">{order.symbol}</span><span className="text-gray-400">/USDT</span>
                            </td>
                            <td className="py-1.5 px-2">
                              <span className={order.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{order.side.toUpperCase()}</span>
                            </td>
                            <td className="py-1.5 px-2 text-[#EAECEF] text-right">{parseFloat(order.price).toFixed(2)}</td>
                            <td className="py-1.5 px-2 text-[#EAECEF] text-right">{parseFloat(order.quantity).toFixed(6)}</td>
                            <td className="py-1.5 px-2 text-[#EAECEF] text-right">{parseFloat(order.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeOrderTab === 'bots' && (
              <ActiveCopyPositions onStopCopy={(id) => setShowStopCopyConfirm(id)} />
            )}
          </div>
        </div>

        <CopyTradingSection currentSymbol={selectedSymbol} currentPrice={currentPrice} onActiveCopiesChange={setActiveCopyCount} />

        {showCoinSelector && (
          <div className="fixed inset-0 bg-[#181A20] z-50 flex flex-col">
            <div className="bg-[#181A20] px-4 py-3 border-[#2B3139]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-white">Select Pair</h2>
                <button onClick={() => setShowCoinSelector(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex items-center bg-[#2B3139] rounded-lg px-3 py-2.5">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent flex-1 outline-none placeholder-[#848E9C] text-[14px]"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setSelectorMarketTab('crypto')}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${selectorMarketTab === 'crypto' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400'}`}
                >Crypto</button>
                <button
                  onClick={() => setSelectorMarketTab('metals')}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${selectorMarketTab === 'metals' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400'}`}
                >⚡ TradFi Spot</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-20">
              <div className="px-4 py-2">
                {selectorMarketTab === 'metals' ? (() => {
                  let lastSection = '';
                  return filteredCoins.flatMap((coin) => {
                    const metalCross = getMetalCross(coin.symbol);
                    if (!metalCross) return [];
                    const priceData = coinPrices[coin.symbol];
                    const pairLabel = `${metalCross.base}/${metalCross.quote}`;
                    const crossPrice = computeMetalCrossPrice(metalCross);
                    const sec = TRADFI_SECTIONS.find(s => s.bases.has(metalCross.base));
                    const items: React.ReactNode[] = [];
                    if (sec && sec.label !== lastSection) {
                      lastSection = sec.label;
                      items.push(
                        <div key={`hdr-${sec.label}`} className="flex items-center gap-2 mt-3 mb-1 px-2">
                          <span className="text-[12px]">{sec.emoji}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: sec.color }}>{sec.label}</span>
                          <div className="flex-1 h-px" style={{ background: sec.color + '33' }} />
                        </div>
                      );
                    }
                    items.push(
                      <button
                        key={coin.symbol}
                        onClick={() => { changeSymbol(coin.symbol); setShowCoinSelector(false); setSearchQuery(''); setSelectorMarketTab('metals'); }}
                        className="flex items-center gap-3 py-2.5 w-full hover:bg-[#2B3139]/30 rounded-lg px-2 transition-colors"
                      >
                        <div className="w-10 h-10 flex-shrink-0">
                          {isMetalSymbol(metalCross.base)
                            ? <MetalIcon symbol={metalCross.base} size={40} />
                            : isTradFiIcon(metalCross.base)
                            ? <TradFiIcon symbol={metalCross.base} size={40} />
                            : <CoinLogo symbol={metalCross.base} dbUrl={coin.logo} />}
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-bold text-white text-[15px]">{pairLabel}</div>
                          <div className="text-[12px] text-gray-400">{metalCross.name}</div>
                        </div>
                        {crossPrice > 0 ? (
                          <div className="text-right">
                            <div className="font-bold text-white text-[14px]">{crossPrice.toFixed(getPriceDecimals(crossPrice))} {metalCross.quote}</div>
                          </div>
                        ) : priceData ? (
                          <div className="text-right">
                            <div className="font-bold text-white text-[14px]">${priceData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                          </div>
                        ) : null}
                      </button>
                    );
                    return items;
                  });
                })() : filteredCoins.map((coin) => {
                  const metalCross = getMetalCross(coin.symbol);
                  const priceData = coinPrices[coin.symbol];
                  const pairLabel = metalCross ? `${metalCross.base}/${metalCross.quote}` : `${coin.symbol}/USDT`;
                  const crossPrice = metalCross ? computeMetalCrossPrice(metalCross) : null;
                  return (
                    <button
                      key={coin.symbol}
                      onClick={() => {
                        changeSymbol(coin.symbol);
                        setShowCoinSelector(false);
                        setSearchQuery('');
                        setSelectorMarketTab(metalCross ? 'metals' : 'crypto');
                      }}
                      className="flex items-center gap-3 py-3 w-full hover:bg-[#2B3139]/30 rounded-lg px-2 transition-colors"
                    >
                      <div className="w-10 h-10 flex-shrink-0">
                        {metalCross && isMetalSymbol(metalCross.base)
                          ? <MetalIcon symbol={metalCross.base} size={40} />
                          : metalCross && isTradFiIcon(metalCross.base)
                          ? <TradFiIcon symbol={metalCross.base} size={40} />
                          : <CoinLogo symbol={metalCross?.base || coin.symbol} dbUrl={coin.logo} />}
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-bold text-white text-[15px]">{pairLabel}</div>
                        <div className="text-[12px] text-gray-400">{coin.name}</div>
                      </div>
                      {metalCross && crossPrice && crossPrice > 0 ? (
                        <div className="text-right">
                          <div className="font-bold text-white text-[14px]">
                            {crossPrice.toFixed(getPriceDecimals(crossPrice))} {metalCross.quote}
                          </div>
                        </div>
                      ) : priceData ? (
                        <div className="text-right">
                          <div className="font-bold text-white text-[14px]">
                            ${priceData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                          </div>
                          <div className={`text-[12px] font-medium ${priceData.change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(2)}%
                          </div>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181A20] text-white pb-20 max-w-[480px] mx-auto">
      <div className="bg-[#181A20] px-4 py-3 sticky top-0 z-20 border-[#2B3139]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => onBack ? onBack() : window.history.back()} className="p-1">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowCoinSelector(true)}
              className="flex items-center gap-1"
            >
              <div className="w-6 h-6 flex-shrink-0">
                {(() => {
                  const mc = getMetalCross(selectedSymbol);
                  if (mc && isMetalSymbol(mc.base)) return <MetalIcon symbol={mc.base} size={24} />;
                  if (mc && isTradFiIcon(mc.base)) return <TradFiIcon symbol={mc.base} size={24} />;
                  return <CoinLogo symbol={selectedSymbol} dbUrl={allCoins.find(c => c.symbol === selectedSymbol)?.logo} />;
                })()}
              </div>
              <span className="font-bold text-lg">{pairLabel}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2">
              <svg className="w-5 h-5 text-[#F0B90B]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
              </svg>
            </button>
            <button className="p-2">
              <Star className="w-5 h-5 text-gray-400" />
            </button>
            <button className="p-2">
              <Bell className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          {[
            { id: 'price', label: 'Price' },
            { id: 'info', label: 'Info' },
            { id: 'trading-data', label: 'Trading Data' },
            { id: 'square', label: 'Square' },
            { id: 'trade', label: 'Trade', badge: true }
          ].map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`text-sm font-medium whitespace-nowrap pb-2 transition-all relative ${ activeTab === id ? 'text-white border-b-2 border-[#F0B90B]' : 'text-gray-400' }`}
            >
              {label}
              {badge && <span className="absolute -top-1 -right-2 bg-[#F0B90B] text-black text-[9px] px-1 rounded font-bold">New</span>}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'info' && (
        <CoinInfoTab
          symbol={selectedSymbol}
          coinName={allCoins.find(c => c.symbol === selectedSymbol)?.name || selectedSymbol}
          logo={allCoins.find(c => c.symbol === selectedSymbol)?.logo}
          currentPrice={currentPrice}
          high24h={high24h}
          low24h={low24h}
          volume24h={volume24h}
          volumeBase={volumeBase}
          change24h={change24h}
        />
      )}

      {activeTab === 'trading-data' && (
        <TradingDataTab
          symbol={selectedSymbol}
          currentPrice={currentPrice}
          volume24h={volume24h}
        />
      )}

      {activeTab === 'square' && (
        <div className="flex flex-col items-center justify-center py-20 text-[#848E9C]">
          <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center mb-3">
            <TrendingUp className="w-7 h-7 text-[#5E6673]" />
          </div>
          <div className="text-[15px] font-medium text-white mb-1">Square</div>
          <div className="text-[13px]">Community trading ideas coming soon</div>
        </div>
      )}

      {(activeTab === 'price') && (
      <>
      <div className="bg-[#181A20] px-4 py-3 border-[#2B3139]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-2xl font-bold mb-1">
              {currentPrice > 0 ? formatPrice(currentPrice) : (
                <span className="inline-block w-32 h-7 bg-[#2B3139] rounded animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentPrice > 0 ? (
                <span className={`text-sm font-bold ${change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </span>
              ) : (
                <span className="inline-block w-16 h-4 bg-[#2B3139] rounded animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[#F0B90B] text-[10px] font-bold bg-[#F0B90B]/10 px-1.5 py-0.5 rounded">POW</span>
              <span className="text-[#F0B90B] text-[10px] font-bold bg-[#F0B90B]/10 px-1.5 py-0.5 rounded">Vol</span>
              <span className="text-[#F0B90B] text-[10px] font-bold bg-[#F0B90B]/10 px-1.5 py-0.5 rounded">Price Protection</span>
            </div>
          </div>
          <div className="text-xs">
            <div className="mb-2">
              <div className="text-[#5E6673]">24h High</div>
              <div className="text-white font-medium">{currentPrice > 0 ? formatPrice(high24h) : <span className="inline-block w-14 h-3.5 bg-[#2B3139] rounded animate-pulse" />}</div>
            </div>
            <div className="mb-2">
              <div className="text-[#5E6673]">24h Low</div>
              <div className="text-white font-medium">{currentPrice > 0 ? formatPrice(low24h) : <span className="inline-block w-14 h-3.5 bg-[#2B3139] rounded animate-pulse" />}</div>
            </div>
          </div>
          <div className="text-xs">
            <div className="mb-2">
              <div className="text-[#5E6673]">24h Vol({selectedSymbol})</div>
              <div className="text-white font-medium">{currentPrice > 0 ? formatVolume(volumeBase) : <span className="inline-block w-14 h-3.5 bg-[#2B3139] rounded animate-pulse" />}</div>
            </div>
            <div>
              <div className="text-[#5E6673]">24h Vol(USDT)</div>
              <div className="text-white font-medium">{currentPrice > 0 ? formatVolume(volume24h) : <span className="inline-block w-14 h-3.5 bg-[#2B3139] rounded animate-pulse" />}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#181A20] px-4 py-2 border-[#2B3139]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {['Time', '15m', '1h', '4h', '1D', '1M'].map((time) => (
              <button
                key={time}
                onClick={() => setTimeframe(time)}
                className={`px-3 py-1 text-xs whitespace-nowrap rounded transition-colors ${ timeframe === time ? 'text-white font-medium bg-[#2B3139]' : 'text-[#5E6673] hover:text-gray-400' }`}
              >
                {time}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-[#2B3139] rounded transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button className="p-1 hover:bg-[#2B3139] rounded transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <BinanceLightweightChart
        symbol={selectedSymbol}
        binanceSymbol={(() => {
          const coin = allCoins.find(c => c.symbol === selectedSymbol);
          return coin?.binance_symbol || `${selectedSymbol}USDT`;
        })()}
        timeframe={timeframe}
        currentPrice={currentPrice}
        change24h={change24h}
      />

      <div className="bg-[#181A20] px-4 py-3 border-[#2B3139]">
        <div className="grid grid-cols-6 gap-3 text-xs">
          {periodData.map(({ label, value, isPositive }) => (
            <div key={label} className="text-center bg-[#181A20]/30 rounded py-2">
              <div className="text-[10px] mb-1">{label}</div>
              <div className={`font-bold text-[11px] ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {isPositive ? '+' : ''}{value.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#181A20] pb-24">
        <div className="flex items-center gap-4 px-4 py-3 border-[#2B3139] bg-[#181A20]">
          <button
            onClick={() => setOrderBookTab('order-book')}
            className={`text-sm font-medium whitespace-nowrap pb-2 transition-all ${ orderBookTab === 'order-book' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-gray-400' }`}
          >
            Order Book
          </button>
          <button
            onClick={() => setOrderBookTab('trades')}
            className={`text-sm font-medium whitespace-nowrap pb-2 transition-all ${ orderBookTab === 'trades' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-gray-400' }`}
          >
            Trades
          </button>
        </div>

        {orderBookTab === 'order-book' ? (
          <div className="px-3 py-3 bg-[#181A20] max-h-[500px] overflow-y-auto">
            <div className="flex items-center text-[#5E6673] text-[11px] font-medium mb-1.5">
              <div className="w-1/2 flex items-center gap-1 pr-1">
                <span className="w-[45px] shrink-0">Amount</span>
                <span className="flex-1 text-right text-[#0ECB81]">Bid</span>
              </div>
              <div className="w-px bg-[#2B3139] self-stretch mx-1" />
              <div className="w-1/2 flex items-center gap-1 pl-1">
                <span className="flex-1 text-[#F6465D]">Ask</span>
                <span className="w-[45px] shrink-0 text-right">Amount</span>
              </div>
            </div>

            <div className="space-y-0">
              {bidOrders.slice(0, 24).map((bid, index) => {
                const ask = askOrders[index];
                if (!ask) return null;
                return (
                  <div key={index} className="flex items-center py-[2px] relative">
                    <div
                      className="absolute left-0 top-0 h-full bg-[#0ECB81]/10 rounded-sm"
                      style={{ width: `${Math.min(Math.log10(bid.amount + 1) * 15, 48)}%`, zIndex: 0 }}
                    />
                    <div
                      className="absolute right-0 top-0 h-full bg-[#F6465D]/10 rounded-sm"
                      style={{ width: `${Math.min(Math.log10(ask.amount + 1) * 15, 48)}%`, zIndex: 0 }}
                    />

                    <div className="w-1/2 flex items-center gap-1 pr-1 relative z-10 min-w-0">
                      <span className="w-[45px] shrink-0 text-[11px] text-[#848E9C] tabular-nums">
                        {formatAmount(bid.amount)}
                      </span>
                      <span className="flex-1 text-right text-[12px] font-semibold text-[#0ECB81] tabular-nums truncate">
                        {formatPrice(bid.price)}
                      </span>
                    </div>

                    <div className="w-px bg-[#2B3139] self-stretch mx-1 shrink-0" />

                    <div className="w-1/2 flex items-center gap-1 pl-1 relative z-10 min-w-0">
                      <span className="flex-1 text-[12px] font-semibold text-[#F6465D] tabular-nums truncate">
                        {formatPrice(ask.price)}
                      </span>
                      <span className="w-[45px] shrink-0 text-right text-[11px] text-[#848E9C] tabular-nums">
                        {formatAmount(ask.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-[#2B3139] flex items-center justify-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px]">{bidPercentage.toFixed(2)}%</span>
                <div className="h-1 bg-[#2B3139] rounded-full overflow-hidden" style={{ width: '100px' }}>
                  <div className="h-full flex">
                    <div className="bg-[#0ECB81]" style={{ width: `${bidPercentage}%` }}></div>
                    <div className="bg-[#F6465D]" style={{ width: `${askPercentage}%` }}></div>
                  </div>
                </div>
                <span className="font-bold text-[11px]">{askPercentage.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 bg-[#181A20] max-h-[500px] overflow-y-auto">
            <div className="flex items-center text-[#5E6673] font-medium mb-2">
              <div className="flex-1">Price (USDT)</div>
              <div className="flex-1 text-right">Amount ({selectedSymbol})</div>
              <div className="flex-1 text-right">Time</div>
            </div>
            {recentTrades.slice(0, 20).map((trade, i) => (
              <div key={i} className="flex items-center text-[12px] py-1 hover:bg-[#181A20]/30 transition-colors">
                <div className={`flex-1 font-bold ${trade.isBuy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {formatPrice(trade.price)}
                </div>
                <div className="flex-1 text-right text-white">{formatAmount(trade.amount)}</div>
                <div className="flex-1 text-right text-[#5E6673] text-[10px]">{trade.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      <div className="fixed bottom-16 left-0 right-0 bg-[#181A20] border-[#2B3139] p-3 max-w-[480px] mx-auto shadow-lg z-40">
        <div className="flex items-center gap-2">
          <button className="flex-[0.7] bg-[#2B3139] hover:bg-[#343C45] font-semibold py-2.5 rounded text-xs transition-all flex items-center justify-center gap-1">
            <MoreHorizontal className="w-4 h-4" />
            More
          </button>
          <button className="flex-1 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] font-semibold py-2.5 rounded text-xs transition-all flex items-center justify-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Hub
          </button>
          <button className="flex-1 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] font-semibold py-2.5 rounded text-xs transition-all">
            Margin
          </button>
          <button
            onClick={() => setActiveTab('trade')}
            className="flex-1 bg-[#0ECB81] hover:bg-[#0ECB81]/90 font-bold py-2.5 rounded text-sm transition-all"
          >
            Buy
          </button>
          <button
            onClick={() => {
              setActiveTab('trade');
              setTradeSide('sell');
            }}
            className="flex-1 bg-[#F6465D] hover:bg-[#F6465D]/90 font-bold py-2.5 rounded text-sm transition-all"
          >
            Sell
          </button>
        </div>
      </div>

      {showCoinSelector && (
        <div className="fixed inset-0 bg-[#181A20] z-50 flex flex-col">
          <div className="bg-[#181A20] px-4 py-3 border-[#2B3139]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-white">Select Pair</h2>
              <button onClick={() => setShowCoinSelector(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center bg-[#2B3139] rounded-lg px-3 py-2.5">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent flex-1 outline-none placeholder-[#848E9C] text-[14px]"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setSelectorMarketTab('crypto')}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${selectorMarketTab === 'crypto' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400'}`}
              >Crypto</button>
              <button
                onClick={() => setSelectorMarketTab('metals')}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${selectorMarketTab === 'metals' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400'}`}
              >⚡ TradFi Spot</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2">
              {selectorMarketTab === 'metals' ? (() => {
                let lastSec2 = '';
                return filteredCoins.flatMap((coin) => {
                  const mc = getMetalCross(coin.symbol);
                  if (!mc) return [];
                  const crossPrice = computeMetalCrossPrice(mc);
                  const pairLbl = `${mc.base}/${mc.quote}`;
                  const sec = TRADFI_SECTIONS.find(s => s.bases.has(mc.base));
                  const items2: React.ReactNode[] = [];
                  if (sec && sec.label !== lastSec2) {
                    lastSec2 = sec.label;
                    items2.push(
                      <div key={`hdr2-${sec.label}`} className="flex items-center gap-2 mt-3 mb-1 px-2">
                        <span className="text-[12px]">{sec.emoji}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: sec.color }}>{sec.label}</span>
                        <div className="flex-1 h-px" style={{ background: sec.color + '33' }} />
                      </div>
                    );
                  }
                  items2.push(
                    <button
                      key={coin.symbol}
                      onClick={() => { changeSymbol(coin.symbol); setShowCoinSelector(false); setSearchQuery(''); setSelectorMarketTab('metals'); }}
                      className="flex items-center gap-3 py-2.5 w-full hover:bg-[#2B3139]/30 rounded-lg px-2"
                    >
                      <div className="w-8 h-8 flex-shrink-0">
                        {isMetalSymbol(mc.base)
                        ? <MetalIcon symbol={mc.base} size={32} />
                        : isTradFiIcon(mc.base)
                        ? <TradFiIcon symbol={mc.base} size={32} />
                        : <CoinLogo symbol={mc.base} dbUrl={coin.logo} />}
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-white">{pairLbl}</div>
                        <div className="text-gray-400 text-[12px]">{mc.name}</div>
                      </div>
                      {crossPrice > 0
                        ? <div className="text-right text-[13px] font-medium text-white">{crossPrice.toFixed(getPriceDecimals(crossPrice))} {mc.quote}</div>
                        : <Star className="w-4 h-4 text-gray-400" />}
                    </button>
                  );
                  return items2;
                });
              })() : filteredCoins.map((coin) => {
                const metalCross = getMetalCross(coin.symbol);
                const crossPrice = metalCross ? computeMetalCrossPrice(metalCross) : null;
                const pairLbl = metalCross ? `${metalCross.base}/${metalCross.quote}` : `${coin.symbol}/USDT`;
                return (
                  <button
                    key={coin.symbol}
                    onClick={() => {
                      changeSymbol(coin.symbol);
                      setShowCoinSelector(false);
                      setSearchQuery('');
                      setSelectorMarketTab(metalCross ? 'metals' : 'crypto');
                    }}
                    className="flex items-center gap-3 py-3 w-full hover:bg-[#2B3139]/30 rounded-lg px-2"
                  >
                    <div className="w-8 h-8 flex-shrink-0">
                      {metalCross && isMetalSymbol(metalCross.base)
                        ? <MetalIcon symbol={metalCross.base} size={32} />
                        : metalCross && isTradFiIcon(metalCross.base)
                        ? <TradFiIcon symbol={metalCross.base} size={32} />
                        : <CoinLogo symbol={metalCross?.base || coin.symbol} dbUrl={coin.logo} />}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-white">{pairLbl}</div>
                      <div className="text-gray-400 text-[12px]">{coin.name}</div>
                    </div>
                    {metalCross && crossPrice && crossPrice > 0 ? (
                      <div className="text-right text-[13px] font-medium text-white">
                        {crossPrice.toFixed(getPriceDecimals(crossPrice))} {metalCross.quote}
                      </div>
                    ) : (
                      <Star className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .slider-input::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          cursor: pointer;
          border-radius: 2px;
          transform: rotate(45deg);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .slider-input::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: white;
          cursor: pointer;
          border-radius: 2px;
          transform: rotate(45deg);
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      `}</style>

      {showQuickTrade && (
        <QuickTradeModal
          symbol={selectedSymbol}
          currentPrice={currentPrice}
          defaultSide={tradeSide}
          onClose={() => {
            setShowQuickTrade(false);
            if (user?.id) {
              loadBalances(user.id);
            }
          }}
        />
      )}

      {showUnitPreference && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
          onClick={() => setShowUnitPreference(false)}
        >
          <div
            className="bg-[#181A20] w-full max-w-md rounded-t-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[17px] font-semibold">Unit Preference</h3>
                <button
                  onClick={() => setShowUnitPreference(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 pb-2">
                <button
                  onClick={() => {
                    setUnitPreference('asset');
                    setShowUnitPreference(false);
                  }}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${ unitPreference === 'asset' ? 'border-[#0ECB81] bg-[#0ECB81]/5' : 'border-[#2B3139] bg-[#181A20] hover:border-[#474D57]' }`}
                >
                  <div className="font-semibold text-[15px] mb-2">{selectedSymbol}</div>
                  <div className="text-[13px] leading-relaxed">
                    Based on asset ({selectedSymbol}, ETH, BNB etc.) quantity, the order will execute as per quantity selected multiplied by the best available price for the current pair.
                  </div>
                </button>

                <button
                  onClick={() => {
                    setUnitPreference('usdt');
                    setShowUnitPreference(false);
                  }}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${ unitPreference === 'usdt' ? 'border-[#0ECB81] bg-[#0ECB81]/5' : 'border-[#2B3139] bg-[#181A20] hover:border-[#474D57]' }`}
                >
                  <div className="font-semibold text-[15px] mb-2">USDT</div>
                  <div className="text-[13px] leading-relaxed">
                    The order will execute based on the total amount you want to spend, regardless of asset ({selectedSymbol}, ETH, BNB etc.) quantity.
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

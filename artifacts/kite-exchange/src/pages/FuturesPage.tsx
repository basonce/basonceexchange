import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, Menu, Gift, BarChart3, Calculator, MoreVertical, Plus, Minus, ChevronUp, Settings, Zap } from 'lucide-react';
import FuturesPositionCard from '../components/FuturesPositionCard';
import CoinLogo from '../components/CoinLogo';
import MetalIcon, { isMetalSymbol } from '../components/MetalIcon';
import LeverageModal from '../components/LeverageModal';
import FuturesMarketSelector from '../components/FuturesMarketSelector';
import FuturesRecentTrades from '../components/FuturesRecentTrades';
import FuturesAdvancedOrders from '../components/FuturesAdvancedOrders';
import FuturesMarketStats from '../components/FuturesMarketStats';
import ClosePositionResultModal from '../components/ClosePositionResultModal';
import FuturesCampaignModal from '../components/FuturesCampaignModal';
import PnLCalculator from '../components/PnLCalculator';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { getEQVolume } from '../lib/eq-volume-service';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';
import { BNCPriceManager } from '../lib/bnc-price';
import { fetchBinanceTicker } from '../lib/binance';
import { PriceCache } from '../lib/price-cache';
import { formatPrice as sharedFormatPrice, formatAmount as sharedFormatAmount, getPriceDecimals } from '../lib/format-utils';
import {
  calculateLiquidationPrice,
  calculateMargin,
  calculateTradingFee,
  getMaintenanceMarginRate,
  getFundingRate,
  isPositionLiquidated,
} from '../lib/futures-calculator';
import { getProxiedLogoUrl } from '../lib/logo-utils';
import { isTradFiSymbol, getTradFiAsset } from '../lib/tradfi-data';
import { getCachedTradFiPrice, startTradFiPriceUpdater, subscribeTradFiPrice } from '../lib/tradfi-price-service';

const INDEPENDENT_PRICE_MANAGERS: Record<string, () => number> = {
  EQUSDT: () => EarnQuestPriceManager.getInstance().getPrice(),
  BNCUSDT: () => BNCPriceManager.getInstance().getPrice(),
  PAYAIUSDT: () => PayAIPriceManager.getInstance().getPrice(),
  SGPUSDT: () => SGPPriceManager.getInstance().getPrice(),
  POWERAIUSDT: () => PowerAIPriceManager.getInstance().getPrice(),
  SZNPUSDT: () => SZNPPriceManager.getInstance().getPrice(),
  PUNCHUSDT: () => PunchPriceManager.getInstance().getPrice(),
};

const INDEPENDENT_PRICE_TABLES: Record<string, { table: string; idCol: string; idVal: number | string; priceCol: string }> = {
  EQUSDT: { table: 'earnquest_price', idCol: 'id', idVal: 1, priceCol: 'current_price' },
};

async function fetchFreshPrice(symbol: string): Promise<number> {
  if (isTradFiSymbol(symbol)) {
    const liveData = getCachedTradFiPrice(symbol);
    if (liveData && liveData.price > 0) return liveData.price;
  }

  const dbSource = INDEPENDENT_PRICE_TABLES[symbol];
  if (dbSource) {
    try {
      const { data } = await supabase
        .from(dbSource.table)
        .select(dbSource.priceCol)
        .eq(dbSource.idCol, dbSource.idVal)
        .maybeSingle();
      if (data?.[dbSource.priceCol]) {
        const p = parseFloat(data[dbSource.priceCol]);
        if (p > 0) return p;
      }
    } catch {}
  }

  const indepGetter = INDEPENDENT_PRICE_MANAGERS[symbol];
  if (indepGetter) {
    const p = indepGetter();
    if (p > 0) return p;
  }

  const ticker = await fetchBinanceTicker(symbol);
  if (ticker) {
    const lp = parseFloat(ticker.lastPrice);
    if (lp > 0) return lp;
  }

  const pc = PriceCache.getInstance();
  const cached = pc.get(symbol);
  if (cached && cached.price > 0) return cached.price;

  try {
    const coinSymbol = symbol.replace('USDT', '');
    const { data } = await supabase
      .from('supported_coins')
      .select('current_price_usdt')
      .eq('symbol', coinSymbol)
      .maybeSingle();
    if (data?.current_price_usdt && data.current_price_usdt > 0) {
      return data.current_price_usdt;
    }
  } catch {}

  return 0;
}

function applyMicroMovement(price: number): number {
  if (price <= 0) return price;
  const decimals = getPriceDecimals(price);
  const tick = Math.pow(10, -decimals);
  const delta = (Math.random() - 0.5) * tick * 0.1;
  const moved = price + delta;
  return parseFloat(moved.toFixed(decimals + 1));
}

interface Position {
  id: string;
  symbol: string;
  side: string;
  position_size: number;
  entry_price: number;
  leverage: number;
  margin_mode?: string;
  margin: number;
  liquidation_price: number;
  unrealized_pnl: number;
  mark_price?: number;
  status: string;
}

interface OrderBookEntry {
  price: number;
  amount: number;
}

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  price: number;
  amount: number;
  filled: number;
  status: string;
  created_at: string;
}

const STOCK_LOGO_CHAIN: Record<string, string[]> = {
  TSLA:  ['https://logo.clearbit.com/tesla.com',        'https://www.google.com/s2/favicons?domain=tesla.com&sz=64'],
  AAPL:  ['https://logo.clearbit.com/apple.com',        'https://www.google.com/s2/favicons?domain=apple.com&sz=64'],
  AMZN:  ['https://logo.clearbit.com/amazon.com',       'https://www.google.com/s2/favicons?domain=amazon.com&sz=64'],
  MSTR:  ['https://logo.clearbit.com/microstrategy.com','https://www.google.com/s2/favicons?domain=microstrategy.com&sz=64'],
  HOOD:  ['https://logo.clearbit.com/robinhood.com',    'https://www.google.com/s2/favicons?domain=robinhood.com&sz=64'],
  INTC:  ['https://logo.clearbit.com/intel.com',        'https://www.google.com/s2/favicons?domain=intel.com&sz=64'],
  CRCL:  ['https://logo.clearbit.com/circle.com',       'https://www.google.com/s2/favicons?domain=circle.com&sz=64'],
  COIN:  ['https://logo.clearbit.com/coinbase.com',     'https://www.google.com/s2/favicons?domain=coinbase.com&sz=64'],
  PLTR:  ['https://logo.clearbit.com/palantir.com',     'https://www.google.com/s2/favicons?domain=palantir.com&sz=64'],
  NVDA:  ['https://logo.clearbit.com/nvidia.com',       'https://www.google.com/s2/favicons?domain=nvidia.com&sz=64'],
  GOOGL: ['https://logo.clearbit.com/google.com',       'https://www.google.com/s2/favicons?domain=google.com&sz=64'],
  META:  ['https://logo.clearbit.com/meta.com',         'https://www.google.com/s2/favicons?domain=meta.com&sz=64'],
  MSFT:  ['https://logo.clearbit.com/microsoft.com',    'https://www.google.com/s2/favicons?domain=microsoft.com&sz=64'],
};

function TradFiHeaderLogo({ displayName }: { displayName: string }) {
  const asset = getTradFiAsset(displayName);
  const chain = STOCK_LOGO_CHAIN[displayName] ?? [];
  const [idx, setIdx] = useState(0);
  const [logoErr, setLogoErr] = useState(false);
  const directLogo = asset?.logoUrl;
  const src = chain[idx];

  if (directLogo?.startsWith('sprite:')) {
    const spriteKey = directLogo.replace('sprite:', '');
    const spriteSources: Record<string, { src: string; col: number; row: number; cols: number; rows: number }> = {
      oil:     { src: '/EN copy copy copy copy.png',                                             col: 0, row: 0, cols: 3, rows: 1 },
      natgas:  { src: '/EN copy copy copy copy.png',                                             col: 1, row: 0, cols: 3, rows: 1 },
      sugar:   { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 0, row: 0, cols: 3, rows: 2 },
      wheat:   { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 1, row: 0, cols: 3, rows: 2 },
      corn:    { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 2, row: 0, cols: 3, rows: 2 },
      soybean: { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 0, row: 1, cols: 3, rows: 2 },
      coffee:  { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 1, row: 1, cols: 3, rows: 2 },
      cocoa:   { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 2, row: 1, cols: 3, rows: 2 },
      sp500:   { src: '/Buyuk_Amerikan_borsa_endeksleri_logolari copy copy copy copy copy.png', col: 0, row: 0, cols: 3, rows: 1 },
      nas100:  { src: '/Buyuk_Amerikan_borsa_endeksleri_logolari copy copy copy copy copy.png', col: 1, row: 0, cols: 3, rows: 1 },
      djia30:  { src: '/Buyuk_Amerikan_borsa_endeksleri_logolari copy copy copy copy copy.png', col: 2, row: 0, cols: 3, rows: 1 },
    };
    const entry = spriteSources[spriteKey];
    if (entry) {
      const { src, col, row, cols, rows } = entry;
      const px = 24;
      const totalW = cols * px;
      const totalH = rows * px;
      return (
        <div
          className="w-full h-full rounded-full overflow-hidden"
          style={{
            backgroundImage: `url('${src}')`,
            backgroundSize: `${totalW}px ${totalH}px`,
            backgroundPosition: `${-(col * px)}px ${-(row * px)}px`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      );
    }
  }

  if (directLogo && !logoErr) {
    const isPhoto = directLogo.includes('pexels.com');
    const isFlag = directLogo.includes('flagcdn.com');
    if (isPhoto) {
      return (
        <img
          src={directLogo}
          alt={displayName}
          className="w-full h-full rounded-full object-cover"
          loading="eager"
          onError={() => setLogoErr(true)}
        />
      );
    }
    if (isFlag) {
      return (
        <div className="w-full h-full rounded-full overflow-hidden">
          <img
            src={directLogo}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setLogoErr(true)}
          />
        </div>
      );
    }
    return (
      <img
        src={directLogo}
        alt={displayName}
        className="w-full h-full rounded-full object-cover bg-white"
        loading="eager"
        onError={() => setLogoErr(true)}
      />
    );
  }

  if (!src) {
    return (
      <div className="w-full h-full rounded-full bg-[#2B3139] flex items-center justify-center text-[8px] font-black text-white">
        {displayName.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      key={src}
      src={src}
      alt={displayName}
      className="w-full h-full rounded-full object-cover bg-white"
      loading="eager"
      onError={() => setIdx(i => i + 1)}
    />
  );
}

export default function FuturesPage({ initialSymbol }: { initialSymbol?: string }) {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol || 'BTCUSDT');
  const [selectedCoinLogo, setSelectedCoinLogo] = useState('https://cryptologos.cc/logos/bitcoin-btc-logo.png');
  const [currentPrice, setCurrentPrice] = useState(78023.0);
  const [priceChange, setPriceChange] = useState(-7.17);
  const [leverage, setLeverage] = useState(20);
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross');
  const [positionMode, setPositionMode] = useState<'one-way' | 'hedge'>('one-way');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market' | 'stop-limit' | 'stop-market'>('limit');
  const [price, setPrice] = useState('78035.7');
  const [amount, setAmount] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [showMarketSelector, setShowMarketSelector] = useState(false);
  const [showLeverageModal, setShowLeverageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'usdm' | 'coinm' | 'options' | 'smartm'>('usdm');
  const [activeBottomTab, setActiveBottomTab] = useState<'positions' | 'orders' | 'bots'>('positions');
  const [tpslEnabled, setTpslEnabled] = useState(false);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [postOnly, setPostOnly] = useState(false);
  const [timeInForce, setTimeInForce] = useState<'GTC' | 'IOC' | 'FOK'>('GTC');
  const [hideOtherPairs, setHideOtherPairs] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [markPrice, setMarkPrice] = useState(78023.0);
  const [lastPrice, setLastPrice] = useState(78023.0);
  const [high24h, setHigh24h] = useState(0);
  const [low24h, setLow24h] = useState(0);
  const [volume24h, setVolume24h] = useState(0);

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
  const [showOrderTypeDropdown, setShowOrderTypeDropdown] = useState(false);
  const [showTimeInForceDropdown, setShowTimeInForceDropdown] = useState(false);
  const [showAdvancedOrders, setShowAdvancedOrders] = useState(false);
  const [showMarketStats, setShowMarketStats] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showPnLCalculator, setShowPnLCalculator] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const positionsRef = useRef<Position[]>([]);

  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [askAmounts, setAskAmounts] = useState<number[]>([]);
  const [bidAmounts, setBidAmounts] = useState<number[]>([]);
  const [fundingRate, setFundingRate] = useState(0);
  const [fundingCountdown, setFundingCountdown] = useState('01:08:01');
  const [orderBookSize, setOrderBookSize] = useState(0.1);
  const [showOrderBookSizeMenu, setShowOrderBookSizeMenu] = useState(false);
  const [orderBookLayout, setOrderBookLayout] = useState<'both' | 'asks' | 'bids'>('both');
  const [closeResult, setCloseResult] = useState<{
    success: boolean;
    symbol: string;
    side: string;
    entryPrice: number;
    closePrice: number;
    positionSize: number;
    sizePnl: number;
    fees: number;
    netPnl: number;
    pnlPercentage: number;
  } | null>(null);
  const [showCloseResult, setShowCloseResult] = useState(false);

  const lastDepthFetchRef = useRef<number>(0);
  const asksRef = useRef<OrderBookEntry[]>([]);
  useEffect(() => { asksRef.current = asks; }, [asks]);

  const generateOrderBook = useCallback(async (price: number = currentPrice) => {
    if (price <= 0) return;

    const isIndep = INDEPENDENT_PRICE_MANAGERS[selectedSymbol] !== undefined;
    const isTradFi = isTradFiSymbol(selectedSymbol);
    const skipBinance = isIndep || isTradFi;
    const now = Date.now();
    const sinceDepth = now - lastDepthFetchRef.current;

    if (!skipBinance && sinceDepth >= 2000) {
      try {
        lastDepthFetchRef.current = now;
        const { fetchBinanceDepth } = await import('../lib/binance');
        const depth = await fetchBinanceDepth(selectedSymbol, 20);
        if (depth && depth.asks.length > 0 && depth.bids.length > 0) {
          // Binance asks: ASC sıralı (en düşük önce). Spread'e yakın 9'u al, sonra reverse → yüksek üstte, düşük altta
          const sortedAsksAsc = [...depth.asks].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
          const nearestAsks = sortedAsksAsc.slice(0, 9);
          const newAsks: OrderBookEntry[] = nearestAsks.reverse().map(([p, a], idx) => {
            const spike = Math.random() < 0.1 ? (1.8 + Math.random() * 2.5) : 1;
            const wave = 0.4 + 0.6 * Math.abs(Math.sin((idx / 9) * Math.PI * (1.2 + Math.random() * 0.8)));
            return { price: parseFloat(p), amount: parseFloat(a) * (0.25 + Math.pow(Math.random(), 0.55) * 1.2) * wave * spike };
          });
          // Binance bids: DESC sıralı (en yüksek önce). İlk 9 zaten doğru sıra → yüksek üstte, düşük altta
          const sortedBidsDesc = [...depth.bids].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
          const newBids: OrderBookEntry[] = sortedBidsDesc.slice(0, 9).map(([p, a], idx) => {
            const spike = Math.random() < 0.12 ? (2 + Math.random() * 3) : 1;
            const wave = 0.4 + 0.6 * Math.abs(Math.sin((idx / 9) * Math.PI * (1.2 + Math.random() * 0.8)));
            return { price: parseFloat(p), amount: parseFloat(a) * (0.3 + Math.pow(Math.random(), 0.55) * 1.5) * wave * spike };
          });
          setAsks(newAsks);
          setBids(newBids);
          setAskAmounts(newAsks.map(e => e.price * e.amount));
          setBidAmounts(newBids.map(e => e.price * e.amount));
          return;
        }
      } catch {}
    } else if (!skipBinance && sinceDepth < 2000) {
      setAskAmounts(prev => prev.map(a => a * (0.97 + Math.random() * 0.06)));
      setBidAmounts(prev => prev.map(a => a * (0.97 + Math.random() * 0.06)));
      if (asksRef.current.length > 0) return;
    }

    const newAsks: OrderBookEntry[] = [];
    const newBids: OrderBookEntry[] = [];
    const decimals = getPriceDecimals(price);
    const rawTick = Math.pow(10, -decimals);
    const tickSize = rawTick;
    const askBase = isTradFi ? (price > 1000 ? 600 : price > 100 ? 1500 : price > 10 ? 3000 : 8000) : (price > 1000 ? 800 : price > 10 ? 2000 : 8000);
    const bidBase = isTradFi ? (price > 1000 ? 4000 : price > 100 ? 12000 : price > 10 ? 25000 : 60000) : (price > 1000 ? 5000 : price > 10 ? 15000 : 60000);

    const organicQty = (base: number, idx: number): number => {
      const spike = Math.random() < 0.12 ? (2.2 + Math.random() * 3.5) : 1;
      const wave = 0.45 + 0.55 * Math.abs(Math.sin((idx / 9) * Math.PI * (1.3 + Math.random() * 0.7)));
      return base * (0.25 + Math.pow(Math.random(), 0.55) * 1.7) * wave * spike;
    };

    for (let i = 8; i >= 0; i--) {
      const askPrice = parseFloat((price + tickSize * (i + 1)).toFixed(decimals));
      newAsks.push({ price: askPrice, amount: organicQty(askBase, 8 - i) });
    }
    for (let i = 0; i < 9; i++) {
      const bidPrice = parseFloat((price - tickSize * (i + 1)).toFixed(decimals));
      newBids.push({ price: bidPrice, amount: organicQty(bidBase, i) });
    }
    setAsks(newAsks);
    setBids(newBids);
    setAskAmounts(newAsks.map(e => e.price * e.amount));
    setBidAmounts(newBids.map(e => e.price * e.amount));
  }, [selectedSymbol]);

  const currentPriceRef = useRef(currentPrice);
  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);

  const lastBinanceFetchRef = useRef<number>(0);
  const binancePriceRef = useRef<number>(0);
  const binanceChangeRef = useRef<number>(0);

  const loadPriceData = useCallback(async () => {
    try {
      let newPrice = currentPriceRef.current;

      if (isTradFiSymbol(selectedSymbol)) {
        const liveData = getCachedTradFiPrice(selectedSymbol);
        if (liveData && liveData.price > 0) {
          setCurrentPrice(liveData.price);
          setPriceChange(liveData.change);
          setMarkPrice(liveData.price);
          setLastPrice(liveData.price);
          setPrice(liveData.price.toFixed(getPriceDecimals(liveData.price)));
          await generateOrderBook(liveData.price);
        }
        return;
      }

      const indepGetter = INDEPENDENT_PRICE_MANAGERS[selectedSymbol];
      if (indepGetter) {
        newPrice = indepGetter();
        if (newPrice > 0) {
          setCurrentPrice(newPrice);
          const symBase = selectedSymbol.replace('USDT', '');
          let change = 0;
          let indepMgr: any = null;
          if (symBase === 'EQ') { change = EarnQuestPriceManager.getInstance().getChange(); indepMgr = EarnQuestPriceManager.getInstance(); }
          else if (symBase === 'BNC') { change = BNCPriceManager.getInstance().getChange(); indepMgr = BNCPriceManager.getInstance(); }
          else if (symBase === 'PAYAI') { change = PayAIPriceManager.getInstance().getChange(); indepMgr = PayAIPriceManager.getInstance(); }
          else if (symBase === 'SGP') { change = SGPPriceManager.getInstance().getChange(); indepMgr = SGPPriceManager.getInstance(); }
          else if (symBase === 'POWERAI') { change = PowerAIPriceManager.getInstance().getChange(); indepMgr = PowerAIPriceManager.getInstance(); }
          else if (symBase === 'SZNP') { change = SZNPPriceManager.getInstance().getChange(); indepMgr = SZNPPriceManager.getInstance(); }
          else if (symBase === 'PUNCH') { change = PunchPriceManager.getInstance().getChange(); indepMgr = PunchPriceManager.getInstance(); }
          if (indepMgr) {
            setHigh24h(safeHigh(newPrice, indepMgr.getHigh24h()));
            setLow24h(safeLow(newPrice, indepMgr.getLow24h()));
            setVolume24h(symBase === 'EQ' ? getEQVolume() : indepMgr.getMarketCap());
          }
          setPriceChange(change);
          setMarkPrice(newPrice);
          setLastPrice(newPrice);
          setPrice(newPrice.toFixed(getPriceDecimals(newPrice)));
        }
      } else {
        const now = Date.now();
        const sinceLastFetch = now - lastBinanceFetchRef.current;

        if (sinceLastFetch >= 3000) {
          lastBinanceFetchRef.current = now;
          const ticker = await fetchBinanceTicker(selectedSymbol);
          if (ticker) {
            const lp = parseFloat(ticker.lastPrice);
            if (lp > 0) {
              binancePriceRef.current = lp;
              binanceChangeRef.current = parseFloat(ticker.priceChangePercent);
              newPrice = lp;
              setHigh24h(parseFloat(ticker.highPrice));
              setLow24h(parseFloat(ticker.lowPrice));
              setVolume24h(parseFloat(ticker.quoteVolume));
            }
          } else {
            const pc = PriceCache.getInstance();
            const cached = pc.get(selectedSymbol);
            if (cached && cached.price > 0) {
              binancePriceRef.current = cached.price;
              binanceChangeRef.current = cached.change24h;
              newPrice = cached.price;
            }
          }
        } else if (binancePriceRef.current > 0) {
          newPrice = applyMicroMovement(binancePriceRef.current);
        } else {
          const pc = PriceCache.getInstance();
          const cached = pc.get(selectedSymbol);
          if (cached && cached.price > 0) {
            binancePriceRef.current = cached.price;
            binanceChangeRef.current = cached.change24h;
            newPrice = cached.price;
          }
        }

        if (newPrice > 0) {
          setCurrentPrice(newPrice);
          setPriceChange(binanceChangeRef.current);
          setPrice(newPrice.toFixed(getPriceDecimals(newPrice)));
          setMarkPrice(newPrice);
          setLastPrice(newPrice);
        }
      }

      const newFundingRate = getFundingRate(selectedSymbol);
      setFundingRate(newFundingRate);

      await generateOrderBook(newPrice);
    } catch (error) {
      console.error('Failed to load price:', error);
    }
  }, [selectedSymbol, generateOrderBook]);

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        Promise.all([
          loadUserBalance(session.user.id),
          loadPositions(session.user.id),
          loadOpenOrders(session.user.id),
        ]);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const positionsChannel = supabase
      .channel('futures_positions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'futures_positions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Position changed:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            loadPositions(userId);
          } else if (payload.eventType === 'INSERT') {
            loadPositions(userId);
          }
        }
      )
      .subscribe();

    const balancesChannel = supabase
      .channel('user_balances_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadUserBalance(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(positionsChannel);
      supabase.removeChannel(balancesChannel);
    };
  }, [userId]);

  useEffect(() => {
    const priceCache = PriceCache.getInstance();
    if (!priceCache.isReady()) {
      priceCache.init();
    }
  }, []);

  useEffect(() => {
    setCurrentPrice(0);
    setMarkPrice(0);
    setLastPrice(0);
    setPrice('');
    setAsks([]);
    setBids([]);
    setAskAmounts([]);
    setBidAmounts([]);
    asksRef.current = [];
    lastBinanceFetchRef.current = 0;
    binancePriceRef.current = 0;
    binanceChangeRef.current = 0;
    lastDepthFetchRef.current = 0;

    const LOGO_FALLBACKS: Record<string, string> = {
      EQ: '/EARNQUEST-LOGO-ICON-2.png',
      EQUSDT: '/EARNQUEST-LOGO-ICON-2.png',
      BNC: '/bnc-logo.png',
      BNCUSDT: '/bnc-logo.png',
    };

    const fetchCoinLogo = async () => {
      const coinSymbol = selectedSymbol.replace('USDT', '');
      if (LOGO_FALLBACKS[coinSymbol]) {
        setSelectedCoinLogo(LOGO_FALLBACKS[coinSymbol]);
        return;
      }
      const { data } = await supabase
        .from('supported_coins')
        .select('logo_url')
        .eq('symbol', coinSymbol)
        .maybeSingle();

      if (data?.logo_url) {
        setSelectedCoinLogo(getProxiedLogoUrl(data.logo_url));
      }
    };

    fetchCoinLogo();

    if (isTradFiSymbol(selectedSymbol)) {
      const cached = getCachedTradFiPrice(selectedSymbol);
      if (cached && cached.price > 0) {
        setCurrentPrice(cached.price);
        setMarkPrice(cached.price);
        setLastPrice(cached.price);
        setPrice(cached.price.toFixed(getPriceDecimals(cached.price)));
        setPriceChange(cached.change);
      }
    } else {
      const indepGetter = INDEPENDENT_PRICE_MANAGERS[selectedSymbol];
      if (indepGetter) {
        const p = indepGetter();
        if (p > 0) {
          setCurrentPrice(p);
          setMarkPrice(p);
          setLastPrice(p);
          setPrice(p.toFixed(getPriceDecimals(p)));
        }
      }
    }

    loadPriceData();

    const priceInterval = setInterval(loadPriceData, 2000);

    let unsubscribeFn: (() => void) | null = null;

    if (isTradFiSymbol(selectedSymbol)) {
      unsubscribeFn = subscribeTradFiPrice(selectedSymbol, () => { loadPriceData(); });
      const stopUpdater = startTradFiPriceUpdater();
      return () => {
        clearInterval(priceInterval);
        if (unsubscribeFn) unsubscribeFn();
        stopUpdater();
      };
    }

    const symBase = selectedSymbol.replace('USDT', '');
    let mgr: any = null;
    if (symBase === 'EQ') mgr = EarnQuestPriceManager.getInstance();
    else if (symBase === 'BNC') mgr = BNCPriceManager.getInstance();
    else if (symBase === 'PAYAI') mgr = PayAIPriceManager.getInstance();
    else if (symBase === 'SGP') mgr = SGPPriceManager.getInstance();
    else if (symBase === 'POWERAI') mgr = PowerAIPriceManager.getInstance();
    else if (symBase === 'SZNP') mgr = SZNPPriceManager.getInstance();
    else if (symBase === 'PUNCH') mgr = PunchPriceManager.getInstance();
    if (mgr) {
      unsubscribeFn = mgr.subscribe(() => { loadPriceData(); });
    }

    return () => {
      clearInterval(priceInterval);
      if (unsubscribeFn) unsubscribeFn();
    };
  }, [selectedSymbol]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const seconds = now.getSeconds();
      const minutes = now.getMinutes();
      const hours = now.getHours();

      const nextFundingHour = Math.ceil(hours / 8) * 8;
      const hoursLeft = nextFundingHour - hours;
      const minutesLeft = 8 - (minutes % 8);
      const secondsLeft = 60 - seconds;

      setFundingCountdown(`${String(hoursLeft).padStart(2, '0')}:${String(minutesLeft).padStart(2, '0')}:${String(secondsLeft).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    if (!userId) return;

    const liquidatingSet = new Set<string>();

    const getMarkPrice = async (position: Position): Promise<number> => {
      const indepGetter = INDEPENDENT_PRICE_MANAGERS[position.symbol];
      if (indepGetter) {
        const p = indepGetter();
        if (p > 0) return p;
      }

      const pc = PriceCache.getInstance();
      const cached = pc.get(position.symbol);
      if (cached && cached.price > 0) return cached.price;

      if (position.symbol === 'EQUSDT') {
        try {
          const { data } = await supabase
            .from('earnquest_price')
            .select('current_price')
            .eq('id', 1)
            .maybeSingle();
          if (data?.current_price) {
            const p = parseFloat(data.current_price);
            if (p > 0) return p;
          }
        } catch {}
      }

      try {
        const coinSymbol = position.symbol.replace('USDT', '');
        const { data } = await supabase
          .from('supported_coins')
          .select('current_price_usdt')
          .eq('symbol', coinSymbol)
          .maybeSingle();
        if (data?.current_price_usdt && data.current_price_usdt > 0) {
          return data.current_price_usdt;
        }
      } catch {}

      return position.mark_price || position.entry_price || 0;
    };

    const runCycle = async () => {
      const positions = positionsRef.current;
      const uid = userId;
      if (!uid || positions.length === 0) return;

      const updated: Position[] = [];

      for (const pos of positions) {
        if (pos.status !== 'open') { updated.push(pos); continue; }
        if (liquidatingSet.has(pos.id)) continue;

        const mp = await getMarkPrice(pos);
        if (mp <= 0) { updated.push(pos); continue; }

        const side = pos.side === 'LONG' ? 'LONG' : 'SHORT';
        const mmr = getMaintenanceMarginRate(pos.position_size, pos.symbol, pos.leverage);
        const liqPrice = calculateLiquidationPrice(
          pos.entry_price, pos.leverage, side, mmr,
          pos.margin_mode || 'isolated', pos.margin, 0
        );

        const posWithPrice: Position = { ...pos, mark_price: mp, liquidation_price: liqPrice };

        if (Math.abs(liqPrice - pos.liquidation_price) > pos.entry_price * 0.0001) {
          supabase.from('futures_positions')
            .update({ liquidation_price: liqPrice })
            .eq('id', pos.id)
            .then();
        }

        const shouldLiquidate = side === 'LONG' ? mp <= liqPrice : mp >= liqPrice;

        if (shouldLiquidate) {
          liquidatingSet.add(pos.id);
          try {
            const mmrFinal = getMaintenanceMarginRate(pos.position_size, pos.symbol, pos.leverage);
            const closeFee = calculateTradingFee(pos.position_size, false);

            await supabase.from('futures_history').insert({
              user_id: uid,
              symbol: pos.symbol,
              side: pos.side,
              leverage: pos.leverage,
              entry_price: pos.entry_price,
              close_price: mp,
              position_size: pos.position_size,
              margin: pos.margin,
              liquidation_price: liqPrice,
              maintenance_margin_rate: mmrFinal,
              realized_pnl: -pos.margin,
              trading_fee: closeFee,
              close_reason: 'liquidated',
              created_at: new Date().toISOString()
            });

            await supabase.from('futures_positions').delete().eq('id', pos.id);


            loadUserBalance(uid);
            loadPositions(uid);
          } catch (err) {
            console.error('Liquidation error:', err);
            liquidatingSet.delete(pos.id);
            updated.push(posWithPrice);
          }
        } else {
          updated.push(posWithPrice);
        }
      }

      setPositions(prev => prev.filter(p => !liquidatingSet.has(p.id)).map(p => {
        const u = updated.find(u => u.id === p.id);
        return u || p;
      }));
    };

    runCycle();
    const interval = setInterval(runCycle, 2000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadUserBalance = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('futures_balance')
        .eq('user_id', uid)
        .eq('symbol', 'USDT')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUsdtBalance(data.futures_balance || 0);
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const loadPositions = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('futures_positions')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const positionsWithMode = (data || []).map(pos => ({
        ...pos,
        margin_mode: marginMode
      }));

      setPositions(positionsWithMode);
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  };

  const loadOpenOrders = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('futures_orders')
        .select('*')
        .eq('user_id', uid)
        .in('status', ['pending', 'partial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpenOrders(data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const liquidatePosition = async (position: Position, liquidationPrice: number) => {
    try {
      const verifiedPrice = await fetchFreshPrice(position.symbol);
      const positionSide = position.side === 'LONG' ? 'LONG' : 'SHORT';
      if (verifiedPrice > 0) {
        if (!isPositionLiquidated(positionSide, verifiedPrice, position.liquidation_price)) {
          return;
        }
        liquidationPrice = verifiedPrice;
      }

      const quantity = position.position_size / position.entry_price;
      const priceDiff = position.side === 'LONG'
        ? (liquidationPrice - position.entry_price)
        : (position.entry_price - liquidationPrice);

      const grossPnl = priceDiff * quantity;
      const closeFee = calculateTradingFee(position.position_size, false);
      const netPnl = grossPnl - closeFee;

      const maintenanceMarginRate = getMaintenanceMarginRate(position.position_size, position.symbol, position.leverage);

      const { error: historyError } = await supabase
        .from('futures_history')
        .insert({
          user_id: userId,
          symbol: position.symbol,
          side: position.side,
          leverage: position.leverage,
          entry_price: position.entry_price,
          close_price: liquidationPrice,
          position_size: position.position_size,
          margin: position.margin,
          liquidation_price: position.liquidation_price,
          maintenance_margin_rate: maintenanceMarginRate,
          realized_pnl: netPnl,
          trading_fee: closeFee,
          close_reason: 'liquidated',
          created_at: new Date().toISOString()
        });

      if (historyError) throw historyError;

      const { error: deleteError } = await supabase
        .from('futures_positions')
        .delete()
        .eq('id', position.id);

      if (deleteError) throw deleteError;

      const { data: freshBalance } = await supabase
        .from('user_balances')
        .select('futures_balance')
        .eq('user_id', userId)
        .eq('symbol', 'USDT')
        .maybeSingle();

      const currentFuturesBalance = freshBalance?.futures_balance || 0;
      const newBalance = Math.max(0, currentFuturesBalance);

      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({ futures_balance: newBalance })
        .eq('user_id', userId)
        .eq('symbol', 'USDT');

      if (balanceError) throw balanceError;

      if (userId) {
        await loadUserBalance(userId);
        await loadPositions(userId);
      }

      const entryDisplay = position.entry_price.toFixed(getPriceDecimals(position.entry_price));
      const liqDisplay = liquidationPrice.toFixed(getPriceDecimals(liquidationPrice));

      alert(`LIQUIDATION\n\nYour ${position.side} position on ${position.symbol} was liquidated!\n\nEntry: ${entryDisplay}\nLiq Price: ${liqDisplay}\nMargin Lost: ${position.margin.toFixed(2)} USDT`);
    } catch (error) {
      console.error('Failed to liquidate position:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!userId || !amount) {
      alert('Please enter amount');
      return;
    }

    try {
      setLoading(true);
      const marginAmount = parseFloat(amount);

      if (marginAmount <= 0) {
        alert('Amount must be greater than 0');
        return;
      }

      if (marginAmount < 5) {
        alert('Minimum margin is 5 USDT');
        return;
      }

      const freshPrice = await fetchFreshPrice(selectedSymbol);
      if (!freshPrice || freshPrice <= 0) {
        alert('Cannot fetch current price. Please try again.');
        return;
      }

      let orderPrice: number;
      if (orderType === 'market') {
        orderPrice = freshPrice;
      } else {
        orderPrice = parseFloat(price);
        if (!orderPrice || orderPrice <= 0) {
          alert('Invalid price. Please enter a valid price.');
          return;
        }
        const ratio = orderPrice / freshPrice;
        if (ratio > 10 || ratio < 0.1) {
          alert(`Price ${orderPrice} seems incorrect for ${selectedSymbol}. Current market price is ${freshPrice}. Please check your price.`);
          return;
        }
      }

      if (usdtBalance <= 0) {
        alert('Insufficient balance. Please deposit funds first.');
        return;
      }

      const positionSize = marginAmount * leverage;
      const tradingFee = calculateTradingFee(positionSize, orderType === 'limit');
      const totalCost = marginAmount + tradingFee;

      if (totalCost > usdtBalance) {
        alert(`Insufficient balance. Required: ${totalCost.toFixed(2)} USDT, Available: ${usdtBalance.toFixed(2)} USDT`);
        return;
      }

      const positionSide = side === 'buy' ? 'LONG' : 'SHORT';
      const maintenanceMarginRate = getMaintenanceMarginRate(positionSize, selectedSymbol, leverage);
      const liquidationPrice = calculateLiquidationPrice(
        orderPrice,
        leverage,
        positionSide,
        maintenanceMarginRate,
        marginMode,
        marginAmount,
        usdtBalance
      );

      const { error: positionError } = await supabase
        .from('futures_positions')
        .insert({
          user_id: userId,
          symbol: selectedSymbol,
          side: positionSide,
          position_size: positionSize,
          entry_price: orderPrice,
          leverage: leverage,
          margin: marginAmount,
          liquidation_price: liquidationPrice,
          unrealized_pnl: 0,
          realized_pnl: 0,
          trading_fee: tradingFee,
          status: 'open',
          margin_mode: marginMode,
          maintenance_margin_rate: maintenanceMarginRate
        });

      if (positionError) throw positionError;

      const newBalance = Math.max(0, usdtBalance - totalCost);
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({ futures_balance: newBalance })
        .eq('user_id', userId)
        .eq('symbol', 'USDT');

      if (balanceError) throw balanceError;

      await loadUserBalance(userId);
      await loadPositions(userId);

      setAmount('');

      const liqPriceDisplay = liquidationPrice < 1 ? liquidationPrice.toFixed(8) : liquidationPrice.toFixed(2);
      const entryPriceDisplay = orderPrice < 1 ? orderPrice.toFixed(8) : orderPrice.toFixed(2);

      alert(`${positionSide} position opened!\nEntry Price: ${entryPriceDisplay} USDT\nMargin: ${marginAmount} USDT\nPosition Size: ${positionSize.toFixed(2)} USDT\nLeverage: ${leverage}x\nLiquidation Price: ${liqPriceDisplay} USDT`);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePositionWithModal = async (
    positionId: string,
    closeType: 'market' | 'limit',
    limitPrice?: number,
    percentage: number = 100
  ) => {
    if (!userId) {
      alert('User not authenticated');
      return;
    }

    try {
      const position = positions.find(p => p.id === positionId);
      if (!position) {
        alert('Position not found');
        return;
      }

      let closePrice: number;
      if (closeType === 'market') {
        const freshPrice = await fetchFreshPrice(position.symbol);
        if (!freshPrice || freshPrice <= 0) {
          alert('Cannot fetch current price for ' + position.symbol + '. Please try again.');
          return;
        }
        closePrice = freshPrice;
      } else {
        closePrice = limitPrice || 0;
        if (closePrice <= 0) {
          alert('Invalid limit price');
          return;
        }
        const freshPrice = await fetchFreshPrice(position.symbol);
        if (freshPrice > 0) {
          const ratio = closePrice / freshPrice;
          if (ratio > 10 || ratio < 0.1) {
            alert(`Limit price ${closePrice} seems incorrect for ${position.symbol}. Current market price is ${freshPrice}.`);
            return;
          }
        }
      }

      const quantity = position.position_size / position.entry_price;
      const priceDiff = position.side === 'LONG'
        ? (closePrice - position.entry_price)
        : (position.entry_price - closePrice);

      const grossPnl = priceDiff * quantity * (percentage / 100);
      const closeFee = calculateTradingFee(position.position_size * (percentage / 100), false);
      const netPnl = grossPnl - closeFee;

      const maintenanceMarginRate = getMaintenanceMarginRate(position.position_size, position.symbol, position.leverage);

      const { error: historyError } = await supabase
        .from('futures_history')
        .insert({
          user_id: userId,
          symbol: position.symbol,
          side: position.side,
          leverage: position.leverage,
          entry_price: position.entry_price,
          close_price: closePrice,
          position_size: position.position_size * (percentage / 100),
          margin: position.margin * (percentage / 100),
          liquidation_price: position.liquidation_price,
          maintenance_margin_rate: maintenanceMarginRate,
          realized_pnl: netPnl,
          trading_fee: closeFee,
          close_reason: 'manual',
          created_at: new Date().toISOString()
        });

      if (historyError) throw historyError;

      const { error: deleteError } = await supabase
        .from('futures_positions')
        .delete()
        .eq('id', positionId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      const returnAmount = position.margin * (percentage / 100) + netPnl;

      const { data: freshBal } = await supabase
        .from('user_balances')
        .select('futures_balance')
        .eq('user_id', userId)
        .eq('symbol', 'USDT')
        .maybeSingle();
      const freshBalance = freshBal?.futures_balance ?? usdtBalance;
      const newBalance = Math.max(0, freshBalance + returnAmount);

      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({ futures_balance: newBalance })
        .eq('user_id', userId)
        .eq('symbol', 'USDT');

      if (balanceError) throw balanceError;

      await loadUserBalance(userId);
      await loadPositions(userId);

      const pnlPercentage = (netPnl / (position.margin * (percentage / 100))) * 100;

      setCloseResult({
        success: true,
        symbol: position.symbol,
        side: position.side,
        entryPrice: position.entry_price,
        closePrice: closePrice,
        positionSize: position.position_size * (percentage / 100),
        sizePnl: grossPnl,
        fees: closeFee,
        netPnl: netPnl,
        pnlPercentage: pnlPercentage
      });
      setShowCloseResult(true);
    } catch (error: any) {
      console.error('Close position failed:', error);
      alert(`Failed to close position: ${error?.message || 'Unknown error'}`);

      setCloseResult({
        success: false,
        symbol: '',
        side: '',
        entryPrice: 0,
        closePrice: 0,
        positionSize: 0,
        sizePnl: 0,
        fees: 0,
        netPnl: 0,
        pnlPercentage: 0
      });
      setShowCloseResult(true);
    }
  };

  const handleClosePosition = async (positionId: string) => {
    handleClosePositionWithModal(positionId, 'market', undefined, 100);
  };

  const handleCloseAllPositions = async () => {
    if (!userId || positions.length === 0) return;
    const confirmed = window.confirm(`Close all ${positions.length} position(s) at market price?`);
    if (!confirmed) return;
    for (const position of [...positions]) {
      await handleClosePositionWithModal(position.id, 'market', undefined, 100);
    }
  };

  const handleAdvancedOrder = async (orderData: any) => {
    if (!userId) return;
    try {
      setLoading(true);
      alert(`${orderData.type} order placed successfully! This will be triggered when conditions are met.`);
    } catch (error) {
      console.error('Failed to place advanced order:', error);
      alert('Failed to place advanced order');
    } finally {
      setLoading(false);
    }
  };

  const totalBidAmount = bidAmounts.reduce((sum, v) => sum + v, 0) || bids.reduce((sum, bid) => sum + bid.amount, 0);
  const totalAskAmount = askAmounts.reduce((sum, v) => sum + v, 0) || asks.reduce((sum, ask) => sum + ask.amount, 0);
  const bidPercentage = totalBidAmount / (totalBidAmount + totalAskAmount) * 100 || 50;
  const askPercentage = 100 - bidPercentage;

  const formatPrice = sharedFormatPrice;
  const formatAmount = sharedFormatAmount;

  return (
    <div className="bg-[#181A20] text-white flex flex-col overflow-x-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#181A20] border-[#2B3139]">
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setActiveTab('usdm')}
            className={`font-medium ${activeTab === 'usdm' ? 'text-white' : 'text-gray-500'}`}
          >
            USD⊙-M
          </button>
          <button
            onClick={() => setActiveTab('coinm')}
            className={`font-medium ${activeTab === 'coinm' ? 'text-white' : 'text-gray-500'}`}
          >
            COIN-M
          </button>
          <button
            onClick={() => setActiveTab('options')}
            className={`font-medium ${activeTab === 'options' ? 'text-white' : 'text-gray-500'}`}
          >
            Options
          </button>
          <button
            onClick={() => setActiveTab('smartm')}
            className={`font-medium ${activeTab === 'smartm' ? 'text-white' : 'text-gray-500'}`}
          >
            Smart M
          </button>
        </div>
        <button className="text-gray-400">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-[#181A20]">
        <div>
          <button
            onClick={() => setShowMarketSelector(true)}
            className="flex items-center gap-1.5"
          >
            <div className="w-6 h-6 flex-shrink-0">
              {isMetalSymbol(selectedSymbol) ? (
                <MetalIcon symbol={selectedSymbol} size={24} />
              ) : (() => {
                const baseSymbol = selectedSymbol.replace('USDT', '');
                const tradFiAsset = getTradFiAsset(selectedSymbol) || getTradFiAsset(baseSymbol);
                if (tradFiAsset) {
                  return <TradFiHeaderLogo displayName={tradFiAsset.displayName} />;
                }
                return <CoinLogo symbol={baseSymbol} dbUrl={selectedCoinLogo} eager />;
              })()}
            </div>
            <span className="text-base font-bold">{selectedSymbol}</span>
            <span className="text-gray-500">Perp</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <div className="flex items-center gap-3 mt-0.5">
            <div className={`text-sm font-bold ${priceChange >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
            <div className="text-gray-500 text-xs">
              Mark: <span className="text-white">{formatPrice(currentPrice)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCampaignModal(true)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#2B3139] active:bg-[#363D47] transition-colors"
          >
            <Gift className="w-5 h-5 text-gray-400" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F0B90B] rounded-full"></div>
          </button>
          <button
            onClick={() => setShowMarketStats(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#2B3139] active:bg-[#363D47] transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={() => setShowPnLCalculator(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#2B3139] active:bg-[#363D47] transition-colors"
          >
            <Calculator className="w-5 h-5 text-gray-400" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(prev => !prev)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#2B3139] active:bg-[#363D47] transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F0B90B] rounded-full"></div>
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-10 z-50 w-52 bg-[#1E2329] border border-[#2B3139] rounded-xl shadow-2xl overflow-hidden">
                <div className="py-1">
                  {[
                    { label: 'Price Alert', icon: '🔔' },
                    { label: 'Order Confirmation', icon: '✅' },
                    { label: 'Trading Rules', icon: '📋' },
                    { label: 'Fee Structure', icon: '💰' },
                    { label: 'API Trading', icon: '⚡' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setShowMoreMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-[#2B3139] hover:text-white transition-colors text-left"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181A20]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLeverageModal(true)}
            className="bg-[#2B3139] hover:bg-[#363D47] px-2 py-1 rounded-sm text-white text-[11px]"
          >
            {marginMode === 'cross' ? 'Cross' : 'Isolated'}
          </button>
          <button
            onClick={() => setShowLeverageModal(true)}
            className="bg-[#2B3139] hover:bg-[#363D47] px-2 py-1 rounded-sm text-white text-[11px]"
          >
            {leverage}x
          </button>
          <button className="bg-[#2B3139] hover:bg-[#363D47] px-2.5 py-1 rounded-sm text-white text-xs font-semibold">
            S
          </button>
        </div>
        <div className="text-right">
          <div className="text-gray-500 text-[10px]">Funding (8h) / Countdown</div>
          <div className="text-white text-[11px]">
            {fundingRate >= 0 ? '+' : ''}{(fundingRate * 100).toFixed(4)}%/{fundingCountdown}
          </div>
        </div>
      </div>

      <FuturesMarketStats
        symbol={selectedSymbol}
        currentPrice={currentPrice}
        priceChange={priceChange}
        high24h={high24h}
        low24h={low24h}
        volume24h={volume24h}
        turnover24h={volume24h * currentPrice}
      />

      <div className="flex max-w-full" style={{ minHeight: '460px' }}>
        <div className="flex flex-col px-2 py-2 overflow-x-hidden w-[52%]">
          <div className="flex rounded-md overflow-hidden mb-2">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${ side === 'buy' ? 'bg-[#0ECB81] text-white' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${ side === 'sell' ? 'bg-[#F6465D] text-white' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Sell
            </button>
          </div>

          <div className="mb-2 relative">
            <button
              onClick={() => setShowOrderTypeDropdown(!showOrderTypeDropdown)}
              className="w-full flex items-center justify-between bg-[#2B3139] rounded px-2 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-white capitalize">
                  {orderType === 'stop-limit' ? 'Stop-Limit' : orderType === 'stop-market' ? 'Stop-Market' : orderType.charAt(0).toUpperCase() + orderType.slice(1)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {showOrderTypeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#2B3139] rounded shadow-lg z-50 border border-[#2B3139]">
                {(['limit', 'market', 'stop-limit', 'stop-market'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setOrderType(type);
                      setShowOrderTypeDropdown(false);
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-[#363D47] transition-colors flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-full border border-[#474D57] flex items-center justify-center">
                      {orderType === type && <div className="w-2 h-2 bg-[#F0B90B] rounded-full"></div>}
                    </div>
                    <span className="text-white capitalize">
                      {type === 'stop-limit' ? 'Stop-Limit' : type === 'stop-market' ? 'Stop-Market' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(orderType === 'stop-limit' || orderType === 'stop-market') && (
            <div className="mb-2">
              <div className="text-gray-500 mb-1 text-[10px]">Stop Price (USDT)</div>
              <div className="flex items-center bg-[#2B3139] rounded overflow-hidden">
                <button
                  onClick={() => {
                    const val = parseFloat(stopPrice || currentPrice.toString());
                    setStopPrice((val - 0.1).toFixed(1));
                  }}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="text"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  placeholder={formatPrice(currentPrice)}
                  className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none placeholder:text-gray-600 truncate px-1"
                />
                <button
                  onClick={() => {
                    const val = parseFloat(stopPrice || currentPrice.toString());
                    const dec = getPriceDecimals(currentPrice);
                    const increment = parseFloat((currentPrice * 0.0001).toFixed(dec));
                    setStopPrice((val + (increment || Math.pow(10, -dec))).toFixed(dec));
                  }}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setStopPrice(formatPrice(currentPrice))}
                  className="flex-shrink-0 px-2 py-1.5 text-[#F0B90B] border-[#2B3139] text-[11px]"
                >
                  Mark
                </button>
              </div>
            </div>
          )}

          {(orderType === 'limit' || orderType === 'stop-limit') && (
            <div className="mb-2">
              <div className="text-gray-500 mb-1 text-[10px]">Price (USDT)</div>
              <div className="flex items-center bg-[#2B3139] rounded overflow-hidden">
                <button
                  onClick={() => {
                    const dec = getPriceDecimals(currentPrice);
                    const increment = parseFloat((currentPrice * 0.0001).toFixed(dec));
                    setPrice((parseFloat(price) - (increment || Math.pow(10, -dec))).toFixed(dec));
                  }}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none truncate px-1"
                />
                <button
                  onClick={() => {
                    const dec = getPriceDecimals(currentPrice);
                    const increment = parseFloat((currentPrice * 0.0001).toFixed(dec));
                    setPrice((parseFloat(price) + (increment || Math.pow(10, -dec))).toFixed(dec));
                  }}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button className="flex-shrink-0 px-2 py-1.5 text-[#F0B90B] border-[#2B3139] text-[11px]">
                  BBO
                </button>
              </div>
            </div>
          )}

          <div className="mb-2">
            <div className="text-gray-500 mb-1 text-[10px]">Margin (USDT)</div>
            <div className="flex items-center bg-[#2B3139] rounded overflow-hidden">
              <button
                onClick={() => {
                  const val = parseFloat(amount || '0');
                  if (val > 0) setAmount((val - 10).toFixed(2));
                }}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Margin"
                className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none placeholder:text-gray-600 truncate px-1"
              />
              <button
                onClick={() => {
                  const val = parseFloat(amount || '0');
                  setAmount((val + 10).toFixed(2));
                }}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button className="flex-shrink-0 px-2 py-1.5 text-white border-[#2B3139] flex items-center gap-1 text-[11px]">
                USDT
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex gap-1.5">
              {[25, 50, 75, 100].map((percentage) => (
                <button
                  key={percentage}
                  onClick={() => {
                    const availBal = Math.max(0, usdtBalance);
                    const marginAmount = (availBal * percentage) / 100;
                    setAmount(marginAmount.toFixed(2));
                  }}
                  className="flex-1 py-1 bg-[#2B3139] text-gray-400 hover:text-white rounded transition-colors text-[10px]"
                >
                  {percentage}%
                </button>
              ))}
            </div>
          </div>

          <div className="mb-2">
            <label className="flex items-center gap-2 text-[10px] cursor-pointer mb-1">
              <input
                type="checkbox"
                checked={tpslEnabled}
                onChange={(e) => setTpslEnabled(e.target.checked)}
                className="w-3 h-3 rounded border-[#474D57] bg-[#2B3139]"
              />
              <span className="text-white">TP/SL</span>
            </label>
            {tpslEnabled && (
              <div className="space-y-1.5 pl-4">
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Take Profit</div>
                  <input
                    type="text"
                    value={takeProfitPrice}
                    onChange={(e) => setTakeProfitPrice(e.target.value)}
                    placeholder="Price"
                    className="w-full bg-[#2B3139] rounded px-2 py-1 text-xs text-white focus:ring-[#F0B90B] placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Stop Loss</div>
                  <input
                    type="text"
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(e.target.value)}
                    placeholder="Price"
                    className="w-full bg-[#2B3139] rounded px-2 py-1 text-xs text-white focus:ring-[#F0B90B] placeholder:text-gray-600"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5 mb-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reduceOnly}
                  onChange={(e) => setReduceOnly(e.target.checked)}
                  className="w-3 h-3 rounded border-[#474D57] bg-[#2B3139]"
                />
                <span className="text-white">Reduce Only</span>
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTimeInForceDropdown(!showTimeInForceDropdown)}
                  className="flex items-center gap-1 text-white bg-[#2B3139] px-2 py-1 rounded text-xs"
                >
                  {timeInForce}
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {showTimeInForceDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-[#2B3139] rounded shadow-lg z-50 border border-[#2B3139] w-24">
                    {(['GTC', 'IOC', 'FOK'] as const).map((tif) => (
                      <button
                        key={tif}
                        onClick={() => {
                          setTimeInForce(tif);
                          setShowTimeInForceDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#363D47] transition-colors"
                      >
                        <span className={`${timeInForce === tif ? 'text-[#F0B90B]' : 'text-white'}`}>
                          {tif}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {orderType === 'limit' && (
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={postOnly}
                  onChange={(e) => setPostOnly(e.target.checked)}
                  className="w-3 h-3 rounded border-[#474D57] bg-[#2B3139]"
                />
                <span className="text-white">Post Only</span>
              </label>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-[#848E9C]">Available</span>
            <span className="text-white font-bold text-[12px]">{Math.max(0, usdtBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
          </div>

          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-[#848E9C]">Max Margin</span>
            <span className="text-white font-bold text-[12px]">{Math.max(0, usdtBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-gray-500">Position Size</span>
                <span className="text-[#F0B90B] font-semibold">{(parseFloat(amount) * leverage).toFixed(2)} USDT</span>
              </div>

              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-gray-500">Trading Fee</span>
                <span className="text-white font-semibold">
                  {calculateTradingFee(parseFloat(amount) * leverage, orderType === 'limit').toFixed(4)} USDT
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] mb-2">
                <span className="text-gray-500">Total Cost</span>
                <span className="text-[#F6465D] font-bold">
                  {(parseFloat(amount) + calculateTradingFee(parseFloat(amount) * leverage, orderType === 'limit')).toFixed(4)} USDT
                </span>
              </div>
            </>
          )}

          {(!amount || parseFloat(amount) <= 0) && (
            <div className="h-[40px] mb-2"></div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={loading || !amount}
            className={`w-full py-2 rounded text-xs font-medium transition-colors ${ side === 'buy' ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white' : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white' } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} / ${side === 'buy' ? 'Long' : 'Short'}`}
          </button>

          <button
            onClick={() => setShowAdvancedOrders(true)}
            className="w-full py-1.5 mt-1.5 rounded text-[10px] font-medium bg-[#2B3139] hover:bg-[#363D47] text-[#F0B90B] transition-colors flex items-center justify-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Advanced Orders
          </button>
        </div>

        <div className="w-[48%] bg-[#181A20] flex flex-col">
          <div className="px-2 py-1.5 flex items-center justify-between text-[10px]">
            <span className="text-gray-400">Price (USDT)</span>
            <span className="text-gray-400">Amount (USDT)</span>
          </div>

          <div className="overflow-x-hidden">
            {orderBookLayout !== 'bids' && (
              <div className="space-y-0">
                {(() => {
                  const maxVal = Math.max(...askAmounts, 1);
                  const displayAsks = orderBookLayout === 'asks' ? asks : asks;
                  return displayAsks.map((ask, i) => {
                    const usdtVal = askAmounts[i] ?? ask.price * ask.amount;
                    const ratio = usdtVal / maxVal;
                    const fillPct = ratio * 100;
                    const isLarge = ratio > 0.6;
                    return (
                      <div key={`ask-${i}`} className="relative flex items-center justify-between px-2 py-[3.5px] text-[11px]">
                        <div
                          className={`absolute right-0 top-0 bottom-0 bg-[#F6465D]/[0.13]${isLarge ? ' ob-sway' : ''}`}
                          style={{ width: `${fillPct}%` }}
                        />
                        <span className="relative z-10 text-[#F6465D] font-medium">{formatPrice(ask.price)}</span>
                        <span className="relative z-10 text-white font-medium">{formatAmount(usdtVal)}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            <div className="py-2 px-2 bg-[#0B0E11] rounded">
              <div className={`font-bold text-sm ${priceChange >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {formatPrice(currentPrice)}
              </div>
              <div className="text-gray-500 text-[10px]">{formatPrice(currentPrice)}</div>
            </div>

            {orderBookLayout !== 'asks' && (
              <div className="space-y-0">
                {(() => {
                  const maxVal = Math.max(...bidAmounts, 1);
                  return bids.map((bid, i) => {
                    const usdtVal = bidAmounts[i] ?? bid.price * bid.amount;
                    const ratio = usdtVal / maxVal;
                    const fillPct = ratio * 100;
                    const isLarge = ratio > 0.6;
                    return (
                      <div key={`bid-${i}`} className="relative flex items-center justify-between px-2 py-[3.5px] text-[11px]">
                        <div
                          className={`absolute right-0 top-0 bottom-0 bg-[#0ECB81]/[0.13]${isLarge ? ' ob-sway' : ''}`}
                          style={{ width: `${fillPct}%` }}
                        />
                        <span className="relative z-10 text-[#0ECB81] font-medium">{formatPrice(bid.price)}</span>
                        <span className="relative z-10 text-white font-medium">{formatAmount(usdtVal)}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          <div className="px-2 py-2 border-[#2B3139]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#0ECB81] font-medium text-[11px]">{bidPercentage.toFixed(2)}%</span>
              <div className="flex-1 flex h-1 rounded overflow-hidden">
                <div className="bg-[#0ECB81]" style={{ width: `${bidPercentage}%` }} />
                <div className="bg-[#F6465D]" style={{ width: `${askPercentage}%` }} />
              </div>
              <span className="text-[#F6465D] font-medium text-[11px]">{askPercentage.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  onClick={() => setShowOrderBookSizeMenu(v => !v)}
                  className="flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-white transition-colors"
                >
                  {orderBookSize}
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
                {showOrderBookSizeMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOrderBookSizeMenu(false)} />
                    <div className="absolute bottom-full left-0 mb-1 bg-[#2B3139] border border-[#363D47] rounded-lg shadow-xl z-50 min-w-[64px]">
                      {[0.01, 0.1, 1, 10].map(size => (
                        <button
                          key={size}
                          onClick={() => { setOrderBookSize(size); setShowOrderBookSizeMenu(false); }}
                          className={`w-full px-3 py-1.5 text-left text-[10px] hover:bg-[#363D47] transition-colors first:rounded-t-lg last:rounded-b-lg ${orderBookSize === size ? 'text-[#F0B90B]' : 'text-white'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setOrderBookLayout('both')}
                  title="Both"
                  className={`flex flex-col gap-[2px] p-1 rounded transition-colors ${orderBookLayout === 'both' ? 'bg-[#363D47]' : 'hover:bg-[#2B3139]'}`}
                >
                  <div className="flex gap-[2px]">
                    <div className="w-[5px] h-[5px] bg-[#F6465D] rounded-sm"></div>
                    <div className="w-[5px] h-[5px] bg-[#F6465D] rounded-sm"></div>
                  </div>
                  <div className="flex gap-[2px]">
                    <div className="w-[5px] h-[5px] bg-[#0ECB81] rounded-sm"></div>
                    <div className="w-[5px] h-[5px] bg-[#0ECB81] rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setOrderBookLayout('asks')}
                  title="Asks only"
                  className={`flex flex-col gap-[2px] p-1 rounded transition-colors ${orderBookLayout === 'asks' ? 'bg-[#363D47]' : 'hover:bg-[#2B3139]'}`}
                >
                  <div className="flex gap-[2px]">
                    <div className="w-[5px] h-[5px] bg-[#F6465D] rounded-sm"></div>
                    <div className="w-[5px] h-[5px] bg-[#F6465D] rounded-sm"></div>
                  </div>
                  <div className="flex gap-[2px]">
                    <div className="w-[5px] h-[5px] bg-[#363D47] rounded-sm"></div>
                    <div className="w-[5px] h-[5px] bg-[#363D47] rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setOrderBookLayout('bids')}
                  title="Bids only"
                  className={`flex flex-col gap-[2px] p-1 rounded transition-colors ${orderBookLayout === 'bids' ? 'bg-[#363D47]' : 'hover:bg-[#2B3139]'}`}
                >
                  <div className="flex gap-[2px]">
                    <div className="w-[5px] h-[5px] bg-[#363D47] rounded-sm"></div>
                    <div className="w-[5px] h-[5px] bg-[#363D47] rounded-sm"></div>
                  </div>
                  <div className="flex gap-[2px]">
                    <div className="w-[5px] h-[5px] bg-[#0ECB81] rounded-sm"></div>
                    <div className="w-[5px] h-[5px] bg-[#0ECB81] rounded-sm"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#181A20] border-[#2B3139] overflow-hidden">
        <div className="flex items-center px-3 py-2 border-[#2B3139] overflow-x-auto">
          <div className="flex items-center gap-6 flex-1 min-w-max">
            <button
              onClick={() => setActiveBottomTab('positions')}
              className={`text-xs font-medium pb-1 border-b-2 transition-colors ${ activeBottomTab === 'positions' ? 'text-[#F0B90B] border-[#F0B90B]' : 'text-gray-400 border-transparent' }`}
            >
              Positions ({positions.length})
            </button>
            <button
              onClick={() => setActiveBottomTab('orders')}
              className={`text-xs font-medium pb-1 border-b-2 transition-colors ${ activeBottomTab === 'orders' ? 'text-[#F0B90B] border-[#F0B90B]' : 'text-gray-400 border-transparent' }`}
            >
              Open Orders ({openOrders.length})
            </button>
            <button
              onClick={() => setActiveBottomTab('bots')}
              className={`text-xs font-medium pb-1 border-b-2 transition-colors ${ activeBottomTab === 'bots' ? 'text-[#F0B90B] border-[#F0B90B]' : 'text-gray-400 border-transparent' }`}
            >
              Bots
            </button>
          </div>
          <button className="p-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>

        <div className="px-3 py-2 flex items-center justify-between border-[#2B3139] overflow-hidden">
          <label className="flex items-center gap-2 text-xs cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={hideOtherPairs}
              onChange={(e) => setHideOtherPairs(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#474D57] bg-[#2B3139]"
            />
            <span className="text-gray-400 whitespace-nowrap">Hide Other Pairs</span>
          </label>
          <button
            onClick={handleCloseAllPositions}
            disabled={positions.length === 0}
            className="bg-[#F6465D] hover:bg-[#F6465D]/85 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap flex-shrink-0 transition-all active:scale-95 shadow-sm shadow-[#F6465D]/30"
          >
            Close All Positions
          </button>
        </div>

        {activeBottomTab === 'positions' && (
          <div className="min-h-[200px] overflow-hidden">
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full border-[#2B3139] flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="p-3 pb-24 space-y-2 overflow-x-auto">
                {positions.map((position) => (
                  <FuturesPositionCard
                    key={position.id}
                    position={position}
                    currentPrice={currentPrice}
                    currentSymbol={selectedSymbol}
                    onClose={() => handleClosePosition(position.id)}
                    onClosePosition={handleClosePositionWithModal}
                    onUpdateLeverage={() => {}}
                    availableBalance={usdtBalance}
                    onMarginAdjusted={() => loadUserBalance(userId!)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeBottomTab === 'orders' && (
          <div className="flex flex-col items-center justify-center py-12 pb-24 min-h-[200px]">
            <div className="text-xs">No open orders</div>
          </div>
        )}

        {activeBottomTab === 'bots' && (
          <div className="flex flex-col items-center justify-center py-12 pb-24 min-h-[200px]">
            <div className="text-xs">No bots</div>
          </div>
        )}

        <button
          onClick={() => setShowChart(!showChart)}
          className="w-full px-3 py-2.5 flex items-center justify-between border-[#2B3139] hover:bg-[#2B3139] transition-colors"
        >
          <span className="text-white">{selectedSymbol} Perp Chart</span>
          <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${showChart ? '' : 'rotate-180'}`} />
        </button>
      </div>

      <FuturesMarketSelector
        isOpen={showMarketSelector}
        onClose={() => setShowMarketSelector(false)}
        currentSymbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
      />

      {showLeverageModal && (
        <LeverageModal
          symbol={selectedSymbol}
          currentLeverage={leverage}
          currentMode={marginMode}
          positionMode={positionMode}
          onClose={() => setShowLeverageModal(false)}
          onUpdate={(lev, mode) => {
            setLeverage(lev);
            setMarginMode(mode);
          }}
          onPositionModeChange={setPositionMode}
        />
      )}

      {showAdvancedOrders && (
        <FuturesAdvancedOrders
          isOpen={showAdvancedOrders}
          onClose={() => setShowAdvancedOrders(false)}
          symbol={selectedSymbol}
          currentPrice={currentPrice}
          side={side}
          leverage={leverage}
          onPlaceOrder={handleAdvancedOrder}
        />
      )}

      <ClosePositionResultModal
        isOpen={showCloseResult}
        onClose={() => setShowCloseResult(false)}
        result={closeResult}
      />

      {showCampaignModal && (
        <FuturesCampaignModal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
        />
      )}

      {showPnLCalculator && (
        <PnLCalculator
          isOpen={showPnLCalculator}
          onClose={() => setShowPnLCalculator(false)}
          currentPrice={currentPrice}
          symbol={selectedSymbol}
        />
      )}

      {showMoreMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMoreMenu(false)}
        />
      )}
    </div>
  );
}

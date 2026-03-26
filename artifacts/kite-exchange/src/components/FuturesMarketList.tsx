import { useState, useEffect, useRef } from 'react';
import { useFuturesFavorites } from '../lib/use-futures-favorites';
import { ChevronDown, ChevronUp, Megaphone, Star } from 'lucide-react';
import CoinLogo from './CoinLogo';
import { supabase } from '../lib/supabase';
import { BNCPriceManager } from '../lib/bnc-price';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { TRADFI_ASSETS, CATEGORY_STYLES, type TradFiAsset } from '../lib/tradfi-data';
import { subscribeAllTradFiPrices, getAllTradFiPrices } from '../lib/tradfi-price-service';
import MetalIcon, { isMetalSymbol } from './MetalIcon';

const STOCK_LOGO = (ticker: string) => `https://assets.parqet.com/logos/symbol/${ticker}?format=jpg`;

const SPRITE_SOURCES: Record<string, { src: string; col: number; row: number; cols: number; rows: number; zoom?: number }> = {
  // EN energy sprite: 1536x1024, cells are 512x1024 (portrait).
  // rows:2 makes the scale factor uniform (each cell rendered as 512x512 top crop).
  oil:     { src: '/EN copy copy copy copy.png',                                             col: 0, row: 0, cols: 3, rows: 2 },
  natgas:  { src: '/EN copy copy copy copy.png',                                             col: 1, row: 0, cols: 3, rows: 2 },
  brent:   { src: '/EN copy copy copy copy.png',                                             col: 2, row: 0, cols: 3, rows: 2 },
  // Food sprite: 1536x1024, cells are 512x512 (square) — zoom in to reduce excess padding.
  sugar:   { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 0, row: 0, cols: 3, rows: 2, zoom: 1.28 },
  wheat:   { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 1, row: 0, cols: 3, rows: 2, zoom: 1.28 },
  corn:    { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 2, row: 0, cols: 3, rows: 2, zoom: 1.28 },
  soybean: { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 0, row: 1, cols: 3, rows: 2, zoom: 1.28 },
  coffee:  { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 1, row: 1, cols: 3, rows: 2, zoom: 1.28 },
  cocoa:   { src: '/Altin_cerceveli_gida_ikonlari copy copy copy copy copy.png',             col: 2, row: 1, cols: 3, rows: 2, zoom: 1.28 },
  // US index sprite: 1536x1024, cells are 512x1024 (portrait). Same fix: rows:2.
  sp500:   { src: '/Buyuk_Amerikan_borsa_endeksleri_logolari copy copy copy copy copy.png', col: 0, row: 0, cols: 3, rows: 2 },
  nas100:  { src: '/Buyuk_Amerikan_borsa_endeksleri_logolari copy copy copy copy copy.png', col: 1, row: 0, cols: 3, rows: 2 },
  djia30:  { src: '/Buyuk_Amerikan_borsa_endeksleri_logolari copy copy copy copy copy.png', col: 2, row: 0, cols: 3, rows: 2 },
};

function SpriteIcon({ spriteKey, size }: { spriteKey: string; size: number }) {
  const entry = SPRITE_SOURCES[spriteKey];
  if (!entry) return null;
  const { src, col, row, cols, rows, zoom = 1 } = entry;
  const cellSize = size * zoom;
  const totalW = cols * cellSize;
  const totalH = rows * cellSize;
  const posX = -(col * cellSize) + (cellSize - size) / 2;
  const posY = -(row * cellSize) + (cellSize - size) / 2;
  return (
    <div
      className="flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.5,
        backgroundImage: `url('${src}')`,
        backgroundSize: `${totalW}px ${totalH}px`,
        backgroundPosition: `${posX}px ${posY}px`,
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
      }}
    />
  );
}

const TEXT_LOGO_ASSETS: Record<string, { text: string; bg: string; textColor: string; fontSize?: number }> = {
  SPX:     { text: 'S&P', bg: '#003087', textColor: '#ffffff', fontSize: 9 },
  NDX:     { text: 'NDQ', bg: '#0066cc', textColor: '#ffffff', fontSize: 9 },
  DJI:     { text: 'DOW', bg: '#1a3a6e', textColor: '#ffffff', fontSize: 9 },
  DAX:     { text: 'DAX', bg: '#000000', textColor: '#ffcc00', fontSize: 9 },
  FTSE:    { text: 'UK',  bg: '#012169', textColor: '#ffffff', fontSize: 11 },
  NKY:     { text: 'NK',  bg: '#bc002d', textColor: '#ffffff', fontSize: 11 },
  LUMBER:  { text: 'LBR', bg: '#7c3a0a', textColor: '#f5deb3', fontSize: 9 },
  LHOG:    { text: 'HOG', bg: '#8b3a3a', textColor: '#ffffff', fontSize: 9 },
  FCATTLE: { text: 'FCT', bg: '#5c3a0a', textColor: '#ffd700', fontSize: 9 },
  WTI:     { text: 'WTI', bg: '#1a0e00', textColor: '#f97316', fontSize: 9 },
  BRENT:   { text: 'BRT', bg: '#1a1208', textColor: '#f97316', fontSize: 9 },
  NATGAS:  { text: 'GAS', bg: '#0a1a2a', textColor: '#38bdf8', fontSize: 9 },
  COFFEE:  { text: 'CFE', bg: '#2a1004', textColor: '#d97706', fontSize: 9 },
  COCOA:   { text: 'CCO', bg: '#1a0a04', textColor: '#a16207', fontSize: 9 },
  SUGAR:   { text: 'SGR', bg: '#1a1020', textColor: '#e879f9', fontSize: 9 },
  WHEAT:   { text: 'WHT', bg: '#2a1a04', textColor: '#fbbf24', fontSize: 9 },
  CORN:    { text: 'CRN', bg: '#2a1a00', textColor: '#fde047', fontSize: 9 },
  SOYBEAN: { text: 'SOY', bg: '#0a1a08', textColor: '#86efac', fontSize: 8 },
};

function TextLogo({ text, bg, textColor, size, fontSize }: { text: string; bg: string; textColor: string; size: number; fontSize?: number }) {
  return (
    <div className="flex-shrink-0 rounded-full flex items-center justify-center" style={{ width: size, height: size, background: bg, border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
      <span style={{ color: textColor, fontSize: fontSize ?? 10, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>{text}</span>
    </div>
  );
}

function TradFiLogo({ asset, size }: { asset: TradFiAsset; size: number }) {
  const metalKey = asset.displayName === 'COPPER' ? 'COPPER' : asset.displayName;

  if (isMetalSymbol(metalKey)) {
    return <MetalIcon symbol={metalKey} size={size} />;
  }

  const textDef = TEXT_LOGO_ASSETS[asset.displayName];

  if (asset.logoUrl?.startsWith('sprite:')) {
    const spriteKey = asset.logoUrl.replace('sprite:', '');
    const hasSprite = spriteKey in SPRITE_SOURCES;
    if (hasSprite) return <SpriteIcon spriteKey={spriteKey} size={size} />;
    if (textDef) return <TextLogo text={textDef.text} bg={textDef.bg} textColor={textDef.textColor} size={size} fontSize={textDef.fontSize} />;
  }

  if (asset.logoUrl?.includes('flagcdn.com')) {
    return (
      <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size, border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
        <img src={asset.logoUrl} alt={asset.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  if (!asset.logoUrl && textDef) {
    return <TextLogo text={textDef.text} bg={textDef.bg} textColor={textDef.textColor} size={size} fontSize={textDef.fontSize} />;
  }

  const logoSrc = asset.logoUrl || STOCK_LOGO(asset.displayName === 'BRK.B' ? 'BRK-B' : asset.displayName);
  const bg = asset.bgColor ?? '#ffffff';

  return (
    <SimpleLogoImg
      src={logoSrc}
      alt={asset.displayName}
      size={size}
      bg={bg}
      fallback={textDef ? <TextLogo text={textDef.text} bg={textDef.bg} textColor={textDef.textColor} size={size} fontSize={textDef.fontSize} /> : undefined}
    />
  );
}

function SimpleLogoImg({ src, alt, size, bg, fallback }: {
  src: string;
  alt: string;
  size: number;
  bg: string;
  fallback?: JSX.Element;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    if (fallback) return <>{fallback}</>;
    const colors = ['#F0B90B', '#0ECB81', '#3861FB', '#E8831D', '#00D1FF', '#FF6B35'];
    const fb = colors[(alt.charCodeAt(0) + (alt.charCodeAt(1) || 0)) % colors.length];
    return (
      <div className="flex-shrink-0 rounded-full flex items-center justify-center font-extrabold text-white" style={{ width: size, height: size, background: fb, border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)', fontSize: size * 0.3 }}>
        {alt.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center" style={{ width: size, height: size, background: bg, border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
      <img
        src={src}
        alt={alt}
        style={{ width: '90%', height: '90%', objectFit: 'contain' }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

const HIGH_VOLATILITY_FUTURES = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT',
  'PEPE', 'SHIB', 'WIF', 'BONK', 'FLOKI', 'INJ', 'SUI', 'APT', 'ARB', 'OP',
  'TIA', 'SEI', 'ENA', 'WLD', 'JTO', 'STRK', 'ORDI', 'ONDO', 'PYTH', 'NOT',
  'RENDER',
];

const PINNED_COINS = ['BNC', 'EQ'];
const COLLAPSED_COUNT = 5;
const EXPANDED_COUNT = 31;

type ActiveTab = 'all' | 'tradfi';

interface FuturesCoin {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  dbUrl?: string;
}

interface TradFiCoin {
  asset: TradFiAsset;
  price: number;
  change24h: number;
  volume24h: number;
  isFavorite?: boolean;
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
  return vol.toFixed(0);
}

function simulatePrice(base: number, volatility: number, seed: number): number {
  const drift = (Math.sin(seed * 0.1) * 0.3 + Math.cos(seed * 0.07) * 0.2) * volatility * base;
  return Math.max(base * 0.85, base + drift);
}

function simulateChange(seed: number): number {
  return parseFloat(((Math.sin(seed * 0.13) * 0.4 + Math.cos(seed * 0.09) * 0.3) * 0.8).toFixed(2));
}

export default function FuturesMarketList() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [coins, setCoins] = useState<FuturesCoin[]>([]);
  const [pinnedCoins, setPinnedCoins] = useState<FuturesCoin[]>([]);
  const [tradFiCoins, setTradFiCoins] = useState<TradFiCoin[]>([]);
  const { tradFiFavorites, toggleFavorite, isTradFiFavorite } = useFuturesFavorites();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const dbLogosRef = useRef<Record<string, string>>({});
  const tradFiDbLogosRef = useRef<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const tradFiSeedRef = useRef(Date.now() / 1000);

  const TRADFI_DB_KEY_MAP: Record<string, string> = {
    WTI: 'USOIL',
    SPX: 'SPX500',
    NDX: 'NAS100',
    DJI: 'US30',
  };

  const buildTradFiAssets = () => TRADFI_ASSETS.map(a => {
    const dbKey = TRADFI_DB_KEY_MAP[a.displayName] || a.displayName;
    const dbUrl = tradFiDbLogosRef.current[dbKey] || tradFiDbLogosRef.current[a.displayName];
    return { ...a, logoUrl: dbUrl || a.logoUrl };
  });

  const initTradFi = () => {
    const seed = tradFiSeedRef.current;
    const assets = buildTradFiAssets();
    const result: TradFiCoin[] = assets.map((asset, i) => ({
      asset,
      price: simulatePrice(asset.basePrice, asset.volatility, seed + i * 17),
      change24h: simulateChange(seed + i * 31),
      volume24h: asset.volume24hBase * (0.9 + Math.random() * 0.2),
    }));
    setTradFiCoins(result);
  };

  useEffect(() => {
    const fetchTradFiLogos = async () => {
      try {
        const { data } = await supabase.from('tradfi_logos').select('symbol, logo_url');
        if (data) {
          const map: Record<string, string> = {};
          for (const row of data) {
            if (row.symbol && row.logo_url) map[row.symbol] = row.logo_url;
          }
          tradFiDbLogosRef.current = map;
        }
      } catch {}
      initTradFi();
    };
    fetchTradFiLogos();

    const syncFromService = () => {
      const prices = getAllTradFiPrices();
      setTradFiCoins(prev => prev.map(tc => {
        const d = prices.get(tc.asset.symbol);
        if (!d) return tc;
        return {
          ...tc,
          asset: { ...tc.asset, logoUrl: tradFiDbLogosRef.current[tc.asset.displayName] || tc.asset.logoUrl },
          price: d.price,
          change24h: d.change24h,
        };
      }));
    };

    const unsubscribe = subscribeAllTradFiPrices(syncFromService);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPinnedCoins = async () => {
      try {
        const { data } = await supabase
          .from('supported_coins')
          .select('symbol, logo_url, current_price_usdt, price_change_24h')
          .in('symbol', PINNED_COINS);
        const logoMap: Record<string, string> = {};
        if (data) {
          for (const c of data) {
            if (c.symbol && c.logo_url) logoMap[c.symbol] = c.logo_url;
          }
        }
        const bncMgr = BNCPriceManager.getInstance();
        const eqMgr = EarnQuestPriceManager.getInstance();
        const bncPrice = bncMgr.getPrice();
        const eqPrice = eqMgr.getPrice();
        const result: FuturesCoin[] = [
          {
            symbol: 'BNC',
            price: bncPrice > 0 ? bncPrice : (data?.find(d => d.symbol === 'BNC')?.current_price_usdt ?? 0),
            change24h: bncMgr.getChange(),
            volume24h: 0,
            dbUrl: logoMap['BNC'] || '/bnc-logo.png',
          },
          {
            symbol: 'EQ',
            price: eqPrice > 0 ? eqPrice : (data?.find(d => d.symbol === 'EQ')?.current_price_usdt ?? 0),
            change24h: eqMgr.getChange(),
            volume24h: 0,
            dbUrl: logoMap['EQ'] || '/EARNQUEST-LOGO-ICON-2.png',
          },
        ];
        setPinnedCoins(result);
      } catch {}
    };
    fetchPinnedCoins();
    const pinnedInterval = setInterval(() => {
      setPinnedCoins(prev => prev.map(c => {
        if (c.symbol === 'BNC') {
          const mgr = BNCPriceManager.getInstance();
          return { ...c, price: mgr.getPrice() > 0 ? mgr.getPrice() : c.price, change24h: mgr.getChange() };
        }
        if (c.symbol === 'EQ') {
          const mgr = EarnQuestPriceManager.getInstance();
          return { ...c, price: mgr.getPrice() > 0 ? mgr.getPrice() : c.price, change24h: mgr.getChange() };
        }
        return c;
      }));
    }, 5000);
    return () => clearInterval(pinnedInterval);
  }, []);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const { data } = await supabase
          .from('supported_coins')
          .select('symbol, logo_url')
          .in('symbol', HIGH_VOLATILITY_FUTURES);
        if (data) {
          const map: Record<string, string> = {};
          for (const c of data) {
            if (c.symbol && c.logo_url) map[c.symbol] = c.logo_url;
          }
          dbLogosRef.current = map;
        }
      } catch { }
    };
    fetchLogos();
  }, []);

  const fetchFuturesData = async () => {
    try {
      const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
      if (!res.ok) throw new Error('fetch failed');
      const data: any[] = await res.json();

      const symbolMap: Record<string, any> = {};
      for (const item of data) {
        symbolMap[item.symbol] = item;
      }

      const result: FuturesCoin[] = [];
      for (const sym of HIGH_VOLATILITY_FUTURES) {
        const key = `${sym}USDT`;
        const item = symbolMap[key];
        if (!item) continue;
        const price = parseFloat(item.lastPrice);
        const change24h = parseFloat(item.priceChangePercent);
        const volume24h = parseFloat(item.quoteVolume);
        if (price <= 0) continue;
        result.push({
          symbol: sym,
          price,
          change24h,
          volume24h,
          dbUrl: dbLogosRef.current[sym],
        });
      }

      if (result.length > 0) {
        setCoins(result);
        setLoading(false);
      }
    } catch {
      fetchFallback();
    }
  };

  const fetchFallback = async () => {
    try {
      const symbols = HIGH_VOLATILITY_FUTURES.map(s => `"${s}USDT"`).join(',');
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`);
      if (!res.ok) throw new Error('fallback failed');
      const data: any[] = await res.json();

      const result: FuturesCoin[] = [];
      for (const item of data) {
        const sym = item.symbol.replace('USDT', '');
        const price = parseFloat(item.lastPrice);
        const change24h = parseFloat(item.priceChangePercent);
        const volume24h = parseFloat(item.quoteVolume);
        if (price <= 0) continue;
        result.push({
          symbol: sym,
          price,
          change24h,
          volume24h,
          dbUrl: dbLogosRef.current[sym],
        });
      }

      if (result.length > 0) {
        setCoins(result);
        setLoading(false);
      }
    } catch { }
  };

  useEffect(() => {
    fetchFuturesData();
    intervalRef.current = setInterval(fetchFuturesData, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const toggleTradFiFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(symbol, true);
  };

  const displayCoins = [
    ...pinnedCoins,
    ...(expanded ? coins.slice(0, EXPANDED_COUNT) : coins.slice(0, COLLAPSED_COUNT)),
  ];

  const sortedTradFi = [...tradFiCoins].sort((a, b) => {
    const aFav = isTradFiFavorite(a.asset.symbol);
    const bFav = isTradFiFavorite(b.asset.symbol);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return b.volume24h - a.volume24h;
  });

  const renderTradFiCategoryIcon = (category: TradFiAsset['category']) => {
    const style = CATEGORY_STYLES[category];
    if (category === 'Gold' || category === 'Silver' || category === 'Platinum' || category === 'Palladium') {
      return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} flex items-center gap-0.5 leading-none`}>
          <span className="text-[9px]">&#9651;</span>
          {style.label}
        </span>
      );
    }
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} leading-none`}>
        {style.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#2B3139]/40">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-all ${
            activeTab === 'all'
              ? 'text-white bg-[#2B3139]'
              : 'text-[#848E9C] hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('tradfi')}
          className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'tradfi'
              ? 'text-[#F0B90B] bg-[#F0B90B]/10'
              : 'text-[#848E9C] hover:text-white'
          }`}
        >
          TradFi
          <Megaphone className="w-3 h-3" />
          {activeTab === 'tradfi' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0B90B] animate-pulse" />
          )}
        </button>
      </div>

      {activeTab === 'all' && (
        <>
          <div className="flex items-center text-[#848E9C] text-[10px] font-semibold mt-3 mb-1 px-4 uppercase tracking-wider">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 flex-shrink-0" />
              <div>Name</div>
            </div>
            <div className="w-28 text-right pr-0 mr-2.5">Last Price</div>
            <div className="w-[80px] text-center">24h Chg%</div>
          </div>

          {loading ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-2.5 border-b border-[#2B3139] animate-pulse">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-[#2B3139] mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 w-20 bg-[#2B3139] rounded mb-1.5" />
                      <div className="h-3 w-24 bg-[#2B3139]/50 rounded" />
                    </div>
                    <div className="h-5 w-20 bg-[#2B3139] rounded mr-2.5" />
                    <div className="h-8 w-[80px] bg-[#2B3139] rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {displayCoins.map((coin) => (
                <div
                  key={coin.symbol}
                  className="relative px-4 py-3 border-b border-[#2B3139]/40 cursor-pointer active:bg-[#2B3139]/50 transition-colors duration-200 overflow-hidden hover:bg-[#2B3139]/20"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('navigate-to-futures', {
                      detail: { symbol: coin.symbol }
                    }));
                  }}
                >
                  <div className="flex items-center">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 flex-shrink-0">
                        <CoinLogo symbol={coin.symbol} dbUrl={coin.dbUrl} eager={true} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1 leading-tight">
                          <span className="font-black text-[15px] text-white">{coin.symbol}USDT</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2B3139] text-[#848E9C] leading-none">Perp</span>
                        </div>
                        {coin.volume24h > 0 ? (
                          <div className="text-[11px] text-gray-400 font-bold mt-0.5">
                            Vol <span className="text-white">{formatVolume(coin.volume24h)}</span> USDT
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded bg-[#F0B90B]/20 text-[#F0B90B] inline-block leading-none">
                            Featured
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right mr-2.5 flex-shrink-0">
                      <div className="font-black text-[15px] tabular-nums leading-tight text-white">
                        ${formatPrice(coin.price)}
                      </div>
                    </div>

                    <div className={`min-w-[80px] py-1.5 px-2.5 rounded-lg text-center font-black text-[13px] flex-shrink-0 ${
                      coin.change24h >= 0
                        ? 'bg-[#0ECB81] text-white'
                        : 'bg-[#F6465D] text-white'
                    }`}>
                      {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}

              {coins.length > COLLAPSED_COUNT && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full py-2 flex items-center justify-center gap-1 text-xs font-medium text-gray-500 hover:text-white transition-colors border-b border-[#2B3139]/40"
                >
                  {expanded ? (
                    <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" /> Show {Math.min(coins.length, EXPANDED_COUNT) - COLLAPSED_COUNT} more</>
                  )}
                </button>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'tradfi' && (
        <>
          <div className="flex items-center justify-between px-4 py-2 bg-[#F0B90B]/5 border-b border-[#F0B90B]/20">
            <div className="flex items-center gap-2">
              <Megaphone className="w-3.5 h-3.5 text-[#F0B90B]" />
              <span className="text-[11px] font-bold text-[#F0B90B]">TradFi Markets</span>
            </div>
            <span className="text-[10px] text-[#848E9C]">{sortedTradFi.length} instruments</span>
          </div>

          <div className="flex items-center text-[#4B5563] text-[10px] font-bold mt-1 mb-0.5 px-4 uppercase tracking-widest py-1.5 border-b border-[#2B3139]/40">
            <div className="w-5 flex-shrink-0" />
            <div className="flex items-center gap-3 flex-1 min-w-0 ml-2">
              <div className="w-10 flex-shrink-0" />
              <div>Name / Vol</div>
            </div>
            <div className="text-right mr-3 w-28">Last Price</div>
            <div className="w-[80px] text-center">24H CHG%</div>
          </div>

          {sortedTradFi.map((tc) => {
            const isFav = isTradFiFavorite(tc.asset.symbol);
            return (
              <div
                key={tc.asset.symbol}
                className="relative px-4 py-2.5 border-b border-[#2B3139]/40 cursor-pointer active:bg-[#2B3139]/50 transition-colors duration-200 hover:bg-[#2B3139]/20"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate-to-futures', {
                    detail: { symbol: tc.asset.displayName }
                  }));
                }}
              >
                <div className="flex items-center">
                  <button
                    onClick={(e) => toggleTradFiFavorite(tc.asset.symbol, e)}
                    className="mr-2 flex-shrink-0 p-1"
                  >
                    <Star
                      className="w-3 h-3 transition-colors"
                      fill={isFav ? '#F0B90B' : 'none'}
                      stroke={isFav ? '#F0B90B' : '#4B5563'}
                    />
                  </button>

                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <TradFiLogo asset={tc.asset} size={40} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 leading-tight flex-wrap">
                        <span className="font-black text-[15px] text-white">{tc.asset.symbol}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2B3139] text-[#848E9C] leading-none">Perp</span>
                        {renderTradFiCategoryIcon(tc.asset.category)}
                      </div>
                      <div className="text-[11px] text-[#848E9C] font-semibold mt-0.5">
                        Vol <span className="text-[#848E9C]">{formatVolume(tc.volume24h)}</span> USDT
                      </div>
                    </div>
                  </div>

                  <div className="text-right mr-3 flex-shrink-0">
                    <div className="font-black text-[15px] tabular-nums leading-tight text-white">
                      {formatPrice(tc.price)}
                    </div>
                  </div>

                  <div className={`min-w-[80px] py-2 px-2.5 rounded-lg text-center font-black text-[13px] flex-shrink-0 ${
                    tc.change24h >= 0 ? 'bg-[#0ECB81] text-white' : 'bg-[#F6465D] text-white'
                  }`}>
                    {tc.change24h >= 0 ? '+' : ''}{tc.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

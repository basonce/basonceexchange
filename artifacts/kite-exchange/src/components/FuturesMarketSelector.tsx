import { useState, useEffect, useRef, useCallback } from 'react';
import { useFuturesFavorites } from '../lib/use-futures-favorites';
import { Search, Star, X, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';
import { BNCPriceManager } from '../lib/bnc-price';
import { PriceCache } from '../lib/price-cache';
import CoinLogo from './CoinLogo';
import { getProxiedLogoUrl } from '../lib/logo-utils';
import { getEQVolume } from '../lib/eq-volume-service';
import { TRADFI_ASSETS, CATEGORY_STYLES, type TradFiAsset } from '../lib/tradfi-data';
import { getAllTradFiPrices, subscribeAllTradFiPrices } from '../lib/tradfi-price-service';
import MetalIcon, { isMetalSymbol } from './MetalIcon';

const STOCK_LOGO = (ticker: string) => `https://assets.parqet.com/logos/symbol/${ticker}?format=jpg`;

const SPRITE_SOURCES: Record<string, { src: string; col: number; row: number; cols: number; rows: number; zoom?: number }> = {
  oil:     { src: '/en-energy.png',   col: 0, row: 0, cols: 3, rows: 2 },
  natgas:  { src: '/en-energy.png',   col: 1, row: 0, cols: 3, rows: 2 },
  brent:   { src: '/en-energy.png',   col: 2, row: 0, cols: 3, rows: 2 },
  sugar:   { src: '/food-icons.png',  col: 0, row: 0, cols: 3, rows: 2, zoom: 1.28 },
  wheat:   { src: '/food-icons.png',  col: 1, row: 0, cols: 3, rows: 2, zoom: 1.28 },
  corn:    { src: '/food-icons.png',  col: 2, row: 0, cols: 3, rows: 2, zoom: 1.28 },
  soybean: { src: '/food-icons.png',  col: 0, row: 1, cols: 3, rows: 2, zoom: 1.28 },
  coffee:  { src: '/food-icons.png',  col: 1, row: 1, cols: 3, rows: 2, zoom: 1.28 },
  cocoa:   { src: '/food-icons.png',  col: 2, row: 1, cols: 3, rows: 2, zoom: 1.28 },
  sp500:   { src: '/us-indices.png',  col: 0, row: 0, cols: 3, rows: 2 },
  nas100:  { src: '/us-indices.png',  col: 1, row: 0, cols: 3, rows: 2 },
  djia30:  { src: '/us-indices.png',  col: 2, row: 0, cols: 3, rows: 2 },
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

function TradFiLogo({ asset, size }: { asset: TradFiAsset; size: number }) {
  const [err, setErr] = useState(false);
  const metalKey = asset.displayName === 'COPPER' ? 'COPPER' : asset.displayName;

  if (isMetalSymbol(metalKey)) {
    return <MetalIcon symbol={metalKey} size={size} />;
  }

  if (asset.logoUrl?.startsWith('sprite:')) {
    return <SpriteIcon spriteKey={asset.logoUrl.replace('sprite:', '')} size={size} />;
  }

  if (asset.logoUrl?.includes('flagcdn.com')) {
    return (
      <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size, border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
        <img src={asset.logoUrl} alt={asset.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  if (!asset.logoUrl) {
    const bg = asset.bgColor ?? '#1a1a1a';
    return (
      <div className="flex-shrink-0 rounded-full flex items-center justify-center font-extrabold" style={{ width: size, height: size, background: bg, border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)', color: '#fff', fontSize: size * 0.27, letterSpacing: '-0.5px' }}>
        {asset.displayName.slice(0, 3)}
      </div>
    );
  }

  const logoSrc = (!err && asset.logoUrl) ? asset.logoUrl : STOCK_LOGO(asset.displayName === 'BRK.B' ? 'BRK-B' : asset.displayName);

  return (
    <div className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center" style={{ width: size, height: size, background: '#ffffff', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
      <img
        key={logoSrc}
        src={logoSrc}
        alt={asset.displayName}
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: size * 0.06 }}
        onError={() => { if (!err) setErr(true); }}
      />
    </div>
  );
}

interface CoinData {
  symbol: string;
  name: string;
  logo_url: string | null;
  binance_symbol: string | null;
}

interface Market {
  symbol: string;
  displaySymbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  logo: string;
  isEarnQuest?: boolean;
  direction: 'up' | 'down' | 'neutral';
}

interface FuturesMarketSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}


export default function FuturesMarketSelector({
  isOpen,
  onClose,
  currentSymbol,
  onSelectSymbol
}: FuturesMarketSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'favorites' | 'usdm' | 'coinm' | 'options' | 'tradfi'>('usdm');
  const [activeFilter, setActiveFilter] = useState('all');
  const { favorites, tradFiFavorites, toggleFavorite, isFavorite, isTradFiFavorite } = useFuturesFavorites();

  const buildTradFiCoins = () => {
    const prices = getAllTradFiPrices();
    return TRADFI_ASSETS.map(asset => {
      const pd = prices.get(asset.symbol);
      return {
        asset,
        price: pd?.price ?? asset.basePrice,
        change24h: pd?.change ?? 0,
        volume24h: asset.volume24hBase * (0.9 + Math.random() * 0.2),
      };
    });
  };

  const [tradFiCoins, setTradFiCoins] = useState(buildTradFiCoins);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const coinsRef = useRef<CoinData[]>([]);
  const priceManager = EarnQuestPriceManager.getInstance();
  const payaiManager = PayAIPriceManager.getInstance();
  const sgpManager = SGPPriceManager.getInstance();
  const poweraiManager = PowerAIPriceManager.getInstance();
  const sznpManager = SZNPPriceManager.getInstance();
  const punchManager = PunchPriceManager.getInstance();
  const priceCache = PriceCache.getInstance();

  const bncManager = BNCPriceManager.getInstance();

  const INDEP_MANAGERS: Record<string, { getPrice: () => number; getChange: () => number; getMarketCap: () => number; subscribe: (cb: () => void) => () => void }> = {
    PAYAI: payaiManager,
    SGP: sgpManager,
    POWERAI: poweraiManager,
    SZNP: sznpManager,
    PUNCH: punchManager,
  };

  useEffect(() => {
    if (!isOpen) return;

    loadCoins();

    const unsubPrice = priceCache.subscribe(() => {
      updateMarketPrices();
    });

    const unsubEQ = priceManager.subscribe(() => {
      updateMarketPrices();
    });

    const unsubBNC = bncManager.subscribe(() => {
      updateMarketPrices();
    });

    const independentUnsubs = Object.values(INDEP_MANAGERS).map(mgr =>
      mgr.subscribe(() => { updateMarketPrices(); })
    );

    return () => {
      unsubPrice();
      unsubEQ();
      unsubBNC();
      independentUnsubs.forEach(u => u());
    };
  }, [isOpen]);

  const loadCoins = async () => {
    setLoading(true);
    try {
      const { data: coins } = await supabase
        .from('supported_coins')
        .select('symbol, name, logo_url, binance_symbol')
        .eq('is_active', true)
        .eq('is_futures_enabled', true)
        .order('sort_order');

      if (!coins) return;
      coinsRef.current = coins;

      if (!priceCache.isReady()) {
        await priceCache.init();
      }

      buildMarkets(coins);
    } catch (error) {
      console.error('Failed to load coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildMarkets = (coins: CoinData[]) => {
    const result: Market[] = [];

    for (const coin of coins) {
      if (coin.symbol === 'EQ') continue;
      if (coin.symbol === 'BNC') continue;
      if (INDEP_MANAGERS[coin.symbol]) continue;

      const binanceSymbol = coin.binance_symbol || `${coin.symbol}USDT`;
      const cached = priceCache.get(binanceSymbol);

      result.push({
        symbol: binanceSymbol,
        displaySymbol: coin.symbol,
        name: coin.name,
        price: cached?.price || 0,
        change24h: cached?.change24h || 0,
        volume24h: cached?.volume || 0,
        logo: getProxiedLogoUrl(coin.logo_url),
        direction: cached?.direction || 'neutral'
      });
    }

    const STABLECOINS_SET = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'USDD', 'FRAX', 'PYUSD', 'EURC']);
    const PRIORITY = ['BNC', 'EQ', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT'];

    result.sort((a, b) => {
      const aSym = a.displaySymbol || a.symbol.replace('USDT', '');
      const bSym = b.displaySymbol || b.symbol.replace('USDT', '');
      const aStable = STABLECOINS_SET.has(aSym);
      const bStable = STABLECOINS_SET.has(bSym);
      if (aStable && !bStable) return 1;
      if (!aStable && bStable) return -1;
      if (aStable && bStable) return aSym.localeCompare(bSym);
      const aPri = PRIORITY.indexOf(aSym);
      const bPri = PRIORITY.indexOf(bSym);
      if (aPri !== -1 && bPri !== -1) return aPri - bPri;
      if (aPri !== -1) return -1;
      if (bPri !== -1) return 1;
      return b.volume24h - a.volume24h;
    });

    const indepCoinsInDb = coinsRef.current.filter(c => INDEP_MANAGERS[c.symbol]);
    for (const coin of indepCoinsInDb) {
      const mgr = INDEP_MANAGERS[coin.symbol];
      result.unshift({
        symbol: `${coin.symbol}USDT`,
        displaySymbol: coin.symbol,
        name: coin.name,
        price: mgr.getPrice(),
        change24h: mgr.getChange(),
        volume24h: mgr.getMarketCap(),
        logo: getProxiedLogoUrl(coin.logo_url),
        isEarnQuest: true,
        direction: mgr.getChange() >= 0 ? 'up' : 'down'
      });
    }

    result.unshift({
      symbol: 'EQUSDT',
      displaySymbol: 'EQ',
      name: 'EarnQuest',
      price: priceManager.getPrice(),
      change24h: priceManager.getChange(),
      volume24h: getEQVolume(),
      logo: '/earnquest-logo-icon-2.png',
      isEarnQuest: true,
      direction: 'neutral'
    });

    result.unshift({
      symbol: 'BNCUSDT',
      displaySymbol: 'BNC',
      name: 'Basonce',
      price: bncManager.getPrice(),
      change24h: bncManager.getChange(),
      volume24h: bncManager.getMarketCap(),
      logo: '/bnc-logo.png',
      isEarnQuest: true,
      direction: bncManager.getChange() >= 0 ? 'up' : 'down'
    });

    setMarkets(result);
  };

  const updateMarketPrices = () => {
    setMarkets(prev => prev.map(market => {
      if (market.isEarnQuest) {
        if (market.symbol === 'EQUSDT') {
          return {
            ...market,
            price: priceManager.getPrice(),
            change24h: priceManager.getChange(),
            direction: 'up' as const
          };
        }
        if (market.symbol === 'BNCUSDT') {
          return {
            ...market,
            price: bncManager.getPrice(),
            change24h: bncManager.getChange(),
            direction: bncManager.getChange() >= 0 ? 'up' as const : 'down' as const
          };
        }
        const mgr = INDEP_MANAGERS[market.displaySymbol];
        if (mgr) {
          return {
            ...market,
            price: mgr.getPrice(),
            change24h: mgr.getChange(),
            direction: mgr.getChange() >= 0 ? 'up' as const : 'down' as const
          };
        }
        return market;
      }

      const cached = priceCache.get(market.symbol);
      if (!cached) return market;

      return {
        ...market,
        price: cached.price,
        change24h: cached.change24h,
        volume24h: cached.volume,
        direction: cached.direction
      };
    }));
  };

  useEffect(() => {
    setTradFiCoins(buildTradFiCoins());
    const unsub = subscribeAllTradFiPrices(() => {
      setTradFiCoins(buildTradFiCoins());
    });
    return unsub;
  }, []);

  const toggleTradFiFavorite = useCallback((symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(symbol, true);
  }, [toggleFavorite]);

  const handleSelect = (symbol: string) => {
    onSelectSymbol(symbol);
    onClose();
  };

  const formatPrice = (price: number) => {
    if (price === 0) return '--';
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(5);
    return price.toFixed(8);
  };

  const formatVolume = (vol: number) => {
    if (vol === 0) return '--';
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toFixed(0);
  };

  const filtered = markets.filter(m => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.displaySymbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    }
    if (activeTab === 'favorites') return isFavorite(m.symbol);
    return true;
  });

  const favoritedTradFiCoins = tradFiCoins.filter(tc => {
    if (activeTab === 'favorites') {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return isTradFiFavorite(tc.asset.symbol) && (tc.asset.displayName.toLowerCase().includes(q) || tc.asset.symbol.toLowerCase().includes(q));
      }
      return isTradFiFavorite(tc.asset.symbol);
    }
    return false;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#181A20] z-[9999] flex items-center justify-center">
      <div className="w-full max-w-[428px] h-full flex flex-col">
        <div className="bg-[#1A1D25]">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-white">USD-M</span>
              <span className="text-gray-500">COIN-M</span>
              <span className="text-gray-500">Options</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-[#2B3139] rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-[#F0B90B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coin name"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-500"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 border-b border-[#2B3139] overflow-x-auto scrollbar-none">
            {(['favorites', 'usdm', 'coinm', 'options', 'tradfi'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm relative flex-shrink-0 flex items-center gap-1.5 ${activeTab === tab ? 'text-[#F0B90B]' : 'text-gray-400'}`}
              >
                {tab === 'favorites' ? 'Favorites'
                  : tab === 'usdm' ? 'USD-M'
                  : tab === 'coinm' ? 'COIN-M'
                  : tab === 'options' ? 'Options'
                  : (
                    <>
                      TradFi
                      <Megaphone className="w-3 h-3" />
                    </>
                  )
                }
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B]" />}
              </button>
            ))}
          </div>

          {activeTab !== 'tradfi' && (
            <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-500">
              <span>Name / Vol</span>
              <span>Last Price / 24h Chg</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'tradfi' ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 bg-[#F0B90B]/5 border-b border-[#F0B90B]/20">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-3 h-3 text-[#F0B90B]" />
                  <span className="text-[11px] font-bold text-[#F0B90B]">TradFi Markets</span>
                </div>
                <span className="text-[10px] text-[#848E9C]">{tradFiCoins.length} instruments</span>
              </div>
              <div className="flex items-center text-[#848E9C] text-[10px] font-semibold py-1.5 px-4 uppercase tracking-wider border-b border-[#1E2329]">
                <div className="w-4 flex-shrink-0 mr-2" />
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-8 flex-shrink-0" />
                  <span>Name / Vol</span>
                </div>
                <div className="mr-2.5">Last Price</div>
                <div className="w-[72px] text-center">24h Chg%</div>
              </div>
              {tradFiCoins
                .filter(tc => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return tc.asset.displayName.toLowerCase().includes(q) || tc.asset.symbol.toLowerCase().includes(q);
                })
                .sort((a, b) => {
                  const aFav = isTradFiFavorite(a.asset.symbol);
                  const bFav = isTradFiFavorite(b.asset.symbol);
                  if (aFav && !bFav) return -1;
                  if (!aFav && bFav) return 1;
                  return b.volume24h - a.volume24h;
                })
                .map((tc) => {
                  const style = CATEGORY_STYLES[tc.asset.category];
                  const isFav = isTradFiFavorite(tc.asset.symbol);
                  const fp = (p: number) => {
                    if (p >= 10000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    if (p >= 1) return p.toFixed(2);
                    return p.toFixed(4);
                  };
                  const fv = (v: number) => {
                    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
                    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
                    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
                    return v.toFixed(0);
                  };
                  const renderCategoryIcon = (cat: TradFiAsset['category']) => {
                    if (cat !== 'Stock') {
                      return (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} flex items-center gap-0.5 leading-none`}>
                          <span className="text-[9px]">&#9651;</span>{cat}
                        </span>
                      );
                    }
                    return (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} leading-none`}>
                        {cat}
                      </span>
                    );
                  };
                  return (
                    <div
                      key={tc.asset.symbol}
                      className="relative px-4 py-3 border-b border-[#1E2329] cursor-pointer hover:bg-[#1E2329] active:bg-[#1E2329]/80 transition-colors duration-150"
                      onClick={() => { onSelectSymbol(tc.asset.displayName); onClose(); }}
                    >
                      <div className="flex items-center">
                        <button
                          onClick={(e) => toggleTradFiFavorite(tc.asset.symbol, e)}
                          className="mr-2 flex-shrink-0 text-gray-500 hover:text-[#F0B90B] transition-colors"
                        >
                          <Star
                            className={`w-3.5 h-3.5 transition-all ${isFav ? 'scale-110' : ''}`}
                            fill={isFav ? '#F0B90B' : 'none'}
                            stroke={isFav ? '#F0B90B' : 'currentColor'}
                          />
                        </button>

                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <TradFiLogo asset={tc.asset} size={32} />
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1 leading-tight flex-wrap">
                              <span className="font-black text-[14px] text-white">{tc.asset.displayName}USDT</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2B3139] text-[#848E9C] leading-none">Perp</span>
                              {renderCategoryIcon(tc.asset.category)}
                            </div>
                            <div className="text-[11px] text-[#848E9C] font-bold mt-0.5">
                              Vol <span className="text-white">{fv(tc.volume24h)}</span> USDT
                            </div>
                          </div>
                        </div>

                        <div className="text-right mr-2.5 flex-shrink-0">
                          <div className="font-black text-[15px] tabular-nums leading-tight text-white">
                            {fp(tc.price)}
                          </div>
                        </div>

                        <div className={`min-w-[72px] py-1.5 px-2 rounded-lg text-center font-black text-[12px] flex-shrink-0 ${
                          tc.change24h >= 0 ? 'bg-[#0ECB81] text-white' : 'bg-[#F6465D] text-white'
                        }`}>
                          {tc.change24h >= 0 ? '+' : ''}{tc.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 && !(activeTab === 'favorites' && favoritedTradFiCoins.length > 0) ? (
            <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
              No markets found
            </div>
          ) : (
            <>
              {filtered.map((market) => (
                <button
                  key={market.symbol}
                  onClick={() => handleSelect(market.symbol)}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#1E2329] border-b border-[#1E2329] transition-colors ${
                    market.symbol === currentSymbol ? 'bg-[#1E2329]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(market.symbol, false); }}
                      className="text-gray-500 hover:text-[#F0B90B] transition-colors"
                    >
                      <Star
                        className={`w-3.5 h-3.5 transition-all ${isFavorite(market.symbol) ? 'scale-110' : ''}`}
                        fill={isFavorite(market.symbol) ? '#F0B90B' : 'none'}
                        stroke={isFavorite(market.symbol) ? '#F0B90B' : 'currentColor'}
                      />
                    </button>
                    <div className="w-6 h-6 flex-shrink-0">
                      <CoinLogo symbol={market.displaySymbol} dbUrl={market.logo} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-white">{market.displaySymbol}USDT</span>
                        <span className="text-[10px] text-gray-500 bg-[#2B3139] px-1 py-0.5 rounded">Perp</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Vol {formatVolume(market.volume24h)} USDT
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-medium text-sm transition-colors duration-300 ${
                      market.direction === 'up' ? 'text-[#0ECB81]' :
                      market.direction === 'down' ? 'text-[#F6465D]' : 'text-white'
                    }`}>
                      {formatPrice(market.price)}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${market.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {market.price === 0 ? '--' : `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(2)}%`}
                    </div>
                  </div>
                </button>
              ))}

              {favoritedTradFiCoins.length > 0 && (
                <>
                  {activeTab === 'favorites' && filtered.length > 0 && (
                    <div className="px-4 py-2 text-[11px] text-gray-500 bg-[#1A1D25] border-b border-[#2B3139] flex items-center gap-1.5">
                      <Megaphone className="w-3 h-3" />
                      TradFi
                    </div>
                  )}
                  {favoritedTradFiCoins.map((tc) => {
                    const style = CATEGORY_STYLES[tc.asset.category];
                    const formatTradFiPrice = (p: number) => {
                      if (p >= 10000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      if (p >= 1) return p.toFixed(2);
                      return p.toFixed(4);
                    };
                    return (
                      <div
                        key={tc.asset.symbol}
                        className="flex items-center px-4 py-3 hover:bg-[#1E2329] border-b border-[#1E2329] transition-colors cursor-pointer"
                        onClick={() => { onSelectSymbol(tc.asset.displayName); onClose(); }}
                      >
                        <button
                          onClick={(e) => toggleTradFiFavorite(tc.asset.symbol, e)}
                          className="mr-3 flex-shrink-0 text-gray-500 hover:text-[#F0B90B] transition-colors"
                        >
                          <Star
                            className="w-3.5 h-3.5 transition-all scale-110"
                            fill="#F0B90B"
                            stroke="#F0B90B"
                          />
                        </button>
                        <div className="mr-3 flex-shrink-0">
                          <TradFiLogo asset={tc.asset} size={28} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-medium text-sm text-white">{tc.asset.displayName}USDT</span>
                            <span className="text-[10px] text-gray-500 bg-[#2B3139] px-1 py-0.5 rounded">Perp</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} leading-none`}>
                              {tc.asset.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Vol {tc.volume24h >= 1e9 ? `${(tc.volume24h / 1e9).toFixed(2)}B` : tc.volume24h >= 1e6 ? `${(tc.volume24h / 1e6).toFixed(2)}M` : `${(tc.volume24h / 1e3).toFixed(0)}K`} USDT
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-medium text-sm text-white tabular-nums">{formatTradFiPrice(tc.price)}</div>
                          <div className={`text-[11px] mt-0.5 ${tc.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {tc.change24h >= 0 ? '+' : ''}{tc.change24h.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {activeTab === 'favorites' && filtered.length === 0 && favoritedTradFiCoins.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Star className="w-10 h-10 text-gray-600" />
                  <p className="text-gray-500 text-sm">No favorites yet</p>
                  <p className="text-gray-600 text-xs text-center px-8">Tap the star next to any coin to add it to your favorites</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

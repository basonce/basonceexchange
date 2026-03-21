import { useState, useEffect, useRef } from 'react';
import { Search, Star, X } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'favorites' | 'usdm' | 'coinm' | 'options'>('usdm');
  const [activeFilter, setActiveFilter] = useState('all');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
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
    BNC: bncManager,
    PAYAI: payaiManager,
    SGP: sgpManager,
    POWERAI: poweraiManager,
    SZNP: sznpManager,
    PUNCH: punchManager,
  };

  useEffect(() => {
    if (!isOpen) return;

    loadCoins();
    loadFavorites();

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
      volume24h: priceManager.getMarketCap(),
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

  const loadFavorites = () => {
    const saved = localStorage.getItem('futures_favorites');
    if (saved) setFavorites(JSON.parse(saved));
  };

  const toggleFavorite = (symbol: string) => {
    const next = favorites.includes(symbol)
      ? favorites.filter(s => s !== symbol)
      : [...favorites, symbol];
    setFavorites(next);
    localStorage.setItem('futures_favorites', JSON.stringify(next));
  };

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
    if (activeTab === 'favorites') return favorites.includes(m.symbol);
    return true;
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

          <div className="flex items-center gap-6 px-4 border-b border-[#2B3139]">
            {(['favorites', 'usdm', 'coinm', 'options'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm relative ${activeTab === tab ? 'text-[#F0B90B]' : 'text-gray-400'}`}
              >
                {tab === 'favorites' ? 'Favorites' : tab === 'usdm' ? 'USD-M' : tab === 'coinm' ? 'COIN-M' : 'Options'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B]" />}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-500">
            <span>Name / Vol</span>
            <span>Last Price / 24h Chg</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
              No markets found
            </div>
          ) : (
            filtered.map((market) => (
              <button
                key={market.symbol}
                onClick={() => handleSelect(market.symbol)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#1E2329] border-b border-[#1E2329] transition-colors ${
                  market.symbol === currentSymbol ? 'bg-[#1E2329]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(market.symbol); }}
                    className="text-gray-500 hover:text-[#F0B90B]"
                  >
                    <Star className="w-3.5 h-3.5" fill={favorites.includes(market.symbol) ? '#F0B90B' : 'none'} />
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';
import { BNCPriceManager } from '../lib/bnc-price';
import { PriceCache } from '../lib/price-cache';
import { fetchCoinGeckoPrices, getCoinGeckoId } from '../lib/coingecko-price';
import { supabase } from '../lib/supabase';
import CoinLogo from '../components/CoinLogo';
import { getProxiedLogoUrl } from '../lib/logo-utils';
import { formatPriceWithSymbol, formatVolumeWithSymbol } from '../lib/format-utils';

interface Market {
  symbol: string;
  name: string;
  fullName: string;
  price: number;
  change24h: number;
  volume: number;
  logo: string;
  binanceSymbol: string | null;
  direction: 'up' | 'down' | 'neutral';
  isEarnQuest?: boolean;
  isIndependent?: boolean;
  flashClass: string;
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCoins, setShowAllCoins] = useState(false);
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'change'>('volume');
  const [loading, setLoading] = useState(true);
  const priceManager = useRef(EarnQuestPriceManager.getInstance());
  const payaiManager = useRef(PayAIPriceManager.getInstance());
  const sgpManager = useRef(SGPPriceManager.getInstance());
  const poweraiManager = useRef(PowerAIPriceManager.getInstance());
  const sznpManager = useRef(SZNPPriceManager.getInstance());
  const punchManager = useRef(PunchPriceManager.getInstance());
  const bncManager = useRef(BNCPriceManager.getInstance());
  const priceCache = useRef(PriceCache.getInstance());
  const flashTimers = useRef<Map<string, number>>(new Map());
  const cgPollTimer = useRef<number | null>(null);

  const INDEPENDENT_COINS = {
    BNC: bncManager,
    PAYAI: payaiManager,
    SGP: sgpManager,
    POWERAI: poweraiManager,
    SZNP: sznpManager,
    PUNCH: punchManager,
  } as const;

  useEffect(() => {
    loadCoins();
    return () => {
      flashTimers.current.forEach(t => clearTimeout(t));
      if (cgPollTimer.current) clearInterval(cgPollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (markets.length === 0) return;

    const unsubCache = priceCache.current.subscribe(() => {
      updateFromCache();
    });

    const unsubEQ = priceManager.current.subscribe(() => {
      setMarkets(prev => prev.map(m => {
        if (!m.isEarnQuest) return m;
        return {
          ...m,
          price: priceManager.current.getPrice(),
          change24h: priceManager.current.getChange(),
          volume: priceManager.current.getMarketCap(),
          direction: 'up',
          flashClass: 'animate-flash-green'
        };
      }));
    });

    const independentUnsubs = (Object.entries(INDEPENDENT_COINS) as [string, typeof payaiManager][]).map(([symbol, mgr]) =>
      mgr.current.subscribe(() => {
        setMarkets(prev => prev.map(m => {
          if (m.symbol !== symbol) return m;
          return {
            ...m,
            price: mgr.current.getPrice(),
            change24h: mgr.current.getChange(),
            volume: mgr.current.getMarketCap(),
            direction: mgr.current.getChange() >= 0 ? 'up' : 'down',
            flashClass: mgr.current.getChange() >= 0 ? 'animate-flash-green' : 'animate-flash-red'
          };
        }));
      })
    );

    return () => {
      unsubCache();
      unsubEQ();
      independentUnsubs.forEach(u => u());
    };
  }, [markets.length]);

  const loadCoins = async () => {
    try {
      const { data: coins } = await supabase
        .from('supported_coins')
        .select('symbol, name, logo_url, binance_symbol, is_spot_enabled')
        .eq('is_active', true)
        .eq('is_spot_enabled', true)
        .order('sort_order');

      if (!coins) { setLoading(false); return; }

      if (!priceCache.current.isReady()) {
        await priceCache.current.init();
      }

      const INDEP_MAP: Record<string, typeof payaiManager> = {
        BNC: bncManager,
        PAYAI: payaiManager,
        SGP: sgpManager,
        POWERAI: poweraiManager,
        SZNP: sznpManager,
        PUNCH: punchManager,
      };

      const initialMarkets: Market[] = coins.map(coin => {
        if (coin.symbol === 'EQ') {
          return {
            symbol: coin.symbol,
            name: coin.symbol,
            fullName: coin.name,
            price: priceManager.current.getPrice(),
            change24h: priceManager.current.getChange(),
            volume: priceManager.current.getMarketCap(),
            logo: getProxiedLogoUrl(coin.logo_url) || '/earnquest-logo-icon-2.png',
            binanceSymbol: null,
            direction: 'neutral' as const,
            isEarnQuest: true,
            flashClass: ''
          };
        }

        if (INDEP_MAP[coin.symbol]) {
          const mgr = INDEP_MAP[coin.symbol];
          return {
            symbol: coin.symbol,
            name: coin.symbol,
            fullName: coin.name,
            price: mgr.current.getPrice(),
            change24h: mgr.current.getChange(),
            volume: mgr.current.getMarketCap(),
            logo: getProxiedLogoUrl(coin.logo_url) || '',
            binanceSymbol: null,
            direction: 'neutral' as const,
            isIndependent: true,
            flashClass: ''
          };
        }

        if (coin.symbol === 'USDT') {
          return {
            symbol: coin.symbol,
            name: coin.symbol,
            fullName: coin.name,
            price: 1.0,
            change24h: 0,
            volume: 145000000000,
            logo: getProxiedLogoUrl(coin.logo_url),
            binanceSymbol: null,
            direction: 'neutral' as const,
            flashClass: ''
          };
        }

        const binSym = coin.binance_symbol || `${coin.symbol}USDT`;
        const cached = priceCache.current.get(binSym);

        return {
          symbol: coin.symbol,
          name: coin.symbol,
          fullName: coin.name,
          price: cached?.price || 0,
          change24h: cached?.change24h || 0,
          volume: cached?.volume || 0,
          logo: getProxiedLogoUrl(coin.logo_url),
          binanceSymbol: binSym,
          direction: cached?.direction || 'neutral',
          flashClass: ''
        };
      });

      const hasEQ = initialMarkets.some(m => m.symbol === 'EQ');
      if (!hasEQ) {
        initialMarkets.unshift({
          symbol: 'EQ',
          name: 'EQ',
          fullName: 'EarnQuest',
          price: priceManager.current.getPrice(),
          change24h: priceManager.current.getChange(),
          volume: priceManager.current.getMarketCap(),
          logo: '/earnquest-logo-icon-2.png',
          binanceSymbol: null,
          direction: 'neutral' as const,
          isEarnQuest: true,
          flashClass: ''
        });
      }

      setMarkets(initialMarkets);
      setLoading(false);

      const cgSymbols = coins
        .filter(c => c.symbol !== 'EQ' && c.symbol !== 'USDT' && !INDEP_MAP[c.symbol] && getCoinGeckoId(c.symbol))
        .map(c => c.symbol);

      if (cgSymbols.length > 0) {
        fetchAndApplyCoinGeckoPrices(cgSymbols);
        if (cgPollTimer.current) clearInterval(cgPollTimer.current);
        cgPollTimer.current = window.setInterval(() => {
          fetchAndApplyCoinGeckoPrices(cgSymbols);
        }, 60000);
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
      setLoading(false);
    }
  };

  const fetchAndApplyCoinGeckoPrices = async (symbols: string[]) => {
    try {
      const cgPrices = await fetchCoinGeckoPrices(symbols);
      if (cgPrices.size === 0) return;
      setMarkets(prev => prev.map(m => {
        if (m.isEarnQuest || m.isIndependent || m.symbol === 'USDT') return m;
        const binCached = m.binanceSymbol ? priceCache.current.get(m.binanceSymbol) : null;
        if (binCached && binCached.price > 0) return m;
        const cgData = cgPrices.get(m.symbol);
        if (!cgData || cgData.price <= 0) return m;
        const priceChanged = cgData.price !== m.price;
        return {
          ...m,
          price: cgData.price,
          change24h: cgData.change24h,
          volume: cgData.volume,
          direction: cgData.change24h >= 0 ? 'up' : 'down',
          flashClass: priceChanged ? (cgData.change24h >= 0 ? 'animate-flash-green' : 'animate-flash-red') : m.flashClass,
        };
      }));
    } catch {}
  };

  const updateFromCache = () => {
    setMarkets(prev => prev.map(m => {
      if (m.isEarnQuest || m.isIndependent || m.symbol === 'USDT' || !m.binanceSymbol) return m;

      const cached = priceCache.current.get(m.binanceSymbol);
      if (!cached) return m;

      const priceChanged = cached.price !== m.price;
      const dir = cached.direction;

      if (priceChanged) {
        const existing = flashTimers.current.get(m.symbol);
        if (existing) clearTimeout(existing);
        const timer = window.setTimeout(() => {
          setMarkets(c => c.map(x =>
            x.symbol === m.symbol ? { ...x, flashClass: '' } : x
          ));
        }, 600);
        flashTimers.current.set(m.symbol, timer);
      }

      return {
        ...m,
        price: cached.price,
        change24h: cached.change24h,
        volume: cached.volume,
        direction: dir,
        flashClass: priceChanged
          ? (dir === 'up' ? 'animate-flash-green' : dir === 'down' ? 'animate-flash-red' : '')
          : m.flashClass
      };
    }));
  };

  const formatPrice = formatPriceWithSymbol;
  const formatVolume = formatVolumeWithSymbol;

  const getRandomBidAsk = (price: number) => {
    if (price === 0) return { high: 0, low: 0, bid: 0, ask: 0 };
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const bid = price * (1 - Math.random() * 0.001);
    const ask = price * (1 + Math.random() * 0.001);
    return { high, low, bid, ask };
  };

  const STABLECOINS = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'USDD', 'FRAX', 'PYUSD', 'EURC', 'EUR']);
  const PRIORITY_ORDER = ['BNC', 'EQ', 'PAYAI', 'SGP', 'POWERAI', 'SZNP', 'PUNCH', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT'];

  const filtered = markets
    .filter(m =>
      m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aStable = STABLECOINS.has(a.symbol);
      const bStable = STABLECOINS.has(b.symbol);
      if (aStable && !bStable) return 1;
      if (!aStable && bStable) return -1;
      if (aStable && bStable) return a.symbol.localeCompare(b.symbol);

      const aPriority = PRIORITY_ORDER.indexOf(a.symbol);
      const bPriority = PRIORITY_ORDER.indexOf(b.symbol);
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;

      if (sortBy === 'volume') return b.volume - a.volume;
      if (sortBy === 'price') return b.price - a.price;
      if (sortBy === 'change') return b.change24h - a.change24h;
      return 0;
    });

  const visibleMarkets = showAllCoins ? filtered : filtered.slice(0, 15);

  return (
    <>
      <style>{`
        @keyframes flashGreen {
          0% { background-color: rgba(14, 203, 129, 0.25); }
          100% { background-color: transparent; }
        }
        @keyframes flashRed {
          0% { background-color: rgba(246, 70, 93, 0.25); }
          100% { background-color: transparent; }
        }
        .animate-flash-green { animation: flashGreen 0.6s ease-out; }
        .animate-flash-red { animation: flashRed 0.6s ease-out; }
      `}</style>
      <div className="min-h-screen bg-[#0B0E11] text-white pb-20 max-w-[480px] mx-auto">
        <div className="bg-[#0B0E11] pt-4 px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-lg">Markets</h1>
              <span className="bg-[#F0B90B] text-[10px] font-bold px-2 py-0.5 rounded text-black">LIVE</span>
            </div>
            <span className="text-[13px] text-gray-400">{filtered.length} pairs</span>
          </div>

          <div className="mb-4 bg-[#1A1D24] border border-[#2B3139] rounded-lg px-3 py-2.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search coin name or symbol"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 placeholder-[#5E6673] text-[13px]"
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            {(['volume', 'change', 'price'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${
                  sortBy === s ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400'
                }`}
              >
                {s === 'volume' ? 'Volume' : s === 'change' ? 'Change' : 'Price'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Search className="w-12 h-12 text-[#474D57] mb-3" />
            <p className="text-sm text-gray-400">No results found</p>
          </div>
        ) : (
          <div className="space-y-3 px-4">
            {visibleMarkets.map((market) => {
              const { high, low, bid, ask } = getRandomBidAsk(market.price);

              return (
                <div
                  key={market.symbol}
                  className={`bg-[#1A1D24] rounded-lg p-4 border border-[#2B3139] ${market.flashClass}`}
                >
                  <div
                    className="flex items-start justify-between mb-4 cursor-pointer active:opacity-70"
                    onClick={() => {
                      localStorage.setItem('currentTab', 'trade');
                      localStorage.setItem('selectedCoinSymbol', market.symbol);
                      localStorage.setItem('selectedCoinSide', 'buy');
                      window.dispatchEvent(new CustomEvent('navigate-to-trade', {
                        detail: { symbol: market.symbol, side: 'buy' }
                      }));
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex-shrink-0">
                        <CoinLogo symbol={market.symbol} dbUrl={market.logo} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">{market.symbol}</div>
                        <div className="text-[#848E9C] text-xs">/USDT</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-white text-xl mb-0.5">{formatPrice(market.price)}</div>
                      <div className="text-[#848E9C] text-xs">{formatVolume(market.volume)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className={`text-lg font-bold ${
                      market.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                    }`}>
                      {market.price === 0 ? '0.00%' : `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(2)}%`}
                    </div>

                    <svg width="120" height="40" viewBox="0 0 120 40" className="opacity-80">
                      <path
                        d={(() => {
                          const isDown = market.change24h < 0;
                          const seed = market.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                          const r = (i: number) => (((seed * (i + 7) * 2654435761) >>> 0) % 100) / 100;
                          if (isDown) {
                            const pts = [
                              [0, 4 + r(0) * 4],
                              [15, 6 + r(1) * 5],
                              [30, 10 + r(2) * 4],
                              [45, 14 + r(3) * 5],
                              [60, 18 + r(4) * 4],
                              [75, 22 + r(5) * 5],
                              [90, 27 + r(6) * 4],
                              [105, 30 + r(7) * 4],
                              [120, 34 + r(8) * 5],
                            ];
                            return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${Math.min(38, p[1])}`).join(' ');
                          } else {
                            const pts = [
                              [0, 28 + r(0) * 4],
                              [15, 26 + r(1) * 3],
                              [30, 25 + r(2) * 4],
                              [45, 23 + r(3) * 3],
                              [60, 22 + r(4) * 4],
                              [75, 20 + r(5) * 3],
                              [90, 18 + r(6) * 4],
                              [105, 17 + r(7) * 3],
                              [120, 15 + r(8) * 4],
                            ];
                            return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${Math.max(4, p[1])}`).join(' ');
                          }
                        })()}
                        stroke={market.change24h >= 0 ? '#0ECB81' : '#F6465D'}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
                    <div>
                      <div className="text-[#848E9C] mb-1">24h High</div>
                      <div className="text-white font-medium">{formatPrice(high)}</div>
                    </div>
                    <div>
                      <div className="text-[#848E9C] mb-1">24h Low</div>
                      <div className="text-white font-medium">{formatPrice(low)}</div>
                    </div>
                    <div>
                      <div className="text-[#848E9C] mb-1">Bid</div>
                      <div className="text-[#0ECB81] font-semibold">{formatPrice(bid)}</div>
                    </div>
                    <div>
                      <div className="text-[#848E9C] mb-1">Ask</div>
                      <div className="text-[#F6465D] font-semibold">{formatPrice(ask)}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        localStorage.setItem('currentTab', 'trade');
                        localStorage.setItem('selectedCoinSymbol', market.symbol);
                        localStorage.setItem('selectedCoinSide', 'buy');
                        window.dispatchEvent(new CustomEvent('navigate-to-trade', {
                          detail: { symbol: market.symbol, side: 'buy' }
                        }));
                      }}
                      className="flex-1 bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      Buy {market.symbol}
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('currentTab', 'trade');
                        localStorage.setItem('selectedCoinSymbol', market.symbol);
                        localStorage.setItem('selectedCoinSide', 'sell');
                        window.dispatchEvent(new CustomEvent('navigate-to-trade', {
                          detail: { symbol: market.symbol, side: 'sell' }
                        }));
                      }}
                      className="flex-1 bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      Sell {market.symbol}
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length > 15 && (
              <div className="flex justify-center py-5">
                <button
                  onClick={() => setShowAllCoins(!showAllCoins)}
                  className="px-6 py-2.5 bg-[#2B3139] hover:bg-[#343C45] rounded-lg font-medium text-[13px] transition-all flex items-center gap-2"
                >
                  {showAllCoins ? 'Show Less' : `View All ${filtered.length} Pairs`}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAllCoins ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

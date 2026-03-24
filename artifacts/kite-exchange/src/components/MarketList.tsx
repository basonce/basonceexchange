import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import { fetchHybridPrices } from '../lib/hybrid-price';
import { fetchCoinGeckoPrices } from '../lib/coingecko-price';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { supabase } from '../lib/supabase';
import CoinLogo from './CoinLogo';
import { getProxiedLogoUrl } from '../lib/logo-utils';

// EQ 24h volume: starts at $6M at midnight UTC, grows to $478.7M max by end of day.
// Completely independent of price — time-based only.
function computeEQDailyVolume(): number {
  const MIN_VOL = 6_000_000;
  const MAX_VOL = 478_700_000;
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const secondsElapsed = (now.getTime() - startOfDay.getTime()) / 1000;
  const progress = secondsElapsed / (24 * 60 * 60);
  const curvedProgress = 1 - Math.pow(1 - Math.min(1, progress), 1.6);
  const noiseSeed = Math.floor(secondsElapsed / 300);
  const noise = (Math.sin(noiseSeed * 3.71) * 0.5 + Math.cos(noiseSeed * 2.13) * 0.5) * 0.012;
  return Math.round(MIN_VOL + (MAX_VOL - MIN_VOL) * Math.min(1, Math.max(0, curvedProgress + noise)));
}

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  logoUrl: string;
  isEarnQuest?: boolean;
}

interface MarketListProps {
  onSelectCrypto: (crypto: any) => void;
}

export default function MarketList({ onSelectCrypto }: MarketListProps) {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const priceManager = useRef(EarnQuestPriceManager.getInstance());
  const marketsRef = useRef<MarketData[]>([]);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchMarkets();

    const unsubscribe = priceManager.current.subscribe(() => {
      updateEQPrice();
    });

    refreshTimerRef.current = setInterval(() => {
      refreshPrices();
    }, 30000);

    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  const updateEQPrice = () => {
    setMarkets(prevMarkets =>
      prevMarkets.map(market => {
        if (market.isEarnQuest) {
          return {
            ...market,
            price: priceManager.current.getPrice(),
            change24h: priceManager.current.getChange()
          };
        }
        return market;
      })
    );
  };

  const refreshPrices = async () => {
    const current = marketsRef.current;
    if (current.length === 0) return;

    const nonEQ = current.filter(m => !m.isEarnQuest).map(m => m.symbol);
    if (nonEQ.length === 0) return;

    try {
      const [hybridResult, cgPrices] = await Promise.all([
        fetchHybridPrices(nonEQ),
        fetchCoinGeckoPrices(nonEQ),
      ]);

      const hybridMap = new Map<string, any>();
      if (hybridResult.success) {
        hybridResult.prices.forEach(p => {
          if (p.price > 0) hybridMap.set(p.symbol, p);
        });
      }

      setMarkets(prev => {
        const updated = prev.map(m => {
          if (m.isEarnQuest) return m;
          const h = hybridMap.get(m.symbol);
          if (h) return { ...m, price: h.price, change24h: h.change24h, volume: h.volume };
          const cg = cgPrices.get(m.symbol);
          if (cg) return { ...m, price: cg.price, change24h: cg.change24h, volume: cg.volume };
          return m;
        });
        marketsRef.current = updated;
        return updated;
      });
    } catch (e) {
      console.error('Price refresh error:', e);
    }
  };

  const fetchMarkets = async () => {
    try {
      const { data: coins } = await supabase
        .from('supported_coins')
        .select('symbol, name, logo_url, is_spot_enabled')
        .eq('is_active', true)
        .eq('is_spot_enabled', true)
        .order('sort_order');

      if (!coins || coins.length === 0) {
        setLoading(false);
        return;
      }

      const symbols = coins.map(c => c.symbol).filter(s => s !== 'EQ');

      const [hybridResult, cgPrices] = await Promise.all([
        fetchHybridPrices(symbols),
        fetchCoinGeckoPrices(symbols),
      ]);

      const hybridMap = new Map<string, any>();
      if (hybridResult.success) {
        hybridResult.prices.forEach(p => {
          if (p.price > 0) hybridMap.set(p.symbol, p);
        });
      }

      const marketData: MarketData[] = [];

      coins.forEach(coin => {
        if (coin.symbol === 'EQ') {
          marketData.push({
            symbol: 'EQ',
            name: 'EarnQuest',
            price: priceManager.current.getPrice(),
            change24h: priceManager.current.getChange(),
            volume: computeEQDailyVolume(),
            logoUrl: getProxiedLogoUrl(coin.logo_url) || '/earnquest-logo-icon-2.png',
            isEarnQuest: true,
          });
          return;
        }

        const hybrid = hybridMap.get(coin.symbol);
        if (hybrid) {
          marketData.push({
            symbol: coin.symbol,
            name: coin.name,
            price: hybrid.price,
            change24h: hybrid.change24h,
            volume: hybrid.volume,
            logoUrl: getProxiedLogoUrl(coin.logo_url) || `https://ui-avatars.com/api/?name=${coin.symbol}&background=f0b90b&color=000&size=128&bold=true`,
          });
          return;
        }

        const cg = cgPrices.get(coin.symbol);
        if (cg) {
          marketData.push({
            symbol: coin.symbol,
            name: coin.name,
            price: cg.price,
            change24h: cg.change24h,
            volume: cg.volume,
            logoUrl: getProxiedLogoUrl(coin.logo_url) || `https://ui-avatars.com/api/?name=${coin.symbol}&background=f0b90b&color=000&size=128&bold=true`,
          });
          return;
        }

        marketData.push({
          symbol: coin.symbol,
          name: coin.name,
          price: 0,
          change24h: 0,
          volume: 0,
          logoUrl: getProxiedLogoUrl(coin.logo_url) || `https://ui-avatars.com/api/?name=${coin.symbol}&background=f0b90b&color=000&size=128&bold=true`,
        });
      });

      marketsRef.current = marketData;
      setMarkets(marketData);
      setLoading(false);

      const zeroPriceSymbols = marketData
        .filter(m => !m.isEarnQuest && m.price === 0)
        .map(m => m.symbol);

      if (zeroPriceSymbols.length > 0) {
        fetchCoinGeckoPrices(zeroPriceSymbols, true).then(cgFallback => {
          if (cgFallback.size === 0) return;
          setMarkets(prev => {
            const updated = prev.map(m => {
              if (m.price > 0) return m;
              const cg = cgFallback.get(m.symbol);
              if (cg) return { ...m, price: cg.price, change24h: cg.change24h, volume: cg.volume };
              return m;
            });
            marketsRef.current = updated;
            return updated;
          });
        });
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
      setLoading(false);
    }
  };

  const filteredMarkets = markets.filter(market =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number) => {
    if (price <= 0) return '$0.00';
    if (price < 0.000001) return `$${price.toFixed(12)}`;
    if (price < 0.0001) return `$${price.toFixed(10)}`;
    if (price < 0.01) return `$${price.toFixed(8)}`;
    if (price < 1) return `$${price.toFixed(6)}`;
    if (price < 100) return `$${price.toFixed(4)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#181A20]">
        <div className="animate-spin rounded-full h-16 w-16 border-[#F0B90B] mb-4"></div>
        <p className="text-lg">Loading real-time market data from Basonce...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181A20] text-white">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="font-bold mb-2 text-3xl">Market Overview</h1>
          <p className="text-base">Real-time prices - Updates every 30 seconds</p>
        </div>

        <div className="mb-6 relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border-2 border-[#F0B90B] flex items-center justify-center">
            <Search className="w-4 h-4 text-[#F0B90B]" />
          </div>
          <input
            type="text"
            placeholder="Search cryptocurrencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#181A20] border border-[#2B3139] rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:border-[#F0B90B] transition-colors"
          />
        </div>

        <div className="hidden bg-[#181A20] rounded-lg overflow-hidden border border-[#2B3139] block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-[#2B3139] bg-[#2B3139]/50">
                  <th className="px-6 py-4 text-gray-400 font-medium">#</th>
                  <th className="px-6 py-4 text-gray-400 font-medium">Asset</th>
                  <th className="px-6 py-4 text-gray-400 font-medium">Price</th>
                  <th className="px-6 py-4 text-gray-400 font-medium">24h Change</th>
                  <th className="px-6 py-4 text-gray-400 font-medium hidden table-cell">24h Volume</th>
                  <th className="px-6 py-4 text-gray-400 font-medium">Trade</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarkets.map((market, index) => (
                  <tr
                    key={market.symbol}
                    className={`border-b hover:bg-[#2B3139]/50 transition-colors cursor-pointer ${ market.isEarnQuest ? 'bg-gradient-to-r from-[#7B3FE4]/10 via-[#A726C1]/5 to-[#00C9FF]/10' : '' }`}
                    onClick={() => onSelectCrypto(market)}
                  >
                    <td className="px-6 py-4 text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <CoinLogo symbol={market.symbol} dbUrl={market.logoUrl} />
                        </div>
                        <div>
                          <div className="font-semibold text-base flex items-center gap-2">
                            {market.symbol}
                            {market.isEarnQuest && (
                              <span className="bg-[#F0B90B] text-[9px] font-bold px-2 py-0.5 rounded">HOT</span>
                            )}
                          </div>
                          <div className="text-gray-500">{market.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {formatPrice(market.price)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end space-x-1 font-semibold ${ market.change24h >= 0 ? 'text-green-500' : 'text-red-500' }`}>
                        {market.change24h >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>
                          {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono hidden table-cell">
                      {formatVolume(market.volume)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCrypto(market);
                        }}
                        className="px-5 py-2 bg-[#F0B90B] font-semibold rounded-lg transition-all transform hover:scale-105 text-sm"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 hidden">
          {filteredMarkets.map((market, index) => (
            <div
              key={market.symbol}
              onClick={() => onSelectCrypto(market)}
              className={`rounded-lg border p-4 hover:bg-[#2B3139]/50 transition-colors active:scale-98 ${ market.isEarnQuest ? 'bg-gradient-to-br from-[#7B3FE4]/20 via-[#A726C1]/10 to-[#00C9FF]/20 border-[#7B3FE4]/30' : 'bg-[#181A20] border-[#2B3139]' }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">{index + 1}</span>
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <CoinLogo symbol={market.symbol} dbUrl={market.logoUrl} />
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      {market.symbol}
                      {market.isEarnQuest && (
                        <span className="bg-[#F0B90B] text-[8px] font-bold px-1.5 py-0.5 rounded">HOT</span>
                      )}
                    </div>
                    <div className="text-gray-500">{market.name}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCrypto(market);
                  }}
                  className="px-4 py-2 bg-[#F0B90B] hover:bg-[#F0B90B] font-semibold rounded-lg text-sm"
                >
                  Trade
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 mb-1">Price</div>
                  <div className="text-white font-medium">{formatPrice(market.price)}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500 mb-1">24h Change</div>
                  <div className={`flex items-center justify-end space-x-1 font-semibold ${ market.change24h >= 0 ? 'text-green-500' : 'text-red-500' }`}>
                    {market.change24h >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>
                      {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMarkets.length === 0 && !loading && (
          <div className="py-12 text-gray-400">
            No cryptocurrencies found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Search, Star } from 'lucide-react';
import { useMarkets } from '../useMarkets';
import type { DeskTab } from '../components/DesktopNav';
import CoinLogo from '../../components/CoinLogo';
import Sparkline from '../components/Sparkline';
import { formatPriceWithSymbol, formatVolumeWithSymbol } from '../../lib/format-utils';

interface DesktopMarketsProps {
  onNavigate: (tab: DeskTab) => void;
}

const FILTERS = ['All', 'Favorites', 'Top Gainers', 'Top Losers', '24h Volume', 'New'] as const;

export default function DesktopMarkets({ onNavigate }: DesktopMarketsProps) {
  const { markets, loading } = useMarkets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const goTrade = (symbol: string) => {
    localStorage.setItem('selectedCoinSymbol', symbol);
    localStorage.setItem('selectedCoinSide', 'buy');
    onNavigate('trade');
  };

  const rows = useMemo(() => {
    let r = markets.filter(m =>
      m.symbol.toLowerCase().includes(query.toLowerCase()) ||
      m.fullName.toLowerCase().includes(query.toLowerCase())
    );
    if (filter === 'Top Gainers') r = [...r].sort((a, b) => b.change24h - a.change24h);
    else if (filter === 'Top Losers') r = [...r].sort((a, b) => a.change24h - b.change24h);
    else if (filter === '24h Volume') r = [...r].sort((a, b) => b.volume - a.volume);
    return r;
  }, [markets, query, filter]);

  const stat = useMemo(() => {
    const valid = markets.filter(m => m.price > 0);
    const gainers = valid.filter(m => m.change24h > 0).length;
    const topGainer = [...valid].sort((a, b) => b.change24h - a.change24h)[0];
    const topVolume = [...valid].sort((a, b) => b.volume - a.volume)[0];
    return { count: valid.length, gainers, topGainer, topVolume };
  }, [markets]);

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <h1 className="text-white font-bold text-3xl mb-1">Markets</h1>
        <p className="text-[#848E9C] text-sm mb-6">Live prices for {stat.count} trading pairs</p>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5">
            <div className="text-[#848E9C] text-xs mb-1">Listed Pairs</div>
            <div className="text-white text-2xl font-bold tabular-nums">{stat.count}</div>
          </div>
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5">
            <div className="text-[#848E9C] text-xs mb-1">Gainers (24h)</div>
            <div className="text-[#0ECB81] text-2xl font-bold tabular-nums">{stat.gainers}</div>
          </div>
          {stat.topGainer && (
            <button onClick={() => goTrade(stat.topGainer.symbol)} className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5 text-left hover:border-[#F0B90B]/40 transition-colors">
              <div className="text-[#848E9C] text-xs mb-1">Top Gainer</div>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">{stat.topGainer.symbol}</span>
                <span className="text-[#0ECB81] font-bold tabular-nums">+{stat.topGainer.change24h.toFixed(2)}%</span>
              </div>
            </button>
          )}
          {stat.topVolume && (
            <button onClick={() => goTrade(stat.topVolume.symbol)} className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5 text-left hover:border-[#F0B90B]/40 transition-colors">
              <div className="text-[#848E9C] text-xs mb-1">Highest Volume</div>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">{stat.topVolume.symbol}</span>
                <span className="text-[#EAECEF] font-medium tabular-nums text-sm">{formatVolumeWithSymbol(stat.topVolume.volume)}</span>
              </div>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  filter === f ? 'bg-[#1E2329] text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="bg-[#181A20] border border-[#2B3139] rounded-lg px-3 py-2 flex items-center gap-2 lg:w-80">
            <Search className="w-4 h-4 text-[#848E9C]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coin"
              className="bg-transparent outline-none text-sm text-white placeholder-[#5E6673] flex-1"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[40px_2fr_1.2fr_1fr_1.3fr_1.5fr_1.4fr_120px] gap-4 px-6 py-3 text-xs text-[#848E9C] font-medium border-b border-[#2B3139]">
            <div></div>
            <div>Name</div>
            <div className="text-right">Last Price</div>
            <div className="text-right">24h Change</div>
            <div className="text-right">24h High / Low</div>
            <div className="text-right">24h Volume</div>
            <div className="text-center">Last 7 Days</div>
            <div className="text-right">Action</div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-[#848E9C] text-sm">No results found</div>
          ) : (
            rows.map((m) => (
              <div
                key={m.symbol}
                onClick={() => goTrade(m.symbol)}
                className="grid grid-cols-[40px_2fr_1.2fr_1fr_1.3fr_1.5fr_1.4fr_120px] gap-4 px-6 py-4 items-center border-b border-[#2B3139]/60 last:border-0 hover:bg-[#1E2329] cursor-pointer transition-colors group"
              >
                <Star className="w-4 h-4 text-[#474D57] group-hover:text-[#848E9C]" onClick={(e) => e.stopPropagation()} />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 shrink-0"><CoinLogo symbol={m.symbol} dbUrl={m.logo} /></div>
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-sm">{m.symbol}<span className="text-[#5E6673] font-normal">/USDT</span></div>
                    <div className="text-[#848E9C] text-xs truncate">{m.fullName}</div>
                  </div>
                </div>
                <div className="text-right text-white font-medium tabular-nums">{formatPriceWithSymbol(m.price)}</div>
                <div className={`text-right font-semibold tabular-nums ${m.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                </div>
                <div className="text-right text-[#B7BDC6] text-xs tabular-nums">
                  <div>{formatPriceWithSymbol(m.high24h)}</div>
                  <div className="text-[#5E6673]">{formatPriceWithSymbol(m.low24h)}</div>
                </div>
                <div className="text-right text-[#B7BDC6] text-sm tabular-nums">{formatVolumeWithSymbol(m.volume)}</div>
                <div className="flex justify-center"><Sparkline symbol={m.symbol} positive={m.change24h >= 0} /></div>
                <div className="flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); goTrade(m.symbol); }}
                    className="px-4 py-1.5 text-sm font-medium text-[#F0B90B] hover:bg-[#F0B90B] hover:text-black rounded-md border border-[#F0B90B]/40 transition-colors"
                  >
                    Trade
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

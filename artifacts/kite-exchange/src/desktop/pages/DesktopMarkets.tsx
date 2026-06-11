import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Star } from 'lucide-react';
import { useMarkets, DeskMarket } from '../useMarkets';
import type { DeskTab } from '../components/DesktopNav';
import CoinLogo from '../../components/CoinLogo';
import Sparkline from '../components/Sparkline';
import { formatPriceWithSymbol, formatVolumeWithSymbol } from '../../lib/format-utils';

interface DesktopMarketsProps {
  onNavigate: (tab: DeskTab) => void;
}

const FILTERS = ['All', 'Favorites', 'Top Gainers', 'Top Losers', '24h Volume', 'New'] as const;
const FAVS_KEY = 'gm_favs_v9';

export default function DesktopMarkets({ onNavigate }: DesktopMarketsProps) {
  const { markets, loading } = useMarkets();
  const [view, setView] = useState<'overview' | 'trading'>('overview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const [favs, setFavs] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key !== FAVS_KEY) return;
      try { setFavs(new Set(JSON.parse(e.newValue || '[]'))); } catch { /* ignore */ }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const toggleFav = useCallback((s: string) => {
    setFavs(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      localStorage.setItem(FAVS_KEY, JSON.stringify([...n]));
      return n;
    });
  }, []);

  const goTrade = (symbol: string) => {
    localStorage.setItem('selectedCoinSymbol', symbol);
    localStorage.setItem('selectedCoinSide', 'buy');
    onNavigate('trade');
  };

  const valid = useMemo(() => markets.filter(m => m.symbol !== 'USDT' && m.price > 0), [markets]);

  const byVolume = useMemo(() => [...valid].sort((a, b) => b.volume - a.volume), [valid]);
  const byGain = useMemo(() => [...valid].sort((a, b) => b.change24h - a.change24h), [valid]);
  const byLoss = useMemo(() => [...valid].sort((a, b) => a.change24h - b.change24h), [valid]);
  const newCoins = useMemo(() => valid.filter(m => m.isIndependent || m.isEarnQuest), [valid]);

  const rows = useMemo(() => {
    let r = valid.filter(m =>
      m.symbol.toLowerCase().includes(query.toLowerCase()) ||
      m.fullName.toLowerCase().includes(query.toLowerCase())
    );
    if (filter === 'Favorites') r = r.filter(m => favs.has(m.symbol));
    else if (filter === 'Top Gainers') r = [...r].sort((a, b) => b.change24h - a.change24h);
    else if (filter === 'Top Losers') r = [...r].sort((a, b) => a.change24h - b.change24h);
    else if (filter === '24h Volume') r = [...r].sort((a, b) => b.volume - a.volume);
    else if (filter === 'New') r = r.filter(m => m.isIndependent || m.isEarnQuest);
    return r;
  }, [valid, query, filter, favs]);

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <h1 className="text-white font-bold text-3xl mb-4">Markets</h1>

        {/* Sub-nav */}
        <div className="flex items-center gap-6 border-b border-[#2B3139] mb-6">
          {([['overview', 'Overview'], ['trading', 'Trading Data']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`relative pb-3 text-base font-semibold transition-colors ${
                view === v ? 'text-white' : 'text-[#848E9C] hover:text-white'
              }`}
            >
              {label}
              {view === v && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B] rounded-full" />}
            </button>
          ))}
        </div>

        {view === 'overview' ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              <SummaryCard title="Hot" coins={byVolume.slice(0, 3)} onTrade={goTrade} loading={loading} />
              <SummaryCard title="New" coins={newCoins.slice(0, 3)} onTrade={goTrade} loading={loading} />
              <SummaryCard title="Top Gainers" coins={byGain.slice(0, 3)} onTrade={goTrade} loading={loading} />
              <SummaryCard title="Top Losers" coins={byLoss.slice(0, 3)} onTrade={goTrade} loading={loading} />
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
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFav(m.symbol); }}
                      className="flex items-center justify-center"
                      aria-label={favs.has(m.symbol) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 transition-colors ${favs.has(m.symbol) ? 'text-[#F0B90B] fill-[#F0B90B]' : 'text-[#474D57] group-hover:text-[#848E9C]'}`} />
                    </button>
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
          </>
        ) : (
          /* Trading Data — Rankings */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <RankingCard title="Hot Coins" coins={byVolume.slice(0, 10)} metric="change" onTrade={goTrade} loading={loading} />
            <RankingCard title="Top Gainers" coins={byGain.slice(0, 10)} metric="change" onTrade={goTrade} loading={loading} />
            <RankingCard title="Top Losers" coins={byLoss.slice(0, 10)} metric="change" onTrade={goTrade} loading={loading} />
            <RankingCard title="Top Volume" coins={byVolume.slice(0, 10)} metric="volume" onTrade={goTrade} loading={loading} />
            <RankingCard title="New Listings" coins={newCoins.slice(0, 10)} metric="change" onTrade={goTrade} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, coins, onTrade, loading }: { title: string; coins: DeskMarket[]; onTrade: (s: string) => void; loading: boolean }) {
  return (
    <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-semibold text-sm">{title}</span>
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-7 bg-[#2B3139]/40 rounded animate-pulse" />)}</div>
      ) : coins.length === 0 ? (
        <div className="text-[#5E6673] text-xs py-4 text-center">No data</div>
      ) : (
        <div className="space-y-1">
          {coins.map((m) => (
            <button
              key={m.symbol}
              onClick={() => onTrade(m.symbol)}
              className="w-full flex items-center justify-between gap-2 py-1.5 hover:bg-[#1E2329] rounded-md px-1 -mx-1 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-5 h-5 shrink-0"><CoinLogo symbol={m.symbol} dbUrl={m.logo} /></div>
                <span className="text-white text-sm font-medium truncate">{m.symbol}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[#EAECEF] text-sm tabular-nums whitespace-nowrap">{formatPriceWithSymbol(m.price)}</span>
                <span className={`text-sm font-medium tabular-nums text-right whitespace-nowrap ${m.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RankingCard({ title, coins, metric, onTrade, loading }: { title: string; coins: DeskMarket[]; metric: 'change' | 'volume'; onTrade: (s: string) => void; loading: boolean }) {
  return (
    <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5">
      <div className="text-white font-semibold text-base mb-4">{title}</div>
      <div className="grid grid-cols-[24px_minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-2 text-[11px] text-[#848E9C] pb-2 border-b border-[#2B3139]">
        <div>#</div>
        <div>Name</div>
        <div className="text-right">Price</div>
        <div className="text-right">{metric === 'volume' ? '24h Vol' : '24h Change'}</div>
      </div>
      {loading ? (
        <div className="space-y-2 pt-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-7 bg-[#2B3139]/40 rounded animate-pulse" />)}</div>
      ) : coins.length === 0 ? (
        <div className="text-[#5E6673] text-xs py-6 text-center">No data</div>
      ) : (
        coins.map((m, i) => (
          <button
            key={m.symbol}
            onClick={() => onTrade(m.symbol)}
            className="w-full grid grid-cols-[24px_minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-2 items-center py-2 hover:bg-[#1E2329] rounded-md transition-colors text-left"
          >
            <span className="text-[#848E9C] text-xs tabular-nums">{i + 1}</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 shrink-0"><CoinLogo symbol={m.symbol} dbUrl={m.logo} /></div>
              <span className="text-white text-sm font-medium truncate">{m.symbol}</span>
            </div>
            <span className="text-right text-[#EAECEF] text-sm tabular-nums whitespace-nowrap">{formatPriceWithSymbol(m.price)}</span>
            {metric === 'volume' ? (
              <span className="text-right text-[#B7BDC6] text-sm tabular-nums whitespace-nowrap">{formatVolumeWithSymbol(m.volume)}</span>
            ) : (
              <span className={`text-right text-sm font-medium tabular-nums whitespace-nowrap ${m.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
}

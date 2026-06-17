import { useState } from "react";
import { useMarkets } from "@/lib/hooks";
import { formatUsd, formatCompact } from "@/lib/format";
import { CoinIcon } from "@/components/CoinIcon";
import { Sparkline } from "@/components/Sparkline";
import { Search, Star, ChevronDown } from "lucide-react";
import { Link } from "wouter";

export function Markets() {
  const { data: markets = [], isLoading } = useMarkets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"volume" | "24h">("volume");
  const [watchlist, setWatchlist] = useState<string[]>(
    () => JSON.parse(localStorage.getItem('bnc_watchlist') || '[]')
  );

  const toggleWatchlist = (e: React.MouseEvent, symbol: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newW = watchlist.includes(symbol) ? watchlist.filter((s) => s !== symbol) : [...watchlist, symbol];
    setWatchlist(newW);
    localStorage.setItem('bnc_watchlist', JSON.stringify(newW));
  };

  const sorted = markets.filter(m => {
    if (search && !m.symbol.toLowerCase().includes(search.toLowerCase()) && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "watchlist" && !watchlist.includes(m.symbol)) return false;
    if (filter === "hot" && m.volumeUsd < 1_000_000) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "volume") return b.volumeUsd - a.volumeUsd;
    return b.change24h - a.change24h;
  });

  // "Top" surfaces the ten highest-volume markets — a real, distinct view.
  const filtered = filter === "top" ? sorted.slice(0, 10) : sorted;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-background sticky top-0 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Markets</h1>
          <Search className="w-6 h-6" />
        </div>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary h-10 rounded-xl pl-10 pr-4 text-sm outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <Chip active={filter === "watchlist"} onClick={() => setFilter(filter === "watchlist" ? "all" : "watchlist")}><Star className="w-4 h-4" /></Chip>
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          <Chip active={filter === "hot"} onClick={() => setFilter("hot")}>Hot</Chip>
          <Chip active={filter === "top"} onClick={() => setFilter("top")}>Top</Chip>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
            Network <ChevronDown className="w-3 h-3" />
          </button>
          <button className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg ${sortBy === 'mcap' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`} onClick={() => setSortBy("mcap")}>
            Market cap <ChevronDown className="w-3 h-3" />
          </button>
          <button className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg ${sortBy === '24h' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`} onClick={() => setSortBy("24h")}>
            24h <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
             {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-card rounded-xl" />)}
          </div>
        ) : (
          filtered.map(m => (
            <Link key={m.symbol} href={`/token/${m.symbol}`} className="flex items-center justify-between block">
              <div className="flex items-center gap-3">
                <CoinIcon symbol={m.symbol} size={40} />
                <div>
                  <div className="font-bold text-base">{m.symbol}</div>
                  <div className="text-xs text-muted-foreground">{formatCompact(m.marketCapUsd)} MCap • {formatCompact(m.volumeUsd)} Vol</div>
                </div>
              </div>
              <div className="w-16">
                <Sparkline data={m.sparkline} width={60} height={20} />
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <div className="font-bold text-base">{formatUsd(m.price)}</div>
                  <div className={`text-xs ${m.change24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                  </div>
                </div>
                <div onClick={(e) => toggleWatchlist(e, m.symbol)} className="p-2">
                  <Star className={`w-5 h-5 ${watchlist.includes(m.symbol) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({ active, children, onClick }: any) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
      {children}
    </button>
  );
}

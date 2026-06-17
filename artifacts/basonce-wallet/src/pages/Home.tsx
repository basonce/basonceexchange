import { useState } from "react";
import { useBncPrice, useBalances, useHistory, useMarkets } from "@/lib/hooks";
import { formatUsd, formatAmount, formatRelative } from "@/lib/format";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus, Settings, ScanLine, Clock, ChevronDown, Copy, Star } from "lucide-react";
import { Link } from "wouter";
import { CoinIcon } from "@/components/CoinIcon";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";

export function Home() {
  const { price: bncPrice, change: bncChange } = useBncPrice();
  const { data: balances = [], isLoading: balancesLoading } = useBalances();
  const { data: history = [] } = useHistory();
  const { data: markets = [] } = useMarkets();
  
  const [activeTab, setActiveTab] = useState<"crypto" | "watchlist" | "nfts">("crypto");
  const [emblaRef] = useEmblaCarousel({ loop: true });

  const totalUsd = balances.reduce((sum, b) => {
    if (b.symbol === 'BNC') return sum + (b.balance * bncPrice);
    if (b.symbol === 'USDT') return sum + b.balance;
    const m = markets.find(x => x.symbol === b.symbol);
    return sum + (b.balance * (m?.price || 0));
  }, 0);

  const prevTotalUsd = balances.reduce((sum, b) => {
    if (b.symbol === 'BNC') return sum + (b.balance * (bncPrice / (1 + bncChange/100)));
    if (b.symbol === 'USDT') return sum + b.balance;
    const m = markets.find(x => x.symbol === b.symbol);
    if (m) return sum + (b.balance * (m.price / (1 + m.change24h/100)));
    return sum + 0;
  }, 0);

  const totalChangeUsd = totalUsd - prevTotalUsd;
  const totalChangePct = prevTotalUsd > 0 ? (totalChangeUsd / prevTotalUsd) * 100 : 0;
  const isPositive = totalChangePct >= 0;

  const watchlistSymbols = JSON.parse(localStorage.getItem('bnc_watchlist') || '[]');
  const watchlistMarkets = markets.filter(m => watchlistSymbols.includes(m.symbol));

  const trending = [...markets].sort((a, b) => b.change24h - a.change24h).slice(0, 5);

  return (
    <div className="flex flex-col min-h-full bg-background pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <Link href="/settings" className="p-2 relative">
          <Settings className="w-6 h-6 text-foreground" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
        </Link>
        <Link href="/markets" className="flex-1 max-w-[200px] bg-secondary rounded-full h-8 flex items-center px-4">
          <ScanLine className="w-4 h-4 text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Search</span>
        </Link>
        <Link href="/receive" className="p-2">
          <ScanLine className="w-6 h-6 text-foreground" />
        </Link>
      </div>

      {/* Main Wallet Pill */}
      <div className="flex justify-center mt-2">
        <div className="flex items-center gap-1 bg-secondary/50 rounded-full px-3 py-1 cursor-pointer" onClick={() => toast.success("Main Wallet selected")}>
          <span className="text-sm font-medium">Main Wallet</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
          <Copy className="w-3 h-3 text-muted-foreground ml-1" onClick={(e) => { e.stopPropagation(); toast.success("Address copied"); }} />
        </div>
      </div>

      {/* Balance */}
      <div className="flex flex-col items-center mt-6 mb-8">
        <h1 className="text-[40px] font-bold tracking-tight">
          {balancesLoading ? "---" : formatUsd(totalUsd)}
        </h1>
        <div className={`flex items-center gap-1 font-medium mt-1 ${isPositive ? 'text-primary' : 'text-destructive'}`}>
          <span className="text-sm">{isPositive ? '+' : ''}{formatUsd(totalChangeUsd)} ({totalChangePct.toFixed(2)}%)</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-6 mb-8">
        <ActionBtn href="/send" icon={ArrowUpRight} label="Send" />
        <ActionBtn href="/receive" icon={ArrowDownLeft} label="Receive" />
        <ActionBtn href="/receive" icon={Plus} label="Buy" />
        <ActionBtn href="/history" icon={Clock} label="History" />
      </div>

      {/* Carousel */}
      <div className="px-4 mb-6">
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex">
            <Link href="/discover" className="flex-[0_0_100%] min-w-0 h-28 bg-gradient-to-r from-blue-900 to-purple-900 rounded-2xl p-4 flex flex-col justify-center text-white mr-4 block">
              <div className="font-bold text-lg">Start Earning</div>
              <div className="text-sm opacity-80">Explore Basonce ecosystem</div>
            </Link>
            <Link href="/markets" className="flex-[0_0_100%] min-w-0 h-28 bg-gradient-to-r from-green-900 to-emerald-900 rounded-2xl p-4 flex flex-col justify-center text-white mr-4 block">
              <div className="font-bold text-lg">Trade Perps</div>
              <div className="text-sm opacity-80">High volume markets</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 flex items-center gap-6 border-b border-border/50 mb-4 relative">
        {(["crypto", "watchlist", "nfts"] as const).map(tab => (
          <button 
            key={tab}
            className={`pb-3 text-sm font-semibold capitalize relative ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="home-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 min-h-[200px]">
        {activeTab === "crypto" && (
          <div className="space-y-4">
            {balances.map(b => {
              const m = markets.find(x => x.symbol === b.symbol);
              const price = b.symbol === 'BNC' ? bncPrice : (m?.price || 1);
              const change = b.symbol === 'BNC' ? bncChange : (m?.change24h || 0);
              return (
                <Link key={b.symbol} href={`/token/${b.symbol}`} className="flex items-center justify-between block">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={b.symbol} size={40} />
                    <div>
                      <div className="font-bold text-base">{b.symbol}</div>
                      <div className="text-sm text-muted-foreground flex gap-2">
                        {formatUsd(price)} 
                        <span className={change >= 0 ? 'text-primary' : 'text-destructive'}>
                          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatAmount(b.balance)}</div>
                    <div className="text-sm text-muted-foreground">{formatUsd(b.balance * price)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {activeTab === "watchlist" && (
          <div className="space-y-4">
            {watchlistMarkets.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Empty Watchlist</div>
            ) : (
              watchlistMarkets.map(m => (
                <Link key={m.symbol} href={`/token/${m.symbol}`} className="flex items-center justify-between block">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={m.symbol} size={40} />
                    <div>
                      <div className="font-bold">{m.symbol}</div>
                      <div className="text-sm text-muted-foreground">{m.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatUsd(m.price)}</div>
                    <div className={`text-sm ${m.change24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === "nfts" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-secondary rounded-2xl mx-auto mb-4" />
            <h3 className="font-bold text-lg">No NFTs yet</h3>
            <p className="text-muted-foreground text-sm">Your collectibles will appear here</p>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="mt-8 px-4 space-y-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Trending</h2>
          </div>
          <div className="space-y-4">
            {trending.map(m => (
               <Link key={m.symbol} href={`/token/${m.symbol}`} className="flex items-center justify-between block">
               <div className="flex items-center gap-3">
                 <CoinIcon symbol={m.symbol} size={40} />
                 <div>
                   <div className="font-bold">{m.symbol}</div>
                 </div>
               </div>
               <div className="text-right">
                 <div className="font-bold">{formatUsd(m.price)}</div>
                 <div className={`text-sm ${m.change24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
                   {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                 </div>
               </div>
             </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Recent activity</h2>
            <Link href="/history" className="text-primary text-sm font-medium">See all</Link>
          </div>
          <div className="space-y-4">
             {history.slice(0, 3).map(tx => {
               const isPositive = tx.amount > 0;
               return (
                 <div key={tx.id} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                       {tx.kind === 'receive' ? <ArrowDownLeft className="w-5 h-5 text-primary" /> : <ArrowUpRight className="w-5 h-5" />}
                     </div>
                     <div>
                       <p className="font-medium capitalize">{tx.kind}</p>
                       <p className="text-xs text-muted-foreground">{formatRelative(tx.createdAt)}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className={`font-semibold ${isPositive ? 'text-primary' : ''}`}>
                       {isPositive ? '+' : ''}{formatAmount(tx.amount)} {tx.symbol}
                     </p>
                     <p className="text-xs text-muted-foreground capitalize">{tx.status || 'completed'}</p>
                   </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 group block">
      <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center group-active:scale-95 transition-transform">
        <Icon className="w-6 h-6 text-foreground" />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </Link>
  );
}

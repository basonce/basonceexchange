import { useMarkets } from "@/lib/hooks";
import { CoinIcon } from "@/components/CoinIcon";
import { Sparkline } from "@/components/Sparkline";
import { formatUsd } from "@/lib/format";
import { Link } from "wouter";

export function Discover() {
  const { data: markets = [], isLoading } = useMarkets();

  const trending = [...markets].sort((a, b) => b.volumeUsd - a.volumeUsd).slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-card border-b border-border sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Discover</h1>
      </div>
      <div className="flex-1 p-4 space-y-8">
        
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold text-primary mb-2">Basonce Ecosystem</h2>
          <p className="text-sm text-muted-foreground">Explore the growing world of Web3 with Basonce.</p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-4">Trending</h2>
          <div className="space-y-4">
            {isLoading ? (
               <div className="animate-pulse space-y-4">
                 {[1, 2].map(i => <div key={i} className="h-16 bg-card rounded-xl" />)}
               </div>
            ) : (
              trending.map(m => (
                <Link key={m.symbol} href={`/token/${m.symbol}`} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={m.symbol} size={40} />
                    <div className="font-bold">{m.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatUsd(m.price)}</div>
                    <div className={`text-xs ${m.change24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

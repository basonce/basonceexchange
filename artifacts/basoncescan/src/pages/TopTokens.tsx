import { Link } from 'wouter';
import { Coins } from 'lucide-react';
import { useTopTokens } from '@/hooks/use-chain';
import { formatCompactUSD, formatPercent } from '@/lib/format';

export default function TopTokens() {
  const { data, isLoading } = useTopTokens();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Top Tokens</h1>
        <p className="text-muted-foreground mt-1">
          {data ? `Showing the top ${data.length} tokens on the Basonce Chain` : 'Loading...'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Token</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">24h</th>
                <th className="px-4 py-3 font-medium text-right">Volume (24h)</th>
                <th className="px-4 py-3 font-medium text-right">Holders</th>
                <th className="px-4 py-3 font-medium text-right">Market Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-secondary rounded w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                data?.map((t) => {
                  const up = t.change24h >= 0;
                  return (
                    <tr key={t.symbol} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{t.rank}</td>
                      <td className="px-4 py-3">
                        <Link href={`/token/${t.address}`} className="flex items-center gap-2.5 group">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {t.symbol.slice(0, 3)}
                          </span>
                          <span className="flex flex-col leading-tight">
                            <span className="font-medium text-foreground group-hover:text-link transition-colors">{t.name}</span>
                            <span className="text-xs text-muted-foreground">{t.symbol}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">${t.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${up ? 'text-success' : 'text-destructive'}`}>
                        {formatPercent(t.change24h)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCompactUSD(t.volume24h)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{t.holders.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCompactUSD(t.marketCap)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Coins className="w-3.5 h-3.5" />
        Token rankings are based on 24h transfer volume across the Basonce Chain.
      </p>
    </div>
  );
}

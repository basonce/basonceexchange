import { useNetworkStats, useLatestBlocks, useLatestTransactions, useLiveChainUpdates, useHomeAnalytics } from '@/hooks/use-chain';
import { GlobalSearch } from '@/components/ui/global-search';
import { Overview } from '@/components/home/overview';
import { LatestBlocks, LatestTransactions } from '@/components/home/feeds';
import { Analytics } from '@/components/home/analytics';
import type { NetworkStats, Block } from '@/lib/chain/types';
import { formatCompactUSD, formatNumber, formatPercent, formatUSD } from '@/lib/format';

function Ticker({ stats, latest }: { stats?: NetworkStats; latest?: Block }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center gap-x-6 gap-y-1 overflow-x-auto px-4 py-2 text-xs whitespace-nowrap">
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-muted-foreground">BNC</span>
          <span className="font-mono font-semibold text-foreground">{stats ? formatUSD(stats.bncPrice, 4) : '—'}</span>
          {stats && (
            <span className={stats.priceChange24h >= 0 ? 'text-success' : 'text-destructive'}>
              {formatPercent(stats.priceChange24h)}
            </span>
          )}
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Market Cap</span>
          <span className="font-mono text-foreground">{stats ? formatCompactUSD(stats.marketCap) : '—'}</span>
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" />
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="text-muted-foreground">Live TPS</span>
          <span className="font-mono text-foreground">{stats ? formatNumber(stats.tps) : '—'}</span>
        </span>
        <span className="hidden h-3 w-px bg-border md:block" />
        <span className="hidden items-center gap-1.5 md:flex">
          <span className="text-muted-foreground">Validators</span>
          <span className="font-mono text-foreground">{stats ? formatNumber(stats.activeValidators) : '—'}</span>
        </span>
        <span className="hidden h-3 w-px bg-border lg:block" />
        <span className="hidden items-center gap-1.5 lg:flex">
          <span className="text-muted-foreground">Latest Block</span>
          <span className="font-mono text-foreground">{latest ? `#${latest.number}` : '—'}</span>
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  useLiveChainUpdates();
  const { data: stats } = useNetworkStats();
  const { data: blocks = [] } = useLatestBlocks(6);
  const { data: txs = [] } = useLatestTransactions(6);
  const { data: analytics } = useHomeAnalytics();

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="border-b border-border bg-card">
        <Ticker stats={stats} latest={blocks[0]} />
        <div className="container mx-auto px-4 py-8 md:py-10">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Basonce Chain Explorer
          </h1>
          <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
            The official analytics and block explorer for the Basonce Chain — track blocks, transactions, accounts, tokens and DeFi activity in real time.
          </p>
          <div className="max-w-3xl">
            <GlobalSearch />
          </div>
        </div>
      </section>

      <div className="container mx-auto -mt-5 space-y-6 px-4">
        <Overview stats={stats} priceSeries={analytics?.priceSeries} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LatestBlocks blocks={blocks} />
          <LatestTransactions txs={txs} />
        </div>

        {analytics && <Analytics data={analytics} />}
      </div>
    </div>
  );
}

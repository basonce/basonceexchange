import { useNetworkStats, useLatestBlocks, useLatestTransactions, useLiveChainUpdates, useHomeAnalytics } from '@/hooks/use-chain';
import { GlobalSearch } from '@/components/ui/global-search';
import { Overview } from '@/components/home/overview';
import { LatestBlocks, LatestTransactions } from '@/components/home/feeds';
import { Analytics } from '@/components/home/analytics';

export default function Home() {
  useLiveChainUpdates();
  const { data: stats } = useNetworkStats();
  const { data: blocks = [] } = useLatestBlocks(6);
  const { data: txs = [] } = useLatestTransactions(6);
  const { data: analytics } = useHomeAnalytics();

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-card py-12 md:py-16">
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl" />
        <div className="container relative z-10 mx-auto px-4">
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
            Basonce Chain Explorer
          </h1>
          <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
            The official analytics and block explorer for the Basonce Chain — track blocks, transactions, accounts, tokens and DeFi activity in real time.
          </p>
          <div className="max-w-3xl">
            <GlobalSearch className="shadow-lg shadow-black/20" />
          </div>
        </div>
      </section>

      <div className="container relative z-20 mx-auto -mt-6 space-y-6 px-4">
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

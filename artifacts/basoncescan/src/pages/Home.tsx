import { useNetworkStats, useLatestBlocks, useLatestTransactions, useLiveChainUpdates, useHomeAnalytics } from '@/hooks/use-chain';
import { GlobalSearch } from '@/components/ui/global-search';
import { Overview } from '@/components/home/overview';
import { LatestBlocks, LatestTransactions } from '@/components/home/feeds';
import { Analytics } from '@/components/home/analytics';
import { AdBanner } from '@/components/home/ad-banner';

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
        <div className="container mx-auto px-4 py-8 md:py-10">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Basonce Chain Explorer
          </h1>
          <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
            The official analytics and block explorer for the Basonce Chain — track blocks, transactions, accounts, tokens and DeFi activity in real time.
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
            <div className="flex flex-col justify-center">
              <GlobalSearch />
            </div>
            <AdBanner />
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

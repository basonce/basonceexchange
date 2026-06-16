import { useNetworkStats, useLatestBlocks, useLatestTransactions, useLiveChainUpdates } from '@/hooks/use-chain';
import { GlobalSearch } from '@/components/ui/global-search';
import { formatAddress, formatAge, formatBSO, formatHash, formatNumber } from '@/lib/format';
import { Link } from 'wouter';
import { Box, ArrowRightLeft, Clock, Server, Activity, Database, Fuel, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function StatCard({ title, value, subtitle, icon: Icon }: { title: string, value: React.ReactNode, subtitle?: React.ReactNode, icon: any }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className="p-3 bg-secondary rounded-lg">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</h3>
        <div className="mt-1 text-xl font-bold text-foreground font-mono">{value}</div>
        {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}

export default function Home() {
  useLiveChainUpdates();
  const { data: stats } = useNetworkStats();
  const { data: blocks = [] } = useLatestBlocks(6);
  const { data: txs = [] } = useLatestTransactions(6);

  return (
    <div className="pb-12">
      {/* Hero Section */}
      <section className="bg-card border-b border-border py-12 md:py-16 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            The Basonce Chain Explorer
          </h1>
          <div className="max-w-3xl mb-8">
            <GlobalSearch className="shadow-lg shadow-black/20" />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 -mt-6 relative z-20">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="BASONCE Price" 
            value={stats ? `$${stats.bsoPrice.toFixed(2)}` : '...'} 
            subtitle={stats ? `MCap: $${formatNumber(stats.marketCap)}` : '...'}
            icon={Globe}
          />
          <StatCard 
            title="Transactions" 
            value={stats ? formatNumber(stats.totalTransactions) : '...'} 
            subtitle={stats ? `${stats.tps} TPS` : '...'}
            icon={Activity}
          />
          <StatCard 
            title="Latest Block" 
            value={stats ? formatNumber(stats.latestBlock) : '...'} 
            subtitle={`~3.0s Block Time`}
            icon={Box}
          />
          <StatCard 
            title="Active Validators" 
            value={stats ? stats.activeValidators : '...'} 
            subtitle={stats ? `${stats.gasPriceGwei.toFixed(2)} Gwei` : '...'}
            icon={Server}
          />
        </div>

        {/* Live Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Blocks */}
          <div className="bg-card border border-border rounded-xl flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4" /> Latest Blocks
              </h2>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <AnimatePresence initial={false}>
                {blocks.map((block) => (
                  <motion.div 
                    key={block.number}
                    initial={{ opacity: 0, y: -20, backgroundColor: 'rgba(240, 185, 11, 0.1)' }}
                    animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(240, 185, 11, 0)' }}
                    transition={{ duration: 0.5 }}
                    className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[140px]">
                      <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <Link href={`/block/${block.number}`} className="text-primary hover:text-primary/80 font-mono text-sm font-medium">
                          {block.number}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatAge(block.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full flex flex-col gap-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Validated By</span>{' '}
                        <Link href={`/address/${block.validator}`} className="text-primary hover:text-primary/80 font-mono">
                          {formatAddress(block.validator)}
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Link href={`/txs?block=${block.number}`} className="text-primary hover:text-primary/80">
                          {block.txCount} txns
                        </Link>{' '}
                        in 3 secs
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-auto text-left sm:text-right">
                      <div className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary inline-block font-mono">
                        {block.reward.toFixed(4)} BSO
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="p-3 bg-secondary/30 text-center rounded-b-xl border-t border-border">
              <Link href="/blocks" className="text-sm text-primary hover:text-primary/80 font-medium uppercase tracking-wider">
                View All Blocks
              </Link>
            </div>
          </div>

          {/* Latest Transactions */}
          <div className="bg-card border border-border rounded-xl flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" /> Latest Transactions
              </h2>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <AnimatePresence initial={false}>
                {txs.map((tx) => (
                  <motion.div 
                    key={tx.hash}
                    initial={{ opacity: 0, y: -20, backgroundColor: 'rgba(240, 185, 11, 0.1)' }}
                    animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(240, 185, 11, 0)' }}
                    transition={{ duration: 0.5 }}
                    className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[140px]">
                      <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
                        <ArrowRightLeft className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <Link href={`/tx/${tx.hash}`} className="text-primary hover:text-primary/80 font-mono text-sm font-medium block truncate max-w-[120px]">
                          {formatHash(tx.hash)}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatAge(tx.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full flex flex-col gap-1 overflow-hidden">
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">From</span>
                        <Link href={`/address/${tx.from}`} className="text-primary hover:text-primary/80 font-mono truncate">
                          {formatAddress(tx.from)}
                        </Link>
                      </div>
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">To</span>
                        <Link href={`/address/${tx.to}`} className="text-primary hover:text-primary/80 font-mono truncate">
                          {tx.to ? formatAddress(tx.to) : 'Contract Creation'}
                        </Link>
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-auto text-left sm:text-right">
                      <div className="text-xs px-2 py-1 rounded-md bg-secondary inline-block font-mono text-foreground">
                        {formatBSO(tx.value)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="p-3 bg-secondary/30 text-center rounded-b-xl border-t border-border">
              <Link href="/txs" className="text-sm text-primary hover:text-primary/80 font-medium uppercase tracking-wider">
                View All Transactions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, ArrowRightLeft, Clock, Database } from 'lucide-react';
import type { Block, Transaction } from '@/lib/chain/types';
import { formatAddress, formatAge, formatBNC, formatHash } from '@/lib/format';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function FeedShell({
  title, icon: Icon, footerHref, footerLabel, children,
}: {
  title: string;
  icon: any;
  footerHref: string;
  footerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h2>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <div className="rounded-b-lg border-t border-border bg-secondary/30 p-3 text-center">
        <Link href={footerHref} className="text-xs font-medium uppercase tracking-wider text-link hover:text-link/80">
          {footerLabel}
        </Link>
      </div>
    </div>
  );
}

export function LatestBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <FeedShell title="Latest Blocks" icon={Database} footerHref="/blocks" footerLabel="View All Blocks">
      <AnimatePresence initial={false}>
        {blocks.map((block) => (
          <motion.div
            key={block.number}
            initial={{ opacity: 0, y: -16, backgroundColor: 'rgba(240, 185, 11, 0.22)' }}
            animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(240, 185, 11, 0)' }}
            transition={{ duration: 0.5 }}
            className="flex min-w-0 items-center gap-4 border-b border-border p-4 last:border-b-0 hover:bg-secondary/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <Box className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/block/${block.number}`} className="tabular-nums text-sm font-medium text-link hover:text-link/80">
                {block.number}
              </Link>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatAge(block.timestamp)}
              </div>
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <div className="truncate text-sm">
                <span className="text-muted-foreground">Producer </span>
                <span className="font-medium text-foreground">{block.producerName}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <Link href={`/txs?block=${block.number}`} className="text-link hover:text-link/80">
                  {block.txCount} txns
                </Link>{' '}in 3s
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="inline-block rounded-md bg-secondary px-2 py-1 tabular-nums text-xs text-foreground">
                {block.reward.toFixed(4)} BNC
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </FeedShell>
  );
}

export function LatestTransactions({ txs }: { txs: Transaction[] }) {
  return (
    <FeedShell title="Latest Transactions" icon={ArrowRightLeft} footerHref="/txs" footerLabel="View All Transactions">
      <AnimatePresence initial={false}>
        {txs.map((tx) => (
          <motion.div
            key={tx.hash}
            initial={{ opacity: 0, y: -16, backgroundColor: 'rgba(240, 185, 11, 0.22)' }}
            animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(240, 185, 11, 0)' }}
            transition={{ duration: 0.5 }}
            className="flex min-w-0 items-center gap-4 border-b border-border p-4 last:border-b-0 hover:bg-secondary/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/tx/${tx.hash}`} className="block truncate tabular-nums text-sm font-medium text-link hover:text-link/80">
                {formatHash(tx.hash)}
              </Link>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {formatAge(tx.timestamp)}
              </div>
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <div className="flex items-center gap-2 truncate text-sm">
                <span className="text-muted-foreground">From</span>
                <Link href={`/address/${tx.from}`} className="truncate tabular-nums text-link hover:text-link/80">
                  {formatAddress(tx.from)}
                </Link>
              </div>
              <div className="flex items-center gap-2 truncate text-sm">
                <span className="text-muted-foreground">To</span>
                {tx.to && tx.to !== ZERO_ADDRESS ? (
                  <Link href={`/address/${tx.to}`} className="truncate tabular-nums text-link hover:text-link/80">
                    {formatAddress(tx.to)}
                  </Link>
                ) : (
                  <span className="truncate tabular-nums text-muted-foreground">Contract Creation</span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="inline-block rounded-md bg-secondary px-2 py-1 tabular-nums text-xs text-foreground">
                {formatBNC(tx.value)}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </FeedShell>
  );
}

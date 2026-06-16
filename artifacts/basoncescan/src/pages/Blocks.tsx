import { useState } from 'react';
import { useBlocksPage, useLiveChainUpdates } from '@/hooks/use-chain';
import { formatAddress, formatAge, formatNumber } from '@/lib/format';
import { Link } from 'wouter';
import { Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Blocks() {
  useLiveChainUpdates();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBlocksPage(page, 25);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Blocks</h1>
        <p className="text-muted-foreground mt-1">
          {data ? `Block #${formatNumber(data.total)} to #${formatNumber(Math.max(1, data.total - data.pageSize + 1))}` : 'Loading...'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Pagination Top */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
          <div className="text-sm text-muted-foreground">
            Showing blocks network
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-sm bg-secondary text-foreground rounded-md disabled:opacity-50 hover:bg-secondary/80 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <button 
              disabled={!data || page >= data.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-sm bg-secondary text-foreground rounded-md disabled:opacity-50 hover:bg-secondary/80 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Block</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">Txn</th>
                <th className="px-4 py-3 font-medium">Validator</th>
                <th className="px-4 py-3 font-medium">Gas Used</th>
                <th className="px-4 py-3 font-medium">Gas Limit</th>
                <th className="px-4 py-3 font-medium text-right">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-20"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-20"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-10"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-32"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 bg-secondary rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                <AnimatePresence initial={false}>
                  {data?.data.map((block, index) => (
                    <motion.tr 
                      key={block.number}
                      initial={page === 1 && index < 5 ? { backgroundColor: 'rgba(240, 185, 11, 0.1)' } : false}
                      animate={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
                      transition={{ duration: 1.5 }}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-muted-foreground" />
                          <Link href={`/block/${block.number}`} className="text-primary hover:text-primary/80 font-mono">
                            {block.number}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatAge(block.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/txs?block=${block.number}`} className="text-primary hover:text-primary/80 font-mono">
                          {block.txCount}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/address/${block.validator}`} className="text-primary hover:text-primary/80 font-mono">
                          {formatAddress(block.validator, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {formatNumber(block.gasUsed)}
                        <span className="text-xs ml-1 opacity-50">({Math.round((block.gasUsed / block.gasLimit) * 100)}%)</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {formatNumber(block.gasLimit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {block.reward.toFixed(5)} BNC
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bottom */}
        <div className="p-4 border-t border-border flex justify-between items-center bg-secondary/30">
          <div className="text-sm text-muted-foreground">
            {data && `Showing blocks`}
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-sm bg-secondary text-foreground rounded-md disabled:opacity-50 hover:bg-secondary/80 transition-colors"
            >
              Previous
            </button>
            <button 
              disabled={!data || page >= data.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-sm bg-secondary text-foreground rounded-md disabled:opacity-50 hover:bg-secondary/80 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

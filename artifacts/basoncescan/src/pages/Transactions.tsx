import { useState } from 'react';
import { useTransactionsPage, useLiveChainUpdates } from '@/hooks/use-chain';
import { formatAddress, formatAge, formatBNC, formatHash } from '@/lib/format';
import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Transactions() {
  useLiveChainUpdates();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactionsPage(page, 25);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-muted-foreground mt-1">
          {data ? `A total of > ${data.total.toLocaleString()} transactions found` : 'Loading...'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Pagination Top */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
          <div className="text-sm text-muted-foreground">
            Showing latest transactions
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
                <th className="px-4 py-3 font-medium">Txn Hash</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Block</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium text-center"></th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium text-right">Txn Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-4 py-4"><div className="h-5 bg-secondary rounded-full w-20"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-16"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-20"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-4 mx-auto"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-16"></div></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 bg-secondary rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : (
                <AnimatePresence initial={false}>
                  {data?.data.map((tx, index) => (
                    <motion.tr 
                      key={tx.hash}
                      initial={page === 1 && index < 5 ? { backgroundColor: 'rgba(240, 185, 11, 0.1)' } : false}
                      animate={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
                      transition={{ duration: 1.5 }}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tx.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : tx.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          )}
                          <Link href={`/tx/${tx.hash}`} className="text-primary hover:text-primary/80 font-mono">
                            {formatHash(tx.hash)}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground border border-border">
                          {tx.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/block/${tx.blockNumber}`} className="text-primary hover:text-primary/80 font-mono">
                          {tx.blockNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatAge(tx.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/address/${tx.from}`} className="text-primary hover:text-primary/80 font-mono flex items-center gap-1">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          {formatAddress(tx.from)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-success mx-auto">
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tx.to ? (
                          <Link href={`/address/${tx.to}`} className="text-primary hover:text-primary/80 font-mono flex items-center gap-1">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                            {formatAddress(tx.to)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Contract Creation
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatBNC(tx.value)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {tx.fee.toFixed(6)}
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
            {data && `Showing ${((page - 1) * data.pageSize) + 1} to ${Math.min(page * data.pageSize, data.total)} of ${data.total} records`}
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

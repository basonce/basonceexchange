import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useAddress, useAddressTransactions } from '@/hooks/use-chain';
import { formatAddress, formatBSO, formatHash, formatAge } from '@/lib/format';
import { FileText, QrCode, ArrowRight, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';

export default function AddressDetail() {
  const { hash } = useParams<{ hash: string }>();
  const [page, setPage] = useState(1);
  const { data: address, isLoading: isLoadingAddr } = useAddress(hash || '');
  const { data: txsData, isLoading: isLoadingTxs } = useAddressTransactions(hash || '', page, 25);

  if (isLoadingAddr) {
    return <div className="container mx-auto px-4 py-12 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Address Not Found</h1>
        <Link href="/" className="mt-6 inline-block text-primary hover:underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
            <QrCode className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              Address
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1 break-all">{address.hash}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Overview Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-border font-medium">
            Overview
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">BSO Balance</div>
              <div className="text-2xl font-bold font-mono">
                {formatBSO(address.balance)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">BSO Value</div>
              <div className="text-foreground">
                ${(address.balance * 42.50).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-muted-foreground text-sm">(@ $42.50/BSO)</span>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Token Holdings</div>
              <div className="text-foreground font-medium">
                $0.00 <span className="text-muted-foreground font-normal">(0 Tokens)</span>
              </div>
            </div>
          </div>
        </div>

        {/* More Info Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-border font-medium">
            More Info
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-muted-foreground col-span-1">First Txn Sent:</div>
              <div className="col-span-2">{formatAge(address.firstSeen)}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-muted-foreground col-span-1">Last Txn Sent:</div>
              <div className="col-span-2">{formatAge(address.lastSeen)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Tab */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-0 border-b border-border flex gap-6">
          <button className="py-4 border-b-2 border-primary text-primary font-medium text-sm">
            Transactions
          </button>
          <button className="py-4 border-b-2 border-transparent text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">
            Token Transfers
          </button>
        </div>
        
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/10">
          <div className="text-sm text-muted-foreground">
            Latest {txsData?.total || 0} transactions
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/30 text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Txn Hash</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Block</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium text-center"></th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingTxs ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-4 h-12 bg-secondary/50"></td>
                  </tr>
                ))
              ) : txsData?.data.map((tx) => {
                const isOut = tx.from.toLowerCase() === hash?.toLowerCase();
                return (
                  <tr key={tx.hash} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tx.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        ) : tx.status === 'failed' ? (
                          <XCircle className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        )}
                        <Link href={`/tx/${tx.hash}`} className="text-primary hover:text-primary/80 font-mono">
                          {formatHash(tx.hash)}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-foreground border border-border">
                        {tx.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/block/${tx.blockNumber}`} className="text-primary hover:text-primary/80 font-mono">
                        {tx.blockNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatAge(tx.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      {isOut ? (
                        <span className="font-mono text-muted-foreground">{formatAddress(tx.from)}</span>
                      ) : (
                        <Link href={`/address/${tx.from}`} className="text-primary hover:text-primary/80 font-mono">
                          {formatAddress(tx.from)}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOut ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-warning/10 text-warning text-xs font-bold font-mono border border-warning/20">
                          OUT
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-success/10 text-success text-xs font-bold font-mono border border-success/20">
                          IN
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isOut ? (
                        <span className="font-mono text-muted-foreground">{tx.to ? formatAddress(tx.to) : 'Contract'}</span>
                      ) : tx.to ? (
                        <Link href={`/address/${tx.to}`} className="text-primary hover:text-primary/80 font-mono">
                          {formatAddress(tx.to)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Contract Creation</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {formatBSO(tx.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {txsData && txsData.totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-secondary/10">
            <div className="text-sm text-muted-foreground">
              Page {page} of {txsData.totalPages}
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
                disabled={page >= txsData.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-sm bg-secondary text-foreground rounded-md disabled:opacity-50 hover:bg-secondary/80 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

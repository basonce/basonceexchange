import { useState } from 'react';
import { Link } from 'wouter';
import { FileText, FileCode2 } from 'lucide-react';
import { useTopAccounts } from '@/hooks/use-chain';
import { formatAddress, formatBNC, formatUSD, BNC_PRICE } from '@/lib/format';

export default function TopAccounts() {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { data, isLoading } = useTopAccounts(page, pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Top Accounts by BNC Balance</h1>
        <p className="text-muted-foreground mt-1">
          {data ? `A total of ${data.total.toLocaleString()} accounts found` : 'Loading...'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
          <div className="text-sm text-muted-foreground">Ranked by current balance</div>
          <Pager page={page} totalPages={data?.totalPages} onChange={setPage} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-right">Value (USD)</th>
                <th className="px-4 py-3 font-medium text-right">Supply %</th>
                <th className="px-4 py-3 font-medium text-right">Txn Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-8" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-48" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-24 ml-auto" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-24 ml-auto" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-12 ml-auto" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-secondary rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : (
                data?.data.map((acc) => (
                  <tr key={acc.address} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{acc.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {acc.type === 'contract' ? (
                          <FileCode2 className="w-4 h-4 text-primary" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Link href={`/address/${acc.address}`} className="text-link hover:text-link/80 tabular-nums">
                          {formatAddress(acc.address)}
                        </Link>
                        {acc.nameTag && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground border border-border">
                            {acc.nameTag}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatBNC(acc.balance, 0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatUSD(acc.balance * BNC_PRICE, 0)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{acc.percentage.toFixed(4)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {acc.txCount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex justify-end items-center bg-secondary/30">
          <Pager page={page} totalPages={data?.totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages?: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1 text-sm bg-secondary text-foreground rounded-md disabled:opacity-50 hover:bg-secondary/80 transition-colors"
      >
        Previous
      </button>
      <span className="text-sm text-muted-foreground">Page {page}{totalPages ? ` of ${totalPages}` : ''}</span>
      <button
        disabled={!totalPages || page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1 text-sm bg-secondary text-foreground rounded-md disabled:opacity-50 hover:bg-secondary/80 transition-colors"
      >
        Next
      </button>
    </div>
  );
}

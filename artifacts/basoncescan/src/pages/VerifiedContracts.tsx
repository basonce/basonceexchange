import { useState } from 'react';
import { Link } from 'wouter';
import { FileCode2, CheckCircle2 } from 'lucide-react';
import { useVerifiedContracts } from '@/hooks/use-chain';
import { formatAddress, formatBNC, formatAge } from '@/lib/format';

export default function VerifiedContracts() {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { data, isLoading } = useVerifiedContracts(page, pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Verified Contracts</h1>
        <p className="text-muted-foreground mt-1">
          {data ? `${data.total.toLocaleString()} contracts with verified source code` : 'Loading...'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
          <div className="text-sm text-muted-foreground">Source-verified smart contracts</div>
          <Pager page={page} totalPages={data?.totalPages} onChange={setPage} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Contract Name</th>
                <th className="px-4 py-3 font-medium">Compiler</th>
                <th className="px-4 py-3 font-medium">License</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-right">Txns</th>
                <th className="px-4 py-3 font-medium text-right">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-secondary rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                data?.data.map((c) => (
                  <tr key={c.address} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-primary" />
                        <Link href={`/address/${c.address}`} className="text-link hover:text-link/80 tabular-nums">
                          {formatAddress(c.address)}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{c.compiler} {c.version.split('+')[0]}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground border border-border">
                        {c.license}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatBNC(c.balance, 0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{c.txCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatAge(c.verifiedAt)}</td>
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

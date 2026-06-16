import { Link } from 'wouter';
import { ShieldCheck } from 'lucide-react';
import { useValidators } from '@/hooks/use-chain';
import { formatAddress, formatBNC } from '@/lib/format';

export default function Validators() {
  const { data, isLoading } = useValidators();
  const totalStake = data?.reduce((s, v) => s + v.stake, 0) ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Validator Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          {data ? `${data.length} active validators securing the Basonce Chain` : 'Loading...'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Validators" value={data ? data.length.toString() : '—'} />
        <StatCard label="Total Staked" value={data ? formatBNC(totalStake, 0) : '—'} />
        <StatCard label="Consensus" value="Delegated PoS" />
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Validator</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium text-right">Voting Power</th>
                <th className="px-4 py-3 font-medium text-right">Staked</th>
                <th className="px-4 py-3 font-medium text-right">Blocks</th>
                <th className="px-4 py-3 font-medium text-right">Uptime</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-secondary rounded w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                data?.map((v) => (
                  <tr key={v.address} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{v.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                        <span className="font-medium text-foreground">{v.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/address/${v.address}`} className="text-link hover:text-link/80 tabular-nums">
                        {formatAddress(v.address)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, v.votingPower * 4)}%` }} />
                        </div>
                        <span className="tabular-nums">{v.votingPower.toFixed(2)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatBNC(v.stake, 0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{v.blocksProduced.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.uptime.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        {v.status === 'active' ? 'Active' : 'Standby'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

import { Link } from 'wouter';
import type { HomeAnalytics } from '@/lib/chain/types';
import { formatCompact, formatCompactUSD, formatNumber, formatPercent } from '@/lib/format';
import { ChartCard, MultiLineTrend, AreaTrend, StackedBarTrend, BarTrend, C } from './charts';

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export function Analytics({ data }: { data: HomeAnalytics }) {
  return (
    <div className="space-y-6">
      {/* Transactions trend */}
      <ChartCard
        title="Transactions"
        subtitle="Daily on-chain transactions by category"
        action={<Pill>14D</Pill>}
        height={260}
      >
        <MultiLineTrend
          data={data.txTrend}
          fmt={(v) => formatCompact(v)}
          series={[
            { key: 'total', name: 'Total', color: C.gold },
            { key: 'bncTransfers', name: 'BNC Transfers', color: C.gold2 },
            { key: 'stableTransfers', name: 'Stablecoin Transfers', color: C.muted },
          ]}
        />
      </ChartCard>

      {/* TVL + projects */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ChartCard
            title="Total Value Locked"
            subtitle="TVL and staked value across the network"
            action={<Pill>14D</Pill>}
            height={260}
          >
            <AreaTrend data={data.tvlSeries} dataKey="tvl" name="TVL" color={C.gold} fmt={(v) => formatCompactUSD(v)} height={260} />
          </ChartCard>
        </div>
        <div className="flex min-w-0 flex-col rounded-lg border border-border bg-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">DeFi Projects by TVL</h3>
            <Pill>{data.tvlProjects.length} protocols</Pill>
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">TVL</th>
                  <th className="px-4 py-3 text-right font-medium">24h</th>
                </tr>
              </thead>
              <tbody>
                {data.tvlProjects.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-b-0 hover:bg-secondary/40">
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">{formatCompactUSD(p.tvl)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${p.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatPercent(p.change24h)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top tokens + transfer volume */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col rounded-lg border border-border bg-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Top Tokens by Transfer Volume</h3>
            <Pill>24h</Pill>
          </div>
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Token</th>
                  <th className="px-4 py-3 text-right font-medium">Transfer Volume</th>
                  <th className="px-4 py-3 text-right font-medium">Transfers</th>
                  <th className="px-4 py-3 text-right font-medium">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {data.topTokens.map((t) => (
                  <tr key={t.symbol} className="border-b border-border last:border-b-0 hover:bg-secondary/40">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{t.rank}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{t.symbol}</div>
                      <div className="text-xs text-muted-foreground">{t.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">{formatCompactUSD(t.transferVolume)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatNumber(t.transfers)}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">{formatCompactUSD(t.marketCap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border p-3 text-center">
            <Link href="/token/0xbasonce" className="text-xs font-medium uppercase tracking-wider text-link hover:text-link/80">
              View BNC Token
            </Link>
          </div>
        </div>
        <div className="lg:col-span-2">
          <ChartCard
            title="Transfer Volume"
            subtitle="Daily transfer volume by token"
            action={<Pill>14D</Pill>}
            height={272}
          >
            <StackedBarTrend
              data={data.transferVolumeSeries}
              fmt={(v) => formatCompactUSD(v)}
              height={272}
              series={[
                { key: 'USDB', name: 'USDB', color: C.green },
                { key: 'BNC', name: 'BNC', color: C.gold },
                { key: 'USDD', name: 'USDD', color: C.gold2 },
                { key: 'JST', name: 'JST', color: C.muted },
              ]}
            />
          </ChartCard>
        </div>
      </div>

      {/* Bottom analytics row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Active Accounts" subtitle="Daily active addresses" height={200}>
          <AreaTrend data={data.activeAccounts} dataKey="active" name="Active" color={C.gold} fmt={(v) => formatCompact(v)} height={200} />
        </ChartCard>
        <ChartCard title="New Accounts" subtitle="Daily accounts created" height={200}>
          <BarTrend data={data.activeAccounts} dataKey="created" name="Created" color={C.gold2} fmt={(v) => formatCompact(v)} height={200} />
        </ChartCard>
        <ChartCard title="Protocol Revenue" subtitle="Daily network revenue" height={200}>
          <AreaTrend data={data.revenue} dataKey="revenue" name="Revenue" color={C.green} fmt={(v) => formatCompactUSD(v)} height={200} />
        </ChartCard>
        <ChartCard title="BNC Supply" subtitle="Circulating supply growth" height={200}>
          <AreaTrend data={data.supplySeries} dataKey="supply" name="Supply" color={C.gold} fmt={(v) => formatCompact(v)} height={200} />
        </ChartCard>
      </div>
    </div>
  );
}

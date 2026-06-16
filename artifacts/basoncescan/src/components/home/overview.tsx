import type { NetworkStats, PricePoint } from '@/lib/chain/types';
import { formatCompact, formatCompactUSD, formatNumber, formatPercent, formatUSD } from '@/lib/format';
import { Sparkline } from './charts';
import { Users, Layers, ArrowRightLeft, BarChart3, Cpu, Server, FileCode2, Coins } from 'lucide-react';

function Delta({ value, suffix }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span className={positive ? 'text-success' : 'text-destructive'}>
      {formatPercent(value)}{suffix}
    </span>
  );
}

function StatCard({
  title, value, sub, icon: Icon,
}: {
  title: string;
  value: string;
  sub: React.ReactNode;
  icon: any;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-lg border border-border bg-card p-5">
      <div className="rounded-lg bg-secondary p-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="mt-1 truncate tabular-nums text-xl font-bold text-foreground">{value}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-5 py-4">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate tabular-nums text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function Overview({ stats, priceSeries }: { stats?: NetworkStats; priceSeries?: PricePoint[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
        <StatCard
          title="Total Accounts"
          value={stats ? formatCompact(stats.totalAccounts) : '—'}
          sub={stats ? <>+{formatNumber(stats.accounts24h)} (24h)</> : '—'}
          icon={Users}
        />
        <StatCard
          title="Total Value Locked"
          value={stats ? formatCompactUSD(stats.totalValueLocked) : '—'}
          sub={stats ? <Delta value={stats.tvlChange24h} suffix=" (24h)" /> : '—'}
          icon={Layers}
        />
        <StatCard
          title="Total Transactions"
          value={stats ? formatCompact(stats.totalTransactions) : '—'}
          sub={stats ? <>+{formatCompact(stats.transactions24h)} (24h)</> : '—'}
          icon={ArrowRightLeft}
        />
        <StatCard
          title="Transfer Volume"
          value={stats ? formatCompactUSD(stats.totalTransferVolume) : '—'}
          sub={stats ? <>{formatCompactUSD(stats.transferVolume24h)} (24h)</> : '—'}
          icon={BarChart3}
        />
      </div>

      {/* Price card */}
      <div className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">BNC Price</span>
              {stats && (
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${stats.priceChange24h >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {formatPercent(stats.priceChange24h)}
                </span>
              )}
            </div>
            <div className="mt-1 tabular-nums text-2xl font-bold text-foreground">
              {stats ? formatUSD(stats.bncPrice, 4) : '—'}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted-foreground">Market Cap</div>
            <div className="tabular-nums text-sm font-semibold text-foreground">
              {stats ? formatCompactUSD(stats.marketCap) : '—'}
            </div>
          </div>
        </div>

        <div className="my-3 min-w-0">
          {priceSeries && <Sparkline data={priceSeries} />}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Volume (24h)</span>
            <span className="tabular-nums text-foreground">{stats ? formatCompactUSD(stats.volume24h) : '—'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Staking</span>
            <span className="tabular-nums text-foreground">{stats ? `${stats.stakingRate}%` : '—'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Total Supply</span>
            <span className="tabular-nums text-foreground">{stats ? `${formatCompact(stats.totalSupply)}` : '—'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Staked</span>
            <span className="tabular-nums text-foreground">{stats ? formatCompact(stats.totalStaked) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Network strip */}
      <div className="lg:col-span-3">
        <div className="grid grid-cols-2 divide-y divide-border rounded-lg border border-border bg-card sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6 sm:[&>*]:border-r sm:[&>*]:border-border sm:[&>*:last-child]:border-r-0">
          <MiniStat label="Live TPS" value={stats ? formatNumber(stats.tps) : '—'} icon={Cpu} />
          <MiniStat label="Max TPS" value={stats ? formatNumber(stats.maxTps) : '—'} icon={Cpu} />
          <MiniStat label="Validators" value={stats ? formatNumber(stats.activeValidators) : '—'} icon={Server} />
          <MiniStat label="Nodes" value={stats ? formatNumber(stats.totalNodes) : '—'} icon={Server} />
          <MiniStat label="Contracts" value={stats ? formatCompact(stats.totalContracts) : '—'} icon={FileCode2} />
          <MiniStat label="Tokens" value={stats ? formatNumber(stats.totalTokens) : '—'} icon={Coins} />
        </div>
      </div>
    </div>
  );
}

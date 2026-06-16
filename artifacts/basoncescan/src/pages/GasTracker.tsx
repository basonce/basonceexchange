import { Fuel, Gauge, Zap, Timer } from 'lucide-react';
import { useGasOracle } from '@/hooks/use-chain';
import type { GasTier } from '@/lib/chain';

export default function GasTracker() {
  const { data, isLoading } = useGasOracle();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Fuel className="h-6 w-6 text-primary" />
          Basonce Gas Tracker
        </h1>
        <p className="text-muted-foreground mt-1">
          Live gas prices on the Basonce Chain. A standard transfer uses 21,000 gas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {isLoading || !data ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-card border border-border rounded-lg animate-pulse" />
          ))
        ) : (
          <>
            <TierCard title="Low" accent="text-success" icon={Timer} tier={data.low} />
            <TierCard title="Average" accent="text-primary" icon={Gauge} tier={data.average} />
            <TierCard title="High" accent="text-destructive" icon={Zap} tier={data.high} />
          </>
        )}
      </div>

      {data && (
        <div className="mt-6 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Network Details</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Base Fee</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{data.baseFee} Gwei</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">BNC Price</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">${data.bncPrice.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Standard Transfer Gas</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground">21,000</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

function TierCard({ title, accent, icon: Icon, tier }: { title: string; accent: string; icon: any; tier: GasTier }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-2 text-sm font-semibold ${accent}`}>
          <Icon className="h-4 w-4" />
          {title}
        </span>
        <span className="text-xs text-muted-foreground">~{tier.timeSec}s</span>
      </div>
      <div className={`mt-3 text-3xl font-bold tabular-nums ${accent}`}>{tier.gwei}</div>
      <div className="text-xs text-muted-foreground">Gwei</div>
      <div className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground tabular-nums">
        Transfer cost: <span className="font-medium text-foreground">${tier.usd.toFixed(4)}</span>
      </div>
    </div>
  );
}

import { Link } from 'wouter';
import { ArrowRight, Hexagon } from 'lucide-react';

export function AdBanner() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-[#1B1F27] p-5 text-white shadow-sm">
      <span className="absolute right-2 top-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60">
        Ad
      </span>

      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex h-full flex-col">
        <div className="mb-3 flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-primary" fill="rgba(240,185,11,0.2)" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Basonce Coin
          </span>
        </div>

        <h3 className="text-lg font-bold leading-snug">
          Stake BNC. Earn rewards on the Basonce Chain.
        </h3>
        <p className="mt-1.5 text-sm text-white/65">
          Up to <span className="font-semibold tabular-nums text-white">12.4% APR</span> by
          delegating to active validators. Secure the network, earn passive income.
        </p>

        <Link
          href="/validators"
          className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start staking
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

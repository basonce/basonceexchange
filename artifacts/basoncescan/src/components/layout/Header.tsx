import { Link, useLocation } from 'wouter';
import { Hexagon, Menu, X, ChevronDown, ArrowRightLeft, Boxes, Coins, Fuel } from 'lucide-react';
import { GlobalSearch } from '../ui/global-search';
import { useState } from 'react';
import { useNetworkStats } from '@/hooks/use-chain';
import { formatPercent, formatUSD } from '@/lib/format';

type DropItem = { href: string; label: string; description: string; icon: any };

function NavDropdown({
  label, active, items,
}: {
  label: string;
  active: boolean;
  items: DropItem[];
}) {
  return (
    <div className="group relative">
      <button
        className={`flex items-center gap-1 py-5 text-sm font-medium transition-colors group-hover:text-link ${
          active ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
        {active && <span className="absolute bottom-0 left-0 right-5 h-0.5 rounded-full bg-primary" />}
      </button>
      <div className="absolute left-0 top-full z-50 hidden w-64 pt-1 group-hover:block">
        <div className="overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-lg shadow-black/[0.06]">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <it.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{it.label}</span>
                <span className="block text-xs text-muted-foreground">{it.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: stats } = useNetworkStats();

  const isBlockchain =
    location.startsWith('/txs') ||
    location.startsWith('/blocks') ||
    location.startsWith('/tx') ||
    location.startsWith('/block');
  const isTokens = location.startsWith('/token');

  const blockchainItems: DropItem[] = [
    { href: '/txs', label: 'Transactions', description: 'All on-chain transactions', icon: ArrowRightLeft },
    { href: '/blocks', label: 'Blocks', description: 'Validated blocks & producers', icon: Boxes },
  ];
  const tokenItems: DropItem[] = [
    { href: '/token/0xbasonce', label: 'Basonce Coin (BNC)', description: 'Native coin overview & holders', icon: Coins },
  ];

  const priceUp = stats ? stats.priceChange24h >= 0 : true;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top utility bar */}
      <div className="border-b border-border bg-secondary/60">
        <div className="container mx-auto flex h-9 items-center gap-x-5 overflow-x-auto px-4 text-xs whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">BNC Price:</span>
            <span className="font-semibold tabular-nums text-foreground">
              {stats ? formatUSD(stats.bncPrice, 4) : '—'}
            </span>
            {stats && (
              <span className={`tabular-nums ${priceUp ? 'text-success' : 'text-destructive'}`}>
                ({formatPercent(stats.priceChange24h)})
              </span>
            )}
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Gas:</span>
            <span className="tabular-nums text-foreground">
              {stats ? `${stats.gasPriceGwei} Gwei` : '—'}
            </span>
          </span>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-7">
              <Link href="/" className="flex shrink-0 items-center gap-2.5">
                <Hexagon className="h-8 w-8 text-primary fill-primary/15" />
                <span className="flex flex-col leading-none">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    Bason<span className="text-primary">Scan</span>
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Basonce Explorer
                  </span>
                </span>
              </Link>

              <nav className="hidden items-center gap-6 md:flex">
                <Link
                  href="/"
                  className={`relative py-5 text-sm font-medium transition-colors hover:text-link ${
                    location === '/' ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Home
                  {location === '/' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
                <NavDropdown label="Blockchain" active={isBlockchain} items={blockchainItems} />
                <NavDropdown label="Tokens" active={isTokens} items={tokenItems} />
              </nav>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden w-72 lg:block xl:w-80">
                <GlobalSearch />
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  <span className="whitespace-nowrap text-foreground">Basonce Chain</span>
                </div>
              </div>

              <button
                className="p-2 text-foreground md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="space-y-4 border-t border-border bg-card p-4 md:hidden">
            <GlobalSearch />
            <nav className="flex flex-col space-y-3">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-foreground">Home</Link>
              <Link href="/txs" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-foreground">Transactions</Link>
              <Link href="/blocks" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-foreground">Blocks</Link>
              <Link href="/token/0xbasonce" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-foreground">Basonce Coin (BNC)</Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

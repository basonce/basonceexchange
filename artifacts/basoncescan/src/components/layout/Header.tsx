import { Link, useLocation } from 'wouter';
import { Hexagon, Menu, X, ChevronDown } from 'lucide-react';
import { GlobalSearch } from '../ui/global-search';
import { useState } from 'react';

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Hexagon className="h-8 w-8 text-primary fill-primary/20" />
              <span className="text-xl font-bold tracking-tight text-foreground">Basonce<span className="text-primary">Scan</span></span>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              <Link href="/" className={`transition-colors hover:text-primary ${location === '/' ? 'text-primary' : 'text-foreground'}`}>
                Home
              </Link>

              <div className="group relative">
                <button className="flex items-center gap-1 py-2 text-foreground transition-colors hover:text-primary">
                  Blockchain <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <div className="absolute left-0 top-full hidden w-52 rounded-md border border-border bg-card shadow-md group-hover:block">
                  <div className="py-2">
                    <Link href="/txs" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary">Transactions</Link>
                    <Link href="/blocks" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary">Blocks</Link>
                  </div>
                </div>
              </div>

              <div className="group relative">
                <button className="flex items-center gap-1 py-2 text-foreground transition-colors hover:text-primary">
                  Tokens <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <div className="absolute left-0 top-full hidden w-52 rounded-md border border-border bg-card shadow-md group-hover:block">
                  <div className="py-2">
                    <Link href="/token/0xbasonce" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary">BNC (Basonce Coin)</Link>
                  </div>
                </div>
              </div>
            </nav>
          </div>

          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden w-72 lg:block xl:w-80">
              <GlobalSearch />
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                <div className="h-2 w-2 rounded-full bg-success"></div>
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
        <div className="space-y-4 border-t border-border bg-background p-4 md:hidden">
          <GlobalSearch />
          <nav className="flex flex-col space-y-3">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Home</Link>
            <Link href="/txs" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Transactions</Link>
            <Link href="/blocks" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Blocks</Link>
            <Link href="/token/0xbasonce" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">BNC Token</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

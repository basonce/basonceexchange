import { Link, useLocation } from 'wouter';
import { Hexagon, Menu, X, ChevronDown } from 'lucide-react';
import { GlobalSearch } from '../ui/global-search';
import { useState } from 'react';

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative py-2 transition-colors hover:text-foreground ${active ? 'text-foreground' : 'text-muted-foreground'}`}
    >
      {label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-primary" />}
    </Link>
  );
}

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isBlockchain = location.startsWith('/txs') || location.startsWith('/blocks') || location.startsWith('/tx') || location.startsWith('/block');
  const isTokens = location.startsWith('/token');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-7">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Hexagon className="h-7 w-7 text-primary fill-primary/15" />
              <span className="text-xl font-bold tracking-tight text-foreground">Bason<span className="text-primary">Scan</span></span>
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
              <NavLink href="/" label="Home" active={location === '/'} />

              <div className="group relative">
                <button className={`flex items-center gap-1 py-2 transition-colors hover:text-foreground ${isBlockchain ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Blockchain <ChevronDown className="h-3.5 w-3.5" />
                  {isBlockchain && <span className="absolute -bottom-px left-0 right-5 h-0.5 rounded-full bg-primary" />}
                </button>
                <div className="absolute left-0 top-full hidden w-52 overflow-hidden rounded-md border border-border bg-card shadow-lg shadow-black/5 group-hover:block">
                  <div className="py-1.5">
                    <Link href="/txs" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-link">Transactions</Link>
                    <Link href="/blocks" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-link">Blocks</Link>
                  </div>
                </div>
              </div>

              <div className="group relative">
                <button className={`flex items-center gap-1 py-2 transition-colors hover:text-foreground ${isTokens ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Tokens <ChevronDown className="h-3.5 w-3.5" />
                  {isTokens && <span className="absolute -bottom-px left-0 right-5 h-0.5 rounded-full bg-primary" />}
                </button>
                <div className="absolute left-0 top-full hidden w-56 overflow-hidden rounded-md border border-border bg-card shadow-lg shadow-black/5 group-hover:block">
                  <div className="py-1.5">
                    <Link href="/token/0xbasonce" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-link">BNC (Basonce Coin)</Link>
                  </div>
                </div>
              </div>
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
            <Link href="/token/0xbasonce" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-foreground">BNC Token</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

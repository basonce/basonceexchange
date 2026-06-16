import { Link, useLocation } from 'wouter';
import { Hexagon, Menu, X } from 'lucide-react';
import { GlobalSearch } from '../ui/global-search';
import { useState } from 'react';

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Blockchain', items: [
      { label: 'Transactions', href: '/txs' },
      { label: 'Blocks', href: '/blocks' }
    ]},
    { label: 'Tokens', items: [
      { label: 'BASONCE (BSO)', href: '/token/0xbasonce' }
    ]}
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Hexagon className="h-8 w-8 text-primary fill-primary/20" />
              <span className="text-xl font-bold tracking-tight text-foreground">Basonce<span className="text-primary">Scan</span></span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/" className={`transition-colors hover:text-primary ${location === '/' ? 'text-primary' : 'text-foreground'}`}>
                Home
              </Link>
              
              <div className="group relative">
                <button className="flex items-center gap-1 transition-colors hover:text-primary text-foreground py-2">
                  Blockchain
                </button>
                <div className="absolute top-full left-0 hidden w-48 rounded-md border border-border bg-card shadow-md group-hover:block">
                  <div className="py-2">
                    <Link href="/txs" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary">
                      Transactions
                    </Link>
                    <Link href="/blocks" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary">
                      Blocks
                    </Link>
                  </div>
                </div>
              </div>

              <div className="group relative">
                <button className="flex items-center gap-1 transition-colors hover:text-primary text-foreground py-2">
                  Tokens
                </button>
                <div className="absolute top-full left-0 hidden w-48 rounded-md border border-border bg-card shadow-md group-hover:block">
                  <div className="py-2">
                    <Link href="/token/0xbasonce" className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary">
                      BASONCE (BSO)
                    </Link>
                  </div>
                </div>
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:block w-80">
              <GlobalSearch />
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                <div className="h-2 w-2 rounded-full bg-success"></div>
                <span className="text-foreground">Basonce Chain</span>
              </div>
            </div>

            <button 
              className="md:hidden p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-4">
          <GlobalSearch />
          <nav className="flex flex-col space-y-3">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Home</Link>
            <Link href="/txs" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Transactions</Link>
            <Link href="/blocks" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Blocks</Link>
            <Link href="/token/0xbasonce" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium">Token Tracker</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

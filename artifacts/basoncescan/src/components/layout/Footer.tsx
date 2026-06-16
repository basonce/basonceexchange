import { Hexagon } from 'lucide-react';
import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Hexagon className="h-6 w-6 text-primary fill-primary/20" />
              <span className="text-lg font-bold tracking-tight text-foreground">Basonce<span className="text-primary">Scan</span></span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              BasonceScan is a Block Explorer and Analytics Platform for Basonce Chain, a decentralized smart contracts platform.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Brand Assets</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">API Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Knowledge Base</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Network Status</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Learn Basonce</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Products</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Developer APIs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Basonce Node</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Block Explorer</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs text-muted-foreground">
            BasonceScan © {new Date().getFullYear()} (Basonce Chain)
          </p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success"></div> Active
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

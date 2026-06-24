import { useState } from 'react';
import { Wallet, ChevronDown, LogOut, Copy, Check, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type AuthMode = 'login' | 'register';

const ASSET_BASE = import.meta.env.BASE_URL;

const WALLETS = [
  { id: 'basonce', name: 'Basonce Wallet', hint: 'Recommended', logo: `${ASSET_BASE}wallets/basonce.png` },
  { id: 'metamask', name: 'MetaMask', hint: 'Browser extension', logo: `${ASSET_BASE}wallets/metamask.svg` },
  { id: 'walletconnect', name: 'WalletConnect', hint: 'Scan with mobile', logo: `${ASSET_BASE}wallets/walletconnect.png` },
  { id: 'trust', name: 'Trust Wallet', hint: 'Mobile & extension', logo: `${ASSET_BASE}wallets/trust.png` },
];

function randomAddress() {
  const hex = '0123456789abcdef';
  let out = '0x';
  for (let i = 0; i < 40; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function AuthDialog({
  open,
  mode,
  onOpenChange,
  onSwitchMode,
}: {
  open: boolean;
  mode: AuthMode;
  onOpenChange: (v: boolean) => void;
  onSwitchMode: (m: AuthMode) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const reset = () => {
    setEmail('');
    setPassword('');
    setConfirm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !confirm)) {
      toast({ title: 'Missing fields', description: 'Please complete all fields.', variant: 'destructive' });
      return;
    }
    if (isRegister && password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Please re-enter your password.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      reset();
      toast({
        title: isRegister ? 'Account created' : 'Welcome back',
        description: isRegister
          ? 'Your BasonScan account is ready. Please verify your email to unlock all features.'
          : 'You are now signed in to BasonScan.',
      });
    }, 700);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isRegister ? 'Create your BasonScan account' : 'Sign in to BasonScan'}</DialogTitle>
          <DialogDescription>
            {isRegister
              ? 'Watch addresses, get alerts and access developer APIs across the Basonce Chain.'
              : 'Access your watchlist, alerts and API keys.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email address</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {isRegister && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-confirm">Confirm password</Label>
              <Input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="font-medium text-link hover:underline"
                onClick={() => onSwitchMode(isRegister ? 'login' : 'register')}
              >
                {isRegister ? 'Sign in' : 'Register'}
              </button>
            </p>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConnectWalletDialog({
  open,
  onOpenChange,
  onConnect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnect: (addr: string) => void;
}) {
  const [connecting, setConnecting] = useState<string | null>(null);

  const connect = (id: string) => {
    setConnecting(id);
    setTimeout(() => {
      setConnecting(null);
      onConnect(randomAddress());
      onOpenChange(false);
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Connect to view your portfolio, track balances and interact with the Basonce Chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {WALLETS.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={connecting !== null}
              onClick={() => connect(w.id)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-muted disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-secondary">
                  <img
                    src={w.logo}
                    alt={`${w.name} logo`}
                    className="h-7 w-7 object-contain"
                    loading="lazy"
                  />
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">{w.name}</span>
                  <span className="block text-xs text-muted-foreground">{w.hint}</span>
                </span>
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {connecting === w.id ? 'Connecting…' : 'Connect'}
              </span>
            </button>
          ))}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          BasonScan never has access to your funds or private keys.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function AuthButtons() {
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [walletOpen, setWalletOpen] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const disconnect = () => {
    setAddress(null);
    setMenuOpen(false);
    toast({ title: 'Wallet disconnected' });
  };

  return (
    <>
      <div className="hidden items-center gap-1.5 lg:flex">
        {!address && (
          <>
            <button
              onClick={() => openAuth('register')}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Register
            </button>
            <span className="h-3.5 w-px bg-border" />
            <button
              onClick={() => openAuth('login')}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Login
            </button>
          </>
        )}

        {address ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="tabular-nums">{truncate(address)}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-lg shadow-black/[0.06]">
                  <div className="px-3 py-2">
                    <div className="text-xs text-muted-foreground">Connected wallet</div>
                    <div className="mt-0.5 break-all font-mono text-xs text-foreground">{address}</div>
                  </div>
                  <button
                    onClick={copy}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy address'}
                  </button>
                  <button
                    onClick={disconnect}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => setWalletOpen(true)}
            className="ml-1 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </div>

      <AuthDialog
        open={authOpen}
        mode={authMode}
        onOpenChange={setAuthOpen}
        onSwitchMode={setAuthMode}
      />
      <ConnectWalletDialog
        open={walletOpen}
        onOpenChange={setWalletOpen}
        onConnect={(addr) => {
          setAddress(addr);
          toast({ title: 'Wallet connected', description: truncate(addr) });
        }}
      />
    </>
  );
}

export function MobileAuthButtons({ onAction }: { onAction?: () => void }) {
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [walletOpen, setWalletOpen] = useState(false);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => openAuth('login')}>
          Login
        </Button>
        <Button variant="outline" onClick={() => openAuth('register')}>
          Register
        </Button>
      </div>
      <Button
        className="w-full gap-1.5 bg-foreground text-background hover:bg-foreground/90"
        onClick={() => setWalletOpen(true)}
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>

      <AuthDialog open={authOpen} mode={authMode} onOpenChange={setAuthOpen} onSwitchMode={setAuthMode} />
      <ConnectWalletDialog
        open={walletOpen}
        onOpenChange={setWalletOpen}
        onConnect={(addr) => {
          toast({ title: 'Wallet connected', description: truncate(addr) });
          onAction?.();
        }}
      />
    </>
  );
}

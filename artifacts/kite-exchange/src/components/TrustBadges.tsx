import { ShieldCheck, Lock, Cloud, BadgeCheck, Eye, Server } from 'lucide-react';

type Variant = 'compact' | 'full' | 'inline';

interface Props {
  variant?: Variant;
  className?: string;
}

const BADGES = [
  { icon: Lock,        label: '256-bit SSL',     sub: 'Encrypted'   },
  { icon: Cloud,       label: 'Cloudflare',      sub: 'DDoS Shield' },
  { icon: ShieldCheck, label: 'Audited',         sub: 'Smart Contract' },
  { icon: BadgeCheck,  label: 'KYC/AML',         sub: 'Compliant'   },
  { icon: Eye,         label: 'Cold Wallet',     sub: '95% Reserves' },
  { icon: Server,      label: 'Supabase',        sub: 'Tier-1 Infra' },
];

export default function TrustBadges({ variant = 'full', className = '' }: Props) {
  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-center gap-3 text-[10px] text-gray-500 ${className}`}>
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-[#0ECB81]" />
          <span>256-bit SSL</span>
        </div>
        <span className="text-[#2B3139]">•</span>
        <div className="flex items-center gap-1">
          <Cloud className="w-3 h-3 text-[#F0B90B]" />
          <span>Cloudflare Protected</span>
        </div>
        <span className="text-[#2B3139]">•</span>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-[#0ECB81]" />
          <span>Verified</span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`grid grid-cols-3 gap-2 ${className}`}>
        {BADGES.slice(0, 3).map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#181A20] border border-[#2B3139]"
          >
            <b.icon className="w-3.5 h-3.5 text-[#F0B90B] flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-white font-semibold leading-tight truncate">{b.label}</div>
              <div className="text-[9px] text-gray-500 leading-tight truncate">{b.sub}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-center mb-3">
        <div className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
          Trusted &amp; Secured
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((b) => (
          <div
            key={b.label}
            className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl bg-[#181A20] border border-[#2B3139] hover:border-[#F0B90B]/40 transition-colors"
          >
            <b.icon className="w-5 h-5 text-[#F0B90B]" />
            <div className="text-[11px] text-white font-semibold text-center leading-tight">{b.label}</div>
            <div className="text-[9px] text-gray-500 text-center leading-tight">{b.sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-600">
        <ShieldCheck className="w-3 h-3" />
        <span>End-to-end encrypted • Bank-grade security</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { AlertTriangle, TrendingDown, Zap, Droplets, Scale, Server, Ban, ArrowRight, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const LAST_UPDATED = 'March 5, 2026';

interface RiskItem {
  id: string;
  num: string;
  title: string;
  icon: LucideIcon;
  severity: 'High' | 'Severe' | 'Moderate';
  body: string[];
}

const RISKS: RiskItem[] = [
  {
    id: 'volatility',
    num: '1',
    title: 'Market Volatility',
    icon: TrendingDown,
    severity: 'Severe',
    body: [
      'Digital-asset prices can fluctuate dramatically within very short periods. A position may lose a substantial portion of its value — or its entire value — in minutes. Past performance is never indicative of future results.',
      'You should only commit funds you can afford to lose entirely and should never invest borrowed money you cannot repay.',
    ],
  },
  {
    id: 'leverage',
    num: '2',
    title: 'Leverage & Derivatives Risk',
    icon: Zap,
    severity: 'Severe',
    body: [
      'Margin, futures, and other leveraged products magnify both gains and losses. A small adverse move in the underlying market can result in the total loss of your collateral and, in some cases, losses exceeding your initial deposit.',
      'Positions may be liquidated automatically and without notice when margin requirements are not met. You are responsible for monitoring your positions and margin levels at all times.',
    ],
  },
  {
    id: 'liquidity',
    num: '3',
    title: 'Liquidity Risk',
    icon: Droplets,
    severity: 'High',
    body: [
      'Some assets and markets may have limited liquidity. During periods of stress you may be unable to open, close, or adjust a position at your desired price, or at all. Wide spreads and slippage can significantly affect execution.',
    ],
  },
  {
    id: 'regulatory',
    num: '4',
    title: 'Regulatory & Legal Risk',
    icon: Scale,
    severity: 'High',
    body: [
      'The legal and regulatory treatment of digital assets is evolving and varies by jurisdiction. Changes in law or policy may adversely affect the value, transferability, or legality of certain assets and services, and may restrict your ability to access the platform.',
      'You are responsible for ensuring that your use of the Services and any resulting tax obligations comply with the laws of your jurisdiction.',
    ],
  },
  {
    id: 'technology',
    num: '5',
    title: 'Technology & Custody Risk',
    icon: Server,
    severity: 'Moderate',
    body: [
      'Trading platforms, blockchains, and supporting infrastructure may be subject to outages, delays, bugs, cyber-attacks, or forks. Such events may prevent or delay transactions and could result in loss of funds.',
      'Loss of access credentials, private keys, or two-factor devices may result in permanent loss of access to your assets. Safeguard your credentials carefully.',
    ],
  },
  {
    id: 'no-advice',
    num: '6',
    title: 'No Investment Advice',
    icon: Ban,
    severity: 'Moderate',
    body: [
      'Basonce does not provide investment, financial, legal, or tax advice. All content, data, and tools are provided for general information only. Nothing on the platform should be construed as a recommendation to buy, sell, or hold any asset.',
      'You should seek independent professional advice and conduct your own research before making any decision.',
    ],
  },
];

const severityStyle: Record<RiskItem['severity'], { text: string; bg: string; border: string }> = {
  Severe: { text: 'text-[#F6465D]', bg: 'bg-[#F6465D]/10', border: 'border-[#F6465D]/40' },
  High: { text: 'text-[#F0B90B]', bg: 'bg-[#F0B90B]/10', border: 'border-[#F0B90B]/40' },
  Moderate: { text: 'text-[#B7BDC6]', bg: 'bg-[#B7BDC6]/10', border: 'border-[#2B3139]' },
};

export default function RiskWarningPage({ onNavigate }: MorePageProps) {
  const [active, setActive] = useState<string>(RISKS[0].id);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Dramatic Warning Hero */}
      <section className="relative bg-black border-b border-[#F6465D]/30 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F6465D]/10 via-transparent to-[#F0B90B]/5" />
        <div className="relative max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex items-center gap-2 text-xs text-[#848E9C] mb-6 uppercase tracking-widest">
            <span>Legal</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#EAECEF]">Risk Disclosure</span>
          </div>
          <div className="flex items-start gap-5">
            <div className="shrink-0 w-14 h-14 rounded-xl bg-[#F6465D]/15 border border-[#F6465D]/40 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-[#F6465D]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">Risk Warning Disclosure</h1>
              <p className="text-[#B7BDC6] max-w-3xl leading-relaxed">
                Trading digital assets carries a high level of risk and may not be suitable for all investors. Read this
                disclosure carefully before using Basonce.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#848E9C]">
                <AlertTriangle className="w-4 h-4" />
                <span>Last updated: <span className="text-[#EAECEF] font-medium">{LAST_UPDATED}</span></span>
              </div>
            </div>
          </div>

          {/* Prominent top callout */}
          <div className="mt-10 bg-[#F6465D]/10 border-l-4 border-[#F6465D] rounded-r-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F6465D] shrink-0 mt-0.5" />
              <p className="text-[#EAECEF] text-[15px] leading-relaxed font-medium">
                You can lose some or all of your invested capital. Never trade with funds you cannot afford to lose.
                Leveraged products can result in losses that exceed your initial deposit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        {/* TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-widest mb-4">Risk Categories</div>
            <nav className="space-y-1">
              {RISKS.map((r) => (
                <a
                  key={r.id}
                  href={`#${r.id}`}
                  onClick={() => setActive(r.id)}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active === r.id
                      ? 'bg-[#1E2329] text-[#F0B90B]'
                      : 'text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#181A20]'
                  }`}
                >
                  <span className="tabular-nums shrink-0 w-5">{r.num}.</span>
                  <span className="min-w-0">{r.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Risk cards */}
        <main className="min-w-0">
          {/* Severity legend */}
          <div className="flex flex-wrap items-center gap-3 mb-8 text-xs">
            <span className="text-[#848E9C] uppercase tracking-wider">Severity:</span>
            {(['Severe', 'High', 'Moderate'] as const).map((sev) => (
              <span
                key={sev}
                className={`px-3 py-1 rounded-full border font-semibold ${severityStyle[sev].bg} ${severityStyle[sev].border} ${severityStyle[sev].text}`}
              >
                {sev}
              </span>
            ))}
          </div>

          <div className="space-y-6">
            {RISKS.map((r) => {
              const Icon = r.icon;
              const sv = severityStyle[r.severity];
              return (
                <section
                  key={r.id}
                  id={r.id}
                  className={`scroll-mt-24 bg-[#181A20] border rounded-xl p-6 ${sv.border}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${sv.bg}`}>
                        <Icon className={`w-5 h-5 ${sv.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[#848E9C] font-bold text-sm tabular-nums">{r.num}.</span>
                          <h2 className="text-lg font-bold text-white tracking-tight">{r.title}</h2>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${sv.bg} ${sv.border} ${sv.text}`}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <div className="space-y-3 pl-0 sm:pl-[3.75rem]">
                    {r.body.map((p, i) => (
                      <p key={i} className="text-[#B7BDC6] text-[15px] leading-relaxed">{p}</p>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Acknowledgement callout */}
          <div className="mt-10 bg-[#F0B90B]/10 border border-[#F0B90B]/40 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F0B90B] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white mb-2">Acknowledgement of Risk</h3>
                <p className="text-[#B7BDC6] text-sm leading-relaxed">
                  By using Basonce you acknowledge that you have read and understood this Risk Warning Disclosure, that you
                  accept the risks described, and that you are solely responsible for your trading decisions and any
                  resulting losses.
                </p>
              </div>
            </div>
          </div>

          {/* Closing CTA */}
          <div className="mt-12 bg-[#181A20] border border-[#2B3139] rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-3">Trade responsibly</h3>
            <p className="text-[#848E9C] mb-6 max-w-xl mx-auto">
              Understand the risks, manage your exposure, and use the tools Basonce provides to protect your capital.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('academy')}
                className="px-8 py-3 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                Learn the Basics
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

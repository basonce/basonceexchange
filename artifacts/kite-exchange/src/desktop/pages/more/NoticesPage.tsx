import { useState } from 'react';
import { ShieldAlert, Info, AlertTriangle, AlertOctagon, CalendarClock, FileWarning, Bell } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

type Severity = 'Info' | 'Important' | 'Action Required';
type Filter = 'All' | Severity;

const FILTERS: Filter[] = ['All', 'Info', 'Important', 'Action Required'];

const SEVERITY_META: Record<Severity, { cls: string; dot: string; icon: typeof Info }> = {
  Info: { cls: 'bg-[#5AA9FF]/10 text-[#5AA9FF] border-[#5AA9FF]/30', dot: 'bg-[#5AA9FF]', icon: Info },
  Important: { cls: 'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/30', dot: 'bg-[#F0B90B]', icon: AlertTriangle },
  'Action Required': { cls: 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/30', dot: 'bg-[#F6465D]', icon: AlertOctagon },
};

interface Notice {
  severity: Severity;
  ref: string;
  title: string;
  body: string;
  date: string;
}

const NOTICES: Notice[] = [
  {
    severity: 'Action Required',
    ref: 'BNC-2026-0142',
    title: 'Mandatory Identity Re-Verification for Affected Accounts',
    body: 'A subset of accounts must complete enhanced verification to retain full withdrawal limits. Affected users will be notified in-app. Accounts that do not comply by the deadline will face temporary withdrawal restrictions in line with our compliance obligations.',
    date: '2026-03-18',
  },
  {
    severity: 'Important',
    ref: 'BNC-2026-0141',
    title: 'Update to Margin Tier Requirements for Selected Pairs',
    body: 'Effective 25 March 2026, maintenance margin ratios for several lower-liquidity perpetual contracts will be adjusted. Review your open positions to avoid unexpected liquidations under the revised risk parameters.',
    date: '2026-03-16',
  },
  {
    severity: 'Info',
    ref: 'BNC-2026-0140',
    title: 'Publication of the Q1 2026 Proof-of-Reserves Attestation',
    body: 'Our independently verified reserve report is now available. Asset balances exceed customer liabilities across all in-scope tokens. Users may verify their holdings via the Merkle-tree audit tool.',
    date: '2026-03-14',
  },
  {
    severity: 'Important',
    ref: 'BNC-2026-0139',
    title: 'Risk Advisory on Seed Tag and Innovation Zone Assets',
    body: 'Newly listed tokens may exhibit heightened volatility and lower liquidity. Trading these assets requires acknowledgement of additional risk. Position sizing and stop controls are strongly recommended.',
    date: '2026-03-12',
  },
  {
    severity: 'Info',
    ref: 'BNC-2026-0138',
    title: 'Clarification on Funding Fee Settlement Times',
    body: 'Funding fees for perpetual contracts continue to settle every eight hours at 00:00, 08:00 and 16:00 UTC. No action is required from users.',
    date: '2026-03-10',
  },
  {
    severity: 'Action Required',
    ref: 'BNC-2026-0137',
    title: 'Migration of Legacy API Keys to v3 Authentication',
    body: 'API keys created before 2025 must be regenerated to support the v3 signing scheme. Legacy keys will be deprecated on 30 April 2026. Update your integrations to prevent service interruption.',
    date: '2026-03-08',
  },
];

const MAINTENANCE = [
  { system: 'Spot Matching Engine', window: '2026-03-22 · 02:00–02:45 UTC', impact: 'Read-only mode', status: 'Scheduled' },
  { system: 'Solana Wallet Network', window: '2026-03-23 · 01:00–02:30 UTC', impact: 'Deposits & withdrawals paused', status: 'Scheduled' },
  { system: 'Futures Risk Engine', window: '2026-03-25 · 03:00–03:20 UTC', impact: 'Brief order-entry delay', status: 'Planned' },
  { system: 'Account & KYC Services', window: '2026-03-28 · 04:00–04:40 UTC', impact: 'Verification temporarily offline', status: 'Planned' },
];

export default function NoticesPage({ onNavigate }: MorePageProps) {
  const [filter, setFilter] = useState<Filter>('All');
  const list = filter === 'All' ? NOTICES : NOTICES.filter((n) => n.severity === filter);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Header */}
      <section className="border-b border-[#2B3139] bg-[#0d1014]">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-lg bg-[#181A20] border border-[#2B3139] flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-[#F0B90B]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">Official Notices</h1>
              <p className="text-sm text-[#848E9C] mt-1">Regulatory, compliance and operational risk notices</p>
            </div>
          </div>
          <p className="text-[#B7BDC6] leading-relaxed max-w-3xl">
            This is the authoritative record of official communications from Basonce. Notices published here may carry compliance,
            security or operational obligations. We recommend reviewing this page regularly and enabling account notifications so
            that time-sensitive actions are not missed.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-[#848E9C]">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#5AA9FF]" /> Info — for your awareness</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#F0B90B]" /> Important — review recommended</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#F6465D]" /> Action Required — response needed</span>
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="max-w-[1100px] mx-auto px-6 pt-10">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                filter === f ? 'bg-[#F0B90B] text-black' : 'bg-[#181A20] text-[#B7BDC6] border border-[#2B3139] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Notice List */}
      <section className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="space-y-4">
          {list.map((n, i) => {
            const meta = SEVERITY_META[n.severity];
            const Icon = meta.icon;
            return (
              <article
                key={i}
                className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden hover:border-[#474D57] transition-colors"
              >
                <div className={`h-1 w-full ${meta.dot}`} />
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap ${meta.cls}`}>
                      <Icon className="w-3.5 h-3.5" /> {n.severity}
                    </span>
                    <span className="text-xs font-mono text-[#848E9C] whitespace-nowrap">Ref {n.ref}</span>
                    <span className="text-xs text-[#848E9C] tabular-nums whitespace-nowrap ml-auto">{n.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#EAECEF] mb-2 leading-snug">{n.title}</h3>
                  <p className="text-sm text-[#B7BDC6] leading-relaxed">{n.body}</p>
                </div>
              </article>
            );
          })}
          {list.length === 0 && <div className="text-center py-16 text-[#848E9C]">No notices match this filter.</div>}
        </div>
      </section>

      {/* Maintenance Schedule Table */}
      <section className="border-t border-[#2B3139] bg-[#0d1014]">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-2">
            <CalendarClock className="w-6 h-6 text-[#F0B90B]" />
            <h2 className="text-2xl font-bold text-white">System Maintenance Schedule</h2>
          </div>
          <p className="text-[#848E9C] mb-8">Planned maintenance windows. All times are shown in UTC and may be adjusted with prior notice.</p>

          <div className="overflow-x-auto rounded-xl border border-[#2B3139]">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-[#181A20] text-left text-[#848E9C]">
                  <th className="px-5 py-4 font-semibold">System</th>
                  <th className="px-5 py-4 font-semibold whitespace-nowrap">Maintenance Window</th>
                  <th className="px-5 py-4 font-semibold">Expected Impact</th>
                  <th className="px-5 py-4 font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3139]">
                {MAINTENANCE.map((m, i) => (
                  <tr key={i} className="bg-[#0B0E11] hover:bg-[#181A20] transition-colors">
                    <td className="px-5 py-4 font-semibold text-[#EAECEF]">{m.system}</td>
                    <td className="px-5 py-4 text-[#B7BDC6] tabular-nums whitespace-nowrap">{m.window}</td>
                    <td className="px-5 py-4 text-[#B7BDC6]">{m.impact}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#5AA9FF]/10 text-[#5AA9FF] border border-[#5AA9FF]/30 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5AA9FF]" /> {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-[#848E9C]">
            <FileWarning className="w-4 h-4 shrink-0 mt-0.5 text-[#F0B90B]" />
            <span>
              During maintenance windows, affected functions may be temporarily unavailable. Open orders and positions remain
              protected by our risk systems. We recommend avoiding new high-leverage positions immediately before a window.
            </span>
          </div>
        </div>
      </section>

      {/* Stay Informed Callout */}
      <section className="max-w-[1100px] mx-auto px-6 py-16">
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#F0B90B]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Stay informed</h3>
              <p className="text-[#B7BDC6] leading-relaxed">
                Enable account notifications to receive Action Required notices the moment they are published. Staying current with
                official communications helps protect your account and funds.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={openAuthRegister}
              className="px-7 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              Enable Notifications
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="px-7 py-3.5 bg-[#0B0E11] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              Back to Home
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

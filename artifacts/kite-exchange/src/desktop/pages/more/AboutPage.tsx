import { Globe2, ShieldCheck, Users, BarChart3, Lock, FileCheck, Building2, Target, Compass, Award } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const STATS = [
  { value: '180M+', label: 'Registered users' },
  { value: '$2.4T+', label: 'Annual trading volume' },
  { value: '180+', label: 'Countries served' },
  { value: '350+', label: 'Listed assets' },
];

const MILESTONES = [
  { year: '2019', title: 'Founded', desc: 'Basonce launches with a single spot exchange and a mission to make digital assets accessible to everyone.' },
  { year: '2020', title: 'Global expansion', desc: 'Crossed 5 million users and opened localized services across Asia, Europe and Latin America.' },
  { year: '2021', title: 'Derivatives & Earn', desc: 'Launched futures, margin and yield products, reaching $1T in cumulative volume.' },
  { year: '2022', title: 'Proof of Reserves', desc: 'Introduced on-chain Merkle-tree reserve verification and a $1B user protection fund.' },
  { year: '2024', title: 'Institutional suite', desc: 'Rolled out prime brokerage, OTC desk and regulated custody for institutional clients.' },
  { year: '2026', title: '180M users', desc: 'Became one of the most active exchanges worldwide with operations on six continents.' },
];

const VALUES = [
  { icon: Target, title: 'User first', desc: 'Every product decision starts with the people who trade on Basonce. We obsess over clarity, speed and fairness.' },
  { icon: ShieldCheck, title: 'Security by default', desc: 'We treat the protection of user funds and data as the foundation of everything we build.' },
  { icon: Compass, title: 'Radical transparency', desc: 'Proof of Reserves, public incident reports and clear fees. We earn trust by showing our work.' },
  { icon: Award, title: 'Relentless quality', desc: 'We hold ourselves to an institutional standard across engineering, compliance and support.' },
];

const PILLARS = [
  { icon: Lock, title: 'Cold storage custody', desc: 'The vast majority of assets are held in geographically distributed cold wallets with multi-signature controls.' },
  { icon: FileCheck, title: 'Proof of Reserves', desc: 'On-chain Merkle-tree attestations let any user independently verify that holdings are fully backed.' },
  { icon: ShieldCheck, title: 'User protection fund', desc: 'A dedicated reserve set aside to protect users in extreme and unforeseen events.' },
  { icon: BarChart3, title: 'Regulatory licensing', desc: 'Registrations and licenses across multiple jurisdictions, with dedicated local compliance teams.' },
];

const REGIONS = [
  { region: 'Europe', cities: 'Paris • Vilnius • Warsaw', note: 'EU operations & compliance' },
  { region: 'Asia Pacific', cities: 'Singapore • Tokyo • Seoul', note: 'Largest engineering hub' },
  { region: 'Middle East', cities: 'Dubai • Abu Dhabi', note: 'Regional headquarters' },
  { region: 'Latin America', cities: 'São Paulo • Buenos Aires', note: 'Fiat & local payments' },
  { region: 'Africa', cities: 'Lagos • Nairobi • Cape Town', note: 'Emerging markets growth' },
  { region: 'North America', cities: 'Toronto • Miami', note: 'Institutional & OTC desk' },
];

export default function AboutPage({ onNavigate }: MorePageProps) {
  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Hero */}
      <section className="relative pt-24 pb-20 overflow-hidden border-b border-[#2B3139]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-[#F0B90B]/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-6">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-[#F0B90B] bg-[#F0B90B]/10 border border-[#F0B90B]/20 mb-6">
              ABOUT BASONCE
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight mb-6 leading-tight">
              Building the financial<br className="hidden md:block" /> infrastructure of the <span className="text-[#F0B90B]">open economy</span>
            </h1>
            <p className="text-lg text-[#B7BDC6] leading-relaxed mb-10 max-w-2xl">
              Basonce is a global digital-asset exchange on a mission to increase the freedom of money for people everywhere.
              We give millions of users the tools to trade, invest and build wealth with institutional-grade security and transparency.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
              >
                Create an account
              </button>
              <button
                onClick={() => onNavigate('markets')}
                className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                Explore markets
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:divide-x divide-[#2B3139]">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2 tabular-nums whitespace-nowrap">{s.value}</div>
                <div className="text-sm font-semibold text-[#848E9C] uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission split */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-6">Our mission</h2>
            <p className="text-[#B7BDC6] leading-relaxed mb-4">
              We believe access to fair, transparent financial markets should not depend on where you were born or how much you already have.
              Digital assets make it possible to move value across borders instantly, hold your own keys, and participate in a global economy without gatekeepers.
            </p>
            <p className="text-[#B7BDC6] leading-relaxed">
              Basonce exists to make that future safe and usable. We combine deep liquidity, low fees and a relentless focus on security so that anyone —
              from a first-time saver to a professional trading desk — can participate with confidence.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#F0B90B]" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{v.title}</h3>
                  <p className="text-sm text-[#848E9C] leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-24">
        <div className="max-w-[1000px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-white tracking-tight text-center mb-16">Our journey</h2>
          <div className="relative">
            <div className="absolute left-[19px] md:left-1/2 top-0 bottom-0 w-px bg-[#2B3139]" />
            <div className="space-y-10">
              {MILESTONES.map((m, i) => (
                <div key={i} className={`relative flex flex-col md:flex-row gap-6 md:gap-0 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="md:w-1/2" />
                  <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-[#0B0E11] border-2 border-[#F0B90B] flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F0B90B]" />
                  </div>
                  <div className="md:w-1/2 pl-16 md:pl-0 md:px-8">
                    <div className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-6">
                      <div className="text-[#F0B90B] font-bold text-lg mb-1 tabular-nums">{m.year}</div>
                      <h3 className="font-bold text-white mb-2">{m.title}</h3>
                      <p className="text-sm text-[#848E9C] leading-relaxed">{m.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security & compliance pillars */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Security & compliance</h2>
          <p className="text-[#848E9C] text-lg max-w-2xl mx-auto">
            Protecting users is the foundation of our business. We pair industry-leading custody with proactive regulatory engagement.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-7 hover:border-[#F0B90B]/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-[#F0B90B]" />
                </div>
                <h3 className="font-bold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Offices worldwide */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center gap-3 mb-12 justify-center">
            <Globe2 className="w-7 h-7 text-[#F0B90B]" />
            <h2 className="text-3xl font-bold text-white tracking-tight">Offices worldwide</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {REGIONS.map((r, i) => (
              <div key={i} className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-6 flex items-start gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-[#181A20] border border-[#2B3139] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#F0B90B]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white mb-1 truncate">{r.region}</h3>
                  <p className="text-sm text-[#B7BDC6] truncate">{r.cities}</p>
                  <p className="text-xs text-[#848E9C] mt-1 truncate">{r.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-[900px] mx-auto px-6 py-24">
        <div className="text-center bg-[#181A20] border border-[#2B3139] rounded-3xl p-12">
          <Users className="w-12 h-12 text-[#F0B90B] mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Join 180 million users</h2>
          <p className="text-[#848E9C] mb-8 max-w-md mx-auto">
            Open an account in minutes and start trading on one of the world's most trusted digital-asset platforms.
          </p>
          <button
            onClick={openAuthRegister}
            className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
          >
            Get started
          </button>
        </div>
      </section>
    </div>
  );
}

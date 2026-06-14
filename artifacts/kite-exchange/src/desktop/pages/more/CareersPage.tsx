import { useState } from 'react';
import { Rocket, MapPin, Heart, GraduationCap, Plane, Coins, Activity, Laptop, UserCheck, ClipboardList, Phone, PartyPopper } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

type Dept = 'All' | 'Engineering' | 'Product' | 'Compliance' | 'Marketing' | 'Operations';

const DEPARTMENTS: Dept[] = ['All', 'Engineering', 'Product', 'Compliance', 'Marketing', 'Operations'];

const ROLES: { title: string; team: Dept; location: string; type: string }[] = [
  { title: 'Senior Backend Engineer, Matching Engine', team: 'Engineering', location: 'Singapore', type: 'Full-time' },
  { title: 'Frontend Engineer, Trading UI', team: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'Site Reliability Engineer', team: 'Engineering', location: 'Tokyo', type: 'Full-time' },
  { title: 'Senior Product Manager, Derivatives', team: 'Product', location: 'Dubai', type: 'Full-time' },
  { title: 'Product Designer, Mobile', team: 'Product', location: 'Remote', type: 'Full-time' },
  { title: 'Compliance Officer, EMEA', team: 'Compliance', location: 'Vilnius', type: 'Full-time' },
  { title: 'AML Investigations Analyst', team: 'Compliance', location: 'Warsaw', type: 'Full-time' },
  { title: 'Growth Marketing Lead', team: 'Marketing', location: 'São Paulo', type: 'Full-time' },
  { title: 'Content Strategist, Academy', team: 'Marketing', location: 'Remote', type: 'Contract' },
  { title: 'Customer Support Specialist', team: 'Operations', location: 'Nairobi', type: 'Full-time' },
  { title: 'Payments Operations Manager', team: 'Operations', location: 'Buenos Aires', type: 'Full-time' },
];

const PERKS = [
  { icon: Coins, title: 'Token-aligned rewards', desc: 'Competitive salary plus performance incentives paid in crypto or fiat — your choice.' },
  { icon: Laptop, title: 'Remote-first', desc: 'Work from anywhere with a flexible home-office stipend and regular team offsites.' },
  { icon: GraduationCap, title: 'Learning budget', desc: 'An annual allowance for courses, conferences and certifications to keep you growing.' },
  { icon: Heart, title: 'Health & wellness', desc: 'Comprehensive medical coverage and wellness credits for you and your dependents.' },
  { icon: Plane, title: 'Generous time off', desc: 'Flexible paid leave, parental leave and recharge days so you can do your best work.' },
  { icon: Activity, title: 'Real impact', desc: 'Ship products used by millions every day — your work is live within weeks, not years.' },
];

const PROCESS = [
  { icon: UserCheck, title: 'Application review', desc: 'Our talent team reviews your application within five business days.' },
  { icon: Phone, title: 'Intro call', desc: 'A 30-minute conversation to align on the role, your goals and ours.' },
  { icon: ClipboardList, title: 'Skills assessment', desc: 'A practical, role-relevant exercise — no trick questions, just real work.' },
  { icon: PartyPopper, title: 'Final & offer', desc: 'Meet the team, then receive a transparent offer with a clear comp breakdown.' },
];

const CULTURE = [
  { title: 'Ownership over hierarchy', desc: 'Small teams own outcomes end to end. The best idea wins, regardless of title.' },
  { title: 'Move with urgency', desc: 'Markets never sleep. We ship fast, learn faster and iterate in the open.' },
  { title: 'Global by design', desc: 'Forty-plus nationalities across six continents, united by one mission.' },
];

export default function CareersPage({ onNavigate }: MorePageProps) {
  const [active, setActive] = useState<Dept>('All');
  const filtered = active === 'All' ? ROLES : ROLES.filter((r) => r.team === active);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Hero */}
      <section className="relative pt-24 pb-20 overflow-hidden border-b border-[#2B3139]">
        <div className="absolute -top-20 right-0 w-[700px] h-[500px] bg-[#F0B90B]/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-6">
          <div className="max-w-3xl">
            <Rocket className="w-12 h-12 text-[#F0B90B] mb-6" />
            <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight mb-6 leading-tight">
              Build the future of <span className="text-[#F0B90B]">finance</span>
            </h1>
            <p className="text-lg text-[#B7BDC6] leading-relaxed mb-10 max-w-2xl">
              Join a team building the infrastructure that powers a more open financial system. We hire exceptional people,
              give them real ownership, and let them ship to millions of users around the world.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#openings"
                className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
              >
                View open roles
              </a>
              <button
                onClick={() => onNavigate('home')}
                className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                Learn about us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section id="openings" className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Open positions</h2>
            <p className="text-[#848E9C]">{filtered.length} roles across our global teams</p>
          </div>
        </div>

        {/* Department tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DEPARTMENTS.map((d) => (
            <button
              key={d}
              onClick={() => setActive(d)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                active === d
                  ? 'bg-[#F0B90B] text-black'
                  : 'bg-[#181A20] text-[#B7BDC6] border border-[#2B3139] hover:border-[#F0B90B]/40'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Role rows */}
        <div className="space-y-3">
          {filtered.map((r, i) => (
            <div
              key={i}
              className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-[#F0B90B]/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white truncate">{r.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-[#848E9C] min-w-0">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{r.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#0B0E11] border border-[#2B3139] text-[#B7BDC6] whitespace-nowrap">
                  {r.team}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F0B90B]/10 border border-[#F0B90B]/20 text-[#F0B90B] whitespace-nowrap">
                  {r.type}
                </span>
              </div>
              <button
                onClick={openAuthRegister}
                className="shrink-0 px-5 py-2.5 bg-[#0B0E11] hover:bg-[#2B3139] border border-[#2B3139] text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Why you'll love it here</h2>
            <p className="text-[#848E9C] text-lg">Benefits designed to help you do the best work of your career.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PERKS.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-7">
                  <div className="w-12 h-12 rounded-xl bg-[#181A20] border border-[#2B3139] flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-[#F0B90B]" />
                  </div>
                  <h3 className="font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-[#848E9C] leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hiring process */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white tracking-tight text-center mb-16">Our hiring process</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROCESS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="relative bg-[#181A20] border border-[#2B3139] rounded-2xl p-7">
                <div className="absolute top-6 right-6 text-4xl font-bold text-[#2B3139] tabular-nums">{i + 1}</div>
                <div className="w-12 h-12 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-[#F0B90B]" />
                </div>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Culture */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-white tracking-tight text-center mb-16">Life at Basonce</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {CULTURE.map((c, i) => (
              <div key={i} className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-8">
                <div className="text-[#F0B90B] text-sm font-bold mb-4 tabular-nums">0{i + 1}</div>
                <h3 className="text-xl font-bold text-white mb-3">{c.title}</h3>
                <p className="text-[#848E9C] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-[900px] mx-auto px-6 py-24">
        <div className="text-center bg-[#181A20] border border-[#2B3139] rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Don't see your role?</h2>
          <p className="text-[#848E9C] mb-8 max-w-md mx-auto">
            We're always looking for exceptional people. Create an account and join our talent network to hear about new openings first.
          </p>
          <button
            onClick={openAuthRegister}
            className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
          >
            Join our talent network
          </button>
        </div>
      </section>
    </div>
  );
}

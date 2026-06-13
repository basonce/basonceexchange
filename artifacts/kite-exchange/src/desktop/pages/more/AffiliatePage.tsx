import { useState } from 'react';
import { Users, ChevronDown, ArrowRight } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';
import { MORE_PAGES } from '../morePagesData';

export default function AffiliatePage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['affiliate'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [calcVolume, setCalcVolume] = useState<number>(500000);
  
  // Tier detection based on volume
  const commissionRate = calcVolume >= 1000000 ? 0.5 : calcVolume >= 100000 ? 0.4 : 0.3;
  const estimatedEarnings = (calcVolume * 0.001 * commissionRate).toFixed(0);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#F0B90B] opacity-[0.05] blur-[150px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-sm font-semibold tracking-wide mb-8 shadow-[0_0_20px_rgba(240,185,11,0.1)]">
            <Users className="w-4 h-4" />
            {cfg.eyebrow}
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight max-w-4xl mx-auto">
            {cfg.title} <span className="text-[#F0B90B] block mt-2">{cfg.titleAccent}</span>
          </h1>
          
          <p className="mt-8 text-lg lg:text-xl text-[#848E9C] leading-relaxed max-w-2xl mx-auto">
            {cfg.subtitle}
          </p>
          
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <button onClick={openAuthRegister} className="px-10 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-transform hover:-translate-y-0.5 flex items-center gap-2">
              {cfg.primaryCta}
              <ArrowRight className="w-5 h-5" />
            </button>
            {cfg.secondaryCta && cfg.secondaryTab && (
              <button onClick={() => onNavigate(cfg.secondaryTab!)} className="px-10 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors">
                {cfg.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Calculator Section */}
      <section className="py-16 relative z-20 -mt-10">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-8 lg:p-12 shadow-2xl">
            <h2 className="text-2xl font-bold mb-8 text-center">Estimate Your Monthly Earnings</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <label className="block text-[#848E9C] text-sm font-medium mb-4">
                  Monthly Trading Volume of Your Referrals
                </label>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#EAECEF] font-mono">$10K</span>
                  <span className="text-[#F0B90B] font-bold text-2xl font-mono tabular-nums">${calcVolume.toLocaleString()}</span>
                  <span className="text-[#EAECEF] font-mono">$5M+</span>
                </div>
                <input 
                  type="range" 
                  min="10000" 
                  max="5000000" 
                  step="10000"
                  value={calcVolume} 
                  onChange={(e) => setCalcVolume(Number(e.target.value))}
                  className="w-full h-2 bg-[#2B3139] rounded-lg appearance-none cursor-pointer accent-[#F0B90B]" 
                />
              </div>
              <div className="bg-[#0B0E11] rounded-xl p-8 border border-[#2B3139] text-center">
                <div className="text-[#848E9C] text-sm font-medium mb-2">Estimated Commissions (Up to {(commissionRate * 100).toFixed(0)}%)</div>
                <div className="text-5xl font-bold text-[#0ECB81] tabular-nums mb-2">
                  ${estimatedEarnings}
                </div>
                <div className="text-xs text-[#5E6673]">Based on average VIP 0 taker fees. Actual earnings may vary.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-[#2B3139] bg-[#0d1014]">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {cfg.stats?.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-white mb-1 tabular-nums">{stat.value}</div>
              <div className="text-[#848E9C] text-sm uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{cfg.featuresTitle}</h2>
            <p className="text-[#848E9C] text-lg max-w-2xl mx-auto">{cfg.featuresSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cfg.features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="group relative bg-[#181A20] rounded-2xl p-8 border border-[#2B3139] hover:border-[#F0B90B] transition-colors">
                  <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center text-[#EAECEF] group-hover:bg-[#F0B90B] group-hover:text-black transition-colors mb-6">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-[#848E9C] leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 bg-[#0d1014] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold mb-16 text-center">{cfg.stepsTitle || 'How it works'}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {cfg.steps?.map((step, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-8 relative">
                <div className="absolute -top-6 -left-6 text-[120px] font-black text-[#2B3139] opacity-30 select-none pointer-events-none">
                  {i + 1}
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-[#848E9C] text-lg leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ & Closing */}
      <section className="py-24 border-t border-[#2B3139] relative">
        <div className="max-w-[800px] mx-auto px-6 mb-24">
          <h2 className="text-3xl font-bold mb-10 text-center">FAQ</h2>
          <div className="space-y-4">
            {cfg.faq?.map((item, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-[#2B3139]/30 transition-colors"
                >
                  <span className="font-semibold">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-[#848E9C] border-t border-[#2B3139] pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-[#181A20] to-[#0d1014] border border-[#2B3139] rounded-3xl p-12 lg:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F0B90B] opacity-[0.05] blur-[80px] rounded-full" />
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 relative z-10">{cfg.closingTitle}</h2>
            <p className="text-xl text-[#848E9C] mb-10 relative z-10 max-w-2xl mx-auto">{cfg.closingDesc}</p>
            <button onClick={openAuthRegister} className="relative z-10 px-12 py-5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg text-lg transition-transform hover:scale-105">
              {cfg.primaryCta}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { Crown, ChevronDown, ArrowRight } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';
import { MORE_PAGES } from '../morePagesData';

export default function VipPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['vip'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans selection:bg-[#F0B90B] selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 border-b border-[#2B3139] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#0B0E11]" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#F0B90B 1px, transparent 1px), linear-gradient(90deg, #F0B90B 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          {/* Radial gradient glow */}
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-[#F0B90B] opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-xs font-semibold tracking-wider uppercase mb-8">
              <Crown className="w-4 h-4" />
              {cfg.eyebrow}
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
              {cfg.title} <br className="hidden lg:block" />
              <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
            </h1>
            <p className="mt-6 text-lg text-[#848E9C] leading-relaxed max-w-xl">
              {cfg.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button onClick={openAuthRegister} className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded transition-colors flex items-center gap-2">
                {cfg.primaryCta}
                <ArrowRight className="w-4 h-4" />
              </button>
              {cfg.secondaryCta && cfg.secondaryTab && (
                <button onClick={() => onNavigate(cfg.secondaryTab!)} className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-semibold rounded transition-colors">
                  {cfg.secondaryCta}
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {cfg.stats?.map((stat, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] p-6 rounded-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F0B90B]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-3xl font-bold text-white mb-2 whitespace-nowrap tabular-nums">{stat.value}</div>
                <div className="text-sm text-[#848E9C] uppercase tracking-wide truncate min-w-0">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Table Style */}
      <section className="py-24 bg-[#0d1014]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">{cfg.featuresTitle}</h2>
            <p className="text-[#848E9C]">{cfg.featuresSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cfg.features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] p-8 rounded hover:border-[#F0B90B]/50 transition-colors">
                  <div className="w-12 h-12 rounded bg-[#2B3139] flex items-center justify-center text-[#F0B90B] mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-[#848E9C] leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Steps - Timeline Style */}
      <section className="py-24 bg-[#0B0E11] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold mb-16 text-center">{cfg.stepsTitle}</h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-6 left-[16%] right-[16%] h-px bg-[#2B3139]" />
            {cfg.steps?.map((step, i) => (
              <div key={i} className="relative z-10 text-center">
                <div className="w-12 h-12 mx-auto bg-[#181A20] border-2 border-[#F0B90B] text-[#F0B90B] rounded-full flex items-center justify-center font-bold text-lg mb-6">
                  {i + 1}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-[#848E9C]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {cfg.faq && (
        <section className="py-24 bg-[#0d1014] border-t border-[#2B3139]">
          <div className="max-w-[800px] mx-auto px-6">
            <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {cfg.faq.map((item, i) => (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="font-medium text-lg">{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-6 text-[#848E9C] leading-relaxed border-t border-[#2B3139] pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="py-32 bg-[#0B0E11] text-center border-t border-[#2B3139] relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[#F0B90B] opacity-[0.02] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#F0B90B] via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-[800px] mx-auto px-6">
          <h2 className="text-4xl font-bold mb-6">{cfg.closingTitle}</h2>
          <p className="text-xl text-[#848E9C] mb-10">{cfg.closingDesc}</p>
          <button onClick={openAuthRegister} className="px-10 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded text-lg transition-colors">
            {cfg.primaryCta}
          </button>
        </div>
      </section>
    </div>
  );
}

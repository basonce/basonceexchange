import { useState } from 'react';
import { ChevronDown, HeartHandshake, Heart } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

export default function CharityPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['charity'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Hero Section with Warm Glow */}
      <section className="relative pt-24 pb-20 overflow-hidden border-b border-[#1E2329]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#F0B90B]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative max-w-[1000px] mx-auto px-6 text-center">
          <HeartHandshake className="w-16 h-16 text-[#F0B90B] mx-auto mb-8" />
          
          <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tight uppercase mb-6">
            {cfg.title} <br className="hidden md:block" />
            <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#848E9C] max-w-2xl mx-auto mb-10 leading-relaxed">
            {cfg.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={openAuthRegister}
              className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Heart className="w-5 h-5" />
              {cfg.primaryCta}
            </button>
            {cfg.secondaryCta && cfg.secondaryTab && (
              <button
                onClick={() => onNavigate(cfg.secondaryTab!)}
                className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                {cfg.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats Band */}
      {cfg.stats && (
        <section className="bg-[#181A20] border-b border-[#2B3139]">
          <div className="max-w-[1280px] mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#2B3139]">
              {cfg.stats.map((s, i) => (
                <div key={i} className="text-center pt-6 md:pt-0">
                  <div className="text-3xl font-bold text-white mb-2">{s.value}</div>
                  <div className="text-sm font-semibold text-[#848E9C] uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Transparency / Features */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight mb-4">{cfg.featuresTitle}</h2>
          <p className="text-[#848E9C] text-lg">{cfg.featuresSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cfg.features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-[#181A20] p-8 rounded-2xl border border-[#2B3139] flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center mb-6">
                  <Icon className="w-8 h-8 text-[#F0B90B]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                <p className="text-[#848E9C] text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Process / Flow */}
      <section className="bg-[#181A20] py-24 border-y border-[#2B3139]">
        <div className="max-w-[1000px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight text-center mb-16">
            {cfg.stepsTitle || 'How it works'}
          </h2>
          <div className="space-y-6">
            {cfg.steps?.map((s, i) => (
              <div key={i} className="flex items-center gap-6 bg-[#0B0E11] p-6 rounded-2xl border border-[#2B3139]">
                <div className="w-12 h-12 shrink-0 rounded-full bg-[#2B3139] text-[#F0B90B] font-bold flex items-center justify-center text-xl">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{s.title}</h3>
                  <p className="text-[#848E9C]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ & CTA */}
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white uppercase tracking-tight text-center mb-12">FAQ</h2>
        <div className="space-y-4 mb-24">
          {cfg.faq?.map((item, i) => (
            <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-[#EAECEF]">{item.q}</span>
                <ChevronDown className={`w-5 h-5 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-[#848E9C] leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center bg-[#181A20] p-12 rounded-3xl border border-[#2B3139]">
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight mb-4">{cfg.closingTitle}</h2>
          <p className="text-[#848E9C] mb-8 max-w-md mx-auto">{cfg.closingDesc}</p>
          <button
            onClick={openAuthRegister}
            className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
          >
            {cfg.primaryCta}
          </button>
        </div>
      </section>
    </div>
  );
}
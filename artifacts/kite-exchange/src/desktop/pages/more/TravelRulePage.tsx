import { useState } from 'react';
import { ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

export default function TravelRulePage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['travelrule'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Corporate Hero */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1100px] mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2B3139] text-[#EAECEF] mb-8">
            <ShieldCheck className="w-8 h-8 text-[#F0B90B]" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white uppercase tracking-tight mb-6">
            {cfg.title} <br/> <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
          </h1>
          <p className="text-[#848E9C] text-lg max-w-3xl mx-auto leading-relaxed mb-10">
            {cfg.subtitle}
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={openAuthRegister}
              className="px-8 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              {cfg.primaryCta}
              <ArrowRight className="w-4 h-4" />
            </button>
            {cfg.secondaryCta && cfg.secondaryTab && (
              <button
                onClick={() => onNavigate(cfg.secondaryTab!)}
                className="px-8 py-3.5 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                {cfg.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Compliance Stats */}
      {cfg.stats && (
        <section className="py-12 border-b border-[#1E2329]">
          <div className="max-w-[1000px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {cfg.stats.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="text-3xl font-bold text-white mb-2">{s.value}</div>
                <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Diagram / Flow Section */}
      <section className="max-w-[1100px] mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">{cfg.featuresTitle}</h2>
          <p className="text-[#848E9C]">{cfg.featuresSubtitle}</p>
        </div>

        {/* Corporate Flow Diagram Mock */}
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-10 mb-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 bg-[#0B0E11] border border-[#2B3139] p-6 rounded-xl text-center">
              <div className="text-[#F0B90B] font-bold mb-2">Originator</div>
              <div className="text-sm text-[#848E9C]">Sender Information</div>
            </div>
            <div className="hidden md:flex flex-col items-center px-4">
              <div className="text-xs text-[#848E9C] mb-2 uppercase tracking-wide">Encrypted Channel</div>
              <div className="w-24 h-px bg-gradient-to-r from-[#2B3139] via-[#F0B90B] to-[#2B3139]" />
              <ArrowRight className="w-4 h-4 text-[#F0B90B] mt-[-9px]" />
            </div>
            <div className="flex-1 bg-[#0B0E11] border border-[#2B3139] p-6 rounded-xl text-center">
              <div className="text-[#F0B90B] font-bold mb-2">VASP</div>
              <div className="text-sm text-[#848E9C]">Virtual Asset Provider</div>
            </div>
            <div className="hidden md:flex flex-col items-center px-4">
              <div className="text-xs text-[#848E9C] mb-2 uppercase tracking-wide">Compliance Check</div>
              <div className="w-24 h-px bg-gradient-to-r from-[#2B3139] via-[#F0B90B] to-[#2B3139]" />
              <ArrowRight className="w-4 h-4 text-[#F0B90B] mt-[-9px]" />
            </div>
            <div className="flex-1 bg-[#0B0E11] border border-[#2B3139] p-6 rounded-xl text-center">
              <div className="text-[#F0B90B] font-bold mb-2">Beneficiary</div>
              <div className="text-sm text-[#848E9C]">Receiver Information</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {cfg.features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex gap-6 p-6 border border-[#1E2329] rounded-xl hover:bg-[#181A20] transition-colors">
                <div className="shrink-0 mt-1">
                  <Icon className="w-6 h-6 text-[#F0B90B]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-[#848E9C] text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Steps Table Style */}
      <section className="bg-[#181A20] py-24 border-y border-[#2B3139]">
        <div className="max-w-[1000px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-12">
            {cfg.stepsTitle || 'Compliance Process'}
          </h2>
          <div className="border border-[#2B3139] rounded-xl overflow-hidden">
            {cfg.steps?.map((s, i) => (
              <div key={i} className={`flex items-center gap-6 p-6 ${i !== 0 ? 'border-t border-[#2B3139]' : ''} bg-[#0B0E11]`}>
                <div className="w-8 h-8 rounded bg-[#2B3139] text-[#F0B90B] flex items-center justify-center font-bold text-sm shrink-0">
                  0{i + 1}
                </div>
                <div>
                  <div className="font-bold text-white mb-1">{s.title}</div>
                  <div className="text-sm text-[#848E9C]">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-3 mb-16">
          {cfg.faq?.map((item, i) => (
            <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-lg">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-[#EAECEF]">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-[#848E9C] text-sm leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-3">{cfg.closingTitle}</h3>
          <p className="text-[#848E9C] mb-8">{cfg.closingDesc}</p>
          <button
            onClick={openAuthRegister}
            className="px-8 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
          >
            {cfg.primaryCta}
          </button>
        </div>
      </section>
    </div>
  );
}
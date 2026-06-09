import { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { MORE_PAGES } from './morePagesData';
import type { DeskTab } from '../components/DesktopNav';

interface DesktopMorePageProps {
  slug: string;
  onNavigate: (tab: DeskTab) => void;
}

const openRegister = () =>
  window.dispatchEvent(new CustomEvent('open-auth', { detail: { mode: 'register' } }));

export default function DesktopMorePage({ slug, onNavigate }: DesktopMorePageProps) {
  const cfg = MORE_PAGES[slug];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (!cfg) {
    return (
      <div className="bg-[#0B0E11] min-h-screen flex items-center justify-center">
        <div className="text-[#848E9C]">Page not found</div>
      </div>
    );
  }

  const HeroIcon = cfg.icon;

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#1E2329]">
        <div className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-[#F0B90B]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-[#F0B90B]/5 blur-3xl pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E2329] border border-[#2B3139] text-[#F0B90B] text-xs font-semibold mb-6">
              <HeroIcon className="w-4 h-4" />
              {cfg.eyebrow}
            </span>
            <h1 className="text-white font-bold text-4xl lg:text-5xl leading-tight tracking-tight">
              {cfg.title}{' '}
              {cfg.titleAccent && <span className="text-[#F0B90B]">{cfg.titleAccent}</span>}
            </h1>
            <p className="text-[#B7BDC6] text-base lg:text-lg mt-6 max-w-xl leading-relaxed">
              {cfg.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <button
                onClick={openRegister}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-lg transition-colors"
              >
                {cfg.primaryCta}
                <ArrowRight className="w-4 h-4" />
              </button>
              {cfg.secondaryCta && cfg.secondaryTab && (
                <button
                  onClick={() => onNavigate(cfg.secondaryTab!)}
                  className="px-6 py-3 bg-[#1E2329] hover:bg-[#2B3139] border border-[#2B3139] text-[#EAECEF] text-sm font-semibold rounded-lg transition-colors"
                >
                  {cfg.secondaryCta}
                </button>
              )}
            </div>
          </div>

          {/* Decorative icon panel */}
          <div className="hidden lg:flex justify-center">
            <div className="relative w-[340px] h-[340px]">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-[#1E2329] to-[#0B0E11] border border-[#2B3139]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-[#F0B90B] to-[#FCD535] flex items-center justify-center shadow-2xl shadow-[#F0B90B]/20">
                  <HeroIcon className="w-20 h-20 text-black" />
                </div>
              </div>
              <div className="absolute top-6 left-6 w-14 h-14 rounded-2xl bg-[#1E2329] border border-[#2B3139] flex items-center justify-center text-[#F0B90B]">
                <ArrowRight className="w-6 h-6" />
              </div>
              <div className="absolute bottom-6 right-6 w-14 h-14 rounded-2xl bg-[#1E2329] border border-[#2B3139] flex items-center justify-center text-[#F0B90B]">
                <HeroIcon className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {cfg.stats && cfg.stats.length > 0 && (
          <div className="relative max-w-[1280px] mx-auto px-6 pb-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cfg.stats.map((s) => (
                <div key={s.label} className="bg-[#181A20] border border-[#2B3139] rounded-2xl px-6 py-5 text-center">
                  <div className="text-[#F0B90B] font-bold text-2xl">{s.value}</div>
                  <div className="text-[#848E9C] text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <h2 className="text-white font-bold text-2xl lg:text-3xl text-center">
          {cfg.featuresTitle || 'Why choose it'}
        </h2>
        <p className="text-[#848E9C] text-center mt-3 max-w-xl mx-auto">
          {cfg.featuresSubtitle || 'Everything you need, built into one seamless experience on Basonce.'}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {cfg.features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group bg-[#181A20] border border-[#2B3139] rounded-2xl p-6 hover:border-[#F0B90B]/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[#2B3139] group-hover:bg-[#F0B90B]/15 flex items-center justify-center text-[#F0B90B] transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-[#EAECEF] font-semibold text-lg mt-4">{f.title}</h3>
                <p className="text-[#848E9C] text-sm mt-2 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Steps */}
      {cfg.steps && cfg.steps.length > 0 && (
        <section className="border-y border-[#1E2329] bg-[#0d1014]">
          <div className="max-w-[1280px] mx-auto px-6 py-20">
            <h2 className="text-white font-bold text-2xl lg:text-3xl text-center">{cfg.stepsTitle || 'How it works'}</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {cfg.steps.map((s, i) => (
                <div key={s.title} className="relative bg-[#181A20] border border-[#2B3139] rounded-2xl p-7">
                  <div className="w-10 h-10 rounded-full bg-[#F0B90B] text-black font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <h3 className="text-[#EAECEF] font-semibold text-lg mt-4">{s.title}</h3>
                  <p className="text-[#848E9C] text-sm mt-2 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {cfg.faq && cfg.faq.length > 0 && (
        <section className="max-w-[820px] mx-auto px-6 py-20">
          <h2 className="text-white font-bold text-2xl lg:text-3xl text-center">Frequently asked questions</h2>
          <div className="mt-10 space-y-3">
            {cfg.faq.map((item, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[#EAECEF] font-medium">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#848E9C] shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-[#848E9C] text-sm leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-[#2B3139] bg-gradient-to-br from-[#1E2329] to-[#0B0E11] px-8 py-14 text-center">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#F0B90B]/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-white font-bold text-2xl lg:text-3xl">{cfg.closingTitle || 'Get started today'}</h2>
            <p className="text-[#B7BDC6] mt-3 max-w-xl mx-auto">
              {cfg.closingDesc || 'Join millions of users trading on Basonce.'}
            </p>
            <button
              onClick={openRegister}
              className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-lg transition-colors"
            >
              {cfg.primaryCta}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

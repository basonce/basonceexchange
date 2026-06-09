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
      {/* Hero — Binance-style: pure black, centered, curved gold glow */}
      <section className="relative overflow-hidden bg-black">
        {/* upward gold arc glow */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -bottom-[58%] w-[1700px] h-[1700px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, transparent 60%, rgba(240,185,11,0.55) 62.5%, rgba(240,185,11,0.18) 68%, transparent 74%)',
            filter: 'blur(3px)',
          }}
        />
        {/* soft top vignette */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, rgba(240,185,11,0.08), transparent 70%)' }}
        />

        <div className="relative max-w-[1000px] mx-auto px-6 pt-24 pb-44 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-[#2B3139] text-[#F0B90B] text-xs font-semibold tracking-wide">
            <HeroIcon className="w-4 h-4" />
            {cfg.eyebrow}
          </span>

          <h1 className="text-white font-bold text-5xl lg:text-6xl leading-[1.05] tracking-tight mt-8 uppercase">
            {cfg.title}{' '}
            {cfg.titleAccent && <span className="text-[#F0B90B]">{cfg.titleAccent}</span>}
          </h1>

          <p className="text-[#B7BDC6] text-base lg:text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
            {cfg.subtitle}
          </p>

          {/* stat badges (Binance "No.1" pill style) */}
          {cfg.stats && cfg.stats.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mt-12">
              {cfg.stats.slice(0, 3).map((s) => (
                <div
                  key={s.label}
                  className="relative px-7 py-4 rounded-full bg-black/60 border border-[#3a3320] min-w-[180px]"
                >
                  <span className="absolute -top-1.5 right-4 text-[#F0B90B] text-sm">✦</span>
                  <span className="absolute -bottom-1.5 left-4 text-[#F0B90B] text-sm">✦</span>
                  <div className="text-white font-semibold text-lg">{s.value}</div>
                  <div className="text-[#848E9C] text-[11px] tracking-wide uppercase mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-12">
            <button
              onClick={openRegister}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-lg transition-colors"
            >
              {cfg.primaryCta}
              <ArrowRight className="w-4 h-4" />
            </button>
            {cfg.secondaryCta && cfg.secondaryTab && (
              <button
                onClick={() => onNavigate(cfg.secondaryTab!)}
                className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-[#2B3139] text-[#EAECEF] text-sm font-semibold rounded-lg transition-colors"
              >
                {cfg.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats band — Binance "trusted by millions" dotted-map style */}
      {cfg.stats && cfg.stats.length > 0 && (
        <section className="relative overflow-hidden bg-black border-y border-[#1E2329]">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(rgba(132,142,156,0.18) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
            }}
          />
          <div className="relative max-w-[1100px] mx-auto px-6 py-20">
            <h2 className="text-white font-bold text-2xl lg:text-4xl text-center uppercase tracking-tight">
              Trusted by millions, built for the next billion
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-14">
              {cfg.stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[#F0B90B] font-bold text-3xl lg:text-4xl">{s.value}</div>
                  <div className="text-[#848E9C] text-xs mt-2 tracking-wide uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <h2 className="text-white font-bold text-3xl lg:text-4xl text-center tracking-tight">
          {cfg.featuresTitle || 'Why choose it'}
        </h2>
        <p className="text-[#848E9C] text-center mt-4 max-w-xl mx-auto">
          {cfg.featuresSubtitle || 'Everything you need, built into one seamless experience on Basonce.'}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
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
          <div className="max-w-[1280px] mx-auto px-6 py-24">
            <h2 className="text-white font-bold text-3xl lg:text-4xl text-center tracking-tight">{cfg.stepsTitle || 'How it works'}</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-14">
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
        <section className="max-w-[820px] mx-auto px-6 py-24">
          <h2 className="text-white font-bold text-3xl lg:text-4xl text-center tracking-tight">Frequently asked questions</h2>
          <div className="mt-12 space-y-3">
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
        <div className="relative overflow-hidden rounded-3xl border border-[#2B3139] bg-black px-8 py-16 text-center">
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 -bottom-[80%] w-[900px] h-[900px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at center, transparent 58%, rgba(240,185,11,0.5) 61%, rgba(240,185,11,0.12) 68%, transparent 73%)',
              filter: 'blur(3px)',
            }}
          />
          <div className="relative">
            <h2 className="text-white font-bold text-3xl lg:text-4xl tracking-tight uppercase">{cfg.closingTitle || 'Get started today'}</h2>
            <p className="text-[#B7BDC6] mt-4 max-w-xl mx-auto">
              {cfg.closingDesc || 'Join millions of users trading on Basonce.'}
            </p>
            <button
              onClick={openRegister}
              className="inline-flex items-center gap-2 mt-10 px-9 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold rounded-lg transition-colors"
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

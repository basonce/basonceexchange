import { useState } from 'react';
import { ArrowRight, ChevronDown, BookOpen, GraduationCap, PlayCircle, Clock, Award, ChevronRight } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

export default function AcademyPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['academy'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Mock catalog categories
  const categories = ['Beginner', 'Intermediate', 'Advanced', 'Trading', 'DeFi', 'Security'];

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Hero Section */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1280px] mx-auto px-6 pt-24 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2B3139] text-[#EAECEF] mb-6">
                <GraduationCap className="w-4 h-4 text-[#F0B90B]" />
                <span className="text-xs font-bold tracking-wider uppercase">{cfg.eyebrow}</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight uppercase tracking-tight mb-6">
                {cfg.title} <span className="text-[#F0B90B] block">{cfg.titleAccent}</span>
              </h1>
              <p className="text-[#848E9C] text-lg leading-relaxed mb-8 max-w-lg">
                {cfg.subtitle}
              </p>
              <div className="flex items-center gap-4">
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
                    className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-[#2B3139] text-[#EAECEF] font-semibold rounded-lg transition-colors"
                  >
                    {cfg.secondaryCta}
                  </button>
                )}
              </div>
            </div>
            
            {/* Abstract Learning Path Graphic */}
            <div className="relative h-[400px] hidden lg:block">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full max-w-[500px]">
                <div className="space-y-4">
                  {[1, 2, 3].map((step, i) => (
                    <div key={i} className={`bg-[#0B0E11] border border-[#2B3139] p-5 rounded-xl flex items-center gap-4 transform transition-transform hover:translate-x-[-10px] ${i === 1 ? 'ml-8 border-[#F0B90B]/30 bg-[#F0B90B]/5' : i === 2 ? 'ml-16' : ''}`}>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${i === 1 ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-[#EAECEF]'}`}>
                        <PlayCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white mb-1">
                          {i === 0 ? 'Crypto Fundamentals' : i === 1 ? 'Trading Strategies' : 'Advanced DeFi'}
                        </div>
                        <div className="text-xs text-[#848E9C] flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 45 min</span>
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {i + 4} Lessons</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Nav (Mock) */}
      <section className="border-b border-[#2B3139] bg-[#0B0E11] sticky top-0 z-10 hidden md:block">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center gap-8 overflow-x-auto no-scrollbar">
          {categories.map((cat, i) => (
            <button key={cat} className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${i === 0 ? 'border-[#F0B90B] text-[#F0B90B]' : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'}`}>
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Features / Tracks */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-10">{cfg.featuresTitle}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cfg.features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-pointer group">
                <div className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#F0B90B] transition-colors">
                  <Icon className="w-6 h-6 text-[#EAECEF] group-hover:text-black transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed mb-4">{f.desc}</p>
                <div className="flex items-center gap-1 text-[#F0B90B] text-sm font-semibold mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats & Steps */}
      <section className="bg-[#181A20] py-20 border-y border-[#2B3139]">
        <div className="max-w-[1280px] mx-auto px-6">
          {cfg.stats && (
            <div className="grid grid-cols-3 gap-8 mb-20">
              {cfg.stats.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl font-bold text-[#F0B90B] mb-2">{s.value}</div>
                  <div className="text-sm font-semibold text-[#848E9C] uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#0B0E11] rounded-3xl border border-[#2B3139] p-10 md:p-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-white uppercase tracking-tight mb-12 text-center">
              {cfg.stepsTitle || 'Your learning journey'}
            </h2>
            <div className="grid md:grid-cols-3 gap-10">
              {cfg.steps?.map((s, i) => (
                <div key={i} className="relative">
                  {i < 2 && <div className="hidden md:block absolute top-6 left-[60%] right-[-40%] h-px border-t border-dashed border-[#2B3139]" />}
                  <div className="w-12 h-12 bg-[#2B3139] rounded-full flex items-center justify-center text-[#F0B90B] font-bold text-lg mb-6 relative z-10">
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-[#848E9C]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[800px] mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight text-center mb-10">FAQ</h2>
        <div className="space-y-4 mb-16">
          {cfg.faq?.map((item, i) => (
            <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-lg">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-[#EAECEF]">{item.q}</span>
                <ChevronDown className={`w-5 h-5 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
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
          <Award className="w-12 h-12 text-[#F0B90B] mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight mb-4">{cfg.closingTitle}</h2>
          <p className="text-[#848E9C] mb-8">{cfg.closingDesc}</p>
          <button
            onClick={openAuthRegister}
            className="px-8 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
          >
            {cfg.primaryCta}
          </button>
        </div>
      </section>
    </div>
  );
}
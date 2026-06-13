import { useState, useEffect } from 'react';
import { Boxes, Activity, Server, Database, ChevronDown } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

export default function ChainPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['chain'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [latestBlock, setLatestBlock] = useState(14589201);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  // Simulate block progression
  useEffect(() => {
    const interval = setInterval(() => {
      setLatestBlock(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!cfg) return null;

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] selection:bg-[#F0B90B] selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden border-b border-[#1E2329]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F0B90B]/10 rounded-full blur-[120px] opacity-40 translate-x-1/3 -translate-y-1/3" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-xs font-semibold tracking-wide mb-8">
              <Boxes className="w-4 h-4" />
              {cfg.eyebrow}
            </span>
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6 uppercase">
              {cfg.title} <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
            </h1>
            <p className="text-[#848E9C] text-lg max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              {cfg.subtitle}
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-bold rounded-xl transition-colors"
              >
                {cfg.primaryCta}
              </button>
              {cfg.secondaryCta && cfg.secondaryTab && (
                <button
                  onClick={() => onNavigate(cfg.secondaryTab!)}
                  className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-[#EAECEF] text-sm font-bold rounded-xl transition-colors"
                >
                  {cfg.secondaryCta}
                </button>
              )}
            </div>
          </div>

          {/* Network Stats Explorer Panel */}
          <div className="flex-1 w-full max-w-[500px] shrink-0 relative">
            <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-[#2B3139] flex items-center justify-between bg-[#1E2329]">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#F0B90B]" />
                  <span className="font-semibold text-sm">Network Explorer</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#0ECB81]">
                  <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
                  Mainnet Online
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {cfg.stats?.map((s, i) => (
                    <div key={i} className="bg-[#0B0E11] rounded-xl p-4 border border-[#2B3139]">
                      <div className="text-xs text-[#848E9C] mb-1 uppercase tracking-wider">{s.label}</div>
                      <div className="text-xl font-bold text-[#EAECEF] tabular-nums">{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#848E9C] uppercase tracking-wider mb-2">Recent Blocks</h3>
                  {[0, 1, 2].map((offset) => {
                    const blockHeight = latestBlock - offset;
                    const isExpanded = expandedBlock === blockHeight;
                    return (
                    <div key={offset} className="flex flex-col text-sm py-2 border-b border-[#2B3139]/50 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#2B3139] flex items-center justify-center text-[#848E9C]">
                            <Database className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-[#F0B90B] tabular-nums cursor-pointer hover:underline" onClick={() => setExpandedBlock(isExpanded ? null : blockHeight)}>
                              #{blockHeight}
                            </div>
                            <div className="text-xs text-[#848E9C]">{offset * 3} secs ago</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#EAECEF] tabular-nums">{150 + offset * 12} txns</div>
                          <div className="text-xs text-[#848E9C]">Validator: 0x4a...{(7+offset)}f</div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 bg-[#0B0E11] p-3 rounded-lg border border-[#2B3139] text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-[#848E9C]">Block Hash</span>
                            <span className="text-[#EAECEF] font-mono">0x...abc{blockHeight.toString(16)}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="text-[#848E9C]">Size</span>
                            <span className="text-[#EAECEF]">{45 + offset} KB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#848E9C]">Gas Used</span>
                            <span className="text-[#EAECEF]">{(12.5 + offset * 1.2).toFixed(2)}M</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#0B0E11]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight mb-4">
              {cfg.featuresTitle || 'Next Gen Infrastructure'}
            </h2>
            <p className="text-[#848E9C] max-w-2xl mx-auto">
              {cfg.featuresSubtitle || 'Built for developers, designed for scale.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {cfg.features?.map((f, i) => {
              const Icon = f.icon || Server;
              return (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] p-8 rounded-2xl hover:border-[#F0B90B]/50 transition-colors group flex gap-6">
                  <div className="w-14 h-14 shrink-0 bg-[#F0B90B]/10 text-[#F0B90B] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                    <p className="text-[#848E9C] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Steps */}
      {cfg.steps && cfg.steps.length > 0 && (
        <section className="py-24 bg-[#0d1014] border-y border-[#1E2329]">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="text-3xl font-bold text-center uppercase tracking-tight mb-16">
              {cfg.stepsTitle || 'Start Building'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {cfg.steps.map((s, i) => (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] p-8 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#F0B90B]/5 rounded-full blur-2xl" />
                  <div className="text-5xl font-black text-[#2B3139] mb-4">0{i + 1}</div>
                  <h3 className="text-xl font-bold mb-3 text-[#EAECEF]">{s.title}</h3>
                  <p className="text-[#848E9C] text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ & CTA */}
      <section className="py-24 max-w-[800px] mx-auto px-6">
        {cfg.faq && cfg.faq.length > 0 && (
          <div className="mb-24">
            <h2 className="text-3xl font-bold text-center uppercase tracking-tight mb-10">FAQ</h2>
            <div className="space-y-4">
              {cfg.faq.map((item, i) => (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="font-semibold">{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-[#848E9C] text-sm leading-relaxed border-t border-[#1E2329] pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#181A20] border border-[#F0B90B]/30 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(240,185,11,0.1),transparent_50%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold uppercase tracking-tight mb-4">{cfg.closingTitle || 'Deploy Now'}</h2>
            <p className="text-[#848E9C] mb-8 max-w-md mx-auto">{cfg.closingDesc || 'Join thousands of builders scaling the future of Web3.'}</p>
            <button
              onClick={openAuthRegister}
              className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-bold rounded-xl transition-colors"
            >
              {cfg.primaryCta}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

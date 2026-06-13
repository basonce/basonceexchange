import { useState } from 'react';
import { ArrowRight, Image as ImageIcon, TrendingUp, BadgeCheck, Palette, ChevronDown } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

export default function NftPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['nft'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showMore, setShowMore] = useState(false);

  if (!cfg) return null;

  const mockCollections = [
    { name: 'Bored Ape Yacht Club', vol: '12.5k ETH', floor: '14.2 ETH', inc: '+12.4%', color1: '#ff9a9e', color2: '#fecfef' },
    { name: 'Azuki', vol: '8.2k ETH', floor: '5.1 ETH', inc: '+5.2%', color1: '#a18cd1', color2: '#fbc2eb' },
    { name: 'Doodles', vol: '5.4k ETH', floor: '2.8 ETH', inc: '-1.4%', color1: '#84fab0', color2: '#8fd3f4' },
    { name: 'Pudgy Penguins', vol: '4.1k ETH', floor: '11.5 ETH', inc: '+22.1%', color1: '#a1c4fd', color2: '#c2e9fb' },
  ];

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] selection:bg-[#F0B90B] selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden border-b border-[#1E2329]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#F0B90B]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#0ECB81]/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-xs font-semibold tracking-wide mb-8">
            <ImageIcon className="w-4 h-4" />
            {cfg.eyebrow}
          </span>
          <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6 uppercase max-w-4xl mx-auto">
            {cfg.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0B90B] to-[#FCD535]">{cfg.titleAccent}</span>
          </h1>
          <p className="text-[#848E9C] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {cfg.subtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
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
          
          {cfg.stats && cfg.stats.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-12 mt-16 pt-12 border-t border-[#1E2329] max-w-3xl mx-auto">
              {cfg.stats.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-[#EAECEF] tabular-nums whitespace-nowrap mb-1">{s.value}</div>
                  <div className="text-xs text-[#848E9C] font-medium tracking-wide uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Collections Mock */}
      <section className="py-24 bg-[#0d1014] border-b border-[#1E2329]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#F0B90B]" />
              Trending Collections
            </h2>
            <button onClick={() => setShowMore(!showMore)} className="text-sm font-medium text-[#F0B90B] hover:text-[#FCD535] flex items-center gap-1 transition-colors">
              {showMore ? 'Show Less' : 'View All'} <ArrowRight className={`w-4 h-4 transition-transform ${showMore ? '-rotate-90' : ''}`} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(showMore ? [...mockCollections, ...mockCollections] : mockCollections).map((col, i) => (
              <div key={i} onClick={openAuthRegister} className="bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-hidden hover:border-[#F0B90B]/50 transition-colors group cursor-pointer">
                <div className="h-40 relative">
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${col.color1} 0%, ${col.color2} 100%)` }} />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)]" />
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-20 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-[-20px] left-4 w-12 h-12 rounded-xl border-2 border-[#181A20] shadow-lg overflow-hidden" style={{ background: `linear-gradient(45deg, ${col.color2} 0%, ${col.color1} 100%)` }}>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.3)_0%,transparent_70%)]" />
                  </div>
                </div>
                <div className="p-5 pt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-base truncate pr-2 flex items-center gap-1">
                      {col.name} <BadgeCheck className="w-4 h-4 text-[#F0B90B] shrink-0" />
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-[#848E9C] text-xs mb-0.5">Floor</div>
                      <div className="font-medium tabular-nums">{col.floor}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#848E9C] text-xs mb-0.5">24h Vol</div>
                      <div className="font-medium tabular-nums">{col.vol}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#0B0E11]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight mb-4">
              {cfg.featuresTitle || 'More Than A Marketplace'}
            </h2>
            <p className="text-[#848E9C] max-w-2xl mx-auto">
              {cfg.featuresSubtitle || 'Trade, stake, and unlock liquidity.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cfg.features?.map((f, i) => {
              const Icon = f.icon || Palette;
              return (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] p-8 rounded-2xl hover:border-[#F0B90B]/30 transition-colors group text-center">
                  <div className="w-14 h-14 bg-[#1E2329] text-[#EAECEF] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[#F0B90B] group-hover:text-black transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{f.title}</h3>
                  <p className="text-[#848E9C] text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Steps */}
      {cfg.steps && cfg.steps.length > 0 && (
        <section className="py-24 bg-[#0d1014] border-y border-[#1E2329]">
          <div className="max-w-[1000px] mx-auto px-6">
            <h2 className="text-3xl font-bold text-center uppercase tracking-tight mb-16">
              {cfg.stepsTitle || 'How to begin'}
            </h2>
            <div className="flex flex-col md:flex-row gap-8">
              {cfg.steps.map((s, i) => (
                <div key={i} className="flex-1 text-center relative px-6">
                  {i < cfg.steps!.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t border-dashed border-[#2B3139]" />
                  )}
                  <div className="w-16 h-16 mx-auto bg-[#F0B90B]/10 border border-[#F0B90B]/30 text-[#F0B90B] rounded-2xl flex items-center justify-center font-bold text-xl mb-6 relative z-10 backdrop-blur-sm">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-[#848E9C] text-sm">{s.desc}</p>
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

        <div className="bg-gradient-to-br from-[#181A20] to-[#0B0E11] border border-[#2B3139] rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold uppercase tracking-tight mb-4">{cfg.closingTitle || 'Ready to explore?'}</h2>
            <p className="text-[#848E9C] mb-8 max-w-md mx-auto">{cfg.closingDesc || 'Join the top NFT destination for creators and collectors.'}</p>
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

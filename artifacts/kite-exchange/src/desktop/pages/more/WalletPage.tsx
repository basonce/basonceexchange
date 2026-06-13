import { useState } from 'react';
import { ArrowRight, Shield, Globe, ArrowDownUp, ScanLine, Hexagon, Activity, ChevronDown, Plus } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

export default function WalletPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['wallet'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'tokens'|'nfts'>('tokens');

  if (!cfg) return null;

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] selection:bg-[#F0B90B] selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden border-b border-[#1E2329]">
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#0ECB81]/10 rounded-full blur-[120px] opacity-50" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A20] border border-[#2B3139] text-[#0ECB81] text-xs font-semibold tracking-wide mb-8">
              <Shield className="w-4 h-4" />
              MPC Self-Custody
            </span>
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6 uppercase">
              {cfg.title} <span className="text-[#0ECB81]">{cfg.titleAccent}</span>
            </h1>
            <p className="text-[#848E9C] text-lg max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              {cfg.subtitle}
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-4 bg-[#EAECEF] hover:bg-white text-black text-sm font-bold rounded-xl transition-colors"
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
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 mt-16 pt-8 border-t border-[#1E2329]">
                {cfg.stats.map((s, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold text-[#EAECEF] tabular-nums whitespace-nowrap">{s.value}</div>
                    <div className="text-xs text-[#848E9C] mt-1 font-medium tracking-wide uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wallet UI Mockup */}
          <div className="flex-1 w-full max-w-[400px] shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0ECB81]/20 to-transparent blur-3xl" />
            <div className="relative bg-[#0d1014] border border-[#2B3139] rounded-[2.5rem] shadow-2xl overflow-hidden shadow-black/80">
              {/* Phone Header */}
              <div className="h-12 flex items-center justify-between px-6 pt-2">
                <span className="text-xs font-semibold text-[#848E9C]">9:41</span>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#EAECEF]" />
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2 bg-[#181A20] rounded-full px-3 py-1.5 border border-[#2B3139]">
                    <Hexagon className="w-4 h-4 text-[#0ECB81]" />
                    <span className="text-xs font-semibold">Polygon</span>
                    <ChevronDown className="w-3 h-3 text-[#848E9C]" />
                  </div>
                  <ScanLine className="w-5 h-5 text-[#848E9C]" />
                </div>

                <div className="text-center mb-8">
                  <div className="text-[#848E9C] text-sm font-medium mb-2">Total Balance</div>
                  <div className="text-4xl font-bold tracking-tight tabular-nums">$12,450.00</div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { icon: ArrowDownUp, label: 'Swap' },
                    { icon: ArrowRight, label: 'Send' },
                    { icon: Plus, label: 'Receive' },
                    { icon: Globe, label: 'Earn' },
                  ].map((act, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] rounded-2xl flex items-center justify-center text-[#EAECEF] transition-colors cursor-pointer">
                        <act.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-medium text-[#848E9C]">{act.label}</span>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#2B3139] mb-4">
                  <button 
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'tokens' ? 'border-[#0ECB81] text-[#EAECEF]' : 'border-transparent text-[#848E9C]'}`}
                    onClick={() => setActiveTab('tokens')}
                  >
                    Tokens
                  </button>
                  <button 
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'nfts' ? 'border-[#0ECB81] text-[#EAECEF]' : 'border-transparent text-[#848E9C]'}`}
                    onClick={() => setActiveTab('nfts')}
                  >
                    NFTs
                  </button>
                </div>

                {/* Asset List */}
                <div className="space-y-4 pb-2">
                  {[
                    { symbol: 'ETH', name: 'Ethereum', bal: '2.45', usd: '$4,165.00', color: '#627EEA' },
                    { symbol: 'MATIC', name: 'Polygon', bal: '14,500', usd: '$8,265.00', color: '#8247E5' },
                    { symbol: 'USDT', name: 'Tether', bal: '20.00', usd: '$20.00', color: '#26A17B' },
                  ].map((asset, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#181A20] rounded-xl border border-[#1E2329]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-inner" style={{ backgroundColor: asset.color }}>
                          {asset.symbol.substring(0,1)}
                        </div>
                        <div>
                          <div className="text-sm font-bold">{asset.symbol}</div>
                          <div className="text-xs text-[#848E9C]">{asset.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold tabular-nums">{asset.bal}</div>
                        <div className="text-xs text-[#848E9C] tabular-nums">{asset.usd}</div>
                      </div>
                    </div>
                  ))}
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
              {cfg.featuresTitle || 'Secure & Seamless'}
            </h2>
            <p className="text-[#848E9C] max-w-2xl mx-auto">
              {cfg.featuresSubtitle || 'Experience true ownership with enterprise-grade security.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cfg.features?.map((f, i) => {
              const Icon = f.icon || Shield;
              return (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] p-8 rounded-2xl hover:border-[#0ECB81]/50 transition-colors group">
                  <div className="w-12 h-12 bg-[#0ECB81]/10 text-[#0ECB81] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
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
              {cfg.stepsTitle || 'Getting Started'}
            </h2>
            <div className="flex flex-col md:flex-row gap-8 relative">
              <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#2B3139] to-transparent" />
              {cfg.steps.map((s, i) => (
                <div key={i} className="flex-1 relative z-10 text-center">
                  <div className="w-12 h-12 mx-auto bg-[#181A20] border border-[#0ECB81] text-[#0ECB81] rounded-full flex items-center justify-center font-bold text-lg mb-6 shadow-[0_0_20px_rgba(14,203,129,0.15)]">
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

        <div className="bg-[#181A20] border border-[#0ECB81]/30 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,203,129,0.1),transparent_50%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold uppercase tracking-tight mb-4">{cfg.closingTitle || 'Take Control'}</h2>
            <p className="text-[#848E9C] mb-8 max-w-md mx-auto">{cfg.closingDesc || 'Step into the decentralized world with confidence.'}</p>
            <button
              onClick={openAuthRegister}
              className="px-8 py-4 bg-[#0ECB81] hover:bg-[#0b9e65] text-black text-sm font-bold rounded-xl transition-colors"
            >
              {cfg.primaryCta}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

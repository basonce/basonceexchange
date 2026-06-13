import { useState } from 'react';
import { ArrowRight, ChevronDown, Timer, Activity, Plus } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';
import { MORE_PAGES } from '../morePagesData';

const MOCK_POOLS = [
  {
    id: 'NOT',
    name: 'Notcoin',
    ticker: 'NOT',
    status: 'Farming',
    apr: '45.2%',
    totalStaked: '1,450,230,000',
    timeRemaining: '12d 04h',
    pools: [
      { asset: 'BNC', allocation: '85%', apy: '48.5%' },
      { asset: 'FDUSD', allocation: '15%', apy: '32.1%' }
    ]
  },
  {
    id: 'OMNI',
    name: 'Omni Network',
    ticker: 'OMNI',
    status: 'Farming',
    apr: '38.7%',
    totalStaked: '890,500,000',
    timeRemaining: '3d 11h',
    pools: [
      { asset: 'BNC', allocation: '85%', apy: '41.2%' },
      { asset: 'FDUSD', allocation: '15%', apy: '28.4%' }
    ]
  },
  {
    id: 'REZ',
    name: 'Renzo',
    ticker: 'REZ',
    status: 'Upcoming',
    apr: '---',
    totalStaked: '0',
    timeRemaining: 'Starts in 2d',
    pools: [
      { asset: 'BNC', allocation: '85%', apy: '---' },
      { asset: 'FDUSD', allocation: '15%', apy: '---' }
    ]
  }
];

export default function LaunchpoolPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['launchpool'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (!cfg) return null;
  const HeroIcon = cfg.icon;

  return (
    <div className="bg-[#0B0E11] min-h-screen pb-24 text-[#EAECEF] font-sans selection:bg-[#F0B90B] selection:text-black">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B0E11] pt-24 pb-20 border-b border-[#1E2329]">
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 top-0 w-[1200px] h-[600px] pointer-events-none opacity-30"
          style={{
            background: 'radial-gradient(ellipse at top, #F0B90B 0%, transparent 60%)',
            filter: 'blur(100px)'
          }}
        />
        
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-xs font-bold uppercase tracking-wider mb-8">
            <HeroIcon className="w-4 h-4" />
            {cfg.eyebrow}
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-white mb-6 uppercase">
            {cfg.title} <br className="hidden md:block" />
            <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
          </h1>
          
          <p className="text-[#848E9C] text-lg lg:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            {cfg.subtitle}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <button
              onClick={openAuthRegister}
              className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              {cfg.primaryCta}
              <ArrowRight className="w-5 h-5" />
            </button>
            {cfg.secondaryCta && cfg.secondaryTab && (
              <button
                onClick={() => onNavigate(cfg.secondaryTab!)}
                className="px-8 py-4 bg-[#1E2329] hover:bg-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                {cfg.secondaryCta}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {cfg.stats?.map((stat, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-6">
                <div className="text-3xl font-bold text-white tabular-nums mb-1">{stat.value}</div>
                <div className="text-sm font-semibold text-[#848E9C] uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Farming Pools */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-white mb-8">Active & Upcoming Projects</h2>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {MOCK_POOLS.map((pool) => (
            <div key={pool.id} className="bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-hidden flex flex-col hover:border-[#F0B90B]/40 transition-colors">
              <div className="p-6 border-b border-[#2B3139] flex items-center justify-between bg-[#1E2329]/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#2B3139] flex items-center justify-center font-bold text-white text-xl">
                    {pool.ticker.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight">{pool.name}</h3>
                    <div className="text-sm text-[#848E9C]">{pool.ticker}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    pool.status === 'Farming' ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#F0B90B]/10 text-[#F0B90B]'
                  }`}>
                    {pool.status === 'Farming' && <Activity className="w-3 h-3" />}
                    {pool.status}
                  </div>
                  <div className="text-xs text-[#848E9C] mt-1 flex items-center gap-1 justify-end">
                    <Timer className="w-3.5 h-3.5" />
                    {pool.timeRemaining}
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs font-semibold text-[#848E9C] uppercase mb-1">Total Staked</div>
                    <div className="font-bold text-white tabular-nums">{pool.totalStaked}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#848E9C] uppercase mb-1">Estimated APR</div>
                    <div className="font-bold text-[#0ECB81] tabular-nums text-lg">{pool.apr}</div>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  {pool.pools.map((p, i) => (
                    <div key={i} className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#181A20] border border-[#2B3139] flex items-center justify-center font-bold text-[#F0B90B] text-xs">
                          {p.asset.slice(0,3)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{p.asset} Pool</div>
                          <div className="text-xs text-[#848E9C]">Reward: {p.allocation}</div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="text-xs text-[#848E9C] mb-0.5">APR</div>
                          <div className="font-bold text-[#0ECB81] text-sm tabular-nums">{p.apy}</div>
                        </div>
                        <button onClick={openAuthRegister} className="w-8 h-8 rounded-lg bg-[#2B3139] hover:bg-[#323942] flex items-center justify-center text-white transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#181A20] border-y border-[#1E2329]">
        <div className="max-w-[1200px] mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4">{cfg.featuresTitle}</h2>
            <p className="text-[#848E9C]">{cfg.featuresSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cfg.features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-[#0B0E11] p-6 rounded-xl border border-[#2B3139]">
                  <div className="w-10 h-10 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#F0B90B] mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-[#848E9C] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {cfg.faq && cfg.faq.length > 0 && (
        <section className="max-w-[800px] mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-white tracking-tight text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {cfg.faq.map((f, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-white">{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-[#848E9C] leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="max-w-[1200px] mx-auto px-6 pb-24 mt-12">
        <div className="bg-gradient-to-r from-[#1E2329] to-[#181A20] border border-[#2B3139] rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-[#F0B90B]/10 blur-3xl rounded-full pointer-events-none" />
          <h2 className="text-3xl font-bold text-white mb-4 relative z-10">{cfg.closingTitle}</h2>
          <p className="text-[#848E9C] mb-8 relative z-10">{cfg.closingDesc}</p>
          <button onClick={openAuthRegister} className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors relative z-10">
            {cfg.primaryCta}
          </button>
        </div>
      </section>
    </div>
  );
}

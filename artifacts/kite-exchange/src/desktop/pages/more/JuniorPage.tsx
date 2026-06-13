import { ArrowRight, Shield, Settings, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

export default function JuniorPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['junior'];
  const HeroIcon = cfg.icon;

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40">
        <div className="absolute inset-0 bg-[#0d1014]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-[1280px] mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#181A20] border border-[#2B3139] rounded-full text-sm text-blue-400 font-medium mb-8">
              <HeroIcon className="w-4 h-4" />
              {cfg.eyebrow}
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {cfg.title} <span className="text-blue-400">{cfg.titleAccent}</span>
            </h1>
            
            <p className="text-[#848E9C] text-lg max-w-xl mb-10 leading-relaxed">
              {cfg.subtitle}
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {cfg.primaryCta}
                <ArrowRight className="w-4 h-4" />
              </button>
              {cfg.secondaryCta && cfg.secondaryTab && (
                <button
                  onClick={() => onNavigate(cfg.secondaryTab!)}
                  className="px-8 py-3.5 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-semibold rounded-xl transition-colors"
                >
                  {cfg.secondaryCta}
                </button>
              )}
            </div>

            <div className="flex gap-8 mt-12 pt-8 border-t border-[#1E2329]">
              {cfg.stats?.map((stat, i) => (
                <div key={i}>
                   <div className="text-xl font-bold text-white mb-1 whitespace-nowrap">{stat.value}</div>
                   <div className="text-[#848E9C] text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Dashboard Mock */}
          <div className="bg-[#181A20] border border-[#2B3139] p-6 rounded-[2rem] shadow-2xl shadow-black/50">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-lg font-bold text-white">Family Dashboard</h3>
                   <p className="text-sm text-[#848E9C]">Parent View</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
             </div>
             
             <div className="space-y-4">
                {/* Child Card */}
                <div className="bg-[#0B0E11] rounded-2xl p-5 border border-[#2B3139]">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 p-0.5">
                            <div className="w-full h-full bg-[#181A20] rounded-full flex items-center justify-center font-bold text-sm">L</div>
                         </div>
                         <div>
                            <div className="font-semibold text-white">Leo's Account</div>
                            <div className="text-xs text-[#848E9C]">Age 12 • Saver</div>
                         </div>
                      </div>
                      <button className="text-blue-400 text-sm font-medium hover:underline">Manage</button>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-[#181A20] p-3 rounded-xl border border-[#2B3139]">
                         <div className="text-xs text-[#848E9C] mb-1">Savings Goal</div>
                         <div className="font-bold text-white">45%</div>
                         <div className="w-full bg-[#2B3139] h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-blue-500 h-full w-[45%]" />
                         </div>
                      </div>
                      <div className="bg-[#181A20] p-3 rounded-xl border border-[#2B3139]">
                         <div className="text-xs text-[#848E9C] mb-1">Weekly Limit</div>
                         <div className="font-bold text-white">$20 / $50</div>
                         <div className="w-full bg-[#2B3139] h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-green-500 h-full w-[40%]" />
                         </div>
                      </div>
                   </div>
                   
                   <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0" />
                      <div className="text-sm">
                         <span className="text-blue-400 font-medium block mb-0.5">Approval Required</span>
                         <span className="text-[#848E9C]">Leo wants to buy $15 of BTC.</span>
                      </div>
                   </div>
                </div>
                
                {/* Settings list */}
                <div className="bg-[#0B0E11] rounded-2xl p-2 border border-[#2B3139]">
                   {[
                     { label: 'Spend Limits', icon: Settings },
                     { label: 'Allowed Assets', icon: CheckCircle2 },
                   ].map((item, i) => (
                     <div key={i} className="flex items-center justify-between p-3 hover:bg-[#181A20] rounded-xl cursor-pointer">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 text-[#848E9C]" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#848E9C]" />
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-[#181A20]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">{cfg.featuresTitle}</h2>
            <p className="text-[#848E9C]">{cfg.featuresSubtitle}</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cfg.features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-[#0B0E11] p-8 rounded-2xl border border-[#2B3139]">
                   <div className="w-12 h-12 bg-blue-500/10 rounded-xl text-blue-400 flex items-center justify-center mb-6">
                     <Icon className="w-6 h-6" />
                   </div>
                   <h3 className="text-lg font-semibold mb-3">{f.title}</h3>
                   <p className="text-[#848E9C] text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Steps */}
      {cfg.steps && (
         <section className="py-24 bg-[#0B0E11]">
            <div className="max-w-[1280px] mx-auto px-6">
               <h2 className="text-3xl font-bold text-center mb-16">{cfg.stepsTitle || 'How it works'}</h2>
               <div className="grid md:grid-cols-3 gap-8">
                 {cfg.steps.map((s, i) => (
                    <div key={i} className="text-center">
                       <div className="w-16 h-16 rounded-full bg-[#181A20] border-2 border-[#2B3139] flex items-center justify-center mx-auto mb-6 text-xl font-bold text-blue-400">
                          {i + 1}
                       </div>
                       <h3 className="text-lg font-semibold mb-3">{s.title}</h3>
                       <p className="text-[#848E9C] text-sm max-w-xs mx-auto">{s.desc}</p>
                    </div>
                 ))}
               </div>
            </div>
         </section>
      )}

      {/* CTA */}
      <section className="py-24 bg-[#181A20] border-t border-[#1E2329] text-center">
         <h2 className="text-3xl font-bold mb-6">{cfg.closingTitle}</h2>
         <p className="text-[#848E9C] max-w-md mx-auto mb-10">{cfg.closingDesc}</p>
         <button
            onClick={openAuthRegister}
            className="px-10 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            {cfg.primaryCta}
          </button>
      </section>
    </div>
  );
}

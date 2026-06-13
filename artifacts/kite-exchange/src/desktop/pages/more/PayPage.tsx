import { useState } from 'react';
import { ArrowRight, QrCode, Send, Store, History, ChevronRight, CheckCircle2 } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

function QRSvg() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="crispEdges">
      {/* Finder patterns */}
      <path fill="currentColor" d="M10,10 h20 v20 h-20 z M15,15 h10 v10 h-10 z" />
      <path fill="currentColor" d="M70,10 h20 v20 h-20 z M75,15 h10 v10 h-10 z" />
      <path fill="currentColor" d="M10,70 h20 v20 h-20 z M15,75 h10 v10 h-10 z" />
      
      {/* Deterministic grid */}
      <path fill="currentColor" d="M40,10 h10 v10 h-10 z M55,10 h5 v5 h-5 z M60,15 h10 v5 h-10 z" />
      <path fill="currentColor" d="M10,40 h5 v10 h-5 z M20,45 h15 v5 h-15 z M45,40 h10 v10 h-10 z M60,40 h30 v5 h-30 z M80,45 h10 v10 h-10 z" />
      <path fill="currentColor" d="M15,55 h10 v5 h-10 z M30,55 h25 v10 h-25 z M65,55 h10 v10 h-10 z" />
      <path fill="currentColor" d="M40,70 h15 v10 h-15 z M60,75 h5 v5 h-5 z M70,70 h20 v5 h-20 z M75,80 h10 v10 h-10 z M45,85 h10 v5 h-10 z" />
    </svg>
  );
}

export default function PayPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['pay'];
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'merchant' | 'history'>('send');
  const [selectedContact, setSelectedContact] = useState<number | null>(null);

  const HeroIcon = cfg.icon;

  const handleQRToggle = () => {
    setActiveTab(prev => prev === 'receive' ? 'send' : 'receive');
  };

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0d1014] py-20 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#F0B90B]/10 to-transparent rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        </div>
        
        <div className="max-w-[1280px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-xs font-semibold tracking-wide mb-8">
              <HeroIcon className="w-4 h-4" />
              {cfg.eyebrow}
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              {cfg.title} <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
            </h1>
            <p className="text-[#848E9C] text-lg max-w-xl mb-10 leading-relaxed">
              {cfg.subtitle}
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {cfg.primaryCta}
                <ArrowRight className="w-4 h-4" />
              </button>
              {cfg.secondaryCta && cfg.secondaryTab && (
                <button
                  onClick={() => onNavigate(cfg.secondaryTab!)}
                  className="px-8 py-3.5 bg-[#181A20] hover:bg-[#2B3139] text-white border border-[#2B3139] font-semibold rounded-xl transition-colors"
                >
                  {cfg.secondaryCta}
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6 mt-16 pt-10 border-t border-[#1E2329]">
              {cfg.stats?.map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl font-bold text-white mb-1 whitespace-nowrap">{stat.value}</div>
                  <div className="text-[#848E9C] text-xs uppercase tracking-wide truncate">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Mock UI */}
          <div className="relative mx-auto w-full max-w-[400px]">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#F0B90B]/30 to-[#F0B90B]/0 rounded-[3rem] blur-xl opacity-50" />
            <div className="relative bg-[#181A20] border border-[#2B3139] rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
              {/* App Header */}
              <div className="flex justify-between items-center mb-8">
                <div className="text-lg font-semibold">Basonce Pay</div>
                <button onClick={handleQRToggle} className="w-10 h-10 rounded-full bg-[#2B3139] hover:bg-[#F0B90B]/20 flex items-center justify-center text-[#F0B90B] transition-colors">
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              {/* Balance */}
              <div className="bg-[#0B0E11] rounded-2xl p-5 border border-[#2B3139] mb-6">
                <div className="text-[#848E9C] text-sm mb-1">Total Balance</div>
                <div className="text-3xl font-bold text-white mb-4">$12,450.00</div>
                <div className="flex gap-3">
                  <button onClick={() => setActiveTab('send')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'send' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-white hover:bg-[#2B3139]/80'}`}>Send</button>
                  <button onClick={() => setActiveTab('receive')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'receive' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-white hover:bg-[#2B3139]/80'}`}>Receive</button>
                </div>
              </div>

              {/* Dynamic Content */}
              <div className="space-y-4 min-h-[220px]">
                {activeTab === 'send' && (
                  <>
                    <div className="text-sm font-medium text-[#848E9C] mb-2 flex justify-between">
                      <span>Recent Contacts</span>
                      {selectedContact !== null && (
                        <button onClick={() => setSelectedContact(null)} className="text-xs text-[#F0B90B] hover:underline">Clear</button>
                      )}
                    </div>
                    {['Alice (Basonce ID)', 'Bob (Email)', 'Coffee Shop'].map((contact, i) => (
                      <div 
                        key={i} 
                        onClick={() => setSelectedContact(i)}
                        className={`flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer border ${selectedContact === i ? 'bg-[#F0B90B]/10 border-[#F0B90B]/50' : 'border-transparent hover:bg-[#2B3139] hover:border-[#2B3139]'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F0B90B]/20 to-[#0B0E11] flex items-center justify-center font-bold text-white border border-[#2B3139]">
                            {contact[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{contact.split(' ')[0]}</div>
                            <div className="text-xs text-[#848E9C] truncate">{contact.split(' ')[1]}</div>
                          </div>
                        </div>
                        {selectedContact === i ? <CheckCircle2 className="w-4 h-4 text-[#F0B90B]" /> : <Send className="w-4 h-4 text-[#848E9C]" />}
                      </div>
                    ))}
                    {selectedContact !== null && (
                       <button onClick={openAuthRegister} className="w-full mt-2 py-3 bg-[#F0B90B] text-black rounded-xl font-bold text-sm">Send Funds</button>
                    )}
                  </>
                )}
                {activeTab === 'receive' && (
                  <div className="flex flex-col items-center justify-center p-6 bg-[#0B0E11] rounded-2xl border border-[#2B3139]">
                     <div className="bg-white p-4 rounded-xl mb-4 w-36 h-36">
                        <QRSvg />
                     </div>
                     <div className="text-sm text-[#848E9C] mb-2">My Pay ID</div>
                     <div className="text-lg font-mono font-medium text-white tracking-widest bg-[#181A20] px-4 py-2 rounded-lg border border-[#2B3139]">100 293 481</div>
                  </div>
                )}
                {activeTab === 'merchant' && (
                   <div className="space-y-3">
                     <div onClick={openAuthRegister} className="p-4 rounded-xl cursor-pointer hover:bg-[#2B3139]/50 transition-colors bg-gradient-to-r from-[#181A20] to-[#0B0E11] border border-[#F0B90B]/30 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <Store className="w-8 h-8 text-[#F0B90B]" />
                         <div>
                           <div className="text-sm font-semibold">Pay at Merchants</div>
                           <div className="text-xs text-[#848E9C]">Over 10,000 supported stores</div>
                         </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-[#848E9C]" />
                     </div>
                   </div>
                )}
                {activeTab === 'history' && (
                  <>
                    <div className="text-sm font-medium text-[#848E9C] mb-2">Recent Transactions</div>
                    {[
                      { type: 'Sent', to: 'Alice', amount: '-$50.00', date: 'Today, 14:30' },
                      { type: 'Received', to: 'Bob', amount: '+$120.00', date: 'Yesterday, 09:15', positive: true },
                      { type: 'Merchant', to: 'Coffee Shop', amount: '-$4.50', date: 'Oct 24, 08:45' }
                    ].map((tx, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#0B0E11] rounded-xl border border-[#2B3139]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#181A20] ${tx.positive ? 'text-[#0ECB81]' : 'text-white'}`}>
                             {tx.positive ? <ChevronRight className="w-4 h-4 rotate-90" /> : <Send className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{tx.to}</div>
                            <div className="text-xs text-[#848E9C]">{tx.date}</div>
                          </div>
                        </div>
                        <div className={`font-mono text-sm font-bold ${tx.positive ? 'text-[#0ECB81]' : 'text-white'}`}>
                          {tx.amount}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
              
              {/* Bottom Nav Mock */}
              <div className="flex justify-around items-center pt-6 mt-6 border-t border-[#1E2329]">
                 <button onClick={() => setActiveTab('send')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'send' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'}`}>
                    <Send className="w-5 h-5" />
                 </button>
                 <button onClick={() => setActiveTab('merchant')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'merchant' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'}`}>
                    <Store className="w-5 h-5" />
                 </button>
                 <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'}`}>
                    <History className="w-5 h-5" />
                 </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#0B0E11]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{cfg.featuresTitle}</h2>
            <p className="text-[#848E9C]">{cfg.featuresSubtitle}</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cfg.features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] p-8 rounded-2xl hover:border-[#F0B90B]/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#2B3139] text-[#F0B90B] flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                  <p className="text-[#848E9C] text-sm leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      {cfg.steps && (
        <section className="py-24 bg-[#0d1014] border-y border-[#1E2329]">
          <div className="max-w-[1280px] mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-16">{cfg.stepsTitle || 'How it works'}</h2>
            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#2B3139] to-transparent -translate-y-1/2 hidden md:block" />
              {cfg.steps.map((step, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#181A20] border-2 border-[#F0B90B] text-[#F0B90B] text-xl font-bold flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(240,185,11,0.2)]">
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-[#848E9C]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="py-24 bg-[#0B0E11]">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">{cfg.closingTitle}</h2>
          <p className="text-[#848E9C] text-lg mb-10">{cfg.closingDesc}</p>
          <button
            onClick={openAuthRegister}
            className="px-10 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
          >
            {cfg.primaryCta}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
}

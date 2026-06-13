import { ArrowRight, Trophy, Flame, Star, Vote, Target } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const MOCK_POLLS = [
  { team: 'Lazio', question: 'Which kit design for the 25/26 season?', votes: '124,592', ending: '2 days' },
  { team: 'Santos', question: 'Choose the goal song for next month.', votes: '89,102', ending: '12 hours' },
];

const MOCK_TOKENS = [
  { symbol: 'LAZIO', price: '$2.45', change: '+4.2%' },
  { symbol: 'SANTOS', price: '$4.12', change: '+1.8%' },
  { symbol: 'PORTO', price: '$1.89', change: '-0.5%' },
  { symbol: 'ALPINE', price: '$1.45', change: '+6.7%' },
];

export default function FanTokenPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['fantoken'];
  const HeroIcon = cfg.icon;

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#181A20] to-[#0B0E11] py-24">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F0B90B]/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
        
        <div className="max-w-[1280px] mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-[#2B3139]/40 mb-8 border border-[#2B3139]">
            <HeroIcon className="w-10 h-10 text-[#F0B90B]" />
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold uppercase tracking-tight mb-6">
            {cfg.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0B90B] to-[#FCD535]">{cfg.titleAccent}</span>
          </h1>
          
          <p className="text-[#848E9C] text-lg lg:text-xl max-w-2xl mx-auto mb-12">
            {cfg.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
             <button
                onClick={openAuthRegister}
                className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {cfg.primaryCta}
                <ArrowRight className="w-5 h-5" />
              </button>
              {cfg.secondaryCta && cfg.secondaryTab && (
                <button
                  onClick={() => onNavigate(cfg.secondaryTab!)}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors border border-[#2B3139]"
                >
                  {cfg.secondaryCta}
                </button>
              )}
          </div>
        </div>
      </section>

      {/* Stats & Tokens Marquee */}
      <section className="py-8 border-y border-[#1E2329] bg-[#0d1014] overflow-hidden">
         <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between gap-8 overflow-x-auto no-scrollbar">
           <div className="flex gap-8 items-center pr-8 border-r border-[#2B3139] shrink-0">
             {cfg.stats?.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-[#F0B90B] font-bold text-2xl whitespace-nowrap">{s.value}</div>
                  <div className="text-[#848E9C] text-xs uppercase tracking-wider">{s.label}</div>
                </div>
             ))}
           </div>
           
           <div className="flex gap-6 items-center shrink-0">
             {MOCK_TOKENS.map(t => (
               <div key={t.symbol} className="flex items-center gap-3 bg-[#181A20] px-4 py-2 rounded-lg border border-[#2B3139]">
                  <div className="w-8 h-8 rounded-full bg-[#2B3139] flex items-center justify-center text-xs font-bold">{t.symbol[0]}</div>
                  <div>
                    <div className="text-sm font-semibold">{t.symbol}</div>
                    <div className="text-xs text-[#848E9C]">{t.price} <span className={t.change.startsWith('+') ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{t.change}</span></div>
                  </div>
               </div>
             ))}
           </div>
         </div>
      </section>

      {/* Fan Arena & Features */}
      <section className="py-24 bg-[#0B0E11]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">{cfg.featuresTitle}</h2>
              <p className="text-[#848E9C] mb-12">{cfg.featuresSubtitle}</p>
              
              <div className="space-y-6">
                {cfg.features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="mt-1 w-10 h-10 rounded-full bg-[#181A20] border border-[#2B3139] flex items-center justify-center text-[#F0B90B] shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{f.title}</h3>
                        <p className="text-[#848E9C] text-sm leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Fan Arena Mock */}
            <div className="bg-[#181A20] rounded-3xl p-8 border border-[#2B3139] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Trophy className="w-48 h-48" />
               </div>
               <div className="relative z-10">
                 <div className="flex items-center justify-between mb-8">
                   <div>
                     <h3 className="text-xl font-bold mb-1 flex items-center gap-2">Fan Arena <Flame className="w-5 h-5 text-[#F0B90B]" /></h3>
                     <p className="text-sm text-[#848E9C]">Active Polls & Engagement</p>
                   </div>
                   <div className="bg-[#2B3139] px-3 py-1.5 rounded-lg flex items-center gap-2">
                     <Star className="w-4 h-4 text-[#F0B90B] fill-[#F0B90B]" />
                     <span className="font-bold text-sm">2,450 pts</span>
                   </div>
                 </div>
                 
                 <div className="space-y-4">
                   {MOCK_POLLS.map((poll, i) => (
                     <div key={i} className="bg-[#0B0E11] p-5 rounded-2xl border border-[#2B3139] hover:border-[#F0B90B]/50 transition-colors cursor-pointer group">
                       <div className="flex items-center justify-between mb-3">
                         <span className="text-xs font-bold px-2 py-1 rounded bg-[#2B3139] text-[#EAECEF]">{poll.team}</span>
                         <span className="text-xs text-[#F0B90B] flex items-center gap-1"><Target className="w-3 h-3"/> Ends in {poll.ending}</span>
                       </div>
                       <p className="font-medium text-sm mb-4 group-hover:text-[#F0B90B] transition-colors">{poll.question}</p>
                       <div className="flex items-center justify-between text-xs text-[#848E9C]">
                         <span className="flex items-center gap-1.5"><Vote className="w-4 h-4"/> {poll.votes} votes</span>
                         <button className="text-[#EAECEF] font-semibold flex items-center gap-1 group-hover:text-[#F0B90B] transition-colors">
                           Vote Now <ArrowRight className="w-3 h-3" />
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      {cfg.steps && (
        <section className="py-24 bg-[#181A20] border-y border-[#1E2329]">
          <div className="max-w-[1280px] mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-16">{cfg.stepsTitle || 'How to start'}</h2>
            <div className="grid md:grid-cols-3 gap-8">
               {cfg.steps.map((s, i) => (
                 <div key={i} className="bg-[#0B0E11] p-8 rounded-2xl border border-[#2B3139]">
                   <div className="w-12 h-12 bg-[#2B3139] text-[#F0B90B] font-bold text-xl rounded-full flex items-center justify-center mx-auto mb-6">
                     {i + 1}
                   </div>
                   <h3 className="text-lg font-semibold mb-3">{s.title}</h3>
                   <p className="text-[#848E9C] text-sm">{s.desc}</p>
                 </div>
               ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="py-24 bg-[#0B0E11] text-center">
         <h2 className="text-3xl font-bold mb-6 uppercase tracking-tight">{cfg.closingTitle}</h2>
         <p className="text-[#848E9C] mb-10">{cfg.closingDesc}</p>
         <button
            onClick={openAuthRegister}
            className="px-10 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded-xl transition-colors"
          >
            {cfg.primaryCta}
          </button>
      </section>
    </div>
  );
}

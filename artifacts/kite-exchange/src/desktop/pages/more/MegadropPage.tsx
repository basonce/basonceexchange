import { useState } from 'react';
import { ArrowRight, ChevronDown, CheckCircle2, Timer } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';
import { MORE_PAGES } from '../morePagesData';

const MOCK_PROJECTS = [
  {
    id: 1,
    name: 'BounceBit (BB)',
    status: 'Farming',
    type: 'Megadrop',
    totalReward: '16,800,000 BB',
    timeRemaining: '2d 14h',
    participants: '1,245,678',
    lockedBnc: '18,500,400',
    quests: [
      { name: 'Connect Web3 Wallet', points: 1000, completed: true },
      { name: 'Stake 0.1 BTCb on BounceBit', points: 2500, completed: false },
      { name: 'Follow @BounceBit on X', points: 500, completed: false },
    ],
  },
  {
    id: 2,
    name: 'Lista (LISTA)',
    status: 'Upcoming',
    type: 'Megadrop',
    totalReward: '100,000,000 LISTA',
    timeRemaining: 'Starts in 4d',
    participants: '0',
    lockedBnc: '0',
    quests: [
      { name: 'Create Lista Wallet', points: 1000, completed: false },
      { name: 'Deposit 10 USDT on Lista', points: 3000, completed: false },
    ],
  }
];

export default function MegadropPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['megadrop'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'upcoming' | 'completed'>('ongoing');

  if (!cfg) return null;
  const HeroIcon = cfg.icon;

  return (
    <div className="bg-[#0B0E11] min-h-screen pb-24 text-[#EAECEF] font-sans selection:bg-[#F0B90B] selection:text-black">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B0E11] pt-24 pb-32 border-b border-[#1E2329]">
        <div
          aria-hidden
          className="absolute right-0 top-0 w-[800px] h-[800px] pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(circle at 70% 30%, #F0B90B 0%, transparent 60%)',
            filter: 'blur(80px)'
          }}
        />
        
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#2B3139]/50 border border-[#2B3139] text-[#F0B90B] text-xs font-bold uppercase tracking-wider mb-6">
              <HeroIcon className="w-4 h-4" />
              {cfg.eyebrow}
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white mb-6">
              {cfg.title} <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
            </h1>
            
            <p className="text-[#848E9C] text-lg lg:text-xl leading-relaxed mb-10 max-w-lg">
              {cfg.subtitle}
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
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
          </div>

          {/* Hero Visual: Score Calculator Mock */}
          <div className="relative border border-[#2B3139] rounded-2xl bg-[#181A20] p-6 shadow-2xl shadow-black/50">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-[#F0B90B]/30 to-transparent rounded-2xl blur opacity-30 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between border-b border-[#2B3139] pb-4 mb-6">
                <h3 className="font-bold text-lg text-white">Your Megadrop Score</h3>
                <span className="text-[#0ECB81] font-semibold text-sm bg-[#0ECB81]/10 px-2 py-1 rounded">Live Calculator</span>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#848E9C]">Locked BNC Score</span>
                    <span className="font-bold text-white tabular-nums">4,500</span>
                  </div>
                  <div className="h-2 bg-[#2B3139] rounded-full overflow-hidden">
                    <div className="h-full bg-[#F0B90B] w-[60%]" />
                  </div>
                  <div className="text-xs text-[#848E9C] mt-2">Based on 150 BNC locked for 120 days</div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#848E9C]">Web3 Quest Multiplier</span>
                    <span className="font-bold text-[#F0B90B] tabular-nums">x 1.5</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-10 bg-[#0ECB81]/20 border border-[#0ECB81]/30 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-[#0ECB81]" />
                    </div>
                    <div className="h-10 bg-[#0ECB81]/20 border border-[#0ECB81]/30 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-[#0ECB81]" />
                    </div>
                    <div className="h-10 bg-[#2B3139] border border-[#2B3139] rounded-lg flex items-center justify-center border-dashed">
                      <span className="text-[#848E9C] text-xs">Pending</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1E2329] rounded-xl p-4 flex items-center justify-between border border-[#2B3139]">
                  <span className="text-[#848E9C] font-medium">Total Score</span>
                  <span className="text-3xl font-bold text-white tabular-nums">6,750</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Projects Board */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Megadrop Projects</h2>
            <p className="text-[#848E9C]">Participate in live quests and lock BNC to earn rewards.</p>
          </div>
          <div className="flex bg-[#181A20] p-1 rounded-lg border border-[#2B3139]">
            {(['ongoing', 'upcoming', 'completed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-6 py-2 text-sm font-semibold rounded-md capitalize transition-colors ${
                  activeTab === t ? 'bg-[#2B3139] text-white' : 'text-[#848E9C] hover:text-[#EAECEF]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {MOCK_PROJECTS.filter(p => 
            activeTab === 'ongoing' ? p.status === 'Farming' :
            activeTab === 'upcoming' ? p.status === 'Upcoming' : false
          ).map((project) => (
            <div key={project.id} className="bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-hidden hover:border-[#F0B90B]/50 transition-colors">
              <div className="p-6 md:p-8 grid lg:grid-cols-[1fr,320px] gap-8">
                {/* Project Info */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F0B90B] to-[#FCD535] flex items-center justify-center text-black font-bold text-xl">
                      {project.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{project.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          project.status === 'Farming' ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#F0B90B]/10 text-[#F0B90B]'
                        }`}>
                          {project.status}
                        </span>
                        <span className="text-sm text-[#848E9C] flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5" />
                          {project.timeRemaining}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <div>
                      <div className="text-xs text-[#848E9C] mb-1 uppercase tracking-wider font-semibold">Total Reward</div>
                      <div className="font-bold text-white tabular-nums">{project.totalReward}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#848E9C] mb-1 uppercase tracking-wider font-semibold">Participants</div>
                      <div className="font-bold text-white tabular-nums">{project.participants}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#848E9C] mb-1 uppercase tracking-wider font-semibold">Locked BNC</div>
                      <div className="font-bold text-white tabular-nums">{project.lockedBnc}</div>
                    </div>
                  </div>

                  <div className="border-t border-[#2B3139] pt-6">
                    <h4 className="text-sm font-bold text-white mb-4">Web3 Quests</h4>
                    <div className="space-y-3">
                      {project.quests.map((q, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#1E2329] p-3 rounded-lg border border-[#2B3139]">
                          <div className="flex items-center gap-3">
                            {q.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-[#0ECB81]" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[#5E6673]" />
                            )}
                            <span className={`text-sm ${q.completed ? 'text-[#848E9C] line-through' : 'text-[#EAECEF]'}`}>{q.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#F0B90B] font-bold text-sm">+{q.points} pts</span>
                            {!q.completed && (
                              <button onClick={openAuthRegister} className="px-3 py-1 bg-[#2B3139] hover:bg-[#323942] text-xs font-semibold rounded transition-colors text-white">
                                Start
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions Sidebar */}
                <div className="bg-[#1E2329] rounded-xl p-6 border border-[#2B3139] flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2">How to boost your score</h4>
                    <ul className="space-y-3 text-sm text-[#848E9C] mb-6">
                      <li className="flex items-start gap-2">
                        <span className="text-[#F0B90B]">•</span> Lock more BNC in Simple Earn
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#F0B90B]">•</span> Choose longer lock durations (up to 120 days)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#F0B90B]">•</span> Complete all Web3 quests for the max multiplier
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <button onClick={openAuthRegister} className="w-full py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors">
                      Lock BNC
                    </button>
                    <button onClick={openAuthRegister} className="w-full py-3 bg-transparent border border-[#5E6673] hover:border-[#EAECEF] text-white font-bold rounded-lg transition-colors">
                      Project Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {activeTab === 'completed' && (
            <div className="text-center py-12 text-[#848E9C]">
              No completed projects yet.
            </div>
          )}
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
          <h2 className="text-3xl font-bold text-white tracking-tight text-center mb-12">Frequently Asked Questions</h2>
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
    </div>
  );
}

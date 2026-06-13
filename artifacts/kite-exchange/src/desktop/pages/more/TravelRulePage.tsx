import { useState } from 'react';
import { ArrowRight, ChevronDown, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

export default function TravelRulePage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['travelrule'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [amount, setAmount] = useState<string>('1500');

  const numAmount = parseFloat(amount) || 0;
  const inScope = numAmount >= 1000;

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Corporate Hero */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1100px] mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2B3139] text-[#EAECEF] mb-8">
            <ShieldCheck className="w-8 h-8 text-[#F0B90B]" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white uppercase tracking-tight mb-6">
            {cfg.title} <br/> <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
          </h1>
          <p className="text-[#848E9C] text-lg max-w-3xl mx-auto leading-relaxed mb-10">
            {cfg.subtitle}
          </p>
          <div className="flex justify-center gap-4">
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
                className="px-8 py-3.5 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-bold rounded-lg transition-colors"
              >
                {cfg.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Compliance Stats */}
      {cfg.stats && (
        <section className="py-12 border-b border-[#1E2329]">
          <div className="max-w-[1000px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {cfg.stats.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="text-3xl font-bold text-white mb-2">{s.value}</div>
                <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Diagram / Flow Section */}
      <section className="max-w-[1100px] mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">{cfg.featuresTitle}</h2>
          <p className="text-[#848E9C]">{cfg.featuresSubtitle}</p>
        </div>

        {/* Corporate Flow Diagram Mock */}
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-10 mb-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full bg-[#0B0E11] border border-[#2B3139] p-6 rounded-xl text-center shadow-lg shadow-[#000]/50 relative z-10">
              <div className="text-[#F0B90B] font-bold mb-2">Originator</div>
              <div className="text-sm text-[#848E9C]">Sender Information</div>
            </div>
            
            <div className="hidden md:flex flex-col items-center justify-center flex-1 min-w-[120px] relative">
              <div className="absolute w-full h-0.5 bg-[#2B3139] top-1/2 -translate-y-1/2 -z-0"></div>
              <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent top-1/2 -translate-y-1/2 -z-0 opacity-50 animate-pulse"></div>
              <div className="bg-[#181A20] px-3 py-1 border border-[#2B3139] rounded-full text-xs text-[#848E9C] mb-8 relative z-10 uppercase tracking-wide">
                Encrypted Flow
              </div>
              <ArrowRight className="w-5 h-5 text-[#F0B90B] absolute top-1/2 -translate-y-1/2 right-0 bg-[#181A20] rounded-full" />
            </div>

            <div className="flex-1 w-full bg-[#0B0E11] border-2 border-[#F0B90B]/30 p-6 rounded-xl text-center shadow-lg shadow-[#F0B90B]/10 relative z-10">
              <div className="text-[#F0B90B] font-bold mb-2">VASP</div>
              <div className="text-sm text-[#848E9C]">Compliance Check</div>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center flex-1 min-w-[120px] relative">
              <div className="absolute w-full h-0.5 bg-[#2B3139] top-1/2 -translate-y-1/2 -z-0"></div>
              <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-[#0ECB81] to-transparent top-1/2 -translate-y-1/2 -z-0 opacity-50 animate-pulse" style={{ animationDelay: '500ms' }}></div>
              <div className="bg-[#181A20] px-3 py-1 border border-[#2B3139] rounded-full text-xs text-[#848E9C] mb-8 relative z-10 uppercase tracking-wide">
                Cleared Funds
              </div>
              <ArrowRight className="w-5 h-5 text-[#0ECB81] absolute top-1/2 -translate-y-1/2 right-0 bg-[#181A20] rounded-full" />
            </div>

            <div className="flex-1 w-full bg-[#0B0E11] border border-[#2B3139] p-6 rounded-xl text-center shadow-lg shadow-[#000]/50 relative z-10">
              <div className="text-[#F0B90B] font-bold mb-2">Beneficiary</div>
              <div className="text-sm text-[#848E9C]">Receiver Information</div>
            </div>
          </div>
        </div>

        {/* Checker Tool & Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Scope Checker Tool */}
          <div className="bg-[#181A20] border border-[#F0B90B]/30 rounded-xl p-8 row-span-2">
            <h3 className="text-xl font-bold text-white mb-4">Is my transfer in scope?</h3>
            <p className="text-[#848E9C] text-sm mb-6">Enter a USD equivalent transfer amount to check if the Travel Rule information sharing requirements apply to your transaction.</p>
            
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#848E9C] uppercase tracking-wider mb-2">Transfer Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#848E9C]">$</span>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:border-[#F0B90B] transition-colors"
                  placeholder="1000"
                />
              </div>
            </div>

            <div className={`p-4 rounded-lg border flex items-start gap-4 ${inScope ? 'bg-[#F0B90B]/10 border-[#F0B90B]/30' : 'bg-[#0ECB81]/10 border-[#0ECB81]/30'}`}>
              <div className="mt-0.5">
                {inScope ? <ShieldCheck className="w-5 h-5 text-[#F0B90B]" /> : <CheckCircle2 className="w-5 h-5 text-[#0ECB81]" />}
              </div>
              <div>
                <div className={`font-bold ${inScope ? 'text-[#F0B90B]' : 'text-[#0ECB81]'}`}>
                  {inScope ? 'In Scope (>= $1,000)' : 'Out of Scope (< $1,000)'}
                </div>
                <div className="text-sm text-[#848E9C] mt-1">
                  {inScope 
                    ? 'Originator and beneficiary information must be transmitted securely to the receiving VASP.'
                    : 'Information sharing is not strictly mandated by the rule at this threshold, though standard AML checks apply.'}
                </div>
              </div>
            </div>
          </div>

          {cfg.features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex gap-6 p-6 border border-[#1E2329] rounded-xl bg-[#0B0E11]">
                <div className="shrink-0 mt-1">
                  <Icon className="w-6 h-6 text-[#F0B90B]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-[#848E9C] text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Steps Table Style */}
      <section className="bg-[#181A20] py-24 border-y border-[#2B3139]">
        <div className="max-w-[1000px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-12">
            {cfg.stepsTitle || 'Compliance Process'}
          </h2>
          <div className="border border-[#2B3139] rounded-xl overflow-hidden">
            {cfg.steps?.map((s, i) => (
              <div key={i} className={`flex items-center gap-6 p-6 ${i !== 0 ? 'border-t border-[#2B3139]' : ''} bg-[#0B0E11]`}>
                <div className="w-8 h-8 rounded bg-[#2B3139] text-[#F0B90B] flex items-center justify-center font-bold text-sm shrink-0">
                  0{i + 1}
                </div>
                <div>
                  <div className="font-bold text-white mb-1">{s.title}</div>
                  <div className="text-sm text-[#848E9C]">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-3 mb-16">
          {cfg.faq?.map((item, i) => (
            <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-lg">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-[#EAECEF]">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
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
          <h3 className="text-xl font-bold text-white mb-3">{cfg.closingTitle}</h3>
          <p className="text-[#848E9C] mb-8">{cfg.closingDesc}</p>
          <button
            onClick={openAuthRegister}
            className="px-8 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
          >
            {cfg.primaryCta}
          </button>
        </div>
      </section>
    </div>
  );
}

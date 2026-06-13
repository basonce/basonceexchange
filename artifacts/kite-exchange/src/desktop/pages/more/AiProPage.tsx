import { useState, useEffect } from 'react';
import { ArrowRight, Bot, ChevronDown, Activity, TerminalSquare } from 'lucide-react';
import { MORE_PAGES } from '../morePagesData';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const LOG_LINES = [
  "// Initialize Copilot",
  "const agent = new Agent({",
  "  mode: 'autonomous',",
  "  riskLevel: 'moderate',",
  "  maxDrawdown: 0.05",
  "});",
  "",
  "// Monitor market conditions",
  "agent.on('signal', (data) => {",
  "  if (data.confidence > 0.85) {",
  "    agent.executeTrade(data.pair, data.size);",
  "  }",
  "});",
  "",
  "> Scanning global markets...",
  "> Detected high probability setup on BTC/USDT",
  "> Analyzing order book depth...",
  "> Confidence: 0.89. Executing limit buy.",
  "> Order filled. Monitoring position.",
  "> Trailing stop updated: +2.5%",
];

export default function AiProPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['aipro'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < LOG_LINES.length) {
        setLogs(prev => [...prev, LOG_LINES[index]]);
        index++;
      } else {
        clearInterval(timer);
      }
    }, 800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#F0B90B]/10 via-[#0B0E11]/0 to-[#0B0E11] pointer-events-none" />
        
        {/* Abstract futuristic grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#F0B90B 1px, transparent 1px), linear-gradient(90deg, #F0B90B 1px, transparent 1px)', backgroundSize: '50px 50px' }}
        />

        <div className="relative max-w-[1280px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A20] border border-[#2B3139] mb-8">
              <Bot className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-xs font-semibold text-[#B7BDC6] tracking-widest uppercase">{cfg.eyebrow}</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white mb-6 uppercase">
              {cfg.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0B90B] to-[#FCD535]">{cfg.titleAccent}</span>
            </h1>
            <p className="text-lg text-[#848E9C] mb-10 max-w-xl leading-relaxed">
              {cfg.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={openAuthRegister}
                className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                {cfg.primaryCta}
                <ArrowRight className="w-4 h-4" />
              </button>
              {cfg.secondaryCta && cfg.secondaryTab && (
                <button
                  onClick={() => onNavigate(cfg.secondaryTab!)}
                  className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Activity className="w-4 h-4 text-[#F0B90B]" />
                  {cfg.secondaryCta}
                </button>
              )}
            </div>
          </div>

          {/* AI Terminal Mockup */}
          <div className="relative flex flex-col h-[400px] bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-hidden shadow-2xl shadow-[#F0B90B]/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B3139] bg-[#0B0E11] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F6465D]" />
                <div className="w-3 h-3 rounded-full bg-[#F0B90B]" />
                <div className="w-3 h-3 rounded-full bg-[#0ECB81]" />
                <div className="ml-4 flex items-center gap-2 text-xs text-[#848E9C] font-mono">
                  <TerminalSquare className="w-3 h-3" />
                  agent-workflow.cfg
                </div>
              </div>
              <button 
                onClick={openAuthRegister}
                className="text-xs px-3 py-1 bg-[#F0B90B]/10 hover:bg-[#F0B90B]/20 text-[#F0B90B] rounded transition-colors font-semibold uppercase"
              >
                Deploy Agent
              </button>
            </div>
            <div className="flex-1 p-6 font-mono text-sm leading-relaxed text-[#B7BDC6] overflow-y-auto">
              {logs.map((line, i) => {
                if (line.startsWith('//')) return <div key={i} className="text-[#848E9C]">{line}</div>;
                if (line.startsWith('>')) return <div key={i} className="text-[#0ECB81] mt-2">{line}</div>;
                
                // simple syntax highlighting
                const highlighted = line
                  .replace(/const|new|if|let|var/g, '<span class="text-[#F0B90B]">$&</span>')
                  .replace(/'[^']*'/g, '<span class="text-[#F6465D]">$&</span>')
                  .replace(/([0-9.]+)/g, '<span class="text-[#F0B90B]">$1</span>');
                  
                return <div key={i} dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }} />;
              })}
              <div className="flex items-center gap-2 text-[#0ECB81] mt-2">
                <span className="animate-pulse">_</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {cfg.stats && (
        <section className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cfg.stats.map((s, i) => (
              <div key={i} className="bg-[#181A20] border-l-2 border-[#F0B90B] p-6 rounded-r-xl">
                <div className="text-3xl font-bold text-white mb-2 tabular-nums">{s.value}</div>
                <div className="text-sm text-[#848E9C] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white uppercase tracking-tight mb-4">
            {cfg.featuresTitle}
          </h2>
          <p className="text-[#848E9C] text-lg max-w-2xl mx-auto">{cfg.featuresSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {cfg.features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="group relative bg-[#181A20] border border-[#2B3139] p-8 rounded-2xl overflow-hidden hover:border-[#F0B90B]/50 transition-colors">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon className="w-32 h-32 text-[#F0B90B]" />
                </div>
                <div className="w-14 h-14 rounded-xl bg-[#2B3139] flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-[#F0B90B]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-[#848E9C] leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Workflows / Steps */}
      {cfg.steps && (
        <section className="bg-[#0d1014] py-24 border-y border-[#1E2329]">
          <div className="max-w-[1280px] mx-auto px-6">
            <h2 className="text-3xl lg:text-4xl font-bold text-white uppercase tracking-tight mb-16 text-center">
              {cfg.stepsTitle || 'How it works'}
            </h2>
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute top-8 left-8 right-8 h-px bg-[#2B3139] hidden md:block" />
              
              <div className="grid md:grid-cols-3 gap-12">
                {cfg.steps.map((s, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[#181A20] border-2 border-[#F0B90B] flex items-center justify-center text-xl font-bold text-[#F0B90B] mb-6 shadow-[0_0_20px_rgba(240,185,11,0.2)]">
                      0{i + 1}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                    <p className="text-[#848E9C]">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ & CTA */}
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <h2 className="text-3xl lg:text-4xl font-bold text-white uppercase tracking-tight text-center mb-12">FAQ</h2>
        <div className="space-y-4 mb-24">
          {cfg.faq?.map((item, i) => (
            <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-xl">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-[#EAECEF] pr-8">{item.q}</span>
                <ChevronDown className={`w-5 h-5 text-[#848E9C] shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-[#848E9C] leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#181A20] border border-[#2B3139] rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[#F0B90B]/10 to-transparent pointer-events-none" />
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight mb-4 relative z-10">{cfg.closingTitle}</h2>
          <p className="text-[#848E9C] mb-8 relative z-10">{cfg.closingDesc}</p>
          <button
            onClick={openAuthRegister}
            className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors relative z-10"
          >
            {cfg.primaryCta}
          </button>
        </div>
      </section>
    </div>
  );
}

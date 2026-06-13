import { useState, useEffect, useRef } from 'react';
import { UserPlus, ChevronDown, ArrowRight, Link as LinkIcon, QrCode, Copy } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';
import { MORE_PAGES } from '../morePagesData';

export default function ReferralPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['referral'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText("basonce.com/ref/8291X");
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  const renderQR = () => (
    <div className="bg-white p-4 rounded-xl flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="25" height="25" fill="white"/>
        {/* Finder patterns */}
        <path fillRule="evenodd" clipRule="evenodd" d="M2 2H9V9H2V2ZM4 4H7V7H4V4Z" fill="black"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M16 2H23V9H16V2ZM18 4H21V7H18V4Z" fill="black"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M2 16H9V23H2V16ZM4 18H7V21H4V18Z" fill="black"/>
        {/* Random dots */}
        <rect x="11" y="2" width="3" height="3" fill="black"/>
        <rect x="11" y="7" width="1" height="1" fill="black"/>
        <rect x="14" y="6" width="1" height="2" fill="black"/>
        <rect x="2" y="11" width="3" height="1" fill="black"/>
        <rect x="7" y="11" width="2" height="2" fill="black"/>
        <rect x="11" y="11" width="4" height="2" fill="black"/>
        <rect x="17" y="11" width="1" height="4" fill="black"/>
        <rect x="20" y="11" width="3" height="3" fill="black"/>
        <rect x="13" y="15" width="2" height="1" fill="black"/>
        <rect x="11" y="18" width="1" height="3" fill="black"/>
        <rect x="14" y="18" width="3" height="1" fill="black"/>
        <rect x="14" y="21" width="1" height="2" fill="black"/>
        <rect x="18" y="18" width="5" height="1" fill="black"/>
        <rect x="18" y="21" width="2" height="2" fill="black"/>
        <rect x="22" y="21" width="1" height="1" fill="black"/>
      </svg>
    </div>
  );

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Hero with split design */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181A20] border border-[#2B3139] rounded-full text-[#F0B90B] text-sm font-semibold mb-6">
                <UserPlus className="w-4 h-4" />
                {cfg.eyebrow}
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                {cfg.title} <br className="hidden lg:block" />
                <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
              </h1>
              <p className="text-[#848E9C] text-lg lg:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10">
                {cfg.subtitle}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button onClick={openAuthRegister} className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-xl transition-colors flex items-center gap-2">
                  {cfg.primaryCta}
                  <ArrowRight className="w-5 h-5" />
                </button>
                {cfg.secondaryCta && cfg.secondaryTab && (
                  <button onClick={() => onNavigate(cfg.secondaryTab!)} className="px-8 py-4 bg-transparent border-2 border-[#2B3139] hover:bg-[#181A20] text-white font-bold rounded-xl transition-colors">
                    {cfg.secondaryCta}
                  </button>
                )}
              </div>
            </div>

            {/* Referral Card Mockup */}
            <div className="relative mx-auto w-full max-w-[400px]">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-[#F0B90B] to-[#F0B90B]/10 rounded-[32px] blur opacity-20" />
              <div className="relative bg-[#181A20] border border-[#2B3139] rounded-[32px] p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-[#2B3139] rounded-full mx-auto flex items-center justify-center mb-4">
                    <UserPlus className="w-8 h-8 text-[#F0B90B]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Invite Friends</h3>
                  <p className="text-sm text-[#848E9C]">Share your link to start earning</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-5 h-5 text-[#848E9C]" />
                      <div>
                        <div className="text-xs text-[#848E9C]">Referral Link</div>
                        <div className="text-sm font-medium text-white truncate max-w-[180px]">basonce.com/ref/8291X</div>
                      </div>
                    </div>
                    <button onClick={handleCopy} className="p-2 hover:bg-[#2B3139] rounded-lg transition-colors text-[#F0B90B]">
                      {copied ? <span className="text-xs font-bold">Copied!</span> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-[#848E9C]" />
                        <div>
                          <div className="text-xs text-[#848E9C]">QR Code</div>
                          <div className="text-sm font-medium text-white">Scan to register</div>
                        </div>
                      </div>
                      <button onClick={() => setShowQr(!showQr)} className="px-3 py-1 bg-[#2B3139] rounded-lg text-xs font-medium text-white hover:bg-[#3B4149] transition-colors">
                        {showQr ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {showQr && (
                      <div className="flex justify-center mt-2 animate-in fade-in zoom-in duration-200">
                        {renderQR()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="py-12 bg-[#F0B90B]">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-black text-center">
          {cfg.stats?.map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center">
              <div className="text-4xl font-black mb-1 tabular-nums">{stat.value}</div>
              <div className="text-sm font-bold uppercase tracking-widest opacity-80">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Steps Visual */}
      <section className="py-24 bg-[#0B0E11]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{cfg.featuresTitle}</h2>
            <p className="text-[#848E9C] text-lg">{cfg.featuresSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {cfg.steps?.map((step, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] p-8 rounded-2xl text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F0B90B] to-[#FCD535] text-black flex items-center justify-center font-black text-2xl mb-6 shadow-lg">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-[#848E9C]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#0d1014] border-y border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {cfg.features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="flex gap-6 p-6 bg-[#181A20] rounded-2xl border border-[#2B3139]">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-[#2B3139] flex items-center justify-center text-[#F0B90B]">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-[#848E9C] leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ & Final CTA */}
      <section className="py-24 bg-[#0B0E11]">
        <div className="max-w-[800px] mx-auto px-6 mb-24">
          <h2 className="text-3xl font-bold mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {cfg.faq?.map((item, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-medium text-[17px]">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#848E9C] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-[#848E9C] pt-2">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">{cfg.closingTitle}</h2>
          <p className="text-[#848E9C] text-lg mb-10">{cfg.closingDesc}</p>
          <button onClick={openAuthRegister} className="px-10 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-xl text-lg transition-transform hover:scale-105">
            {cfg.primaryCta}
          </button>
        </div>
      </section>
    </div>
  );
}

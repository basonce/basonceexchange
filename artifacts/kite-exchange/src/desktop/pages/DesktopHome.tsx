import { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Zap, Globe2, Headphones } from 'lucide-react';
import { useMarkets } from '../useMarkets';
import type { DeskTab } from '../components/DesktopNav';
import CoinLogo from '../../components/CoinLogo';
import { formatPriceWithSymbol } from '../../lib/format-utils';

interface DesktopHomeProps {
  user: any;
  onNavigate: (tab: DeskTab) => void;
  onAuth: (mode: 'login' | 'register') => void;
  onDeposit: () => void;
}

function useCountUp(target: number, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const NEWS = [
  'Basonce lists new altcoins with up to 2,600% 24h gains across the BNC ecosystem',
  'AI Trading Bot rolls out smarter risk controls for spot and futures strategies',
  'Cloud Mining adds higher daily yields for VIP members this season',
  'Basonce Alpha season hunt: discover early-stage tokens before they trend',
];

const TABS = ['Popular', 'New Listing', 'Top Gainers'] as const;

export default function DesktopHome({ user, onNavigate, onAuth, onDeposit }: DesktopHomeProps) {
  const { markets } = useMarkets();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Popular');
  const users = useCountUp(103453069);

  const list = (() => {
    const real = markets.filter(m => m.price > 0);
    if (tab === 'Top Gainers') return [...real].sort((a, b) => b.change24h - a.change24h).slice(0, 6);
    if (tab === 'New Listing') return [...real].slice(0, 6).reverse();
    return real.slice(0, 6);
  })();

  return (
    <div className="bg-[#0B0E11]">
      {/* HERO */}
      <section className="max-w-[1600px] mx-auto px-6 pt-14 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#1E2329] border border-[#2B3139] rounded-full px-3.5 py-1.5 mb-6">
            <ShieldCheck className="w-4 h-4 text-[#F0B90B]" />
            <span className="text-[#F0B90B] text-xs font-semibold tracking-wide">Institutional-grade security · 350+ assets</span>
          </div>

          <h1 className="text-white font-bold text-5xl xl:text-[3.7rem] leading-[1.08] tracking-tight capitalize">
            Where the world
            <br />
            trades <span className="bg-gradient-to-r from-[#F0B90B] to-[#FCD535] bg-clip-text text-transparent">digital assets</span>
          </h1>
          <p className="text-[#B7BDC6] text-lg mt-5 max-w-xl leading-relaxed capitalize">
            Buy, sell and grow your portfolio across hundreds of cryptocurrencies — on the exchange millions trust every day.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl">
            <div className="bg-[#181A20] border border-[#2B3139] rounded-xl px-4 py-3.5">
              <div className="text-[#F0B90B] font-bold text-xl xl:text-2xl tabular-nums leading-tight">{users.toLocaleString('en-US')}</div>
              <div className="text-[#848E9C] text-xs mt-1">Registered users</div>
            </div>
            <div className="bg-[#181A20] border border-[#2B3139] rounded-xl px-4 py-3.5">
              <div className="text-[#F0B90B] font-bold text-xl xl:text-2xl leading-tight">No.1</div>
              <div className="text-[#848E9C] text-xs mt-1">Trading volume</div>
            </div>
            <div className="bg-[#181A20] border border-[#2B3139] rounded-xl px-4 py-3.5">
              <div className="text-[#F0B90B] font-bold text-xl xl:text-2xl leading-tight">350+</div>
              <div className="text-[#848E9C] text-xs mt-1">Listed assets</div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
            {user ? (
              <button
                onClick={onDeposit}
                className="flex items-center justify-center gap-2 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold px-8 py-3.5 rounded-lg transition-colors"
              >
                Deposit Now <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Email/Phone number"
                  className="flex-1 bg-[#1E2329] border border-[#2B3139] rounded-lg px-4 py-3.5 text-sm text-white placeholder-[#5E6673] outline-none focus:border-[#F0B90B] transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && onAuth('register')}
                />
                <button
                  onClick={() => onAuth('register')}
                  className="bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold px-8 py-3.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: market preview card */}
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-6 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-5">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                    tab === t ? 'text-white border-[#F0B90B]' : 'text-[#848E9C] border-transparent hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => onNavigate('markets')} className="text-[#848E9C] text-xs hover:text-[#F0B90B]">View All 350+ Coins ›</button>
          </div>

          <div className="space-y-1">
            {list.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-[#1E2329] animate-pulse" />
              ))
            ) : (
              list.map((m) => (
                <button
                  key={m.symbol}
                  onClick={() => { localStorage.setItem('selectedCoinSymbol', m.symbol); onNavigate('trade'); }}
                  className="w-full flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-[#1E2329] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8"><CoinLogo symbol={m.symbol} dbUrl={m.logo} /></div>
                    <div className="text-left">
                      <span className="text-white font-semibold text-sm">{m.symbol}</span>
                      <span className="text-[#848E9C] text-xs ml-1.5">{m.fullName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-white text-sm font-medium tabular-nums">{formatPriceWithSymbol(m.price)}</span>
                    <span className={`text-sm font-semibold tabular-nums w-20 text-right ${m.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-[#2B3139] mt-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold text-sm">News</span>
              <button onClick={() => onNavigate('markets')} className="text-[#848E9C] text-xs hover:text-[#F0B90B]">View All News ›</button>
            </div>
            <ul className="space-y-2.5">
              {NEWS.map((n, i) => (
                <li key={i} className="text-[#B7BDC6] text-xs leading-relaxed hover:text-white cursor-pointer transition-colors line-clamp-2">{n}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="max-w-[1600px] mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, title: 'Secure Asset Fund', desc: 'Your funds are protected by industry-leading security.' },
            { icon: Zap, title: 'Lightning Fast', desc: 'Execute trades in milliseconds across all markets.' },
            { icon: Globe2, title: '350+ Cryptocurrencies', desc: 'Trade the widest selection of digital assets.' },
            { icon: Headphones, title: '24/7 Support', desc: 'Expert help whenever you need it, day or night.' },
          ].map((f) => (
            <div key={f.title} className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6 hover:border-[#F0B90B]/40 transition-colors">
              <f.icon className="w-8 h-8 text-[#F0B90B] mb-4" />
              <h3 className="text-white font-semibold mb-1.5">{f.title}</h3>
              <p className="text-[#848E9C] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-[1600px] mx-auto px-6 pb-20">
        <div className="rounded-2xl bg-gradient-to-r from-[#1E2329] to-[#181A20] border border-[#2B3139] p-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-white font-bold text-3xl">Start trading in minutes</h2>
            <p className="text-[#848E9C] mt-2">Create an account and make your first trade today.</p>
          </div>
          <button
            onClick={() => (user ? onNavigate('trade') : onAuth('register'))}
            className="bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold px-10 py-4 rounded-lg transition-colors whitespace-nowrap"
          >
            {user ? 'Trade Now' : 'Get Started'}
          </button>
        </div>
      </section>
    </div>
  );
}

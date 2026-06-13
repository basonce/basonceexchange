import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown, Cpu, Activity, Zap, Loader2 } from 'lucide-react';
import CoinLogo from '../../../components/CoinLogo';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';
import { MORE_PAGES } from '../morePagesData';

const ALGO_DATA = [
  { coin: 'BTC', algo: 'SHA256', hashrate: '245.8 EH/s', poolFee: '2.5%', activeWorkers: '1,245,890', revenue: '0.00000185 BTC/TH/s' },
  { coin: 'BCH', algo: 'SHA256', hashrate: '12.4 EH/s', poolFee: '1.5%', activeWorkers: '45,210', revenue: '0.00000042 BCH/TH/s' },
  { coin: 'LTC', algo: 'Scrypt', hashrate: '85.2 TH/s', poolFee: '2.0%', activeWorkers: '124,500', revenue: '0.00015 LTC/GH/s' },
  { coin: 'ETC', algo: 'Scrypt', hashrate: '15.8 TH/s', poolFee: '2.0%', activeWorkers: '68,400', revenue: '0.0025 ETC/GH/s' }
];

export default function MiningPoolPage({ onNavigate }: MorePageProps) {
  const cfg = MORE_PAGES['miningpool'];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [txid, setTxid] = useState('');
  const [accelStatus, setAccelStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const accelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (accelTimer.current) clearTimeout(accelTimer.current);
  }, []);

  const checkTxStatus = () => {
    if (!txid.trim() || txid.length < 10) {
      setAccelStatus('error');
      return;
    }
    setAccelStatus('loading');
    if (accelTimer.current) clearTimeout(accelTimer.current);
    accelTimer.current = setTimeout(() => {
      setAccelStatus('success');
    }, 1200);
  };

  if (!cfg) return null;
  const HeroIcon = cfg.icon;

  return (
    <div className="bg-[#0B0E11] min-h-screen pb-24 text-[#EAECEF] font-sans selection:bg-[#F0B90B] selection:text-black">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B0E11] pt-24 pb-24 border-b border-[#1E2329]">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'linear-gradient(#2B3139 1px, transparent 1px), linear-gradient(90deg, #2B3139 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at top, black 20%, transparent 70%)'
          }}
        />
        
        <div className="max-w-[1200px] mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#2B3139]/50 border border-[#2B3139] text-[#F0B90B] text-xs font-bold uppercase tracking-wider mb-6">
              <HeroIcon className="w-4 h-4" />
              {cfg.eyebrow}
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white mb-6 uppercase">
              {cfg.title} <br />
              <span className="text-[#F0B90B]">{cfg.titleAccent}</span>
            </h1>
            
            <p className="text-[#848E9C] text-lg leading-relaxed mb-10 max-w-lg">
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

          {/* Hero Visual: Mining Dashboard Mock */}
          <div className="relative border border-[#2B3139] rounded-2xl bg-[#181A20] p-6 shadow-2xl shadow-black/50 overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#2B3139] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#0ECB81]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#848E9C] uppercase tracking-wider">Total Hashrate</div>
                  <div className="text-xl font-bold text-white tabular-nums">245.82 EH/s</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#848E9C] uppercase tracking-wider mb-1">Network Status</div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0ECB81]/10 text-[#0ECB81] text-xs font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                  Stable (99.99%)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#1E2329] rounded-xl p-4 border border-[#2B3139]">
                <div className="text-xs text-[#848E9C] mb-1">Active Workers</div>
                <div className="text-2xl font-bold text-white tabular-nums">1,245,890</div>
                <div className="text-xs text-[#0ECB81] mt-1">+12,450 today</div>
              </div>
              <div className="bg-[#1E2329] rounded-xl p-4 border border-[#2B3139]">
                <div className="text-xs text-[#848E9C] mb-1">BTC Block Reward</div>
                <div className="text-2xl font-bold text-[#F0B90B] tabular-nums">3.125</div>
                <div className="text-xs text-[#848E9C] mt-1">Next halving: ~4 yrs</div>
              </div>
            </div>

            {/* Fake hashrate chart */}
            <div className="h-24 flex items-end gap-1 px-1">
              {[40, 55, 45, 60, 50, 70, 65, 80, 75, 90, 85, 95].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-[#F0B90B]/20 rounded-t-sm hover:bg-[#F0B90B] transition-colors"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Algorithms Table */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Supported Coins</h2>
            <p className="text-[#848E9C]">Mine top proof-of-work coins with optimized FPPS payouts.</p>
          </div>
          <button onClick={openAuthRegister} className="px-5 py-2.5 bg-[#2B3139] hover:bg-[#323942] text-white font-semibold rounded-lg transition-colors flex items-center gap-2 self-start md:self-auto">
            <Cpu className="w-4 h-4" />
            Connect Worker
          </button>
        </div>

        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#848E9C] uppercase bg-[#1E2329]/50 border-b border-[#2B3139]">
              <tr>
                <th className="px-6 py-4 font-semibold">Coin</th>
                <th className="px-6 py-4 font-semibold">Algorithm</th>
                <th className="px-6 py-4 font-semibold">Pool Hashrate</th>
                <th className="px-6 py-4 font-semibold">Active Workers</th>
                <th className="px-6 py-4 font-semibold">Est. Daily Revenue</th>
                <th className="px-6 py-4 font-semibold text-right">Pool Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B3139]">
              {ALGO_DATA.map((row, i) => (
                <tr key={i} className="hover:bg-[#1E2329]/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                        <CoinLogo symbol={row.coin} />
                      </div>
                      <span className="font-bold text-white">{row.coin}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#848E9C] font-mono">{row.algo}</td>
                  <td className="px-6 py-4 font-semibold text-white tabular-nums">{row.hashrate}</td>
                  <td className="px-6 py-4 text-[#848E9C] tabular-nums">{row.activeWorkers}</td>
                  <td className="px-6 py-4 font-mono text-[#0ECB81]">{row.revenue}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-block px-2 py-1 rounded bg-[#2B3139] text-[#EAECEF] font-bold">
                      {row.poolFee}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Transaction Accelerator Promo */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="bg-gradient-to-br from-[#1E2329] to-[#0B0E11] border border-[#2B3139] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#F0B90B]/10 text-[#F0B90B] text-xs font-bold uppercase tracking-wider mb-4">
              <Zap className="w-4 h-4" /> Tool
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">BTC Transaction Accelerator</h2>
            <p className="text-[#848E9C] mb-8 max-w-md">
              Got a stuck Bitcoin transaction? Use our mining pool's hash power to accelerate your unconfirmed transactions regardless of the fee paid.
            </p>
            <button onClick={openAuthRegister} className="px-6 py-3 bg-[#2B3139] hover:bg-[#323942] text-white font-bold rounded-lg transition-colors border border-[#5E6673]">
              Accelerate Transaction
            </button>
          </div>
          <div className="w-full md:w-[400px] bg-[#181A20] rounded-xl border border-[#2B3139] p-6 shadow-xl">
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#848E9C] uppercase mb-2">TXID</label>
              <input 
                type="text" 
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="Enter Bitcoin transaction ID..." 
                className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#F0B90B] transition-colors" 
              />
            </div>
            {accelStatus === 'error' && (
              <div className="text-xs text-[#F6465D] mb-4">Enter a valid transaction ID</div>
            )}
            {accelStatus === 'success' && (
              <div className="bg-[#0ECB81]/10 text-[#0ECB81] text-xs p-3 rounded-lg border border-[#0ECB81]/20 mb-4">
                Transaction found - current priority: Normal - estimated confirmation ~12 min
              </div>
            )}
            <button 
              onClick={checkTxStatus}
              disabled={accelStatus === 'loading'}
              className="w-full py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {accelStatus === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
              ) : 'Check Status'}
            </button>
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

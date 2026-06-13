import { useState } from 'react';
import { Gem, Zap, ShieldCheck, Activity, Wallet, ArrowUpRight } from 'lucide-react';
import HomeBDexList from '../../components/HomeBDexList';
import BDexTradePage, { type BDexToken } from '../../pages/BDexTradePage';

type PageProps = {
  user?: any;
  onAuth?: (m: 'login' | 'register') => void;
  onDeposit?: () => void;
  onNavigate?: (t: any) => void;
};

const FEATURES: { icon: typeof Gem; title: string; desc: string }[] = [
  {
    icon: Activity,
    title: 'Live On-Chain Prices',
    desc: 'Real-time pool data sourced directly from GeckoTerminal on the BNB Smart Chain.',
  },
  {
    icon: Zap,
    title: 'High-Volume Pairs',
    desc: 'Trade the most liquid BSC tokens with professional candlestick charts and depth.',
  },
  {
    icon: ShieldCheck,
    title: 'Perpetual Leverage',
    desc: 'Open long or short positions up to 50x with transparent fees and liquidation pricing.',
  },
];

export default function DesktopDex({ user, onDeposit }: PageProps) {
  const [selectedToken, setSelectedToken] = useState<BDexToken | null>(null);

  if (selectedToken) {
    return (
      <BDexTradePage
        token={selectedToken}
        userId={user?.id ?? null}
        onBack={() => setSelectedToken(null)}
      />
    );
  }

  return (
    <div className="bg-[#0B0E11] min-h-screen text-white">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* ── Title block ── */}
        <div className="flex items-start justify-between gap-6 mb-6 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#181A20] border border-[#2B3139] flex items-center justify-center flex-shrink-0">
                <Gem size={20} className="text-[#F0B90B]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight truncate">DEX · On-Chain Trading</h1>
                <p className="text-sm text-[#848E9C]">
                  Trade high-volume BNB Smart Chain tokens with live pool data
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#181A20] border border-[#2B3139]">
              <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
              <span className="text-xs font-semibold text-[#0ECB81]">LIVE</span>
              <span className="text-xs text-[#848E9C]">BSC Chain</span>
            </div>
            <button
              onClick={() => onDeposit?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-semibold transition-colors"
            >
              <Wallet size={16} />
              Deposit
            </button>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-[1fr_360px] gap-6 items-start">
          {/* Pool / pair discovery list */}
          <div className="bg-[#181A20] border border-[#2B3139] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B3139]">
              <h2 className="text-base font-semibold">Markets</h2>
              <span className="text-xs text-[#848E9C]">Click a pair to open the trading terminal</span>
            </div>
            <HomeBDexList onSelectToken={(t) => setSelectedToken(t)} />
          </div>

          {/* Side info / features */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#181A20] border border-[#2B3139] rounded-lg p-5">
              <h2 className="text-base font-semibold mb-1">On-Chain DEX</h2>
              <p className="text-sm text-[#848E9C] leading-relaxed">
                Access decentralized BSC liquidity from a single professional interface. Live charts,
                synthetic order book and perpetual trading — powered by real-time market data.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="bg-[#181A20] border border-[#2B3139] rounded-lg p-4 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-[#F0B90B]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{f.title}</div>
                      <div className="text-xs text-[#848E9C] leading-relaxed mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-br from-[#1E2026] to-[#181A20] border border-[#2B3139] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight size={18} className="text-[#0ECB81]" />
                <span className="text-sm font-semibold text-white">Start trading on-chain</span>
              </div>
              <p className="text-xs text-[#848E9C] leading-relaxed mb-3">
                Select any market from the list to launch the full trading terminal with live chart,
                order book and a long / short panel.
              </p>
              {!user && (
                <p className="text-xs text-[#F0B90B]">Log in and deposit USDT to place perpetual orders.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

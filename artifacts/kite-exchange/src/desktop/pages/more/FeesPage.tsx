import { useState } from 'react';
import {
  Receipt,
  TrendingDown,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgePercent,
  Wallet,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

type Market = 'spot' | 'futures';

const SPOT_TIERS = [
  { tier: 'Regular', vol: '< 1M', bnc: '≥ 0', maker: '0.1000', taker: '0.1000' },
  { tier: 'VIP 1', vol: '≥ 1M', bnc: '≥ 25', maker: '0.0900', taker: '0.1000' },
  { tier: 'VIP 2', vol: '≥ 5M', bnc: '≥ 100', maker: '0.0800', taker: '0.1000' },
  { tier: 'VIP 3', vol: '≥ 20M', bnc: '≥ 250', maker: '0.0420', taker: '0.0600' },
  { tier: 'VIP 4', vol: '≥ 100M', bnc: '≥ 500', maker: '0.0420', taker: '0.0540' },
  { tier: 'VIP 5', vol: '≥ 150M', bnc: '≥ 1,000', maker: '0.0360', taker: '0.0480' },
  { tier: 'VIP 6', vol: '≥ 400M', bnc: '≥ 1,750', maker: '0.0300', taker: '0.0420' },
  { tier: 'VIP 7', vol: '≥ 800M', bnc: '≥ 3,000', maker: '0.0210', taker: '0.0360' },
  { tier: 'VIP 8', vol: '≥ 2B', bnc: '≥ 4,500', maker: '0.0150', taker: '0.0300' },
  { tier: 'VIP 9', vol: '≥ 4B', bnc: '≥ 5,500', maker: '0.0120', taker: '0.0240' },
];

const FUTURES_TIERS = [
  { tier: 'Regular', vol: '< 15M', bnc: '≥ 0', maker: '0.0200', taker: '0.0500' },
  { tier: 'VIP 1', vol: '≥ 15M', bnc: '≥ 25', maker: '0.0160', taker: '0.0400' },
  { tier: 'VIP 2', vol: '≥ 50M', bnc: '≥ 100', maker: '0.0140', taker: '0.0350' },
  { tier: 'VIP 3', vol: '≥ 100M', bnc: '≥ 250', maker: '0.0120', taker: '0.0320' },
  { tier: 'VIP 4', vol: '≥ 600M', bnc: '≥ 500', maker: '0.0100', taker: '0.0300' },
  { tier: 'VIP 5', vol: '≥ 1B', bnc: '≥ 1,000', maker: '0.0080', taker: '0.0270' },
  { tier: 'VIP 6', vol: '≥ 2.5B', bnc: '≥ 1,750', maker: '0.0060', taker: '0.0250' },
  { tier: 'VIP 7', vol: '≥ 5B', bnc: '≥ 3,000', maker: '0.0040', taker: '0.0220' },
  { tier: 'VIP 8', vol: '≥ 12.5B', bnc: '≥ 4,500', maker: '0.0020', taker: '0.0200' },
  { tier: 'VIP 9', vol: '≥ 25B', bnc: '≥ 5,500', maker: '0.0000', taker: '0.0170' },
];

const WITHDRAWALS = [
  { asset: 'BTC', network: 'Bitcoin', fee: '0.00002', min: '0.0005' },
  { asset: 'ETH', network: 'ERC-20', fee: '0.00120', min: '0.0100' },
  { asset: 'USDT', network: 'TRC-20', fee: '1.00000', min: '10.000' },
  { asset: 'USDT', network: 'ERC-20', fee: '3.20000', min: '10.000' },
  { asset: 'SOL', network: 'Solana', fee: '0.00100', min: '0.0500' },
  { asset: 'BNC', network: 'BSC', fee: '0.00500', min: '0.1000' },
];

export default function FeesPage({ onNavigate }: MorePageProps) {
  const [market, setMarket] = useState<Market>('spot');
  const rows = market === 'spot' ? SPOT_TIERS : FUTURES_TIERS;

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans selection:bg-[#F0B90B] selection:text-black">
      {/* Hero — compact, schedule oriented */}
      <section className="relative pt-24 pb-16 border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-xs font-semibold tracking-wider uppercase mb-6">
            <Receipt className="w-4 h-4" />
            Fee Schedule
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
            Transparent, <span className="text-[#F0B90B]">tier-based</span> trading fees
          </h1>
          <p className="mt-5 text-lg text-[#848E9C] leading-relaxed max-w-2xl">
            The more you trade and the more BNC you hold, the lower your costs.
            No hidden charges, no deposit fees, and an extra 25% discount when fees
            are paid in BNC.
          </p>
          <div className="mt-8 grid sm:grid-cols-3 gap-4 max-w-3xl">
            {[
              { label: 'Lowest maker fee', value: '0.0000%' },
              { label: 'BNC fee discount', value: '25%' },
              { label: 'Deposit fee', value: '0.00%' },
            ].map((s) => (
              <div key={s.label} className="bg-[#181A20] border border-[#2B3139] rounded-lg p-5">
                <div className="text-2xl font-bold text-[#F0B90B] tabular-nums whitespace-nowrap">{s.value}</div>
                <div className="text-sm text-[#848E9C] mt-1 truncate min-w-0">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VIP tier table */}
      <section className="py-16 bg-[#0d1014]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">VIP fee tiers</h2>
              <p className="text-[#848E9C] text-sm max-w-xl">Levels are reviewed daily based on 30-day trailing volume or average BNC balance — whichever is higher.</p>
            </div>
            <div className="inline-flex rounded-lg border border-[#2B3139] bg-[#181A20] p-1">
              {(['spot', 'futures'] as Market[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className={`px-6 py-2.5 rounded text-sm font-semibold capitalize transition-colors ${market === m ? 'bg-[#F0B90B] text-black' : 'text-[#B7BDC6] hover:text-white'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#2B3139]">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="bg-[#181A20] text-[#848E9C] text-left">
                  <th className="px-5 py-4 font-medium">Tier</th>
                  <th className="px-5 py-4 font-medium text-right">30d Volume (USDT)</th>
                  <th className="px-5 py-4 font-medium text-right">BNC Balance</th>
                  <th className="px-5 py-4 font-medium text-right">Maker</th>
                  <th className="px-5 py-4 font-medium text-right">Taker</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.tier} className={`border-t border-[#2B3139] ${i % 2 ? 'bg-[#0d1014]' : 'bg-[#0B0E11]'} hover:bg-[#181A20] transition-colors`}>
                    <td className="px-5 py-4 font-semibold text-[#EAECEF] whitespace-nowrap">{r.tier}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{r.vol}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{r.bnc}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#0ECB81]">{r.maker}%</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#EAECEF]">{r.taker}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#848E9C] mt-4 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            Futures rates apply to USDⓈ-M perpetual contracts. Maker rebates may apply to qualifying liquidity providers at VIP 9.
          </p>
        </div>
      </section>

      {/* Discount explainer cards */}
      <section className="py-16 bg-[#0B0E11] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">How to lower your fees</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Coins, t: 'Pay fees with BNC', d: 'Toggle "Pay with BNC" in settings for an automatic 25% discount on every spot and margin trade.' },
              { icon: TrendingDown, t: 'Climb the VIP ladder', d: 'Higher 30-day volume unlocks progressively lower maker and taker rates, recalculated every day.' },
              { icon: BadgePercent, t: 'Referral rebates', d: 'Earn a share of the trading fees generated by users you refer, credited daily to your spot wallet.' },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.t} className="bg-[#181A20] border border-[#2B3139] rounded-lg p-7 hover:border-[#F0B90B]/50 transition-colors">
                  <div className="w-11 h-11 rounded bg-[#2B3139] flex items-center justify-center text-[#F0B90B] mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{c.t}</h3>
                  <p className="text-[#848E9C] text-sm leading-relaxed">{c.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Deposit / Withdrawal */}
      <section className="py-16 bg-[#0d1014] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold">Deposits & withdrawals</h2>
            <div className="bg-[#181A20] border border-[#2B3139] rounded-lg p-5 flex items-start gap-3">
              <ArrowDownToLine className="w-5 h-5 text-[#0ECB81] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Crypto deposits</div>
                <p className="text-sm text-[#848E9C]">Free across every supported network. Basonce does not charge a deposit fee.</p>
              </div>
            </div>
            <div className="bg-[#181A20] border border-[#2B3139] rounded-lg p-5 flex items-start gap-3">
              <ArrowUpFromLine className="w-5 h-5 text-[#F0B90B] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Withdrawals</div>
                <p className="text-sm text-[#848E9C]">A flat network fee covers on-chain gas only — Basonce adds no markup.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 overflow-x-auto rounded-lg border border-[#2B3139]">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-[#181A20] text-[#848E9C] text-left">
                  <th className="px-5 py-4 font-medium">Asset</th>
                  <th className="px-5 py-4 font-medium">Network</th>
                  <th className="px-5 py-4 font-medium text-right">Withdrawal fee</th>
                  <th className="px-5 py-4 font-medium text-right">Minimum</th>
                </tr>
              </thead>
              <tbody>
                {WITHDRAWALS.map((w, i) => (
                  <tr key={`${w.asset}-${w.network}`} className={`border-t border-[#2B3139] ${i % 2 ? 'bg-[#0d1014]' : 'bg-[#0B0E11]'}`}>
                    <td className="px-5 py-4 font-semibold text-[#EAECEF] whitespace-nowrap">{w.asset}</td>
                    <td className="px-5 py-4 text-[#B7BDC6] whitespace-nowrap">{w.network}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{w.fee}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#848E9C]">{w.min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Worked example */}
      <section className="py-16 bg-[#0B0E11] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="bg-[#181A20] border border-[#2B3139] rounded-lg p-8 flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-12 h-12 rounded bg-[#2B3139] flex items-center justify-center text-[#F0B90B] shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mb-3">Worked example</h2>
              <p className="text-[#848E9C] leading-relaxed mb-6 max-w-2xl">
                A VIP 1 trader buys 10,000 USDT of BTC as a taker. At 0.1000% the base
                fee is 10.00 USDT. Enabling "Pay with BNC" applies a 25% discount,
                reducing the cost to just 7.50 USDT.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 max-w-xl">
                {[
                  { l: 'Order size', v: '10,000.00' },
                  { l: 'Base fee', v: '10.00' },
                  { l: 'With BNC', v: '7.50' },
                ].map((x) => (
                  <div key={x.l} className="bg-[#0d1014] border border-[#2B3139] rounded p-4">
                    <div className="text-xl font-bold tabular-nums whitespace-nowrap text-[#EAECEF]">{x.v}</div>
                    <div className="text-xs text-[#848E9C] mt-1 truncate min-w-0">{x.l} (USDT)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#0d1014] text-center border-t border-[#2B3139]">
        <div className="max-w-[760px] mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">Start trading at the lowest fees</h2>
          <p className="text-lg text-[#848E9C] mb-8">Open an account and unlock VIP pricing as your volume grows.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={openAuthRegister} className="px-9 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded text-lg transition-colors flex items-center gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigate('vip')} className="px-9 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-semibold rounded text-lg transition-colors">
              View VIP Program
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

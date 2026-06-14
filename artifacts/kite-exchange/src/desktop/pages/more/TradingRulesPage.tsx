import { useState } from 'react';
import {
  Scale,
  ChevronDown,
  Clock,
  Gauge,
  ListOrdered,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const SPECS = [
  { symbol: 'BTCUSDT', tick: '0.10', minOrder: '0.00001', maxLev: '125x', step: '0.00001' },
  { symbol: 'ETHUSDT', tick: '0.01', minOrder: '0.0001', maxLev: '100x', step: '0.0001' },
  { symbol: 'SOLUSDT', tick: '0.001', minOrder: '0.01', maxLev: '50x', step: '0.01' },
  { symbol: 'BNCUSDT', tick: '0.0010', minOrder: '0.10', maxLev: '50x', step: '0.10' },
  { symbol: 'XRPUSDT', tick: '0.0001', minOrder: '1.0', maxLev: '75x', step: '1.0' },
  { symbol: 'DOGEUSDT', tick: '0.00001', minOrder: '10.0', maxLev: '50x', step: '10.0' },
];

const ORDER_TYPES = [
  { name: 'Limit', desc: 'Execute at a specified price or better. Rests on the book until matched.' },
  { name: 'Market', desc: 'Execute immediately against the best available liquidity.' },
  { name: 'Stop-Limit', desc: 'A limit order triggered once the stop price is reached.' },
  { name: 'Stop-Market', desc: 'A market order triggered once the stop price is reached.' },
  { name: 'Trailing Stop', desc: 'A stop that follows favourable price moves by a set callback rate.' },
  { name: 'Post-Only', desc: 'Guarantees a maker order; rejected if it would take liquidity.' },
];

const SESSIONS = [
  { market: 'Spot', hours: '24 / 7', settle: 'Continuous', halt: 'None' },
  { market: 'USDⓈ-M Futures', hours: '24 / 7', settle: 'Perpetual', halt: 'Circuit breaker' },
  { market: 'Coin-M Futures', hours: '24 / 7', settle: 'Quarterly', halt: 'Circuit breaker' },
  { market: 'Options', hours: '24 / 7', settle: 'Daily 08:00 UTC', halt: 'Vol-based' },
];

const POLICY = [
  { q: 'Wash trading', a: 'Placing offsetting orders that result in no change of beneficial ownership is strictly prohibited. Detected wash trades are voided and may lead to account restriction.' },
  { q: 'Spoofing & layering', a: 'Entering orders with the intent to cancel before execution to create a false impression of demand or supply is forbidden under our market-integrity policy.' },
  { q: 'Self-trade prevention', a: 'The matching engine automatically prevents a user’s own buy and sell orders from executing against each other using configurable STP modes.' },
  { q: 'Front-running', a: 'Using non-public information about pending orders to trade ahead of clients or the market is a serious violation and is reported to regulators where applicable.' },
  { q: 'Price manipulation', a: 'Coordinated activity intended to artificially move a market price — including pump-and-dump schemes — results in immediate investigation and possible permanent suspension.' },
];

export default function TradingRulesPage({ onNavigate }: MorePageProps) {
  const [openPolicy, setOpenPolicy] = useState<number | null>(0);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans selection:bg-[#F0B90B] selection:text-black">
      {/* Hero — document / spec sheet feel */}
      <section className="relative pt-24 pb-16 border-b border-[#2B3139] bg-[#000]">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(90deg, #2B3139 1px, transparent 1px)', backgroundSize: '60px 100%' }} />
        <div className="relative z-10 max-w-[1200px] mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#181A20] border border-[#2B3139] text-[#F0B90B] text-xs font-semibold tracking-wider uppercase mb-6">
            <Scale className="w-4 h-4" />
            Trading Rules & Specifications
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
            Clear rules for a <span className="text-[#F0B90B]">fair, orderly</span> market
          </h1>
          <p className="mt-5 text-lg text-[#848E9C] leading-relaxed max-w-2xl">
            Contract specifications, supported order types, price-protection mechanisms
            and the market-integrity policies that keep Basonce markets transparent for
            every participant.
          </p>
          <div className="mt-7 text-sm text-[#848E9C]">Effective: 12 January 2026 · Version 4.2</div>
        </div>
      </section>

      {/* Contract specs table */}
      <section className="py-16 bg-[#0B0E11]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <Gauge className="w-6 h-6 text-[#F0B90B]" />
            <h2 className="text-2xl font-bold">Contract specifications</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#2B3139]">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="bg-[#181A20] text-[#848E9C] text-left">
                  <th className="px-5 py-4 font-medium">Symbol</th>
                  <th className="px-5 py-4 font-medium text-right">Tick size</th>
                  <th className="px-5 py-4 font-medium text-right">Min order</th>
                  <th className="px-5 py-4 font-medium text-right">Step size</th>
                  <th className="px-5 py-4 font-medium text-right">Max leverage</th>
                </tr>
              </thead>
              <tbody>
                {SPECS.map((s, i) => (
                  <tr key={s.symbol} className={`border-t border-[#2B3139] ${i % 2 ? 'bg-[#0d1014]' : 'bg-[#0B0E11]'} hover:bg-[#181A20] transition-colors`}>
                    <td className="px-5 py-4 font-semibold text-[#EAECEF] font-mono whitespace-nowrap">{s.symbol}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{s.tick}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{s.minOrder}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#B7BDC6]">{s.step}</td>
                    <td className="px-5 py-4 text-right tabular-nums whitespace-nowrap text-[#F0B90B]">{s.maxLev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Order types reference */}
      <section className="py-16 bg-[#0d1014] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <ListOrdered className="w-6 h-6 text-[#F0B90B]" />
            <h2 className="text-2xl font-bold">Order types reference</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ORDER_TYPES.map((o) => (
              <div key={o.name} className="bg-[#181A20] border border-[#2B3139] rounded-lg p-6 hover:border-[#F0B90B]/40 transition-colors">
                <div className="text-base font-semibold text-[#F0B90B] mb-2">{o.name}</div>
                <p className="text-sm text-[#848E9C] leading-relaxed">{o.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price limits & liquidation */}
      <section className="py-16 bg-[#0B0E11] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-6">
          <div className="bg-[#181A20] border border-[#2B3139] rounded-lg p-7">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#F0B90B]" />
              Price protection
            </h3>
            <ul className="space-y-4 text-sm text-[#B7BDC6] leading-relaxed">
              <li><span className="text-[#EAECEF] font-medium">Price bands.</span> Orders priced beyond ±5% of the mark price for spot, or the contract’s dynamic band for futures, are rejected to prevent fat-finger errors.</li>
              <li><span className="text-[#EAECEF] font-medium">Mark price.</span> Liquidations and unrealised PnL use an index-anchored mark price, not the last traded price, to resist single-venue spikes.</li>
              <li><span className="text-[#EAECEF] font-medium">Circuit breakers.</span> Extreme volatility may trigger a brief matching pause, after which trading resumes in an auction phase.</li>
            </ul>
          </div>
          <div className="bg-[#181A20] border border-[#2B3139] rounded-lg p-7">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#F6465D]" />
              Liquidation rules
            </h3>
            <ul className="space-y-4 text-sm text-[#B7BDC6] leading-relaxed">
              <li><span className="text-[#EAECEF] font-medium">Maintenance margin.</span> Positions are liquidated when account equity falls below the tiered maintenance-margin requirement.</li>
              <li><span className="text-[#EAECEF] font-medium">Partial close.</span> Large positions are reduced in steps to minimise market impact before full liquidation occurs.</li>
              <li><span className="text-[#EAECEF] font-medium">Insurance fund.</span> Residual losses are absorbed by the insurance fund; auto-deleveraging applies only in extreme conditions.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Market hours / sessions */}
      <section className="py-16 bg-[#0d1014] border-t border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <Clock className="w-6 h-6 text-[#F0B90B]" />
            <h2 className="text-2xl font-bold">Market hours & settlement</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#2B3139]">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-[#181A20] text-[#848E9C] text-left">
                  <th className="px-5 py-4 font-medium">Market</th>
                  <th className="px-5 py-4 font-medium">Trading hours</th>
                  <th className="px-5 py-4 font-medium">Settlement</th>
                  <th className="px-5 py-4 font-medium">Halts</th>
                </tr>
              </thead>
              <tbody>
                {SESSIONS.map((s, i) => (
                  <tr key={s.market} className={`border-t border-[#2B3139] ${i % 2 ? 'bg-[#0d1014]' : 'bg-[#0B0E11]'}`}>
                    <td className="px-5 py-4 font-semibold text-[#EAECEF] whitespace-nowrap">{s.market}</td>
                    <td className="px-5 py-4 text-[#B7BDC6] tabular-nums whitespace-nowrap">{s.hours}</td>
                    <td className="px-5 py-4 text-[#B7BDC6] whitespace-nowrap">{s.settle}</td>
                    <td className="px-5 py-4 text-[#B7BDC6] whitespace-nowrap">{s.halt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Anti-manipulation accordion */}
      <section className="py-16 bg-[#0B0E11] border-t border-[#2B3139]">
        <div className="max-w-[860px] mx-auto px-6">
          <h2 className="text-2xl font-bold mb-3 text-center">Anti-manipulation policy</h2>
          <p className="text-[#848E9C] text-center mb-10 max-w-xl mx-auto">Basonce operates a dedicated market-surveillance team and automated detection across every order book.</p>
          <div className="space-y-3">
            {POLICY.map((p, i) => (
              <div key={p.q} className="bg-[#181A20] border border-[#2B3139] rounded-lg">
                <button
                  onClick={() => setOpenPolicy(openPolicy === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium">{p.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#848E9C] transition-transform shrink-0 ${openPolicy === i ? 'rotate-180' : ''}`} />
                </button>
                {openPolicy === i && (
                  <div className="px-5 pb-5 text-sm text-[#848E9C] leading-relaxed border-t border-[#2B3139] pt-4">
                    {p.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#0d1014] text-center border-t border-[#2B3139]">
        <div className="max-w-[760px] mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">Trade with confidence</h2>
          <p className="text-lg text-[#848E9C] mb-8">Markets governed by clear rules and enforced by real-time surveillance.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={openAuthRegister} className="px-9 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold rounded text-lg transition-colors flex items-center gap-2">
              Open an Account
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigate('trade')} className="px-9 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-semibold rounded text-lg transition-colors">
              Go to Trading
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

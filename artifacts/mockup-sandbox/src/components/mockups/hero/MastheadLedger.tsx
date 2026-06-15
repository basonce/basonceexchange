import { ShieldCheck, ArrowRight } from 'lucide-react';

const stats = [
  { value: '103,453,069', label: 'Registered users' },
  { value: 'No.1', label: 'Trading volume' },
  { value: '350+', label: 'Listed assets' },
];

export function MastheadLedger() {
  return (
    <div className="min-h-screen w-full bg-[#0B0E11] flex items-center p-12">
      <div className="w-full max-w-[640px]">
        <div className="inline-flex items-center gap-2 bg-[#1E2329] border border-[#2B3139] rounded-full px-3.5 py-1.5 mb-7">
          <ShieldCheck className="w-4 h-4 text-[#F0B90B]" />
          <span className="text-[#F0B90B] text-xs font-semibold tracking-wide">
            Institutional-grade security · 350+ assets
          </span>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F0B90B]" />
          <span className="text-[#848E9C] text-[11px] font-semibold uppercase tracking-[0.32em]">
            Global Digital Asset Exchange
          </span>
        </div>

        <h1 className="text-white font-bold text-5xl leading-[1.08] tracking-tight capitalize">
          Where the world trades{' '}
          <span className="relative inline-block">
            digital assets
            <span className="absolute -bottom-1 left-0 h-[3px] w-full bg-[#F0B90B]" />
          </span>
        </h1>

        <p className="text-[#B7BDC6] text-lg mt-6 max-w-xl leading-relaxed capitalize">
          Buy, sell and grow your portfolio across hundreds of cryptocurrencies — on the exchange millions trust every day.
        </p>

        <div className="mt-9 flex items-stretch">
          {stats.map((s, i) => (
            <div key={s.label} className={`pr-8 ${i !== 0 ? 'pl-8 border-l border-[#2B3139]' : ''}`}>
              <div className="text-white font-bold text-2xl tabular-nums leading-tight">{s.value}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="h-px w-3 bg-[#F0B90B]" />
                <span className="text-[#848E9C] text-xs">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-9 flex gap-3">
          <button className="flex items-center gap-2 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold px-8 py-3.5 rounded-lg transition-colors">
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
          <button className="border border-[#2B3139] hover:border-[#F0B90B]/50 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors">
            Explore Markets
          </button>
        </div>
      </div>
    </div>
  );
}

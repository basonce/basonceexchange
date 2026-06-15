import { ArrowRight } from 'lucide-react';

const stats = [
  { value: '103,453,069', label: 'Registered users' },
  { value: 'No.1', label: 'Trading volume' },
  { value: '350+', label: 'Listed assets' },
];

export function FramedTerminal() {
  return (
    <div className="min-h-screen w-full bg-[#0B0E11] flex items-center p-12">
      <div className="relative w-full max-w-[660px] rounded-lg border border-[#1E2329] bg-[#0E1216]/60 p-10">
        <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#F0B90B]/70" />
        <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[#F0B90B]/70" />
        <span className="absolute left-0 bottom-0 h-6 w-6 border-l-2 border-b-2 border-[#F0B90B]/70" />
        <span className="absolute right-0 bottom-0 h-6 w-6 border-r-2 border-b-2 border-[#F0B90B]/70" />

        <div className="mb-6 font-mono text-[11px] tracking-[0.28em] text-[#5E6673]">
          REGULATED <span className="text-[#2B3139]">/</span> SOC 2 <span className="text-[#2B3139]">/</span> 99.99% UPTIME
        </div>

        <h1 className="text-white font-bold text-[2.9rem] leading-[1.1] tracking-tight capitalize">
          Where the world trades{' '}
          <span className="border-b-[3px] border-[#F0B90B] pb-0.5">digital assets</span>
        </h1>

        <p className="mt-5 text-[#B7BDC6] text-base leading-relaxed capitalize">
          Buy, sell and grow your portfolio across hundreds of cryptocurrencies — on the exchange millions trust every day.
        </p>

        <div className="mt-8 grid grid-cols-3 border-y border-[#1E2329]">
          {stats.map((s, i) => (
            <div key={s.label} className={`py-4 pr-5 ${i !== 0 ? 'pl-5 border-l border-[#1E2329]' : ''}`}>
              <div className="text-[#F0B90B] font-bold text-xl tabular-nums leading-tight">{s.value}</div>
              <div className="mt-1 text-[#848E9C] text-[11px] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        <button className="mt-8 flex items-center gap-2 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-semibold px-8 py-3.5 rounded-lg transition-colors">
          Open Account <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

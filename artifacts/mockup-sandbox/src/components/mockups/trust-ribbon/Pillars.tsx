const items = [
  { value: '1:1', head: 'Proof of', tail: 'Reserves' },
  { value: '$500M', head: 'Insurance', tail: 'Fund' },
  { value: '95%', head: 'Cold', tail: 'Storage' },
  { value: 'SOC 2', head: 'Independently', tail: 'Audited' },
  { value: '99.99%', head: 'Platform', tail: 'Uptime' },
];

export function Pillars() {
  return (
    <div className="min-h-screen w-full bg-[#0B0E11] flex items-center justify-center p-10">
      <div className="grid w-full max-w-[1200px] grid-cols-5 gap-px bg-[#1E2329] border border-[#1E2329] rounded-lg overflow-hidden">
        {items.map((it, i) => (
          <div key={it.tail} className="group relative overflow-hidden bg-[#0B0E11] px-7 pt-11 pb-8">
            <span className="pointer-events-none absolute -top-4 right-2 select-none text-7xl font-bold leading-none text-[#F0B90B]/[0.06]">
              0{i + 1}
            </span>
            <span className="absolute left-0 top-0 h-full w-[2px] bg-[#F0B90B]/30 transition-colors group-hover:bg-[#F0B90B]" />
            <div className="relative">
              <div className="text-[#F0B90B] font-bold text-[1.9rem] leading-none tabular-nums">{it.value}</div>
              <div className="mt-3.5 text-white text-sm font-medium leading-tight">{it.head}</div>
              <div className="text-[#848E9C] text-sm leading-tight">{it.tail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

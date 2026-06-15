const items = [
  { value: '1:1', label: 'Proof of Reserves' },
  { value: '$500M', label: 'Insurance Fund' },
  { value: '95%', label: 'Cold Storage' },
  { value: 'SOC 2', label: 'Independently Audited' },
  { value: '99.99%', label: 'Platform Uptime' },
];

export function VaultLedger() {
  return (
    <div className="min-h-screen w-full bg-[#0B0E11] flex items-center justify-center p-10">
      <div className="relative w-full max-w-[1200px] px-12 py-14">
        <span className="absolute left-0 top-0 h-7 w-7 border-l-2 border-t-2 border-[#F0B90B]/70" />
        <span className="absolute right-0 top-0 h-7 w-7 border-r-2 border-t-2 border-[#F0B90B]/70" />
        <span className="absolute left-0 bottom-0 h-7 w-7 border-l-2 border-b-2 border-[#F0B90B]/70" />
        <span className="absolute right-0 bottom-0 h-7 w-7 border-r-2 border-b-2 border-[#F0B90B]/70" />

        <div className="flex items-center justify-center gap-4 mb-11">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#F0B90B]/60" />
          <span className="text-[#F0B90B] text-[11px] font-semibold uppercase tracking-[0.35em]">
            Proof &amp; Transparency
          </span>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#F0B90B]/60" />
        </div>

        <div className="grid grid-cols-5">
          {items.map((it, i) => (
            <div
              key={it.label}
              className={`flex flex-col items-center text-center px-4 ${i !== 0 ? 'border-l border-[#2B3139]' : ''}`}
            >
              <div className="text-white font-serif text-[2.6rem] leading-none tracking-tight tabular-nums">
                {it.value}
              </div>
              <span className="mt-4 h-px w-8 bg-[#F0B90B]" />
              <div className="mt-4 text-[#848E9C] text-[11px] uppercase tracking-[0.18em]">{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

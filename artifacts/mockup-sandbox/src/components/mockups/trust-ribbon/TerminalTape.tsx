const items = [
  { value: '1:1', label: 'RESERVES' },
  { value: '$500M', label: 'INSURANCE' },
  { value: '95%', label: 'COLD STORAGE' },
  { value: 'SOC 2', label: 'AUDITED' },
  { value: '99.99%', label: 'UPTIME' },
];

export function TerminalTape() {
  return (
    <div className="min-h-screen w-full bg-[#0B0E11] flex items-center justify-center p-10">
      <div className="w-full max-w-[1200px]">
        <div className="relative overflow-hidden rounded-md border border-[#1E2329] bg-[#0E1216]">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent" />
          <div className="flex items-stretch font-mono">
            <div className="flex items-center gap-2.5 px-5 py-4 bg-[#12161C] border-r border-[#1E2329]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#F0B90B] opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F0B90B]" />
              </span>
              <span className="text-[#F0B90B] text-[11px] font-semibold tracking-[0.3em]">LIVE</span>
            </div>
            <div className="flex flex-1 items-center justify-between px-7">
              {items.map((it, i) => (
                <div key={it.label} className="flex items-center gap-2.5">
                  {i !== 0 && <span className="text-[#2B3139] mr-2.5 select-none">|</span>}
                  <span className="text-[#5E6673] text-[11px] tracking-[0.22em]">{it.label}</span>
                  <span className="text-[#F0B90B] text-sm font-semibold tabular-nums">{it.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

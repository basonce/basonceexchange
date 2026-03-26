import { useState, useEffect, useRef } from 'react';
import { Share2 } from 'lucide-react';

interface TradingDataTabProps {
  symbol: string;
  currentPrice: number;
  volume24h: number;
}

interface OrderFlowEntry {
  buy: number;
  sell: number;
  inflow: number;
}

interface DailyBar {
  date: string;
  value: number;
}

function seededRand(seed: number, n: number): number {
  const x = Math.sin(seed * 9.31 + n * 7.13) * 10000;
  return Math.abs(x - Math.floor(x));
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)} K`;
  return n.toFixed(2);
}

function formatFlowShort(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

function generateFlowData(symbol: string, volume: number) {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = volume > 0 ? volume : 1000000;

  const largeBuy = base * (0.18 + seededRand(seed, 1) * 0.12);
  const largeSell = base * (0.18 + seededRand(seed, 2) * 0.12);
  const medBuy = base * (0.28 + seededRand(seed, 3) * 0.15);
  const medSell = base * (0.28 + seededRand(seed, 4) * 0.15);
  const smallBuy = base * (0.15 + seededRand(seed, 5) * 0.1);
  const smallSell = base * (0.15 + seededRand(seed, 6) * 0.1);

  const rows: Record<string, OrderFlowEntry> = {
    Large: { buy: largeBuy, sell: largeSell, inflow: largeBuy - largeSell },
    Medium: { buy: medBuy, sell: medSell, inflow: medBuy - medSell },
    Small: { buy: smallBuy, sell: smallSell, inflow: smallBuy - smallSell },
    Total: {
      buy: largeBuy + medBuy + smallBuy,
      sell: largeSell + medSell + smallSell,
      inflow: (largeBuy - largeSell) + (medBuy - medSell) + (smallBuy - smallSell),
    },
  };
  return rows;
}

function generateDonutSegments(symbol: string, volume: number) {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = volume > 0 ? volume : 1000000;

  const segments = [
    { label: 'Large Buy', value: base * (0.1 + seededRand(seed, 10) * 0.08), isGreen: true },
    { label: 'Med Buy', value: base * (0.18 + seededRand(seed, 11) * 0.08), isGreen: true },
    { label: 'Small Buy', value: base * (0.12 + seededRand(seed, 12) * 0.07), isGreen: true },
    { label: 'Small Sell', value: base * (0.12 + seededRand(seed, 13) * 0.07), isGreen: false },
    { label: 'Med Sell', value: base * (0.18 + seededRand(seed, 14) * 0.08), isGreen: false },
    { label: 'Large Sell', value: base * (0.1 + seededRand(seed, 15) * 0.08), isGreen: false },
  ];

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return segments.map(seg => ({ ...seg, pct: (seg.value / total) * 100 }));
}

interface LsRow { label: string; long: number; }

function initLsData(symbol: string): LsRow[] {
  const seed = symbol.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const s = Math.abs(seed);
  return [
    { label: 'Top Traders (Account)',  long: 52 + (s % 100) * 0.26 },
    { label: 'Top Traders (Position)', long: 46 + (s % 97)  * 0.31 },
    { label: 'All Users',              long: 49 + (s % 89)  * 0.22 },
  ];
}

function generateDailyBars(symbol: string, volume: number): DailyBar[] {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = volume > 0 ? volume * 0.1 : 100000;
  const days: DailyBar[] = [];
  const now = new Date();

  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const r = seededRand(seed, i + 20);
    const sign = r > 0.5 ? 1 : -1;
    const mag = base * (0.3 + r * 1.4);
    days.push({ date: dateStr, value: sign * mag });
  }
  return days;
}

function DonutChart({ segments }: { segments: Array<{ pct: number; isGreen: boolean; label: string }> }) {
  const cx = 80, cy = 80, r = 60, innerR = 36;
  let currentAngle = -Math.PI / 2;
  const paths: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];

  const outerPcts: Array<{ pct: number; label: string; side: 'left' | 'right'; rowIndex: number }> = [
    { pct: segments[0].pct, label: `${segments[0].pct.toFixed(2)}%`, side: 'right', rowIndex: 0 },
    { pct: segments[1].pct, label: `${segments[1].pct.toFixed(2)}%`, side: 'right', rowIndex: 1 },
    { pct: segments[2].pct, label: `${segments[2].pct.toFixed(2)}%`, side: 'right', rowIndex: 2 },
    { pct: segments[3].pct, label: `${segments[3].pct.toFixed(2)}%`, side: 'left', rowIndex: 2 },
    { pct: segments[4].pct, label: `${segments[4].pct.toFixed(2)}%`, side: 'left', rowIndex: 1 },
    { pct: segments[5].pct, label: `${segments[5].pct.toFixed(2)}%`, side: 'left', rowIndex: 0 },
  ];

  segments.forEach((seg, i) => {
    const angle = (seg.pct / 100) * 2 * Math.PI;
    const endAngle = currentAngle + angle;
    const gap = 0.03;
    const startAngle = currentAngle + gap / 2;
    const sweepAngle = angle - gap;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(startAngle + sweepAngle);
    const y2 = cy + r * Math.sin(startAngle + sweepAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(startAngle + sweepAngle);
    const iy2 = cy + innerR * Math.sin(startAngle + sweepAngle);
    const lg = sweepAngle > Math.PI ? 1 : 0;

    const color = seg.isGreen
      ? i === 0 ? '#0ECB81' : i === 1 ? '#0ECB81CC' : '#0ECB8188'
      : i === 3 ? '#F6465D88' : i === 4 ? '#F6465DCC' : '#F6465D';

    paths.push(
      <path
        key={i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${lg} 0 ${ix1} ${iy1} Z`}
        fill={color}
      />
    );
    currentAngle = endAngle;
  });

  return (
    <div className="relative flex items-center justify-center">
      <div className="relative">
        <svg width={160} height={160} viewBox="0 0 160 160">
          {paths}
        </svg>

        <div className="absolute left-[-52px] top-0 h-full flex flex-col justify-around py-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="text-[11px] text-[#F6465D] font-medium text-right whitespace-nowrap">
              {outerPcts[5 - i]?.label}
            </div>
          ))}
        </div>
        <div className="absolute right-[-52px] top-0 h-full flex flex-col justify-around py-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="text-[11px] text-[#0ECB81] font-medium whitespace-nowrap">
              {outerPcts[i]?.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarChart({ bars, symbol }: { bars: DailyBar[]; symbol: string }) {
  const maxAbs = Math.max(...bars.map(b => Math.abs(b.value)), 1);
  const chartH = 120;
  const barW = 32;
  const gap = 8;
  const totalW = bars.length * (barW + gap) - gap;

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${totalW + 20} ${chartH + 40}`} style={{ overflow: 'visible' }}>
        <line x1={0} y1={chartH / 2 + 20} x2={totalW + 20} y2={chartH / 2 + 20} stroke="#2B3139" strokeWidth="1" />
        {bars.map((bar, i) => {
          const x = i * (barW + gap) + 10;
          const barH = Math.max(2, (Math.abs(bar.value) / maxAbs) * (chartH / 2 - 10));
          const isPos = bar.value >= 0;
          const y = isPos ? chartH / 2 + 20 - barH : chartH / 2 + 20;
          const color = isPos ? '#0ECB81' : '#F6465D';
          const labelY = isPos ? y - 4 : y + barH + 12;
          const label = formatFlowShort(bar.value);

          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} rx={2} />
              <text
                x={x + barW / 2}
                y={labelY}
                textAnchor="middle"
                fontSize={9}
                fill={color}
                fontWeight="600"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex justify-between mt-1 px-2">
        {bars.map((bar, i) => (
          <div key={i} className="text-[9px] text-[#848E9C] text-center" style={{ width: barW + gap }}>
            {new Date(bar.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TradingDataTab({ symbol, currentPrice, volume24h }: TradingDataTabProps) {
  const [subTab, setSubTab] = useState<'money-flow' | 'margin-data'>('money-flow');
  const [flowData, setFlowData] = useState(() => generateFlowData(symbol, volume24h));
  const [segments, setSegments] = useState(() => generateDonutSegments(symbol, volume24h));
  const [bars, setBars] = useState<DailyBar[]>(() => generateDailyBars(symbol, volume24h));
  const [lsData, setLsData] = useState<LsRow[]>(() => initLsData(symbol));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setFlowData(generateFlowData(symbol, volume24h));
    setSegments(generateDonutSegments(symbol, volume24h));
    setBars(generateDailyBars(symbol, volume24h));
    setLsData(initLsData(symbol));
  }, [symbol, volume24h]);

  useEffect(() => {
    const lsInterval = setInterval(() => {
      setLsData(prev => prev.map((row, i) => {
        const maxDrift = i === 0 ? 0.9 : i === 1 ? 1.3 : 0.6;
        const bias = i === 2 ? 0.04 : 0;
        const drift = (Math.random() - 0.48 + bias) * maxDrift;
        return { ...row, long: Math.max(38, Math.min(78, row.long + drift)) };
      }));
    }, 18000);
    return () => clearInterval(lsInterval);
  }, [symbol]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFlowData(prev => {
        const keys = ['Large', 'Medium', 'Small'] as const;
        const updated = { ...prev };
        let totalBuy = 0, totalSell = 0;
        keys.forEach(k => {
          const drift = 0.96 + Math.random() * 0.08;
          const driftS = 0.96 + Math.random() * 0.08;
          updated[k] = {
            buy: prev[k].buy * drift,
            sell: prev[k].sell * driftS,
            inflow: prev[k].buy * drift - prev[k].sell * driftS,
          };
          totalBuy += updated[k].buy;
          totalSell += updated[k].sell;
        });
        updated['Total'] = { buy: totalBuy, sell: totalSell, inflow: totalBuy - totalSell };
        return updated;
      });
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const totalInflow = flowData['Total'].inflow;
  const fiveDayTotal = bars.reduce((s, b) => s + b.value, 0);
  const lastBar = bars[bars.length - 1];

  return (
    <div className="pb-24">
      <div className="px-4 py-3 bg-[#1E2329] border-b border-[#2B3139]">
        <div className="flex gap-1">
          <button
            onClick={() => setSubTab('money-flow')}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${subTab === 'money-flow' ? 'bg-[#2B3139] text-white' : 'text-[#848E9C]'}`}
          >
            Money Flow
          </button>
          <button
            onClick={() => setSubTab('margin-data')}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${subTab === 'margin-data' ? 'bg-[#2B3139] text-white' : 'text-[#848E9C]'}`}
          >
            Margin Data
          </button>
        </div>
      </div>

      {subTab === 'money-flow' && (
        <div>
          <div className="px-6 pt-6 pb-4">
            <DonutChart segments={segments} />
          </div>

          <div className="mx-4 mb-4 rounded-xl bg-[#1E2329] overflow-hidden">
            <div className="grid grid-cols-4 px-3 py-2 border-b border-[#2B3139]">
              <div className="text-[11px] text-[#848E9C] font-medium">Orders</div>
              <div className="text-[11px] text-[#848E9C] font-medium text-right">Buy ({symbol})</div>
              <div className="text-[11px] text-[#848E9C] font-medium text-right">Sell ({symbol})</div>
              <div className="text-[11px] text-[#848E9C] font-medium text-right">Inflow</div>
            </div>
            {(['Large', 'Medium', 'Small', 'Total'] as const).map(key => {
              const row = flowData[key];
              const isTotalRow = key === 'Total';
              return (
                <div
                  key={key}
                  className={`grid grid-cols-4 px-3 py-2.5 ${isTotalRow ? '' : 'border-b border-[#2B3139]'}`}
                >
                  <div className={`text-[12px] ${isTotalRow ? 'text-white font-bold' : 'text-white'}`}>{key}</div>
                  <div className="text-[12px] text-right flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] inline-block" />
                    <span className="text-white">{formatMoney(row.buy)}</span>
                  </div>
                  <div className="text-[12px] text-right flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F6465D] inline-block" />
                    <span className="text-white">{formatMoney(row.sell)}</span>
                  </div>
                  <div className={`text-[12px] text-right font-medium ${row.inflow >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {row.inflow >= 0 ? '+' : ''}{formatMoney(row.inflow)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mx-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-bold text-[15px] text-white">5 x 24 hours Large Inflow ({symbol})</span>
              </div>
              <button className="p-1">
                <Share2 className="w-4 h-4 text-[#848E9C]" />
              </button>
            </div>
            <div className={`text-[12px] font-medium mb-3 ${fiveDayTotal >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              5 days Large Inflow: {fiveDayTotal >= 0 ? '+' : ''}{formatMoney(fiveDayTotal)}
            </div>

            <div className="relative">
              <BarChart bars={bars} symbol={symbol} />
              <div className="absolute right-0 top-2 bg-[#2B3139] text-[10px] text-white px-2 py-1 rounded text-center">
                Last 24 hours
              </div>
            </div>
          </div>

          <div className="mx-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[15px] text-white">5 x 24 hours Medium Inflow ({symbol})</span>
              <button className="p-1">
                <Share2 className="w-4 h-4 text-[#848E9C]" />
              </button>
            </div>
            <div className={`text-[12px] font-medium mb-3 ${flowData['Medium'].inflow >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              5 days Medium Inflow: {flowData['Medium'].inflow >= 0 ? '+' : ''}{formatMoney(flowData['Medium'].inflow * 5)}
            </div>
            <div className="relative">
              <BarChart
                bars={bars.map(b => ({ ...b, value: b.value * (0.6 + Math.random() * 0.8) }))}
                symbol={symbol}
              />
            </div>
          </div>

          <div className="mx-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[15px] text-white">24h Retail Inflow ({symbol})</span>
              <button className="p-1">
                <Share2 className="w-4 h-4 text-[#848E9C]" />
              </button>
            </div>
            <div className="text-[12px] text-[#848E9C] mb-3">
              Real-time retail order flow analysis
            </div>
            <div className="bg-[#1E2329] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-[#848E9C]">Retail Buy Ratio</span>
                <span className="text-[13px] font-bold text-[#0ECB81]">
                  {(45 + seededRand(symbol.charCodeAt(0), 1) * 20).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-[#2B3139] rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-[#0ECB81] to-[#F6465D]"
                  style={{ width: `${45 + seededRand(symbol.charCodeAt(0), 1) * 20}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-[11px] text-[#848E9C]">Net Inflow (24h)</div>
                  <div className={`text-[13px] font-bold ${totalInflow >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {totalInflow >= 0 ? '+' : ''}{formatMoney(totalInflow)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-[#848E9C]">Active Traders</div>
                  <div className="text-[13px] font-bold text-white">
                    {Math.floor(1000 + seededRand(symbol.charCodeAt(0), 2) * 50000).toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-[#848E9C]">Trade Count</div>
                  <div className="text-[13px] font-bold text-white">
                    {Math.floor(5000 + seededRand(symbol.charCodeAt(0), 3) * 200000).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'margin-data' && (
        <div className="px-4 py-4">
          <div className="mb-6">
            <div className="font-bold text-[15px] text-white mb-3">Long/Short Ratio</div>
            <div className="bg-[#1E2329] rounded-xl p-4">
              {lsData.map(({ label, long }) => {
                const short = 100 - long;
                const ratio = (long / short).toFixed(2);
                return (
                  <div key={label} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] text-[#848E9C]">{label}</span>
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#0ECB81] font-medium">{long.toFixed(2)}%</span>
                        <span className="text-[#848E9C]">/</span>
                        <span className="text-[#F6465D] font-medium">{short.toFixed(2)}%</span>
                        <span className="text-[#848E9C] text-[10px]">({ratio})</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#2B3139] rounded-full overflow-hidden flex">
                      <div className="h-full bg-[#0ECB81] transition-all duration-1000" style={{ width: `${long}%` }} />
                      <div className="h-full bg-[#F6465D] transition-all duration-1000" style={{ width: `${short}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <div className="font-bold text-[15px] text-white mb-3">Open Interest</div>
            <div className="bg-[#1E2329] rounded-xl overflow-hidden">
              {[
                { period: '5 min', change: (seededRand(symbol.charCodeAt(0), 30) - 0.5) * 4 },
                { period: '15 min', change: (seededRand(symbol.charCodeAt(0), 31) - 0.5) * 6 },
                { period: '30 min', change: (seededRand(symbol.charCodeAt(0), 32) - 0.5) * 8 },
                { period: '1 hour', change: (seededRand(symbol.charCodeAt(0), 33) - 0.45) * 12 },
                { period: '4 hour', change: (seededRand(symbol.charCodeAt(0), 34) - 0.4) * 18 },
                { period: '24 hour', change: (seededRand(symbol.charCodeAt(0), 35) - 0.35) * 25 },
              ].map(({ period, change }, i, arr) => (
                <div key={period} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-[#2B3139]' : ''}`}>
                  <span className="text-[13px] text-[#848E9C]">{period}</span>
                  <span className={`text-[13px] font-medium ${change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="font-bold text-[15px] text-white mb-3">Funding Rate</div>
            <div className="bg-[#1E2329] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[#848E9C]">Current Rate</span>
                <span className={`text-[14px] font-bold ${seededRand(symbol.charCodeAt(0), 40) > 0.5 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {seededRand(symbol.charCodeAt(0), 40) > 0.5 ? '+' : '-'}{(seededRand(symbol.charCodeAt(0), 41) * 0.1).toFixed(4)}%
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[#848E9C]">Countdown</span>
                <span className="text-[13px] font-medium text-white">
                  {String(Math.floor(seededRand(symbol.charCodeAt(0), 42) * 8)).padStart(2, '0')}:
                  {String(Math.floor(seededRand(symbol.charCodeAt(0), 43) * 60)).padStart(2, '0')}:
                  {String(Math.floor(seededRand(symbol.charCodeAt(0), 44) * 60)).padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#848E9C]">Predicted Rate</span>
                <span className={`text-[13px] font-medium ${seededRand(symbol.charCodeAt(0), 45) > 0.5 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {seededRand(symbol.charCodeAt(0), 45) > 0.5 ? '+' : '-'}{(seededRand(symbol.charCodeAt(0), 46) * 0.08).toFixed(4)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

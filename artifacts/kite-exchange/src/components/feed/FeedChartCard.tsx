import { useMemo } from 'react';

interface FeedChartCardProps {
  coin: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export default function FeedChartCard({ coin, sentiment }: FeedChartCardProps) {
  const chartData = useMemo(() => {
    const bars = 35;
    const data = [];
    let price = 100 + Math.random() * 900;
    const trend = sentiment === 'bullish' ? 0.3 : sentiment === 'bearish' ? -0.3 : 0;

    for (let i = 0; i < bars; i++) {
      const change = (Math.random() - 0.5 + trend) * price * 0.04;
      const open = price;
      price += change;
      const close = price;
      const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
      const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;
      data.push({ open, close, high, low, isGreen: close >= open });
    }
    return data;
  }, [sentiment]);

  const allPrices = chartData.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const range = maxPrice - minPrice || 1;
  const currentPrice = chartData[chartData.length - 1].close;

  const toY = (price: number) => ((maxPrice - price) / range) * 140;

  const timeLabels = ['15m', '1h', '4h', '1D'];
  const priceLabels = [maxPrice, maxPrice - range * 0.25, maxPrice - range * 0.5, maxPrice - range * 0.75, minPrice];

  return (
    <div className="bg-[#1E2026] rounded-xl border border-[#2B3139] mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{coin}/USDT</span>
          <span className="text-xs font-medium text-white">
            {currentPrice.toFixed(currentPrice > 100 ? 1 : 4)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {timeLabels.map((label, i) => (
            <button
              key={label}
              className={`text-[9px] px-1.5 py-0.5 rounded ${
                i === 2 ? 'bg-[#2B3139] text-white' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-3 flex">
        <svg viewBox={`0 0 ${chartData.length * 8 + 10} 160`} className="flex-1" style={{ maxHeight: 160 }}>
          {[0.25, 0.5, 0.75].map(pct => (
            <line
              key={pct}
              x1="0" y1={toY(maxPrice - range * pct) + 5}
              x2={chartData.length * 8} y2={toY(maxPrice - range * pct) + 5}
              stroke="#2B3139" strokeWidth="0.5"
            />
          ))}

          {chartData.map((bar, i) => {
            const x = i * 8 + 4;
            const bodyTop = toY(Math.max(bar.open, bar.close)) + 5;
            const bodyBottom = toY(Math.min(bar.open, bar.close)) + 5;
            const wickTop = toY(bar.high) + 5;
            const wickBottom = toY(bar.low) + 5;
            const color = bar.isGreen ? '#0ECB81' : '#F6465D';

            return (
              <g key={i}>
                <line x1={x} y1={wickTop} x2={x} y2={wickBottom} stroke={color} strokeWidth="1" />
                <rect
                  x={x - 2.5}
                  y={bodyTop}
                  width={5}
                  height={Math.max(1, bodyBottom - bodyTop)}
                  fill={color}
                  rx="0.5"
                />
              </g>
            );
          })}

          <line
            x1="0"
            y1={toY(currentPrice) + 5}
            x2={chartData.length * 8}
            y2={toY(currentPrice) + 5}
            stroke={sentiment === 'bearish' ? '#F6465D' : '#0ECB81'}
            strokeWidth="0.7"
            strokeDasharray="3,2"
          />
        </svg>

        <div className="flex flex-col justify-between ml-2 text-[8px] text-gray-500 py-1" style={{ minWidth: 36 }}>
          {priceLabels.map((p, i) => (
            <span key={i}>{p.toFixed(p > 100 ? 1 : 3)}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-[#2B3139] bg-[#181A20]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{coin}USDT</span>
          <span className="text-[10px] text-gray-400">Perp</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            sentiment === 'bullish'
              ? 'bg-[#0ECB81]/20 text-[#0ECB81]'
              : sentiment === 'bearish'
                ? 'bg-[#F6465D]/20 text-[#F6465D]'
                : 'bg-[#F0B90B]/20 text-[#F0B90B]'
          }`}>
            {sentiment === 'bullish' ? 'Opening Long' : sentiment === 'bearish' ? 'Opening Short' : 'Watching'}
          </span>
        </div>
        <span className={`text-xs font-bold ${
          sentiment === 'bearish' ? 'text-[#F6465D]' : 'text-[#0ECB81]'
        }`}>
          {sentiment === 'bearish' ? '-' : '+'}{(Math.random() * 200 + 20).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

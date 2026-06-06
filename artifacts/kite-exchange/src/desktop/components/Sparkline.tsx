interface SparklineProps {
  symbol: string;
  positive: boolean;
  width?: number;
  height?: number;
}

/**
 * Deterministic mini price-trend line (seeded by symbol) — purely decorative,
 * mirrors the look of Binance's market sparklines.
 */
export default function Sparkline({ symbol, positive, width = 140, height = 44 }: SparklineProps) {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (i: number) => (((seed * (i + 7) * 2654435761) >>> 0) % 100) / 100;
  const steps = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const x = (i / (steps - 1)) * width;
    const base = positive ? height * 0.72 - (i / steps) * height * 0.5 : height * 0.28 + (i / steps) * height * 0.5;
    const jitter = (r(i) - 0.5) * height * 0.22;
    const y = Math.max(3, Math.min(height - 3, base + jitter));
    pts.push([x, y]);
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const stroke = positive ? '#0ECB81' : '#F6465D';
  const gid = `spark-${symbol}-${positive ? 'u' : 'd'}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gid})`} stroke="none" />
      <path d={d} stroke={stroke} strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Sparkline({ data, width = 60, height = 24, className = "" }: { data: number[]; width?: number; height?: number; className?: string }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = height * 0.1;
  const innerHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = paddingY + innerHeight - ((d - min) / range) * innerHeight;
    return `${x},${y}`;
  }).join(' ');
  
  const isPositive = data[data.length - 1] >= data[0];
  const color = isPositive ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

  return (
    <svg width={width} height={height} className={`overflow-visible ${className}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

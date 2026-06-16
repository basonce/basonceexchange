import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import type { TrendPoint, PricePoint } from '@/lib/chain/types';

// Palette — restricted to the Basonce brand tokens.
export const C = {
  gold: '#F0B90B',
  gold2: '#FCD535',
  green: '#0ECB81',
  red: '#F6465D',
  muted: '#848E9C',
  text: '#EAECEF',
  card: '#181A20',
  border: '#2B3139',
};

const axisProps = {
  stroke: C.muted,
  tick: { fill: C.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: C.border },
};

interface TooltipRow { name: string; value: number; color: string; }

function makeTooltip(fmt: (v: number) => string) {
  return ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const rows: TooltipRow[] = payload.map((p: any) => ({
      name: p.name, value: p.value, color: p.color || p.stroke || p.fill,
    }));
    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
        <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="text-muted-foreground">{r.name}</span>
            <span className="ml-auto font-mono text-foreground">{fmt(r.value)}</span>
          </div>
        ))}
      </div>
    );
  };
}

const legendStyle = { fontSize: 12, color: C.muted };

export function ChartCard({
  title, subtitle, action, children, height = 240,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        {action}
      </div>
      <div className="min-w-0" style={{ width: '100%', height }}>
        {children}
      </div>
    </div>
  );
}

export function AreaTrend({
  data, dataKey, name, color = C.gold, fmt, height = 240,
}: {
  data: TrendPoint[];
  dataKey: string;
  name: string;
  color?: string;
  fmt: (v: number) => string;
  height?: number;
}) {
  const gid = `area-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
        <XAxis dataKey="date" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} width={48} tickFormatter={(v) => fmt(v)} />
        <Tooltip content={makeTooltip(fmt)} cursor={{ stroke: C.border }} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={`url(#${gid})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLineTrend({
  data, series, fmt, height = 240,
}: {
  data: TrendPoint[];
  series: { key: string; name: string; color: string }[];
  fmt: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
        <XAxis dataKey="date" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} width={48} tickFormatter={(v) => fmt(v)} />
        <Tooltip content={makeTooltip(fmt)} cursor={{ stroke: C.border }} />
        <Legend wrapperStyle={legendStyle} iconType="plainline" />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
            stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StackedBarTrend({
  data, series, fmt, height = 240,
}: {
  data: TrendPoint[];
  series: { key: string; name: string; color: string }[];
  fmt: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
        <XAxis dataKey="date" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} width={48} tickFormatter={(v) => fmt(v)} />
        <Tooltip content={makeTooltip(fmt)} cursor={{ fill: 'rgba(132,142,156,0.08)' }} />
        <Legend wrapperStyle={legendStyle} iconType="square" />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color}
            radius={i === series.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarTrend({
  data, dataKey, name, color = C.gold, fmt, height = 240,
}: {
  data: TrendPoint[];
  dataKey: string;
  name: string;
  color?: string;
  fmt: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
        <XAxis dataKey="date" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} width={48} tickFormatter={(v) => fmt(v)} />
        <Tooltip content={makeTooltip(fmt)} cursor={{ fill: 'rgba(132,142,156,0.08)' }} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, height = 56 }: { data: PricePoint[]; height?: number }) {
  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const color = last >= first ? C.green : C.red;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine y={first} stroke={C.border} strokeDasharray="2 2" />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill="url(#spark)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

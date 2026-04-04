import React from 'react';

interface TradFiCfg {
  ring: string;
  glow: string;
  bg: string;
  svg: (inner: number) => React.ReactNode;
}

// ─── SVG shape helpers ────────────────────────────────────────────
function OilBarrel({ size }: { size: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 44 44">
      <defs>
        <linearGradient id="barrel-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b3a10" />
          <stop offset="40%" stopColor="#4a2508" />
          <stop offset="100%" stopColor="#2a1004" />
        </linearGradient>
        <linearGradient id="barrel-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#f97316" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* barrel body */}
      <rect x="10" y="8" width="24" height="28" rx="5" fill="url(#barrel-body)" />
      {/* shine left */}
      <rect x="10" y="8" width="24" height="28" rx="5" fill="url(#barrel-shine)" />
      {/* ribs */}
      {[14, 22, 30].map(y => (
        <rect key={y} x="10" y={y} width="24" height="2.5" rx="1.25" fill="#f97316" opacity="0.6" />
      ))}
      {/* top cap */}
      <rect x="8" y="6" width="28" height="4" rx="2" fill="#f97316" opacity="0.8" />
      {/* bottom cap */}
      <rect x="8" y="34" width="28" height="4" rx="2" fill="#f97316" opacity="0.8" />
    </svg>
  );
}

function BrentBarrel({ size }: { size: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 44 44">
      <defs>
        <linearGradient id="brt-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c3a08" />
          <stop offset="40%" stopColor="#3d2505" />
          <stop offset="100%" stopColor="#1a0d02" />
        </linearGradient>
      </defs>
      <rect x="10" y="8" width="24" height="28" rx="5" fill="url(#brt-body)" />
      {[14, 22, 30].map(y => (
        <rect key={y} x="10" y={y} width="24" height="2.5" rx="1.25" fill="#ea580c" opacity="0.7" />
      ))}
      <rect x="8" y="6" width="28" height="4" rx="2" fill="#ea580c" opacity="0.9" />
      <rect x="8" y="34" width="28" height="4" rx="2" fill="#ea580c" opacity="0.9" />
      {/* BRENT label */}
      <text x="22" y="28" textAnchor="middle" fontSize="7" fontWeight="900" fontFamily="system-ui" fill="#ea580c" letterSpacing="0.3">BRT</text>
    </svg>
  );
}

function FlameIcon({ size }: { size: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 44 44">
      <defs>
        <radialGradient id="flame-core" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="flame-outer" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* outer glow flame */}
      <path d="M22 6 C16 12 10 18 12 26 C14 34 20 38 22 38 C24 38 30 34 32 26 C34 18 28 12 22 6Z" fill="url(#flame-outer)" />
      {/* inner hot core */}
      <path d="M22 14 C18 18 15 22 16 28 C17 32 20 35 22 35 C24 35 27 32 28 28 C29 22 26 18 22 14Z" fill="url(#flame-core)" />
      {/* white hot tip */}
      <ellipse cx="22" cy="22" rx="4" ry="6" fill="white" opacity="0.3" />
    </svg>
  );
}

function CoffeeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      <defs>
        <linearGradient id="coffee-cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>
      {/* steam */}
      <path d="M16 10 Q18 7 16 4" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M22 10 Q24 7 22 4" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M28 10 Q30 7 28 4" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* cup */}
      <path d="M10 13 L13 36 L31 36 L34 13 Z" fill="url(#coffee-cup)" rx="2" />
      {/* handle */}
      <path d="M34 18 Q40 22 34 28" stroke="#92400e" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* coffee surface */}
      <ellipse cx="22" cy="14" rx="12" ry="3" fill="#78350f" />
      <ellipse cx="22" cy="13" rx="10" ry="2" fill="#d97706" opacity="0.35" />
    </svg>
  );
}

function CocoaIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      <defs>
        <linearGradient id="cocoa-pod" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#3b1506" />
        </linearGradient>
      </defs>
      {/* cocoa pod */}
      <ellipse cx="22" cy="24" rx="12" ry="16" fill="url(#cocoa-pod)" />
      {/* pod ribs */}
      {[-6,-2,2,6].map((x,i) => (
        <line key={i} x1={22+x} y1="10" x2={22+x} y2="38" stroke="#a16207" strokeWidth="1.5" opacity="0.5" />
      ))}
      {/* stem */}
      <line x1="22" y1="8" x2="22" y2="4" stroke="#a16207" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 6 Q26 3 28 5" stroke="#86efac" strokeWidth="1.5" fill="none" opacity="0.7" />
      {/* shine */}
      <ellipse cx="18" cy="18" rx="4" ry="7" fill="white" opacity="0.12" />
    </svg>
  );
}

function SugarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      <defs>
        <linearGradient id="sugar-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#a21caf" />
        </linearGradient>
      </defs>
      {/* sugar bowl */}
      <path d="M10 20 Q10 38 22 38 Q34 38 34 20 Z" fill="#581c87" opacity="0.9" />
      {/* rim */}
      <ellipse cx="22" cy="20" rx="12" ry="3" fill="#7e22ce" />
      {/* sugar crystals sparkling */}
      {[[18,16,3],[26,15,2.5],[22,12,2],[15,22,2],[29,24,2.5]].map(([x,y,r],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.5 + i * 0.08} />
      ))}
      {/* sparkle stars */}
      <text x="22" y="28" textAnchor="middle" fontSize="14" fill="#f0abfc" opacity="0.6">✦</text>
    </svg>
  );
}

function WheatIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      {/* stalk */}
      <line x1="22" y1="6" x2="22" y2="40" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
      {/* wheat grains left */}
      {[10,14,18,22].map((y,i) => (
        <ellipse key={`l${i}`} cx={22-5+i*0.5} cy={y} rx="5" ry="3" fill="#f59e0b" transform={`rotate(-30,${22-5+i*0.5},${y})`} />
      ))}
      {/* wheat grains right */}
      {[10,14,18,22].map((y,i) => (
        <ellipse key={`r${i}`} cx={22+5-i*0.5} cy={y} rx="5" ry="3" fill="#d97706" transform={`rotate(30,${22+5-i*0.5},${y})`} />
      ))}
      {/* top grain */}
      <ellipse cx="22" cy="6" rx="4" ry="5" fill="#fbbf24" />
    </svg>
  );
}

function CornIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      {/* husk leaves */}
      <path d="M22 36 Q10 28 14 12 Q16 20 22 24Z" fill="#84cc16" opacity="0.8" />
      <path d="M22 36 Q34 28 30 12 Q28 20 22 24Z" fill="#65a30d" opacity="0.8" />
      {/* cob */}
      <rect x="16" y="10" width="12" height="24" rx="6" fill="#ca8a04" />
      {/* kernels grid */}
      {[0,1,2].map(col => [0,1,2,3,4,5].map(row => (
        <circle
          key={`${col}-${row}`}
          cx={18 + col * 4}
          cy={13 + row * 4}
          r={1.6}
          fill="#fde047"
          opacity={0.9}
        />
      )))}
    </svg>
  );
}

function SoybeanIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      {/* branch */}
      <path d="M22 38 Q18 26 22 14" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* leaves */}
      <path d="M22 30 Q10 26 12 18 Q18 22 22 30Z" fill="#22c55e" />
      <path d="M22 22 Q34 18 32 10 Q26 14 22 22Z" fill="#16a34a" />
      {/* pods */}
      {[[12,28],[20,20],[28,16]].map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx="6" ry="4" fill="#86efac" opacity={0.8} transform={`rotate(${-15+i*15},${x},${y})`} />
      ))}
    </svg>
  );
}

function ChartBarUp({ size, color, glow }: { size: number; color: string; glow: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      <defs>
        <linearGradient id={`chart-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
        <filter id={`glow-${color}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* bars */}
      <rect x="6"  y="28" width="7" height="10" rx="1.5" fill={`url(#chart-${color})`} />
      <rect x="15" y="20" width="7" height="18" rx="1.5" fill={`url(#chart-${color})`} />
      <rect x="24" y="12" width="7" height="26" rx="1.5" fill={`url(#chart-${color})`} />
      <rect x="33" y="6"  width="7" height="32" rx="1.5" fill={`url(#chart-${color})`} opacity="0.9" />
      {/* trend line */}
      <polyline points="9,26 18,18 27,10 36,4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" filter={`url(#glow-${color})`} />
      {/* arrow up */}
      <polyline points="32,6 36,4 38,8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DaxIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      {/* German flag colors: black, red, gold */}
      <rect x="8" y="12" width="28" height="7" rx="0" fill="#000000" />
      <rect x="8" y="19" width="28" height="7" rx="0" fill="#dd0000" />
      <rect x="8" y="26" width="28" height="7" rx="0" fill="#ffce00" />
      <rect x="8" y="12" width="28" height="21" rx="3" fill="none" stroke="#facc15" strokeWidth="1.5" />
      <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily="system-ui" fill="white" opacity="0.95" letterSpacing="0.5">DAX</text>
    </svg>
  );
}

function FtseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      {/* Union Jack simplified */}
      <rect x="8" y="12" width="28" height="20" rx="3" fill="#012169" />
      <line x1="8" y1="12" x2="36" y2="32" stroke="white" strokeWidth="5" />
      <line x1="36" y1="12" x2="8" y2="32" stroke="white" strokeWidth="5" />
      <line x1="8" y1="12" x2="36" y2="32" stroke="#C8102E" strokeWidth="3" />
      <line x1="36" y1="12" x2="8" y2="32" stroke="#C8102E" strokeWidth="3" />
      <line x1="22" y1="12" x2="22" y2="32" stroke="white" strokeWidth="6" />
      <line x1="8" y1="22" x2="36" y2="22" stroke="white" strokeWidth="6" />
      <line x1="22" y1="12" x2="22" y2="32" stroke="#C8102E" strokeWidth="4" />
      <line x1="8" y1="22" x2="36" y2="22" stroke="#C8102E" strokeWidth="4" />
      <rect x="8" y="12" width="28" height="20" rx="3" fill="none" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  );
}

function NikkeiIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      {/* Japanese flag */}
      <rect x="8" y="12" width="28" height="20" rx="3" fill="white" />
      <circle cx="22" cy="22" r="7" fill="#bc002d" />
      <rect x="8" y="12" width="28" height="20" rx="3" fill="none" stroke="#bc002d" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Config map ──────────────────────────────────────────────────
const CONFIGS: Record<string, { ring: string; glow: string; bg: string; node: (s: number) => React.ReactNode }> = {
  // Energy
  OIL:    { ring: '#f97316', glow: 'rgba(249,115,22,0.55)', bg: '#1a0800', node: s => <OilBarrel size={s} /> },
  BRENT:  { ring: '#ea580c', glow: 'rgba(234,88,12,0.55)',  bg: '#1a0d02', node: s => <BrentBarrel size={s} /> },
  NATGAS: { ring: '#38bdf8', glow: 'rgba(56,189,248,0.55)', bg: '#021a2a', node: s => <FlameIcon size={s} /> },
  // Agriculture
  COFFEE:  { ring: '#d97706', glow: 'rgba(217,119,6,0.55)',  bg: '#2a1004', node: s => <CoffeeIcon size={s} /> },
  COCOA:   { ring: '#a16207', glow: 'rgba(161,98,7,0.55)',   bg: '#1a0a04', node: s => <CocoaIcon size={s} /> },
  SUGAR:   { ring: '#e879f9', glow: 'rgba(232,121,249,0.55)',bg: '#1a0a1a', node: s => <SugarIcon size={s} /> },
  WHEAT:   { ring: '#fbbf24', glow: 'rgba(251,191,36,0.55)', bg: '#2a1a04', node: s => <WheatIcon size={s} /> },
  CORN:    { ring: '#fde047', glow: 'rgba(253,224,71,0.55)', bg: '#2a1a00', node: s => <CornIcon size={s} /> },
  SOYBEAN: { ring: '#86efac', glow: 'rgba(134,239,172,0.55)',bg: '#0a1a08', node: s => <SoybeanIcon size={s} /> },
  // Indices
  SPX:  { ring: '#3b82f6', glow: 'rgba(59,130,246,0.55)',  bg: '#001028', node: s => <ChartBarUp size={s} color="#3b82f6" glow="rgba(59,130,246,0.6)" /> },
  NDX:  { ring: '#6366f1', glow: 'rgba(99,102,241,0.55)',  bg: '#000a20', node: s => <ChartBarUp size={s} color="#6366f1" glow="rgba(99,102,241,0.6)" /> },
  DJI:  { ring: '#1d4ed8', glow: 'rgba(29,78,216,0.55)',   bg: '#000818', node: s => <ChartBarUp size={s} color="#60a5fa" glow="rgba(96,165,250,0.6)" /> },
  DAX:  { ring: '#facc15', glow: 'rgba(250,204,21,0.55)',  bg: '#0a0800', node: s => <DaxIcon size={s} /> },
  FTSE: { ring: '#ef4444', glow: 'rgba(239,68,68,0.55)',   bg: '#000010', node: s => <FtseIcon size={s} /> },
  NKY:  { ring: '#bc002d', glow: 'rgba(188,0,45,0.55)',    bg: '#1a0008', node: s => <NikkeiIcon size={s} /> },
};

export function isTradFiIcon(symbol: string): boolean {
  return symbol in CONFIGS;
}

interface TradFiIconProps {
  symbol: string;
  size?: number;
}

export default function TradFiIcon({ symbol, size = 44 }: TradFiIconProps) {
  const cfg = CONFIGS[symbol];
  if (!cfg) return null;
  const ring = Math.max(2, size * 0.065);
  return (
    <div
      className="flex-shrink-0 relative flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.5,
        background: `radial-gradient(circle at 35% 35%, ${cfg.ring}28, ${cfg.bg} 68%)`,
        boxShadow: `0 0 ${size * 0.38}px ${cfg.glow}, 0 ${size * 0.04}px ${size * 0.22}px rgba(0,0,0,0.65)`,
        border: `${ring}px solid ${cfg.ring}`,
      }}
    >
      {cfg.node(size - ring * 2)}
    </div>
  );
}

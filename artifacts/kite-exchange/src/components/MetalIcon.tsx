import React from 'react';

export type MetalSymbol = 'XAU' | 'XAG' | 'XPT' | 'XPD' | 'CU' | 'XRH';

interface MetalConfig {
  ringColor: string;
  ringGlow: string;
  ingotGrad: string[];
  ingotShine: string;
  labelColor: string;
  label: string;
  shadowColor: string;
}

const METAL_CONFIGS: Record<MetalSymbol, MetalConfig> = {
  XAU: {
    ringColor: '#C8960C',
    ringGlow: 'rgba(240,185,11,0.55)',
    ingotGrad: ['#FFE066', '#F5C518', '#D4A017', '#8B6914'],
    ingotShine: 'rgba(255,255,220,0.7)',
    labelColor: '#3D2200',
    label: 'GOLD',
    shadowColor: 'rgba(240,185,11,0.4)',
  },
  XAG: {
    ringColor: '#8A9BB0',
    ringGlow: 'rgba(176,186,200,0.5)',
    ingotGrad: ['#F0F4FA', '#C8D0DC', '#9AA4B4', '#5A6472'],
    ingotShine: 'rgba(255,255,255,0.8)',
    labelColor: '#1A2030',
    label: 'SILVER',
    shadowColor: 'rgba(160,170,184,0.4)',
  },
  XPT: {
    ringColor: '#6A8AA8',
    ringGlow: 'rgba(142,207,236,0.45)',
    ingotGrad: ['#D8ECF8', '#9AC0D8', '#6090B0', '#3A6080'],
    ingotShine: 'rgba(230,248,255,0.7)',
    labelColor: '#0A1A28',
    label: 'PLAT',
    shadowColor: 'rgba(100,160,200,0.4)',
  },
  XPD: {
    ringColor: '#6A7888',
    ringGlow: 'rgba(168,184,204,0.45)',
    ingotGrad: ['#D4DCE8', '#98A8B8', '#687888', '#384858'],
    ingotShine: 'rgba(220,235,250,0.65)',
    labelColor: '#0A1420',
    label: 'PALL',
    shadowColor: 'rgba(120,140,160,0.4)',
  },
  CU: {
    ringColor: '#B05020',
    ringGlow: 'rgba(232,135,74,0.5)',
    ingotGrad: ['#F8A060', '#E06830', '#B04010', '#702808'],
    ingotShine: 'rgba(255,220,180,0.65)',
    labelColor: '#300800',
    label: 'COPPER',
    shadowColor: 'rgba(200,100,40,0.4)',
  },
  XRH: {
    ringColor: '#909CB0',
    ringGlow: 'rgba(216,228,240,0.4)',
    ingotGrad: ['#E8EEF6', '#BCC8D8', '#8898A8', '#586878'],
    ingotShine: 'rgba(240,248,255,0.7)',
    labelColor: '#101820',
    label: 'RHOD',
    shadowColor: 'rgba(150,168,185,0.4)',
  },
};

const SYMBOL_MAP: Record<string, MetalSymbol> = {
  XAUUSD: 'XAU', XAUUSDT: 'XAU',
  XAGUSD: 'XAG', XAGUSDT: 'XAG',
  XPTUSD: 'XPT', XPTUSDT: 'XPT',
  XPDUSD: 'XPD', XPDUSDT: 'XPD',
  COPPER: 'CU',  COPPERUSDT: 'CU',
  XRHRUSD: 'XRH',
  XAU: 'XAU', XAG: 'XAG', XPT: 'XPT', XPD: 'XPD', CU: 'CU', XRH: 'XRH',
};

export function isMetalSymbol(symbol: string): boolean {
  return symbol in SYMBOL_MAP;
}

interface MetalIconProps {
  symbol: string;
  size?: number;
}

export default function MetalIcon({ symbol, size = 44 }: MetalIconProps) {
  const key = SYMBOL_MAP[symbol];
  if (!key) return null;
  const cfg = METAL_CONFIGS[key];

  const s = size;
  const ring = s * 0.06;
  const inner = s - ring * 2;
  const ingotW = inner * 0.72;
  const ingotH = inner * 0.32;
  const ingotBR = ingotH * 0.22;

  const [g0, g1, g2, g3] = cfg.ingotGrad;

  const id = `metal-${key}-${s}`;

  return (
    <div
      className="flex-shrink-0 relative flex items-center justify-center"
      style={{
        width: s,
        height: s,
        borderRadius: s * 0.5,
        background: `radial-gradient(circle at 30% 30%, ${cfg.ingotGrad[0]}22, #0d1117 70%)`,
        boxShadow: `0 0 ${s * 0.35}px ${cfg.ringGlow}, 0 ${s * 0.04}px ${s * 0.2}px rgba(0,0,0,0.6)`,
        border: `${ring}px solid`,
        borderColor: cfg.ringColor,
      }}
    >
      <svg
        width={inner}
        height={inner}
        viewBox={`0 0 ${inner} ${inner}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={g0} />
            <stop offset="35%" stopColor={g1} />
            <stop offset="70%" stopColor={g2} />
            <stop offset="100%" stopColor={g3} />
          </linearGradient>
          <linearGradient id={`${id}-mid`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={g1} />
            <stop offset="50%" stopColor={g2} />
            <stop offset="100%" stopColor={g3} />
          </linearGradient>
          <linearGradient id={`${id}-bot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={g2} stopOpacity="0.85" />
            <stop offset="100%" stopColor={g3} stopOpacity="0.7" />
          </linearGradient>
          <filter id={`${id}-shadow`}>
            <feDropShadow dx="0" dy={ingotH * 0.3} stdDeviation={ingotH * 0.25} floodColor={cfg.shadowColor} />
          </filter>
        </defs>

        <rect
          x={(inner - ingotW * 0.88) / 2 + ingotW * 0.06}
          y={inner * 0.62}
          width={ingotW * 0.88}
          height={ingotH * 0.85}
          rx={ingotBR}
          fill={`url(#${id}-bot)`}
          opacity={0.75}
          filter={`url(#${id}-shadow)`}
        />

        <rect
          x={(inner - ingotW * 0.94) / 2}
          y={inner * 0.38}
          width={ingotW * 0.94}
          height={ingotH * 0.92}
          rx={ingotBR}
          fill={`url(#${id}-mid)`}
          opacity={0.88}
          filter={`url(#${id}-shadow)`}
        />

        <rect
          x={(inner - ingotW) / 2}
          y={inner * 0.13}
          width={ingotW}
          height={ingotH}
          rx={ingotBR}
          fill={`url(#${id}-top)`}
          filter={`url(#${id}-shadow)`}
        />
        <rect
          x={(inner - ingotW) / 2 + ingotW * 0.06}
          y={inner * 0.13 + ingotH * 0.08}
          width={ingotW * 0.55}
          height={ingotH * 0.28}
          rx={ingotBR * 0.5}
          fill={cfg.ingotShine}
          opacity={0.55}
        />
        <text
          x={inner / 2}
          y={inner * 0.13 + ingotH * 0.68}
          textAnchor="middle"
          fontSize={Math.max(ingotH * 0.38, 6)}
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={cfg.labelColor}
          letterSpacing="0.5"
          style={{ userSelect: 'none' }}
        >
          {cfg.label}
        </text>
      </svg>
    </div>
  );
}

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue' | 'orange';
  padding?: string;
}

const VARIANTS = {
  default: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.07)' },
  gold:    { bg: 'rgba(240,185,11,0.07)',  border: 'rgba(240,185,11,0.2)' },
  green:   { bg: 'rgba(0,220,130,0.07)',   border: 'rgba(0,220,130,0.2)' },
  red:     { bg: 'rgba(255,71,87,0.07)',   border: 'rgba(255,71,87,0.25)' },
  blue:    { bg: 'rgba(61,127,255,0.07)',  border: 'rgba(61,127,255,0.2)' },
  orange:  { bg: 'rgba(255,152,0,0.07)',   border: 'rgba(255,152,0,0.2)' },
};

export default function GlassCard({ children, className = '', onClick, variant = 'default', padding = 'p-4' }: GlassCardProps) {
  const v = VARIANTS[variant];
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl ${padding} ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
      style={{ background: v.bg, border: `1px solid ${v.border}`, backdropFilter: 'blur(8px)' }}
    >
      {children}
    </div>
  );
}

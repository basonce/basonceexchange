import type { AlertSeverity } from '../lib/store';

const CONFIG: Record<AlertSeverity, { bg: string; text: string; label: string; dot: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'KRİTİK', dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'YÜK', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'ORTA', dot: 'bg-yellow-500' },
  low:      { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'DÜŞÜK', dot: 'bg-blue-500' },
  info:     { bg: 'bg-gray-500/10', text: 'text-gray-400', label: 'BİLGİ', dot: 'bg-gray-500' },
};

export default function AlertBadge({ severity }: { severity: AlertSeverity }) {
  const c = CONFIG[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

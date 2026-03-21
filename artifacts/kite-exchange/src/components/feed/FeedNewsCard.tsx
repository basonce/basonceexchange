import { Zap, Clock, TrendingUp, Shield, Globe } from 'lucide-react';

const CATEGORIES = [
  { label: 'BREAKING', color: '#F6465D', icon: Zap },
  { label: 'MARKET', color: '#F0B90B', icon: TrendingUp },
  { label: 'REGULATION', color: '#3B82F6', icon: Shield },
  { label: 'TECHNOLOGY', color: '#0ECB81', icon: Globe },
] as const;

interface FeedNewsCardProps {
  content: string;
  coinSymbol: string;
}

export default function FeedNewsCard({ content, coinSymbol }: FeedNewsCardProps) {
  const lines = content.split('\n').filter(l => l.trim());
  const headline = lines[0] || content;
  const summary = lines.length > 1 ? lines.slice(1).join(' ').trim() : '';

  const catIndex = (headline.length + (coinSymbol?.length || 0)) % CATEGORIES.length;
  const category = CATEGORIES[catIndex];
  const Icon = category.icon;

  return (
    <div
      className="rounded-xl mb-3 overflow-hidden bg-[#1E2026] border border-[#2B3139]"
      style={{ borderLeftWidth: 4, borderLeftColor: category.color }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            <Icon className="w-3 h-3" />
            {category.label}
          </span>
          {coinSymbol && (
            <span className="text-[10px] font-bold text-gray-400 bg-[#2B3139] px-2 py-0.5 rounded">
              {coinSymbol}
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-white leading-snug mb-2">{headline}</h3>

        {summary && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{summary}</p>
        )}

        <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            CryptoNews
          </span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span>Just now</span>
        </div>
      </div>
    </div>
  );
}

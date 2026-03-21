import { Calendar, Trophy, Gift, Zap } from 'lucide-react';

interface FeedEventCardProps {
  content: string;
}

const EVENT_ICONS = [Calendar, Trophy, Gift, Zap];
const EVENT_GRADIENTS = [
  'from-[#F0B90B]/20 to-[#F0B90B]/5',
  'from-[#0ECB81]/20 to-[#0ECB81]/5',
  'from-[#3B82F6]/20 to-[#3B82F6]/5',
  'from-[#F59E0B]/20 to-[#F59E0B]/5',
];
const EVENT_BORDERS = [
  'border-[#F0B90B]/30',
  'border-[#0ECB81]/30',
  'border-[#3B82F6]/30',
  'border-[#F59E0B]/30',
];
const EVENT_ICON_COLORS = [
  'text-[#F0B90B]',
  'text-[#0ECB81]',
  'text-[#3B82F6]',
  'text-[#F59E0B]',
];

export default function FeedEventCard({ content }: FeedEventCardProps) {
  const hash = content.length % 4;
  const Icon = EVENT_ICONS[hash];
  const gradient = EVENT_GRADIENTS[hash];
  const border = EVENT_BORDERS[hash];
  const iconColor = EVENT_ICON_COLORS[hash];

  const title = content.split(':')[0] || content.slice(0, 40);
  const body = content.includes(':') ? content.slice(content.indexOf(':') + 1).trim() : '';

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 mb-3 border ${border}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg bg-[#0B0E11]/50 flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white mb-1 leading-tight">{title}</h4>
          {body && (
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{body}</p>
          )}
        </div>
      </div>
      <button className={`mt-3 w-full py-2 rounded-lg text-xs font-bold bg-[#0B0E11]/40 text-white hover:bg-[#0B0E11]/60 transition-colors border ${border}`}>
        Learn More
      </button>
    </div>
  );
}

import { TrendingUp, Users, Activity, ThumbsUp, Clock, Flame, Sparkles, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { AlphaToken } from '../../types/alpha';

const GRADIENT_COLORS = ['#F0B90B', '#0ECB81', '#3861FB', '#E8831D', '#627EEA', '#00D1FF', '#FF6B35'];

const NETWORK_COLORS: Record<string, string> = {
  BNC: '#F0B90B',
  BSC: '#F0B90B',
  Ethereum: '#627EEA',
  Solana: '#00D1FF',
  Base: '#0052FF',
};

const TAG_COLORS: Record<string, string> = {
  Meme: '#F0B90B',
  AI: '#00D1FF',
  Gaming: '#0ECB81',
  DeFi: '#E8831D',
};

function formatMcap(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function formatVol(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function MiniSparkline({ positive }: { positive: boolean }) {
  const points: number[] = [];
  let val = 50;
  for (let i = 0; i < 20; i++) {
    val += (Math.random() - (positive ? 0.35 : 0.65)) * 8;
    val = Math.max(10, Math.min(90, val));
    points.push(val);
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const h = 24;
  const w = 60;

  const pathData = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <defs>
        <linearGradient id={`spark-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#0ECB81' : '#F6465D'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? '#0ECB81' : '#F6465D'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={pathData + ` L ${w} ${h} L 0 ${h} Z`}
        fill={`url(#spark-${positive ? 'up' : 'down'})`}
      />
      <path
        d={pathData}
        fill="none"
        stroke={positive ? '#0ECB81' : '#F6465D'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TokenLogo({ token }: { token: AlphaToken }) {
  const idx = token.symbol.charCodeAt(0) % GRADIENT_COLORS.length;
  const fallback = (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS[idx]}dd, ${GRADIENT_COLORS[(idx + 3) % GRADIENT_COLORS.length]}aa)` }}
    >
      <span className="text-white text-sm font-black">{token.symbol.slice(0, 2)}</span>
    </div>
  );

  if (!token.logo_url) return fallback;

  return (
    <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden relative"
      style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS[idx]}dd, ${GRADIENT_COLORS[(idx + 3) % GRADIENT_COLORS.length]}aa)` }}
    >
      <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-black">{token.symbol.slice(0, 2)}</span>
      <img
        src={token.logo_url}
        alt=""
        className="w-full h-full object-cover relative z-10"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}

interface Props {
  token: AlphaToken;
  onClick: () => void;
}

export default function AlphaTokenCard({ token, onClick }: Props) {
  const progress = Math.min((token.raised_amount / token.target_amount) * 100, 100);
  const isHot = token.volume_24h > 20000 && progress > 50;
  const isNew = Date.now() - new Date(token.created_at).getTime() < 24 * 60 * 60 * 1000;
  const netColor = NETWORK_COLORS[token.network] || '#666';
  const tagColor = TAG_COLORS[token.tag] || '#666';
  const priceChange = token.price_change_24h || (Math.random() * 60 - 15);
  const isPositive = priceChange >= 0;

  return (
    <div
      onClick={onClick}
      className="bg-[#181A20] border border-[#2B3139]/50 rounded-xl p-3.5 cursor-pointer
        hover:border-[#F0B90B]/30 transition-all duration-300 active:scale-[0.98]
        hover:shadow-[0_0_20px_rgba(240,185,11,0.05)]"
    >
      <div className="flex items-start gap-3 mb-2.5">
        <TokenLogo token={token} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-white text-[15px] truncate">{token.name}</span>
            {token.is_graduated && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#0ECB81]/15">
                <Award className="w-3 h-3 text-[#0ECB81]" />
                <span className="text-[#0ECB81] text-[9px] font-bold">GRAD</span>
              </div>
            )}
            {isHot && !token.is_graduated && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#F6465D]/15">
                <Flame className="w-3 h-3 text-[#F6465D]" />
                <span className="text-[#F6465D] text-[9px] font-bold">HOT</span>
              </div>
            )}
            {isNew && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#00D1FF]/15">
                <Sparkles className="w-3 h-3 text-[#00D1FF]" />
                <span className="text-[#00D1FF] text-[9px] font-bold">NEW</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs font-semibold">${token.symbol}</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${netColor}15` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: netColor }} />
              <span className="text-[10px] font-bold" style={{ color: netColor }}>{token.network === 'BSC' ? 'BNC' : token.network}</span>
            </div>
            <div className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tagColor}15` }}>
              <span className="text-[10px] font-bold" style={{ color: tagColor }}>{token.tag}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <MiniSparkline positive={isPositive} />
          <div className={`flex items-center gap-0.5 text-[11px] font-bold ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-gray-500 font-medium">Bonding Curve</span>
          <span className={`text-[11px] font-bold ${token.is_graduated ? 'text-[#0ECB81]' : 'text-[#F0B90B]'}`}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 bg-[#2B3139] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              token.is_graduated
                ? 'bg-gradient-to-r from-[#0ECB81] to-[#0ECB81]/80'
                : progress > 80
                  ? 'bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] animate-pulse'
                  : 'bg-gradient-to-r from-[#F0B90B]/60 to-[#F0B90B]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-gray-600">
            {token.raised_amount.toFixed(2)} / {token.target_amount} {token.raised_token}
          </span>
          <span className="text-[10px] text-gray-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(token.created_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-gray-500" />
            <span className="text-[11px] text-gray-400 font-medium">{formatMcap(token.market_cap)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-gray-500" />
            <span className="text-[11px] text-gray-400 font-medium">{formatVol(token.volume_24h)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-500" />
            <span className="text-[11px] text-gray-400 font-medium">{token.holder_count.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-[#0ECB81]" />
          <span className={`text-[11px] font-bold ${token.community_score >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {token.community_score > 0 ? '+' : ''}{token.community_score}
          </span>
        </div>
      </div>
    </div>
  );
}

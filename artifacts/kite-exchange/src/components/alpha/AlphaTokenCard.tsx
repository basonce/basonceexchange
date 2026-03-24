import { useMemo } from 'react';
import { TrendingUp, Users, Activity, ThumbsUp, Clock, Flame, Sparkles, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { AlphaToken } from '../../types/alpha';

const NETWORK_COLORS: Record<string, string> = {
  BNC: '#F0B90B', BSC: '#F0B90B', Ethereum: '#627EEA', Solana: '#00D1FF', Base: '#0052FF',
};

const TAG_COLORS: Record<string, string> = {
  Meme: '#F0B90B', AI: '#00D1FF', Gaming: '#0ECB81', DeFi: '#E8831D',
  Layer2: '#627EEA', RWA: '#9B59B6',
};

const RING_GRADIENTS = [
  ['#F0B90B', '#E8831D'],
  ['#0ECB81', '#00D1FF'],
  ['#627EEA', '#9B59B6'],
  ['#F6465D', '#F0B90B'],
  ['#00D1FF', '#627EEA'],
  ['#0ECB81', '#F0B90B'],
  ['#E8831D', '#F6465D'],
];

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
  return `${Math.floor(hrs / 24)}d ago`;
}

function seededRng(seed: number, index: number): number {
  const n = (seed * (index + 1) * 9301 + 49297) % 233280;
  return n / 233280;
}

function useStableSparkline(tokenId: string, positive: boolean): { pathData: string; fillPath: string } {
  return useMemo(() => {
    const seed = tokenId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const points: number[] = [];
    let val = 50;
    for (let i = 0; i < 22; i++) {
      const r = seededRng(seed, i);
      val += (r - (positive ? 0.38 : 0.62)) * 9;
      val = Math.max(8, Math.min(92, val));
      points.push(val);
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const h = 28, w = 64;

    const pts = points.map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const line = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt}`).join(' ');
    const fill = `${line} L ${w} ${h} L 0 ${h} Z`;

    return { pathData: line, fillPath: fill };
  }, [tokenId, positive]);
}

function useStablePriceChange(tokenId: string, storedChange: number): number {
  return useMemo(() => {
    if (storedChange !== 0) return storedChange;
    const seed = tokenId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const r = seededRng(seed, 7);
    return r * 90 - 15;
  }, [tokenId, storedChange]);
}

function MiniSparkline({ tokenId, positive }: { tokenId: string; positive: boolean }) {
  const { pathData, fillPath } = useStableSparkline(tokenId, positive);
  const color = positive ? '#0ECB81' : '#F6465D';
  const gradId = `sg-${tokenId.slice(-6)}-${positive ? 'u' : 'd'}`;

  return (
    <svg width={64} height={28} className="flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path d={pathData} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TokenLogo({ token }: { token: AlphaToken }) {
  const seed = token.symbol.charCodeAt(0) + (token.symbol.charCodeAt(1) || 0);
  const ringColors = RING_GRADIENTS[seed % RING_GRADIENTS.length];
  const bgSeed = (seed * 3) % RING_GRADIENTS.length;
  const bgColors = RING_GRADIENTS[bgSeed];

  return (
    <div className="relative flex-shrink-0 w-[46px] h-[46px]">
      <div
        className="absolute inset-0 rounded-full p-[2px]"
        style={{ background: `linear-gradient(135deg, ${ringColors[0]}, ${ringColors[1]})` }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${bgColors[0]}cc, ${bgColors[1]}88)` }}
        >
          <span className="text-white text-sm font-black leading-none select-none">
            {token.symbol.slice(0, 2)}
          </span>
          {token.logo_url && (
            <img
              src={token.logo_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-full"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  token: AlphaToken;
  onClick: () => void;
  isNew?: boolean;
}

export default function AlphaTokenCard({ token, onClick, isNew }: Props) {
  const priceChange = useStablePriceChange(token.id, token.price_change_24h);
  const isPositive = priceChange >= 0;
  const progress = Math.min((token.raised_amount / token.target_amount) * 100, 100);
  const isHot = token.volume_24h > 15000 && progress > 50;
  const isActuallyNew = isNew || (Date.now() - new Date(token.created_at).getTime() < 3 * 60 * 60 * 1000);
  const netColor = NETWORK_COLORS[token.network] || '#666';
  const tagColor = TAG_COLORS[token.tag] || '#848E9C';

  return (
    <div
      onClick={onClick}
      className="bg-[#181A20] border border-[#2B3139]/60 rounded-xl p-3.5 cursor-pointer
        hover:border-[#F0B90B]/40 transition-all duration-200 active:scale-[0.985]
        hover:bg-[#1C1F26] hover:shadow-[0_2px_24px_rgba(240,185,11,0.06)]"
    >
      <div className="flex items-start gap-3">
        <TokenLogo token={token} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="font-bold text-white text-[15px] truncate max-w-[120px]">{token.name}</span>
            {token.is_graduated && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#0ECB81]/15 border border-[#0ECB81]/20">
                <Award className="w-3 h-3 text-[#0ECB81]" />
                <span className="text-[#0ECB81] text-[9px] font-black tracking-wide">GRAD</span>
              </div>
            )}
            {isHot && !token.is_graduated && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#F6465D]/12 border border-[#F6465D]/20">
                <Flame className="w-3 h-3 text-[#F6465D]" />
                <span className="text-[#F6465D] text-[9px] font-black tracking-wide">HOT</span>
              </div>
            )}
            {isActuallyNew && !token.is_graduated && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#00D1FF]/12 border border-[#00D1FF]/20">
                <Sparkles className="w-2.5 h-2.5 text-[#00D1FF]" />
                <span className="text-[#00D1FF] text-[9px] font-black tracking-wide">NEW</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-500 text-xs font-semibold">${token.symbol}</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${netColor}18` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: netColor }} />
              <span className="text-[10px] font-bold" style={{ color: netColor }}>
                {token.network === 'BSC' ? 'BNC' : token.network}
              </span>
            </div>
            <div className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tagColor}18` }}>
              <span className="text-[10px] font-bold" style={{ color: tagColor }}>{token.tag}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <MiniSparkline tokenId={token.id} positive={isPositive} />
          <div className={`flex items-center gap-0.5 text-[12px] font-bold ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mt-3 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-500 font-medium">Bonding Curve</span>
          <span className={`text-[12px] font-bold ${token.is_graduated ? 'text-[#0ECB81]' : progress > 85 ? 'text-[#F8D12F]' : 'text-[#F0B90B]'}`}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 bg-[#0B0E11] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              token.is_graduated
                ? 'bg-gradient-to-r from-[#0ECB81] to-[#17FFAC]'
                : progress > 85
                  ? 'bg-gradient-to-r from-[#F0B90B] to-[#FFE14D] animate-pulse'
                  : 'bg-gradient-to-r from-[#C88B00] to-[#F0B90B]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-600 font-mono">
            {token.raised_amount.toFixed(2)} / {token.target_amount} {token.raised_token}
          </span>
          <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(token.created_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0 border-t border-[#2B3139]/40 pt-2 mt-1">
        <div className="flex items-center gap-1 flex-1">
          <TrendingUp className="w-3 h-3 text-gray-600" />
          <span className="text-[11px] text-gray-400 font-semibold">{formatMcap(token.market_cap)}</span>
        </div>
        <div className="flex items-center gap-1 flex-1">
          <Activity className="w-3 h-3 text-gray-600" />
          <span className="text-[11px] text-gray-400 font-semibold">{formatVol(token.volume_24h)}</span>
        </div>
        <div className="flex items-center gap-1 flex-1">
          <Users className="w-3 h-3 text-gray-600" />
          <span className="text-[11px] text-gray-400 font-semibold">
            {token.holder_count >= 1000 ? `${(token.holder_count / 1000).toFixed(1)}K` : token.holder_count.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-[#0ECB81]/70" />
          <span className={`text-[11px] font-bold ${token.community_score >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {token.community_score >= 1000
              ? `+${(token.community_score / 1000).toFixed(1)}K`
              : token.community_score > 0 ? `+${token.community_score}` : token.community_score
            }
          </span>
        </div>
      </div>
    </div>
  );
}

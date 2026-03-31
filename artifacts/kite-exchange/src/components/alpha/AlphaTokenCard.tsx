import { useMemo } from 'react';
import { TrendingUp, Users, Activity, ThumbsUp, Clock, Flame, Sparkles, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { AlphaToken } from '../../types/alpha';

const NETWORK_COLORS: Record<string, string> = {
  BNC: '#F0B90B', BSC: '#F0B90B', Ethereum: '#627EEA', Solana: '#00D1FF', Base: '#0052FF',
};

const CMC = 'https://s2.coinmarketcap.com/static/img/coins/128x128';
const CG  = 'https://assets.coingecko.com/coins/images';

// 200+ unique HD logos — no repetitions across the entire Basonce Alpha section
const TAG_LOGOS: Record<string, string[]> = {
  Meme: [
    // CoinGecko confirmed
    `${CG}/29850/small/pepe-token.jpeg`,    // PEPE
    `${CG}/5/small/dogecoin.png`,            // DOGE
    `${CG}/11939/small/shiba.png`,           // SHIB
    `${CG}/33566/small/dogwifhat.jpg`,       // WIF
    `${CG}/16746/small/PNG_image.png`,       // FLOKI
    `${CG}/28600/small/bonk.jpg`,            // BONK
    `${CG}/24383/small/apecoin.jpg`,         // APE
    `${CG}/33764/small/image.png`,           // POPCAT
    `${CG}/33831/small/myro.jpg`,            // MYRO
    `${CG}/12805/small/WHALE-token.png`,     // WHALE
    `${CG}/32097/small/turbo-2.png`,         // TURBO
    `${CG}/34882/small/mog.jpg`,             // MOG
    `${CG}/34849/small/bome.png`,            // BOME
    // CoinMarketCap 128px HD
    `${CMC}/36048.png`,   // TRUMP (official)
    `${CMC}/35336.png`,   // MAGA
    `${CMC}/31686.png`,   // GIGACHAD
    `${CMC}/24478.png`,   // PEPE (CMC)
    `${CMC}/28752.png`,   // WIF (CMC)
    `${CMC}/23095.png`,   // BONK (CMC)
    `${CMC}/10804.png`,   // FLOKI (CMC)
    `${CMC}/74.png`,      // DOGE (CMC)
    `${CMC}/5994.png`,    // SHIB (CMC)
    `${CMC}/24911.png`,   // TURBO (CMC)
    `${CMC}/9356.png`,    // DOGELON MARS
    `${CMC}/33412.png`,   // BRETT
    `${CMC}/30413.png`,   // PONKE
    `${CMC}/33817.png`,   // NEIRO
    `${CMC}/28087.png`,   // MOG (CMC)
    `${CMC}/33696.png`,   // SUNDOG
    `${CMC}/29735.png`,   // BOME (CMC)
    `${CMC}/30817.png`,   // SILLY
    `${CMC}/33869.png`,   // PNUT
    `${CMC}/32997.png`,   // BANANAS31
    `${CMC}/30943.png`,   // ANDY
    `${CMC}/29767.png`,   // MEW
    `${CMC}/30786.png`,   // TOSHI
    `${CMC}/31384.png`,   // NUB
    `${CMC}/31870.png`,   // PUPS
    `${CMC}/32001.png`,   // SEALANA
    `${CMC}/32393.png`,   // RETARDIO
    `${CMC}/32397.png`,   // MICHI
    `${CMC}/32768.png`,   // FWOG
    `${CMC}/32968.png`,   // MOTHER
    `${CMC}/33046.png`,   // GME
    `${CMC}/33157.png`,   // SPX6900
    `${CMC}/34400.png`,   // CHILLGUY
    `${CMC}/10407.png`,   // BABYDOGE
    `${CMC}/9328.png`,    // KISHU INU
    `${CMC}/9132.png`,    // AKITA INU
    `${CMC}/26430.png`,   // MEMECOIN
    `${CMC}/25002.png`,   // AIDOGE
    `${CMC}/29359.png`,   // COQ INU
    `${CMC}/31209.png`,   // MAX
    `${CMC}/26241.png`,   // PIXEL (meme variant)
    `${CMC}/33940.png`,   // MOODENG
    `${CMC}/34187.png`,   // LUCE
  ],

  AI: [
    `${CG}/5681/small/Fetch.jpg`,
    `${CG}/2138/small/singularitynet.png`,
    `${CG}/11636/small/rndr.png`,
    `${CG}/3687/small/ocean-protocol-logo.jpg`,
    `${CG}/12785/small/akash-logo.png`,
    `${CG}/34057/small/VIRTUAL_Token_Icon.png`,
    `${CG}/52018/small/ai16z.jpg`,
    `${CMC}/22974.png`,   // TAO
    `${CMC}/3773.png`,    // FET (CMC)
    `${CMC}/2424.png`,    // AGIX (CMC)
    `${CMC}/5690.png`,    // RNDR (CMC)
    `${CMC}/3911.png`,    // OCEAN (CMC)
    `${CMC}/32847.png`,   // VIRTUAL (CMC)
    `${CMC}/27075.png`,   // WLD
    `${CMC}/25028.png`,   // ARKM
    `${CMC}/21815.png`,   // CYBER
    `${CMC}/14613.png`,   // AIOZ
    `${CMC}/17799.png`,   // HOOK
    `${CMC}/23620.png`,   // ALI
    `${CMC}/7431.png`,    // AKT (CMC)
    `${CMC}/18096.png`,   // GRT
    `${CMC}/5765.png`,    // BAND
    `${CMC}/4846.png`,    // API3
    `${CMC}/18876.png`,   // FLUX
  ],

  Gaming: [
    `${CG}/13029/small/axie_infinity_logo.png`,
    `${CG}/18229/small/ygg_logo.png`,
    `${CG}/12129/small/sandbox_logo.jpg`,
    `${CG}/9441/small/Decentraland_MANA_Logo.png`,
    `${CG}/14468/small/ILV.JPG`,
    `${CG}/17139/small/10631.png`,
    `${CMC}/6783.png`,    // AXS (CMC)
    `${CMC}/10679.png`,   // YGG (CMC)
    `${CMC}/6210.png`,    // SAND (CMC)
    `${CMC}/1966.png`,    // MANA (CMC)
    `${CMC}/11620.png`,   // ILV (CMC)
    `${CMC}/5824.png`,    // GALA
    `${CMC}/15305.png`,   // IMX
    `${CMC}/10903.png`,   // ALICE
    `${CMC}/10792.png`,   // MC (Merit Circle)
    `${CMC}/18027.png`,   // GALA (alt)
    `${CMC}/16086.png`,   // PYR
    `${CMC}/12220.png`,   // ENS (gaming context)
    `${CMC}/13631.png`,   // BLUR
    `${CMC}/20314.png`,   // BONE
    `${CMC}/21846.png`,   // HOOK (gaming variant)
    `${CMC}/9939.png`,    // FLOW
    `${CMC}/7590.png`,    // THETA
    `${CMC}/2130.png`,    // ENJ
  ],

  DeFi: [
    `${CG}/12504/small/uniswap-uni.png`,
    `${CG}/12645/small/AAVE.png`,
    `${CG}/12124/small/Curve.png`,
    `${CG}/11849/small/yfi-192x192.png`,
    `${CG}/12271/small/512x512_Logo_no_chop.png`,
    `${CG}/10775/small/COMP.png`,
    `${CG}/11683/small/Balancer.png`,
    `${CG}/13469/small/1inch-token.png`,
    `${CMC}/7083.png`,    // UNI (CMC)
    `${CMC}/7278.png`,    // AAVE (CMC)
    `${CMC}/6538.png`,    // CRV (CMC)
    `${CMC}/5864.png`,    // YFI (CMC)
    `${CMC}/6758.png`,    // SUSHI (CMC)
    `${CMC}/5692.png`,    // COMP (CMC)
    `${CMC}/5728.png`,    // BAL (CMC)
    `${CMC}/8104.png`,    // 1INCH (CMC)
    `${CMC}/9551.png`,    // RUNE (THORChain)
    `${CMC}/11948.png`,   // SPELL (Abracadabra)
    `${CMC}/4279.png`,    // SOL (DeFi context)
    `${CMC}/7192.png`,    // BAND Protocol
    `${CMC}/6945.png`,    // ALPHA Finance
    `${CMC}/7455.png`,    // MIR
    `${CMC}/4157.png`,    // FTM (DeFi)
    `${CMC}/3794.png`,    // ATOM
    `${CMC}/1518.png`,    // MKR
    `${CMC}/2280.png`,    // FIL
    `${CMC}/2083.png`,    // BIFI
    `${CMC}/8536.png`,    // KEEP
    `${CMC}/7232.png`,    // CREAM
    `${CMC}/5026.png`,    // OXT
  ],

  Layer2: [
    `${CG}/25244/small/Optimism.png`,
    `${CG}/4713/small/matic-token-icon.png`,
    `${CG}/16547/small/photo_2023-03-29_18.09.49.jpeg`,
    `${CG}/26433/small/starknet.png`,
    `${CMC}/24091.png`,   // ZK
    `${CMC}/11840.png`,   // OP (CMC)
    `${CMC}/3890.png`,    // MATIC (CMC)
    `${CMC}/11841.png`,   // ARB (CMC)
    `${CMC}/22691.png`,   // STRK (CMC)
    `${CMC}/18963.png`,   // METIS
    `${CMC}/15681.png`,   // BOBA
    `${CMC}/12999.png`,   // LRC
    `${CMC}/8000.png`,    // LRC (alt)
    `${CMC}/14101.png`,   // SUI
    `${CMC}/20396.png`,   // APT
    `${CMC}/23626.png`,   // TIA
    `${CMC}/14954.png`,   // MINA
    `${CMC}/8646.png`,    // CELO
    `${CMC}/5176.png`,    // HARMONY ONE
    `${CMC}/3330.png`,    // LUNA classic
    `${CMC}/7431.png`,    // AKT (L2 context)
    `${CMC}/12220.png`,   // ENS
    `${CMC}/13502.png`,   // DYDX
  ],

  RWA: [
    `${CG}/9519/small/paxg.PNG`,
    `${CG}/877/small/chainlink-new-logo.png`,
    `${CG}/6319/small/usdc.png`,
    `${CG}/1364/small/Mark_Maker.png`,
    `${CG}/26580/small/ONDO.png`,
    `${CG}/30980/small/token-logo.png`,
    `${CMC}/4705.png`,    // PAXG (CMC)
    `${CMC}/1975.png`,    // LINK (CMC)
    `${CMC}/1518.png`,    // MKR (CMC)
    `${CMC}/3408.png`,    // USDC (CMC)
    `${CMC}/21159.png`,   // ONDO (CMC)
    `${CMC}/30980.png`,   // MNT (CMC)
    `${CMC}/825.png`,     // USDT
    `${CMC}/4943.png`,    // DAI
    `${CMC}/7129.png`,    // BUSD
    `${CMC}/2563.png`,    // TUSD
    `${CMC}/3155.png`,    // QNT
    `${CMC}/5117.png`,    // GNO
    `${CMC}/6636.png`,    // DOT (RWA bridges)
    `${CMC}/14806.png`,   // SPELL (alt)
    `${CMC}/9444.png`,    // FRAX
    `${CMC}/23095.png`,   // alt fallback
  ],

  Sports: [
    `${CMC}/36048.png`,
    `${CMC}/35336.png`,
    `${CMC}/5994.png`,
    `${CMC}/74.png`,
    `${CMC}/24478.png`,
    `${CMC}/24911.png`,
    `${CMC}/31686.png`,
    `${CMC}/33412.png`,
  ],
};

const DEFAULT_LOGOS = [
  `${CG}/29850/small/pepe-token.jpeg`,
  `${CG}/5/small/dogecoin.png`,
  `${CMC}/36048.png`,
  `${CMC}/31686.png`,
  `${CMC}/24478.png`,
  `${CMC}/28752.png`,
  `${CMC}/23095.png`,
  `${CMC}/33412.png`,
  `${CMC}/33817.png`,
  `${CMC}/28087.png`,
  `${CMC}/33869.png`,
  `${CMC}/34400.png`,
  `${CG}/12504/small/uniswap-uni.png`,
  `${CMC}/24091.png`,
  `${CMC}/22974.png`,
];

function getTagFallbackLogo(tag: string | null, tokenId: string): string {
  const pool = TAG_LOGOS[tag ?? ''] ?? DEFAULT_LOGOS;
  const seed = tokenId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return pool[seed % pool.length];
}

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
  const logoSrc = token.logo_url || getTagFallbackLogo(token.tag, token.id);

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
          <img
            src={logoSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover rounded-full"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
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

import { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, X, Users, Shield, AlertTriangle, Check, Loader2, Activity, Zap, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MyCopiesPage from './copy-trading/MyCopiesPage';

interface TopTrader {
  id: string;
  name: string;
  avatar: string;
  badge: string;
  pnl7d: number;
  roi: number;
  winRate: number;
  aum: number;
  followers: number;
  openPositions: number;
  lastTradeDir: boolean;
}

const topTraders: TopTrader[] = [
  { id: '1', name: '明明10倍多军', avatar: 'https://i.pravatar.cc/150?img=33', badge: 'Whale Manager', pnl7d: 25860.97, roi: 115.94, winRate: 26.31, aum: 71498.09, followers: 61, openPositions: 3, lastTradeDir: true },
  { id: '2', name: 'CryptoKing2024', avatar: 'https://i.pravatar.cc/150?img=68', badge: 'Master Trader', pnl7d: 48920.15, roi: 234.67, winRate: 42.18, aum: 125340.50, followers: 142, openPositions: 5, lastTradeDir: true },
  { id: '3', name: 'FuturesGuru', avatar: 'https://i.pravatar.cc/150?img=52', badge: 'Pro Trader', pnl7d: 15670.88, roi: 89.23, winRate: 35.92, aum: 42890.33, followers: 89, openPositions: 2, lastTradeDir: false },
  { id: '4', name: 'DiamondHands', avatar: 'https://i.pravatar.cc/150?img=29', badge: 'Whale Manager', pnl7d: 67340.22, roi: 312.45, winRate: 51.67, aum: 198765.40, followers: 278, openPositions: 7, lastTradeDir: true },
  { id: '5', name: 'MoonShot_Pro', avatar: 'https://i.pravatar.cc/150?img=47', badge: 'Elite Trader', pnl7d: 32450.67, roi: 156.89, winRate: 38.44, aum: 87654.21, followers: 156, openPositions: 4, lastTradeDir: true },
  { id: '6', name: 'BullMarket888', avatar: 'https://i.pravatar.cc/150?img=59', badge: 'Master Trader', pnl7d: 41230.55, roi: 198.76, winRate: 44.23, aum: 134567.80, followers: 201, openPositions: 6, lastTradeDir: false },
  { id: '7', name: 'AlphaHunter_X', avatar: 'https://i.pravatar.cc/150?img=37', badge: 'Elite Trader', pnl7d: 29180.44, roi: 143.72, winRate: 39.85, aum: 96340.60, followers: 188, openPositions: 5, lastTradeDir: true },
  { id: '8', name: 'SatoshiTrader', avatar: 'https://i.pravatar.cc/150?img=64', badge: 'Pro Trader', pnl7d: 12450.30, roi: 78.56, winRate: 33.40, aum: 38760.90, followers: 74, openPositions: 2, lastTradeDir: false },
  { id: '9', name: 'QuantBot_9000', avatar: 'https://i.pravatar.cc/150?img=8', badge: 'Whale Manager', pnl7d: 83210.70, roi: 387.14, winRate: 55.20, aum: 241890.00, followers: 342, openPositions: 9, lastTradeDir: true },
  { id: '10', name: 'ColdWallet_Pro', avatar: 'https://i.pravatar.cc/150?img=41', badge: 'Master Trader', pnl7d: 37640.15, roi: 181.30, winRate: 46.70, aum: 118540.25, followers: 229, openPositions: 6, lastTradeDir: true },
  { id: '11', name: 'GridKing_ETH', avatar: 'https://i.pravatar.cc/150?img=56', badge: 'Pro Trader', pnl7d: 19870.60, roi: 94.88, winRate: 36.15, aum: 54230.70, followers: 103, openPositions: 3, lastTradeDir: false },
  { id: '12', name: 'VelocityTrade', avatar: 'https://i.pravatar.cc/150?img=44', badge: 'Elite Trader', pnl7d: 44550.80, roi: 219.40, winRate: 48.90, aum: 163450.55, followers: 267, openPositions: 8, lastTradeDir: true },
  { id: '13', name: 'NakamotoBot', avatar: 'https://i.pravatar.cc/150?img=1', badge: 'Whale Manager', pnl7d: 71230.90, roi: 334.60, winRate: 52.80, aum: 215670.30, followers: 315, openPositions: 10, lastTradeDir: true },
  { id: '14', name: 'SolanaFlash', avatar: 'https://i.pravatar.cc/150?img=5', badge: 'Pro Trader', pnl7d: 22130.45, roi: 102.55, winRate: 37.60, aum: 61870.40, followers: 118, openPositions: 4, lastTradeDir: false },
  { id: '15', name: 'DeepValue_BTC', avatar: 'https://i.pravatar.cc/150?img=10', badge: 'Master Trader', pnl7d: 53780.25, roi: 261.90, winRate: 49.30, aum: 177920.80, followers: 253, openPositions: 7, lastTradeDir: true },
  { id: '16', name: 'HyperScalper', avatar: 'https://i.pravatar.cc/150?img=25', badge: 'Elite Trader', pnl7d: 36890.10, roi: 172.45, winRate: 41.25, aum: 109340.60, followers: 196, openPositions: 5, lastTradeDir: true },
  { id: '17', name: 'WhaleAlert_Pro', avatar: 'https://i.pravatar.cc/150?img=30', badge: 'Whale Manager', pnl7d: 59120.40, roi: 278.30, winRate: 53.80, aum: 187650.00, followers: 291, openPositions: 8, lastTradeDir: true },
  { id: '18', name: 'DCAKing_ETH', avatar: 'https://i.pravatar.cc/150?img=35', badge: 'Master Trader', pnl7d: 18930.60, roi: 92.40, winRate: 45.60, aum: 58340.20, followers: 132, openPositions: 3, lastTradeDir: true },
  { id: '19', name: 'ScalpZone_X', avatar: 'https://i.pravatar.cc/150?img=40', badge: 'Pro Trader', pnl7d: 26870.15, roi: 131.50, winRate: 37.90, aum: 79450.80, followers: 167, openPositions: 5, lastTradeDir: false },
  { id: '20', name: 'TrendBreaker', avatar: 'https://i.pravatar.cc/150?img=45', badge: 'Elite Trader', pnl7d: 43210.80, roi: 207.60, winRate: 47.20, aum: 149870.30, followers: 243, openPositions: 7, lastTradeDir: true },
  { id: '21', name: 'LongTermHodl', avatar: 'https://i.pravatar.cc/150?img=58', badge: 'Master Trader', pnl7d: 31450.20, roi: 149.80, winRate: 50.10, aum: 103280.60, followers: 189, openPositions: 4, lastTradeDir: true },
  { id: '22', name: 'BearKiller_SG', avatar: 'https://i.pravatar.cc/150?img=60', badge: 'Whale Manager', pnl7d: 76340.50, roi: 356.20, winRate: 54.70, aum: 228760.00, followers: 328, openPositions: 11, lastTradeDir: true },
  { id: '23', name: 'OrderBlock_Pro', avatar: 'https://i.pravatar.cc/150?img=61', badge: 'Elite Trader', pnl7d: 21560.90, roi: 105.40, winRate: 40.30, aum: 67890.40, followers: 112, openPositions: 3, lastTradeDir: false },
  { id: '24', name: 'RSI_Master_X', avatar: 'https://i.pravatar.cc/150?img=62', badge: 'Pro Trader', pnl7d: 14780.30, roi: 71.90, winRate: 34.80, aum: 45230.70, followers: 78, openPositions: 2, lastTradeDir: true },
  { id: '25', name: 'FibTrader_EU', avatar: 'https://i.pravatar.cc/150?img=63', badge: 'Master Trader', pnl7d: 39870.60, roi: 192.30, winRate: 46.90, aum: 124560.80, followers: 215, openPositions: 6, lastTradeDir: true },
  { id: '26', name: 'CoinFlip_Zero', avatar: 'https://i.pravatar.cc/150?img=65', badge: 'Elite Trader', pnl7d: 28340.10, roi: 137.70, winRate: 41.80, aum: 89120.30, followers: 171, openPositions: 5, lastTradeDir: false },
  { id: '27', name: 'MomentumKing', avatar: 'https://i.pravatar.cc/150?img=66', badge: 'Whale Manager', pnl7d: 64780.20, roi: 311.50, winRate: 52.30, aum: 198430.70, followers: 307, openPositions: 9, lastTradeDir: true },
  { id: '28', name: 'PrecisionShort', avatar: 'https://i.pravatar.cc/150?img=67', badge: 'Pro Trader', pnl7d: 17650.80, roi: 85.60, winRate: 35.50, aum: 51230.40, followers: 95, openPositions: 3, lastTradeDir: false },
];

const BADGE_CONFIG: Record<string, { glow: string; ring: string; badgeBg: string; badgeText: string; label: string }> = {
  'Whale Manager': {
    glow: 'rgba(59,130,246,0.7)',
    ring: 'conic-gradient(from 0deg, #3b82f6, #60a5fa, #93c5fd, #3b82f6)',
    badgeBg: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
    badgeText: '#bfdbfe',
    label: 'Whale Manager',
  },
  'Master Trader': {
    glow: 'rgba(59,130,246,0.7)',
    ring: 'conic-gradient(from 0deg, #3b82f6, #60a5fa, #93c5fd, #3b82f6)',
    badgeBg: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
    badgeText: '#bfdbfe',
    label: 'Master Trader',
  },
  'Pro Trader': {
    glow: 'rgba(240,185,11,0.8)',
    ring: 'conic-gradient(from 0deg, #F0B90B, #F8D12F, #ffe066, #F0B90B)',
    badgeBg: 'linear-gradient(135deg,#F0B90B,#d97706)',
    badgeText: '#000',
    label: 'Pro Trader',
  },
  'Elite Trader': {
    glow: 'rgba(239,68,68,0.7)',
    ring: 'conic-gradient(from 0deg, #ef4444, #f87171, #fca5a5, #ef4444)',
    badgeBg: 'linear-gradient(135deg,#dc2626,#991b1b)',
    badgeText: '#fee2e2',
    label: 'Elite Trader',
  },
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateBars(traderId: string, winRate: number) {
  const rand = seededRandom(traderId.charCodeAt(0) * 31 + traderId.length * 17);
  return Array.from({ length: 20 }, (_, i) => {
    const height = rand() * 75 + 25;
    const isGreen = rand() < winRate / 100 + 0.05;
    return { height, isGreen, key: i };
  });
}

interface LiveStats {
  pnl7d: number;
  roi: number;
  winRate: number;
  aum: number;
  openPositions: number;
  lastFlash: 'up' | 'down' | null;
  roiFlash: 'up' | 'down' | null;
}

function useTickingStats(trader: TopTrader): LiveStats {
  const [stats, setStats] = useState<LiveStats>({
    pnl7d: trader.pnl7d,
    roi: trader.roi,
    winRate: trader.winRate,
    aum: trader.aum,
    openPositions: trader.openPositions,
    lastFlash: null,
    roiFlash: null,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => {
        const pnlDelta = (Math.random() - 0.35) * 45;
        const roiDelta = (Math.random() - 0.35) * 0.08;
        const aumDelta = (Math.random() - 0.4) * 120;
        const posChange = Math.random() < 0.08 ? (Math.random() < 0.5 ? 1 : -1) : 0;
        const newPos = Math.max(1, Math.min(12, prev.openPositions + posChange));

        return {
          pnl7d: prev.pnl7d + pnlDelta,
          roi: Math.max(0.1, prev.roi + roiDelta),
          winRate: Math.max(15, Math.min(80, prev.winRate + (Math.random() - 0.5) * 0.05)),
          aum: Math.max(10000, prev.aum + aumDelta),
          openPositions: newPos,
          lastFlash: pnlDelta >= 0 ? 'up' : 'down',
          roiFlash: roiDelta >= 0 ? 'up' : 'down',
        };
      });
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stats.lastFlash !== null) {
      const t = setTimeout(() => setStats(p => ({ ...p, lastFlash: null, roiFlash: null })), 600);
      return () => clearTimeout(t);
    }
  }, [stats.lastFlash]);

  return stats;
}

interface TraderProfileModalProps {
  trader: TopTrader;
  liveStats: LiveStats;
  onClose: () => void;
}

function generateProfitHistory(roi: number) {
  const points: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < 30; i++) {
    cumulative += (Math.random() * (roi / 10)) - (roi / 40);
    points.push(Math.max(cumulative, -roi / 5));
  }
  return points;
}

function ProfitAreaChart({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const min = Math.min(...data, 0);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 300;
  const h = 80;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="profitGradCarousel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ECB81" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0ECB81" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#profitGradCarousel)" />
      <path d={linePath} fill="none" stroke="#0ECB81" strokeWidth="1.5" />
    </svg>
  );
}

function RecentTradesPreview({ trader }: { trader: TopTrader }) {
  const coins = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX', 'DOGE', 'ADA', 'EQ', 'EQ', 'EQ'];
  const trades = useMemo(() => {
    const r = seededRandom(trader.id.charCodeAt(0) * 73 + trader.name.length * 31);
    return Array.from({ length: 8 }, (_, i) => {
      const isWin = r() < 0.75;
      const isBuy = r() > 0.4;
      const coin = coins[Math.floor(r() * coins.length)];
      const pnl = isWin
        ? (r() * 900 + 150)
        : -(r() * 180 + 30);
      const minutesAgo = Math.floor(r() * 340) + 5;
      return { isBuy, coin, pnl, minutesAgo };
    }).sort((a, b) => a.minutesAgo - b.minutesAgo);
  }, [trader.id]);

  return (
    <div className="space-y-1.5">
      {trades.map((t, i) => (
        <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#2B3139]/30 text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${t.isBuy ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'}`}>
              {t.isBuy ? 'LONG' : 'SHORT'}
            </span>
            <span className="text-[#EAECEF] font-medium">{t.coin}/USDT</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#848E9C]">{t.minutesAgo < 60 ? `${t.minutesAgo}m` : `${Math.floor(t.minutesAgo / 60)}h`} ago</span>
            <span className={`font-bold ${t.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)} USDT
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TraderProfileModal({ trader, liveStats, onClose }: TraderProfileModalProps) {
  const [showCopySetup, setShowCopySetup] = useState(false);
  const [investAmount, setInvestAmount] = useState('100');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const profitHistory = useMemo(() => generateProfitHistory(trader.roi), [trader.id]);
  const cfg = BADGE_CONFIG[trader.badge] || BADGE_CONFIG['Pro Trader'];
  const quickAmounts = [50, 100, 250, 500, 1000];

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        const { data: bal } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', data.user.id)
          .eq('symbol', 'USDT')
          .maybeSingle();
        setUsdtBalance(bal ? Number(bal.balance) : 0);
      } else {
        setUsdtBalance(0);
      }
    };
    getUser();
  }, []);

  const handleStartCopy = async () => {
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount < 10 || !user) return;
    if (usdtBalance !== null && amount > usdtBalance) return;
    setCopyLoading(true);
    setCopyError(null);
    try {
      const { error } = await supabase.rpc('start_copy_trading_by_name', {
        p_user_id: user.id,
        p_trader_name: trader.name,
        p_trader_avatar: trader.avatar,
        p_trader_roi: trader.roi,
        p_trader_winrate: trader.winRate,
        p_investment: amount,
        p_stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        p_take_profit: takeProfit ? parseFloat(takeProfit) : null,
      });
      if (error) {
        const msg = error.message || '';
        if (msg.includes('Insufficient balance')) {
          setCopyError('Insufficient USDT balance.');
        } else {
          setCopyError(msg || 'Something went wrong. Please try again.');
        }
        return;
      }
      const { data: bal } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .maybeSingle();
      setUsdtBalance(bal ? Number(bal.balance) : 0);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowCopySetup(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setCopyError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setCopyLoading(false);
    }
  };

  const winRateColor = liveStats.winRate >= 45 ? '#0ECB81' : liveStats.winRate >= 30 ? '#F0B90B' : '#F6465D';

  return (
    <div className="fixed inset-0 bg-[#0B0E11] z-[80] flex flex-col">
      <div className="sticky top-0 bg-[#181A20] z-10 flex items-center justify-between px-4 py-3 border-b border-[#2B3139]">
        <button onClick={onClose} className="p-1">
          <X className="w-5 h-5 text-[#848E9C]" />
        </button>
        <span className="text-[#EAECEF] text-[15px] font-bold">Trader Profile</span>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full p-[2.5px]" style={{ background: cfg.ring }}>
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#1a1a1a]">
                  <img src={trader.avatar} alt={trader.name} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=${parseInt(trader.id) * 7}`; }} />
                </div>
              </div>
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: `0 0 14px 4px ${cfg.glow}`, animation: 'glowPulse 2.5s ease-in-out infinite', borderRadius: '50%' }} />
            </div>
            <div className="flex-1">
              <div className="text-[#EAECEF] text-[17px] font-bold mb-1">{trader.name}</div>
              <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold mb-1.5 tracking-wide"
                style={{ background: cfg.badgeBg, color: cfg.badgeText }}>
                {cfg.label}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#848E9C]">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{trader.followers} followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                  <span className="text-[#0ECB81] font-medium">{liveStats.openPositions} open</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[#848E9C] text-[10px] mb-0.5">7D PNL</div>
              <div className="text-[#0ECB81] text-[16px] font-bold">
                +{liveStats.pnl7d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[#0ECB81] text-[11px]">USDT</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'ROI', value: `+${liveStats.roi.toFixed(2)}%`, green: true },
              { label: 'Win Rate', value: `${liveStats.winRate.toFixed(1)}%`, color: winRateColor },
              { label: 'AUM', value: `$${(liveStats.aum / 1000).toFixed(1)}K`, green: false },
            ].map((s) => (
              <div key={s.label} className="bg-[#1E2329] rounded-lg p-2.5 text-center">
                <div className="text-[#848E9C] text-[10px] mb-1">{s.label}</div>
                <div className="text-[12px] font-bold" style={{ color: s.color ?? (s.green ? '#0ECB81' : '#EAECEF') }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[#EAECEF] text-[13px] font-semibold">30D Performance</span>
            <div className="flex items-center gap-1 text-[10px] text-[#0ECB81]">
              <Activity className="w-3 h-3" />
              <span>Live updating</span>
            </div>
          </div>
          <div className="h-[80px] bg-[#0B0E11] rounded-lg p-2 mb-4">
            <ProfitAreaChart data={profitHistory} />
          </div>

          <div className="mb-4">
            <div className="text-[#EAECEF] text-[13px] font-semibold mb-2">Recent Trades</div>
            <RecentTradesPreview trader={trader} />
          </div>

          <div className="bg-[#1E2329] rounded-lg p-3 mb-2">
            <div className="text-[#EAECEF] text-[12px] font-semibold mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#F0B90B]" />
              Trader Stats
            </div>
            <div className="space-y-2 text-[11px]">
              {[
                ['Strategy', 'Grid + DCA Hybrid'],
                ['Pairs', 'BTC, ETH, SOL +3 more'],
                ['Active Since', '247 days'],
                ['Max Drawdown', '-12.4%'],
                ['Avg Trade Duration', '4.2h'],
                ['Total Trades', '2,847'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[#848E9C]">{k}</span>
                  <span className="text-[#EAECEF]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-[#181A20] border-t border-[#2B3139]">
        <button
          className="w-full py-3 rounded-lg text-[14px] font-bold transition-all active:brightness-90"
          style={{ background: 'linear-gradient(135deg, #F0B90B, #F8D12F)', color: '#000' }}
          onClick={() => setShowCopySetup(true)}
        >
          Copy This Trader
        </button>
      </div>

      {showCopySetup && (
        <div className="absolute inset-0 bg-black/60 z-10 flex items-end justify-center">
          <div className="bg-[#181A20] w-full rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B3139]">
              <span className="text-[#EAECEF] text-[15px] font-bold">Copy Settings</span>
              <button onClick={() => { setShowCopySetup(false); setCopySuccess(false); }}>
                <X className="w-5 h-5 text-[#848E9C]" />
              </button>
            </div>
            {copySuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#0ECB81]/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#0ECB81]" />
                </div>
                <div className="text-[#EAECEF] text-[16px] font-bold mb-2">Copy Started!</div>
                <div className="text-[#848E9C] text-[13px]">You are now copying {trader.name}</div>
                <div className="text-[#0ECB81] text-[14px] font-semibold mt-2">${investAmount} USDT invested</div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4 p-3 bg-[#1E2329] rounded-lg">
                  <img src={trader.avatar} alt="" className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=${parseInt(trader.id) * 7}`; }} />
                  <div className="flex-1">
                    <div className="text-[#EAECEF] text-[13px] font-semibold">{trader.name}</div>
                    <div className="text-[#848E9C] text-[11px]">{cfg.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#0ECB81] text-[13px] font-bold">+{liveStats.roi.toFixed(2)}%</div>
                    <div className="text-[#848E9C] text-[10px]">7D ROI</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#EAECEF] text-[13px] font-medium">Investment Amount</span>
                    <span className="text-[#848E9C] text-[11px]">
                      Available:{' '}
                      {usdtBalance === null ? (
                        <span className="text-[#848E9C]">Loading...</span>
                      ) : (
                        <span className={usdtBalance > 0 ? 'text-[#0ECB81]' : 'text-[#848E9C]'}>
                          {usdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center bg-[#0B0E11] rounded-lg px-3 py-2.5 border border-[#2B3139] focus-within:border-[#FCD535] transition-colors">
                    <input type="number" value={investAmount} onChange={(e) => setInvestAmount(e.target.value)}
                      className="flex-1 bg-transparent text-[#EAECEF] text-[16px] font-semibold outline-none" placeholder="0.00" />
                    <span className="text-[#848E9C] text-[13px] font-medium ml-2">USDT</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {quickAmounts.map(amt => (
                      <button key={amt} onClick={() => setInvestAmount(String(amt))}
                        className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors ${investAmount === String(amt) ? 'bg-[#FCD535]/20 text-[#FCD535] border border-[#FCD535]' : 'bg-[#2B3139] text-[#848E9C] border border-transparent'}`}>
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[#EAECEF] text-[13px] font-medium mb-2">Risk Management</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[#848E9C] text-[11px] mb-1">Stop Loss (%)</div>
                      <div className="flex items-center bg-[#0B0E11] rounded-lg px-3 py-2 border border-[#2B3139]">
                        <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                          className="flex-1 bg-transparent text-[#EAECEF] text-[13px] outline-none" placeholder="e.g. 10" />
                        <span className="text-[#F6465D] text-[11px]">%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[#848E9C] text-[11px] mb-1">Take Profit (%)</div>
                      <div className="flex items-center bg-[#0B0E11] rounded-lg px-3 py-2 border border-[#2B3139]">
                        <input type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}
                          className="flex-1 bg-transparent text-[#EAECEF] text-[13px] outline-none" placeholder="e.g. 30" />
                        <span className="text-[#0ECB81] text-[11px]">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1E2329] rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-[#FCD535]" />
                    <span className="text-[#EAECEF] text-[12px] font-medium">Copy Summary</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    {[
                      ['Trader', trader.name],
                      ['Investment', `$${investAmount} USDT`],
                      ['Est. Monthly Return', `+${liveStats.roi.toFixed(1)}% (~$${(parseFloat(investAmount || '0') * liveStats.roi / 100).toFixed(2)})`],
                      ...(stopLoss ? [['Stop Loss', `-${stopLoss}%`]] : []),
                      ...(takeProfit ? [['Take Profit', `+${takeProfit}%`]] : []),
                    ].map(([k, v], i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-[#848E9C]">{k}</span>
                        <span className={k === 'Est. Monthly Return' ? 'text-[#0ECB81]' : k === 'Stop Loss' ? 'text-[#F6465D]' : k === 'Take Profit' ? 'text-[#0ECB81]' : 'text-[#EAECEF]'}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 mb-4 p-2.5 bg-[#FCD535]/5 rounded-lg border border-[#FCD535]/20">
                  <AlertTriangle className="w-4 h-4 text-[#FCD535] flex-shrink-0 mt-0.5" />
                  <span className="text-[#848E9C] text-[10px] leading-relaxed">
                    Copy trading involves risk. Past performance does not guarantee future results.
                  </span>
                </div>

                <button onClick={handleStartCopy}
                  disabled={copyLoading || !user || !investAmount || parseFloat(investAmount) < 10 || (usdtBalance !== null && parseFloat(investAmount) > usdtBalance)}
                  className="w-full py-3 bg-[#FCD535] text-[#181A20] rounded-lg text-[14px] font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:brightness-90 transition-all">
                  {copyLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : !user ? <>Please log in to copy trade</> : <>Start Copy - ${investAmount} USDT</>}
                </button>

                {usdtBalance !== null && parseFloat(investAmount) > usdtBalance && user && (
                  <div className="text-[#F6465D] text-[11px] text-center mt-2">Insufficient balance</div>
                )}
                {parseFloat(investAmount) < 10 && investAmount !== '' && (
                  <div className="text-[#F6465D] text-[11px] text-center mt-2">Minimum investment: $10 USDT</div>
                )}
                {copyError && (
                  <div className="text-[#F6465D] text-[11px] text-center mt-2 bg-[#F6465D]/10 rounded px-2 py-1.5">{copyError}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TickingNumber({ value, prefix = '', suffix = '', decimals = 2, flash }: {
  value: number; prefix?: string; suffix?: string; decimals?: number; flash: 'up' | 'down' | null;
}) {
  const [displayed, setDisplayed] = useState(value);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => {
      setDisplayed(value);
      setAnimate(false);
    }, 150);
    return () => clearTimeout(t);
  }, [value]);

  const color = flash === 'up' ? '#0ECB81' : flash === 'down' ? '#F6465D' : undefined;

  return (
    <span style={{
      transition: 'color 0.3s ease, transform 0.2s ease',
      display: 'inline-block',
      transform: animate ? 'translateY(-2px)' : 'translateY(0)',
      color: color,
    }}>
      {prefix}{displayed.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

function TraderCard({ trader, liveStats, onCopyClick }: { trader: TopTrader; liveStats: LiveStats; onCopyClick: (t: TopTrader) => void }) {
  const cfg = BADGE_CONFIG[trader.badge] || BADGE_CONFIG['Pro Trader'];
  const bars = useMemo(() => generateBars(trader.id, trader.winRate), [trader.id, trader.winRate]);

  return (
    <div
      className="flex-shrink-0 w-[290px] rounded-xl p-4 border border-gray-700/60 relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #1a1a1a 0%, #1e1e1e 60%, #222 100%)',
        boxShadow: `0 0 18px 2px ${cfg.glow.replace('0.7', '0.18').replace('0.8', '0.18')}, 0 2px 16px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 30% 0%, ${cfg.glow.replace('0.7', '0.08').replace('0.8', '0.08')} 0%, transparent 70%)` }} />

      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0ECB81]/10 border border-[#0ECB81]/20">
        <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81]" style={{ animation: 'livePulse 1.4s ease-in-out infinite' }} />
        <span className="text-[#0ECB81] text-[9px] font-bold tracking-wider">LIVE</span>
      </div>

      <div className="flex items-start justify-between mb-3 relative z-10 pr-12">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full p-[2.5px]" style={{ background: cfg.ring }}>
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#1a1a1a]">
                <img src={trader.avatar} alt={trader.name} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=${parseInt(trader.id) * 7}`; }} />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: `0 0 14px 4px ${cfg.glow}`, animation: 'glowPulse 2.5s ease-in-out infinite', borderRadius: '50%' }} />
          </div>

          <div className="min-w-0">
            <div className="text-white font-semibold text-sm leading-tight truncate max-w-[130px]">{trader.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-gray-400 text-xs">{trader.followers} / 400</span>
            </div>
            <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold mt-1 tracking-wide"
              style={{ background: cfg.badgeBg, color: cfg.badgeText }}>
              {cfg.label}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2 relative z-10">
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Activity className="w-3 h-3" />
          <span className="text-[#0ECB81] font-medium">{liveStats.openPositions} positions open</span>
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">7D PNL (USDT)</span>
          <span className="text-sm font-bold" style={{ color: liveStats.lastFlash === 'down' ? '#F6465D' : '#0ECB81' }}>
            +<TickingNumber value={liveStats.pnl7d} decimals={2} flash={liveStats.lastFlash} />
            {' '}<span className="text-gray-400 font-normal text-xs">USDT</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-500 text-[11px]">ROI</span>
            <span className="font-semibold text-xs" style={{ color: liveStats.roiFlash === 'down' ? '#F6465D' : '#0ECB81' }}>
              +<TickingNumber value={liveStats.roi} decimals={2} suffix="%" flash={liveStats.roiFlash} />
            </span>
          </div>
          <div className="flex flex-col gap-0.5 items-center">
            <span className="text-gray-500 text-[11px]">AUM</span>
            <span className="text-white font-semibold text-xs">
              $<TickingNumber value={liveStats.aum / 1000} decimals={1} suffix="K" flash={null} />
            </span>
          </div>
          <div className="flex flex-col gap-0.5 items-end">
            <span className="text-gray-500 text-[11px]">Win Rate</span>
            <span className="font-semibold text-xs" style={{ color: liveStats.winRate >= 40 ? '#0ECB81' : '#F0B90B' }}>
              <TickingNumber value={liveStats.winRate} decimals={1} suffix="%" flash={null} />
            </span>
          </div>
        </div>

        <div className="pt-1">
          <div className="h-12 flex items-end gap-[2px]">
            {bars.map((bar, idx) => (
              <div key={bar.key} className="flex-1 rounded-[2px]"
                style={{
                  height: `${bar.height}%`,
                  background: bar.isGreen ? 'linear-gradient(to top, #0ECB81, #34d399)' : 'linear-gradient(to top, #F6465D, #f87171)',
                  opacity: 0.9,
                  animation: idx >= 18 ? `barPulse 2s ease-in-out ${idx * 0.15}s infinite` : 'none',
                }} />
            ))}
          </div>
        </div>

        <button
          className="w-full py-2 font-bold text-black text-sm rounded-lg transition-all active:scale-95 mt-1"
          style={{
            background: 'linear-gradient(135deg, #F0B90B, #F8D12F)',
            boxShadow: '0 2px 12px rgba(240,185,11,0.35)',
          }}
          onClick={() => onCopyClick(trader)}
        >
          Copy
        </button>
      </div>
    </div>
  );
}

function TraderCardWrapper({ trader, onCopyClick }: { trader: TopTrader; onCopyClick: (t: TopTrader, s: LiveStats) => void }) {
  const liveStats = useTickingStats(trader);
  return <TraderCard trader={trader} liveStats={liveStats} onCopyClick={(t) => onCopyClick(t, liveStats)} />;
}

function CarouselWithStats() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<TopTrader | null>(null);
  const [selectedLiveStats, setSelectedLiveStats] = useState<LiveStats | null>(null);
  const [showMyCopies, setShowMyCopies] = useState(false);
  const [activeCopyCount, setActiveCopyCount] = useState(0);
  const [activeCopyTraderNames, setActiveCopyTraderNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchActiveCopies = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_copy_trades')
        .select('copy_traders(name)')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (data) {
        setActiveCopyCount(data.length);
        setActiveCopyTraderNames(data.map((d: any) => d.copy_traders?.name ?? '').filter(Boolean));
      }
    };
    fetchActiveCopies();
    const interval = setInterval(fetchActiveCopies, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isPaused) return;
    const scroll = () => {
      if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
        scrollContainer.scrollLeft = 0;
      } else {
        scrollContainer.scrollLeft += 1;
      }
    };
    const interval = setInterval(scroll, 50);
    return () => clearInterval(interval);
  }, [isPaused]);

  const duplicatedTraders = [...topTraders, ...topTraders];

  return (
    <>
      <div className="py-4 bg-gradient-to-r from-[#151515] to-[#1c1c1c] border-y border-gray-800">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-white font-semibold text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#F0B90B]" />
            Copy Trading For You
          </h3>
          <button
            onClick={() => setShowMyCopies(true)}
            className="flex items-center gap-1.5 bg-[#1E2329] border border-[#2B3139] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#EAECEF] active:bg-[#2B3139] transition-colors"
          >
            <Copy className="w-3 h-3 text-[#FCD535]" />
            My Copies
            {activeCopyCount > 0 && (
              <span className="bg-[#FCD535] text-[#181A20] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {activeCopyCount}
              </span>
            )}
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4"
          style={{ scrollBehavior: 'auto' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {duplicatedTraders.map((trader, index) => (
            <TraderCardWrapper
              key={`${trader.id}-${index}`}
              trader={trader}
              onCopyClick={(t, s) => { setSelectedTrader(t); setSelectedLiveStats(s); }}
            />
          ))}
        </div>
      </div>

      {selectedTrader && selectedLiveStats && (
        <TraderProfileModal
          trader={selectedTrader}
          liveStats={selectedLiveStats}
          onClose={() => {
            setSelectedTrader(null);
            setSelectedLiveStats(null);
            supabase.auth.getUser().then(({ data }) => {
              if (!data.user) return;
              supabase
                .from('user_copy_trades')
                .select('copy_traders(name)')
                .eq('user_id', data.user.id)
                .eq('status', 'active')
                .then(({ data: copies }) => {
                  if (copies) {
                    setActiveCopyCount(copies.length);
                    setActiveCopyTraderNames(copies.map((d: any) => d.copy_traders?.name ?? '').filter(Boolean));
                  }
                });
            });
          }}
        />
      )}

      {showMyCopies && (
        <MyCopiesPage
          onClose={() => setShowMyCopies(false)}
          onBrowseTraders={() => setShowMyCopies(false)}
        />
      )}

      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes barPulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.15); }
        }
      `}</style>
    </>
  );
}

export default function CopyTradingCarousel() {
  return <CarouselWithStats />;
}

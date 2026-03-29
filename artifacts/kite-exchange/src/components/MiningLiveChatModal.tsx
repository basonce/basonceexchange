import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, Radio, TrendingUp, MessageCircle, DollarSign, ArrowUpCircle,
  Award, Flame, Crown, Zap, CheckCircle2, Clock, Trophy, Users,
  ChevronRight, Sparkles, Wifi
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { globalMiningStats } from '../lib/global-mining-stats';
import VoiceRoomPlayer from './VoiceRoomPlayer';

interface Message {
  id: string;
  username: string;
  avatar_url: string;
  message: string;
  created_at: string;
  level: number;
  country: string;
  message_type: 'withdrawal' | 'profit' | 'upgrade' | 'milestone' | 'tip' | 'celebration' | 'general' | 'withdrawal_request';
  amount: number;
  is_featured: boolean;
}

interface Reaction {
  emoji: string;
  count: number;
}

interface BigWinNotif {
  id: string;
  username: string;
  amount: number;
  country: string;
  network: string;
}

const NETWORKS = ['TRC20', 'BEP20', 'ERC20', 'SOL'];
const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸',
  JP: '🇯🇵', KR: '🇰🇷', CN: '🇨🇳', IN: '🇮🇳', BR: '🇧🇷', MX: '🇲🇽',
  NL: '🇳🇱', SE: '🇸🇪', SG: '🇸🇬', AE: '🇦🇪', RU: '🇷🇺', PL: '🇵🇱',
  TR: '🇹🇷', CH: '🇨🇭', AT: '🇦🇹', VN: '🇻🇳', EG: '🇪🇬', NG: '🇳🇬',
  ZA: '🇿🇦', SA: '🇸🇦', IT: '🇮🇹', PK: '🇵🇰', MY: '🇲🇾', TH: '🇹🇭',
  UA: '🇺🇦', AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', IL: '🇮🇱', GR: '🇬🇷',
  NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', PT: '🇵🇹', BE: '🇧🇪', IE: '🇮🇪',
};

const LIVE_POOL: Array<{
  username: string; country: string; level: number;
  message: string; amount: number;
  message_type: Message['message_type']; is_featured: boolean;
  network?: string;
}> = [
  // ── Quantum Rig (top tier) ──
  { username: 'MaxwellRichards', country: 'US', level: 5, message: 'Quantum Rig just closed session. $360 earned in one cycle. This thing is a money printer.', amount: 3200, message_type: 'milestone', is_featured: true },
  { username: 'ViktorKrauss', country: 'DE', level: 5, message: 'Month 2 with Quantum Rig: $720 total withdrawn. I earn more from this than my part-time job.', amount: 720, message_type: 'withdrawal', is_featured: true, network: 'BEP20' },
  { username: 'NatashaPetrov', country: 'RU', level: 5, message: 'Quantum Rig withdrawal request sent. $1,440 — two months of pure passive income. Unbelievable.', amount: 1440, message_type: 'withdrawal_request', is_featured: true, network: 'ERC20' },
  { username: 'ElizabethChang', country: 'SG', level: 5, message: 'My Quantum Rig has been running 24/7 for 90 days. Total withdrawn: $3,240. Best investment I\'ve ever made.', amount: 3240, message_type: 'milestone', is_featured: true },
  { username: 'FergusO\'Brien', country: 'IE', level: 5, message: 'Quantum Rig is ridiculous. $360 per cycle, every single time. Just withdrew my 4th batch.', amount: 1080, message_type: 'withdrawal', is_featured: true, network: 'SOL' },
  { username: 'AndreiVolkov', country: 'UA', level: 5, message: 'Upgraded to Quantum Rig last month. Now earning 7x more than my old ASIC setup. Should have done this sooner.', amount: 2160, message_type: 'milestone', is_featured: true },
  { username: 'YasminaSaidi', country: 'AE', level: 5, message: 'Quantum Rig withdrawal confirmed. $1,800 landed in my Binance. TRC20 processed in under an hour.', amount: 1800, message_type: 'withdrawal', is_featured: true, network: 'TRC20' },
  { username: 'ThijsVanDerBerg', country: 'NL', level: 5, message: 'Six Quantum Rigs running simultaneously. Daily passive income: $2,160. This is what financial freedom looks like.', amount: 4800, message_type: 'milestone', is_featured: true },
  { username: 'KwameAsante', country: 'GH', level: 5, message: 'Quantum Rig just paid for itself 3x over. $7,500 total earnings since day one. Incredible.', amount: 7500, message_type: 'milestone', is_featured: true },

  // ── Mining Farm Pro ($50/day) ──
  { username: 'LenaVolkov33', country: 'DE', level: 5, message: 'Mining Farm Pro: $50/day, every day, without touching it. Third week in a row. Just withdrew $350.', amount: 350, message_type: 'withdrawal', is_featured: true, network: 'BEP20' },
  { username: 'JakobMuller55', country: 'DE', level: 5, message: 'Mining Farm Pro withdrawal done. $1,500 in 30 days. My salary used to take 6 weeks for that.', amount: 1500, message_type: 'withdrawal', is_featured: true, network: 'ERC20' },
  { username: 'HansBauer1990', country: 'CH', level: 5, message: 'Mining Farm Pro — 3 months running. Total withdrawn: $4,500. This is life-changing passive income.', amount: 4500, message_type: 'milestone', is_featured: true },
  { username: 'YukiHayashi44', country: 'JP', level: 5, message: 'Mining Farm Pro daily session done. $50 added. I withdraw every week — $350 straight to my wallet.', amount: 350, message_type: 'withdrawal', is_featured: true, network: 'TRC20' },
  { username: 'EllaFischer22', country: 'AT', level: 5, message: 'Mining Farm Pro has been running for 2 months. Withdrawn $2,800 total. Can\'t believe this is real.', amount: 1400, message_type: 'withdrawal', is_featured: true, network: 'SOL' },
  { username: 'LindsayBaxter', country: 'AU', level: 5, message: 'Mining Farm Pro withdrawal request: $700. That\'s two weeks of earnings. BEP20 always delivers fast.', amount: 700, message_type: 'withdrawal_request', is_featured: true, network: 'BEP20' },
  { username: 'KarlSvensson', country: 'SE', level: 5, message: 'Upgraded from ASIC Pro to Mining Farm Pro. The jump from $18/day to $50/day is insane. Should\'ve upgraded earlier.', amount: 1400, message_type: 'upgrade', is_featured: true },
  { username: 'DianaWolff', country: 'AT', level: 5, message: 'Mining Farm Pro — withdrew $1,050 today. Three weeks of earnings, confirmed in 90 minutes. Love this platform.', amount: 1050, message_type: 'withdrawal', is_featured: true, network: 'TRC20' },
  { username: 'RobertoFerreira', country: 'BR', level: 5, message: 'Just hit $5,000 total on Mining Farm Pro. Pure passive income. If you\'re still on ASIC, you\'re leaving money on the table.', amount: 5000, message_type: 'milestone', is_featured: true },
  { username: 'CelineMoreau', country: 'FR', level: 5, message: 'Mining Farm Pro pays for a 5-star hotel night every single day. $50/day is not a joke.', amount: 1500, message_type: 'milestone', is_featured: true },

  // ── Mining Farm ($30/day) ──
  { username: 'SarahMiner88', country: 'CA', level: 5, message: 'Mining Farm earned $210 this week. Withdrew it all. $15 minimum is so easy to hit every day.', amount: 840, message_type: 'withdrawal', is_featured: true, network: 'ERC20' },
  { username: 'BeatriceNkosi', country: 'ZA', level: 4, message: 'Mining Farm total: $2,400 withdrawn across 4 months. Consistent, reliable, no stress.', amount: 900, message_type: 'withdrawal', is_featured: true, network: 'TRC20' },
  { username: 'MehmetYilmaz', country: 'TR', level: 4, message: 'Mining Farm withdrawal confirmed. $870 for 29 days. Minimum $15 — I collect it 2x per day easily.', amount: 870, message_type: 'withdrawal', is_featured: true, network: 'BEP20' },
  { username: 'AgathaKowalczyk', country: 'PL', level: 4, message: 'Mining Farm is running beautifully. $30/day, withdraw $210/week. Already paid for itself twice.', amount: 630, message_type: 'milestone', is_featured: false },
  { username: 'SionColeman', country: 'IE', level: 4, message: 'Mining Farm sent me $420 this two weeks. I do nothing. It just runs. Incredible machine.', amount: 420, message_type: 'withdrawal', is_featured: true, network: 'SOL' },
  { username: 'NicolasGarnier', country: 'FR', level: 4, message: 'Upgraded from ASIC Pro to Mining Farm. Doubled my daily earnings overnight. This is the real deal.', amount: 890, message_type: 'upgrade', is_featured: false },
  { username: 'MohammedAlKindi', country: 'AE', level: 5, message: 'Mining Farm withdrawal: $1,800 total this month. The $15 minimum withdrawal is the best feature.', amount: 1800, message_type: 'withdrawal', is_featured: true, network: 'BEP20' },

  // ── ASIC Pro ($18/day) with upgrade envy ──
  { username: 'TomaszKwiat88', country: 'PL', level: 4, message: 'ASIC Pro giving me $18/day but I\'m saving up for Mining Farm Pro. The difference is crazy.', amount: 450, message_type: 'upgrade', is_featured: false },
  { username: 'OmarAhmed2234', country: 'AE', level: 4, message: 'ASIC Pro withdrawal: $540 this month. Good, but I see Mining Farm Pro users pulling $1,500. Time to upgrade.', amount: 540, message_type: 'withdrawal', is_featured: true, network: 'BEP20' },
  { username: 'AlexTradez9912', country: 'US', level: 4, message: 'ASIC Pro is solid — $18/day, $540/month. Now saving for Mining Farm. The $30/day will double everything.', amount: 540, message_type: 'milestone', is_featured: false },
  { username: 'KarenMwangi', country: 'KE', level: 4, message: 'ASIC Pro withdrawal confirmed: $360. Two weeks of $18/day. Now I want Mining Farm Pro badly.', amount: 360, message_type: 'withdrawal', is_featured: false, network: 'TRC20' },

  // ── Withdrawal requests (big amounts, upper tier) ──
  { username: 'ViktorKrauss', country: 'DE', level: 5, message: 'Withdrawal request sent: $1,800. Quantum Rig earnings for 5 cycles. ERC20 as always.', amount: 1800, message_type: 'withdrawal_request', is_featured: true, network: 'ERC20' },
  { username: 'DianaWolff', country: 'AT', level: 5, message: 'Mining Farm Pro — withdrawal request for $700. Weekly routine at this point.', amount: 700, message_type: 'withdrawal_request', is_featured: true, network: 'BEP20' },
  { username: 'MohammedAlKindi', country: 'AE', level: 5, message: 'Submitted $1,500 withdrawal. Mining Farm Pro doesn\'t miss. BEP20 processes in under 2 hours.', amount: 1500, message_type: 'withdrawal_request', is_featured: true, network: 'BEP20' },
  { username: 'SionColeman', country: 'IE', level: 4, message: 'Withdrawal request: $420 from Mining Farm. Two weeks straight. SOL network this time.', amount: 420, message_type: 'withdrawal_request', is_featured: false, network: 'SOL' },
  { username: 'NatashaPetrov', country: 'RU', level: 5, message: 'Quantum Rig withdrawal request: $2,160. Six cycles. Can\'t believe I used to have just a GPU Miner.', amount: 2160, message_type: 'withdrawal_request', is_featured: true, network: 'TRC20' },
  { username: 'MehmetYilmaz', country: 'TR', level: 4, message: 'Mining Farm withdrawal request sent: $600. 20 days of $30/day. BEP20 is my go-to.', amount: 600, message_type: 'withdrawal_request', is_featured: false, network: 'BEP20' },

  // ── General motivational / FOMO ──
  { username: 'IsabellaRuiz', country: 'ES', level: 5, message: 'If you\'re still on ASIC Miner, calculate this: Mining Farm Pro earns 4x more per day. The upgrade pays itself in weeks.', amount: 1500, message_type: 'tip', is_featured: true },
  { username: 'AkiraFujimoto', country: 'JP', level: 5, message: 'Quantum Rig math: $360/cycle × 8 cycles/month = $2,880/month. No job I\'ve ever had paid this well passively.', amount: 2880, message_type: 'tip', is_featured: true },
  { username: 'PhilippeLeRoux', country: 'FR', level: 5, message: 'From GPU Miner to Mining Farm Pro in 6 months. My earnings went from $4.8/day to $50/day. Stack and upgrade.', amount: 1500, message_type: 'milestone', is_featured: true },
  { username: 'GraceNwachukwu', country: 'NG', level: 4, message: 'People ask me how I afford things. I just tell them: Mining Farm Pro, $50/day, every day.', amount: 1500, message_type: 'milestone', is_featured: false },
  { username: 'HiroshiNakamura', country: 'JP', level: 5, message: 'I started on CPU Miner. Took 8 months to reach Quantum Rig. Now earning $360/cycle. The journey is worth it.', amount: 3600, message_type: 'milestone', is_featured: true },
  { username: 'SergioMontoya', country: 'CO', level: 4, message: 'My coworker laughed when I bought Mining Farm. Now he\'s begging me to explain it after seeing $870 in my wallet.', amount: 870, message_type: 'general', is_featured: false },
  { username: 'AbigailHartley', country: 'AU', level: 5, message: 'Quantum Rig owners — what can I say. We\'re in a different league. $360 per session, no sweat.', amount: 3240, message_type: 'milestone', is_featured: true },
];

const LEADERBOARD = [
  { rank: 1, username: 'ThijsVanDerBerg', country: 'NL', level: 5, amount: 4800, device: 'Quantum Rig ×6', crown: true },
  { rank: 2, username: 'ElizabethChang', country: 'SG', level: 5, amount: 3240, device: 'Quantum Rig', crown: false },
  { rank: 3, username: 'HansBauer1990', country: 'CH', level: 5, amount: 4500, device: 'Mining Farm Pro', crown: false },
  { rank: 4, username: 'RobertoFerreira', country: 'BR', level: 5, amount: 5000, device: 'Mining Farm Pro', crown: false },
  { rank: 5, username: 'YasminaSaidi', country: 'AE', level: 5, amount: 1800, device: 'Quantum Rig', crown: false },
  { rank: 6, username: 'JakobMuller55', country: 'DE', level: 5, amount: 1500, device: 'Mining Farm Pro', crown: false },
  { rank: 7, username: 'MohammedAlKindi', country: 'AE', level: 5, amount: 1800, device: 'Mining Farm', crown: false },
  { rank: 8, username: 'DianaWolff', country: 'AT', level: 5, amount: 1050, device: 'Mining Farm Pro', crown: false },
  { rank: 9, username: 'SarahMiner88', country: 'CA', level: 5, amount: 840, device: 'Mining Farm', crown: false },
  { rank: 10, username: 'LindsayBaxter', country: 'AU', level: 5, amount: 700, device: 'Mining Farm Pro', crown: false },
];

const TICKER_ITEMS = LIVE_POOL.filter(m => m.message_type === 'withdrawal' && m.amount >= 100);

type TabType = 'all' | 'withdrawals' | 'milestones' | 'leaderboard';

function getTimeAgo(timestamp: string) {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getLevelBadge(level: number) {
  if (level >= 5) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  if (level >= 4) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  if (level >= 3) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (level >= 2) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function getRankMedal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function WithdrawalCard({ msg, isRequest }: { msg: Message; isRequest?: boolean }) {
  const network = (msg as any).network || NETWORKS[Math.floor(msg.amount * 7) % NETWORKS.length];
  const flag = COUNTRY_FLAGS[msg.country] || '🌍';

  // For request cards: randomly decide instant (55%) vs slow (45%) approval
  const [autoConfirmDelay] = useState<number | null>(() => {
    if (!isRequest) return null;
    const willAutoConfirm = Math.random() < 0.55;
    if (!willAutoConfirm) return null;
    // Instant: 3–9s, feels like real-time approval
    return Math.floor(Math.random() * 6000) + 3000;
  });

  const [isConfirmed, setIsConfirmed] = useState(!isRequest);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const isInstant = isRequest && autoConfirmDelay !== null && autoConfirmDelay < 6000;

  useEffect(() => {
    if (!isRequest || autoConfirmDelay === null) return;

    // Animate progress bar filling up
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(99, (elapsed / autoConfirmDelay) * 100);
      setProgress(pct);
      if (elapsed >= autoConfirmDelay) clearInterval(progressInterval);
    }, 80);

    // Auto confirm after delay
    const confirmTimeout = setTimeout(() => {
      setIsConfirmed(true);
      setJustConfirmed(true);
      setProgress(100);
      setTimeout(() => setJustConfirmed(false), 3000);
    }, autoConfirmDelay);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(confirmTimeout);
    };
  }, []);

  const amtDisplay = `$${msg.amount >= 1000 ? `${(msg.amount / 1000).toFixed(1)}K` : msg.amount.toFixed(msg.amount < 10 ? 2 : 0)}`;

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all duration-700 ${
      isConfirmed
        ? 'border-[#F0B90B]/40 bg-gradient-to-br from-[#F0B90B]/10 via-[#1A1B23] to-[#0D0E12] shadow-[0_0_18px_rgba(240,185,11,0.15)]'
        : 'border-blue-500/30 bg-gradient-to-br from-blue-500/8 via-[#1A1B23] to-[#0D0E12]'
    } ${justConfirmed ? 'scale-[1.01]' : ''}`}
    style={{ transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>

      {/* Header bar */}
      <div className={`flex items-center gap-2 px-3 py-2 transition-all duration-700 ${
        isConfirmed
          ? 'bg-[#F0B90B]/12 border-b border-[#F0B90B]/25'
          : 'bg-blue-500/10 border-b border-blue-500/20'
      }`}>
        {isConfirmed
          ? <CheckCircle2 className={`w-4 h-4 text-[#F0B90B] flex-shrink-0 ${justConfirmed ? 'animate-bounce' : ''}`} />
          : <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 animate-pulse" />
        }
        <span className={`text-xs font-black tracking-widest transition-colors duration-700 ${
          isConfirmed ? 'text-[#F0B90B]' : 'text-blue-400'
        }`}>
          {isConfirmed ? 'WITHDRAWAL CONFIRMED' : 'WITHDRAWAL REQUEST SENT'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isInstant && !isConfirmed && (
            <span className="flex items-center gap-0.5 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-400 text-[9px] font-black">INSTANT</span>
            </span>
          )}
          <span className="text-[10px] text-gray-500">{network}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-3 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`}
            alt={msg.username}
            className={`w-10 h-10 rounded-full border-2 transition-all duration-700 ${
              isConfirmed ? 'border-[#F0B90B]/50' : 'border-[#2B3139]'
            }`}
          />
          {justConfirmed && (
            <div className="absolute inset-0 rounded-full border-2 border-[#F0B90B] animate-ping opacity-60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-white font-semibold text-sm truncate">{msg.username}</span>
            <span className="text-base leading-none">{flag}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0 ${getLevelBadge(msg.level)}`}>
              Lv.{msg.level}
            </span>
          </div>
          <p className="text-gray-400 text-xs truncate">{msg.message}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={`text-xl font-black transition-colors duration-700 ${
            isConfirmed ? 'text-[#F0B90B]' : 'text-blue-300'
          }`}>
            {amtDisplay}
          </div>
          <div className="text-[10px] text-gray-500">USDT</div>
        </div>
      </div>

      {/* Footer: status + progress bar */}
      <div className="px-3 pb-3">
        {isConfirmed ? (
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${justConfirmed ? 'text-emerald-300' : 'text-emerald-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {justConfirmed ? '✨ Funds arrived just now!' : 'Funds arrived'}
            </span>
            <span className="text-gray-600 text-[10px]">{getTimeAgo(msg.created_at)}</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-blue-400 text-[11px] font-medium">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                {isInstant ? 'Processing — instant approval...' : 'Processing...'}
              </span>
              <span className="text-gray-600 text-[10px]">{getTimeAgo(msg.created_at)}</span>
            </div>
            <div className="w-full bg-[#2B3139] rounded-full h-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  isInstant ? 'bg-emerald-400' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageCard({ msg }: { msg: Message }) {
  const [reactions, setReactions] = useState<Record<string, number>>({
    '🔥': Math.floor(Math.random() * 40),
    '💎': Math.floor(Math.random() * 25),
    '🚀': Math.floor(Math.random() * 18),
  });
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const flag = COUNTRY_FLAGS[msg.country] || '🌍';

  const handleReact = (emoji: string) => {
    setReactions(prev => {
      const next = { ...prev };
      if (myReaction === emoji) {
        next[emoji] = Math.max(0, next[emoji] - 1);
        setMyReaction(null);
      } else {
        if (myReaction) next[myReaction] = Math.max(0, next[myReaction] - 1);
        next[emoji] = (next[emoji] || 0) + 1;
        setMyReaction(emoji);
      }
      return next;
    });
  };

  const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    profit: { icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-emerald-400', label: 'Profit' },
    milestone: { icon: <Award className="w-3.5 h-3.5" />, color: 'text-[#F0B90B]', label: 'Milestone' },
    upgrade: { icon: <ArrowUpCircle className="w-3.5 h-3.5" />, color: 'text-blue-400', label: 'Upgrade' },
    celebration: { icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-purple-400', label: 'Win' },
    tip: { icon: <Zap className="w-3.5 h-3.5" />, color: 'text-cyan-400', label: 'Tip' },
    general: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-gray-400', label: '' },
  };
  const tc = typeConfig[msg.message_type] || typeConfig.general;

  return (
    <div className={`flex gap-2.5 p-3 rounded-xl ${msg.is_featured
      ? 'bg-[#F0B90B]/5 border border-[#F0B90B]/20'
      : 'bg-[#1A1B23]/60 border border-[#2B3139]/40'
    } hover:border-[#F0B90B]/20 transition-all`}>
      <div className="relative flex-shrink-0">
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`}
          alt={msg.username}
          className="w-9 h-9 rounded-full border-2 border-[#2B3139]"
        />
        {msg.is_featured && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#F0B90B] rounded-full flex items-center justify-center">
            <Crown className="w-2.5 h-2.5 text-black" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-white font-semibold text-sm truncate">{msg.username}</span>
          <span className="text-sm">{flag}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0 ${getLevelBadge(msg.level)}`}>
            Lv.{msg.level}
          </span>
          {msg.message_type !== 'general' && (
            <span className={`flex items-center gap-0.5 text-[10px] font-medium ml-auto flex-shrink-0 ${tc.color}`}>
              {tc.icon} {tc.label}
            </span>
          )}
        </div>

        <p className="text-gray-300 text-sm leading-snug mb-2">{msg.message}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-all border ${
                  myReaction === emoji
                    ? 'bg-[#F0B90B]/20 border-[#F0B90B]/40 text-[#F0B90B]'
                    : 'bg-[#2B3139]/60 border-[#2B3139] text-gray-400 hover:border-gray-600'
                }`}
              >
                <span>{emoji}</span>
                <span className="font-medium">{count}</span>
              </button>
            ))}
          </div>
          <span className="text-gray-600 text-[10px]">{getTimeAgo(msg.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export default function MiningLiveChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isSending, setIsSending] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [bigWinNotif, setBigWinNotif] = useState<BigWinNotif | null>(null);
  const [tickerOffset, setTickerOffset] = useState(0);

  const [activeMiners, setActiveMiners] = useState(17148);
  const [totalEarnings, setTotalEarnings] = useState(912000);
  const [recentUpgrades, setRecentUpgrades] = useState(11842);
  const [onlineCount, setOnlineCount] = useState(23774);
  const [totalWithdrawnToday, setTotalWithdrawnToday] = useState(520000);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    loadMessages();

    const channel = supabase
      .channel('mining-chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mining_chat_messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    const unsubGlobal = globalMiningStats.subscribe((stats) => {
      setActiveMiners(stats.activeMiners);
      setTotalEarnings(stats.hourlyEarnings);
      setRecentUpgrades(stats.recentUpgrades);
      setOnlineCount(stats.onlineCount);
    });

    const statsInterval = setInterval(() => {
      setActiveMiners(v => Math.max(15000, v + Math.floor(Math.random() * 20 - 8)));
      setTotalEarnings(v => Math.min(980000, v + Math.floor(Math.random() * 600 + 200)));
      setRecentUpgrades(v => Math.max(10000, v + Math.floor(Math.random() * 8 - 2)));
      setOnlineCount(v => Math.max(20000, v + Math.floor(Math.random() * 40 - 15)));
      setTotalWithdrawnToday(v => Math.min(680000, v + Math.floor(Math.random() * 900 + 100)));
    }, 2500);

    let liveIndex = Math.floor(Math.random() * LIVE_POOL.length);
    let liveTimeout: NodeJS.Timeout;
    const injectLive = () => {
      const delay = Math.random() * 4500 + 3000;
      liveTimeout = setTimeout(() => {
        const tmpl = LIVE_POOL[liveIndex % LIVE_POOL.length];
        liveIndex++;
        const fakeMsg: Message = {
          id: `live-${Date.now()}-${Math.random()}`,
          username: tmpl.username,
          avatar_url: '',
          message: tmpl.message,
          created_at: new Date().toISOString(),
          level: tmpl.level,
          country: tmpl.country,
          message_type: tmpl.message_type,
          amount: tmpl.amount,
          is_featured: tmpl.is_featured,
          ...(tmpl.network ? { network: tmpl.network } : {}),
        } as Message;
        setMessages(prev => [...prev.slice(-150), fakeMsg]);

        if ((tmpl.message_type === 'withdrawal' || tmpl.message_type === 'milestone') && tmpl.amount >= 500) {
          const notif: BigWinNotif = {
            id: `bw-${Date.now()}`,
            username: tmpl.username,
            amount: tmpl.amount,
            country: tmpl.country,
            network: tmpl.network || 'TRC20',
          };
          setBigWinNotif(notif);
          setTimeout(() => setBigWinNotif(null), 4500);
        }

        injectLive();
      }, delay);
    };
    injectLive();

    const tickerInterval = setInterval(() => {
      setTickerOffset(v => v + 1);
    }, 30);

    return () => {
      channel.unsubscribe();
      unsubGlobal();
      clearInterval(statsInterval);
      clearTimeout(liveTimeout);
      clearInterval(tickerInterval);
    };
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadMessages = async () => {
    setIsLoading(true);
    const { count } = await supabase.from('mining_chat_messages').select('*', { count: 'exact', head: true });
    const total = count || 5000;
    const offset = Math.floor(Math.random() * Math.max(0, total - 80));
    const { data } = await supabase
      .from('mining_chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .range(offset, offset + 79);
    if (data) setMessages(data as Message[]);
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    const now = Date.now();
    if (now - lastMessageTime < 5000) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Please sign in to chat'); return; }

    setIsSending(true);
    try {
      const { data: profile } = await supabase.from('user_profiles')
        .select('username, avatar_url, country').eq('user_id', user.id).maybeSingle();
      const { data: purchases } = await supabase.from('user_mining_purchases')
        .select('shop_item_id').eq('user_id', user.id);
      const level = purchases ? Math.min(5, Math.floor(purchases.length / 2) + 1) : 1;

      await supabase.from('mining_chat_messages').insert({
        user_id: user.id,
        username: profile?.username || user.email?.split('@')[0] || 'User',
        avatar_url: profile?.avatar_url || '',
        message: newMessage.trim(),
        message_type: 'general',
        amount: 0,
        level,
        country: profile?.country || 'US',
        is_featured: false,
      });
      setNewMessage('');
      setLastMessageTime(now);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    if (activeTab === 'withdrawals') return m.message_type === 'withdrawal' || m.message_type === 'withdrawal_request';
    if (activeTab === 'milestones') return m.message_type === 'milestone' || m.message_type === 'profit' || m.message_type === 'upgrade';
    return true;
  });

  const tickerText = TICKER_ITEMS.map(t =>
    `${COUNTRY_FLAGS[t.country] || '🌍'} ${t.username} withdrew $${t.amount.toLocaleString()}`
  ).join('    •    ');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/92 backdrop-blur-sm z-[100] flex items-end justify-center">
      <div className="relative bg-[#0D0E12] w-full max-w-[428px] h-screen flex flex-col border-t border-[#2B3139]/80 shadow-2xl">

        {/* HEADER */}
        <div className="bg-[#0D0E12] border-b border-[#2B3139] px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-xl flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#F0B90B]" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-black text-lg">Miners Chat</h2>
                  <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full">
                    <Wifi className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                    <span className="text-red-400 text-[10px] font-black tracking-widest">LIVE</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-white font-bold">{onlineCount.toLocaleString()}</span> online
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-white font-bold">{activeMiners.toLocaleString()}</span> mining
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-[#1A1B23] border border-[#2B3139] flex items-center justify-center hover:border-[#F0B90B]/40 transition-all active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Miners', value: `${(activeMiners / 1000).toFixed(1)}k`, color: 'text-white', icon: <Users className="w-3 h-3" /> },
              { label: 'Earned', value: `$${(totalEarnings / 1000).toFixed(0)}k`, color: 'text-emerald-400', icon: <TrendingUp className="w-3 h-3" /> },
              { label: 'Withdrawn', value: `$${(totalWithdrawnToday / 1000).toFixed(0)}k`, color: 'text-[#F0B90B]', icon: <DollarSign className="w-3 h-3" /> },
              { label: 'Upgrades', value: `${(recentUpgrades / 1000).toFixed(1)}k`, color: 'text-blue-400', icon: <ArrowUpCircle className="w-3 h-3" /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#1A1B23] border border-[#2B3139]/80 rounded-xl p-2 text-center">
                <div className={`flex items-center justify-center gap-0.5 ${stat.color} mb-0.5`}>
                  {stat.icon}
                </div>
                <div className={`text-sm font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* LIVE TICKER */}
          <div className="bg-[#1A1B23] border border-[#2B3139]/80 rounded-xl px-3 py-2 flex items-center gap-2 overflow-hidden">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-[#F0B90B] rounded-full animate-pulse"></div>
              <span className="text-[#F0B90B] text-[10px] font-black tracking-widest">LIVE</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div
                className="text-gray-300 text-xs whitespace-nowrap"
                style={{
                  transform: `translateX(${-(tickerOffset % (tickerText.length * 7.5))}px)`,
                  transition: 'none',
                  display: 'inline-block',
                }}
              >
                {tickerText} &nbsp;&nbsp;&nbsp; {tickerText}
              </div>
            </div>
          </div>
        </div>

        {/* VOICE ROOM */}
        <div className="px-4 pt-3 flex-shrink-0 relative">
          <VoiceRoomPlayer />
          {/* BIG WIN POPUP — overlays VOICE ROOM */}
          {bigWinNotif && (
            <div className="absolute inset-0 z-50 flex items-center justify-center animate-slide-down">
              <div className="w-full bg-gradient-to-r from-[#F0B90B] to-[#e0a800] rounded-2xl p-4 shadow-2xl shadow-[#F0B90B]/30 border border-[#F0B90B]/40">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-7 h-7 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-black text-xs font-bold tracking-widest mb-0.5">🎉 BIG WIN ALERT</div>
                    <div className="text-black font-black text-lg leading-tight truncate">
                      {bigWinNotif.username} {COUNTRY_FLAGS[bigWinNotif.country] || '🌍'}
                    </div>
                    <div className="text-black/80 text-xs">withdrew via {bigWinNotif.network}</div>
                  </div>
                  <div className="text-black font-black text-2xl flex-shrink-0">
                    ${bigWinNotif.amount >= 1000
                      ? `${(bigWinNotif.amount / 1000).toFixed(1)}K`
                      : bigWinNotif.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 px-4 py-2 flex-shrink-0 border-b border-[#2B3139]/60">
          {([
            { id: 'all', label: 'All', icon: <MessageCircle className="w-3.5 h-3.5" /> },
            { id: 'withdrawals', label: 'Withdrawals', icon: <DollarSign className="w-3.5 h-3.5" /> },
            { id: 'milestones', label: 'Earnings', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'leaderboard', label: 'Top', icon: <Trophy className="w-3.5 h-3.5" /> },
          ] as { id: TabType; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-[#F0B90B] text-black'
                  : 'bg-[#1A1B23] text-gray-400 hover:text-white border border-[#2B3139]'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* MESSAGES / LEADERBOARD */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
          {activeTab === 'leaderboard' ? (
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-[#F0B90B]" />
                <span className="text-white font-bold text-sm">Today's Top Miners</span>
              </div>
              {LEADERBOARD.map((entry) => (
                <div key={entry.rank} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  entry.rank === 1
                    ? 'bg-[#F0B90B]/8 border-[#F0B90B]/30'
                    : entry.rank <= 3
                    ? 'bg-[#1A1B23] border-[#2B3139]/80'
                    : 'bg-[#0D0E12] border-[#2B3139]/40'
                }`}>
                  <div className={`w-8 h-8 flex items-center justify-center text-lg font-black flex-shrink-0 ${
                    entry.rank <= 3 ? '' : 'text-gray-500 text-sm'
                  }`}>
                    {getRankMedal(entry.rank)}
                  </div>
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`}
                    alt=""
                    className="w-9 h-9 rounded-full border-2 border-[#2B3139] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-semibold text-sm truncate">{entry.username}</span>
                      <span className="text-sm">{COUNTRY_FLAGS[entry.country] || '🌍'}</span>
                      {entry.crown && <Crown className="w-3.5 h-3.5 text-[#F0B90B]" />}
                    </div>
                    <span className="text-gray-500 text-xs">{entry.device}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-black text-base ${entry.rank === 1 ? 'text-[#F0B90B]' : 'text-emerald-400'}`}>
                      ${entry.amount >= 1000 ? `${(entry.amount / 1000).toFixed(1)}K` : entry.amount.toLocaleString()}
                    </div>
                    <div className="text-gray-600 text-[10px]">USDT</div>
                  </div>
                </div>
              ))}
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-10 h-10 border-2 border-[#F0B90B]/30 border-t-[#F0B90B] rounded-full animate-spin"></div>
              <span className="text-gray-500 text-sm">Loading chat...</span>
            </div>
          ) : (
            <div className="p-3 space-y-2.5 pb-4">
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  if (msg.message_type === 'withdrawal' || msg.message_type === 'withdrawal_request') {
                    return <WithdrawalCard key={msg.id} msg={msg} isRequest={msg.message_type === 'withdrawal_request'} />;
                  }
                  return <MessageCard key={msg.id} msg={msg} />;
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* INPUT */}
        {activeTab !== 'leaderboard' && (
          <div className="flex-shrink-0 border-t border-[#2B3139]/80 p-3 bg-[#0D0E12]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Share your mining wins..."
                className="flex-1 bg-[#1A1B23] border border-[#2B3139] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none focus:border-[#F0B90B]/40 transition-all"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
              <button
                onClick={handleSend}
                disabled={isSending || !newMessage.trim()}
                className="w-11 h-11 bg-[#F0B90B] hover:bg-[#e0a800] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Send className="w-4 h-4 text-black" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

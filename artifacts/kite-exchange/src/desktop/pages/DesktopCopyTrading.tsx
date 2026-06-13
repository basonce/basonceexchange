import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Shield, AlertTriangle, Check, Loader2, X, Copy, StopCircle,
  TrendingUp, Award, Search, RefreshCw, Flame, Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MyCopiesPage from '../../components/copy-trading/MyCopiesPage';
import CopyTradeActivityBanner from '../../components/copy-trading/CopyTradeActivityBanner';

type PageProps = {
  user?: any;
  onAuth?: (m: 'login' | 'register') => void;
  onDeposit?: () => void;
  onNavigate?: (t: any) => void;
};

interface CopyTrader {
  id: string;
  name: string;
  avatar_url: string;
  strategy_type: string;
  coin_symbol: string;
  follower_count: number;
  max_followers: number;
  pnl_30d: number;
  roi_30d: number;
  roi_7d: number;
  total_pnl: number;
  win_rate: number;
  runtime_days: number;
}

interface ActiveCopy {
  id: string;
  trader_id: string;
  investment_amount: number;
  current_value: number;
  pnl: number;
  roi: number;
  status: string;
  created_at: string;
  copy_traders: CopyTrader;
}

const FILTER_COINS = ['All', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX'];
const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

function fmtUsd(n: number, maxFrac = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxFrac });
}

function RoiSparkline({ roi, positive }: { roi: number; positive: boolean }) {
  const pts = useMemo(() => {
    const base = [0, roi * 0.1, roi * 0.18, roi * 0.34, roi * 0.42, roi * 0.6, roi * 0.7, roi * 0.85, roi * 0.92, roi];
    return base;
  }, [roi]);
  const min = Math.min(...pts, 0);
  const max = Math.max(...pts, 0.01);
  const range = max - min || 1;
  const w = 120;
  const h = 40;
  const coords = pts.map((v, i) => ({
    x: (i / (pts.length - 1)) * w,
    y: h - ((v - min) / range) * h * 0.85 - h * 0.075,
  }));
  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = line + ` L${w},${h} L0,${h} Z`;
  const color = positive ? '#0ECB81' : '#F6465D';
  const gid = `desk-cts-${positive ? 'p' : 'n'}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-10">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DesktopCopyTrading({ user: userProp }: PageProps) {
  const [user, setUser] = useState<any>(userProp ?? null);
  const [traders, setTraders] = useState<CopyTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'roi_30d' | 'pnl_30d' | 'win_rate' | 'follower_count'>('roi_30d');

  const [usdtBalance, setUsdtBalance] = useState(0);
  const [activeCopies, setActiveCopies] = useState<ActiveCopy[]>([]);

  const [copyTarget, setCopyTarget] = useState<CopyTrader | null>(null);
  const [investAmount, setInvestAmount] = useState('100');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [showMyCopies, setShowMyCopies] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = useCallback(async (uid: string) => {
    const { data } = await supabase.from('user_balances').select('balance').eq('user_id', uid).eq('symbol', 'USDT').maybeSingle();
    if (data) setUsdtBalance(Number(data.balance));
  }, []);

  const fetchActiveCopies = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('user_copy_trades')
      .select('*, copy_traders(*)')
      .eq('user_id', uid)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (data) setActiveCopies(data as any);
  }, []);

  const fetchTraders = useCallback(async (f?: string) => {
    let q = supabase
      .from('copy_traders')
      .select('*')
      .eq('is_active', true)
      .order('roi_30d', { ascending: false })
      .limit(60);
    if (f && f !== 'All') q = q.eq('coin_symbol', f);
    const { data } = await q;
    if (data) setTraders(data as CopyTrader[]);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchBalance(session.user.id);
        fetchActiveCopies(session.user.id);
      }
      await fetchTraders('All');
      setLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchBalance(session.user.id);
        fetchActiveCopies(session.user.id);
      } else {
        setUser(null);
        setActiveCopies([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchBalance, fetchActiveCopies, fetchTraders]);

  useEffect(() => {
    fetchTraders(filter);
  }, [filter, fetchTraders]);

  const sortedTraders = useMemo(() => {
    let r = traders.filter(t =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.coin_symbol.toLowerCase().includes(query.toLowerCase())
    );
    r = [...r].sort((a, b) => (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0));
    return r;
  }, [traders, query, sortBy]);

  const openCopy = (t: CopyTrader) => {
    setCopyTarget(t);
    setInvestAmount('100');
    setStopLoss('');
    setTakeProfit('');
    setCopySuccess(false);
    setCopyError(null);
  };

  const handleStartCopy = async () => {
    if (!user || !copyTarget) return;
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount < 10) return;
    setCopyLoading(true);
    setCopyError(null);
    try {
      if (usdtBalance < amount) {
        setCopyError('Insufficient USDT balance.');
        return;
      }
      const { error } = await supabase.rpc('start_copy_trading', {
        p_user_id: user.id,
        p_trader_id: copyTarget.id,
        p_investment: amount,
        p_stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        p_take_profit: takeProfit ? parseFloat(takeProfit) : null,
      });
      if (error) {
        const msg = error.message || '';
        if (msg.includes('Insufficient balance')) setCopyError('Insufficient USDT balance.');
        else if (msg.includes('Trader not found')) setCopyError('Trader not found. Please refresh and try again.');
        else setCopyError(msg || 'Something went wrong. Please try again.');
        return;
      }
      setCopySuccess(true);
      fetchBalance(user.id);
      fetchActiveCopies(user.id);
      setTimeout(() => {
        setCopyTarget(null);
        setCopySuccess(false);
        setCopyError(null);
      }, 1800);
    } catch (err: any) {
      setCopyError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setCopyLoading(false);
    }
  };

  const handleStop = async (copyId: string) => {
    if (!user) return;
    setStoppingId(copyId);
    try {
      const { error } = await supabase.rpc('stop_copy_trading', { p_user_id: user.id, p_copy_id: copyId });
      if (!error) {
        fetchBalance(user.id);
        fetchActiveCopies(user.id);
      }
    } finally {
      setStoppingId(null);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchTraders(filter);
    if (user) {
      await fetchBalance(user.id);
      await fetchActiveCopies(user.id);
    }
    setTimeout(() => setRefreshing(false), 600);
  };

  const totalInvested = activeCopies.reduce((s, c) => s + Number(c.investment_amount || 0), 0);
  const totalValue = activeCopies.reduce((s, c) => {
    return s + Number(c.investment_amount || 0) + Number(c.pnl || 0);
  }, 0);
  const totalPnl = totalValue - totalInvested;
  const totalRoi = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const pnlPos = totalPnl >= 0;

  const activeCopyTraderNames = activeCopies.map(c => c.copy_traders?.name).filter(Boolean) as string[];

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      {activeCopyTraderNames.length > 0 && <CopyTradeActivityBanner activeCopyTraderNames={activeCopyTraderNames} />}

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Title block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-white font-bold text-3xl mb-1.5">Copy Trading</h1>
            <p className="text-[#848E9C] text-sm max-w-2xl">
              Follow elite traders and mirror their strategies automatically. Track ROI, win rate and PnL in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2B3139] text-[#848E9C] hover:text-white text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowMyCopies(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#181A20] border border-[#2B3139] hover:border-[#F0B90B] text-white text-sm font-semibold transition-colors"
            >
              <Copy className="w-4 h-4 text-[#F0B90B]" />
              My Copies
              {activeCopies.length > 0 && (
                <span className="bg-[#F0B90B] text-[#0B0E11] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums">
                  {activeCopies.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Portfolio summary */}
        {user && activeCopies.length > 0 && (
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-[#848E9C] text-xs mb-1 uppercase tracking-wide">Portfolio Value</div>
                <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${pnlPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  ${fmtUsd(totalValue)}
                </div>
              </div>
              <div>
                <div className="text-[#848E9C] text-xs mb-1 uppercase tracking-wide">Total Invested</div>
                <div className="text-2xl font-bold text-white tabular-nums whitespace-nowrap">${fmtUsd(totalInvested)}</div>
              </div>
              <div>
                <div className="text-[#848E9C] text-xs mb-1 uppercase tracking-wide">Total PnL</div>
                <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${pnlPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {pnlPos ? '+' : '-'}${fmtUsd(Math.abs(totalPnl))}
                </div>
              </div>
              <div>
                <div className="text-[#848E9C] text-xs mb-1 uppercase tracking-wide">Total ROI</div>
                <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${pnlPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {pnlPos ? '+' : '-'}{Math.abs(totalRoi).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Active copies inline */}
            <div className="mt-5 pt-5 border-t border-[#2B3139]">
              <div className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F0B90B]" /> Active Copies
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeCopies.map((c) => {
                  const sim = Number(c.pnl || 0);
                  const cur = c.investment_amount + sim;
                  const roi = c.investment_amount > 0 ? (sim / c.investment_amount) * 100 : 0;
                  const pos = sim >= 0;
                  return (
                    <div key={c.id} className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-3.5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={c.copy_traders.avatar_url}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-[#2B3139] shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`; }}
                          />
                          <div className="min-w-0">
                            <div className="text-white text-sm font-semibold truncate">{c.copy_traders.name}</div>
                            <div className="text-[#848E9C] text-xs truncate">{c.copy_traders.coin_symbol}/USDT · {c.copy_traders.strategy_type}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleStop(c.id)}
                          disabled={stoppingId === c.id}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#F6465D]/50 text-[#F6465D] hover:bg-[#F6465D]/10 text-xs font-semibold transition-colors disabled:opacity-60"
                        >
                          {stoppingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                          Stop
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[#848E9C] text-[10px] mb-0.5">Invested</div>
                          <div className="text-white text-sm font-medium tabular-nums whitespace-nowrap">${fmtUsd(c.investment_amount)}</div>
                        </div>
                        <div>
                          <div className="text-[#848E9C] text-[10px] mb-0.5">Value</div>
                          <div className={`text-sm font-medium tabular-nums whitespace-nowrap ${pos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>${fmtUsd(cur)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#848E9C] text-[10px] mb-0.5">PnL</div>
                          <div className={`text-sm font-bold tabular-nums whitespace-nowrap ${pos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {pos ? '+' : ''}{roi.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#F0B90B]" />
            <h2 className="text-white font-bold text-xl">Lead Traders</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {([
                ['roi_30d', '30D ROI'],
                ['pnl_30d', '30D PnL'],
                ['win_rate', 'Win Rate'],
                ['follower_count', 'Followers'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    sortBy === k ? 'bg-[#1E2329] text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="bg-[#181A20] border border-[#2B3139] rounded-lg px-3 py-2 flex items-center gap-2 lg:w-64">
              <Search className="w-4 h-4 text-[#848E9C]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search trader"
                className="bg-transparent outline-none text-sm text-white placeholder-[#5E6673] flex-1 min-w-0"
              />
            </div>
          </div>
        </div>

        {/* Coin filter */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto">
          {FILTER_COINS.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === c ? 'bg-[#F0B90B] text-[#0B0E11]' : 'bg-[#181A20] border border-[#2B3139] text-[#848E9C] hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Trader grid */}
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedTraders.length === 0 ? (
          <div className="py-24 text-center text-[#848E9C] text-sm">No traders found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedTraders.map((t) => {
              const roiPos = t.roi_30d >= 0;
              const pnlPosT = t.pnl_30d >= 0;
              const full = t.follower_count >= t.max_followers;
              return (
                <div key={t.id} className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5 hover:border-[#F0B90B]/40 transition-colors flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={t.avatar_url}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover border border-[#2B3139] shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`; }}
                      />
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-base truncate">{t.name}</div>
                        <div className="flex items-center gap-1.5 text-[#848E9C] text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-[#2B3139] text-[#B7BDC6] whitespace-nowrap">{t.coin_symbol}/USDT</span>
                          <span className="truncate">{t.strategy_type}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => openCopy(t)}
                      className="shrink-0 px-4 py-2 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] text-sm font-bold transition-colors"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <div className="text-[#848E9C] text-xs mb-1">30D ROI</div>
                      <div className={`text-2xl font-bold tabular-nums whitespace-nowrap ${roiPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {roiPos ? '+' : ''}{Number(t.roi_30d).toFixed(2)}%
                      </div>
                    </div>
                    <div className="w-32 shrink-0">
                      <RoiSparkline roi={Number(t.roi_30d)} positive={roiPos} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#2B3139] mt-auto">
                    <div>
                      <div className="text-[#848E9C] text-[11px] mb-0.5">30D PnL</div>
                      <div className={`text-sm font-semibold tabular-nums whitespace-nowrap ${pnlPosT ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {pnlPosT ? '+' : ''}${fmtUsd(Number(t.pnl_30d), 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#848E9C] text-[11px] mb-0.5 flex items-center gap-1"><Star className="w-3 h-3" />Win Rate</div>
                      <div className="text-sm font-semibold text-white tabular-nums whitespace-nowrap">{Number(t.win_rate).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[#848E9C] text-[11px] mb-0.5 flex items-center gap-1"><Users className="w-3 h-3" />Followers</div>
                      <div className={`text-sm font-semibold tabular-nums whitespace-nowrap ${full ? 'text-[#F6465D]' : 'text-white'}`}>
                        {t.follower_count}/{t.max_followers}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#2B3139]/50">
                    <div>
                      <div className="text-[#848E9C] text-[11px] mb-0.5">7D ROI</div>
                      <div className={`text-sm font-medium tabular-nums whitespace-nowrap ${t.roi_7d >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {t.roi_7d >= 0 ? '+' : ''}{Number(t.roi_7d).toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#848E9C] text-[11px] mb-0.5">Total PnL (AUM)</div>
                      <div className="text-sm font-medium text-[#0ECB81] tabular-nums whitespace-nowrap">+${fmtUsd(Number(t.total_pnl), 0)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Copy setup modal */}
      {copyTarget && (
        <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4" onClick={() => !copyLoading && setCopyTarget(null)}>
          <div className="bg-[#181A20] border border-[#2B3139] w-full max-w-[460px] rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2B3139]">
              <span className="text-white text-base font-bold">Copy Settings</span>
              <button onClick={() => setCopyTarget(null)} disabled={copyLoading}>
                <X className="w-5 h-5 text-[#848E9C] hover:text-white" />
              </button>
            </div>

            {copySuccess ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-[#0ECB81]/15 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#0ECB81]" />
                </div>
                <div className="text-white text-lg font-bold mb-1">Copy Started</div>
                <div className="text-[#848E9C] text-sm">You are now copying {copyTarget.name}</div>
                <div className="text-[#0ECB81] text-sm font-semibold mt-2 tabular-nums">${investAmount} USDT invested</div>
              </div>
            ) : (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5 p-3 bg-[#0B0E11] rounded-lg border border-[#2B3139]">
                  <img
                    src={copyTarget.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{copyTarget.name}</div>
                    <div className="text-[#848E9C] text-xs truncate">{copyTarget.strategy_type} · {copyTarget.coin_symbol}/USDT</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[#0ECB81] text-sm font-bold tabular-nums whitespace-nowrap">+{Number(copyTarget.roi_30d).toFixed(2)}%</div>
                    <div className="text-[#848E9C] text-[10px]">30D ROI</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">Investment Amount</span>
                    <span className="text-[#848E9C] text-xs tabular-nums whitespace-nowrap">Available: {fmtUsd(usdtBalance)} USDT</span>
                  </div>
                  <div className="flex items-center bg-[#0B0E11] rounded-lg px-3 py-2.5 border border-[#2B3139] focus-within:border-[#F0B90B] transition-colors">
                    <input
                      type="number"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="flex-1 bg-transparent text-white text-base font-semibold outline-none tabular-nums min-w-0"
                      placeholder="0.00"
                    />
                    <span className="text-[#848E9C] text-sm font-medium ml-2 shrink-0">USDT</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setInvestAmount(String(amt))}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors tabular-nums ${
                          investAmount === String(amt) ? 'bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]' : 'bg-[#2B3139] text-[#848E9C] border border-transparent hover:text-white'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-white text-sm font-medium mb-2">Risk Management</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[#848E9C] text-xs mb-1">Stop Loss (%)</div>
                      <div className="flex items-center bg-[#0B0E11] rounded-lg px-3 py-2 border border-[#2B3139]">
                        <input
                          type="number"
                          value={stopLoss}
                          onChange={(e) => setStopLoss(e.target.value)}
                          className="flex-1 bg-transparent text-white text-sm outline-none tabular-nums min-w-0"
                          placeholder="e.g. 10"
                        />
                        <span className="text-[#F6465D] text-xs shrink-0">%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[#848E9C] text-xs mb-1">Take Profit (%)</div>
                      <div className="flex items-center bg-[#0B0E11] rounded-lg px-3 py-2 border border-[#2B3139]">
                        <input
                          type="number"
                          value={takeProfit}
                          onChange={(e) => setTakeProfit(e.target.value)}
                          className="flex-1 bg-transparent text-white text-sm outline-none tabular-nums min-w-0"
                          placeholder="e.g. 30"
                        />
                        <span className="text-[#0ECB81] text-xs shrink-0">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0B0E11] rounded-lg p-3 mb-4 border border-[#2B3139]">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-[#F0B90B]" />
                    <span className="text-white text-xs font-medium">Copy Summary</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#848E9C]">Trader</span>
                      <span className="text-white truncate ml-2">{copyTarget.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#848E9C]">Pair</span>
                      <span className="text-white whitespace-nowrap">{copyTarget.coin_symbol}/USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#848E9C]">Investment</span>
                      <span className="text-white tabular-nums whitespace-nowrap">${investAmount || '0'} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#848E9C]">Est. Monthly Return</span>
                      <span className="text-[#0ECB81] tabular-nums whitespace-nowrap">
                        +{Number(copyTarget.roi_30d).toFixed(2)}% (~${(parseFloat(investAmount || '0') * copyTarget.roi_30d / 100).toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 mb-4 p-2.5 bg-[#F0B90B]/5 rounded-lg border border-[#F0B90B]/20">
                  <AlertTriangle className="w-4 h-4 text-[#F0B90B] flex-shrink-0 mt-0.5" />
                  <span className="text-[#848E9C] text-xs leading-relaxed">
                    Copy trading involves risk. Past performance does not guarantee future results. You may lose some or all of your investment.
                  </span>
                </div>

                <button
                  onClick={handleStartCopy}
                  disabled={copyLoading || !user || !investAmount || parseFloat(investAmount) < 10 || parseFloat(investAmount) > usdtBalance}
                  className="w-full py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {copyLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Starting Copy...</>
                  ) : !user ? (
                    <>Please log in to copy trade</>
                  ) : (
                    <><TrendingUp className="w-4 h-4" /> Start Copy — ${investAmount || '0'} USDT</>
                  )}
                </button>

                {parseFloat(investAmount) > usdtBalance && user && (
                  <div className="text-[#F6465D] text-xs text-center mt-2">Insufficient balance</div>
                )}
                {parseFloat(investAmount) < 10 && investAmount !== '' && (
                  <div className="text-[#F6465D] text-xs text-center mt-2">Minimum investment: $10 USDT</div>
                )}
                {copyError && (
                  <div className="text-[#F6465D] text-xs text-center mt-2 bg-[#F6465D]/10 rounded px-2 py-1.5">{copyError}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full My Copies overlay (reuses mobile feature page) */}
      {showMyCopies && (
        <MyCopiesPage
          onClose={() => {
            setShowMyCopies(false);
            if (user) {
              fetchBalance(user.id);
              fetchActiveCopies(user.id);
            }
          }}
          onBrowseTraders={() => setShowMyCopies(false)}
        />
      )}
    </div>
  );
}

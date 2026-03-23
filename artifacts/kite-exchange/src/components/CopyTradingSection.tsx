import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Users, X, ArrowLeft, Shield, AlertTriangle, Check, Loader2, StopCircle, ChevronDown, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MyCopiesPage from './copy-trading/MyCopiesPage';

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

interface Props {
  currentSymbol: string;
  currentPrice: number;
  onActiveCopiesChange?: (count: number) => void;
}

export default function CopyTradingSection({ currentSymbol, currentPrice, onActiveCopiesChange }: Props) {
  const [traders, setTraders] = useState<CopyTrader[]>([]);
  const [showDetail, setShowDetail] = useState<CopyTrader | null>(null);
  const [showAllTraders, setShowAllTraders] = useState(false);
  const [allTraders, setAllTraders] = useState<CopyTrader[]>([]);
  const [allFilter, setAllFilter] = useState('All');
  const [profitHistory] = useState(() => generateProfitHistory());
  const [showCopySetup, setShowCopySetup] = useState(false);
  const [investAmount, setInvestAmount] = useState('100');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [activeCopies, setActiveCopies] = useState<ActiveCopy[]>([]);
  const [showStopConfirm, setShowStopConfirm] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [showMyCopies, setShowMyCopies] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchBalance(session.user.id);
        fetchActiveCopies(session.user.id);
      }
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchBalance(session.user.id);
        fetchActiveCopies(session.user.id);
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTraders = async () => {
      const { data } = await supabase
        .from('copy_traders')
        .select('*')
        .eq('coin_symbol', currentSymbol)
        .eq('is_active', true)
        .order('roi_30d', { ascending: false })
        .limit(3);
      if (data && data.length > 0) {
        setTraders(data);
      } else {
        const { data: fallback } = await supabase
          .from('copy_traders')
          .select('*')
          .eq('is_active', true)
          .order('roi_30d', { ascending: false })
          .limit(3);
        if (fallback) setTraders(fallback);
      }
    };
    fetchTraders();
  }, [currentSymbol]);

  useEffect(() => {
    if (onActiveCopiesChange) onActiveCopiesChange(activeCopies.length);
  }, [activeCopies.length]);

  const fetchBalance = async (uid: string) => {
    const { data } = await supabase.from('user_balances').select('balance').eq('user_id', uid).eq('symbol', 'USDT').maybeSingle();
    if (data) setUsdtBalance(Number(data.balance));
  };

  const fetchActiveCopies = async (uid: string) => {
    const { data } = await supabase
      .from('user_copy_trades')
      .select('*, copy_traders(*)')
      .eq('user_id', uid)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (data) setActiveCopies(data as any);
  };

  const fetchAllTraders = async (filter?: string) => {
    let query = supabase
      .from('copy_traders')
      .select('*')
      .eq('is_active', true)
      .order('roi_30d', { ascending: false })
      .limit(50);

    if (filter && filter !== 'All') {
      query = query.eq('coin_symbol', filter);
    }

    const { data } = await query;
    if (data) setAllTraders(data);
    setShowAllTraders(true);
  };

  const openTraderDetail = (trader: CopyTrader) => {
    setShowDetail(trader);
    setCopySuccess(false);
    setShowCopySetup(false);
  };

  const handleStartCopy = async () => {
    if (!user || !showDetail) return;
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount < 10) return;

    setCopyLoading(true);
    setCopyError(null);
    try {
      if (usdtBalance < amount) {
        setCopyError('Insufficient USDT balance.');
        return;
      }

      const { data, error } = await supabase.rpc('start_copy_trading', {
        p_user_id: user.id,
        p_trader_id: showDetail.id,
        p_investment: amount,
        p_stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        p_take_profit: takeProfit ? parseFloat(takeProfit) : null
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('Insufficient balance')) {
          setCopyError('Insufficient USDT balance.');
        } else if (msg.includes('Trader not found')) {
          setCopyError('Trader not found. Please refresh and try again.');
        } else {
          setCopyError(msg || 'Something went wrong. Please try again.');
        }
        return;
      }

      setCopySuccess(true);
      fetchBalance(user.id);
      fetchActiveCopies(user.id);

      setTimeout(() => {
        setShowCopySetup(false);
        setCopySuccess(false);
        setCopyError(null);
        setShowDetail(null);
      }, 2000);
    } catch (err: any) {
      setCopyError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setCopyLoading(false);
    }
  };

  const handleStopCopy = async (copyId: string) => {
    if (!user) return;
    setStoppingId(copyId);
    try {
      const { error } = await supabase.rpc('stop_copy_trading', {
        p_user_id: user.id,
        p_copy_id: copyId
      });
      if (!error) {
        fetchBalance(user.id);
        fetchActiveCopies(user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStoppingId(null);
      setShowStopConfirm(null);
    }
  };

  const formatRuntime = (days: number) => {
    if (days >= 365) return `${Math.floor(days / 365)}y ${days % 365}d`;
    return `${days}d ${Math.floor(Math.random() * 23 + 1)}h ${Math.floor(Math.random() * 59)}m`;
  };

  const quickAmounts = [50, 100, 250, 500, 1000];
  const filterCoins = ['All', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX'];

  if (traders.length === 0) return null;

  const activeCopyTraderNames = activeCopies.map(c => c.copy_traders.name);

  return (
    <>
      <div className="bg-[#181A20] border-t border-[#2B3139]">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div
            className="flex items-center gap-1.5 flex-1 cursor-pointer active:opacity-70"
            onClick={() => fetchAllTraders()}
          >
            <span className="text-[#EAECEF] text-[12px] font-medium">You may be interested in -</span>
            <span className="text-[#FCD535] text-[12px] font-bold">Copy</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMyCopies(true)}
              className="flex items-center gap-1.5 bg-[#1E2329] border border-[#2B3139] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#EAECEF] active:bg-[#2B3139] transition-colors"
            >
              <Copy className="w-3 h-3 text-[#FCD535]" />
              My Copies
              {activeCopies.length > 0 && (
                <span className="bg-[#FCD535] text-[#181A20] text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                  {activeCopies.length}
                </span>
              )}
            </button>
            <ChevronRight
              className="w-4 h-4 text-[#848E9C] cursor-pointer"
              onClick={() => fetchAllTraders()}
            />
          </div>
        </div>

        <div className="px-3 pb-3">
          {traders.slice(0, 1).map((trader) => (
            <div
              key={trader.id}
              className="bg-[#1E2329] rounded-lg p-3 cursor-pointer active:bg-[#2B3139] transition-colors"
              onClick={() => openTraderDetail(trader)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <img src={trader.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-[#2B3139]" onError={(e) => { (e.target as HTMLImageElement).src = `https://randomuser.me/api/portraits/men/${Math.floor(Math.random()*99)+1}.jpg`; }} />
                  <div>
                    <div className="text-[#EAECEF] text-[13px] font-semibold">{trader.name}</div>
                    <div className="flex items-center gap-1 text-[#848E9C] text-[10px]">
                      <Users className="w-3 h-3" />
                      <span>{trader.follower_count}/{trader.max_followers}</span>
                    </div>
                  </div>
                </div>
                <button
                  className="bg-[#FCD535] text-[#181A20] px-5 py-1.5 rounded text-[12px] font-bold"
                  onClick={(e) => { e.stopPropagation(); openTraderDetail(trader); }}
                >
                  Copy
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#848E9C] text-[10px] mb-0.5">30D PnL (USD)</div>
                  <div className="text-[#0ECB81] text-[15px] font-bold">+{trader.pnl_30d.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#848E9C] text-[10px] mb-0.5">30D ROI</div>
                  <div className="text-[#0ECB81] text-[15px] font-bold">+{trader.roi_30d}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showDetail && (
        <div className="fixed inset-0 bg-[#181A20] z-50 flex flex-col">
          <div className="sticky top-0 bg-[#181A20] z-10 flex items-center justify-between px-4 py-3 border-b border-[#2B3139]">
            <button onClick={() => setShowDetail(null)}>
              <ArrowLeft className="w-5 h-5 text-[#EAECEF]" />
            </button>
            <span className="text-[#EAECEF] text-[15px] font-bold">Bot Details</span>
            <div className="w-5" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#EAECEF] text-[18px] font-bold">{showDetail.coin_symbol}/USDT</div>
                  <div className="flex items-center gap-2 text-[#848E9C] text-[11px] mt-0.5">
                    <span>{showDetail.strategy_type}</span>
                    <span className="text-[#2B3139]">|</span>
                    <Users className="w-3 h-3" />
                    <span>{showDetail.follower_count}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#0ECB81] text-[20px] font-bold">
                    {currentPrice > 0 ? currentPrice.toLocaleString(undefined, { maximumFractionDigits: currentPrice > 100 ? 2 : 4 }) : '---'}
                  </div>
                  <div className="text-[#0ECB81] text-[11px]">+{showDetail.roi_7d}%</div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[#2B3139]">
              <div className="text-[#EAECEF] text-[15px] font-bold mb-3">Historical Profits</div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[#848E9C] text-[11px] mb-0.5">ROI</div>
                  <div className="text-[#0ECB81] text-[17px] font-bold">+{showDetail.roi_30d}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[#848E9C] text-[11px] mb-0.5">PNL (USD)</div>
                  <div className="text-[#0ECB81] text-[17px] font-bold">+{showDetail.total_pnl.toLocaleString()}</div>
                </div>
              </div>
              <div className="h-[100px] bg-[#0B0E11] rounded-lg p-2">
                <ProfitAreaChart data={profitHistory} />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[#2B3139]">
              <div className="text-[#EAECEF] text-[15px] font-bold mb-3">Bot Preview</div>
              <div className="h-[140px] bg-[#0B0E11] rounded-lg p-2">
                <CandlestickPreview price={currentPrice} />
              </div>
            </div>

            <div className="px-4 py-4 border-t border-[#2B3139]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#EAECEF] text-[15px] font-bold">Basic Info</span>
                <button
                  className="text-[#FCD535] text-[12px] font-medium"
                  onClick={() => setShowCopySetup(true)}
                >
                  Customize Parameters
                </button>
              </div>
              <div className="space-y-2.5">
                {[
                  ['Runtime', formatRuntime(showDetail.runtime_days), false],
                  ['Win Rate', `${showDetail.win_rate}%`, true],
                  ['Strategy', showDetail.strategy_type, false],
                  ['Followers', `${showDetail.follower_count}/${showDetail.max_followers}`, false],
                  ['7D ROI', `+${showDetail.roi_7d}%`, true],
                  ['30D PnL', `+$${showDetail.pnl_30d.toLocaleString()}`, true],
                  ['Total PnL', `+$${showDetail.total_pnl.toLocaleString()}`, true],
                ].map(([label, value, isGreen]) => (
                  <div key={label as string} className="flex items-center justify-between">
                    <span className="text-[#848E9C] text-[12px]">{label}</span>
                    <span className={`text-[12px] font-medium ${isGreen ? 'text-[#0ECB81]' : 'text-[#EAECEF]'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[#2B3139]">
              <div className="text-[#EAECEF] text-[13px] font-semibold mb-2">Recent Trades</div>
              <RecentCopyTrades coin={showDetail.coin_symbol} price={currentPrice} />
            </div>
          </div>

          <div className="p-4 bg-[#181A20] border-t border-[#2B3139]">
            <button
              className="w-full py-3 bg-[#FCD535] text-[#181A20] rounded-lg text-[14px] font-bold active:brightness-90 transition-all"
              onClick={() => setShowCopySetup(true)}
            >
              Copy This Trader
            </button>
          </div>
        </div>
      )}

      {showCopySetup && showDetail && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center">
          <div className="bg-[#181A20] w-full max-w-[480px] rounded-t-2xl overflow-hidden animate-slide-up">
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
                <div className="text-[#EAECEF] text-[16px] font-bold mb-2">Copy Started Successfully</div>
                <div className="text-[#848E9C] text-[13px]">
                  You are now copying {showDetail.name}
                </div>
                <div className="text-[#0ECB81] text-[14px] font-semibold mt-2">
                  ${investAmount} USDT invested
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4 p-3 bg-[#1E2329] rounded-lg">
                  <img src={showDetail.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://randomuser.me/api/portraits/men/${Math.floor(Math.random()*99)+1}.jpg`; }} />
                  <div className="flex-1">
                    <div className="text-[#EAECEF] text-[13px] font-semibold">{showDetail.name}</div>
                    <div className="text-[#848E9C] text-[11px]">{showDetail.strategy_type} - {showDetail.coin_symbol}/USDT</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#0ECB81] text-[13px] font-bold">+{showDetail.roi_30d}%</div>
                    <div className="text-[#848E9C] text-[10px]">30D ROI</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#EAECEF] text-[13px] font-medium">Investment Amount</span>
                    <span className="text-[#848E9C] text-[11px]">Available: {usdtBalance.toLocaleString()} USDT</span>
                  </div>
                  <div className="flex items-center bg-[#0B0E11] rounded-lg px-3 py-2.5 border border-[#2B3139] focus-within:border-[#FCD535] transition-colors">
                    <input
                      type="number"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="flex-1 bg-transparent text-[#EAECEF] text-[16px] font-semibold outline-none"
                      placeholder="0.00"
                    />
                    <span className="text-[#848E9C] text-[13px] font-medium ml-2">USDT</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {quickAmounts.map(amt => (
                      <button
                        key={amt}
                        onClick={() => setInvestAmount(String(amt))}
                        className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors ${
                          investAmount === String(amt) ? 'bg-[#FCD535]/20 text-[#FCD535] border border-[#FCD535]' : 'bg-[#2B3139] text-[#848E9C] border border-transparent'
                        }`}
                      >
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
                        <input
                          type="number"
                          value={stopLoss}
                          onChange={(e) => setStopLoss(e.target.value)}
                          className="flex-1 bg-transparent text-[#EAECEF] text-[13px] outline-none"
                          placeholder="e.g. 10"
                        />
                        <span className="text-[#F6465D] text-[11px]">%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[#848E9C] text-[11px] mb-1">Take Profit (%)</div>
                      <div className="flex items-center bg-[#0B0E11] rounded-lg px-3 py-2 border border-[#2B3139]">
                        <input
                          type="number"
                          value={takeProfit}
                          onChange={(e) => setTakeProfit(e.target.value)}
                          className="flex-1 bg-transparent text-[#EAECEF] text-[13px] outline-none"
                          placeholder="e.g. 30"
                        />
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
                    <div className="flex justify-between">
                      <span className="text-[#848E9C]">Trader</span>
                      <span className="text-[#EAECEF]">{showDetail.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#848E9C]">Pair</span>
                      <span className="text-[#EAECEF]">{showDetail.coin_symbol}/USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#848E9C]">Investment</span>
                      <span className="text-[#EAECEF]">${investAmount} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#848E9C]">Est. Monthly Return</span>
                      <span className="text-[#0ECB81]">+{showDetail.roi_30d}% (~${(parseFloat(investAmount || '0') * showDetail.roi_30d / 100).toFixed(2)})</span>
                    </div>
                    {stopLoss && (
                      <div className="flex justify-between">
                        <span className="text-[#848E9C]">Stop Loss</span>
                        <span className="text-[#F6465D]">-{stopLoss}%</span>
                      </div>
                    )}
                    {takeProfit && (
                      <div className="flex justify-between">
                        <span className="text-[#848E9C]">Take Profit</span>
                        <span className="text-[#0ECB81]">+{takeProfit}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 mb-4 p-2.5 bg-[#FCD535]/5 rounded-lg border border-[#FCD535]/20">
                  <AlertTriangle className="w-4 h-4 text-[#FCD535] flex-shrink-0 mt-0.5" />
                  <span className="text-[#848E9C] text-[10px] leading-relaxed">
                    Copy trading involves risk. Past performance does not guarantee future results. You may lose some or all of your investment.
                  </span>
                </div>

                <button
                  onClick={handleStartCopy}
                  disabled={copyLoading || !user || !investAmount || parseFloat(investAmount) < 10 || parseFloat(investAmount) > usdtBalance}
                  className="w-full py-3 bg-[#FCD535] text-[#181A20] rounded-lg text-[14px] font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:brightness-90 transition-all"
                >
                  {copyLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Starting Copy...</>
                  ) : !user ? (
                    <>Please log in to copy trade</>
                  ) : (
                    <>Start Copy - ${investAmount} USDT</>
                  )}
                </button>

                {parseFloat(investAmount) > usdtBalance && user && (
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

      {showAllTraders && (
        <div className="fixed inset-0 bg-[#181A20] z-50 flex flex-col">
          <div className="sticky top-0 bg-[#181A20] z-10 flex items-center justify-between px-4 py-3 border-b border-[#2B3139]">
            <button onClick={() => setShowAllTraders(false)}>
              <ArrowLeft className="w-5 h-5 text-[#EAECEF]" />
            </button>
            <span className="text-[#EAECEF] text-[15px] font-bold">Copy Trading</span>
            <div className="w-5" />
          </div>

          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2B3139] overflow-x-auto scrollbar-hide">
            {filterCoins.map(tag => (
              <button
                key={tag}
                onClick={() => { setAllFilter(tag); fetchAllTraders(tag); }}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                  allFilter === tag ? 'bg-[#FCD535] text-[#181A20]' : 'bg-[#2B3139] text-[#848E9C]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="px-4 py-2 flex items-center justify-between text-[10px] text-[#848E9C] border-b border-[#2B3139]/30">
            <span>Trader</span>
            <div className="flex items-center gap-6 mr-[52px]">
              <span>30D ROI</span>
              <span>30D PnL</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {allTraders.map((trader) => (
              <div
                key={trader.id}
                className="px-4 py-3 flex items-center justify-between border-b border-[#2B3139]/30 active:bg-[#2B3139]/20 cursor-pointer"
                onClick={() => { setShowAllTraders(false); openTraderDetail(trader); }}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <img src={trader.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://randomuser.me/api/portraits/men/${Math.floor(Math.random()*99)+1}.jpg`; }} />
                  <div className="min-w-0">
                    <div className="text-[#EAECEF] text-[12px] font-medium truncate">{trader.name}</div>
                    <div className="flex items-center gap-1 text-[#848E9C] text-[10px]">
                      <span>{trader.coin_symbol}</span>
                      <span className="text-[#2B3139]">|</span>
                      <Users className="w-2.5 h-2.5" />
                      <span>{trader.follower_count}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[#0ECB81] text-[12px] font-bold w-[50px] text-right">+{trader.roi_30d}%</span>
                  <span className="text-[#0ECB81] text-[11px] w-[60px] text-right">+${Number(trader.pnl_30d).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <button
                    className="bg-[#FCD535] text-[#181A20] px-3 py-1 rounded text-[11px] font-bold"
                    onClick={(e) => { e.stopPropagation(); setShowAllTraders(false); openTraderDetail(trader); }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showStopConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-6">
          <div className="bg-[#1E2329] rounded-xl p-5 w-full max-w-[320px]">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#F6465D]/10 flex items-center justify-center mx-auto mb-3">
                <StopCircle className="w-6 h-6 text-[#F6465D]" />
              </div>
              <div className="text-[#EAECEF] text-[15px] font-bold mb-1">Stop Copy Trading?</div>
              <div className="text-[#848E9C] text-[12px]">All open positions will be closed and funds returned to your balance.</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopConfirm(null)}
                className="flex-1 py-2.5 bg-[#2B3139] text-[#EAECEF] rounded-lg text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStopCopy(showStopConfirm)}
                disabled={stoppingId === showStopConfirm}
                className="flex-1 py-2.5 bg-[#F6465D] text-white rounded-lg text-[13px] font-bold flex items-center justify-center gap-1"
              >
                {stoppingId === showStopConfirm ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Stop Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}

export function ActiveCopyPositions({ onStopCopy }: { onStopCopy: (id: string) => void }) {
  const [copies, setCopies] = useState<ActiveCopy[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        const { data: copyData } = await supabase
          .from('user_copy_trades')
          .select('*, copy_traders(*)')
          .eq('user_id', data.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (copyData) setCopies(copyData as any);
      }
    };
    init();

    const interval = setInterval(init, 10000);
    return () => clearInterval(interval);
  }, []);

  if (copies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center mb-3">
          <Users className="w-7 h-7 text-[#5E6673]" />
        </div>
        <div className="text-[#848E9C] text-[12px] mb-1">No Active Copy Trades</div>
        <div className="text-[#5E6673] text-[11px]">Browse traders below to start copying</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#2B3139]/50">
      {copies.map((copy) => {
        const trader = copy.copy_traders;
        const elapsed = Math.floor((Date.now() - new Date(copy.created_at).getTime()) / (1000 * 60 * 60));
        const simulatedPnl = copy.investment_amount * (trader.roi_30d / 100) * (elapsed / 720);
        const currentVal = copy.investment_amount + simulatedPnl;
        const roiPct = (simulatedPnl / copy.investment_amount) * 100;

        return (
          <div key={copy.id} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <img src={trader.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://randomuser.me/api/portraits/men/${Math.floor(Math.random()*99)+1}.jpg`; }} />
                <div>
                  <div className="text-[#EAECEF] text-[12px] font-medium">{trader.name}</div>
                  <div className="text-[#848E9C] text-[10px]">{trader.coin_symbol} - {trader.strategy_type}</div>
                </div>
              </div>
              <button
                onClick={() => onStopCopy(copy.id)}
                className="px-2.5 py-1 rounded border border-[#F6465D]/50 text-[#F6465D] text-[10px] font-medium"
              >
                Stop
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[#848E9C] text-[9px]">Invested</div>
                <div className="text-[#EAECEF] text-[11px] font-medium">${copy.investment_amount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[#848E9C] text-[9px]">Current</div>
                <div className="text-[#0ECB81] text-[11px] font-medium">${currentVal.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[#848E9C] text-[9px]">PnL</div>
                <div className={`text-[11px] font-bold ${simulatedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {simulatedPnl >= 0 ? '+' : ''}{roiPct.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function generateProfitHistory() {
  const points: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < 60; i++) {
    cumulative += (Math.random() * 180) - 25;
    points.push(Math.max(cumulative, -50));
  }
  return points;
}

function RecentCopyTrades({ coin, price }: { coin: string; price: number }) {
  const trades = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const isBuy = Math.random() > 0.35;
      const variance = (Math.random() - 0.4) * 0.02;
      const tradePrice = price * (1 + variance);
      const amount = price > 1000 ? (Math.random() * 0.5 + 0.01) : (Math.random() * 500 + 10);
      const hoursAgo = Math.floor(Math.random() * 48) + 1;
      const pnl = isBuy ? amount * tradePrice * (Math.random() * 0.05) : -(amount * tradePrice * Math.random() * 0.02);
      return { isBuy, price: tradePrice, amount, pnl, hoursAgo, coin };
    }).sort((a, b) => a.hoursAgo - b.hoursAgo);
  }, [coin, price > 0]);

  return (
    <div className="space-y-1.5">
      {trades.map((t, i) => (
        <div key={i} className="flex items-center justify-between py-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${t.isBuy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {t.isBuy ? 'BUY' : 'SELL'}
            </span>
            <span className="text-[#EAECEF]">{t.coin}/USDT</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#848E9C]">{t.hoursAgo}h ago</span>
            <span className={`font-medium ${t.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfitAreaChart({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const min = Math.min(...data, 0);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 300;
  const h = 90;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L${w},${h} L0,${h} Z`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="profitGradCopy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ECB81" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0ECB81" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#profitGradCopy)" />
      <path d={linePath} fill="none" stroke="#0ECB81" strokeWidth="1.5" />
    </svg>
  );
}

function CandlestickPreview({ price }: { price: number }) {
  const [candles, setCandles] = useState(() => {
    return Array.from({ length: 35 }, (_, i) => {
      const base = price * (0.95 + Math.random() * 0.1);
      const open = base * (1 + (Math.random() - 0.5) * 0.02);
      const close = base * (1 + (Math.random() - 0.5) * 0.02);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      return { open, close, high, low, isGreen: close >= open, id: `${Date.now()}-${i}` };
    });
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const lastCandle = prev[prev.length - 1];
        const trend = lastCandle.isGreen ? 0.003 : -0.003;
        const base = lastCandle.close * (1 + trend + (Math.random() - 0.5) * 0.008);
        const open = base * (1 + (Math.random() - 0.5) * 0.015);
        const close = base * (1 + (Math.random() - 0.5) * 0.015);
        const high = Math.max(open, close) * (1 + Math.random() * 0.008);
        const low = Math.min(open, close) * (1 - Math.random() * 0.008);
        const isGreen = close >= open;
        const newCandle = { open, close, high, low, isGreen, id: `${Date.now()}` };
        return [...prev.slice(1), newCandle];
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;
  const w = 350;
  const h = 130;
  const gap = w / candles.length;
  const candleWidth = gap * 0.65;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g style={{ transition: 'transform 0.6s ease-out' }}>
        {candles.map((c, i) => {
          const x = i * gap + gap * 0.2;
          const wickX = x + candleWidth / 2;
          const highY = h - ((c.high - min) / range) * h;
          const lowY = h - ((c.low - min) / range) * h;
          const openY = h - ((c.open - min) / range) * h;
          const closeY = h - ((c.close - min) / range) * h;
          const bodyTop = Math.min(openY, closeY);
          const bodyH = Math.max(Math.abs(openY - closeY), 1.5);
          const color = c.isGreen ? '#0ECB81' : '#F6465D';
          const opacity = Math.min(1, 0.3 + (i / candles.length) * 0.7);
          return (
            <g key={c.id} style={{ opacity, transition: 'opacity 0.6s ease-out' }}>
              <line x1={wickX} y1={highY} x2={wickX} y2={lowY} stroke={color} strokeWidth="1" opacity="0.8" />
              <rect
                x={x}
                y={bodyTop}
                width={candleWidth}
                height={bodyH}
                fill={color}
                rx="0.5"
                style={{ filter: i >= candles.length - 3 ? 'url(#glow)' : 'none' }}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

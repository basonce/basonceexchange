import { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, ChevronRight, Shield, Lock, ArrowDownLeft,
  ArrowUpRight, RefreshCw, History, Wallet as WalletIcon,
  TrendingUp, Copy, Check, ExternalLink, Bell, Zap,
  QrCode, AlertTriangle, Info, ArrowRight, Clock
} from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { trackActivity } from '../lib/activity-tracker';
import DepositMethodModal from './DepositMethodModal';
import SendMethodModal from './SendMethodModal';
import TransferModal from './TransferModal';
import { RealtimePnLService, RealtimePnL } from '../lib/realtime-pnl-service';
import CoinLogo from './CoinLogo';

interface Balance {
  symbol: string;
  name?: string;
  logo_url?: string;
  balance: number;
  locked_balance: number;
  price?: number;
  change24h?: number;
}

interface Transaction {
  id: string;
  type: string;
  symbol: string;
  amount: number;
  created_at: string;
  notes: string;
}

function formatUSD(val: number) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Wallet() {
  const [hideBalance, setHideBalance] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'history'>('overview');
  const [priceMap, setPriceMap] = useState<Record<string, number>>({ USDT: 1 });
  const [futuresUSDT, setFuturesUSDT] = useState(0);
  const [realtimePnL, setRealtimePnL] = useState<RealtimePnL>({ currentTotalValue: 0, startingValue: 0, dailyPnL: 0, dailyPnLPercentage: 0, balances: [] });
  const priceIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const mockAddress = 'TKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  useEffect(() => {
    const pnlService = RealtimePnLService.getInstance();
    const unsub = pnlService.subscribe((pnl) => setRealtimePnL(pnl));

    fetchBalances();
    fetchTransactions();

    let balanceChannel: any;
    let txChannel: any;

    getCurrentUser().then((user) => {
      if (!user) return;
      balanceChannel = supabase
        .channel('wallet_balances')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_balances', filter: `user_id=eq.${user.id}` }, () => fetchBalances())
        .subscribe();
      txChannel = supabase
        .channel('wallet_transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => fetchTransactions())
        .subscribe();
    });

    return () => {
      unsub();
      if (balanceChannel) balanceChannel.unsubscribe();
      if (txChannel) txChannel.unsubscribe();
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, []);

  const fetchPrices = async (symbols: string[]) => {
    try {
      const nonUsdt = symbols.filter(s => s !== 'USDT' && s !== 'EQ');
      if (nonUsdt.length === 0) return;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-proxy?endpoint=ticker24hr`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
      );
      if (!resp.ok) return;
      const data = await resp.json();
      if (!Array.isArray(data)) return;
      const map: Record<string, number> = { USDT: 1 };
      for (const t of data) {
        if (!t.symbol?.endsWith('USDT')) continue;
        const sym = t.symbol.replace('USDT', '');
        if (nonUsdt.includes(sym)) {
          map[sym] = parseFloat(t.lastPrice) || 0;
        }
      }
      setPriceMap(prev => ({ ...prev, ...map }));
    } catch { }
  };

  const fetchBalances = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase.from('user_balances').select('*').eq('user_id', user.id);
      if (!data) { setLoading(false); return; }

      const { data: coinsData } = await supabase.from('supported_coins').select('symbol, name, logo_url');
      const coinsMap = new Map((coinsData || []).map(c => [c.symbol, c]));

      const mapped: Balance[] = data.map(b => {
        const coin = coinsMap.get(b.symbol);
        return {
          symbol: b.symbol,
          name: coin?.name || b.symbol,
          logo_url: coin?.logo_url || null,
          balance: parseFloat(b.balance) || 0,
          locked_balance: parseFloat(b.locked_balance) || 0,
        };
      });

      const usdtRow = data.find((b: any) => b.symbol === 'USDT');
      setFuturesUSDT(parseFloat(usdtRow?.futures_balance || '0'));
      setBalances(mapped);
      fetchPrices(mapped.map(b => b.symbol));

      priceIntervalRef.current = setInterval(() => {
        fetchPrices(mapped.map(b => b.symbol));
      }, 15000);
    } catch { } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const { data } = await supabase
        .from('transactions').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(20);
      setTransactions((data || []).map(tx => ({ ...tx, amount: parseFloat(tx.amount) || 0 })));
    } catch { }
  };


  const totalBalance = realtimePnL.currentTotalValue > 0
    ? realtimePnL.currentTotalValue
    : balances.reduce((sum, b) => sum + b.balance * (priceMap[b.symbol] ?? (b.symbol === 'USDT' ? 1 : 0)), 0) + futuresUSDT;
  const topBalances = [...balances]
    .sort((a, b) => (b.balance * (priceMap[b.symbol] || 0)) - (a.balance * (priceMap[a.symbol] || 0)))
    .filter(b => b.balance > 0)
    .slice(0, 6);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(mockAddress).catch(() => { });
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const txTypeInfo = (type: string) => {
    const isIn = type === 'deposit' || type === 'admin_add' || type === 'admin_credit' || type === 'earn' || type === 'referral_bonus' || type === 'mining';
    return {
      isIn,
      label: type === 'admin_add' || type === 'admin_credit' ? 'Admin Credit' :
        type === 'mining' ? 'Mining Reward' :
        type === 'referral_bonus' ? 'Referral Bonus' :
        type === 'earn' ? 'Earn Reward' :
        type.charAt(0).toUpperCase() + type.slice(1),
      color: isIn ? '#0ECB81' : '#F6465D',
      bg: isIn ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)',
      icon: isIn ? ArrowDownLeft : ArrowUpRight,
    };
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] pb-28">
      <div className="px-4 pt-4 pb-2">
        <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #181A20 0%, #1E2329 60%, #242930 100%)', border: '1px solid rgba(240,185,11,0.12)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #F0B90B, transparent)' }} />
            <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #0ECB81, transparent)' }} />
          </div>

          <div className="relative p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.15)' }}>
                  <WalletIcon className="w-3.5 h-3.5 text-[#F0B90B]" />
                </div>
                <span className="text-gray-400 text-xs font-medium">Total Balance</span>
              </div>
              <button onClick={() => setHideBalance(!hideBalance)} className="text-gray-500 hover:text-gray-300 transition-colors p-1">
                {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tight">
                  {hideBalance ? '••••••' : totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-gray-400 text-base font-semibold">USDT</span>
              </div>
              <div className="text-gray-500 text-xs mt-0.5">
                ≈ {hideBalance ? '••••' : formatUSD(totalBalance)}
              </div>
            </div>


            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Deposit', icon: ArrowDownLeft, color: '#0ECB81', action: () => { trackActivity('deposit_open', 'assets'); setShowDepositModal(true); } },
                { label: 'Withdraw', icon: ArrowUpRight, color: '#F6465D', action: () => { trackActivity('withdraw_open', 'assets'); setShowWithdrawModal(true); }, locked: false },
                { label: 'Transfer', icon: RefreshCw, color: '#F0B90B', action: () => setShowTransferModal(true) },
                { label: 'History', icon: History, color: '#3B82F6', action: () => setActiveSection('history') },
              ].map(({ label, icon: Icon, color, action, locked }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="relative w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                    {locked && <Lock className="w-2.5 h-2.5 text-gray-500 absolute -bottom-0.5 -right-0.5" />}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: locked ? '#848E9C' : 'white' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-2xl overflow-hidden" style={{ background: '#181A20', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0ECB81]" />
              <span className="text-white text-sm font-bold">Security Status</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(14,203,129,0.12)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
              <span className="text-[#0ECB81] text-[10px] font-bold">SECURED</span>
            </div>
          </div>

          <div className="px-4 py-3 space-y-2.5">
            {[
              { label: '2FA Authentication', desc: 'Authenticator app enabled', status: true },
              { label: 'Anti-Phishing Code', desc: 'Email security active', status: true },
              { label: 'Withdrawal Whitelist', desc: 'All networks active', status: true },
            ].map(({ label, desc, status }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: status ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)' }}>
                  {status ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <AlertTriangle className="w-3.5 h-3.5 text-[#F6465D]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold">{label}</div>
                  <div className="text-gray-500 text-[10px]">{desc}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setActiveSection('overview')}
            className={`text-sm font-bold pb-1 transition-all border-b-2 ${activeSection === 'overview' ? 'text-white border-[#F0B90B]' : 'text-gray-500 border-transparent'}`}
          >
            My Assets
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`text-sm font-bold pb-1 transition-all border-b-2 ml-4 ${activeSection === 'history' ? 'text-white border-[#F0B90B]' : 'text-gray-500 border-transparent'}`}
          >
            History
          </button>
        </div>

        {activeSection === 'overview' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#181A20', border: '1px solid rgba(255,255,255,0.05)' }}>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-[#2B3139]" />
                    <div className="flex-1">
                      <div className="h-3 w-16 bg-[#2B3139] rounded mb-1" />
                      <div className="h-2.5 w-24 bg-[#2B3139]/50 rounded" />
                    </div>
                    <div className="h-4 w-20 bg-[#2B3139] rounded" />
                  </div>
                ))}
              </div>
            ) : topBalances.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.08)' }}>
                  <WalletIcon className="w-8 h-8 text-[#F0B90B]/40" />
                </div>
                <div className="text-center">
                  <div className="text-white text-sm font-semibold">No Assets Yet</div>
                  <div className="text-gray-500 text-xs mt-1">Deposit funds to get started</div>
                </div>
                <button
                  onClick={() => { trackActivity('deposit_open', 'assets'); setShowDepositModal(true); }}
                  className="mt-1 px-6 py-2.5 rounded-xl text-black font-bold text-sm transition-all active:scale-95"
                  style={{ background: 'linear-gradient(90deg, #F0B90B, #F8D12F)' }}
                >
                  Deposit Now
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex-1 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Coin</div>
                  <div className="w-28 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider">Balance</div>
                  <div className="w-20 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider">Value</div>
                </div>
                {topBalances.map((b, idx) => {
                  const usdVal = b.balance * (priceMap[b.symbol] || 0);
                  const pct = totalBalance > 0 ? (usdVal / totalBalance) * 100 : 0;
                  return (
                    <div
                      key={b.symbol}
                      className="flex items-center px-4 py-3 transition-colors active:bg-[#2B3139]/30"
                      style={{ borderBottom: idx < topBalances.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 flex-shrink-0">
                          <CoinLogo symbol={b.symbol} dbUrl={b.logo_url} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-white text-xs font-bold">{b.symbol}</div>
                          <div className="text-gray-600 text-[10px] truncate">{b.name}</div>
                        </div>
                      </div>
                      <div className="w-28 text-right">
                        <div className="text-white text-xs font-semibold tabular-nums">
                          {b.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </div>
                        {b.locked_balance > 0 && (
                          <div className="text-[10px] text-yellow-500/70 flex items-center justify-end gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            {b.locked_balance.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="w-20 text-right">
                        <div className="text-gray-300 text-xs font-semibold tabular-nums">{formatUSD(usdVal)}</div>
                        <div className="text-[10px] text-gray-600">{pct.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
                {balances.filter(b => b.balance > 0).length > 6 && (
                  <div className="flex items-center justify-center py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <button className="flex items-center gap-1 text-[#F0B90B] text-xs font-bold">
                      View All {balances.filter(b => b.balance > 0).length} Assets
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'history' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#181A20', border: '1px solid rgba(255,255,255,0.05)' }}>
            {transactions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <History className="w-8 h-8 text-blue-400/40" />
                </div>
                <div className="text-center">
                  <div className="text-white text-sm font-semibold">No Transactions</div>
                  <div className="text-gray-500 text-xs mt-1">Your transaction history will appear here</div>
                </div>
              </div>
            ) : (
              <div>
                {transactions.map((tx, idx) => {
                  const info = txTypeInfo(tx.type);
                  const TxIcon = info.icon;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-[#2B3139]/30"
                      style={{ borderBottom: idx < transactions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: info.bg }}>
                        <TxIcon className="w-4 h-4" style={{ color: info.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-semibold">{info.label}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-gray-600" />
                          <span className="text-gray-600 text-[10px]">{timeAgo(tx.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-bold tabular-nums" style={{ color: info.color }}>
                          {info.isIn ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {tx.symbol}
                        </div>
                        {tx.notes && <div className="text-[10px] text-gray-600 mt-0.5 truncate max-w-[120px]">{tx.notes}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0D1117 0%, #0F1923 100%)', border: '1px solid rgba(240,185,11,0.1)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#F0B90B]" />
            <span className="text-white text-sm font-bold">Quick Actions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { trackActivity('deposit_open', 'assets'); setShowDepositModal(true); }}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all active:scale-95"
              style={{ background: 'rgba(14,203,129,0.1)', border: '1px solid rgba(14,203,129,0.2)' }}
            >
              <ArrowDownLeft className="w-4 h-4 text-[#0ECB81]" />
              <div className="text-left">
                <div className="text-[#0ECB81] text-xs font-bold">Deposit</div>
                <div className="text-gray-600 text-[10px]">Add funds</div>
              </div>
            </button>
            <button
              onClick={() => { trackActivity('withdraw_open', 'assets'); setShowWithdrawModal(true); }}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all active:scale-95"
              style={{
                background: 'rgba(246,70,93,0.1)',
                border: '1px solid rgba(246,70,93,0.2)'
              }}
            >
              <ArrowUpRight className="w-4 h-4 text-[#F6465D]" />
              <div className="text-left">
                <div className="text-xs font-bold" style={{ color: '#F6465D' }}>Withdraw</div>
                <div className="text-gray-600 text-[10px]">Send funds</div>
              </div>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(240,185,11,0.06)', border: '1px solid rgba(240,185,11,0.1)' }}>
            <Info className="w-3.5 h-3.5 text-[#F0B90B] flex-shrink-0" />
            <span className="text-gray-500 text-[10px] leading-relaxed">
              All transactions are encrypted and secured. Basonce uses multi-layer security protocols to protect your assets.
            </span>
          </div>
        </div>
      </div>

      <DepositMethodModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} />
      <SendMethodModal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} />
      <TransferModal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} />
    </div>
  );
}

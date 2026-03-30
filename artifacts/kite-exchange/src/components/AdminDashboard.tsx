import { useState, useEffect, useRef } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Search,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  LogOut,
  BarChart3,
  Shield,
  MessageSquare,
  Target,
  Zap,
  AlertTriangle,
  Wallet,
  X,
  Server,
  Bot,
  Home,
  AlertCircle,
  Eye,
  Image,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import GlobalAIToggle from './GlobalAIToggle';
import SupportTicketsPanel from './SupportTicketsPanel';
import WalletPoolManagement from './WalletPoolManagement';
import ManualDepositUpdate from './ManualDepositUpdate';
import WalletLookupModal from './WalletLookupModal';
import WalletSafetyPanel from './WalletSafetyPanel';
import AdminActivityLog from './AdminActivityLog';
import AdminCommandCenter from './AdminCommandCenter';
import AdminAnalyticsDashboard from './AdminAnalyticsDashboard';
import { DeploymentCenter } from './DeploymentCenter';
import AIAssistant from './AIAssistant';
import AgentManagement from './AgentManagement';
import WalletGeneratorPage from '../pages/WalletGeneratorPage';
import DataProtectionPanel from './DataProtectionPanel';
import UserWalletAssignments from './UserWalletAssignments';
import IncomingFundsPanel from './IncomingFundsPanel';
import WithdrawalApprovalPanel from './WithdrawalApprovalPanel';
import TradfiLogosPanel from './TradfiLogosPanel';
import RevenuePanel from './RevenuePanel';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface UserBalance {
  id: string;
  user_id: string;
  symbol: string;
  balance: number;
  locked_balance: number;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  symbol: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  notes: string;
  created_at: string;
  user_profiles?: {
    email: string;
  };
}

interface AdminDashboardProps {
  onBack: () => void;
}

const cryptoSymbols = [
  'USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE',
  'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI', 'LTC', 'ATOM', 'PEPE', 'SHIB', 'WIF', 'BONK'
];

type AdminTab = 'overview' | 'command' | 'agents' | 'support' | 'position' | 'wallets' | 'user-wallets' | 'deposits' | 'withdrawals' | 'security' | 'activity' | 'deploy' | 'ai' | 'analytics' | 'wallet-gen' | 'data-protection' | 'incoming-funds' | 'tradfi-logos' | 'revenue';

function playUrgentAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(1200, 0, 0.12); beep(900, 0.15, 0.12); beep(1200, 0.30, 0.12);
    beep(900, 0.45, 0.12); beep(1200, 0.60, 0.20);
  } catch {}
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [showSendCoinModal, setShowSendCoinModal] = useState(false);
  const [showWalletLookup, setShowWalletLookup] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalVolume: 0
  });
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [incomingAlerts, setIncomingAlerts] = useState<{ id: string; amount: number; coin: string; network: string; user: string; ts: number }[]>([]);
  const [newTxCount, setNewTxCount] = useState(0);
  const seenTxIds = useRef(new Set<string>());
  const seeded = useRef(false);

  const [addBalanceForm, setAddBalanceForm] = useState({
    symbol: 'USDT',
    amount: '',
    notes: ''
  });

  const [sendCoinForm, setSendCoinForm] = useState({
    toUserId: '',
    toEmail: '',
    symbol: 'USDT',
    amount: '',
    notes: ''
  });

  const [emailSearchResults, setEmailSearchResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    loadData();
    loadUnreadSupportCount();

    // Seed existing tx IDs so we don't alarm on historical data
    supabase.from('wallet_transactions').select('id').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => {
        (data || []).forEach((r: { id: string }) => seenTxIds.current.add(r.id));
        seeded.current = true;
      });

    const channel = supabase
      .channel('admin_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        loadUnreadSupportCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadUnreadSupportCount();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, (payload) => {
        if (!seeded.current) return;
        const rec = payload.new as any;
        if (!rec?.id || seenTxIds.current.has(rec.id)) return;
        seenTxIds.current.add(rec.id);
        const amount = Number(rec.amount) || 0;
        if (amount <= 0) return;
        playUrgentAlarm();
        const alert = {
          id: rec.id,
          amount,
          coin: String(rec.token_symbol || 'USDT'),
          network: String(rec.network || 'BEP20'),
          user: String(rec.user_id || ''),
          ts: Date.now(),
        };
        setIncomingAlerts(prev => [alert, ...prev].slice(0, 8));
        setNewTxCount(n => n + 1);
        setTimeout(() => setIncomingAlerts(prev => prev.filter(a => a.id !== rec.id)), 30000);
      })
      .subscribe();

    const interval = setInterval(() => {
      loadUnreadSupportCount();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadTransactions(), loadStats()]);
    } catch (e) {
      console.error('Admin load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const loadUnreadSupportCount = async () => {
    const { count } = await supabase
      .from('support_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'customer')
      .eq('read', false);
    setUnreadSupportCount(count || 0);
  };

  const loadUserBalances = async (userId: string) => {
    const { data } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .order('symbol');
    setUserBalances(data || []);
  };

  const loadTransactions = async () => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(data || []);
    } catch (e) {
      console.error('loadTransactions error:', e);
      setTransactions([]);
    }
  };

  const loadStats = async () => {
    try {
      const { data: usersData } = await supabase.from('user_profiles').select('id, is_active').eq('is_real_user', true);
      const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: usersData?.length || 0,
        activeUsers: usersData?.filter(u => u.is_active).length || 0,
        totalTransactions: txCount || 0,
        totalVolume: 0
      });
    } catch (e) {
      console.error('loadStats error:', e);
    }
  };

  const handleUserSelect = async (user: UserProfile) => {
    setSelectedUser(user);
    await loadUserBalances(user.id);
  };

  const handleAddBalance = async () => {
    if (!selectedUser || !addBalanceForm.amount || parseFloat(addBalanceForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(addBalanceForm.amount);
      const { data: adminData } = await supabase.auth.getUser();

      const { data: existingBalance } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', selectedUser.id)
        .eq('symbol', addBalanceForm.symbol)
        .maybeSingle();

      const balanceBefore = existingBalance ? parseFloat(existingBalance.balance) : 0;
      const balanceAfter = balanceBefore + amount;

      if (existingBalance) {
        await supabase
          .from('user_balances')
          .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
          .eq('id', existingBalance.id);
      } else {
        await supabase
          .from('user_balances')
          .insert({ user_id: selectedUser.id, symbol: addBalanceForm.symbol, balance: amount, locked_balance: 0 });
      }

      await supabase.from('transactions').insert({
        user_id: selectedUser.id,
        type: 'admin_credit',
        symbol: addBalanceForm.symbol,
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        admin_id: adminData.user?.id,
        notes: addBalanceForm.notes || `Admin credit: ${amount} ${addBalanceForm.symbol}`
      });

      await supabase.from('admin_actions').insert({
        admin_id: adminData.user?.id,
        action_type: 'credit_balance',
        target_user_id: selectedUser.id,
        details: { symbol: addBalanceForm.symbol, amount, notes: addBalanceForm.notes }
      });

      setAddBalanceForm({ symbol: 'USDT', amount: '', notes: '' });
      setShowAddBalanceModal(false);
      await loadUserBalances(selectedUser.id);
      await loadTransactions();
      alert('Balance added successfully!');
    } catch (error) {
      alert('Error adding balance');
    }
  };

  const searchUsersByEmail = async (email: string) => {
    if (email.length < 3) {
      setEmailSearchResults([]);
      return;
    }
    const filtered = users.filter(u =>
      u.email.toLowerCase().includes(email.toLowerCase()) && !u.is_admin
    );
    setEmailSearchResults(filtered);
  };

  const handleSendCoin = async () => {
    if (!sendCoinForm.toUserId || !sendCoinForm.amount || parseFloat(sendCoinForm.amount) <= 0) {
      alert('Please select a user and enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(sendCoinForm.amount);
      const { data: adminData } = await supabase.auth.getUser();

      const { data: existingBalance } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', sendCoinForm.toUserId)
        .eq('symbol', sendCoinForm.symbol)
        .maybeSingle();

      const balanceBefore = existingBalance ? parseFloat(existingBalance.balance) : 0;
      const balanceAfter = balanceBefore + amount;

      if (existingBalance) {
        await supabase
          .from('user_balances')
          .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
          .eq('id', existingBalance.id);
      } else {
        await supabase
          .from('user_balances')
          .insert({ user_id: sendCoinForm.toUserId, symbol: sendCoinForm.symbol, balance: amount, locked_balance: 0 });
      }

      await supabase.from('transactions').insert({
        user_id: sendCoinForm.toUserId,
        type: 'admin_credit',
        symbol: sendCoinForm.symbol,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        admin_id: adminData.user?.id,
        notes: sendCoinForm.notes || `Admin transfer: ${amount} ${sendCoinForm.symbol}`
      });

      setSendCoinForm({ toUserId: '', toEmail: '', symbol: 'USDT', amount: '', notes: '' });
      setEmailSearchResults([]);
      setShowSendCoinModal(false);
      await loadTransactions();
      await loadStats();
      alert('Coin sent successfully!');
    } catch (error) {
      alert('Error sending coin');
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    await supabase
      .from('user_profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);

    await loadUsers();
    if (selectedUser?.id === user.id) {
      setSelectedUser({ ...user, is_active: !user.is_active });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Genel', icon: BarChart3 },
    { id: 'wallets', label: 'Cüzdan Havuz', icon: Wallet },
    { id: 'user-wallets', label: 'Kullanıcı', icon: Users },
    { id: 'incoming-funds', label: 'Gelen Fonlar', icon: ArrowDownRight, badge: newTxCount },
    { id: 'support', label: 'Destek', icon: MessageSquare, badge: unreadSupportCount },
    { id: 'command', label: 'Komut', icon: Zap },
    { id: 'agents', label: 'Ajanlar', icon: Users },
    { id: 'position', label: 'Pozisyon', icon: Target },
    { id: 'deposits', label: 'Yatırım', icon: DollarSign },
    { id: 'withdrawals', label: 'Çekim', icon: ArrowUpRight },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'activity', label: 'Aktivite', icon: Activity },
    { id: 'deploy', label: 'Deploy', icon: Server },
    { id: 'ai', label: 'AI Bot', icon: Bot },
    { id: 'analytics', label: 'Analitik', icon: Eye },
    { id: 'wallet-gen', label: 'Üretici', icon: Wallet },
    { id: 'data-protection', label: 'Veri Koruma', icon: Shield },
    { id: 'tradfi-logos', label: 'TradeFi', icon: Image },
    { id: 'revenue', label: 'Gelir', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E2329] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-bold">Admin Dashboard</h1>
            <p className="text-xs text-gray-400">Basonce Exchange</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2B3139] text-white rounded-lg text-xs hover:bg-[#363D47] transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); onBack(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 🔴 Incoming Transaction Alarm Banners */}
      {incomingAlerts.length > 0 && (
        <div className="fixed top-[52px] left-0 right-0 z-[999] flex flex-col gap-1.5 px-2 pt-2 pointer-events-none">
          {incomingAlerts.map((a) => (
            <div key={a.id} className="pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-2xl"
              style={{ background: 'linear-gradient(135deg,#b91c1c,#dc2626)', border: '2px solid #ef4444', animation: 'slideDown 0.3s ease' }}>
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-black text-white">
                💸
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm leading-tight">
                  YENİ {a.network} TRANSFER GELDİ!
                </p>
                <p className="text-red-100 text-xs mt-0.5 font-semibold">
                  +{a.amount.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} {a.coin}
                  <span className="ml-2 opacity-70">• {new Date(a.ts).toLocaleTimeString('tr-TR')}</span>
                </p>
              </div>
              <button
                onClick={() => { setIncomingAlerts(prev => prev.filter(x => x.id !== a.id)); setActiveTab('incoming-funds'); setNewTxCount(0); }}
                className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                Gör →
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#1E2329] border-b border-[#2B3139] px-2 py-2">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex flex-col items-center justify-center gap-1 px-1 py-2.5 rounded-xl transition-all ${
                activeTab === id
                  ? 'bg-yellow-500 text-black'
                  : 'bg-[#2B3139] text-gray-400 hover:text-white hover:bg-[#363D47]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] font-medium leading-tight text-center w-full px-0.5 truncate">
                {label}
              </span>
              {badge && badge > 0 && (
                <span className="absolute top-1 right-1 min-w-[13px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Platform Overview</h2>
              <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Users</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
                <div className="text-xs text-green-600 mt-1">{stats.activeUsers} active</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Transactions</span>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalTransactions}</div>
                <div className="text-xs text-gray-500 mt-1">Total count</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Volume</span>
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">${(stats.totalVolume / 1000).toFixed(1)}K</div>
                <div className="text-xs text-gray-500 mt-1">All time</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Support</span>
                  <MessageSquare className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-600">{unreadSupportCount}</div>
                <div className="text-xs text-gray-500 mt-1">Unread messages</div>
              </div>
            </div>

            <div className="col-span-2">
              <GlobalAIToggle />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">User Management</h3>
                <button
                  onClick={() => setShowSendCoinModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Coin
                </button>
              </div>

              <div className="p-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selectedUser?.id === user.id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                        <p className="text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.is_admin && <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">ADMIN</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedUser && (
                <div className="border-t border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedUser.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          selectedUser.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {selectedUser.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {selectedUser.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddBalanceModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Balance
                      </button>
                      <button
                        onClick={() => toggleUserStatus(selectedUser)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                          selectedUser.is_active
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {selectedUser.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {selectedUser.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>

                  {userBalances.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Balances:</p>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {userBalances.map(balance => (
                          <div key={balance.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900">{balance.symbol}</span>
                            <span className="text-sm text-gray-700">{parseFloat(balance.balance.toString()).toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {transactions.slice(0, 20).map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type.includes('credit') || tx.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {tx.type.includes('credit') || tx.type === 'deposit' ? (
                        <ArrowDownRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{tx.user_profiles?.email}</p>
                      <p className="text-xs text-gray-500">{tx.type.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        tx.type.includes('credit') || tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type.includes('credit') || tx.type === 'deposit' ? '+' : '-'}{parseFloat(tx.amount.toString()).toFixed(2)} {tx.symbol}
                      </p>
                      <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'command' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Command Center</h2>
            <p className="text-gray-600 text-sm mb-4">Mobil yönetim merkezi - Platformu tek bir yerden kontrol et</p>
            <AdminCommandCenter />
          </div>
        )}

        {activeTab === 'agents' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Agent Management</h2>
            <AgentManagement />
          </div>
        )}

        {activeTab === 'support' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Support Tickets</h2>
              {unreadSupportCount > 0 && (
                <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                  {unreadSupportCount} unread
                </span>
              )}
            </div>
            <GlobalAIToggle />
            <SupportTicketsPanel />
          </div>
        )}

        {activeTab === 'position' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Position Control</h2>
            <PositionControlPanel />
          </div>
        )}

        {activeTab === 'wallets' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Cüzdan Pool</h2>
              <button
                onClick={() => setShowWalletLookup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Search className="w-4 h-4" />
                Wallet Lookup
              </button>
            </div>
            <WalletPoolManagement />
          </div>
        )}

        {activeTab === 'user-wallets' && (
          <UserWalletAssignments />
        )}

        {activeTab === 'incoming-funds' && (
          <IncomingFundsPanel />
        )}

        {activeTab === 'deposits' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Manual Deposit Update</h2>
            <ManualDepositUpdate />
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <WithdrawalApprovalPanel />
        )}

        {activeTab === 'security' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Güvenlik</h2>
            <WalletSafetyPanel />
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Log</h2>
            <AdminActivityLog />
          </div>
        )}

        {activeTab === 'deploy' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Deploy Center</h2>
            <DeploymentCenter />
          </div>
        )}

        {activeTab === 'ai' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">AI Asistan</h2>
            <AIAssistant />
          </div>
        )}

        {activeTab === 'wallet-gen' && (
          <WalletGeneratorPage />
        )}

        {activeTab === 'data-protection' && (
          <DataProtectionPanel />
        )}

        {activeTab === 'tradfi-logos' && (
          <TradfiLogosPanel />
        )}

        {activeTab === 'revenue' && (
          <RevenuePanel />
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">User Analytics</h2>
              <button
                onClick={() => setShowAnalyticsDashboard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Full Analytics
              </button>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Click "Full Analytics" to view detailed user analytics dashboard</p>
            </div>
          </div>
        )}
      </div>

      {showAddBalanceModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddBalanceModal(false); setAddBalanceForm({ symbol: 'USDT', amount: '', notes: '' }); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add Balance</h3>
              <button onClick={() => { setShowAddBalanceModal(false); setAddBalanceForm({ symbol: 'USDT', amount: '', notes: '' }); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">Adding balance to: <span className="font-medium text-gray-900">{selectedUser.email}</span></p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cryptocurrency</label>
                <select
                  value={addBalanceForm.symbol}
                  onChange={(e) => setAddBalanceForm({ ...addBalanceForm, symbol: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {cryptoSymbols.map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={addBalanceForm.amount}
                  onChange={(e) => setAddBalanceForm({ ...addBalanceForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  {['100', '500', '1000', '5000'].map(v => (
                    <button key={v} onClick={() => setAddBalanceForm({ ...addBalanceForm, amount: v })}
                      className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors">
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={addBalanceForm.notes}
                  onChange={(e) => setAddBalanceForm({ ...addBalanceForm, notes: e.target.value })}
                  placeholder="Reason for credit..."
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddBalanceModal(false); setAddBalanceForm({ symbol: 'USDT', amount: '', notes: '' }); }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddBalance}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                  Add Balance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSendCoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSendCoinModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Send Coin to User</h3>
              <button onClick={() => setShowSendCoinModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={sendCoinForm.toEmail}
                    onChange={(e) => { setSendCoinForm({ ...sendCoinForm, toEmail: e.target.value, toUserId: '' }); searchUsersByEmail(e.target.value); }}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {sendCoinForm.toEmail.length >= 3 && emailSearchResults.length === 0 && (
                  <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-red-600 text-xs">User not found</p>
                  </div>
                )}

                {emailSearchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    {emailSearchResults.map(user => (
                      <button key={user.id} onClick={() => { setSendCoinForm({ ...sendCoinForm, toUserId: user.id, toEmail: user.email }); setEmailSearchResults([]); }}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                        {user.email}
                      </button>
                    ))}
                  </div>
                )}

                {sendCoinForm.toUserId && (
                  <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-700 text-xs font-medium">{sendCoinForm.toEmail}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cryptocurrency</label>
                <select
                  value={sendCoinForm.symbol}
                  onChange={(e) => setSendCoinForm({ ...sendCoinForm, symbol: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {cryptoSymbols.map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={sendCoinForm.amount}
                  onChange={(e) => setSendCoinForm({ ...sendCoinForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  {['1000', '5000', '10000', '50000'].map(v => (
                    <button key={v} onClick={() => setSendCoinForm({ ...sendCoinForm, amount: v })}
                      className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors">
                      ${Number(v).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={sendCoinForm.notes}
                  onChange={(e) => setSendCoinForm({ ...sendCoinForm, notes: e.target.value })}
                  placeholder="Transfer reason..."
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowSendCoinModal(false); setSendCoinForm({ toUserId: '', toEmail: '', symbol: 'USDT', amount: '', notes: '' }); setEmailSearchResults([]); }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSendCoin} disabled={!sendCoinForm.toUserId || !sendCoinForm.amount || parseFloat(sendCoinForm.amount) <= 0}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWalletLookup && (
        <WalletLookupModal onClose={() => setShowWalletLookup(false)} />
      )}

      {showAnalyticsDashboard && (
        <AdminAnalyticsDashboard onClose={() => setShowAnalyticsDashboard(false)} />
      )}
    </div>
  );
}

function PositionControlPanel() {
  const [positions, setPositions] = useState<any[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showLiquidateConfirm, setShowLiquidateConfirm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [overrideForm, setOverrideForm] = useState({
    coin_symbol: '',
    override_price: '',
    duration_minutes: '',
    reason: ''
  });

  useEffect(() => {
    loadPositions();
    loadPriceOverrides();
    const interval = setInterval(() => {
      loadPositions();
      loadPriceOverrides();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPositions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_active_positions');
      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPriceOverrides = async () => {
    try {
      const { data } = await supabase
        .from('admin_price_overrides')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setPriceOverrides(data || []);
    } catch (error) {
      console.error('Error loading overrides:', error);
    }
  };

  const handleRunAutoLiquidation = async () => {
    if (!confirm('Run auto-liquidation? All positions at liquidation price will be closed.')) return;
    try {
      const { data, error } = await supabase.rpc('check_and_liquidate');
      if (error) throw error;
      const result = data as any;
      if (result.liquidated_count > 0) {
        alert(`Liquidation complete!\nLiquidated: ${result.liquidated_count} positions\nMargin lost: $${parseFloat(result.total_margin_lost).toFixed(2)}`);
      } else {
        alert('No positions to liquidate.');
      }
      loadPositions();
    } catch (error) {
      alert('Auto-liquidation failed');
    }
  };

  const handleForceLiquidate = async () => {
    if (!selectedPosition) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('user_profiles').select('email').eq('id', user.id).single();
      const { data, error } = await supabase.rpc('force_liquidate_position', {
        p_position_id: selectedPosition.position_id,
        p_admin_email: profile?.email || 'admin'
      });
      if (error) throw error;
      alert(`Position liquidated! User lost ${data.liquidated_amount} USDT`);
      setShowLiquidateConfirm(false);
      setSelectedPosition(null);
      loadPositions();
    } catch (error) {
      alert('Force liquidation failed');
    }
  };

  const handleApplyOverride = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('user_profiles').select('email').eq('id', user.id).single();
      const { error } = await supabase.rpc('apply_price_override', {
        p_coin_symbol: overrideForm.coin_symbol,
        p_override_price: parseFloat(overrideForm.override_price),
        p_admin_email: profile?.email || 'admin',
        p_duration_minutes: overrideForm.duration_minutes ? parseInt(overrideForm.duration_minutes) : null,
        p_reason: overrideForm.reason || null
      });
      if (error) throw error;
      alert(`Price override applied for ${overrideForm.coin_symbol}`);
      setShowOverrideModal(false);
      setOverrideForm({ coin_symbol: '', override_price: '', duration_minutes: '', reason: '' });
      loadPriceOverrides();
      setTimeout(loadPositions, 1000);
    } catch (error) {
      alert('Price override failed');
    }
  };

  const handleRemoveOverride = async (coinSymbol: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('user_profiles').select('email').eq('id', user.id).single();
      const { error } = await supabase.rpc('remove_price_override', {
        p_coin_symbol: coinSymbol,
        p_admin_email: profile?.email || 'admin'
      });
      if (error) throw error;
      loadPriceOverrides();
      setTimeout(loadPositions, 1000);
    } catch (error) {
      alert('Failed to remove override');
    }
  };

  const filteredPositions = positions.filter(pos => {
    const matchesSearch = searchTerm === '' ||
      pos.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.coin_symbol?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || pos.position_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Active Positions</div>
          <div className="text-2xl font-bold text-gray-900">{positions.length}</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Price Overrides</div>
          <div className="text-2xl font-bold text-red-600">{priceOverrides.length}</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Near Liquidation</div>
          <div className="text-2xl font-bold text-orange-600">
            {positions.filter(p => parseFloat(p.distance_to_liquidation_percent) < 10).length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Total Margin</div>
          <div className="text-xl font-bold text-gray-900">
            ${positions.reduce((sum, p) => sum + parseFloat(p.margin || 0), 0).toFixed(0)}
          </div>
        </div>
      </div>

      {priceOverrides.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-red-300 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-red-50">
            <Zap className="w-4 h-4 text-red-600" />
            <h3 className="font-semibold text-red-700">Active Price Overrides</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {priceOverrides.map((override) => (
              <div key={override.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-bold text-gray-900">{override.coin_symbol}</p>
                  <p className="text-sm text-red-600 font-semibold">${parseFloat(override.override_price).toFixed(2)}</p>
                </div>
                <button onClick={() => handleRemoveOverride(override.coin_symbol)}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => setShowOverrideModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
          <Zap className="w-4 h-4" />
          Set Price Override
        </button>
        <button onClick={handleRunAutoLiquidation}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors">
          <AlertTriangle className="w-4 h-4" />
          Auto Liquidate
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-200 space-y-2">
          <input
            type="text"
            placeholder="Search by email or coin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {['all', 'LONG', 'SHORT'].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : filteredPositions.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No positions found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPositions.map((pos) => (
              <div key={pos.position_id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-600 truncate max-w-[180px]">{pos.user_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-gray-900">{pos.coin_symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        pos.position_type === 'LONG' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{pos.position_type}</span>
                      <span className="text-xs text-gray-500">{pos.leverage}x</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedPosition(pos); setShowLiquidateConfirm(true); }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                  >
                    Force Liquidate
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">Entry Price</p>
                    <p className="text-xs font-semibold text-gray-900">${parseFloat(pos.entry_price).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">Margin</p>
                    <p className="text-xs font-semibold text-gray-900">${parseFloat(pos.margin).toFixed(2)}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${parseFloat(pos.distance_to_liquidation_percent) < 10 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <p className="text-[10px] text-gray-500">Liq. Distance</p>
                    <p className={`text-xs font-semibold ${parseFloat(pos.distance_to_liquidation_percent) < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {parseFloat(pos.distance_to_liquidation_percent).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowOverrideModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Set Price Override</h3>
              <button onClick={() => setShowOverrideModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coin Symbol</label>
                <input type="text" placeholder="e.g. BTC, ETH" value={overrideForm.coin_symbol}
                  onChange={(e) => setOverrideForm({ ...overrideForm, coin_symbol: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Override Price (USD)</label>
                <input type="number" step="0.01" placeholder="e.g. 45000" value={overrideForm.override_price}
                  onChange={(e) => setOverrideForm({ ...overrideForm, override_price: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes, optional)</label>
                <input type="number" placeholder="Empty = permanent" value={overrideForm.duration_minutes}
                  onChange={(e) => setOverrideForm({ ...overrideForm, duration_minutes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (internal note)</label>
                <input type="text" placeholder="Reason..." value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleApplyOverride}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
                  Apply Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLiquidateConfirm && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowLiquidateConfirm(false); setSelectedPosition(null); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Force Liquidate Position</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">User</span>
                <span className="font-medium text-gray-900">{selectedPosition.user_email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Position</span>
                <span className="font-medium text-gray-900">{selectedPosition.coin_symbol} {selectedPosition.position_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Leverage</span>
                <span className="font-medium text-gray-900">{selectedPosition.leverage}x</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Margin (to lose)</span>
                <span className="font-bold text-red-600">${parseFloat(selectedPosition.margin).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowLiquidateConfirm(false); setSelectedPosition(null); }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleForceLiquidate}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
                Force Liquidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Crown,
  Lock,
  Gamepad2,
  Pin,
  Trash2,
  Radio,
} from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { LEAGUES, LEAGUE_TEAMS, TEAM_LOGOS } from '../lib/sportsData';
import { fetchUserRestrictions, saveUserRestrictions } from '../lib/user-restrictions';
import type { UserRestrictions } from '../lib/user-restrictions';
import { logBonusReceived } from '../lib/withdrawal-permission';
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
import DepositRadarPanel from './DepositRadarPanel';
import WithdrawalApprovalPanel from './WithdrawalApprovalPanel';
import TradfiLogosPanel from './TradfiLogosPanel';
import SocialMediaPanel from './SocialMediaPanel';
import RevenuePanel from './RevenuePanel';
import VisitorsPanel from './VisitorsPanel';
import VipManagementPanel from './VipManagementPanel';
import LiveActivityPanel from './LiveActivityPanel';
import UserRestrictionsPanel from './UserRestrictionsPanel';

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

type AdminTab = 'overview' | 'command' | 'agents' | 'support' | 'position' | 'wallets' | 'user-wallets' | 'deposits' | 'withdrawals' | 'security' | 'activity' | 'deploy' | 'ai' | 'analytics' | 'wallet-gen' | 'data-protection' | 'incoming-funds' | 'tradfi-logos' | 'revenue' | 'visitors' | 'vip' | 'live' | 'restrictions' | 'quick-restrict' | 'matches';

// ── BTC-only pair list ───────────────────────────────────────
const BTC_ONLY_PAIRS = [
  'ETH/BTC', 'BNB/BTC', 'SOL/BTC', 'XRP/BTC', 'ADA/BTC', 'DOGE/BTC', 'AVAX/BTC', 'LINK/BTC',
  'XAU/BTC', 'XAG/BTC', 'XPT/BTC', 'XPD/BTC', 'COPPER/BTC',
  'OIL/BTC', 'BRENT/BTC', 'NATGAS/BTC',
  'COFFEE/BTC', 'COCOA/BTC', 'SUGAR/BTC', 'WHEAT/BTC', 'COTTON/BTC', 'SOYBEAN/BTC', 'CORN/BTC',
];

// ── Sendable coins list (priority order) ─────────────────────
const ALL_SENDABLE_COINS = [
  // Stable
  { sym: 'USDT',    name: 'Tether USDT',   icon: '💵', group: 'Stables' },
  // Crypto majors
  { sym: 'BTC',     name: 'Bitcoin',        icon: '₿',  group: 'Kripto' },
  { sym: 'ETH',     name: 'Ethereum',       icon: 'Ξ',  group: 'Kripto' },
  // Energy (önce)
  { sym: 'BRENT',   name: 'Brent Oil',      icon: '🛢️', group: 'Enerji' },
  { sym: 'OIL',     name: 'WTI Crude',      icon: '🛢️', group: 'Enerji' },
  { sym: 'NATGAS',  name: 'Doğalgaz',       icon: '🔥', group: 'Enerji' },
  // Precious metals
  { sym: 'XAU',     name: 'Altın',          icon: '🥇', group: 'Metaller' },
  { sym: 'XAG',     name: 'Gümüş',          icon: '🥈', group: 'Metaller' },
  { sym: 'XPT',     name: 'Platin',         icon: '⚪', group: 'Metaller' },
  { sym: 'XPD',     name: 'Palladyum',      icon: '🔘', group: 'Metaller' },
  { sym: 'COPPER',  name: 'Bakır',          icon: '🔶', group: 'Metaller' },
  // Agriculture
  { sym: 'COFFEE',  name: 'Kahve',          icon: '☕', group: 'Tarım' },
  { sym: 'COCOA',   name: 'Kakao',          icon: '🍫', group: 'Tarım' },
  { sym: 'SUGAR',   name: 'Şeker',          icon: '🍬', group: 'Tarım' },
  { sym: 'WHEAT',   name: 'Buğday',         icon: '🌾', group: 'Tarım' },
  { sym: 'CORN',    name: 'Mısır',          icon: '🌽', group: 'Tarım' },
  { sym: 'SOYBEAN', name: 'Soya',           icon: '🫘', group: 'Tarım' },
  // Indices
  { sym: 'SPX',     name: 'S&P 500',        icon: '📈', group: 'Endeksler' },
  { sym: 'NDX',     name: 'Nasdaq 100',     icon: '📈', group: 'Endeksler' },
  { sym: 'DJI',     name: 'Dow Jones',      icon: '📈', group: 'Endeksler' },
  { sym: 'DAX',     name: 'DAX 40',         icon: '🇩🇪', group: 'Endeksler' },
  { sym: 'FTSE',    name: 'FTSE 100',       icon: '🇬🇧', group: 'Endeksler' },
  { sym: 'NKY',     name: 'Nikkei 225',     icon: '🇯🇵', group: 'Endeksler' },
  // Other crypto
  { sym: 'BNB',     name: 'BNB',            icon: '🟡', group: 'Kripto' },
  { sym: 'SOL',     name: 'Solana',         icon: '◎',  group: 'Kripto' },
  { sym: 'XRP',     name: 'XRP',            icon: '💧', group: 'Kripto' },
  { sym: 'ADA',     name: 'Cardano',        icon: '🔵', group: 'Kripto' },
  { sym: 'DOGE',    name: 'Dogecoin',       icon: '🐕', group: 'Kripto' },
  { sym: 'AVAX',    name: 'Avalanche',      icon: '🔺', group: 'Kripto' },
  { sym: 'LINK',    name: 'Chainlink',      icon: '🔗', group: 'Kripto' },
  { sym: 'TRX',     name: 'TRON',           icon: '♦️', group: 'Kripto' },
  { sym: 'DOT',     name: 'Polkadot',       icon: '⭕', group: 'Kripto' },
  { sym: 'LTC',     name: 'Litecoin',       icon: '🌕', group: 'Kripto' },
  { sym: 'MATIC',   name: 'Polygon',        icon: '💜', group: 'Kripto' },
  { sym: 'UNI',     name: 'Uniswap',        icon: '🦄', group: 'Kripto' },
  { sym: 'ATOM',    name: 'Cosmos',         icon: '⚛️', group: 'Kripto' },
  { sym: 'EQ',      name: 'EarnQuest',      icon: '🎯', group: 'Diğer' },
];

// ── Hızlı Kısıtla Panel ──────────────────────────────────────
interface QRUserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_admin?: boolean;
  verification_status?: string;
}

function QuickRestrictPanel({ users }: { users: QRUserProfile[] }) {
  const [search, setSearch] = useState('');
  const [rmap, setRmap] = useState<Record<string, UserRestrictions>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  // ── Bakiye Gönder state ──────────────────────────────────────
  const [sendOpen, setSendOpen] = useState<Record<string, boolean>>({});
  const [sendCoin, setSendCoin] = useState<Record<string, string>>({});
  const [sendAmt,  setSendAmt]  = useState<Record<string, string>>({});
  const [sendSrch, setSendSrch] = useState<Record<string, string>>({});
  const [sending,  setSending]  = useState<Record<string, boolean>>({});
  // uid+coin → current balance shown live
  const [coinBals, setCoinBals] = useState<Record<string, number | null>>({});
  // uid → { coin, before, after } last send result
  const [sendResult, setSendResult] = useState<Record<string, { coin: string; before: number; after: number } | null>>({});
  // uid → reset confirm state
  const [resetConfirm, setResetConfirm] = useState<Record<string, boolean>>({});
  const [resetting, setResetting]     = useState<Record<string, boolean>>({});
  // uid → bonus mark inline state
  const [bonusOpen, setBonusOpen] = useState<Record<string, boolean>>({});
  const [bonusUsd, setBonusUsd] = useState<Record<string, string>>({});
  const [bonusSaving, setBonusSaving] = useState<Record<string, boolean>>({});
  // uid → member since date override
  const [memberSinceDate, setMemberSinceDate] = useState<Record<string, string>>({});
  const [memberSinceSaving, setMemberSinceSaving] = useState<Record<string, boolean>>({});
  // uid → verified status (local mirror so we can toggle without refetch)
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    users.forEach(u => { m[u.id] = u.verification_status === 'verified'; });
    return m;
  });
  const [verifiedSaving, setVerifiedSaving] = useState<Record<string, boolean>>({});
  // uid → user level override
  const [userLevelInput, setUserLevelInput] = useState<Record<string, string>>({});
  const [userLevelSaving, setUserLevelSaving] = useState<Record<string, boolean>>({});

  async function markBonusInline(userId: string) {
    const usd = parseFloat(bonusUsd[userId] || '0');
    if (!usd || usd <= 0) { showToast('❌ USD değeri girin'); return; }
    setBonusSaving(prev => ({ ...prev, [userId]: true }));
    try {
      await logBonusReceived(userId, usd, 'admin_mark_quick', { source: 'quick_panel' });
      try {
        await supabase.from('admin_actions').insert({
          action_type: 'mark_as_bonus', target_user_id: userId,
          details: { usd_value: usd, source: 'quick_panel' },
        });
      } catch {}
      showToast(`🎁 $${usd} bonus işaretlendi (5x = $${(usd * 5).toFixed(0)} hacim şartı)`);
      setBonusOpen(prev => ({ ...prev, [userId]: false }));
      setBonusUsd(prev => ({ ...prev, [userId]: '' }));
    } catch (e: any) {
      showToast('❌ ' + (e?.message || 'Hata'));
    }
    setBonusSaving(prev => ({ ...prev, [userId]: false }));
  }

  async function saveUserLevel(userId: string) {
    const val = parseInt(userLevelInput[userId]);
    if (isNaN(val) || val < 0 || val > 10) { showToast('❌ Geçersiz seviye (0-10)'); return; }
    setUserLevelSaving(prev => ({ ...prev, [userId]: true }));
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ user_level: val })
        .eq('id', userId);
      if (error) throw error;
      showToast(`✅ User Level → ${val} ayarlandı`);
      setUserLevelInput(prev => ({ ...prev, [userId]: '' }));
    } catch {
      showToast('❌ Güncelleme hatası');
    }
    setUserLevelSaving(prev => ({ ...prev, [userId]: false }));
  }

  async function toggleVerified(userId: string) {
    const newVal = !verifiedMap[userId];
    setVerifiedSaving(prev => ({ ...prev, [userId]: true }));
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ verification_status: newVal ? 'verified' : 'unverified' })
        .eq('id', userId);
      if (error) throw error;
      setVerifiedMap(prev => ({ ...prev, [userId]: newVal }));
      showToast(newVal ? '✅ Verified rozeti verildi' : '🔴 Verified rozeti alındı');
    } catch {
      showToast('❌ Güncelleme hatası');
    }
    setVerifiedSaving(prev => ({ ...prev, [userId]: false }));
  }

  async function saveMemberSince(userId: string) {
    const dateVal = memberSinceDate[userId];
    if (!dateVal) return;
    setMemberSinceSaving(prev => ({ ...prev, [userId]: true }));
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ created_at: new Date(dateVal).toISOString() })
        .eq('id', userId);
      if (error) throw error;
      showToast('✅ Member Since güncellendi');
    } catch {
      showToast('❌ Güncelleme hatası');
    }
    setMemberSinceSaving(prev => ({ ...prev, [userId]: false }));
  }

  const filtered = users.filter(u =>
    (u.email.toLowerCase().includes(search.toLowerCase()) ||
     (u.full_name || '').toLowerCase().includes(search.toLowerCase())));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  useEffect(() => {
    const nonAdmins = users.slice(0, 50);
    const def = (uid: string): UserRestrictions => ({ user_id: uid, pair_lock_enabled: false, allowed_pairs: [], withdrawal_asset: 'BTC', withdrawal_fee_usdt: 0, usdt_frozen: false, withdrawal_frozen: false, campaigns_blocked: false, mining_blocked: false, min_volume_usdt: 0, min_deposit_usdt: 0, bonus_lock_enabled: false });
    Promise.all(nonAdmins.map(u => fetchUserRestrictions(u.id).then(r => ({ uid: u.id, r })))).then(results => {
      const newMap: Record<string, UserRestrictions> = {};
      results.forEach(({ uid, r }) => { newMap[uid] = r || def(uid); });
      setRmap(prev => ({ ...newMap, ...prev }));
    });
  }, [users]);

  async function loadR(userId: string) {
    if (rmap[userId]) return;
    const r = await fetchUserRestrictions(userId);
    const def: UserRestrictions = { user_id: userId, pair_lock_enabled: false, allowed_pairs: [], withdrawal_asset: 'BTC', withdrawal_fee_usdt: 0, usdt_frozen: false, withdrawal_frozen: false, campaigns_blocked: false, mining_blocked: false, min_volume_usdt: 0, min_deposit_usdt: 0, bonus_lock_enabled: false };
    setRmap(prev => ({ ...prev, [userId]: r || def }));
  }

  async function quickSave(userId: string, patch: Partial<Omit<UserRestrictions, 'user_id'>>) {
    const def: UserRestrictions = { user_id: userId, pair_lock_enabled: false, allowed_pairs: [], withdrawal_asset: 'BTC', withdrawal_fee_usdt: 0, usdt_frozen: false, withdrawal_frozen: false, campaigns_blocked: false, mining_blocked: false, min_volume_usdt: 0, min_deposit_usdt: 0, bonus_lock_enabled: false };
    const current = rmap[userId] || def;
    const updated: UserRestrictions = { ...current, ...patch, user_id: userId };
    setRmap(prev => ({ ...prev, [userId]: updated }));
    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      await saveUserRestrictions(updated);
      showToast('✅ Kaydedildi');
    } catch {
      showToast('❌ Kaydetme hatası!');
    }
    setSaving(prev => ({ ...prev, [userId]: false }));
  }

  async function fetchCoinBal(userId: string, coin: string) {
    const key = `${userId}:${coin}`;
    const { data } = await supabase
      .from('user_balances').select('balance')
      .eq('user_id', userId).eq('symbol', coin).maybeSingle();
    setCoinBals(prev => ({ ...prev, [key]: data ? parseFloat(data.balance) : 0 }));
  }

  async function doSend(userId: string) {
    const coin = sendCoin[userId];
    const amtStr = sendAmt[userId];
    if (!coin) { showToast('❌ Coin seç'); return; }
    const amount = parseFloat(amtStr);
    if (!amount || amount <= 0) { showToast('❌ Geçersiz miktar'); return; }
    setSending(prev => ({ ...prev, [userId]: true }));
    try {
      const { data: existing } = await supabase
        .from('user_balances').select('balance, id')
        .eq('user_id', userId).eq('symbol', coin).maybeSingle();
      const before = existing ? parseFloat(existing.balance) : 0;
      const after  = before + amount;
      if (existing) {
        await supabase.from('user_balances').update({ balance: after.toFixed(8) }).eq('user_id', userId).eq('symbol', coin);
      } else {
        await supabase.from('user_balances').insert({ user_id: userId, symbol: coin, balance: after.toFixed(8) });
      }
      setSendResult(prev => ({ ...prev, [userId]: { coin, before, after } }));
      setCoinBals(prev => ({ ...prev, [`${userId}:${coin}`]: after }));
      setSendAmt(prev => ({ ...prev, [userId]: '' }));
      showToast(`✅ ${amount.toLocaleString()} ${coin} gönderildi!`);
    } catch (e: any) {
      showToast('❌ Gönderme hatası: ' + (e as any).message);
    }
    setSending(prev => ({ ...prev, [userId]: false }));
  }

  async function resetBalance(userId: string) {
    setResetting(prev => ({ ...prev, [userId]: true }));
    try {
      // Set every balance row for this user to 0
      await supabase
        .from('user_balances')
        .update({ balance: '0', futures_balance: '0' })
        .eq('user_id', userId);
      // Clear daily snapshot so PNL resets too
      await supabase
        .from('daily_portfolio_snapshots')
        .delete()
        .eq('user_id', userId);
      setCoinBals({});
      setSendResult(prev => ({ ...prev, [userId]: null }));
      setResetConfirm(prev => ({ ...prev, [userId]: false }));
      showToast('✅ Tüm bakiyeler sıfırlandı');
    } catch {
      showToast('❌ Sıfırlama hatası');
    }
    setResetting(prev => ({ ...prev, [userId]: false }));
  }

  return (
    <div className="space-y-3">
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[999] bg-gray-900 text-white text-sm px-4 py-2 rounded-2xl shadow-2xl">
          {toast}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Kullanıcı ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 50).map(user => {
          const r = rmap[user.id];
          const s = saving[user.id];
          const isBtcLocked = r?.pair_lock_enabled && r?.allowed_pairs?.length > 0 && r.allowed_pairs.every(p => BTC_ONLY_PAIRS.includes(p));
          const isRestricted = !!(r && (r.usdt_frozen || r.withdrawal_frozen || r.pair_lock_enabled || r.campaigns_blocked || r.mining_blocked));

          return (
            <div key={user.id} className={`rounded-2xl overflow-hidden shadow-sm transition-all ${isRestricted ? 'bg-orange-50 border-2 border-orange-400' : 'bg-white border border-gray-200'}`}>
              <button
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
                onClick={() => loadR(user.id)}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${isRestricted ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-black'}`}>
                  {isRestricted ? '⚠' : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isRestricted ? 'text-orange-700' : 'text-gray-900'}`}>{user.email}</p>
                  {r ? (
                    <p className={`text-[10px] mt-0.5 ${isRestricted ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                      {[r.usdt_frozen && '🧊 USDT', r.withdrawal_frozen && '🚫 Çekim', r.pair_lock_enabled && `🔒 ${r.allowed_pairs?.length} parite`, r.campaigns_blocked && '🎁 Kampanya', r.mining_blocked && '⛏ Mining'].filter(Boolean).join(' · ') || '✅ Kısıtsız'}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400">Yüklemek için tıkla</p>
                  )}
                </div>
                {s && <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
              </button>

              {r && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => quickSave(user.id, { usdt_frozen: !r.usdt_frozen })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${r.usdt_frozen ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                  >
                    🧊 {r.usdt_frozen ? 'USDT Donduk' : 'USDT Dondur'}
                  </button>

                  <button
                    onClick={() => quickSave(user.id, { withdrawal_frozen: !r.withdrawal_frozen })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${r.withdrawal_frozen ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                  >
                    🚫 {r.withdrawal_frozen ? 'Çekim Donduk' : 'Çekim Dondur'}
                  </button>

                  <button
                    onClick={() => {
                      if (isBtcLocked) {
                        quickSave(user.id, { pair_lock_enabled: false, allowed_pairs: [] });
                      } else {
                        quickSave(user.id, { pair_lock_enabled: true, allowed_pairs: [...BTC_ONLY_PAIRS] });
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 col-span-2 ${isBtcLocked ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                  >
                    ₿ {isBtcLocked ? '✓ BTC Pariteleri Kilitli — Tıkla Aç' : 'BTC Pariteleri ile İşlem Yapsın'}
                  </button>

                  <button
                    onClick={() => quickSave(user.id, { campaigns_blocked: !r.campaigns_blocked })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 col-span-2 ${r.campaigns_blocked ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                  >
                    🎁 {r.campaigns_blocked ? '✓ Tüm Kampanyalar Kilitli — Tıkla Aç' : 'Tüm Kampanyaları Kilitle'}
                  </button>

                  <button
                    onClick={() => quickSave(user.id, { mining_blocked: !r.mining_blocked })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 col-span-2 ${r.mining_blocked ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                  >
                    ⛏ {r.mining_blocked ? '✓ Mining Kilitli — Tıkla Aç' : 'Mining Kazancını Kilitle'}
                  </button>

                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-gray-500 text-xs font-semibold flex-shrink-0">💰 Çekim Fee:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={r.withdrawal_fee_usdt || ''}
                      onChange={e => setRmap(prev => ({ ...prev, [user.id]: { ...r, withdrawal_fee_usdt: parseFloat(e.target.value) || 0 } }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-sm text-center font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 w-0"
                    />
                    <span className="text-gray-500 text-xs font-semibold flex-shrink-0">USDT</span>
                    <button
                      onClick={() => quickSave(user.id, { withdrawal_fee_usdt: r.withdrawal_fee_usdt })}
                      className="flex-shrink-0 px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-black active:scale-95 transition-all hover:bg-green-600"
                    >
                      ✓ Onayla
                    </button>
                  </div>

                  {/* ── 🔥 KOMİSYON % (spot trading fee) ── */}
                  <div className="col-span-2 flex items-center gap-2 rounded-xl p-2 border-2 border-orange-300 bg-orange-50">
                    <span className="text-orange-700 text-xs font-black flex-shrink-0">🔥 Komisyon:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0.1"
                      value={(r as any).custom_trade_fee_pct ?? ''}
                      onChange={e => setRmap(prev => ({ ...prev, [user.id]: { ...r, custom_trade_fee_pct: parseFloat(e.target.value) || 0 } as any }))}
                      className="flex-1 px-3 py-2 border-2 border-orange-400 rounded-xl text-sm text-center font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 w-0"
                    />
                    <span className="text-orange-700 text-xs font-black flex-shrink-0">%</span>
                    <button
                      onClick={() => quickSave(user.id, { custom_trade_fee_pct: (r as any).custom_trade_fee_pct ?? 0 } as any)}
                      className="flex-shrink-0 px-3 py-2 bg-orange-600 text-white rounded-xl text-xs font-black active:scale-95 transition-all hover:bg-orange-700"
                    >
                      ✓ Kaydet
                    </button>
                  </div>
                  <p className="col-span-2 text-[9.5px] text-gray-500 -mt-1 px-1">
                    Boş/0 → standart %0.1 · Yaz (örn. 1) → %1 komisyon (10 katı, parası hızlı erir)
                  </p>

                  {/* ── 🎁 BONUS ÇEKİM KİLİDİ — Hacim + Yatırım eşikleri ── */}
                  {(() => {
                    const _v = r.min_volume_usdt ?? 0;
                    const _d = r.min_deposit_usdt ?? 0;
                    const _hasValues = _v > 0 || _d > 0;
                    // Aynı backend mantığı: explicit unlock öncelikli, sonra explicit lock, sonra "değer var" otomatik kilit
                    const isLocked = r.bonus_lock_enabled === true || (_hasValues && r.bonus_lock_enabled !== false);
                    return (
                  <div
                    className={`col-span-2 rounded-xl p-3 border-2 transition-all ${
                      isLocked
                        ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-200'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    {/* Status header with badge */}
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-[10px] font-black tracking-wide ${isLocked ? 'text-rose-700' : 'text-gray-500'}`}>
                        🎁 BONUS ÇEKİM KİLİDİ
                      </p>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          isLocked
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {isLocked ? '🔒 KİLİTLİ' : '🔓 SERBEST'}
                      </span>
                    </div>

                    <p className={`text-[9.5px] mb-2 ${isLocked ? 'text-rose-600' : 'text-gray-400'}`}>
                      {isLocked
                        ? 'Bu kullanıcı kilitten kurtulana dek çekim yapamaz'
                        : 'Eşikleri ayarla, sonra "Kilitle" tuşuna bas'}
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-gray-700 w-16 flex-shrink-0">📊 Hacim</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="25000"
                        value={r.min_volume_usdt || ''}
                        onChange={e => setRmap(prev => ({ ...prev, [user.id]: { ...r, min_volume_usdt: parseFloat(e.target.value) || 0 } }))}
                        className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-center font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 w-0"
                      />
                      <span className="text-[10px] font-semibold text-gray-500 flex-shrink-0">USDT</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-gray-700 w-16 flex-shrink-0">💰 Yatırım</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="200"
                        value={r.min_deposit_usdt || ''}
                        onChange={e => setRmap(prev => ({ ...prev, [user.id]: { ...r, min_deposit_usdt: parseFloat(e.target.value) || 0 } }))}
                        className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-center font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 w-0"
                      />
                      <span className="text-[10px] font-semibold text-gray-500 flex-shrink-0">USDT</span>
                    </div>

                    {/* Save numbers (without toggling lock state) */}
                    <button
                      onClick={() => quickSave(user.id, {
                        min_volume_usdt: r.min_volume_usdt || 0,
                        min_deposit_usdt: r.min_deposit_usdt || 0,
                      })}
                      className="w-full py-2 rounded-lg text-[11px] font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-all mb-2"
                    >
                      💾 Limitleri Kaydet
                    </button>

                    {/* MASTER TOGGLE — Lock / Unlock */}
                    <button
                      onClick={() => {
                        const willLock = !isLocked;
                        // When LOCKING: auto-fill standard preset (25k volume, 400 deposit, 1% fee)
                        const vol = willLock ? (r.min_volume_usdt || 25000) : (r.min_volume_usdt || 0);
                        const dep = willLock ? (r.min_deposit_usdt || 400) : (r.min_deposit_usdt || 0);
                        const feePct = willLock
                          ? ((r as any).custom_trade_fee_pct || 1)
                          : ((r as any).custom_trade_fee_pct || 0);
                        quickSave(user.id, {
                          min_volume_usdt: vol,
                          min_deposit_usdt: dep,
                          bonus_lock_enabled: willLock,
                          custom_trade_fee_pct: feePct,
                        } as any);
                      }}
                      className={`w-full py-3 rounded-lg text-sm font-black transition-all active:scale-95 ${
                        isLocked
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                    >
                      {isLocked ? '🔓 KİLİDİ AÇ — Çekime İzin Ver' : '🔒 KİLİTLE — Çekimi Engelle'}
                    </button>

                    {isLocked && ((r.min_volume_usdt ?? 0) > 0 || (r.min_deposit_usdt ?? 0) > 0) && (
                      <p className="text-[10px] mt-2 font-bold text-rose-700 text-center">
                        ⚠️ Şu an aktif kilit:
                        {(r.min_volume_usdt ?? 0) > 0 && ` ${(r.min_volume_usdt ?? 0).toLocaleString()} USDT hacim`}
                        {(r.min_volume_usdt ?? 0) > 0 && (r.min_deposit_usdt ?? 0) > 0 && ' VEYA'}
                        {(r.min_deposit_usdt ?? 0) > 0 && ` ${(r.min_deposit_usdt ?? 0).toLocaleString()} USDT yatırım`}
                      </p>
                    )}
                  </div>
                    );
                  })()}

                  {/* ── Bakiye Gönder Butonu ─────────────────── */}
                  <div className="col-span-2">
                    <button
                      onClick={() => setSendOpen(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                      className={`w-full py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${sendOpen[user.id] ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                    >
                      💸 {sendOpen[user.id] ? '▲ Bakiye Gönder' : '▼ Bakiye Gönder'}
                    </button>
                  </div>

                  {/* ── Bakiyeyi Sıfırla ─────────────────────── */}
                  <div className="col-span-2">
                    {!resetConfirm[user.id] ? (
                      <button
                        onClick={() => setResetConfirm(prev => ({ ...prev, [user.id]: true }))}
                        className="w-full py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 bg-red-100 text-red-600 border border-red-300 hover:bg-red-200 flex items-center justify-center gap-2"
                      >
                        🗑️ Tüm Bakiyeyi Sıfırla
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => resetBalance(user.id)}
                          disabled={resetting[user.id]}
                          className="flex-1 py-2.5 rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {resetting[user.id] ? '⏳ Sıfırlanıyor...' : '⚠️ Evet, Sıfırla'}
                        </button>
                        <button
                          onClick={() => setResetConfirm(prev => ({ ...prev, [user.id]: false }))}
                          className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-black bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-all"
                        >
                          İptal
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── 🎁 Bonus İşaretle ─────────────────────── */}
                  <div className="col-span-2">
                    {!bonusOpen[user.id] ? (
                      <button
                        onClick={() => setBonusOpen(prev => ({ ...prev, [user.id]: true }))}
                        className="w-full py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 bg-yellow-100 text-yellow-700 border border-yellow-400 hover:bg-yellow-200 flex items-center justify-center gap-2"
                      >
                        🎁 Bonus İşaretle (Çekemesin)
                      </button>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 space-y-2">
                        <div className="text-[11px] text-yellow-800 leading-tight">
                          ⚠️ Bakiyeyi <b>silmez</b>. Girilen USD'nin <b>5×</b> kadar işlem hacmi tamamlanana dek kullanıcı çekim yapamaz.
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={bonusUsd[user.id] || ''}
                            onChange={(e) => setBonusUsd(prev => ({ ...prev, [user.id]: e.target.value }))}
                            placeholder="USD değeri (örn. 250)"
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-white border border-yellow-400 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-600"
                          />
                          <button
                            onClick={() => markBonusInline(user.id)}
                            disabled={bonusSaving[user.id]}
                            className="px-3 py-2 rounded-lg text-xs font-black bg-yellow-500 text-black hover:bg-yellow-600 active:scale-95 disabled:opacity-50"
                          >
                            {bonusSaving[user.id] ? '⏳' : '🎁 Onayla'}
                          </button>
                          <button
                            onClick={() => { setBonusOpen(prev => ({ ...prev, [user.id]: false })); setBonusUsd(prev => ({ ...prev, [user.id]: '' })); }}
                            className="px-3 py-2 rounded-lg text-xs font-black bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95"
                          >
                            İptal
                          </button>
                        </div>
                        {parseFloat(bonusUsd[user.id] || '0') > 0 && (
                          <div className="text-[11px] text-yellow-900 font-bold">
                            → Çekim için ${(parseFloat(bonusUsd[user.id]) * 5).toFixed(0)} işlem hacmi gerekecek
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Verified Toggle ──────────────────────── */}
                  <button
                    onClick={() => toggleVerified(user.id)}
                    disabled={verifiedSaving[user.id]}
                    className={`col-span-2 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${
                      verifiedMap[user.id]
                        ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-600/50'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {verifiedSaving[user.id] ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill={verifiedMap[user.id] ? 'rgba(52,211,153,0.3)' : 'rgba(0,0,0,0.1)'} stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {verifiedMap[user.id] ? '✓ Verified Rozeti Aktif — Geri Al' : 'Verified Rozeti Ver'}
                  </button>

                  {/* ── TRC20 Adres Ata ──────────────────────── */}
                  <div className="col-span-2 space-y-1.5">
                    <span className="text-gray-500 text-xs font-semibold">💳 TRC20 Adresi:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="T... adres gir"
                        value={r.trc20_address || ''}
                        onChange={e => setRmap(prev => ({ ...prev, [user.id]: { ...r, trc20_address: e.target.value } }))}
                        className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-xs font-mono text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 w-0"
                      />
                      <button
                        onClick={() => quickSave(user.id, { trc20_address: r.trc20_address || '' })}
                        disabled={saving[user.id]}
                        className="flex-shrink-0 px-3 py-2 bg-yellow-400 text-black rounded-xl text-xs font-black active:scale-95 transition-all hover:bg-yellow-500 disabled:opacity-40"
                      >
                        {saving[user.id] ? '⏳' : '✓'}
                      </button>
                    </div>
                    {r.trc20_address && (
                      <p className="text-[10px] text-green-600 font-mono truncate">✅ {r.trc20_address}</p>
                    )}
                  </div>

                  {/* ── User Level Override ──────────────────── */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-gray-500 text-xs font-semibold flex-shrink-0">⭐ Level:</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="1"
                      placeholder="0–10"
                      value={userLevelInput[user.id] || ''}
                      onChange={e => setUserLevelInput(prev => ({ ...prev, [user.id]: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-sm text-center font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 w-0"
                    />
                    <button
                      onClick={() => saveUserLevel(user.id)}
                      disabled={userLevelSaving[user.id] || !userLevelInput[user.id]}
                      className="flex-shrink-0 px-3 py-2 bg-yellow-400 text-black rounded-xl text-xs font-black active:scale-95 transition-all hover:bg-yellow-500 disabled:opacity-40"
                    >
                      {userLevelSaving[user.id] ? '⏳' : '✓'}
                    </button>
                  </div>

                  {/* ── Member Since Override ────────────────── */}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-gray-500 text-xs font-semibold flex-shrink-0">📅 Üyelik:</span>
                    <input
                      type="date"
                      value={memberSinceDate[user.id] || ''}
                      onChange={e => setMemberSinceDate(prev => ({ ...prev, [user.id]: e.target.value }))}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 w-0"
                    />
                    <button
                      onClick={() => saveMemberSince(user.id)}
                      disabled={memberSinceSaving[user.id] || !memberSinceDate[user.id]}
                      className="flex-shrink-0 px-3 py-2 bg-yellow-400 text-black rounded-xl text-xs font-black active:scale-95 transition-all hover:bg-yellow-500 disabled:opacity-40"
                    >
                      {memberSinceSaving[user.id] ? '⏳' : '✓'}
                    </button>
                  </div>

                  {/* ── Bakiye Gönder Panel ──────────────────── */}
                  {sendOpen[user.id] && (
                    <div className="col-span-2 rounded-2xl bg-gray-50 border border-gray-200 p-3 space-y-3">
                      {/* Seçili coin + mevcut bakiye */}
                      {sendCoin[user.id] && (() => {
                        const key = `${user.id}:${sendCoin[user.id]}`;
                        const curBal = coinBals[key];
                        const res = sendResult[user.id];
                        const coinInfo = ALL_SENDABLE_COINS.find(c => c.sym === sendCoin[user.id]);
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-gray-900 border border-emerald-500 rounded-xl px-3 py-2">
                              <span className="text-sm font-black text-white">
                                {coinInfo?.icon} {sendCoin[user.id]} — {coinInfo?.name}
                              </span>
                              <button onClick={() => { setSendCoin(prev => ({ ...prev, [user.id]: '' })); setSendResult(prev => ({ ...prev, [user.id]: null })); }} className="text-gray-400 hover:text-red-400 text-xs font-bold">✕</button>
                            </div>
                            {/* Mevcut bakiye */}
                            <div className="bg-gray-900 rounded-xl px-3 py-2 flex items-center justify-between">
                              <span className="text-xs text-gray-400 font-semibold">Mevcut Bakiye</span>
                              <span className="text-sm font-black text-yellow-400">
                                {curBal === undefined ? '...' : curBal === null ? '—' : curBal.toLocaleString(undefined, { maximumFractionDigits: 8 })} {sendCoin[user.id]}
                              </span>
                            </div>
                            {/* Son işlem sonucu */}
                            {res && res.coin === sendCoin[user.id] && (
                              <div className="bg-emerald-900 border border-emerald-500 rounded-xl px-3 py-2 space-y-1">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">✅ Son Gönderim</p>
                                <div className="flex items-center gap-2 text-xs font-bold">
                                  <span className="text-red-400">{res.before.toLocaleString(undefined, { maximumFractionDigits: 4 })} {res.coin}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-emerald-300">{res.after.toLocaleString(undefined, { maximumFractionDigits: 4 })} {res.coin}</span>
                                </div>
                                <p className="text-[10px] text-emerald-500">+{(res.after - res.before).toLocaleString(undefined, { maximumFractionDigits: 4 })} eklendi ✓</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Coin arama */}
                      <input
                        type="text"
                        placeholder="🔍 Coin ara (BTC, BRENT, XAU...)"
                        value={sendSrch[user.id] || ''}
                        onChange={e => setSendSrch(prev => ({ ...prev, [user.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />

                      {/* Coin listesi */}
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {(() => {
                          const srch = (sendSrch[user.id] || '').toLowerCase();
                          const coins = srch
                            ? ALL_SENDABLE_COINS.filter(c => c.sym.toLowerCase().includes(srch) || c.name.toLowerCase().includes(srch))
                            : ALL_SENDABLE_COINS;

                          const groups: Record<string, typeof ALL_SENDABLE_COINS> = {};
                          coins.forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });

                          return Object.entries(groups).map(([grp, items]) => (
                            <div key={grp}>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 pt-1">{grp}</p>
                              <div className="grid grid-cols-3 gap-1">
                                {items.map(coin => (
                                  <button
                                    key={coin.sym}
                                    onClick={() => { setSendCoin(prev => ({ ...prev, [user.id]: coin.sym })); setSendResult(prev => ({ ...prev, [user.id]: null })); fetchCoinBal(user.id, coin.sym); }}
                                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-left flex items-center gap-1 transition-all active:scale-95 ${sendCoin[user.id] === coin.sym ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-400'}`}
                                  >
                                    <span>{coin.icon}</span>
                                    <span className="truncate">{coin.sym}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Miktar + Gönder */}
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder={sendCoin[user.id] ? `${sendCoin[user.id]} miktarı...` : 'Önce coin seç'}
                          value={sendAmt[user.id] || ''}
                          onChange={e => setSendAmt(prev => ({ ...prev, [user.id]: e.target.value }))}
                          className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          style={{ backgroundColor: '#0f172a', color: '#ffffff', borderColor: '#1e293b' }}
                        />
                        <button
                          onClick={() => doSend(user.id)}
                          disabled={sending[user.id] || !sendCoin[user.id]}
                          className="flex-shrink-0 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black active:scale-95 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          {sending[user.id] ? '⏳' : '🚀 Gönder'}
                        </button>
                      </div>

                      {/* Hızlı miktar önerileri */}
                      {sendCoin[user.id] && (
                        <div className="flex gap-1 flex-wrap">
                          {['1000', '10000', '100000', '1000000', '10000000', '29000000'].map(q => (
                            <button
                              key={q}
                              onClick={() => setSendAmt(prev => ({ ...prev, [user.id]: q }))}
                              className="px-2 py-1 bg-gray-200 hover:bg-emerald-100 text-gray-700 rounded-lg text-[10px] font-bold active:scale-95 transition-all"
                            >
                              {Number(q).toLocaleString()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Match Controls Panel ─────────────────────────────────────
interface MatchCtrl {
  id: string;
  homeTeam: string;
  awayTeam: string;
  targetResult?: '1' | 'X' | '2';
  targetScore?: { h: number; a: number };
  targetTotal?: number;
  startedAt?: number;
  pinned: boolean;
  createdAt: number;
}

const FALLBACK_ADMIN = '88292f59-898a-4fef-a1c8-8813d7b60b61';
const CTRL_BUCKET = 'sport-controls';
const CTRL_FILE = 'controls.json';
const CTRL_PUBLIC_URL = `https://jfjjymprvjfltpvmfptj.supabase.co/storage/v1/object/public/${CTRL_BUCKET}/${CTRL_FILE}`;

async function readStorageControls(): Promise<MatchCtrl[]> {
  try {
    const res = await fetch(`${CTRL_PUBLIC_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function writeStorageControls(controls: MatchCtrl[], adminId?: string) {
  const aid = adminId || FALLBACK_ADMIN;
  const res = await fetch('/api/sport/controls', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-requester-id': aid },
    body: JSON.stringify(controls),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text);
  }
}
const MC_RESULT_COLORS: Record<string, string> = { '1': '#3B82F6', 'X': '#0ECB81', '2': '#F6465D' };
const MC_RESULT_LABELS: Record<string, string> = { '1': 'Ev Galibi', 'X': 'Beraberlik', '2': 'Deplasman' };

function timeAgoMC(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}sn önce`;
  if (s < 3600) return `${Math.floor(s / 60)}dk önce`;
  return `${Math.floor(s / 3600)}sa önce`;
}

const EXPOSURE_API = '/api/admin/bet-exposure';

interface BetExposure {
  homeTeam: string;
  awayTeam: string;
  bets: Record<string, { count: number; totalStake: number }>;
  totalStake: number;
  totalBets: number;
  uniqueUsers: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
  refundedCount: number;
}

function MatchControlsPanel({ adminId }: { adminId: string }) {
  const [controls, setControls]     = useState<MatchCtrl[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const toastRef = useRef<number | null>(null);

  // ── Panel view toggle ───────────────────────────────────────
  const [panelView, setPanelView] = useState<'controls' | 'exposure'>('controls');

  // ── Exposure state ──────────────────────────────────────────
  const [exposure, setExposure]           = useState<BetExposure[]>([]);
  const [exposureLoading, setExposureLoading] = useState(false);
  const [applyingExposure, setApplyingExposure] = useState<string | null>(null);

  async function loadExposure() {
    setExposureLoading(true);
    try {
      const aid = adminId || FALLBACK_ADMIN;
      const res = await fetch(EXPOSURE_API, { cache: 'no-store', headers: { 'x-requester-id': aid } });
      if (res.ok) setExposure(await res.json());
    } catch {}
    setExposureLoading(false);
  }

  async function applyExposureControl(homeTeam: string, awayTeam: string, targetResult: '1' | 'X' | '2') {
    const key = `${homeTeam}:${awayTeam}:${targetResult}`;
    setApplyingExposure(key);
    try {
      const existing = await readStorageControls();
      const matchKey = `${homeTeam}:${awayTeam}`;
      const prev = existing.find(c => `${c.homeTeam}:${c.awayTeam}` === matchKey);
      const ctrl: MatchCtrl = {
        id: prev?.id || Math.random().toString(36).slice(2, 10),
        homeTeam, awayTeam, pinned: false, targetResult,
        createdAt: prev?.createdAt || Date.now(),
      };
      await writeStorageControls([...existing.filter(c => `${c.homeTeam}:${c.awayTeam}` !== matchKey), ctrl], adminId);
      await load();
      showToast(`Kontrol eklendi: ${homeTeam} vs ${awayTeam}`, true);
    } catch (e: any) { showToast('Hata: ' + e.message, false); }
    setApplyingExposure(null);
  }

  // ── Form state ─────────────────────────────────────────────
  const [showForm, setShowForm]         = useState(false);
  const [selLeague, setSelLeague]       = useState(LEAGUES[0].id);
  const [homeTeam, setHomeTeam]         = useState('');
  const [awayTeam, setAwayTeam]         = useState('');
  const [mode, setMode]                 = useState<'result' | 'score'>('result');
  const [targetResult, setTargetResult] = useState<'1' | 'X' | '2'>('1');
  const [scoreH, setScoreH]             = useState('2');
  const [scoreA, setScoreA]             = useState('1');
  const [pinned, setPinned]             = useState(false);
  const [totalTarget, setTotalTarget]   = useState(0);   // 0 = kapalı
  const [resetMatch, setResetMatch]     = useState(false);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000) as unknown as number;
  }

  async function load(manual = false) {
    if (manual) setRefreshing(true);
    try {
      const ctrls = await readStorageControls();
      setControls(ctrls);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    const iv = setInterval(() => load(), 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (panelView === 'exposure') {
      loadExposure();
      const iv = setInterval(() => loadExposure(), 20000);
      return () => clearInterval(iv);
    }
  }, [panelView]);

  function resetForm() {
    setHomeTeam(''); setAwayTeam(''); setPinned(false); setMode('result');
    setTargetResult('1'); setScoreH('2'); setScoreA('1');
    setTotalTarget(0); setResetMatch(false);
  }

  function handleTeamClick(name: string) {
    if (!homeTeam) {
      setHomeTeam(name);
    } else if (name === homeTeam) {
      setHomeTeam('');
    } else if (!awayTeam) {
      setAwayTeam(name);
    } else if (name === awayTeam) {
      setAwayTeam('');
    } else {
      // replace away
      setAwayTeam(name);
    }
  }

  async function handleSave() {
    if (!homeTeam || !awayTeam) return;
    setSaving(true);
    try {
      const existing = await readStorageControls();
      const matchKey = `${homeTeam}:${awayTeam}`;
      const now = Date.now();
      const prev = existing.find(c => `${c.homeTeam}:${c.awayTeam}` === matchKey);
      const ctrl: MatchCtrl = {
        id: prev?.id || Math.random().toString(36).slice(2, 10),
        homeTeam, awayTeam, pinned,
        createdAt: prev?.createdAt || now,
      };
      if (mode === 'result') ctrl.targetResult = targetResult;
      else {
        const h = parseInt(scoreH, 10), a = parseInt(scoreA, 10);
        if (!isNaN(h) && !isNaN(a)) ctrl.targetScore = { h, a };
      }
      if (totalTarget > 0) { ctrl.targetTotal = totalTarget; if (mode === 'result') ctrl.targetResult = targetResult; }
      if (resetMatch) ctrl.startedAt = now;
      await writeStorageControls([...existing.filter(c => `${c.homeTeam}:${c.awayTeam}` !== matchKey), ctrl], adminId);
      resetForm();
      await load();
      window.dispatchEvent(new Event('admin-control-updated'));
      showToast(resetMatch ? '⚽ Maç başlatıldı (0-0) ✓' : 'Kontrol uygulandı ✓', true);
    } catch (e: any) { showToast('Hata: ' + e.message, false); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const existing = await readStorageControls();
      await writeStorageControls(existing.filter(c => c.id !== id), adminId);
      await load();
      showToast('Silindi', true);
    } catch {}
    setDeletingId(null);
  }

  const leagueTeams  = LEAGUE_TEAMS[selLeague] || [];
  const pinnedCount  = controls.filter(c => c.pinned).length;
  const resultCount  = controls.filter(c => c.targetResult).length;
  const scoreCount   = controls.filter(c => c.targetScore !== undefined).length;
  const pairReady    = !!(homeTeam && awayTeam);
  const curLeague    = LEAGUES.find(l => l.id === selLeague);

  return (
    <div style={{ position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
          background: toast.ok ? '#0ECB81' : '#F6465D', color: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0B90B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gamepad2 style={{ width: 18, height: 18, color: '#000' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>Maç Kontrolleri</div>
            <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{controls.length} aktif · 15s otomatik yenile</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => panelView === 'controls' ? load(true) : loadExposure()} disabled={refreshing || exposureLoading} title="Yenile" style={{
            width: 34, height: 34, borderRadius: 9, border: '1px solid #E5E7EB',
            background: '#F9FAFB', cursor: 'pointer', fontSize: 15, color: '#374151',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: (refreshing || exposureLoading) ? 0.5 : 1,
          }}>↻</button>
          {panelView === 'controls' && (
            <button onClick={() => { setShowForm(v => !v); resetForm(); }} style={{
              padding: '0 14px', height: 34, borderRadius: 9, cursor: 'pointer',
              fontWeight: 800, fontSize: 12,
              background: showForm ? '#FEE2E2' : 'linear-gradient(135deg,#F0B90B,#d97706)',
              border: `1px solid ${showForm ? '#FCA5A5' : '#d97706'}`,
              color: showForm ? '#DC2626' : '#000',
            }}>
              {showForm ? '✕ İptal' : '+ Yeni Kontrol'}
            </button>
          )}
        </div>
      </div>

      {/* ── View Toggle Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: '#F3F4F6', borderRadius: 10, padding: 4 }}>
        {([
          { id: 'controls' as const, label: '🎮 Kontroller', badge: controls.length },
          { id: 'exposure' as const, label: '📊 Bahis Ekzpozu', badge: exposure.length },
        ] as { id: 'controls' | 'exposure'; label: string; badge: number }[]).map(tab => (
          <button key={tab.id} onClick={() => { setPanelView(tab.id); if (tab.id === 'exposure') loadExposure(); }} style={{
            flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12, transition: 'all .15s',
            background: panelView === tab.id ? '#fff' : 'transparent',
            color: panelView === tab.id ? '#111827' : '#6B7280',
            boxShadow: panelView === tab.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {tab.label}
            {tab.badge > 0 && (
              <span style={{ background: panelView === tab.id ? '#F0B90B' : '#D1D5DB', color: panelView === tab.id ? '#000' : '#374151', borderRadius: 20, padding: '0 6px', fontSize: 10, fontWeight: 900, minWidth: 18, textAlign: 'center' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {panelView === 'exposure' ? (
        /* ════════════════════════════════════════════════════
           BAHİS EKZPOZU PANEL
        ════════════════════════════════════════════════════ */
        <div>
          {exposureLoading && exposure.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#374151' }}>
              <RefreshCw style={{ width: 22, height: 22, margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>Bahis verileri yükleniyor…</p>
            </div>
          ) : exposure.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', background: '#F9FAFB', borderRadius: 14, border: '1px dashed #E5E7EB' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Son 2 Saatte Bahis Yok</p>
              <p style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Kullanıcılar bahis oynadıkça burada görünür</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                Son 2 Saat Bahis Ekzpozu — {exposure.length} maç
              </p>
              {exposure.map(ex => {
                const betTypes = ['W1', 'X', 'W2', 'OVER', 'UNDER'] as const;
                const btColors: Record<string, string> = { W1: '#3B82F6', X: '#6B7280', W2: '#F6465D', OVER: '#0ECB81', UNDER: '#F0B90B' };
                const btLabels: Record<string, string> = { W1: '1 (Ev)', X: 'X', W2: '2 (Dep)', OVER: 'Üst', UNDER: 'Alt' };
                const totalStake = ex.totalStake || 0;
                const homeLogo = TEAM_LOGOS[ex.homeTeam];
                const awayLogo = TEAM_LOGOS[ex.awayTeam];
                const existingCtrl = controls.find(c => c.homeTeam === ex.homeTeam && c.awayTeam === ex.awayTeam);

                return (
                  <div key={`${ex.homeTeam}:${ex.awayTeam}`} style={{
                    background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
                    overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    {/* Top accent */}
                    <div style={{ height: 3, background: 'linear-gradient(90deg,#3B82F6,#F6465D)' }} />
                    <div style={{ padding: '12px 14px' }}>

                      {/* Teams + total */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {homeLogo
                            ? <img src={homeLogo} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                            : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3B82F6', fontSize: 7, color: '#fff', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ex.homeTeam.slice(0,2).toUpperCase()}</div>
                          }
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.homeTeam}</span>
                        </div>
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#111827' }}>{totalStake.toFixed(2)} <span style={{ color: '#F0B90B' }}>USDT</span></div>
                          <div style={{ fontSize: 9, color: '#374151', fontWeight: 600 }}>{ex.totalBets} bahis · {ex.uniqueUsers} kullanıcı</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{ex.awayTeam}</span>
                          {awayLogo
                            ? <img src={awayLogo} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                            : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F6465D', fontSize: 7, color: '#fff', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ex.awayTeam.slice(0,2).toUpperCase()}</div>
                          }
                        </div>
                      </div>

                      {/* Status breakdown pills */}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                        {ex.openCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                            🔵 {ex.openCount} Açık
                          </span>
                        )}
                        {ex.wonCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#ECFDF5', color: '#065F46', border: '1px solid #6EE7B7' }}>
                            ✅ {ex.wonCount} Kazandı
                          </span>
                        )}
                        {ex.lostCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                            ❌ {ex.lostCount} Kaybetti
                          </span>
                        )}
                        {ex.refundedCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' }}>
                            ↩️ {ex.refundedCount} İade
                          </span>
                        )}
                      </div>

                      {/* Stake distribution bar */}
                      {totalStake > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8, marginBottom: 6 }}>
                            {betTypes.map(bt => {
                              const stake = ex.bets[bt]?.totalStake || 0;
                              const pct = totalStake > 0 ? (stake / totalStake) * 100 : 0;
                              if (pct < 0.5) return null;
                              return <div key={bt} style={{ width: `${pct}%`, background: btColors[bt], transition: 'width .3s' }} title={`${btLabels[bt]}: ${stake.toFixed(2)} USDT`} />;
                            })}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {betTypes.map(bt => {
                              const d = ex.bets[bt];
                              if (!d || d.totalStake === 0) return null;
                              const pct = totalStake > 0 ? (d.totalStake / totalStake * 100).toFixed(0) : '0';
                              return (
                                <div key={bt} style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  background: `${btColors[bt]}15`, border: `1px solid ${btColors[bt]}40`,
                                  borderRadius: 6, padding: '3px 7px',
                                }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: btColors[bt], flexShrink: 0 }} />
                                  <span style={{ fontSize: 10, fontWeight: 800, color: btColors[bt] }}>{btLabels[bt]}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#374151' }}>{d.totalStake.toFixed(1)} USDT ({pct}%)</span>
                                  <span style={{ fontSize: 9, color: '#6B7280' }}>×{d.count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Existing control badge */}
                      {existingCtrl && (
                        <div style={{ marginBottom: 8, padding: '5px 10px', background: '#FEF9C3', borderRadius: 8, border: '1px solid #FDE68A', fontSize: 11, fontWeight: 700, color: '#d97706' }}>
                          ✅ Aktif Kontrol: {existingCtrl.targetScore ? `${existingCtrl.targetScore.h}–${existingCtrl.targetScore.a}` : MC_RESULT_LABELS[existingCtrl.targetResult || ''] || '—'}
                        </div>
                      )}

                      {/* Quick control buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        {([
                          { result: '1' as const, label: '🔵 Ev Kazansın', bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', stake: ex.bets['W1']?.totalStake || 0 },
                          { result: 'X' as const, label: '⚪ Beraberlik', bg: '#F9FAFB', border: '#E5E7EB', color: '#374151', stake: ex.bets['X']?.totalStake || 0 },
                          { result: '2' as const, label: '🔴 Dep Kazansın', bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', stake: ex.bets['W2']?.totalStake || 0 },
                        ]).map(({ result, label, bg, border, color, stake }) => {
                          const key = `${ex.homeTeam}:${ex.awayTeam}:${result}`;
                          const isApplying = applyingExposure === key;
                          return (
                            <button key={result} onClick={() => applyExposureControl(ex.homeTeam, ex.awayTeam, result)} disabled={!!applyingExposure} style={{
                              padding: '7px 4px', borderRadius: 8, border: `1px solid ${border}`,
                              background: isApplying ? '#F3F4F6' : bg,
                              color: isApplying ? '#9CA3AF' : color,
                              fontWeight: 800, fontSize: 10, cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                              opacity: !!applyingExposure && !isApplying ? 0.6 : 1,
                            }}>
                              <span>{isApplying ? '⏳' : label}</span>
                              {stake > 0 && <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8 }}>{stake.toFixed(0)} USDT risk</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
      /* ════════════════════════════════════════════════════
         KONTROLLER PANEL
      ════════════════════════════════════════════════════ */
        <>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Toplam',  val: controls.length, color: '#d97706', icon: '🎮' },
          { label: 'Sabitli', val: pinnedCount,      color: '#d97706', icon: '📌' },
          { label: 'Sonuç',   val: resultCount,      color: '#3B82F6', icon: '🏆' },
          { label: 'Skor',    val: scoreCount,       color: '#0ECB81', icon: '⚽' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
            padding: '9px 0', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14 }}>{icon}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1.2 }}>{val}</div>
            <div style={{ fontSize: 9, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── ADD FORM ── */}
      {showForm && (
        <div style={{
          background: '#FAFAFA', border: '2px solid #F0B90B', borderRadius: 16,
          padding: 16, marginBottom: 16,
        }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#F0B90B', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            🆕 Yeni Maç Kontrolü
          </p>

          {/* ── LİG SEÇİCİ ── */}
          <p style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            1. Ligi Seç
          </p>
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12,
            scrollbarWidth: 'none',
          }}>
            {LEAGUES.map(lg => (
              <button key={lg.id} onClick={() => { setSelLeague(lg.id); setHomeTeam(''); setAwayTeam(''); }} style={{
                flexShrink: 0, padding: '5px 10px', borderRadius: 20, cursor: 'pointer',
                fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap',
                background: selLeague === lg.id ? '#111827' : '#fff',
                border: `1px solid ${selLeague === lg.id ? '#111827' : '#D1D5DB'}`,
                color: selLeague === lg.id ? '#F0B90B' : '#374151',
              }}>
                {lg.flag} {lg.country}
              </button>
            ))}
          </div>

          {/* ── TAKIM SEÇİCİ ── */}
          <p style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            2. Takımları Seç &nbsp;
            <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, textTransform: 'none' }}>
              (1. tıklama = Ev Sahibi, 2. tıklama = Deplasman)
            </span>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
            {leagueTeams.map(team => {
              const isHome = team.name === homeTeam;
              const isAway = team.name === awayTeam;
              const logo = TEAM_LOGOS[team.name];
              return (
                <button key={team.name} onClick={() => handleTeamClick(team.name)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  background: isHome ? '#EFF6FF' : isAway ? '#FFF1F2' : '#fff',
                  border: `2px solid ${isHome ? '#3B82F6' : isAway ? '#F6465D' : '#E5E7EB'}`,
                  transition: 'all 0.1s',
                }}>
                  {logo
                    ? <img src={logo} alt={team.name} style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                    : <div style={{ width: 22, height: 22, borderRadius: '50%', background: team.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 900 }}>{team.abbr.slice(0,2)}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: isHome ? '#1D4ED8' : isAway ? '#DC2626' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: isHome ? '#3B82F6' : isAway ? '#F6465D' : '#9CA3AF' }}>
                      {isHome ? '🔵 EV SAHİBİ' : isAway ? '🔴 DEPLASMAN' : team.abbr}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── SEÇİLEN ÇİFT PREVİEW ── */}
          <div style={{
            background: '#fff', border: `1px solid ${pairReady ? '#F0B90B' : '#E5E7EB'}`,
            borderRadius: 12, padding: '10px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Ev Sahibi</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: homeTeam ? '#111827' : '#D1D5DB' }}>{homeTeam || '— seçilmedi —'}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#9CA3AF', padding: '4px 8px', background: '#F3F4F6', borderRadius: 6 }}>VS</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#F6465D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Deplasman</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: awayTeam ? '#111827' : '#D1D5DB' }}>{awayTeam || '— seçilmedi —'}</div>
            </div>
          </div>

          {/* ── HEDEF MOD ── */}
          {pairReady && (<>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              3. Hedef Belirle
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {(['result', 'score'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: '10px', borderRadius: 9, cursor: 'pointer', fontWeight: 800, fontSize: 12,
                  background: mode === m ? '#111827' : '#fff',
                  border: `1px solid ${mode === m ? '#111827' : '#D1D5DB'}`,
                  color: mode === m ? '#F0B90B' : '#374151',
                }}>
                  {m === 'result' ? '🏆 Sonuç (1/X/2)' : '⚽ Kesin Skor'}
                </button>
              ))}
            </div>

            {mode === 'result' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {(['1', 'X', '2'] as const).map(r => (
                  <button key={r} onClick={() => setTargetResult(r)} style={{
                    padding: '14px 4px', borderRadius: 12, cursor: 'pointer', fontWeight: 900,
                    background: targetResult === r ? MC_RESULT_COLORS[r] : '#F9FAFB',
                    border: `2px solid ${targetResult === r ? MC_RESULT_COLORS[r] : '#E5E7EB'}`,
                    color: targetResult === r ? '#fff' : '#374151',
                  }}>
                    <div style={{ fontSize: 22 }}>{r}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3 }}>{MC_RESULT_LABELS[r]}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', marginBottom: 4 }}>{homeTeam}</div>
                    <input value={scoreH} onChange={e => setScoreH(e.target.value)} type="number" min="0" max="9"
                      style={{
                        width: '100%', textAlign: 'center', border: '2px solid #3B82F6',
                        borderRadius: 10, padding: '14px 4px', color: '#1D4ED8', fontSize: 32, fontWeight: 900, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#374151', paddingTop: 20 }}>–</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#F6465D', marginBottom: 4 }}>{awayTeam}</div>
                    <input value={scoreA} onChange={e => setScoreA(e.target.value)} type="number" min="0" max="9"
                      style={{
                        width: '100%', textAlign: 'center', border: '2px solid #F6465D',
                        borderRadius: 10, padding: '14px 4px', color: '#DC2626', fontSize: 32, fontWeight: 900, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
                  {['0-0','1-0','0-1','1-1','2-0','0-2','2-1','1-2','2-2','3-0'].map(sc => {
                    const [h, a] = sc.split('-');
                    const active = scoreH === h && scoreA === a;
                    return (
                      <button key={sc} onClick={() => { setScoreH(h); setScoreA(a); }} style={{
                        padding: '6px 4px', borderRadius: 7, cursor: 'pointer',
                        fontWeight: 800, fontSize: 11,
                        background: active ? '#111827' : '#fff',
                        border: `1px solid ${active ? '#111827' : '#E5E7EB'}`,
                        color: active ? '#F0B90B' : '#374151',
                      }}>{sc}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ALT/ÜST HEDEFİ ── */}
            <p style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, marginTop: 4 }}>
              4. Alt/Üst Hedefi &nbsp;<span style={{ fontSize: 10, color: '#6B7280', textTransform: 'none', fontWeight: 600 }}>(opsiyonel — 0-0'dan kademeli ilerleme)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
              <button onClick={() => setTotalTarget(0)} style={{
                padding: '7px 2px', borderRadius: 7, cursor: 'pointer', fontWeight: 800, fontSize: 10,
                background: totalTarget === 0 ? '#E5E7EB' : '#fff',
                border: `1px solid ${totalTarget === 0 ? '#9CA3AF' : '#E5E7EB'}`,
                color: totalTarget === 0 ? '#374151' : '#9CA3AF',
              }}>Kapalı</button>
              {[2, 3, 4, 5, 6, 7].map(goals => {
                const line = goals - 0.5;
                const active = totalTarget === goals;
                return (
                  <button key={goals} onClick={() => setTotalTarget(goals)} style={{
                    padding: '7px 2px', borderRadius: 7, cursor: 'pointer', fontWeight: 800, fontSize: 10,
                    background: active ? '#111827' : '#fff',
                    border: `2px solid ${active ? '#F0B90B' : '#E5E7EB'}`,
                    color: active ? '#F0B90B' : '#374151',
                  }}>O {line}</button>
                );
              })}
            </div>
            {totalTarget > 0 && (
              <div style={{
                background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
                padding: '7px 10px', marginBottom: 10, fontSize: 11, fontWeight: 700, color: '#166534',
              }}>
                ⚽ Hedef: {totalTarget} gol toplam · {
                  mode === 'result'
                    ? `${MC_RESULT_LABELS[targetResult]} sonucu ile`
                    : `${scoreH}–${scoreA} final skoru`
                } → Skor 0-0'dan kademeli ilerleyecek
              </div>
            )}

            {/* ── MAÇI SIFIRLA (0-0 BAŞLAT) ── */}
            <button onClick={() => setResetMatch(v => !v)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: resetMatch ? '#F0FDF4' : '#fff',
              border: `1px solid ${resetMatch ? '#86EFAC' : '#E5E7EB'}`,
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🟢</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Maçı 0-0 Başlat</div>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>Skor sıfırlanır, maç 1. dakikadan başlar ve belirlenen hedefe kademe kademe ilerler</div>
              </div>
              <div style={{ width: 40, height: 22, borderRadius: 11, padding: '2px', background: resetMatch ? '#16a34a' : '#E5E7EB', transition: 'background 0.2s', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: resetMatch ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
              </div>
            </button>

            {/* Pin toggle */}
            <button onClick={() => setPinned(v => !v)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: pinned ? '#FEF9C3' : '#fff', border: `1px solid ${pinned ? '#FDE68A' : '#E5E7EB'}`,
              marginBottom: 12,
            }}>
              <Pin style={{ width: 16, height: 16, color: pinned ? '#d97706' : '#9CA3AF', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Üste Sabitle</div>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>Maç herkesin listesinde en üstte görünür</div>
              </div>
              <div style={{ width: 40, height: 22, borderRadius: 11, padding: '2px', background: pinned ? '#F0B90B' : '#E5E7EB', transition: 'background 0.2s', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: pinned ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
              </div>
            </button>

            {/* Lig bilgisi */}
            {curLeague && (
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10, background: '#F9FAFB', borderRadius: 8, padding: '7px 10px', fontWeight: 600 }}>
                {curLeague.flag} {curLeague.name} · Skor son 3 dakikada kilitlenir
              </div>
            )}

            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: '14px', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 900, fontSize: 14, border: 'none',
              background: saving ? '#E5E7EB' : 'linear-gradient(135deg,#F0B90B,#d97706)',
              color: saving ? '#9CA3AF' : '#000',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Kaydediliyor…' : `✓ Kontrolü Uygula · ${homeTeam} vs ${awayTeam}`}
            </button>
          </>)}
        </div>
      )}

      {/* ── Aktif Kontroller ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#374151' }}>
          <RefreshCw style={{ width: 22, height: 22, margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Yükleniyor…</p>
        </div>
      ) : controls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', background: '#F9FAFB', borderRadius: 14, border: '1px dashed #E5E7EB' }}>
          <Gamepad2 style={{ width: 44, height: 44, color: '#D1D5DB', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Aktif Kontrol Yok</p>
          <p style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Yukarıdan lig ve takım seçerek kontrol ekle</p>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Aktif Kontroller ({controls.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {controls.map(ctrl => {
              const hasScore  = ctrl.targetScore !== undefined;
              const typeColor = hasScore ? '#d97706' : MC_RESULT_COLORS[ctrl.targetResult || ''] || '#6B7280';
              const typeLabel = hasScore
                ? `${ctrl.targetScore!.h} – ${ctrl.targetScore!.a}`
                : MC_RESULT_LABELS[ctrl.targetResult || ''] || '—';
              const homeLogo  = TEAM_LOGOS[ctrl.homeTeam];
              const awayLogo  = TEAM_LOGOS[ctrl.awayTeam];

              return (
                <div key={ctrl.id} style={{
                  background: '#fff', border: `1px solid ${ctrl.pinned ? '#FDE68A' : '#E5E7EB'}`,
                  borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ height: 3, background: `linear-gradient(90deg,${typeColor},transparent)` }} />
                  <div style={{ padding: '12px 14px' }}>
                    {/* Badges + time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9, flexWrap: 'wrap' }}>
                      {ctrl.pinned && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#FEF9C3', color: '#d97706', border: '1px solid #FDE68A' }}>📌 SABİTLENDİ</span>
                      )}
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40` }}>
                        {hasScore ? '⚽ KESİN SKOR' : '🏆 SONUÇ'}
                      </span>
                      <span style={{ fontSize: 10, color: '#6B7280', marginLeft: 'auto', fontWeight: 600 }}>{timeAgoMC(ctrl.createdAt)}</span>
                    </div>

                    {/* Teams row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {homeLogo
                          ? <img src={homeLogo} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                          : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 900, flexShrink: 0 }}>{ctrl.homeTeam.slice(0,2).toUpperCase()}</div>
                        }
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctrl.homeTeam}</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: typeColor, background: `${typeColor}15`, padding: '4px 10px', borderRadius: 8, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {hasScore ? `⚽ ${typeLabel}` : typeLabel}
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#111827', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctrl.awayTeam}</span>
                        {awayLogo
                          ? <img src={awayLogo} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />
                          : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F6465D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 900, flexShrink: 0 }}>{ctrl.awayTeam.slice(0,2).toUpperCase()}</div>
                        }
                      </div>
                    </div>

                    {/* Delete */}
                    <button onClick={() => handleDelete(ctrl.id)} disabled={deletingId === ctrl.id} style={{
                      width: '100%', padding: '8px', borderRadius: 8, cursor: 'pointer',
                      background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
                      fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: deletingId === ctrl.id ? 0.4 : 1,
                    }}>
                      {deletingId === ctrl.id
                        ? <><RefreshCw style={{ width: 12, height: 12 }} /> Siliniyor…</>
                        : <><Trash2 style={{ width: 13, height: 13 }} /> Kontrolü Kaldır</>
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

// ── Admin Push Notification Setup ──────────────────────────────
async function registerAdminPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // sw.js is in public/ → served at <BASE_URL>sw.js
    const base = (import.meta as any).env?.BASE_URL || '/';
    const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
    await navigator.serviceWorker.ready;

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;

    const existing = await reg.pushManager.getSubscription();
    const PUSH_API = `${window.location.origin}/api`;

    const sendSub = async (sub: PushSubscription) => {
      const j = sub.toJSON();
      await fetch(`${PUSH_API}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth } }),
      }).catch(() => {});
    };

    if (existing) { await sendSub(existing); return; }

    const keyRes = await fetch(`${PUSH_API}/push/vapid-key`).catch(() => null);
    if (!keyRes?.ok) return;
    const { publicKey } = await keyRes.json();

    const b64 = (base64: string) => {
      const pad = '='.repeat((4 - base64.length % 4) % 4);
      const b = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
      return Uint8Array.from([...atob(b)].map(c => c.charCodeAt(0)));
    };

    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
    await sendSub(sub);
    console.log('[admin-push] ✅ Push aboneliği oluşturuldu');
  } catch (e) {
    console.warn('[admin-push] Push setup hatası:', e);
  }
}

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
  const [newVisitorCount, setNewVisitorCount] = useState(0);
  const [newLoginCount, setNewLoginCount] = useState(0);
  const [newWithdrawalCount, setNewWithdrawalCount] = useState(0);
  const [newDepositCount, setNewDepositCount] = useState(0);
  const [newLiveActivityCount, setNewLiveActivityCount] = useState(0);
  const [depositRadarNewCount, setDepositRadarNewCount] = useState(0);
  const seenTxIds = useRef(new Set<string>());
  const seenUserIds = useRef(new Set<string>());
  const seenLoginIds = useRef(new Set<string>());
  const seenWithdrawalIds = useRef(new Set<string>());
  const seenDepositIds = useRef(new Set<string>());
  const seeded = useRef(false);
  const userSeeded = useRef(false);
  const withdrawalSeeded = useRef(false);
  const depositSeeded = useRef(false);

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
    registerAdminPush(); // push bildirim kaydı (telefon kilitliyken bile çalışır)

    // Seed existing tx IDs so we don't alarm on historical data
    supabase.from('wallet_transactions').select('id').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => {
        (data || []).forEach((r: { id: string }) => seenTxIds.current.add(r.id));
        seeded.current = true;
      });

    // Count new users registered since admin last cleared the badge.
    // Uses localStorage so registrations while panel was closed are also counted.
    // If never set before, defaults to 48 hours ago to avoid flooding with old data.
    const stored = localStorage.getItem('admin_visitor_badge_cleared_at');
    const lastCleared = stored || (() => {
      const t = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('admin_visitor_badge_cleared_at', t);
      return t;
    })();
    supabase
      .from('user_profiles')
      .select('id, created_at', { count: 'exact', head: false })
      .gt('created_at', lastCleared)
      .then(({ data, count }) => {
        const ids = (data || []).map((r: any) => r.id);
        ids.forEach(id => seenUserIds.current.add(id));
        userSeeded.current = true;
        if ((count ?? 0) > 0) setNewVisitorCount(count ?? 0);
      });

    // Count new logins since admin last cleared the login badge
    const lastLoginCleared = localStorage.getItem('admin_login_badge_cleared_at') || (() => {
      const t = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('admin_login_badge_cleared_at', t);
      return t;
    })();
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: false })
      .gt('last_login_at', lastLoginCleared)
      .not('last_login_at', 'is', null)
      .then(({ data, count }) => {
        (data || []).forEach((r: any) => seenLoginIds.current.add(`${r.id}_${lastLoginCleared}`));
        if ((count ?? 0) > 0) setNewLoginCount(count ?? 0);
      });

    // Count new withdrawal requests since admin last checked
    const lastWdCleared = localStorage.getItem('admin_withdrawal_badge_cleared_at') || (() => {
      const t = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('admin_withdrawal_badge_cleared_at', t);
      return t;
    })();
    supabase
      .from('withdrawal_transactions')
      .select('id', { count: 'exact', head: false })
      .gt('created_at', lastWdCleared)
      .then(({ data, count }) => {
        (data || []).forEach((r: any) => seenWithdrawalIds.current.add(r.id));
        withdrawalSeeded.current = true;
        if ((count ?? 0) > 0) setNewWithdrawalCount(count ?? 0);
      })
      .catch(() => { withdrawalSeeded.current = true; });

    // Count new deposit transactions since admin last checked
    const lastDepCleared = localStorage.getItem('admin_deposit_badge_cleared_at') || (() => {
      const t = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('admin_deposit_badge_cleared_at', t);
      return t;
    })();
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: false })
      .in('type', ['deposit', 'manual_deposit', 'admin_credit'])
      .gt('created_at', lastDepCleared)
      .then(({ data, count }) => {
        (data || []).forEach((r: any) => seenDepositIds.current.add(r.id));
        depositSeeded.current = true;
        if ((count ?? 0) > 0) setNewDepositCount(count ?? 0);
      })
      .catch(() => { depositSeeded.current = true; });

    const channel = supabase
      .channel('admin_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        loadUnreadSupportCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadUnreadSupportCount();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_profiles' }, (payload) => {
        if (!userSeeded.current) return;
        const rec = payload.new as any;
        if (!rec?.id || seenUserIds.current.has(rec.id)) return;
        seenUserIds.current.add(rec.id);
        setNewVisitorCount(n => n + 1);
        loadUsers(); // refresh user list too
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, (payload) => {
        const rec = payload.new as any;
        const old = payload.old as any;
        if (!rec?.last_login_at || rec.last_login_at === old?.last_login_at) return;
        const key = `${rec.id}_${rec.last_login_at}`;
        if (seenLoginIds.current.has(key)) return;
        seenLoginIds.current.add(key);
        setNewLoginCount(n => n + 1);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'withdrawal_transactions' }, (payload) => {
        if (!withdrawalSeeded.current) return;
        const rec = payload.new as any;
        if (!rec?.id || seenWithdrawalIds.current.has(rec.id)) return;
        seenWithdrawalIds.current.add(rec.id);
        setNewWithdrawalCount(n => n + 1);
        playUrgentAlarm();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        if (!depositSeeded.current) return;
        const rec = payload.new as any;
        if (!rec?.id || seenDepositIds.current.has(rec.id)) return;
        const depTypes = ['deposit', 'manual_deposit', 'admin_credit'];
        if (!depTypes.includes(rec?.type)) return;
        seenDepositIds.current.add(rec.id);
        setNewDepositCount(n => n + 1);
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
    try {
      const adminUser = await getCurrentUser();
      const adminId = adminUser?.id || '';
      const resp = await fetch('/api/admin/users', {
        headers: { 'x-requester-id': adminId }
      });
      if (resp.ok) {
        const data = await resp.json();
        setUsers(Array.isArray(data) ? data : []);
        return;
      }
    } catch {
      // fallback below
    }
    // Fallback: direct Supabase query (may be limited by RLS)
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
      const adminData = { user: await getCurrentUser() };

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
      const adminData = { user: await getCurrentUser() };

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
    { id: 'user-wallets', label: 'Kullanıcı', icon: Users, badge: newVisitorCount },
    { id: 'incoming-funds', label: 'Gelen Fonlar', icon: ArrowDownRight, badge: newTxCount },
    { id: 'support', label: 'Destek', icon: MessageSquare, badge: unreadSupportCount },
    { id: 'command', label: 'Komut', icon: Zap },
    { id: 'agents', label: 'Ajanlar', icon: Users },
    { id: 'position', label: 'Pozisyon', icon: Target },
    { id: 'deposits', label: 'Yatırım', icon: DollarSign, badge: newDepositCount },
    { id: 'withdrawals', label: 'Çekim', icon: ArrowUpRight, badge: newWithdrawalCount },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'activity', label: 'Aktivite', icon: Activity },
    { id: 'deploy', label: 'Deploy', icon: Server },
    { id: 'ai', label: 'AI Bot', icon: Bot },
    { id: 'analytics', label: 'Analitik', icon: Eye },
    { id: 'wallet-gen', label: 'Üretici', icon: Wallet },
    { id: 'data-protection', label: 'Veri Koruma', icon: Shield },
    { id: 'tradfi-logos', label: 'TradeFi', icon: Image },
    { id: 'revenue', label: 'Gelir', icon: TrendingUp },
    { id: 'visitors', label: 'Gelenler', icon: Eye, badge: newVisitorCount + newLoginCount },
    { id: 'vip', label: 'VIP', icon: Crown },
    { id: 'live', label: 'Canlı', icon: Activity, badge: newLiveActivityCount },
    { id: 'restrictions', label: 'Kısıtla', icon: Lock },
    { id: 'quick-restrict', label: 'Hızlı', icon: Zap },
    { id: 'matches', label: 'Maçlar', icon: Gamepad2 },
    { id: 'radar', label: 'BSC&TRC', icon: Radio, badge: depositRadarNewCount },
    { id: 'social', label: 'Sosyal Medya', icon: Send },
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
              onClick={() => {
                setActiveTab(id);
                if (id === 'visitors' || id === 'user-wallets') {
                  setNewVisitorCount(0);
                  setNewLoginCount(0);
                  const now = new Date().toISOString();
                  localStorage.setItem('admin_visitor_badge_cleared_at', now);
                  localStorage.setItem('admin_login_badge_cleared_at', now);
                }
                if (id === 'incoming-funds') setNewTxCount(0);
                if (id === 'withdrawals') {
                  setNewWithdrawalCount(0);
                  localStorage.setItem('admin_withdrawal_badge_cleared_at', new Date().toISOString());
                }
                if (id === 'deposits') {
                  setNewDepositCount(0);
                  localStorage.setItem('admin_deposit_badge_cleared_at', new Date().toISOString());
                }
                if (id === 'live') {
                  setNewLiveActivityCount(0);
                }
                if (id === 'radar') {
                  setDepositRadarNewCount(0);
                }
              }}
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

        {activeTab === 'visitors' && (
          <VisitorsPanel />
        )}

        {activeTab === 'vip' && (
          <VipManagementPanel />
        )}

        {activeTab === 'live' && (
          <div className="-mx-4">
            <LiveActivityPanel onBadgeChange={setNewLiveActivityCount} />
          </div>
        )}

        {activeTab === 'restrictions' && (
          <div className="-mx-4">
            <UserRestrictionsPanel />
          </div>
        )}

        {activeTab === 'quick-restrict' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">Hızlı Kısıtla</h2>
                <p className="text-xs text-gray-400">Tıkla → yükle → tek dokunuşla uygula</p>
              </div>
            </div>
            <QuickRestrictPanel users={users} />
          </div>
        )}

        {activeTab === 'matches' && (
          <MatchControlsPanel adminId={FALLBACK_ADMIN} />
        )}

        {activeTab === 'radar' && (
          <DepositRadarPanel />
        )}

        {activeTab === 'social' && (
          <SocialMediaPanel />
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
      const user = await getCurrentUser();
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
      const user = await getCurrentUser();
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
      const user = await getCurrentUser();
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

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';
import SupportModal from '../components/SupportModal';
import SecurityCenterModal from '../components/SecurityCenterModal';
import ReferralModal from '../components/ReferralModal';
import EarnModal from '../components/EarnModal';
import DepositMethodModal from '../components/DepositMethodModal';
import P2PModal from '../components/P2PModal';
import PayModal from '../components/PayModal';
import RewardsModal from '../components/RewardsModal';
import AnalyticsModal from '../components/AnalyticsModal';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { trackActivity } from '../lib/activity-tracker';
import { fetchUserRestrictions } from '../lib/user-restrictions';
import { isMetalSymbol } from '../components/MetalIcon';
import { isTradFiIcon } from '../components/TradFiIcon';
import { getCachedTradFiPrice } from '../lib/tradfi-price-service';
import { RealtimePnLService, RealtimePnL } from '../lib/realtime-pnl-service';
import { PriceCache } from '../lib/price-cache';
import {
  User, Mail, LogOut, Shield, ChevronRight, Wallet as WalletIcon, Plus, Loader2,
  ArrowLeft, QrCode, Settings, Gift, TrendingUp, Repeat, DollarSign,
  Users, BarChart3, Lock, CheckCircle, ArrowUpRight, Calendar, Activity, Copy, Check,
  Heart, MessageCircle, Share2, Flame
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ProfilePageProps {
  onNavigateToAdmin?: () => void;
  onBack?: () => void;
}

export default function ProfilePage({ onNavigateToAdmin, onBack }: ProfilePageProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [vipMembership, setVipMembership] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showEarn, setShowEarn] = useState(false);
  const [showDepositUSD, setShowDepositUSD] = useState(false);
  const [showP2P, setShowP2P] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showVipPayModal, setShowVipPayModal] = useState(false);
  const [vipPayCopied, setVipPayCopied] = useState(false);
  const [userTrc20Address, setUserTrc20Address] = useState<string>('');
  const [vipOverdueNotice, setVipOverdueNotice] = useState(false);
  const [vipOverdueMessage, setVipOverdueMessage] = useState('');
  const [vipOverdueAmount, setVipOverdueAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [resettingMining, setResettingMining] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const priceManagerRef = useRef<EarnQuestPriceManager | null>(null);
  const isInitialLoadRef = useRef(true);
  const [realtimePnL, setRealtimePnL] = useState<RealtimePnL>({
    currentTotalValue: 0,
    startingValue: 0,
    dailyPnL: 0,
    dailyPnLPercentage: 0,
    balances: []
  });

  useEffect(() => {
    priceManagerRef.current = EarnQuestPriceManager.getInstance();
    loadUserData();

    const pnlService = RealtimePnLService.getInstance();
    const unsubscribePnL = pnlService.subscribe((pnl) => {
      setRealtimePnL(pnl);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user) {
        loadUserData();
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setBalances([]);
        setStatistics(null);
        if (isInitialLoadRef.current) {
          setLoading(false);
          isInitialLoadRef.current = false;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribePnL();
      const unsub = (window as unknown as Record<string, unknown>)['_profilePriceUnsub'];
      if (typeof unsub === 'function') (unsub as () => void)();
    };
  }, []);

  const loadUserData = async () => {
    try {
      if (isInitialLoadRef.current) {
        setLoading(true);
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setUser(null);
        if (isInitialLoadRef.current) {
          setLoading(false);
          isInitialLoadRef.current = false;
        }
        return;
      }

      setUser(session.user);

      const [profileResult, statsResult, vipResult, restrictionsResult] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle(),
        supabase.from('user_statistics').select('*').eq('user_id', session.user.id).maybeSingle(),
        supabase.from('vip_memberships').select('*').eq('user_id', session.user.id).in('status', ['active', 'frozen']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        fetchUserRestrictions(session.user.id),
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
      }
      if (restrictionsResult?.trc20_address) {
        setUserTrc20Address(restrictionsResult.trc20_address);
      }
      if (restrictionsResult?.vip_overdue_notice) {
        setVipOverdueNotice(true);
        setVipOverdueMessage(restrictionsResult.vip_overdue_message || '');
        setVipOverdueAmount(restrictionsResult.vip_overdue_amount || 0);
      } else {
        setVipOverdueNotice(false);
        setVipOverdueMessage('');
        setVipOverdueAmount(0);
      }

      setStatistics(statsResult.data);
      if (!vipResult.error) setVipMembership(vipResult.data);

      if (isInitialLoadRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }

      loadBalances(session.user.id);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      if (isInitialLoadRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    }
  };

  const loadBalances = async (userId: string) => {
    try {
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', userId)
        .gt('balance', 0)
        .order('balance', { ascending: false });

      const priceCache = PriceCache.getInstance();
      const eqMgr = priceManagerRef.current || EarnQuestPriceManager.getInstance();

      const balancesWithPrices = (balanceData || []).map((balance) => {
        if (balance.symbol === 'USDT') return { ...balance, price: 1 };
        if (balance.symbol === 'EQ' || balance.symbol === 'EQL') {
          return { ...balance, price: eqMgr.getPrice() || 0 };
        }
        if (isMetalSymbol(balance.symbol) || isTradFiIcon(balance.symbol)) {
          const cached = getCachedTradFiPrice(balance.symbol + 'USDT');
          return { ...balance, price: cached?.price || 0 };
        }
        // Use PriceCache (same source as Assets page — no proxy latency/failures)
        const cached = priceCache.getBySymbol(balance.symbol);
        return { ...balance, price: cached?.price || 0 };
      });

      setBalances(balancesWithPrices);

      // Re-apply live prices when cache updates
      const unsubPrice = priceCache.subscribe(() => {
        setBalances(prev => prev.map(b => {
          if (b.symbol === 'USDT') return b;
          if (b.symbol === 'EQ' || b.symbol === 'EQL') return { ...b, price: eqMgr.getPrice() || 0 };
          const fresh = priceCache.getBySymbol(b.symbol);
          return fresh?.price ? { ...b, price: fresh.price } : b;
        }));
      });

      // Store unsubscribe fn for cleanup — attach to window to avoid closure issues
      (window as unknown as Record<string, unknown>)['_profilePriceUnsub'] = unsubPrice;
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setBalances([]);
      setStatistics(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('avatars')
          .remove(existingFiles.map(f => `${user.id}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      alert('Referral code copied to clipboard!');
    }
  };

  const copyUserId = async () => {
    if (profile?.user_id) {
      await navigator.clipboard.writeText(profile.user_id.toString());
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const copyEmail = async () => {
    if (user?.email) {
      await navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const resetMiningForTesting = async () => {
    if (!user) return;

    if (!confirm('This will reset all mining equipment and set balance to $10,000 USDT for testing. Continue?')) {
      return;
    }

    try {
      setResettingMining(true);

      const { data, error } = await supabase.rpc('reset_user_mining_for_testing', {
        target_user_id: user.id
      });

      if (error) throw error;

      alert('Mining reset complete! $10,000 USDT added. EQ balance reset to 0. You can now buy mining equipment from the Shop.');

      await loadUserData();
    } catch (error) {
      console.error('Error resetting mining:', error);
      alert('Failed to reset mining. Please try again.');
    } finally {
      setResettingMining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181A20] flex items-center justify-center pb-20">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#181A20] pb-20">
        <div className="bg-[#181A20] border-gray-800 p-4">
          <h1 className="font-bold text-[#F5F5F5]">Profile</h1>
        </div>

        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-[#181A20] rounded-xl p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-[#2B3139] to-[#1E2329] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-10 h-10 text-gray-300" />
            </div>

            <h2 className="font-bold text-[#F5F5F5] mb-2">Welcome</h2>
            <p className="text-gray-400 mb-6">Log in to access your account and start trading</p>

            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-[#F0B90B] text-black font-semibold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[#F0B90B]/20 mb-3"
            >
              Log In / Sign Up
            </button>

            <p className="text-gray-500 mt-4">
              Don't have an account?{' '}
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[#F0B90B] hover:text-[#F8D12F] font-medium transition-colors"
              >
                Sign up now
              </button>
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="bg-[#181A20] rounded-xl p-4 shadow-lg">
              <h3 className="text-[#F5F5F5] font-semibold mb-3">Platform Benefits</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <span className="mr-2 font-bold text-base">✓</span>
                  Secure crypto trading platform
                </li>
                <li className="flex items-center">
                  <span className="mr-2 font-bold text-base">✓</span>
                  Low fees and fast transactions
                </li>
                <li className="flex items-center">
                  <span className="mr-2 font-bold text-base">✓</span>
                  24/7 customer support
                </li>
              </ul>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode="login"
        />
      </div>
    );
  }

  // Use RealtimePnLService as the single source of truth (same as Assets page)
  // Falls back to local sum only if PnL service hasn't loaded yet
  const localBalanceSum = balances.reduce((sum, balance) => {
    if (balance.symbol === 'EQ' || balance.symbol === 'EQL') return sum;
    const balanceValue = parseFloat(balance.balance) || 0;
    const price = balance.price || (balance.symbol === 'USDT' ? 1 : 0);
    return sum + (balanceValue * price);
  }, 0);
  const totalBalanceUSD = realtimePnL.currentTotalValue > 0
    ? realtimePnL.currentTotalValue
    : localBalanceSum;

  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';

  // All VIP levels: plain Binance yellow, white text, shimmer
  const effectiveVipLevel = vipMembership?.vip_level || (profile?.user_level && profile.user_level > 0 ? profile.user_level : null);
  const vipStyle = effectiveVipLevel ? { bg: '#F0B90B', text: '#ffffff', border: '#d4a008' } : null;
  const vipDaysLeft = vipMembership ? Math.ceil((new Date(vipMembership.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isAccountFrozen = !profile?.is_active && profile?.id;

  return (
    <div className="min-h-screen bg-[#181A20] pb-20">

      {/* ❄️ Account Freeze Overlay */}
      {isAccountFrozen && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-blue-900/50 rounded-full flex items-center justify-center mb-5">
            <span className="text-4xl">❄️</span>
          </div>
          <h2 className="text-white text-2xl font-black mb-2">Your Account is Frozen</h2>
          <p className="text-gray-400 text-sm mb-5 max-w-xs">
            {vipMembership?.freeze_reason || 'Your VIP membership fee is overdue. Please complete your payment to resume trading.'}
          </p>
          {vipMembership && (
            <div className="bg-[#1E2329] rounded-2xl p-5 w-full max-w-sm mb-5 border border-[#F0B90B]/30">
              <div className="text-[#F0B90B] text-sm font-bold mb-3">💰 Payment Details</div>
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Package</span>
                  <span className="text-white font-bold">{vipStyle?.emoji} {vipStyle?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Fee</span>
                  <span className="text-green-400 font-black">${vipMembership.price_usdt?.toLocaleString()} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Duration</span>
                  <span className="text-white font-bold">{vipMembership.duration_months} months</span>
                </div>
              </div>
            </div>
          )}
          <p className="text-gray-500 text-xs mb-4">After payment, please notify our support team</p>
          <button
            onClick={() => { trackActivity('support_open', 'profile'); setShowSupportModal(true); }}
            className="w-full max-w-sm py-4 bg-[#F0B90B] text-black rounded-2xl font-black text-base flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Contact Support
          </button>
        </div>
      )}
      <div className="bg-[#181A20] border-gray-800 p-4 flex items-center justify-between">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowQRModal(true)} className="text-gray-400 hover:text-white transition-colors">
            <QrCode className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowSupportModal(true)}
            className="text-[#F0B90B] hover:text-[#F0B90B] transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 11a7 7 0 0 1 14 0" />
              <rect x="3" y="11" width="4" height="6" rx="2" />
              <rect x="17" y="11" width="4" height="6" rx="2" />
              <path d="M21 17v1a3 3 0 0 1-3 3h-3" />
              <circle cx="14" cy="21" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button className="text-green-500 hover:text-green-400 transition-colors">
            <Shield className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-[#1E2329] rounded-2xl p-6 mb-6 border-2 border-[#F0B90B]/40 shadow-lg shadow-[#F0B90B]/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  onClick={handleAvatarClick}
                  className="w-20 h-20 bg-gradient-to-br from-[#F0B90B] to-[#F8D12F] rounded-full flex items-center justify-center cursor-pointer overflow-hidden shadow-lg"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-8 h-8 text-black animate-spin" />
                  ) : profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-black" />
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#F0B90B] rounded-full flex items-center justify-center hover:bg-[#F8D12F] transition-colors shadow-lg disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-black" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 bg-[#2B3139] px-3 py-1.5 rounded-lg">
                    <span className="text-gray-400 text-sm">ID:</span>
                    <span className="font-bold text-[#F5F5F5]">{profile?.user_id || '000000'}</span>
                    <button
                      onClick={copyUserId}
                      className="hover:bg-[#181A20] p-1 rounded transition-colors"
                      title="Copy ID"
                    >
                      {copiedId ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-[#F0B90B]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-2 bg-[#2B3139] px-3 py-1.5 rounded-lg max-w-[180px]">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-[#F5F5F5] text-xs truncate">{user?.email || 'user@example.com'}</span>
                    <button
                      onClick={copyEmail}
                      className="hover:bg-[#181A20] p-1 rounded transition-colors flex-shrink-0"
                      title="Copy Email"
                    >
                      {copiedEmail ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-[#F0B90B]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {vipStyle && effectiveVipLevel ? (
                    <>
                      <button
                        onClick={() => setShowVipPayModal(true)}
                        className="px-3 py-1 rounded-full font-black tracking-widest text-xs active:scale-95 transition-transform relative overflow-hidden select-none"
                        style={{
                          background: effectiveVipLevel === 10
                            ? 'linear-gradient(135deg,#1a1100 0%,#2e1f00 25%,#1a1100 50%,#2e1f00 75%,#1a1100 100%)'
                            : 'linear-gradient(135deg,#111 0%,#1e1800 40%,#111 100%)',
                          border: `${effectiveVipLevel === 10 ? 1.5 : 1}px solid ${effectiveVipLevel === 10 ? '#f0b90b' : '#a07800'}`,
                          boxShadow: effectiveVipLevel === 10
                            ? '0 0 6px rgba(240,185,11,0.3)'
                            : '0 0 4px rgba(240,185,11,0.15)',
                        }}
                      >
                        <span
                          className="relative z-10"
                          style={{
                            background: effectiveVipLevel === 10
                              ? 'linear-gradient(180deg,#fff8c0 0%,#ffe033 18%,#f0b90b 38%,#b8780a 58%,#f0b90b 78%,#fff3a0 100%)'
                              : 'linear-gradient(180deg,#ffe566 0%,#f0b90b 40%,#a06800 65%,#f0b90b 85%,#ffe566 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: effectiveVipLevel === 10
                              ? 'drop-shadow(0 0 5px rgba(255,210,0,0.9)) drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                              : 'drop-shadow(0 1px 1px rgba(0,0,0,0.7))',
                          }}
                        >
                          VIP {effectiveVipLevel}{vipMembership?.status === 'frozen' ? ' ❄' : ''}
                        </span>
                        <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)', backgroundSize: '200% 100%', animation: `vipShimmer ${effectiveVipLevel === 10 ? 2 : 3}s linear infinite` }} />
                      </button>
                      {profile?.verification_status === 'verified' && (
                        <span
                          className="relative overflow-hidden flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold select-none"
                          style={{
                            background: 'linear-gradient(135deg, #0a2f1a 0%, #0d3d22 40%, #0a2f1a 100%)',
                            border: '1px solid rgba(16,185,129,0.55)',
                            boxShadow: '0 0 10px rgba(16,185,129,0.25), inset 0 0 8px rgba(16,185,129,0.08)',
                            color: '#34d399',
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="rgba(52,211,153,0.25)" stroke="#34d399" strokeWidth="1.8"/>
                            <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span style={{ letterSpacing: '0.03em' }}>Verified</span>
                          <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(52,211,153,0.15) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'vipShimmer 3s linear infinite' }} />
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowVipPayModal(true)}
                        className="px-3 py-1 rounded-full text-xs font-bold active:scale-95 transition-transform bg-[#F0B90B] text-black"
                      >
                        Regular
                      </button>
                      {profile?.verification_status === 'verified' && (
                        <span
                          className="relative overflow-hidden flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold select-none"
                          style={{
                            background: 'linear-gradient(135deg, #0a2f1a 0%, #0d3d22 40%, #0a2f1a 100%)',
                            border: '1px solid rgba(16,185,129,0.55)',
                            boxShadow: '0 0 10px rgba(16,185,129,0.25), inset 0 0 8px rgba(16,185,129,0.08)',
                            color: '#34d399',
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="rgba(52,211,153,0.25)" stroke="#34d399" strokeWidth="1.8"/>
                            <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span style={{ letterSpacing: '0.03em' }}>Verified</span>
                          <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(52,211,153,0.15) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'vipShimmer 3s linear infinite' }} />
                        </span>
                      )}
                    </>
                  )}
                  {profile?.is_admin && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400">
                      Admin
                    </span>
                  )}
                  {vipMembership && vipDaysLeft !== null && vipDaysLeft <= 30 && vipDaysLeft > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                      ⚠️ {vipDaysLeft}g
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 mt-2" />
          </div>
        </div>

        {/* VIP Overdue Notice — premium card */}
        {vipOverdueNotice && (
          <div
            className="mb-4 rounded-2xl overflow-hidden relative"
            style={{
              background: 'linear-gradient(145deg,#12161C 0%,#1A1F27 100%)',
              border: '1px solid rgba(240,185,11,0.35)',
              boxShadow: '0 0 0 1px rgba(240,185,11,0.08), 0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            {/* Top gold accent line */}
            <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,#F0B90B 30%,#F0B90B 70%,transparent)' }} />

            <style>{`
              @keyframes warnStroke {
                0%, 40%  { stroke: #F0B90B; }
                60%, 100% { stroke: #ef4444; }
              }
              @keyframes warnFill {
                0%, 40%  { fill: #F0B90B; }
                60%, 100% { fill: #ef4444; }
              }
              @keyframes warnBg {
                0%, 40%  { background: rgba(240,185,11,0.12); border-color: rgba(240,185,11,0.3); }
                60%, 100% { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); }
              }
              .warn-stroke { animation: warnStroke 2.8s ease-in-out infinite alternate; }
              .warn-fill   { animation: warnFill   2.8s ease-in-out infinite alternate; }
              .warn-icon-box { animation: warnBg   2.8s ease-in-out infinite alternate; }
            `}</style>

            <div className="px-5 pt-4 pb-5">
              {/* Header row */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="warn-icon-box w-10 h-10 rounded-xl flex items-center justify-center flex-none"
                  style={{ background: 'rgba(240,185,11,0.12)', border: '1px solid rgba(240,185,11,0.3)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path className="warn-stroke" d="M12 2L2 19.5h20L12 2z" stroke="#F0B90B" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path className="warn-stroke" d="M12 9v5" stroke="#F0B90B" strokeWidth="2" strokeLinecap="round"/>
                    <circle className="warn-fill" cx="12" cy="16.5" r="1" fill="#F0B90B"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm tracking-wide">Membership Fee Outstanding</p>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(240,185,11,0.75)' }}>
                    VIP {effectiveVipLevel || ''} · Action Required
                  </p>
                </div>
              </div>

              {/* Message */}
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#8D99A8' }}>
                {vipOverdueMessage || 'Your VIP membership fee is due. Complete your payment to keep your benefits active.'}
              </p>

              {/* CTA button */}
              <button
                onClick={() => setShowVipPayModal(true)}
                className="w-full py-3 rounded-xl font-black text-sm tracking-wide active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg,#F0B90B 0%,#d4a008 100%)',
                  color: '#12161C',
                  boxShadow: '0 4px 16px rgba(240,185,11,0.3)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="5" width="20" height="14" rx="3" stroke="#12161C" strokeWidth="2"/>
                  <path d="M2 10h20" stroke="#12161C" strokeWidth="2"/>
                </svg>
                View Payment Details
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-[#F5F5F5] font-semibold mb-3 px-1 text-lg">Shortcut</h3>
          <div className="grid grid-cols-4 gap-3">
            <button onClick={() => setShowReferral(true)} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <div className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center relative">
                <Users className="w-6 h-6 text-gray-300" />
                <div className="absolute top-1 right-1 w-2 h-2 bg-[#F0B90B] rounded-full"></div>
              </div>
              <span className="text-[#F5F5F5] text-sm font-medium">Referral</span>
            </button>

            <button onClick={() => setShowEarn(true)} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <div className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center relative">
                <WalletIcon className="w-6 h-6 text-gray-300" />
                <Lock className="w-3 h-3 text-[#F0B90B] absolute bottom-1 right-1" />
              </div>
              <span className="text-[#F5F5F5] text-sm font-medium">Earn</span>
            </button>

            <button onClick={() => { trackActivity('deposit_open', 'profile'); setShowDepositUSD(true); }} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center relative" style={{ background: '#F0B90B' }}>
                <WalletIcon className="w-6 h-6 text-black" />
                <ArrowUpRight className="w-3 h-3 text-black absolute top-1 right-1 stroke-[3]" />
              </div>
              <span className="text-[#F5F5F5] text-sm font-medium">Deposit</span>
            </button>

            {profile?.is_admin ? (
              <button onClick={() => onNavigateToAdmin?.()} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-purple-400 text-sm font-medium">Admin</span>
              </button>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
                <div className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-[#F0B90B]" />
                </div>
                <span className="text-[#F5F5F5] text-sm font-medium">Edit</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#1E2329] rounded-2xl p-6 mb-6 border-2 border-[#F0B90B]/40 shadow-lg shadow-[#F0B90B]/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-[#F0B90B]" />
              <span className="text-sm font-semibold text-[#F5F5F5]">Total Balance</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Calendar className="w-4 h-4" />
              <span>Member since {memberSince}</span>
            </div>
          </div>

          {/* VIP membership info bar */}
          {vipMembership && vipStyle && (
            <div className="rounded-xl p-3 mb-4 flex items-center justify-between" style={{ background: `${vipStyle.bg}22`, border: `1px solid ${vipStyle.bg}55` }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{vipStyle.emoji}</span>
                <div>
                  <p className="text-xs font-black" style={{ color: vipStyle.bg === '#FFD700' ? '#F0B90B' : vipStyle.bg }}>{vipStyle.label} Membership</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(vipMembership.starts_at).toLocaleDateString('en-US')} → {new Date(vipMembership.expires_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-black ${vipDaysLeft !== null && vipDaysLeft <= 30 ? 'text-amber-400' : 'text-green-400'}`}>
                  {vipDaysLeft !== null && vipDaysLeft > 0 ? `${vipDaysLeft} days left` : 'Expired'}
                </p>
                <p className="text-[10px] text-gray-500">{vipMembership.duration_months}-month package</p>
              </div>
            </div>
          )}
          <div className="text-3xl font-extrabold text-[#F5F5F5] mb-6">
            {totalBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-gray-300 text-2xl font-bold">USDT</span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Trades</div>
              <div className="font-bold text-[#F5F5F5] text-lg">{((statistics?.spot_trades || 0) + (statistics?.futures_trades || 0))}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Win Rate</div>
              <div className="font-bold text-[#F5F5F5] text-lg">{statistics?.win_rate ? statistics.win_rate.toFixed(1) : '0.0'}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">User Level</div>
              <div className="font-bold text-[#F5F5F5] text-lg">Level {profile?.user_level || 1}</div>
            </div>
          </div>
        </div>


        <div className="mb-6">
          <h3 className="text-[#F5F5F5] font-semibold mb-3 px-1 text-lg">Recommend</h3>
          <div className="grid grid-cols-4 gap-3">
            <button onClick={() => setShowReferral(true)} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <div className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center relative">
                <Users className="w-6 h-6 text-gray-300" />
                <div className="absolute top-1 right-1 w-2 h-2 bg-[#F0B90B] rounded-full"></div>
              </div>
              <span className="text-[#F5F5F5] text-sm font-medium">Referral</span>
            </button>

            <button onClick={() => { trackActivity('deposit_open', 'profile'); setShowDepositUSD(true); }} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center relative" style={{ background: '#F0B90B' }}>
                <WalletIcon className="w-6 h-6 text-black" />
                <Plus className="w-3 h-3 text-black absolute top-1 right-1 stroke-[3]" />
              </div>
              <span className="text-[#F5F5F5] text-sm font-medium">Deposit</span>
            </button>

            <button onClick={() => setShowP2P(true)} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <div className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center relative">
                <Users className="w-6 h-6 text-gray-300" />
                <Repeat className="w-3 h-3 text-[#F0B90B] absolute bottom-1 right-1" />
              </div>
              <span className="text-[#F5F5F5] text-sm font-medium">P2P</span>
            </button>

            <button onClick={() => setShowPay(true)} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <div className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center relative">
                <DollarSign className="w-6 h-6 text-gray-300" />
                <Activity className="w-3 h-3 text-[#F0B90B] absolute top-1 right-1" />
              </div>
              <span className="text-[#F5F5F5] text-sm font-medium">Pay</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <button onClick={() => setShowSecurityModal(true)} className="w-full bg-[#1E2329] text-[#F5F5F5] rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-400" />
              </div>
              <span className="font-medium">Security</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button onClick={() => setShowAnalytics(true)} className="w-full bg-[#1E2329] text-[#F5F5F5] rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <span className="font-medium">Account Verification</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#F0B90B] text-xs font-bold bg-[#F0B90B]/10 px-2 py-1 rounded">Level {profile?.user_level || 1}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="w-full rounded-xl p-4 flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] font-semibold text-white bg-[#F6465D]"
          >
            <LogOut className="w-5 h-5 mr-2 text-white" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {showQRModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowQRModal(false)}>
          <div className="bg-[#181A20] rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">My QR Code</h3>
              <button onClick={() => setShowQRModal(false)} className="hover:text-[#F5F5F5] transition-colors text-2xl leading-none">
                ✕
              </button>
            </div>
            <div className="bg-white p-6 rounded-xl mb-4">
              <QRCodeSVG
                value={`USER:${profile?.user_id || '000000'}`}
                size={200}
                className="w-full h-auto"
              />
            </div>
            <div className="text-center">
              <div className="text-sm mb-1">User ID</div>
              <div className="font-semibold text-lg">{profile?.user_id || '000000'}</div>
            </div>
          </div>
        </div>
      )}

      <SecurityCenterModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />

      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        prefillData={user ? {
          customerId: String(profile?.user_id || ''),
          email: profile?.email || user?.email || '',
          skipToForm: true,
        } : undefined}
      />

      <ReferralModal
        isOpen={showReferral}
        onClose={() => setShowReferral(false)}
      />

      <EarnModal
        isOpen={showEarn}
        onClose={() => setShowEarn(false)}
      />

      <DepositMethodModal
        isOpen={showDepositUSD}
        onClose={() => setShowDepositUSD(false)}
      />

      <P2PModal
        isOpen={showP2P}
        onClose={() => setShowP2P(false)}
      />

      <PayModal
        isOpen={showPay}
        onClose={() => setShowPay(false)}
      />

      <RewardsModal
        isOpen={showRewards}
        onClose={() => setShowRewards(false)}
      />

      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />

      {/* VIP Payment Modal */}
      {showVipPayModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-end justify-center" onClick={() => setShowVipPayModal(false)}>
          <div
            className="bg-[#1E2329] w-full max-w-lg rounded-t-3xl pb-10 max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2B3139]">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="text-white font-black text-base">VIP Membership</h3>
                  <p className="text-gray-400 text-xs">Premium membership via crypto</p>
                </div>
              </div>
              <button onClick={() => setShowVipPayModal(false)} className="w-8 h-8 rounded-full bg-[#2B3139] flex items-center justify-center text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="px-5 pt-5 space-y-5">

              {/* Current VIP status / Overdue amount */}
              {vipOverdueNotice && vipOverdueAmount > 0 ? (
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'linear-gradient(135deg,#12161C,#1A1F27)', border: '1px solid rgba(240,185,11,0.4)' }}
                >
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Amount Due</p>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-[#F0B90B] font-black text-3xl">{vipOverdueAmount.toLocaleString()}</span>
                    <span className="text-[#F0B90B] font-bold text-base">USDT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-none" />
                    <p className="text-gray-400 text-xs">VIP {effectiveVipLevel} membership fee outstanding</p>
                  </div>
                </div>
              ) : vipMembership && vipStyle ? (
                <div className="bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[#F0B90B] font-black text-sm">Current Package: VIP {effectiveVipLevel}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {vipDaysLeft !== null && vipDaysLeft > 0 ? `${vipDaysLeft} days left` : '⚠️ Expired — you can renew'}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* How it works */}
              <div className="space-y-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">How it works</p>
                {[
                  { step: '1', text: 'Send USDT (TRC20) to the wallet address below' },
                  { step: '2', text: 'Contact support with your TX ID' },
                  { step: '3', text: 'Your VIP membership will be activated within 24 hours' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3 bg-[#2B3139] rounded-xl p-3">
                    <div className="w-6 h-6 rounded-full bg-[#F0B90B] text-black text-xs font-black flex items-center justify-center flex-shrink-0">{s.step}</div>
                    <p className="text-gray-300 text-sm">{s.text}</p>
                  </div>
                ))}
              </div>

              {/* Wallet address */}
              <div className="bg-[#2B3139] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">USDT TRC20 Wallet Address</p>
                </div>
                <div className="bg-[#181A20] rounded-xl p-3 flex items-center justify-between gap-2 mb-3">
                  <p className="text-white text-xs font-mono break-all leading-relaxed">
                    {userTrc20Address || 'TZE4jHmWd2jc3974xjpqd8ocxEQN46GyBU'}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userTrc20Address || 'TZE4jHmWd2jc3974xjpqd8ocxEQN46GyBU');
                      setVipPayCopied(true);
                      setTimeout(() => setVipPayCopied(false), 2000);
                    }}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#F0B90B]/20 flex items-center justify-center"
                  >
                    {vipPayCopied
                      ? <CheckCircle className="w-4 h-4 text-green-400" />
                      : <Copy className="w-4 h-4 text-[#F0B90B]" />
                    }
                  </button>
                </div>
                {vipPayCopied && <p className="text-green-400 text-xs text-center font-semibold">✅ Address copied!</p>}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-px bg-[#363D47]"></div>
                  <p className="text-gray-600 text-xs">TRC20 network only</p>
                  <div className="flex-1 h-px bg-[#363D47]"></div>
                </div>
              </div>

              {/* VIP packages info */}
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">VIP Packages</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { level: 'VIP 1–3', duration: '6–12 months', desc: 'Starter' },
                    { level: 'VIP 4–6', duration: '12–24 months', desc: 'Mid Level' },
                    { level: 'VIP 7–9', duration: '24–36 months', desc: 'Advanced' },
                    { level: 'VIP 10', duration: '36+ months', desc: 'Elite / Full Access' },
                  ].map(p => (
                    <div key={p.level} className="bg-[#2B3139] rounded-xl p-3">
                      <p className="text-[#F0B90B] text-xs font-black">{p.level}</p>
                      <p className="text-white text-xs font-semibold">{p.desc}</p>
                      <p className="text-gray-500 text-[10px]">{p.duration}</p>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 text-xs text-center mt-2">Contact support for pricing information</p>
              </div>

              {/* Contact support */}
              <button
                onClick={() => { setShowVipPayModal(false); setShowSupportModal(true); }}
                className="w-full py-4 bg-[#F0B90B] text-black rounded-2xl font-black text-base active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                💬 Contact Support
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

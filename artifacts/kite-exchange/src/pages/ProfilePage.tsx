import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';
import SupportModal from '../components/SupportModal';
import ReferralModal from '../components/ReferralModal';
import EarnModal from '../components/EarnModal';
import DepositMethodModal from '../components/DepositMethodModal';
import P2PModal from '../components/P2PModal';
import PayModal from '../components/PayModal';
import RewardsModal from '../components/RewardsModal';
import AnalyticsModal from '../components/AnalyticsModal';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { RealtimePnLService, RealtimePnL } from '../lib/realtime-pnl-service';
import {
  User, Mail, LogOut, Shield, ChevronRight, Wallet as WalletIcon, Plus, Loader2,
  ArrowLeft, QrCode, Headphones, Settings, Gift, TrendingUp, Repeat, DollarSign,
  Users, BarChart3, Lock, CheckCircle, ArrowUpRight, Calendar, Activity, Copy, Check
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
  const [balances, setBalances] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showEarn, setShowEarn] = useState(false);
  const [showDepositUSD, setShowDepositUSD] = useState(false);
  const [showP2P, setShowP2P] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
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

      const [profileResult, statsResult] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', session.user.id).maybeSingle(),
        supabase.from('user_statistics').select('*').eq('user_id', session.user.id).maybeSingle(),
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      setStatistics(statsResult.data);

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

      const balancesWithPrices = await Promise.all(
        (balanceData || []).map(async (balance) => {
          if (balance.symbol === 'USDT') {
            return { ...balance, price: 1 };
          }

          if (balance.symbol === 'EQ' || balance.symbol === 'EQL') {
            const price = priceManagerRef.current?.getPrice() || 0;
            return { ...balance, price };
          }

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-proxy?symbol=${balance.symbol}USDT`,
              {
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                signal: controller.signal
              }
            );
            clearTimeout(timeoutId);

            const priceData = await response.json();
            return {
              ...balance,
              price: parseFloat(priceData.price || '0')
            };
          } catch (error) {
            console.warn(`Failed to fetch price for ${balance.symbol}:`, error);
            return { ...balance, price: 0 };
          }
        })
      );

      setBalances(balancesWithPrices);
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

  const totalBalanceUSD = realtimePnL.currentTotalValue > 0
    ? realtimePnL.currentTotalValue
    : balances.reduce((sum, balance) => {
        const balanceValue = parseFloat(balance.balance) || 0;
        const price = balance.price || (balance.symbol === 'USDT' ? 1 : 0);
        return sum + (balanceValue * price);
      }, 0);

  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';

  return (
    <div className="min-h-screen bg-[#181A20] pb-20">
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
            <Headphones className="w-6 h-6" strokeWidth={2.5} />
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

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${ profile?.verification_status === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-[#F0B90B] text-black' }`}>
                    {profile?.verification_status === 'verified' ? 'Verified' : 'Regular'}
                  </span>
                  {profile?.is_admin && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 mt-2" />
          </div>
        </div>

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

            <button onClick={() => setShowDepositUSD(true)} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
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

            <button onClick={() => setShowDepositUSD(true)} className="bg-[#1E2329] rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95">
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
          <button onClick={() => setShowSupportModal(true)} className="w-full bg-[#1E2329] text-[#F5F5F5] rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-400" />
              </div>
              <span className="font-medium">Security & Privacy</span>
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode="login"
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
    </div>
  );
}

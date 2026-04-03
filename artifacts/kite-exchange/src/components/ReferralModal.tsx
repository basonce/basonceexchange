import { useState, useEffect } from 'react';
import { X, Copy, Share2, Check, QrCode, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({
    total_referrals: 0,
    active_referrals: 0,
    total_earnings: 0,
    this_month_earnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: statsData } = await supabase.rpc('get_referral_stats', { p_user_id: user.id });
      if (statsData) {
        setReferralCode(statsData.referral_code || '');
        setStats({
          total_referrals: statsData.total_referrals || 0,
          active_referrals: statsData.active_referrals || 0,
          total_earnings: statsData.total_earnings || 0,
          this_month_earnings: statsData.this_month_earnings || 0,
        });
      } else {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('referral_code')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) setReferralCode(profile.referral_code || '');
      }
    } catch (e) {
      console.error('Error loading referral data:', e);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BASONCE Exchange',
          text: `Trade crypto on BASONCE and we both earn! Use my referral code: ${referralCode}`,
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-[#181A20] w-full rounded-t-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#181A20] border-b border-[#2B3139] px-4 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">Referral Program</h2>
            <p className="text-xs text-gray-400">Earn 20% USDT commission per trade</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-[#2B3139] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          <div className="bg-gradient-to-br from-[#F0B90B]/10 to-transparent px-4 pt-5 pb-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-white">
                  {loading ? '—' : stats.total_referrals}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Friends</div>
              </div>
              <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-[#0ECB81]">
                  {loading ? '—' : stats.active_referrals}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Active</div>
              </div>
              <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-3 text-center">
                <div className="text-lg font-black text-[#F0B90B]">
                  {loading ? '—' : `$${fmt(stats.total_earnings)}`}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Earned</div>
              </div>
            </div>

            {!loading && stats.this_month_earnings > 0 && (
              <div className="bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-xl px-3 py-2 text-center">
                <span className="text-xs text-[#0ECB81] font-bold">
                  +${fmt(stats.this_month_earnings)} this month
                </span>
              </div>
            )}
          </div>

          <div className="px-4 space-y-3">
            <div className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-white">Your Code</div>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR
                </button>
              </div>

              {showQR ? (
                <div className="flex justify-center py-4">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeSVG value={referralLink} size={160} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-[#181A20] border border-[#2B3139] rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
                    <span className="text-xl font-black tracking-widest text-[#F0B90B]">{referralCode || '...'}</span>
                    <button onClick={copyCode} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="bg-[#181A20] border border-[#2B3139] rounded-xl px-3 py-2.5 mb-3">
                    <div className="text-xs text-gray-500 mb-1">Referral Link</div>
                    <div className="text-xs text-gray-300 break-all">{referralLink}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={copyLink}
                      className="flex items-center justify-center gap-2 py-3 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-bold rounded-xl text-sm transition-all active:scale-95"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={shareLink}
                      className="flex items-center justify-center gap-2 py-3 bg-[#2B3139] hover:bg-[#363D47] text-white font-bold rounded-xl text-sm transition-all active:scale-95"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-4">
              <div className="text-sm font-bold text-white mb-3">Commission Tiers</div>
              <div className="space-y-2">
                {[
                  { label: 'Standard', range: '0-9 friends', rate: '20%', active: stats.total_referrals < 10 },
                  { label: 'Silver', range: '10-49 friends', rate: '22%', active: stats.total_referrals >= 10 && stats.total_referrals < 50 },
                  { label: 'Gold', range: '50-99 friends', rate: '23%', active: stats.total_referrals >= 50 && stats.total_referrals < 100 },
                  { label: 'Platinum', range: '100+ friends', rate: '25%', active: stats.total_referrals >= 100 },
                ].map(tier => (
                  <div key={tier.label} className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${tier.active ? 'bg-[#F0B90B]/10 border border-[#F0B90B]/20' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${tier.active ? 'text-[#F0B90B]' : 'text-gray-400'}`}>{tier.label}</span>
                      <span className="text-xs text-gray-600">{tier.range}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`font-black text-sm ${tier.active ? 'text-[#F0B90B]' : 'text-gray-500'}`}>{tier.rate}</span>
                      {tier.active && <ChevronRight className="w-3.5 h-3.5 text-[#F0B90B]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-4">
              <div className="text-sm font-bold text-white mb-3">How It Works</div>
              <div className="space-y-3">
                {[
                  { num: '1', text: 'Share your referral link or code with friends' },
                  { num: '2', text: 'They sign up and start trading on BASONCE' },
                  { num: '3', text: 'Earn 20% of their trading fees in USDT, forever' },
                ].map(step => (
                  <div key={step.num} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#F0B90B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-black text-[#F0B90B]">{step.num}</span>
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed">{step.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

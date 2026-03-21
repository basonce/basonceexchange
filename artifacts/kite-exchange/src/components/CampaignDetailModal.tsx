import { useEffect, useState, useCallback } from 'react';
import { X, Clock, Users, Trophy, CheckCircle2, Flame, Coins, TrendingUp, Shield, Zap, Star, BarChart3, Loader2, Check, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface CampaignDetailData {
  id: string;
  title: string;
  description: string;
  reward_type: string;
  reward_amount: number;
  reward_label: string;
  badge_color: string;
  campaign_type: string;
  participants: number;
  max_participants: number | null;
  ends_at: string | null;
  duration_hours?: number;
  requirements: { text: string }[];
  claim_type?: string;
  claim_condition?: { type: string; description?: string; min_amount?: number; min_count?: number } | null;
  claim_reward_usdt?: number;
  claim_reward_eq?: number;
}

interface Props {
  campaign: CampaignDetailData | null;
  onClose: () => void;
}

const THEME_MAP: Record<string, { gradientFull: string; accent: string; progressBg: string }> = {
  yellow: { gradientFull: 'from-[#F0B90B] via-[#F8C832] to-[#E6A800]', accent: '#F0B90B', progressBg: 'bg-[#F0B90B]' },
  green:  { gradientFull: 'from-[#0ECB81] via-[#06B96E] to-[#059669]', accent: '#0ECB81', progressBg: 'bg-[#0ECB81]' },
  blue:   { gradientFull: 'from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]', accent: '#3B82F6', progressBg: 'bg-[#3B82F6]' },
  orange: { gradientFull: 'from-[#F97316] via-[#EA580C] to-[#C2410C]', accent: '#F97316', progressBg: 'bg-[#F97316]' },
  cyan:   { gradientFull: 'from-[#06B6D4] via-[#0891B2] to-[#0E7490]', accent: '#06B6D4', progressBg: 'bg-[#06B6D4]' },
  pink:   { gradientFull: 'from-[#EC4899] via-[#DB2777] to-[#BE185D]', accent: '#EC4899', progressBg: 'bg-[#EC4899]' },
};

const TYPE_LABEL: Record<string, string> = {
  trading: 'Trading', deposit: 'Deposit', referral: 'Referral',
  mining: 'Mining', social: 'Social',
};

function getCampaignIcon(type: string) {
  switch (type) {
    case 'deposit':  return <Shield className="w-6 h-6" />;
    case 'referral': return <Users className="w-6 h-6" />;
    case 'mining':   return <Zap className="w-6 h-6" />;
    case 'social':   return <Star className="w-6 h-6" />;
    case 'trading':  return <BarChart3 className="w-6 h-6" />;
    default:         return <TrendingUp className="w-6 h-6" />;
  }
}

function getCyclicEndTime(endsAt: string, durationHours: number): number {
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  if (end > now) return end;
  const cycleMs = durationHours * 3600000;
  const elapsed = now - end;
  const cycles = Math.ceil(elapsed / cycleMs);
  return end + cycles * cycleMs;
}

function useCountdown(endsAt: string | null, durationHours = 24) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick;
  if (!endsAt) return null;
  const targetMs = getCyclicEndTime(endsAt, durationHours);
  const diff = targetMs - Date.now();
  if (diff <= 0) return null;
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs, urgent: diff < 3 * 86400000 };
}

function TimerBox({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg"
        style={{ backgroundColor: accent + '22', color: accent, border: `1px solid ${accent}44` }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[10px] text-gray-500 mt-1 font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

type ClaimState = 'idle' | 'loading' | 'checking' | 'claimed' | 'already_claimed' | 'condition_not_met' | 'not_logged_in' | 'leaderboard';

export default function CampaignDetailModal({ campaign, onClose }: Props) {
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [claimMsg, setClaimMsg] = useState('');
  const countdown = useCountdown(campaign?.ends_at ?? null, campaign?.duration_hours ?? 24);

  useEffect(() => {
    if (campaign) {
      document.body.style.overflow = 'hidden';
      setClaimState('idle');
      setClaimMsg('');
      checkClaimStatus(campaign);
    }
    return () => { document.body.style.overflow = ''; };
  }, [campaign?.id]);

  const checkClaimStatus = useCallback(async (c: CampaignDetailData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setClaimState('not_logged_in'); return; }

    if (c.claim_type === 'leaderboard') { setClaimState('leaderboard'); return; }

    const { data: existing } = await supabase
      .from('user_campaign_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('campaign_id', c.id)
      .maybeSingle();

    if (existing) { setClaimState('already_claimed'); return; }
    setClaimState('idle');
  }, []);

  const handleClaim = async () => {
    if (!campaign) return;
    setClaimState('checking');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setClaimState('not_logged_in'); return; }

    if (campaign.claim_type === 'leaderboard') { setClaimState('leaderboard'); return; }

    const { data: existing } = await supabase
      .from('user_campaign_claims')
      .select('id')
      .eq('user_id', user.id)
      .eq('campaign_id', campaign.id)
      .maybeSingle();
    if (existing) { setClaimState('already_claimed'); return; }

    const cond = campaign.claim_condition;
    if (cond && cond.type !== 'always' && cond.type !== 'new_user') {
      if (cond.type === 'deposit_made') {
        const { data: tx } = await supabase
          .from('transactions')
          .select('id, amount')
          .eq('user_id', user.id)
          .eq('type', 'deposit')
          .gte('amount', cond.min_amount ?? 0)
          .maybeSingle();
        if (!tx) {
          setClaimState('condition_not_met');
          setClaimMsg(cond.description ?? `Make a deposit of at least $${cond.min_amount} to claim`);
          return;
        }
      } else if (cond.type === 'has_referral') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('referral_count')
          .eq('user_id', user.id)
          .maybeSingle();
        const count = (profile as { referral_count?: number } | null)?.referral_count ?? 0;
        if (count < (cond.min_count ?? 1)) {
          setClaimState('condition_not_met');
          setClaimMsg(cond.description ?? `Refer ${cond.min_count} friends to claim`);
          return;
        }
      }
    }

    setClaimState('loading');

    const rewardUsdt = campaign.claim_reward_usdt ?? 0;
    const rewardEq = campaign.claim_reward_eq ?? 0;

    const { error: claimError } = await supabase
      .from('user_campaign_claims')
      .insert({ user_id: user.id, campaign_id: campaign.id, reward_usdt: rewardUsdt, reward_eq: rewardEq });

    if (claimError) {
      if (claimError.code === '23505') { setClaimState('already_claimed'); return; }
      setClaimState('idle');
      return;
    }

    if (rewardUsdt > 0) {
      const { data: bal } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .maybeSingle();
      const current = Number((bal as { balance?: number } | null)?.balance ?? 0);
      await supabase
        .from('user_balances')
        .upsert({ user_id: user.id, symbol: 'USDT', balance: current + rewardUsdt }, { onConflict: 'user_id,symbol' });
    }

    if (rewardEq > 0) {
      const { data: bal } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('symbol', 'EQ')
        .maybeSingle();
      const current = Number((bal as { balance?: number } | null)?.balance ?? 0);
      await supabase
        .from('user_balances')
        .upsert({ user_id: user.id, symbol: 'EQ', balance: current + rewardEq }, { onConflict: 'user_id,symbol' });
    }

    await supabase
      .from('campaigns')
      .update({ participants: campaign.participants + 1 })
      .eq('id', campaign.id);

    let msg = 'Reward claimed!';
    if (rewardUsdt > 0 && rewardEq > 0) msg = `+$${rewardUsdt} USDT & +${rewardEq} EQ added to your balance!`;
    else if (rewardUsdt > 0) msg = `+$${rewardUsdt} USDT added to your balance!`;
    else if (rewardEq > 0) msg = `+${rewardEq} EQ added to your balance!`;
    setClaimMsg(msg);
    setClaimState('claimed');
  };

  if (!campaign) return null;

  const theme = THEME_MAP[campaign.badge_color] || THEME_MAP.yellow;
  const progress = campaign.max_participants
    ? Math.min((campaign.participants / campaign.max_participants) * 100, 100)
    : Math.min(55 + (campaign.participants % 40), 95);
  const fillPct = campaign.max_participants ? Math.round(progress) : null;

  const isInstantOrMilestone = campaign.claim_type === 'instant' || campaign.claim_type === 'milestone';
  const rewardPreview = (() => {
    const u = campaign.claim_reward_usdt ?? 0;
    const e = campaign.claim_reward_eq ?? 0;
    if (u > 0 && e > 0) return `$${u} USDT + ${e} EQ`;
    if (u > 0) return `$${u} USDT`;
    if (e > 0) return `${e} EQ`;
    return campaign.reward_label;
  })();

  const btnContent = (() => {
    switch (claimState) {
      case 'loading':
      case 'checking':
        return (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </span>
        );
      case 'claimed':
        return (
          <span className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            Claimed!
          </span>
        );
      case 'already_claimed':
        return (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Already Claimed
          </span>
        );
      case 'condition_not_met':
        return (
          <span className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Condition Not Met
          </span>
        );
      case 'not_logged_in':
        return (
          <span className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Login to Claim
          </span>
        );
      case 'leaderboard':
        return (
          <span className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Participate in Campaign
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            {isInstantOrMilestone ? `Claim ${rewardPreview}` : 'Join Campaign'}
          </span>
        );
    }
  })();

  const btnDisabled = claimState === 'loading' || claimState === 'checking' || claimState === 'claimed' || claimState === 'already_claimed';
  const btnStyle = claimState === 'claimed'
    ? { background: '#0ECB81', color: '#fff' }
    : claimState === 'already_claimed' || claimState === 'condition_not_met'
    ? { background: '#2B3139', color: '#848E9C' }
    : { background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`, color: '#0B0E11', boxShadow: `0 6px 24px ${theme.accent}44` };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ background: '#0B0E11', height: 'calc(100% - 64px)' }}
      >
        <div className="flex-1 overflow-y-auto">
          <div className={`bg-gradient-to-br ${theme.gradientFull} relative overflow-hidden flex-shrink-0`}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl transform translate-x-20 -translate-y-20" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/20 blur-2xl transform -translate-x-12 translate-y-12" />
            </div>

            <div className="relative px-4 pt-12 pb-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30">
                  {getCampaignIcon(campaign.campaign_type)}
                </div>
                <div>
                  <span className="inline-block text-[10px] font-black px-2.5 py-1 rounded-full bg-white/25 text-white backdrop-blur-sm border border-white/30 leading-none">
                    {(TYPE_LABEL[campaign.campaign_type] || 'Campaign').toUpperCase()}
                  </span>
                  {campaign.claim_type === 'instant' && (
                    <div className="flex items-center gap-1 mt-1">
                      <Zap className="w-3 h-3 text-white" />
                      <span className="text-[10px] text-white/90 font-bold">INSTANT REWARD</span>
                    </div>
                  )}
                  {countdown?.urgent && (
                    <div className="flex items-center gap-1 mt-1">
                      <Flame className="w-3 h-3 text-white animate-pulse" />
                      <span className="text-[10px] text-white/80 font-bold">ENDING SOON</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-white/70 text-sm font-medium mb-1">{campaign.reward_label}</div>
              <div className="font-black text-white text-3xl leading-tight mb-3 drop-shadow-lg">{campaign.title}</div>
              <p className="text-white/80 text-sm leading-relaxed">{campaign.description}</p>
            </div>
          </div>

          <div className="px-4 py-5 space-y-6" style={{ background: '#0B0E11' }}>

            {isInstantOrMilestone && (
              <div
                className="rounded-2xl p-4 border flex items-center gap-3"
                style={{ background: theme.accent + '11', borderColor: theme.accent + '33' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: theme.accent + '22' }}
                >
                  <Coins className="w-5 h-5" style={{ color: theme.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold mb-0.5" style={{ color: theme.accent }}>
                    {campaign.claim_type === 'instant' ? 'Instant Reward' : 'Milestone Reward'}
                  </div>
                  <div className="font-black text-white text-lg leading-tight">{rewardPreview}</div>
                  {campaign.claim_condition?.description && (
                    <div className="text-gray-400 text-xs mt-0.5">{campaign.claim_condition.description}</div>
                  )}
                </div>
                {claimState === 'claimed' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#0ECB81] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {claimMsg && (
              <div
                className={`rounded-xl p-3 flex items-center gap-2 text-sm font-semibold ${claimState === 'claimed' ? 'bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81]' : 'bg-[#F6465D]/15 border border-[#F6465D]/30 text-[#F6465D]'}`}
              >
                {claimState === 'claimed' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {claimMsg}
              </div>
            )}

            {countdown && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-sm font-bold" style={{ color: theme.accent }}>Time Remaining</span>
                </div>
                <div className="flex items-center gap-3">
                  {countdown.days > 0 && <TimerBox value={countdown.days} label="days" accent={theme.accent} />}
                  <TimerBox value={countdown.hours} label="hrs" accent={theme.accent} />
                  <TimerBox value={countdown.mins} label="min" accent={theme.accent} />
                  {countdown.days === 0 && <TimerBox value={countdown.secs} label="sec" accent={theme.accent} />}
                </div>
              </div>
            )}

            {!campaign.ends_at && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0ECB81] animate-pulse" />
                <span className="text-sm text-[#0ECB81] font-semibold">Ongoing Campaign</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{campaign.participants.toLocaleString()} participants</span>
                  {campaign.max_participants && (
                    <span className="text-gray-600">/ {campaign.max_participants.toLocaleString()}</span>
                  )}
                </div>
                {fillPct !== null && (
                  <span className="text-sm font-bold" style={{ color: theme.accent }}>{fillPct}% filled</span>
                )}
              </div>
              <div className="w-full bg-[#2B3139] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${theme.progressBg}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {campaign.requirements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-sm font-bold text-white">How to Participate</span>
                </div>
                <div className="space-y-3">
                  {campaign.requirements.map((req, i) => (
                    <div key={i} className="flex items-start gap-3 bg-[#1E2026] rounded-xl p-3 border border-[#2B3139]">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-black text-xs"
                        style={{ backgroundColor: theme.accent + '22', color: theme.accent, border: `1px solid ${theme.accent}44` }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-300 leading-relaxed">{req.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-2" />
          </div>
        </div>

        <div className="flex-shrink-0 px-4 pb-8 pt-3" style={{ background: '#0B0E11', borderTop: '1px solid #2B3139' }}>
          <button
            onClick={handleClaim}
            disabled={btnDisabled}
            className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center disabled:active:scale-100 disabled:cursor-default"
            style={btnStyle}
          >
            {btnContent}
          </button>
          {claimState === 'idle' && isInstantOrMilestone && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <CheckCircle2 className="w-3 h-3 text-[#0ECB81]" />
              <span className="text-[#848E9C] text-[11px]">Reward credited instantly to your balance</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

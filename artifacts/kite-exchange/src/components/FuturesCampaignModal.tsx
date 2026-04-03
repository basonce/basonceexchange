import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, Gift, Trophy, TrendingUp, Users, Star, CheckCircle, Info, Zap, Coins, Check, Loader2, AlertCircle, Lock, CheckCircle2 } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import type { CampaignDetailData } from './CampaignDetailModal';

interface FuturesCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ClaimState = 'idle' | 'loading' | 'checking' | 'claimed' | 'already_claimed' | 'condition_not_met' | 'not_logged_in' | 'leaderboard';

const THEME_MAP: Record<string, { accent: string; gradientFrom: string }> = {
  yellow: { accent: '#F0B90B', gradientFrom: 'from-[#F0B90B]/10' },
  green:  { accent: '#0ECB81', gradientFrom: 'from-[#0ECB81]/10' },
  blue:   { accent: '#3B82F6', gradientFrom: 'from-[#3B82F6]/10' },
  orange: { accent: '#F97316', gradientFrom: 'from-[#F97316]/10' },
  cyan:   { accent: '#06B6D4', gradientFrom: 'from-[#06B6D4]/10' },
  pink:   { accent: '#EC4899', gradientFrom: 'from-[#EC4899]/10' },
};

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
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function ClaimableCard({ campaign, onClose }: { campaign: CampaignDetailData; onClose: () => void }) {
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [claimMsg, setClaimMsg] = useState('');
  const theme = THEME_MAP[campaign.badge_color] || THEME_MAP.yellow;
  const countdown = useCountdown(campaign.ends_at, (campaign as CampaignDetailData & { duration_hours?: number }).duration_hours ?? 24);

  useEffect(() => {
    setClaimState('idle');
    setClaimMsg('');
    (async () => {
      const user = await getCurrentUser();
      if (!user) { setClaimState('not_logged_in'); return; }
      if (campaign.claim_type === 'leaderboard') { setClaimState('leaderboard'); return; }
      const { data } = await supabase
        .from('user_campaign_claims')
        .select('id')
        .eq('user_id', user.id)
        .eq('campaign_id', campaign.id)
        .maybeSingle();
      if (data) setClaimState('already_claimed');
    })();
  }, [campaign.id]);

  const handleClaim = async () => {
    setClaimState('checking');
    const user = await getCurrentUser();
    if (!user) { setClaimState('not_logged_in'); return; }

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
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'deposit')
          .gte('amount', cond.min_amount ?? 0)
          .maybeSingle();
        if (!tx) {
          setClaimState('condition_not_met');
          setClaimMsg(cond.description ?? `Make a deposit of $${cond.min_amount}+ first`);
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
          setClaimMsg(cond.description ?? `Refer ${cond.min_count} friends first`);
          return;
        }
      }
    }

    setClaimState('loading');
    const rewardUsdt = campaign.claim_reward_usdt ?? 0;
    const rewardEq = campaign.claim_reward_eq ?? 0;

    const { error } = await supabase
      .from('user_campaign_claims')
      .insert({ user_id: user.id, campaign_id: campaign.id, reward_usdt: rewardUsdt, reward_eq: rewardEq });

    if (error) {
      if (error.code === '23505') { setClaimState('already_claimed'); return; }
      setClaimState('idle');
      return;
    }

    if (rewardUsdt > 0) {
      const { data: bal } = await supabase.from('user_balances').select('balance').eq('user_id', user.id).eq('symbol', 'USDT').maybeSingle();
      const cur = Number((bal as { balance?: number } | null)?.balance ?? 0);
      await supabase.from('user_balances').update({ balance: cur + rewardUsdt }).eq('user_id', user.id).eq('symbol', 'USDT');
    }
    if (rewardEq > 0) {
      const { data: bal } = await supabase.from('user_balances').select('balance').eq('user_id', user.id).eq('symbol', 'EQ').maybeSingle();
      const cur = Number((bal as { balance?: number } | null)?.balance ?? 0);
      await supabase.from('user_balances').update({ balance: cur + rewardEq }).eq('user_id', user.id).eq('symbol', 'EQ');
    }

    let msg = 'Reward claimed!';
    if (rewardUsdt > 0 && rewardEq > 0) msg = `+$${rewardUsdt} USDT & +${rewardEq} EQ added!`;
    else if (rewardUsdt > 0) msg = `+$${rewardUsdt} USDT added to your balance!`;
    else if (rewardEq > 0) msg = `+${rewardEq} EQ added to your balance!`;
    setClaimMsg(msg);
    setClaimState('claimed');
  };

  const u = campaign.claim_reward_usdt ?? 0;
  const e = campaign.claim_reward_eq ?? 0;
  const rewardPreview = u > 0 && e > 0 ? `$${u} USDT + ${e} EQ` : u > 0 ? `$${u} USDT` : e > 0 ? `${e} EQ` : campaign.reward_label;
  const isClaimable = campaign.claim_type === 'instant' || campaign.claim_type === 'milestone';
  const btnDisabled = claimState === 'loading' || claimState === 'checking' || claimState === 'claimed' || claimState === 'already_claimed';

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4 border"
        style={{ background: theme.accent + '0D', borderColor: theme.accent + '33' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: theme.accent + '22' }}>
            <Gift className="w-5 h-5" style={{ color: theme.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold mb-0.5" style={{ color: theme.accent }}>
              {campaign.claim_type === 'instant' ? 'Instant Reward' : campaign.claim_type === 'milestone' ? 'Milestone Reward' : 'Leaderboard Prize'}
            </div>
            <div className="font-black text-white text-base leading-tight truncate">{campaign.title}</div>
          </div>
        </div>

        {isClaimable && (
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Your Reward</div>
              <div className="font-black text-xl" style={{ color: theme.accent }}>{rewardPreview}</div>
            </div>
            {campaign.claim_condition?.description && (
              <div className="text-right max-w-[140px]">
                <div className="text-xs text-gray-400 leading-relaxed">{campaign.claim_condition.description}</div>
              </div>
            )}
          </div>
        )}

        {countdown && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" style={{ color: theme.accent }} />
            <span style={{ color: theme.accent }}>
              {countdown.d > 0 ? `${countdown.d}d ` : ''}{String(countdown.h).padStart(2,'0')}:{String(countdown.m).padStart(2,'0')}:{String(countdown.s).padStart(2,'0')} remaining
            </span>
          </div>
        )}
      </div>

      {campaign.requirements.length > 0 && (
        <div className="space-y-2">
          {campaign.requirements.map((req, i) => (
            <div key={i} className="flex items-start gap-2 bg-[#1A1D26] rounded-xl p-3 border border-[#2B3139]">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-black text-[10px] mt-0.5"
                style={{ background: theme.accent + '22', color: theme.accent, border: `1px solid ${theme.accent}44` }}
              >
                {i + 1}
              </div>
              <span className="text-xs text-gray-300 leading-relaxed">{req.text}</span>
            </div>
          ))}
        </div>
      )}

      {claimMsg && (
        <div className={`rounded-xl p-3 flex items-center gap-2 text-sm font-semibold ${claimState === 'claimed' ? 'bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81]' : 'bg-[#F6465D]/15 border border-[#F6465D]/30 text-[#F6465D]'}`}>
          {claimState === 'claimed' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {claimMsg}
        </div>
      )}

      <button
        onClick={isClaimable ? handleClaim : onClose}
        disabled={btnDisabled}
        className="w-full py-3.5 rounded-xl font-black text-[15px] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:active:scale-100 disabled:cursor-default"
        style={
          claimState === 'claimed' ? { background: '#0ECB81', color: '#fff' }
          : claimState === 'already_claimed' || claimState === 'condition_not_met' ? { background: '#2B3139', color: '#848E9C' }
          : { background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`, color: '#0B0E11', boxShadow: `0 4px 15px ${theme.accent}44` }
        }
      >
        {claimState === 'loading' || claimState === 'checking' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
        ) : claimState === 'claimed' ? (
          <><Check className="w-4 h-4" /> Claimed!</>
        ) : claimState === 'already_claimed' ? (
          <><CheckCircle className="w-4 h-4" /> Already Claimed</>
        ) : claimState === 'condition_not_met' ? (
          <><Lock className="w-4 h-4" /> Condition Not Met</>
        ) : claimState === 'not_logged_in' ? (
          <><AlertCircle className="w-4 h-4" /> Login to Claim</>
        ) : isClaimable ? (
          <><Coins className="w-4 h-4" /> Claim {rewardPreview}</>
        ) : (
          <><TrendingUp className="w-4 h-4" /> Trade & Participate</>
        )}
      </button>
    </div>
  );
}

const STATIC_SLIDES = [
  {
    id: 'futures-race',
    type: 'static' as const,
    badge: 'TRADING',
    badgeColor: '#F0B90B',
    title: 'Trade Futures & Win',
    subtitle: '110M PUMP + 920K KITE Prize Pool',
    stats: [
      { label: 'Total Prize Pool', value: '110M PUMP', color: '#F0B90B' },
      { label: 'KITE Rewards', value: '920K KITE', color: '#0ECB81' },
      { label: 'Participants', value: '14,382', color: '#3B82F6' },
      { label: 'Days Left', value: '12', color: '#F6465D' },
    ],
    endsAt: new Date(Date.now() + 12 * 86400000).toISOString(),
    prizes: [
      { rank: '1st Place', amount: '15,000,000 PUMP', color: '#F0B90B' },
      { rank: '2nd Place', amount: '8,000,000 PUMP', color: '#B0B8C1' },
      { rank: '3rd Place', amount: '4,000,000 PUMP', color: '#CD7F32' },
      { rank: 'Top 10', amount: '1,000,000 PUMP each', color: '#0ECB81' },
    ],
  },
  {
    id: 'fee-discount',
    type: 'static' as const,
    badge: 'FEES',
    badgeColor: '#0ECB81',
    title: 'Zero Maker Fees — Full Week',
    subtitle: '0% Maker Fee + 50% Taker Discount',
    stats: [
      { label: 'Maker Fee', value: '0.000%', color: '#0ECB81' },
      { label: 'Taker Discount', value: '50% OFF', color: '#F0B90B' },
      { label: 'Eligible', value: 'All Users', color: '#3B82F6' },
      { label: 'Duration', value: '7 Days', color: '#F6465D' },
    ],
    endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    prizes: [
      { rank: 'Maker Fee', amount: '0.000% (Free)', color: '#0ECB81' },
      { rank: 'Taker Fee', amount: '0.025% (50% off)', color: '#F0B90B' },
      { rank: 'All Pairs', amount: 'USDT-M Futures', color: '#3B82F6' },
      { rank: 'Duration', amount: '7 days full week', color: '#848E9C' },
    ],
  },
];

function StaticSlide({ slide, onClose }: { slide: typeof STATIC_SLIDES[0]; onClose: () => void }) {
  const countdown = useCountdown(slide.endsAt);
  return (
    <div className="space-y-4">
      <div className="bg-[#0B0E11] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[#F6465D]" />
          <span className="text-[#848E9C] text-[12px]">Campaign ends in</span>
          {countdown && (
            <div className="flex gap-1 ml-auto">
              {[
                String(countdown.d > 0 ? countdown.d : countdown.h).padStart(2, '0'),
                String(countdown.d > 0 ? countdown.h : countdown.m).padStart(2, '0'),
                String(countdown.d > 0 ? countdown.m : countdown.s).padStart(2, '0'),
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-0.5">
                  <div className="bg-[#2B3139] rounded px-1.5 py-0.5 text-white font-bold text-[13px] font-mono">{t}</div>
                  {i < 2 && <span className="text-[#848E9C] text-[12px]">:</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {slide.stats.map(({ label, value, color }) => (
            <div key={label} className="bg-[#181A20] rounded-lg p-2.5">
              <div className="text-[#848E9C] text-[10px] mb-1">{label}</div>
              <div className="font-bold text-[14px]" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0B0E11] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-[#F0B90B]" />
          <span className="text-white font-bold text-[14px]">Prize Breakdown</span>
        </div>
        <div className="space-y-2">
          {slide.prizes.map(({ rank, amount, color }) => (
            <div key={rank} className="flex items-center justify-between py-2 border-b border-[#2B3139] last:border-0">
              <span className="text-[#848E9C] text-[13px]">{rank}</span>
              <span className="font-bold text-[13px]" style={{ color }}>{amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0B0E11] rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-[#3B82F6] mt-0.5 flex-shrink-0" />
        <span className="text-[#848E9C] text-[12px] leading-relaxed">
          Rewards distributed within 7 business days after campaign ends. Tokens credited directly to your Spot Wallet.
        </span>
      </div>

      <button
        onClick={onClose}
        className="w-full bg-[#F0B90B] text-black font-bold text-[15px] py-3.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        <TrendingUp className="w-4 h-4" />
        Start Trading Now
      </button>
      <div className="flex items-center justify-center gap-1.5">
        <CheckCircle className="w-3 h-3 text-[#0ECB81]" />
        <span className="text-[#848E9C] text-[11px]">You are eligible to participate</span>
      </div>
    </div>
  );
}

export default function FuturesCampaignModal({ isOpen, onClose }: FuturesCampaignModalProps) {
  const [slide, setSlide] = useState(0);
  const [dbCampaigns, setDbCampaigns] = useState<CampaignDetailData[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setSlide(0);
    supabase
      .from('campaigns')
      .select('*, claim_type, claim_condition, claim_reward_usdt, claim_reward_eq, duration_hours')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setDbCampaigns(data.map(c => ({ ...c, requirements: Array.isArray(c.requirements) ? c.requirements : [] })));
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const totalSlides = STATIC_SLIDES.length + dbCampaigns.length;
  const clampedSlide = slide % totalSlides;
  const isStaticSlide = clampedSlide < STATIC_SLIDES.length;
  const staticSlide = isStaticSlide ? STATIC_SLIDES[clampedSlide] : null;
  const dbCampaign = !isStaticSlide ? dbCampaigns[clampedSlide - STATIC_SLIDES.length] : null;

  const prev = () => setSlide(s => (s - 1 + totalSlides) % totalSlides);
  const next = () => setSlide(s => (s + 1) % totalSlides);

  const currentBadgeColor = staticSlide ? staticSlide.badgeColor : (dbCampaign ? (THEME_MAP[dbCampaign.badge_color]?.accent ?? '#F0B90B') : '#F0B90B');
  const currentTitle = staticSlide ? staticSlide.title : (dbCampaign?.title ?? '');
  const currentSubtitle = staticSlide ? staticSlide.subtitle : (dbCampaign?.description?.slice(0, 60) + '...' ?? '');

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center pb-16" onClick={onClose}>
      <div
        className="bg-[#1E2329] w-full max-w-lg rounded-t-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 144px)', minHeight: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${currentBadgeColor}15, transparent 60%)` }} />
          <div className="relative px-4 pt-5 pb-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: currentBadgeColor + '22' }}>
                  <Star className="w-4 h-4" style={{ color: currentBadgeColor }} />
                </div>
                <div>
                  <div className="text-white font-bold text-[16px]">{currentTitle}</div>
                  <div className="text-[#848E9C] text-[11px] truncate max-w-[200px]">{currentSubtitle}</div>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#848E9C]" />
              </button>
            </div>

            {totalSlides > 1 && (
              <div className="flex items-center justify-between mb-4">
                <button onClick={prev} className="w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center hover:bg-[#363C45] transition-colors">
                  <ChevronLeft className="w-4 h-4 text-gray-300" />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={`transition-all duration-300 rounded-full ${i === clampedSlide ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-[#474D57]'}`}
                    />
                  ))}
                </div>
                <button onClick={next} className="w-8 h-8 rounded-lg bg-[#2B3139] flex items-center justify-center hover:bg-[#363C45] transition-colors">
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-6 pt-2">
          {staticSlide && <StaticSlide slide={staticSlide} onClose={onClose} />}
          {dbCampaign && <ClaimableCard campaign={dbCampaign} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

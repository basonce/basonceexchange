import { useState, useEffect } from 'react';
import { Gift, Users, Clock, Zap, TrendingUp, Star, Award, Shield, Flame, Trophy, Coins, BarChart3, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CampaignDetailModal, { type CampaignDetailData } from './CampaignDetailModal';

interface Campaign {
  id: string;
  title: string;
  description: string;
  reward_type: string;
  reward_amount: number;
  reward_label: string;
  badge_color: string;
  banner_gradient: string;
  coin_symbol: string | null;
  participants: number;
  max_participants: number | null;
  ends_at: string | null;
  duration_hours?: number;
  campaign_type: string;
  requirements: { text: string }[];
  created_at: string;
  claim_type?: string;
  claim_condition?: { type: string; description?: string; min_amount?: number; min_count?: number } | null;
  claim_reward_usdt?: number;
  claim_reward_eq?: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  label: string;
  urgent: boolean;
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

function useCountdown(endsAt: string | null, durationHours = 24): TimeLeft {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick;

  if (!endsAt) return { days: 0, hours: 0, mins: 0, secs: 0, label: 'Ongoing', urgent: false };
  const targetMs = getCyclicEndTime(endsAt, durationHours);
  const diff = targetMs - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, label: 'Starting soon', urgent: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const urgent = diff < 3 * 86400000;
  const label = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m ${secs}s`;
  return { days, hours, mins, secs, label, urgent };
}

const THEME_MAP: Record<string, {
  gradientFull: string;
  accent: string;
  glow: string;
  progressBg: string;
}> = {
  yellow: { gradientFull: 'from-[#F0B90B] via-[#F8C832] to-[#E6A800]', accent: '#F0B90B', glow: 'shadow-[0_0_30px_rgba(240,185,11,0.25)]', progressBg: 'bg-[#F0B90B]' },
  green:  { gradientFull: 'from-[#0ECB81] via-[#06B96E] to-[#059669]', accent: '#0ECB81', glow: 'shadow-[0_0_30px_rgba(14,203,129,0.25)]', progressBg: 'bg-[#0ECB81]' },
  blue:   { gradientFull: 'from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]', accent: '#3B82F6', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.25)]', progressBg: 'bg-[#3B82F6]' },
  orange: { gradientFull: 'from-[#F97316] via-[#EA580C] to-[#C2410C]', accent: '#F97316', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.25)]', progressBg: 'bg-[#F97316]' },
  cyan:   { gradientFull: 'from-[#06B6D4] via-[#0891B2] to-[#0E7490]', accent: '#06B6D4', glow: 'shadow-[0_0_30px_rgba(6,182,212,0.25)]', progressBg: 'bg-[#06B6D4]' },
  pink:   { gradientFull: 'from-[#EC4899] via-[#DB2777] to-[#BE185D]', accent: '#EC4899', glow: 'shadow-[0_0_30px_rgba(236,72,153,0.25)]', progressBg: 'bg-[#EC4899]' },
};

function getTheme(color: string) {
  return THEME_MAP[color] || THEME_MAP.yellow;
}

function getCampaignIcon(type: string, className = 'w-5 h-5') {
  switch (type) {
    case 'deposit':  return <Shield className={className} />;
    case 'referral': return <Users className={className} />;
    case 'mining':   return <Zap className={className} />;
    case 'social':   return <Star className={className} />;
    case 'trading':  return <BarChart3 className={className} />;
    default:         return <TrendingUp className={className} />;
  }
}

function getCampaignTypeLabel(type: string) {
  const map: Record<string, string> = {
    trading: 'Trading', deposit: 'Deposit', referral: 'Referral',
    mining: 'Mining', social: 'Social',
  };
  return map[type] || 'Campaign';
}

function getProgressPercent(participants: number, max: number | null): number {
  if (!max) return Math.min(55 + (participants % 40), 95);
  return Math.min((participants / max) * 100, 100);
}

function TimerBox({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm leading-none"
        style={{ backgroundColor: accent + '22', color: accent, border: `1px solid ${accent}44` }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[9px] text-gray-500 mt-0.5 font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

function getClaimLabel(campaign: Campaign) {
  const u = campaign.claim_reward_usdt ?? 0;
  const e = campaign.claim_reward_eq ?? 0;
  if (campaign.claim_type === 'instant' || campaign.claim_type === 'milestone') {
    if (u > 0 && e > 0) return `Claim $${u} USDT + ${e} EQ`;
    if (u > 0) return `Claim $${u} USDT`;
    if (e > 0) return `Claim ${e} EQ`;
    return 'Claim Reward';
  }
  return 'Join Campaign';
}

function CampaignCard({ campaign, onOpen }: { campaign: Campaign; onOpen: () => void }) {
  const theme = getTheme(campaign.badge_color);
  const countdown = useCountdown(campaign.ends_at, campaign.duration_hours ?? 24);
  const progress = getProgressPercent(campaign.participants, campaign.max_participants);
  const fillPct = campaign.max_participants ? Math.round(progress) : null;

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-[#2B3139] hover:border-[#3B4149] transition-all duration-300 cursor-pointer active:scale-[0.98] ${theme.glow}`}
      style={{ background: '#1A1D26' }}
      onClick={onOpen}
    >
      <div className={`bg-gradient-to-br ${theme.gradientFull} px-4 pt-4 pb-5 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-3xl transform translate-x-10 -translate-y-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-black/20 blur-2xl transform -translate-x-6 translate-y-6 pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30">
                {getCampaignIcon(campaign.campaign_type, 'w-5 h-5')}
              </div>
              <div>
                <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm border border-white/30 leading-none mb-1">
                  {getCampaignTypeLabel(campaign.campaign_type).toUpperCase()}
                </span>
                {countdown.urgent && countdown.label !== 'Ended' && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-white animate-pulse" />
                    <span className="text-[9px] text-white/80 font-bold">ENDING SOON</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-white text-xl leading-tight drop-shadow">{campaign.reward_label}</div>
              <div className="text-white/70 text-[10px] font-medium">Prize Pool</div>
            </div>
          </div>

          <h3 className="font-black text-white text-base leading-snug mb-1.5 drop-shadow">{campaign.title}</h3>
          <p className="text-white/75 text-[11px] leading-relaxed line-clamp-2">{campaign.description}</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3" style={{ background: 'linear-gradient(to bottom, #1A1D26, #161920)' }}>
        {campaign.ends_at && countdown.label !== 'Ended' && countdown.label !== 'Ongoing' && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.accent }} />
            <span className="text-[10px] font-semibold" style={{ color: theme.accent }}>Time Remaining</span>
            <div className="flex items-center gap-1.5 ml-auto">
              {countdown.days > 0 && <TimerBox value={countdown.days} label="days" accent={theme.accent} />}
              <TimerBox value={countdown.hours} label="hrs" accent={theme.accent} />
              <TimerBox value={countdown.mins} label="min" accent={theme.accent} />
              {countdown.days === 0 && <TimerBox value={countdown.secs} label="sec" accent={theme.accent} />}
            </div>
          </div>
        )}
        {(!campaign.ends_at || countdown.label === 'Ongoing') && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
            <span className="text-[11px] text-[#0ECB81] font-semibold">Ongoing Campaign</span>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Users className="w-3 h-3" />
              <span className="font-medium">{campaign.participants.toLocaleString()} participants</span>
              {campaign.max_participants && (
                <span className="text-gray-600">/ {campaign.max_participants.toLocaleString()}</span>
              )}
            </div>
            {fillPct !== null && (
              <span className="font-bold" style={{ color: theme.accent }}>{fillPct}% filled</span>
            )}
          </div>
          <div className="w-full bg-[#2B3139] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${theme.progressBg}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            className="flex-1 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`, color: '#0B0E11', boxShadow: `0 4px 15px ${theme.accent}44` }}
            onClick={e => { e.stopPropagation(); onOpen(); }}
          >
            <Coins className="w-4 h-4" />
            {getClaimLabel(campaign)}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onOpen(); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: theme.accent + '22', border: `1px solid ${theme.accent}44` }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: theme.accent }} />
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_FILTERS = [
  { id: 'all',      label: 'All',      icon: <Award className="w-3 h-3" /> },
  { id: 'trading',  label: 'Trading',  icon: <BarChart3 className="w-3 h-3" /> },
  { id: 'deposit',  label: 'Deposit',  icon: <Shield className="w-3 h-3" /> },
  { id: 'referral', label: 'Referral', icon: <Users className="w-3 h-3" /> },
  { id: 'mining',   label: 'Mining',   icon: <Zap className="w-3 h-3" /> },
  { id: 'social',   label: 'Social',   icon: <Star className="w-3 h-3" /> },
];

export default function CampaignTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetailData | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*, claim_type, claim_condition, claim_reward_usdt, claim_reward_eq, duration_hours')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) {
      setCampaigns(data.map(c => ({ ...c, requirements: Array.isArray(c.requirements) ? c.requirements : [] })));
    }
    setLoading(false);
  };

  const filtered = activeType === 'all' ? campaigns : campaigns.filter(c => c.campaign_type === activeType);
  const totalPrize = campaigns.reduce((sum, c) => {
    if (c.reward_type === 'token' || c.reward_type === 'usdt') return sum + Number(c.reward_amount);
    return sum;
  }, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="pb-4">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5 text-[#F0B90B]" />
            <h2 className="font-black text-white text-base">Active Campaigns</h2>
            <span className="ml-auto bg-[#F0B90B]/20 text-[#F0B90B] text-xs font-black px-2 py-0.5 rounded-full border border-[#F0B90B]/30">
              {campaigns.length} Live
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Trade, deposit, and refer to earn exclusive rewards</p>

          <div className="bg-gradient-to-r from-[#1E2026] to-[#22252F] rounded-2xl p-3 border border-[#2B3139] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0B90B]/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#F0B90B]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 font-medium">Total Prize Pool Across All Campaigns</div>
              <div className="font-black text-[#F0B90B] text-base leading-tight">
                {totalPrize > 1000000
                  ? `${(totalPrize / 1000000).toFixed(1)}M+ Tokens & USDT`
                  : `$${totalPrize.toLocaleString()}+`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
              <span className="text-[10px] text-[#0ECB81] font-bold">LIVE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {TYPE_FILTERS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeType === t.id
                  ? 'bg-[#F0B90B] text-black shadow-[0_0_12px_rgba(240,185,11,0.4)]'
                  : 'bg-[#2B3139] text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-4 space-y-4">
          {filtered.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onOpen={() => setSelectedCampaign(campaign)}
            />
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Award className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm font-medium">No campaigns in this category</p>
              <p className="text-gray-600 text-xs mt-1">Check back soon for new opportunities</p>
            </div>
          )}
        </div>
      </div>

      <CampaignDetailModal
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
    </>
  );
}

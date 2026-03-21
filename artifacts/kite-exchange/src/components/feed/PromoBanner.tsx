import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Zap, Gift, TrendingUp, Star, Shield } from 'lucide-react';
import CampaignDetailModal, { type CampaignDetailData } from '../CampaignDetailModal';

interface PromoItem {
  id: string;
  type: 'pool' | 'fee' | 'bonus' | 'listing' | 'event' | 'vip';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  highlight: string;
  gradient: string;
  accentColor: string;
  badge?: string;
  dotColor: string;
  campaignData: CampaignDetailData;
}

const PROMO_ITEMS: PromoItem[] = [
  {
    id: 'p1',
    type: 'pool',
    icon: <Trophy className="w-6 h-6" />,
    title: '38,000,000 FOGO Reward Pool',
    subtitle: 'Limited time offer — ends soon',
    highlight: 'JOIN NOW',
    gradient: 'from-[#F0B90B] via-[#F8D12F] to-[#E6A800]',
    accentColor: '#F0B90B',
    badge: 'LIMITED',
    dotColor: '#F0B90B',
    campaignData: {
      id: 'promo-p1',
      title: '38,000,000 FOGO Grand Reward Pool',
      description: 'The biggest trading competition of the year. Top 500 traders by volume split the 38,000,000 FOGO prize pool. Daily rankings updated live. Trade any spot or futures pair to qualify.',
      reward_type: 'token',
      reward_amount: 38000000,
      reward_label: '38,000,000 FOGO',
      badge_color: 'yellow',
      campaign_type: 'trading',
      participants: 24817,
      max_participants: 50000,
      ends_at: new Date(Date.now() + 6 * 86400000 + 2 * 3600000).toISOString(),
      requirements: [
        { text: 'Complete identity verification (KYC Level 1 or above)' },
        { text: 'Trade a minimum cumulative volume of $500 across Spot or Futures' },
        { text: 'Rankings are based on total trading volume — top 500 traders win' },
        { text: 'Prize distribution: 1st place 5M FOGO, 2nd 2M, 3rd 1M, top 500 share remaining pool' },
        { text: 'Results announced within 48 hours of competition end' },
      ],
    },
  },
  {
    id: 'p2',
    type: 'fee',
    icon: <Zap className="w-6 h-6" />,
    title: 'Zero Maker Fee This Week',
    subtitle: 'Trade futures with 0% maker fee',
    highlight: '0% FEE',
    gradient: 'from-[#0ECB81] via-[#06B96E] to-[#059669]',
    accentColor: '#0ECB81',
    badge: 'EVENT',
    dotColor: '#0ECB81',
    campaignData: {
      id: 'promo-p2',
      title: 'Zero Maker Fee — Full Week Event',
      description: 'Trade futures all week with absolutely 0% maker fees. No cap on volume, no restrictions. Stack your positions, scalp the markets, or go long-term with zero cost to place maker orders.',
      reward_type: 'fee',
      reward_amount: 0,
      reward_label: '0% MAKER FEE',
      badge_color: 'green',
      campaign_type: 'trading',
      participants: 89432,
      max_participants: null,
      ends_at: new Date(Date.now() + 3 * 86400000 + 20 * 3600000).toISOString(),
      requirements: [
        { text: 'Available to all registered users — no minimum balance required' },
        { text: 'Applies to all Futures trading pairs including BTC, ETH, SOL, and 200+ altcoins' },
        { text: 'Maker orders only: limit orders placed below market price (longs) or above (shorts)' },
        { text: 'Taker fees remain at standard rates (0.04%)' },
        { text: 'Automatically applied — no coupon or activation needed' },
      ],
    },
  },
  {
    id: 'p3',
    type: 'bonus',
    icon: <Gift className="w-6 h-6" />,
    title: 'New User Bonus: Up to $500',
    subtitle: 'Complete tasks and claim your bonus',
    highlight: 'CLAIM',
    gradient: 'from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]',
    accentColor: '#3B82F6',
    badge: 'NEW',
    dotColor: '#3B82F6',
    campaignData: {
      id: 'promo-p3',
      title: 'New User Welcome Bonus: Up to $500',
      description: 'Exclusive welcome package for new users. Complete a series of tasks to unlock up to $500 in trading bonuses. Bonuses can be used for Spot and Futures trading.',
      reward_type: 'usdt',
      reward_amount: 500,
      reward_label: 'Up to $500',
      badge_color: 'blue',
      campaign_type: 'deposit',
      participants: 142300,
      max_participants: null,
      ends_at: null,
      requirements: [
        { text: 'Register a new account and verify your email address (+$10 bonus)' },
        { text: 'Complete KYC identity verification (+$50 bonus)' },
        { text: 'Make your first deposit of at least $100 (+$100 bonus)' },
        { text: 'Complete your first trade on Spot or Futures (+$50 bonus)' },
        { text: 'Reach $1,000 cumulative trading volume (+$290 bonus)' },
      ],
    },
  },
  {
    id: 'p4',
    type: 'listing',
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'FOGO/USDT Launch Trading Race',
    subtitle: 'Be first 1,000 traders — win guaranteed prizes',
    highlight: 'TRADE',
    gradient: 'from-[#F97316] via-[#EA580C] to-[#C2410C]',
    accentColor: '#F97316',
    badge: 'NEW',
    dotColor: '#F97316',
    campaignData: {
      id: 'promo-p4',
      title: 'FOGO/USDT Launch Trading Race',
      description: 'FOGO is officially live on Spot and Futures! Be one of the first 1,000 traders and earn guaranteed prizes. Top trader wins 500,000 FOGO. All participants in top 1,000 receive a prize.',
      reward_type: 'token',
      reward_amount: 500000,
      reward_label: '500,000 FOGO',
      badge_color: 'orange',
      campaign_type: 'trading',
      participants: 3847,
      max_participants: 10000,
      ends_at: new Date(Date.now() + 2 * 86400000 + 7 * 3600000).toISOString(),
      requirements: [
        { text: 'Trade the FOGO/USDT pair on Spot or Futures markets' },
        { text: 'Minimum single trade volume of $50 to qualify for the leaderboard' },
        { text: 'Top 1,000 traders by FOGO/USDT volume win guaranteed prizes' },
        { text: 'Grand prize: 500,000 FOGO for #1 trader by volume' },
        { text: 'All top 1,000 participants receive a minimum of 100 FOGO each' },
      ],
    },
  },
  {
    id: 'p5',
    type: 'vip',
    icon: <Star className="w-6 h-6" />,
    title: 'VIP Mining Upgrade — 50% OFF',
    subtitle: 'Earn 3.5x more EQ per hour with VIP machines',
    highlight: 'UPGRADE',
    gradient: 'from-[#F59E0B] via-[#D97706] to-[#B45309]',
    accentColor: '#F59E0B',
    badge: 'VIP',
    dotColor: '#F59E0B',
    campaignData: {
      id: 'promo-p5',
      title: 'VIP Mining Upgrade — 50% OFF',
      description: 'Upgrade your mining setup to VIP tier at half price. VIP miners earn 3.5x more EQ per hour, get access to exclusive GPU Farm and ASIC Cluster machines, and unlock premium live rooms.',
      reward_type: 'token',
      reward_amount: 0,
      reward_label: '50% OFF VIP',
      badge_color: 'yellow',
      campaign_type: 'mining',
      participants: 2193,
      max_participants: 5000,
      ends_at: new Date(Date.now() + 10 * 86400000 + 18 * 3600000).toISOString(),
      requirements: [
        { text: 'Purchase any VIP mining machine during the promotion period at 50% off' },
        { text: 'VIP machines include: GPU Farm, ASIC Cluster, Quantum Rig, and AI Mining Array' },
        { text: 'VIP miners earn 3.5x base EQ rate compared to standard miners' },
        { text: 'Includes access to 24/7 VIP-only live trading rooms' },
        { text: 'VIP machines run for 30 days from activation — discount applied at checkout automatically' },
      ],
    },
  },
  {
    id: 'p6',
    type: 'event',
    icon: <Shield className="w-6 h-6" />,
    title: 'Community Vote: Next Listed Token',
    subtitle: 'Vote for any of 8 shortlisted tokens, earn +50 EQ',
    highlight: 'VOTE',
    gradient: 'from-[#EC4899] via-[#DB2777] to-[#BE185D]',
    accentColor: '#EC4899',
    badge: 'ACTIVE',
    dotColor: '#EC4899',
    campaignData: {
      id: 'promo-p6',
      title: 'Community Vote: Next Listed Token',
      description: "Your vote decides what gets listed next on EarnQuest! Cast your vote for one of 8 shortlisted tokens. Each vote earns you +50 EQ instantly. The token with the most votes at deadline will be listed within 72 hours.",
      reward_type: 'token',
      reward_amount: 50,
      reward_label: '+50 EQ / VOTE',
      badge_color: 'pink',
      campaign_type: 'social',
      participants: 31540,
      max_participants: null,
      ends_at: new Date(Date.now() + 4 * 86400000 + 12 * 3600000).toISOString(),
      requirements: [
        { text: 'Must have a verified account to cast a vote' },
        { text: 'Each user can cast one vote for one of 8 shortlisted tokens' },
        { text: 'You earn +50 EQ instantly when your vote is submitted' },
        { text: 'The token with the highest vote count at deadline gets listed' },
        { text: 'Users who voted for the winning token receive an additional +200 EQ bonus' },
      ],
    },
  },
];

export default function PromoBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [openCampaign, setOpenCampaign] = useState<CampaignDetailData | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % PROMO_ITEMS.length);
    }, 4000);
  };

  useEffect(() => {
    startAutoPlay();
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, []);

  const goTo = (index: number) => {
    setActiveIndex(index);
    startAutoPlay();
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    goTo((activeIndex - 1 + PROMO_ITEMS.length) % PROMO_ITEMS.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    goTo((activeIndex + 1) % PROMO_ITEMS.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? goTo((activeIndex + 1) % PROMO_ITEMS.length) : goTo((activeIndex - 1 + PROMO_ITEMS.length) % PROMO_ITEMS.length);
    setIsDragging(false);
  };

  const item = PROMO_ITEMS[activeIndex];

  return (
    <>
      <div className="px-4 pt-3 pb-2">
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setOpenCampaign(item.campaignData)}
        >
          <div className={`bg-gradient-to-r ${item.gradient} relative`}>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-2xl transform translate-x-10 -translate-y-10" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 blur-xl transform -translate-x-6 translate-y-6" />
              <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full bg-white/5 blur-lg" />
            </div>

            <div className="relative flex items-center gap-0 px-3 py-2.5">
              <button
                onClick={prev}
                className="w-7 h-7 bg-black/25 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all flex-shrink-0 mr-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white backdrop-blur-sm mr-2">
                <span className="[&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
              </div>

              <div className="flex-1 min-w-0 mx-1">
                {item.badge && (
                  <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded mb-0.5 bg-white/30 text-white backdrop-blur-sm leading-none">
                    {item.badge}
                  </span>
                )}
                <h3 className="text-white font-black text-[12px] leading-tight truncate">{item.title}</h3>
                <p className="text-white/80 text-[10px] leading-tight truncate">{item.subtitle}</p>
              </div>

              <button
                className="flex-shrink-0 bg-white/25 hover:bg-white/40 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all active:scale-95 whitespace-nowrap border border-white/40 mx-1"
                onClick={e => { e.stopPropagation(); setOpenCampaign(item.campaignData); }}
              >
                {item.highlight}
              </button>

              <button
                onClick={next}
                className="w-7 h-7 bg-black/25 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all flex-shrink-0 ml-1"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-2">
          {PROMO_ITEMS.map((promo, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all"
            >
              <div
                className="rounded-full transition-all duration-300"
                style={i === activeIndex
                  ? { width: '20px', height: '6px', backgroundColor: item.dotColor }
                  : { width: '6px', height: '6px', backgroundColor: '#2B3139' }
                }
              />
            </button>
          ))}
        </div>
      </div>

      <CampaignDetailModal
        campaign={openCampaign}
        onClose={() => setOpenCampaign(null)}
      />
    </>
  );
}

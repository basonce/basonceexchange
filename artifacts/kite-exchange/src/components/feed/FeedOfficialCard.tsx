import { useState } from 'react';
import { Shield, ChevronRight, Trophy, Vote, Gauge, Gift, TrendingUp, Bell } from 'lucide-react';

interface OfficialPost {
  id: string;
  type: 'bonus' | 'vote' | 'event' | 'reward' | 'listing' | 'announcement';
  title: string;
  description: string;
  cta: string;
  badge?: string;
  timeLeft?: string;
  highlight?: string;
}

const OFFICIAL_POSTS: OfficialPost[] = [
  {
    id: 'op1',
    type: 'bonus',
    title: 'End of Quarter Bonus',
    description: 'Trade $50,000+ volume this week to qualify for end-of-quarter bonuses.',
    cta: 'Claim Reward',
    badge: 'LIMITED',
    highlight: 'Up to $1,000 in rewards',
    timeLeft: '3d left'
  },
  {
    id: 'op2',
    type: 'vote',
    title: 'Community Vote',
    description: 'Help decide which token gets listed next! Cast your vote and earn participation rewards.',
    cta: 'Vote Now',
    badge: 'ACTIVE',
    highlight: '+50 EQ for voting',
    timeLeft: '1d left'
  },
  {
    id: 'op3',
    type: 'event',
    title: 'Zero Fee Trading Week',
    description: 'Trade any futures pair with zero maker fees this week only. A special platform event.',
    cta: 'Start Trading',
    badge: 'EVENT',
    highlight: '0% Maker Fee',
    timeLeft: '5d left'
  },
  {
    id: 'op4',
    type: 'listing',
    title: 'New Token Listed: FOGO',
    description: 'FOGO/USDT is now available for spot and futures trading. 38M FOGO reward pool active.',
    cta: 'Trade FOGO',
    badge: 'NEW',
    highlight: '38,000,000 FOGO Pool'
  },
  {
    id: 'op5',
    type: 'reward',
    title: 'Referral Bonus Doubled',
    description: 'This weekend only - refer a friend and earn 2x the normal commission on their trades.',
    cta: 'Invite Friends',
    badge: '2X',
    highlight: 'Double Commission',
    timeLeft: '2d left'
  },
  {
    id: 'op6',
    type: 'announcement',
    title: 'Mining Season 2 Launched',
    description: 'New mining equipment available with higher hash rates. Upgrade now to maximize EQ earnings.',
    cta: 'Go to Mining',
    badge: 'NEW',
    highlight: 'Up to 10x EQ/hour'
  }
];

const typeConfig = {
  bonus: { icon: Trophy, color: '#F0B90B', bg: 'from-[#F0B90B]/15 to-[#F0B90B]/5', border: 'border-[#F0B90B]/40' },
  vote: { icon: Vote, color: '#3B82F6', bg: 'from-blue-500/15 to-blue-500/5', border: 'border-blue-500/40' },
  event: { icon: Gauge, color: '#0ECB81', bg: 'from-[#0ECB81]/15 to-[#0ECB81]/5', border: 'border-[#0ECB81]/40' },
  reward: { icon: Gift, color: '#F0B90B', bg: 'from-[#F0B90B]/15 to-[#F0B90B]/5', border: 'border-[#F0B90B]/40' },
  listing: { icon: TrendingUp, color: '#0ECB81', bg: 'from-[#0ECB81]/15 to-[#0ECB81]/5', border: 'border-[#0ECB81]/40' },
  announcement: { icon: Bell, color: '#F0B90B', bg: 'from-[#F0B90B]/15 to-[#F0B90B]/5', border: 'border-[#F0B90B]/40' }
};

interface FeedOfficialCardProps {
  postIndex: number;
}

export default function FeedOfficialCard({ postIndex }: FeedOfficialCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const post = OFFICIAL_POSTS[postIndex % OFFICIAL_POSTS.length];
  const config = typeConfig[post.type];
  const Icon = config.icon;

  if (dismissed) return null;

  return (
    <div className={`mx-4 my-2 rounded-2xl bg-gradient-to-br ${config.bg} border ${config.border} overflow-hidden relative`}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-40" style={{ color: config.color }} />

      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${config.color}20` }}>
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" style={{ color: config.color }} />
                <span className="text-xs font-bold" style={{ color: config.color }}>Official</span>
              </div>
              {post.badge && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-black" style={{ background: config.color }}>
                  {post.badge}
                </span>
              )}
              {post.timeLeft && (
                <span className="text-[10px] text-gray-400 font-medium">{post.timeLeft}</span>
              )}
            </div>

            <h3 className="text-white font-bold text-sm mb-1">{post.title}</h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-2">{post.description}</p>

            {post.highlight && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-3" style={{ background: `${config.color}15` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
                <span className="text-xs font-bold" style={{ color: config.color }}>{post.highlight}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            style={{ background: config.color, color: post.type === 'vote' ? 'white' : '#0B0E11' }}
          >
            {post.cta}
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-10 h-10 rounded-xl bg-[#2B3139] hover:bg-[#363C45] flex items-center justify-center text-gray-400 transition-colors text-lg font-bold"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

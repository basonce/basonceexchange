import { useState } from 'react';
import { Megaphone, Bell, ArrowRight, Tag, Clock, Pin } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

type Category = 'All' | 'New Listings' | 'Latest' | 'Activities' | 'Maintenance' | 'Delistings';

const CATEGORIES: Category[] = ['All', 'New Listings', 'Latest', 'Activities', 'Maintenance', 'Delistings'];

const CATEGORY_STYLES: Record<Exclude<Category, 'All'>, string> = {
  'New Listings': 'bg-[#0ECB81]/10 text-[#0ECB81] border-[#0ECB81]/30',
  Latest: 'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/30',
  Activities: 'bg-[#1E90FF]/10 text-[#5AA9FF] border-[#5AA9FF]/30',
  Maintenance: 'bg-[#B7BDC6]/10 text-[#B7BDC6] border-[#B7BDC6]/30',
  Delistings: 'bg-[#F6465D]/10 text-[#F6465D] border-[#F6465D]/30',
};

interface Item {
  category: Exclude<Category, 'All'>;
  title: string;
  summary: string;
  date: string;
}

const FEATURED = {
  category: 'New Listings' as const,
  title: 'Basonce Will List Monad (MON) in the Innovation Zone',
  summary:
    'Spot trading for MON/USDT and MON/USDC opens at 08:00 UTC. Deposits are open now; withdrawals enable 24 hours after listing. Trade-to-earn rewards apply for the first seven days.',
  date: '2026-03-18',
};

const ITEMS: Item[] = [
  { category: 'New Listings', title: 'Basonce Adds Plume (PLUME) to Spot and Convert', summary: 'PLUME/USDT goes live with zero-fee promotion for 14 days across all VIP tiers.', date: '2026-03-17' },
  { category: 'Activities', title: 'Spring Trading Marathon: Share a 5,000,000 BNC Prize Pool', summary: 'Complete daily trading volume milestones to climb the leaderboard and unlock bonus vouchers.', date: '2026-03-16' },
  { category: 'Latest', title: 'Earn Now Supports Flexible Staking for 12 New Assets', summary: 'Estimated APR up to 9.4%. Subscribe and redeem anytime with no lock-up period.', date: '2026-03-15' },
  { category: 'Maintenance', title: 'Scheduled Wallet Maintenance for the Solana Network', summary: 'SOL deposits and withdrawals pause for approximately 90 minutes starting 02:00 UTC.', date: '2026-03-14' },
  { category: 'Activities', title: 'Refer Friends and Split a 1,000,000 USDT Reward Pool', summary: 'Both inviter and invitee receive trading-fee rebates for 90 days after signup.', date: '2026-03-13' },
  { category: 'New Listings', title: 'Basonce Futures Launches BERA Perpetual Contracts', summary: 'Up to 50x leverage with funding settled every eight hours. Risk controls apply.', date: '2026-03-12' },
  { category: 'Delistings', title: 'Notice on the Removal of Four Low-Liquidity Trading Pairs', summary: 'Affected pairs cease trading at 06:00 UTC. Open orders will be auto-cancelled before delisting.', date: '2026-03-11' },
  { category: 'Latest', title: 'Basonce Card Adds Three New Supported Regions', summary: 'Eligible users can now spend crypto with instant conversion and up to 5% cashback.', date: '2026-03-10' },
  { category: 'Maintenance', title: 'System Upgrade for the Spot Matching Engine', summary: 'A brief read-only window applies to spot markets while we deploy throughput improvements.', date: '2026-03-09' },
  { category: 'New Listings', title: 'Basonce Will List Ethena (ENA) in the Seed Tag Zone', summary: 'ENA/USDT and ENA/FDUSD open simultaneously. Seed Tag assets carry higher volatility risk.', date: '2026-03-08' },
];

export default function AnnouncementsPage({ onNavigate }: MorePageProps) {
  const [active, setActive] = useState<Category>('All');

  const filtered = active === 'All' ? ITEMS : ITEMS.filter((i) => i.category === active);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Hero */}
      <section className="relative pt-24 pb-16 border-b border-[#2B3139] overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[700px] h-[400px] bg-[#F0B90B]/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#181A20] border border-[#2B3139] flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-[#F0B90B]" />
            </div>
            <span className="text-sm font-semibold tracking-widest uppercase text-[#848E9C]">Announcement Center</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight max-w-3xl leading-tight">
            Everything happening on <span className="text-[#F0B90B]">Basonce</span>, in one place.
          </h1>
          <p className="mt-6 text-lg text-[#B7BDC6] max-w-2xl leading-relaxed">
            New listings, platform activities, maintenance windows and delistings — published the moment they go live, so you never miss a market-moving update.
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="sticky top-0 z-10 bg-[#0B0E11]/95 backdrop-blur border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  active === cat
                    ? 'bg-[#F0B90B] text-black'
                    : 'bg-[#181A20] text-[#B7BDC6] border border-[#2B3139] hover:text-white hover:border-[#474D57]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {(active === 'All' || active === 'New Listings') && (
        <section className="max-w-[1200px] mx-auto px-6 pt-12">
          <div className="relative bg-gradient-to-br from-[#1E2329] to-[#0d1014] border border-[#2B3139] rounded-2xl p-8 lg:p-10 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#F0B90B]/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30">
                  <Pin className="w-3.5 h-3.5" /> Featured
                </span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${CATEGORY_STYLES[FEATURED.category]}`}>
                  {FEATURED.category}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#848E9C] tabular-nums whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" /> {FEATURED.date}
                </span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 max-w-3xl leading-snug">{FEATURED.title}</h2>
              <p className="text-[#B7BDC6] text-base leading-relaxed max-w-3xl mb-8">{FEATURED.summary}</p>
              <button
                onClick={openAuthRegister}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors"
              >
                Trade MON Now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Chronological List */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{active === 'All' ? 'Latest Announcements' : active}</h3>
          <span className="text-sm text-[#848E9C] tabular-nums">{filtered.length} updates</span>
        </div>
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <article
              key={i}
              className="group flex items-start gap-4 bg-[#181A20] border border-[#2B3139] rounded-xl p-5 hover:border-[#474D57] transition-colors"
            >
              <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-lg bg-[#0B0E11] border border-[#2B3139] items-center justify-center mt-0.5">
                <Tag className="w-4 h-4 text-[#848E9C]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap ${CATEGORY_STYLES[item.category]}`}>
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#848E9C] tabular-nums whitespace-nowrap">
                    <Clock className="w-3 h-3" /> {item.date}
                  </span>
                </div>
                <h4 className="text-base font-semibold text-[#EAECEF] group-hover:text-[#F0B90B] transition-colors truncate">
                  {item.title}
                </h4>
                <p className="text-sm text-[#848E9C] mt-1 leading-relaxed line-clamp-2">{item.summary}</p>
              </div>
              <ArrowRight className="hidden md:block w-5 h-5 text-[#474D57] group-hover:text-[#F0B90B] group-hover:translate-x-1 transition-all mt-1 shrink-0" />
            </article>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#848E9C]">No announcements in this category yet.</div>
          )}
        </div>
      </section>

      {/* Subscribe Band */}
      <section className="border-t border-[#2B3139] bg-[#181A20]">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center">
                <Bell className="w-6 h-6 text-[#F0B90B]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Subscribe to updates</h3>
                <p className="text-[#B7BDC6] leading-relaxed">
                  Get listing alerts, activity invitations and maintenance notices delivered straight to your account. Verified members receive priority access to new campaigns.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
              <button
                onClick={openAuthRegister}
                className="px-7 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                Enable Notifications
              </button>
              <button
                onClick={() => onNavigate('markets')}
                className="px-7 py-3.5 bg-[#0B0E11] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                Browse Markets
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  Search,
  ArrowRight,
  User,
  Wallet,
  ArrowDownToLine,
  CandlestickChart,
  ShieldCheck,
  BadgeCheck,
  FileText,
  LifeBuoy,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const CATEGORIES = [
  { icon: User, name: 'Account & Profile', count: 48, desc: 'Registration, login, profile settings and account security basics.' },
  { icon: Wallet, name: 'Deposits', count: 36, desc: 'Crypto and fiat deposits, networks, confirmations and crediting.' },
  { icon: ArrowDownToLine, name: 'Withdrawals', count: 41, desc: 'Withdrawal limits, address whitelisting, network fees and delays.' },
  { icon: CandlestickChart, name: 'Trading', count: 62, desc: 'Spot, futures, order types, margin and trading fee questions.' },
  { icon: ShieldCheck, name: 'Security', count: 29, desc: '2FA, anti-phishing code, device management and account recovery.' },
  { icon: BadgeCheck, name: 'Identity Verification', count: 33, desc: 'KYC tiers, document requirements and verification troubleshooting.' },
];

const ARTICLES = [
  { title: 'How to enable two-factor authentication (2FA)', cat: 'Security', views: '482K' },
  { title: 'Why is my deposit not credited yet?', cat: 'Deposits', views: '961K' },
  { title: 'How to complete identity verification (KYC)', cat: 'Identity Verification', views: '1.2M' },
  { title: 'Understanding spot trading fees and VIP tiers', cat: 'Trading', views: '356K' },
  { title: 'How to withdraw crypto to an external wallet', cat: 'Withdrawals', views: '774K' },
  { title: 'What to do if you forgot your password', cat: 'Account & Profile', views: '215K' },
  { title: 'How to whitelist a withdrawal address', cat: 'Withdrawals', views: '188K' },
  { title: 'Introduction to USDⓈ-M futures contracts', cat: 'Trading', views: '129K' },
  { title: 'How anti-phishing codes protect your account', cat: 'Security', views: '97K' },
  { title: 'Supported deposit networks and minimum amounts', cat: 'Deposits', views: '143K' },
  { title: 'Managing trusted devices and active sessions', cat: 'Account & Profile', views: '64K' },
  { title: 'KYC document tips: accepted IDs and photo quality', cat: 'Identity Verification', views: '208K' },
];

export default function HelpCenterPage({ onNavigate }: MorePageProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ARTICLES;
    return ARTICLES.filter(
      (a) => a.title.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Search hero */}
      <section className="bg-gradient-to-b from-[#181A20] to-[#0B0E11] border-b border-[#2B3139]">
        <div className="max-w-[1100px] mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E2329] border border-[#2B3139] text-xs text-[#848E9C] mb-6 uppercase tracking-widest">
            <LifeBuoy className="w-3.5 h-3.5 text-[#F0B90B]" /> Help Center
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-5">
            How can we <span className="text-[#F0B90B]">help you?</span>
          </h1>
          <p className="text-[#848E9C] text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Search hundreds of articles covering accounts, deposits, withdrawals, trading and security — answers from the Basonce support knowledge base.
          </p>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#848E9C]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for articles, e.g. withdrawal not received"
              className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-xl pl-14 pr-5 py-4 text-white placeholder-[#5E6673] focus:outline-none focus:border-[#F0B90B] transition-colors"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {['2FA setup', 'Deposit pending', 'KYC failed', 'Reset password', 'Trading fees'].map((t) => (
              <button
                key={t}
                onClick={() => setQuery(t)}
                className="px-3 py-1.5 rounded-full bg-[#1E2329] border border-[#2B3139] text-xs text-[#B7BDC6] hover:border-[#F0B90B] hover:text-white transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-white mb-2">Browse by topic</h2>
        <p className="text-[#848E9C] mb-10">Choose a category to find step-by-step guides and troubleshooting.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.name}
                className="group bg-[#181A20] border border-[#2B3139] rounded-xl p-6 hover:border-[#F0B90B]/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-lg bg-[#1E2329] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#F0B90B]" />
                  </div>
                  <span className="text-xs font-semibold text-[#848E9C] tabular-nums whitespace-nowrap">
                    {c.count} articles
                  </span>
                </div>
                <h3 className="font-bold text-white mb-2 group-hover:text-[#F0B90B] transition-colors">{c.name}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed min-w-0">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular / search results */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-20">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">
              {query.trim() ? `Results for "${query.trim()}"` : 'Popular articles'}
            </h2>
            <span className="text-sm text-[#848E9C] tabular-nums whitespace-nowrap">{results.length} found</span>
          </div>
          {results.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#2B3139] rounded-xl">
              <FileText className="w-8 h-8 text-[#5E6673] mx-auto mb-4" />
              <p className="text-[#B7BDC6] font-medium mb-1">No articles match your search</p>
              <p className="text-sm text-[#848E9C]">Try a different keyword or contact our support team below.</p>
            </div>
          ) : (
            <div className="border border-[#2B3139] rounded-xl overflow-hidden">
              {results.map((a, i) => (
                <button
                  key={a.title}
                  className={`w-full flex items-center gap-4 px-6 py-4 text-left bg-[#0B0E11] hover:bg-[#1E2329] transition-colors ${i !== 0 ? 'border-t border-[#2B3139]' : ''}`}
                >
                  <FileText className="w-4 h-4 text-[#848E9C] shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-[#EAECEF]">{a.title}</span>
                  <span className="hidden md:inline text-xs px-2 py-0.5 rounded bg-[#1E2329] text-[#848E9C] whitespace-nowrap">{a.cat}</span>
                  <span className="text-xs text-[#5E6673] tabular-nums whitespace-nowrap w-16 text-right">{a.views}</span>
                  <ChevronRight className="w-4 h-4 text-[#5E6673] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Still need help */}
      <section className="max-w-[1100px] mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-[#181A20] to-[#1E2329] border border-[#2B3139] rounded-2xl p-10">
          <div className="flex flex-col lg:flex-row items-center gap-8 justify-between">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold text-white mb-2">Still need help?</h2>
              <p className="text-[#848E9C] max-w-xl">
                Our support team is available 24/7 in multiple languages. Reach us instantly via live chat or open a support ticket and we'll get back to you.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                onClick={() => onNavigate('home')}
                className="px-6 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Live Chat
              </button>
              <button
                onClick={openAuthRegister}
                className="px-6 py-3 bg-transparent border border-[#2B3139] hover:bg-[#2B3139] text-white font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                Submit a Request <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

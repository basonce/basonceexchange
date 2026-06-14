import { useState } from 'react';
import { Newspaper, TrendingUp, TrendingDown, ArrowUpRight, FileText, BookOpen, Clock } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const PULSE = [
  { sym: 'BTC', price: '71,284.50', chg: 2.41 },
  { sym: 'ETH', price: '3,912.18', chg: 1.87 },
  { sym: 'BNC', price: '624.07', chg: 4.62 },
  { sym: 'SOL', price: '198.34', chg: -1.24 },
  { sym: 'XRP', price: '0.6218', chg: 0.93 },
  { sym: 'DOGE', price: '0.1742', chg: -2.08 },
  { sym: 'TON', price: '7.41', chg: 3.15 },
  { sym: 'AVAX', price: '42.86', chg: -0.57 },
];

type Topic = 'All' | 'Markets' | 'DeFi' | 'Regulation' | 'Tech';
const TOPICS: Topic[] = ['All', 'Markets', 'DeFi', 'Regulation', 'Tech'];

interface Article {
  topic: Exclude<Topic, 'All'>;
  title: string;
  excerpt: string;
  author: string;
  read: string;
  date: string;
}

const FEATURED = {
  topic: 'Markets' as const,
  title: 'Bitcoin Reclaims $71K as Spot ETF Inflows Hit a Six-Week High',
  excerpt:
    'Institutional demand accelerated through the week as net inflows topped $1.2B, pushing open interest to fresh highs. Analysts point to a tightening supply backdrop ahead of the next halving epoch and a maturing derivatives market.',
  author: 'Basonce Research',
  read: '6 min read',
  date: '2026-03-18',
};

const ARTICLES: Article[] = [
  { topic: 'Markets', title: 'Altcoin Rotation Picks Up as Liquidity Returns to Mid-Caps', excerpt: 'Capital is moving down the curve as traders hunt for relative-value plays in layer-1 and infrastructure tokens.', author: 'M. Chen', read: '4 min read', date: '2026-03-17' },
  { topic: 'DeFi', title: 'On-Chain Lending TVL Crosses $90B Amid Yield Compression', excerpt: 'Stablecoin supply growth is reshaping money markets as borrowers chase the cheapest leverage on record.', author: 'A. Okafor', read: '5 min read', date: '2026-03-17' },
  { topic: 'Regulation', title: 'Global Frameworks Converge on Stablecoin Reserve Standards', excerpt: 'Regulators in three major jurisdictions published aligned guidance on attestations and redemption rights.', author: 'L. Romano', read: '7 min read', date: '2026-03-16' },
  { topic: 'Tech', title: 'Modular Rollups Push Settlement Costs Below One Cent', excerpt: 'Data-availability layers are unlocking a new tier of throughput for consumer-facing applications.', author: 'S. Patel', read: '5 min read', date: '2026-03-16' },
  { topic: 'Markets', title: 'Funding Rates Flip Positive Across Major Perpetuals', excerpt: 'Persistent long bias suggests a constructive but increasingly crowded short-term setup.', author: 'M. Chen', read: '3 min read', date: '2026-03-15' },
  { topic: 'DeFi', title: 'Restaking Protocols Cross 2M Validators as Risk Debate Grows', excerpt: 'Composability gains are drawing scrutiny over correlated slashing and systemic exposure.', author: 'A. Okafor', read: '6 min read', date: '2026-03-15' },
  { topic: 'Tech', title: 'Account Abstraction Adoption Doubles Quarter on Quarter', excerpt: 'Gas sponsorship and session keys are quietly removing the biggest onboarding frictions in crypto.', author: 'S. Patel', read: '4 min read', date: '2026-03-14' },
  { topic: 'Regulation', title: 'Spot ETF Approvals Expand to a Second Asset Class', excerpt: 'A widening product shelf is bringing new categories of allocators on-chain through familiar wrappers.', author: 'L. Romano', read: '5 min read', date: '2026-03-14' },
];

const REPORTS = [
  { tag: 'Quarterly', title: 'State of Digital Assets — Q1 2026', desc: 'A 48-page deep dive into flows, volatility regimes and the structural shift in market participants.', pages: '48 pages' },
  { tag: 'Thematic', title: 'Real-World Assets: The Tokenization Tipping Point', desc: 'How tokenized treasuries and credit are reshaping on-chain yield and collateral markets.', pages: '32 pages' },
  { tag: 'Data', title: 'Derivatives Microstructure & Liquidity Atlas', desc: 'Order-book depth, funding dynamics and basis trades across the top fifty perpetual markets.', pages: '26 pages' },
];

export default function NewsPage({ onNavigate }: MorePageProps) {
  const [topic, setTopic] = useState<Topic>('All');
  const list = topic === 'All' ? ARTICLES : ARTICLES.filter((a) => a.topic === topic);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Market Pulse Ticker */}
      <div className="border-b border-[#2B3139] bg-[#0d1014]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex items-center gap-6 overflow-x-auto py-3">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F0B90B] whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" /> Market Pulse
            </span>
            {PULSE.map((p) => {
              const up = p.chg >= 0;
              return (
                <div key={p.sym} className="flex items-center gap-2 whitespace-nowrap shrink-0">
                  <span className="text-sm font-semibold text-[#EAECEF]">{p.sym}</span>
                  <span className="text-sm text-[#B7BDC6] tabular-nums">${p.price}</span>
                  <span className={`text-xs font-medium tabular-nums ${up ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {up ? '+' : ''}{p.chg.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Masthead */}
      <section className="max-w-[1280px] mx-auto px-6 pt-16 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Newspaper className="w-7 h-7 text-[#F0B90B]" />
          <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">Basonce News</h1>
        </div>
        <p className="text-[#B7BDC6] text-lg max-w-2xl">
          Market intelligence, research and analysis from the Basonce desk. Independent reporting for traders who move first.
        </p>
      </section>

      {/* Featured Hero Story */}
      <section className="max-w-[1280px] mx-auto px-6 pb-12">
        <div className="grid lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-[#2B3139] bg-[#181A20]">
          <div className="relative min-h-[260px] bg-gradient-to-br from-[#1E2329] via-[#181A20] to-[#0d1014] flex items-center justify-center p-10">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,rgba(240,185,11,0.25),transparent_60%)]" />
            <TrendingUp className="relative w-24 h-24 text-[#F0B90B]/70" />
          </div>
          <div className="p-8 lg:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30">
                {FEATURED.topic}
              </span>
              <span className="text-xs text-[#848E9C] tabular-nums whitespace-nowrap">{FEATURED.date}</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white leading-snug mb-4">{FEATURED.title}</h2>
            <p className="text-[#B7BDC6] leading-relaxed mb-6">{FEATURED.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-[#848E9C] min-w-0">
                <span className="font-semibold text-[#EAECEF] truncate">{FEATURED.author}</span>
                <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="w-3.5 h-3.5" /> {FEATURED.read}</span>
              </div>
              <button onClick={openAuthRegister} className="inline-flex items-center gap-1 text-[#F0B90B] font-semibold hover:text-[#FCD535] transition-colors whitespace-nowrap">
                Read story <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Topic Tabs + Article Grid */}
      <section className="max-w-[1280px] mx-auto px-6 pb-16">
        <div className="flex items-center gap-2 overflow-x-auto pb-6 border-b border-[#2B3139] mb-8">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                topic === t ? 'bg-[#F0B90B] text-black' : 'bg-[#181A20] text-[#B7BDC6] border border-[#2B3139] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((a, i) => {
            const down = a.topic === 'Markets' && i % 3 === 1;
            return (
              <article key={i} className="group bg-[#181A20] border border-[#2B3139] rounded-xl p-6 hover:border-[#474D57] transition-colors flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#0B0E11] border border-[#2B3139] text-[#B7BDC6] whitespace-nowrap">
                    {a.topic}
                  </span>
                  {down ? <TrendingDown className="w-4 h-4 text-[#F6465D]" /> : <TrendingUp className="w-4 h-4 text-[#0ECB81]" />}
                </div>
                <h3 className="text-base font-bold text-[#EAECEF] group-hover:text-[#F0B90B] transition-colors leading-snug mb-3">
                  {a.title}
                </h3>
                <p className="text-sm text-[#848E9C] leading-relaxed mb-5 flex-1">{a.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-[#848E9C] pt-4 border-t border-[#2B3139]">
                  <span className="truncate min-w-0 font-medium text-[#B7BDC6]">{a.author}</span>
                  <span className="flex items-center gap-3 shrink-0 whitespace-nowrap">
                    <span className="tabular-nums">{a.date}</span>
                    <span>{a.read}</span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Research Reports */}
      <section className="border-t border-[#2B3139] bg-[#0d1014]">
        <div className="max-w-[1280px] mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6 text-[#F0B90B]" />
            <h2 className="text-2xl font-bold text-white">Research Reports</h2>
          </div>
          <p className="text-[#848E9C] mb-10">In-depth analysis from the Basonce Research team. Verified members get full PDF access.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {REPORTS.map((r, i) => (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-xl p-7 hover:border-[#474D57] transition-colors flex flex-col">
                <div className="w-12 h-12 rounded-lg bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center mb-5">
                  <FileText className="w-6 h-6 text-[#F0B90B]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#F0B90B] mb-2">{r.tag}</span>
                <h3 className="text-lg font-bold text-white mb-3 leading-snug">{r.title}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed mb-6 flex-1">{r.desc}</p>
                <div className="flex items-center justify-between pt-4 border-t border-[#2B3139]">
                  <span className="text-xs text-[#848E9C] tabular-nums">{r.pages}</span>
                  <button onClick={openAuthRegister} className="inline-flex items-center gap-1 text-sm font-semibold text-[#F0B90B] hover:text-[#FCD535] transition-colors">
                    Download <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#181A20] border border-[#2B3139] rounded-2xl p-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Trade the narrative</h3>
              <p className="text-[#848E9C]">Turn research into positions with deep liquidity and pro-grade tools.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={openAuthRegister} className="px-6 py-3 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors whitespace-nowrap">
                Get Started
              </button>
              <button onClick={() => onNavigate('markets')} className="px-6 py-3 bg-[#0B0E11] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors whitespace-nowrap">
                View Markets
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

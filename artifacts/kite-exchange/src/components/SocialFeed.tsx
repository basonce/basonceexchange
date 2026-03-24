import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Radio, Crown, Lock, Sparkles, Users, BookOpen, BarChart2, MessageSquare, Newspaper, Zap, TrendingUp, TrendingDown, ExternalLink, Shield, Globe, Repeat2, BarChart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PriceCache } from '../lib/price-cache';
import LiveRoomModal from './LiveRoomModal';
import FeedNewsCard from './feed/FeedNewsCard';
import FeedLiveEmbed from './feed/FeedLiveEmbed';
import FeedMultiPosition from './feed/FeedMultiPosition';
import FeedCoinTags from './feed/FeedCoinTags';
import FeedEventCard from './feed/FeedEventCard';
import FeedOfficialCard from './feed/FeedOfficialCard';
import PromoBanner from './feed/PromoBanner';
import FeedPositionCard from './feed/FeedPositionCard';
import CopyTradingCarousel from './CopyTradingCarousel';
import BasonceNewsCard, { BASONCE_NEWS_POOL, type BasonceNewsItem } from './feed/BasonceNewsCard';
import FeedGainersCard, { generateGainersRows } from './feed/FeedGainersCard';
import FeedTraderProfileCard from './feed/FeedTraderProfileCard';
import { generateRandomRichPost, type GeneratedPost } from '../lib/feed-post-generators';

function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

interface CoinTag { symbol: string; change: number; }

interface SocialPost {
  id: string;
  username: string;
  avatar_url: string;
  content: string;
  coin_symbol: string;
  trade_type: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  profit_loss: number;
  profit_loss_percent: number;
  leverage: number;
  image_url: string | null;
  image_url_2?: string | null;
  post_type?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  view_count?: number;
  repost_count?: number;
  is_bullish: boolean;
  created_at: string;
  coin_tags?: CoinTag[];
  asset_change_30d?: number | null;
  chart_coin?: string | null;
  sub_positions?: any[];
  live_room_data?: any;
  sentiment?: string;
  gainers_mode?: 'gainers' | 'losers';
  gainers_rows?: any[];
  meme_images?: string[];
  image_url_3?: string | null;
  extra_data?: any;
}

interface LiveRoom {
  id: string;
  title: string;
  description: string;
  topic: string;
  listener_count: number;
  is_active: boolean;
  is_vip: boolean;
  required_level: number;
  access_type: string;
  room_category: string;
  background_gradient: string;
}

interface LiveNewsItem {
  id: string;
  title: string;
  summary: string;
  coin: string;
  category: 'BREAKING' | 'MARKET' | 'REGULATION' | 'TECHNOLOGY' | 'DeFi' | 'WHALE';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  change?: number;
  source: string;
  age: string;
}


const CRYPTO_NEWS_POOL: Omit<LiveNewsItem, 'id' | 'age'>[] = [
  { title: 'Bitcoin breaks above $95,000 as institutional demand surges', summary: 'BTC spot ETF inflows hit $1.2B in a single day, pushing total AUM past $85 billion. BlackRock and Fidelity lead the charge.', coin: 'BTC', category: 'BREAKING', sentiment: 'bullish', change: 3.4, source: 'CoinDesk' },
  { title: 'Ethereum L2 transactions hit all-time high of 42M daily', summary: 'Base, Arbitrum and Optimism collectively process more txs than the Ethereum mainnet. Gas fees drop to sub-cent levels.', coin: 'ETH', category: 'TECHNOLOGY', sentiment: 'bullish', change: 1.8, source: 'The Block' },
  { title: 'SEC approves spot Ethereum ETF options trading', summary: 'Options contracts on ETH spot ETFs begin trading Monday, opening the door for institutional hedging strategies.', coin: 'ETH', category: 'REGULATION', sentiment: 'bullish', change: 5.2, source: 'Reuters' },
  { title: 'Solana validator count reaches 3,500 - highest ever', summary: 'SOL network decentralization improves as staking yield hits 7.8% APY, attracting more validators worldwide.', coin: 'SOL', category: 'TECHNOLOGY', sentiment: 'bullish', change: 2.1, source: 'Solana Labs' },
  { title: 'XRP settlement with SEC paves way for institutional adoption', summary: 'Ripple Labs reaches final agreement, clearing the path for XRP-based cross-border payment solutions in US banks.', coin: 'XRP', category: 'REGULATION', sentiment: 'bullish', change: 8.3, source: 'Bloomberg' },
  { title: 'Whale alert: 50,000 BTC moved from Coinbase to cold storage', summary: 'A single wallet transferred $4.75B worth of Bitcoin to an unknown cold storage address, signaling long-term conviction.', coin: 'BTC', category: 'WHALE', sentiment: 'bullish', source: 'Whale Alert' },
  { title: 'DeFi total value locked surpasses $200 billion for first time', summary: 'Uniswap, Aave, and Curve lead the surge as yield farming returns attract record capital from traditional finance.', coin: 'ETH', category: 'DeFi', sentiment: 'bullish', change: 4.7, source: 'DeFiLlama' },
  { title: 'Bitcoin mining difficulty hits new ATH amid hash rate surge', summary: 'Network hash rate reaches 700 EH/s as North American miners deploy next-gen ASICs. Energy mix shifts to 57% renewables.', coin: 'BTC', category: 'TECHNOLOGY', sentiment: 'neutral', source: 'Glassnode' },
  { title: 'DOGE breaks $0.45 on Elon Musk Twitter payment announcement', summary: 'X Corp confirms DOGE as a payment method for X Premium subscriptions, triggering a 22% price spike in under an hour.', coin: 'DOGE', category: 'BREAKING', sentiment: 'bullish', change: 22.1, source: 'X Corp' },
  { title: 'Binance launches zero-fee trading for 50 new spot pairs', summary: 'The exchange expands its zero-maker-fee program to include mid-cap altcoins, boosting daily volume by $3.2 billion.', coin: 'BNB', category: 'MARKET', sentiment: 'bullish', change: 1.3, source: 'Binance' },
  { title: 'Solana ecosystem raises $500M in Q1 funding round', summary: 'Venture capital continues to flow into Solana-based DeFi, gaming, and payments applications.', coin: 'SOL', category: 'MARKET', sentiment: 'bullish', change: 3.6, source: 'Messari' },
  { title: 'Avalanche integrates with Swift for institutional cross-border payments', summary: 'SWIFT and Avalanche complete pilot program connecting 11 major banks, enabling real-time international settlement.', coin: 'AVAX', category: 'TECHNOLOGY', sentiment: 'bullish', change: 7.4, source: 'SWIFT' },
  { title: 'Fed signals rate cuts ahead — crypto markets rally broadly', summary: 'FOMC minutes reveal 3 expected rate cuts in 2025. Bitcoin surges 4.2% while altcoins see double-digit gains.', coin: 'BTC', category: 'MARKET', sentiment: 'bullish', change: 4.2, source: 'Fed Reserve' },
  { title: 'Chainlink CCIP processes $10B cross-chain volume milestone', summary: 'The Cross-Chain Interoperability Protocol has enabled over $10 billion in secure cross-chain transactions since launch.', coin: 'LINK', category: 'TECHNOLOGY', sentiment: 'bullish', change: 5.9, source: 'Chainlink' },
  { title: 'Crypto fear & greed index hits 89 — extreme greed territory', summary: 'Market sentiment remains at extreme greed for 12 consecutive days, historically preceding corrections but also prolonged bull runs.', coin: 'BTC', category: 'MARKET', sentiment: 'neutral', source: 'Alternative.me' },
  { title: 'Injective Protocol burns 400,000 INJ tokens in weekly auction', summary: 'The deflationary burn mechanism destroys tokens worth $8.4M, reducing total supply by 0.18% this week.', coin: 'INJ', category: 'DeFi', sentiment: 'bullish', change: 6.1, source: 'Injective' },
  { title: 'Solana ecosystem TVL surpasses $12B as DeFi activity explodes', summary: 'SOL-based protocols see record inflows as Jupiter, Raydium, and Marinade lead the charge. SOL price up 18% this week.', coin: 'SOL', category: 'DeFi', sentiment: 'bullish', change: 18.4, source: 'DeFiLlama' },
  { title: 'Arbitrum TVL surpasses $25B, becomes largest L2 by assets', summary: 'Arbitrum One overtakes Polygon as the leading Ethereum Layer 2 by total value locked, driven by DeFi and gaming.', coin: 'ARB', category: 'DeFi', sentiment: 'bullish', change: 4.3, source: 'L2Beat' },
  { title: 'Market correction: BTC drops 8% on profit-taking at resistance', summary: 'Bitcoin faces selling pressure at the $98,000 resistance level as short-term holders lock in profits. Support seen at $89K.', coin: 'BTC', category: 'MARKET', sentiment: 'bearish', change: -8.1, source: 'TradingView' },
  { title: 'SEC investigates 3 major DeFi protocols for unregistered securities', summary: 'The SEC sends subpoenas to Uniswap, Compound, and Balancer over governance token distributions.', coin: 'ETH', category: 'REGULATION', sentiment: 'bearish', change: -3.2, source: 'WSJ' },
  { title: 'Ethereum Dencun upgrade reduces L2 transaction costs by 90%', summary: 'EIP-4844 (proto-danksharding) goes live, slashing rollup data fees and making L2 transactions near-zero cost.', coin: 'ETH', category: 'TECHNOLOGY', sentiment: 'bullish', change: 6.3, source: 'Ethereum Foundation' },
  { title: 'Michael Saylor: MicroStrategy adds 12,000 BTC to treasury', summary: 'Corporate Bitcoin accumulation continues as MicroStrategy brings its total holdings to over 200,000 BTC.', coin: 'BTC', category: 'MARKET', sentiment: 'bullish', change: 2.1, source: 'MicroStrategy' },
];



const CATEGORY_STYLES: Record<string, { color: string; icon: any }> = {
  BREAKING: { color: '#F6465D', icon: Zap },
  MARKET: { color: '#F0B90B', icon: TrendingUp },
  REGULATION: { color: '#3B82F6', icon: Shield },
  TECHNOLOGY: { color: '#0ECB81', icon: Globe },
  DeFi: { color: '#a78bfa', icon: BarChart2 },
  WHALE: { color: '#06b6d4', icon: TrendingUp },
};

function generateLiveNews(): LiveNewsItem[] {
  const shuffled = [...CRYPTO_NEWS_POOL].sort(() => Math.random() - 0.5).slice(0, 12);
  return shuffled.map((n, i) => ({
    ...n,
    id: `news_${i}_${Date.now()}`,
    age: i === 0 ? 'Just now' : i < 3 ? `${(i * 7) + 2}m` : `${Math.floor(i * 1.5)}h`,
  }));
}

function LiveNewsBanner({ items }: { items: LiveNewsItem[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  const item = items[index % items.length];
  if (!item) return null;
  const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.MARKET;
  const Icon = style.icon;
  return (
    <div className="bg-[#0d0f14] border-b border-[#1E2329] px-3 py-2 flex items-center gap-2 overflow-hidden">
      <div className="flex items-center gap-1 flex-shrink-0" style={{ color: style.color }}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black tracking-wider">{item.category}</span>
      </div>
      <div className="w-px h-3.5 bg-[#2B3139] flex-shrink-0" />
      <p className="text-[11px] text-gray-200 truncate flex-1 font-medium">{item.title}</p>
      {item.change !== undefined && (
        <span className={`text-[10px] font-bold flex-shrink-0 ${item.change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          {item.change >= 0 ? '+' : ''}{item.change}%
        </span>
      )}
    </div>
  );
}

function InFeedNewsCard({ item }: { item: LiveNewsItem }) {
  const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.MARKET;
  const Icon = style.icon;
  const isBreaking = item.category === 'BREAKING';
  return (
    <div className="bg-[#181A20] border-b border-[#2B3139] px-4 py-4 hover:bg-[#1E2026] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: `${style.color}18`, border: `1.5px solid ${style.color}40` }}>
          <Icon className="w-4 h-4" style={{ color: style.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-bold text-sm" style={{ color: style.color }}>
              {item.category === 'WHALE' ? 'Whale Alert' : item.source}
            </span>
            {isBreaking && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse"
                style={{ background: `${style.color}25`, color: style.color }}>BREAKING</span>
            )}
            <span className="text-xs text-gray-500">{item.age}</span>
            {item.sentiment === 'bullish' && <span className="text-[#0ECB81] text-xs font-semibold">Bullish</span>}
            {item.sentiment === 'bearish' && <span className="text-[#F6465D] text-xs font-semibold">Bearish</span>}
          </div>
          <p className="text-sm font-semibold text-white leading-snug mb-1.5">{item.title}</p>
          <p className="text-xs text-gray-400 leading-relaxed">{item.summary}</p>
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-[10px] font-bold bg-[#2B3139] text-gray-300 px-2 py-0.5 rounded">{item.coin}</span>
            {item.change !== undefined && (
              <span className={`text-xs font-bold flex items-center gap-0.5 ${item.change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {item.change >= 0 ? '+' : ''}{item.change}%
              </span>
            )}
            <button className="ml-auto flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
              <ExternalLink className="w-3 h-3" /> Read more
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


const MULTI_GRID_COINS = [
  'BTC','ETH','SOL','BNB','XRP','AVAX','DOGE','MATIC','LINK','DOT',
  'ADA','TON','TRX','NEAR','OP','ARB','INJ','SUI','APT','ATOM',
  'FTM','LTC','BCH','WLD','WIF','BONK','FLOKI','SEI','TIA','ONDO',
];

const MULTI_GRID_USERS = [
  { username: 'Crypto3894', avatar: 'https://randomuser.me/api/portraits/men/20.jpg' },
  { username: 'AlphaTrader77', avatar: 'https://randomuser.me/api/portraits/men/21.jpg' },
  { username: 'BullRunKing', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
  { username: 'SwingMaster9', avatar: 'https://randomuser.me/api/portraits/women/20.jpg' },
  { username: 'VolumeProfile', avatar: 'https://randomuser.me/api/portraits/men/23.jpg' },
  { username: 'CryptoWhale88', avatar: 'https://randomuser.me/api/portraits/men/24.jpg' },
  { username: 'LongOnlyBull', avatar: 'https://randomuser.me/api/portraits/men/25.jpg' },
  { username: 'DeltaNeutral', avatar: 'https://randomuser.me/api/portraits/men/64.jpg' },
  { username: 'FuturesKing', avatar: 'https://randomuser.me/api/portraits/men/26.jpg' },
  { username: 'OnChainOG', avatar: 'https://randomuser.me/api/portraits/men/27.jpg' },
  { username: 'RektProof', avatar: 'https://randomuser.me/api/portraits/men/28.jpg' },
  { username: 'MoonMathBot', avatar: 'https://randomuser.me/api/portraits/men/29.jpg' },
];

const MULTI_GRID_CAPTIONS = [
  'All positions opened based on volume profile analysis. Results are clear.',
  'Running multi-coin strategy today. Portfolio performing well.',
  'Cross-margin positions all green. Macro setup confirmed.',
  'Opened 4 positions simultaneously on market structure break.',
  'Diversified leverage play across top assets. Risk managed.',
  'Multi-leg momentum trade active. Scaling in on dips.',
  'Portfolio snapshot — been holding these since the breakout.',
  'Technical confluence on all 4 charts. Letting it ride.',
  'High conviction multi-position setup. Entry was clean.',
  'Running correlated longs across majors. Thesis intact.',
];

const LEVERAGES = [5, 10, 15, 20, 25, 50, 75, 100];

const GAINERS_POST_USERS = [
  { username: 'BlockchainEmpire', avatar: 'https://randomuser.me/api/portraits/men/33.jpg' },
  { username: 'CryptoMarketLens', avatar: 'https://randomuser.me/api/portraits/men/34.jpg' },
  { username: 'DoctorMedia_Crypto', avatar: 'https://randomuser.me/api/portraits/men/35.jpg' },
  { username: 'SyndicateOfficial', avatar: 'https://randomuser.me/api/portraits/women/21.jpg' },
  { username: 'BullishSignals', avatar: 'https://randomuser.me/api/portraits/men/37.jpg' },
  { username: 'WhaleWatcher99', avatar: 'https://randomuser.me/api/portraits/men/38.jpg' },
  { username: 'CryptoZeroAnalysis', avatar: 'https://randomuser.me/api/portraits/men/39.jpg' },
  { username: 'AltSeasonTracker', avatar: 'https://randomuser.me/api/portraits/men/40.jpg' },
];

const GAINERS_CAPTIONS = [
  'Today Top Gainers',
  'Today Top Losers — be careful',
  'These are pumping RIGHT NOW',
  'Market snapshot — biggest movers',
  'Hot coins today. Which one are you trading?',
  'Top performers this session',
  'Gainers leading the charge today',
  'Watch these coins closely',
];

const MEME_POST_USERS = [
  { username: 'Crypto_Memes_Daily', avatar: 'https://randomuser.me/api/portraits/men/41.jpg' },
  { username: 'DoktorProfit', avatar: 'https://randomuser.me/api/portraits/men/42.jpg' },
  { username: 'BullRunMemes', avatar: 'https://randomuser.me/api/portraits/men/43.jpg' },
  { username: 'HodlNation', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { username: 'DegenTrader9000', avatar: 'https://randomuser.me/api/portraits/men/45.jpg' },
  { username: 'SatoshiDisciple', avatar: 'https://randomuser.me/api/portraits/men/46.jpg' },
  { username: 'NightOwlTrader', avatar: 'https://randomuser.me/api/portraits/men/47.jpg' },
];

const MEME_CONTENT_POOL: Array<{ content: string; tags: string[]; sentiment: 'bullish' | 'bearish' | 'neutral' }> = [
  { content: 'I make 1.6M$ from $BTC this cycle. Bought myself a reminder.', tags: ['BTC', 'ETH'], sentiment: 'bullish' },
  { content: 'New Lamborghini Urus. $SOL futures made this possible.', tags: ['SOL', 'BTC'], sentiment: 'bullish' },
  { content: 'Rolex Daytona. The day $BTC crossed $100K. Never forgetting.', tags: ['BTC'], sentiment: 'bullish' },
  { content: 'When your $ETH gains pay for the car outright with cash. Different life.', tags: ['ETH', 'SOL'], sentiment: 'bullish' },
  { content: 'Private jet to Dubai. $BTC $SOL doing the work so I don\'t have to.', tags: ['BTC', 'SOL'], sentiment: 'bullish' },
  { content: 'Working from my yacht this week. $ETH $SOL paying for everything.', tags: ['ETH', 'SOL'], sentiment: 'bullish' },
  { content: 'They said crypto was a scam. This is my 4th Rolex. $BTC $ETH', tags: ['BTC', 'ETH'], sentiment: 'bullish' },
  { content: 'Started with $500. Now I can afford this. $SOL changed my life completely.', tags: ['SOL', 'BTC'], sentiment: 'bullish' },
  { content: 'JUST IN: $2T wiped from U.S. stock market. $BTC holding strong. $TRUMP $SOL', tags: ['BTC', 'SOL'], sentiment: 'bearish' },
  { content: '$XRP can make you rich. $500 becomes $50,000. One day the chart will shock everyone.', tags: ['XRP', 'BTC'], sentiment: 'bullish' },
  { content: 'BREAKING: BlackRock BTC ETF record $3.2B inflow. Institutions are here. $BTC', tags: ['BTC', 'ETH'], sentiment: 'bullish' },
  { content: 'Ferrari F8 delivered. $BNB $SOL portfolio doing the work. 0 regrets.', tags: ['BNB', 'SOL'], sentiment: 'bullish' },
  { content: 'Porsche 911 Turbo S. Entry was $1,800. Exit was $4,200. Do the math. $ETH', tags: ['ETH'], sentiment: 'bullish' },
  { content: 'Maldives overwater bungalow. Third one this year. $SOL made this the base case.', tags: ['SOL', 'ARB'], sentiment: 'bullish' },
  { content: 'McLaren 720S last weekend. $SOL options did most of the heavy lifting.', tags: ['SOL'], sentiment: 'bullish' },
  { content: 'AP Royal Oak. The gains from $ETH staking funded this. Patience pays.', tags: ['ETH'], sentiment: 'bullish' },
  { content: 'Penthouse in Singapore for Q1. $SOL $TIA funding the whole trip.', tags: ['SOL', 'TIA'], sentiment: 'bullish' },
  { content: 'Beach villa in Bali for the month. $ETH yield farming pays for the rent.', tags: ['ETH'], sentiment: 'bullish' },
  { content: 'JUST IN: US-China trade war escalates — 60% tariffs announced. $BTC $BNB', tags: ['BTC', 'BNB'], sentiment: 'bearish' },
  { content: 'BREAKING: SEC drops charges against DeFi. $ETH $UNI surging 15%+ in minutes.', tags: ['ETH', 'BTC'], sentiment: 'bullish' },
  { content: 'My portfolio just hit $1M. First thing I did was book this trip. $BTC', tags: ['BTC'], sentiment: 'bullish' },
  { content: 'Charter yacht in Croatia. $WIF $BONK memecoins funded this trip honestly.', tags: ['WIF', 'BONK'], sentiment: 'bullish' },
  { content: 'Island hopping Greece. $SOL $TIA covering every expense without touching principal.', tags: ['SOL', 'TIA'], sentiment: 'bullish' },
  { content: 'New Lamborghini Urus. $APT $ARB gains. Altseason is real. Period.', tags: ['APT', 'ARB'], sentiment: 'bullish' },
  { content: 'Woke up to a $PEPE 300% candle. Life is beautiful from the yacht.', tags: ['PEPE', 'ETH'], sentiment: 'bullish' },
  { content: 'Third bull run. Third car upgrade. Pattern recognition is a skill. $BTC $SOL', tags: ['BTC', 'SOL'], sentiment: 'bullish' },
];

const LUXURY_WEALTH_IMAGES = [
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2127733/pexels-photo-2127733.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3972755/pexels-photo-3972755.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/163236/pexels-photo-163236.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3278818/pexels-photo-3278818.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2599124/pexels-photo-2599124.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2161448/pexels-photo-2161448.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/9978741/pexels-photo-9978741.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/277390/pexels-photo-277390.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2113994/pexels-photo-2113994.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1579240/pexels-photo-1579240.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/618833/pexels-photo-618833.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1438761/pexels-photo-1438761.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1450363/pexels-photo-1450363.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/244206/pexels-photo-244206.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2127733/pexels-photo-2127733.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2527130/pexels-photo-2527130.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateMultiGridPost(pc: PriceCache): SocialPost | null {
  const count = pickRandom([2, 2, 3, 3, 4]);
  const shuffled = [...MULTI_GRID_COINS].sort(() => Math.random() - 0.5);
  const chosenCoins = shuffled.slice(0, count);

  const positions: any[] = [];
  for (const coin of chosenCoins) {
    const cached = pc.getBySymbol(coin);
    if (!cached || cached.price <= 0) return null;
    const markPrice = cached.price;
    const leverage = pickRandom(LEVERAGES);
    const isWin = Math.random() < 0.82;
    const baseRoi = 15 + Math.random() * 280;
    const roi = isWin ? baseRoi : -(5 + Math.random() * 30);
    const isLong = isWin ? (Math.random() < 0.75 ? 'long' : 'short') : (Math.random() < 0.5 ? 'long' : 'short');
    const entry = isLong === 'long'
      ? markPrice / (1 + roi / 100 / leverage)
      : markPrice / (1 - roi / 100 / leverage);
    const liq = isLong === 'long'
      ? entry * (1 - 0.9 / leverage)
      : entry * (1 + 0.9 / leverage);
    const margin = 500 + Math.random() * 25000;
    const size = margin * leverage;
    const pnl = (roi / 100) * margin;
    const marginRatio = (100 / leverage * 0.8);
    positions.push({
      coin, type: isLong, leverage, pnl, roi, size, margin, entry, mark: markPrice, liq, margin_ratio: marginRatio,
    });
  }

  if (positions.length < 2) return null;

  const user = pickRandom(MULTI_GRID_USERS);
  const fakeNow = new Date();
  fakeNow.setSeconds(fakeNow.getSeconds() - Math.floor(Math.random() * 60));

  const assetChange = 2000 + Math.random() * 180000;
  const coinTags = positions.map(p => ({
    symbol: p.coin,
    change: Number(((p.roi / p.leverage) * 0.8 + (Math.random() * 2 - 0.5)).toFixed(2)),
  }));

  return {
    id: `multi_${Date.now()}_${Math.random()}`,
    username: user.username,
    avatar_url: user.avatar,
    content: pickRandom(MULTI_GRID_CAPTIONS),
    coin_symbol: positions[0].coin,
    trade_type: 'long',
    entry_price: positions[0].entry,
    exit_price: positions[0].mark,
    profit_loss: positions[0].pnl,
    profit_loss_percent: positions[0].roi,
    leverage: positions[0].leverage,
    image_url: null,
    likes_count: Math.floor(10 + Math.random() * 800),
    comments_count: Math.floor(3 + Math.random() * 150),
    shares_count: Math.floor(5 + Math.random() * 300),
    is_bullish: true,
    created_at: fakeNow.toISOString(),
    post_type: 'multi_position',
    sub_positions: positions,
    asset_change_30d: assetChange,
    coin_tags: coinTags,
    sentiment: 'bullish',
  };
}

function generateGainersPost(pc: PriceCache): SocialPost {
  const mode = Math.random() < 0.7 ? 'gainers' : 'losers';
  const rows = generateGainersRows(mode, pc, 5);
  const user = pickRandom(GAINERS_POST_USERS);
  const fakeNow = new Date();
  fakeNow.setSeconds(fakeNow.getSeconds() - Math.floor(Math.random() * 120));
  const coinTags = rows.slice(0, 3).map(r => ({ symbol: r.symbol, change: r.change }));
  return {
    id: `gainers_${Date.now()}_${Math.random()}`,
    username: user.username,
    avatar_url: user.avatar,
    content: pickRandom(GAINERS_CAPTIONS),
    coin_symbol: rows[0]?.symbol || 'BTC',
    trade_type: 'long',
    entry_price: 0,
    exit_price: 0,
    profit_loss: 0,
    profit_loss_percent: 0,
    leverage: 1,
    image_url: null,
    likes_count: Math.floor(2 + Math.random() * 120),
    comments_count: Math.floor(1 + Math.random() * 40),
    shares_count: Math.floor(1 + Math.random() * 30),
    view_count: Math.floor(100 + Math.random() * 80000),
    repost_count: Math.floor(1 + Math.random() * 25),
    is_bullish: mode === 'gainers',
    created_at: fakeNow.toISOString(),
    post_type: 'market_gainers',
    coin_tags: coinTags,
    sentiment: mode === 'gainers' ? 'bullish' : 'bearish',
    gainers_mode: mode,
    gainers_rows: rows,
  };
}

const SINGLE_POS_USERS = [
  { username: 'CryptoKing_X', avatar: 'https://randomuser.me/api/portraits/men/50.jpg' },
  { username: 'FuturesAlpha9', avatar: 'https://randomuser.me/api/portraits/men/51.jpg' },
  { username: 'BullishOG', avatar: 'https://randomuser.me/api/portraits/men/52.jpg' },
  { username: 'TradeMasterPro', avatar: 'https://randomuser.me/api/portraits/men/53.jpg' },
  { username: 'LeverageGod', avatar: 'https://randomuser.me/api/portraits/women/30.jpg' },
  { username: 'DegenKing100x', avatar: 'https://randomuser.me/api/portraits/men/54.jpg' },
  { username: 'WhaleDumpling', avatar: 'https://randomuser.me/api/portraits/men/55.jpg' },
  { username: 'PerpMaster_OG', avatar: 'https://randomuser.me/api/portraits/men/56.jpg' },
  { username: 'SoloBull2025', avatar: 'https://randomuser.me/api/portraits/men/57.jpg' },
  { username: 'CryptoScalper', avatar: 'https://randomuser.me/api/portraits/women/31.jpg' },
  { username: 'LongOnlyVibes', avatar: 'https://randomuser.me/api/portraits/men/58.jpg' },
  { username: 'BreakevenNever', avatar: 'https://randomuser.me/api/portraits/men/59.jpg' },
  { username: 'EntryMasterX', avatar: 'https://randomuser.me/api/portraits/men/60.jpg' },
  { username: 'NightFutures', avatar: 'https://randomuser.me/api/portraits/men/61.jpg' },
  { username: 'MomentumRider', avatar: 'https://randomuser.me/api/portraits/women/32.jpg' },
  { username: 'BitcoinMaximalist', avatar: 'https://randomuser.me/api/portraits/men/62.jpg' },
  { username: 'AltcoinProfessor', avatar: 'https://randomuser.me/api/portraits/men/63.jpg' },
  { username: 'PnL_Printer99', avatar: 'https://randomuser.me/api/portraits/men/65.jpg' },
  { username: 'TrendFollower22', avatar: 'https://randomuser.me/api/portraits/men/66.jpg' },
  { username: 'RiskRewardKing', avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
];

const SINGLE_POS_CAPTIONS = [
  'Clean entry. Letting it run.',
  'Structure confirmed. Position sized accordingly.',
  'Been patient on this setup for days. Finally triggered.',
  'Risk/reward on this one is insane.',
  'Adding to winners. This is the way.',
  'Stop already moved to BE. Pure profits from here.',
  'Volume confirmation + breakout. Opened full size.',
  'Macro trend aligned with micro structure. High conviction.',
  'Took the trade. Results speak for themselves.',
  'Waited 3 days for this entry. Worth every minute.',
  'Pure technical setup. Nothing else needed.',
  'This coin had written all over it. Position open.',
  'Early in the move. Leverage sized correctly.',
  'Checklist complete. Trade is live.',
  'Thesis intact. Not moving until target.',
];

const SINGLE_POS_COINS = [
  'BTC','ETH','SOL','BNB','XRP','AVAX','DOGE','LINK','DOT','ADA',
  'TON','TRX','NEAR','OP','ARB','INJ','SUI','APT','ATOM','WLD',
  'WIF','BONK','SEI','TIA','FTM','LTC','ONDO','PEPE','SHIB','FLOKI',
];

function generateSinglePositionPost(pc: PriceCache): SocialPost | null {
  const coin = pickRandom(SINGLE_POS_COINS);
  const cached = pc.getBySymbol(coin);
  if (!cached || cached.price <= 0) return null;
  const markPrice = cached.price;
  const leverage = pickRandom(LEVERAGES);
  const isWin = Math.random() < 0.82;
  const roi = isWin ? 8 + Math.random() * 320 : -(3 + Math.random() * 28);
  const tradeType: 'long' | 'short' = Math.random() < 0.72 ? 'long' : 'short';
  const entryPrice = tradeType === 'long'
    ? markPrice / (1 + roi / 100 / leverage)
    : markPrice / (1 - roi / 100 / leverage);
  const marginTier = Math.random();
  const margin = marginTier < 0.55
    ? 500 + Math.random() * 4500
    : marginTier < 0.85
      ? 5000 + Math.random() * 20000
      : 25000 + Math.random() * 75000;
  const pnl = (roi / 100) * margin;
  const user = pickRandom(SINGLE_POS_USERS);
  const fakeNow = new Date();
  fakeNow.setSeconds(fakeNow.getSeconds() - Math.floor(Math.random() * 60));
  const coinTag: CoinTag = { symbol: coin, change: Number(((roi / leverage) * 0.6 + (Math.random() * 2 - 0.5)).toFixed(2)) };
  return {
    id: `single_${Date.now()}_${Math.random()}`,
    username: user.username,
    avatar_url: user.avatar,
    content: pickRandom(SINGLE_POS_CAPTIONS),
    coin_symbol: coin,
    trade_type: tradeType,
    entry_price: entryPrice,
    exit_price: markPrice,
    profit_loss: pnl,
    profit_loss_percent: roi,
    leverage,
    image_url: null,
    likes_count: Math.floor(5 + Math.random() * 600),
    comments_count: Math.floor(2 + Math.random() * 120),
    shares_count: Math.floor(3 + Math.random() * 200),
    view_count: Math.floor(200 + Math.random() * 120000),
    repost_count: Math.floor(1 + Math.random() * 80),
    is_bullish: tradeType === 'long' ? roi > 0 : roi < 0,
    created_at: fakeNow.toISOString(),
    post_type: 'trade_share',
    coin_tags: [coinTag],
    sentiment: roi > 0 ? 'bullish' : 'bearish',
  };
}

function generateMemePost(pc: PriceCache, pickImage?: () => string | null): SocialPost {
  const meme = pickRandom(MEME_CONTENT_POOL);
  const user = pickRandom(MEME_POST_USERS);
  const fakeNow = new Date();
  fakeNow.setSeconds(fakeNow.getSeconds() - Math.floor(Math.random() * 180));
  const imageCount = Math.random() < 0.4 ? 2 : 1;
  // DB fotoğraf pool'u varsa önce oradan al, yoksa hardcoded listeden
  const img1 = (pickImage && pickImage()) || pickRandom(LUXURY_WEALTH_IMAGES);
  const img2 = imageCount > 1 ? ((pickImage && pickImage()) || pickRandom(LUXURY_WEALTH_IMAGES.filter(i => i !== img1))) : null;
  const coinTags = meme.tags.map(sym => {
    const cached = pc.getBySymbol(sym);
    const change = cached?.change24h !== undefined
      ? Number(cached.change24h.toFixed(2))
      : Number(((Math.random() * 10 - 3)).toFixed(2));
    return { symbol: sym, change };
  });
  return {
    id: `meme_${Date.now()}_${Math.random()}`,
    username: user.username,
    avatar_url: user.avatar,
    content: meme.content,
    coin_symbol: meme.tags[0] || 'BTC',
    trade_type: 'long',
    entry_price: 0,
    exit_price: 0,
    profit_loss: 0,
    profit_loss_percent: 0,
    leverage: 1,
    image_url: img1,
    image_url_2: img2,
    likes_count: Math.floor(5 + Math.random() * 500),
    comments_count: Math.floor(3 + Math.random() * 120),
    shares_count: Math.floor(2 + Math.random() * 80),
    view_count: Math.floor(200 + Math.random() * 120000),
    repost_count: Math.floor(2 + Math.random() * 45),
    is_bullish: meme.sentiment !== 'bearish',
    created_at: fakeNow.toISOString(),
    post_type: 'meme',
    coin_tags: coinTags,
    sentiment: meme.sentiment,
  };
}

function richPostToSocialPost(gp: GeneratedPost): SocialPost {
  return {
    id: gp.id,
    username: gp.username,
    avatar_url: gp.avatar_url,
    content: gp.content,
    coin_symbol: gp.coin_symbol,
    trade_type: gp.trade_type,
    entry_price: gp.entry_price,
    exit_price: gp.exit_price,
    profit_loss: gp.profit_loss,
    profit_loss_percent: gp.profit_loss_percent,
    leverage: gp.leverage,
    image_url: gp.image_url,
    image_url_2: gp.image_url_2,
    image_url_3: gp.image_url_3,
    post_type: gp.post_type,
    likes_count: gp.likes_count,
    comments_count: gp.comments_count,
    shares_count: gp.shares_count,
    view_count: gp.view_count,
    repost_count: gp.repost_count,
    is_bullish: gp.is_bullish,
    created_at: gp.created_at,
    coin_tags: gp.coin_tags,
    asset_change_30d: gp.asset_change_30d,
    sub_positions: gp.sub_positions,
    live_room_data: gp.live_room_data,
    sentiment: gp.sentiment,
    gainers_mode: gp.gainers_mode,
    gainers_rows: gp.gainers_rows,
    extra_data: gp.extra_data,
  };
}

type FeedItem =
  | { kind: 'post'; data: SocialPost }
  | { kind: 'news'; data: LiveNewsItem }
  | { kind: 'basonce'; data: BasonceNewsItem };

function makeBasonceItem(idx: number): BasonceNewsItem {
  const pool = BASONCE_NEWS_POOL;
  const src = pool[idx % pool.length];
  const ages = ['Just now', '2m', '5m', '8m', '12m', '18m', '25m', '34m', '47m', '1h'];
  return {
    ...src,
    id: `basonce_${idx}_${Date.now()}`,
    age: ages[idx % ages.length],
    likes: 120 + Math.floor(Math.random() * 2200),
    comments: 14 + Math.floor(Math.random() * 380),
    shares: 28 + Math.floor(Math.random() * 650),
  };
}

function buildInitialFeed(posts: SocialPost[], newsPool: LiveNewsItem[], pc?: PriceCache, pickImage?: () => string | null): FeedItem[] {
  const items: FeedItem[] = [];
  let ni = 0;
  let bi = 0;
  const seenContents = new Set<string>();
  const usernameLastPos = new Map<string, number>();
  let postPos = 0;
  posts.forEach((post, idx) => {
    const contentKey = post.content?.slice(0, 60) ?? '';
    const lastPos = usernameLastPos.get(post.username) ?? -999;
    if (seenContents.has(contentKey) || (postPos - lastPos) < 12) return;
    seenContents.add(contentKey);
    usernameLastPos.set(post.username, postPos);
    postPos++;
    items.push({ kind: 'post', data: post });
    if ((idx + 1) % 4 === 0) {
      items.push({ kind: 'basonce', data: makeBasonceItem(bi++) });
    }
    if ((idx + 1) % 2 === 0 && pc) {
      const sp = generateSinglePositionPost(pc);
      if (sp) items.push({ kind: 'post', data: sp });
    }
    if ((idx + 1) % 3 === 0 && pc) {
      const mg = generateMultiGridPost(pc);
      if (mg) items.push({ kind: 'post', data: mg });
    }
    if ((idx + 1) % 8 === 0 && pc) {
      items.push({ kind: 'post', data: generateMemePost(pc, pickImage) });
    }
    if ((idx + 1) % 10 === 0 && pc) {
      items.push({ kind: 'post', data: richPostToSocialPost(generateRandomRichPost(pc)) });
    }
    if ((idx + 1) % 7 === 0 && newsPool.length > 0) {
      items.push({ kind: 'news', data: newsPool[ni % newsPool.length] });
      ni++;
    }
  });
  return items;
}

export default function SocialFeed() {
  const [feedItems, setFeedItemsState] = useState<FeedItem[]>([]);
  const setFeedItems = (updater: FeedItem[] | ((prev: FeedItem[]) => FeedItem[])) => {
    setFeedItemsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      feedItemsRef.current = next;
      return next;
    });
  };
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const newsPoolRef = useRef<LiveNewsItem[]>(generateLiveNews());
  const priceCacheRef = useRef(PriceCache.getInstance());
  const [, setPriceVersion] = useState(0);
  const allPostsRef = useRef<SocialPost[]>([]);
  const initializedRef = useRef(false);
  const shownPostIdsRef = useRef<Set<string>>(new Set());
  const postCycleIndexRef = useRef(0);
  const viewCountMapRef = useRef<Map<string, number>>(new Map());
  const feedItemsRef = useRef<FeedItem[]>([]);
  const dbNewsPoolRef = useRef<BasonceNewsItem[]>([]);
  const dbNewsIndexRef = useRef(0);

  const pricesAdjustedRef = useRef(false);
  const adjustPostRef = useRef<(p: SocialPost) => SocialPost>(() => ({} as SocialPost));
  const ensureWinBiasRef = useRef<(p: SocialPost) => SocialPost>(() => ({} as SocialPost));
  // DB'den gelen fotoğraf pool'u - 2433 foto döngüsel kullanım
  const dbImagePoolRef = useRef<string[]>([]);
  const dbImageIndexRef = useRef(0);
  const usedImageCooldownRef = useRef<Map<string, number>>(new Map());
  const IMAGE_COOLDOWN_MS = 5 * 60 * 1000; // 5 dakika - 2433 foto var, cooldown kisa tutulur

  const fetchRealNews = async () => {
    try {
      const { data } = await supabase
        .from('news_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data && data.length > 0) {
        const ages = ['Just now', '2m', '5m', '8m', '12m', '18m', '25m', '34m', '47m', '1h'];
        const mapped: BasonceNewsItem[] = data.map((n: any, i: number) => ({
          id: `db_news_${n.id}`,
          category: (n.category || 'MARKET') as BasonceNewsItem['category'],
          title: n.title,
          summary: n.summary || n.title,
          coin: n.coin || undefined,
          change: n.change_percent !== 0 ? Number(n.change_percent) : undefined,
          sentiment: (n.sentiment || 'neutral') as 'bullish' | 'bearish' | 'neutral',
          age: i === 0 ? 'Just now' : ages[i % ages.length],
          likes: 80 + Math.floor(Math.random() * 1800),
          comments: 10 + Math.floor(Math.random() * 280),
          shares: 20 + Math.floor(Math.random() * 500),
          url: n.url || undefined,
          source: n.source || undefined,
        }));
        dbNewsPoolRef.current = mapped;
        newsPoolRef.current = mapped.map((n, i) => ({
          id: `live_${n.id}`,
          title: n.title,
          summary: n.summary,
          coin: n.coin || 'BTC',
          category: (['WHALE', 'DeFi', 'TECHNOLOGY', 'REGULATION', 'BREAKING'].includes(n.category)
            ? n.category : 'MARKET') as LiveNewsItem['category'],
          sentiment: n.sentiment,
          change: n.change,
          source: n.source || 'CryptoNews',
          age: i === 0 ? 'Just now' : `${(i + 1) * 3}m`,
        }));
      }
    } catch (_e) {}
  };

  useEffect(() => {
    const pc = priceCacheRef.current;
    pc.init();
    const unsub = pc.subscribe(() => {
      setPriceVersion(v => v + 1);
      if (!pricesAdjustedRef.current && allPostsRef.current.length > 0) {
        const testCoin = allPostsRef.current.find(p => p.coin_symbol)?.coin_symbol;
        const cached = testCoin ? pc.getBySymbol(testCoin) : null;
        if (cached && cached.price > 0) {
          pricesAdjustedRef.current = true;
          const readjusted = allPostsRef.current.map(p => {
            const base = ensureWinBiasRef.current(adjustPostRef.current(p));
            if (base.post_type === 'meme' && !base.image_url) {
              const img = pickDbImage();
              if (img) return { ...base, image_url: img };
            }
            return base;
          });
          allPostsRef.current = readjusted;
          setFeedItems(buildInitialFeed(readjusted.slice(0, 50), newsPoolRef.current, pc, () => pickDbImage()));
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    // fetchDbImages önce yüklensin ki buildInitialFeed sırasında pool hazır olsun
    fetchDbImages().then(() => fetchPosts());
    fetchLiveRooms();
    fetchRealNews();

    const postsInterval = setInterval(fetchPosts, 300000);
    const roomsInterval = setInterval(fetchLiveRooms, 60000);
    const newsRefetchInterval = setInterval(fetchRealNews, 15 * 60 * 1000);
    const listenerInterval = setInterval(() => {
      setLiveRooms(prev => prev.map(room => ({
        ...room,
        listener_count: Math.max(100, room.listener_count + Math.floor(Math.random() * 40) - 5),
      })));
    }, 15000);

    const viewCountInterval = setInterval(() => {
      const vcMap = viewCountMapRef.current;
      if (vcMap.size === 0) return;
      vcMap.forEach((val, key) => {
        const increment = Math.floor(Math.random() * 8) + 1;
        vcMap.set(key, val + increment);
      });
      setPriceVersion(v => v + 1);
    }, 12000);

    let autoInjectCount = 0;
    const autoInjectInterval = setInterval(() => {
      const posts = allPostsRef.current;
      if (posts.length === 0) return;
      autoInjectCount++;
      const pc = priceCacheRef.current;

      if (autoInjectCount % 3 === 0) {
        const dbPool = dbNewsPoolRef.current;
        let bItem: BasonceNewsItem;
        if (dbPool.length > 0) {
          const idx = dbNewsIndexRef.current % dbPool.length;
          dbNewsIndexRef.current++;
          bItem = { ...dbPool[idx], id: `inject_${Date.now()}_${Math.random()}`, age: 'Just now' };
        } else {
          bItem = makeBasonceItem(autoInjectCount);
        }
        setFeedItems(prev => [{ kind: 'basonce', data: bItem }, ...prev.slice(0, 400)]);
        return;
      }

      const r = Math.random();
      let newPost: SocialPost | null = null;

      if (r < 0.40) {
        newPost = generateSinglePositionPost(pc);
      } else if (r < 0.65) {
        newPost = generateMultiGridPost(pc);
      } else if (r < 0.78) {
        newPost = generateMemePost(pc, () => pickDbImage());
      } else if (r < 0.88) {
        newPost = richPostToSocialPost(generateRandomRichPost(pc));
      } else {
        // Pick next unseen post from cycle - skip if same user posted same content recently
        let cycleIdx = postCycleIndexRef.current;
        if (cycleIdx >= posts.length) {
          // Full cycle complete - reset
          shownPostIdsRef.current = new Set();
          cycleIdx = 0;
        }
        let pick = posts[cycleIdx];
        let skips = 0;
        // Build a lookup from the last 50 injected posts: content fingerprints + username last-seen time
        const recentInjected = feedItemsRef.current
          .filter(fi => fi.kind === 'post')
          .slice(0, 50)
          .map(fi => fi.data as SocialPost);
        const recentContentSet = new Set(recentInjected.map(p => p.content?.slice(0, 60) ?? ''));
        const usernameLastIndex = new Map<string, number>();
        recentInjected.forEach((p, i) => {
          if (!usernameLastIndex.has(p.username)) usernameLastIndex.set(p.username, i);
        });
        while (skips < 30) {
          const contentKey = pick.content?.slice(0, 60) ?? '';
          const isDupeContent = recentContentSet.has(contentKey);
          // Same user must be at least 15 posts apart in the feed
          const lastIdx = usernameLastIndex.get(pick.username) ?? 999;
          const sameUserTooRecent = lastIdx < 15;
          if (!isDupeContent && !sameUserTooRecent) break;
          cycleIdx = (cycleIdx + 1) % posts.length;
          pick = posts[cycleIdx];
          skips++;
        }
        postCycleIndexRef.current = cycleIdx + 1;
        shownPostIdsRef.current.add(pick.id);
        const fakeNow = new Date();
        fakeNow.setSeconds(fakeNow.getSeconds() - Math.floor(Math.random() * 30));
        let built: SocialPost = {
          ...pick,
          id: `auto_${Date.now()}_${Math.random()}`,
          created_at: fakeNow.toISOString(),
        };
        if (pick.coin_symbol && pick.leverage > 1 && pick.profit_loss_percent !== 0) {
          const cached = pc.getBySymbol(pick.coin_symbol);
          if (cached && cached.price > 0) {
            const markPrice = cached.price;
            const roiRaw = pick.profit_loss_percent;
            const isWin = Math.random() < 0.78;
            const roi = isWin ? Math.abs(roiRaw) : -Math.abs(roiRaw);
            const isLong = isWin ? 'long' : (Math.random() < 0.5 ? 'long' : 'short');
            const entryPrice = isLong === 'long'
              ? markPrice / (1 + roi / 100 / pick.leverage)
              : markPrice / (1 - roi / 100 / pick.leverage);
            const marginTier = Math.random();
            const margin = marginTier < 0.6
              ? 500 + Math.random() * 4500
              : marginTier < 0.88
                ? 5000 + Math.random() * 20000
                : 25000 + Math.random() * 75000;
            const pnlUSDT = (roi / 100) * margin;
            built = {
              ...built,
              entry_price: entryPrice,
              exit_price: markPrice,
              profit_loss: pnlUSDT,
              profit_loss_percent: roi,
              trade_type: isLong as 'long' | 'short',
              is_bullish: roi > 0,
            };
          }
        }
        newPost = built;
      }

      if (newPost) {
        setFeedItems(prev => [{ kind: 'post', data: newPost! }, ...prev.slice(0, 400)]);
      }
    }, 18000);

    const newsRefreshInterval = setInterval(() => {
      const pool = newsPoolRef.current;
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const newNewsItem: LiveNewsItem = { ...pick, id: `news_pool_${Date.now()}`, age: 'Just now' };
        newsPoolRef.current = [newNewsItem, ...pool.filter(n => n.id !== pick.id).slice(0, 11)];
      } else {
        const existing = pool.map(n => n.title);
        const fresh = CRYPTO_NEWS_POOL.filter(n => !existing.includes(n.title));
        const fallback = fresh.length > 0
          ? fresh[Math.floor(Math.random() * fresh.length)]
          : CRYPTO_NEWS_POOL[Math.floor(Math.random() * CRYPTO_NEWS_POOL.length)];
        newsPoolRef.current = [{ ...fallback, id: `news_pool_${Date.now()}`, age: 'Just now' }, ...pool.slice(0, 11)];
      }
    }, 45000);

    return () => {
      clearInterval(postsInterval);
      clearInterval(roomsInterval);
      clearInterval(listenerInterval);
      clearInterval(viewCountInterval);
      clearInterval(autoInjectInterval);
      clearInterval(newsRefreshInterval);
      clearInterval(newsRefetchInterval);
    };
  }, []);

  const isValidTradingPost = (post: SocialPost): boolean => {
    const hasPosition = post.profit_loss_percent !== 0 && post.leverage > 1 && post.coin_symbol;
    const hasMultiPos = post.post_type === 'multi_position' && post.sub_positions && post.sub_positions.length > 0;
    const isMemeOrNews = (post.post_type === 'meme' || post.post_type === 'news') && !!post.content && !!post.coin_symbol;
    return hasPosition || hasMultiPos || isMemeOrNews;
  };

  const adjustPost = (post: SocialPost): SocialPost => {
    if (!post.profit_loss_percent || !post.leverage || post.leverage <= 1) return post;
    const pc = priceCacheRef.current;
    const cached = post.coin_symbol ? pc.getBySymbol(post.coin_symbol) : null;
    if (!cached || cached.price <= 0) return post;

    const markPrice = cached.price;
    const roi = post.profit_loss_percent;
    const tradeType = post.trade_type || 'long';
    const entryPrice = tradeType === 'long'
      ? markPrice / (1 + roi / 100 / post.leverage)
      : markPrice / (1 - roi / 100 / post.leverage);

    const marginTier = Math.random();
    const margin = marginTier < 0.6
      ? 500 + Math.random() * 4500
      : marginTier < 0.88
        ? 5000 + Math.random() * 20000
        : 25000 + Math.random() * 75000;
    const pnlUSDT = (roi / 100) * margin;

    return {
      ...post,
      entry_price: entryPrice,
      exit_price: markPrice,
      profit_loss: pnlUSDT,
    };
  };
  adjustPostRef.current = adjustPost;

  const ensureWinBias = (post: SocialPost): SocialPost => {
    const rand = Math.random();
    if (post.post_type === 'multi_position') return post;
    if (!post.profit_loss_percent || !post.leverage || post.leverage <= 1) return post;
    const isCurrentlyWin = post.profit_loss_percent > 0;
    if (!isCurrentlyWin && rand < 0.75) {
      return {
        ...post,
        profit_loss: Math.abs(post.profit_loss),
        profit_loss_percent: Math.abs(post.profit_loss_percent),
        is_bullish: true,
        trade_type: 'long',
      };
    }
    if (isCurrentlyWin && rand < 0.25) {
      return {
        ...post,
        profit_loss: -Math.abs(post.profit_loss),
        profit_loss_percent: -Math.abs(post.profit_loss_percent),
        is_bullish: false,
      };
    }
    return post;
  };
  ensureWinBiasRef.current = ensureWinBias;

  const fetchDbImages = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_all_meme_image_urls');
      if (error) throw error;
      if (data && Array.isArray(data) && data.length > 0) {
        const urls: string[] = data.filter((u: any) => typeof u === 'string' && u.length > 0);
        const shuffled = [...urls].sort(() => Math.random() - 0.5);
        dbImagePoolRef.current = shuffled;
        dbImageIndexRef.current = 0;
      }
    } catch (e) {
      console.error('[fetchDbImages] error:', e);
    }
  };

  const pickDbImage = (): string | null => {
    const pool = dbImagePoolRef.current;
    if (pool.length === 0) return null;
    const now = Date.now();
    // Temizle: süresi dolmuş cooldown kayıtları
    usedImageCooldownRef.current.forEach((ts, url) => {
      if (now - ts > IMAGE_COOLDOWN_MS) usedImageCooldownRef.current.delete(url);
    });
    // Cooldown'da olmayan bir foto bul (max 50 deneme)
    let tries = 0;
    while (tries < 50) {
      const idx = dbImageIndexRef.current % pool.length;
      dbImageIndexRef.current++;
      const url = pool[idx];
      if (!usedImageCooldownRef.current.has(url)) {
        usedImageCooldownRef.current.set(url, now);
        return url;
      }
      tries++;
    }
    // Tüm fotolar cooldown'daysa en eskisini kullan
    const idx = dbImageIndexRef.current % pool.length;
    dbImageIndexRef.current++;
    return pool[idx];
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3243);
      if (error) throw error;
      const filtered = (data || []).filter(isValidTradingPost);
      const pc = priceCacheRef.current;
      const pricesReady = filtered.some(p => {
        const c = p.coin_symbol ? pc.getBySymbol(p.coin_symbol) : null;
        return c && c.price > 0;
      });
      // image_url olmayan meme postlara pool'dan resim ata
      const withImages = filtered.map(p => {
        if (p.post_type === 'meme' && !p.image_url) {
          const img = pickDbImage();
          if (img) return { ...p, image_url: img };
        }
        return p;
      });
      const adjusted = withImages.map(p => ensureWinBias(pricesReady ? adjustPost(p) : p));
      // Shuffle so each session is different
      const shuffled = [...adjusted].sort(() => Math.random() - 0.5);
      allPostsRef.current = shuffled;
      shownPostIdsRef.current = new Set();
      postCycleIndexRef.current = 0;
      if (!initializedRef.current) {
        initializedRef.current = true;
        setFeedItems(buildInitialFeed(shuffled.slice(0, 60), newsPoolRef.current, pc, () => pickDbImage()));
        shuffled.slice(0, 60).forEach(p => shownPostIdsRef.current.add(p.id));
        postCycleIndexRef.current = 60;
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('live_rooms')
        .select('*')
        .order('listener_count', { ascending: false })
        .limit(200);
      if (error) throw error;
      const all = data || [];
      const shuffled = [...all].sort(() => Math.random() - 0.5);
      setLiveRooms(shuffled);
    } catch (error) {
      console.error('Error fetching live rooms:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffMs = now.getTime() - postDate.getTime();
    const diffM = Math.floor(diffMs / (1000 * 60));
    const diffH = Math.floor(diffM / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffM < 1) return 'Just now';
    if (diffM < 60) return `${diffM}m`;
    if (diffH < 24) return `${diffH}h`;
    if (diffD < 7) return `${diffD}d`;
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPostTypeIcon = (postType?: string) => {
    switch (postType) {
      case 'analysis': return <BarChart2 className="w-3 h-3" />;
      case 'educational': return <BookOpen className="w-3 h-3" />;
      case 'live_embed': return <Radio className="w-3 h-3" />;
      case 'multi_position': return <BarChart2 className="w-3 h-3" />;
      case 'news': return <Newspaper className="w-3 h-3" />;
      default: return null;
    }
  };

  const getSentimentBadge = (post: SocialPost) => {
    if (['educational', 'event', 'personal'].includes(post.post_type || '')) return null;
    const s = post.sentiment || (post.is_bullish ? 'bullish' : 'bearish');
    if (s === 'bullish') return <span className="text-[#0ECB81] text-xs font-semibold">Bullish</span>;
    if (s === 'bearish') return <span className="text-[#F6465D] text-xs font-semibold">Bearish</span>;
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderFeedItem = (item: FeedItem, key: string) => {
    if (item.kind === 'news') return <InFeedNewsCard key={key} item={item.data} />;
    if (item.kind === 'basonce') {
      const n = item.data;
      const CATEGORY_COLOR: Record<string, string> = {
        BREAKING: '#F6465D', ANALYSIS: '#F0B90B', MARKET: '#F0B90B',
        REGULATION: '#3B82F6', ALERT: '#F59E0B', ONCHAIN: '#06B6D4',
        TECHNOLOGY: '#0ECB81', DeFi: '#06B6D4', WHALE: '#06B6D4',
      };
      const catColor = CATEGORY_COLOR[n.category] || '#F0B90B';
      return (
        <div key={key} className="bg-[#181A20] border-b border-[#2B3139] px-4 py-4 hover:bg-[#1E2026] transition-colors">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="relative w-10 h-10">
                <div
                  className="absolute inset-[-3px] rounded-full animate-spin"
                  style={{ background: 'conic-gradient(from 0deg, #F0B90B, #F8D12F, transparent, #F0B90B)', opacity: 0.9 }}
                />
                <div className="absolute inset-[-2px] rounded-full animate-pulse" style={{ boxShadow: '0 0 8px 3px #F0B90B88' }} />
                <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-[#F0B90B]">
                  <img src="/BASONCE_LOGO_SON_BITEN copy.png" alt="Basonce" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-bold text-sm text-white">Basonce News</span>
                <span
                  className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded"
                  style={{ backgroundColor: `${catColor}20`, color: catColor }}
                >
                  {n.category === 'BREAKING' && <Zap className="w-3 h-3" />}
                  {n.category}
                </span>
                {n.coin && (
                  <span className="text-[10px] font-bold text-gray-400 bg-[#2B3139] px-2 py-0.5 rounded">{n.coin}</span>
                )}
                <span className="text-xs text-gray-500 ml-auto">{n.age}</span>
                {n.change !== undefined && (
                  <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: n.change >= 0 ? '#0ECB81' : '#F6465D' }}>
                    {n.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {n.change >= 0 ? '+' : ''}{n.change}%
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white leading-snug mb-1">{n.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">{n.summary}</p>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <button className="flex items-center gap-1.5 hover:text-[#F6465D] transition-colors">
                  <Heart className="w-4 h-4" /><span>{n.likes.toLocaleString()}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <MessageCircle className="w-4 h-4" /><span>{n.comments}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" /><span>{n.shares}</span>
                </button>
                {n.sentiment !== 'neutral' && (
                  <span className="ml-auto text-xs font-semibold" style={{ color: n.sentiment === 'bullish' ? '#0ECB81' : '#F6465D' }}>
                    {n.sentiment === 'bullish' ? 'Bullish' : 'Bearish'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (item.kind === 'post') {
      const post = item.data;
      const vcMap = viewCountMapRef.current;
      if (!vcMap.has(post.id)) {
        const base = post.view_count
          ? post.view_count
          : Math.floor(post.likes_count * 8 + (hashStringToInt(post.id) % 5000));
        vcMap.set(post.id, base);
      }
      const viewCount = vcMap.get(post.id)!;
      const repostCount = post.repost_count ?? Math.floor(post.shares_count * 0.4 + 1);
      return (
        <div key={key} className="bg-[#181A20] border-b border-[#2B3139] px-4 py-4 hover:bg-[#1E2026] transition-colors">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={post.avatar_url}
                alt={post.username}
                className="w-10 h-10 rounded-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).src = `https://i.pravatar.cc/40?u=${post.username}`; }}
              />
              {post.post_type === 'live_embed' && (
                <div className="absolute -bottom-0.5 -left-0.5 bg-[#F6465D] text-white text-[7px] font-bold px-1 rounded">LIVE</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-semibold text-sm text-white">{post.username}</span>
                {getPostTypeIcon(post.post_type) && (
                  <span className="text-[#F0B90B]">{getPostTypeIcon(post.post_type)}</span>
                )}
                <span className="text-xs text-gray-500">{formatTimeAgo(post.created_at)}</span>
                {getSentimentBadge(post)}
              </div>
              <p className="text-sm leading-relaxed mb-2 whitespace-pre-line text-gray-100">{post.content}</p>
              {renderPostContent(post, priceCacheRef.current)}
              {(() => {
                const baseTags = post.coin_tags && Array.isArray(post.coin_tags) && post.coin_tags.length > 0
                  ? post.coin_tags
                  : (post.coin_symbol ? [{ symbol: post.coin_symbol, change: 0 }] : null);
                if (!baseTags) return null;
                const seen = new Set<string>();
                const unique = baseTags.filter(t => {
                  if (seen.has(t.symbol)) return false;
                  seen.add(t.symbol);
                  return true;
                });
                return <FeedCoinTags tags={adjustCoinTags(unique, priceCacheRef.current)} />;
              })()}
              <div className="flex items-center gap-4 text-[13px] text-gray-500 mt-3">
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <MessageCircle className="w-[15px] h-[15px]" />
                  <span>{post.comments_count}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-[#0ECB81] transition-colors">
                  <Repeat2 className="w-[15px] h-[15px]" />
                  <span>{repostCount}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-[#F6465D] transition-colors">
                  <Heart className="w-[15px] h-[15px]" />
                  <span>{post.likes_count}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-[#F0B90B] transition-colors">
                  <BarChart className="w-[15px] h-[15px]" />
                  <span>{viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}K` : viewCount}</span>
                </button>
                <button className="ml-auto flex items-center gap-1 hover:text-white transition-colors">
                  <Share2 className="w-[14px] h-[14px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-0">
      <PromoBanner />
      {liveRooms.length > 0 && <LiveRoomsScroller rooms={liveRooms} onRoomClick={setSelectedRoom} />}
      <CopyTradingCarousel />
      <LiveNewsBanner items={newsPoolRef.current} />

      {feedItems.map((item, idx) => renderFeedItem(item, `feed_${idx}_${item.kind}`))}

      {selectedRoom && (
        <LiveRoomModal
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          roomId={selectedRoom}
          allRooms={liveRooms}
          onRoomChange={setSelectedRoom}
        />
      )}
    </div>
  );
}

function adjustCoinTags(tags: CoinTag[], priceCache: PriceCache): CoinTag[] {
  return tags.map(tag => {
    const cached = priceCache.getBySymbol(tag.symbol);
    if (cached && cached.change24h !== undefined) {
      return { ...tag, change: Number(cached.change24h.toFixed(2)) };
    }
    return tag;
  });
}

function renderPostContent(post: SocialPost, priceCache: PriceCache) {
  switch (post.post_type) {
    case 'analysis':
    case 'educational':
    case 'personal':
      return null;
    case 'event':
      return <FeedEventCard content={post.content} />;
    case 'news':
      return <FeedNewsCard content={post.content} coinSymbol={post.coin_symbol} />;
    case 'market_gainers': {
      if (!post.gainers_rows || post.gainers_rows.length === 0) return null;
      return (
        <FeedGainersCard
          mode={post.gainers_mode || 'gainers'}
          rows={post.gainers_rows}
          title={post.content}
        />
      );
    }
    case 'trader_invite': {
      if (!post.extra_data?.traderProfile) return null;
      return <FeedTraderProfileCard traderProfile={post.extra_data.traderProfile} />;
    }
    case 'wealth_flex':
    case 'breaking_news':
    case 'lifestyle':
    case 'geopolitical_news':
    case 'chart_analysis': {
      const imgs = [post.image_url, post.image_url_2, post.image_url_3].filter(Boolean) as string[];
      if (imgs.length === 0) return null;
      if (imgs.length === 1) {
        return (
          <img
            src={imgs[0]}
            alt=""
            className="w-full rounded-xl mb-2 object-cover"
            style={{ maxHeight: '300px' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        );
      }
      if (imgs.length === 2) {
        return (
          <div className="grid grid-cols-2 gap-1 mb-2 rounded-xl overflow-hidden">
            {imgs.map((src, i) => (
              <img key={i} src={src} alt="" className="w-full h-[170px] object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ))}
          </div>
        );
      }
      return (
        <div className="grid grid-cols-2 gap-1 mb-2 rounded-xl overflow-hidden">
          <img src={imgs[0]} alt="" className="col-span-1 w-full h-[200px] object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div className="flex flex-col gap-1">
            <img src={imgs[1]} alt="" className="w-full h-[98px] object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <img src={imgs[2]} alt="" className="w-full h-[98px] object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        </div>
      );
    }
    case 'meme': {
      if (!post.image_url && !post.image_url_2) return null;
      const imgs = [post.image_url, post.image_url_2].filter(Boolean) as string[];
      if (imgs.length === 1) {
        return (
          <img
            src={imgs[0]}
            alt=""
            className="w-full rounded-xl mb-2 max-h-[280px] object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        );
      }
      return (
        <div className="grid grid-cols-2 gap-1 mb-2 rounded-xl overflow-hidden">
          {imgs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="w-full h-[160px] object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
        </div>
      );
    }
    case 'multi_position': {
      if (!post.sub_positions || post.sub_positions.length === 0) return null;
      const adjusted = post.sub_positions.map((pos: any) => {
        const cached = priceCache.getBySymbol(pos.coin);
        if (!cached || cached.price <= 0 || !pos.leverage || !pos.roi) return pos;
        const mark = cached.price;
        const signedRoi = pos.roi;
        const isLong = pos.type === 'long';
        const entry = isLong
          ? mark / (1 + signedRoi / 100 / pos.leverage)
          : mark / (1 - signedRoi / 100 / pos.leverage);
        const lev = pos.leverage;
        const liq = isLong ? entry * (1 - 0.9 / lev) : entry * (1 + 0.9 / lev);
        const pnl = (signedRoi / 100) * pos.margin;
        return { ...pos, entry, mark, liq, pnl };
      });
      return <FeedMultiPosition positions={adjusted} assetChange30d={post.asset_change_30d} />;
    }
    case 'live_embed':
      return post.live_room_data ? <FeedLiveEmbed data={post.live_room_data} /> : null;
    default: {
      const shouldShowTrading = post.profit_loss_percent !== 0 && post.leverage > 1 && post.coin_symbol;
      if (!shouldShowTrading && !post.image_url) return null;

      const cached = priceCache.getBySymbol(post.coin_symbol);
      let currentPrice = post.exit_price;
      let adjustedPnL = post.profit_loss;
      let adjustedPnLPercent = post.profit_loss_percent;

      if (shouldShowTrading && cached && cached.price > 0) {
        currentPrice = cached.price;
        const isLong = post.trade_type === 'long';
        const priceDiff = currentPrice - post.entry_price;
        const priceChangePercent = (priceDiff / post.entry_price) * 100;
        adjustedPnLPercent = isLong ? priceChangePercent * post.leverage : -priceChangePercent * post.leverage;
        const positionSize = (Math.abs(post.profit_loss) / Math.abs(post.profit_loss_percent)) * 100 * post.leverage;
        adjustedPnL = (adjustedPnLPercent / 100) * (positionSize / post.leverage);
      }

      return (
        <>
          {shouldShowTrading && (
            <FeedPositionCard
              coinSymbol={post.coin_symbol}
              tradeType={post.trade_type}
              leverage={post.leverage}
              profitLoss={adjustedPnL}
              profitLossPercent={adjustedPnLPercent}
              isBullish={post.is_bullish}
              entryPrice={post.entry_price}
              exitPrice={currentPrice}
            />
          )}
          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="w-full rounded-xl mb-2 max-h-[300px] object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </>
      );
    }
  }
}

const ROOM_PALETTES = [
  { bg: 'from-[#1e3a6e] via-[#1a306b] to-[#0f1e45]', border: 'border-blue-400/50', icon: 'from-[#60a5fa] to-[#3b82f6]', iconShadow: 'shadow-blue-500/60', glow: 'shadow-blue-600/40', topic: 'text-blue-200', accent: 'text-blue-300' },
  { bg: 'from-[#064e3b] via-[#065f46] to-[#022c22]', border: 'border-emerald-400/50', icon: 'from-[#34d399] to-[#059669]', iconShadow: 'shadow-emerald-500/60', glow: 'shadow-emerald-600/40', topic: 'text-emerald-200', accent: 'text-emerald-300' },
  { bg: 'from-[#7f1d1d] via-[#991b1b] to-[#450a0a]', border: 'border-red-400/50', icon: 'from-[#f87171] to-[#ef4444]', iconShadow: 'shadow-red-500/60', glow: 'shadow-red-600/40', topic: 'text-red-200', accent: 'text-red-300' },
  { bg: 'from-[#92400e] via-[#b45309] to-[#451a03]', border: 'border-amber-400/50', icon: 'from-[#fcd34d] to-[#f59e0b]', iconShadow: 'shadow-amber-500/60', glow: 'shadow-amber-600/40', topic: 'text-amber-200', accent: 'text-amber-300' },
  { bg: 'from-[#164e63] via-[#0e7490] to-[#083344]', border: 'border-cyan-400/50', icon: 'from-[#67e8f9] to-[#06b6d4]', iconShadow: 'shadow-cyan-500/60', glow: 'shadow-cyan-600/40', topic: 'text-cyan-200', accent: 'text-cyan-300' },
  { bg: 'from-[#581c87] via-[#7e22ce] to-[#2e1065]', border: 'border-purple-400/50', icon: 'from-[#c084fc] to-[#a855f7]', iconShadow: 'shadow-purple-500/60', glow: 'shadow-purple-600/40', topic: 'text-purple-200', accent: 'text-purple-300' },
  { bg: 'from-[#134e4a] via-[#0f766e] to-[#042f2e]', border: 'border-teal-400/50', icon: 'from-[#5eead4] to-[#14b8a6]', iconShadow: 'shadow-teal-500/60', glow: 'shadow-teal-600/40', topic: 'text-teal-200', accent: 'text-teal-300' },
  { bg: 'from-[#881337] via-[#be185d] to-[#4c0519]', border: 'border-pink-400/50', icon: 'from-[#f9a8d4] to-[#ec4899]', iconShadow: 'shadow-pink-500/60', glow: 'shadow-pink-600/40', topic: 'text-pink-200', accent: 'text-pink-300' },
  { bg: 'from-[#1e1b4b] via-[#3730a3] to-[#0f0c36]', border: 'border-indigo-400/50', icon: 'from-[#a5b4fc] to-[#6366f1]', iconShadow: 'shadow-indigo-500/60', glow: 'shadow-indigo-600/40', topic: 'text-indigo-200', accent: 'text-indigo-300' },
  { bg: 'from-[#365314] via-[#4d7c0f] to-[#1a2e05]', border: 'border-lime-400/50', icon: 'from-[#bef264] to-[#84cc16]', iconShadow: 'shadow-lime-500/60', glow: 'shadow-lime-600/40', topic: 'text-lime-200', accent: 'text-lime-300' },
];

const LiveRoomsScroller = memo(function LiveRoomsScroller({ rooms, onRoomClick }: { rooms: LiveRoom[]; onRoomClick: (id: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || rooms.length === 0) return;
    const measure = () => {
      const half = el.scrollWidth / 2;
      el.style.setProperty('--scroll-dist', `-${half}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rooms.length]);

  const speedSec = Math.max(30, rooms.length * 1.3);

  return (
    <div className="bg-[#0d0f14] border-b border-[#1E2329]">
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(var(--scroll-dist, -50%)); }
        }
        .live-scroll { animation: scroll-left var(--scroll-speed, 30s) linear infinite; backface-visibility: hidden; will-change: transform; transform-style: preserve-3d; }
        .live-scroll:hover { animation-play-state: paused; }
        @keyframes live-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .live-badge-blink { animation: live-blink 1.2s ease-in-out infinite; }
        @keyframes ring-ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .ring-ping { animation: ring-ping 1.4s ease-out infinite; }
      `}</style>

      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-6 h-6">
            <span className="ring-ping absolute inline-flex w-4 h-4 rounded-full bg-red-500 opacity-50" />
            <Radio className="w-4 h-4 text-red-500 relative z-10" />
          </div>
          <span className="text-white font-bold text-[14px]">Crypto Chat Live</span>
          <span className="live-badge-blink bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest">LIVE</span>
        </div>
        <span className="text-gray-500 text-[11px]">{rooms.length} active rooms</span>
      </div>

      <p className="px-4 pb-2 text-gray-400 text-[11px]">Chat live with crypto investors, share strategies</p>

      <div className="overflow-hidden relative py-2">
        <div
          ref={trackRef}
          className="flex gap-3 live-scroll px-3"
          style={{ width: 'max-content', ['--scroll-speed' as string]: `${speedSec}s` }}
        >
          {[...rooms, ...rooms].map((room, index) => {
            const isVip = room.is_vip;
            const palette = isVip
              ? { bg: 'from-[#78350f] via-[#b45309] to-[#92400e]', border: 'border-yellow-400/70', icon: 'from-[#fde68a] to-[#f59e0b]', iconShadow: 'shadow-yellow-400/70', glow: 'shadow-yellow-500/40', topic: 'text-yellow-100', accent: 'text-yellow-200' }
              : ROOM_PALETTES[index % ROOM_PALETTES.length];
            return (
              <button key={`${room.id}-${index}`} onClick={() => onRoomClick(room.id)}
                className={`flex-shrink-0 rounded-2xl px-3 py-3 flex items-center gap-3 bg-gradient-to-br ${palette.bg} border ${palette.border} hover:scale-[1.03] hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-xl ${palette.glow} relative min-w-[210px] max-w-[210px]`}>

                {isVip && (
                  <div className="absolute -top-2.5 -right-2.5 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full w-7 h-7 flex items-center justify-center shadow-lg shadow-yellow-500/60 border-2 border-[#0d0f14]">
                    <Crown className="w-3.5 h-3.5 text-black" />
                  </div>
                )}

                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${palette.icon} flex items-center justify-center shadow-lg ${palette.iconShadow} relative flex-shrink-0`}>
                  {isVip ? <Sparkles className="w-5 h-5 text-white drop-shadow" /> : <Radio className="w-5 h-5 text-white drop-shadow" />}
                  <span className="ring-ping absolute w-3.5 h-3.5 rounded-full bg-red-500 -top-0.5 -right-0.5" />
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0d0f14]" />
                </div>

                <div className="text-left min-w-0 flex-1">
                  <span className="font-black text-[13px] text-white line-clamp-1 block leading-tight mb-1.5">{room.title}</span>

                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="live-badge-blink flex items-center gap-1 bg-red-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      LIVE
                    </span>
                    {isVip && (
                      <span className="bg-gradient-to-r from-yellow-300 to-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-wide">VIP</span>
                    )}
                    <div className="flex items-center gap-0.5 text-white/70 text-[11px]">
                      <Users className="w-3 h-3" />
                      <span className="font-bold">{room.listener_count.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className={`text-[10px] font-semibold ${palette.topic} line-clamp-1`}>{room.topic}</div>
                  <div className={`text-[9px] font-medium ${palette.accent} mt-0.5 opacity-70`}>Tap to join</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.rooms.length !== next.rooms.length) return false;
  for (let i = 0; i < prev.rooms.length; i++) {
    if (prev.rooms[i].id !== next.rooms[i]?.id) return false;
  }
  return true;
});

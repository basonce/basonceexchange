import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Radio, Crown, Lock, Sparkles, Users, BookOpen, BarChart2, MessageSquare, Newspaper, Zap, TrendingUp, TrendingDown, ExternalLink, Shield, Globe } from 'lucide-react';
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
  is_bullish: boolean;
  created_at: string;
  coin_tags?: CoinTag[];
  asset_change_30d?: number | null;
  chart_coin?: string | null;
  sub_positions?: any[];
  live_room_data?: any;
  sentiment?: string;
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
  { title: 'PEPE memecoin community votes on major protocol upgrade', summary: 'Governance vote passes with 78% majority to implement staking rewards, sending PEPE up 34% in 24 hours.', coin: 'PEPE', category: 'BREAKING', sentiment: 'bullish', change: 34.2, source: 'PEPE DAO' },
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
  'FTM','LTC','BCH','PEPE','WIF','BONK','FLOKI','SEI','TIA','ONDO',
];

const MULTI_GRID_USERS = [
  { username: 'Crypto3894', avatar: 'https://i.pravatar.cc/150?img=70' },
  { username: 'AlphaTrader77', avatar: 'https://i.pravatar.cc/150?img=71' },
  { username: 'BullRunKing', avatar: 'https://i.pravatar.cc/150?img=72' },
  { username: 'SwingMaster9', avatar: 'https://i.pravatar.cc/150?img=73' },
  { username: 'VolumeProfile', avatar: 'https://i.pravatar.cc/150?img=74' },
  { username: 'CryptoWhale88', avatar: 'https://i.pravatar.cc/150?img=75' },
  { username: 'LongOnlyBull', avatar: 'https://i.pravatar.cc/150?img=76' },
  { username: 'DeltaNeutral', avatar: 'https://i.pravatar.cc/150?img=77' },
  { username: 'FuturesKing', avatar: 'https://i.pravatar.cc/150?img=78' },
  { username: 'OnChainOG', avatar: 'https://i.pravatar.cc/150?img=79' },
  { username: 'RektProof', avatar: 'https://i.pravatar.cc/150?img=80' },
  { username: 'MoonMathBot', avatar: 'https://i.pravatar.cc/150?img=81' },
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

function buildInitialFeed(posts: SocialPost[], newsPool: LiveNewsItem[]): FeedItem[] {
  const items: FeedItem[] = [];
  let ni = 0;
  let bi = 0;
  posts.forEach((post, idx) => {
    items.push({ kind: 'post', data: post });
    if ((idx + 1) % 4 === 0) {
      items.push({ kind: 'basonce', data: makeBasonceItem(bi++) });
    }
    if ((idx + 1) % 7 === 0 && newsPool.length > 0) {
      items.push({ kind: 'news', data: newsPool[ni % newsPool.length] });
      ni++;
    }
  });
  return items;
}

export default function SocialFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const newsPoolRef = useRef<LiveNewsItem[]>(generateLiveNews());
  const priceCacheRef = useRef(PriceCache.getInstance());
  const [, setPriceVersion] = useState(0);
  const allPostsRef = useRef<SocialPost[]>([]);
  const initializedRef = useRef(false);
  const dbNewsPoolRef = useRef<BasonceNewsItem[]>([]);
  const dbNewsIndexRef = useRef(0);

  const pricesAdjustedRef = useRef(false);
  const adjustPostRef = useRef<(p: SocialPost) => SocialPost>(() => ({} as SocialPost));
  const ensureWinBiasRef = useRef<(p: SocialPost) => SocialPost>(() => ({} as SocialPost));

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
          const readjusted = allPostsRef.current.map(p => ensureWinBiasRef.current(adjustPostRef.current(p)));
          allPostsRef.current = readjusted;
          setFeedItems(buildInitialFeed(readjusted.slice(0, 50), newsPoolRef.current));
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchLiveRooms();
    fetchRealNews();

    const postsInterval = setInterval(fetchPosts, 300000);
    const roomsInterval = setInterval(fetchLiveRooms, 60000);
    const newsRefetchInterval = setInterval(fetchRealNews, 15 * 60 * 1000);
    const listenerInterval = setInterval(() => {
      setLiveRooms(prev => prev.map(room => ({
        ...room,
        listener_count: Math.max(100, room.listener_count + Math.floor(Math.random() * 40) - 20),
      })));
    }, 15000);

    const recentInjectIds = new Set<string>();
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
        setFeedItems(prev => [{ kind: 'basonce', data: bItem }, ...prev.slice(0, 300)]);
        return;
      }

      const r = Math.random();
      let newPost: SocialPost | null = null;

      if (r < 0.35) {
        newPost = generateMultiGridPost(pc);
      } else {
        const candidates = posts.filter(p => !recentInjectIds.has(p.id));
        if (candidates.length === 0) { recentInjectIds.clear(); return; }
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        recentInjectIds.add(pick.id);
        if (recentInjectIds.size > 60) {
          const first = recentInjectIds.values().next().value;
          if (first) recentInjectIds.delete(first);
        }
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
        setFeedItems(prev => [{ kind: 'post', data: newPost! }, ...prev.slice(0, 300)]);
      }
    }, 30000);

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
      clearInterval(autoInjectInterval);
      clearInterval(newsRefreshInterval);
      clearInterval(newsRefetchInterval);
    };
  }, []);

  const isValidTradingPost = (post: SocialPost): boolean => {
    const hasPosition = post.profit_loss_percent !== 0 && post.leverage > 1 && post.coin_symbol;
    const hasMultiPos = post.post_type === 'multi_position' && post.sub_positions && post.sub_positions.length > 0;
    return hasPosition || hasMultiPos;
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

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const filtered = (data || []).filter(isValidTradingPost);
      const pc = priceCacheRef.current;
      const pricesReady = filtered.some(p => {
        const c = p.coin_symbol ? pc.getBySymbol(p.coin_symbol) : null;
        return c && c.price > 0;
      });
      const adjusted = filtered.map(p => ensureWinBias(pricesReady ? adjustPost(p) : p));
      allPostsRef.current = adjusted;
      if (!initializedRef.current) {
        initializedRef.current = true;
        setFeedItems(buildInitialFeed(adjusted.slice(0, 50), newsPoolRef.current));
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
        .eq('is_active', true)
        .order('listener_count', { ascending: false })
        .limit(72);
      if (error) throw error;
      setLiveRooms(data || []);
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
      return (
        <div key={key} className="bg-[#181A20] border-b border-[#2B3139] px-4 py-4 hover:bg-[#1E2026] transition-colors">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <img src={post.avatar_url} alt={post.username} className="w-10 h-10 rounded-full object-cover" />
              {post.post_type === 'live_embed' && (
                <div className="absolute -bottom-0.5 -left-0.5 bg-[#F6465D] text-white text-[7px] font-bold px-1 rounded">LIVE</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-semibold text-sm">{post.username}</span>
                {getPostTypeIcon(post.post_type) && (
                  <span className="text-[#F0B90B]">{getPostTypeIcon(post.post_type)}</span>
                )}
                <span className="text-xs text-gray-500">{formatTimeAgo(post.created_at)}</span>
                {getSentimentBadge(post)}
              </div>
              <p className="text-sm leading-relaxed mb-3 whitespace-pre-line">{post.content}</p>
              {post.coin_symbol && post.leverage > 1 && (
                <div className="mb-3">
                  <FeedCoinTags tags={adjustCoinTags([{ symbol: post.coin_symbol, change: 0 }], priceCacheRef.current)} />
                </div>
              )}
              {renderPostContent(post, priceCacheRef.current)}
              {post.coin_tags && Array.isArray(post.coin_tags) && post.coin_tags.length > 0 && (
                <FeedCoinTags tags={adjustCoinTags(post.coin_tags, priceCacheRef.current)} />
              )}
              <div className="flex items-center gap-6 text-sm text-gray-400 mt-3">
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <MessageCircle className="w-4 h-4" /><span>{post.comments_count}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" /><span>{post.shares_count}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-[#F6465D] transition-colors">
                  <Heart className="w-4 h-4" /><span>{post.likes_count}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" /><span>{Math.floor(post.shares_count / 3)}</span>
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
            <img src={post.image_url} alt=""
              className="w-full rounded-xl mb-3 max-h-[300px] object-cover" />
          )}
        </>
      );
    }
  }
}

const ROOM_PALETTES = [
  { bg: 'from-[#1a4a8a] to-[#0f2d5c]', border: 'border-blue-400/70', icon: 'from-blue-300 to-blue-500', glow: 'shadow-blue-500/50', topic: 'text-blue-100' },
  { bg: 'from-[#0d7a4e] to-[#065438]', border: 'border-emerald-400/70', icon: 'from-emerald-300 to-green-500', glow: 'shadow-emerald-500/50', topic: 'text-emerald-100' },
  { bg: 'from-[#b91c1c] to-[#7f1d1d]', border: 'border-rose-400/70', icon: 'from-rose-300 to-red-500', glow: 'shadow-rose-500/50', topic: 'text-rose-100' },
  { bg: 'from-[#b45309] to-[#78350f]', border: 'border-amber-400/70', icon: 'from-amber-300 to-orange-500', glow: 'shadow-amber-500/50', topic: 'text-amber-100' },
  { bg: 'from-[#0e7490] to-[#0c4a6e]', border: 'border-cyan-400/70', icon: 'from-cyan-300 to-sky-500', glow: 'shadow-cyan-500/50', topic: 'text-cyan-100' },
  { bg: 'from-[#a21caf] to-[#701a75]', border: 'border-fuchsia-400/70', icon: 'from-fuchsia-300 to-pink-500', glow: 'shadow-fuchsia-500/50', topic: 'text-fuchsia-100' },
  { bg: 'from-[#047857] to-[#065f46]', border: 'border-teal-400/70', icon: 'from-teal-300 to-green-500', glow: 'shadow-teal-500/50', topic: 'text-teal-100' },
  { bg: 'from-[#c2410c] to-[#7c2d12]', border: 'border-orange-400/70', icon: 'from-orange-300 to-red-500', glow: 'shadow-orange-500/50', topic: 'text-orange-100' },
];

function LiveRoomsScroller({ rooms, onRoomClick }: { rooms: LiveRoom[]; onRoomClick: (id: string) => void }) {
  return (
    <div className="bg-[#0d0f14] border-b border-[#1E2329]">
      <style>{`
        @keyframes scroll-left {
          0% { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50%,0,0); }
        }
        .live-scroll { animation: scroll-left 130s linear infinite; backface-visibility: hidden; will-change: transform; }
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
        <div className="flex gap-3 live-scroll min-w-max px-3">
          {[...rooms, ...rooms].map((room, index) => {
            const palette = room.is_vip
              ? { bg: 'from-[#1c1500] to-[#2a1e00]', border: 'border-yellow-400/60', icon: 'from-yellow-400 to-amber-500', glow: 'shadow-yellow-500/30', topic: 'text-yellow-300' }
              : ROOM_PALETTES[index % ROOM_PALETTES.length];
            return (
              <button key={`${room.id}-${index}`} onClick={() => onRoomClick(room.id)}
                className={`flex-shrink-0 rounded-2xl px-4 py-3 flex items-center gap-3 bg-gradient-to-br ${palette.bg} border ${palette.border} hover:scale-[1.04] hover:brightness-110 transition-all duration-200 active:scale-95 shadow-lg ${palette.glow} relative min-w-[220px]`}>
                {room.is_vip && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full w-6 h-6 flex items-center justify-center shadow-lg shadow-yellow-500/50">
                    <Crown className="w-3.5 h-3.5 text-black" />
                  </div>
                )}
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${palette.icon} flex items-center justify-center shadow-md relative flex-shrink-0`}>
                  {room.is_vip ? <Sparkles className="w-5 h-5 text-black" /> : <Radio className="w-4 h-4 text-white" />}
                  <span className="ring-ping absolute w-3 h-3 rounded-full bg-red-500 -top-0.5 -right-0.5" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0d0f14]" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-[13px] text-white line-clamp-1 max-w-[130px]">{room.title}</span>
                    {room.is_vip && <Lock className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="live-badge-blink flex items-center gap-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      LIVE
                    </span>
                    {room.is_vip && <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide">VIP</span>}
                    <div className="flex items-center gap-0.5 text-gray-300 text-[11px]">
                      <Users className="w-3 h-3" />
                      <span className="font-semibold">{room.listener_count.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={`text-[10px] font-medium ${palette.topic} line-clamp-1 max-w-[150px]`}>{room.topic}</div>
                  <div className="text-[9px] text-white/40 mt-0.5">Tap to join</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

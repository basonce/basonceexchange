// ============================================================
// feed-post-generators.ts
// Generator functions for SocialPost objects using content pools
// ============================================================

import {
  WEALTH_FLEX_IMAGES,
  CRYPTO_NEWS_IMAGES,
  FOOD_LIFESTYLE_IMAGES,
  CRYPTO_CHART_IMAGES,
  WEALTH_FLEX_CONTENT,
  BREAKING_NEWS_CONTENT,
  TRADER_PROFILE_DATA,
  LIFESTYLE_POST_CONTENT,
  GEOPOLITICAL_NEWS_CONTENT,
  POST_USERS_POOL,
} from './feed-content-pools';
import { BS_POSTS, BS_USERS_POOL, BS_MEME_IMAGES } from './feed-content-pools-v2';
import { BS_POSTS_POOL_V3, BS_USERS_POOL_V3, CAR_IMAGE_URLS } from './feed-content-pools-v3';
import { PriceCache } from './price-cache';

const ALL_BS_POSTS = [...BS_POSTS, ...BS_POSTS_POOL_V3];
const ALL_BS_USERS = [...BS_USERS_POOL, ...BS_USERS_POOL_V3];

// ---------------------------------------------------------
// GeneratedPost interface
// ---------------------------------------------------------
export interface GeneratedPost {
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
  image_url_3?: string | null;
  post_type: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  view_count: number;
  repost_count: number;
  is_bullish: boolean;
  created_at: string;
  coin_tags?: { symbol: string; change: number }[];
  asset_change_30d?: number | null;
  sub_positions?: any[];
  live_room_data?: any;
  sentiment?: string;
  gainers_mode?: 'gainers' | 'losers';
  gainers_rows?: any[];
  extra_data?: any;
}

// ---------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a unique post ID */
function genId(): string {
  return 'gen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Generate a created_at timestamp that is between 0 and maxMinutesAgo
 * minutes in the past, so posts look like they were posted recently.
 */
function recentTimestamp(maxMinutesAgo: number = 120): string {
  const msAgo = Math.floor(Math.random() * maxMinutesAgo * 60 * 1000);
  return new Date(Date.now() - msAgo).toISOString();
}

/** Get a live or fallback price for a coin symbol */
function getPrice(pc: PriceCache, symbol: string, fallback: number): number {
  const cached = pc.getBySymbol(symbol);
  return cached?.price ?? fallback;
}

/** Get a live or fallback 24h change for a coin symbol */
function getChange(pc: PriceCache, symbol: string, fallback: number): number {
  const cached = pc.getBySymbol(symbol);
  return cached?.change24h ?? fallback;
}

// Only coins actually listed on the exchange's market
const REAL_MARKET_COINS = new Set([
  'BTC','ETH','BNB','SOL','XRP','ADA','DOGE','AVAX','DOT','MATIC','LINK',
  'UNI','LTC','ATOM','ETC','XLM','NEAR','ALGO','VET','ICP','FIL','APT','ARB',
  'OP','INJ','SUI','SEI','TIA','RENDER','FTM','SHIB','WIF','BONK','FLOKI',
  'TON','TRX','HBAR','AAVE','GRT','STX','SAND','MANA','AXS','GALA','ENJ',
  'IMX','ONDO','RNDR','FET','AGIX','WLD','ENA','ACH','JASMY','CHZ','AUDIO',
  'BLUR','PENDLE','DYDX','SNX','CRV','COMP','MKR','LDO','RPL','BAL','SUSHI',
  'YFI','1INCH','OCEAN','GRT','BAND','API3','SKALE','ANKR','CELR','CTSI',
  'NKN','ACH','STORJ','BAT','RLC','MASK','REQ','BICO','DUSK','ENS','PERP',
  'CVX','ALCX','SPELL','BADGER','FARM','FORTH','KP3R','MLN','QNT','UNFI',
  'AUCTION','CLV','ARPA','LINA','AGLD','STPT','MTL','COTI','POWR','REN',
  'ORN','PYR','OGN','RARE','TRU','LOOM','KEY','MDT','PNT','PEOPLE','MEME',
  'MAGIC','ARKM','CYBER','W','ZRO','ZK','STRK','TRUMP','DEGO','BANANAS31',
  'GIGGLE','BULLA','PIXEL','HIFI','VIDT','VITE','MBL','COCOS','FOR',
  'IOTX','OAX','DATA','SC','WAN','DOCK','DENT','MITH','STMX','WRX',
  'RIF','TROY','VIBE','BCPT','CHAT','SYS','GTO','LEND','WINGS','SNM',
  'APE','OP','ARB','SOL','AVAX','FTM','NEAR','INJ','SUI','APT','SEI',
  'TIA','ATOM','LINK','DOT','ADA','XRP','BNB','ETH','BTC','DOGE','SHIB',
  'FLOKI','WIF','BONK','TRUMP','TON','TRX','HBAR','XLM','VET','ICP',
  'AAVE','ONDO','RNDR','FET','ENA','STX','BLUR','PENDLE','DYDX','GRT',
  'LDO','MKR','COMP','CRV','SUSHI','YFI','1INCH','SNX','SAND','MANA',
  'AXS','GALA','ENJ','IMX','CHZ','AUDIO','ACH','JASMY','MASK','ENS',
  'QNT','OCEAN','WLD','AGIX','ARKM','CYBER','MAGIC','PEOPLE','MEME',
  'ZRO','ZK','STRK','W','DEGO','GIGGLE','BANANAS31','BULLA','PIXEL',
  'BNC','EQ',
]);

/** Build a coin_tags array from an array of tag strings using live prices.
 *  Filters to only real market coins — no fake/custom tokens. */
function buildCoinTags(
  pc: PriceCache,
  tags: string[]
): { symbol: string; change: number }[] {
  return tags
    .filter(sym => REAL_MARKET_COINS.has(sym.toUpperCase()))
    .map((symbol) => ({
      symbol,
      change: parseFloat(
        getChange(pc, symbol, (Math.random() - 0.4) * 20).toFixed(2)
      ),
    }));
}

/** Random integer in [min, max] inclusive */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float in [min, max] with given decimal places */
function randFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// Fallback prices used when PriceCache has no live data
const FALLBACK_PRICES: Record<string, number> = {
  BTC: 95000,
  ETH: 3800,
  SOL: 185,
  BNB: 620,
  XRP: 0.62,
  AVAX: 38,
  DOGE: 0.18,
  SHIB: 0.000028,
  LINK: 18,
  INJ: 28,
  TIA: 8,
  OP: 2.8,
  ARB: 1.4,
  SUI: 4.2,
  APT: 9.5,
  TON: 5.8,
  WIF: 2.1,
  BONK: 0.0000035,
  TRUMP: 14,
  FLOKI: 0.00022,
  NEAR: 7.8,
  ONDO: 1.45,
  FET: 2.4,
  RNDR: 8.2,
  ATOM: 9.8,
  ALGO: 0.28,
  DOT: 8.6,
  MATIC: 0.92,
  UNI: 12,
  AAVE: 320,
  CRV: 0.85,
  CAKE: 3.2,
  AXS: 9.5,
  GALA: 0.045,
  JUP: 1.28,
  PYTH: 0.55,
  ENA: 1.12,
  HBAR: 0.16,
  SEI: 0.68,
  STRK: 1.42,
  // Exchange native coins
  BNC: 12.5,
  EQ: 8.4,
  // Exotic / meme micro-caps
  GIGGLE: 0.0024,
  BANANAS31: 0.42,
  DEGO: 3.8,
  BULLA: 0.0088,
  PIXEL: 0.38,
  TURBO: 0.0091,
  MEW: 0.0082,
  POPCAT: 1.24,
  MOTHER: 0.22,
  ZEUS: 0.68,
  DRIFT: 1.45,
  ORDER: 0.32,
  NOT: 0.018,
  PENDLE: 6.8,
  ETHFI: 4.2,
  OCEAN: 0.88,
  ROSE: 0.12,
  JASMY: 0.038,
  KAS: 0.14,
};

// ---------------------------------------------------------
// 1. generateWealthFlexPost
// ---------------------------------------------------------
export function generateWealthFlexPost(pc: PriceCache): GeneratedPost {
  const user = pick(POST_USERS_POOL);
  const contentItem = pick(WEALTH_FLEX_CONTENT);
  const primaryImage = pick(WEALTH_FLEX_IMAGES);
  const useDoubleImage = Math.random() < 0.3;
  const secondImage = useDoubleImage ? pick(WEALTH_FLEX_IMAGES) : null;

  const primaryCoin = contentItem.tags[0] ?? 'BTC';
  const coinPrice = getPrice(pc, primaryCoin, FALLBACK_PRICES[primaryCoin] ?? 100);
  const isBullish = contentItem.sentiment === 'bullish';
  const isShort = contentItem.sentiment === 'bearish';

  const entryPrice = parseFloat(
    (coinPrice * randFloat(0.6, 0.92)).toFixed(2)
  );
  const exitPrice = isShort
    ? parseFloat((coinPrice * randFloat(0.5, 0.85)).toFixed(2))
    : parseFloat((coinPrice * randFloat(1.05, 1.8)).toFixed(2));
  const pnl = exitPrice - entryPrice;
  const pnlPct = parseFloat(((pnl / entryPrice) * 100).toFixed(2));

  return {
    id: genId(),
    username: user.username,
    avatar_url: user.avatar,
    content: contentItem.content,
    coin_symbol: primaryCoin,
    trade_type: isShort ? 'short' : 'long',
    entry_price: entryPrice,
    exit_price: exitPrice,
    profit_loss: parseFloat(pnl.toFixed(2)),
    profit_loss_percent: pnlPct,
    leverage: pick([1, 2, 3, 5, 10, 20]),
    image_url: primaryImage,
    image_url_2: secondImage,
    image_url_3: null,
    post_type: 'wealth_flex',
    likes_count: randInt(50, 8000),
    comments_count: randInt(10, 500),
    shares_count: randInt(5, 200),
    view_count: randInt(5000, 500000),
    repost_count: randInt(5, 200),
    is_bullish: isBullish,
    created_at: recentTimestamp(180),
    coin_tags: buildCoinTags(pc, contentItem.tags),
    asset_change_30d: randFloat(-15, 120, 1),
    sentiment: contentItem.sentiment,
    extra_data: { imageType: contentItem.imageType, badge: user.badge ?? null },
  };
}

// ---------------------------------------------------------
// 2. generateBreakingNewsPost
// ---------------------------------------------------------
export function generateBreakingNewsPost(pc: PriceCache): GeneratedPost {
  const user = pick(POST_USERS_POOL);
  const newsItem = pick(BREAKING_NEWS_CONTENT);
  const primaryImage = newsItem.hasImage ? pick(CRYPTO_NEWS_IMAGES) : null;
  const useDoubleImage = newsItem.hasImage && Math.random() < 0.4;
  const secondImage = useDoubleImage ? pick(CRYPTO_NEWS_IMAGES) : null;

  const primaryCoin = newsItem.tags[0] ?? 'BTC';
  const coinPrice = getPrice(pc, primaryCoin, FALLBACK_PRICES[primaryCoin] ?? 100);
  const isBullish = newsItem.sentiment === 'bullish';
  const isShort = newsItem.sentiment === 'bearish';

  const entryPrice = parseFloat((coinPrice * randFloat(0.7, 0.95)).toFixed(2));
  const exitPrice = isShort
    ? parseFloat((coinPrice * randFloat(0.6, 0.9)).toFixed(2))
    : parseFloat((coinPrice * randFloat(1.05, 1.5)).toFixed(2));
  const pnl = exitPrice - entryPrice;
  const pnlPct = parseFloat(((pnl / entryPrice) * 100).toFixed(2));

  const fullContent = newsItem.headline + '\n\n' + newsItem.content;

  return {
    id: genId(),
    username: user.username,
    avatar_url: user.avatar,
    content: fullContent,
    coin_symbol: primaryCoin,
    trade_type: isShort ? 'short' : 'long',
    entry_price: entryPrice,
    exit_price: exitPrice,
    profit_loss: parseFloat(pnl.toFixed(2)),
    profit_loss_percent: pnlPct,
    leverage: 1,
    image_url: primaryImage,
    image_url_2: secondImage,
    image_url_3: null,
    post_type: 'breaking_news',
    likes_count: randInt(500, 25000),
    comments_count: randInt(50, 2000),
    shares_count: randInt(100, 5000),
    view_count: randInt(50000, 2000000),
    repost_count: randInt(50, 2000),
    is_bullish: isBullish,
    created_at: recentTimestamp(60),
    coin_tags: buildCoinTags(pc, newsItem.tags),
    asset_change_30d: null,
    sentiment: newsItem.sentiment,
    extra_data: { headline: newsItem.headline, hasImage: newsItem.hasImage },
  };
}

// ---------------------------------------------------------
// 3. generateLifestylePost
// ---------------------------------------------------------
export function generateLifestylePost(pc: PriceCache): GeneratedPost {
  const user = pick(POST_USERS_POOL);
  const postItem = pick(LIFESTYLE_POST_CONTENT);
  const numImages = randInt(1, 3);

  const img1 = pick(FOOD_LIFESTYLE_IMAGES);
  const img2 = numImages >= 2 ? pick(FOOD_LIFESTYLE_IMAGES) : null;
  const img3 = numImages >= 3 ? pick(FOOD_LIFESTYLE_IMAGES) : null;

  const primaryCoin = postItem.tags[0] ?? 'BTC';
  const coinPrice = getPrice(pc, primaryCoin, FALLBACK_PRICES[primaryCoin] ?? 100);

  const entryPrice = parseFloat((coinPrice * randFloat(0.65, 0.9)).toFixed(2));
  const exitPrice = parseFloat((coinPrice * randFloat(1.05, 1.6)).toFixed(2));
  const pnl = exitPrice - entryPrice;
  const pnlPct = parseFloat(((pnl / entryPrice) * 100).toFixed(2));

  return {
    id: genId(),
    username: user.username,
    avatar_url: user.avatar,
    content: postItem.content,
    coin_symbol: primaryCoin,
    trade_type: 'long',
    entry_price: entryPrice,
    exit_price: exitPrice,
    profit_loss: parseFloat(pnl.toFixed(2)),
    profit_loss_percent: pnlPct,
    leverage: 1,
    image_url: img1,
    image_url_2: img2,
    image_url_3: img3,
    post_type: 'lifestyle',
    likes_count: randInt(30, 5000),
    comments_count: randInt(5, 300),
    shares_count: randInt(2, 100),
    view_count: randInt(2000, 200000),
    repost_count: randInt(2, 80),
    is_bullish: true,
    created_at: recentTimestamp(240),
    coin_tags: buildCoinTags(pc, postItem.tags),
    asset_change_30d: randFloat(-5, 80, 1),
    sentiment: 'bullish',
    extra_data: { imageType: postItem.imageType, badge: user.badge ?? null },
  };
}

// ---------------------------------------------------------
// 4. generateTraderProfilePost
// ---------------------------------------------------------
export function generateTraderProfilePost(pc: PriceCache): GeneratedPost {
  const trader = pick(TRADER_PROFILE_DATA);
  const useOwnProfile = Math.random() < 0.5;
  const username = useOwnProfile ? trader.username : pick(POST_USERS_POOL).username;
  const avatar = useOwnProfile ? trader.avatar : pick(POST_USERS_POOL).avatar;

  const roiStr = '+' + trader.roi30d + '%';
  const followersStr = trader.totalFollowers.toLocaleString();

  const content = [
    'Follow me \u2014 30D ROI: ' + roiStr + ' | Win Rate: ' + trader.winRate + '%',
    trader.tagline,
    'Top coin: $' + trader.topCoin + ' | ' + followersStr + ' followers',
    'Daily signals, $BTC $ETH $SOL',
  ].join('\n');

  const coinPrice = getPrice(
    pc,
    trader.topCoin,
    FALLBACK_PRICES[trader.topCoin] ?? 100
  );
  const entryPrice = parseFloat((coinPrice * 0.7).toFixed(2));
  const roiMultiplier = 1 + trader.roi30d / 100 / 4;
  const exitPrice = parseFloat((coinPrice * roiMultiplier).toFixed(2));
  const pnl = exitPrice - entryPrice;
  const pnlPct = parseFloat(((pnl / entryPrice) * 100).toFixed(2));

  return {
    id: genId(),
    username,
    avatar_url: avatar,
    content,
    coin_symbol: trader.topCoin,
    trade_type: 'long',
    entry_price: entryPrice,
    exit_price: exitPrice,
    profit_loss: parseFloat(pnl.toFixed(2)),
    profit_loss_percent: pnlPct,
    leverage: pick([1, 2, 5, 10]),
    image_url: null,
    image_url_2: null,
    image_url_3: null,
    post_type: 'trader_invite',
    likes_count: randInt(200, 15000),
    comments_count: randInt(30, 800),
    shares_count: randInt(20, 500),
    view_count: randInt(10000, 500000),
    repost_count: randInt(10, 300),
    is_bullish: true,
    created_at: recentTimestamp(360),
    coin_tags: buildCoinTags(pc, [trader.topCoin, 'BTC', 'ETH']),
    asset_change_30d: parseFloat(trader.roi30d.toFixed(1)),
    sentiment: 'bullish',
    extra_data: { traderProfile: trader },
  };
}

// ---------------------------------------------------------
// 5. generateGeopoliticalPost
// ---------------------------------------------------------
export function generateGeopoliticalPost(pc: PriceCache): GeneratedPost {
  const user = pick(POST_USERS_POOL);
  const geoItem = pick(GEOPOLITICAL_NEWS_CONTENT);
  const primaryImage = pick(CRYPTO_NEWS_IMAGES);
  const useDoubleImage = Math.random() < 0.35;
  const secondImage = useDoubleImage ? pick(CRYPTO_NEWS_IMAGES) : null;

  const primaryCoin = geoItem.tags[0] ?? 'BTC';
  const coinPrice = getPrice(pc, primaryCoin, FALLBACK_PRICES[primaryCoin] ?? 100);
  const isBullish = geoItem.sentiment === 'bullish';
  const isShort = geoItem.sentiment === 'bearish';

  const entryPrice = parseFloat((coinPrice * randFloat(0.7, 0.95)).toFixed(2));
  const exitPrice = isShort
    ? parseFloat((coinPrice * randFloat(0.55, 0.88)).toFixed(2))
    : parseFloat((coinPrice * randFloat(1.08, 1.6)).toFixed(2));
  const pnl = exitPrice - entryPrice;
  const pnlPct = parseFloat(((pnl / entryPrice) * 100).toFixed(2));

  const fullContent = geoItem.headline + '\n\n' + geoItem.content;

  return {
    id: genId(),
    username: user.username,
    avatar_url: user.avatar,
    content: fullContent,
    coin_symbol: primaryCoin,
    trade_type: isShort ? 'short' : 'long',
    entry_price: entryPrice,
    exit_price: exitPrice,
    profit_loss: parseFloat(pnl.toFixed(2)),
    profit_loss_percent: pnlPct,
    leverage: 1,
    image_url: primaryImage,
    image_url_2: secondImage,
    image_url_3: null,
    post_type: 'geopolitical_news',
    likes_count: randInt(800, 30000),
    comments_count: randInt(100, 3000),
    shares_count: randInt(200, 8000),
    view_count: randInt(100000, 3000000),
    repost_count: randInt(100, 5000),
    is_bullish: isBullish,
    created_at: recentTimestamp(90),
    coin_tags: buildCoinTags(pc, geoItem.tags),
    asset_change_30d: null,
    sentiment: geoItem.sentiment,
    extra_data: { headline: geoItem.headline },
  };
}

// ---------------------------------------------------------
// 6. generateCryptoChartPost
// ---------------------------------------------------------
export function generateCryptoChartPost(pc: PriceCache): GeneratedPost {
  const user = pick(POST_USERS_POOL);
  const chartImage = pick(CRYPTO_CHART_IMAGES);

  const coins = ['BTC', 'ETH', 'SOL', 'AVAX', 'BNB', 'LINK', 'INJ', 'TIA', 'ARB', 'OP', 'SUI'];
  const coin = pick(coins);
  const coinPrice = getPrice(pc, coin, FALLBACK_PRICES[coin] ?? 100);

  const isBullish = Math.random() < 0.7;
  const trend = isBullish ? 'bullish' : 'bearish';
  const timeframe = pick(['1H', '4H', '1D', '3D', '1W']);

  const entry = parseFloat((coinPrice * randFloat(0.88, 0.98)).toFixed(2));
  const target1 = parseFloat((coinPrice * randFloat(1.08, 1.18)).toFixed(2));
  const target2 = parseFloat((coinPrice * randFloat(1.2, 1.45)).toFixed(2));
  const stopLoss = parseFloat((coinPrice * randFloat(0.82, 0.92)).toFixed(2));
  const pnl = isBullish ? (target1 - entry) : (entry - stopLoss);
  const pnlPct = parseFloat(((pnl / entry) * 100).toFixed(2));

  const analysisVerbs = [
    'looking strong on',
    'setting up beautifully on',
    'forming a clean breakout pattern on',
    'consolidating perfectly on',
    'showing bullish divergence on',
    'respecting key structure on',
    'rejecting resistance on',
  ];

  const chartPatterns = [
    'Bull flag forming',
    'Ascending triangle breakout',
    'Higher lows intact',
    'Cup and handle pattern',
    'Wyckoff accumulation phase',
    'Golden cross confirmed',
    'Head and shoulders — inverse',
    'Supply zone flipped to demand',
    'Double bottom confirmed',
    'Orderblock respected perfectly',
  ];

  const rrRatio = parseFloat((Math.abs(target1 - entry) / Math.abs(entry - stopLoss)).toFixed(1));

  const contentLines = [
    '$' + coin + ' ' + pick(analysisVerbs) + ' the ' + timeframe,
    '',
    'Entry Point: $' + entry.toLocaleString(),
    'Target 1: $' + target1.toLocaleString() + ' | Target 2: $' + target2.toLocaleString(),
    'Stop Loss: $' + stopLoss.toLocaleString(),
    '',
    pick(chartPatterns) + ' \u2014 ' + trend + ' setup confirmed.',
    'R:R ratio: ' + rrRatio + ':1',
    '',
    '$' + coin + ' ' + (isBullish ? 'long' : 'short') + ' idea. DYOR.',
  ];

  return {
    id: genId(),
    username: user.username,
    avatar_url: user.avatar,
    content: contentLines.join('\n'),
    coin_symbol: coin,
    trade_type: isBullish ? 'long' : 'short',
    entry_price: entry,
    exit_price: isBullish ? target1 : stopLoss,
    profit_loss: parseFloat(pnl.toFixed(2)),
    profit_loss_percent: pnlPct,
    leverage: pick([1, 2, 3, 5, 10, 20, 25]),
    image_url: chartImage,
    image_url_2: null,
    image_url_3: null,
    post_type: 'chart_analysis',
    likes_count: randInt(100, 6000),
    comments_count: randInt(20, 400),
    shares_count: randInt(10, 200),
    view_count: randInt(8000, 300000),
    repost_count: randInt(5, 150),
    is_bullish: isBullish,
    created_at: recentTimestamp(300),
    coin_tags: buildCoinTags(pc, [coin, pick(['BTC', 'ETH', 'SOL'])]),
    asset_change_30d: randFloat(-20, 150, 1),
    sentiment: trend,
    extra_data: {
      timeframe,
      entry,
      target1,
      target2,
      stopLoss,
      badge: user.badge ?? null,
    },
  };
}

// ---------------------------------------------------------
// 7. generateBinanceSquarePost — natural Binance Square style
// ---------------------------------------------------------
export function generateBinanceSquarePost(pc: PriceCache): GeneratedPost {
  const postData = pick(ALL_BS_POSTS);
  const user = pick(ALL_BS_USERS);

  const primaryCoin = postData.tags[0] ?? 'BTC';
  const coinPrice = pc.getBySymbol(primaryCoin)?.price ?? (FALLBACK_PRICES[primaryCoin] ?? 100);

  // Pick image based on category
  let imageUrl: string | null = null;
  if (postData.hasImage && postData.imageCategory && postData.imageCategory !== 'none') {
    if (postData.imageCategory === 'meme') {
      imageUrl = pick(BS_MEME_IMAGES);
    } else if (postData.imageCategory === 'chart') {
      imageUrl = pick(CRYPTO_CHART_IMAGES);
    } else if (postData.imageCategory === 'car') {
      imageUrl = pick([...WEALTH_FLEX_IMAGES.slice(0, 16), ...CAR_IMAGE_URLS]);
    } else if (postData.imageCategory === 'yacht') {
      imageUrl = pick(WEALTH_FLEX_IMAGES.slice(17, 28));
    } else if (postData.imageCategory === 'watch') {
      imageUrl = pick(WEALTH_FLEX_IMAGES.slice(29, 37));
    } else if (postData.imageCategory === 'villa' || postData.imageCategory === 'food' || postData.imageCategory === 'party') {
      imageUrl = pick([...FOOD_LIFESTYLE_IMAGES, ...WEALTH_FLEX_IMAGES.slice(38, 62)]);
    } else if (postData.imageCategory === 'jet') {
      imageUrl = pick(WEALTH_FLEX_IMAGES.slice(17, 24));
    } else {
      imageUrl = pick(BS_MEME_IMAGES);
    }
  } else if (postData.hasImage) {
    imageUrl = pick(BS_MEME_IMAGES);
  }

  const isBullish = postData.sentiment === 'bullish';
  const entryPrice = parseFloat((coinPrice * randFloat(0.7, 0.95)).toFixed(4));
  const exitPrice = isBullish
    ? parseFloat((coinPrice * randFloat(1.05, 1.6)).toFixed(4))
    : parseFloat((coinPrice * randFloat(0.6, 0.9)).toFixed(4));
  const leverage = pick([1, 1, 2, 3, 5, 10, 20]);
  // Use margin-based PnL so amounts are always realistic (never tiny fractions)
  const rawPct = ((exitPrice - entryPrice) / entryPrice) * 100 * leverage;
  const pnlPct = parseFloat(rawPct.toFixed(2));
  const marginUSDT = pick([2000, 3500, 5500, 8000, 12500, 18000, 27000, 40000]);
  const pnl = parseFloat((marginUSDT * Math.abs(pnlPct) / 100 * (isBullish ? 1 : -1)).toFixed(2));

  const coinTags = buildCoinTags(pc, postData.tags);

  // Realistic engagement — most posts modest, some viral
  const isViral = Math.random() < 0.12;
  const isHot = Math.random() < 0.25;

  return {
    id: genId(),
    username: user.username,
    avatar_url: user.avatar,
    content: postData.content,
    coin_symbol: primaryCoin,
    trade_type: isBullish ? 'long' : 'short',
    entry_price: entryPrice,
    exit_price: exitPrice,
    profit_loss: pnl,
    profit_loss_percent: pnlPct,
    leverage,
    image_url: imageUrl,
    image_url_2: null,
    image_url_3: null,
    post_type: 'bs_square',
    likes_count: isViral ? randInt(2000, 25000) : isHot ? randInt(200, 2000) : randInt(3, 300),
    comments_count: isViral ? randInt(100, 3000) : isHot ? randInt(10, 300) : randInt(0, 80),
    shares_count: isViral ? randInt(50, 1000) : isHot ? randInt(5, 150) : randInt(0, 40),
    view_count: isViral ? randInt(50000, 500000) : isHot ? randInt(5000, 80000) : randInt(100, 10000),
    repost_count: isViral ? randInt(20, 500) : randInt(0, 50),
    is_bullish: isBullish,
    created_at: recentTimestamp(240),
    coin_tags: coinTags,
    sentiment: postData.sentiment,
    extra_data: { verified: (user as any).verified ?? false },
  };
}

// ---------------------------------------------------------
// 8. generateRandomRichPost
// ---------------------------------------------------------
export function generateRandomRichPost(pc: PriceCache): GeneratedPost {
  const generators: Array<(pc: PriceCache) => GeneratedPost> = [
    generateWealthFlexPost,
    generateBreakingNewsPost,
    generateLifestylePost,
    generateTraderProfilePost,
    generateGeopoliticalPost,
    generateCryptoChartPost,
    generateBinanceSquarePost,
    generateBinanceSquarePost, // double weight — Binance Square style most common
    generateBinanceSquarePost,
  ];

  // Weight distribution — BS style posts get 45% total weight
  const weights = [15, 12, 12, 8, 8, 10, 15, 15, 15];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) {
      return generators[i](pc);
    }
  }

  return generators[0](pc);
}

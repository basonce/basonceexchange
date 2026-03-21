import { supabase } from './supabase';
import type { AlphaToken, AlphaTransaction, AlphaComment, AlphaCompetition, AlphaHolder, AlphaPricePoint } from '../types/alpha';

export async function fetchAlphaTokens(filter: string, network: string): Promise<AlphaToken[]> {
  let query = supabase
    .from('alpha_tokens')
    .select('*')
    .eq('status', 'active');

  if (network === 'BNC') {
    query = query.in('network', ['BSC', 'BNC']);
  } else if (network !== 'All') {
    query = query.eq('network', network);
  }

  switch (filter) {
    case 'trending':
      query = query.order('hot_score', { ascending: false });
      break;
    case 'new':
      query = query.order('created_at', { ascending: false });
      break;
    case 'voted':
      query = query.order('community_score', { ascending: false });
      break;
    case 'graduated':
      query = query.eq('is_graduated', true).order('market_cap', { ascending: false });
      break;
    default:
      query = query.order('hot_score', { ascending: false });
  }

  const { data, error } = await query.limit(50);
  if (error) throw error;
  return data || [];
}

export async function fetchRecentTransactions(limit = 30): Promise<AlphaTransaction[]> {
  const { data, error } = await supabase
    .from('alpha_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function fetchTokenTransactions(tokenId: string): Promise<AlphaTransaction[]> {
  const { data, error } = await supabase
    .from('alpha_transactions')
    .select('*')
    .eq('token_id', tokenId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function fetchTokenComments(tokenId: string): Promise<AlphaComment[]> {
  const { data, error } = await supabase
    .from('alpha_comments')
    .select('*')
    .eq('token_id', tokenId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function fetchTokenHolders(tokenId: string): Promise<AlphaHolder[]> {
  const { data, error } = await supabase
    .from('alpha_token_holders')
    .select('*')
    .eq('token_id', tokenId)
    .order('percentage', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function fetchPriceHistory(tokenId: string, timeframe: string = '1H'): Promise<AlphaPricePoint[]> {
  const timeframeMins: Record<string, number> = {
    '1M': 1, '5M': 5, '15M': 15, '1H': 60, '4H': 240, '1D': 1440
  };
  const mins = timeframeMins[timeframe] || 60;
  const hoursBack = mins <= 5 ? 3 : mins <= 15 ? 12 : mins <= 60 ? 48 : mins <= 240 ? 96 : 336;

  const since = new Date(Date.now() - hoursBack * 3600000).toISOString();

  const { data, error } = await supabase
    .from('alpha_price_history')
    .select('*')
    .eq('token_id', tokenId)
    .gte('timestamp', since)
    .order('timestamp', { ascending: true })
    .limit(300);

  if (error) throw error;
  return data || [];
}

export async function fetchActiveCompetition(): Promise<AlphaCompetition | null> {
  const { data, error } = await supabase
    .from('alpha_competitions')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function recordPricePoint(
  tokenId: string,
  price: number,
  volume: number,
  marketCap: number
): Promise<void> {
  await supabase.rpc('record_alpha_price_point', {
    p_token_id: tokenId,
    p_price: price,
    p_volume: volume,
    p_market_cap: marketCap,
  });
}

export function calculateBondingCurvePrice(raisedAmount: number, targetAmount: number, initialPrice: number): number {
  const progress = Math.min(raisedAmount / targetAmount, 1);
  const multiplier = 1 + progress * progress * 100;
  return initialPrice * multiplier;
}

export function calculatePriceAfterTrade(
  type: 'buy' | 'sell',
  amount: number,
  currentRaised: number,
  targetAmount: number,
  initialPrice: number
): { newPrice: number; newRaised: number } {
  const delta = type === 'buy' ? amount : -amount;
  const newRaised = Math.max(0, Math.min(currentRaised + delta, targetAmount));
  const newPrice = calculateBondingCurvePrice(newRaised, targetAmount, initialPrice);
  return { newPrice, newRaised };
}

export async function updateTokenAfterTrade(
  tokenId: string,
  type: 'buy' | 'sell',
  amount: number,
  token: AlphaToken
): Promise<{ newPrice: number; newRaised: number }> {
  const initialPrice = token.initial_price || token.current_price * 0.1;
  const { newPrice, newRaised } = calculatePriceAfterTrade(
    type, amount, token.raised_amount, token.target_amount, initialPrice
  );

  const newMarketCap = newPrice * (token.total_supply || 1000000000);
  const newVolume = (token.volume_24h || 0) + amount;
  const priceChange = ((newPrice - token.current_price) / Math.max(token.current_price, 0.000000001)) * 100;
  const newHotScore = Math.min(100, (token.hot_score || 0) + Math.abs(priceChange) * 0.5);

  await supabase
    .from('alpha_tokens')
    .update({
      current_price: newPrice,
      raised_amount: newRaised,
      market_cap: newMarketCap,
      volume_24h: newVolume,
      transaction_count: (token.transaction_count || 0) + 1,
      price_change_24h: (token.price_change_24h || 0) + priceChange * 0.1,
      ath_price: Math.max(token.ath_price || 0, newPrice),
      hot_score: newHotScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenId);

  await recordPricePoint(tokenId, newPrice, amount, newMarketCap).catch(() => {});

  return { newPrice, newRaised };
}

export function calculatePriceImpact(amount: number, raisedAmount: number, targetAmount: number): number {
  const currentProgress = raisedAmount / targetAmount;
  const newProgress = Math.min((raisedAmount + amount) / targetAmount, 1);
  if (currentProgress === 0) return 0;
  return ((newProgress - currentProgress) / currentProgress) * 100;
}

const FAKE_USERNAMES = [
  'CryptoKing42','MoonHunter','DegenTrader','DiamondHands88','ApeStrong',
  'WhaleAlert','GemFinder','BullRunner','TokenMaster','AlphaSeeker',
  'ChartWizard','PumpDetector','EarlyBird99','SolanaFan','DeFiPro',
  'MemeKing','CryptoNinja','BlockchainBro','YieldFarmer','GasOptimizer',
  'LiquidityKing','ZeroToHero','BNCMaxi','HodlArmy','NFTFlippr',
];

export function generateFakeTransaction(tokens: AlphaToken[]): AlphaTransaction {
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  const isBuy = Math.random() > 0.35;
  const ui = Math.floor(Math.random() * FAKE_USERNAMES.length);
  const totalValue = token.raised_token === 'SOL'
    ? +(Math.random() * 15 + 0.5).toFixed(2)
    : token.raised_token === 'ETH'
      ? +(Math.random() * 0.8 + 0.01).toFixed(4)
      : +(Math.random() * 50 + 1).toFixed(1);

  return {
    id: crypto.randomUUID(),
    token_id: token.id,
    user_id: null,
    tx_type: isBuy ? 'buy' : 'sell',
    amount: Math.round(totalValue * 1000000 / Math.max(token.market_cap, 1)),
    price: token.current_price,
    total_value: totalValue,
    wallet_address: '0x' + Math.random().toString(16).slice(2, 6) + '...' + Math.random().toString(16).slice(2, 6),
    username: FAKE_USERNAMES[ui],
    avatar_url: `https://i.pravatar.cc/150?img=${10 + ui}`,
    token_symbol: token.symbol,
    token_name: token.name,
    raised_token: token.raised_token,
    created_at: new Date().toISOString(),
  };
}

export function generateBotTrade(token: AlphaToken): AlphaTransaction {
  const isBuy = Math.random() > 0.3;
  const ui = Math.floor(Math.random() * FAKE_USERNAMES.length);

  let totalValue: number;
  if (token.raised_token === 'SOL') {
    totalValue = +(Math.random() * 8 + 0.2).toFixed(2);
  } else if (token.raised_token === 'ETH') {
    totalValue = +(Math.random() * 0.5 + 0.005).toFixed(4);
  } else {
    totalValue = +(Math.random() * 30 + 0.5).toFixed(1);
  }

  const priceVariation = token.current_price * (1 + (Math.random() * 0.04 - 0.02));

  return {
    id: crypto.randomUUID(),
    token_id: token.id,
    user_id: null,
    tx_type: isBuy ? 'buy' : 'sell',
    amount: Math.round(totalValue / Math.max(priceVariation, 0.000001)),
    price: priceVariation,
    total_value: totalValue,
    wallet_address: '0x' + Math.random().toString(16).slice(2, 6) + '...' + Math.random().toString(16).slice(2, 6),
    username: FAKE_USERNAMES[ui],
    avatar_url: `https://i.pravatar.cc/150?img=${10 + ui}`,
    token_symbol: token.symbol,
    token_name: token.name,
    raised_token: token.raised_token,
    created_at: new Date().toISOString(),
  };
}

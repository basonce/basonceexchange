export interface AlphaToken {
  id: string;
  creator_id: string | null;
  name: string;
  symbol: string;
  description: string | null;
  logo_url: string | null;
  network: string;
  tag: string;
  website_url: string | null;
  twitter_url: string | null;
  telegram_url: string | null;
  raised_amount: number;
  target_amount: number;
  raised_token: string;
  current_price: number;
  market_cap: number;
  holder_count: number;
  transaction_count: number;
  volume_24h: number;
  community_score: number;
  is_graduated: boolean;
  is_featured: boolean;
  status: string;
  total_supply: number;
  circulating_supply: number;
  initial_price: number;
  creator_initial_buy: number;
  price_change_24h: number;
  ath_price: number;
  liquidity: number;
  created_at: string;
  updated_at: string;
}

export interface AlphaTransaction {
  id: string;
  token_id: string;
  user_id: string | null;
  tx_type: 'buy' | 'sell';
  amount: number;
  price: number;
  total_value: number;
  wallet_address: string | null;
  username: string | null;
  avatar_url: string | null;
  token_symbol: string;
  token_name: string;
  raised_token: string;
  created_at: string;
}

export interface AlphaComment {
  id: string;
  token_id: string;
  user_id: string | null;
  username: string;
  avatar_url: string | null;
  content: string;
  likes: number;
  created_at: string;
}

export interface AlphaCompetition {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  prize_pool: number;
  status: string;
  created_at: string;
}

export interface AlphaHolder {
  id: string;
  token_id: string;
  user_id: string | null;
  username: string;
  avatar_url: string | null;
  amount: number;
  avg_buy_price: number;
  total_invested: number;
  percentage: number;
  created_at: string;
}

export interface AlphaPricePoint {
  timestamp: string;
  price: number;
  market_cap: number;
  volume: number;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
}

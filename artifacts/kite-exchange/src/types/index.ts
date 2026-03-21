export interface Cryptocurrency {
  id: string;
  symbol: string;
  name: string;
  logo_url: string | null;
  current_price: number;
  price_change_24h: number;
  market_cap: number;
  volume_24h: number;
  is_active: boolean;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  currency_id: string;
  balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  currency_id: string;
  order_type: 'buy' | 'sell';
  price: number;
  amount: number;
  filled_amount: number;
  status: 'pending' | 'partial' | 'filled' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  buyer_id: string;
  seller_id: string;
  currency_id: string;
  buy_order_id: string | null;
  sell_order_id: string | null;
  price: number;
  amount: number;
  total: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

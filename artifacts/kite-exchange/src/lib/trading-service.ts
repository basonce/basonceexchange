import { supabase, getCurrentUser } from './supabase';

export interface TradeResult {
  success: boolean;
  order_id?: string;
  trade_id?: string;
  side?: string;
  symbol?: string;
  price?: number;
  quantity?: number;
  total?: number;
  fee?: number;
  realized_pnl?: number;
  error?: string;
}

export interface Position {
  id: string;
  symbol: string;
  total_quantity: number;
  average_price: number;
  total_invested: number;
  current_price?: number;
  unrealized_pnl?: number;
  unrealized_pnl_percentage?: number;
}

export interface Trade {
  id: string;
  order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  total: number;
  fee: number;
  realized_pnl: number;
  created_at: string;
}

export class TradingService {
  static async executeTrade(
    symbol: string,
    side: 'buy' | 'sell',
    price: number,
    quantity: number
  ): Promise<TradeResult> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Please login to trade' };
      }

      console.log('🔄 Executing trade:', { symbol, side, price, quantity, user_id: user.id });

      const { data, error } = await supabase.rpc('execute_spot_order', {
        p_user_id: user.id,
        p_symbol: symbol,
        p_side: side,
        p_price: price,
        p_quantity: quantity
      });

      console.log('📊 Trade result:', { data, error });

      if (error) {
        console.error('❌ Trade execution error:', error);
        return { success: false, error: error.message || error.hint || 'Trade execution failed' };
      }

      if (!data) {
        return { success: false, error: 'No response from server' };
      }

      console.log('✅ Trade successful:', data);

      await this.updateDailyPNL(user.id);

      return data as TradeResult;
    } catch (error: any) {
      console.error('💥 Trade error:', error);
      return { success: false, error: error.message || 'Trade failed' };
    }
  }

  static async updateDailyPNL(userId: string): Promise<void> {
    try {
      await supabase.rpc('update_user_daily_pnl', {
        user_id_param: userId
      });
    } catch (error) {
      console.error('Error updating daily PNL:', error);
    }
  }

  static async getDailyPNL(): Promise<{ pnl: number; percentage: number }> {
    try {
      const user = await getCurrentUser();
      if (!user) return { pnl: 0, percentage: 0 };

      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('daily_pnl, daily_pnl_updated_at')
        .eq('user_id', user.id)
        .eq('symbol', 'USDT')
        .maybeSingle();

      if (balanceError) {
        console.error('Error fetching daily PNL from database:', balanceError);
        return { pnl: 0, percentage: 0 };
      }

      if (!balanceData) {
        return { pnl: 0, percentage: 0 };
      }

      const dailyPnl = parseFloat(balanceData.daily_pnl || '0');
      const lastUpdated = new Date(balanceData.daily_pnl_updated_at);
      const today = new Date();

      if (lastUpdated.toDateString() !== today.toDateString()) {
        await supabase.rpc('save_and_reset_daily_pnl');
        return { pnl: 0, percentage: 0 };
      }

      const { data: allBalances } = await supabase
        .from('user_balances')
        .select('symbol, balance')
        .eq('user_id', user.id);

      if (!allBalances || allBalances.length === 0) {
        return { pnl: dailyPnl, percentage: 0 };
      }

      let currentTotalValue = 0;
      for (const balance of allBalances) {
        const balanceAmount = parseFloat(balance.balance || '0');
        if (balance.symbol === 'USDT') {
          currentTotalValue += balanceAmount;
        } else {
          const price = await this.getCurrentPrice(balance.symbol);
          currentTotalValue += balanceAmount * price;
        }
      }

      const startingTotalValue = currentTotalValue - dailyPnl;
      const percentage = startingTotalValue > 0 ? (dailyPnl / startingTotalValue) * 100 : 0;

      return {
        pnl: dailyPnl,
        percentage
      };
    } catch (error) {
      console.error('Error fetching daily PNL:', error);
      return { pnl: 0, percentage: 0 };
    }
  }

  static async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
      if (!response.ok) {
        return await this.getLastKnownPrice(symbol);
      }
      const data = await response.json();
      const price = parseFloat(data.price);
      if (price && price > 0) {
        return price;
      }
      return await this.getLastKnownPrice(symbol);
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return await this.getLastKnownPrice(symbol);
    }
  }

  static async getLastKnownPrice(symbol: string): Promise<number> {
    try {
      const user = await getCurrentUser();
      if (!user) return 0;

      const { data: position } = await supabase
        .from('user_positions')
        .select('average_price')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .maybeSingle();

      if (position && position.average_price) {
        return parseFloat(position.average_price);
      }

      const { data: lastTrade } = await supabase
        .from('user_trades')
        .select('price')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastTrade && lastTrade.price) {
        return parseFloat(lastTrade.price);
      }

      return 0;
    } catch (error) {
      console.error(`Error fetching last known price for ${symbol}:`, error);
      return 0;
    }
  }

  static async getUserPositions(): Promise<Position[]> {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_positions')
        .select('*')
        .eq('user_id', user.id)
        .gt('total_quantity', 0)
        .order('total_invested', { ascending: false });

      if (error) throw error;

      return (data || []).map(position => ({
        ...position,
        total_quantity: parseFloat(position.total_quantity),
        average_price: parseFloat(position.average_price),
        total_invested: parseFloat(position.total_invested)
      }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  static async getTradeHistory(limit: number = 50): Promise<Trade[]> {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(trade => ({
        ...trade,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.quantity),
        total: parseFloat(trade.total),
        fee: parseFloat(trade.fee),
        realized_pnl: parseFloat(trade.realized_pnl)
      }));
    } catch (error) {
      console.error('Error fetching trade history:', error);
      return [];
    }
  }

  static async getOrderHistory(limit: number = 50) {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('spot_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(order => ({
        ...order,
        price: parseFloat(order.price),
        quantity: parseFloat(order.quantity),
        total: parseFloat(order.total)
      }));
    } catch (error) {
      console.error('Error fetching order history:', error);
      return [];
    }
  }

  static calculatePNL(position: Position, currentPrice: number) {
    const unrealizedPnl = (currentPrice - position.average_price) * position.total_quantity;
    const unrealizedPnlPercentage = ((currentPrice - position.average_price) / position.average_price) * 100;

    return {
      ...position,
      current_price: currentPrice,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_percentage: unrealizedPnlPercentage
    };
  }

  static async getTotalPNL(): Promise<{ realized: number; unrealized: number; total: number }> {
    try {
      const user = await getCurrentUser();
      if (!user) return { realized: 0, unrealized: 0, total: 0 };

      const { data: trades } = await supabase
        .from('user_trades')
        .select('realized_pnl')
        .eq('user_id', user.id);

      const realizedPnl = (trades || []).reduce((sum, trade) => sum + parseFloat(trade.realized_pnl || '0'), 0);

      return {
        realized: realizedPnl,
        unrealized: 0,
        total: realizedPnl
      };
    } catch (error) {
      console.error('Error calculating PNL:', error);
      return { realized: 0, unrealized: 0, total: 0 };
    }
  }
}

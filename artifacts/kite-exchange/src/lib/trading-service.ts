import { supabase, getCurrentUser } from './supabase';
import { isTradFiSymbol } from './tradfi-data';
import { getCachedTradFiPrice } from './tradfi-price-service';
import { fetchUserRestrictions } from './user-restrictions';

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

const METAL_CROSS_PAIRS: Record<string, { base: string; quote: string }> = {
  XAUBTC: { base: 'XAU', quote: 'BTC' },
  XAUETH: { base: 'XAU', quote: 'ETH' },
  XAGBTC: { base: 'XAG', quote: 'BTC' },
  XAGETH: { base: 'XAG', quote: 'ETH' },
  XPTBTC: { base: 'XPT', quote: 'BTC' },
  XPTETH: { base: 'XPT', quote: 'ETH' },
  XPDBTC: { base: 'XPD', quote: 'BTC' },
  XPDETH: { base: 'XPD', quote: 'ETH' },
  OILBTC: { base: 'OIL', quote: 'BTC' },
  OILETH: { base: 'OIL', quote: 'ETH' },
  BRTBTC: { base: 'BRT', quote: 'BTC' },
  BRTETH: { base: 'BRT', quote: 'ETH' },
};

function getAssets(symbol: string): { base: string; quote: string } {
  if (METAL_CROSS_PAIRS[symbol]) return METAL_CROSS_PAIRS[symbol];
  return { base: symbol, quote: 'USDT' };
}

async function getBalance(userId: string, asset: string) {
  const { data } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', asset)
    .maybeSingle();
  return data;
}

async function updateBalance(id: string, newBalance: number) {
  await supabase
    .from('user_balances')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', id);
}

async function createBalance(userId: string, asset: string, amount: number) {
  await supabase.from('user_balances').insert({
    user_id: userId,
    symbol: asset,
    balance: amount,
    locked_balance: 0,
  });
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
      if (!user) return { success: false, error: 'Please login to trade' };

      if (!price || price <= 0) return { success: false, error: 'Invalid price' };
      if (!quantity || quantity <= 0) return { success: false, error: 'Invalid quantity' };

      // Per-user custom fee override (admin can set higher fee for marked users)
      let FEE_RATE = 0.001;
      try {
        const r = await fetchUserRestrictions(user.id) as any;
        const pct = parseFloat(r?.custom_trade_fee_pct ?? 0) || 0;
        if (pct > 0) FEE_RATE = pct / 100; // pct is in percent (1 = 1%)
      } catch {}
      const total = price * quantity;
      const fee = total * FEE_RATE;

      const { base, quote } = getAssets(symbol);

      if (side === 'buy') {
        const cost = total + fee;
        const quoteBal = await getBalance(user.id, quote);
        const available = quoteBal ? parseFloat(quoteBal.balance) : 0;
        if (available < cost) {
          return { success: false, error: `Insufficient ${quote} balance (need ${cost.toFixed(6)}, have ${available.toFixed(6)})` };
        }
        await updateBalance(quoteBal.id, available - cost);

        const baseBal = await getBalance(user.id, base);
        if (baseBal) {
          await updateBalance(baseBal.id, parseFloat(baseBal.balance) + quantity);
        } else {
          await createBalance(user.id, base, quantity);
        }
      } else {
        const baseBal = await getBalance(user.id, base);
        const available = baseBal ? parseFloat(baseBal.balance) : 0;
        if (available < quantity) {
          return { success: false, error: `Insufficient ${base} balance (need ${quantity.toFixed(6)}, have ${available.toFixed(6)})` };
        }
        await updateBalance(baseBal.id, available - quantity);

        const received = total - fee;
        const quoteBal = await getBalance(user.id, quote);
        if (quoteBal) {
          await updateBalance(quoteBal.id, parseFloat(quoteBal.balance) + received);
        } else {
          await createBalance(user.id, quote, received);
        }
      }

      const orderId = crypto.randomUUID();

      try {
        await supabase.from('spot_orders').insert({
          id: orderId,
          user_id: user.id,
          symbol,
          side,
          price,
          quantity,
          total,
          order_type: 'market',
          status: 'filled',
        });
      } catch {
        await supabase.from('spot_orders').insert({
          user_id: user.id,
          symbol,
          side,
          price,
          quantity,
          total,
        });
      }

      const { data: position } = await supabase
        .from('user_positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .maybeSingle();

      let realizedPnl = 0;
      if (side === 'sell' && position && parseFloat(position.average_price) > 0) {
        realizedPnl = (price - parseFloat(position.average_price)) * quantity;
      }

      const tradeId = crypto.randomUUID();
      await supabase.from('user_trades').insert({
        id: tradeId,
        user_id: user.id,
        order_id: orderId,
        symbol,
        side,
        price,
        quantity,
        total,
        fee,
        realized_pnl: realizedPnl,
      });

      if (side === 'buy') {
        if (position) {
          const newQty = parseFloat(position.total_quantity) + quantity;
          const newInvested = parseFloat(position.total_invested) + total;
          await supabase.from('user_positions')
            .update({
              total_quantity: newQty,
              average_price: newInvested / newQty,
              total_invested: newInvested,
              updated_at: new Date().toISOString(),
            })
            .eq('id', position.id);
        } else {
          await supabase.from('user_positions').insert({
            user_id: user.id,
            symbol,
            total_quantity: quantity,
            average_price: price,
            total_invested: total,
          });
        }
      } else if (position) {
        const newQty = parseFloat(position.total_quantity) - quantity;
        if (newQty <= 0.000000001) {
          await supabase.from('user_positions').delete().eq('id', position.id);
        } else {
          const avgPrice = parseFloat(position.average_price);
          const soldInvested = avgPrice * quantity;
          const newInvested = Math.max(0, parseFloat(position.total_invested) - soldInvested);
          await supabase.from('user_positions')
            .update({
              total_quantity: newQty,
              average_price: avgPrice,
              total_invested: newInvested,
              updated_at: new Date().toISOString(),
            })
            .eq('id', position.id);
        }
      }

      try {
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('total_trades, total_volume_usdt')
          .eq('user_id', user.id)
          .maybeSingle();
        if (prof) {
          await supabase.from('user_profiles').update({
            total_trades: (prof.total_trades || 0) + 1,
            total_volume_usdt: parseFloat(prof.total_volume_usdt || '0') + total,
            updated_at: new Date().toISOString(),
          }).eq('user_id', user.id);
        }
      } catch { /* non-critical */ }

      await this.updateDailyPNL(user.id);

      return {
        success: true,
        order_id: orderId,
        trade_id: tradeId,
        side,
        symbol,
        price,
        quantity,
        total,
        fee,
        realized_pnl: realizedPnl,
      };
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
    if (isTradFiSymbol(symbol)) {
      const tradfi = getCachedTradFiPrice(symbol);
      return tradfi?.price || 0;
    }
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

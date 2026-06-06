import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { TradingService } from '../../lib/trading-service';
import { getUserRestrictions } from '../../lib/user-restrictions';
import type { UserRestrictions } from '../../lib/user-restrictions';

export interface SpotBalances {
  usdt: number;
  coin: number;
}

/**
 * Desktop spot execution hook. Duplicates the standard-pair paths of
 * TradePage.handleTrade EXACTLY: market orders via TradingService.executeTrade
 * (+ a filled spot_orders row), limit orders inserted into spot_orders. Same
 * tables, same service. Mobile code is never imported or modified.
 */
export function useSpotTrading(selectedSymbol: string) {
  const [userId, setUserId] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restrictions, setRestrictions] = useState<UserRestrictions | null>(null);

  const loadBalances = useCallback(async (uid: string) => {
    const { data: balances } = await supabase
      .from('user_balances')
      .select('symbol, balance')
      .eq('user_id', uid);
    if (balances) {
      const usdt = balances.find(b => b.symbol === 'USDT');
      const coin = balances.find(b => b.symbol === selectedSymbol);
      setUsdtBalance(parseFloat(usdt?.balance || '0'));
      setCoinBalance(parseFloat(coin?.balance || '0'));
    }
  }, [selectedSymbol]);

  const fetchOpenOrders = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return;
    const { data } = await supabase
      .from('spot_orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setOpenOrders(data || []);
  }, []);

  const fetchOrderHistory = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return;
    const { data } = await supabase
      .from('spot_orders')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['filled', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(50);
    setOrderHistory(data || []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await getCurrentUser();
      if (!u || !active) return;
      setUserId(u.id);
      try { setRestrictions(await getUserRestrictions(u.id)); } catch {}
      await Promise.all([loadBalances(u.id), fetchOpenOrders(), fetchOrderHistory()]);
    })();
    return () => { active = false; };
  }, [loadBalances, fetchOpenOrders, fetchOrderHistory]);

  const cancelOrder = useCallback(async (orderId: string) => {
    await supabase.from('spot_orders').update({ status: 'cancelled' }).eq('id', orderId);
    await fetchOpenOrders();
    await fetchOrderHistory();
  }, [fetchOpenOrders, fetchOrderHistory]);

  /**
   * EXACT port of TradePage.handleTrade standard-pair logic (market + limit).
   * @param amount  in quote (USDT) if unit==='usdt', else in base coin units.
   */
  const trade = useCallback(async (params: {
    side: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    amount: string;
    price: string;
    unit: 'usdt' | 'coin';
    currentPrice: number;
  }): Promise<{ ok: boolean; message: string }> => {
    const { side, orderType, amount, price, unit, currentPrice } = params;

    if (restrictions?.usdt_frozen) return { ok: false, message: 'USDT trading is frozen on this account.' };
    if (restrictions?.pair_lock_enabled) {
      const pairKey = `${selectedSymbol}/USDT`;
      if (!restrictions.allowed_pairs.includes(pairKey)) {
        return { ok: false, message: `This pair is locked. You can only trade: ${restrictions.allowed_pairs.join(', ')}` };
      }
    }

    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) return { ok: false, message: 'Please enter a valid amount' };

    let tradePrice = currentPrice;
    if (orderType === 'limit') {
      if (!price || parseFloat(price) <= 0) return { ok: false, message: 'Please enter a valid limit price' };
      tradePrice = parseFloat(price);
    }
    if (!tradePrice || tradePrice <= 0) return { ok: false, message: 'No live price available. Try again.' };

    const quantity = unit === 'usdt' ? amountValue / tradePrice : amountValue;

    if (side === 'buy' && (quantity * tradePrice) > usdtBalance) return { ok: false, message: 'Insufficient USDT balance' };
    if (side === 'sell' && quantity > coinBalance) return { ok: false, message: `Insufficient ${selectedSymbol} balance` };

    setLoading(true);
    try {
      if (orderType === 'limit') {
        const currentUser = await getCurrentUser();
        if (!currentUser) return { ok: false, message: 'Please login to trade' };
        const total = quantity * tradePrice;
        const { error } = await supabase.from('spot_orders').insert({
          user_id: currentUser.id,
          symbol: selectedSymbol,
          side,
          type: 'limit',
          price: tradePrice,
          quantity,
          total,
          status: 'pending',
        });
        if (error) throw error;
        await fetchOpenOrders();
        await fetchOrderHistory();
        return { ok: true, message: `Limit order placed: ${side} ${quantity.toFixed(6)} ${selectedSymbol} at ${tradePrice}` };
      }

      const result = await TradingService.executeTrade(selectedSymbol, side, tradePrice, quantity);
      if (!result.success) return { ok: false, message: result.error || 'Trade failed' };

      const currentUser = await getCurrentUser();
      if (currentUser) {
        const total = quantity * tradePrice;
        await supabase.from('spot_orders').insert({
          user_id: currentUser.id,
          symbol: selectedSymbol,
          side,
          type: 'market',
          price: tradePrice,
          quantity,
          total,
          status: 'filled',
          filled: quantity,
        });
      }
      if (userId) await loadBalances(userId);
      await fetchOpenOrders();
      await fetchOrderHistory();
      return { ok: true, message: `${side === 'buy' ? 'Bought' : 'Sold'} ${quantity.toFixed(6)} ${selectedSymbol} successfully!` };
    } catch (err: any) {
      return { ok: false, message: err.message || 'Trade failed' };
    } finally {
      setLoading(false);
    }
  }, [restrictions, selectedSymbol, usdtBalance, coinBalance, userId, loadBalances, fetchOpenOrders, fetchOrderHistory]);

  return {
    userId, usdtBalance, coinBalance, openOrders, orderHistory, loading,
    trade, cancelOrder, loadBalances, fetchOpenOrders, fetchOrderHistory,
  };
}

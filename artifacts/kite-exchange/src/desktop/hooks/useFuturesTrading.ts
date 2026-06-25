import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import {
  calculateLiquidationPrice,
  calculateTradingFee,
  getMaintenanceMarginRate,
} from '../../lib/futures-calculator';
import { getUserRestrictions } from '../../lib/user-restrictions';
import type { UserRestrictions } from '../../lib/user-restrictions';
import { fetchFreshFuturesPrice } from '../lib/desktop-price';

export interface DeskFuturesPosition {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  position_size: number;
  entry_price: number;
  leverage: number;
  margin: number;
  liquidation_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  trading_fee: number;
  status: string;
  margin_mode: 'cross' | 'isolated';
  maintenance_margin_rate: number;
}

export interface CloseResult {
  success: boolean;
  symbol: string;
  side: string;
  entryPrice: number;
  closePrice: number;
  positionSize: number;
  sizePnl: number;
  fees: number;
  netPnl: number;
  pnlPercentage: number;
}

/**
 * Desktop futures execution hook. Duplicates FuturesPage.handlePlaceOrder and
 * handleClosePositionWithModal EXACTLY (same tables, same calculators, same
 * validation), so desktop money flows are identical to mobile. Mobile code is
 * never imported or modified.
 */
export function useFuturesTrading() {
  const [userId, setUserId] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [positions, setPositions] = useState<DeskFuturesPosition[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [tpslOrders, setTpslOrders] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restrictions, setRestrictions] = useState<UserRestrictions | null>(null);

  const loadUserBalance = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from('user_balances')
        .select('futures_balance')
        .eq('user_id', uid)
        .eq('symbol', 'USDT')
        .maybeSingle();
      if (data) setUsdtBalance(data.futures_balance || 0);
    } catch (e) { console.error('Failed to load balance:', e); }
  }, []);

  const loadPositions = useCallback(async (uid: string) => {
    try {
      // Intentional non-parity with mobile FuturesPage.loadPositions: mobile is
      // conditional on isBDex (BDEX_% when viewing the BDEX market, else exclude).
      // Desktop has NO BDEX market UI — supported_coins never yields BDEX_* symbols,
      // so desktop can neither open nor close BDEX positions. We therefore always
      // take mobile's non-BDEX branch, which is exact parity for every symbol the
      // desktop terminal can actually trade. BDEX positions stay fully managed on mobile.
      const { data } = await supabase
        .from('futures_positions')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'open')
        .not('symbol', 'like', 'BDEX_%')
        .order('created_at', { ascending: false });
      setPositions((data || []) as DeskFuturesPosition[]);
    } catch (e) { console.error('Failed to load positions:', e); }
  }, []);

  const loadHistory = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from('futures_history')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory(data || []);
    } catch (e) { console.error('Failed to load history:', e); }
  }, []);

  const loadOpenOrders = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from('futures_orders')
        .select('*')
        .eq('user_id', uid)
        .in('status', ['pending', 'partial'])
        .order('created_at', { ascending: false });
      setOpenOrders(data || []);
    } catch { /* table optional */ }
  }, []);

  const loadTpslOrders = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from('futures_tpsl_orders')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'active');
      setTpslOrders(data || []);
    } catch { /* table optional */ }
  }, []);

  const refresh = useCallback(async (uid: string) => {
    await Promise.all([loadUserBalance(uid), loadPositions(uid), loadHistory(uid), loadOpenOrders(uid), loadTpslOrders(uid)]);
  }, [loadUserBalance, loadPositions, loadHistory, loadOpenOrders, loadTpslOrders]);

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await getCurrentUser();
      if (!u || !active) return;
      setUserId(u.id);
      try { setRestrictions(await getUserRestrictions()); } catch {}
      await refresh(u.id);
    })();
    return () => { active = false; };
  }, [refresh]);

  // Realtime position updates (e.g. liquidations elsewhere).
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel('desk_futures_positions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'futures_positions', filter: `user_id=eq.${userId}` },
        () => { loadPositions(userId); loadUserBalance(userId); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadPositions, loadUserBalance]);

  /** EXACT port of FuturesPage.handlePlaceOrder. */
  const placeOrder = useCallback(async (params: {
    symbol: string;
    side: 'buy' | 'sell';
    leverage: number;
    amount: string;
    orderType: 'market' | 'limit';
    price: string;
    marginMode: 'cross' | 'isolated';
  }): Promise<{ ok: boolean; message: string }> => {
    const { symbol, side, leverage, amount, orderType, price, marginMode } = params;
    if (!userId || !amount) return { ok: false, message: 'Please enter amount' };

    if (restrictions?.usdt_frozen) return { ok: false, message: 'USDT trading is frozen on this account. Contact support.' };
    if (restrictions?.pair_lock_enabled) {
      const base = symbol.replace(/USDT$/i, '');
      const pairKey = `${base}/USDT`;
      if (!restrictions.allowed_pairs.includes(pairKey)) {
        return { ok: false, message: `This pair is locked. You can only trade: ${restrictions.allowed_pairs.join(', ')}` };
      }
    }

    try {
      setLoading(true);
      const marginAmount = parseFloat(amount);
      if (marginAmount <= 0) return { ok: false, message: 'Amount must be greater than 0' };
      if (marginAmount < 5) return { ok: false, message: 'Minimum margin is 5 USDT' };

      const freshPrice = await fetchFreshFuturesPrice(symbol);
      if (!freshPrice || freshPrice <= 0) return { ok: false, message: 'Cannot fetch current price. Please try again.' };

      let orderPrice: number;
      if (orderType === 'market') {
        orderPrice = freshPrice;
      } else {
        orderPrice = parseFloat(price);
        if (!orderPrice || orderPrice <= 0) return { ok: false, message: 'Invalid price. Please enter a valid price.' };
        const ratio = orderPrice / freshPrice;
        if (ratio > 10 || ratio < 0.1) {
          return { ok: false, message: `Price ${orderPrice} seems incorrect for ${symbol}. Current market price is ${freshPrice}.` };
        }
      }

      if (usdtBalance <= 0) return { ok: false, message: 'Insufficient balance. Please deposit funds first.' };

      const positionSize = marginAmount * leverage;
      const tradingFee = calculateTradingFee(positionSize, orderType === 'limit');
      const totalCost = marginAmount + tradingFee;
      if (totalCost > usdtBalance) {
        return { ok: false, message: `Insufficient balance. Required: ${totalCost.toFixed(2)} USDT, Available: ${usdtBalance.toFixed(2)} USDT` };
      }

      const positionSide = side === 'buy' ? 'LONG' : 'SHORT';
      const maintenanceMarginRate = getMaintenanceMarginRate(positionSize, symbol, leverage);
      const liquidationPrice = calculateLiquidationPrice(
        orderPrice, leverage, positionSide, maintenanceMarginRate, marginMode, marginAmount, usdtBalance,
      );

      const { error: positionError } = await supabase
        .from('futures_positions')
        .insert({
          user_id: userId,
          symbol,
          side: positionSide,
          position_size: positionSize,
          entry_price: orderPrice,
          leverage,
          margin: marginAmount,
          liquidation_price: liquidationPrice,
          unrealized_pnl: 0,
          realized_pnl: 0,
          trading_fee: tradingFee,
          status: 'open',
          margin_mode: marginMode,
          maintenance_margin_rate: maintenanceMarginRate,
        });
      if (positionError) throw positionError;

      const newBalance = Math.max(0, usdtBalance - totalCost);
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({ futures_balance: newBalance })
        .eq('user_id', userId)
        .eq('symbol', 'USDT');
      if (balanceError) throw balanceError;

      await loadUserBalance(userId);
      await loadPositions(userId);

      return {
        ok: true,
        message: `${positionSide} opened · Entry ${orderPrice} · Margin ${marginAmount} USDT · ${leverage}x · Liq ${liquidationPrice.toFixed(4)}`,
      };
    } catch (error) {
      console.error('Failed to place order:', error);
      return { ok: false, message: 'Failed to place order: ' + (error as Error).message };
    } finally {
      setLoading(false);
    }
  }, [userId, restrictions, usdtBalance, loadUserBalance, loadPositions]);

  /** EXACT port of FuturesPage.handleClosePositionWithModal. */
  const closePosition = useCallback(async (
    positionId: string,
    closeType: 'market' | 'limit' = 'market',
    limitPrice?: number,
    percentage: number = 100,
  ): Promise<CloseResult> => {
    const fail: CloseResult = { success: false, symbol: '', side: '', entryPrice: 0, closePrice: 0, positionSize: 0, sizePnl: 0, fees: 0, netPnl: 0, pnlPercentage: 0 };
    if (!userId) return fail;
    try {
      const position = positions.find(p => p.id === positionId);
      if (!position) return fail;

      let closePrice: number;
      if (closeType === 'market') {
        const freshPrice = await fetchFreshFuturesPrice(position.symbol);
        if (!freshPrice || freshPrice <= 0) return fail;
        closePrice = freshPrice;
      } else {
        closePrice = limitPrice || 0;
        if (closePrice <= 0) return fail;
        const freshPrice = await fetchFreshFuturesPrice(position.symbol);
        if (freshPrice > 0) {
          const ratio = closePrice / freshPrice;
          if (ratio > 10 || ratio < 0.1) return fail;
        }
      }

      const quantity = position.position_size / position.entry_price;
      const priceDiff = position.side === 'LONG'
        ? (closePrice - position.entry_price)
        : (position.entry_price - closePrice);
      const grossPnl = priceDiff * quantity * (percentage / 100);
      const closeFee = calculateTradingFee(position.position_size * (percentage / 100), false);
      const netPnl = grossPnl - closeFee;
      const maintenanceMarginRate = getMaintenanceMarginRate(position.position_size, position.symbol, position.leverage);

      const { error: historyError } = await supabase
        .from('futures_history')
        .insert({
          user_id: userId,
          symbol: position.symbol,
          side: position.side,
          leverage: position.leverage,
          entry_price: position.entry_price,
          close_price: closePrice,
          position_size: position.position_size * (percentage / 100),
          margin: position.margin * (percentage / 100),
          liquidation_price: position.liquidation_price,
          maintenance_margin_rate: maintenanceMarginRate,
          realized_pnl: netPnl,
          trading_fee: closeFee,
          close_reason: 'manual',
          created_at: new Date().toISOString(),
        });
      if (historyError) throw historyError;

      const { error: deleteError } = await supabase
        .from('futures_positions')
        .delete()
        .eq('id', positionId)
        .eq('user_id', userId);
      if (deleteError) throw deleteError;

      const returnAmount = position.margin * (percentage / 100) + netPnl;
      const { data: freshBal } = await supabase
        .from('user_balances')
        .select('futures_balance')
        .eq('user_id', userId)
        .eq('symbol', 'USDT')
        .maybeSingle();
      const freshBalance = freshBal?.futures_balance ?? usdtBalance;
      const newBalance = Math.max(0, freshBalance + returnAmount);
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({ futures_balance: newBalance })
        .eq('user_id', userId)
        .eq('symbol', 'USDT');
      if (balanceError) throw balanceError;

      await loadUserBalance(userId);
      await loadPositions(userId);
      await loadHistory(userId);

      const pnlPercentage = (netPnl / (position.margin * (percentage / 100))) * 100;
      return {
        success: true,
        symbol: position.symbol,
        side: position.side,
        entryPrice: position.entry_price,
        closePrice,
        positionSize: position.position_size * (percentage / 100),
        sizePnl: grossPnl,
        fees: closeFee,
        netPnl,
        pnlPercentage,
      };
    } catch (error: any) {
      console.error('Close position failed:', error);
      return fail;
    }
  }, [userId, positions, usdtBalance, loadUserBalance, loadPositions, loadHistory]);

  /**
   * Place a conditional (stop) order. The order is stored as a pending row in
   * futures_orders and only OPENS a position when the trigger price is hit (the
   * desktop trigger engine watches mark prices and calls executeStopOrder).
   * No margin is reserved until execution, mirroring cross-margin stop orders.
   */
  const placeStopOrder = useCallback(async (params: {
    symbol: string;
    side: 'buy' | 'sell';
    leverage: number;
    amount: string;
    orderType: 'stop-limit' | 'stop-market';
    price: string;
    stopPrice: string;
    marginMode: 'cross' | 'isolated';
  }): Promise<{ ok: boolean; message: string }> => {
    const { symbol, side, leverage, amount, orderType, price, stopPrice, marginMode } = params;
    if (!userId) return { ok: false, message: 'Please log in to trade' };

    if (restrictions?.usdt_frozen) return { ok: false, message: 'USDT trading is frozen on this account. Contact support.' };
    if (restrictions?.pair_lock_enabled) {
      const base = symbol.replace(/USDT$/i, '');
      const pairKey = `${base}/USDT`;
      if (!restrictions.allowed_pairs.includes(pairKey)) {
        return { ok: false, message: `This pair is locked. You can only trade: ${restrictions.allowed_pairs.join(', ')}` };
      }
    }

    const marginAmount = parseFloat(amount);
    if (!marginAmount || marginAmount <= 0) return { ok: false, message: 'Amount must be greater than 0' };
    if (marginAmount < 5) return { ok: false, message: 'Minimum margin is 5 USDT' };

    const trigger = parseFloat(stopPrice);
    if (!trigger || trigger <= 0) return { ok: false, message: 'Enter a valid stop (trigger) price' };

    let limit: number | null = null;
    if (orderType === 'stop-limit') {
      limit = parseFloat(price);
      if (!limit || limit <= 0) return { ok: false, message: 'Enter a valid limit price' };
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('futures_orders')
        .insert({
          user_id: userId,
          symbol,
          side,
          type: orderType,
          price: limit,
          trigger_price: trigger,
          amount: marginAmount,
          filled: 0,
          leverage,
          margin_mode: marginMode,
          post_only: false,
          reduce_only: false,
          time_in_force: 'GTC',
          status: 'pending',
        });
      if (error) throw error;
      await loadOpenOrders(userId);
      const label = orderType === 'stop-limit' ? 'Stop-Limit' : 'Stop-Market';
      return { ok: true, message: `${label} ${side === 'buy' ? 'Long' : 'Short'} placed · triggers @ ${trigger}` };
    } catch (error) {
      console.error('Failed to place stop order:', error);
      return { ok: false, message: 'Failed to place order: ' + (error as Error).message };
    } finally {
      setLoading(false);
    }
  }, [userId, restrictions, loadOpenOrders]);

  /** Cancel a pending conditional order. */
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from('futures_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('user_id', userId);
      if (error) throw error;
      await loadOpenOrders(userId);
      return true;
    } catch (e) {
      console.error('Failed to cancel order:', e);
      return false;
    }
  }, [userId, loadOpenOrders]);

  /**
   * Execute a triggered stop order by opening the position through the same
   * audited money path as a normal order (placeOrder), then mark the order
   * filled. Stop-market opens at market; stop-limit opens at its limit price.
   */
  const executeStopOrder = useCallback(async (order: any): Promise<{ ok: boolean; message: string }> => {
    if (!userId) return { ok: false, message: 'Please log in to trade' };
    // Atomic claim: only the executor that flips this row from `pending` ->
    // `processing` (scoped by id + user_id) is allowed to open the position.
    // This prevents the same order being filled twice across tabs/devices and
    // closes the gap between opening the position and recording the fill.
    let claimed = false;
    try {
      const { data: claim } = await supabase
        .from('futures_orders')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .select('id');
      claimed = Array.isArray(claim) && claim.length === 1;
    } catch (e) { console.error('Failed to claim stop order:', e); }
    if (!claimed) {
      if (userId) await loadOpenOrders(userId);
      return { ok: false, message: 'Order already processed' };
    }

    const r = await placeOrder({
      symbol: order.symbol,
      side: order.side === 'sell' || order.side === 'SHORT' ? 'sell' : 'buy',
      leverage: order.leverage || 1,
      amount: String(order.amount),
      orderType: order.type === 'stop-limit' ? 'limit' : 'market',
      price: order.price != null ? String(order.price) : '',
      marginMode: (order.margin_mode as 'cross' | 'isolated') || 'cross',
    });
    try {
      // If the fill failed we revert the claim to `pending` so the engine can
      // retry on the next tick; on success we finalise it as `filled`.
      await supabase
        .from('futures_orders')
        .update({
          status: r.ok ? 'filled' : 'pending',
          filled: r.ok ? order.amount : 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('user_id', userId);
    } catch (e) { console.error('Failed to update order status:', e); }
    if (userId) await loadOpenOrders(userId);
    return r;
  }, [placeOrder, userId, loadOpenOrders]);

  /**
   * Set Take Profit / Stop Loss for a position. Replaces any existing active
   * TP/SL for the position with the new values (one TP + one SL max).
   */
  const saveTpsl = useCallback(async (
    positionId: string,
    takeProfit: number | null,
    stopLoss: number | null,
  ): Promise<{ ok: boolean }> => {
    if (!userId) return { ok: false };
    try {
      await supabase
        .from('futures_tpsl_orders')
        .update({ status: 'cancelled' })
        .eq('position_id', positionId)
        .eq('user_id', userId)
        .eq('status', 'active');

      const rows: any[] = [];
      if (takeProfit && takeProfit > 0) {
        rows.push({ user_id: userId, position_id: positionId, type: 'tp', trigger_price: takeProfit, order_price: takeProfit, quantity: 0, status: 'active' });
      }
      if (stopLoss && stopLoss > 0) {
        rows.push({ user_id: userId, position_id: positionId, type: 'sl', trigger_price: stopLoss, order_price: stopLoss, quantity: 0, status: 'active' });
      }
      if (rows.length > 0) {
        const { error } = await supabase.from('futures_tpsl_orders').insert(rows);
        if (error) throw error;
      }
      await loadTpslOrders(userId);
      return { ok: true };
    } catch (e) {
      console.error('Failed to save TP/SL:', e);
      return { ok: false };
    }
  }, [userId, loadTpslOrders]);

  /**
   * Execute a triggered TP/SL by closing the whole position via the audited
   * closePosition path, then mark every active TP/SL for that position done.
   */
  const executeTpsl = useCallback(async (row: any): Promise<CloseResult> => {
    const res = await closePosition(row.position_id, 'market', undefined, 100);
    // Only retire the TP/SL rows when the close actually succeeded — otherwise
    // they must stay `active` so the position keeps its protection and the
    // engine retries on the next tick.
    if (res.success) {
      try {
        await supabase
          .from('futures_tpsl_orders')
          .update({ status: 'triggered', triggered_at: new Date().toISOString() })
          .eq('position_id', row.position_id)
          .eq('user_id', userId)
          .eq('status', 'active');
      } catch (e) { console.error('Failed to update TP/SL status:', e); }
    }
    if (userId) await loadTpslOrders(userId);
    return res;
  }, [closePosition, userId, loadTpslOrders]);

  return {
    userId, usdtBalance, positions, openOrders, tpslOrders, history, loading, restrictions,
    placeOrder, closePosition, placeStopOrder, cancelOrder, executeStopOrder, saveTpsl, executeTpsl, refresh,
  };
}

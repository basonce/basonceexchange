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

  const refresh = useCallback(async (uid: string) => {
    await Promise.all([loadUserBalance(uid), loadPositions(uid), loadHistory(uid), loadOpenOrders(uid)]);
  }, [loadUserBalance, loadPositions, loadHistory, loadOpenOrders]);

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await getCurrentUser();
      if (!u || !active) return;
      setUserId(u.id);
      try { setRestrictions(await getUserRestrictions(u.id)); } catch {}
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

  return {
    userId, usdtBalance, positions, openOrders, history, loading, restrictions,
    placeOrder, closePosition, refresh,
  };
}

import { supabase, getCurrentUser } from './supabase';
import { EarnQuestPriceManager } from './earnquest-price';
import { isTradFiSymbol } from './tradfi-data';
import { getCachedTradFiPrice, startTradFiPriceUpdater } from './tradfi-price-service';

export interface RealtimePnL {
  currentTotalValue: number;
  startingValue: number;
  dailyPnL: number;
  dailyPnLPercentage: number;
  balances: Array<{ symbol: string; balance: number }>;
}

/**
 * PORTFOLIO VALUE FORMULA (the single source of truth):
 *
 *   Total = spot_value + futures_wallet + futures_unrealized_pnl
 *
 * Where:
 *   spot_value            = sum of (balance * price) for every row in user_balances
 *   futures_wallet        = user_balances.futures_balance for USDT row
 *                           (this is the dedicated futures account balance – cash sitting
 *                            in the futures wallet that has NOT yet been used as margin)
 *   futures_unrealized_pnl = calculated live from open positions using current market price
 *                           NOTE: margin already came OUT of futures_wallet when the position
 *                           was opened, so we do NOT add margin again here – we only add PnL
 *
 * Today's PnL = current_total – snapshot_total_at_start_of_day
 *
 * The snapshot is created ONCE per day (on the first page load after midnight) and
 * captures the same formula above so the baseline is apples-to-apples.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const PROXY_INDIVIDUAL = `${SUPABASE_URL}/functions/v1/binance-proxy`;

class RealtimePnLService {
  private static instance: RealtimePnLService;

  private subscribers: Array<(pnl: RealtimePnL) => void> = [];
  private intervalId: number | null = null;

  private state: RealtimePnL = {
    currentTotalValue: 0,
    startingValue: 0,
    dailyPnL: 0,
    dailyPnLPercentage: 0,
    balances: []
  };

  private eqPriceManager = EarnQuestPriceManager.getInstance();
  // Last known good prices – prevents wild jumps on cache miss
  private priceCache: Record<string, number> = {};

  private constructor() {
    startTradFiPriceUpdater();
    // Initial calculation after a short delay to allow page to settle
    setTimeout(() => this.recalculate(), 2000);
    this.intervalId = window.setInterval(() => this.recalculate(), 15_000);
    this.eqPriceManager.subscribe(() => this.recalculate());
  }

  static getInstance(): RealtimePnLService {
    if (!RealtimePnLService.instance) {
      RealtimePnLService.instance = new RealtimePnLService();
    }
    return RealtimePnLService.instance;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  getPnL(): RealtimePnL {
    return this.state;
  }

  subscribe(cb: (pnl: RealtimePnL) => void): () => void {
    this.subscribers.push(cb);
    cb(this.state);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== cb);
    };
  }

  async refresh(): Promise<void> {
    await this.recalculate();
  }

  destroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ─── CRYPTO PRICE FETCH (same method as AssetsPage) ────────────────────────

  private async fetchCryptoPrice(symbol: string): Promise<number> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `${PROXY_INDIVIDUAL}?symbol=${symbol}USDT`,
        {
          headers: { 'Authorization': `Bearer ${ANON_KEY}` },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
      if (!response.ok) return this.priceCache[symbol] || 0;
      const data = await response.json();
      const price = parseFloat(data.price || data.lastPrice || '0');
      if (price > 0) {
        this.priceCache[symbol] = price;
        return price;
      }
      return this.priceCache[symbol] || 0;
    } catch {
      return this.priceCache[symbol] || 0;
    }
  }

  // ─── PRICE HELPER ──────────────────────────────────────────────────────────

  private getSyncPrice(symbol: string): number {
    if (symbol === 'USDT') return 1;

    if (symbol === 'EQ' || symbol === 'EQL') {
      const p = this.eqPriceManager.getPrice();
      if (p > 0) this.priceCache[symbol] = p;
      return p > 0 ? p : (this.priceCache[symbol] || 0);
    }

    if (isTradFiSymbol(symbol)) {
      const tradfi = getCachedTradFiPrice(symbol);
      const p = tradfi?.price || 0;
      if (p > 0) this.priceCache[symbol] = p;
      return p > 0 ? p : (this.priceCache[symbol] || 0);
    }

    // Return last known good price for crypto (will be refreshed async)
    return this.priceCache[symbol] || 0;
  }

  // ─── PORTFOLIO VALUE (THE SINGLE FORMULA) ──────────────────────────────────

  private async computeCurrentPortfolio(): Promise<{
    total: number;
    spotBalances: Array<{ symbol: string; balance: number }>;
    futuresWallet: number;
    futuresUnrealizedPnL: number;
  }> {
    const user = await getCurrentUser();
    if (!user) return { total: 0, spotBalances: [], futuresWallet: 0, futuresUnrealizedPnL: 0 };

    // ── 1. Spot balances (balance column only – NOT futures_balance) ──
    const { data: balanceRows } = await supabase
      .from('user_balances')
      .select('symbol, balance, futures_balance')
      .eq('user_id', user.id);

    const rows = balanceRows || [];

    const spotBalances: Array<{ symbol: string; balance: number }> = rows.map(r => ({
      symbol: r.symbol,
      balance: parseFloat(r.balance) || 0
    }));

    // futures_wallet = the USDT balance that sits in the futures account
    const usdtRow = rows.find(r => r.symbol === 'USDT');
    const futuresWallet = parseFloat(usdtRow?.futures_balance || '0') || 0;

    // ── 2. Refresh crypto prices for symbols with non-zero balance ──
    const cryptoSymbolsNeeded = spotBalances
      .filter(b => b.balance > 0 && b.symbol !== 'USDT' && b.symbol !== 'EQ' && b.symbol !== 'EQL' && !isTradFiSymbol(b.symbol))
      .map(b => b.symbol);

    if (cryptoSymbolsNeeded.length > 0) {
      await Promise.allSettled(
        cryptoSymbolsNeeded.map(sym => this.fetchCryptoPrice(sym))
      );
    }

    // ── 3. Spot value ──
    const spotValues = spotBalances.map(b => b.balance * this.getSyncPrice(b.symbol));
    const spotTotal = spotValues.reduce((a, b) => a + b, 0);

    // ── 4. Futures unrealized PnL from open positions ──
    const { data: positions } = await supabase
      .from('futures_positions')
      .select('symbol, side, entry_price, position_size, leverage')
      .eq('user_id', user.id)
      .eq('status', 'open');

    let futuresUnrealizedPnL = 0;
    for (const pos of (positions || [])) {
      const coinSymbol = pos.symbol.replace(/usdt$/i, '');
      const currentPrice = this.getSyncPrice(coinSymbol);
      const entryPrice = parseFloat(pos.entry_price) || 0;
      const positionSize = parseFloat(pos.position_size) || 0;

      if (entryPrice <= 0 || positionSize <= 0) continue;

      const quantity = positionSize / entryPrice;

      let pnl = 0;
      if (pos.side === 'LONG') {
        pnl = (currentPrice - entryPrice) * quantity;
      } else {
        pnl = (entryPrice - currentPrice) * quantity;
      }

      futuresUnrealizedPnL += pnl;
    }

    // ── 5. Total ──
    const total = spotTotal + futuresWallet + futuresUnrealizedPnL;

    return { total, spotBalances, futuresWallet, futuresUnrealizedPnL };
  }

  // ─── SNAPSHOT (start-of-day baseline) ─────────────────────────────────────

  private async getOrCreateTodaySnapshot(currentTotal: number): Promise<number> {
    const user = await getCurrentUser();
    if (!user) return currentTotal;

    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('daily_portfolio_snapshots')
      .select('total_value_usdt')
      .eq('user_id', user.id)
      .eq('snapshot_date', today)
      .maybeSingle();

    if (existing) {
      const v = parseFloat(existing.total_value_usdt);
      if (v > 0) return v;
    }

    await supabase
      .from('daily_portfolio_snapshots')
      .upsert({
        user_id: user.id,
        snapshot_date: today,
        total_value_usdt: currentTotal,
        balances: { __formula_v2__: true }
      }, { onConflict: 'user_id,snapshot_date' });

    return currentTotal;
  }

  // ─── MAIN RECALCULATE ─────────────────────────────────────────────────────

  private async recalculate(): Promise<void> {
    try {
      const { total, spotBalances } = await this.computeCurrentPortfolio();

      // If total is 0 and we already have a known good state, keep it
      if (total <= 0) {
        if (this.state.currentTotalValue > 0) return;
        this.publish({ ...this.state, currentTotalValue: 0, dailyPnL: 0, dailyPnLPercentage: 0 });
        return;
      }

      const startingValue = await this.getOrCreateTodaySnapshot(total);

      const dailyPnL = total - startingValue;
      const dailyPnLPercentage = startingValue > 0
        ? Math.max(-100, Math.min(100_000, (dailyPnL / startingValue) * 100))
        : 0;

      this.publish({
        currentTotalValue: total,
        startingValue,
        dailyPnL,
        dailyPnLPercentage,
        balances: spotBalances
      });
    } catch (err) {
      console.error('[RealtimePnLService] recalculate error:', err);
    }
  }

  private publish(pnl: RealtimePnL): void {
    this.state = pnl;
    this.subscribers.forEach(cb => cb(pnl));
  }
}

export { RealtimePnLService };

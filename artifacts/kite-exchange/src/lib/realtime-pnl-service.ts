import { supabase, getCurrentUser } from './supabase';
import { TradingService } from './trading-service';
import { EarnQuestPriceManager } from './earnquest-price';

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

  private constructor() {
    this.recalculate();
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

  // ─── PRICE HELPER ──────────────────────────────────────────────────────────

  private async getPrice(symbol: string): Promise<number> {
    if (symbol === 'USDT') return 1;
    if (symbol === 'EQ' || symbol === 'EQL') return this.eqPriceManager.getPrice();
    try {
      return await Promise.race([
        TradingService.getCurrentPrice(symbol),
        new Promise<number>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5_000))
      ]) || 0;
    } catch {
      return 0;
    }
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
    // (cash not yet committed as margin)
    const usdtRow = rows.find(r => r.symbol === 'USDT');
    const futuresWallet = parseFloat(usdtRow?.futures_balance || '0') || 0;

    // ── 2. Spot value ──
    const spotValues = await Promise.all(
      spotBalances.map(async b => {
        const price = await this.getPrice(b.symbol);
        return b.balance * price;
      })
    );
    const spotTotal = spotValues.reduce((a, b) => a + b, 0);

    // ── 3. Futures unrealized PnL from open positions ──
    //
    // margin was ALREADY deducted from futures_wallet when position opened.
    // So we only add the profit/loss delta – NOT the margin itself.
    const { data: positions } = await supabase
      .from('futures_positions')
      .select('symbol, side, entry_price, position_size, leverage')
      .eq('user_id', user.id)
      .eq('status', 'open');

    let futuresUnrealizedPnL = 0;
    for (const pos of (positions || [])) {
      const coinSymbol = pos.symbol.replace(/usdt$/i, '');
      const currentPrice = await this.getPrice(coinSymbol);
      const entryPrice = parseFloat(pos.entry_price) || 0;
      const positionSize = parseFloat(pos.position_size) || 0;
      const leverage = parseFloat(pos.leverage) || 1;

      if (entryPrice <= 0 || positionSize <= 0) continue;

      // position_size is the NOTIONAL value in USDT
      const quantity = positionSize / entryPrice;

      let pnl = 0;
      if (pos.side === 'LONG') {
        pnl = (currentPrice - entryPrice) * quantity;
      } else {
        pnl = (entryPrice - currentPrice) * quantity;
      }

      futuresUnrealizedPnL += pnl;
    }

    // ── 4. Total ──
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
      // Guard: if snapshot is 0 or wildly wrong (e.g. > 10x current) treat it as
      // if it doesn't exist yet so we don't show a crazy PnL.
      if (v > 0 && v < currentTotal * 10) return v;
    }

    // Create a fresh snapshot using the current portfolio value.
    // If the snapshot already exists (race condition / broken value) we upsert.
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

      // If total is 0 the user is not logged in or all prices timed out – skip
      if (total <= 0) {
        this.publish({ ...this.state, currentTotalValue: 0, dailyPnL: 0, dailyPnLPercentage: 0 });
        return;
      }

      const startingValue = await this.getOrCreateTodaySnapshot(total);

      const dailyPnL = total - startingValue;

      // Hard-clamp percentage to prevent insane display values
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

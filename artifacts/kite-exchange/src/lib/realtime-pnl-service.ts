import { supabase, getCurrentUser } from './supabase';
import { EarnQuestPriceManager } from './earnquest-price';
import { isTradFiSymbol } from './tradfi-data';
import { getCachedTradFiPrice, startTradFiPriceUpdater } from './tradfi-price-service';
import { getCachedCryptoPrice, startCryptoPriceUpdater } from './crypto-price-service';

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
 *   futures_unrealized_pnl = calculated live from open positions using current market price
 *
 * Today's PnL = current_total – snapshot_total_at_start_of_day
 */

const PORTFOLIO_CACHE_KEY = 'basonce_pnl_cache_v1';

function loadCachedState(): RealtimePnL | null {
  try {
    const raw = localStorage.getItem(PORTFOLIO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; state: RealtimePnL };
    // Use cache up to 10 minutes old (so page opens instantly with last value)
    if (Date.now() - parsed.ts < 10 * 60 * 1000) return parsed.state;
  } catch {}
  return null;
}

function saveCachedState(state: RealtimePnL): void {
  try {
    localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify({ ts: Date.now(), state }));
  } catch {}
}

class RealtimePnLService {
  private static instance: RealtimePnLService;

  private subscribers: Array<(pnl: RealtimePnL) => void> = [];
  private intervalId: number | null = null;

  private state: RealtimePnL = loadCachedState() ?? {
    currentTotalValue: 0,
    startingValue: 0,
    dailyPnL: 0,
    dailyPnLPercentage: 0,
    balances: []
  };

  private eqPriceManager = EarnQuestPriceManager.getInstance();
  // Last known good prices – prevents wild jumps when cache temporarily empty
  private lastGoodPrice: Record<string, number> = {};

  private constructor() {
    startTradFiPriceUpdater();
    startCryptoPriceUpdater();
    // Wait for crypto prices before first calculation (KuCoin ~250ms, buffer to 3s)
    this.waitForPricesThenCalculate();
    this.intervalId = window.setInterval(() => this.recalculate(), 15_000);
    this.eqPriceManager.subscribe(() => this.recalculate());
  }

  private async waitForPricesThenCalculate(): Promise<void> {
    // Poll until BTC price is available (or timeout after 8s)
    const start = Date.now();
    while (Date.now() - start < 8000) {
      await new Promise(r => setTimeout(r, 300));
      if (getCachedCryptoPrice('BTC') !== null) break;
    }
    await this.recalculate();
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

  private getPrice(symbol: string): number {
    if (symbol === 'USDT') return 1;

    if (symbol === 'EQ' || symbol === 'EQL') {
      const p = this.eqPriceManager.getPrice();
      if (p > 0) this.lastGoodPrice[symbol] = p;
      return p > 0 ? p : (this.lastGoodPrice[symbol] || 0);
    }

    if (isTradFiSymbol(symbol)) {
      const tradfi = getCachedTradFiPrice(symbol);
      const p = tradfi?.price || 0;
      if (p > 0) this.lastGoodPrice[symbol] = p;
      return p > 0 ? p : (this.lastGoodPrice[symbol] || 0);
    }

    // Crypto: use KuCoin-backed service (via api-server)
    const crypto = getCachedCryptoPrice(symbol);
    const p = crypto?.price || 0;
    if (p > 0) this.lastGoodPrice[symbol] = p;
    return p > 0 ? p : (this.lastGoodPrice[symbol] || 0);
  }

  // ─── PORTFOLIO VALUE ───────────────────────────────────────────────────────

  private async computeCurrentPortfolio(): Promise<{
    total: number;
    spotBalances: Array<{ symbol: string; balance: number }>;
    futuresWallet: number;
    futuresUnrealizedPnL: number;
  }> {
    const user = await getCurrentUser();
    if (!user) return { total: 0, spotBalances: [], futuresWallet: 0, futuresUnrealizedPnL: 0 };

    const { data: balanceRows } = await supabase
      .from('user_balances')
      .select('symbol, balance, futures_balance')
      .eq('user_id', user.id);

    const rows = balanceRows || [];

    const spotBalances: Array<{ symbol: string; balance: number }> = rows.map(r => ({
      symbol: r.symbol,
      balance: parseFloat(r.balance) || 0
    }));

    const usdtRow = rows.find(r => r.symbol === 'USDT');
    const futuresWallet = parseFloat(usdtRow?.futures_balance || '0') || 0;

    // Exclude EQ/EQL from portfolio total — mined tokens must not inflate the display
    const spotValues = spotBalances
      .filter(b => b.symbol !== 'EQ' && b.symbol !== 'EQL')
      .map(b => b.balance * this.getPrice(b.symbol));
    const spotTotal = spotValues.reduce((a, b) => a + b, 0);

    const { data: positions } = await supabase
      .from('futures_positions')
      .select('symbol, side, entry_price, position_size, leverage')
      .eq('user_id', user.id)
      .eq('status', 'open');

    let futuresUnrealizedPnL = 0;
    for (const pos of (positions || [])) {
      const coinSymbol = pos.symbol.replace(/usdt$/i, '');
      const currentPrice = this.getPrice(coinSymbol);
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

      if (total <= 0) {
        // Always publish 0 — never suppress based on stale cached value
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
    // Always save — including 0 — so stale high values never resurrect after a reset
    saveCachedState(pnl);
    this.subscribers.forEach(cb => cb(pnl));
  }
}

export { RealtimePnLService };

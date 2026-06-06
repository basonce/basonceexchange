import { useState, useEffect, useRef, useCallback } from 'react';
import { getPriceDecimals } from '../../lib/format-utils';
import { isTradFiSymbol } from '../../lib/tradfi-data';
import { INDEPENDENT_PRICE_MANAGERS } from '../lib/desktop-price';

export interface BookLevel { price: number; amount: number; total: number }
export interface RecentTrade { price: number; amount: number; time: string; isBuy: boolean }

interface RawLevel { price: number; amount: number }

/**
 * Desktop order book + recent trades.
 *
 * IMPORTANT: this replicates the EXACT generation logic used by the mobile pages
 * (FuturesPage.generateOrderBook + FuturesRecentTrades) so the desktop terminal is
 * numerically consistent with mobile — same Binance depth path, same independent /
 * TradFi fallback ladder, same amount/price formulas. Values are intentionally
 * randomized per tick (as on mobile); only the generation rules are shared, since
 * each session draws its own tape. This is presentational market data only — no
 * balances or money are touched here.
 */
export function useOrderBook(symbol: string | null, currentPrice: number) {
  const [bids, setBids] = useState<BookLevel[]>([]);
  const [asks, setAsks] = useState<BookLevel[]>([]);
  const [trades, setTrades] = useState<RecentTrade[]>([]);

  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;
  const lastDepthFetchRef = useRef(0);
  const hasBookRef = useRef(false);

  // asks/bids arrive ordered [highest .. lowest]. Cumulate from the spread outward.
  const applyTotals = useCallback((rawAsks: RawLevel[], rawBids: RawLevel[]) => {
    let at = 0;
    const aOut: BookLevel[] = new Array(rawAsks.length);
    for (let i = rawAsks.length - 1; i >= 0; i--) {
      at += rawAsks[i].amount;
      aOut[i] = { price: rawAsks[i].price, amount: rawAsks[i].amount, total: at };
    }
    let bt = 0;
    const bOut: BookLevel[] = rawBids.map(lv => {
      bt += lv.amount;
      return { price: lv.price, amount: lv.amount, total: bt };
    });
    setAsks(aOut);
    setBids(bOut);
    hasBookRef.current = aOut.length > 0;
  }, []);

  const generateOrderBook = useCallback(async () => {
    const price = priceRef.current;
    if (!symbol || price <= 0) return;

    const isIndep = INDEPENDENT_PRICE_MANAGERS[symbol] !== undefined;
    const isTradFi = isTradFiSymbol(symbol);
    const skipBinance = isIndep || isTradFi; // desktop has no BDex market
    const now = Date.now();
    const sinceDepth = now - lastDepthFetchRef.current;

    if (!skipBinance && sinceDepth >= 2000) {
      try {
        lastDepthFetchRef.current = now;
        const { fetchBinanceDepth } = await import('../../lib/binance');
        const depth = await fetchBinanceDepth(symbol, 20);
        if (depth && depth.asks.length > 0 && depth.bids.length > 0) {
          // Binance asks ASC (lowest first). Take 9 nearest, reverse → highest on top.
          const sortedAsksAsc = [...depth.asks].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
          const nearestAsks = sortedAsksAsc.slice(0, 9);
          const newAsks: RawLevel[] = nearestAsks.reverse().map(([p, a], idx) => {
            const wave = 0.4 + 0.6 * Math.abs(Math.sin((idx / 9) * Math.PI * (1.2 + Math.random() * 0.8)));
            return { price: parseFloat(p), amount: parseFloat(a) * (0.03 + Math.random() * 0.07) * wave };
          });
          // Binance bids DESC (highest first). First 9 already correct order.
          const sortedBidsDesc = [...depth.bids].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
          const newBids: RawLevel[] = sortedBidsDesc.slice(0, 9).map(([p, a], idx) => {
            const spike = Math.random() < 0.18 ? (4 + Math.random() * 8) : 1;
            const wave = 0.6 + 0.4 * Math.abs(Math.sin((idx / 9) * Math.PI * (1.2 + Math.random() * 0.8)));
            return { price: parseFloat(p), amount: parseFloat(a) * (8 + Math.pow(Math.random(), 0.4) * 16) * wave * spike };
          });
          applyTotals(newAsks, newBids);
          return;
        }
      } catch {}
    } else if (!skipBinance && sinceDepth < 2000 && hasBookRef.current) {
      return; // between depth fetches, keep the current book
    }

    // Synthetic ladder (independent / TradFi coins, or Binance depth unavailable).
    const decimals = getPriceDecimals(price);
    const tickSize = Math.pow(10, -decimals);
    const pp = Math.max(price, 0.0001);
    const askBase = (800 + Math.random() * 4_200) / pp;
    const bidBase = (2_000_000 + Math.random() * 8_000_000) / pp;

    const organicQty = (base: number, idx: number): number => {
      const spike = Math.random() < 0.12 ? (2.2 + Math.random() * 3.5) : 1;
      const wave = 0.45 + 0.55 * Math.abs(Math.sin((idx / 9) * Math.PI * (1.3 + Math.random() * 0.7)));
      return base * (0.25 + Math.pow(Math.random(), 0.55) * 1.7) * wave * spike;
    };

    const newAsks: RawLevel[] = [];
    const newBids: RawLevel[] = [];
    for (let i = 8; i >= 0; i--) {
      const askPrice = parseFloat((price + tickSize * (i + 1)).toFixed(decimals));
      newAsks.push({ price: askPrice, amount: organicQty(askBase, 8 - i) });
    }
    for (let i = 0; i < 9; i++) {
      const bidPrice = parseFloat((price - tickSize * (i + 1)).toFixed(decimals));
      newBids.push({ price: bidPrice, amount: organicQty(bidBase, i) });
    }
    applyTotals(newAsks, newBids);
  }, [symbol, applyTotals]);

  useEffect(() => {
    hasBookRef.current = false;
    lastDepthFetchRef.current = 0;
    setAsks([]);
    setBids([]);
    generateOrderBook();
    const id = window.setInterval(generateOrderBook, 2500);
    return () => clearInterval(id);
  }, [generateOrderBook]);

  // Recent trades — replicates mobile FuturesRecentTrades exactly.
  useEffect(() => {
    const makeTrade = (ageMs: number): RecentTrade => {
      const p = Math.max(priceRef.current, 0.0001);
      const isBuy = Math.random() > 0.12;
      const buyAmt = (80_000 + Math.random() * 920_000) / p;
      const sellAmt = (200 + Math.random() * 1_800) / p;
      const priceVariation = ageMs === 0 ? (Math.random() - 0.5) * 0.0005 : (0.9995 + Math.random() * 0.001) - 1;
      return {
        price: priceRef.current * (1 + priceVariation),
        amount: isBuy ? buyAmt : sellAmt,
        time: new Date(Date.now() - ageMs).toLocaleTimeString(),
        isBuy,
      };
    };

    if (priceRef.current > 0) {
      const initial: RecentTrade[] = [];
      for (let i = 0; i < 30; i++) initial.push(makeTrade(i * 1000));
      setTrades(initial);
    }

    const id = window.setInterval(() => {
      if (priceRef.current > 0) {
        setTrades(prev => [makeTrade(0), ...prev].slice(0, 50));
      }
    }, 3000);
    return () => clearInterval(id);
  }, [symbol]);

  return { bids, asks, trades };
}

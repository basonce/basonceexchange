import { useState, useEffect, useRef } from 'react';
import { fetchBinanceDepth } from '../../lib/binance';

export interface BookLevel { price: number; amount: number; total: number }
export interface RecentTrade { price: number; amount: number; time: string; isBuy: boolean }

function buildSynthetic(price: number): { bids: BookLevel[]; asks: BookLevel[] } {
  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];
  if (!price || price <= 0) return { bids, asks };
  const tick = price * 0.0002;
  let bTot = 0;
  let aTot = 0;
  for (let i = 0; i < 14; i++) {
    const amt = +(Math.random() * 4 + 0.05).toFixed(3);
    aTot += amt;
    asks.push({ price: price + tick * (i + 1), amount: amt, total: aTot });
    const amt2 = +(Math.random() * 4 + 0.05).toFixed(3);
    bTot += amt2;
    bids.push({ price: price - tick * (i + 1), amount: amt2, total: bTot });
  }
  return { bids, asks };
}

/**
 * Order book + recent trades for the desktop terminal. Uses real Binance depth
 * when a binanceSymbol exists; otherwise a synthetic book around the live price.
 * This is presentational market data only — no balances or money are touched here.
 */
export function useOrderBook(binanceSymbol: string | null, currentPrice: number) {
  const [bids, setBids] = useState<BookLevel[]>([]);
  const [asks, setAsks] = useState<BookLevel[]>([]);
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (binanceSymbol) {
        try {
          const depth = await fetchBinanceDepth(binanceSymbol, 20);
          if (depth && active) {
            let bTot = 0;
            const b: BookLevel[] = (depth.bids || []).slice(0, 14).map((lv: any) => {
              const price = parseFloat(lv[0]);
              const amount = parseFloat(lv[1]);
              bTot += amount;
              return { price, amount, total: bTot };
            });
            let aTot = 0;
            const a: BookLevel[] = (depth.asks || []).slice(0, 14).map((lv: any) => {
              const price = parseFloat(lv[0]);
              const amount = parseFloat(lv[1]);
              aTot += amount;
              return { price, amount, total: aTot };
            });
            setBids(b);
            setAsks(a.reverse());
            return;
          }
        } catch {}
      }
      const syn = buildSynthetic(priceRef.current);
      if (active) {
        setBids(syn.bids);
        setAsks([...syn.asks].reverse());
      }
    };
    load();
    const id = window.setInterval(load, 2500);
    return () => { active = false; clearInterval(id); };
  }, [binanceSymbol]);

  // Recent trades: synthesize a rolling tape around the current price.
  useEffect(() => {
    let active = true;
    const tick = () => {
      const p = priceRef.current;
      if (!p || p <= 0) return;
      const isBuy = Math.random() > 0.5;
      const jitter = p * (Math.random() - 0.5) * 0.0008;
      const t: RecentTrade = {
        price: p + jitter,
        amount: +(Math.random() * 2 + 0.001).toFixed(4),
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        isBuy,
      };
      if (active) setTrades(prev => [t, ...prev].slice(0, 30));
    };
    const id = window.setInterval(tick, 1200);
    return () => { active = false; clearInterval(id); };
  }, []);

  return { bids, asks, trades };
}

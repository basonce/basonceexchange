import { useEffect, useRef, useState } from 'react';
import { fetchCoinGeckoPrices } from './coingecko-price';

export interface LiveTick {
  price: number;
  prevPrice: number;
  dir: 1 | -1 | 0;
  change24h: number;
  history: number[];
}

export type LivePriceMap = Map<string, LiveTick>;

const ANCHOR_INTERVAL = 8000; // pull fresh real prices from CoinGecko
const TICK_INTERVAL = 1200; // visible random-walk tick between real fetches
const MAX_HISTORY = 48;

/**
 * Continuous live price feed for the AI bot dashboard.
 * Anchors to real CoinGecko prices every ~8s, then random-walks (mean-reverting,
 * clamped to ±0.4% of the real anchor) every ~1.2s so the UI never sits still.
 * Display-only: never used to trigger real money trades.
 */
function baseSymbol(sym: string): string {
  return sym.toUpperCase().replace(/(USDT|USDC|BUSD|USD)$/i, '');
}

export function useLivePrices(symbols: string[], enabled = true): LivePriceMap {
  const [prices, setPrices] = useState<LivePriceMap>(new Map());
  const anchorsRef = useRef<Map<string, number>>(new Map());
  const change24hRef = useRef<Map<string, number>>(new Map());
  const stateRef = useRef<LivePriceMap>(new Map());
  const symbolsKey = symbols.join(',');

  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      setPrices(new Map());
      return;
    }
    let cancelled = false;

    // fetchCoinGeckoPrices resolves base symbols (BTC) via SYMBOL_TO_COINGECKO_ID,
    // but the UI keys everything by pair symbol (BTCUSDT). Fetch by base, then
    // re-key the result back onto the original pair symbols.
    const bases = Array.from(new Set(symbols.map(baseSymbol)));

    const applyReal = async () => {
      try {
        const map = await fetchCoinGeckoPrices(bases);
        if (cancelled) return;
        symbols.forEach((sym) => {
          const p = map.get(baseSymbol(sym));
          if (!p) return;
          anchorsRef.current.set(sym, p.price);
          change24hRef.current.set(sym, p.change24h);
          if (!stateRef.current.has(sym)) {
            stateRef.current.set(sym, {
              price: p.price,
              prevPrice: p.price,
              dir: 0,
              change24h: p.change24h,
              history: [p.price],
            });
          }
        });
      } catch {
        /* keep last known anchors */
      }
    };

    const tick = () => {
      if (cancelled) return;
      const next: LivePriceMap = new Map();
      symbols.forEach((sym) => {
        const anchor = anchorsRef.current.get(sym);
        const prev = stateRef.current.get(sym);
        if (anchor == null) {
          if (prev) next.set(sym, prev);
          return;
        }
        const base = prev?.price ?? anchor;
        const noise = (Math.random() - 0.5) * 2 * anchor * 0.0006; // ±0.06%
        const pull = (anchor - base) * 0.15; // mean-revert toward real price
        let newPrice = base + noise + pull;
        const maxDev = anchor * 0.004; // clamp ±0.4% of real
        newPrice = Math.max(anchor - maxDev, Math.min(anchor + maxDev, newPrice));
        const dir: 1 | -1 | 0 = newPrice > base ? 1 : newPrice < base ? -1 : 0;
        const history = [...(prev?.history ?? [anchor]), newPrice].slice(-MAX_HISTORY);
        next.set(sym, {
          price: newPrice,
          prevPrice: base,
          dir,
          change24h: change24hRef.current.get(sym) ?? prev?.change24h ?? 0,
          history,
        });
      });
      stateRef.current = next;
      setPrices(next);
    };

    applyReal().then(tick);
    const anchorTimer = setInterval(applyReal, ANCHOR_INTERVAL);
    const tickTimer = setInterval(tick, TICK_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(anchorTimer);
      clearInterval(tickTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, enabled]);

  return prices;
}

export function fmtLivePrice(p: number): string {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

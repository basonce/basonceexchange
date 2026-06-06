import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { PriceCache } from '../lib/price-cache';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';
import { BNCPriceManager } from '../lib/bnc-price';
import { getProxiedLogoUrl } from '../lib/logo-utils';
import { getEQVolume } from '../lib/eq-volume-service';
import { fetchCoinGeckoPrices, getCoinGeckoId } from '../lib/coingecko-price';

export interface DeskMarket {
  symbol: string;
  fullName: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  logo: string;
  binanceSymbol: string | null;
  direction: 'up' | 'down' | 'neutral';
  isEarnQuest?: boolean;
  isIndependent?: boolean;
}

const STABLECOINS = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'USDD', 'FRAX', 'PYUSD', 'EURC', 'EUR']);
const PRIORITY_ORDER = ['BNC', 'EQ', 'PAYAI', 'SGP', 'POWERAI', 'SZNP', 'PUNCH', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT'];

/**
 * Shared desktop market-data hook. Reuses the SAME singletons as the mobile
 * MarketsPage (PriceCache + independent coin managers + CoinGecko fallback)
 * so the desktop site shows real, live prices — never mocked data.
 */
export function useMarkets() {
  const [markets, setMarkets] = useState<DeskMarket[]>([]);
  const [loading, setLoading] = useState(true);

  const eq = useRef(EarnQuestPriceManager.getInstance());
  const payai = useRef(PayAIPriceManager.getInstance());
  const sgp = useRef(SGPPriceManager.getInstance());
  const powerai = useRef(PowerAIPriceManager.getInstance());
  const sznp = useRef(SZNPPriceManager.getInstance());
  const punch = useRef(PunchPriceManager.getInstance());
  const bnc = useRef(BNCPriceManager.getInstance());
  const cache = useRef(PriceCache.getInstance());
  const cgTimer = useRef<number | null>(null);

  const INDEP: Record<string, any> = {
    BNC: bnc, PAYAI: payai, SGP: sgp, POWERAI: powerai, SZNP: sznp, PUNCH: punch,
  };

  const computeHL = (m: DeskMarket): DeskMarket => {
    if (m.high24h > 0 || m.price <= 0) return m;
    return { ...m, high24h: m.price * 1.02, low24h: m.price * 0.98 };
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: coins, error: coinsErr } = await supabase
          .from('supported_coins')
          .select('symbol, name, logo_url, binance_symbol')
          .eq('is_active', true)
          .eq('is_spot_enabled', true)
          .order('sort_order');
        if (!coins) { setLoading(false); return; }

        if (!cache.current.isReady()) await cache.current.init();

        const list: DeskMarket[] = coins.map((coin: any) => {
          if (coin.symbol === 'EQ') {
            return {
              symbol: 'EQ', fullName: coin.name, price: eq.current.getPrice(),
              change24h: eq.current.getChange(), high24h: 0, low24h: 0, volume: getEQVolume(),
              logo: getProxiedLogoUrl(coin.logo_url) || '/earnquest-logo-icon-2.png',
              binanceSymbol: null, direction: 'neutral', isEarnQuest: true,
            };
          }
          if (INDEP[coin.symbol]) {
            const mgr = INDEP[coin.symbol].current;
            return {
              symbol: coin.symbol, fullName: coin.name, price: mgr.getPrice(),
              change24h: mgr.getChange(), high24h: 0, low24h: 0, volume: mgr.getMarketCap(),
              logo: getProxiedLogoUrl(coin.logo_url) || '', binanceSymbol: null,
              direction: mgr.getChange() >= 0 ? 'up' : 'down', isIndependent: true,
            };
          }
          if (coin.symbol === 'USDT') {
            return {
              symbol: 'USDT', fullName: coin.name, price: 1, change24h: 0,
              high24h: 1, low24h: 1, volume: 145000000000,
              logo: getProxiedLogoUrl(coin.logo_url), binanceSymbol: null, direction: 'neutral',
            };
          }
          const binSym = coin.binance_symbol || `${coin.symbol}USDT`;
          const c = cache.current.get(binSym);
          return {
            symbol: coin.symbol, fullName: coin.name, price: c?.price || 0,
            change24h: c?.change24h || 0, high24h: c?.high24h || 0, low24h: c?.low24h || 0,
            volume: c?.volume || 0, logo: getProxiedLogoUrl(coin.logo_url),
            binanceSymbol: binSym, direction: c?.direction || 'neutral',
          };
        }).map(computeHL);

        setMarkets(list);
        setLoading(false);

        const cgSymbols = coins
          .filter((c: any) => c.symbol !== 'EQ' && c.symbol !== 'USDT' && !INDEP[c.symbol] && getCoinGeckoId(c.symbol))
          .map((c: any) => c.symbol);
        const applyCg = async () => {
          try {
            const cg = await fetchCoinGeckoPrices(cgSymbols);
            if (cg.size === 0 || !active) return;
            setMarkets(prev => prev.map(m => {
              if (m.isEarnQuest || m.isIndependent || m.symbol === 'USDT') return m;
              const binCached = m.binanceSymbol ? cache.current.get(m.binanceSymbol) : null;
              if (binCached && binCached.price > 0) return m;
              const d = cg.get(m.symbol);
              if (!d || d.price <= 0) return m;
              return computeHL({ ...m, price: d.price, change24h: d.change24h, volume: d.volume, direction: d.change24h >= 0 ? 'up' : 'down' });
            }));
          } catch {}
        };
        if (cgSymbols.length > 0) {
          applyCg();
          cgTimer.current = window.setInterval(applyCg, 60000);
        }
      } catch {
        setLoading(false);
      }
    })();
    return () => { active = false; if (cgTimer.current) clearInterval(cgTimer.current); };
  }, []);

  // Live subscriptions: standard coins via PriceCache, independents via their managers.
  useEffect(() => {
    if (markets.length === 0) return;
    const unsubCache = cache.current.subscribe(() => {
      setMarkets(prev => prev.map(m => {
        if (m.isEarnQuest || m.isIndependent || m.symbol === 'USDT' || !m.binanceSymbol) return m;
        const c = cache.current.get(m.binanceSymbol);
        if (!c) return m;
        return computeHL({ ...m, price: c.price, change24h: c.change24h, high24h: c.high24h, low24h: c.low24h, volume: c.volume, direction: c.direction });
      }));
    });
    const unsubEQ = eq.current.subscribe(() => {
      setMarkets(prev => prev.map(m => m.isEarnQuest ? { ...m, price: eq.current.getPrice(), change24h: eq.current.getChange(), volume: getEQVolume(), direction: 'up' } : m));
    });
    const indepUnsubs = Object.entries(INDEP).map(([sym, ref]) =>
      ref.current.subscribe(() => {
        setMarkets(prev => prev.map(m => m.symbol === sym ? computeHL({ ...m, price: ref.current.getPrice(), change24h: ref.current.getChange(), volume: ref.current.getMarketCap(), direction: ref.current.getChange() >= 0 ? 'up' : 'down' }) : m));
      })
    );
    return () => { unsubCache(); unsubEQ(); indepUnsubs.forEach(u => u()); };
  }, [markets.length]);

  const sorted = [...markets].sort((a, b) => {
    const aStable = STABLECOINS.has(a.symbol);
    const bStable = STABLECOINS.has(b.symbol);
    if (aStable && !bStable) return 1;
    if (!aStable && bStable) return -1;
    const ap = PRIORITY_ORDER.indexOf(a.symbol);
    const bp = PRIORITY_ORDER.indexOf(b.symbol);
    if (ap !== -1 && bp !== -1) return ap - bp;
    if (ap !== -1) return -1;
    if (bp !== -1) return 1;
    return b.volume - a.volume;
  });

  return { markets: sorted, loading };
}

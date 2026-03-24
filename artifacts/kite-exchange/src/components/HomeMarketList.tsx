import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';
import { BNCPriceManager } from '../lib/bnc-price';
import { PriceCache } from '../lib/price-cache';
import { FUTURES_COINS } from '../lib/coin-logos';
import { supabase } from '../lib/supabase';
import CoinLogo from './CoinLogo';
import { getEQVolume } from '../lib/eq-volume-service';

interface MarketCoin {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  dbUrl?: string;
  name?: string;
}

interface StableCoin extends MarketCoin {
  stableChange: number;
  bandMin: number;
  bandMax: number;
  drift: number;
  driftDir: number;
}

const COLLAPSED_COUNT = 5;
const EXPANDED_COUNT = 31;
const MIN_VOLUME = 1_000_000;

const EXCLUDED_COINS = new Set([
  'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'USDD', 'FRAX', 'LUSD', 'CRVUSD', 'PYUSD',
  'PAXG', 'XAUT', 'CACHE',
  'WBTC', 'WETH', 'WBNB', 'STETH', 'WSTETH', 'RETH', 'CBETH',
]);

const MEME_COINS = new Set(['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'BOME', 'NEIRO', 'POPCAT', 'COW', 'MOODENG', 'PNUT', 'ACT', 'HMSTR', 'SLERF', 'TURBO', 'DOG', 'MYRO', 'SATS']);
const DEFI_COINS = new Set(['UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'CRV', 'SUSHI', 'YFI', 'BAL', 'LDO', 'CAKE', 'INCH', 'DYDX', 'GMX', 'PENDLE', 'JUP', 'ORCA', 'RAY', 'OSMO', 'RUNE']);
const AI_COINS = new Set(['FET', 'AGIX', 'OCEAN', 'NMR', 'GRT', 'RNDR', 'WLD', 'TAO', 'ARKM', 'AIXBT', 'PROMPT', 'ALT', 'ATH', 'MYSHELL', 'VIRTUAL', 'MASA', 'IO', 'GRASS', 'RIFAMP', 'ALPH']);

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}


function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

interface Props {
  activeFilter: 'gainers' | 'losers' | '24h-vol' | 'meme' | 'defi' | 'ai' | 'alpha';
  marketType?: 'crypto' | 'spot' | 'futures';
}

export default function HomeMarketList({ activeFilter, marketType = 'crypto' }: Props) {
  const [allCoins, setAllCoins] = useState<MarketCoin[]>([]);
  const [stableCoins, setStableCoins] = useState<StableCoin[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [tick, setTick] = useState(0);
  const [dbLogosLoaded, setDbLogosLoaded] = useState(false);
  const priceManager = useRef(EarnQuestPriceManager.getInstance());
  const payaiManager = useRef(PayAIPriceManager.getInstance());
  const sgpManager = useRef(SGPPriceManager.getInstance());
  const poweraiManager = useRef(PowerAIPriceManager.getInstance());
  const sznpManager = useRef(SZNPPriceManager.getInstance());
  const punchManager = useRef(PunchPriceManager.getInstance());
  const bncManager = useRef(BNCPriceManager.getInstance());
  const priceCache = useRef(PriceCache.getInstance());

  const INDEPENDENT_MANAGERS = useRef([
    { symbol: 'BNC', name: 'Basonce', mgr: bncManager },
    { symbol: 'PAYAI', name: 'PayAI', mgr: payaiManager },
    { symbol: 'SGP', name: 'SGP Token', mgr: sgpManager },
    { symbol: 'POWERAI', name: 'PowerAI', mgr: poweraiManager },
    { symbol: 'SZNP', name: 'SZNP Token', mgr: sznpManager },
    { symbol: 'PUNCH', name: 'Punch Token', mgr: punchManager },
  ]);
  const dbLogosRef = useRef<Record<string, string>>({});
  const dbNamesRef = useRef<Record<string, string>>({});
  const coinSymbolsRef = useRef<{ symbol: string; binanceSymbol: string; name: string }[]>([]);
  const stableCoinsRef = useRef<StableCoin[]>([]);
  const driftTimerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const { data } = await supabase
          .from('supported_coins')
          .select('symbol, binance_symbol, logo_url, name')
          .eq('is_active', true);

        if (data) {
          const logoMap: Record<string, string> = {};
          const nameMap: Record<string, string> = {};
          const symbols: { symbol: string; binanceSymbol: string; name: string }[] = [];

          for (const c of data) {
            if (c.symbol && c.logo_url) logoMap[c.symbol] = c.logo_url;
            if (c.symbol && c.name) nameMap[c.symbol] = c.name;
            if (c.symbol && c.binance_symbol) {
              symbols.push({ symbol: c.symbol, binanceSymbol: c.binance_symbol, name: c.name || c.symbol });
            }
          }

          logoMap['EQ'] = '/earnquest-logo-icon-2.png';
          logoMap['BNC'] = '/bnc-logo.png';
          dbLogosRef.current = logoMap;
          dbNamesRef.current = nameMap;
          coinSymbolsRef.current = symbols;
          setDbLogosLoaded(true);

          if (!priceCache.current.isReady()) {
            priceCache.current.init();
          }
        }
      } catch { }
    };
    fetchCoins();
  }, []);

  const buildAllCoinsFromCache = useCallback(() => {
    const pc = priceCache.current;
    const dbLogos = dbLogosRef.current;
    const dbNames = dbNamesRef.current;
    const symbols = coinSymbolsRef.current;

    const INDEP_SYMBOLS_SET = new Set(INDEPENDENT_MANAGERS.current.map(m => m.symbol));

    const coins: MarketCoin[] = [];

    for (const { symbol, binanceSymbol, name } of symbols) {
      if (EXCLUDED_COINS.has(symbol)) continue;
      if (INDEP_SYMBOLS_SET.has(symbol)) continue;
      const cached = pc.get(binanceSymbol);
      if (!cached) continue;
      if (cached.volume < MIN_VOLUME) continue;

      coins.push({
        symbol,
        price: cached.price,
        change24h: cached.change24h,
        volume24h: cached.volume,
        dbUrl: dbLogos[symbol],
        name: dbNames[symbol] || name,
      });
    }

    const eqPrice = priceManager.current.getPrice();
    if (eqPrice > 0) {
      coins.push({
        symbol: 'EQ',
        price: eqPrice,
        change24h: priceManager.current.getChange(),
        volume24h: getEQVolume(),
        dbUrl: '/earnquest-logo-icon-2.png',
        name: 'EarnQuest',
      });
    }

    for (const { symbol, name, mgr } of INDEPENDENT_MANAGERS.current) {
      const p = mgr.current.getPrice();
      if (p > 0) {
        coins.push({
          symbol,
          price: p,
          change24h: mgr.current.getChange(),
          volume24h: mgr.current.getMarketCap(),
          dbUrl: dbLogos[symbol] || (symbol === 'BNC' ? '/bnc-logo.png' : ''),
          name: dbNamesRef.current[symbol] || name,
        });
      }
    }

    if (coins.length > 0) {
      setAllCoins(coins);
    }
  }, []);

  useEffect(() => {
    buildAllCoinsFromCache();

    const eqUnsub = priceManager.current.subscribe(() => {
      buildAllCoinsFromCache();
    });

    const independentUnsubs = INDEPENDENT_MANAGERS.current.map(({ mgr }) =>
      mgr.current.subscribe(() => { buildAllCoinsFromCache(); })
    );

    return () => {
      eqUnsub();
      independentUnsubs.forEach(u => u());
    };
  }, [buildAllCoinsFromCache]);

  useEffect(() => {
    if (!dbLogosLoaded) return;

    buildAllCoinsFromCache();

    const unsub = priceCache.current.subscribe(() => {
      buildAllCoinsFromCache();
    });

    return () => {
      unsub();
    };
  }, [dbLogosLoaded, buildAllCoinsFromCache]);

  const buildStableCoins = useCallback((coins: MarketCoin[], filter: 'gainers' | 'losers') => {
    const dbLogos = dbLogosRef.current;
    const dbNames = dbNamesRef.current;

    const INDEPENDENT_SYMBOLS = new Set(['EQ', 'BNC', 'PAYAI', 'SGP', 'POWERAI', 'SZNP', 'PUNCH']);
    let filtered = coins.filter(c => !INDEPENDENT_SYMBOLS.has(c.symbol) && !EXCLUDED_COINS.has(c.symbol) && (c.dbUrl || dbLogos[c.symbol]));

    if (filter === 'gainers') {
      filtered = filtered.filter(c => c.change24h > 0);
      filtered.sort((a, b) => b.change24h - a.change24h);
    } else {
      filtered = filtered.filter(c => c.change24h < 0);
      filtered.sort((a, b) => a.change24h - b.change24h);
    }

    const topCoins = filtered.slice(0, EXPANDED_COUNT);
    const result: StableCoin[] = [];

    for (let i = 0; i < topCoins.length; i++) {
      const coin = topCoins[i];
      const seed = coin.symbol.charCodeAt(0) + coin.symbol.charCodeAt(1 % coin.symbol.length) + i * 37;
      const spread = 0.3 + seededRandom(seed) * 0.4;
      const initPos = coin.change24h + (seededRandom(seed + 10) - 0.5) * spread * 0.5;
      const displayChangePct = Math.round(initPos * 100) / 100;
      const bandMin = coin.change24h - spread;
      const bandMax = coin.change24h + spread;

      result.push({
        ...coin,
        dbUrl: dbLogos[coin.symbol] || coin.dbUrl,
        name: dbNames[coin.symbol] || coin.name || coin.symbol,
        stableChange: displayChangePct,
        bandMin,
        bandMax,
        drift: 0,
        driftDir: seededRandom(seed + 50) > 0.5 ? 1 : -1,
      });
    }

    const eqPrice = priceManager.current.getPrice();
    if (eqPrice > 0) {
      const eqChange = priceManager.current.getChange();
      if ((filter === 'gainers' && eqChange > 0) || (filter === 'losers' && eqChange < 0)) {
        result.push({
          symbol: 'EQ',
          price: eqPrice,
          change24h: eqChange,
          volume24h: getEQVolume(),
          dbUrl: '/earnquest-logo-icon-2.png',
          name: 'EarnQuest',
          stableChange: eqChange,
          bandMin: eqChange - 0.3,
          bandMax: eqChange + 0.3,
          drift: 0,
          driftDir: 1,
        });
      }
    }

    for (const { symbol, name, mgr } of INDEPENDENT_MANAGERS.current) {
      const p = mgr.current.getPrice();
      if (p > 0) {
        const ch = mgr.current.getChange();
        if ((filter === 'gainers' && ch > 0) || (filter === 'losers' && ch < 0)) {
          result.push({
            symbol,
            price: p,
            change24h: ch,
            volume24h: mgr.current.getMarketCap(),
            dbUrl: dbLogosRef.current[symbol] || '',
            name: dbNamesRef.current[symbol] || name,
            stableChange: ch,
            bandMin: ch - 0.3,
            bandMax: ch + 0.3,
            drift: 0,
            driftDir: ch >= 0 ? 1 : -1,
          });
        }
      }
    }

    if (filter === 'gainers') {
      result.sort((a, b) => b.change24h - a.change24h);
    } else {
      result.sort((a, b) => a.change24h - b.change24h);
    }

    return result;
  }, []);

  useEffect(() => {
    if (activeFilter !== 'gainers' && activeFilter !== 'losers' && activeFilter !== 'meme' && activeFilter !== 'defi' && activeFilter !== 'ai') return;
    if (allCoins.length === 0) return;

    let coinsForBuild = allCoins;
    if (activeFilter === 'meme') coinsForBuild = allCoins.filter(c => MEME_COINS.has(c.symbol));
    else if (activeFilter === 'defi') coinsForBuild = allCoins.filter(c => DEFI_COINS.has(c.symbol));
    else if (activeFilter === 'ai') coinsForBuild = allCoins.filter(c => AI_COINS.has(c.symbol));

    const buildFilter = (activeFilter === 'losers') ? 'losers' : 'gainers';
    const built = buildStableCoins(coinsForBuild, buildFilter);
    setStableCoins(built);
    stableCoinsRef.current = built;
  }, [allCoins, activeFilter, buildStableCoins, dbLogosLoaded]);

  useEffect(() => {
    if (activeFilter !== 'gainers' && activeFilter !== 'losers' && activeFilter !== 'meme' && activeFilter !== 'defi' && activeFilter !== 'ai') return;

    if (driftTimerRef.current) clearInterval(driftTimerRef.current);

    driftTimerRef.current = setInterval(() => {
      setStableCoins(prev => {
        const updated = prev.map((coin, idx) => {
          if (coin.symbol === 'EQ' || coin.symbol === 'BNC' || coin.symbol === 'PAYAI' || coin.symbol === 'SGP' || coin.symbol === 'POWERAI' || coin.symbol === 'SZNP' || coin.symbol === 'PUNCH') return coin;
          const speed = 0.03 + seededRandom(idx * 7 + Date.now() % 100) * 0.05;
          let newChange = coin.stableChange + coin.driftDir * speed;
          let newDir = coin.driftDir;

          const margin = (coin.bandMax - coin.bandMin) * 0.08;
          if (newChange >= coin.bandMax - margin) {
            newDir = -1;
            newChange = coin.bandMax - margin - seededRandom(idx + 1) * 0.1;
          } else if (newChange <= coin.bandMin + margin) {
            newDir = 1;
            newChange = coin.bandMin + margin + seededRandom(idx + 2) * 0.1;
          }

          if (seededRandom(idx + Date.now() % 1000) < 0.03) {
            newDir = newDir * -1;
          }

          const roundedChange = Math.round(newChange * 100) / 100;
          const basePrice = coin.price / (1 + coin.stableChange / 100);
          const newPrice = basePrice * (1 + roundedChange / 100);

          return { ...coin, stableChange: roundedChange, price: newPrice > 0 ? newPrice : coin.price, driftDir: newDir };
        });
        stableCoinsRef.current = updated;
        return updated;
      });
      setTick(t => t + 1);
    }, 5000);

    return () => { if (driftTimerRef.current) clearInterval(driftTimerRef.current); };
  }, [activeFilter]);

  useEffect(() => {
    setExpanded(false);
  }, [activeFilter, marketType]);

  const isStableFilter = activeFilter === 'gainers' || activeFilter === 'losers' || activeFilter === 'meme' || activeFilter === 'defi' || activeFilter === 'ai';
  const isVolumeFilter = activeFilter === '24h-vol';

  const displayCoins = (() => {
    const INDEP_SET = new Set(['EQ', 'BNC', 'PAYAI', 'SGP', 'POWERAI', 'SZNP', 'PUNCH']);
    if (isStableFilter) {
      let coins = [...stableCoins];
      if (marketType === 'futures') {
        coins = coins.filter(c => INDEP_SET.has(c.symbol) || FUTURES_COINS.has(c.symbol));
      }
      const limit = expanded ? EXPANDED_COUNT : COLLAPSED_COUNT;
      return coins.slice(0, limit);
    }

    if (allCoins.length === 0) return [];
    let filtered = [...allCoins];
    if (marketType === 'futures') {
      filtered = filtered.filter(c => INDEP_SET.has(c.symbol) || FUTURES_COINS.has(c.symbol));
    }

    if (isVolumeFilter) {
      const HML_STABLECOINS = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'USDD', 'FRAX', 'PYUSD', 'EURC']);
      filtered = filtered.filter(c => !HML_STABLECOINS.has(c.symbol));
      filtered.sort((a, b) => b.volume24h - a.volume24h);
      const limit = expanded ? EXPANDED_COUNT : COLLAPSED_COUNT;
      const dbLogos = dbLogosRef.current;
      return filtered.slice(0, limit).map(c => ({ ...c, dbUrl: c.dbUrl || dbLogos[c.symbol], stableChange: c.change24h, bandMin: 0, bandMax: 0, drift: 0, driftDir: 1 })) as StableCoin[];
    }

    const HML_STABLECOINS = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'USDD', 'FRAX', 'PYUSD', 'EURC']);
    const HML_PRIORITY = ['BNC', 'EQ', 'PAYAI', 'SGP', 'POWERAI', 'SZNP', 'PUNCH', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT'];
    filtered.sort((a, b) => {
      const aStable = HML_STABLECOINS.has(a.symbol);
      const bStable = HML_STABLECOINS.has(b.symbol);
      if (aStable && !bStable) return 1;
      if (!aStable && bStable) return -1;
      if (aStable && bStable) return a.symbol.localeCompare(b.symbol);
      const aPri = HML_PRIORITY.indexOf(a.symbol);
      const bPri = HML_PRIORITY.indexOf(b.symbol);
      if (aPri !== -1 && bPri !== -1) return aPri - bPri;
      if (aPri !== -1) return -1;
      if (bPri !== -1) return 1;
      return b.volume24h - a.volume24h;
    });
    const limit = expanded ? EXPANDED_COUNT : COLLAPSED_COUNT;
    const dbLogos = dbLogosRef.current;
    return filtered.slice(0, limit).map(c => ({ ...c, dbUrl: c.dbUrl || dbLogos[c.symbol], stableChange: c.change24h, bandMin: 0, bandMax: 0, drift: 0, driftDir: 1 })) as StableCoin[];
  })();

  const totalAvailable = (() => {
    if (isStableFilter) {
      let coins = [...stableCoins];
      if (marketType === 'futures') coins = coins.filter(c => c.symbol === 'EQ' || c.symbol === 'BNC' || FUTURES_COINS.has(c.symbol));
      return Math.min(coins.length, EXPANDED_COUNT);
    }
    if (allCoins.length === 0) return 0;
    let filtered = allCoins;
    if (isVolumeFilter) {
      const HML_STABLECOINS = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'USDP', 'USDD', 'FRAX', 'PYUSD', 'EURC']);
      filtered = filtered.filter(c => !HML_STABLECOINS.has(c.symbol));
    }
    if (marketType === 'futures') filtered = filtered.filter(c => FUTURES_COINS.has(c.symbol));
    return Math.min(filtered.length, EXPANDED_COUNT);
  })();

  if (displayCoins.length === 0) {
    return (
      <div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-2.5 border-b border-[#2B3139] animate-pulse">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-[#2B3139] mr-3 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-14 bg-[#2B3139] rounded mb-1.5" />
                <div className="h-3 w-20 bg-[#2B3139]/50 rounded" />
              </div>
              <div className="h-5 w-24 bg-[#2B3139] rounded mr-2.5" />
              <div className="h-8 w-[80px] bg-[#2B3139] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center text-[#848E9C] text-[10px] font-semibold mt-3 mb-1 px-4 uppercase tracking-wider">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 flex-shrink-0" />
          <div>Name</div>
        </div>
        <div className="w-28 text-right pr-0 mr-2.5">Last Price</div>
        <div className="w-[80px] text-center">24h Chg%</div>
      </div>

      {displayCoins.map((coin, coinIdx) => {
        const displayChange = isStableFilter ? (coin as StableCoin).stableChange : coin.change24h;
        const isUp = displayChange >= 0;
        const INDEP = new Set(['EQ', 'BNC', 'PAYAI', 'SGP', 'POWERAI', 'SZNP', 'PUNCH']);
        const isIndep = INDEP.has(coin.symbol);

        return (
          <div
            key={`${coin.symbol}-${tick}`}
            className="relative px-3 py-2.5 cursor-pointer overflow-hidden transition-all duration-200 active:scale-[0.99]"
            onClick={() => {
              localStorage.setItem('currentTab', 'trade');
              localStorage.setItem('selectedCoinSymbol', coin.symbol);
              localStorage.setItem('selectedCoinSide', 'buy');
              window.dispatchEvent(new CustomEvent('navigate-to-trade', {
                detail: { symbol: coin.symbol, side: 'buy' }
              }));
            }}
          >
            <div className={`flex items-center rounded-2xl px-3 py-2.5 border transition-all duration-200 hover:brightness-110 ${
              isIndep
                ? 'bg-gradient-to-r from-[#1a1200] to-[#0f0c00] border-yellow-500/30 shadow-sm shadow-yellow-500/10'
                : isUp
                  ? 'bg-gradient-to-r from-[#0a1f14] to-[#0d1a10] border-[#0ECB81]/20 shadow-sm shadow-[#0ECB81]/5'
                  : 'bg-gradient-to-r from-[#1f0a0e] to-[#1a0a0d] border-[#F6465D]/20 shadow-sm shadow-[#F6465D]/5'
            }`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center ring-2 ${
                  isIndep ? 'ring-yellow-500/40' : isUp ? 'ring-[#0ECB81]/20' : 'ring-[#F6465D]/20'
                }`}>
                  <CoinLogo symbol={coin.symbol} dbUrl={coin.dbUrl} eager={coinIdx < 8} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 leading-tight">
                    <span className={`font-black text-[15px] ${isIndep ? 'text-yellow-300' : 'text-white'}`}>{coin.symbol}</span>
                    <span className="text-gray-600 font-semibold text-[10px]">/USDT</span>
                    {isIndep && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-[8px] font-black px-1 py-0.5 rounded tracking-wide">★ KITE</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 font-semibold mt-0.5">
                    Vol <span className={isIndep ? 'text-yellow-400/80' : 'text-gray-300'}>{formatVolume(coin.volume24h)}</span>
                  </div>
                </div>
              </div>

              <div className="text-right mr-3 flex-shrink-0">
                <div className={`font-black text-[15px] tabular-nums leading-tight ${
                  isIndep ? 'text-yellow-300' : isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}>
                  ${formatPrice(coin.price)}
                </div>
              </div>

              <div className={`min-w-[76px] py-1.5 px-2 rounded-xl text-center font-black text-[13px] flex-shrink-0 shadow-sm ${
                isIndep
                  ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-yellow-500/30'
                  : isUp
                    ? 'bg-gradient-to-br from-[#0ECB81] to-[#09a165] text-white shadow-green-500/30'
                    : 'bg-gradient-to-br from-[#F6465D] to-[#c9384a] text-white shadow-red-500/30'
              }`}>
                {isUp ? '+' : ''}{displayChange.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}

      {totalAvailable > COLLAPSED_COUNT && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 flex items-center justify-center gap-1 text-xs font-medium text-gray-500 hover:text-white transition-colors border-b border-[#2B3139]/40"
        >
          {expanded ? (
            <><span>View Less</span><ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <><span>View More</span><ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}

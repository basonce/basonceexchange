import { useState, useEffect, useCallback } from 'react';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';
import { fetchBinanceTicker } from '../lib/binance';
import { subscribeAllTradFiPrices, getAllTradFiPrices } from '../lib/tradfi-price-service';
import { TRADFI_ASSETS, CATEGORY_STYLES, type TradFiAsset } from '../lib/tradfi-data';
import MetalIcon, { isMetalSymbol } from './MetalIcon';

interface ListingCoin {
  symbol: string;
  logoUrls: string[];
  price: number;
  usdtEquiv: number;
  change24h: number;
  isIndependent: boolean;
}

const CMC_NEW: Record<string, number> = {
  ESP: 36722,
  ZAMA: 35960,
  SENT: 23187,
  RLUSD: 35533,
  FOGO: 36612,
  ZKP: 36248,
  BREV: 36890,
  KGST: 21054,
  AUCTION: 10188,
  AVA: 3816,
};

function buildLogoUrls(symbol: string, cmcId?: number): string[] {
  const urls: string[] = [];
  const lc = symbol.toLowerCase();
  if (cmcId) {
    urls.push(`https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png`);
  }
  urls.push(`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${lc}.png`);
  urls.push(`https://raw.githubusercontent.com/ErikThiart/cryptocurrency-icons/master/32/${lc}.png`);
  const colors = ['F0B90B', '0ECB81', '3861FB', 'E8831D', '00D1FF', 'FF6B35', '14b8a6'];
  const idx = (symbol.charCodeAt(0) + (symbol.charCodeAt(1) || 0)) % colors.length;
  urls.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(symbol.slice(0, 2))}&background=${colors[idx]}&color=fff&size=64&bold=true`);
  return urls;
}

const INDEPENDENT_COINS: Omit<ListingCoin, 'price' | 'usdtEquiv' | 'change24h'>[] = [
  { symbol: 'PUNCH',   logoUrls: buildLogoUrls('PUNCH',   36742), isIndependent: true },
  { symbol: 'POWERAI', logoUrls: buildLogoUrls('POWERAI', 35854), isIndependent: true },
  { symbol: 'SGP',     logoUrls: buildLogoUrls('SGP',     36108), isIndependent: true },
  { symbol: 'SZNP',    logoUrls: buildLogoUrls('SZNP',    37291), isIndependent: true },
  { symbol: 'PAYAI',   logoUrls: buildLogoUrls('PAYAI',   35505), isIndependent: true },
];

const BINANCE_NEW_COINS: Omit<ListingCoin, 'price' | 'usdtEquiv' | 'change24h' | 'isIndependent'>[] = [
  { symbol: 'ESP',     logoUrls: buildLogoUrls('ESP',     CMC_NEW.ESP) },
  { symbol: 'ZAMA',    logoUrls: buildLogoUrls('ZAMA',    CMC_NEW.ZAMA) },
  { symbol: 'SENT',    logoUrls: buildLogoUrls('SENT',    CMC_NEW.SENT) },
  { symbol: 'RLUSD',   logoUrls: buildLogoUrls('RLUSD',   CMC_NEW.RLUSD) },
  { symbol: 'FOGO',    logoUrls: buildLogoUrls('FOGO',    CMC_NEW.FOGO) },
  { symbol: 'ZKP',     logoUrls: buildLogoUrls('ZKP',     CMC_NEW.ZKP) },
  { symbol: 'BREV',    logoUrls: buildLogoUrls('BREV',    CMC_NEW.BREV) },
  { symbol: 'KGST',    logoUrls: buildLogoUrls('KGST',    CMC_NEW.KGST) },
  { symbol: 'AUCTION', logoUrls: buildLogoUrls('AUCTION', CMC_NEW.AUCTION) },
  { symbol: 'AVA',     logoUrls: buildLogoUrls('AVA',     CMC_NEW.AVA) },
];

function getIndependentPrice(symbol: string): number {
  switch (symbol) {
    case 'PUNCH':   return PunchPriceManager.getInstance().getPrice();
    case 'POWERAI': return PowerAIPriceManager.getInstance().getPrice();
    case 'SGP':     return SGPPriceManager.getInstance().getPrice();
    case 'SZNP':    return SZNPPriceManager.getInstance().getPrice();
    case 'PAYAI':   return PayAIPriceManager.getInstance().getPrice();
    default: return 0;
  }
}

function getIndependentChange(symbol: string): number {
  switch (symbol) {
    case 'PUNCH':   return PunchPriceManager.getInstance().getChange();
    case 'POWERAI': return PowerAIPriceManager.getInstance().getChange();
    case 'SGP':     return SGPPriceManager.getInstance().getChange();
    case 'SZNP':    return SZNPPriceManager.getInstance().getChange();
    case 'PAYAI':   return PayAIPriceManager.getInstance().getChange();
    default: return 0;
  }
}

function formatPrice(price: number): string {
  if (!price || price === 0) return '---';
  if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1000)  return price.toFixed(2);
  if (price >= 1)     return price.toFixed(4);
  if (price >= 0.1)   return price.toFixed(5);
  if (price >= 0.01)  return price.toFixed(5);
  if (price >= 0.001) return price.toFixed(6);
  if (price >= 0.0001) return price.toFixed(7);
  return price.toFixed(8);
}

function formatUsdtEquiv(usdt: number): string {
  if (!usdt || usdt === 0) return '';
  if (usdt >= 1000) return usdt.toFixed(2);
  if (usdt >= 1)    return usdt.toFixed(2);
  if (usdt >= 0.01) return usdt.toFixed(5);
  return usdt.toFixed(5);
}

function CoinLogoWithFallback({ logoUrls, symbol }: { logoUrls: string[]; symbol: string }) {
  const [idx, setIdx] = useState(0);

  const handleError = () => {
    if (idx < logoUrls.length - 1) {
      setIdx(i => i + 1);
    }
  };

  return (
    <img
      key={logoUrls[idx]}
      src={logoUrls[idx]}
      alt={symbol}
      className="w-full h-full object-cover"
      onError={handleError}
    />
  );
}

function TradFiLogoIcon({ asset, size = 36 }: { asset: TradFiAsset; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const metalKey = asset.displayName === 'COPPER' ? 'COPPER' : asset.displayName;

  if (isMetalSymbol(metalKey)) {
    return <MetalIcon symbol={metalKey} size={size} />;
  }

  if (asset.logoUrl?.includes('flagcdn.com')) {
    return (
      <div className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{ width: size, height: size, background: asset.bgColor ?? '#1a1a2a', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
        <img src={asset.logoUrl} alt={asset.displayName} style={{ width: '100%', height: '62%', objectFit: 'cover', borderRadius: 2 }} />
      </div>
    );
  }

  if (!asset.logoUrl || asset.logoUrl.startsWith('sprite:')) {
    const style = CATEGORY_STYLES[asset.category];
    return (
      <div className={`flex-shrink-0 rounded-full flex items-center justify-center font-extrabold ${style.bg}`}
        style={{ width: size, height: size, border: '2px solid rgba(255,255,255,0.15)', fontSize: size * 0.27, letterSpacing: '-0.5px' }}>
        <span className={style.text}>{asset.displayName.slice(0, 3)}</span>
      </div>
    );
  }

  if (!imgErr) {
    return (
      <div className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{ width: size, height: size, background: '#fff', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        <img src={asset.logoUrl} alt={asset.displayName}
          style={{ width: '90%', height: '90%', objectFit: 'contain' }}
          onError={() => setImgErr(true)} />
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 rounded-full flex items-center justify-center font-extrabold"
      style={{ width: size, height: size, background: asset.bgColor ?? '#1e2329', border: '2px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: size * 0.27, letterSpacing: '-0.5px' }}>
      {asset.displayName.slice(0, 3)}
    </div>
  );
}

type TabType = 'crypto' | 'tradfi';

interface TradFiRow {
  asset: TradFiAsset;
  price: number;
  change24h: number;
}

export default function NewListingSection() {
  const [activeTab, setActiveTab] = useState<TabType>('crypto');
  const [coins, setCoins] = useState<ListingCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradFiListings, setTradFiListings] = useState<TradFiRow[]>(() =>
    TRADFI_ASSETS.map(asset => ({ asset, price: asset.basePrice, change24h: 0 }))
  );

  const buildIndependentCoins = useCallback((): ListingCoin[] => {
    return INDEPENDENT_COINS.map(c => {
      const price = getIndependentPrice(c.symbol);
      return { ...c, price, usdtEquiv: price, change24h: getIndependentChange(c.symbol) };
    });
  }, []);

  const loadBinanceCoins = useCallback(async (): Promise<ListingCoin[]> => {
    const settled = await Promise.allSettled(
      BINANCE_NEW_COINS.map(coin =>
        fetchBinanceTicker(`${coin.symbol}USDT`).then(ticker => ({ coin, ticker }))
      )
    );
    return settled
      .filter((r): r is PromiseFulfilledResult<{ coin: typeof BINANCE_NEW_COINS[0]; ticker: Awaited<ReturnType<typeof fetchBinanceTicker>> }> =>
        r.status === 'fulfilled' && r.value.ticker != null
      )
      .map(r => {
        const { coin, ticker } = r.value;
        const price = parseFloat(ticker!.lastPrice);
        return {
          ...coin,
          price,
          usdtEquiv: price,
          change24h: parseFloat(ticker!.priceChangePercent),
          isIndependent: false,
        };
      });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const indep = buildIndependentCoins();
    setCoins(indep);
    setLoading(false);
    try {
      const binance = await loadBinanceCoins();
      setCoins([...indep, ...binance]);
    } catch {
      // keep indep coins
    }
  }, [buildIndependentCoins, loadBinanceCoins]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCoins(prev =>
        prev.map(c => {
          if (!c.isIndependent) return c;
          const price = getIndependentPrice(c.symbol);
          return { ...c, price, usdtEquiv: price, change24h: getIndependentChange(c.symbol) };
        })
      );
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sync = () => {
      const prices = getAllTradFiPrices();
      setTradFiListings(prev => prev.map(row => {
        const d = prices.get(row.asset.symbol);
        if (!d) return row;
        return { ...row, price: d.price, change24h: d.change24h };
      }));
    };
    sync();
    const unsub = subscribeAllTradFiPrices(sync);
    return () => unsub();
  }, []);

  const handleCoinClick = (symbol: string) => {
    window.dispatchEvent(new CustomEvent('navigate-to-trade', { detail: { symbol: `${symbol}USDT` } }));
  };

  const handleTradFiClick = (asset: TradFiAsset) => {
    window.dispatchEvent(new CustomEvent('navigate-to-futures', { detail: { symbol: asset.displayName } }));
  };

  return (
    <div className="min-h-[400px] bg-[#1E2329]">
      <div className="flex items-center gap-1 px-3 mb-3 pt-3">
        {(['crypto', 'tradfi'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
              activeTab === tab
                ? 'bg-[#2B3139] text-white'
                : 'text-[#848E9C]'
            }`}
          >
            {tab === 'crypto' ? 'Crypto' : 'TradFi'}
          </button>
        ))}
      </div>

      <div className="px-3">
        <div className="grid grid-cols-[1fr_auto_auto] items-center mb-2">
          <span className="text-[#848E9C] text-[12px]">Name / Vol</span>
          <span className="text-[#848E9C] text-[12px] text-right pr-3">Last Price</span>
          <span className="text-[#848E9C] text-[12px] text-right w-[80px]">24h chg%</span>
        </div>

        {activeTab === 'crypto' ? (
          <>
            {loading ? (
              <div>
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center py-3 border-b border-[#2B3139] animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#2B3139] flex-shrink-0" />
                      <div className="w-16 h-4 bg-[#2B3139] rounded" />
                    </div>
                    <div className="w-20 h-8 bg-[#2B3139] rounded mr-3" />
                    <div className="w-[80px] h-8 bg-[#2B3139] rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {coins.map((coin) => {
                  const isPositive = coin.change24h >= 0;
                  const usdtStr = formatUsdtEquiv(coin.usdtEquiv);

                  return (
                    <button
                      key={coin.symbol}
                      onClick={() => handleCoinClick(coin.symbol)}
                      className="w-full grid grid-cols-[1fr_auto_auto] items-center py-3 border-b border-[#2B3139] last:border-0 active:bg-[#2B3139]/40 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#2B3139] flex-shrink-0">
                          <CoinLogoWithFallback logoUrls={coin.logoUrls} symbol={coin.symbol} />
                        </div>
                        <span className="text-white text-[14px] font-semibold">{coin.symbol}</span>
                      </div>

                      <div className="text-right pr-3">
                        <div className="text-white text-[14px] font-medium tabular-nums">
                          {formatPrice(coin.price)}
                        </div>
                        {usdtStr && (
                          <div className="text-[#848E9C] text-[11px] tabular-nums mt-0.5">
                            ₮{usdtStr}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end w-[80px]">
                        <div
                          className="w-full h-[32px] flex items-center justify-center rounded-[4px] text-[12px] font-bold tabular-nums"
                          style={{ background: isPositive ? '#0ECB81' : '#F6465D', color: '#fff' }}
                        >
                          {isPositive ? '+' : ''}{coin.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div>
            {tradFiListings.map((row) => {
              const isPositive = row.change24h >= 0;
              const catStyle = CATEGORY_STYLES[row.asset.category];

              return (
                <button
                  key={row.asset.symbol}
                  onClick={() => handleTradFiClick(row.asset)}
                  className="w-full grid grid-cols-[1fr_auto_auto] items-center py-2.5 border-b border-[#2B3139] last:border-0 active:bg-[#2B3139]/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <TradFiLogoIcon asset={row.asset} size={36} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white text-[13px] font-bold leading-tight">{row.asset.symbol}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2B3139] text-[#848E9C] leading-none">Perp</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm leading-tight ${catStyle.bg} ${catStyle.text}`}>
                          {catStyle.label}
                        </span>
                      </div>
                      <span className="text-[#848E9C] text-[11px] leading-tight truncate block">{row.asset.displayName}</span>
                    </div>
                  </div>

                  <div className="text-right pr-3">
                    <div className="text-white text-[14px] font-medium tabular-nums">
                      {formatPrice(row.price)}
                    </div>
                  </div>

                  <div className="flex justify-end w-[80px]">
                    <div
                      className="w-full h-[32px] flex items-center justify-center rounded-[4px] text-[12px] font-bold tabular-nums"
                      style={{ background: isPositive ? '#0ECB81' : '#F6465D', color: '#fff' }}
                    >
                      {isPositive ? '+' : ''}{row.change24h.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

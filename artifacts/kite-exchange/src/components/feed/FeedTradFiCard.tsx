import { useState, useEffect } from 'react';
import { getCachedTradFiPrice, subscribeTradFiPrice, startTradFiPriceUpdater } from '../../lib/tradfi-price-service';
import { getTradFiAsset, CATEGORY_STYLES } from '../../lib/tradfi-data';

interface FeedTradFiCardProps {
  tradfiSymbol: string;
  tradeType: 'long' | 'short';
  leverage: number;
  entryPrice: number;
  margin: number;
}

function formatPrice(p: number): string {
  if (p < 0.01) return p.toFixed(6);
  if (p < 1) return p.toFixed(4);
  if (p < 10) return p.toFixed(3);
  if (p < 100) return p.toFixed(2);
  return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FeedTradFiCard({ tradfiSymbol, tradeType, leverage, entryPrice, margin }: FeedTradFiCardProps) {
  const asset = getTradFiAsset(tradfiSymbol);
  const [priceData, setPriceData] = useState(() => getCachedTradFiPrice(tradfiSymbol));

  useEffect(() => {
    const stopUpdater = startTradFiPriceUpdater();
    const unsub = subscribeTradFiPrice(tradfiSymbol, () => {
      setPriceData(getCachedTradFiPrice(tradfiSymbol));
    });
    return () => { unsub(); stopUpdater(); };
  }, [tradfiSymbol]);

  if (!asset) return null;

  const currentPrice = priceData?.price ?? asset.basePrice;
  const priceDiff = currentPrice - entryPrice;
  const priceChangePct = (priceDiff / entryPrice) * 100;
  const pnlPct = tradeType === 'long' ? priceChangePct * leverage : -priceChangePct * leverage;
  const pnlUSDT = (pnlPct / 100) * margin;
  const positionSize = margin * leverage;
  const marginRatio = (100 / leverage * 0.8).toFixed(2);
  const liqPrice = tradeType === 'long'
    ? entryPrice * (1 - 0.9 / leverage)
    : entryPrice * (1 + 0.9 / leverage);
  const catStyle = CATEGORY_STYLES[asset.category];
  const isWin = pnlUSDT >= 0;

  const logoUrl = asset.logoUrl && !asset.logoUrl.startsWith('sprite:') ? asset.logoUrl : null;

  return (
    <div className="bg-[#1E2026] rounded-xl p-4 mb-3 border border-[#2B3139]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
            tradeType === 'long' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'
          }`}>
            {tradeType === 'long' ? 'L' : 'S'}
          </div>
          <div className="w-6 h-6 rounded-full bg-[#2B3139] overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={asset.displayName} className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-300">
                {asset.displayName.slice(0, 2)}
              </span>
            )}
          </div>
          <span className="font-semibold text-sm">{asset.displayName}</span>
          <span className="text-xs text-gray-400">Perp</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${catStyle.bg} ${catStyle.text}`}>
            {catStyle.label}
          </span>
          <span className="bg-[#F0B90B] text-[#0B0E11] text-[10px] font-bold px-2 py-1 rounded">
            Cross {leverage}x
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-1 h-1 bg-[#848E9C] rounded-full" />
          <div className="w-1 h-1 bg-[#848E9C] rounded-full" />
          <div className="w-1 h-1 bg-[#848E9C] rounded-full" />
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-1">Unrealized PNL (USDT)</div>
        <div className={`text-3xl font-bold ${isWin ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          {isWin ? '+' : ''}{pnlUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">ROI</span>
          <span className={`text-sm font-semibold ${isWin ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isWin ? '+' : ''}{pnlPct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-xs mb-4">
        <div>
          <div className="text-gray-400 mb-1">Size (USDT)</div>
          <div className="text-white font-medium">{positionSize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Margin (USDT)</div>
          <div className="text-white font-medium">{margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Margin Ratio</div>
          <div className="text-[#0ECB81] font-medium">{marginRatio}%</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Entry Price</div>
          <div className="text-white font-medium">{formatPrice(entryPrice)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Mark Price</div>
          <div className="text-white font-medium">{formatPrice(currentPrice)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Liq. Price</div>
          <div className="text-[#F6465D] font-medium">{formatPrice(liqPrice)}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 bg-[#2B3139] hover:bg-[#3B4149] text-xs font-medium py-2.5 rounded-lg transition-colors">
          Leverage
        </button>
        <button className="flex-1 bg-[#2B3139] hover:bg-[#3B4149] text-xs font-medium py-2.5 rounded-lg transition-colors">
          TP/SL
        </button>
        <button className="flex-1 bg-[#F6465D] hover:bg-[#E5465D] text-xs font-medium py-2.5 rounded-lg transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

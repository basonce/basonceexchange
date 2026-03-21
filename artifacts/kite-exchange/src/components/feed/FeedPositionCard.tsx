interface FeedPositionCardProps {
  coinSymbol: string;
  tradeType: 'long' | 'short';
  leverage: number;
  profitLoss: number;
  profitLossPercent: number;
  isBullish: boolean;
  entryPrice: number;
  exitPrice: number;
  compact?: boolean;
}

export default function FeedPositionCard({
  coinSymbol,
  tradeType,
  leverage,
  profitLoss,
  profitLossPercent,
  isBullish,
  entryPrice,
  exitPrice,
  compact = false,
}: FeedPositionCardProps) {
  const size = ((Math.abs(profitLoss) / Math.abs(profitLossPercent)) * 100 * leverage);
  const margin = size / leverage;
  const marginRatio = (100 / leverage * 0.8).toFixed(2);
  const liqPrice = tradeType === 'long'
    ? entryPrice * (1 - 0.9 / leverage)
    : entryPrice * (1 + 0.9 / leverage);

  const formatPrice = (p: number) => {
    if (p === 0) return '—';
    return p < 1
      ? p.toFixed(6)
      : p < 100
        ? p.toFixed(4)
        : p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (compact) {
    return (
      <div className="bg-[#1E2026] rounded-lg p-3 border border-[#2B3139]">
        <div className="flex items-center gap-1.5 mb-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[9px] ${
            tradeType === 'long' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'
          }`}>
            {tradeType === 'long' ? 'L' : 'S'}
          </div>
          <span className="font-semibold text-[11px]">{coinSymbol}USDT</span>
          <span className="text-[9px] text-gray-400">Perp</span>
          <span className="bg-[#F0B90B] text-[#0B0E11] text-[8px] font-bold px-1.5 py-0.5 rounded">
            Cross {leverage}x
          </span>
        </div>

        <div className="mb-2">
          <div className="text-[10px] text-gray-400 mb-0.5">PNL (USDT)</div>
          <div className={`text-lg font-bold ${profitLoss >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {profitLoss >= 0 ? '+' : ''}{profitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] text-gray-400">ROI</span>
            <span className={`text-[11px] font-semibold ${profitLossPercent >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[9px]">
          <div>
            <div className="text-gray-500">Size (USDT)</div>
            <div className="text-white font-medium">{size.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <div className="text-gray-500">Margin (USDT)</div>
            <div className="text-white font-medium">{margin.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-gray-500">Margin Ratio</div>
            <div className="text-[#0ECB81] font-medium">{marginRatio}%</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1E2026] rounded-xl p-4 mb-3 border border-[#2B3139]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
            tradeType === 'long' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'
          }`}>
            {tradeType === 'long' ? 'L' : 'S'}
          </div>
          <span className="font-semibold text-sm">{coinSymbol}USDT</span>
          <span className="text-xs text-gray-400">Perp</span>
          <span className="bg-[#F0B90B] text-[#0B0E11] text-[10px] font-bold px-2 py-1 rounded">
            Cross {leverage}x
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-[#848E9C] rounded-full" />
          <div className="w-1 h-1 bg-[#848E9C] rounded-full" />
          <div className="w-1 h-1 bg-[#848E9C] rounded-full" />
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-1">Unrealized PNL (USDT)</div>
        <div className={`text-3xl font-bold ${profitLoss >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          {profitLoss >= 0 ? '+' : ''}{profitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">ROI</span>
          <span className={`text-sm font-semibold ${profitLossPercent >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs mb-4">
        <div>
          <div className="text-gray-400 mb-1">Size (USDT)</div>
          <div className="text-white font-medium">
            {size.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Margin (USDT)</div>
          <div className="text-white font-medium">
            {margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Margin Ratio</div>
          <div className="text-[#0ECB81] font-medium">{marginRatio}%</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Entry Price (USDT)</div>
          <div className="text-white font-medium">{formatPrice(entryPrice)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Mark Price (USDT)</div>
          <div className="text-white font-medium">{formatPrice(exitPrice)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Liq. Price (USDT)</div>
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

interface Position {
  coin: string;
  type: 'long' | 'short';
  leverage: number;
  pnl: number;
  roi: number;
  size: number;
  margin: number;
  entry: number;
  mark: number;
  liq: number;
  margin_ratio: number;
}

interface FeedMultiPositionProps {
  positions: Position[];
  assetChange30d?: number | null;
}

export default function FeedMultiPosition({ positions, assetChange30d }: FeedMultiPositionProps) {
  if (!positions || positions.length === 0) return null;

  const formatPrice = (p: number) => {
    if (!p || p === 0) return '—';
    return p < 0.01
      ? p.toFixed(8)
      : p < 1
        ? p.toFixed(6)
        : p < 100
          ? p.toFixed(4)
          : p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="mb-3">
      <div className={`grid gap-2 ${positions.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {positions.slice(0, 4).map((pos, i) => (
          <div key={i} className="bg-[#1E2026] rounded-lg p-3 border border-[#2B3139]">
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[8px] ${
                pos.type === 'long' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'
              }`}>
                {pos.type === 'long' ? 'L' : 'S'}
              </div>
              <span className="font-semibold text-[10px]">{pos.coin}USDT</span>
              <span className="text-[8px] text-gray-400">Perp</span>
              <span className="bg-[#F0B90B] text-[#0B0E11] text-[7px] font-bold px-1 py-0.5 rounded leading-none">
                Cross {pos.leverage}x
              </span>
            </div>

            <div className="mb-2">
              <div className="text-[9px] text-gray-400">PNL (USDT)</div>
              <div className={`text-base font-bold leading-tight ${pos.roi >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8px] text-gray-400">ROI</span>
                <span className={`text-[10px] font-semibold ${pos.roi >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {pos.roi >= 0 ? '+' : ''}{pos.roi.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[8px]">
              <div>
                <div className="text-gray-500">Size (USDT)</div>
                <div className="text-white font-medium">{pos.size.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-gray-500">Margin (USDT)</div>
                <div className="text-white font-medium">{pos.margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-gray-500">Entry Price</div>
                <div className="text-white font-medium">{formatPrice(pos.entry)}</div>
              </div>
              <div>
                <div className="text-gray-500">Mark Price</div>
                <div className="text-white font-medium">{formatPrice(pos.mark)}</div>
              </div>
              <div>
                <div className="text-gray-500">Liq. Price</div>
                <div className="text-[#F6465D] font-medium">{formatPrice(pos.liq)}</div>
              </div>
              <div>
                <div className="text-gray-500">Margin Ratio</div>
                <div className="text-[#0ECB81] font-medium">{pos.margin_ratio?.toFixed(2) || '—'}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {assetChange30d && (
        <div className="flex items-center justify-between bg-[#1E2026] rounded-lg px-3 py-2 mt-2 border border-[#2B3139]">
          <span className="text-xs text-gray-400">30D Asset Change</span>
          <span className={`text-sm font-bold ${assetChange30d >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            +{assetChange30d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
          </span>
        </div>
      )}
    </div>
  );
}

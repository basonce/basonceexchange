import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  turnover24h: number;
  openInterest?: number;
  longShortRatio?: number;
}

export default function FuturesMarketStats({
  symbol,
  currentPrice,
  priceChange,
  high24h,
  low24h,
  volume24h,
  turnover24h,
  openInterest = 0,
  longShortRatio = 1.2
}: Props) {
  const getPriceDecimals = (price: number): number => {
    if (price >= 100) return 2;
    if (price >= 10) return 3;
    if (price >= 1) return 4;
    if (price >= 0.1) return 5;
    return 6;
  };

  const formatVolume = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="bg-[#181A20] border-[#2B3139] px-3 py-2">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-gray-500 mb-0.5">24h High</div>
          <div className="text-white font-medium">{high24h.toFixed(getPriceDecimals(currentPrice))}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">24h Low</div>
          <div className="text-white font-medium">{low24h.toFixed(getPriceDecimals(currentPrice))}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">24h Volume({symbol.replace('USDT', '')})</div>
          <div className="text-white font-medium">{formatVolume(volume24h)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">24h Turnover(USDT)</div>
          <div className="text-white font-medium">{formatVolume(turnover24h)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">Open Interest</div>
          <div className="text-white font-medium">{formatVolume(openInterest)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5 flex items-center gap-1">
            Long/Short Ratio
            {longShortRatio > 1 ? (
              <TrendingUp className="w-3 h-3 text-[#0ECB81]" />
            ) : (
              <TrendingDown className="w-3 h-3 text-[#F6465D]" />
            )}
          </div>
          <div className={`font-medium ${longShortRatio > 1 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {longShortRatio.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

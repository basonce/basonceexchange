import { useState, useEffect, useRef } from 'react';
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

function symbolSeed(sym: string): number {
  return sym.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
}

function baseRatio(sym: string): number {
  const s = Math.abs(symbolSeed(sym));
  return 0.72 + (s % 1000) / 526;
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
}: Props) {
  const [lsRatio, setLsRatio] = useState<number>(() => baseRatio(symbol));
  const prevSymbol = useRef(symbol);

  useEffect(() => {
    if (prevSymbol.current !== symbol) {
      prevSymbol.current = symbol;
      setLsRatio(baseRatio(symbol));
    }
  }, [symbol]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLsRatio(prev => {
        const base = baseRatio(symbol);
        const priceBias =
          priceChange > 3 ? 0.018 :
          priceChange > 1 ? 0.007 :
          priceChange < -3 ? -0.018 :
          priceChange < -1 ? -0.007 : 0;
        const drift = (Math.random() - 0.475) * 0.055 + priceBias;
        const pullback = (base - prev) * 0.04;
        return Math.max(0.65, Math.min(2.85, prev + drift + pullback));
      });
    }, 14000);
    return () => clearInterval(interval);
  }, [symbol, priceChange]);

  const getPriceDecimals = (price: number): number => {
    if (price >= 100) return 2;
    if (price >= 10) return 3;
    if (price >= 1) return 4;
    if (price >= 0.1) return 5;
    if (price >= 0.01) return 6;
    if (price >= 0.001) return 7;
    if (price >= 0.0001) return 8;
    if (price >= 0.00001) return 9;
    if (price >= 0.000001) return 8;
    return 10;
  };

  const formatVolume = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const isBull = lsRatio >= 1;

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
          <div className="text-white font-medium">
            {formatVolume(openInterest > 0 ? openInterest : volume24h * 0.43)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5 flex items-center gap-1">
            Long/Short Ratio
            {isBull ? (
              <TrendingUp className="w-3 h-3 text-[#0ECB81]" />
            ) : (
              <TrendingDown className="w-3 h-3 text-[#F6465D]" />
            )}
          </div>
          <div className={`font-medium transition-colors duration-700 ${isBull ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {lsRatio.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

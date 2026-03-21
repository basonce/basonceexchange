import { useState, useEffect } from 'react';
import { formatPrice as sharedFormatPrice } from '../lib/format-utils';

interface Trade {
  price: number;
  amount: number;
  time: string;
  side: 'buy' | 'sell';
}

interface Props {
  symbol: string;
  currentPrice: number;
}

export default function FuturesRecentTrades({ symbol, currentPrice }: Props) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    generateInitialTrades();
    const interval = setInterval(generateNewTrade, 3000);
    return () => clearInterval(interval);
  }, [currentPrice]);

  const generateInitialTrades = () => {
    const initialTrades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      initialTrades.push({
        price: currentPrice * (0.9995 + Math.random() * 0.001),
        amount: Math.random() * 10 + 0.01,
        time: new Date(Date.now() - i * 1000).toLocaleTimeString(),
        side: Math.random() > 0.5 ? 'buy' : 'sell'
      });
    }
    setTrades(initialTrades);
  };

  const generateNewTrade = () => {
    if (currentPrice > 0) {
      const priceVariation = (Math.random() - 0.5) * 0.0005;
      const newTrade: Trade = {
        price: currentPrice * (1 + priceVariation),
        amount: Math.random() * 10 + 0.01,
        time: new Date().toLocaleTimeString(),
        side: Math.random() > 0.5 ? 'buy' : 'sell'
      };
      setTrades(prev => [newTrade, ...prev.slice(0, 49)]);
    }
  };

  const formatPrice = (price: number) => sharedFormatPrice(price);

  const formatAmount = (amount: number) => {
    return amount.toFixed(3);
  };

  return (
    <div className="bg-[#181A20] h-full flex flex-col">
      <div className="px-2 py-2 border-[#2B3139]">
        <div className="flex text-gray-500">
          <div className="flex-1">Price(USDT)</div>
          <div className="flex-1 text-right">Amount</div>
          <div className="flex-1 text-right">Time</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trades.map((trade, i) => (
          <div
            key={i}
            className="flex items-center px-2 py-0.5 text-[11px] font-mono hover:bg-[#2B3139] transition-colors"
          >
            <div className={`flex-1 font-medium ${ trade.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]' }`}>
              {formatPrice(trade.price)}
            </div>
            <div className="flex-1 text-white">
              {formatAmount(trade.amount)}
            </div>
            <div className="flex-1 text-[10px]">
              {trade.time.slice(-8)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

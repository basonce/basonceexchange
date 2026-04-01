import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Trade {
  id: string;
  price: number;
  amount: number;
  time: Date;
  side: 'buy' | 'sell';
}

interface RecentTradesProps {
  symbol: string;
}

export default function RecentTrades({ symbol }: RecentTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const generateTrades = () => {
      const newTrades: Trade[] = [];
      let basePrice = 2937.67;

      for (let i = 0; i < 30; i++) {
        const priceChange = (Math.random() - 0.5) * 2;
        basePrice += priceChange;

        const side: 'buy' | 'sell' = Math.random() > 0.12 ? 'buy' : 'sell';
        const buyAmt = (80_000 + Math.random() * 920_000) / Math.max(basePrice, 0.0001);
        const sellAmt = (200 + Math.random() * 1_800) / Math.max(basePrice, 0.0001);
        newTrades.push({
          id: `trade-${Date.now()}-${i}`,
          price: basePrice,
          amount: side === 'buy' ? buyAmt : sellAmt,
          time: new Date(Date.now() - i * 1000),
          side,
        });
      }

      setTrades(newTrades);
    };

    generateTrades();
    const interval = setInterval(generateTrades, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="bg-[#181A20] rounded-lg h-full flex flex-col">
      <div className="px-3 py-2 border-[#2B3139]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Recent Trades</span>
          <div className="flex items-center gap-2 text-[9px]">
            <button className="text-[#0ECB81] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Buy</span>
            </button>
            <button className="text-[#F6465D] flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              <span>Sell</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-400 mt-2">
          <span>Price(USDT)</span>
          <span className="ml-auto">Amount({symbol.replace('USDT', '')})</span>
          <span>Time</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-1">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between text-[10px] py-1 hover:bg-[#2B3139]/50"
            >
              <span className={trade.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                {trade.price.toFixed(2)}
              </span>
              <span className="text-white">
                {trade.amount.toFixed(4)}
              </span>
              <span className="text-gray-400">
                {formatTime(trade.time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

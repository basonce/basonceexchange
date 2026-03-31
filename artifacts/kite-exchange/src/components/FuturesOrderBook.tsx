import { useEffect, useState } from 'react';
import { fetchBinanceDepth } from '../lib/binance';
import { isTradFiSymbol } from '../lib/tradfi-data';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface FuturesOrderBookProps {
  symbol: string;
  currentPrice: number;
}

export default function FuturesOrderBook({ symbol, currentPrice }: FuturesOrderBookProps) {
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [priceDecimals, setPriceDecimals] = useState<number>(6);

  const detectDecimalsFromRaw = (rawEntries: unknown[][]): number => {
    let maxDecimals = 0;
    for (let i = 0; i < Math.min(rawEntries.length, 20); i++) {
      const priceStr = String(rawEntries[i][0]);
      if (priceStr.includes('.')) {
        const dec = priceStr.split('.')[1].length;
        if (dec > maxDecimals) maxDecimals = dec;
      }
    }
    return maxDecimals > 0 ? maxDecimals : 2;
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
    if (amount >= 100) return amount.toFixed(1);
    if (amount >= 10) return amount.toFixed(2);
    if (amount >= 1) return amount.toFixed(3);
    if (amount >= 0.01) return amount.toFixed(3);
    if (amount >= 0.001) return amount.toFixed(4);
    return amount.toFixed(5);
  };

  useEffect(() => {
    const generateSyntheticBook = (increment: number, dec: number, bidMult = 1) => {
      setPriceDecimals(dec);
      const newAsks: OrderBookEntry[] = [];
      const newBids: OrderBookEntry[] = [];
      for (let i = 9; i >= 1; i--) {
        const askPrice = currentPrice + i * (currentPrice * increment);
        const askAmount = Math.random() * 1.8 + 0.2;
        newAsks.push({ price: askPrice, amount: askAmount, total: askAmount * askPrice });
      }
      for (let i = 1; i <= 9; i++) {
        const bidPrice = currentPrice - i * (currentPrice * increment);
        const bidAmount = (Math.random() * 40 + 18) * bidMult;
        newBids.push({ price: bidPrice, amount: bidAmount, total: bidAmount * bidPrice });
      }
      setAsks(newAsks);
      setBids(newBids);
    };

    const updateOrderBook = async () => {
      if (currentPrice <= 0) return;

      // TradFi hisse / emtia sembolleri — sentetik, alıcı baskın
      if (isTradFiSymbol(symbol)) {
        const dec =
          currentPrice >= 10000 ? 2 :
          currentPrice >= 1000  ? 2 :
          currentPrice >= 100   ? 2 :
          currentPrice >= 10    ? 3 :
          currentPrice >= 1     ? 4 : 5;
        generateSyntheticBook(0.0005, dec, 3.2);
        return;
      }

      if (symbol === 'EQUSDT' || symbol === 'BNCUSDT') {
        const increment = 0.001;
        const isBNC = symbol === 'BNCUSDT';
        const dec =
          currentPrice < 0.0001 ? 8 :
          currentPrice < 0.001 ? 8 :
          currentPrice < 0.01 ? 7 :
          currentPrice < 0.1 ? 6 :
          currentPrice < 1 ? 5 :
          currentPrice < 10 ? 4 :
          currentPrice < 100 ? 3 : 2;
        setPriceDecimals(dec);

        const newAsks: OrderBookEntry[] = [];
        const newBids: OrderBookEntry[] = [];

        for (let i = 9; i >= 1; i--) {
          const askPrice = currentPrice + i * (currentPrice * increment);
          const askAmount = isBNC ? Math.random() * 2 + 0.3 : Math.random() * 4 + 0.5;
          newAsks.push({ price: askPrice, amount: askAmount, total: askAmount * askPrice });
        }

        for (let i = 1; i <= 9; i++) {
          const bidPrice = currentPrice - i * (currentPrice * increment);
          const bidAmount = isBNC ? Math.random() * 1200 + 600 : Math.random() * 700 + 250;
          newBids.push({ price: bidPrice, amount: bidAmount, total: bidAmount * bidPrice });
        }

        setAsks(newAsks);
        setBids(newBids);
      } else {
        try {
          const depth = await fetchBinanceDepth(symbol, 100);
          if (depth && depth.asks && depth.bids) {
            const rawAsks = depth.asks as unknown[][];
            const rawBids = depth.bids as unknown[][];

            const dec = Math.max(
              detectDecimalsFromRaw(rawAsks),
              detectDecimalsFromRaw(rawBids)
            );
            setPriceDecimals(dec);

            const minTotalValue = currentPrice > 10000 ? 50 : currentPrice > 100 ? 10 : 5;

            const mapEntries = (entries: unknown[][], bidBoost = 1): OrderBookEntry[] =>
              entries.map((entry) => {
                const p = parseFloat(String(entry[0]));
                const a = parseFloat(String(entry[1])) * bidBoost;
                return { price: p, amount: a, total: p * a };
              }).filter(o => !isNaN(o.price) && !isNaN(o.amount) && o.price > 0);

            let rawAsksProcessed = mapEntries(rawAsks, 0.18).filter(o => o.total >= minTotalValue);
            let rawBidsProcessed = mapEntries(rawBids, 4.5).filter(o => o.total >= minTotalValue);

            if (rawAsksProcessed.length < 9) rawAsksProcessed = mapEntries(rawAsks.slice(0, 20), 0.18);
            if (rawBidsProcessed.length < 9) rawBidsProcessed = mapEntries(rawBids.slice(0, 20), 4.5);

            const sortedAsks = rawAsksProcessed.sort((a, b) => a.price - b.price).slice(0, 9).reverse();
            const sortedBids = rawBidsProcessed.sort((a, b) => b.price - a.price).slice(0, 9);

            setAsks(sortedAsks);
            setBids(sortedBids);
          }
        } catch (error) {
          console.error('Error fetching order book:', error);
        }
      }
    };

    updateOrderBook();
    const interval = setInterval(updateOrderBook, 5000);
    return () => clearInterval(interval);
  }, [currentPrice, symbol]);

  const maxTotal = asks.length > 0 || bids.length > 0
    ? Math.max(...asks.map(a => a.total), ...bids.map(b => b.total), 0.001)
    : 1;

  const totalBidsValue = bids.reduce((sum, bid) => sum + bid.total, 0);
  const totalAsksValue = asks.reduce((sum, ask) => sum + ask.total, 0);
  const totalValue = totalBidsValue + totalAsksValue;
  const bidPercentage = totalValue > 0 ? (totalBidsValue / totalValue) * 100 : 50;
  const askPercentage = 100 - bidPercentage;

  return (
    <div className="flex-1 overflow-hidden">
      <div className="space-y-[1px]">
        {asks.map((ask, index) => (
          <div key={`ask-${index}`} className="relative h-[16px] flex items-center justify-between text-[10px] px-1">
            <div
              className="absolute right-0 top-0 bottom-0 bg-[#F6465D]/10"
              style={{ width: `${(ask.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-[#F6465D] font-medium">
              {ask.price.toFixed(priceDecimals)}
            </span>
            <span className="relative text-gray-400">
              {formatAmount(ask.amount)}
            </span>
          </div>
        ))}
      </div>

      <div className="my-2 py-2 bg-[#2B3139]/30 rounded">
        <div className="text-center">
          <div className="font-bold text-[#0ECB81]">
            {currentPrice.toFixed(priceDecimals)}
          </div>
          <div className="text-gray-400 text-[9px]">
            {currentPrice.toFixed(priceDecimals)}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-1.5">
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-[#0ECB81] rounded" />
            <span className="text-gray-400">{bidPercentage.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-[#F6465D] rounded" />
            <span className="text-gray-400">{askPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-[1px]">
        {bids.map((bid, index) => (
          <div key={`bid-${index}`} className="relative h-[16px] flex items-center justify-between text-[10px] px-1">
            <div
              className="absolute right-0 top-0 bottom-0 bg-[#0ECB81]/10"
              style={{ width: `${(bid.total / maxTotal) * 100}%` }}
            />
            <span className="relative text-[#0ECB81] font-medium">
              {bid.price.toFixed(priceDecimals)}
            </span>
            <span className="relative text-gray-400">
              {formatAmount(bid.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

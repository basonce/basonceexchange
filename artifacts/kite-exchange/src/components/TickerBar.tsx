import { useState, useEffect, useRef } from 'react';
import { fetchBinanceTicker, getCryptoLogoUrl } from '../lib/binance';
import { EarnQuestPriceManager } from '../lib/earnquest-price';

const tickerPairs = [
  { symbol: 'EQ', name: 'EarnQuest', pair: 'EQUSDT', isEarnQuest: true },
  { symbol: 'BTC', name: 'Bitcoin', pair: 'BTCUSDT' },
  { symbol: 'ETH', name: 'Ethereum', pair: 'ETHUSDT' },
  { symbol: 'BNB', name: 'BNB', pair: 'BNBUSDT' },
  { symbol: 'SOL', name: 'Solana', pair: 'SOLUSDT' },
  { symbol: 'XRP', name: 'Ripple', pair: 'XRPUSDT' },
  { symbol: 'ADA', name: 'Cardano', pair: 'ADAUSDT' },
  { symbol: 'AVAX', name: 'Avalanche', pair: 'AVAXUSDT' },
  { symbol: 'DOGE', name: 'Dogecoin', pair: 'DOGEUSDT' },
  { symbol: 'DOT', name: 'Polkadot', pair: 'DOTUSDT' },
  { symbol: 'MATIC', name: 'Polygon', pair: 'MATICUSDT' },
  { symbol: 'LINK', name: 'Chainlink', pair: 'LINKUSDT' },
  { symbol: 'UNI', name: 'Uniswap', pair: 'UNIUSDT' },
  { symbol: 'ATOM', name: 'Cosmos', pair: 'ATOMUSDT' },
  { symbol: 'LTC', name: 'Litecoin', pair: 'LTCUSDT' },
  { symbol: 'TRX', name: 'TRON', pair: 'TRXUSDT' },
];

interface TickerData {
  symbol: string;
  price: number;
  change: number;
  flash?: 'up' | 'down';
}

export default function TickerBar() {
  const [tickerData, setTickerData] = useState<TickerData[]>([]);
  const [basePrices, setBasePrices] = useState<Map<string, number>>(new Map());
  const priceManager = useRef(EarnQuestPriceManager.getInstance());

  useEffect(() => {
    const fetchTickerData = async () => {
      const data: TickerData[] = [];
      const newBasePrices = new Map(basePrices);

      for (const pair of tickerPairs) {
        if (pair.isEarnQuest) {
          const eqPrice = priceManager.current.getPrice();
          const eqChange = priceManager.current.getChange();

          data.push({
            symbol: pair.symbol,
            price: eqPrice,
            change: eqChange
          });

          if (!basePrices.has(pair.symbol)) {
            newBasePrices.set(pair.symbol, eqPrice);
          }
        } else {
          const ticker = await fetchBinanceTicker(pair.pair);
          if (ticker) {
            const price = parseFloat(ticker.lastPrice);
            const basePrice = basePrices.get(pair.symbol) || price;

            if (!basePrices.has(pair.symbol)) {
              newBasePrices.set(pair.symbol, price);
            }

            data.push({
              symbol: pair.symbol,
              price: basePrice,
              change: parseFloat(ticker.priceChangePercent)
            });
          }
        }
      }
      setTickerData(data);
      setBasePrices(newBasePrices);
    };

    fetchTickerData();
    const interval = setInterval(fetchTickerData, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (tickerData.length === 0) return;

    const updateEQPrice = () => {
      setTickerData(prevData => {
        if (prevData.length === 0) return prevData;

        return prevData.map(item => {
          if (item.symbol === 'EQ') {
            const eqPrice = priceManager.current.getPrice();
            const eqChange = priceManager.current.getChange();
            return {
              ...item,
              price: eqPrice,
              change: eqChange,
              flash: eqPrice > item.price ? 'up' : eqPrice < item.price ? 'down' : undefined
            };
          }
          return item;
        });
      });
    };

    const unsubscribe = priceManager.current.subscribe(updateEQPrice);

    const otherCoinsInterval = setInterval(() => {
      setTickerData(prevData => {
        if (prevData.length === 0) return prevData;

        return prevData.map(item => {
          if (item.symbol === 'EQ') return item;

          const basePrice = basePrices.get(item.symbol) || item.price;
          const volatility = basePrice * (0.0003 + Math.random() * 0.0007);
          const direction = Math.random() > 0.5 ? 1 : -1;
          const newPrice = basePrice + (volatility * direction);
          const changeAmount = ((newPrice - item.price) / item.price) * 100;

          return {
            ...item,
            price: newPrice,
            change: item.change + changeAmount * 0.1,
            flash: newPrice > item.price ? 'up' : newPrice < item.price ? 'down' : undefined
          };
        });
      });
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(otherCoinsInterval);
    };
  }, [tickerData.length, basePrices]);

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  return (
    <div className="bg-[#181a20] border-[#2b3139] py-2 overflow-hidden">
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {[...tickerData, ...tickerData].map((item, index) => (
            <div
              key={`${item.symbol}-${index}`}
              className="ticker-item flex items-center space-x-3 px-6"
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${ item.symbol === 'EQ' ? 'bg-gradient-to-br from-[#7B3FE4] to-[#00C9FF] p-[1px]' : 'bg-[#2b3139] p-0.5' }`}>
                <img
                  src={item.symbol === 'EQ' ? '/earnquest-logo-icon-2.png' : getCryptoLogoUrl(item.symbol)}
                  alt={item.symbol}
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              {item.symbol === 'EQ' && (
                <span className="bg-[#F0B90B] text-[8px] font-bold px-1.5 py-0.5 rounded">HOT</span>
              )}
              <span className="text-xs font-medium">{item.symbol}/USDT</span>
              <span className={`text-white font-mono transition-colors duration-200 ${ item.flash === 'up' ? 'text-[#0ecb81]' : item.flash === 'down' ? 'text-[#f6465d]' : '' }`}>${formatPrice(item.price)}</span>
              <span className={`text-xs font-semibold ${ item.change >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]' }`}>
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .ticker-wrapper {
          width: 100%;
          overflow: hidden;
        }

        .ticker-content {
          display: flex;
          animation: scroll 60s linear infinite;
          width: fit-content;
        }

        .ticker-item {
          flex-shrink: 0;
          white-space: nowrap;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .ticker-content:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

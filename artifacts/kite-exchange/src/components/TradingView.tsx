import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Star, Menu } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement
} from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import {
  fetchBinanceTicker,
  fetchBinanceDepth,
  fetchBinanceKlines,
  connectBinanceWebSocket,
  getCryptoLogoUrl,
  BinanceDepth
} from '../lib/binance';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement,
  BarElement,
  LineElement,
  PointElement
);

interface TradingViewProps {
  crypto: any;
  onBack: () => void;
}

interface Trade {
  price: number;
  amount: number;
  time: string;
  isBuy: boolean;
}

const topPairs = [
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
];

export default function TradingView({ crypto, onBack }: TradingViewProps) {
  const [orderMode, setOrderMode] = useState<'spot' | 'cross' | 'isolated' | 'grid'>('spot');
  const [orderMethod, setOrderMethod] = useState<'limit' | 'market' | 'stop-limit'>('limit');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState(crypto.price?.toString() || '0');
  const [currentPrice, setCurrentPrice] = useState(crypto.price || 0);
  const [change24h, setChange24h] = useState(crypto.change24h || 0);
  const [orderBook, setOrderBook] = useState<BinanceDepth | null>(null);
  const [high24h, setHigh24h] = useState(0);
  const [low24h, setLow24h] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [volumeBase, setVolumeBase] = useState(0);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [interval, setInterval] = useState('1D');
  const [pairPrices, setPairPrices] = useState<Record<string, { price: number; change: number; prevPrice?: number }>>({});
  const [chartTab, setChartTab] = useState<'chart' | 'info' | 'trading'>('chart');
  const [tradesTab, setTradesTab] = useState<'market' | 'my'>('market');
  const [mobileTab, setMobileTab] = useState<'chart' | 'orderbook' | 'trades' | 'trade'>('chart');

  const chartContainerRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const pairWebSocketsRef = useRef<WebSocket[]>([]);

  const symbol = crypto.rawSymbol || `${crypto.symbol}USDT`;

  useEffect(() => {
    const fetchInitialPairPrices = async () => {
      for (const pair of topPairs) {
        const ticker = await fetchBinanceTicker(pair.pair);
        if (ticker) {
          setPairPrices(prev => ({
            ...prev,
            [pair.pair]: {
              price: parseFloat(ticker.lastPrice),
              change: parseFloat(ticker.priceChangePercent),
              prevPrice: parseFloat(ticker.lastPrice)
            }
          }));
        }
      }
    };

    fetchInitialPairPrices();

    topPairs.forEach((pair) => {
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.pair.toLowerCase()}@ticker`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const newPrice = parseFloat(data.c);
        const changePercent = parseFloat(data.P);

        setPairPrices(prev => ({
          ...prev,
          [pair.pair]: {
            price: newPrice,
            change: changePercent,
            prevPrice: prev[pair.pair]?.price || newPrice
          }
        }));
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${pair.pair}:`, error);
      };

      pairWebSocketsRef.current.push(ws);
    });

    return () => {
      pairWebSocketsRef.current.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      pairWebSocketsRef.current = [];
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;
      await fetchInitialData();
      generateInitialTrades();
      await initializeChart();
    };

    initialize();

    const ws = connectBinanceWebSocket(symbol, (data) => {
      if (!mounted) return;
      const newPrice = parseFloat(data.c);
      setCurrentPrice(newPrice);
      setPrice(newPrice.toFixed(8));
      setChange24h(parseFloat(data.P));
      setHigh24h(parseFloat(data.h));
      setLow24h(parseFloat(data.l));
      setVolume24h(parseFloat(data.q));
      setVolumeBase(parseFloat(data.v));

      const newTrade: Trade = {
        price: newPrice,
        amount: Math.random() * 5 + 0.001,
        time: new Date().toLocaleTimeString(),
        isBuy: Math.random() > 0.5,
      };
      setRecentTrades(prev => [newTrade, ...prev.slice(0, 99)]);

      if (chartRef.current && chartRef.current.data.datasets[0]) {
        const now = Date.now();
        const lastData = chartRef.current.data.datasets[0].data;
        if (lastData.length > 0) {
          const lastCandle = lastData[lastData.length - 1] as any;
          const timeDiff = now - lastCandle.x;

          if (timeDiff < 60000) {
            lastCandle.c = newPrice;
            lastCandle.h = Math.max(lastCandle.h, newPrice);
            lastCandle.l = Math.min(lastCandle.l, newPrice);
          } else {
            lastData.push({
              x: now,
              o: newPrice,
              h: newPrice,
              l: newPrice,
              c: newPrice
            });
            if (lastData.length > 200) {
              lastData.shift();
            }
          }
          chartRef.current.update('none');
        }
      }
    });

    const depthInterval = setInterval(() => {
      if (mounted) fetchOrderBook();
    }, 800);

    const tradesInterval = setInterval(() => {
      if (mounted && currentPrice > 0) {
        const numTrades = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numTrades; i++) {
          const priceVariation = (Math.random() - 0.5) * 0.002;
          const tradePrice = currentPrice * (1 + priceVariation);
          const newTrade: Trade = {
            price: tradePrice,
            amount: Math.random() * 5 + 0.001,
            time: new Date().toLocaleTimeString(),
            isBuy: Math.random() > 0.5,
          };
          setRecentTrades(prev => [newTrade, ...prev.slice(0, 99)]);
        }
      }
    }, 800);

    return () => {
      mounted = false;
      ws.close();
      clearInterval(depthInterval);
      clearInterval(tradesInterval);
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [symbol, currentPrice]);

  useEffect(() => {
    initializeChart();
  }, [interval]);

  const generateInitialTrades = () => {
    const initialTrades: Trade[] = [];
    for (let i = 0; i < 30; i++) {
      initialTrades.push({
        price: currentPrice * (0.999 + Math.random() * 0.002),
        amount: Math.random() * 5 + 0.001,
        time: new Date().toLocaleTimeString(),
        isBuy: Math.random() > 0.5,
      });
    }
    setRecentTrades(initialTrades);
  };

  const calculateMA = (data: any[], period: number) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].c;
        }
        result.push({ x: data[i].x, y: sum / period });
      }
    }
    return result;
  };

  const initializeChart = async () => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const intervalMap: Record<string, string> = {
      '1s': '1m',
      '15m': '15m',
      '1H': '1h',
      '4H': '4h',
      '1D': '1d',
      '1W': '1w',
    };

    const binanceInterval = intervalMap[interval] || '1d';
    const klines = await fetchBinanceKlines(symbol, binanceInterval, 200);

    const chartData = klines.map(k => ({
      x: k.time,
      o: k.open,
      h: k.high,
      l: k.low,
      c: k.close,
      v: k.volume
    }));

    const volumeData = chartData.map(k => ({
      x: k.x,
      y: k.v,
      color: k.c >= k.o ? '#0ecb81' : '#f6465d'
    }));

    const ma7 = calculateMA(chartData, 7);
    const ma25 = calculateMA(chartData, 25);
    const ma99 = calculateMA(chartData, 99);

    const ctx = chartContainerRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartJS(ctx, {
      type: 'candlestick',
      data: {
        datasets: [
          {
            label: `${crypto.symbol}/USDT`,
            data: chartData as any,
            borderColor: {
              up: '#0ecb81',
              down: '#f6465d',
              unchanged: '#848e9c',
            },
            color: {
              up: '#0ecb81',
              down: '#f6465d',
              unchanged: '#848e9c',
            },
            order: 2
          },
          {
            label: 'MA(7)',
            type: 'line',
            data: ma7 as any,
            borderColor: '#f0b90b',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            order: 1
          },
          {
            label: 'MA(25)',
            type: 'line',
            data: ma25 as any,
            borderColor: '#e84142',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            order: 1
          },
          {
            label: 'MA(99)',
            type: 'line',
            data: ma99 as any,
            borderColor: '#2962ff',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            order: 1
          },
          {
            label: 'Volume',
            type: 'bar',
            data: volumeData as any,
            backgroundColor: volumeData.map(v => v.color),
            yAxisID: 'volume',
            order: 3,
            barThickness: 'flex',
            maxBarThickness: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: binanceInterval === '1m' ? 'minute' : binanceInterval === '15m' || binanceInterval === '1h' || binanceInterval === '4h' ? 'hour' : 'day',
            },
            grid: {
              color: '#2b3139',
              drawBorder: false,
            },
            ticks: {
              color: '#848e9c',
              font: {
                size: 11
              }
            }
          },
          y: {
            position: 'right',
            grid: {
              color: '#2b3139',
              drawBorder: false,
            },
            ticks: {
              color: '#848e9c',
              font: {
                size: 11
              }
            }
          },
          volume: {
            type: 'linear',
            position: 'right',
            grid: {
              display: false,
            },
            max: Math.max(...volumeData.map(v => v.y)) * 4,
            ticks: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'start',
            labels: {
              color: '#848e9c',
              font: {
                size: 11
              },
              usePointStyle: true,
              pointStyle: 'line',
              filter: (item) => item.text !== 'Volume'
            }
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: '#1e2329',
            titleColor: '#ffffff',
            bodyColor: '#848e9c',
            borderColor: '#2b3139',
            borderWidth: 1,
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  };

  const fetchInitialData = async () => {
    const ticker = await fetchBinanceTicker(symbol);
    if (ticker) {
      const newPrice = parseFloat(ticker.lastPrice);
      setCurrentPrice(newPrice);
      setPrice(newPrice.toFixed(8));
      setChange24h(parseFloat(ticker.priceChangePercent));
      setHigh24h(parseFloat(ticker.highPrice));
      setLow24h(parseFloat(ticker.lowPrice));
      setVolume24h(parseFloat(ticker.quoteVolume));
      setVolumeBase(parseFloat(ticker.volume));
    }

    fetchOrderBook();
  };

  const fetchOrderBook = async () => {
    const depth = await fetchBinanceDepth(symbol, 20);
    if (depth) {
      setOrderBook(depth);
    }
  };

  const total = parseFloat(amount || '0') * parseFloat(price || '0');

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatVolume = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-[#181a20] text-white flex flex-col">
      <div className="border-[#2b3139]">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-[#848e9c] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Markets</span>
          </button>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto w-full flex-1 pb-12">
        <div className="border-[#2b3139] bg-[#181a20]">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-[#2b3139] p-2 flex items-center justify-center w-12 h-12">
                  <img
                    src={getCryptoLogoUrl(crypto.symbol)}
                    alt={crypto.symbol}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-xl">{crypto.symbol}/USDT</h2>
                  <p className="text-sm">{crypto.name}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-semibold ${change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'} text-3xl`}>
                  ${formatPrice(currentPrice)}
                </div>
                <div className={`text-sm font-medium ${change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'} text-base`}>
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          <div className="border-[#2b3139] px-4 py-3 overflow-x-auto">
            <div className="flex items-center text-xs min-w-max gap-10">
              <div>
                <p className="text-[#848e9c] mb-1">24h Change</p>
                <p className={`font-semibold ${change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {change24h >= 0 ? '+' : ''}{formatPrice(Math.abs(change24h * currentPrice / 100))} {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-[#848e9c] mb-1">24h High</p>
                <p className="text-white font-medium">{formatPrice(high24h)}</p>
              </div>
              <div>
                <p className="text-[#848e9c] mb-1">24h Low</p>
                <p className="text-white font-medium">{formatPrice(low24h)}</p>
              </div>
              <div>
                <p className="text-[#848e9c] mb-1">24h Volume({crypto.symbol})</p>
                <p className="text-white font-medium">{formatVolume(volumeBase)}</p>
              </div>
              <div>
                <p className="text-[#848e9c] mb-1">24h Volume(USDT)</p>
                <p className="text-white font-medium">{formatVolume(volume24h)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-[#2b3139] bg-[#181a20] hidden flex">
          <button
            onClick={() => setChartTab('chart')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${ chartTab === 'chart' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c] hover:text-white' }`}
          >
            Chart
          </button>
          <button
            onClick={() => setChartTab('info')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${ chartTab === 'info' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c] hover:text-white' }`}
          >
            Info
          </button>
          <button
            onClick={() => setChartTab('trading')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${ chartTab === 'trading' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c] hover:text-white' }`}
          >
            Trading Data
          </button>
        </div>

        <div className="border-[#2b3139] bg-[#181a20] flex overflow-x-auto hidden">
          <button
            onClick={() => setMobileTab('chart')}
            className={`flex-1 px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap ${ mobileTab === 'chart' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c]' }`}
          >
            Chart
          </button>
          <button
            onClick={() => setMobileTab('orderbook')}
            className={`flex-1 px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap ${ mobileTab === 'orderbook' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c]' }`}
          >
            Order Book
          </button>
          <button
            onClick={() => setMobileTab('trades')}
            className={`flex-1 px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap ${ mobileTab === 'trades' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c]' }`}
          >
            Trades
          </button>
          <button
            onClick={() => setMobileTab('trade')}
            className={`flex-1 px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap ${ mobileTab === 'trade' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c]' }`}
          >
            Trade
          </button>
        </div>

        <div className="gap-0 hidden grid grid-cols-[280px_1fr_320px] h-[calc(100vh-250px)]">
          <div className="border-[#2b3139] bg-[#181a20] flex flex-col overflow-hidden">
            <div className="p-3 border-[#2b3139] flex-shrink-0">
              <h3 className="font-semibold text-white mb-3">Order Book</h3>
              <div className="flex text-[#848e9c] font-medium">
                <div className="flex-1">Price(USDT)</div>
                <div className="flex-1 text-right">Amount({crypto.symbol})</div>
                <div className="flex-1 text-right">Total</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thumb-[#2b3139]">
              <div className="px-3 pt-2 space-y-0.5">
                {orderBook?.asks.slice(0, 12).reverse().map((ask, i) => {
                  const askPrice = parseFloat(ask[0]);
                  const askAmount = parseFloat(ask[1]);
                  const askTotal = askPrice * askAmount;
                  const percentage = (askAmount / Math.max(...orderBook.asks.map(a => parseFloat(a[1])))) * 100;
                  return (
                    <div key={`ask-${i}`} className="flex text-[11px] font-mono relative group py-0.5 hover:bg-[#2b3139] cursor-pointer">
                      <div className="absolute right-0 top-0 bottom-0 bg-[#f6465d] opacity-[0.08]" style={{ width: `${percentage}%` }}></div>
                      <div className="flex-1 text-[#f6465d] relative z-10 font-medium">{formatPrice(askPrice)}</div>
                      <div className="flex-1 text-white relative z-10">{askAmount.toFixed(6)}</div>
                      <div className="flex-1 text-[#848e9c] relative z-10">{askTotal.toFixed(2)}</div>
                    </div>
                  );
                })}

                <div className="py-2 text-lg font-mono my-1 bg-[#0b0e11]">
                  <span className={change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                    {formatPrice(currentPrice)}
                  </span>
                  <span className="text-[#848e9c] ml-2">≈ ${formatPrice(currentPrice)}</span>
                </div>

                {orderBook?.bids.slice(0, 12).map((bid, i) => {
                  const bidPrice = parseFloat(bid[0]);
                  const bidAmount = parseFloat(bid[1]);
                  const bidTotal = bidPrice * bidAmount;
                  const percentage = (bidAmount / Math.max(...orderBook.bids.map(b => parseFloat(b[1])))) * 100;
                  return (
                    <div key={`bid-${i}`} className="flex text-[11px] font-mono relative group py-0.5 hover:bg-[#2b3139] cursor-pointer">
                      <div className="absolute right-0 top-0 bottom-0 bg-[#0ecb81] opacity-[0.08]" style={{ width: `${percentage}%` }}></div>
                      <div className="flex-1 text-[#0ecb81] relative z-10 font-medium">{formatPrice(bidPrice)}</div>
                      <div className="flex-1 text-white relative z-10">{bidAmount.toFixed(6)}</div>
                      <div className="flex-1 text-[#848e9c] relative z-10">{bidTotal.toFixed(2)}</div>
                    </div>
                  );
                })}

                {!orderBook && (
                  <div className="text-xs py-8">
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#181a20] flex flex-col overflow-hidden">
            <div className="border-[#2b3139] px-4 py-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 border-[#f0b90b]">
                  <button className="px-2 py-1.5 text-white">
                    Chart
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {['1s', '15m', '1H', '4H', '1D', '1W'].map((int) => (
                  <button
                    key={int}
                    onClick={() => setInterval(int)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${ interval === int ? 'bg-[#2b3139] text-[#f0b90b]' : 'text-[#848e9c] hover:text-white' }`}
                  >
                    {int}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-4 bg-[#181a20] min-h-0">
              <canvas ref={chartContainerRef} className="w-full h-full" />
            </div>

            <div className="border-[#2b3139] p-4 flex-shrink-0">
              <div className="flex space-x-2 mb-3">
                <button
                  onClick={() => setOrderMode('spot')}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${ orderMode === 'spot' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c] hover:text-white' }`}
                >
                  Spot
                </button>
                <button
                  onClick={() => setOrderMode('cross')}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${ orderMode === 'cross' ? 'text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-[#848e9c] hover:text-white' }`}
                >
                  Cross
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0b0e11] border border-[#2b3139] rounded p-3">
                  <div className="flex space-x-2 mb-3 border-[#2b3139] pb-2">
                    {['limit', 'market'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setOrderMethod(method as any)}
                        className={`px-2 py-1 text-[10px] font-medium rounded capitalize transition-colors ${ orderMethod === method ? 'bg-[#2b3139] text-white' : 'text-[#848e9c] hover:text-white' }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] mb-1 block">Price</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          disabled={orderMethod === 'market'}
                          className="w-full bg-[#1e2329] border border-[#2b3139] rounded px-2 py-1.5 text-white font-mono focus:border-[#f0b90b] transition-colors disabled:opacity-50"
                          placeholder="0.00"
                        />
                        <span className="absolute right-2 top-1.5 text-[#848e9c]">USDT</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] mb-1 block">Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-[#1e2329] border border-[#2b3139] rounded px-2 py-1.5 text-white font-mono focus:border-[#f0b90b] transition-colors"
                          placeholder="0.00"
                        />
                        <span className="absolute right-2 top-1.5 text-[#848e9c]">{crypto.symbol}</span>
                      </div>
                    </div>

                    <button className="w-full py-2 rounded bg-[#0ecb81] text-xs font-semibold transition-all transform hover:scale-[1.02]">
                      Buy {crypto.symbol}
                    </button>
                  </div>
                </div>

                <div className="bg-[#0b0e11] border border-[#2b3139] rounded p-3">
                  <div className="flex space-x-2 mb-3 border-[#2b3139] pb-2">
                    {['limit', 'market'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setOrderMethod(method as any)}
                        className={`px-2 py-1 text-[10px] font-medium rounded capitalize transition-colors ${ orderMethod === method ? 'bg-[#2b3139] text-white' : 'text-[#848e9c] hover:text-white' }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] mb-1 block">Price</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          disabled={orderMethod === 'market'}
                          className="w-full bg-[#1e2329] border border-[#2b3139] rounded px-2 py-1.5 text-white font-mono focus:border-[#f0b90b] transition-colors disabled:opacity-50"
                          placeholder="0.00"
                        />
                        <span className="absolute right-2 top-1.5 text-[#848e9c]">USDT</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] mb-1 block">Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-[#1e2329] border border-[#2b3139] rounded px-2 py-1.5 text-white font-mono focus:border-[#f0b90b] transition-colors"
                          placeholder="0.00"
                        />
                        <span className="absolute right-2 top-1.5 text-[#848e9c]">{crypto.symbol}</span>
                      </div>
                    </div>

                    <button className="w-full py-2 rounded bg-[#f6465d] text-xs font-semibold transition-all transform hover:scale-[1.02]">
                      Sell {crypto.symbol}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-[#2b3139] bg-[#181a20] flex flex-col overflow-hidden">
            <div className="border-[#2b3139] flex-shrink-0">
              <div className="flex items-center px-3 pt-3 pb-2 gap-2">
                <Star className="w-3.5 h-3.5 text-[#848e9c]" />
                <button className="px-2 py-1 font-medium text-white bg-[#2b3139] rounded hover:bg-[#3b4149]">
                  USDT
                </button>
                <button className="px-2 py-1 font-medium text-[#848e9c] hover:text-white">
                  USDC
                </button>
                <button className="px-2 py-1 font-medium text-[#848e9c] hover:text-white">
                  USD1
                </button>
                <button className="px-2 py-1 font-medium text-[#848e9c] hover:text-white">
                  FDUSD
                </button>
              </div>
              <div className="flex text-[#848e9c] font-medium px-3 pb-2">
                <div className="flex-1">Pair</div>
                <div className="flex-1 text-right">Price</div>
                <div className="flex-1 text-right">Change</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thumb-[#2b3139]">
              <div className="px-2 pt-1">
                {topPairs.map((pair, index) => {
                  const pairData = pairPrices[pair.pair];
                  const isIncreasing = pairData && pairData.prevPrice && pairData.price > pairData.prevPrice;
                  const isDecreasing = pairData && pairData.prevPrice && pairData.price < pairData.prevPrice;

                  return (
                    <div
                      key={pair.pair}
                      className="flex items-center text-[11px] py-2.5 hover:bg-[#2b3139] cursor-pointer rounded px-2 transition-colors"
                    >
                      <div className="flex items-center flex-1 space-x-2">
                        <div className="relative">
                          <img
                            src={getCryptoLogoUrl(pair.symbol)}
                            alt={pair.symbol}
                            className="w-6 h-6 rounded-full bg-[#0b0e11] p-0.5"
                          />
                          {index === 0 && (
                            <span className="absolute -top-1 -right-1 bg-[#f0b90b] text-[8px] font-bold px-1 rounded">
                              1
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1">
                            <span className="text-white font-medium">{pair.symbol}</span>
                            <span className="text-[10px]">/USDT</span>
                          </div>
                          <span className="text-[9px]">5x</span>
                        </div>
                      </div>
                      <div className={`flex-1 text-right font-mono transition-colors duration-300 ${ isIncreasing ? 'text-[#0ecb81]' : isDecreasing ? 'text-[#f6465d]' : 'text-white' }`}>
                        {pairData ? formatPrice(pairData.price) : '...'}
                      </div>
                      <div className={`flex-1 text-right font-semibold ${ pairData && pairData.change >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]' }`}>
                        {pairData ? `${pairData.change >= 0 ? '+' : ''}${pairData.change.toFixed(2)}%` : '...'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-[#2b3139] flex-shrink-0">
              <div className="h-[180px] overflow-y-auto scrollbar-thumb-[#2b3139]">
                <div className="p-3">
                  <h4 className="font-semibold text-white mb-2">Recent Trades</h4>
                  <div className="flex text-[#848e9c] mb-2 font-medium">
                    <div className="flex-1">Price</div>
                    <div className="flex-1 text-right">Amount</div>
                    <div className="flex-1 text-right">Time</div>
                  </div>
                  {recentTrades.slice(0, 20).map((trade, i) => (
                    <div key={i} className="flex text-[11px] font-mono py-0.5">
                      <div className={`flex-1 font-medium ${trade.isBuy ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {formatPrice(trade.price)}
                      </div>
                      <div className="flex-1 text-white">{trade.amount.toFixed(3)}</div>
                      <div className="flex-1 text-[10px]">{trade.time.slice(-8)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {mobileTab === 'chart' && (
          <div className="p-4 h-[400px] hidden">
            <div className="flex items-center space-x-1 mb-3 overflow-x-auto">
              {['1s', '15m', '1H', '4H', '1D', '1W'].map((int) => (
                <button
                  key={int}
                  onClick={() => setInterval(int)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${ interval === int ? 'bg-[#2b3139] text-[#f0b90b]' : 'text-[#848e9c]' }`}
                >
                  {int}
                </button>
              ))}
            </div>
            <canvas ref={chartContainerRef} className="w-full h-full" />
          </div>
        )}

        {mobileTab === 'orderbook' && (
          <div className="p-4 h-[600px] overflow-y-auto hidden">
            <h3 className="font-semibold text-white mb-3">Order Book</h3>
            <div className="flex text-[#848e9c] font-medium mb-2">
              <div className="flex-1">Price(USDT)</div>
              <div className="flex-1 text-right">Amount</div>
              <div className="flex-1 text-right">Total</div>
            </div>

            <div className="space-y-1 mb-4">
              {orderBook?.asks.slice(0, 8).reverse().map((ask, i) => {
                const askPrice = parseFloat(ask[0]);
                const askAmount = parseFloat(ask[1]);
                const askTotal = askPrice * askAmount;
                return (
                  <div key={`ask-${i}`} className="flex text-xs font-mono py-1">
                    <div className="flex-1 text-[#f6465d] font-medium">{formatPrice(askPrice)}</div>
                    <div className="flex-1 text-white">{askAmount.toFixed(4)}</div>
                    <div className="flex-1 text-[#848e9c]">{askTotal.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>

            <div className="py-3 text-xl font-mono mb-4 bg-[#0b0e11] rounded">
              <span className={change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                {formatPrice(currentPrice)}
              </span>
            </div>

            <div className="space-y-1">
              {orderBook?.bids.slice(0, 8).map((bid, i) => {
                const bidPrice = parseFloat(bid[0]);
                const bidAmount = parseFloat(bid[1]);
                const bidTotal = bidPrice * bidAmount;
                return (
                  <div key={`bid-${i}`} className="flex text-xs font-mono py-1">
                    <div className="flex-1 text-[#0ecb81] font-medium">{formatPrice(bidPrice)}</div>
                    <div className="flex-1 text-white">{bidAmount.toFixed(4)}</div>
                    <div className="flex-1 text-[#848e9c]">{bidTotal.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mobileTab === 'trades' && (
          <div className="p-4 h-[600px] overflow-y-auto hidden">
            <h3 className="font-semibold text-white mb-3">Recent Trades</h3>
            <div className="flex text-[#848e9c] font-medium mb-2">
              <div className="flex-1">Price(USDT)</div>
              <div className="flex-1 text-right">Amount</div>
              <div className="flex-1 text-right">Time</div>
            </div>
            {recentTrades.slice(0, 50).map((trade, i) => (
              <div key={i} className="flex text-xs font-mono py-1.5 border-[#2b3139]">
                <div className={`flex-1 font-medium ${trade.isBuy ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {formatPrice(trade.price)}
                </div>
                <div className="flex-1 text-white">{trade.amount.toFixed(4)}</div>
                <div className="flex-1 text-[11px]">{trade.time.slice(-8)}</div>
              </div>
            ))}
          </div>
        )}

        {mobileTab === 'trade' && (
          <div className="p-4 pb-20 hidden">
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setOrderMode('spot')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${ orderMode === 'spot' ? 'bg-[#2b3139] text-[#f0b90b]' : 'text-[#848e9c]' }`}
              >
                Spot
              </button>
              <button
                onClick={() => setOrderMode('cross')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${ orderMode === 'cross' ? 'bg-[#2b3139] text-[#f0b90b]' : 'text-[#848e9c]' }`}
              >
                Cross
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0b0e11] border border-[#2b3139] rounded-lg p-4">
                <div className="flex space-x-2 mb-4">
                  {['limit', 'market'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setOrderMethod(method as any)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded capitalize transition-colors ${ orderMethod === method ? 'bg-[#2b3139] text-white' : 'text-[#848e9c]' }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm mb-2 block">Price</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        disabled={orderMethod === 'market'}
                        className="w-full bg-[#1e2329] border border-[#2b3139] rounded-lg px-4 py-3 text-white font-mono focus:border-[#f0b90b] transition-colors disabled:opacity-50"
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-3 text-[#848e9c]">USDT</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm mb-2 block">Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-[#1e2329] border border-[#2b3139] rounded-lg px-4 py-3 text-white font-mono focus:border-[#f0b90b] transition-colors"
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-3 text-[#848e9c]">{crypto.symbol}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {['25%', '50%', '75%', '100%'].map((percent) => (
                      <button
                        key={percent}
                        className="flex-1 py-2 bg-[#1e2329] hover:bg-[#2b3139] rounded transition-colors text-[#848e9c]"
                      >
                        {percent}
                      </button>
                    ))}
                  </div>

                  <div className="pt-3 border-[#2b3139]">
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-[#848e9c]">Total</span>
                      <span className="text-white font-mono">{total.toFixed(2)} USDT</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button className="w-full py-3 rounded-lg bg-[#0ecb81] hover:bg-[#0bb871] text-sm font-semibold transition-all">
                      Buy
                    </button>
                    <button className="w-full py-3 rounded-lg bg-[#f6465d] hover:bg-[#e1374d] text-sm font-semibold transition-all">
                      Sell
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            background-color: rgba(240, 185, 11, 0.1);
          }
          to {
            opacity: 1;
            background-color: transparent;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #2b3139;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #3d4450;
        }
      `}</style>
    </div>
  );
}

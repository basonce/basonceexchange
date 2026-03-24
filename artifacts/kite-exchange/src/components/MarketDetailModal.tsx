import { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import TradingView from './TradingView';
import { supabase } from '../lib/supabase';
import { useAccount } from 'wagmi';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { BNCPriceManager } from '../lib/bnc-price';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';

interface Market {
  symbol: string;
  name: string;
  fullName: string;
  price: number;
  change24h: number;
  marketCap: number;
  logo: string;
  priceChange?: number;
  isEarnQuest?: boolean;
}

interface MarketDetailModalProps {
  market: Market | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'buy' | 'sell';
}

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface Trade {
  price: number;
  amount: number;
  time: string;
  isBuy: boolean;
}

export default function MarketDetailModal({ market, isOpen, onClose, initialTab = 'buy' }: MarketDetailModalProps) {
  const { address } = useAccount();
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({
    bids: [],
    asks: []
  });
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState({
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    bid: 0,
    ask: 0
  });
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>(initialTab);
  const [amount, setAmount] = useState('');
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const updateIntervalRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      setTradeTab(initialTab);
      setAmount('');
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen || !market) return;

    generateOrderBook();
    generateRecentTrades();
    updateStats();
    fetchBalances();

    updateIntervalRef.current = window.setInterval(() => {
      generateOrderBook();
      updateStats();
    }, 2000);

    const tradesInterval = window.setInterval(() => {
      addNewTrade();
    }, 3000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      clearInterval(tradesInterval);
    };
  }, [isOpen, market, address]);

  const fetchBalances = async () => {
    if (!address || !market) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data: balances } = await supabase
        .from('user_balances')
        .select('coin_symbol, balance')
        .eq('user_id', session.session.user.id)
        .in('coin_symbol', ['USDT', market.symbol]);

      if (balances) {
        const usdtBal = balances.find(b => b.coin_symbol === 'USDT');
        const coinBal = balances.find(b => b.coin_symbol === market.symbol);
        setUsdtBalance(usdtBal?.balance || 0);
        setCoinBalance(coinBal?.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const handleTrade = async () => {
    if (!market || !address || !amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        alert('Please sign in to trade');
        setLoading(false);
        return;
      }

      const tradeAmount = parseFloat(amount);
      const totalUsdt = tradeAmount * market.price;

      if (tradeTab === 'buy') {
        if (totalUsdt > usdtBalance) {
          alert('Insufficient USDT balance');
          setLoading(false);
          return;
        }

        const { error } = await supabase.rpc('execute_spot_trade', {
          p_user_id: session.session.user.id,
          p_coin_symbol: market.symbol,
          p_amount: tradeAmount,
          p_price: market.price,
          p_side: 'buy'
        });

        if (error) throw error;
        alert(`Successfully bought ${tradeAmount} ${market.symbol}!`);
      } else {
        if (tradeAmount > coinBalance) {
          alert(`Insufficient ${market.symbol} balance`);
          setLoading(false);
          return;
        }

        const { error } = await supabase.rpc('execute_spot_trade', {
          p_user_id: session.session.user.id,
          p_coin_symbol: market.symbol,
          p_amount: tradeAmount,
          p_price: market.price,
          p_side: 'sell'
        });

        if (error) throw error;
        alert(`Successfully sold ${tradeAmount} ${market.symbol}!`);
      }

      setAmount('');
      fetchBalances();
    } catch (error: any) {
      console.error('Trade error:', error);
      alert(error.message || 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  const generateOrderBook = () => {
    if (!market) return;

    const basePrice = market.price;
    const spread = basePrice * 0.001;

    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];

    for (let i = 0; i < 15; i++) {
      const bidPrice = basePrice - spread - (i * spread * 0.2);
      const bidAmount = (Math.random() * 5 + 1) * (1 - i * 0.05);
      bids.push({
        price: bidPrice,
        amount: bidAmount,
        total: bidPrice * bidAmount
      });

      const askPrice = basePrice + spread + (i * spread * 0.2);
      const askAmount = (Math.random() * 5 + 1) * (1 - i * 0.05);
      asks.push({
        price: askPrice,
        amount: askAmount,
        total: askPrice * askAmount
      });
    }

    setOrderBook({ bids, asks });
  };

  const generateRecentTrades = () => {
    if (!market) return;

    const trades: Trade[] = [];
    const now = Date.now();

    for (let i = 0; i < 20; i++) {
      const isBuy = Math.random() > 0.5;
      const priceVariation = market.price * (Math.random() * 0.002 - 0.001);
      trades.push({
        price: market.price + priceVariation,
        amount: Math.random() * 2 + 0.1,
        time: new Date(now - i * 5000).toLocaleTimeString(),
        isBuy
      });
    }

    setRecentTrades(trades);
  };

  const addNewTrade = () => {
    if (!market) return;

    const isBuy = Math.random() > 0.5;
    const priceVariation = market.price * (Math.random() * 0.002 - 0.001);
    const newTrade: Trade = {
      price: market.price + priceVariation,
      amount: Math.random() * 2 + 0.1,
      time: new Date().toLocaleTimeString(),
      isBuy
    };

    setRecentTrades(prev => [newTrade, ...prev.slice(0, 19)]);
  };

  const getIndepMgrForSymbol = (symbol: string) => {
    switch (symbol) {
      case 'EQ': return EarnQuestPriceManager.getInstance();
      case 'BNC': return BNCPriceManager.getInstance();
      case 'PAYAI': return PayAIPriceManager.getInstance();
      case 'SGP': return SGPPriceManager.getInstance();
      case 'POWERAI': return PowerAIPriceManager.getInstance();
      case 'SZNP': return SZNPPriceManager.getInstance();
      case 'PUNCH': return PunchPriceManager.getInstance();
      default: return null;
    }
  };

  const updateStats = () => {
    if (!market) return;
    const price = market.price;
    const mgr = getIndepMgrForSymbol(market.symbol);
    let high24h: number, low24h: number;
    if (mgr) {
      const storedHigh = mgr.getHigh24h();
      const storedLow = mgr.getLow24h();
      high24h = (storedHigh > 0 && storedHigh >= price * 0.95 && storedHigh <= price * 1.5)
        ? storedHigh : price * 1.02;
      low24h = (storedLow > 0 && storedLow < price)
        ? storedLow : price * 0.98;
    } else {
      high24h = price * 1.05;
      low24h = price * 0.95;
    }
    setStats({
      high24h,
      low24h,
      volume24h: market.marketCap * 0.15,
      bid: price * 0.9998,
      ask: price * 1.0002
    });
  };

  const formatPrice = (price: number) => {
    if (!market) return '0';
    return price.toFixed(market.price < 1 ? 6 : market.price < 100 ? 4 : 2);
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(4);
  };

  if (!isOpen || !market) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#181A20] rounded-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2B3139] flex items-center justify-center overflow-hidden">
              <img
                src={market.logo}
                alt={market.symbol}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="font-bold text-white">{market.symbol}/USDT</h2>
              <p className="text-gray-400">{market.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-[#181A20] rounded-lg p-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-bold text-white">
                ${formatPrice(market.price)}
              </span>
              <span className={`text-sm font-semibold flex items-center gap-1 ${ market.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]' }`}>
                {market.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <div className="text-xs mb-1">24h High</div>
                <div className="font-medium text-sm">${formatPrice(stats.high24h)}</div>
              </div>
              <div>
                <div className="text-xs mb-1">24h Low</div>
                <div className="font-medium text-sm">${formatPrice(stats.low24h)}</div>
              </div>
              <div>
                <div className="text-xs mb-1">24h Volume</div>
                <div className="font-medium text-sm">${(stats.volume24h / 1000000).toFixed(2)}M</div>
              </div>
              <div>
                <div className="text-xs mb-1">Market Cap</div>
                <div className="font-medium text-sm">${(market.marketCap / 1000000).toFixed(2)}M</div>
              </div>
            </div>
          </div>

          <div className="bg-[#181A20] rounded-lg overflow-hidden h-[300px]">
            <TradingView symbol={`${market.symbol}USDT`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#181A20] rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-3 flex items-center justify-between">
                <span>Order Book</span>
                <span className="text-xs">Bid/Ask</span>
              </h3>

              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Price (USDT)</span>
                  <span>Amount</span>
                </div>
                {orderBook.asks.slice(0, 5).reverse().map((ask, i) => (
                  <div key={`ask-${i}`} className="flex justify-between text-[11px]">
                    <span className="text-[#F6465D] font-mono">{formatPrice(ask.price)}</span>
                    <span className="text-white font-mono">{formatAmount(ask.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="border-[#2B3139] my-2"></div>

              <div className="space-y-1">
                {orderBook.bids.slice(0, 5).map((bid, i) => (
                  <div key={`bid-${i}`} className="flex justify-between text-[11px]">
                    <span className="text-[#0ECB81] font-mono">{formatPrice(bid.price)}</span>
                    <span className="text-white font-mono">{formatAmount(bid.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#181A20] rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-3">Recent Trades</h3>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Price (USDT)</span>
                  <span>Amount</span>
                </div>
                {recentTrades.slice(0, 15).map((trade, i) => (
                  <div key={i} className="flex justify-between text-[11px] items-center">
                    <span className={`font-mono flex items-center gap-1 ${ trade.isBuy ? 'text-[#0ECB81]' : 'text-[#F6465D]' }`}>
                      {trade.isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {formatPrice(trade.price)}
                    </span>
                    <span className="text-white font-mono">{formatAmount(trade.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#181A20] rounded-lg p-4 sticky bottom-0">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTradeTab('buy')}
                className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${ tradeTab === 'buy' ? 'bg-[#0ECB81] text-white' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeTab('sell')}
                className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${ tradeTab === 'sell' ? 'bg-[#F6465D] text-white' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
              >
                Sell
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-gray-400">
                <span>Available Balance</span>
                <span className="flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  {tradeTab === 'buy'
                    ? `${usdtBalance.toFixed(2)} USDT`
                    : `${coinBalance.toFixed(4)} ${market.symbol}`
                  }
                </span>
              </div>

              <div>
                <label className="text-gray-400 mb-1 block">
                  Amount ({market.symbol})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#2B3139] px-3 py-2.5 rounded text-sm outline-none focus:ring-[#F0B90B]"
                />
              </div>

              {amount && parseFloat(amount) > 0 && (
                <div className="bg-[#2B3139] rounded p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Price</span>
                    <span className="text-white">${market.price.toFixed(market.price < 1 ? 6 : 4)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Total</span>
                    <span className="text-white font-semibold">
                      {(parseFloat(amount) * market.price).toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleTrade}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${ tradeTab === 'buy' ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white' : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white' } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : `${tradeTab === 'buy' ? 'Buy' : 'Sell'} ${market.symbol}`}
              </button>

              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percentage) => (
                  <button
                    key={percentage}
                    onClick={() => {
                      if (tradeTab === 'buy') {
                        const maxAmount = (usdtBalance * percentage / 100) / market.price;
                        setAmount(maxAmount.toFixed(6));
                      } else {
                        const maxAmount = coinBalance * percentage / 100;
                        setAmount(maxAmount.toFixed(6));
                      }
                    }}
                    className="bg-[#2B3139] hover:text-white py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    {percentage}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

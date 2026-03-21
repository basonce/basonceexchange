import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Zap, AlertTriangle } from 'lucide-react';
import type { AlphaToken } from '../../types/alpha';

interface Props {
  token: AlphaToken;
  onTrade: (type: 'buy' | 'sell', amount: number) => void;
}

const QUICK_AMOUNTS_BNC = [1, 5, 10, 50, 100];
const QUICK_AMOUNTS_ETH = [0.005, 0.01, 0.05, 0.1, 0.5];
const QUICK_AMOUNTS_SOL = [0.5, 1, 5, 10, 50];

export default function AlphaTradingPanel({ token, onTrade }: Props) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);

  const quickAmounts = token.raised_token === 'SOL'
    ? QUICK_AMOUNTS_SOL
    : token.raised_token === 'ETH'
      ? QUICK_AMOUNTS_ETH
      : QUICK_AMOUNTS_BNC;

  const numAmount = parseFloat(amount) || 0;
  const tokensReceived = numAmount > 0 && token.current_price > 0
    ? numAmount / token.current_price
    : 0;

  const priceImpact = numAmount > 0
    ? Math.min((numAmount / Math.max(token.liquidity * 0.001, 1)) * 100, 99)
    : 0;

  const handleSlider = (val: number) => {
    setSliderValue(val);
    const maxAmount = quickAmounts[quickAmounts.length - 1];
    setAmount((maxAmount * val / 100).toFixed(token.raised_token === 'ETH' ? 4 : 2));
  };

  const handleTrade = () => {
    if (numAmount <= 0) return;
    onTrade(side, numAmount);
    setAmount('');
    setSliderValue(0);
  };

  return (
    <div className="bg-[#181A20] rounded-xl border border-[#2B3139]/50 overflow-hidden">
      <div className="flex">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-3 text-center text-sm font-bold transition-all ${
            side === 'buy'
              ? 'bg-[#0ECB81] text-white'
              : 'bg-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 inline mr-1" />
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-3 text-center text-sm font-bold transition-all ${
            side === 'sell'
              ? 'bg-[#F6465D] text-white'
              : 'bg-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <ArrowDownRight className="w-4 h-4 inline mr-1" />
          Sell
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-gray-500 text-xs">Amount ({token.raised_token})</span>
            <span className="text-gray-600 text-[10px]">Balance: 0.00 {token.raised_token}</span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={e => {
                setAmount(e.target.value);
                setSliderValue(0);
              }}
              placeholder="0.00"
              step="0.001"
              className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-700 pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">
              {token.raised_token}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {quickAmounts.map(qa => (
            <button
              key={qa}
              onClick={() => {
                setAmount(qa.toString());
                setSliderValue(0);
              }}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                amount === qa.toString()
                  ? side === 'buy' ? 'bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/30' : 'bg-[#F6465D]/20 text-[#F6465D] border border-[#F6465D]/30'
                  : 'bg-[#0B0E11] text-gray-500 border border-[#2B3139] hover:border-[#2B3139]/80'
              }`}
            >
              {qa} {token.raised_token}
            </button>
          ))}
        </div>

        <div className="pt-1">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={e => handleSlider(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${side === 'buy' ? '#0ECB81' : '#F6465D'} ${sliderValue}%, #2B3139 ${sliderValue}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            {[0, 25, 50, 75, 100].map(v => (
              <button
                key={v}
                onClick={() => handleSlider(v)}
                className={`text-[9px] font-bold transition-colors ${
                  sliderValue >= v ? (side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]') : 'text-gray-600'
                }`}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>

        {numAmount > 0 && (
          <div className="bg-[#0B0E11] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[11px]">You {side === 'buy' ? 'receive' : 'get'}</span>
              <span className="text-white text-xs font-bold">
                {side === 'buy'
                  ? `~${tokensReceived > 1000000 ? (tokensReceived / 1000000).toFixed(2) + 'M' : tokensReceived > 1000 ? (tokensReceived / 1000).toFixed(2) + 'K' : tokensReceived.toFixed(2)} ${token.symbol}`
                  : `${numAmount} ${token.raised_token}`
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[11px]">Price</span>
              <span className="text-white text-xs font-bold">
                ${token.current_price < 0.01 ? token.current_price.toFixed(8) : token.current_price.toFixed(6)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[11px]">Price Impact</span>
              <span className={`text-xs font-bold ${priceImpact > 5 ? 'text-[#F6465D]' : priceImpact > 2 ? 'text-[#F0B90B]' : 'text-[#0ECB81]'}`}>
                ~{priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[11px]">Fee</span>
              <span className="text-gray-400 text-xs font-bold">1%</span>
            </div>
          </div>
        )}

        {priceImpact > 10 && numAmount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#F6465D]/10 border border-[#F6465D]/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-[#F6465D] flex-shrink-0" />
            <span className="text-[#F6465D] text-[11px] font-medium">High price impact! Consider reducing your order size.</span>
          </div>
        )}

        <button
          onClick={handleTrade}
          disabled={numAmount <= 0}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
            numAmount > 0
              ? side === 'buy'
                ? 'bg-[#0ECB81] text-white shadow-lg shadow-[#0ECB81]/20'
                : 'bg-[#F6465D] text-white shadow-lg shadow-[#F6465D]/20'
              : 'bg-[#2B3139] text-gray-600 cursor-not-allowed'
          }`}
        >
          <Zap className="w-4 h-4" />
          {numAmount > 0
            ? `${side === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`
            : 'Enter Amount'
          }
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Calculator, X } from 'lucide-react';

interface PnLCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  symbol: string;
}

export default function PnLCalculator({ isOpen, onClose, currentPrice, symbol }: PnLCalculatorProps) {
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState(currentPrice.toString());
  const [exitPrice, setExitPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState('20');

  const calculatePnL = () => {
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const qty = parseFloat(amount);
    const lev = parseFloat(leverage);

    if (!entry || !exit || !qty || !lev) return null;

    const positionSize = qty * lev;
    let pnl = 0;

    if (side === 'long') {
      pnl = ((exit - entry) / entry) * positionSize;
    } else {
      pnl = ((entry - exit) / entry) * positionSize;
    }

    const roi = (pnl / qty) * 100;
    const liquidationPrice = side === 'long'
      ? entry * (1 - (1 / lev))
      : entry * (1 + (1 / lev));

    return { pnl, roi, liquidationPrice };
  };

  const result = calculatePnL();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#181A20] rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-[#2B3139]">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#F0B90B]" />
            <h2 className="text-white font-semibold">PnL Calculator</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs mb-2 block">Position Side</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSide('long')}
                className={`flex-1 py-2 rounded text-sm font-medium ${ side === 'long' ? 'bg-[#0ECB81] text-white' : 'bg-[#2B3139] text-gray-400' }`}
              >
                Long
              </button>
              <button
                onClick={() => setSide('short')}
                className={`flex-1 py-2 rounded text-sm font-medium ${ side === 'short' ? 'bg-[#F6465D] text-white' : 'bg-[#2B3139] text-gray-400' }`}
              >
                Short
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block">Entry Price</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full bg-[#2B3139] rounded px-3 py-2 text-sm focus:ring-[#F0B90B]"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-xs mb-1 block">Exit Price</label>
              <input
                type="number"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="w-full bg-[#2B3139] rounded px-3 py-2 text-sm focus:ring-[#F0B90B]"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block">Amount (USDT)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#2B3139] rounded px-3 py-2 text-sm focus:ring-[#F0B90B]"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-xs mb-1 block">Leverage</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="w-full bg-[#2B3139] rounded px-3 py-2 text-sm focus:ring-[#F0B90B]"
                placeholder="20"
              />
            </div>
          </div>

          {result && (
            <div className="bg-[#2B3139] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs">Estimated PnL</span>
                <span className={`text-lg font-bold ${result.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {result.pnl >= 0 ? '+' : ''}{result.pnl.toFixed(2)} USDT
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">ROI</span>
                <span className={`text-base font-semibold ${result.roi >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">Liquidation Price</span>
                <span className="text-sm font-medium">
                  {result.liquidationPrice.toFixed(2)} USDT
                </span>
              </div>
            </div>
          )}

          <div className="bg-[#2B3139] rounded p-3">
            <div className="text-[10px] leading-relaxed">
              <p className="mb-1">• Entry/Exit Price: The price at which you open/close the position</p>
              <p className="mb-1">• Amount: Your margin investment in USDT</p>
              <p className="mb-1">• Leverage: Multiplier for your position size</p>
              <p>• PnL is calculated excluding fees</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

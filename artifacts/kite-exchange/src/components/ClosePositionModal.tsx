import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { calculateTradingFee } from '../lib/futures-calculator';
import { formatPrice } from '../lib/format-utils';

interface Position {
  id: string;
  symbol: string;
  side: string;
  position_size: number;
  entry_price: number;
  leverage: number;
  margin: number;
  liquidation_price: number;
  unrealized_pnl: number;
}

interface ClosePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: Position;
  currentPrice: number;
  onConfirm: (closeType: 'market' | 'limit', price?: number, percentage?: number) => void;
}

export default function ClosePositionModal({
  isOpen,
  onClose,
  position,
  currentPrice,
  onConfirm,
}: ClosePositionModalProps) {
  const [closeType, setCloseType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState(currentPrice.toString());
  const [closePercentage, setClosePercentage] = useState(100);

  if (!isOpen) return null;

  const positionSide = position.side.toLowerCase();
  const quantity = position.position_size / position.entry_price;
  const closePrice = closeType === 'market' ? currentPrice : parseFloat(limitPrice) || currentPrice;

  const priceDiff = positionSide === 'long'
    ? (closePrice - position.entry_price)
    : (position.entry_price - closePrice);

  const grossPnl = priceDiff * quantity * (closePercentage / 100);
  const closeFee = calculateTradingFee(position.position_size * (closePercentage / 100), false);
  const netPnl = grossPnl - closeFee;
  const pnlPercentage = (netPnl / position.margin) * 100;

  const handleConfirm = () => {
    onConfirm(closeType, closeType === 'limit' ? parseFloat(limitPrice) : undefined, closePercentage);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-[#181A20] rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-[#2B3139]">
          <h3 className="text-white font-semibold">Close Position</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-[#2B3139] rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded text-xs font-semibold ${ positionSide === 'long' ? 'bg-[#0ECB81] text-black' : 'bg-[#F6465D] text-white' }`}>
                  {positionSide === 'long' ? 'Long' : 'Short'}
                </div>
                <span className="text-white font-semibold">{position.symbol}</span>
                <span className="text-xs">{position.leverage}x</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-400">Size</div>
                <div className="text-white font-medium">{position.position_size.toFixed(2)} USDT</div>
              </div>
              <div>
                <div className="text-gray-400">Entry Price</div>
                <div className="text-white font-medium">{formatPrice(position.entry_price)}</div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCloseType('market')}
                className={`flex-1 py-2 rounded font-medium text-sm transition-colors ${ closeType === 'market' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-white hover:bg-[#363D47]' }`}
              >
                Market
              </button>
              <button
                onClick={() => setCloseType('limit')}
                className={`flex-1 py-2 rounded font-medium text-sm transition-colors ${ closeType === 'limit' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-white hover:bg-[#363D47]' }`}
              >
                Limit
              </button>
            </div>

            {closeType === 'limit' && (
              <div className="mb-3">
                <label className="text-xs mb-1 block">Limit Price (USDT)</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-[#2B3139] text-white px-3 py-2 rounded outline-none focus:ring-[#F0B90B]"
                  step="0.01"
                />
              </div>
            )}

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs">Close Amount</label>
                <span className="text-xs font-medium">{closePercentage}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={closePercentage}
                onChange={(e) => setClosePercentage(parseInt(e.target.value))}
                className="w-full h-2 bg-[#2B3139] rounded-lg appearance-none cursor-pointer accent-[#F0B90B]"
              />
              <div className="flex gap-1 mt-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setClosePercentage(pct)}
                    className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${ closePercentage === pct ? 'bg-[#F0B90B]/20 text-[#F0B90B]' : 'bg-[#2B3139] text-gray-400 hover:text-white' }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#2B3139] rounded-lg p-3 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Close Price</span>
              <span className="text-white font-medium">{formatPrice(closePrice)} USDT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Size PNL</span>
              <span className={`font-medium ${grossPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {grossPnl >= 0 ? '+' : ''}{grossPnl.toFixed(2)} USDT
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Est. Fees</span>
              <span className="text-white">{closeFee.toFixed(2)} USDT</span>
            </div>
            <div className="h-px bg-[#363D47]"></div>
            <div className="flex justify-between">
              <span className="text-sm">Net PNL</span>
              <div className="text-right">
                <div className={`font-semibold ${netPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {netPnl >= 0 ? '+' : ''}{netPnl.toFixed(2)} USDT
                </div>
                <div className={`text-xs ${netPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  ({netPnl >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>

          {closeType === 'limit' && (
            <div className="bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F0B90B] flex-shrink-0 mt-0.5" />
              <div className="text-[#F0B90B]">
                Limit orders will be placed and executed when the market reaches your specified price.
              </div>
            </div>
          )}

          <button
            onClick={handleConfirm}
            className={`w-full py-3 rounded font-semibold transition-colors ${ positionSide === 'long' ? 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white' : 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black' }`}
          >
            Confirm Close {closePercentage < 100 ? `(${closePercentage}%)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

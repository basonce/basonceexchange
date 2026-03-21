import { useState } from 'react';
import { Minus, Plus, ChevronDown } from 'lucide-react';

interface FuturesPriceSelectorProps {
  price: string;
  onPriceChange: (price: string) => void;
  currentPrice: number;
  orderType: 'limit' | 'market' | 'bbo';
  onOrderTypeChange: (type: 'limit' | 'market' | 'bbo') => void;
}

export default function FuturesPriceSelector({
  price,
  onPriceChange,
  currentPrice,
  orderType,
  onOrderTypeChange
}: FuturesPriceSelectorProps) {
  const [showTypeModal, setShowTypeModal] = useState(false);

  const incrementPrice = () => {
    const numPrice = parseFloat(price) || currentPrice;
    const increment = numPrice > 100 ? 0.01 : 0.0001;
    onPriceChange((numPrice + increment).toFixed(numPrice > 100 ? 2 : 4));
  };

  const decrementPrice = () => {
    const numPrice = parseFloat(price) || currentPrice;
    const decrement = numPrice > 100 ? 0.01 : 0.0001;
    const newPrice = Math.max(0, numPrice - decrement);
    onPriceChange(newPrice.toFixed(numPrice > 100 ? 2 : 4));
  };

  return (
    <>
      <div className="mb-3">
        <label className="text-gray-400 mb-1.5 block">Price (USDT)</label>
        <div className="flex items-center gap-2">
          <button
            onClick={decrementPrice}
            className="w-8 h-8 bg-[#2B3139] hover:bg-[#3B4149] rounded flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4 text-white" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              className="w-full bg-[#2B3139] border-none rounded px-3 py-2 text-sm focus:ring-[#F0B90B]"
              placeholder="0.00"
            />
          </div>

          <button
            onClick={incrementPrice}
            className="w-8 h-8 bg-[#2B3139] hover:bg-[#3B4149] rounded flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={() => setShowTypeModal(true)}
            className="px-3 py-2 bg-[#2B3139] hover:bg-[#3B4149] rounded text-xs font-medium flex items-center gap-1 transition-colors"
          >
            {orderType === 'bbo' ? 'BBO' : orderType === 'market' ? 'Market' : 'Limit'}
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {orderType === 'market' && (
          <div className="mt-1.5 text-gray-400">
            Market price
          </div>
        )}
      </div>

      {showTypeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowTypeModal(false)}>
          <div className="bg-[#181A20] w-full rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-[#474D57] rounded-full mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-4">Order Type</h3>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onOrderTypeChange('limit');
                  setShowTypeModal(false);
                }}
                className={`w-full text-left px-4 py-3 rounded ${ orderType === 'limit' ? 'bg-[#2B3139]' : 'bg-transparent hover:bg-[#2B3139]' } transition-colors`}
              >
                <div className="text-sm font-medium">Limit</div>
                <div className="text-xs mt-0.5">Set your own price</div>
              </button>

              <button
                onClick={() => {
                  onOrderTypeChange('market');
                  onPriceChange(currentPrice.toFixed(2));
                  setShowTypeModal(false);
                }}
                className={`w-full text-left px-4 py-3 rounded ${ orderType === 'market' ? 'bg-[#2B3139]' : 'bg-transparent hover:bg-[#2B3139]' } transition-colors`}
              >
                <div className="text-sm font-medium">Market</div>
                <div className="text-xs mt-0.5">Execute at current market price</div>
              </button>

              <button
                onClick={() => {
                  onOrderTypeChange('bbo');
                  setShowTypeModal(false);
                }}
                className={`w-full text-left px-4 py-3 rounded ${ orderType === 'bbo' ? 'bg-[#2B3139]' : 'bg-transparent hover:bg-[#2B3139]' } transition-colors`}
              >
                <div className="text-sm font-medium">BBO</div>
                <div className="text-xs mt-0.5">Best Bid and Offer</div>
              </button>
            </div>

            <button
              onClick={() => setShowTypeModal(false)}
              className="w-full mt-4 py-3 bg-[#2B3139] hover:bg-[#3B4149] rounded text-white font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { formatPrice } from '../lib/format-utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  side: 'buy' | 'sell';
  leverage: number;
  onPlaceOrder: (orderData: any) => Promise<void>;
}

type OrderType = 'trailing-stop' | 'conditional';

export default function FuturesAdvancedOrders({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  side,
  leverage,
  onPlaceOrder
}: Props) {
  const [orderType, setOrderType] = useState<OrderType>('trailing-stop');
  const [activationPrice, setActivationPrice] = useState('');
  const [callbackRate, setCallbackRate] = useState('1.0');
  const [amount, setAmount] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderMethod, setOrderMethod] = useState<'limit' | 'market'>('market');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      const orderData = {
        type: orderType,
        side,
        amount: parseFloat(amount),
        activationPrice: orderType === 'trailing-stop' ? parseFloat(activationPrice) : undefined,
        callbackRate: orderType === 'trailing-stop' ? parseFloat(callbackRate) : undefined,
        triggerPrice: orderType === 'conditional' ? parseFloat(triggerPrice) : undefined,
        orderPrice: orderType === 'conditional' && orderMethod === 'limit' ? parseFloat(orderPrice) : undefined,
        orderMethod: orderType === 'conditional' ? orderMethod : undefined
      };
      await onPlaceOrder(orderData);
      onClose();
    } catch (error) {
      console.error('Failed to place order:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center z-50 items-center">
      <div className="bg-[#181A20] w-full overflow-hidden max-w-md rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-[#2B3139]">
          <h3 className="text-white font-medium">Advanced Orders</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrderType('trailing-stop')}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${ orderType === 'trailing-stop' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Trailing Stop
            </button>
            <button
              onClick={() => setOrderType('conditional')}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${ orderType === 'conditional' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Conditional
            </button>
          </div>

          {orderType === 'trailing-stop' && (
            <div className="space-y-3">
              <div className="bg-[#2B3139] p-3 rounded flex items-start gap-2">
                <Info className="w-4 h-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
                <p className="text-gray-400">
                  Trailing stop order will follow the market price with a specified callback rate.
                  It triggers when the price moves back by the callback rate.
                </p>
              </div>

              <div>
                <label className="text-gray-400 mb-1.5 block">
                  Activation Price (USDT)
                </label>
                <input
                  type="text"
                  value={activationPrice}
                  onChange={(e) => setActivationPrice(e.target.value)}
                  placeholder={formatPrice(currentPrice)}
                  className="w-full bg-[#2B3139] rounded px-3 py-2.5 text-white focus:ring-[#F0B90B]"
                />
                <p className="text-gray-500 mt-1">
                  Price at which the trailing stop begins
                </p>
              </div>

              <div>
                <label className="text-gray-400 mb-1.5 block">
                  Callback Rate (%)
                </label>
                <input
                  type="text"
                  value={callbackRate}
                  onChange={(e) => setCallbackRate(e.target.value)}
                  placeholder="1.0"
                  className="w-full bg-[#2B3139] rounded px-3 py-2.5 text-white focus:ring-[#F0B90B]"
                />
                <p className="text-gray-500 mt-1">
                  Range: 0.1% - 5%
                </p>
              </div>

              <div>
                <label className="text-gray-400 mb-1.5 block">
                  Amount ({symbol.replace('USDT', '')})
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#2B3139] rounded px-3 py-2.5 text-white focus:ring-[#F0B90B]"
                />
              </div>
            </div>
          )}

          {orderType === 'conditional' && (
            <div className="space-y-3">
              <div className="bg-[#2B3139] p-3 rounded flex items-start gap-2">
                <Info className="w-4 h-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
                <p className="text-gray-400">
                  Conditional order will be triggered when the mark price reaches your trigger price.
                </p>
              </div>

              <div>
                <label className="text-gray-400 mb-1.5 block">
                  Trigger Price (USDT)
                </label>
                <input
                  type="text"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
                  placeholder={formatPrice(currentPrice)}
                  className="w-full bg-[#2B3139] rounded px-3 py-2.5 text-white focus:ring-[#F0B90B]"
                />
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setOrderMethod('market')}
                  className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${ orderMethod === 'market' ? 'bg-[#2B3139] text-white' : 'bg-[#181A20] text-gray-500' }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderMethod('limit')}
                  className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${ orderMethod === 'limit' ? 'bg-[#2B3139] text-white' : 'bg-[#181A20] text-gray-500' }`}
                >
                  Limit
                </button>
              </div>

              {orderMethod === 'limit' && (
                <div>
                  <label className="text-gray-400 mb-1.5 block">
                    Order Price (USDT)
                  </label>
                  <input
                    type="text"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    placeholder={formatPrice(currentPrice)}
                    className="w-full bg-[#2B3139] rounded px-3 py-2.5 text-white focus:ring-[#F0B90B]"
                  />
                </div>
              )}

              <div>
                <label className="text-gray-400 mb-1.5 block">
                  Amount ({symbol.replace('USDT', '')})
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#2B3139] rounded px-3 py-2.5 text-white focus:ring-[#F0B90B]"
                />
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <button
              onClick={handleSubmit}
              disabled={!amount}
              className={`w-full py-3 rounded font-medium transition-colors ${ side === 'buy' ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-white' : 'bg-[#F6465D] hover:bg-[#F6465D]/90 text-white' } disabled:opacity-50`}
            >
              Confirm {side === 'buy' ? 'Buy' : 'Sell'} Order
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded font-medium bg-[#2B3139] hover:bg-[#363D47] text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

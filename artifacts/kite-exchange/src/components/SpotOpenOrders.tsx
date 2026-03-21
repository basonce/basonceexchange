import { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  price: string;
  quantity: string;
  filled?: number;
  total: string;
  status: string;
  created_at: string;
}

interface SpotOpenOrdersProps {
  orders: Order[];
  currentSymbol: string;
  onCancelOrder: (orderId: string) => void;
  onCancelAll: () => void;
  onRefresh: () => void;
}

export default function SpotOpenOrders({
  orders,
  currentSymbol,
  onCancelOrder,
  onCancelAll,
  onRefresh
}: SpotOpenOrdersProps) {
  const [hideOtherPairs, setHideOtherPairs] = useState(false);

  console.log('SpotOpenOrders received orders:', orders);
  console.log('Current symbol:', currentSymbol);

  const filteredOrders = hideOtherPairs
    ? orders.filter(order => order.symbol === currentSymbol)
    : orders;

  console.log('Filtered orders:', filteredOrders);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-[#2B3139]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium">
            Orders ({filteredOrders.length})
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hideOtherPairs}
              onChange={(e) => setHideOtherPairs(e.target.checked)}
              className="w-3 h-3 rounded bg-[#2B3139] border-[#363D47] text-[#F0B90B] focus:ring-offset-0"
            />
            <span className="text-[10px]">Hide other pairs</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="text-gray-400 hover:text-[#EAECEF] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {filteredOrders.filter(order => order.status === 'pending').length > 0 && (
            <button
              onClick={onCancelAll}
              className="hover:text-[#F6465D]/80 text-[10px] font-medium transition-colors"
            >
              Cancel All
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4">
            <div className="w-12 h-12 rounded-full bg-[#2B3139] flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-[#5E6673]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-sm text-gray-400 mb-0.5">No Open Orders</div>
            <div className="text-xs text-[#5E6673]">You have no open orders at the moment</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-[#181A20] z-10">
                <tr className="text-gray-400 border-[#2B3139]">
                  <th className="text-left py-2 px-3 font-normal whitespace-nowrap">Date</th>
                  <th className="text-left py-2 px-3 font-normal whitespace-nowrap">Pair</th>
                  <th className="text-left py-2 px-3 font-normal whitespace-nowrap">Type</th>
                  <th className="text-left py-2 px-3 font-normal whitespace-nowrap">Side</th>
                  <th className="text-right py-2 px-3 font-normal whitespace-nowrap">Price</th>
                  <th className="text-right py-2 px-3 font-normal whitespace-nowrap">Amount</th>
                  <th className="text-right py-2 px-3 font-normal whitespace-nowrap">Filled</th>
                  <th className="text-right py-2 px-3 font-normal whitespace-nowrap">Total</th>
                  <th className="text-center py-2 px-3 font-normal whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-[#2B3139] hover:bg-[#2B3139]/30 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-[#EAECEF] whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-[#EAECEF] font-medium">{order.symbol}</span>
                      <span className="text-gray-400">/USDT</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#EAECEF] whitespace-nowrap capitalize">
                      {order.type}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`font-semibold ${ order.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]' }`}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#EAECEF] whitespace-nowrap">
                      {parseFloat(order.price).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-[#EAECEF] whitespace-nowrap">
                      {parseFloat(order.quantity).toFixed(6)}
                    </td>
                    <td className="py-2.5 px-3 text-[#EAECEF] whitespace-nowrap">
                      {order.filled !== undefined ? `${((order.filled / parseFloat(order.quantity)) * 100).toFixed(1)}%` : '0%'}
                    </td>
                    <td className="py-2.5 px-3 text-[#EAECEF] whitespace-nowrap">
                      {parseFloat(order.total).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {order.status === 'pending' ? (
                        <button
                          onClick={() => onCancelOrder(order.id)}
                          className="text-[#F6465D] hover:text-[#F6465D]/80 font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      ) : (
                        <span className="text-[#0ECB81] font-medium text-[10px]">
                          Filled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

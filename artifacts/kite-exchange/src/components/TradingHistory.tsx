import { useState, useEffect } from 'react';
import { TradingService, Trade } from '../lib/trading-service';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function TradingHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trades' | 'orders'>('trades');

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    setLoading(true);
    try {
      const tradeHistory = await TradingService.getTradeHistory(50);
      setTrades(tradeHistory);
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRealizedPnl = trades.reduce((sum, trade) => sum + trade.realized_pnl, 0);

  return (
    <div className="bg-[#181A20] rounded-lg">
      <div className="p-4 border-[#2B3139]">
        <h3 className="font-semibold text-lg mb-4">Trading Summary</h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#181A20] rounded-lg p-3">
            <div className="text-xs mb-1">Total Trades</div>
            <div className="font-bold text-xl">{trades.length}</div>
          </div>
          <div className="bg-[#181A20] rounded-lg p-3">
            <div className="text-xs mb-1">Realized PNL</div>
            <div className={`font-bold text-xl ${totalRealizedPnl >= 0 ? 'text-[#00FF7F]' : 'text-[#F6465D]'}`}>
              {totalRealizedPnl >= 0 ? '+' : ''}{totalRealizedPnl.toFixed(2)} USDT
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('trades')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${ activeTab === 'trades' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
          >
            Trade History
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${ activeTab === 'orders' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
          >
            Order History
          </button>
        </div>
      </div>

      <div className="p-4 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-gray-400">Loading...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
            <div className="text-sm">No trades yet</div>
            <div className="text-xs mt-1">Start trading to see your history here</div>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="bg-[#181A20] rounded-lg p-3 hover:bg-[#2B3139]/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${ trade.side === 'buy' ? 'bg-[#00FF7F]/10' : 'bg-[#F6465D]/10' }`}>
                      {trade.side === 'buy' ? (
                        <TrendingUp className="w-4 h-4 text-[#00FF7F]" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-[#F6465D]" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">
                        {trade.side.toUpperCase()} {trade.symbol}
                      </div>
                      <div className="text-xs">
                        {new Date(trade.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      {trade.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {trade.symbol}
                    </div>
                    <div className="text-xs">
                      @ {trade.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} USDT
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-[#2B3139]">
                  <div className="text-gray-400">
                    Total: {trade.total.toFixed(2)} USDT
                  </div>
                  <div className="text-gray-400">
                    Fee: {trade.fee.toFixed(4)} USDT
                  </div>
                  {trade.realized_pnl !== 0 && (
                    <div className={trade.realized_pnl >= 0 ? 'text-[#00FF7F]' : 'text-[#F6465D]'}>
                      PNL: {trade.realized_pnl >= 0 ? '+' : ''}{trade.realized_pnl.toFixed(2)} USDT
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

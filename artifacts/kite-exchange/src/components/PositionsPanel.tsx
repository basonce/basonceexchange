import { useState, useEffect, useRef } from 'react';
import { TradingService, Position } from '../lib/trading-service';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { EarnQuestPriceManager } from '../lib/earnquest-price';

export default function PositionsPanel() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const priceManager = useRef(EarnQuestPriceManager.getInstance());

  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadPositions = async () => {
    setLoading(true);
    try {
      const positionsData = await TradingService.getUserPositions();

      const positionsWithPrices = await Promise.all(
        positionsData.map(async (position) => {
          try {
            if (position.symbol === 'USDT') {
              return TradingService.calculatePNL(position, 1);
            }

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-proxy?symbol=${position.symbol}USDT`,
              {
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
              }
            );
            const priceData = await response.json();
            const currentPrice = parseFloat(priceData.price || priceData.lastPrice || '0');

            return TradingService.calculatePNL(position, currentPrice);
          } catch (error) {
            console.error(`Error fetching price for ${position.symbol}:`, error);
            return TradingService.calculatePNL(position, position.average_price);
          }
        })
      );

      setPositions(positionsWithPrices);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);
  const totalInvested = positions.reduce((sum, pos) => sum + pos.total_invested, 0);

  return (
    <div className="bg-[#181A20] rounded-lg">
      <div className="p-4 border-[#2B3139]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Open Positions</h3>
          <button
            onClick={loadPositions}
            disabled={loading}
            className="text-[#F0B90B] hover:text-[#F8D12F] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#181A20] rounded-lg p-3">
            <div className="text-xs mb-1">Total Invested</div>
            <div className="font-bold text-xl">
              {totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </div>
          </div>
          <div className="bg-[#181A20] rounded-lg p-3">
            <div className="text-xs mb-1">Unrealized PNL</div>
            <div className={`font-bold text-xl ${totalUnrealizedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}{totalUnrealizedPnl.toFixed(2)} USDT
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-h-[400px] overflow-y-auto">
        {loading && positions.length === 0 ? (
          <div className="py-8 text-gray-400">Loading positions...</div>
        ) : positions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[80px] mb-3 opacity-30">📊</div>
            <div className="text-sm">No open positions</div>
            <div className="text-xs mt-1">Start trading to build your portfolio</div>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map((position) => (
              <div
                key={position.id}
                className="bg-[#181A20] rounded-lg p-3 hover:bg-[#2B3139]/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {position.symbol.includes('EQ') && (
                      <img src="/earnquest-logo-icon-2.png" alt="EQ" className="w-6 h-6 rounded-full" />
                    )}
                    <div>
                      <div className="font-semibold text-sm">{position.symbol}</div>
                      <div className="text-xs">
                        Qty: {position.total_quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      {position.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} USDT
                    </div>
                    <div className="text-xs">
                      Avg: {position.average_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-[#2B3139]">
                  <div className="text-xs">
                    <span className="text-gray-400">Invested: </span>
                    <span className="text-white">
                      {position.total_invested.toFixed(2)} USDT
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {position.unrealized_pnl !== undefined && position.unrealized_pnl !== 0 && (
                      <>
                        {position.unrealized_pnl >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-[#0ECB81]" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-[#F6465D]" />
                        )}
                        <div className={`text-xs font-bold ${ position.unrealized_pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]' }`}>
                          {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl.toFixed(2)} USDT
                          {position.unrealized_pnl_percentage !== undefined && (
                            <span className="ml-1">
                              ({position.unrealized_pnl_percentage >= 0 ? '+' : ''}{position.unrealized_pnl_percentage.toFixed(2)}%)
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DepositMethodModal from './DepositMethodModal';

interface PortfolioValueCardProps {
  onAddFunds: () => void;
}

export default function PortfolioValueCard({ onAddFunds }: PortfolioValueCardProps) {
  const [hidden, setHidden] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [todayPnl, setTodayPnl] = useState(0);
  const [todayPnlPct, setTodayPnlPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchBalance(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchBalance(session.user.id);
      } else {
        setTotalBalance(0);
        setTodayPnl(0);
        setTodayPnlPct(0);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchBalance = async (userId: string) => {
    try {
      const { data: balances } = await supabase
        .from('user_balances')
        .select('balance, coin_symbol')
        .eq('user_id', userId);

      const { data: coinPrices } = await supabase
        .from('supported_coins')
        .select('symbol, current_price_usdt');

      let total = 0;
      if (balances && coinPrices) {
        const priceMap: Record<string, number> = {};
        coinPrices.forEach((c: any) => {
          priceMap[c.symbol] = c.current_price_usdt || 1;
        });

        balances.forEach((b: any) => {
          const price = b.coin_symbol === 'USDT' ? 1 : (priceMap[b.coin_symbol] || 0);
          total += (b.balance || 0) * price;
        });
      }

      const { data: pnlData } = await supabase
        .from('daily_pnl_history')
        .select('pnl_amount, pnl_percentage')
        .eq('user_id', userId)
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      setTotalBalance(total);
      if (pnlData) {
        setTodayPnl(pnlData.pnl_amount || 0);
        setTodayPnlPct(pnlData.pnl_percentage || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) return val.toFixed(2);
    if (val >= 1) return val.toFixed(5);
    return val.toFixed(8);
  };

  const isPositive = todayPnl >= 0;

  if (!user) return null;

  return (
    <>
      <div className="mx-4 mb-3 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E2026 0%, #181A20 100%)', border: '1px solid rgba(240,185,11,0.12)' }}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-gray-400 text-xs font-medium">Est. Total Value</span>
                <span className="text-gray-500 text-xs">(USDT)</span>
                <button
                  onClick={() => setHidden(!hidden)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {loading ? (
                <div className="h-9 w-40 bg-[#2B3139] rounded-lg animate-pulse mb-1" />
              ) : (
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-white font-black tracking-tight" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>
                    {hidden ? '••••••••' : formatValue(totalBalance)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {!loading && !hidden && (
                  <span className="text-gray-500 text-xs">
                    ≈ ${(totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>

            </div>

            <button
              onClick={() => setShowDepositModal(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm text-black transition-all active:scale-95 hover:shadow-lg"
              style={{ background: 'linear-gradient(90deg, #F0B90B 0%, #F8D12F 100%)', boxShadow: '0 4px 16px rgba(240,185,11,0.35)', minWidth: '108px', justifyContent: 'center' }}
            >
              <Plus className="w-4 h-4" />
              Add Funds
            </button>
          </div>

        </div>
      </div>

      <DepositMethodModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />
    </>
  );
}

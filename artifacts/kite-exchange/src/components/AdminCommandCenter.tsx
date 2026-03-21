import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, AlertTriangle, Shield, Zap, RefreshCw, Eye, Award, Wallet, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ExchangeModeControl from './ExchangeModeControl';

const formatLargeNumber = (num: number): string => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1_000_000_000_000) {
    return `${sign}$${(absNum / 1_000_000_000_000).toFixed(2)}T`;
  } else if (absNum >= 1_000_000_000) {
    return `${sign}$${(absNum / 1_000_000_000).toFixed(2)}B`;
  } else if (absNum >= 1_000_000) {
    return `${sign}$${(absNum / 1_000_000).toFixed(2)}M`;
  } else if (absNum >= 10_000) {
    return `${sign}$${(absNum / 1_000).toFixed(1)}K`;
  } else {
    return `${sign}$${absNum.toFixed(0)}`;
  }
};

interface PlatformStats {
  total_users: number;
  users_today: number;
  active_users_24h: number;
  total_usdt_balances: number;
  total_futures_balances: number;
  total_deposits: number;
  total_withdrawals: number;
  deposits_24h: number;
  withdrawals_24h: number;
  open_positions: number;
  total_position_value: number;
  pending_withdrawals: number;
  pending_withdrawal_amount: number;
}

interface FinancialStatus {
  total_liability: number;
  total_deposits: number;
  total_withdrawals: number;
  net_deposits: number;
  platform_profit_loss: number;
  risk_ratio: number;
}

interface RiskMetrics {
  total_open_positions: number;
  total_position_value: number;
  largest_position_value: number;
  total_margin_used: number;
  total_unrealized_pnl: number;
  positions_near_liquidation: number;
  avg_leverage: number;
}

interface VIPUser {
  user_id: string;
  email: string;
  full_name: string;
  total_deposited: number;
  current_balance: number;
  open_positions: number;
}

interface LargeWithdrawal {
  id: string;
  email: string;
  amount: number;
  coin_symbol: string;
  hours_pending: number;
}

export default function AdminCommandCenter() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [financial, setFinancial] = useState<FinancialStatus | null>(null);
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [vipUsers, setVipUsers] = useState<VIPUser[]>([]);
  const [largeWithdrawals, setLargeWithdrawals] = useState<LargeWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadPlatformStats(),
        loadFinancialStatus(),
        loadRiskMetrics(),
        loadVIPUsers(),
        loadLargeWithdrawals()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformStats = async () => {
    const { data, error } = await supabase
      .from('admin_platform_stats')
      .select('*')
      .single();

    if (!error && data) {
      setStats(data);
    }
  };

  const loadFinancialStatus = async () => {
    const { data, error } = await supabase.rpc('get_platform_financial_status');
    if (!error && data && data.length > 0) {
      setFinancial(data[0]);
    }
  };

  const loadRiskMetrics = async () => {
    const { data, error } = await supabase.rpc('get_platform_risk_metrics');
    if (!error && data && data.length > 0) {
      setRisk(data[0]);
    }
  };

  const loadVIPUsers = async () => {
    const { data, error } = await supabase.rpc('get_vip_users', { p_limit: 5 });
    if (!error && data) {
      setVipUsers(data);
    }
  };

  const loadLargeWithdrawals = async () => {
    const { data, error } = await supabase
      .from('admin_large_withdrawals')
      .select('*')
      .limit(5);

    if (!error && data) {
      setLargeWithdrawals(data);
    }
  };

  const handleBulkApprove = async () => {
    setApproving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('admin_bulk_approve_withdrawals', {
        p_admin_user_id: user.id,
        p_max_amount: 500
      });

      if (!error) {
        alert(`${data} withdrawal onaylandı!`);
        await loadAllData();
      }
    } catch (error) {
      console.error('Bulk approve error:', error);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isRiskHigh = financial && financial.risk_ratio > 1.2;
  const hasLargeWithdrawals = largeWithdrawals.length > 0;
  const hasLiquidationRisk = risk && risk.positions_near_liquidation > 0;

  return (
    <div className="space-y-4">
      <ExchangeModeControl />

      {/* Critical Alerts */}
      {(isRiskHigh || hasLargeWithdrawals || hasLiquidationRisk) && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-4 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-bold text-lg">DİKKAT GEREKİYOR</span>
          </div>
          <div className="space-y-1 text-sm">
            {isRiskHigh && <div>⚠️ Risk ratio yüksek: {financial?.risk_ratio.toFixed(2)}</div>}
            {hasLargeWithdrawals && <div>💰 {largeWithdrawals.length} büyük withdrawal bekliyor</div>}
            {hasLiquidationRisk && <div>🔴 {risk?.positions_near_liquidation} position liquidation riski altında</div>}
          </div>
        </div>
      )}

      {/* Platform Overview */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6" />
            <h3 className="font-bold text-lg">Platform Genel Durum</h3>
          </div>
          <button
            onClick={loadAllData}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="w-4 h-4" />
              <div className="text-xs opacity-80">Toplam Kullanıcı</div>
            </div>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <div className="text-xs opacity-70">+{stats?.users_today || 0} bugün</div>
          </div>

          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4" />
              <div className="text-xs opacity-80">Aktif (24h)</div>
            </div>
            <div className="text-2xl font-bold">{stats?.active_users_24h || 0}</div>
            <div className="text-xs opacity-70">kullanıcı</div>
          </div>

          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <DollarSign className="w-4 h-4" />
              <div className="text-xs opacity-80">Açık Position</div>
            </div>
            <div className="text-2xl font-bold">{stats?.open_positions || 0}</div>
            <div className="text-xs opacity-70">${((stats?.total_position_value || 0) / 1000).toFixed(1)}K</div>
          </div>

          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Wallet className="w-4 h-4" />
              <div className="text-xs opacity-80">Pending Withdrawal</div>
            </div>
            <div className="text-2xl font-bold text-yellow-300">{stats?.pending_withdrawals || 0}</div>
            <div className="text-xs opacity-70">${(stats?.pending_withdrawal_amount || 0).toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* Financial Status */}
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-lg">Finansal Durum</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Toplam Deposits</div>
            <div className="text-xl font-bold text-green-600 truncate">
              {formatLargeNumber(financial?.total_deposits || 0)}
            </div>
          </div>

          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Toplam Withdrawals</div>
            <div className="text-xl font-bold text-red-600 truncate">
              {formatLargeNumber(financial?.total_withdrawals || 0)}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Net Deposits</div>
            <div className="text-xl font-bold text-blue-600 truncate">
              {formatLargeNumber(financial?.net_deposits || 0)}
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Platform P/L</div>
            <div className={`text-xl font-bold truncate ${(financial?.platform_profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatLargeNumber(financial?.platform_profit_loss || 0)}
            </div>
          </div>

          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Liability</div>
            <div className="text-xl font-bold text-orange-600 truncate">
              {formatLargeNumber(financial?.total_liability || 0)}
            </div>
          </div>

          <div className={`p-3 rounded-lg ${isRiskHigh ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="text-xs text-gray-600 mb-1">Risk Ratio</div>
            <div className={`text-xl font-bold ${isRiskHigh ? 'text-red-600' : 'text-gray-700'}`}>
              {(financial?.risk_ratio || 0).toFixed(2)}x
            </div>
          </div>
        </div>
      </div>

      {/* Risk Metrics */}
      {risk && (
        <div className="bg-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-lg">Risk Metrikleri</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Total Position Value</div>
              <div className="text-base font-bold truncate">{formatLargeNumber(risk.total_position_value)}</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Total Margin Used</div>
              <div className="text-base font-bold truncate">{formatLargeNumber(risk.total_margin_used)}</div>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Liquidation Risk</div>
              <div className="text-base font-bold text-yellow-600">{risk.positions_near_liquidation} pos</div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Avg Leverage</div>
              <div className="text-base font-bold text-blue-600">{risk.avg_leverage.toFixed(1)}x</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5" />
          <h3 className="font-bold">Hızlı İşlemler</h3>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={handleBulkApprove}
            disabled={approving}
            className="bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-lg p-3 font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <DollarSign className="w-4 h-4" />
            <span>{approving ? 'Onaylanıyor...' : 'Toplu Withdrawal Onay (<$500)'}</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="bg-white/20 hover:bg-white/30 rounded-lg p-3 font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tüm Verileri Yenile</span>
          </button>
        </div>
      </div>

      {/* VIP Users */}
      {vipUsers.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Award className="w-5 h-5 text-yellow-600" />
            <h3 className="font-bold text-lg">Top 5 VIP Users</h3>
          </div>

          <div className="space-y-2">
            {vipUsers.map((user, idx) => (
              <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{user.email}</div>
                    <div className="text-xs text-gray-500 truncate">{user.full_name}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-sm font-bold text-green-600">{formatLargeNumber(user.total_deposited)}</div>
                  <div className="text-xs text-gray-500">{user.open_positions} pos</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Large Withdrawals Alert */}
      {largeWithdrawals.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-orange-400">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-lg">Büyük Withdrawal İstekleri</h3>
          </div>

          <div className="space-y-2">
            {largeWithdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{withdrawal.email}</div>
                  <div className="text-xs text-gray-500">{withdrawal.hours_pending.toFixed(1)} saat önce</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-600">
                    {withdrawal.amount.toFixed(2)} {withdrawal.coin_symbol}
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">
                    Detay →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      <div className="text-center text-xs text-gray-500">
        Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
      </div>
    </div>
  );
}

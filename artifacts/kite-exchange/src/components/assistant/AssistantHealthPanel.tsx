import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Users, DollarSign, ShieldAlert, Cpu } from 'lucide-react';
import type { PlatformContext } from '../../lib/assistant-engine';

interface Props {
  context: PlatformContext;
  onRefresh: () => void;
  loading: boolean;
}

export default function AssistantHealthPanel({ context, onRefresh, loading }: Props) {
  const healthColor = context.health_score >= 80 ? 'text-emerald-400' : context.health_score >= 60 ? 'text-amber-400' : 'text-red-400';
  const healthBg = context.health_score >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : context.health_score >= 60 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  const metrics = [
    {
      label: 'Kullanicilar',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      values: [
        { label: 'Toplam', value: context.users.total.toLocaleString() },
        { label: '24s Aktif', value: context.users.active_24h.toString() },
        { label: '7g Yeni', value: context.users.new_7d.toString() },
        { label: 'Dondurulan', value: context.users.frozen.toString(), alert: context.users.frozen > 0 },
      ]
    },
    {
      label: 'Finansal',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      values: [
        { label: 'Platform USDT', value: `$${context.balances.total_platform_usdt.toFixed(0)}` },
        { label: '24s Deposit', value: `$${context.deposits.total_24h.toFixed(0)}` },
        { label: 'Bekl. Cekim', value: `${context.withdrawals.pending_count} adet`, alert: context.withdrawals.pending_count > 5 },
        { label: 'Cekim Tutar', value: `$${context.withdrawals.pending_amount.toFixed(0)}`, alert: context.withdrawals.pending_amount > 10000 },
      ]
    },
    {
      label: 'Trading',
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      values: [
        { label: 'Acik Pozisyon', value: context.trading.open_positions.toString() },
        { label: 'Toplam Marjin', value: `$${context.trading.total_margin.toFixed(0)}` },
        { label: '50x+ Kaldirac', value: context.trading.high_leverage_count.toString(), alert: context.trading.high_leverage_count > 0 },
        { label: 'Liq. Yakin', value: context.trading.near_liquidation.toString(), alert: context.trading.near_liquidation > 0 },
      ]
    },
    {
      label: 'Guvenlik',
      icon: ShieldAlert,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      values: [
        { label: 'Fraud Alarmi', value: context.fraud.open_flags.toString(), alert: context.fraud.open_flags > 0 },
        { label: 'Yuksek Risk', value: context.fraud.high_risk_users.toString(), alert: context.fraud.high_risk_users > 0 },
        { label: '24s Yeni', value: context.fraud.new_flags_24h.toString(), alert: context.fraud.new_flags_24h > 2 },
        { label: 'Cevapsiz Bilet', value: context.tickets.unanswered_4h.toString(), alert: context.tickets.unanswered_4h > 0 },
      ]
    },
    {
      label: 'Mining',
      icon: Cpu,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      values: [
        { label: 'Aktif Miner', value: context.mining.active_miners.toString() },
        { label: 'Ekipman', value: context.mining.active_equipment.toString() },
        { label: '24s EQ', value: context.mining.eq_distributed_24h.toFixed(2) },
        { label: 'Acik Bilet', value: context.tickets.open.toString(), alert: context.tickets.open > 10 },
      ]
    },
    {
      label: 'Otomasyon',
      icon: Activity,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      values: [
        { label: 'Aktif Kural', value: `${context.rules.active}/${context.rules.total}` },
        { label: 'Zamanli Gorev', value: `${context.scheduled_tasks.active}/${context.scheduled_tasks.total}` },
        { label: 'Saglik Skoru', value: `${context.health_score}/100` },
        { label: 'Sorun Sayisi', value: context.issues.length.toString(), alert: context.issues.length > 0 },
      ]
    },
  ];

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border p-3 ${healthBg}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {context.health_score >= 80
              ? <CheckCircle className="w-4 h-4 text-emerald-400" />
              : <AlertTriangle className={`w-4 h-4 ${healthColor}`} />
            }
            <span className="text-sm font-semibold text-white">Platform Saglik Skoru</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${healthColor}`}>{context.health_score}</span>
            <span className="text-gray-500 text-xs">/100</span>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="ml-2 p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Activity className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>

        <div className="w-full bg-black/20 rounded-full h-1.5 mb-2">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              context.health_score >= 80 ? 'bg-emerald-400' : context.health_score >= 60 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${context.health_score}%` }}
          />
        </div>

        {context.issues.length > 0 && (
          <div className="space-y-0.5 mt-2">
            {context.issues.map((issue, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-red-300">
                <TrendingDown className="w-3 h-3 flex-shrink-0" />
                {issue}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          {new Date(context.computed_at).toLocaleTimeString('tr-TR')} guncellendi
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map(metric => {
          const Icon = metric.icon;
          const hasAlert = metric.values.some(v => v.alert);
          return (
            <div
              key={metric.label}
              className={`rounded-xl border p-2.5 transition-all ${
                hasAlert ? 'border-red-500/30 bg-red-500/5' : 'border-[#2B3139] bg-[#1E2329]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${metric.bg}`}>
                  <Icon className={`w-3 h-3 ${metric.color}`} />
                </div>
                <span className="text-xs font-medium text-gray-300">{metric.label}</span>
                {hasAlert && <div className="w-1.5 h-1.5 rounded-full bg-red-400 ml-auto animate-pulse" />}
              </div>
              <div className="space-y-0.5">
                {metric.values.map(v => (
                  <div key={v.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{v.label}</span>
                    <span className={`text-xs font-medium ${v.alert ? 'text-red-400' : 'text-white'}`}>
                      {v.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

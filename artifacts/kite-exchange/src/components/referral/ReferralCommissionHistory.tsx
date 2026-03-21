import { DollarSign, ArrowUpRight } from 'lucide-react';

interface Commission {
  id: string;
  referred_id: string;
  username: string;
  trade_type: string;
  trade_volume: number;
  fee_amount: number;
  commission_amount: number;
  created_at: string;
}

interface ReferralCommissionHistoryProps {
  commissions: Commission[];
  loading: boolean;
}

export default function ReferralCommissionHistory({ commissions, loading }: ReferralCommissionHistoryProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);

  const fmtDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="px-4 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#181A20] rounded-xl p-3 border border-[#2B3139] animate-pulse">
            <div className="h-3 bg-[#2B3139] rounded w-3/4 mb-2" />
            <div className="h-2 bg-[#2B3139] rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="px-4">
        <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-[#2B3139] rounded-full flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-6 h-6 text-gray-500" />
          </div>
          <div className="text-white font-bold text-sm mb-1">No Commissions Yet</div>
          <div className="text-gray-400 text-xs">Commissions appear when your friends trade</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-2">
      {commissions.map((c) => (
        <div key={c.id} className="bg-[#181A20] border border-[#2B3139] rounded-xl p-3.5 flex items-center justify-between hover:border-[#363D47] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0ECB81]/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <ArrowUpRight className="w-4 h-4 text-[#0ECB81]" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{c.username}</div>
              <div className="text-xs text-gray-500">
                {c.trade_type.toUpperCase()} · ${c.trade_volume.toFixed(2)} vol · {fmtDate(c.created_at)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#0ECB81] font-bold text-sm">+${fmt(c.commission_amount)}</div>
            <div className="text-xs text-gray-500">USDT</div>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { ShieldAlert, Eye, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FraudFlag {
  id: string;
  user_id: string;
  flag_type: string;
  risk_score: number;
  details: Record<string, unknown>;
  status: 'open' | 'investigating' | 'confirmed_fraud' | 'false_positive' | 'resolved';
  auto_action_taken: string | null;
  notes: string | null;
  created_at: string;
}

const FLAG_TYPE_LABELS: Record<string, string> = {
  zero_deposit_withdrawal: 'Deposit Yapmadan Cekim',
  multiple_accounts_same_ip: 'Ayni IP Coklu Hesap',
  bot_activity: 'Bot Aktivitesi',
  suspicious_timing: 'Suphelı Zamanlama',
  self_referral: 'Kendi Referral',
  fake_deposit: 'Sahte Deposit',
  rapid_transactions: 'Hizli Islemler',
  amount_manipulation: 'Tutar Manipulasyonu',
  manual: 'Manuel Isaretleme',
};

const STATUS_CONFIG = {
  open: { label: 'Acik', color: 'text-red-400 bg-red-500/10' },
  investigating: { label: 'Inceleniyor', color: 'text-amber-400 bg-amber-500/10' },
  confirmed_fraud: { label: 'Dogrulandi', color: 'text-red-600 bg-red-900/20' },
  false_positive: { label: 'Yanlis Alarm', color: 'text-gray-400 bg-gray-500/10' },
  resolved: { label: 'Cozuldu', color: 'text-emerald-400 bg-emerald-500/10' },
};

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-orange-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 bg-[#2B3139] rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold ${score >= 70 ? 'text-red-400' : 'text-gray-400'}`}>{score}</span>
    </div>
  );
}

export default function AssistantFraudPanel() {
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadFlags();
    const channel = supabase
      .channel('fraud_flags_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assistant_fraud_flags' }, payload => {
        setFlags(prev => [payload.new as FraudFlag, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadFlags() {
    setLoading(true);
    const query = supabase
      .from('assistant_fraud_flags')
      .select('*')
      .order('risk_score', { ascending: false })
      .limit(50);

    if (statusFilter !== 'all') {
      query.eq('status', statusFilter);
    }

    const { data } = await query;
    setFlags(data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await supabase.from('assistant_fraud_flags').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setFlags(prev => prev.map(f => f.id === id ? { ...f, status: status as FraudFlag['status'] } : f));
    setUpdating(null);
  }

  useEffect(() => { loadFlags(); }, [statusFilter]);

  const openCount = flags.filter(f => f.status === 'open').length;
  const highRiskCount = flags.filter(f => f.risk_score >= 70).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-white">Fraud & Guvenlik</span>
          {openCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-md font-bold animate-pulse">
              {openCount} acik
            </span>
          )}
        </div>
        <button onClick={loadFlags} className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {highRiskCount > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">{highRiskCount} kullanici 70+ risk skoruna sahip</span>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: 'open', label: 'Acik' },
          { key: 'investigating', label: 'Inceleniyor' },
          { key: 'all', label: 'Tumu' },
          { key: 'resolved', label: 'Cozuldu' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              statusFilter === f.key ? 'bg-[#F0B90B] text-[#181A20]' : 'bg-[#2B3139] text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#F0B90B] animate-spin" />
        </div>
      ) : flags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
          <p className="text-sm text-gray-500">Fraud alarmi yok</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {flags.map(flag => {
            const statusCfg = STATUS_CONFIG[flag.status];
            return (
              <div
                key={flag.id}
                className="rounded-xl border border-[#2B3139] bg-[#1E2329] p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-400 font-mono truncate">{flag.user_id.slice(0, 16)}...</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>

                <p className="text-sm font-medium text-white mb-1.5">
                  {FLAG_TYPE_LABELS[flag.flag_type] || flag.flag_type}
                </p>

                <RiskBar score={flag.risk_score} />

                {flag.auto_action_taken && (
                  <p className="text-xs text-amber-400 mt-1.5">Aksiyon: {flag.auto_action_taken}</p>
                )}

                <p className="text-xs text-gray-600 mt-1">
                  {new Date(flag.created_at).toLocaleString('tr-TR')}
                </p>

                {flag.status === 'open' && (
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => updateStatus(flag.id, 'investigating')}
                      disabled={updating === flag.id}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Incele
                    </button>
                    <button
                      onClick={() => updateStatus(flag.id, 'false_positive')}
                      disabled={updating === flag.id}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-500/10 text-gray-400 text-xs hover:bg-gray-500/20 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                      Yanlis
                    </button>
                    <button
                      onClick={() => updateStatus(flag.id, 'confirmed_fraud')}
                      disabled={updating === flag.id}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      Onayla
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ActionLog {
  id: string;
  action_type: string;
  category: string;
  description: string;
  target_user_id: string | null;
  affected_rows: number;
  status: 'success' | 'failed' | 'pending' | 'partial';
  error_message: string | null;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  partial: { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
};

const CATEGORY_COLORS: Record<string, string> = {
  financial: 'text-emerald-400',
  security: 'text-red-400',
  user: 'text-blue-400',
  trading: 'text-amber-400',
  mining: 'text-violet-400',
  support: 'text-cyan-400',
  system: 'text-gray-400',
};

export default function AssistantActionsLog() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
    const channel = supabase
      .channel('actions_log_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assistant_actions_log' }, payload => {
        setLogs(prev => [payload.new as ActionLog, ...prev.slice(0, 49)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('assistant_actions_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-white">Aksiyon Kayitlari</span>
          <span className="text-xs bg-[#2B3139] text-gray-400 px-1.5 py-0.5 rounded-md">Son 50</span>
        </div>
        <button onClick={loadLogs} className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#F0B90B] animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <FileText className="w-8 h-8 text-gray-600" />
          <p className="text-sm text-gray-500">Henuz aksiyon kaydi yok</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {logs.map(log => {
            const statusCfg = STATUS_CONFIG[log.status];
            const StatusIcon = statusCfg.icon;
            const isExpanded = expanded === log.id;

            return (
              <div key={log.id} className="rounded-xl border border-[#2B3139] bg-[#1E2329] overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : log.id)}
                  className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-[#2B3139]/50 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${statusCfg.bg}`}>
                    <StatusIcon className={`w-3.5 h-3.5 ${statusCfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-xs font-medium ${CATEGORY_COLORS[log.category] || 'text-gray-400'}`}>
                        {log.category}
                      </span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-500 truncate">{log.action_type}</span>
                      {log.affected_rows > 0 && (
                        <span className="text-xs text-gray-600 ml-auto flex-shrink-0">{log.affected_rows} kayit</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 leading-tight">{log.description}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-1" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-[#2B3139] pt-2 space-y-1.5">
                    {log.target_user_id && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Hedef Kullanici</span>
                        <span className="text-gray-300 font-mono">{log.target_user_id.slice(0, 20)}...</span>
                      </div>
                    )}
                    {log.error_message && (
                      <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">{log.error_message}</div>
                    )}
                    {Object.keys(log.result || {}).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sonuc:</p>
                        <pre className="text-xs text-gray-400 bg-[#181A20] rounded-lg p-2 overflow-x-auto">
                          {JSON.stringify(log.result, null, 2)}
                        </pre>
                      </div>
                    )}
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

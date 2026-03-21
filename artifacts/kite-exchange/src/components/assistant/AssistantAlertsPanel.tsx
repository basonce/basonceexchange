import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Alert {
  id: string;
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  is_read: boolean;
  is_resolved: boolean;
  action_required: boolean;
  action_taken: string | null;
  created_at: string;
  data: Record<string, unknown>;
}

const PRIORITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25', icon: AlertCircle, label: 'Kritik' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25', icon: AlertTriangle, label: 'Yuksek' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25', icon: Bell, label: 'Orta' },
  low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25', icon: Info, label: 'Dusuk' },
};

export default function AssistantAlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'action_required'>('unread');

  useEffect(() => {
    loadAlerts();

    const channel = supabase
      .channel('assistant_alerts_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assistant_alerts' }, payload => {
        setAlerts(prev => [payload.new as Alert, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadAlerts() {
    setLoading(true);
    const { data } = await supabase
      .from('assistant_alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(50);
    setAlerts(data || []);
    setLoading(false);
  }

  async function markRead(id: string) {
    await supabase.from('assistant_alerts').update({ is_read: true }).eq('id', id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  }

  async function resolveAlert(id: string) {
    await supabase.from('assistant_alerts').update({ is_resolved: true, is_read: true }).eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  async function markAllRead() {
    const unread = alerts.filter(a => !a.is_read).map(a => a.id);
    if (unread.length === 0) return;
    await supabase.from('assistant_alerts').update({ is_read: true }).in('id', unread);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  }

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.is_read;
    if (filter === 'action_required') return a.action_required;
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const actionCount = alerts.filter(a => a.action_required && !a.is_resolved).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Proaktif Uyarilar</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-md font-bold animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-[#2B3139] transition-all"
            >
              Hepsini oku
            </button>
          )}
          <button onClick={loadAlerts} className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[
          { key: 'unread', label: `Okunmamis (${unreadCount})` },
          { key: 'action_required', label: `Aksiyon Gerekli (${actionCount})` },
          { key: 'all', label: 'Tumu' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === f.key ? 'bg-[#F0B90B] text-[#181A20]' : 'bg-[#2B3139] text-gray-400 hover:text-white'
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <BellOff className="w-8 h-8 text-gray-600" />
          <p className="text-sm text-gray-500">
            {filter === 'unread' ? 'Tum uyarilar okundu' : 'Uyari yok'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filtered.map(alert => {
            const config = PRIORITY_CONFIG[alert.priority];
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-3 transition-all cursor-pointer ${config.bg} ${
                  !alert.is_read ? 'ring-1 ring-white/5' : 'opacity-75'
                }`}
                onClick={() => !alert.is_read && markRead(alert.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                        {!alert.is_read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                        {alert.action_required && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded">Aksiyon Gerekli</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white leading-tight">{alert.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{alert.message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(alert.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); resolveAlert(alert.id); }}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

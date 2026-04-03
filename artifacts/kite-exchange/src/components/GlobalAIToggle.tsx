import { useState, useEffect } from 'react';
import { Bot, Moon, Sun, MessageSquare, Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AISettings {
  enabled: boolean;
  changed_at: string | null;
  changed_by_email: string | null;
}

export default function GlobalAIToggle() {
  const [settings, setSettings] = useState<AISettings>({ enabled: true, changed_at: null, changed_by_email: null });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [todayAiReplies, setTodayAiReplies] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  useEffect(() => {
    loadSettings();
    loadStats();

    const channel = supabase
      .channel('ai_toggle_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => loadStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('exchange_settings')
      .select('value')
      .eq('key', 'global_ai_support')
      .maybeSingle();
    if (data?.value) {
      setSettings(data.value as AISettings);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const [pendingRes, repliesRes, openRes] = await Promise.all([
      supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_type', 'customer')
        .eq('read', false),
      supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_type', 'admin')
        .eq('original_language', 'ai')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open'),
    ]);

    setPendingTickets(pendingRes.count || 0);
    setTodayAiReplies(repliesRes.count || 0);
    setOpenTickets(openRes.count || 0);
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const adminData = { user: await getCurrentUser() };
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', adminData.user?.id || '')
        .maybeSingle();

      const newEnabled = !settings.enabled;
      const newValue: AISettings = {
        enabled: newEnabled,
        changed_at: new Date().toISOString(),
        changed_by_email: profile?.email || adminData.user?.email || 'admin',
      };

      const { error } = await supabase
        .from('exchange_settings')
        .update({ value: newValue, updated_at: new Date().toISOString(), updated_by: adminData.user?.id })
        .eq('key', 'global_ai_support');

      if (!error) {
        setSettings(newValue);
      }
    } finally {
      setToggling(false);
    }
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (mins > 0) return `${mins} dakika önce`;
    return 'az önce';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  const isOn = settings.enabled;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-500 ${
        isOn
          ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50'
          : 'border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50'
      }`}>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                isOn ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-gray-400'
              }`}>
                {isOn ? (
                  <Bot className="w-7 h-7 text-white" />
                ) : (
                  <Moon className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {isOn ? 'AI Support Aktif' : 'Uyku Modu — Manuel'}
                </h2>
                <p className={`text-sm mt-0.5 ${isOn ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {isOn
                    ? 'Tüm yeni mesajlara otomatik AI yanıt veriyor'
                    : 'AI durduruldu — ticketlar seni bekliyor'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`relative flex-shrink-0 w-20 h-10 rounded-full transition-all duration-500 focus:outline-none shadow-md ${
                isOn
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                  : 'bg-gray-300 hover:bg-gray-400'
              } ${toggling ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow transition-all duration-500 flex items-center justify-center ${
                  isOn ? 'left-11' : 'left-1'
                }`}
              >
                {toggling ? (
                  <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                ) : isOn ? (
                  <Sun className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-400" />
                )}
              </span>
              <span className={`absolute inset-0 flex items-center font-bold text-xs text-white transition-all duration-300 ${
                isOn ? 'justify-start pl-2.5' : 'justify-end pr-2.5'
              }`}>
                {isOn ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {settings.changed_at && (
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Son değişiklik: <strong>{formatRelativeTime(settings.changed_at)}</strong>
                {settings.changed_by_email && ` • ${settings.changed_by_email}`}
              </span>
            </div>
          )}
        </div>

        <div className={`px-6 pb-5 grid grid-cols-3 gap-3`}>
          <div className={`rounded-xl p-3 text-center ${isOn ? 'bg-white/70' : 'bg-white/50'}`}>
            <div className={`text-2xl font-bold ${pendingTickets > 0 && !isOn ? 'text-red-600' : 'text-gray-900'}`}>
              {pendingTickets}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Cevapsız Mesaj</div>
            {pendingTickets > 0 && !isOn && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-[10px] text-red-500 font-medium">Bekliyor</span>
              </div>
            )}
          </div>

          <div className={`rounded-xl p-3 text-center ${isOn ? 'bg-white/70' : 'bg-white/50'}`}>
            <div className="text-2xl font-bold text-gray-900">{openTickets}</div>
            <div className="text-xs text-gray-500 mt-0.5">Açık Ticket</div>
          </div>

          <div className={`rounded-xl p-3 text-center ${isOn ? 'bg-white/70' : 'bg-white/50'}`}>
            <div className={`text-2xl font-bold ${isOn ? 'text-emerald-600' : 'text-gray-400'}`}>
              {todayAiReplies}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">AI Yanıt (Bugün)</div>
            {isOn && todayAiReplies > 0 && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">Aktif</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 transition-all duration-500 ${
        isOn
          ? 'bg-blue-50 border-blue-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOn ? 'text-blue-500' : 'text-amber-500'}`} />
          <div className="text-sm">
            {isOn ? (
              <>
                <p className="font-semibold text-blue-800">AI Modu Aktif</p>
                <p className="text-blue-600 mt-0.5">
                  Uyumadan önce bu switch'i ON konumda bırak. Yeni gelen her support mesajına AI otomatik yanıt verecek. Uyandığında OFF yap, manuel olarak devret.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-800">Manuel Mod — Sen Bakmalisin</p>
                <p className="text-amber-600 mt-0.5">
                  AI yanıtlar duraklatıldı. Gelen tüm support mesajları seni bekliyor. Uyumadan önce ON'a al.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

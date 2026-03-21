import { useState, useEffect } from 'react';
import { Clock, Play, Pause, CheckCircle, XCircle, Loader2, RefreshCw, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Task {
  id: string;
  name: string;
  description: string;
  task_type: string;
  schedule_label: string;
  cron_expression: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: 'success' | 'failed' | 'running' | null;
  run_count: number;
  error_count: number;
  last_error: string | null;
}

const TASK_TYPE_COLORS: Record<string, string> = {
  health_check: 'text-emerald-400',
  weekly_report: 'text-blue-400',
  monthly_report: 'text-violet-400',
  fraud_scan: 'text-red-400',
  dormant_scan: 'text-gray-400',
  ticket_sla: 'text-amber-400',
  mining_check: 'text-cyan-400',
  segment_refresh: 'text-pink-400',
  liquidation_watch: 'text-orange-400',
  cleanup: 'text-gray-500',
};

export default function AssistantScheduledPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('assistant_scheduled_tasks')
      .select('*')
      .order('is_active', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  async function toggleTask(id: string, current: boolean) {
    setToggling(id);
    await supabase.from('assistant_scheduled_tasks').update({ is_active: !current }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t));
    setToggling(null);
  }

  const activeCount = tasks.filter(t => t.is_active).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Zamanli Gorevler</span>
          <span className="text-xs bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded-md">
            {activeCount}/{tasks.length} aktif
          </span>
        </div>
        <button onClick={loadTasks} className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#F0B90B] animate-spin" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`rounded-xl border p-3 transition-all ${
                task.is_active ? 'border-[#2B3139] bg-[#1E2329]' : 'border-[#1E2329] bg-[#181A20] opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium text-white">{task.name}</span>
                    {task.last_run_status === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                    {task.last_run_status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    {task.last_run_status === 'running' && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                  </div>
                  <p className="text-xs text-gray-500">{task.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Clock className={`w-3 h-3 ${TASK_TYPE_COLORS[task.task_type] || 'text-gray-400'}`} />
                      <span className="text-xs text-gray-400">{task.schedule_label}</span>
                    </div>
                    {task.run_count > 0 && (
                      <span className="text-xs text-gray-600">{task.run_count} calistirildi</span>
                    )}
                    {task.error_count > 0 && (
                      <span className="text-xs text-red-400">{task.error_count} hata</span>
                    )}
                  </div>
                  {task.last_run_at && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Son: {new Date(task.last_run_at).toLocaleString('tr-TR')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleTask(task.id, task.is_active)}
                  disabled={toggling === task.id}
                  className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors flex-shrink-0"
                >
                  {toggling === task.id
                    ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    : task.is_active
                      ? <Pause className="w-4 h-4 text-amber-400" />
                      : <Play className="w-4 h-4 text-gray-500" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

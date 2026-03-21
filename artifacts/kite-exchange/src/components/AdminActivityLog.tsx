import { useState, useEffect } from 'react';
import { Activity, Search, Filter, RefreshCw, FileText, AlertCircle, CheckCircle, XCircle, Eye, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminLog {
  id: string;
  created_at: string;
  admin_email: string;
  action_type: string;
  action_category: string;
  target_email: string | null;
  details: any;
  status: string;
  notes: string | null;
  action_description?: string;
}

interface ActivitySummary {
  action_category: string;
  action_type: string;
  count: number;
  success_count: number;
  failed_count: number;
  last_action: string;
}

export default function AdminActivityLog() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [summary, setSummary] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [daysBack, setDaysBack] = useState(7);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory, daysBack]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLogs(),
        loadSummary()
      ]);
    } catch (error) {
      console.error('Error loading admin logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    const { data, error } = await supabase.rpc('get_recent_admin_actions', {
      p_limit: 100,
      p_action_category: selectedCategory === 'all' ? null : selectedCategory
    });

    if (error) {
      console.error('Error loading logs:', error);
      return;
    }

    setLogs(data || []);
  };

  const loadSummary = async () => {
    const { data, error } = await supabase.rpc('get_admin_activity_summary', {
      p_days_back: daysBack
    });

    if (error) {
      console.error('Error loading summary:', error);
      return;
    }

    setSummary(data || []);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await loadLogs();
      return;
    }

    const { data, error } = await supabase.rpc('search_admin_logs', {
      p_search_term: searchTerm.trim(),
      p_limit: 50
    });

    if (error) {
      console.error('Error searching logs:', error);
      return;
    }

    setLogs(data || []);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'balance': return 'bg-green-100 text-green-700';
      case 'trading': return 'bg-blue-100 text-blue-700';
      case 'wallet': return 'bg-purple-100 text-purple-700';
      case 'user': return 'bg-orange-100 text-orange-700';
      case 'deposit': return 'bg-cyan-100 text-cyan-700';
      case 'withdrawal': return 'bg-pink-100 text-pink-700';
      case 'security': return 'bg-red-100 text-red-700';
      case 'system': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'partial': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionName = (actionType: string) => {
    const names: { [key: string]: string } = {
      'add_balance': 'Bakiye Ekledi',
      'remove_balance': 'Bakiye Çıkardı',
      'send_usdt': 'USDT Gönderdi',
      'close_position': 'Position Kapattı',
      'approve_deposit': 'Deposit Onayladı',
      'reject_deposit': 'Deposit Reddetti',
      'approve_withdrawal': 'Çekim Onayladı',
      'reject_withdrawal': 'Çekim Reddetti',
      'assign_wallet': 'Cüzdan Atadı',
      'add_wallet': 'Cüzdan Ekledi',
      'remove_wallet': 'Cüzdan Sildi',
      'ban_user': 'Kullanıcı Banladı',
      'unban_user': 'Ban Kaldırdı',
      'modify_user': 'Kullanıcı Düzenledi',
      'force_liquidate': 'Zorla Liquidate',
      'manipulate_position': 'Position Manipüle Etti'
    };
    return names[actionType] || actionType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Admin Activity Log</h2>
            <p className="text-sm opacity-90">Tüm admin işlemleri kaydediliyor</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summary.slice(0, 4).map((item, idx) => (
            <div key={idx} className="bg-white/10 rounded-lg p-3">
              <div className="text-xs opacity-80">{item.action_category}</div>
              <div className="text-2xl font-bold">{item.count}</div>
              <div className="text-xs opacity-70">
                {item.success_count} başarılı, {item.failed_count} hata
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Email, action type veya not ile ara..."
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Ara</span>
              </button>
            </div>
          </div>

          <div className="flex space-x-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tüm Kategoriler</option>
              <option value="balance">Balance</option>
              <option value="trading">Trading</option>
              <option value="wallet">Wallet</option>
              <option value="user">User</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="security">Security</option>
              <option value="system">System</option>
            </select>

            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="1">Son 24 Saat</option>
              <option value="7">Son 7 Gün</option>
              <option value="30">Son 30 Gün</option>
              <option value="90">Son 90 Gün</option>
            </select>

            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <div>Kayıt bulunamadı</div>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(log.status)}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getCategoryColor(log.action_category)}`}>
                        {log.action_category}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {getActionName(log.action_type)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div>
                        <span className="text-gray-500">Admin:</span>{' '}
                        <span className="font-medium">{log.admin_email}</span>
                      </div>
                      {log.target_email && (
                        <div>
                          <span className="text-gray-500">Target:</span>{' '}
                          <span className="font-medium">{log.target_email}</span>
                        </div>
                      )}
                    </div>

                    {log.notes && (
                      <div className="text-xs text-gray-500 mt-2">{log.notes}</div>
                    )}
                  </div>

                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </div>
                    <button className="mt-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>Detay</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">İşlem Detayı</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Action Type</div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getCategoryColor(selectedLog.action_category)}`}>
                    {selectedLog.action_category}
                  </span>
                  <span className="font-bold text-gray-900">{getActionName(selectedLog.action_type)}</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Admin</div>
                <div className="font-medium text-gray-900">{selectedLog.admin_email}</div>
              </div>

              {selectedLog.target_email && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Target User</div>
                  <div className="font-medium text-gray-900">{selectedLog.target_email}</div>
                </div>
              )}

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Status</div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedLog.status)}
                  <span className="font-medium">{selectedLog.status}</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Timestamp</div>
                <div className="font-medium text-gray-900">
                  {new Date(selectedLog.created_at).toLocaleString('tr-TR', {
                    dateStyle: 'full',
                    timeStyle: 'long'
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Details (JSON)</div>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-64 font-mono">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              {selectedLog.notes && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
                  <div className="text-gray-900">{selectedLog.notes}</div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

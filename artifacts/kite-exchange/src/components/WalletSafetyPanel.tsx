import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Search, RefreshCw, Eye, AlertCircle, Lock, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DuplicateWallet {
  address: string;
  network: string;
  count: number;
  wallet_ids: string[];
}

interface IntegrityIssue {
  issue_type: string;
  wallet_id: string;
  wallet_address: string;
  details: string;
}

interface AuditLog {
  wallet_address: string;
  wallet_network: string;
  user_email: string;
  assigned_at: string;
  assignment_method: string;
  notes: string;
}

interface SafetyStats {
  totalWallets: number;
  assignedWallets: number;
  duplicates: number;
  integrityIssues: number;
  auditLogCount: number;
}

export default function WalletSafetyPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SafetyStats>({
    totalWallets: 0,
    assignedWallets: 0,
    duplicates: 0,
    integrityIssues: 0,
    auditLogCount: 0
  });
  const [duplicates, setDuplicates] = useState<DuplicateWallet[]>([]);
  const [integrityIssues, setIntegrityIssues] = useState<IntegrityIssue[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchAddress, setSearchAddress] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'duplicates' | 'integrity' | 'audit'>('overview');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadDuplicates(),
        loadIntegrityIssues(),
        loadAuditLogs()
      ]);
    } catch (error) {
      console.error('Error loading safety data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const { data: wallets } = await supabase
      .from('wallet_pool')
      .select('is_assigned');

    const { data: auditCount } = await supabase
      .from('wallet_assignments_audit')
      .select('id', { count: 'exact', head: true });

    const { data: duplicateData } = await supabase
      .rpc('check_duplicate_wallets');

    const { data: integrityData } = await supabase
      .rpc('verify_wallet_integrity');

    setStats({
      totalWallets: wallets?.length || 0,
      assignedWallets: wallets?.filter(w => w.is_assigned).length || 0,
      duplicates: duplicateData?.length || 0,
      integrityIssues: integrityData?.length || 0,
      auditLogCount: auditCount?.length || 0
    });
  };

  const loadDuplicates = async () => {
    const { data, error } = await supabase.rpc('check_duplicate_wallets');
    if (error) {
      console.error('Error loading duplicates:', error);
      return;
    }
    setDuplicates(data || []);
  };

  const loadIntegrityIssues = async () => {
    const { data, error } = await supabase.rpc('verify_wallet_integrity');
    if (error) {
      console.error('Error loading integrity issues:', error);
      return;
    }
    setIntegrityIssues(data || []);
  };

  const loadAuditLogs = async (address?: string) => {
    const { data, error } = await supabase.rpc('get_wallet_assignment_history', {
      p_wallet_address: address || null
    });
    if (error) {
      console.error('Error loading audit logs:', error);
      return;
    }
    setAuditLogs(data || []);
  };

  const handleSearchAudit = async () => {
    if (searchAddress.trim()) {
      await loadAuditLogs(searchAddress.trim());
    } else {
      await loadAuditLogs();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const getIssueTypeName = (type: string) => {
    switch (type) {
      case 'ASSIGNED_WITHOUT_USER':
        return 'Atanmış ama kullanıcı yok';
      case 'USER_WITHOUT_ASSIGNED_FLAG':
        return 'Kullanıcı var ama flag yok';
      case 'UNUSUAL_ASSIGNMENT_COUNT':
        return 'Anormal atama sayısı';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-3">
          <Shield className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Wallet Güvenlik Merkezi</h2>
            <p className="text-sm opacity-90">Kritik güvenlik kontrolleri ve audit log sistemi</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs opacity-80">Toplam Cüzdan</div>
            <div className="text-2xl font-bold">{stats.totalWallets}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs opacity-80">Atanmış</div>
            <div className="text-2xl font-bold">{stats.assignedWallets}</div>
          </div>
          <div className={`rounded-lg p-3 ${stats.duplicates > 0 ? 'bg-red-500' : 'bg-white/10'}`}>
            <div className="text-xs opacity-80">Duplicate</div>
            <div className="text-2xl font-bold">{stats.duplicates}</div>
          </div>
          <div className={`rounded-lg p-3 ${stats.integrityIssues > 0 ? 'bg-yellow-500' : 'bg-white/10'}`}>
            <div className="text-xs opacity-80">Sorun</div>
            <div className="text-2xl font-bold">{stats.integrityIssues}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs opacity-80">Audit Log</div>
            <div className="text-2xl font-bold">{stats.auditLogCount}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Genel Bakış</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'duplicates'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Duplicate Check</span>
            {stats.duplicates > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                {stats.duplicates}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('integrity')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'integrity'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>Integrity Check</span>
            {stats.integrityIssues > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500 text-white rounded-full text-xs">
                {stats.integrityIssues}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Audit Log</span>
          </div>
        </button>
        <button
          onClick={loadAllData}
          className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Yenile</span>
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Lock className="w-5 h-5 text-green-600" />
              <span>Güvenlik Önlemleri</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-green-900">UNIQUE Constraint</div>
                  <div className="text-sm text-green-700">Her cüzdan adresi sadece 1 kez sisteme eklenebilir</div>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-green-900">Assignment Lock</div>
                  <div className="text-sm text-green-700">Bir cüzdan atandıktan sonra asla geri alınamaz</div>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-green-900">Audit Log</div>
                  <div className="text-sm text-green-700">Her atama immutable log'a yazılır - silinemez/değiştirilemez</div>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-green-900">Duplicate Prevention</div>
                  <div className="text-sm text-green-700">Database seviyesinde duplicate engelleme</div>
                </div>
              </div>
            </div>
          </div>

          {(stats.duplicates > 0 || stats.integrityIssues > 0) && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>UYARI: Güvenlik Sorunları Tespit Edildi!</span>
              </h3>
              {stats.duplicates > 0 && (
                <div className="mb-3 p-3 bg-red-100 rounded-lg">
                  <div className="font-bold text-red-900">{stats.duplicates} Duplicate Adres</div>
                  <div className="text-sm text-red-700">Aynı cüzdan adresi birden fazla kez sistemde!</div>
                  <button
                    onClick={() => setActiveTab('duplicates')}
                    className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                  >
                    Detaylara Git
                  </button>
                </div>
              )}
              {stats.integrityIssues > 0 && (
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <div className="font-bold text-yellow-900">{stats.integrityIssues} Integrity Sorunu</div>
                  <div className="text-sm text-yellow-700">Veri tutarsızlığı tespit edildi!</div>
                  <button
                    onClick={() => setActiveTab('integrity')}
                    className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium"
                  >
                    Detaylara Git
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'duplicates' && (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Duplicate Adresler</span>
          </h3>
          {duplicates.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <div className="text-xl font-bold text-green-900">Hiç duplicate adres yok!</div>
              <div className="text-sm text-gray-600">Sistem temiz, tüm adresler unique.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-mono text-sm text-red-900 break-all">{dup.address}</div>
                      <div className="text-xs text-red-700 mt-1">Network: {dup.network}</div>
                    </div>
                    <span className="ml-3 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold whitespace-nowrap">
                      {dup.count}x
                    </span>
                  </div>
                  <div className="text-xs text-red-700">
                    Wallet IDs: {dup.wallet_ids.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'integrity' && (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span>Integrity Sorunları</span>
          </h3>
          {integrityIssues.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <div className="text-xl font-bold text-green-900">Hiç integrity sorunu yok!</div>
              <div className="text-sm text-gray-600">Tüm veriler tutarlı ve doğru.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {integrityIssues.map((issue, idx) => (
                <div key={idx} className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-yellow-900">{getIssueTypeName(issue.issue_type)}</div>
                      <div className="font-mono text-xs text-yellow-800 mt-1 break-all">{issue.wallet_address}</div>
                      <div className="text-sm text-yellow-700 mt-2">{issue.details}</div>
                      <div className="text-xs text-yellow-600 mt-1">ID: {issue.wallet_id}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Wallet Atama Audit Log</span>
            </h3>
          </div>

          <div className="mb-4 flex space-x-2">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchAudit()}
              placeholder="Cüzdan adresi ile ara..."
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <button
              onClick={handleSearchAudit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Ara</span>
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Henüz audit log yok
              </div>
            ) : (
              auditLogs.map((log, idx) => (
                <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          log.wallet_network === 'BEP20'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.wallet_network}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{log.user_email}</span>
                      </div>
                      <div className="font-mono text-xs text-gray-700 break-all">{log.wallet_address}</div>
                      {log.notes && (
                        <div className="text-xs text-gray-500 mt-1">{log.notes}</div>
                      )}
                    </div>
                    <div className="ml-3 text-right">
                      <div className="text-xs text-gray-500">
                        {new Date(log.assigned_at).toLocaleString('tr-TR')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{log.assignment_method}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

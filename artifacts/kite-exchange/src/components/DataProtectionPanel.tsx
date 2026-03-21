import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Database,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileText,
  Users,
  DollarSign,
  ArrowUpDown,
  X,
  Info,
  RotateCcw,
  Trash2,
  BookOpen,
  AlertCircle,
  Lock,
  ChevronRight,
  Archive,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Backup {
  id: string;
  backup_name: string;
  backup_type: string;
  user_count: number;
  balance_count: number;
  transaction_count: number;
  notes: string | null;
  created_at: string;
}

interface AuditEntry {
  id: number;
  table_name: string;
  operation: string;
  record_id: string;
  old_data: any;
  new_data: any;
  changed_by: string;
  changed_at: string;
}

interface DeletedRecord {
  record_id: string;
  table_name: string;
  deleted_at: string | null;
  record_data: any;
}

interface SafetyRule {
  id: string;
  rule_number: number;
  rule_category: string;
  rule_title: string;
  rule_description: string;
  severity: string;
  is_active: boolean;
  created_at: string;
}

type Section = 'backup' | 'audit' | 'deleted' | 'rules';

const CRITICAL_TABLES = [
  'user_profiles', 'user_balances', 'transactions',
  'deposit_transactions', 'withdrawal_transactions',
  'futures_positions', 'futures_history', 'wallet_addresses',
];

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const CATEGORY_ICONS: Record<string, string> = {
  DATABASE: '🗄️',
  BACKUP: '💾',
  SOFT_DELETE: '🔒',
  AUDIT: '📋',
  SECURITY: '🛡️',
  TRANSACTION: '⚡',
};

export default function DataProtectionPanel() {
  const [activeSection, setActiveSection] = useState<Section>('backup');
  const [backups, setBackups] = useState<Backup[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [safetyRules, setSafetyRules] = useState<SafetyRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupNote, setBackupNote] = useState('');
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);
  const [selectedDeleted, setSelectedDeleted] = useState<DeletedRecord | null>(null);
  const [auditFilter, setAuditFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [deletedFilter, setDeletedFilter] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const [backupDataLoading, setBackupDataLoading] = useState(false);

  useEffect(() => {
    if (activeSection === 'backup') loadBackups();
    else if (activeSection === 'audit') loadAuditLog();
    else if (activeSection === 'deleted') loadDeletedRecords();
    else if (activeSection === 'rules') loadSafetyRules();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'audit') loadAuditLog();
  }, [auditFilter, operationFilter]);

  useEffect(() => {
    if (activeSection === 'deleted') loadDeletedRecords();
  }, [deletedFilter]);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_backup_list');
    if (data) setBackups(data);
    setLoading(false);
  }, []);

  const loadAuditLog = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(200);
    if (auditFilter) query = query.eq('table_name', auditFilter);
    if (operationFilter) query = query.eq('operation', operationFilter);
    const { data } = await query;
    if (data) setAuditLog(data);
    setLoading(false);
  }, [auditFilter, operationFilter]);

  const loadDeletedRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_deleted_records', {
      p_table_name: deletedFilter || null,
      p_limit: 100,
    });
    if (data) setDeletedRecords(data);
    setLoading(false);
  }, [deletedFilter]);

  const loadSafetyRules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_safety_rules');
    if (data) setSafetyRules(data);
    setLoading(false);
  }, []);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 5000);
  }

  function showError(msg: string) {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 6000);
  }

  async function handleCreateBackup() {
    setBackupLoading(true);
    const { data, error } = await supabase.rpc('create_full_backup', {
      p_backup_name: backupNote || undefined,
      p_notes: backupNote || undefined,
      p_backup_type: 'manual',
    });
    setBackupLoading(false);
    if (error) {
      showError('Yedek alinamadi: ' + error.message);
      return;
    }
    showSuccess('Yedek basariyla alindi!');
    setBackupNote('');
    loadBackups();
  }

  async function handleRestoreRecord(record: DeletedRecord) {
    if (!confirm(`"${record.table_name}" tablosundaki bu kaydı geri almak istediginizden emin misiniz?`)) return;
    setRestoring(record.record_id);
    const { data, error } = await supabase.rpc('restore_deleted_record', {
      p_table_name: record.table_name,
      p_record_id: record.record_id,
    });
    setRestoring(null);
    if (error || !data) {
      showError('Geri alma basarisiz: ' + (error?.message || 'Bilinmeyen hata'));
      return;
    }
    showSuccess('Kayit basariyla geri alindi!');
    setSelectedDeleted(null);
    loadDeletedRecords();
  }

  async function handleViewBackupData(backup: Backup) {
    setSelectedBackup(backup);
    setBackupData(null);
    setBackupDataLoading(true);
    const { data, error } = await supabase.rpc('get_backup_data', {
      p_backup_id: backup.id,
    });
    setBackupDataLoading(false);
    if (error) {
      showError('Yedek verisi yuklenemedi: ' + error.message);
      return;
    }
    setBackupData(data);
  }

  function handleExportBackup(backup: Backup) {
    if (!backupData) return;
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yedek_${backup.backup_name.replace(/[^a-z0-9]/gi, '_')}_${new Date(backup.created_at).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(dt: string) {
    return new Date(dt).toLocaleString('tr-TR');
  }

  function operationColor(op: string) {
    if (op === 'DELETE') return 'bg-red-100 text-red-700';
    if (op === 'UPDATE') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }

  const sections: { key: Section; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'backup', label: 'Yedekler', icon: <Database className="w-4 h-4" />, count: backups.length },
    { key: 'audit', label: 'Audit Log', icon: <FileText className="w-4 h-4" />, count: auditLog.length || undefined },
    { key: 'deleted', label: 'Silinen Kayitlar', icon: <Trash2 className="w-4 h-4" />, count: deletedRecords.length || undefined },
    { key: 'rules', label: 'Guvenlik Kurallari', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Baslik */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Veri Koruma Merkezi</h2>
          <p className="text-sm text-gray-500">Yedekleme, Audit Log, Soft Delete ve Guvenlik Kurallari</p>
        </div>
      </div>

      {/* Durum Kartlari */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700">Audit Log</span>
          </div>
          <p className="text-xs text-green-600">8 kritik tablo izleniyor</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Soft Delete</span>
          </div>
          <p className="text-xs text-blue-600">8 tablo korunuyor</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-semibold text-orange-700">Snapshot</span>
          </div>
          <p className="text-xs text-orange-600">Tek tiklama yedek</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700">10 Kural Aktif</span>
          </div>
          <p className="text-xs text-red-600">DROP/DELETE yasak</p>
        </div>
      </div>

      {/* Global mesajlar */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-sm text-green-700 font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm text-red-700 font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Sekmeler */}
      <div className="flex gap-2 flex-wrap">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === s.key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.icon}
            {s.label}
            {s.count !== undefined && s.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeSection === s.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- YEDEKLER ---- */}
      {activeSection === 'backup' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Yeni Yedek Al</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={backupNote}
                onChange={e => setBackupNote(e.target.value)}
                placeholder="Yedek notu (orn: Migration oncesi yedek)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleCreateBackup}
                disabled={backupLoading}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {backupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {backupLoading ? 'Aliyor...' : 'Yedek Al'}
              </button>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-500" />
              <span>Migration veya buyuk degisiklik ONCESINDE mutlaka yedek al. Yedek JSON olarak da indirilebilir.</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Yedek Gecmisi</h3>
              <button onClick={loadBackups} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Yukleniyor...</div>
            ) : backups.length === 0 ? (
              <div className="py-12 text-center">
                <Database className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Henuz yedek alinmamis. Yukardaki butona tikla.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {backups.map(b => (
                  <div key={b.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{b.backup_name}</p>
                      {b.notes && <p className="text-xs text-gray-500 truncate">{b.notes}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(b.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.user_count}</span>
                      <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" />{b.transaction_count}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.backup_type === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {b.backup_type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleViewBackupData(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors shrink-0"
                    >
                      <Eye className="w-3 h-3" />
                      Goruntule
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- AUDIT LOG ---- */}
      {activeSection === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={auditFilter}
                onChange={e => setAuditFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">Tum Tablolar</option>
                {CRITICAL_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={operationFilter}
                onChange={e => setOperationFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">Tum Islemler</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
              <button onClick={loadAuditLog} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              <span className="text-xs text-gray-400 ml-auto">Son 200 kayit</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Yukleniyor...</div>
            ) : auditLog.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Kayit bulunamadi.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {auditLog.map(entry => (
                  <div
                    key={entry.id}
                    className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAudit(entry)}
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${operationColor(entry.operation)}`}>
                      {entry.operation}
                    </span>
                    <span className="text-sm font-medium text-gray-700 shrink-0 w-44 truncate">{entry.table_name}</span>
                    <span className="text-xs text-gray-400 flex-1 truncate font-mono">ID: {entry.record_id || '-'}</span>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(entry.changed_at)}</span>
                    <Eye className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- SILINEN KAYITLAR ---- */}
      {activeSection === 'deleted' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Soft Delete Korumasiyla Saklanan Kayitlar</p>
              <p className="text-xs text-amber-700 mt-0.5">Asagidaki kayitlar gercekten silinmemistir, sadece gizlenmistir. Tek tiklama ile geri alabilirsin.</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={deletedFilter}
                onChange={e => setDeletedFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="">Tum Tablolar</option>
                {CRITICAL_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={loadDeletedRecords} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              <span className="text-xs text-gray-400 ml-auto">Son 100 kayit</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Yukleniyor...</div>
            ) : deletedRecords.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Silinen kayit yok</p>
                <p className="text-xs text-gray-400 mt-1">Hicbir veri soft-delete ile gizlenmemis.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {deletedRecords.map(record => (
                  <div key={record.record_id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{record.table_name}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">ID: {record.record_id}</p>
                      {record.deleted_at && (
                        <p className="text-xs text-red-500 mt-0.5">Silindi: {formatDate(record.deleted_at)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedDeleted(record)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Detay goster"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleRestoreRecord(record)}
                        disabled={restoring === record.record_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        {restoring === record.record_id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <RotateCcw className="w-3 h-3" />
                        }
                        Geri Al
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- GUVENLIK KURALLARI ---- */}
      {activeSection === 'rules' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Degistirilemez Guvenlik Kurallari</p>
              <p className="text-xs text-red-700 mt-0.5">Bu kurallar veritabanina kayitlidir ve hic bir zaman ihlal edilemez. Veri kaybini onlemek icin tasarlanmistir.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Yukleniyor...</div>
          ) : (
            <div className="space-y-3">
              {safetyRules.map(rule => (
                <div key={rule.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-gray-600">
                      {rule.rule_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-gray-900">{rule.rule_title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_STYLES[rule.severity] || 'bg-gray-100 text-gray-600'}`}>
                          {rule.severity === 'critical' ? 'Kritik' : rule.severity === 'high' ? 'Yuksek' : 'Orta'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {CATEGORY_ICONS[rule.rule_category] || ''} {rule.rule_category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{rule.rule_description}</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- AUDIT DETAY MODAL ---- */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAudit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${operationColor(selectedAudit.operation)}`}>
                  {selectedAudit.operation}
                </span>
                <h3 className="text-sm font-bold text-gray-900">{selectedAudit.table_name}</h3>
              </div>
              <button onClick={() => setSelectedAudit(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="text-xs text-gray-500 flex gap-4 flex-wrap">
                <span>Record ID: <span className="font-mono font-medium text-gray-700">{selectedAudit.record_id || '-'}</span></span>
                <span>Tarih: <span className="font-medium text-gray-700">{formatDate(selectedAudit.changed_at)}</span></span>
              </div>
              {selectedAudit.old_data && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-2">Onceki Veri</p>
                  <pre className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedAudit.old_data, null, 2)}
                  </pre>
                </div>
              )}
              {selectedAudit.new_data && (
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-2">Yeni Veri</p>
                  <pre className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedAudit.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- SILINEN KAYIT DETAY MODAL ---- */}
      {selectedDeleted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDeleted(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{selectedDeleted.table_name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedDeleted.record_id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDeleted(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {selectedDeleted.deleted_at && (
                <div className="text-xs text-red-600 font-medium">
                  Gizlenme Tarihi: {formatDate(selectedDeleted.deleted_at)}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Kayit Verisi</p>
                <pre className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(selectedDeleted.record_data, null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setSelectedDeleted(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Kapat
              </button>
              <button
                onClick={() => handleRestoreRecord(selectedDeleted)}
                disabled={restoring === selectedDeleted.record_id}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {restoring === selectedDeleted.record_id
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <RotateCcw className="w-4 h-4" />
                }
                Bu Kaydi Geri Al
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- YEDEK GORUNTULE MODAL ---- */}
      {selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedBackup(null); setBackupData(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                  <Database className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{selectedBackup.backup_name}</h3>
                  <p className="text-xs text-gray-400">{formatDate(selectedBackup.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {backupData && (
                  <button
                    onClick={() => handleExportBackup(selectedBackup)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    JSON Indir
                  </button>
                )}
                <button onClick={() => { setSelectedBackup(null); setBackupData(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {backupDataLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 text-gray-400 mx-auto animate-spin mb-3" />
                  <p className="text-sm text-gray-500">Yedek verisi yukleniyor...</p>
                </div>
              ) : backupData ? (
                <div className="space-y-4">
                  {/* Ozet */}
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(backupData).filter(([k]) => !['backup_time', 'backup_version'].includes(k)).map(([key, val]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{Array.isArray(val) ? val.length : '-'}</p>
                        <p className="text-xs text-gray-500 truncate">{key}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Ham Veri (ilk 50 satir ozet)</p>
                    <pre className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs overflow-x-auto text-gray-700 whitespace-pre-wrap max-h-96">
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(backupData).map(([k, v]) => [
                            k,
                            Array.isArray(v) ? `[${v.length} kayit]` : v
                          ])
                        ),
                        null, 2
                      )}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">Veri yuklenemedi.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowDownLeft,
  RefreshCw,
  Search,
  Send,
  Users,
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
  TrendingUp,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  Activity,
  Volume2,
  VolumeX,
  AlertTriangle,
  BarChart3,
  Layers,
  Radio,
  Shield,
  ChevronDown,
  Upload,
  Key,
  FileText,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WalletTransaction {
  id: string;
  user_id: string | null;
  wallet_address: string;
  network: string;
  tx_hash: string;
  from_address: string;
  token_symbol: string;
  token_contract: string | null;
  amount: number;
  amount_usd: number | null;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  block_time: string | null;
  is_notified: boolean;
  created_at: string;
  user_profiles?: {
    email: string;
    full_name: string;
  };
}

interface UserWithWallet {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  days_since_signup: number;
  has_bep20: boolean;
  has_trc20: boolean;
  bep20_address: string | null;
  trc20_address: string | null;
  total_received_usdt: number;
  total_tx_count: number;
  last_tx_at: string | null;
  total_user_count: number;
}

interface MonitorLog {
  id: string;
  run_at: string;
  network: string;
  wallets_checked: number;
  transactions_found: number;
  error_message: string | null;
  duration_ms: number;
}

interface Summary {
  total_transactions: number;
  total_usd: number;
  unnotified_count: number;
  today_count: number;
  today_usd: number;
  bep20_count: number;
  trc20_count: number;
  pending_count: number;
  confirmed_count: number;
  this_week_usd: number;
  unique_senders: number;
  unique_users_with_tx: number;
}

interface WalletPoolStats {
  total_wallets: number;
  assigned_count: number;
  available_count: number;
  bep20_total: number;
  trc20_total: number;
  bep20_assigned: number;
  trc20_assigned: number;
  bep20_available: number;
  trc20_available: number;
}

interface SendForm {
  userId: string;
  email: string;
  symbol: string;
  amount: string;
  notes: string;
  walletTxId: string | null;
  detectedAmount: number | null;
  detectedSymbol: string | null;
}

interface LiveAlert {
  id: string;
  tx: WalletTransaction;
  timestamp: number;
}

interface AutoScanStatus {
  last_run_at: string | null;
  last_transactions_found: number;
  last_balances_credited: number;
  last_status: string;
  total_runs: number;
  minutes_since_last_run: number | null;
}

interface WalletUploadRow {
  address: string;
  private_key: string;
  api_key: string;
  valid: boolean;
  error?: string;
}

const QUICK_SYMBOLS = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'TRX', 'EQ'];

const PAGE_SIZE = 25;
type PanelTab = 'incoming' | 'users' | 'wallet-pool' | 'monitor-log';
type TxFilter = 'all' | 'BEP20' | 'TRC20' | 'XRP' | 'SOL' | 'BTC' | 'LTC' | 'DOGE' | 'pending' | 'confirmed' | 'unnotified' | 'today';
type UserFilter = 'all' | 'no_deposit' | 'has_deposit' | 'no_wallet' | 'today';

function truncate(addr: string, chars = 8) {
  if (!addr) return '';
  return `${addr.slice(0, chars)}...${addr.slice(-6)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}s önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

function explorerUrl(txHash: string, network: string) {
  if (network === 'BEP20') return `https://bscscan.com/tx/${txHash}`;
  if (network === 'TRC20') return `https://tronscan.org/#/transaction/${txHash}`;
  return '#';
}

function addressExplorerUrl(addr: string, network: string) {
  if (network === 'BEP20') return `https://bscscan.com/address/${addr}`;
  if (network === 'TRC20') return `https://tronscan.org/#/address/${addr}`;
  return '#';
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function validateBEP20Address(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

function validateTRC20Address(addr: string) {
  return /^T[0-9a-zA-Z]{33}$/.test(addr.trim());
}

function parseWalletCSV(text: string, network: 'BEP20' | 'TRC20'): WalletUploadRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const rows: WalletUploadRow[] = [];
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    const address = parts[0] || '';
    const private_key = parts[1] || '';
    const api_key = parts[2] || '';
    const valid = network === 'BEP20' ? validateBEP20Address(address) : validateTRC20Address(address);
    rows.push({
      address,
      private_key,
      api_key,
      valid,
      error: !valid ? 'Geçersiz adres formatı' : !private_key ? 'Private key eksik' : '',
    });
  }
  return rows;
}

export default function IncomingFundsPanel() {
  const [panelTab, setPanelTab] = useState<PanelTab>('incoming');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [users, setUsers] = useState<UserWithWallet[]>([]);
  const [monitorLogs, setMonitorLogs] = useState<MonitorLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [walletStats, setWalletStats] = useState<WalletPoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [txSearch, setTxSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [txPage, setTxPage] = useState(0);
  const [txTotal, setTxTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState<SendForm>({
    userId: '', email: '', symbol: 'USDT', amount: '', notes: '', walletTxId: null, detectedAmount: null, detectedSymbol: null,
  });
  const [sendLoading, setSendLoading] = useState(false);
  const [allCoins, setAllCoins] = useState<string[]>([]);
  const [coinSearch, setCoinSearch] = useState('');
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highlightNew, setHighlightNew] = useState<Set<string>>(new Set());
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [autoScanStatus, setAutoScanStatus] = useState<AutoScanStatus | null>(null);
  const [autoScanLoading, setAutoScanLoading] = useState(false);

  // Wallet upload state
  const [bep20Text, setBep20Text] = useState('');
  const [trc20Text, setTrc20Text] = useState('');
  const [bep20Rows, setBep20Rows] = useState<WalletUploadRow[]>([]);
  const [trc20Rows, setTrc20Rows] = useState<WalletUploadRow[]>([]);
  const [bep20Uploading, setBep20Uploading] = useState(false);
  const [trc20Uploading, setTrc20Uploading] = useState(false);
  const [bep20Progress, setBep20Progress] = useState(0);
  const [trc20Progress, setTrc20Progress] = useState(0);
  const [showBep20Keys, setShowBep20Keys] = useState(false);
  const [showTrc20Keys, setShowTrc20Keys] = useState(false);
  const bep20FileRef = useRef<HTMLInputElement>(null);
  const trc20FileRef = useRef<HTMLInputElement>(null);

  const showNotif = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSummary = useCallback(async () => {
    const { data } = await supabase.rpc('get_incoming_funds_summary');
    if (data) setSummary(data as Summary);
  }, []);

  const loadAllCoins = useCallback(async () => {
    const { data } = await supabase.from('supported_coins').select('symbol').order('symbol');
    if (data) setAllCoins(data.map((c: { symbol: string }) => c.symbol));
  }, []);

  const loadWalletStats = useCallback(async () => {
    const { data } = await supabase.rpc('get_wallet_pool_stats');
    if (data) setWalletStats(data as WalletPoolStats);
  }, []);

  const loadTransactions = useCallback(async () => {
    let query = supabase
      .from('wallet_transactions')
      .select('*, user_profiles(email, full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(txPage * PAGE_SIZE, (txPage + 1) * PAGE_SIZE - 1);

    const networkFilters = ['BEP20', 'TRC20', 'XRP', 'SOL', 'BTC', 'LTC', 'DOGE'];
    if (networkFilters.includes(txFilter)) query = query.eq('network', txFilter);
    else if (txFilter === 'pending') query = query.eq('status', 'pending');
    else if (txFilter === 'confirmed') query = query.eq('status', 'confirmed');
    else if (txFilter === 'unnotified') query = query.eq('is_notified', false);
    else if (txFilter === 'today') query = query.gte('created_at', new Date().toISOString().split('T')[0]);

    if (txSearch.trim()) {
      query = query.or(`wallet_address.ilike.%${txSearch}%,from_address.ilike.%${txSearch}%,tx_hash.ilike.%${txSearch}%,token_symbol.ilike.%${txSearch}%`);
    }

    const { data, count } = await query;
    setTransactions((data as WalletTransaction[]) || []);
    setTxTotal(count || 0);
  }, [txFilter, txSearch, txPage]);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.rpc('get_users_with_wallet_details', {
      p_limit: PAGE_SIZE,
      p_offset: usersPage * PAGE_SIZE,
      p_filter: userFilter,
    });
    if (!data) return;
    const list = data as UserWithWallet[];
    setUsers(list);
    setUsersTotal(list.length > 0 ? Number(list[0].total_user_count) : 0);
  }, [usersPage, userFilter]);

  const loadMonitorLogs = useCallback(async () => {
    const { data } = await supabase
      .from('wallet_monitor_log')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(100);
    setMonitorLogs((data as MonitorLog[]) || []);
  }, []);

  const loadAutoScanStatus = useCallback(async () => {
    const { data } = await supabase.rpc('get_auto_scan_status');
    if (data) setAutoScanStatus(data as AutoScanStatus);
  }, []);

  const triggerManualAutoScan = async () => {
    setAutoScanLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/auto-wallet-scanner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
        body: JSON.stringify({ triggered_by: 'manual' }),
      });
      const result = await resp.json();
      if (result.success) {
        const credited = result.credited_to_balances || 0;
        showNotif('success', credited > 0
          ? `Tarama tamamlandi: ${result.wallets_scanned} cüzdan, ${credited} bakiye yazildi!`
          : `Tarama tamamlandi: ${result.wallets_scanned} cüzdan tarandı, yeni işlem yok`
        );
        await Promise.all([loadSummary(), loadTransactions(), loadMonitorLogs(), loadAutoScanStatus()]);
      } else {
        showNotif('error', result.error || 'Tarama hatası');
      }
    } catch (e) {
      showNotif('error', `Bağlantı hatası: ${e}`);
    } finally {
      setAutoScanLoading(false);
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSummary(), loadTransactions(), loadMonitorLogs(), loadWalletStats(), loadAllCoins(), loadAutoScanStatus()]);
    setLoading(false);
  }, [loadSummary, loadTransactions, loadMonitorLogs, loadWalletStats, loadAllCoins, loadAutoScanStatus]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (panelTab === 'users') loadUsers(); }, [panelTab, loadUsers]);
  useEffect(() => { if (panelTab === 'wallet-pool') loadWalletStats(); }, [panelTab, loadWalletStats]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAutoScanStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAutoScanStatus]);

  useEffect(() => {
    const channel = supabase
      .channel('wallet_incoming_realtime_v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, (payload) => {
        const newTx = payload.new as WalletTransaction;
        if (soundEnabled) playNotificationSound();
        const alert: LiveAlert = { id: newTx.id, tx: newTx, timestamp: Date.now() };
        setLiveAlerts(prev => [alert, ...prev].slice(0, 5));
        setTimeout(() => setLiveAlerts(prev => prev.filter(a => a.id !== alert.id)), 15000);
        setHighlightNew(prev => new Set([...prev, newTx.id]));
        setTimeout(() => setHighlightNew(prev => { const n = new Set(prev); n.delete(newTx.id); return n; }), 8000);
        loadTransactions();
        loadSummary();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallet_transactions' }, () => {
        loadTransactions();
        loadSummary();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [soundEnabled, loadTransactions, loadSummary]);

  const handleManualScan = async (network: 'ALL' | 'BEP20' | 'TRC20' = 'ALL') => {
    setScanning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      let totalScanned = 0;
      let totalFound = 0;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const resp = await fetch(`${supabaseUrl}/functions/v1/wallet-inbox-monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || anonKey}`, 'apikey': anonKey },
          body: JSON.stringify({ action: 'scan', network, batch_offset: offset }),
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => 'Sunucu hatası');
          showNotif('error', `Tarama hatası (HTTP ${resp.status})`);
          break;
        }

        const result = await resp.json();

        if (!result.success) {
          showNotif('error', result.error || 'Tarama hatası');
          break;
        }

        totalScanned += result.wallets_scanned || 0;
        totalFound += result.new_transactions || 0;
        hasMore = result.has_more === true;
        offset = result.next_offset || 0;

        if (result.batch_info) {
          showNotif('success', `Taranıyor: ${result.batch_info} (${result.new_transactions || 0} yeni)`);
        }
      }

      showNotif('success', `Tarama tamamlandı: ${totalScanned} cüzdan, ${totalFound} yeni işlem`);
      await loadAll();
    } catch (e) {
      showNotif('error', `Bağlantı hatası - lütfen tekrar deneyin`);
    } finally {
      setScanning(false);
    }
  };

  const checkSingleWallet = async (address: string, forceCredit = false) => {
    setScanning(true);
    showNotif('success', `Taranıyor: ${address.slice(0, 10)}...${forceCredit ? ' (zorla bakiye)' : ''}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/wallet-inbox-monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || anonKey}`, 'apikey': anonKey },
        body: JSON.stringify({ action: 'check_wallet', address, force_credit: forceCredit }),
      });
      const text = await resp.text();
      let result: any = {};
      try { result = JSON.parse(text); } catch { result = { success: false, error: text }; }

      if (result.success) {
        const found = result.new_transactions || 0;
        const credited = result.credited_to_balance || 0;
        if (credited > 0) {
          if (soundEnabled) playNotificationSound();
          showNotif('success', `${found} işlem bulundu, ${credited} bakiyeye yazıldı!`);
        } else if (found > 0) {
          showNotif('success', `${found} işlem zaten kayıtlı - bakiyeye yazılmadı. "Zorla Bakiye" butonu ile yazabilirsiniz.`);
        } else {
          showNotif('success', `Tarama tamamlandı: ${result.network || ''} - zincirde işlem bulunamadı (${result.duration_ms || 0}ms)`);
        }
        await loadAll();
      } else {
        showNotif('error', `Hata: ${result.error || 'Bilinmeyen hata'} (HTTP ${resp.status})`);
        console.error('wallet-inbox-monitor error:', result);
      }
    } catch (e) {
      showNotif('error', `Bağlantı hatası: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  const testEdgeFunction = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/wallet-inbox-monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || anonKey}`, 'apikey': anonKey },
        body: JSON.stringify({ action: 'test' }),
      });
      const result = await resp.json();
      const bscKey = result.api_keys?.bscscan ? 'key var' : 'key yok';
      const msg = `Durum: ${result.status || '?'} | BSCScan: ${bscKey} | Toplam cüzdan: ${result.total_wallets || 0} | Atanmış: ${result.assigned_wallets || 0}`;
      showNotif(result.status === 'ok' ? 'success' : 'error', msg);
    } catch (e) {
      showNotif('error', `Test hatası: ${e}`);
    }
  };

  const markAllNotified = async () => {
    const { data } = await supabase.from('wallet_transactions').select('id').eq('is_notified', false);
    if (!data || data.length === 0) return;
    const ids = data.map(t => t.id);
    await supabase.rpc('mark_transactions_notified', { tx_ids: ids });
    showNotif('success', `${ids.length} işlem okundu olarak işaretlendi`);
    await loadTransactions();
    await loadSummary();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showNotif('success', 'Kopyalandı'));
  };

  const openSendModal = (userId: string, email: string, tx?: WalletTransaction) => {
    const detectedSymbol = tx?.token_symbol?.toUpperCase() || 'USDT';
    setSendForm({
      userId, email,
      symbol: detectedSymbol,
      amount: tx ? String(tx.amount) : '',
      notes: tx ? `TX: ${tx.tx_hash.slice(0, 16)}... - ${tx.network} üzerinden ${tx.amount} ${tx.token_symbol}` : '',
      walletTxId: tx?.id || null,
      detectedAmount: tx?.amount || null,
      detectedSymbol: tx?.token_symbol || null,
    });
    setCoinSearch('');
    setShowSendModal(true);
  };

  const handleSendBalance = async () => {
    if (!sendForm.userId || !sendForm.amount || parseFloat(sendForm.amount) <= 0) {
      showNotif('error', 'Geçerli bir miktar giriniz');
      return;
    }
    setSendLoading(true);
    try {
      const { data, error } = await supabase.rpc('credit_user_from_wallet_tx', {
        p_user_id: sendForm.userId,
        p_coin_symbol: sendForm.symbol,
        p_amount: parseFloat(sendForm.amount),
        p_wallet_tx_id: sendForm.walletTxId || null,
        p_notes: sendForm.notes || `Admin kredisi - ${sendForm.symbol}`,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error);
      showNotif('success', `${sendForm.amount} ${sendForm.symbol} başarıyla gönderildi`);
      setShowSendModal(false);
      await loadTransactions();
      await loadSummary();
      if (panelTab === 'users') await loadUsers();
    } catch (e) {
      showNotif('error', `Gönderme hatası: ${e}`);
    } finally {
      setSendLoading(false);
    }
  };

  // Wallet upload handlers
  const handleBep20Parse = (text: string) => {
    setBep20Text(text);
    if (text.trim()) setBep20Rows(parseWalletCSV(text, 'BEP20'));
    else setBep20Rows([]);
  };

  const handleTrc20Parse = (text: string) => {
    setTrc20Text(text);
    if (text.trim()) setTrc20Rows(parseWalletCSV(text, 'TRC20'));
    else setTrc20Rows([]);
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>, network: 'BEP20' | 'TRC20') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (network === 'BEP20') handleBep20Parse(text);
      else handleTrc20Parse(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const uploadWallets = async (network: 'BEP20' | 'TRC20') => {
    const rows = network === 'BEP20' ? bep20Rows : trc20Rows;
    const validRows = rows.filter(r => r.valid && r.private_key);
    if (validRows.length === 0) {
      showNotif('error', 'Yüklenecek geçerli cüzdan yok');
      return;
    }

    const setUploading = network === 'BEP20' ? setBep20Uploading : setTrc20Uploading;
    const setProgress = network === 'BEP20' ? setBep20Progress : setTrc20Progress;

    setUploading(true);
    setProgress(0);

    const BATCH = 100;
    let uploaded = 0;

    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH);
      const inserts = batch.map(r => ({
        address: r.address.trim(),
        network,
        encrypted_private_key: r.private_key.trim(),
        api_key: r.api_key.trim() || null,
        api_key_label: r.api_key.trim() ? `${network}-${r.api_key.trim().slice(0, 8)}` : null,
        is_assigned: false,
      }));

      const { error } = await supabase
        .from('wallet_pool')
        .upsert(inserts, { onConflict: 'address', ignoreDuplicates: true });

      if (error) {
        showNotif('error', `Yükleme hatası (batch ${Math.floor(i / BATCH) + 1}): ${error.message}`);
        setUploading(false);
        return;
      }

      uploaded += batch.length;
      setProgress(Math.round((uploaded / validRows.length) * 100));
      await new Promise(r => setTimeout(r, 50));
    }

    showNotif('success', `${uploaded} ${network} cüzdanı başarıyla yüklendi`);
    setUploading(false);
    setProgress(100);
    if (network === 'BEP20') { setBep20Text(''); setBep20Rows([]); }
    else { setTrc20Text(''); setTrc20Rows([]); }
    await loadWalletStats();
  };

  const totalTxPages = Math.ceil(txTotal / PAGE_SIZE);
  const totalUserPages = Math.ceil(usersTotal / PAGE_SIZE);

  const bep20ValidCount = bep20Rows.filter(r => r.valid).length;
  const trc20ValidCount = trc20Rows.filter(r => r.valid).length;
  const bep20WithKey = bep20Rows.filter(r => r.valid && r.api_key).length;
  const trc20WithKey = trc20Rows.filter(r => r.valid && r.api_key).length;

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'confirmed') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle className="w-3 h-3" /> Onaylı
      </span>
    );
    if (status === 'pending') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" /> Bekliyor
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <AlertCircle className="w-3 h-3" /> Başarısız
      </span>
    );
  };

  const networkBadgeClass = (network: string) => {
    switch (network) {
      case 'BEP20': return 'bg-yellow-500 text-black';
      case 'TRC20': return 'bg-red-600 text-white';
      case 'XRP':   return 'bg-blue-600 text-white';
      case 'SOL':   return 'bg-fuchsia-600 text-white';
      case 'BTC':   return 'bg-orange-500 text-white';
      case 'LTC':   return 'bg-slate-500 text-white';
      case 'DOGE':  return 'bg-amber-500 text-black';
      default:      return 'bg-gray-600 text-white';
    }
  };
  const networkLabel = (network: string) => {
    switch (network) {
      case 'BEP20': return 'BSC';
      case 'TRC20': return 'TRON';
      default: return network;
    }
  };
  const NetworkBadge = ({ network }: { network: string }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${networkBadgeClass(network)}`}>
      {networkLabel(network)}
    </span>
  );

  return (
    <div className="space-y-4 relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.msg}
        </div>
      )}

      {/* Live Alerts */}
      {liveAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[55] space-y-2 w-72">
          {liveAlerts.map(alert => (
            <div key={alert.id} className="bg-gray-900 text-white rounded-xl p-3.5 shadow-2xl border border-green-500/30">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-green-400">YENİ PARA GELDİ</span>
                    <NetworkBadge network={alert.tx.network} />
                  </div>
                  <p className="text-sm font-bold">
                    {parseFloat(alert.tx.amount.toString()).toLocaleString('tr-TR', { maximumFractionDigits: 4 })} {alert.tx.token_symbol}
                    {alert.tx.amount_usd && <span className="text-gray-400 font-normal ml-1">(≈${alert.tx.amount_usd.toFixed(2)})</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {alert.tx.user_profiles?.email || truncate(alert.tx.wallet_address, 8)}
                  </p>
                </div>
                <button onClick={() => setLiveAlerts(prev => prev.filter(a => a.id !== alert.id))} className="text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft className="w-5 h-5 text-green-600" />
            </div>
            Cüzdana Gelenler
            {summary && summary.unnotified_count > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold animate-pulse">
                {summary.unnotified_count} yeni
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 ml-10">BEP20 · TRC20 · XRP · SOL · BTC · LTC · DOGE gerçek zamanlı izleme</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSoundEnabled(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${
              soundEnabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
          </button>
          {summary && summary.unnotified_count > 0 && (
            <button onClick={markAllNotified} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
              <BellOff className="w-3.5 h-3.5" />
              Tümünü Oku
            </button>
          )}
          <button onClick={testEdgeFunction} className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white rounded-lg text-xs font-bold hover:bg-gray-500 border border-gray-500">
            <Activity className="w-3.5 h-3.5" />
            API Test
          </button>
          <div className="flex gap-1">
            <button onClick={() => handleManualScan('BEP20')} disabled={scanning} className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-black rounded-lg text-xs font-bold hover:bg-yellow-400 disabled:opacity-50">
              {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              BSC Tara
            </button>
            <button onClick={() => handleManualScan('TRC20')} disabled={scanning} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50">
              {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              TRON Tara
            </button>
            <button onClick={() => handleManualScan('ALL')} disabled={scanning} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50">
              {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
              Tümünü Tara
            </button>
          </div>
          <button onClick={loadAll} disabled={loading} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Bugün Gelen', value: summary.today_count, sub: `$${summary.today_usd.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'emerald', pulse: summary.today_count > 0 },
            { label: 'Toplam İşlem', value: summary.total_transactions, sub: `$${summary.total_usd.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, icon: Activity, color: 'blue' },
            { label: 'Bu Hafta', value: `$${summary.this_week_usd.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`, sub: 'Son 7 gün', icon: BarChart3, color: 'teal' },
            { label: 'BSC (BEP20)', value: summary.bep20_count, sub: 'işlem', icon: Layers, color: 'yellow' },
            { label: 'TRON (TRC20)', value: summary.trc20_count, sub: 'işlem', icon: Layers, color: 'red' },
            { label: 'Bildirim', value: summary.unnotified_count, sub: summary.unnotified_count > 0 ? 'yeni işlem' : 'hepsi okundu', icon: Bell, color: summary.unnotified_count > 0 ? 'orange' : 'gray', pulse: summary.unnotified_count > 0 },
          ].map(({ label, value, sub, icon: Icon, color, pulse }) => (
            <div key={label} className={`bg-white rounded-xl p-3 shadow-sm border ${pulse ? 'border-green-300 ring-1 ring-green-300' : 'border-gray-200'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${
                color === 'emerald' ? 'bg-emerald-100' : color === 'blue' ? 'bg-blue-100' :
                color === 'teal' ? 'bg-teal-100' : color === 'yellow' ? 'bg-yellow-100' :
                color === 'red' ? 'bg-red-100' : color === 'orange' ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <Icon className={`w-4 h-4 ${
                  color === 'emerald' ? 'text-emerald-600' : color === 'blue' ? 'text-blue-600' :
                  color === 'teal' ? 'text-teal-600' : color === 'yellow' ? 'text-yellow-600' :
                  color === 'red' ? 'text-red-600' : color === 'orange' ? 'text-orange-500' : 'text-gray-400'
                }`} />
              </div>
              <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Auto Scan Status */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-xl p-4 text-white border border-emerald-700/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Radio className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-emerald-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">Otomatik Tarama Aktif</p>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/40">
                  Her 2 dakikada
                </span>
              </div>
              {autoScanStatus ? (
                <p className="text-xs text-emerald-300 mt-0.5">
                  {autoScanStatus.last_run_at
                    ? `Son tarama: ${autoScanStatus.minutes_since_last_run !== null ? `${Math.round(autoScanStatus.minutes_since_last_run)}dk önce` : timeAgo(autoScanStatus.last_run_at)} · ${autoScanStatus.last_transactions_found} işlem · ${autoScanStatus.last_balances_credited} bakiye yazıldı`
                    : 'Henüz çalışmadı - ilk tarama en geç 2dk içinde başlayacak'
                  }
                  {autoScanStatus.total_runs > 0 && ` · Toplam ${autoScanStatus.total_runs} çalışma`}
                </p>
              ) : (
                <p className="text-xs text-emerald-400/70 mt-0.5">Durum yükleniyor...</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoScanStatus?.last_status && autoScanStatus.last_status !== 'never' && (
              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                autoScanStatus.last_status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                autoScanStatus.last_status === 'failed' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {autoScanStatus.last_status === 'completed' ? 'Başarılı' : autoScanStatus.last_status === 'failed' ? 'Hata' : 'Çalışıyor'}
              </span>
            )}
            <button
              onClick={triggerManualAutoScan}
              disabled={autoScanLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
            >
              {autoScanLoading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Taranıyor...</>
                : <><Zap className="w-4 h-4" /> Hemen Tara</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Pool Quick Bar */}
      {walletStats && (
        <div className="bg-gray-900 rounded-xl p-3 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-xs font-bold">Cüzdan Havuzu</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><p className="font-bold text-white">{walletStats.total_wallets.toLocaleString()}</p><p className="text-gray-500">Toplam</p></div>
            <div><p className="font-bold text-blue-300">{walletStats.assigned_count.toLocaleString()}</p><p className="text-gray-500">Atandı</p></div>
            <div><p className={`font-bold ${walletStats.available_count < 100 ? 'text-red-400' : 'text-emerald-400'}`}>{walletStats.available_count.toLocaleString()}</p><p className="text-gray-500">Boş</p></div>
            <div><p className="font-bold text-yellow-400">{walletStats.bep20_total.toLocaleString()}</p><p className="text-gray-500">BSC</p></div>
            <div><p className="font-bold text-red-400">{walletStats.trc20_total.toLocaleString()}</p><p className="text-gray-500">TRON</p></div>
          </div>
          {walletStats.available_count < 200 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Boş cüzdan azalıyor! Yeni cüzdanlar yükleyin.
            </div>
          )}
        </div>
      )}

      {/* Main Tabs — scrollable, no overflow/clip */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          {(() => {
            const panelTabs = [
              { id: 'incoming' as PanelTab, label: 'Gelen İşlemler', icon: ArrowDownLeft, badge: summary?.unnotified_count },
              { id: 'users' as PanelTab, label: 'Kullanıcılar', icon: Users },
              { id: 'wallet-pool' as PanelTab, label: 'Cüzdan Yükle', icon: Upload },
              { id: 'monitor-log' as PanelTab, label: 'Tarama Günlüğü', icon: Activity },
            ];
            return (
              <div>
                <div className="flex gap-1 px-2 pt-2" style={{ scrollbarWidth: 'none' }}>
                  {panelTabs.map(({ id, label, icon: Icon, badge }) => (
                    <button
                      key={id}
                      onClick={() => setPanelTab(id)}
                      title={label}
                      className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                        panelTab === id
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {badge ? (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] rounded-full font-bold flex items-center justify-center">
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 text-xs font-medium px-2 py-1">
                  {panelTabs.find(t => t.id === panelTab)?.label}
                </p>
              </div>
            );
          })()}
        </div>

        {/* ===== TAB: Gelen İşlemler ===== */}
        {panelTab === 'incoming' && (
          <div>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex-1 min-w-40 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Adres, TX hash, coin..."
                  value={txSearch}
                  onChange={e => { setTxSearch(e.target.value); setTxPage(0); }}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {([
                  { key: 'all', label: 'Tümü', color: '' },
                  { key: 'today', label: 'Bugün', color: '' },
                  { key: 'BEP20', label: 'BEP20', color: 'yellow' },
                  { key: 'TRC20', label: 'TRC20', color: 'red' },
                  { key: 'XRP', label: 'XRP', color: 'blue' },
                  { key: 'SOL', label: 'SOL', color: 'violet' },
                  { key: 'BTC', label: 'BTC', color: 'orange' },
                  { key: 'LTC', label: 'LTC', color: 'gray' },
                  { key: 'DOGE', label: 'DOGE', color: 'amber' },
                  { key: 'confirmed', label: 'Onaylı', color: '' },
                  { key: 'pending', label: 'Bekliyor', color: '' },
                  { key: 'unnotified', label: 'Yeni', color: '' },
                ] as { key: TxFilter; label: string; color: string }[]).map(({ key: f, label, color }) => (
                  <button
                    key={f}
                    onClick={() => { setTxFilter(f); setTxPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      txFilter === f
                        ? color === 'yellow' ? 'bg-yellow-500 text-black'
                        : color === 'red' ? 'bg-red-600 text-white'
                        : color === 'blue' ? 'bg-blue-600 text-white'
                        : color === 'violet' ? 'bg-fuchsia-600 text-white'
                        : color === 'orange' ? 'bg-orange-500 text-white'
                        : color === 'gray' ? 'bg-slate-600 text-white'
                        : color === 'amber' ? 'bg-amber-500 text-black'
                        : 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 font-medium ml-auto">{txTotal} kayıt</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ArrowDownLeft className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-semibold text-gray-600">Henüz gelen işlem yok</p>
                <p className="text-sm mt-1">Tarama butonlarını kullanın</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kullanıcı / Cüzdan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Gönderen</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Miktar</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ağ</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Zaman</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map(tx => (
                      <>
                        <tr
                          key={tx.id}
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${highlightNew.has(tx.id) ? 'bg-green-50 ring-1 ring-inset ring-green-300' : ''} ${!tx.is_notified && !highlightNew.has(tx.id) ? 'bg-blue-50/30' : ''}`}
                          onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                        >
                          <td className="px-4 py-3">
                            {tx.user_profiles ? (
                              <div>
                                <p className="font-semibold text-gray-900 text-xs">{tx.user_profiles.email}</p>
                                {tx.user_profiles.full_name && <p className="text-xs text-gray-400">{tx.user_profiles.full_name}</p>}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Eşleşmedi</span>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-gray-400 font-mono">{truncate(tx.wallet_address, 6)}</span>
                              <button onClick={e => { e.stopPropagation(); copyToClipboard(tx.wallet_address); }} className="text-gray-300 hover:text-gray-600"><Copy className="w-3 h-3" /></button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <a href={addressExplorerUrl(tx.from_address, tx.network)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs font-mono text-blue-600 hover:text-blue-800">
                                {truncate(tx.from_address, 8)}
                              </a>
                              <button onClick={e => { e.stopPropagation(); copyToClipboard(tx.from_address); }} className="text-gray-300 hover:text-gray-600"><Copy className="w-3 h-3" /></button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-900">{parseFloat(tx.amount.toString()).toLocaleString('tr-TR', { maximumFractionDigits: 4 })} {tx.token_symbol}</p>
                            {tx.amount_usd != null && <p className="text-xs font-semibold text-emerald-600">≈${tx.amount_usd.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                          </td>
                          <td className="px-4 py-3"><NetworkBadge network={tx.network} /></td>
                          <td className="px-4 py-3">
                            <StatusBadge status={tx.status} />
                            {!tx.is_notified && <span className="block text-xs text-blue-600 font-semibold mt-0.5">• Yeni</span>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-600 font-medium">{timeAgo(tx.created_at)}</p>
                            {tx.block_time && <p className="text-xs text-gray-400">{new Date(tx.block_time).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <a href={explorerUrl(tx.tx_hash, tx.network)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="Explorer'da Gör">
                                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                              </a>
                              {tx.user_id && (
                                <button onClick={() => openSendModal(tx.user_id!, tx.user_profiles?.email || '', tx)} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
                                  <Send className="w-3.5 h-3.5" /> Aktar
                                </button>
                              )}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedTx === tx.id ? 'rotate-180' : ''}`} />
                            </div>
                          </td>
                        </tr>
                        {expandedTx === tx.id && (
                          <tr key={`${tx.id}-exp`} className="bg-gray-50">
                            <td colSpan={7} className="px-4 py-3">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">TX Hash</p>
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono text-gray-800 break-all">{tx.tx_hash}</span>
                                    <button onClick={() => copyToClipboard(tx.tx_hash)} className="flex-shrink-0 text-gray-400 hover:text-gray-600"><Copy className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Alıcı Cüzdan</p>
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono text-gray-800 break-all">{tx.wallet_address}</span>
                                    <button onClick={() => copyToClipboard(tx.wallet_address)} className="flex-shrink-0 text-gray-400 hover:text-gray-600"><Copy className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Gönderen (Tam)</p>
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono text-gray-800 break-all">{tx.from_address}</span>
                                    <button onClick={() => copyToClipboard(tx.from_address)} className="flex-shrink-0 text-gray-400 hover:text-gray-600"><Copy className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Onay / Blok</p>
                                  <p className="text-gray-800">{tx.confirmations} onay{tx.block_number ? ` — #${tx.block_number}` : ''}</p>
                                  {tx.token_contract && <p className="text-gray-500 mt-0.5">Contract: {truncate(tx.token_contract, 8)}</p>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalTxPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-500">{txPage * PAGE_SIZE + 1}–{Math.min((txPage + 1) * PAGE_SIZE, txTotal)} / {txTotal}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTxPage(0)} disabled={txPage === 0} className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setTxPage(p => Math.max(0, p - 1))} disabled={txPage === 0} className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="px-3 py-1.5 text-xs font-medium">{txPage + 1} / {totalTxPages}</span>
                  <button onClick={() => setTxPage(p => Math.min(totalTxPages - 1, p + 1))} disabled={txPage >= totalTxPages - 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={() => setTxPage(totalTxPages - 1)} disabled={txPage >= totalTxPages - 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: Kullanıcılar ===== */}
        {panelTab === 'users' && (
          <div>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex-1 min-w-40 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Email veya isim ara..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {([
                  { id: 'all', label: 'Tümü' },
                  { id: 'no_deposit', label: 'Para Atmadı' },
                  { id: 'has_deposit', label: 'Para Attı' },
                  { id: 'no_wallet', label: 'Cüzdansız' },
                  { id: 'today', label: 'Bugün' },
                ] as { id: UserFilter; label: string }[]).map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setUserFilter(f.id); setUsersPage(0); loadUsers(); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      userFilter === f.id
                        ? f.id === 'no_deposit' ? 'bg-orange-500 text-white' : f.id === 'has_deposit' ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={() => loadUsers()} className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
              <span className="text-xs text-gray-400 font-medium">{usersTotal} kullanıcı</span>
            </div>

            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-semibold text-gray-600">Kullanıcı bulunamadı</p>
                <button onClick={loadUsers} className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">Yükle</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kullanıcı</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kayıt</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">BEP20</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">TRC20</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Yatırım</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Son İşlem</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users
                      .filter(u => !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.full_name?.toLowerCase().includes(userSearch.toLowerCase()))
                      .map((user, idx) => (
                        <tr key={user.user_id} className={`hover:bg-gray-50 transition-colors ${user.total_received_usdt === 0 && user.days_since_signup <= 7 ? 'bg-orange-50/40' : user.total_received_usdt > 0 ? 'bg-green-50/20' : ''}`}>
                          <td className="px-4 py-3 text-xs text-gray-400">{usersPage * PAGE_SIZE + idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-xs">{user.email}</p>
                            {user.full_name && <p className="text-xs text-gray-400">{user.full_name}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-gray-700">{new Date(user.created_at).toLocaleDateString('tr-TR')}</p>
                            <p className={`text-xs ${user.days_since_signup === 0 ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>{user.days_since_signup === 0 ? 'Bugün!' : `${user.days_since_signup}g`}</p>
                          </td>
                          <td className="px-4 py-3">
                            {user.bep20_address ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-mono text-gray-700">{truncate(user.bep20_address, 6)}</span>
                                <button onClick={() => copyToClipboard(user.bep20_address!)} className="text-gray-300 hover:text-gray-600"><Copy className="w-3 h-3" /></button>
                                <a href={addressExplorerUrl(user.bep20_address, 'BEP20')} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500"><ExternalLink className="w-3 h-3" /></a>
                              </div>
                            ) : <span className="text-xs text-gray-300 italic">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {user.trc20_address ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-mono text-gray-700">{truncate(user.trc20_address, 6)}</span>
                                <button onClick={() => copyToClipboard(user.trc20_address!)} className="text-gray-300 hover:text-gray-600"><Copy className="w-3 h-3" /></button>
                                <a href={addressExplorerUrl(user.trc20_address, 'TRC20')} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500"><ExternalLink className="w-3 h-3" /></a>
                              </div>
                            ) : <span className="text-xs text-gray-300 italic">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {user.total_received_usdt > 0 ? (
                              <div>
                                <span className="font-bold text-emerald-600">${user.total_received_usdt.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <p className="text-xs text-gray-400">{user.total_tx_count} işlem</p>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-orange-500">Para atmadı</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {user.last_tx_at ? <p className="text-xs text-gray-600">{timeAgo(user.last_tx_at)}</p> : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end flex-wrap">
                              {user.bep20_address && (
                                <>
                                  <button onClick={() => checkSingleWallet(user.bep20_address!)} disabled={scanning} className="flex items-center gap-1 px-2 py-1.5 bg-yellow-500 text-black rounded-lg text-xs font-bold hover:bg-yellow-400 disabled:opacity-50" title="BEP20 cüzdanı tara">
                                    <Radio className="w-3 h-3" /> BSC
                                  </button>
                                  <button onClick={() => checkSingleWallet(user.bep20_address!, true)} disabled={scanning} className="flex items-center gap-1 px-2 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 disabled:opacity-50" title="BSC - Zorla bakiyeye yaz">
                                    <Zap className="w-3 h-3" /> Zorla
                                  </button>
                                </>
                              )}
                              {user.trc20_address && (
                                <>
                                  <button onClick={() => checkSingleWallet(user.trc20_address!)} disabled={scanning} className="flex items-center gap-1 px-2 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50" title="TRC20 cüzdanı tara">
                                    <Radio className="w-3 h-3" /> TRX
                                  </button>
                                  <button onClick={() => checkSingleWallet(user.trc20_address!, true)} disabled={scanning} className="flex items-center gap-1 px-2 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 disabled:opacity-50" title="TRX - Zorla bakiyeye yaz">
                                    <Zap className="w-3 h-3" /> Zorla
                                  </button>
                                </>
                              )}
                              <button onClick={() => openSendModal(user.user_id, user.email)} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
                                <Send className="w-3.5 h-3.5" /> Gönder
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalUserPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-500">{usersPage * PAGE_SIZE + 1}–{Math.min((usersPage + 1) * PAGE_SIZE, usersTotal)} / {usersTotal}</span>
                <div className="flex gap-1">
                  <button onClick={() => setUsersPage(p => Math.max(0, p - 1))} disabled={usersPage === 0} className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="px-3 py-1.5 text-xs font-medium">{usersPage + 1} / {totalUserPages}</span>
                  <button onClick={() => setUsersPage(p => Math.min(totalUserPages - 1, p + 1))} disabled={usersPage >= totalUserPages - 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: Cüzdan Yükle ===== */}
        {panelTab === 'wallet-pool' && (
          <div className="p-4 space-y-6">
            {/* Format Info */}
            <div className="bg-gray-900 rounded-xl p-4 text-white">
              <p className="text-sm font-bold mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-yellow-400" /> Dosya Formatı</p>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                <div>
                  <p className="text-yellow-400 font-bold mb-1">BEP20 (BSC) Dosyası:</p>
                  <code className="bg-gray-800 block px-2.5 py-2 rounded text-green-300 font-mono">
                    adres,private_key,bscscan_api_key<br />
                    0xABC...,0xKEY...,APIKEY123<br />
                    0xDEF...,0xKEY...,APIKEY456
                  </code>
                </div>
                <div>
                  <p className="text-red-400 font-bold mb-1">TRC20 (TRON) Dosyası:</p>
                  <code className="bg-gray-800 block px-2.5 py-2 rounded text-green-300 font-mono">
                    adres,private_key,tronscan_api_key<br />
                    TABC...,PRIVKEY...,TRONKEY123<br />
                    TDEF...,PRIVKEY...,TRONKEY456
                  </code>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">API key sütunu isteğe bağlıdır. Her cüzdana farklı API key atayabilirsiniz. Boş bırakılırsa sistem varsayılan key'i kullanır.</p>
            </div>

            {/* BEP20 Upload */}
            <div className="border border-yellow-200 rounded-xl overflow-hidden">
              <div className="bg-yellow-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-black text-xs font-bold">B</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-yellow-900">BEP20 / BSC Cüzdanları</p>
                    <p className="text-xs text-yellow-700">0x ile başlayan adresler, BSCScan API key</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bep20Rows.length > 0 && (
                    <div className="text-right text-xs">
                      <p className="font-bold text-yellow-900">{bep20ValidCount} geçerli</p>
                      <p className="text-yellow-600">{bep20WithKey} API key'li</p>
                    </div>
                  )}
                  <input ref={bep20FileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFileLoad(e, 'BEP20')} />
                  <button
                    onClick={() => bep20FileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-black rounded-lg text-xs font-bold hover:bg-yellow-400"
                  >
                    <Upload className="w-3.5 h-3.5" /> CSV Yükle
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <textarea
                  placeholder={`0xAdres1,PrivateKey1,BscScanApiKey1\n0xAdres2,PrivateKey2,BscScanApiKey2\n...`}
                  value={bep20Text}
                  onChange={e => handleBep20Parse(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />

                {bep20Rows.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600">Önizleme ({bep20Rows.length} satır)</p>
                      <button onClick={() => setShowBep20Keys(v => !v)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                        {showBep20Keys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showBep20Keys ? 'Keyleri Gizle' : 'Keyleri Göster'}
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-gray-500">Adres</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-500">Private Key</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-500">API Key</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-500">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {bep20Rows.slice(0, 20).map((row, i) => (
                            <tr key={i} className={row.valid ? '' : 'bg-red-50'}>
                              <td className="px-3 py-1.5 font-mono">{truncate(row.address, 8)}</td>
                              <td className="px-3 py-1.5 font-mono text-gray-400">{showBep20Keys ? row.private_key.slice(0, 16) + '...' : '••••••••'}</td>
                              <td className="px-3 py-1.5 font-mono text-gray-400">{showBep20Keys ? (row.api_key || '—') : row.api_key ? '••••' + row.api_key.slice(-4) : '—'}</td>
                              <td className="px-3 py-1.5">
                                {row.valid ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> OK</span>
                                ) : (
                                  <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {row.error}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bep20Rows.length > 20 && <p className="text-xs text-gray-400 px-3 py-2">...ve {bep20Rows.length - 20} satır daha</p>}
                    </div>
                  </div>
                )}

                {bep20Uploading && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Yükleniyor...</span><span>{bep20Progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${bep20Progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => uploadWallets('BEP20')}
                    disabled={bep20Uploading || bep20ValidCount === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-black rounded-lg text-sm font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bep20Uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {bep20Uploading ? `Yükleniyor... ${bep20Progress}%` : `${bep20ValidCount} BEP20 Cüzdan Yükle`}
                  </button>
                  {bep20Rows.length > 0 && !bep20Uploading && (
                    <button onClick={() => { setBep20Text(''); setBep20Rows([]); }} className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50">
                      <Trash2 className="w-4 h-4" /> Temizle
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TRC20 Upload */}
            <div className="border border-red-200 rounded-xl overflow-hidden">
              <div className="bg-red-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-900">TRC20 / TRON Cüzdanları</p>
                    <p className="text-xs text-red-700">T ile başlayan adresler, Tronscan API key</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {trc20Rows.length > 0 && (
                    <div className="text-right text-xs">
                      <p className="font-bold text-red-900">{trc20ValidCount} geçerli</p>
                      <p className="text-red-600">{trc20WithKey} API key'li</p>
                    </div>
                  )}
                  <input ref={trc20FileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFileLoad(e, 'TRC20')} />
                  <button
                    onClick={() => trc20FileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                  >
                    <Upload className="w-3.5 h-3.5" /> CSV Yükle
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <textarea
                  placeholder={`TAdres1,PrivateKey1,TronscanApiKey1\nTAdres2,PrivateKey2,TronscanApiKey2\n...`}
                  value={trc20Text}
                  onChange={e => handleTrc20Parse(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />

                {trc20Rows.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600">Önizleme ({trc20Rows.length} satır)</p>
                      <button onClick={() => setShowTrc20Keys(v => !v)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                        {showTrc20Keys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showTrc20Keys ? 'Keyleri Gizle' : 'Keyleri Göster'}
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-gray-500">Adres</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-500">Private Key</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-500">API Key</th>
                            <th className="text-left px-3 py-2 font-semibold text-gray-500">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {trc20Rows.slice(0, 20).map((row, i) => (
                            <tr key={i} className={row.valid ? '' : 'bg-red-50'}>
                              <td className="px-3 py-1.5 font-mono">{truncate(row.address, 8)}</td>
                              <td className="px-3 py-1.5 font-mono text-gray-400">{showTrc20Keys ? row.private_key.slice(0, 16) + '...' : '••••••••'}</td>
                              <td className="px-3 py-1.5 font-mono text-gray-400">{showTrc20Keys ? (row.api_key || '—') : row.api_key ? '••••' + row.api_key.slice(-4) : '—'}</td>
                              <td className="px-3 py-1.5">
                                {row.valid ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> OK</span>
                                ) : (
                                  <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {row.error}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {trc20Rows.length > 20 && <p className="text-xs text-gray-400 px-3 py-2">...ve {trc20Rows.length - 20} satır daha</p>}
                    </div>
                  </div>
                )}

                {trc20Uploading && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Yükleniyor...</span><span>{trc20Progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${trc20Progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => uploadWallets('TRC20')}
                    disabled={trc20Uploading || trc20ValidCount === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {trc20Uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {trc20Uploading ? `Yükleniyor... ${trc20Progress}%` : `${trc20ValidCount} TRC20 Cüzdan Yükle`}
                  </button>
                  {trc20Rows.length > 0 && !trc20Uploading && (
                    <button onClick={() => { setTrc20Text(''); setTrc20Rows([]); }} className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50">
                      <Trash2 className="w-4 h-4" /> Temizle
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pool Stats */}
            {walletStats && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-bold text-gray-700 mb-3">Mevcut Havuz Durumu</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'BSC (BEP20)', assigned: walletStats.bep20_assigned, available: walletStats.bep20_available, total: walletStats.bep20_total, color: 'yellow' },
                    { label: 'TRON (TRC20)', assigned: walletStats.trc20_assigned, available: walletStats.trc20_available, total: walletStats.trc20_total, color: 'red' },
                  ].map(({ label, assigned, available, total, color }) => {
                    const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
                          <span className="font-bold">{label}</span>
                          <span>{total.toLocaleString()} toplam</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                          <div className={`h-full rounded-full ${color === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{assigned.toLocaleString()} atandı</span>
                          <span className={available < 100 ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>{available.toLocaleString()} boş</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: Tarama Günlüğü ===== */}
        {panelTab === 'monitor-log' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-600 font-medium">Son 100 blockchain tarama kaydı</p>
              <button onClick={loadMonitorLogs} className="p-1.5 rounded-lg hover:bg-white border border-gray-200">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {monitorLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Activity className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-semibold text-gray-600">Henüz tarama yapılmadı</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {monitorLogs.map(log => (
                  <div key={log.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 ${log.error_message ? 'bg-red-50' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${log.error_message ? 'bg-red-100' : log.transactions_found > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {log.error_message ? <AlertCircle className="w-4 h-4 text-red-500" /> : log.transactions_found > 0 ? <ArrowDownLeft className="w-4 h-4 text-green-500" /> : <CheckCircle className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${networkBadgeClass(log.network)}`}>{log.network}</span>
                        <span className="text-sm text-gray-700"><span className="font-semibold">{log.wallets_checked}</span> cüzdan tarandı</span>
                        {log.transactions_found > 0 && <span className="text-sm font-bold text-emerald-600">+{log.transactions_found} yeni işlem</span>}
                        {log.transactions_found === 0 && !log.error_message && <span className="text-xs text-gray-400">yeni işlem yok</span>}
                      </div>
                      {log.error_message && <p className="text-xs text-red-600 mt-0.5 truncate">{log.error_message}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-600 font-medium">{timeAgo(log.run_at)}</p>
                      {log.duration_ms > 0 && <p className="text-xs text-gray-400">{(log.duration_ms / 1000).toFixed(1)}sn</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="m-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> Tarama Sistemi</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                <ul className="space-y-1">
                  <li><span className="font-bold">BSCScan:</span> BEP20 USDT, BNB ve tüm tokenlar</li>
                  <li><span className="font-bold">Tronscan:</span> TRC20 USDT, TRX ve tüm tokenlar</li>
                  <li><span className="font-bold">Duplicate:</span> Aynı TX tekrar kaydedilmez</li>
                </ul>
                <ul className="space-y-1">
                  <li><span className="font-bold">BSCScan Rate:</span> Saniyede 5 istek</li>
                  <li><span className="font-bold">API Key:</span> Supabase › Secrets veya CSV ile yükle</li>
                  <li><span className="font-bold">Secret Adı:</span> BSCSCAN_API_KEY</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Send Balance Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowSendModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Bakiye Gönder</h3>
                <p className="text-sm text-gray-500 mt-0.5">{sendForm.email}</p>
              </div>
              <button onClick={() => setShowSendModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {sendForm.walletTxId && sendForm.detectedAmount && (
              <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700 text-sm">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span className="font-semibold">Tespit edilen:</span>
                  <span className="font-bold">{sendForm.detectedAmount} {sendForm.detectedSymbol}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Coin Seç</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {QUICK_SYMBOLS.map(sym => (
                    <button key={sym} onClick={() => { setSendForm(f => ({ ...f, symbol: sym })); setCoinSearch(''); }}
                      className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${sendForm.symbol === sym ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                      {sym}
                    </button>
                  ))}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Coin ara... (${allCoins.length} coin)`}
                    value={coinSearch}
                    onChange={e => setCoinSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                {coinSearch.trim() && (
                  <div className="border border-gray-200 rounded-lg bg-white max-h-40 overflow-y-auto">
                    {allCoins
                      .filter(s => s.toLowerCase().includes(coinSearch.toLowerCase()))
                      .map(s => (
                        <button key={s} onClick={() => { setSendForm(f => ({ ...f, symbol: s })); setCoinSearch(''); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${sendForm.symbol === s ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700'}`}>
                          <span>{s}</span>
                          {sendForm.symbol === s && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                        </button>
                      ))}
                    {allCoins.filter(s => s.toLowerCase().includes(coinSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">Sonuç bulunamadı</p>
                    )}
                  </div>
                )}
                <div className="mt-1.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Secili coin:</span>
                  <span className="text-sm font-bold text-gray-900">{sendForm.symbol}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Miktar</label>
                <div className="relative">
                  <input type="number" min="0" step="any" placeholder="0.00" value={sendForm.amount}
                    onChange={e => setSendForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg py-2.5 px-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">{sendForm.symbol}</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[10, 50, 100, 250, 500, 1000].map(amt => (
                    <button key={amt} onClick={() => setSendForm(f => ({ ...f, amount: String(amt) }))}
                      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">{amt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Not</label>
                <input type="text" placeholder="İşlem açıklaması..." value={sendForm.notes}
                  onChange={e => setSendForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>

              {sendForm.amount && parseFloat(sendForm.amount) > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="w-4 h-4" />
                    <p className="text-sm"><span className="font-bold">{parseFloat(sendForm.amount).toLocaleString('tr-TR')} {sendForm.symbol}</span> hesaba eklenecek</p>
                  </div>
                </div>
              )}

              <button onClick={handleSendBalance} disabled={sendLoading || !sendForm.amount || parseFloat(sendForm.amount) <= 0}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {sendLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendLoading ? 'Gönderiliyor...' : `${sendForm.amount || '0'} ${sendForm.symbol} Gönder`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

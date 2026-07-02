import { useState, useEffect } from 'react';
import { ArrowLeft, Download, ChevronRight, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TrendingUp, Gift, Cpu } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import UserLedger from './UserLedger';

interface HistoryItem {
  id: string;
  type: string;
  subtype?: string;
  symbol: string;
  amount: number;
  status: string;
  created_at: string;
  destination_address?: string;
  network?: string;
  txid?: string;
  notes?: string;
}

type FilterType = 'All' | 'Deposit' | 'Withdraw' | 'Transfer' | 'Earn' | 'Other' | 'Ledger';

interface AssetsHistoryModalProps {
  onClose: () => void;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
}

function groupByDate(items: HistoryItem[]) {
  const groups: { date: string; items: HistoryItem[] }[] = [];
  const map = new Map<string, HistoryItem[]>();

  for (const item of items) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  map.forEach((val, key) => {
    groups.push({ date: key, items: val });
  });

  return groups.sort((a, b) => b.date.localeCompare(a.date));
}

function formatGroupDate(dateKey: string) {
  const [y, m, d] = dateKey.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m) - 1]}, ${y}`;
}

function getTypeInfo(type: string) {
  switch (type) {
    case 'deposit':
      return { label: 'Deposit', sublabel: '', icon: ArrowDownLeft, color: '#0ECB81', bg: 'rgba(14,203,129,0.1)', sign: '+' };
    case 'withdrawal':
    case 'withdraw':
      return { label: 'Withdraw', sublabel: '', icon: ArrowUpRight, color: '#F6465D', bg: 'rgba(246,70,93,0.1)', sign: '-' };
    case 'transfer':
      return { label: 'Transfer', sublabel: '', icon: ArrowLeftRight, color: '#F0B90B', bg: 'rgba(240,185,11,0.1)', sign: '' };
    case 'trading':
    case 'futures':
      return { label: 'Transfer', sublabel: 'Spot > USD-M Futures', icon: ArrowLeftRight, color: '#F0B90B', bg: 'rgba(240,185,11,0.1)', sign: '' };
    case 'earn':
    case 'earn_reward':
    case 'referral_bonus':
    case 'mining':
      return { label: type === 'mining' ? 'Mining' : type === 'referral_bonus' ? 'Referral' : 'Earn', sublabel: type === 'earn' ? 'Redemption' : '', icon: type === 'mining' ? Cpu : Gift, color: '#0ECB81', bg: 'rgba(14,203,129,0.1)', sign: '+' };
    case 'admin_add':
    case 'admin_credit':
      return { label: 'Flexible', sublabel: 'Redemption', icon: TrendingUp, color: '#0ECB81', bg: 'rgba(14,203,129,0.1)', sign: '+' };
    default:
      return { label: type.charAt(0).toUpperCase() + type.slice(1), sublabel: '', icon: ArrowLeftRight, color: '#848E9C', bg: 'rgba(132,142,156,0.1)', sign: '' };
  }
}

function getStatusColor(status: string) {
  if (status === 'completed' || status === 'confirmed') return '#0ECB81';
  if (status === 'pending' || status === 'processing') return '#F0B90B';
  if (status === 'rejected' || status === 'failed') return '#F6465D';
  return '#848E9C';
}

function getStatusLabel(status: string) {
  if (status === 'completed' || status === 'confirmed') return 'Completed';
  if (status === 'pending') return 'Pending';
  if (status === 'processing') return 'Processing';
  if (status === 'rejected') return 'Rejected';
  if (status === 'failed') return 'Failed';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AssetsHistoryModal({ onClose }: AssetsHistoryModalProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('All');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const filters: FilterType[] = ['All', 'Deposit', 'Withdraw', 'Transfer', 'Earn', 'Other', 'Ledger'];

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) { setLoading(false); return; }

      const [withdrawalsRes, depositsRes, txRes] = await Promise.all([
        supabase.from('withdrawal_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('deposit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200)
      ]);

      const withdrawals: HistoryItem[] = (withdrawalsRes.data || []).map(w => ({
        id: `w_${w.id}`,
        type: 'withdrawal',
        symbol: w.coin_symbol,
        amount: parseFloat(w.receive_amount || w.amount) || 0,
        status: w.status,
        created_at: w.created_at,
        destination_address: w.destination_address,
        network: w.network,
        txid: w.txid
      }));

      const deposits: HistoryItem[] = (depositsRes.data || []).map(d => ({
        id: `d_${d.id}`,
        type: 'deposit',
        symbol: d.coin_symbol,
        amount: parseFloat(d.amount) || 0,
        status: d.status,
        created_at: d.created_at,
        network: d.network,
        txid: d.txid
      }));

      const txs: HistoryItem[] = (txRes.data || []).map(t => ({
        id: `t_${t.id}`,
        type: t.type,
        symbol: t.symbol,
        amount: parseFloat(t.amount) || 0,
        status: 'completed',
        created_at: t.created_at,
        notes: t.notes
      }));

      const allItems = [...withdrawals, ...deposits, ...txs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(allItems);
    } catch { } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter(item => {
    if (filter === 'All') return true;
    if (filter === 'Deposit') return item.type === 'deposit';
    if (filter === 'Withdraw') return item.type === 'withdrawal' || item.type === 'withdraw';
    if (filter === 'Transfer') return item.type === 'transfer' || item.type === 'trading' || item.type === 'futures';
    if (filter === 'Earn') return ['earn', 'earn_reward', 'referral_bonus', 'mining', 'admin_add', 'admin_credit'].includes(item.type);
    if (filter === 'Other') return !['deposit', 'withdrawal', 'withdraw', 'transfer', 'trading', 'futures', 'earn', 'earn_reward', 'referral_bonus', 'mining', 'admin_add', 'admin_credit'].includes(item.type);
    return true;
  });

  const groups = groupByDate(filtered);

  if (selectedItem) {
    const info = getTypeInfo(selectedItem.type);
    const Icon = info.icon;
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0E11] flex flex-col">
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setSelectedItem(null)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-bold text-base flex-1">Transaction Detail</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: info.bg }}>
              <Icon className="w-7 h-7" style={{ color: info.color }} />
            </div>
            <div className="text-white font-bold text-lg">{info.label}</div>
            {info.sublabel && <div className="text-gray-500 text-sm">{info.sublabel}</div>}
            <div className="mt-2 text-2xl font-black tabular-nums" style={{ color: info.sign === '-' ? '#F6465D' : '#0ECB81' }}>
              {info.sign}{selectedItem.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {selectedItem.symbol}
            </div>
            <div className="mt-1 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `${getStatusColor(selectedItem.status)}18`, color: getStatusColor(selectedItem.status) }}>
              {getStatusLabel(selectedItem.status)}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: '#181A20', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Time', value: formatDateTime(selectedItem.created_at) },
              selectedItem.network ? { label: 'Network', value: selectedItem.network } : null,
              selectedItem.destination_address ? { label: 'Address', value: `${selectedItem.destination_address.slice(0, 12)}...${selectedItem.destination_address.slice(-8)}` } : null,
              selectedItem.txid ? { label: 'TxID', value: `${selectedItem.txid.slice(0, 12)}...${selectedItem.txid.slice(-8)}` } : null,
              selectedItem.notes ? { label: 'Notes', value: selectedItem.notes } : null,
            ].filter(Boolean).map((row, idx, arr) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span className="text-gray-500 text-sm">{row!.label}</span>
                <span className="text-white text-sm font-medium text-right max-w-[60%] break-all">{row!.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E11] flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onClose} className="p-1">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="text-white font-bold text-base flex-1">Assets</span>
        <span className="text-gray-500 text-xs">Overall</span>
        <button className="p-1 ml-1">
          <Download className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              background: filter === f ? '#F0B90B' : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#000' : '#848E9C'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filter === 'Ledger' ? (
          <UserLedger />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(132,142,156,0.08)' }}>
              <ArrowLeftRight className="w-7 h-7 text-gray-600" />
            </div>
            <div className="text-gray-500 text-sm">No transaction records</div>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.date}>
              <div className="px-4 py-2 text-gray-500 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.02)' }}>
                {formatGroupDate(group.date)}
              </div>
              {group.items.map((item, idx) => {
                const info = getTypeInfo(item.type);
                const Icon = info.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#181A20] transition-colors active:bg-[#1E2026]"
                    style={{ borderBottom: idx < group.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: info.bg }}>
                      <Icon className="w-5 h-5" style={{ color: info.color }} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-white text-sm font-semibold">{info.label}</div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {info.sublabel || formatDateTime(item.created_at).split(' ').slice(1).join(' ')}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold tabular-nums" style={{ color: info.sign === '-' ? '#F6465D' : info.sign === '+' ? '#0ECB81' : '#E6E8EA' }}>
                        {info.sign}{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {item.symbol}
                      </div>
                      <div className="text-xs mt-0.5 font-medium" style={{ color: getStatusColor(item.status) }}>
                        {getStatusLabel(item.status)}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-700 ml-1 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

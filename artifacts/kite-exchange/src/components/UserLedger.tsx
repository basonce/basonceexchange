import { useState, useEffect } from 'react';
import { ShieldCheck, BookOpen, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TrendingUp, Gift, Wrench, CircleDot } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface LedgerRow {
  id: number;
  symbol: string;
  amount: number;
  created_at: string;
  subtype: string;
  entry_type: string;
  description: string;
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

function walletLabel(subtype: string) {
  if (subtype === 'fut') return 'Futures';
  if (subtype === 'locked') return 'Locked';
  return 'Spot';
}

function entryInfo(entryType: string, description: string) {
  const desc = (description || '').toLowerCase();
  if (entryType === 'opening_balance') {
    return { label: 'Opening Balance', icon: BookOpen, color: '#848E9C', bg: 'rgba(132,142,156,0.1)' };
  }
  if (desc.startsWith('deposit') || desc.startsWith('nowpay')) {
    return { label: 'Deposit', icon: ArrowDownLeft, color: '#0ECB81', bg: 'rgba(14,203,129,0.1)' };
  }
  if (desc.startsWith('withdrawal_reject') || desc.startsWith('withdrawal_refund')) {
    return { label: 'Withdrawal Refund', icon: ArrowDownLeft, color: '#0ECB81', bg: 'rgba(14,203,129,0.1)' };
  }
  if (desc.startsWith('withdraw')) {
    return { label: 'Withdrawal', icon: ArrowUpRight, color: '#F6465D', bg: 'rgba(246,70,93,0.1)' };
  }
  if (desc.startsWith('transfer')) {
    return { label: 'Transfer', icon: ArrowLeftRight, color: '#F0B90B', bg: 'rgba(240,185,11,0.1)' };
  }
  if (desc.startsWith('trade') || desc.startsWith('order') || desc.startsWith('futures') || desc.startsWith('position')) {
    return { label: 'Trade', icon: TrendingUp, color: '#F0B90B', bg: 'rgba(240,185,11,0.1)' };
  }
  if (desc.startsWith('earn') || desc.startsWith('mining') || desc.startsWith('referral') || desc.startsWith('reward') || desc.startsWith('bonus')) {
    return { label: 'Reward', icon: Gift, color: '#0ECB81', bg: 'rgba(14,203,129,0.1)' };
  }
  if (desc.startsWith('admin')) {
    return { label: 'Adjustment', icon: Wrench, color: '#848E9C', bg: 'rgba(132,142,156,0.1)' };
  }
  return { label: 'Balance Update', icon: CircleDot, color: '#848E9C', bg: 'rgba(132,142,156,0.1)' };
}

export default function UserLedger() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setup = async () => {
      await fetchLedger();

      const user = await getCurrentUser();
      if (!user || cancelled) return;

      const { data: accounts } = await supabase
        .from('ledger_accounts')
        .select('id')
        .eq('user_id', user.id);

      const ids = (accounts || []).map(a => a.id);
      if (ids.length === 0 || cancelled) return;

      channel = supabase
        .channel('user_ledger_changes')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_postings',
          filter: `account_id=in.(${ids.join(',')})`
        }, () => {
          fetchLedger();
        })
        .subscribe();
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchLedger = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('ledger_postings')
        .select('id, symbol, amount, created_at, ledger_accounts!inner(subtype, user_id), ledger_journal!inner(entry_type, description)')
        .eq('ledger_accounts.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      const mapped: LedgerRow[] = (data || []).map((p: any) => ({
        id: p.id,
        symbol: p.symbol,
        amount: parseFloat(p.amount) || 0,
        created_at: p.created_at,
        subtype: p.ledger_accounts?.subtype || 'avail',
        entry_type: p.ledger_journal?.entry_type || '',
        description: p.ledger_journal?.description || ''
      }));

      setRows(mapped);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mx-4 mt-3 mb-1 flex items-start gap-2 rounded-lg px-3 py-2.5" style={{ background: 'rgba(14,203,129,0.06)', border: '1px solid rgba(14,203,129,0.15)' }}>
        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0ECB81' }} />
        <div className="text-xs leading-relaxed" style={{ color: '#9AA4AF' }}>
          Every balance movement on your account is recorded in a bank-grade double-entry ledger.
          Records can never be edited or deleted.
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(132,142,156,0.08)' }}>
            <BookOpen className="w-7 h-7 text-gray-600" />
          </div>
          <div className="text-gray-500 text-sm">No ledger records yet</div>
        </div>
      ) : (
        rows.map((row, idx) => {
          const info = entryInfo(row.entry_type, row.description);
          const Icon = info.icon;
          const positive = row.amount >= 0;
          return (
            <div
              key={row.id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: idx < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: info.bg }}>
                <Icon className="w-5 h-5" style={{ color: info.color }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-white text-sm font-semibold">{info.label}</div>
                <div className="text-gray-500 text-xs mt-0.5">
                  {walletLabel(row.subtype)} · {formatDateTime(row.created_at)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold tabular-nums" style={{ color: positive ? '#0ECB81' : '#F6465D' }}>
                  {positive ? '+' : ''}{row.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {row.symbol}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

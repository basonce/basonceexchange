import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type AuditTab = 'summary' | 'ledger' | 'risk' | 'approvals';

interface AuditSummary {
  reconcile_mismatches: number;
  journal_count: number;
  posting_count: number;
  last_entry_at: string | null;
  user_liabilities: { symbol: string; total: number }[];
  risk_24h: { total: number; holds: number; allows: number };
}

interface JournalEntry {
  id: string;
  entry_type: string;
  ref_type: string | null;
  ref_id: string | null;
  description: string | null;
  created_at: string;
  ledger_postings: { symbol: string; amount: number }[];
}

interface RiskRule {
  rule_key: string;
  rule_value: number;
  enabled: boolean;
  description: string | null;
}

interface RiskEvent {
  id: string;
  user_id: string | null;
  action: string;
  decision: string;
  reasons: string[];
  usd_value: number | null;
  created_at: string;
}

interface BlacklistRow { address: string; reason: string | null; created_at: string }

interface PendingDual {
  id: string;
  user_id: string;
  coin_symbol: string;
  amount: number;
  usd_value: number | null;
  status: string;
  processing_note: string | null;
  created_at: string;
}

function fmtNum(n: number) {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 4 });
}

const RULE_LABELS: Record<string, string> = {
  withdrawal_auto_hold_usd: 'Otomatik bekletme eşiği ($)',
  withdrawal_daily_limit_usd: 'Günlük çekim limiti ($)',
  withdrawal_weekly_limit_usd: 'Haftalık çekim limiti ($)',
  withdrawal_min_account_age_hours: 'Min. hesap yaşı (saat)',
  withdrawal_velocity_max_per_hour: 'Saatlik max talep sayısı',
  withdrawal_dual_approval_usd: 'Çift onay eşiği ($)',
};

export default function AuditPanel() {
  const [tab, setTab] = useState<AuditTab>('summary');
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [rules, setRules] = useState<RiskRule[]>([]);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistRow[]>([]);
  const [dualPending, setDualPending] = useState<PendingDual[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRule, setEditRule] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newReason, setNewReason] = useState('');
  const [toast, setToast] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const loadSummary = useCallback(async () => {
    const { data } = await supabase.rpc('admin_audit_summary');
    if (data?.success) setSummary(data as AuditSummary);
  }, []);

  const loadJournal = useCallback(async () => {
    const { data } = await supabase
      .from('ledger_journal')
      .select('*, ledger_postings(symbol, amount)')
      .order('created_at', { ascending: false })
      .limit(30);
    setJournal((data as JournalEntry[]) || []);
  }, []);

  const loadRisk = useCallback(async () => {
    const [{ data: r }, { data: e }, { data: b }] = await Promise.all([
      supabase.from('risk_rules').select('*').order('rule_key'),
      supabase.from('risk_events').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('risk_blacklist_addresses').select('*').order('created_at', { ascending: false }),
    ]);
    setRules((r as RiskRule[]) || []);
    setEvents((e as RiskEvent[]) || []);
    setBlacklist((b as BlacklistRow[]) || []);
  }, []);

  const loadDual = useCallback(async () => {
    const { data } = await supabase
      .from('withdrawal_transactions')
      .select('id, user_id, coin_symbol, amount, usd_value, status, processing_note, created_at')
      .in('status', ['processing', 'hold'])
      .order('created_at', { ascending: false })
      .limit(50);
    setDualPending((data as PendingDual[]) || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (tab === 'summary') await loadSummary();
        else if (tab === 'ledger') await loadJournal();
        else if (tab === 'risk') await loadRisk();
        else await loadDual();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, loadSummary, loadJournal, loadRisk, loadDual]);

  async function saveRule(key: string) {
    const v = parseFloat(editVal);
    if (isNaN(v) || v < 0) { showToast('⚠️ Geçersiz değer'); return; }
    const { data, error } = await supabase.rpc('admin_set_risk_rule', { p_key: key, p_value: v, p_enabled: true });
    if (!error && data?.success) { showToast('✅ Kural güncellendi'); setEditRule(null); await loadRisk(); }
    else showToast('❌ ' + (error?.message || data?.error || 'hata'));
  }

  async function addBlacklist() {
    if (!newAddr.trim()) return;
    const { data, error } = await supabase.rpc('admin_blacklist_address', {
      p_address: newAddr.trim(), p_reason: newReason || null, p_remove: false,
    });
    if (!error && data?.success) { showToast('🚫 Adres kara listeye eklendi'); setNewAddr(''); setNewReason(''); await loadRisk(); }
    else showToast('❌ ' + (error?.message || data?.error || 'hata'));
  }

  async function removeBlacklist(addr: string) {
    const { data, error } = await supabase.rpc('admin_blacklist_address', {
      p_address: addr, p_remove: true,
    });
    if (!error && data?.success) { showToast('✅ Kaldırıldı'); await loadRisk(); }
    else showToast('❌ ' + (error?.message || data?.error || 'hata'));
  }

  async function doApprove(id: string) {
    setProcessing(id);
    try {
      const { data, error } = await supabase.rpc('admin_approve_withdrawal', {
        p_withdrawal_id: id, p_txid: null,
      });
      if (!error && data?.success) {
        if (data.needs_second_approval) showToast('👥 1. onay alındı — ikinci admin gerekli');
        else showToast('✅ Çekim tamamlandı');
      } else {
        showToast('❌ ' + (error?.message || data?.error || 'hata'));
      }
    } finally {
      setProcessing(null);
    }
    await loadDual();
  }

  const cardCls = 'bg-white border border-gray-200 rounded-2xl p-4 shadow-sm';
  const lblCls = 'text-[11px] text-gray-400 font-medium';

  return (
    <div className="pb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-3">📒 Denetim</h2>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-xl text-sm font-medium bg-gray-900 text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {([['summary', 'Özet'], ['ledger', 'Defter'], ['risk', 'Risk'], ['approvals', 'Onaylar']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === k ? 'bg-yellow-500 text-black' : 'bg-white border border-gray-200 text-gray-500'
            }`}>{l}</button>
        ))}
      </div>

      {loading && <p className={lblCls}>Yükleniyor…</p>}

      {/* ── Özet / Hazine ── */}
      {tab === 'summary' && summary && (
        <div className="space-y-3">
          <div className={cardCls}>
            <p className={lblCls}>MUTABAKAT (defter ↔ canlı bakiye)</p>
            <p className={`text-2xl font-bold mt-1 ${summary.reconcile_mismatches === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.reconcile_mismatches === 0 ? '✓ Fark yok' : `⚠ ${summary.reconcile_mismatches} uyumsuzluk`}
            </p>
            <p className="text-xs mt-2 text-gray-400">
              {summary.journal_count.toLocaleString()} yevmiye · {summary.posting_count.toLocaleString()} kayıt
              {summary.last_entry_at ? ` · son: ${new Date(summary.last_entry_at).toLocaleString('tr-TR')}` : ''}
            </p>
          </div>
          <div className={cardCls}>
            <p className={lblCls}>RİSK MOTORU (24 saat)</p>
            <div className="flex gap-6 mt-2">
              <div><p className="text-xl font-bold text-gray-900">{summary.risk_24h?.total ?? 0}</p><p className={lblCls}>karar</p></div>
              <div><p className="text-xl font-bold text-orange-500">{summary.risk_24h?.holds ?? 0}</p><p className={lblCls}>beklet</p></div>
              <div><p className="text-xl font-bold text-green-600">{summary.risk_24h?.allows ?? 0}</p><p className={lblCls}>serbest</p></div>
            </div>
          </div>
          <div className={cardCls}>
            <p className={lblCls}>HAZİNE — KULLANICILARA BORÇ (sembol bazında)</p>
            <div className="mt-2 space-y-1.5">
              {(summary.user_liabilities || []).slice(0, 12).map(x => (
                <div key={x.symbol} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">{x.symbol}</span>
                  <span className="text-gray-600">{fmtNum(Number(x.total))}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={loadSummary} className="w-full py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600">
            ↻ Yenile
          </button>
        </div>
      )}

      {/* ── Defter ── */}
      {tab === 'ledger' && (
        <div className="space-y-2">
          {journal.length === 0 && !loading && <p className={lblCls}>Henüz yevmiye kaydı yok (yeni para hareketleri burada görünür).</p>}
          {journal.map(j => (
            <div key={j.id} className={cardCls}>
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-gray-900">{j.entry_type}</p>
                <p className={lblCls}>{new Date(j.created_at).toLocaleString('tr-TR')}</p>
              </div>
              {j.description && <p className="text-xs mt-1 text-gray-500">{j.description}</p>}
              <div className="mt-2 space-y-0.5">
                {(j.ledger_postings || []).map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className={lblCls}>{p.symbol}</span>
                    <span className={Number(p.amount) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {Number(p.amount) >= 0 ? '+' : ''}{fmtNum(Number(p.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Risk kuralları / kara liste / kararlar ── */}
      {tab === 'risk' && (
        <div className="space-y-3">
          <div className={cardCls}>
            <p className={lblCls}>KURALLAR</p>
            <div className="mt-2 space-y-2">
              {rules.map(r => (
                <div key={r.rule_key} className="flex items-center justify-between gap-2">
                  <p className="text-xs flex-1 text-gray-700">{RULE_LABELS[r.rule_key] || r.rule_key}</p>
                  {editRule === r.rule_key ? (
                    <div className="flex gap-1.5">
                      <input value={editVal} onChange={e => setEditVal(e.target.value)} inputMode="decimal"
                        className="w-20 px-2 py-1 rounded-lg text-xs text-right bg-gray-50 border border-gray-300 text-gray-900" />
                      <button onClick={() => saveRule(r.rule_key)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500 text-white">✓</button>
                      <button onClick={() => setEditRule(null)}
                        className="px-2 py-1 rounded-lg text-xs bg-gray-100 text-gray-500">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditRule(r.rule_key); setEditVal(String(r.rule_value)); }}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-yellow-50 border border-yellow-300 text-yellow-700">
                      {Number(r.rule_value).toLocaleString('tr-TR')} ✎
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={cardCls}>
            <p className={lblCls}>KARA LİSTE ADRESLERİ</p>
            <div className="flex gap-1.5 mt-2">
              <input value={newAddr} onChange={e => setNewAddr(e.target.value)} placeholder="Cüzdan adresi"
                className="flex-1 px-2.5 py-2 rounded-lg text-xs bg-gray-50 border border-gray-300 text-gray-900" />
              <button onClick={addBlacklist} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500 text-white">Ekle</button>
            </div>
            <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Sebep (opsiyonel)"
              className="w-full mt-1.5 px-2.5 py-2 rounded-lg text-xs bg-gray-50 border border-gray-300 text-gray-900" />
            <div className="mt-2 space-y-1.5">
              {blacklist.map(b => (
                <div key={b.address} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-mono text-gray-800">{b.address}</p>
                    {b.reason && <p className={lblCls}>{b.reason}</p>}
                  </div>
                  <button onClick={() => removeBlacklist(b.address)}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500">Kaldır</button>
                </div>
              ))}
              {blacklist.length === 0 && <p className={lblCls}>Kara listede adres yok.</p>}
            </div>
          </div>

          <div className={cardCls}>
            <p className={lblCls}>SON RİSK KARARLARI</p>
            <div className="mt-2 space-y-1.5">
              {events.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-700">
                    {e.action === 'withdrawal' ? '💸' : e.action === 'withdrawal_approve' ? '✅' : '🚫'} {e.action}
                  </span>
                  <span className={`font-semibold ${
                    e.decision === 'hold' ? 'text-orange-500' : e.decision === 'allow' ? 'text-green-600' : 'text-gray-600'
                  }`}>{e.decision}{e.usd_value ? ` · $${fmtNum(Number(e.usd_value))}` : ''}</span>
                </div>
              ))}
              {events.length === 0 && <p className={lblCls}>Henüz risk kararı yok.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Onaylar (çift onay dahil) ── */}
      {tab === 'approvals' && (
        <div className="space-y-2">
          {dualPending.length === 0 && !loading && <p className={lblCls}>Bekleyen/beklemede çekim yok.</p>}
          {dualPending.map(w => {
            const isDual = (w.processing_note || '').includes('second admin');
            return (
              <div key={w.id} className={cardCls}>
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-gray-900">
                    {w.amount} {w.coin_symbol}{w.usd_value ? ` ≈ $${fmtNum(Number(w.usd_value))}` : ''}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isDual ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {isDual ? '2. ONAY BEKLİYOR' : w.status.toUpperCase()}
                  </span>
                </div>
                {w.processing_note && <p className="text-xs mt-1 text-gray-500">{w.processing_note}</p>}
                <p className={`${lblCls} mt-1`}>{new Date(w.created_at).toLocaleString('tr-TR')}</p>
                <button onClick={() => doApprove(w.id)} disabled={processing === w.id}
                  className={`mt-2 w-full py-2.5 rounded-xl text-xs font-bold bg-green-500 text-white ${
                    processing === w.id ? 'opacity-50' : ''
                  }`}>
                  {isDual ? '2. Onayı Ver' : 'Onayla'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

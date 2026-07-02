import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { approveWithdrawal } from '../lib/admin-api';

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

const card: React.CSSProperties = { background: '#0E0F12', border: '1px solid #1E2126', borderRadius: 14, padding: 14 };
const lbl: React.CSSProperties = { color: 'rgba(255,255,255,0.45)', fontSize: 11 };

function fmtNum(n: number) {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 4 });
}

export default function Audit() {
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

  async function loadSummary() {
    const { data } = await supabase.rpc('admin_audit_summary');
    if (data?.success) setSummary(data as AuditSummary);
  }
  async function loadJournal() {
    const { data } = await supabase
      .from('ledger_journal')
      .select('*, ledger_postings(symbol, amount)')
      .order('created_at', { ascending: false })
      .limit(30);
    setJournal((data as JournalEntry[]) || []);
  }
  async function loadRisk() {
    const [{ data: r }, { data: e }, { data: b }] = await Promise.all([
      supabase.from('risk_rules').select('*').order('rule_key'),
      supabase.from('risk_events').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('risk_blacklist_addresses').select('*').order('created_at', { ascending: false }),
    ]);
    setRules((r as RiskRule[]) || []);
    setEvents((e as RiskEvent[]) || []);
    setBlacklist((b as BlacklistRow[]) || []);
  }
  async function loadDual() {
    const { data } = await supabase
      .from('withdrawal_transactions')
      .select('id, user_id, coin_symbol, amount, usd_value, status, processing_note, created_at')
      .in('status', ['processing', 'hold'])
      .order('created_at', { ascending: false })
      .limit(50);
    setDualPending((data as PendingDual[]) || []);
  }

  async function load() {
    setLoading(true);
    try {
      if (tab === 'summary') await loadSummary();
      else if (tab === 'ledger') await loadJournal();
      else if (tab === 'risk') await loadRisk();
      else await loadDual();
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [tab]);

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

  async function doSecondApprove(id: string) {
    setProcessing(id);
    const res = await approveWithdrawal(id);
    if (res.ok && res.needsSecondApproval) showToast('👥 1. onay alındı — ikinci admin gerekli');
    else if (res.ok) showToast('✅ Çekim tamamlandı');
    else showToast('❌ ' + (res.error || 'hata'));
    setProcessing(null);
    await loadDual();
  }

  const RULE_LABELS: Record<string, string> = {
    withdrawal_auto_hold_usd: 'Otomatik bekletme eşiği ($)',
    withdrawal_daily_limit_usd: 'Günlük çekim limiti ($)',
    withdrawal_weekly_limit_usd: 'Haftalık çekim limiti ($)',
    withdrawal_min_account_age_hours: 'Min. hesap yaşı (saat)',
    withdrawal_velocity_max_per_hour: 'Saatlik max talep sayısı',
    withdrawal_dual_approval_usd: 'Çift onay eşiği ($)',
  };

  return (
    <div className="p-4 pb-24" style={{ color: '#fff' }}>
      <h1 className="text-lg font-bold mb-3">📒 Denetim</h1>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: '#1E2126', border: '1px solid #2B3139' }}>{toast}</div>
      )}

      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {([['summary', 'Özet'], ['ledger', 'Defter'], ['risk', 'Risk'], ['approvals', 'Onaylar']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
            style={{
              background: tab === k ? '#F0B90B' : '#14161A',
              color: tab === k ? '#000' : 'rgba(255,255,255,0.6)',
            }}>{l}</button>
        ))}
      </div>

      {loading && <p style={lbl}>Yükleniyor…</p>}

      {/* ── Summary / Treasury ── */}
      {tab === 'summary' && summary && (
        <div className="space-y-3">
          <div style={card}>
            <p style={lbl}>MUTABAKAT (defter ↔ canlı bakiye)</p>
            <p className="text-2xl font-bold mt-1" style={{ color: summary.reconcile_mismatches === 0 ? '#00DC82' : '#FF4757' }}>
              {summary.reconcile_mismatches === 0 ? '✓ Fark yok' : `⚠ ${summary.reconcile_mismatches} uyumsuzluk`}
            </p>
            <p className="text-xs mt-2" style={lbl}>
              {summary.journal_count.toLocaleString()} yevmiye · {summary.posting_count.toLocaleString()} kayıt
              {summary.last_entry_at ? ` · son: ${new Date(summary.last_entry_at).toLocaleString('tr-TR')}` : ''}
            </p>
          </div>
          <div style={card}>
            <p style={lbl}>RİSK MOTORU (24 saat)</p>
            <div className="flex gap-4 mt-2">
              <div><p className="text-xl font-bold">{summary.risk_24h?.total ?? 0}</p><p style={lbl}>karar</p></div>
              <div><p className="text-xl font-bold" style={{ color: '#FF9800' }}>{summary.risk_24h?.holds ?? 0}</p><p style={lbl}>beklet</p></div>
              <div><p className="text-xl font-bold" style={{ color: '#00DC82' }}>{summary.risk_24h?.allows ?? 0}</p><p style={lbl}>serbest</p></div>
            </div>
          </div>
          <div style={card}>
            <p style={lbl}>HAZİNE — KULLANICILARA BORÇ (sembol bazında)</p>
            <div className="mt-2 space-y-1.5">
              {(summary.user_liabilities || []).slice(0, 12).map(x => (
                <div key={x.symbol} className="flex justify-between text-sm">
                  <span className="font-medium">{x.symbol}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{fmtNum(Number(x.total))}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={loadSummary} className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: '#14161A', color: 'rgba(255,255,255,0.7)' }}>↻ Yenile</button>
        </div>
      )}

      {/* ── Ledger journal ── */}
      {tab === 'ledger' && (
        <div className="space-y-2">
          {journal.length === 0 && !loading && <p style={lbl}>Henüz yevmiye kaydı yok (yeni para hareketleri burada görünür).</p>}
          {journal.map(j => (
            <div key={j.id} style={card}>
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold">{j.entry_type}</p>
                <p style={lbl}>{new Date(j.created_at).toLocaleString('tr-TR')}</p>
              </div>
              {j.description && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{j.description}</p>}
              <div className="mt-2 space-y-0.5">
                {(j.ledger_postings || []).map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span style={lbl}>{p.symbol}</span>
                    <span style={{ color: Number(p.amount) >= 0 ? '#00DC82' : '#FF4757' }}>
                      {Number(p.amount) >= 0 ? '+' : ''}{fmtNum(Number(p.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Risk rules / events / blacklist ── */}
      {tab === 'risk' && (
        <div className="space-y-3">
          <div style={card}>
            <p style={lbl}>KURALLAR</p>
            <div className="mt-2 space-y-2">
              {rules.map(r => (
                <div key={r.rule_key} className="flex items-center justify-between gap-2">
                  <p className="text-xs flex-1">{RULE_LABELS[r.rule_key] || r.rule_key}</p>
                  {editRule === r.rule_key ? (
                    <div className="flex gap-1.5">
                      <input value={editVal} onChange={e => setEditVal(e.target.value)} inputMode="decimal"
                        className="w-20 px-2 py-1 rounded-lg text-xs text-right"
                        style={{ background: '#14161A', border: '1px solid #2B3139', color: '#fff' }} />
                      <button onClick={() => saveRule(r.rule_key)} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: '#00DC82', color: '#000' }}>✓</button>
                      <button onClick={() => setEditRule(null)} className="px-2 py-1 rounded-lg text-xs"
                        style={{ background: '#14161A', color: 'rgba(255,255,255,0.5)' }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditRule(r.rule_key); setEditVal(String(r.rule_value)); }}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: '#14161A', border: '1px solid #2B3139', color: '#F0B90B' }}>
                      {Number(r.rule_value).toLocaleString('tr-TR')} ✎
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <p style={lbl}>KARA LİSTE ADRESLERİ</p>
            <div className="flex gap-1.5 mt-2">
              <input value={newAddr} onChange={e => setNewAddr(e.target.value)} placeholder="Cüzdan adresi"
                className="flex-1 px-2.5 py-2 rounded-lg text-xs"
                style={{ background: '#14161A', border: '1px solid #2B3139', color: '#fff' }} />
              <button onClick={addBlacklist} className="px-3 py-2 rounded-lg text-xs font-bold"
                style={{ background: '#FF4757', color: '#fff' }}>Ekle</button>
            </div>
            <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Sebep (opsiyonel)"
              className="w-full mt-1.5 px-2.5 py-2 rounded-lg text-xs"
              style={{ background: '#14161A', border: '1px solid #2B3139', color: '#fff' }} />
            <div className="mt-2 space-y-1.5">
              {blacklist.map(b => (
                <div key={b.address} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-mono">{b.address}</p>
                    {b.reason && <p style={lbl}>{b.reason}</p>}
                  </div>
                  <button onClick={() => removeBlacklist(b.address)} className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: '#14161A', color: 'rgba(255,255,255,0.5)' }}>Kaldır</button>
                </div>
              ))}
              {blacklist.length === 0 && <p style={lbl}>Kara listede adres yok.</p>}
            </div>
          </div>

          <div style={card}>
            <p style={lbl}>SON RİSK KARARLARI</p>
            <div className="mt-2 space-y-1.5">
              {events.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>{e.action === 'withdrawal' ? '💸' : e.action === 'withdrawal_approve' ? '✅' : '🚫'} {e.action}</span>
                  <span style={{
                    color: e.decision === 'hold' ? '#FF9800' : e.decision === 'allow' ? '#00DC82' : 'rgba(255,255,255,0.7)',
                    fontWeight: 600,
                  }}>{e.decision}{e.usd_value ? ` · $${fmtNum(Number(e.usd_value))}` : ''}</span>
                </div>
              ))}
              {events.length === 0 && <p style={lbl}>Henüz risk kararı yok.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Pending approvals (incl. dual) ── */}
      {tab === 'approvals' && (
        <div className="space-y-2">
          {dualPending.length === 0 && !loading && <p style={lbl}>Bekleyen/beklemede çekim yok.</p>}
          {dualPending.map(w => {
            const isDual = (w.processing_note || '').includes('second admin');
            return (
              <div key={w.id} style={card}>
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold">{w.amount} {w.coin_symbol}{w.usd_value ? ` ≈ $${fmtNum(Number(w.usd_value))}` : ''}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: isDual ? 'rgba(61,127,255,0.15)' : 'rgba(255,152,0,0.15)', color: isDual ? '#3D7FFF' : '#FF9800' }}>
                    {isDual ? '2. ONAY BEKLİYOR' : w.status.toUpperCase()}
                  </span>
                </div>
                {w.processing_note && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{w.processing_note}</p>}
                <p style={lbl} className="mt-1">{new Date(w.created_at).toLocaleString('tr-TR')}</p>
                <button onClick={() => doSecondApprove(w.id)} disabled={processing === w.id}
                  className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: '#00DC82', color: '#000', opacity: processing === w.id ? 0.5 : 1 }}>
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

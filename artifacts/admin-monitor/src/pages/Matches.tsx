import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../lib/supabase';

const ADMIN_ID = '88292f59-898a-4fef-a1c8-8813d7b60b61';
const API = '/api-server/api/admin/match-controls';

interface MatchControl {
  id: string;
  homeTeam: string;
  awayTeam: string;
  targetResult?: '1' | 'X' | '2';
  targetScore?: { h: number; a: number };
  pinned: boolean;
  createdAt: number;
}

const RESULT_LABELS: Record<string, string> = { '1': 'Ev Kazanır (1)', 'X': 'Beraberlik (X)', '2': 'Deplasman Kazanır (2)' };

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s önce`;
  if (s < 3600) return `${Math.floor(s/60)}dk önce`;
  return `${Math.floor(s/3600)}sa önce`;
}

async function getAdminId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch { return null; }
}

export default function Matches() {
  const [, nav] = useLocation();
  const [controls, setControls] = useState<MatchControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [mode, setMode] = useState<'result' | 'score'>('result');
  const [targetResult, setTargetResult] = useState<'1' | 'X' | '2'>('1');
  const [scoreH, setScoreH] = useState('2');
  const [scoreA, setScoreA] = useState('1');
  const [pinned, setPinned] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (res.ok) setControls(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  async function handleSave() {
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    setSaving(true);
    try {
      const adminId = await getAdminId() || ADMIN_ID;
      const body: Record<string, unknown> = { homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), pinned };
      if (mode === 'result') {
        body.targetResult = targetResult;
      } else {
        const h = parseInt(scoreH, 10);
        const a = parseInt(scoreA, 10);
        if (!isNaN(h) && !isNaN(a)) body.targetScore = { h, a };
      }
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requester-id': adminId },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setHomeTeam(''); setAwayTeam(''); setPinned(false);
        await load();
      }
    } catch {}
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const adminId = await getAdminId() || ADMIN_ID;
      await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: { 'x-requester-id': adminId },
      });
      await load();
    } catch {}
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-4 p-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => nav('/')} className="text-xs mb-1 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ‹ Komuta
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight">Maç Kontrolü</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {controls.length} aktif kontrol
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
          style={{ background: 'rgba(240,185,11,0.15)', border: '1px solid rgba(240,185,11,0.3)', color: '#F0B90B' }}
        >
          {showForm ? '✕ İptal' : '+ Kontrol Ekle'}
        </button>
      </div>

      {/* Add Control Form */}
      {showForm && (
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>YENİ KONTROL</p>

          <div className="flex flex-col gap-2">
            <input
              value={homeTeam}
              onChange={e => setHomeTeam(e.target.value)}
              placeholder="Ev Takımı (tam isim)"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <input
              value={awayTeam}
              onChange={e => setAwayTeam(e.target.value)}
              placeholder="Deplasman Takımı (tam isim)"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          {/* Mode picker */}
          <div className="flex gap-2">
            {(['result', 'score'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                style={{ background: mode === m ? 'rgba(240,185,11,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${mode === m ? 'rgba(240,185,11,0.4)' : 'rgba(255,255,255,0.1)'}`, color: mode === m ? '#F0B90B' : 'rgba(255,255,255,0.5)' }}>
                {m === 'result' ? 'Sonuç (1/X/2)' : 'Tam Skor'}
              </button>
            ))}
          </div>

          {mode === 'result' ? (
            <div className="grid grid-cols-3 gap-2">
              {(['1', 'X', '2'] as const).map(r => (
                <button key={r} onClick={() => setTargetResult(r)}
                  className="py-2.5 rounded-xl text-sm font-black active:scale-95 transition-transform"
                  style={{ background: targetResult === r ? 'rgba(0,220,130,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${targetResult === r ? 'rgba(0,220,130,0.4)' : 'rgba(255,255,255,0.1)'}`, color: targetResult === r ? '#00DC82' : 'rgba(255,255,255,0.5)' }}>
                  {r}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input value={scoreH} onChange={e => setScoreH(e.target.value)} type="number" min="0" max="9"
                className="flex-1 text-center rounded-xl py-2 text-lg font-black text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
              <span className="text-xl font-black text-white">–</span>
              <input value={scoreA} onChange={e => setScoreA(e.target.value)} type="number" min="0" max="9"
                className="flex-1 text-center rounded-xl py-2 text-lg font-black text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
            </div>
          )}

          {/* Pin toggle */}
          <button onClick={() => setPinned(v => !v)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 active:scale-[0.98] transition-transform text-left"
            style={{ background: pinned ? 'rgba(240,185,11,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${pinned ? 'rgba(240,185,11,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <span className="text-base">{pinned ? '📌' : '📍'}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Maçı En Üste Sabitle</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Bu maç listenin en üstünde görünür</p>
            </div>
            <div className="w-10 h-6 rounded-full flex items-center px-0.5"
              style={{ background: pinned ? '#F0B90B' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }}>
              <div className="w-5 h-5 rounded-full bg-white shadow"
                style={{ transform: pinned ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
            </div>
          </button>

          <button onClick={handleSave} disabled={saving || !homeTeam.trim() || !awayTeam.trim()}
            className="w-full py-3 rounded-xl text-sm font-black active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg,#F0B90B,#d97706)', color: '#000', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Kaydediliyor…' : 'Kontrolü Uygula'}
          </button>

          <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#60a5fa' }}>📋 Bilgi</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Takım isimlerini tam ve doğru yazın. Maç bu iki takım arasında oluştuğunda kontrol otomatik devreye girer. Maçın kalan dakikasına göre skor yönlendirilir.
            </p>
          </div>
        </div>
      )}

      {/* Controls List */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.25)' }}>
          <p className="text-2xl mb-2">⚽</p>
          <p className="text-sm">Yükleniyor…</p>
        </div>
      ) : controls.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <span className="text-4xl">🎮</span>
          <p className="text-sm font-semibold text-white">Aktif Kontrol Yok</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            "Kontrol Ekle" ile bir maçın sonucunu veya skorunu belirleyin
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>AKTİF KONTROLLER</p>
          {controls.map(ctrl => (
            <ControlCard key={ctrl.id} ctrl={ctrl} deleting={deletingId === ctrl.id} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function ControlCard({ ctrl, deleting, onDelete }: { ctrl: MatchControl; deleting: boolean; onDelete: (id: string) => void }) {
  const hasScore = ctrl.targetScore !== undefined;
  const label = hasScore
    ? `${ctrl.targetScore!.h} – ${ctrl.targetScore!.a}`
    : ctrl.targetResult ? RESULT_LABELS[ctrl.targetResult] : '—';

  const labelColor = hasScore ? '#F0B90B' : ctrl.targetResult === '1' ? '#3D7FFF' : ctrl.targetResult === '2' ? '#FF4757' : '#00DC82';

  return (
    <div className="rounded-2xl p-4" style={{
      background: ctrl.pinned ? 'rgba(240,185,11,0.06)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${ctrl.pinned ? 'rgba(240,185,11,0.2)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {ctrl.pinned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-2"
              style={{ background: 'rgba(240,185,11,0.15)', color: '#F0B90B', border: '1px solid rgba(240,185,11,0.3)' }}>
              📌 SABITLENMIŞ
            </span>
          )}
          <p className="text-sm font-bold text-white truncate">{ctrl.homeTeam} <span style={{ color: 'rgba(255,255,255,0.4)' }}>vs</span> {ctrl.awayTeam}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-black px-2 py-0.5 rounded-lg" style={{ background: `${labelColor}22`, color: labelColor, border: `1px solid ${labelColor}44` }}>
              {hasScore ? `⚽ ${label}` : label}
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{timeAgo(ctrl.createdAt)}</span>
          </div>
        </div>
        <button onClick={() => onDelete(ctrl.id)} disabled={deleting}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-none active:scale-90 transition-transform"
          style={{ background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757', opacity: deleting ? 0.5 : 1 }}>
          {deleting ? '…' : '✕'}
        </button>
      </div>
    </div>
  );
}

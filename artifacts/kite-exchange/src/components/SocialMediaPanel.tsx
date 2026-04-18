import { useState, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  X as XIcon,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Calendar,
  Loader2,
  Settings,
  Trash2,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Sosyal Medya Paneli
   - Tek yerden içerik yaz, tüm platformlara aynı anda gönder.
   - Phase 1: Telegram tam çalışır (mevcut bot token'ı kullanılıyor).
   - Diğer platformlar (X, Facebook, LinkedIn, YouTube, Medium): UI hazır,
     "Bağlantılar" sekmesinden API kimlikleri girildikten sonra çalışır.
   ──────────────────────────────────────────────────────────────────────── */

const ADMIN_ID = '88292f59-898a-4fef-a1c8-8813d7b60b61';
const API_BASE = '/api/social';

type Platform = {
  id: 'telegram' | 'x' | 'facebook' | 'linkedin' | 'youtube' | 'medium';
  label: string;
  charLimit: number;
  color: string;
  needsOAuth: boolean;
  setupNote: string;
};

const PLATFORMS: Platform[] = [
  { id: 'telegram', label: 'Telegram', charLimit: 4096, color: '#229ED9', needsOAuth: false,
    setupNote: 'Bot token mevcut. Sadece kanal/sohbet ID girmen yeter.' },
  { id: 'x',        label: 'X (Twitter)', charLimit: 280, color: '#000000', needsOAuth: true,
    setupNote: 'X Developer hesabı + API Key, API Secret, Access Token gerekli.' },
  { id: 'facebook', label: 'Facebook', charLimit: 63206, color: '#1877F2', needsOAuth: true,
    setupNote: 'Facebook Page Access Token gerekli (Meta for Developers üzerinden).' },
  { id: 'linkedin', label: 'LinkedIn', charLimit: 3000, color: '#0A66C2', needsOAuth: true,
    setupNote: 'LinkedIn Marketing Developer Platform onayı + Access Token gerekli.' },
  { id: 'youtube',  label: 'YouTube (Community)', charLimit: 1500, color: '#FF0000', needsOAuth: true,
    setupNote: 'YouTube Data API v3 + OAuth onayı gerekli (post için kanal 1000+ abone şartı).' },
  { id: 'medium',   label: 'Medium', charLimit: 100000, color: '#00AB6C', needsOAuth: true,
    setupNote: 'Medium Integration Token gerekli (Settings → Security & apps).' },
];

interface Credentials {
  telegram?:  { chat_id?: string };
  x?:         { api_key?: string; api_secret?: string; access_token?: string; access_secret?: string };
  facebook?:  { page_id?: string; access_token?: string };
  linkedin?:  { author_urn?: string; access_token?: string };
  youtube?:   { channel_id?: string; refresh_token?: string; client_id?: string; client_secret?: string };
  medium?:    { user_id?: string; integration_token?: string };
}

interface PostHistoryItem {
  id: string;
  content: string;
  image_url: string | null;
  platforms: string[];
  results: Record<string, { ok: boolean; message: string; url?: string }>;
  created_at: string;
}

export default function SocialMediaPanel() {
  const [view, setView] = useState<'compose' | 'history' | 'connections'>('compose');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ telegram: true });
  const [creds, setCreds] = useState<Credentials>({});
  const [credsLoading, setCredsLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [history, setHistory] = useState<PostHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, { ok: boolean; message: string; url?: string }> | null>(null);

  /* ── Load credentials + history ─────────────────────────────────────── */
  const loadCreds = async () => {
    setCredsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/credentials`, { headers: { 'x-requester-id': ADMIN_ID } });
      const j = await r.json();
      if (j?.credentials) setCreds(j.credentials);
    } catch {} finally { setCredsLoading(false); }
  };
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const r = await fetch(`${API_BASE}/history`, { headers: { 'x-requester-id': ADMIN_ID } });
      const j = await r.json();
      if (Array.isArray(j?.posts)) setHistory(j.posts);
    } catch {} finally { setHistoryLoading(false); }
  };
  useEffect(() => { loadCreds(); loadHistory(); }, []);

  /* ── Submit ─────────────────────────────────────────────────────────── */
  const handlePost = async () => {
    const targetPlatforms = Object.keys(enabled).filter(k => enabled[k]);
    if (targetPlatforms.length === 0) { alert('En az bir platform seç.'); return; }
    if (!content.trim()) { alert('İçerik boş olamaz.'); return; }

    setPosting(true); setLastResult(null);
    try {
      const r = await fetch(`${API_BASE}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requester-id': ADMIN_ID },
        body: JSON.stringify({ content, imageUrl: imageUrl || null, platforms: targetPlatforms }),
      });
      const j = await r.json();
      setLastResult(j?.results || {});
      if (j?.allOk) {
        setContent(''); setImageUrl('');
      }
      loadHistory();
    } catch (e: any) {
      setLastResult({ _error: { ok: false, message: e?.message || 'Sunucu hatası' } });
    } finally { setPosting(false); }
  };

  const isPlatformReady = (p: Platform): boolean => {
    if (p.id === 'telegram') return !!creds.telegram?.chat_id;
    if (p.id === 'x')        return !!(creds.x?.api_key && creds.x?.api_secret && creds.x?.access_token && creds.x?.access_secret);
    if (p.id === 'facebook') return !!(creds.facebook?.page_id && creds.facebook?.access_token);
    if (p.id === 'linkedin') return !!(creds.linkedin?.author_urn && creds.linkedin?.access_token);
    if (p.id === 'youtube')  return !!(creds.youtube?.refresh_token && creds.youtube?.client_id && creds.youtube?.client_secret);
    if (p.id === 'medium')   return !!(creds.medium?.user_id && creds.medium?.integration_token);
    return false;
  };

  /* ────────────────────────────────────────────────────────────────────
     Compose view
     ──────────────────────────────────────────────────────────────────── */
  const composeView = (
    <div className="space-y-4">
      {/* Editor */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <label className="block text-xs font-bold text-gray-700 mb-2">İçerik</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={6}
          placeholder="Tüm platformlara gidecek içeriği yaz…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
        <div className="mt-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-gray-500" />
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="Görsel URL (opsiyonel — public erişilebilir olmalı)"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
          />
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="" className="mt-2 max-h-40 rounded-lg border border-gray-200" onError={e => (e.currentTarget.style.display='none')} />
        )}
      </div>

      {/* Per-platform toggles + previews */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Platformlar</h3>
        <div className="space-y-2">
          {PLATFORMS.map(p => {
            const ready = isPlatformReady(p);
            const isOn  = !!enabled[p.id];
            const overLimit = content.length > p.charLimit;
            return (
              <div key={p.id} className={`p-3 rounded-lg border ${isOn ? 'border-yellow-300 bg-yellow-50/40' : 'border-gray-200 bg-gray-50/40'}`}>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isOn}
                      disabled={!ready}
                      onChange={e => setEnabled(s => ({ ...s, [p.id]: e.target.checked }))}
                      className="w-4 h-4 accent-yellow-500"
                    />
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-sm font-semibold text-gray-900 truncate">{p.label}</span>
                    {!ready && <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">bağlı değil</span>}
                    {ready && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                  </label>
                  <span className={`text-[10px] font-mono ${overLimit ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                    {content.length}/{p.charLimit}
                  </span>
                </div>
                {!ready && (
                  <div className="mt-1.5 text-[11px] text-gray-600 flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-600" />
                    <span>{p.setupNote} <button onClick={() => setView('connections')} className="text-blue-600 underline">Bağla</button></span>
                  </div>
                )}
                {isOn && overLimit && (
                  <div className="mt-1.5 text-[11px] text-red-600 font-semibold">
                    İçerik {p.label} limitini {content.length - p.charLimit} karakter aşıyor — gönderim başarısız olur.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Result panel */}
      {lastResult && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Son Gönderim Sonucu</h3>
          <div className="space-y-1.5">
            {Object.entries(lastResult).map(([plat, r]) => (
              <div key={plat} className={`flex items-center gap-2 text-xs p-2 rounded ${r.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {r.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span className="font-semibold">{plat}:</span>
                <span className="flex-1">{r.message}</span>
                {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Gör</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handlePost}
        disabled={posting || !content.trim()}
        className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {posting ? <><Loader2 className="w-4 h-4 animate-spin" />Gönderiliyor…</> : <><Send className="w-4 h-4" />Tüm Seçili Platformlara Yayınla</>}
      </button>
    </div>
  );

  /* ────────────────────────────────────────────────────────────────────
     History view
     ──────────────────────────────────────────────────────────────────── */
  const historyView = (
    <div className="space-y-2">
      {historyLoading && <div className="text-center text-gray-500 text-sm py-6">Yükleniyor…</div>}
      {!historyLoading && history.length === 0 && <div className="text-center text-gray-500 text-sm py-6">Henüz gönderim yok.</div>}
      {history.map(h => (
        <div key={h.id} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(h.created_at).toLocaleString('tr-TR')}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">{h.platforms.length} platform</span>
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3">{h.content}</p>
          {h.image_url && <img src={h.image_url} alt="" className="mt-2 max-h-24 rounded border" onError={e => (e.currentTarget.style.display='none')} />}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(h.results || {}).map(([plat, r]) => (
              <span key={plat} className={`text-[10px] px-2 py-0.5 rounded font-medium ${r.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {plat}: {r.ok ? '✓' : '✗'}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  /* ────────────────────────────────────────────────────────────────────
     Connections view
     ──────────────────────────────────────────────────────────────────── */
  const updateCred = (platform: keyof Credentials, field: string, value: string) => {
    setCreds(prev => ({ ...prev, [platform]: { ...(prev[platform] as any || {}), [field]: value } }));
  };
  const saveCreds = async () => {
    try {
      const r = await fetch(`${API_BASE}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requester-id': ADMIN_ID },
        body: JSON.stringify({ credentials: creds }),
      });
      const j = await r.json();
      if (j?.ok) alert('Kimlikler kaydedildi.');
      else alert('Kayıt hatası: ' + (j?.error || 'bilinmeyen'));
    } catch (e: any) { alert('Kayıt hatası: ' + e.message); }
  };

  const connectionsView = credsLoading ? (
    <div className="text-center text-gray-500 py-8">Yükleniyor…</div>
  ) : (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
        <p className="font-bold mb-1">⚠ Önemli:</p>
        <p>Buradaki tüm kimlikler şifreli olarak Supabase'de saklanır. Sadece sen erişebilirsin. Kimliği değiştirirsen "Kaydet" butonuna basmayı unutma.</p>
      </div>

      {/* Telegram */}
      <CredCard title="Telegram" color="#229ED9" badge="Bot token mevcut">
        <CredInput label="Kanal/Sohbet ID" placeholder="@basonce_official  veya  -1001234567890"
          value={creds.telegram?.chat_id || ''} onChange={v => updateCred('telegram', 'chat_id', v)} />
        <p className="text-[11px] text-gray-600 mt-1.5">Public kanal için <code>@kullaniciadi</code>, özel kanal için <code>-100…</code> ID kullan. Bot kanala admin olarak eklenmeli.</p>
      </CredCard>

      {/* X */}
      <CredCard title="X (Twitter)" color="#000000">
        <CredInput label="API Key"        value={creds.x?.api_key || ''}        onChange={v => updateCred('x', 'api_key', v)} />
        <CredInput label="API Secret"     value={creds.x?.api_secret || ''}     onChange={v => updateCred('x', 'api_secret', v)} secret />
        <CredInput label="Access Token"   value={creds.x?.access_token || ''}   onChange={v => updateCred('x', 'access_token', v)} secret />
        <CredInput label="Access Secret"  value={creds.x?.access_secret || ''}  onChange={v => updateCred('x', 'access_secret', v)} secret />
        <p className="text-[11px] text-gray-600 mt-1.5">developer.x.com → Apps → Keys & Tokens. "Read and Write" izni gerekli.</p>
      </CredCard>

      {/* Facebook */}
      <CredCard title="Facebook (Page)" color="#1877F2">
        <CredInput label="Page ID" value={creds.facebook?.page_id || ''} onChange={v => updateCred('facebook', 'page_id', v)} />
        <CredInput label="Page Access Token" value={creds.facebook?.access_token || ''} onChange={v => updateCred('facebook', 'access_token', v)} secret />
        <p className="text-[11px] text-gray-600 mt-1.5">developers.facebook.com → Apps → Graph API Explorer → Page Access Token (long-lived öneririm).</p>
      </CredCard>

      {/* LinkedIn */}
      <CredCard title="LinkedIn" color="#0A66C2">
        <CredInput label="Author URN" placeholder="urn:li:organization:1234567" value={creds.linkedin?.author_urn || ''} onChange={v => updateCred('linkedin', 'author_urn', v)} />
        <CredInput label="Access Token" value={creds.linkedin?.access_token || ''} onChange={v => updateCred('linkedin', 'access_token', v)} secret />
        <p className="text-[11px] text-gray-600 mt-1.5">linkedin.com/developers → Marketing Developer Platform onayı gerekli (kişisel uygulamalarda kısıtlı).</p>
      </CredCard>

      {/* YouTube */}
      <CredCard title="YouTube (Community Posts)" color="#FF0000">
        <CredInput label="Channel ID" value={creds.youtube?.channel_id || ''} onChange={v => updateCred('youtube', 'channel_id', v)} />
        <CredInput label="OAuth Client ID" value={creds.youtube?.client_id || ''} onChange={v => updateCred('youtube', 'client_id', v)} />
        <CredInput label="OAuth Client Secret" value={creds.youtube?.client_secret || ''} onChange={v => updateCred('youtube', 'client_secret', v)} secret />
        <CredInput label="Refresh Token" value={creds.youtube?.refresh_token || ''} onChange={v => updateCred('youtube', 'refresh_token', v)} secret />
        <p className="text-[11px] text-gray-600 mt-1.5">⚠ YouTube Community Posts için kanalın 1.000+ abonesi olmalı. Google Cloud Console → YouTube Data API v3 + OAuth.</p>
      </CredCard>

      {/* Medium */}
      <CredCard title="Medium" color="#00AB6C">
        <CredInput label="User ID" value={creds.medium?.user_id || ''} onChange={v => updateCred('medium', 'user_id', v)} />
        <CredInput label="Integration Token" value={creds.medium?.integration_token || ''} onChange={v => updateCred('medium', 'integration_token', v)} secret />
        <p className="text-[11px] text-gray-600 mt-1.5">⚠ Medium 2024'te yeni Integration Token başvurularını kapattı. Eski token'ın varsa çalışır.</p>
      </CredCard>

      <button onClick={saveCreds} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-xl">
        Kimlikleri Kaydet
      </button>
    </div>
  );

  /* ────────────────────────────────────────────────────────────────────
     Render
     ──────────────────────────────────────────────────────────────────── */
  return (
    <div className="p-3 space-y-3">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 shadow-lg">
        <h2 className="text-lg font-black flex items-center gap-2"><Send className="w-5 h-5" />Sosyal Medya</h2>
        <p className="text-xs text-white/90 mt-0.5">Tek yerden yaz, tüm platformlara aynı anda yayınla.</p>
      </div>

      <div className="flex gap-1.5 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
        {([
          { id: 'compose',     label: 'Oluştur',  icon: Send },
          { id: 'history',     label: 'Geçmiş',   icon: Calendar },
          { id: 'connections', label: 'Bağlantı', icon: LinkIcon },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${view === t.id ? 'bg-yellow-500 text-black' : 'text-gray-600 hover:bg-gray-50'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {view === 'compose' && composeView}
      {view === 'history' && historyView}
      {view === 'connections' && connectionsView}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function CredCard({ title, color, badge, children }: { title: string; color: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {badge && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 rounded">{badge}</span>}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function CredInput({ label, value, onChange, placeholder, secret }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; secret?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-600 mb-0.5">{label}</label>
      <input
        type={secret ? 'password' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
        autoComplete="off"
      />
    </div>
  );
}

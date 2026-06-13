import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  X,
  Pencil,
  Lock,
} from 'lucide-react';

type PageProps = { user?: any; onAuth?: (m: 'login' | 'register') => void; onDeposit?: () => void; onNavigate?: (t: any) => void };

type PermKey = 'read' | 'spot' | 'futures' | 'withdraw';

interface Permissions {
  read: boolean;
  spot: boolean;
  futures: boolean;
  withdraw: boolean;
}

interface ApiKeyRecord {
  id: string;
  label: string;
  apiKey: string;
  secretKey: string;
  permissions: Permissions;
  ipRestriction: string;
  createdAt: number;
}

const PERM_META: { key: PermKey; label: string; sub: string }[] = [
  { key: 'read', label: 'Read', sub: 'View portfolio, orders & market data' },
  { key: 'spot', label: 'Spot & Margin Trade', sub: 'Place and cancel spot/margin orders' },
  { key: 'futures', label: 'Futures Trade', sub: 'Open and close futures positions' },
  { key: 'withdraw', label: 'Withdraw', sub: 'Move assets off the exchange' },
];

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function maskKey(k: string): string {
  if (k.length <= 12) return k;
  return `${k.slice(0, 6)}${'•'.repeat(8)}${k.slice(-6)}`;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export default function DesktopApiKeys({ user, onAuth }: PageProps) {
  const storageKey = useMemo(() => `apiKeys_v1_${user?.id || 'guest'}`, [user?.id]);

  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [label, setLabel] = useState('');
  const [perms, setPerms] = useState<Permissions>({ read: true, spot: false, futures: false, withdraw: false });
  const [ipRestriction, setIpRestriction] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<ApiKeyRecord | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiKeyRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiKeyRecord | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setKeys(raw ? JSON.parse(raw) : []);
    } catch {
      setKeys([]);
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: ApiKeyRecord[]) => {
      setKeys(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const togglePerm = (k: PermKey) => {
    setPerms((p) => ({ ...p, [k]: !p[k] }));
  };

  const resetForm = () => {
    setLabel('');
    setPerms({ read: true, spot: false, futures: false, withdraw: false });
    setIpRestriction('');
    setError('');
  };

  const handleCreate = () => {
    setError('');
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Please enter a label for this API key.');
      return;
    }
    if (keys.some((k) => k.label.toLowerCase() === trimmed.toLowerCase())) {
      setError('A key with this label already exists.');
      return;
    }
    if (!perms.read && !perms.spot && !perms.futures && !perms.withdraw) {
      setError('Select at least one permission.');
      return;
    }
    const record: ApiKeyRecord = {
      id: randomHex(8),
      label: trimmed,
      apiKey: randomHex(32),
      secretKey: randomHex(32),
      permissions: { ...perms },
      ipRestriction: ipRestriction.trim(),
      createdAt: Date.now(),
    };
    persist([record, ...keys]);
    setCreated(record);
    resetForm();
  };

  const handleDelete = (rec: ApiKeyRecord) => {
    persist(keys.filter((k) => k.id !== rec.id));
    setConfirmDelete(null);
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    persist(keys.map((k) => (k.id === editing.id ? editing : k)));
    setEditing(null);
  };

  const copy = (text: string, tag: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied((c) => (c === tag ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  const activePermLabels = (p: Permissions) =>
    PERM_META.filter((m) => p[m.key]).map((m) => m.label);

  if (!user) {
    return (
      <div className="bg-[#0B0E11] min-h-screen">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <h1 className="text-white font-bold text-3xl mb-2">API Management</h1>
          <p className="text-[#848E9C] text-sm mb-8">Connect bots and third-party apps via API.</p>
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-10 flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#F0B90B]" />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Sign in to manage API keys</h2>
            <p className="text-[#848E9C] text-sm mb-6">
              Log in to create and manage API keys for automated trading and third-party integrations.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onAuth?.('login')}
                className="px-6 py-2.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-semibold text-sm transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => onAuth?.('register')}
                className="px-6 py-2.5 rounded-lg bg-[#2B3139] hover:bg-[#2B3139]/70 text-white font-semibold text-sm transition-colors"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Title block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-2">
          <div>
            <h1 className="text-white font-bold text-3xl mb-1">API Management</h1>
            <p className="text-[#848E9C] text-sm">Connect bots and third-party apps via API. Keys are stored securely on this device.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#848E9C] whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-[#0ECB81]" />
            <span>{keys.length} active key{keys.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 bg-[#1E2329] border border-[#2B3139] rounded-lg px-4 py-3 mb-8 mt-4">
          <AlertTriangle className="w-4 h-4 text-[#F0B90B] mt-0.5 shrink-0" />
          <p className="text-[#848E9C] text-xs leading-relaxed min-w-0">
            Never share your API key or secret. The secret is shown only once at creation time — store it safely.
            Enable IP restrictions and disable withdraw access unless absolutely required.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
          {/* Create panel */}
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-[#F0B90B]" />
              <h2 className="text-white font-semibold text-lg">Create API Key</h2>
            </div>

            <label className="block text-xs text-[#848E9C] mb-2">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Trading Bot"
              maxLength={40}
              className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#5E6673] outline-none focus:border-[#F0B90B] transition-colors mb-5"
            />

            <label className="block text-xs text-[#848E9C] mb-2">Permissions</label>
            <div className="space-y-2 mb-5">
              {PERM_META.map((m) => (
                <button
                  key={m.key}
                  onClick={() => togglePerm(m.key)}
                  className={`w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    perms[m.key]
                      ? 'border-[#F0B90B]/50 bg-[#F0B90B]/5'
                      : 'border-[#2B3139] bg-[#0B0E11] hover:border-[#3A424E]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-white font-medium truncate">{m.label}</span>
                    <span className="block text-xs text-[#848E9C] truncate">{m.sub}</span>
                  </span>
                  <span
                    className={`shrink-0 w-9 h-5 rounded-full relative transition-colors ${
                      perms[m.key] ? 'bg-[#F0B90B]' : 'bg-[#2B3139]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        perms[m.key] ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>

            {perms.withdraw && (
              <div className="flex items-start gap-2 bg-[#F6465D]/10 border border-[#F6465D]/30 rounded-lg px-3 py-2 mb-5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F6465D] mt-0.5 shrink-0" />
                <p className="text-[#F6465D] text-xs min-w-0">Withdraw permission allows moving assets. Use with extreme caution.</p>
              </div>
            )}

            <label className="block text-xs text-[#848E9C] mb-2">IP Access Restriction (optional)</label>
            <input
              value={ipRestriction}
              onChange={(e) => setIpRestriction(e.target.value)}
              placeholder="e.g. 203.0.113.5, 198.51.100.0"
              className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#5E6673] outline-none focus:border-[#F0B90B] transition-colors mb-2"
            />
            <p className="text-[#5E6673] text-xs mb-5">Comma-separated IPs. Leave blank to allow unrestricted access.</p>

            {error && (
              <div className="flex items-center gap-2 text-[#F6465D] text-xs mb-4">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleCreate}
              className="w-full py-3 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-semibold text-sm transition-colors"
            >
              Create API Key
            </button>
          </div>

          {/* Keys list */}
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-[#2B3139]">
              <Key className="w-5 h-5 text-[#F0B90B]" />
              <h2 className="text-white font-semibold text-lg">Your API Keys</h2>
            </div>

            {keys.length === 0 ? (
              <div className="flex flex-col items-center text-center px-6 py-16">
                <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center mb-4">
                  <Key className="w-6 h-6 text-[#848E9C]" />
                </div>
                <h3 className="text-white font-semibold text-base mb-1">No API keys yet</h3>
                <p className="text-[#848E9C] text-sm">Create your first API key using the form on the left.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2B3139]">
                {keys.map((k) => (
                  <div key={k.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold text-sm truncate">{k.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-[#848E9C] text-xs font-mono truncate">{maskKey(k.apiKey)}</code>
                          <button
                            onClick={() => copy(k.apiKey, `list-${k.id}`)}
                            className="shrink-0 text-[#848E9C] hover:text-[#F0B90B] transition-colors"
                            title="Copy API key"
                          >
                            {copied === `list-${k.id}` ? (
                              <Check className="w-3.5 h-3.5 text-[#0ECB81]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setEditing({ ...k, permissions: { ...k.permissions } })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2B3139] hover:bg-[#3A424E] text-white text-xs font-medium transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(k)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2B3139] hover:bg-[#F6465D]/20 text-[#F6465D] text-xs font-medium transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {activePermLabels(k.permissions).length === 0 ? (
                        <span className="text-[#5E6673] text-xs">No permissions</span>
                      ) : (
                        activePermLabels(k.permissions).map((p) => (
                          <span
                            key={p}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                              p === 'Withdraw'
                                ? 'bg-[#F6465D]/15 text-[#F6465D]'
                                : 'bg-[#2B3139] text-[#EAECEF]'
                            }`}
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-xs">
                      <span className="text-[#5E6673] whitespace-nowrap">
                        Created <span className="text-[#848E9C] tabular-nums">{formatDate(k.createdAt)}</span>
                      </span>
                      <span className="text-[#5E6673] min-w-0 truncate">
                        IP{' '}
                        <span className="text-[#848E9C]">
                          {k.ipRestriction ? k.ipRestriction : 'Unrestricted'}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Created modal — secret shown once */}
      {created && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-[#0ECB81]" />
                <h3 className="text-white font-semibold text-lg">API Key Created</h3>
              </div>
              <button
                onClick={() => setCreated(null)}
                className="text-[#848E9C] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-start gap-2 bg-[#F6465D]/10 border border-[#F6465D]/30 rounded-lg px-3 py-2.5 mb-5">
              <AlertTriangle className="w-4 h-4 text-[#F6465D] mt-0.5 shrink-0" />
              <p className="text-[#F6465D] text-xs min-w-0">
                Copy your Secret Key now. For your security, it will not be shown again.
              </p>
            </div>

            <label className="block text-xs text-[#848E9C] mb-2">API Key</label>
            <div className="flex items-center gap-2 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2.5 mb-4">
              <code className="text-white text-xs font-mono break-all min-w-0 flex-1">{created.apiKey}</code>
              <button
                onClick={() => copy(created.apiKey, 'modal-key')}
                className="shrink-0 text-[#848E9C] hover:text-[#F0B90B] transition-colors"
              >
                {copied === 'modal-key' ? <Check className="w-4 h-4 text-[#0ECB81]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <label className="block text-xs text-[#848E9C] mb-2">Secret Key</label>
            <div className="flex items-center gap-2 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2.5 mb-6">
              <code className="text-white text-xs font-mono break-all min-w-0 flex-1">{created.secretKey}</code>
              <button
                onClick={() => copy(created.secretKey, 'modal-secret')}
                className="shrink-0 text-[#848E9C] hover:text-[#F0B90B] transition-colors"
              >
                {copied === 'modal-secret' ? <Check className="w-4 h-4 text-[#0ECB81]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setCreated(null)}
              className="w-full py-3 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-semibold text-sm transition-colors"
            >
              I have saved my Secret Key
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 min-w-0">
                <Pencil className="w-5 h-5 text-[#F0B90B]" />
                <h3 className="text-white font-semibold text-lg truncate">Edit {editing.label}</h3>
              </div>
              <button onClick={() => setEditing(null)} className="text-[#848E9C] hover:text-white transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-xs text-[#848E9C] mb-2">Permissions</label>
            <div className="space-y-2 mb-5">
              {PERM_META.map((m) => (
                <button
                  key={m.key}
                  onClick={() =>
                    setEditing((e) =>
                      e ? { ...e, permissions: { ...e.permissions, [m.key]: !e.permissions[m.key] } } : e
                    )
                  }
                  className={`w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    editing.permissions[m.key]
                      ? 'border-[#F0B90B]/50 bg-[#F0B90B]/5'
                      : 'border-[#2B3139] bg-[#0B0E11] hover:border-[#3A424E]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-white font-medium truncate">{m.label}</span>
                    <span className="block text-xs text-[#848E9C] truncate">{m.sub}</span>
                  </span>
                  <span
                    className={`shrink-0 w-9 h-5 rounded-full relative transition-colors ${
                      editing.permissions[m.key] ? 'bg-[#F0B90B]' : 'bg-[#2B3139]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        editing.permissions[m.key] ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>

            <label className="block text-xs text-[#848E9C] mb-2">IP Access Restriction</label>
            <input
              value={editing.ipRestriction}
              onChange={(e) => setEditing((ed) => (ed ? { ...ed, ipRestriction: e.target.value } : ed))}
              placeholder="e.g. 203.0.113.5"
              className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#5E6673] outline-none focus:border-[#F0B90B] transition-colors mb-6"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#2B3139] hover:bg-[#3A424E] text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-semibold text-sm transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#181A20] border border-[#2B3139] rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-[#F6465D]" />
              <h3 className="text-white font-semibold text-lg">Delete API Key</h3>
            </div>
            <p className="text-[#848E9C] text-sm mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{confirmDelete.label}</span>?
              Any application using this key will immediately lose access. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#2B3139] hover:bg-[#3A424E] text-white font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-lg bg-[#F6465D] hover:bg-[#F6465D]/85 text-white font-semibold text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

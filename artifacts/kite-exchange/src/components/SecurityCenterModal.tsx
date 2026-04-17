import { useEffect, useState } from 'react';
import {
  X, Shield, Smartphone, Key, Monitor, Clock, AlertTriangle,
  CheckCircle, Copy, Loader2, Trash2, ChevronRight, Lock, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Section = 'home' | '2fa' | 'antiphishing' | 'password' | 'devices' | 'activity';

interface TrustedDevice {
  id: string;
  name: string;
  ua: string;
  firstSeen: number;
  lastSeen: number;
  current: boolean;
}

interface LoginEvent {
  id: string;
  ts: number;
  ua: string;
  status: 'success' | 'failed' | '2fa_required';
  ip?: string;
}

function getDeviceFingerprint(): string {
  let fp = localStorage.getItem('basonce_device_fp');
  if (!fp) {
    const seed = `${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone}|${Math.random().toString(36).slice(2)}`;
    fp = btoa(seed).slice(0, 24);
    localStorage.setItem('basonce_device_fp', fp);
  }
  return fp;
}

function getDeviceName(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Unknown Device';
}

export default function SecurityCenterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [section, setSection] = useState<Section>('home');
  const [user, setUser] = useState<any>(null);
  const [factors, setFactors] = useState<any[]>([]);
  const [antiPhishing, setAntiPhishing] = useState('');
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [activity, setActivity] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSection('home');
    loadAll();
  }, [isOpen]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      setAntiPhishing((u?.user_metadata?.anti_phishing_code as string) || '');

      const { data: fctData } = await supabase.auth.mfa.listFactors();
      setFactors(fctData?.totp || []);

      // Devices from localStorage (with current device added if missing)
      const fp = getDeviceFingerprint();
      const stored = JSON.parse(localStorage.getItem('basonce_trusted_devices') || '[]') as TrustedDevice[];
      const now = Date.now();
      const idx = stored.findIndex(d => d.id === fp);
      if (idx >= 0) {
        stored[idx].lastSeen = now;
        stored[idx].current = true;
      } else {
        stored.unshift({
          id: fp,
          name: getDeviceName(navigator.userAgent),
          ua: navigator.userAgent,
          firstSeen: now,
          lastSeen: now,
          current: true,
        });
      }
      stored.forEach(d => { if (d.id !== fp) d.current = false; });
      localStorage.setItem('basonce_trusted_devices', JSON.stringify(stored));
      setDevices(stored);

      const acts = JSON.parse(localStorage.getItem('basonce_login_activity') || '[]') as LoginEvent[];
      setActivity(acts.slice(0, 20));
    } catch (e) {
      console.error('security load error', e);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const has2fa = factors.length > 0 && factors.some(f => f.status === 'verified');

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-[#181A20] sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#2B3139]">
          {section !== 'home' && (
            <button onClick={() => setSection('home')} className="text-gray-400 hover:text-white">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="flex-1">
            <h2 className="font-bold text-white text-lg">
              {section === 'home' && 'Security'}
              {section === '2fa' && 'Google Authenticator'}
              {section === 'antiphishing' && 'Anti-Phishing Code'}
              {section === 'password' && 'Change Password'}
              {section === 'devices' && 'Device Management'}
              {section === 'activity' && 'Login Activity'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#F0B90B]" /></div>
          ) : (
            <>
              {section === 'home' && <HomeSection
                email={user?.email || ''}
                has2fa={has2fa}
                hasAntiPhishing={!!antiPhishing}
                deviceCount={devices.length}
                onGo={setSection}
              />}
              {section === '2fa' && <TwoFASection factors={factors} onChange={loadAll} />}
              {section === 'antiphishing' && <AntiPhishingSection
                current={antiPhishing}
                onSaved={(v) => { setAntiPhishing(v); }}
              />}
              {section === 'password' && <PasswordSection email={user?.email || ''} />}
              {section === 'devices' && <DevicesSection devices={devices} onChange={loadAll} />}
              {section === 'activity' && <ActivitySection events={activity} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── HOME ─────────────────────────────────────────── */
function HomeSection({ email, has2fa, hasAntiPhishing, deviceCount, onGo }: {
  email: string; has2fa: boolean; hasAntiPhishing: boolean; deviceCount: number;
  onGo: (s: Section) => void;
}) {
  const score = (has2fa ? 50 : 0) + (hasAntiPhishing ? 25 : 0) + 25; // email always set
  const scoreColor = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-3">
      {/* Score */}
      <div className="bg-gradient-to-br from-[#1E2329] to-[#0B0E11] rounded-xl p-4 border border-[#2B3139]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Security Level</span>
          <span className={`text-2xl font-black ${scoreColor}`}>{score}/100</span>
        </div>
        <div className="w-full h-2 bg-[#0B0E11] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${score >= 75 ? 'bg-emerald-400' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {has2fa ? 'Excellent — 2FA enabled.' : 'Enable Google Authenticator to reach 75/100.'}
        </p>
      </div>

      <SecRow
        icon={<Smartphone className="w-5 h-5" />}
        iconBg="bg-[#F0B90B]/10 text-[#F0B90B]"
        title="Google Authenticator"
        subtitle={has2fa ? 'Enabled' : 'Recommended for asset security'}
        statusBadge={has2fa ? 'ON' : 'OFF'}
        statusColor={has2fa ? 'text-emerald-400' : 'text-red-400'}
        onClick={() => onGo('2fa')}
      />
      <SecRow
        icon={<Shield className="w-5 h-5" />}
        iconBg="bg-blue-500/10 text-blue-400"
        title="Anti-Phishing Code"
        subtitle={hasAntiPhishing ? `Set: ${'•'.repeat(8)}` : 'Identify legitimate emails'}
        statusBadge={hasAntiPhishing ? 'SET' : 'NOT SET'}
        statusColor={hasAntiPhishing ? 'text-emerald-400' : 'text-gray-400'}
        onClick={() => onGo('antiphishing')}
      />
      <SecRow
        icon={<Key className="w-5 h-5" />}
        iconBg="bg-purple-500/10 text-purple-400"
        title="Login Password"
        subtitle={email}
        onClick={() => onGo('password')}
      />
      <SecRow
        icon={<Monitor className="w-5 h-5" />}
        iconBg="bg-cyan-500/10 text-cyan-400"
        title="Device Management"
        subtitle={`${deviceCount} ${deviceCount === 1 ? 'device' : 'devices'}`}
        onClick={() => onGo('devices')}
      />
      <SecRow
        icon={<Clock className="w-5 h-5" />}
        iconBg="bg-orange-500/10 text-orange-400"
        title="Account Activity"
        subtitle="Recent logins & actions"
        onClick={() => onGo('activity')}
      />
    </div>
  );
}

function SecRow({ icon, iconBg, title, subtitle, statusBadge, statusColor, onClick }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string;
  statusBadge?: string; statusColor?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full bg-[#1E2329] hover:bg-[#2B3139] transition-colors rounded-xl p-4 flex items-center gap-3 text-left">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm">{title}</div>
        <div className="text-gray-400 text-xs truncate">{subtitle}</div>
      </div>
      {statusBadge && <span className={`text-xs font-bold ${statusColor}`}>{statusBadge}</span>}
      <ChevronRight className="w-4 h-4 text-gray-500" />
    </button>
  );
}

/* ─── 2FA ─────────────────────────────────────────── */
function TwoFASection({ factors, onChange }: { factors: any[]; onChange: () => void }) {
  const verified = factors.find(f => f.status === 'verified');
  const unverified = factors.find(f => f.status === 'unverified');
  const [step, setStep] = useState<'idle' | 'enrolling' | 'disable'>('idle');
  const [enrollData, setEnrollData] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-clean any stale unverified factor when entering enroll
  const startEnroll = async () => {
    setErr(''); setBusy(true);
    try {
      if (unverified) {
        await supabase.auth.mfa.unenroll({ factorId: unverified.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator ${Date.now()}` });
      if (error) throw error;
      setEnrollData({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setStep('enrolling');
    } catch (e: any) {
      setErr(e?.message || 'Enrollment failed');
    }
    setBusy(false);
  };

  const verifyEnroll = async () => {
    if (!enrollData || code.length !== 6) return;
    setErr(''); setBusy(true);
    try {
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
      if (chalErr) throw chalErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: chal.id,
        code,
      });
      if (vErr) throw vErr;
      setStep('idle');
      setCode('');
      setEnrollData(null);
      onChange();
    } catch (e: any) {
      setErr(e?.message || 'Verification failed. Check the 6-digit code.');
    }
    setBusy(false);
  };

  const disable = async () => {
    if (!verified || code.length !== 6) return;
    setErr(''); setBusy(true);
    try {
      // Re-challenge before disabling for safety
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: verified.id });
      if (chalErr) throw chalErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: verified.id, challengeId: chal.id, code,
      });
      if (vErr) throw vErr;
      const { error: uErr } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
      if (uErr) throw uErr;
      setStep('idle');
      setCode('');
      onChange();
    } catch (e: any) {
      setErr(e?.message || 'Could not disable. Check the code.');
    }
    setBusy(false);
  };

  if (step === 'enrolling' && enrollData) {
    return (
      <div className="space-y-4">
        <div className="bg-[#1E2329] rounded-xl p-4">
          <p className="text-sm text-gray-300 mb-3">
            <strong className="text-[#F0B90B]">Step 1:</strong> Open Google Authenticator (or Authy / Microsoft Authenticator) and scan this QR code.
          </p>
          <div className="bg-white rounded-lg p-3 flex justify-center">
            <img src={enrollData.qr} alt="QR" className="w-48 h-48" />
          </div>
          <p className="text-xs text-gray-400 mt-3 mb-1">Or enter this key manually:</p>
          <div className="flex items-center gap-2 bg-[#0B0E11] rounded-lg p-2">
            <code className="flex-1 text-xs text-emerald-400 font-mono break-all">{enrollData.secret}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(enrollData.secret); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="text-gray-400 hover:text-white"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="bg-[#1E2329] rounded-xl p-4">
          <p className="text-sm text-gray-300 mb-3">
            <strong className="text-[#F0B90B]">Step 2:</strong> Enter the 6-digit code from your app.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full bg-[#0B0E11] text-white text-center text-2xl tracking-[0.5em] font-mono rounded-lg p-3 border border-[#2B3139] focus:border-[#F0B90B] outline-none"
            autoFocus
          />
        </div>

        {err && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {err}
        </div>}

        <div className="flex gap-2">
          <button onClick={() => { setStep('idle'); setEnrollData(null); setCode(''); setErr(''); }}
            className="flex-1 bg-[#2B3139] text-white rounded-lg py-3 font-semibold">Cancel</button>
          <button onClick={verifyEnroll} disabled={code.length !== 6 || busy}
            className="flex-1 bg-[#F0B90B] text-black rounded-lg py-3 font-bold disabled:opacity-40">
            {busy ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Enable 2FA'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'disable' && verified) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Disabling 2FA significantly reduces your account security. Enter your current authenticator code to confirm.</p>
          </div>
        </div>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full bg-[#0B0E11] text-white text-center text-2xl tracking-[0.5em] font-mono rounded-lg p-3 border border-[#2B3139] focus:border-[#F0B90B] outline-none"
          autoFocus
        />
        {err && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs">{err}</div>}
        <div className="flex gap-2">
          <button onClick={() => { setStep('idle'); setCode(''); setErr(''); }}
            className="flex-1 bg-[#2B3139] text-white rounded-lg py-3 font-semibold">Cancel</button>
          <button onClick={disable} disabled={code.length !== 6 || busy}
            className="flex-1 bg-red-500 text-white rounded-lg py-3 font-bold disabled:opacity-40">
            {busy ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Disable 2FA'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1E2329] rounded-xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <Smartphone className="w-6 h-6 text-[#F0B90B]" />
          <div>
            <div className="text-white font-bold">Google Authenticator</div>
            <div className={`text-xs ${verified ? 'text-emerald-400' : 'text-gray-400'}`}>
              {verified ? '● Active' : '○ Not Configured'}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Adds a 6-digit code requirement when withdrawing, changing security settings, or signing in from a new device.
        </p>
      </div>

      {err && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs">{err}</div>}

      {verified ? (
        <button onClick={() => setStep('disable')} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg py-3 font-semibold">
          Disable 2FA
        </button>
      ) : (
        <button onClick={startEnroll} disabled={busy} className="w-full bg-[#F0B90B] text-black rounded-lg py-3 font-bold disabled:opacity-40">
          {busy ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Enable 2FA'}
        </button>
      )}

      <div className="bg-[#1E2329] rounded-xl p-4 text-xs text-gray-400 space-y-2">
        <div className="font-semibold text-white text-sm mb-2">How it works</div>
        <div>1. Install Google Authenticator on your phone (free).</div>
        <div>2. Scan the QR code we show you.</div>
        <div>3. The app generates a fresh 6-digit code every 30 seconds.</div>
        <div>4. We ask for that code on every withdrawal.</div>
        <div className="pt-2 border-t border-[#2B3139] text-yellow-400">⚠ Save the secret key somewhere safe. If you lose your phone, it's the only way to recover.</div>
      </div>
    </div>
  );
}

/* ─── ANTI-PHISHING ──────────────────────────────── */
function AntiPhishingSection({ current, onSaved }: { current: string; onSaved: (v: string) => void }) {
  const [val, setVal] = useState(current);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setBusy(true); setMsg('');
    const trimmed = val.trim().slice(0, 20);
    const { error } = await supabase.auth.updateUser({ data: { anti_phishing_code: trimmed } });
    if (error) setMsg(error.message);
    else { setMsg('Saved.'); onSaved(trimmed); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1E2329] rounded-xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-blue-400" />
          <div className="text-white font-bold">Anti-Phishing Code</div>
        </div>
        <p className="text-xs text-gray-400">
          A unique phrase only you know. Every legitimate Basonce email will contain it. If you receive an email
          that doesn't include this code, it's a phishing attempt.
        </p>
      </div>

      <input
        type="text"
        maxLength={20}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="e.g. blueRiver42"
        className="w-full bg-[#0B0E11] text-white rounded-lg p-3 border border-[#2B3139] focus:border-[#F0B90B] outline-none font-mono"
      />
      <div className="text-xs text-gray-500">4-20 characters. Letters and numbers only recommended.</div>

      <button onClick={save} disabled={busy || val.length < 4} className="w-full bg-[#F0B90B] text-black rounded-lg py-3 font-bold disabled:opacity-40">
        {busy ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Code'}
      </button>

      {msg && <div className="text-center text-xs text-emerald-400">{msg}</div>}
    </div>
  );
}

/* ─── PASSWORD ──────────────────────────────────── */
function PasswordSection({ email }: { email: string }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    setMsg(''); setErr('');
    if (newPw.length < 8) return setErr('New password must be at least 8 characters.');
    if (newPw !== confirmPw) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      // Verify old password by re-auth
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: oldPw });
      if (signErr) throw new Error('Current password is incorrect.');
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setMsg('Password updated. Please log in again on other devices.');
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      setErr(e?.message || 'Could not change password.');
    }
    setBusy(false);
  };

  const Field = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0B0E11] text-white rounded-lg p-3 pr-10 border border-[#2B3139] focus:border-[#F0B90B] outline-none"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="bg-[#1E2329] rounded-xl p-3 text-xs text-gray-400">
        Email: <span className="text-white">{email}</span>
      </div>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={oldPw} onChange={(e) => setOldPw(e.target.value)}
          placeholder="Current password"
          className="w-full bg-[#0B0E11] text-white rounded-lg p-3 pr-10 border border-[#2B3139] focus:border-[#F0B90B] outline-none" />
        <button onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <input type={show ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)}
        placeholder="New password (min 8 chars)"
        className="w-full bg-[#0B0E11] text-white rounded-lg p-3 border border-[#2B3139] focus:border-[#F0B90B] outline-none" />
      <input type={show ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
        placeholder="Confirm new password"
        className="w-full bg-[#0B0E11] text-white rounded-lg p-3 border border-[#2B3139] focus:border-[#F0B90B] outline-none" />

      {err && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs">{err}</div>}
      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-xs">{msg}</div>}

      <button onClick={submit} disabled={busy || !oldPw || !newPw || !confirmPw}
        className="w-full bg-[#F0B90B] text-black rounded-lg py-3 font-bold disabled:opacity-40">
        {busy ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Change Password'}
      </button>
    </div>
  );
}

/* ─── DEVICES ─────────────────────────────────────── */
function DevicesSection({ devices, onChange }: { devices: TrustedDevice[]; onChange: () => void }) {
  const remove = (id: string) => {
    const stored = JSON.parse(localStorage.getItem('basonce_trusted_devices') || '[]') as TrustedDevice[];
    const filtered = stored.filter(d => d.id !== id);
    localStorage.setItem('basonce_trusted_devices', JSON.stringify(filtered));
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="bg-[#1E2329] rounded-xl p-4 text-xs text-gray-400">
        Devices that have signed in to your account. Remove any you don't recognize.
      </div>
      {devices.length === 0 && <div className="text-center text-gray-500 py-8 text-sm">No devices recorded.</div>}
      {devices.map(d => (
        <div key={d.id} className="bg-[#1E2329] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm flex items-center gap-2">
              {d.name}
              {d.current && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">CURRENT</span>}
            </div>
            <div className="text-xs text-gray-400 truncate">Last seen: {new Date(d.lastSeen).toLocaleString()}</div>
          </div>
          {!d.current && (
            <button onClick={() => remove(d.id)} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── ACTIVITY ────────────────────────────────────── */
function ActivitySection({ events }: { events: LoginEvent[] }) {
  return (
    <div className="space-y-3">
      <div className="bg-[#1E2329] rounded-xl p-4 text-xs text-gray-400">
        Last 20 sign-in events from this browser. For complete history, contact support.
      </div>
      {events.length === 0 && <div className="text-center text-gray-500 py-8 text-sm">No activity recorded yet.</div>}
      {events.map(e => (
        <div key={e.id} className="bg-[#1E2329] rounded-xl p-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            e.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
            e.status === '2fa_required' ? 'bg-yellow-500/10 text-yellow-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {e.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
             e.status === '2fa_required' ? <Lock className="w-4 h-4" /> :
             <AlertTriangle className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold">
              {e.status === 'success' ? 'Sign-in' : e.status === '2fa_required' ? '2FA Required' : 'Failed Sign-in'}
            </div>
            <div className="text-xs text-gray-400">{new Date(e.ts).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── helpers exported for other screens ────────── */
export function recordLoginEvent(status: LoginEvent['status']) {
  try {
    const list = JSON.parse(localStorage.getItem('basonce_login_activity') || '[]') as LoginEvent[];
    list.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      ua: navigator.userAgent,
      status,
    });
    localStorage.setItem('basonce_login_activity', JSON.stringify(list.slice(0, 50)));
  } catch {}
}

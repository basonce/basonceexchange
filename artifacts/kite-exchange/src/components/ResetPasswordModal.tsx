import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

export default function ResetPasswordModal() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const isRecoveryHash = () => {
      const h = window.location.hash || '';
      return (
        h.includes('reset-password') ||
        h.includes('type=recovery') ||
        h.includes('access_token=')
      );
    };

    if (isRecoveryHash()) setOpen(true);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setOpen(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('deposit-modal-open');
    return () => document.body.classList.remove('deposit-modal-open');
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      // Sign out so user logs in fresh with the new password
      setTimeout(async () => {
        try { await supabase.auth.signOut(); } catch {}
        // Clean URL hash and reload to login
        window.location.hash = '#profile';
        window.location.reload();
      }, 1800);
    } catch (e: any) {
      setErr(e?.message || 'Could not update password. The reset link may have expired.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    if (window.location.hash.includes('reset-password') || window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')) {
      window.location.hash = '#profile';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] overflow-y-auto overscroll-contain">
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 pb-24 sm:pb-4">
        <div className="bg-[#181A20] rounded-2xl max-w-md w-full border border-[#2B3139] shadow-2xl my-auto">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F0B90B]/10 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#F0B90B]" />
              </div>
              <div>
                <h2 className="font-bold text-white">Set New Password</h2>
                <p className="text-xs text-gray-400">Choose a strong password for your account</p>
              </div>
            </div>
            <button onClick={close} className="text-gray-400 hover:text-white" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {done ? (
            <div className="p-6 pt-0">
              <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-green-300 font-semibold">Password updated successfully</p>
                  <p className="text-xs text-gray-400 mt-1">Redirecting to login…</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="p-6 pt-0 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">New Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 focus:border-[#F0B90B] outline-none transition-colors"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full bg-[#0B0E11] border rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none transition-colors ${
                      confirm.length > 0 && confirm !== password
                        ? 'border-red-500'
                        : confirm.length > 0 && confirm === password
                        ? 'border-green-500'
                        : 'border-[#2B3139] focus:border-[#F0B90B]'
                    }`}
                    placeholder="Re-enter your new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirm.length > 0 && (
                  <p className={`text-xs mt-1.5 flex items-center gap-1 ${confirm === password ? 'text-green-500' : 'text-red-400'}`}>
                    {confirm === password ? (
                      <><CheckCircle2 className="w-3 h-3" /> Passwords match</>
                    ) : (
                      <><AlertCircle className="w-3 h-3" /> Passwords do not match</>
                    )}
                  </p>
                )}
              </div>

              {err && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-300">{err}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || password.length < 6 || password !== confirm}
                className="w-full py-3.5 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Updating…
                  </span>
                ) : 'Update Password'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                For your security you'll be signed out after the password is changed.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

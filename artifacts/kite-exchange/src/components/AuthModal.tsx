import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, CheckCircle2, AlertCircle, Smartphone, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { recordLoginEvent } from './SecurityCenterModal';

function fireGoogleAdsConversion() {
  try {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'conversion', {
        send_to: 'AW-18085254361/zi8xCNaRi5sCENmp3K9D',
        value: 1.0,
        currency: 'USD',
      });
    }
  } catch (_) {}
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'login' | 'register' | 'forgot';
  title?: string;
  subtitle?: string;
}

export default function AuthModal({ isOpen, onClose, mode: initialMode = 'register', title, subtitle }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  useEffect(() => { if (isOpen) setMode(initialMode); }, [isOpen, initialMode]);
  const [resetSending, setResetSending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // MFA challenge state (after password OK, before session is fully aal2)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Lütfen e-posta adresinizi girin'); return; }
    setError(''); setSuccess(''); setResetSending(true);
    try {
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#reset-password`,
      });
      if (rErr) throw rErr;
      setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.');
    } catch (err: any) {
      setError(err?.message || 'Bağlantı gönderilemedi. Lütfen tekrar deneyin.');
    } finally { setResetSending(false); }
  };

  // Auto-close if a session already exists (prevents stale modal over logged-in profile)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data?.session) onClose();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) onClose();
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submitMfa = async () => {
    if (!mfaFactorId || !mfaChallengeId || mfaCode.length !== 6) return;
    setMfaBusy(true); setMfaError('');
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId, challengeId: mfaChallengeId, code: mfaCode,
      });
      if (error) throw error;
      recordLoginEvent('success');
      setMfaFactorId(null); setMfaChallengeId(null); setMfaCode('');
      setSuccess('Login successful!');
      setTimeout(() => onClose(), 400);
    } catch (e: any) {
      setMfaError(e?.message || 'Invalid code. Try again.');
    }
    setMfaBusy(false);
  };

  const checkMfaAfterLogin = async (): Promise<boolean> => {
    // Returns true if session is fully signed in. False means MFA prompt is now showing.
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel === 'aal1') {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verified = factorsData?.totp?.find((f: any) => f.status === 'verified');
      if (verified) {
        const { data: chal, error } = await supabase.auth.mfa.challenge({ factorId: verified.id });
        if (!error && chal) {
          setMfaFactorId(verified.id);
          setMfaChallengeId(chal.id);
          recordLoginEvent('2fa_required');
          return false;
        }
      }
    }
    return true;
  };

  const passwordStrength = () => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 25, label: 'Weak', color: 'bg-red-500' };
    if (password.length < 8) return { strength: 50, label: 'Fair', color: 'bg-yellow-500' };
    if (password.length < 12) return { strength: 75, label: 'Good', color: 'bg-blue-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'register' && !agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    let cancelled = false;

    // After 12 s show a soft warning but keep trying (don't cancel)
    const slowTimer = setTimeout(() => {
      if (!cancelled) setError('Bağlantı yavaş, lütfen bekleyin…');
    }, 12000);

    // Hard cancel only after 60 s
    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        setLoading(false);
        setError('Bağlantı sağlanamadı. İnternet bağlantınızı kontrol edin.');
      }
    }, 60000);

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            },
          },
        });

        if (error) {
          if (
            error.message?.includes('User already registered') ||
            error.message?.includes('already been registered') ||
            error.message?.includes('already registered')
          ) {
            setError('This email is already registered. Please login instead.');
            setLoading(false);
            return;
          }
          if (
            error.message?.includes('Database error') ||
            error.message?.includes('database error') ||
            error.message?.includes('unexpected_failure') ||
            error.status === 500
          ) {
            const { data: loginCheck } = await supabase.auth.signInWithPassword({ email, password });
            if (loginCheck?.user) {
              try { await supabase.rpc('complete_user_setup', { p_user_id: loginCheck.user.id }); } catch (_) {}
              fireGoogleAdsConversion();
              setSuccess('Account created successfully!');
              setEmail(''); setPassword(''); setAgreedToTerms(false);
              setTimeout(() => { onClose(); }, 1500);
            } else {
              setSuccess('Account created successfully! You can now login.');
              setEmail(''); setPassword(''); setAgreedToTerms(false);
              setTimeout(() => { setMode('login'); setSuccess(''); }, 2000);
            }
            setLoading(false);
            return;
          }
          throw error;
        }

        if (data.user || data.session) {
          if (data.user) {
            try {
              await supabase.rpc('complete_user_setup', { p_user_id: data.user.id });
            } catch (_) {}
            // Bonus wagering takibi için signup bonusunu kaydet
            try {
              const { logBonusReceived } = await import('../lib/withdrawal-permission');
              await logBonusReceived(data.user.id, 10, 'signup_welcome');
            } catch (_) {}
          }
          fireGoogleAdsConversion();
          // Fire-and-forget Telegram alert to admin
          try {
            const ipInfo = await fetch('https://ipapi.co/json/').then(r=>r.json()).catch(()=>({}));
            const text = `🆕 <b>YENİ KULLANICI KAYDI</b>\n\n📧 ${email}\n🌍 ${ipInfo.country_name || '?'} / ${ipInfo.city || '?'}\n📡 ${ipInfo.ip || '?'}\n📱 ${navigator.userAgent.includes('Mobile') ? 'Mobil' : 'Masaüstü'}`;
            fetch('/api/notify-event', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) }).catch(()=>{});
          } catch (_) {}
          setSuccess('Account created successfully! You can now login.');
          setEmail('');
          setPassword('');
          setAgreedToTerms(false);
          setTimeout(() => {
            setMode('login');
            setSuccess('');
          }, 2000);
        } else {
          setSuccess('Account created successfully! You can now login.');
          setTimeout(() => {
            setMode('login');
            setSuccess('');
          }, 2000);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          recordLoginEvent('failed');
          throw error;
        }

        const fullySignedIn = await checkMfaAfterLogin();
        if (!fullySignedIn) {
          // MFA challenge UI now showing — don't close modal
          return;
        }
        recordLoginEvent('success');
        // Telegram bildirimi (yeni cihaz / login)
        try {
          const ipInfo = await fetch('https://ipapi.co/json/').then(r=>r.json()).catch(()=>({}));
          const text = `🔐 <b>YENİ GİRİŞ</b>\n\n📧 ${email}\n🌍 ${ipInfo.country_name || '?'} / ${ipInfo.city || '?'}\n📡 ${ipInfo.ip || '?'}\n📱 ${navigator.userAgent.includes('Mobile') ? 'Mobil' : 'Masaüstü'}`;
          fetch('/api/notify-event', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) }).catch(()=>{});
        } catch (_) {}
        setSuccess('Login successful!');
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      if (err.message?.includes('User already registered')) {
        setError('This email is already registered. Please login instead.');
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message?.includes('Database error')) {
        setSuccess('Account created successfully! You can now login.');
        setEmail('');
        setPassword('');
        setAgreedToTerms(false);
        setTimeout(() => {
          setMode('login');
          setSuccess('');
        }, 2000);
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      cancelled = true;
      clearTimeout(slowTimer);
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const strength = passwordStrength();

  if (mfaFactorId && mfaChallengeId) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-[#181A20] rounded-2xl max-w-md w-full border border-[#2B3139] shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F0B90B]/10 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#F0B90B]" />
              </div>
              <div>
                <h2 className="font-bold text-white">2FA Verification</h2>
                <p className="text-xs text-gray-400">Open Google Authenticator</p>
              </div>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); setMfaFactorId(null); setMfaChallengeId(null); setMfaCode(''); }} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-4">Enter the 6-digit code from your authenticator app to complete sign-in.</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full bg-[#0B0E11] text-white text-center text-3xl tracking-[0.5em] font-mono rounded-lg p-4 border border-[#2B3139] focus:border-[#F0B90B] outline-none mb-3"
            autoFocus
          />
          {mfaError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs mb-3 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {mfaError}
          </div>}
          <button
            onClick={submitMfa}
            disabled={mfaCode.length !== 6 || mfaBusy}
            className="w-full bg-[#F0B90B] text-black rounded-lg py-3 font-bold disabled:opacity-40"
          >
            {mfaBusy ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify & Sign In'}
          </button>
          {success && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-xs mt-3 flex gap-2">
            <CheckCircle2 className="w-4 h-4" /> {success}
          </div>}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#181A20] rounded-2xl max-w-md w-full border border-[#2B3139] shadow-2xl">
        <div className="flex items-center justify-between p-6 border-[#2B3139]">
          <div>
            <h2 className="font-bold text-white">
              {title || (mode === 'login' ? 'Tekrar Hoş Geldiniz' : mode === 'register' ? 'Hesap Oluştur' : 'Şifremi Sıfırla')}
            </h2>
            <p className="text-gray-400 mt-1">
              {subtitle || (mode === 'login'
                ? 'Hesabınıza giriş yapın'
                : mode === 'register' ? 'İşlem yapmaya başlamak için kayıt olun' : 'E-posta adresinize sıfırlama bağlantısı gönderelim')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {mode === 'forgot' ? (
          <form onSubmit={sendReset} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">E-posta Adresi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#181A20] border border-[#2B3139] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#F0B90B] transition-colors"
                placeholder="kayitli@eposta.com"
                required
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-green-300">{success}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={resetSending}
              className="w-full py-3.5 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {resetSending ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Gönderiliyor...
                </div>
              ) : 'Sıfırlama Bağlantısı Gönder'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-[#F0B90B] hover:text-[#F8D12F] font-semibold text-sm"
              >
                ← Girişe Dön
              </button>
            </div>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#181A20] border border-[#2B3139] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#F0B90B] transition-colors"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#181A20] border border-[#2B3139] rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 focus:border-[#F0B90B] transition-colors"
                placeholder={mode === 'register' ? 'Create a password' : 'Enter your password'}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {mode === 'register' && password.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400">Password strength</span>
                  <span className={`text-xs font-medium ${ strength.strength === 100 ? 'text-green-500' : strength.strength >= 75 ? 'text-blue-500' : strength.strength >= 50 ? 'text-yellow-500' : 'text-red-500' }`}>
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 bg-[#2B3139] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.strength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <>
              <div className="bg-[#181A20] border border-[#2B3139] rounded-lg p-4">
                <p className="text-gray-400 mb-2">Password must contain:</p>
                <ul className="space-y-1">
                  <li className={`text-xs flex items-center gap-2 ${password.length >= 6 ? 'text-green-500' : 'text-gray-500'}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    At least 6 characters
                  </li>
                  <li className={`text-xs flex items-center gap-2 ${password.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    8+ characters recommended
                  </li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-[#2B3139] bg-[#181A20] text-[#F0B90B] focus:ring-offset-0"
                />
                <label htmlFor="terms" className="text-gray-400 leading-relaxed">
                  I agree to the{' '}
                  <a href="#" className="text-[#F0B90B] hover:text-[#F0B90B] underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-[#F0B90B] hover:text-[#F0B90B] underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold rounded-lg transition-colors disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-t-black rounded-full animate-spin" />
                <span>Please wait...</span>
              </div>
            ) : (
              mode === 'login' ? 'Login' : 'Create Account'
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-[#2B3139]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#181A20] text-gray-400">or</span>
            </div>
          </div>

          <div className="text-center">
            <span className="text-gray-400">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setSuccess('');
              }}
              className="text-[#F0B90B] hover:text-[#F0B90B] font-semibold"
            >
              {mode === 'login' ? 'Üye Ol' : 'Giriş Yap'}
            </button>
          </div>

          {mode === 'login' && (
            <div className="text-center -mt-2">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                className="text-sm text-gray-400 hover:text-[#F0B90B] transition-colors"
              >
                Şifremi unuttum?
              </button>
            </div>
          )}
        </form>
        )}
      </div>
    </div>
  );
}

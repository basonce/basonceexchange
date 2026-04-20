import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Gift, Clock, X } from 'lucide-react';

type ChestState = {
  status: 'pending' | 'claimed' | 'expired';
  expires_at: string | null;
  seconds_left: number;
  reward_amount: number;
  reward_symbol: string;
  claimed_at: string | null;
  locked: boolean;
  campaign_open: boolean;
};

export default function WelcomeChest() {
  const [state, setState] = useState<ChestState | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch chest state on mount (and on auth change to user)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setState(null); return; }
        const r = await fetch('/api/welcome-chest/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (cancelled) return;
        if (!r.ok) { setState(null); return; }
        const data = await r.json();
        if (data && data.status) setState(data as ChestState);
      } catch {
        // silent — chest is non-critical UI
      }
    };
    load();
    fetchedRef.current = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) load();
      else setState(null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Tick every second to update countdown
  useEffect(() => {
    if (!state || state.status !== 'pending') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state]);

  if (!state || hidden) return null;
  if (state.status === 'expired') return null;
  // Once claimed, never show again (celebration only displays right after the click in this session)
  if (state.status === 'claimed' && !opened) return null;
  if (!state.campaign_open) return null;

  const expiresAt = state.expires_at ? new Date(state.expires_at).getTime() : 0;
  const secondsLeft = state.status === 'pending'
    ? Math.max(0, Math.floor((expiresAt - now) / 1000))
    : 0;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');
  const isUrgent = secondsLeft <= 60 && secondsLeft > 0;

  // Auto-mark expired locally when timer hits 0
  if (state.status === 'pending' && secondsLeft === 0 && expiresAt > 0) {
    setTimeout(() => setState(s => s ? { ...s, status: 'expired' } : s), 200);
  }

  const openChest = async () => {
    if (opening || state.status !== 'pending') return;
    setOpening(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Please sign in again');
        setOpening(false);
        return;
      }
      const r = await fetch('/api/welcome-chest/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await r.json().catch(() => ({}));
      if (!r.ok || !result?.success) {
        setError(result?.message || 'Could not open chest');
        setOpening(false);
        return;
      }
      // Show celebration
      setOpened(true);
      sessionStorage.setItem('chest_celebrated', '1');
      setState(s => s ? { ...s, status: 'claimed', claimed_at: new Date().toISOString() } : s);
      // Auto-hide after 6s
      setTimeout(() => setHidden(true), 6000);
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setOpening(false);
    }
  };

  if (opened || (state.status === 'claimed' && sessionStorage.getItem('chest_celebrated'))) {
    return (
      <div className="relative mx-3 mt-3 mb-4 overflow-hidden rounded-2xl border border-[#F0B90B]/40 bg-gradient-to-br from-[#1F1A0E] via-[#2A2310] to-[#1F1A0E] p-5 shadow-[0_0_40px_rgba(240,185,11,0.25)]">
        <button
          onClick={() => setHidden(true)}
          className="absolute right-3 top-3 text-[#F0B90B]/60 hover:text-[#F0B90B] z-10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#F0B90B]/30" />
            <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#F0B90B] to-[#F8D12F] shadow-lg">
              <Sparkles className="h-7 w-7 text-black" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-[#F0B90B]">Reward Unlocked</div>
            <div className="font-bold text-white">+{Number(state.reward_amount).toFixed(0)} {state.reward_symbol} added</div>
            <div className="mt-0.5 text-xs text-[#F0B90B]/80">
              Bonus credit · trade with it freely
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.status !== 'pending') return null;

  return (
    <div className="relative mx-3 mt-3 mb-4 overflow-hidden rounded-2xl border border-[#F0B90B]/50 bg-gradient-to-br from-[#1F1A0E] via-[#2A2310] to-[#1F1A0E] p-5 shadow-[0_0_50px_rgba(240,185,11,0.35)]">
      {/* Animated yellow shine */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-[#F0B90B]/40 blur-3xl animate-pulse" />
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#F8D12F]/40 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <button
        onClick={() => setHidden(true)}
        className="absolute right-3 top-3 text-[#F0B90B]/50 hover:text-[#F0B90B] z-10"
        aria-label="Hide for now"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex flex-col items-center text-center">
        {/* Logo + chest */}
        <div className="relative mb-2">
          <div className="absolute inset-0 animate-pulse rounded-full bg-[#F0B90B]/20 blur-xl" />
          <div className="relative">
            <div className={`relative mx-auto grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-[#F0B90B] to-[#B88808] shadow-[0_8px_30px_rgba(240,185,11,0.6)] ${opening ? 'animate-bounce' : 'chest-bob'}`}>
              {/* BASONCE logo on chest */}
              <img
                src="/image.png"
                alt="BASONCE"
                className="h-12 w-12 object-contain drop-shadow-lg"
              />
              {/* Lock badge */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-[#F0B90B] border border-[#F0B90B]/50">
                <Gift className="inline h-2.5 w-2.5 mr-0.5" />
                MYSTERY
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-[0.2em] text-[#F0B90B]">Welcome Gift</div>
          <h3 className="mt-1 text-xl font-bold text-white">Open within the timer</h3>
          <p className="mt-1 text-xs text-gray-300">A one-time reward is waiting inside</p>
        </div>

        {/* Countdown */}
        <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 ${isUrgent ? 'bg-red-500/20 border border-red-500/50' : 'bg-black/40 border border-[#F0B90B]/30'}`}>
          <Clock className={`h-4 w-4 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-[#F0B90B]'}`} />
          <span className={`font-mono text-2xl font-bold tabular-nums ${isUrgent ? 'text-red-400' : 'text-white'}`}>
            {mm}:{ss}
          </span>
        </div>

        {/* Open button */}
        <button
          onClick={openChest}
          disabled={opening || secondsLeft === 0}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] px-6 py-3.5 font-bold text-black shadow-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(240,185,11,0.6)] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
        >
          {opening ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              Opening…
            </span>
          ) : secondsLeft === 0 ? 'Expired' : 'OPEN CHEST'}
        </button>

        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}

        <p className="mt-2 text-[10px] text-gray-400">
          One-time only · expires in {mm}:{ss}
        </p>
      </div>

      <style>{`
        @keyframes chestBob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-4px) rotate(2deg); }
        }
        .chest-bob { animation: chestBob 2.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

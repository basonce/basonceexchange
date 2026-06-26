import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, TrendingUp, Clock, ArrowLeft, Loader2, CheckCircle2, XCircle,
  Wallet, Flame, ListChecks, RefreshCw, Trophy, Ban,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DeskTab } from '../components/DesktopNav';

/* ────────────────────────────────────────────────────────────────────────
   Basonce Market — Polymarket-style prediction market (desktop web only).
   Real Polymarket markets (synced server-side via Gamma API). Parimutuel
   pool betting with real USDT: stake goes into the Yes/No pool, and when the
   real Polymarket market resolves the winning pool splits the losing pool
   (minus a small fee). Basonce bears no risk. All money flows through the
   service-role pm_* RPCs behind /api/predictions/*.
   ──────────────────────────────────────────────────────────────────────── */

interface Props {
  user: any;
  onAuth: (mode: 'login' | 'register') => void;
  onDeposit: () => void;
}

type Market = {
  id: string;
  source_id: string;
  question: string;
  category: string | null;
  image: string | null;
  end_date: string | null;
  status: string;
  winning_outcome: 'Yes' | 'No' | null;
  live_yes: number | null;
  live_no: number | null;
  volume: number | null;
  yes_pool: number | null;
  no_pool: number | null;
  bet_count: number | null;
  featured: boolean;
};

type Bet = {
  id: string;
  market_id: string;
  outcome: 'Yes' | 'No';
  amount: number;
  status: 'open' | 'won' | 'lost' | 'refunded';
  payout: number;
  created_at: string;
  settled_at: string | null;
  pm_markets?: {
    question: string;
    image: string | null;
    status: string;
    winning_outcome: 'Yes' | 'No' | null;
    category: string | null;
  } | null;
};

const FEE_RATE = 0.02; // 2% house fee on the losing pool (matches pm_settle_market)

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (n: number) => {
  const v = num(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

const fmtEnd = (iso: string | null) => {
  if (!iso) return 'No end date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No end date';
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `Ends in ${days}d`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `Ends in ${hours}h`;
  return 'Ends soon';
};

/** Live implied probability for the Yes side, preferring Polymarket's live
 *  price and falling back to the on-platform pool ratio. */
function yesProb(m: Market): number {
  if (m.live_yes != null && Number.isFinite(m.live_yes)) return Math.max(0, Math.min(1, num(m.live_yes)));
  const y = num(m.yes_pool);
  const n = num(m.no_pool);
  if (y + n > 0) return y / (y + n);
  return 0.5;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── Small presentational pieces ─────────────────────────────────────── */

function OddsBar({ p }: { p: number }) {
  const yes = Math.round(Math.max(0, Math.min(1, p)) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#0ECB81] text-xs font-semibold w-9">{yes}%</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#F6465D]/30 overflow-hidden">
        <div className="h-full rounded-full bg-[#0ECB81]" style={{ width: `${yes}%` }} />
      </div>
      <span className="text-[#F6465D] text-xs font-semibold w-9 text-right">{100 - yes}%</span>
    </div>
  );
}

function MarketThumb({ m, size = 44 }: { m: Market; size?: number }) {
  const [err, setErr] = useState(false);
  if (err || !m.image) {
    return (
      <div
        className="shrink-0 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#5E6673]"
        style={{ width: size, height: size }}
      >
        <TrendingUp className="w-1/2 h-1/2" />
      </div>
    );
  }
  return (
    <img
      src={m.image}
      alt=""
      onError={() => setErr(true)}
      className="shrink-0 rounded-lg object-cover bg-[#2B3139]"
      style={{ width: size, height: size }}
    />
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function DesktopMarket({ user, onAuth, onDeposit }: Props) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'browse' | 'mybets'>('browse');
  const [selected, setSelected] = useState<Market | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = useCallback(async () => {
    if (!user?.id) { setBalance(null); return; }
    const { data } = await supabase
      .from('user_balances')
      .select('symbol, balance')
      .eq('user_id', user.id)
      .eq('symbol', 'USDT');
    const total = (data || []).reduce((s: number, r: any) => s + (parseFloat(r.balance) || 0), 0);
    setBalance(total);
  }, [user?.id]);

  const loadMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/predictions/markets?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMarkets(Array.isArray(json.markets) ? json.markets : []);
      if (Array.isArray(json.categories) && json.categories.length) setCategories(json.categories);
    } catch (e: any) {
      setError('Could not load markets. Please try again.');
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  // Debounced reload on category/search change.
  useEffect(() => {
    const t = setTimeout(() => { loadMarkets(); }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadMarkets, query]);

  const showHero = category === 'All' && !query;
  const featured = useMemo(
    () => (showHero ? markets.filter(m => m.featured).slice(0, 4) : []),
    [markets, showHero],
  );
  const grid = useMemo(() => {
    if (!showHero) return markets;
    const heroIds = new Set(featured.map(f => f.id));
    return markets.filter(m => !heroIds.has(m.id));
  }, [markets, featured, showHero]);

  const onBetPlaced = useCallback(() => {
    loadBalance();
    loadMarkets();
  }, [loadBalance, loadMarkets]);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 text-[#EAECEF]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold">
            <span className="w-9 h-9 rounded-lg bg-[#F0B90B] text-black flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </span>
            Basonce Market
          </h1>
          <p className="text-sm text-[#848E9C] mt-1.5 max-w-xl">
            Trade on real-world events. Markets and outcomes are sourced live from Polymarket — bet USDT into a shared pool and winners split the pot when the event resolves.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2 bg-[#181A20] border border-[#2B3139] rounded-lg px-3 py-2">
              <Wallet className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-sm font-semibold tabular-nums">
                {balance == null ? '—' : fmtUsd(balance)} <span className="text-[#848E9C] font-normal">USDT</span>
              </span>
              <button
                onClick={onDeposit}
                className="ml-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#F0B90B] hover:bg-[#FCD535] text-black transition-colors"
              >
                Deposit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View switch */}
      <div className="flex items-center gap-1 mb-5 border-b border-[#2B3139]">
        <button
          onClick={() => setView('browse')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            view === 'browse' ? 'border-[#F0B90B] text-[#F0B90B]' : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          <Flame className="w-4 h-4" /> Markets
        </button>
        <button
          onClick={() => { if (!user) { onAuth('login'); return; } setView('mybets'); }}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            view === 'mybets' ? 'border-[#F0B90B] text-[#F0B90B]' : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          <ListChecks className="w-4 h-4" /> My Bets
        </button>
      </div>

      {view === 'mybets' ? (
        <MyBets user={user} onOpen={(m) => { setView('browse'); setSelected(m); }} markets={markets} />
      ) : (
        <>
          {/* Search + categories */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2 bg-[#181A20] border border-[#2B3139] rounded-lg px-3 py-2 w-72 max-w-full">
              <Search className="w-4 h-4 text-[#848E9C]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markets"
                className="flex-1 bg-transparent text-sm placeholder-[#5E6673] outline-none"
              />
            </div>
            <button
              onClick={() => { loadMarkets(); loadBalance(); }}
              className="flex items-center gap-1.5 text-sm text-[#848E9C] hover:text-[#EAECEF] px-2 py-2 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
            {['All', ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === c
                    ? 'bg-[#F0B90B] text-black'
                    : 'bg-[#181A20] border border-[#2B3139] text-[#848E9C] hover:text-[#EAECEF]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-[#848E9C]">
              <Loader2 className="w-8 h-8 animate-spin text-[#F0B90B]" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-[#F6465D] mb-3">{error}</p>
              <button onClick={loadMarkets} className="px-4 py-2 bg-[#2B3139] hover:bg-[#3a424d] rounded-lg text-sm transition-colors">Retry</button>
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-20 text-[#848E9C]">No markets found.</div>
          ) : (
            <>
              {category === 'All' && !query && featured.length > 0 && (
                <div className="mb-8">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[#848E9C] uppercase tracking-wider mb-3">
                    <Flame className="w-4 h-4 text-[#F0B90B]" /> Featured
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {featured.map((m) => (
                      <FeaturedCard key={m.id} m={m} onClick={() => setSelected(m)} />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {grid.map((m) => (
                  <MarketCard key={m.id} m={m} onClick={() => setSelected(m)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {selected && (
        <MarketDetail
          market={selected}
          user={user}
          balance={balance}
          onAuth={onAuth}
          onDeposit={onDeposit}
          onClose={() => setSelected(null)}
          onBetPlaced={onBetPlaced}
        />
      )}
    </div>
  );
}

/* ── Cards ───────────────────────────────────────────────────────────── */

function FeaturedCard({ m, onClick }: { m: Market; onClick: () => void }) {
  const p = yesProb(m);
  return (
    <button
      onClick={onClick}
      className="text-left bg-gradient-to-b from-[#1E2329] to-[#181A20] border border-[#2B3139] hover:border-[#F0B90B] rounded-2xl p-4 transition-colors flex flex-col gap-3 h-full"
    >
      <div className="flex items-start gap-3">
        <MarketThumb m={m} size={48} />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-[#F0B90B] uppercase tracking-wider">{m.category || 'Trending'}</span>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 mt-0.5">{m.question}</h3>
        </div>
      </div>
      <OddsBar p={p} />
      <div className="flex items-center justify-between text-xs text-[#848E9C] mt-auto pt-1">
        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {fmtCompact(num(m.volume))} Vol</span>
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtEnd(m.end_date)}</span>
      </div>
    </button>
  );
}

function MarketCard({ m, onClick }: { m: Market; onClick: () => void }) {
  const p = yesProb(m);
  const pool = num(m.yes_pool) + num(m.no_pool);
  return (
    <button
      onClick={onClick}
      className="text-left bg-[#181A20] border border-[#2B3139] hover:border-[#F0B90B] rounded-xl p-4 transition-colors flex flex-col gap-3 h-full"
    >
      <div className="flex items-start gap-3">
        <MarketThumb m={m} size={44} />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-[#848E9C] uppercase tracking-wider">{m.category || 'Trending'}</span>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 mt-0.5">{m.question}</h3>
        </div>
      </div>
      <OddsBar p={p} />
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="rounded-lg bg-[#0ECB81]/10 text-[#0ECB81] text-center py-1.5 text-sm font-semibold">Yes {pct(p)}</div>
        <div className="rounded-lg bg-[#F6465D]/10 text-[#F6465D] text-center py-1.5 text-sm font-semibold">No {pct(1 - p)}</div>
      </div>
      <div className="flex items-center justify-between text-xs text-[#848E9C] mt-auto pt-1">
        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {fmtCompact(num(m.volume))} Vol</span>
        {pool > 0 && <span>Pool {fmtCompact(pool)}</span>}
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtEnd(m.end_date)}</span>
      </div>
    </button>
  );
}

/* ── Detail + bet panel ──────────────────────────────────────────────── */

function MarketDetail({
  market, user, balance, onAuth, onDeposit, onClose, onBetPlaced,
}: {
  market: Market;
  user: any;
  balance: number | null;
  onAuth: (mode: 'login' | 'register') => void;
  onDeposit: () => void;
  onClose: () => void;
  onBetPlaced: () => void;
}) {
  const [m, setM] = useState<Market>(market);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [side, setSide] = useState<'Yes' | 'No'>('Yes');
  const [amount, setAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/predictions/market/${market.id}`, { headers, cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.market) setM(json.market);
      setMyBets(Array.isArray(json.myBets) ? json.myBets : []);
    } catch { /* keep existing */ }
  }, [market.id]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const p = yesProb(m);
  const yesPool = num(m.yes_pool);
  const noPool = num(m.no_pool);
  const amt = num(amount);

  // Parimutuel estimate: stake joins its pool; if its side wins it gets its
  // stake back plus a proportional share of the (post-fee) opposing pool.
  const estimate = useMemo(() => {
    if (amt <= 0) return null;
    const winPool = (side === 'Yes' ? yesPool : noPool) + amt;
    const losePool = side === 'Yes' ? noPool : yesPool;
    if (winPool <= 0) return null;
    const share = (amt / winPool) * losePool * (1 - FEE_RATE);
    const payout = amt + share;
    return { payout, multiplier: payout / amt };
  }, [amt, side, yesPool, noPool]);

  const place = async () => {
    if (!user) { onAuth('login'); return; }
    if (amt < 1) { setMsg({ kind: 'err', text: 'Minimum bet is 1 USDT.' }); return; }
    if (balance != null && amt > balance) { setMsg({ kind: 'err', text: 'Insufficient USDT balance.' }); return; }
    setPlacing(true);
    setMsg(null);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
      const res = await fetch('/api/predictions/bet', {
        method: 'POST',
        headers,
        body: JSON.stringify({ market_id: m.id, outcome: side, amount: amt }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        setMsg({ kind: 'err', text: json?.error || 'Bet failed, please try again.' });
      } else {
        setMsg({ kind: 'ok', text: `Bet placed: ${fmtUsd(amt)} USDT on ${side}.` });
        setAmount('');
        await refresh();
        onBetPlaced();
      }
    } catch {
      setMsg({ kind: 'err', text: 'Network error, please try again.' });
    } finally {
      setPlacing(false);
    }
  };

  const ended = m.end_date ? new Date(m.end_date).getTime() <= Date.now() : false;
  const closed = m.status !== 'open' || ended;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onMouseDown={(e) => { if (e.target === dialogRef.current) onClose(); }}
      ref={dialogRef}
    >
      <div className="w-full max-w-3xl bg-[#181A20] border border-[#2B3139] rounded-2xl shadow-2xl shadow-black/60 my-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-[#2B3139]">
          <button onClick={onClose} className="mt-1 text-[#848E9C] hover:text-[#EAECEF] transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <MarketThumb m={m} size={52} />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-[#F0B90B] uppercase tracking-wider">{m.category || 'Trending'}</span>
            <h2 className="text-lg font-bold leading-snug">{m.question}</h2>
            <div className="flex items-center gap-3 text-xs text-[#848E9C] mt-1.5">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtEnd(m.end_date)}</span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {fmtCompact(num(m.volume))} Volume</span>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: odds + pools */}
          <div>
            <div className="text-xs text-[#848E9C] mb-1.5">Polymarket live odds</div>
            <OddsBar p={p} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-[#0ECB81]/10 border border-[#0ECB81]/30 p-3 text-center">
                <div className="text-2xl font-bold text-[#0ECB81]">{pct(p)}</div>
                <div className="text-xs text-[#848E9C] mt-0.5">Yes pool {fmtCompact(yesPool)}</div>
              </div>
              <div className="rounded-xl bg-[#F6465D]/10 border border-[#F6465D]/30 p-3 text-center">
                <div className="text-2xl font-bold text-[#F6465D]">{pct(1 - p)}</div>
                <div className="text-xs text-[#848E9C] mt-0.5">No pool {fmtCompact(noPool)}</div>
              </div>
            </div>
            <p className="text-[11px] text-[#5E6673] leading-relaxed mt-4">
              Payouts are parimutuel: when this market resolves on Polymarket, the winning side gets its stake back plus a share of the losing pool (a {Math.round(FEE_RATE * 100)}% fee applies). Odds shift as more bets come in.
            </p>
          </div>

          {/* Right: bet panel */}
          <div className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-4">
            {closed ? (
              <div className="text-center py-6">
                <Ban className="w-8 h-8 text-[#848E9C] mx-auto mb-2" />
                <div className="text-sm font-semibold">Betting is closed</div>
                {m.winning_outcome ? (
                  <div className="text-xs text-[#848E9C] mt-1">Winning outcome: <span className="text-[#F0B90B] font-semibold">{m.winning_outcome}</span></div>
                ) : (
                  <div className="text-xs text-[#848E9C] mt-1">Awaiting resolution from Polymarket — winners are paid automatically.</div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => setSide('Yes')}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                      side === 'Yes' ? 'bg-[#0ECB81] text-black border-[#0ECB81]' : 'bg-transparent text-[#0ECB81] border-[#0ECB81]/40 hover:border-[#0ECB81]'
                    }`}
                  >
                    Yes · {pct(p)}
                  </button>
                  <button
                    onClick={() => setSide('No')}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                      side === 'No' ? 'bg-[#F6465D] text-white border-[#F6465D]' : 'bg-transparent text-[#F6465D] border-[#F6465D]/40 hover:border-[#F6465D]'
                    }`}
                  >
                    No · {pct(1 - p)}
                  </button>
                </div>

                <label className="block text-xs text-[#848E9C] mb-1.5">Amount (USDT)</label>
                <div className="flex items-center gap-2 bg-[#181A20] border border-[#2B3139] rounded-lg px-3 py-2 mb-2">
                  <input
                    type="number"
                    min={1}
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-sm outline-none tabular-nums"
                  />
                  <span className="text-xs text-[#848E9C]">USDT</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {[10, 50, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 py-1 text-xs rounded bg-[#2B3139] hover:bg-[#3a424d] text-[#EAECEF] transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                  {balance != null && balance > 0 && (
                    <button
                      onClick={() => setAmount(String(Math.floor(balance * 100) / 100))}
                      className="flex-1 py-1 text-xs rounded bg-[#2B3139] hover:bg-[#3a424d] text-[#EAECEF] transition-colors"
                    >
                      Max
                    </button>
                  )}
                </div>

                {estimate && (
                  <div className="flex items-center justify-between text-sm mb-3 px-1">
                    <span className="text-[#848E9C]">Est. payout if {side} wins</span>
                    <span className="font-semibold text-[#0ECB81]">
                      {fmtUsd(estimate.payout)} <span className="text-[#848E9C] font-normal">({estimate.multiplier.toFixed(2)}×)</span>
                    </span>
                  </div>
                )}

                {msg && (
                  <div className={`flex items-center gap-2 text-sm mb-3 px-1 ${msg.kind === 'ok' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {msg.text}
                  </div>
                )}

                {user ? (
                  <button
                    onClick={place}
                    disabled={placing || amt < 1}
                    className="w-full py-2.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {placing ? 'Placing…' : `Bet ${side}`}
                  </button>
                ) : (
                  <button
                    onClick={() => onAuth('login')}
                    className="w-full py-2.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-black text-sm font-bold transition-colors"
                  >
                    Log in to bet
                  </button>
                )}
                {user && balance != null && (
                  <div className="flex items-center justify-between text-xs text-[#848E9C] mt-2">
                    <span>Balance: {fmtUsd(balance)} USDT</span>
                    <button onClick={onDeposit} className="text-[#F0B90B] hover:underline">Deposit</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* My positions on this market */}
        {myBets.length > 0 && (
          <div className="px-5 pb-5">
            <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-wider mb-2">Your positions</div>
            <div className="space-y-2">
              {myBets.map((b) => (
                <BetRow key={b.id} b={b} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── My Bets ─────────────────────────────────────────────────────────── */

function MyBets({ user, markets, onOpen }: { user: any; markets: Market[]; onOpen: (m: Market) => void }) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeader();
      const res = await fetch('/api/predictions/my-bets', { headers, cache: 'no-store' });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setBets(Array.isArray(json.bets) ? json.bets : []);
    } catch {
      setError('Could not load your bets.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return <div className="text-center py-20 text-[#848E9C]">Log in to view your bets.</div>;
  }
  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#F0B90B]" /></div>;
  }
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[#F6465D] mb-3">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-[#2B3139] hover:bg-[#3a424d] rounded-lg text-sm transition-colors">Retry</button>
      </div>
    );
  }
  if (bets.length === 0) {
    return <div className="text-center py-20 text-[#848E9C]">You haven't placed any bets yet.</div>;
  }

  const open = bets.filter(b => b.status === 'open');
  const settled = bets.filter(b => b.status !== 'open');

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-wider mb-2">Open ({open.length})</div>
          <div className="space-y-2">
            {open.map((b) => (
              <BetRow key={b.id} b={b} onOpen={() => { const mk = markets.find(x => x.id === b.market_id); if (mk) onOpen(mk); }} />
            ))}
          </div>
        </div>
      )}
      {settled.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[#848E9C] uppercase tracking-wider mb-2">Settled ({settled.length})</div>
          <div className="space-y-2">
            {settled.map((b) => <BetRow key={b.id} b={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function BetRow({ b, compact, onOpen }: { b: Bet; compact?: boolean; onOpen?: () => void }) {
  const q = b.pm_markets?.question || 'Market';
  const img = b.pm_markets?.image || null;
  const statusStyle: Record<Bet['status'], string> = {
    open: 'text-[#F0B90B] bg-[#F0B90B]/10',
    won: 'text-[#0ECB81] bg-[#0ECB81]/10',
    lost: 'text-[#F6465D] bg-[#F6465D]/10',
    refunded: 'text-[#848E9C] bg-[#848E9C]/10',
  };
  const StatusIcon = b.status === 'won' ? Trophy : b.status === 'lost' ? XCircle : b.status === 'refunded' ? RefreshCw : Clock;
  return (
    <div
      className={`flex items-center gap-3 bg-[#181A20] border border-[#2B3139] rounded-xl p-3 ${onOpen ? 'cursor-pointer hover:border-[#F0B90B] transition-colors' : ''}`}
      onClick={onOpen}
    >
      {img ? (
        <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover bg-[#2B3139] shrink-0" onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }} />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-[#2B3139] flex items-center justify-center text-[#5E6673] shrink-0"><TrendingUp className="w-5 h-5" /></div>
      )}
      <div className="min-w-0 flex-1">
        {!compact && <div className="text-sm font-medium line-clamp-1">{q}</div>}
        <div className="flex items-center gap-2 text-xs text-[#848E9C] mt-0.5">
          <span className={`font-semibold ${b.outcome === 'Yes' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{b.outcome}</span>
          <span>·</span>
          <span>{fmtUsd(num(b.amount))} USDT</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${statusStyle[b.status]}`}>
          <StatusIcon className="w-3 h-3" /> {b.status}
        </span>
        {b.status !== 'open' && (
          <div className={`text-xs mt-1 font-semibold ${b.payout > 0 ? 'text-[#0ECB81]' : 'text-[#848E9C]'}`}>
            {b.payout > 0 ? `+${fmtUsd(num(b.payout))}` : '—'}
          </div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, TrendingUp, TrendingDown, Clock, ArrowLeft, Loader2, CheckCircle2, XCircle,
  Wallet, Flame, ListChecks, RefreshCw, Trophy, Ban, Zap, BarChart3, Radio,
  Globe, Landmark, Coins, Bitcoin, Newspaper, Cpu, Vote, Users, ChevronRight, ChevronLeft, Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BtcUpDownCard from '../components/BtcUpDownCard';

/* ────────────────────────────────────────────────────────────────────────
   Basonce Markets — Polymarket-style prediction market (desktop web only).
   Real Polymarket markets (synced server-side via Gamma API). Parimutuel
   pool betting with real USDT: stake goes into the Yes/No pool, and when the
   real Polymarket market resolves the winning pool splits the losing pool
   (minus a small fee). Basonce bears no risk. All money flows through the
   service-role pm_* RPCs behind /api/predictions/*.

   Everything shown is REAL: live odds and volume come from Polymarket, price
   charts come from Polymarket's CLOB price history, and the activity tape shows
   real platform bets. Nothing on this page is fabricated.
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

type ActBet = {
  id: string;
  market_id?: string;
  outcome: 'Yes' | 'No';
  amount: number;
  created_at: string;
  pm_markets?: { question: string; image: string | null; category: string | null } | null;
};

type Point = { t: number; p: number };

const FEE_RATE = 0.02; // 2% house fee on the losing pool (matches pm_settle_market)

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (n: number) => {
  const v = num(n);
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
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

const fmtAgo = (iso: string) => {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return '';
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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

/* ── Animated number (count-up on change) ────────────────────────────── */

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (from === to) { setVal(to); return; }
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const k = Math.min(1, (ts - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setVal(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ── Small presentational pieces ─────────────────────────────────────── */

function OddsBar({ p }: { p: number }) {
  const yes = Math.round(Math.max(0, Math.min(1, p)) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#0ECB81] text-xs font-semibold w-9">{yes}%</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#F6465D]/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0ECB81] transition-[width] duration-700 ease-out"
          style={{ width: `${yes}%` }}
        />
      </div>
      <span className="text-[#F6465D] text-xs font-semibold w-9 text-right">{100 - yes}%</span>
    </div>
  );
}

function Sparkline({ points, height = 38 }: { points: number[]; height?: number }) {
  const gid = useMemo(() => 'spk' + Math.random().toString(36).slice(2), []);
  if (!points || points.length < 2) return <div style={{ height }} />;
  const w = 100;
  const h = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - ((p - min) / span) * (h - 4) - 2]);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const up = points[points.length - 1] >= points[0];
  const color = up ? '#0ECB81' : '#F6465D';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
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

/** Map a real category name to an icon so the nav reads like Polymarket's. */
function categoryIcon(name: string): React.ReactNode {
  const k = name.toLowerCase();
  if (k === 'all') return <LayoutGrid className="w-3.5 h-3.5" />;
  if (k.includes('sport') || k.includes('soccer') || k.includes('football') || k.includes('nba') || k.includes('nfl')) return <Trophy className="w-3.5 h-3.5" />;
  if (k.includes('crypto') || k.includes('bitcoin') || k.includes('btc') || k.includes('eth')) return <Bitcoin className="w-3.5 h-3.5" />;
  if (k.includes('politic') || k.includes('election')) return <Vote className="w-3.5 h-3.5" />;
  if (k.includes('econ') || k.includes('finance') || k.includes('fed') || k.includes('rate')) return <Landmark className="w-3.5 h-3.5" />;
  if (k.includes('geo') || k.includes('world') || k.includes('war')) return <Globe className="w-3.5 h-3.5" />;
  if (k.includes('tech') || k.includes('ai')) return <Cpu className="w-3.5 h-3.5" />;
  if (k.includes('culture') || k.includes('pop') || k.includes('celeb')) return <Users className="w-3.5 h-3.5" />;
  if (k.includes('news') || k.includes('mention')) return <Newspaper className="w-3.5 h-3.5" />;
  if (k.includes('earn') || k.includes('business')) return <Coins className="w-3.5 h-3.5" />;
  if (k.includes('trend') || k.includes('new')) return <Flame className="w-3.5 h-3.5" />;
  return <BarChart3 className="w-3.5 h-3.5" />;
}

/* ── Live odds tape (top, auto-scrolling) ────────────────────────────── */

function OddsTape({ markets, onOpen }: { markets: Market[]; onOpen: (m: Market) => void }) {
  const items = useMemo(
    () => [...markets].sort((a, b) => num(b.volume) - num(a.volume)).slice(0, 24),
    [markets],
  );
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  const duration = Math.max(40, items.length * 5);
  return (
    <div className="relative overflow-hidden border-y border-[#2B3139] bg-[#0B0E11]/80">
      <div
        className="basonce-marquee flex items-center gap-6 py-1.5 w-max"
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((m, i) => {
          const p = yesProb(m);
          const up = p >= 0.5;
          return (
            <button
              key={`${m.id}-${i}`}
              onClick={() => onOpen(m)}
              className="flex items-center gap-2 shrink-0 text-xs hover:opacity-80 transition-opacity"
            >
              <span className="text-[#848E9C] max-w-[200px] truncate">{m.question}</span>
              <span className={`font-semibold tabular-nums ${up ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {up ? <TrendingUp className="inline w-3 h-3 mb-0.5" /> : <TrendingDown className="inline w-3 h-3 mb-0.5" />} {pct(p)}
              </span>
              <span className="text-[#5E6673]">{fmtCompact(num(m.volume))}</span>
              <span className="text-[#2B3139]">•</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Live activity tape (bottom, sticky, real bets + market quotes) ───── */

function ActivityTape({ markets, onOpen }: { markets: Market[]; onOpen: (m: Market) => void }) {
  const [bets, setBets] = useState<ActBet[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch('/api/predictions/activity', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { bets: [] }))
        .then((j) => { if (alive) setBets(Array.isArray(j.bets) ? j.bets : []); })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 12000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const quotes = useMemo(
    () => [...markets].sort((a, b) => num(b.volume) - num(a.volume)).slice(0, 20),
    [markets],
  );

  type Item =
    | { kind: 'bet'; key: string; bet: ActBet }
    | { kind: 'quote'; key: string; m: Market };

  const items: Item[] = useMemo(() => {
    const b: Item[] = bets
      .filter((x) => x.pm_markets?.question)
      .map((x) => ({ kind: 'bet', key: 'b' + x.id, bet: x }));
    const qz: Item[] = quotes.map((m) => ({ kind: 'quote', key: 'q' + m.id, m }));
    // Interleave real bets through the market-quote tape so the strip always has
    // motion, while keeping bets and live quotes clearly distinct.
    const out: Item[] = [];
    let bi = 0;
    for (let i = 0; i < qz.length; i++) {
      if (bi < b.length && i % 2 === 1) out.push(b[bi++]);
      out.push(qz[i]);
    }
    while (bi < b.length) out.push(b[bi++]);
    return out;
  }, [bets, quotes]);

  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  const duration = Math.max(45, items.length * 6);

  return (
    <div className="sticky bottom-0 z-30 -mx-6 mt-10 border-t border-[#2B3139] bg-[#0B0E11]/95 backdrop-blur-md">
      <div className="flex items-stretch">
        <div className="flex items-center gap-2 px-4 shrink-0 border-r border-[#2B3139] bg-[#181A20]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F6465D] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F6465D]" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#EAECEF]">Live Tape</span>
        </div>
        <div className="relative overflow-hidden flex-1">
          <div
            className="basonce-marquee flex items-center gap-5 py-2.5 w-max"
            style={{ animationDuration: `${duration}s` }}
          >
            {doubled.map((it, i) =>
              it.kind === 'bet' ? (
                <span key={`${it.key}-${i}`} className="flex items-center gap-2 shrink-0 text-xs">
                  <span className={`flex items-center justify-center w-4 h-4 rounded ${it.bet.outcome === 'Yes' ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'}`}>
                    <Zap className="w-2.5 h-2.5" />
                  </span>
                  <span className={`font-semibold ${it.bet.outcome === 'Yes' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {it.bet.outcome}
                  </span>
                  <span className="font-semibold tabular-nums text-[#EAECEF]">{fmtUsd(num(it.bet.amount))} USDT</span>
                  <span className="text-[#848E9C] max-w-[180px] truncate">{it.bet.pm_markets?.question}</span>
                  <span className="text-[#5E6673]">{fmtAgo(it.bet.created_at)}</span>
                  <span className="text-[#2B3139]">•</span>
                </span>
              ) : (
                <button
                  key={`${it.key}-${i}`}
                  onClick={() => onOpen(it.m)}
                  className="flex items-center gap-2 shrink-0 text-xs hover:opacity-80 transition-opacity"
                >
                  <BarChart3 className="w-3 h-3 text-[#F0B90B]" />
                  <span className="text-[#848E9C] max-w-[180px] truncate">{it.m.question}</span>
                  <span className="font-semibold tabular-nums text-[#0ECB81]">Yes {pct(yesProb(it.m))}</span>
                  <span className="text-[#5E6673]">{fmtCompact(num(it.m.volume))} Vol</span>
                  <span className="text-[#2B3139]">•</span>
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Trending rail (hot markets by real volume) ──────────────────────── */

function TrendingRail({ markets, onOpen }: { markets: Market[]; onOpen: (m: Market) => void }) {
  const top = useMemo(
    () => [...markets].sort((a, b) => num(b.volume) - num(a.volume)).slice(0, 7),
    [markets],
  );
  if (top.length === 0) return null;
  return (
    <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B3139]">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Flame className="w-4 h-4 text-[#F0B90B]" /> Hot Markets
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-[#5E6673]">by 24h volume</span>
      </div>
      <div className="divide-y divide-[#2B3139]">
        {top.map((m, i) => {
          const p = yesProb(m);
          const up = p >= 0.5;
          return (
            <button
              key={m.id}
              onClick={() => onOpen(m)}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[#1E2329] transition-colors"
            >
              <span className="text-xs font-bold text-[#5E6673] w-4 tabular-nums">{i + 1}</span>
              <MarketThumb m={m} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium line-clamp-1">{m.question}</div>
                <div className="text-[11px] text-[#5E6673]">{fmtCompact(num(m.volume))} Vol</div>
              </div>
              <span className={`text-xs font-semibold tabular-nums shrink-0 ${up ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {pct(p)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Stats bar ───────────────────────────────────────────────────────── */

function StatInline({ label, value, dot, className }: { label: string; value: string; dot?: string; className?: string }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      <span className="text-[11px] uppercase tracking-wider text-[#5E6673]">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${className || 'text-[#EAECEF]'}`}>{value}</span>
    </div>
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
  const [selectedSide, setSelectedSide] = useState<'Yes' | 'No'>('Yes');
  const [balance, setBalance] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [, setTick] = useState(0);

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

  const loadMarkets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
      setUpdatedAt(new Date());
    } catch (e: any) {
      if (!silent) { setError('Could not load markets. Please try again.'); setMarkets([]); }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [category, query]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  // Debounced reload on category/search change.
  useEffect(() => {
    const t = setTimeout(() => { loadMarkets(); }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadMarkets, query]);

  // Live auto-refresh: silently pull fresh odds/volume every 15s so the page
  // keeps moving with the real markets (no spinner, smooth transitions).
  useEffect(() => {
    const t = setInterval(() => { loadMarkets(true); setTick((x) => x + 1); }, 15000);
    return () => clearInterval(t);
  }, [loadMarkets]);

  // "Updated Ns ago" relabels every second.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

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

  const totalVolume = useMemo(() => markets.reduce((s, m) => s + num(m.volume), 0), [markets]);
  const volCount = useCountUp(totalVolume);
  const liveCount = useCountUp(markets.length);
  const catCount = useCountUp(categories.length);
  const agoSecs = Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 1000));

  const onBetPlaced = useCallback(() => {
    loadBalance();
    loadMarkets(true);
  }, [loadBalance, loadMarkets]);

  // Open the detail modal, optionally pre-selecting the Yes/No side the user
  // clicked on a card (Polymarket-style one-click "Buy Yes / Buy No").
  const openMarket = useCallback((m: Market, sideToBuy: 'Yes' | 'No' = 'Yes') => {
    setSelectedSide(sideToBuy);
    setSelected(m);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 text-[#EAECEF]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes basonce-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .basonce-marquee { animation-name: basonce-marquee; animation-timing-function: linear; animation-iteration-count: infinite; }
        .basonce-marquee:hover { animation-play-state: paused; }
        @keyframes basonce-fadeup { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        .basonce-fadeup { animation: basonce-fadeup 0.4s ease-out both; }
        @keyframes basonce-draw { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
      ` }} />

      {/* Header — compact, Binance-style bar */}
      <div className="relative overflow-hidden rounded-xl border border-[#2B3139] bg-gradient-to-r from-[#1E2329] to-[#0B0E11] px-4 py-3 mb-4">
        <div className="absolute -top-10 -right-6 w-32 h-32 rounded-full bg-[#F0B90B]/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-x-4 gap-y-2 flex-wrap">
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <h1 className="flex items-center gap-2 text-base font-bold whitespace-nowrap">
              <span className="w-6 h-6 rounded-md bg-[#F0B90B] text-black flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
              Basonce Markets
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F6465D]/15 text-[#F6465D] text-[10px] font-bold uppercase tracking-wider">
                <Radio className="w-2.5 h-2.5" /> Live
              </span>
            </h1>

            <div className="hidden md:block h-5 w-px bg-[#2B3139]" />

            <div className="flex items-center gap-x-5 gap-y-1.5 flex-wrap">
              <StatInline label="Volume" value={fmtCompact(volCount)} dot="bg-[#0ECB81]" className="text-[#0ECB81]" />
              <StatInline label="Live" value={Math.round(liveCount).toLocaleString()} dot="bg-[#F0B90B]" className="text-[#F0B90B]" />
              <StatInline label="Categories" value={Math.round(catCount).toLocaleString()} dot="bg-[#3B82F6]" className="text-[#3B82F6]" />
              <StatInline
                label="Updated"
                value={agoSecs < 2 ? 'just now' : `${agoSecs}s ago`}
                dot={`bg-[#F6465D] ${loading ? 'animate-pulse' : ''}`}
                className="text-[#848E9C]"
              />
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-1.5">
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

      {/* Live odds tape */}
      {markets.length > 0 && view === 'browse' && (
        <div className="mb-3 rounded-lg overflow-hidden border border-[#2B3139]">
          <OddsTape markets={markets} onOpen={openMarket} />
        </div>
      )}

      {/* Tabs + search — single compact bar */}
      <div className="flex items-center justify-between gap-3 mb-4 border-b border-[#2B3139] flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('browse')}
            className={`px-3.5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              view === 'browse' ? 'border-[#F0B90B] text-[#F0B90B]' : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <Flame className="w-4 h-4" /> Markets
          </button>
          <button
            onClick={() => { if (!user) { onAuth('login'); return; } setView('mybets'); }}
            className={`px-3.5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              view === 'mybets' ? 'border-[#F0B90B] text-[#F0B90B]' : 'border-transparent text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            <ListChecks className="w-4 h-4" /> My Bets
          </button>
        </div>
        {view === 'browse' && (
          <div className="flex items-center gap-2 pb-1.5">
            <div className="flex items-center gap-2 bg-[#181A20] border border-[#2B3139] rounded-lg px-3 py-1.5 w-56 max-w-full focus-within:border-[#F0B90B]/50 transition-colors">
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
              className="flex items-center justify-center w-9 h-9 rounded-lg text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#181A20] border border-[#2B3139] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {view === 'mybets' ? (
        <MyBets user={user} onOpen={(m) => { setView('browse'); openMarket(m, 'Yes'); }} markets={markets} />
      ) : (
        <>
          {/* Categories */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
            {['All', ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  category === c
                    ? 'bg-[#F0B90B] text-black'
                    : 'bg-[#181A20] border border-[#2B3139] text-[#848E9C] hover:text-[#EAECEF] hover:border-[#3a424d]'
                }`}
              >
                {categoryIcon(c)}
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
              <button onClick={() => loadMarkets()} className="px-4 py-2 bg-[#2B3139] hover:bg-[#3a424d] rounded-lg text-sm transition-colors">Retry</button>
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-20 text-[#848E9C]">No markets found.</div>
          ) : (
            <>
              {showHero && (
                <div className="mb-5">
                  <BtcUpDownCard
                    user={user}
                    balance={balance}
                    onAuth={onAuth}
                    onDeposit={onDeposit}
                    onBetPlaced={onBetPlaced}
                  />
                </div>
              )}

              {showHero && featured.length > 0 && (
                <div className="mb-8 space-y-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[#848E9C] uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-[#F0B90B]" /> Featured
                  </h2>
                  <HeroCarousel featured={featured} onOpen={openMarket} />
                </div>
              )}

              <div className="flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {grid.map((m) => (
                      <MarketCard key={m.id} m={m} onOpen={(side) => openMarket(m, side)} />
                    ))}
                  </div>
                </div>
                <aside className="hidden xl:block w-80 shrink-0 space-y-4 sticky top-4">
                  <TrendingRail markets={markets} onOpen={openMarket} />
                  <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold mb-3">
                      <Zap className="w-4 h-4 text-[#F0B90B]" /> How it works
                    </h3>
                    <ol className="space-y-2.5 text-xs text-[#848E9C]">
                      <li className="flex gap-2"><span className="text-[#F0B90B] font-bold">1.</span> Pick a real Polymarket event and a side — Yes or No.</li>
                      <li className="flex gap-2"><span className="text-[#F0B90B] font-bold">2.</span> Your USDT joins the shared pool for that side.</li>
                      <li className="flex gap-2"><span className="text-[#F0B90B] font-bold">3.</span> When Polymarket resolves, winners split the losing pool (minus a {Math.round(FEE_RATE * 100)}% fee), pro-rata to their stake.</li>
                      <li className="flex gap-2"><span className="text-[#F0B90B] font-bold">4.</span> Payouts are automatic — no claim needed.</li>
                    </ol>
                  </div>
                </aside>
              </div>
            </>
          )}
        </>
      )}

      {/* Live activity tape (sticky bottom) */}
      {markets.length > 0 && view === 'browse' && (
        <ActivityTape markets={markets} onOpen={openMarket} />
      )}

      {selected && (
        <MarketDetail
          market={selected}
          initialSide={selectedSide}
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

function useHistory(marketId: string, interval: '1h' | '6h' | '1d' | '1w' | 'max', enabled: boolean) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/predictions/history/${marketId}?interval=${interval}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { points: [] }))
      .then((j) => { if (alive) { setPoints(Array.isArray(j.points) ? j.points : []); setLoading(false); } })
      .catch(() => { if (alive) { setPoints([]); setLoading(false); } });
    return () => { alive = false; };
  }, [marketId, interval, enabled]);
  return { points, loading };
}

/** Polymarket-style one-click buy buttons shown on every card. */
function BuyButtons({ p, onPick, size = 'md' }: { p: number; onPick: (side: 'Yes' | 'No') => void; size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm';
  return (
    <div className="grid grid-cols-2 gap-2 mt-1">
      <button
        onClick={(e) => { e.stopPropagation(); onPick('Yes'); }}
        className={`group/yes rounded-lg bg-[#0ECB81]/10 hover:bg-[#0ECB81] text-[#0ECB81] hover:text-black text-center font-bold transition-colors ${pad}`}
      >
        <span className="group-hover/yes:hidden">Yes {pct(p)}</span>
        <span className="hidden group-hover/yes:inline">Buy Yes</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onPick('No'); }}
        className={`group/no rounded-lg bg-[#F6465D]/10 hover:bg-[#F6465D] text-[#F6465D] hover:text-white text-center font-bold transition-colors ${pad}`}
      >
        <span className="group-hover/no:hidden">No {pct(1 - p)}</span>
        <span className="hidden group-hover/no:inline">Buy No</span>
      </button>
    </div>
  );
}

/* ── Hero carousel: auto-cycling featured markets + live bets feed ────── */

function HeroCarousel({
  featured,
  onOpen,
}: {
  featured: Market[];
  onOpen: (m: Market, side?: 'Yes' | 'No') => void;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = featured.length;

  useEffect(() => { if (idx >= n) setIdx(0); }, [n, idx]);
  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, paused]);

  if (n === 0) return null;
  const current = featured[Math.min(idx, n - 1)];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
        <HeroMarket key={current.id} m={current} onOpen={(side) => onOpen(current, side)} />
        {n > 1 && (
          <>
            <button
              onClick={() => setIdx((i) => (i - 1 + n) % n)}
              aria-label="Previous featured market"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#0B0E11]/80 border border-[#2B3139] text-[#EAECEF] flex items-center justify-center hover:bg-[#1E2329] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % n)}
              aria-label="Next featured market"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-[#0B0E11]/80 border border-[#2B3139] text-[#EAECEF] flex items-center justify-center hover:bg-[#1E2329] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-2 mt-3">
              {featured.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setIdx(i)}
                  aria-label={`Show featured market ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-7 bg-[#F0B90B]' : 'w-2.5 bg-[#2B3139] hover:bg-[#3a424d]'}`}
                />
              ))}
            </div>
          </>
        )}
    </div>
  );
}

/** Large Polymarket-style hero market: big live chart + buy panel + stats. */
function HeroMarket({ m, onOpen }: { m: Market; onOpen: (side?: 'Yes' | 'No') => void }) {
  const p = yesProb(m);
  const pool = num(m.yes_pool) + num(m.no_pool);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-5 bg-gradient-to-br from-[#1E2329] to-[#0B0E11] border border-[#2B3139] rounded-2xl p-5 basonce-fadeup">
      <div className="min-w-0">
        <div className="flex items-start gap-3 mb-3">
          <MarketThumb m={m} size={56} />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F0B90B] uppercase tracking-wider">
              {categoryIcon(m.category || 'Trending')} {m.category || 'Trending'} · Featured
            </span>
            <h2 className="text-xl font-bold leading-snug mt-1 line-clamp-2">{m.question}</h2>
          </div>
        </div>
        <PriceChart marketId={m.id} currentYes={p} />
      </div>
      <div className="flex flex-col justify-between gap-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3">
            <div className="text-[11px] text-[#848E9C] uppercase tracking-wider">Yes</div>
            <div className="text-3xl font-bold text-[#0ECB81] tabular-nums leading-none mt-1">{pct(p)}</div>
          </div>
          <div className="rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3">
            <div className="text-[11px] text-[#848E9C] uppercase tracking-wider">No</div>
            <div className="text-3xl font-bold text-[#F6465D] tabular-nums leading-none mt-1">{pct(1 - p)}</div>
          </div>
        </div>
        <BuyButtons p={p} onPick={(side) => onOpen(side)} />
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-[#0B0E11] border border-[#2B3139] py-2"><div className="text-[#848E9C]">Volume</div><div className="font-semibold mt-0.5">{fmtCompact(num(m.volume))}</div></div>
          <div className="rounded-lg bg-[#0B0E11] border border-[#2B3139] py-2"><div className="text-[#848E9C]">Pool</div><div className="font-semibold mt-0.5">{pool > 0 ? fmtCompact(pool) : '—'}</div></div>
          <div className="rounded-lg bg-[#0B0E11] border border-[#2B3139] py-2"><div className="text-[#848E9C]">Ends</div><div className="font-semibold mt-0.5">{fmtEnd(m.end_date)}</div></div>
        </div>
        <button
          onClick={() => onOpen()}
          className="w-full py-2.5 rounded-lg bg-[#F0B90B] text-black font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
        >
          View market <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function MarketCard({ m, onOpen }: { m: Market; onOpen: (side?: 'Yes' | 'No') => void }) {
  const p = yesProb(m);
  const pool = num(m.yes_pool) + num(m.no_pool);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen()}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="cursor-pointer text-left bg-[#181A20] border border-[#2B3139] hover:border-[#F0B90B] rounded-xl p-4 transition-all hover:-translate-y-0.5 flex flex-col gap-3 h-full"
    >
      <div className="flex items-start gap-3">
        <MarketThumb m={m} size={44} />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-[#848E9C] uppercase tracking-wider">{m.category || 'Trending'}</span>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 mt-0.5">{m.question}</h3>
        </div>
      </div>
      <OddsBar p={p} />
      <BuyButtons p={p} onPick={(side) => onOpen(side)} />
      <div className="flex items-center justify-between text-xs text-[#848E9C] mt-auto pt-1">
        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {fmtCompact(num(m.volume))} Vol</span>
        {pool > 0 && <span>Pool {fmtCompact(pool)}</span>}
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtEnd(m.end_date)}</span>
      </div>
    </div>
  );
}

/* ── Price chart (detail) ────────────────────────────────────────────── */

function PriceChart({ marketId, currentYes }: { marketId: string; currentYes: number }) {
  const [range, setRange] = useState<'1h' | '6h' | '1d' | '1w' | 'max'>('1w');
  const { points, loading } = useHistory(marketId, range, true);
  const gid = useMemo(() => 'pc' + Math.random().toString(36).slice(2), []);
  const pathRef = useRef<SVGPathElement>(null);

  const W = 620;
  const H = 200;
  const PAD = 6;

  const geom = useMemo(() => {
    const pts = points || [];
    if (pts.length < 2) return null;
    const ys = pts.map((p) => p.p);
    const min = Math.min(...ys, 0);
    const max = Math.max(...ys, 1);
    const xspan = pts.length - 1;
    const toX = (i: number) => (i / xspan) * (W - PAD * 2) + PAD;
    const toY = (p: number) => H - PAD - ((p - min) / (max - min || 1)) * (H - PAD * 2);
    const coords = pts.map((p, i) => [toX(i), toY(p.p)] as [number, number]);
    const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const area = `${line} L ${coords[coords.length - 1][0].toFixed(2)} ${H - PAD} L ${PAD} ${H - PAD} Z`;
    const up = pts[pts.length - 1].p >= pts[0].p;
    const last = coords[coords.length - 1];
    return { line, area, up, last };
  }, [points]);

  useEffect(() => {
    const el = pathRef.current;
    if (!el || !geom) return;
    const len = el.getTotalLength();
    el.style.setProperty('--len', String(len));
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.style.animation = 'basonce-draw 0.9s ease-out forwards';
  }, [geom]);

  const color = geom?.up ? '#0ECB81' : '#F6465D';

  return (
    <div className="rounded-xl bg-[#0B0E11] border border-[#2B3139] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#848E9C]">Yes price</span>
          <span className="text-lg font-bold tabular-nums" style={{ color }}>{pct(currentYes)}</span>
        </div>
        <div className="flex items-center gap-1">
          {(['1h', '6h', '1d', '1w', 'max'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                range === r ? 'bg-[#2B3139] text-[#EAECEF]' : 'text-[#5E6673] hover:text-[#EAECEF]'
              }`}
            >
              {r === '1h' ? '1H' : r === '6h' ? '6H' : r === '1d' ? '1D' : r === '1w' ? '1W' : 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="relative" style={{ height: H }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-[#5E6673]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && !geom && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[#5E6673]">
            Price history unavailable for this market.
          </div>
        )}
        {geom && (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1={PAD} x2={W - PAD} y1={H * g} y2={H * g} stroke="#2B3139" strokeWidth="1" strokeDasharray="3 4" />
            ))}
            <path d={geom.area} fill={`url(#${gid})`} />
            <path ref={pathRef} d={geom.line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={geom.last[0]} cy={geom.last[1]} r="3.5" fill={color} />
            <circle cx={geom.last[0]} cy={geom.last[1]} r="3.5" fill={color} opacity="0.5">
              <animate attributeName="r" from="3.5" to="9" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="1.4s" repeatCount="indefinite" />
            </circle>
          </svg>
        )}
      </div>
    </div>
  );
}

/* ── Detail + bet panel ──────────────────────────────────────────────── */

function MarketDetail({
  market, initialSide, user, balance, onAuth, onDeposit, onClose, onBetPlaced,
}: {
  market: Market;
  initialSide?: 'Yes' | 'No';
  user: any;
  balance: number | null;
  onAuth: (mode: 'login' | 'register') => void;
  onDeposit: () => void;
  onClose: () => void;
  onBetPlaced: () => void;
}) {
  const [m, setM] = useState<Market>(market);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [side, setSide] = useState<'Yes' | 'No'>(initialSide ?? 'Yes');
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

  // Keep the open market detail live too.
  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

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

        {/* Live price chart */}
        <div className="px-5 pt-5">
          <PriceChart marketId={m.id} currentYes={p} />
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

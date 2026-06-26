import { useEffect, useMemo, useRef, useState } from 'react';
import { Bitcoin, ArrowUp, ArrowDown, Radio, Clock } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────
   "<Coin> Up or Down · 5m" — a Polymarket-style live card driven entirely by
   REAL public market data (no fabricated numbers, never empty):
     • live price + recent trades stream over a public WebSocket
       (REST polling fallback if the socket is blocked),
     • an animated real price chart (1m / 5m candles + live ticks),
     • the 5-minute round's "price to beat" = the real 5m candle open, so the
       Up/Down status is the genuine move since the round opened,
     • multiple coins (BTC, ETH, SOL, XRP, DOGE), each with its own 5m round.
   ──────────────────────────────────────────────────────────────────────── */

type Trade = { id: number; side: 'buy' | 'sell'; price: number; size: number; time: number };
type Pt = { t: number; p: number };
type RangeKey = '5M' | '15M' | '1H' | '1D';

const ROUND_MS = 5 * 60 * 1000;
const WS_URL = 'wss://ws-feed.exchange.coinbase.com';
const BASE = 'https://api.exchange.coinbase.com';

const COINS = [
  { id: 'BTC', name: 'Bitcoin', sym: 'BTC', product: 'BTC-USD', color: '#F7931A' },
  { id: 'ETH', name: 'Ethereum', sym: 'ETH', product: 'ETH-USD', color: '#627EEA' },
  { id: 'SOL', name: 'Solana', sym: 'SOL', product: 'SOL-USD', color: '#14F195' },
  { id: 'XRP', name: 'XRP', sym: 'XRP', product: 'XRP-USD', color: '#00A5DF' },
  { id: 'DOGE', name: 'Dogecoin', sym: 'DOGE', product: 'DOGE-USD', color: '#C2A633' },
] as const;
type Coin = (typeof COINS)[number];

const PRODUCT_TO_ID: Record<string, string> = Object.fromEntries(COINS.map((c) => [c.product, c.id]));

const RANGES: Record<RangeKey, { ms: number; gran: number }> = {
  '5M': { ms: 5 * 60_000, gran: 60 },
  '15M': { ms: 15 * 60_000, gran: 60 },
  '1H': { ms: 60 * 60_000, gran: 60 },
  '1D': { ms: 24 * 60 * 60_000, gran: 300 },
};

const dec = (p: number) => (p >= 1000 ? 2 : p >= 1 ? 2 : p >= 0.1 ? 4 : 5);
const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dec(n), maximumFractionDigits: dec(n) });
const fmtSize = (n: number) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n >= 1 ? n.toFixed(2) : n.toFixed(4);
const fmtTime = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds(),
  ).padStart(2, '0')}`;
};

function CoinBadge({ coin, size = 32 }: { coin: Coin; size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: `${coin.color}22`,
        color: coin.color,
        fontSize: size * 0.34,
      }}
    >
      {coin.id === 'BTC' ? <Bitcoin style={{ width: size * 0.6, height: size * 0.6 }} /> : coin.sym.slice(0, 1)}
    </span>
  );
}

function PriceChart({ pts, open, color }: { pts: Pt[]; open: number | null; color: string }) {
  const W = 640;
  const H = 220;
  const path = useMemo(() => {
    if (pts.length < 2) return null;
    const xs = pts.map((p) => p.t);
    const ys = pts.map((p) => p.p);
    let minT = Math.min(...xs);
    let maxT = Math.max(...xs);
    let minP = Math.min(...ys);
    let maxP = Math.max(...ys);
    if (open != null) {
      minP = Math.min(minP, open);
      maxP = Math.max(maxP, open);
    }
    const padP = (maxP - minP) * 0.14 || Math.max(maxP * 0.0008, 0.0001);
    minP -= padP;
    maxP += padP;
    const X = (t: number) => ((t - minT) / (maxT - minT || 1)) * W;
    const Y = (p: number) => H - ((p - minP) / (maxP - minP || 1)) * H;
    let line = `M ${X(pts[0].t).toFixed(2)} ${Y(pts[0].p).toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) line += ` L ${X(pts[i].t).toFixed(2)} ${Y(pts[i].p).toFixed(2)}`;
    const area = `${line} L ${X(pts[pts.length - 1].t).toFixed(2)} ${H} L ${X(pts[0].t).toFixed(2)} ${H} Z`;
    const last = pts[pts.length - 1];
    return {
      line,
      area,
      lastX: X(last.t),
      lastY: Y(last.p),
      beatY: open != null ? Y(open) : null,
      maxP,
      minP,
    };
  }, [pts, open]);

  if (!path) {
    return (
      <div className="flex items-center justify-center h-[220px] text-xs text-[#5E6673]">
        Loading live chart…
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[220px]">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {path.beatY != null && (
          <line
            x1="0"
            y1={path.beatY}
            x2={W}
            y2={path.beatY}
            stroke="#5E6673"
            strokeWidth="1"
            strokeDasharray="5 5"
            opacity="0.6"
          />
        )}
        <path d={path.area} fill="url(#chartFill)" />
        <path
          d={path.line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={path.lastX} cy={path.lastY} r="4" fill={color} />
        <circle cx={path.lastX} cy={path.lastY} r="4" fill={color} opacity="0.4">
          <animate attributeName="r" from="4" to="12" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.4" to="0" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="pointer-events-none absolute top-1 right-1 text-[10px] tabular-nums text-[#5E6673]">
        ${fmtUsd(path.maxP)}
      </div>
      <div className="pointer-events-none absolute bottom-1 right-1 text-[10px] tabular-nums text-[#5E6673]">
        ${fmtUsd(path.minP)}
      </div>
    </div>
  );
}

export default function BtcUpDownCard() {
  const [sel, setSel] = useState<string>('BTC');
  const [range, setRange] = useState<RangeKey>('5M');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [opens, setOpens] = useState<Record<string, number>>({});
  const [series, setSeries] = useState<Pt[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [now, setNow] = useState(Date.now());
  const [live, setLive] = useState(false);

  const coin = COINS.find((c) => c.id === sel)!;
  const selProduct = coin.product;

  const mountedRef = useRef(true);
  const selProductRef = useRef(selProduct);
  const selIdRef = useRef(sel);
  const pendingPricesRef = useRef<Record<string, number>>({});
  const tradeBufRef = useRef<Trade[]>([]);
  const wsTradesRef = useRef(false);
  const armGuardRef = useRef<() => void>(() => {});

  useEffect(() => {
    selProductRef.current = selProduct;
    selIdRef.current = sel;
  }, [selProduct, sel]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 1s clock for the countdown + timestamps.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const roundEnd = (Math.floor(now / ROUND_MS) + 1) * ROUND_MS;
  const roundKey = Math.floor(now / ROUND_MS);

  // Real round "price to beat" = open of the current 5m candle, for every coin.
  // Reload on mount, every new 5m round, and on a 30s safety interval.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const entries = await Promise.all(
        COINS.map(async (c) => {
          try {
            const rows = await fetch(`${BASE}/products/${c.product}/candles?granularity=300`, {
              cache: 'no-store',
            }).then((r) => r.json());
            if (Array.isArray(rows) && rows.length) return [c.id, Number(rows[0][3])] as const;
          } catch {
            /* keep last known; never fabricate */
          }
          return [c.id, null] as const;
        }),
      );
      if (!alive) return;
      setOpens((prev) => {
        const next = { ...prev };
        for (const [id, o] of entries) if (o != null) next[id] = o;
        return next;
      });
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [roundKey]);

  // Seed the chart from real candles whenever the coin, range, or round changes.
  useEffect(() => {
    let alive = true;
    const seed = async () => {
      const cfg = RANGES[range];
      try {
        const rows = await fetch(`${BASE}/products/${selProduct}/candles?granularity=${cfg.gran}`, {
          cache: 'no-store',
        }).then((r) => r.json());
        if (!alive || !Array.isArray(rows)) return;
        const pts = rows
          .map((r: any[]) => ({ t: Number(r[0]) * 1000, p: Number(r[4]) }))
          .sort((a: Pt, b: Pt) => a.t - b.t);
        setSeries(pts);
      } catch {
        /* keep last series; never fabricate */
      }
    };
    seed();
    return () => {
      alive = false;
    };
  }, [selProduct, range, roundKey]);

  // Reset the trade tape when switching coins and re-arm the never-empty guard.
  useEffect(() => {
    setTrades([]);
    tradeBufRef.current = [];
    armGuardRef.current();
  }, [sel]);

  // Real-time feed: WS for all coins (price) + matches; REST polling fallback.
  useEffect(() => {
    let alive = true;
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const stopPoll = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPoll = () => {
      if (pollTimer) return;
      const poll = async () => {
        try {
          const tks = await Promise.all(
            COINS.map((c) =>
              fetch(`${BASE}/products/${c.product}/ticker`, { cache: 'no-store' })
                .then((r) => r.json())
                .then((d) => [c.id, d] as const)
                .catch(() => [c.id, null] as const),
            ),
          );
          if (!alive) return;
          for (const [cid, d] of tks) if (d?.price) pendingPricesRef.current[cid] = Number(d.price);
          const sp = selProductRef.current;
          const tr = await fetch(`${BASE}/products/${sp}/trades?limit=20`, { cache: 'no-store' })
            .then((r) => r.json())
            .catch(() => null);
          if (!alive) return;
          if (Array.isArray(tr)) {
            for (const t of [...tr].reverse()) {
              tradeBufRef.current.push({
                id: Number(t.trade_id),
                side: t.side === 'buy' ? 'buy' : 'sell',
                price: Number(t.price),
                size: Number(t.size),
                time: new Date(t.time).getTime(),
              });
            }
          }
          setLive(true);
        } catch {
          if (alive) setLive(false);
        }
      };
      poll();
      pollTimer = setInterval(poll, 2500);
    };

    // Flush buffered prices + trades ~4x/s for smooth, performant rendering.
    const flush = setInterval(() => {
      if (!alive) return;
      const pend = pendingPricesRef.current;
      const keys = Object.keys(pend);
      if (keys.length) {
        setPrices((prev) => ({ ...prev, ...pend }));
        setLive(true);
        const sc = selIdRef.current;
        if (pend[sc] != null) {
          const np = pend[sc];
          setSeries((prev) => {
            const tnow = Date.now();
            const last = prev[prev.length - 1];
            if (last && tnow - last.t < 1500) {
              const cp = prev.slice();
              cp[cp.length - 1] = { t: tnow, p: np };
              return cp;
            }
            const next = [...prev, { t: tnow, p: np }];
            return next.length > 2500 ? next.slice(next.length - 2500) : next;
          });
        }
        pendingPricesRef.current = {};
      }
      if (tradeBufRef.current.length) {
        const buf = tradeBufRef.current;
        tradeBufRef.current = [];
        setTrades((prev) => {
          const add = buf.reverse();
          const seen = new Set(prev.map((t) => t.id));
          const fresh = add.filter((t) => !seen.has(t.id));
          if (!fresh.length) return prev;
          return [...fresh, ...prev].slice(0, 40);
        });
      }
    }, 250);

    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        if (!alive || !ws) return;
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            product_ids: COINS.map((c) => c.product),
            channels: ['ticker', 'matches'],
          }),
        );
      };
      ws.onmessage = (ev) => {
        if (!alive) return;
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === 'ticker' && msg.product_id && msg.price) {
          const cid = PRODUCT_TO_ID[msg.product_id];
          if (cid) pendingPricesRef.current[cid] = Number(msg.price);
        } else if ((msg.type === 'match' || msg.type === 'last_match') && msg.product_id && msg.price) {
          const cid = PRODUCT_TO_ID[msg.product_id];
          if (cid) pendingPricesRef.current[cid] = Number(msg.price);
          if (msg.product_id === selProductRef.current) {
            wsTradesRef.current = true;
            tradeBufRef.current.push({
              id: Number(msg.trade_id),
              side: msg.side === 'buy' ? 'buy' : 'sell',
              price: Number(msg.price),
              size: Number(msg.size),
              time: new Date(msg.time).getTime(),
            });
            stopPoll();
          }
        }
      };
      ws.onclose = () => {
        if (alive) {
          setLive(false);
          startPoll();
        }
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {}
      };
    } catch {
      startPoll();
    }

    // Never let the tape stay empty: each time we (re)arm — on mount and on
    // every coin switch — if no real trades stream in for the selected coin
    // within 5s, start REST polling. Polling adapts to the current selection.
    const guardTimers: ReturnType<typeof setTimeout>[] = [];
    const armGuard = () => {
      wsTradesRef.current = false;
      guardTimers.push(
        setTimeout(() => {
          if (alive && !wsTradesRef.current) startPoll();
        }, 5000),
      );
    };
    armGuardRef.current = armGuard;
    armGuard();

    return () => {
      alive = false;
      armGuardRef.current = () => {};
      guardTimers.forEach(clearTimeout);
      clearInterval(flush);
      stopPoll();
      try {
        ws?.close();
      } catch {}
    };
  }, []);

  const price = prices[sel] ?? null;
  const open = opens[sel] ?? null;
  const chg = price != null && open ? (price - open) / open : 0;
  const chgAbs = price != null && open ? price - open : 0;
  const isUp = chg >= 0;

  const winMs = RANGES[range].ms;
  const cutoff = now - winMs;
  const chartPts = useMemo(() => {
    const w = series.filter((p) => p.t >= cutoff);
    return w.length >= 2 ? w : series.slice(-2);
  }, [series, cutoff]);

  // Real buy/sell pressure from the streaming taker sides (volume-weighted).
  const buyVol = trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.size, 0);
  const sellVol = trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.size, 0);
  const totalVol = buyVol + sellVol;
  const buyPct = totalVol > 0 ? Math.round((buyVol / totalVol) * 100) : 50;
  const sellPct = 100 - buyPct;

  const remain = Math.max(0, roundEnd - now);
  const mm = Math.floor(remain / 60000);
  const ss = Math.floor((remain % 60000) / 1000);

  return (
    <div className="rounded-2xl border border-[#2B3139] bg-gradient-to-br from-[#1E2329] to-[#0B0E11] overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes uod-rowin { 0% { opacity: 0; transform: translateY(-6px); } 100% { opacity: 1; transform: translateY(0); } }
        .uod-rowin { animation: uod-rowin 0.35s ease-out both; }
      `,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#2B3139]">
        <CoinBadge coin={coin} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#EAECEF]">{coin.name} Up or Down</h3>
            <span className="px-1.5 py-0.5 rounded bg-[#2B3139] text-[10px] font-bold text-[#848E9C] uppercase tracking-wider">
              5m
            </span>
          </div>
          <span className="text-[11px] text-[#848E9C]">Live · 5-minute rounds</span>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            {live && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ECB81] opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${live ? 'bg-[#0ECB81]' : 'bg-[#5E6673]'}`} />
          </span>
          <span className={live ? 'text-[#0ECB81]' : 'text-[#5E6673]'}>{live ? 'Live' : 'Connecting'}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: price-to-beat / current + chart + range + pressure + countdown */}
        <div className="p-5 lg:border-r border-[#2B3139] flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-6">
              <div>
                <div className="text-[11px] text-[#848E9C] uppercase tracking-wider mb-0.5">Price to Beat</div>
                <div className="text-lg font-bold tabular-nums text-[#848E9C]">
                  {open ? `$${fmtUsd(open)}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: coin.color }}>
                  Current Price
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: coin.color }}>
                    {price == null ? '—' : `$${fmtUsd(price)}`}
                  </span>
                  {price != null && open && (
                    <span className={`flex items-center gap-0.5 text-sm font-bold ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {isUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                      {`$${fmtUsd(Math.abs(chgAbs))} (${(chg * 100).toFixed(2)}%)`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-[10px] text-[#848E9C] uppercase tracking-wider">
                <Clock className="w-3 h-3" /> Round ends in
              </div>
              <div className="flex items-baseline justify-end gap-1.5 mt-0.5 tabular-nums text-[#F6465D]">
                <span className="text-2xl font-bold">{String(mm).padStart(2, '0')}</span>
                <span className="text-[10px] font-semibold">MIN</span>
                <span className="text-2xl font-bold">{String(ss).padStart(2, '0')}</span>
                <span className="text-[10px] font-semibold">SEC</span>
              </div>
            </div>
          </div>

          {/* Animated real price chart */}
          <PriceChart pts={chartPts} open={open} color={coin.color} />

          {/* Range selector */}
          <div className="flex items-center gap-1.5">
            {(Object.keys(RANGES) as RangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  range === r
                    ? 'bg-[#2B3139] text-[#EAECEF]'
                    : 'text-[#848E9C] hover:text-[#EAECEF] hover:bg-[#2B3139]/50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Up / Down pressure */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl border p-3 text-center transition-colors ${isUp ? 'border-[#0ECB81]/40 bg-[#0ECB81]/10' : 'border-[#2B3139] bg-[#0B0E11]'}`}>
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#0ECB81]">
                <ArrowUp className="w-3.5 h-3.5" /> Up
              </div>
              <div className="text-2xl font-bold tabular-nums text-[#0ECB81] mt-1">{buyPct}%</div>
              <div className="text-[10px] text-[#5E6673] mt-0.5">buy pressure</div>
            </div>
            <div className={`rounded-xl border p-3 text-center transition-colors ${!isUp ? 'border-[#F6465D]/40 bg-[#F6465D]/10' : 'border-[#2B3139] bg-[#0B0E11]'}`}>
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#F6465D]">
                <ArrowDown className="w-3.5 h-3.5" /> Down
              </div>
              <div className="text-2xl font-bold tabular-nums text-[#F6465D] mt-1">{sellPct}%</div>
              <div className="text-[10px] text-[#5E6673] mt-0.5">sell pressure</div>
            </div>
          </div>
        </div>

        {/* Right: live trades tape (real, streaming) */}
        <div className="flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2B3139] bg-[#0B0E11]">
            <Radio className="w-3.5 h-3.5 text-[#F0B90B]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#EAECEF]">Live Trades</span>
            <div className="ml-auto flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#5E6673]">
              <span>Price</span>
              <span>Size ({coin.sym})</span>
              <span>Time</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden divide-y divide-[#2B3139]/50">
            {trades.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-[#5E6673]">Connecting to the live trade feed…</div>
            ) : (
              trades.slice(0, 11).map((t) => {
                const buy = t.side === 'buy';
                return (
                  <div key={t.id} className="uod-rowin flex items-center gap-2 px-4 py-2 text-xs">
                    <span className={`flex items-center justify-center w-5 h-5 rounded shrink-0 ${buy ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'}`}>
                      {buy ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                    <span className={`font-semibold tabular-nums w-[92px] ${buy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      ${fmtUsd(t.price)}
                    </span>
                    <span className="tabular-nums text-[#EAECEF] flex-1 text-right">{fmtSize(t.size)}</span>
                    <span className="tabular-nums text-[#5E6673] w-[64px] text-right">{fmtTime(t.time)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Coin selector strip — each coin's real 5m Up/Down move */}
      <div className="border-t border-[#2B3139] bg-[#0B0E11]/60 p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {COINS.map((c) => {
          const cp = prices[c.id] ?? null;
          const co = opens[c.id] ?? null;
          const cc = cp != null && co ? (cp - co) / co : 0;
          const cUp = cc >= 0;
          const active = c.id === sel;
          return (
            <button
              key={c.id}
              onClick={() => setSel(c.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                active ? 'bg-[#1E2329]' : 'border-[#2B3139] bg-[#0B0E11] hover:bg-[#1E2329]/60'
              }`}
              style={active ? { borderColor: c.color } : undefined}
            >
              <CoinBadge coin={c} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[#EAECEF] truncate">{c.name}</div>
                <div className="text-[10px] text-[#5E6673]">Up or Down · 5m</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-bold tabular-nums text-[#EAECEF]">
                  {cp == null ? '—' : `$${fmtUsd(cp)}`}
                </div>
                <div className={`flex items-center justify-end gap-0.5 text-[11px] font-bold tabular-nums ${cUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {cp != null && co ? (
                    <>
                      {cUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {`${(cc * 100).toFixed(2)}%`}
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

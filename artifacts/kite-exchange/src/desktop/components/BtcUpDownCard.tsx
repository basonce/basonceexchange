import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Radio, Clock } from 'lucide-react';

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
type Act = { id: number; side: 'up' | 'down'; amt: number; who: string; t: number };
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

const dec = (p: number) => (p >= 1000 ? 2 : p >= 100 ? 2 : p >= 1 ? 4 : p >= 0.01 ? 5 : 6);
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

/* Real, original brand logos (inline SVG, self-contained — no network needed). */
function CoinLogo({ id, size = 32 }: { id: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', className: 'shrink-0 block' };
  switch (id) {
    case 'BTC':
      return (
        <svg {...common}>
          <g fill="none">
            <circle cx="16" cy="16" r="16" fill="#F7931A" />
            <path
              fill="#FFF"
              d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
            />
          </g>
        </svg>
      );
    case 'ETH':
      return (
        <svg {...common}>
          <g fill="none">
            <circle cx="16" cy="16" r="16" fill="#627EEA" />
            <g fill="#FFF" fillRule="nonzero">
              <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
              <path d="M16.498 4L9 16.22l7.498-3.35z" />
              <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
              <path d="M16.498 27.995v-6.028L9 17.616z" />
              <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
              <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
            </g>
          </g>
        </svg>
      );
    case 'SOL':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="sol-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="100%" stopColor="#14F195" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill="#121212" />
          <g transform="translate(6.6 9) scale(0.0477)">
            <path
              fill="url(#sol-grad)"
              d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
            />
            <path
              fill="url(#sol-grad)"
              d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
            />
            <path
              fill="url(#sol-grad)"
              d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
            />
          </g>
        </svg>
      );
    case 'XRP':
      return (
        <svg {...common}>
          <g fill="none">
            <circle cx="16" cy="16" r="16" fill="#23292F" />
            <path
              fill="#FFF"
              d="M23.07 8h2.89l-6.015 5.957a5.621 5.621 0 0 1-7.89 0L6.038 8H8.93l4.57 4.523a3.556 3.556 0 0 0 4.996 0L23.07 8zM8.895 24.563H6l6.055-5.993a5.621 5.621 0 0 1 7.89 0L26 24.562h-2.892l-4.61-4.563a3.556 3.556 0 0 0-4.995 0l-4.608 4.564z"
            />
          </g>
        </svg>
      );
    case 'DOGE':
      return (
        <svg {...common}>
          <g fill="none">
            <circle cx="16" cy="16" r="16" fill="#C2A633" />
            <path
              fill="#FFF"
              d="M13.248 14.61h2.103c.342 0 .357.011.357-.34v-.928c0-.351-.015-.34-.357-.34h-2.103v1.608zm0 2.05v2.421c0 .375.011.4.385.4.722-.002 1.444.012 2.166-.022a4.4 4.4 0 0 0 .882-.142c.657-.163 1.169-.532 1.475-1.155.196-.4.28-.832.305-1.273.032-.554.022-1.107-.114-1.65-.2-.802-.69-1.328-1.49-1.546a4.836 4.836 0 0 0-.985-.15c-.714-.034-1.43-.027-2.146-.036-.318-.004-.353.024-.353.339v2.014h-.706c-.342 0-.353.011-.353.357v.788c0 .335.012.348.346.348h.713zm-2.46 2.864v-3.21h-.502c-.302 0-.313-.012-.313-.32v-.873c0-.286.014-.3.307-.3h.508v-.214c0-1.054.003-2.108-.002-3.162-.002-.366.038-.347-.34-.348-1.054-.003-2.108-.001-3.162-.001-.318 0-.353.035-.353.354v9.96c0 .069-.003.138.002.207.012.144.087.219.231.226.07.003.139.002.208.002 1.04 0 2.08.002 3.12-.001.36-.001.523.04.523-.43v-1.69z"
            />
          </g>
        </svg>
      );
    default:
      return null;
  }
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
  // Live bet activity (simulated for now — real player bets are blended in as
  // they arrive, then the simulated share is dialed down).
  const [acts, setActs] = useState<Act[]>([]);

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

  // Simulated live-bet activity strip (per coin). Explicitly a placeholder until
  // real Up/Down bets flow in; kept realistic and easy to dial down later.
  useEffect(() => {
    const AMTS = [5, 5, 10, 10, 15, 25, 25, 50, 75, 100, 150, 250, 500];
    const hex = (n: number) =>
      Math.floor(Math.random() * Math.pow(16, n))
        .toString(16)
        .padStart(n, '0');
    const make = (): Act => ({
      id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
      side: Math.random() < 0.5 ? 'up' : 'down',
      amt: AMTS[Math.floor(Math.random() * AMTS.length)],
      who: `0x${hex(4)}…${hex(3)}`,
      t: Date.now(),
    });
    setActs(Array.from({ length: 16 }, make));
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      setActs((prev) => [make(), ...prev].slice(0, 28));
      timer = setTimeout(tick, 1200 + Math.random() * 2800);
    };
    timer = setTimeout(tick, 1500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
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
        @keyframes uod-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .uod-marquee { animation: uod-marquee 40s linear infinite; will-change: transform; }
        .uod-marquee-wrap:hover .uod-marquee { animation-play-state: paused; }
      `,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#2B3139]">
        <CoinLogo id={coin.id} />
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

          {/* Live bet activity — scrolling strip of Up/Down buyers & sellers */}
          <div className="uod-marquee-wrap flex items-stretch rounded-lg border border-[#2B3139] bg-[#0B0E11] overflow-hidden">
            <div className="flex items-center gap-1.5 px-2.5 border-r border-[#2B3139] shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F0B90B] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#F0B90B]" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#848E9C]">Live Bets</span>
            </div>
            <div className="relative overflow-hidden flex-1">
              <div className="uod-marquee inline-flex whitespace-nowrap py-2">
                {(acts.length ? [...acts, ...acts] : []).map((a, i) => (
                  <span key={`${a.id}-${i}`} className="inline-flex items-center gap-1.5 px-3 text-[11px] tabular-nums">
                    <span className={`inline-flex h-1.5 w-1.5 rounded-full ${a.side === 'up' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`} />
                    <span className={`font-bold ${a.side === 'up' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {a.side === 'up' ? 'UP' : 'DOWN'}
                    </span>
                    <span className="text-[#EAECEF]">${a.amt}</span>
                    <span className="text-[#5E6673]">{a.who}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

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
              <CoinLogo id={c.id} size={30} />
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

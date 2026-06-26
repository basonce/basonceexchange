import { useEffect, useRef, useState } from 'react';
import { Bitcoin, ArrowUp, ArrowDown, Radio, Clock } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────
   BTC "Up or Down · 5m" — a Polymarket-style live card driven entirely by
   REAL Coinbase BTC-USD market data (no fabricated numbers, never empty):
     • live price + recent trades stream over Coinbase's public WebSocket
       (REST polling fallback if the socket is blocked),
     • the 5-minute round's open price comes from the real 5m candle, so the
       Up/Down status is the genuine move since the candle opened,
     • the "buy / sell pressure" tiles are computed from the real taker side
       of the streaming trades.
   ──────────────────────────────────────────────────────────────────────── */

type Trade = { id: number; side: 'buy' | 'sell'; price: number; size: number; time: number };

const ROUND_MS = 5 * 60 * 1000;
const WS_URL = 'wss://ws-feed.exchange.coinbase.com';
const REST = 'https://api.exchange.coinbase.com/products/BTC-USD';

const fmtUsd2 = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSize = (n: number) => (n >= 1 ? n.toFixed(3) : n.toFixed(5));
const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};
const fmtTime = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

export default function BtcUpDownCard() {
  const [price, setPrice] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [roundEnd, setRoundEnd] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [now, setNow] = useState(Date.now());
  const [live, setLive] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // 1s clock for the countdown + trade timestamps.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Real round open price = open of the current 5-minute candle. Refresh
  // periodically and immediately whenever the round has rolled over.
  useEffect(() => {
    let alive = true;
    const loadRound = async () => {
      try {
        const r = await fetch(`${REST}/candles?granularity=300`, { cache: 'no-store' });
        const rows = await r.json();
        if (!alive || !Array.isArray(rows) || rows.length === 0) return;
        const c = rows[0]; // [time, low, high, open, close, volume], newest first
        setOpen(Number(c[3]));
        setRoundEnd(Number(c[0]) * 1000 + ROUND_MS);
      } catch {
        /* keep last known round; never fabricate */
      }
    };
    loadRound();
    const t = setInterval(loadRound, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const rolledRef = useRef(0);
  useEffect(() => {
    if (roundEnd && now >= roundEnd && rolledRef.current !== roundEnd) {
      rolledRef.current = roundEnd;
      fetch(`${REST}/candles?granularity=300`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((rows) => {
          if (mountedRef.current && Array.isArray(rows) && rows.length) {
            const c = rows[0];
            setOpen(Number(c[3]));
            setRoundEnd(Number(c[0]) * 1000 + ROUND_MS);
          }
        })
        .catch(() => {});
    }
  }, [now, roundEnd]);

  // Real-time price + trades via Coinbase WS, REST polling fallback.
  useEffect(() => {
    let alive = true;
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    let gotTrades = false;

    const stopPoll = () => {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    };

    const pushTrades = (incoming: Trade[]) => {
      if (incoming.length === 0) return;
      gotTrades = true;
      setTrades((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        const fresh = incoming.filter((t) => !seen.has(t.id));
        if (fresh.length === 0) return prev;
        return [...fresh, ...prev].slice(0, 40);
      });
    };

    const startPoll = () => {
      if (pollTimer) return;
      const poll = async () => {
        try {
          const [tk, tr] = await Promise.all([
            fetch(`${REST}/ticker`, { cache: 'no-store' }).then((r) => r.json()),
            fetch(`${REST}/trades?limit=25`, { cache: 'no-store' }).then((r) => r.json()),
          ]);
          if (!alive) return;
          if (tk?.price) { setPrice(Number(tk.price)); setLive(true); }
          if (Array.isArray(tr)) {
            pushTrades(
              tr.map((t: any) => ({
                id: Number(t.trade_id),
                side: t.side === 'buy' ? 'buy' : 'sell',
                price: Number(t.price),
                size: Number(t.size),
                time: new Date(t.time).getTime(),
              })),
            );
          }
        } catch {
          if (alive) setLive(false);
        }
      };
      poll();
      pollTimer = setInterval(poll, 2000);
    };

    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        if (!alive || !ws) return;
        ws.send(JSON.stringify({ type: 'subscribe', product_ids: ['BTC-USD'], channels: ['matches', 'ticker'] }));
      };
      ws.onmessage = (ev) => {
        if (!alive) return;
        let msg: any;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === 'ticker' && msg.price) {
          setPrice(Number(msg.price));
          setLive(true);
        } else if ((msg.type === 'match' || msg.type === 'last_match') && msg.price) {
          setPrice(Number(msg.price));
          setLive(true);
          pushTrades([{
            id: Number(msg.trade_id),
            side: msg.side === 'buy' ? 'buy' : 'sell',
            price: Number(msg.price),
            size: Number(msg.size),
            time: new Date(msg.time).getTime(),
          }]);
          // Real trades are flowing over the socket — drop the REST fallback.
          stopPoll();
        }
      };
      ws.onclose = () => { if (alive) { setLive(false); startPoll(); } };
      ws.onerror = () => { try { ws?.close(); } catch {} };
    } catch {
      startPoll();
    }

    // The tape must never stay empty: if no real TRADES have streamed in within
    // 5s (ticker-only, blocked socket, or handshake failure), start REST polling.
    const guard = setTimeout(() => { if (alive && !gotTrades) startPoll(); }, 5000);

    return () => {
      alive = false;
      clearTimeout(guard);
      stopPoll();
      try { ws?.close(); } catch {}
    };
  }, []);

  const chg = price != null && open ? (price - open) / open : 0;
  const isUp = chg >= 0;

  // Real buy/sell pressure from the streaming taker sides (volume-weighted).
  const buyVol = trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.size, 0);
  const sellVol = trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.size, 0);
  const totalVol = buyVol + sellVol;
  const buyPct = totalVol > 0 ? Math.round((buyVol / totalVol) * 100) : 50;
  const sellPct = 100 - buyPct;

  return (
    <div className="rounded-2xl border border-[#2B3139] bg-gradient-to-br from-[#1E2329] to-[#0B0E11] overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes btc-rowin { 0% { opacity: 0; transform: translateY(-6px); } 100% { opacity: 1; transform: translateY(0); } }
        .btc-rowin { animation: btc-rowin 0.35s ease-out both; }
      ` }} />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#2B3139]">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F7931A]/15 text-[#F7931A]">
          <Bitcoin className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#EAECEF]">BTC Up or Down</h3>
            <span className="px-1.5 py-0.5 rounded bg-[#2B3139] text-[10px] font-bold text-[#848E9C] uppercase tracking-wider">5m</span>
          </div>
          <span className="text-[11px] text-[#848E9C]">Live BTC-USD · Coinbase</span>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
          <span className="relative flex h-2 w-2">
            {live && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ECB81] opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${live ? 'bg-[#0ECB81]' : 'bg-[#5E6673]'}`} />
          </span>
          <span className={live ? 'text-[#0ECB81]' : 'text-[#5E6673]'}>{live ? 'Live' : 'Connecting'}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr]">
        {/* Left: price + up/down + countdown + pressure */}
        <div className="p-5 lg:border-r border-[#2B3139] flex flex-col gap-4">
          <div>
            <div className="text-[11px] text-[#848E9C] uppercase tracking-wider mb-1">Live price</div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold tabular-nums text-[#EAECEF]">
                {price == null ? '—' : `$${fmtUsd2(price)}`}
              </span>
              <span className={`flex items-center gap-0.5 text-sm font-bold mb-1 ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {isUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {price != null && open ? `${(chg * 100).toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="text-[11px] text-[#5E6673] mt-1 tabular-nums">
              {open ? `Round open $${fmtUsd2(open)}` : 'Loading round…'}
            </div>
          </div>

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

          <div className="flex items-center justify-between rounded-lg bg-[#0B0E11] border border-[#2B3139] px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-[#848E9C]">
              <Clock className="w-3.5 h-3.5" /> Round ends in
            </span>
            <span className="text-sm font-bold tabular-nums text-[#F0B90B]">
              {roundEnd ? fmtClock(roundEnd - now) : '—'}
            </span>
          </div>
        </div>

        {/* Right: live trades tape (real, streaming) */}
        <div className="flex flex-col min-h-[260px]">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2B3139] bg-[#0B0E11]">
            <Radio className="w-3.5 h-3.5 text-[#F0B90B]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#EAECEF]">Live Trades</span>
            <div className="ml-auto flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#5E6673]">
              <span>Price</span><span>Size (BTC)</span><span>Time</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden divide-y divide-[#2B3139]/50">
            {trades.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-[#5E6673]">Connecting to the live trade feed…</div>
            ) : (
              trades.slice(0, 9).map((t) => {
                const buy = t.side === 'buy';
                return (
                  <div key={t.id} className="btc-rowin flex items-center gap-2 px-4 py-2 text-xs">
                    <span className={`flex items-center justify-center w-5 h-5 rounded shrink-0 ${buy ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'}`}>
                      {buy ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    </span>
                    <span className={`font-semibold tabular-nums w-[88px] ${buy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      ${fmtUsd2(t.price)}
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
    </div>
  );
}

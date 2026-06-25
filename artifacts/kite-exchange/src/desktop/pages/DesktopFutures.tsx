import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Search, Star } from 'lucide-react';
import BinanceLightweightChart from '../../components/BinanceLightweightChart';
import CoinLogo from '../../components/CoinLogo';
import { useMarkets, DeskMarket } from '../useMarkets';
import { useFuturesTrading } from '../hooks/useFuturesTrading';
import { useOrderBook } from '../hooks/useOrderBook';
import { fetchFreshFuturesPrice } from '../lib/desktop-price';
import { calculateUnrealizedPNL, getFundingCountdown } from '../../lib/futures-calculator';
import { formatPriceSub, formatAmount } from '../../lib/format-utils';

const TIMEFRAMES = ['Time', '15m', '1h', '4h', '1D', '1W'];
const LEVERAGES = [1, 2, 5, 10, 20, 50, 75, 100, 125];

const fmt = formatPriceSub;
function fmtVol(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}

interface Props { user: any; onAuth: (m: 'login' | 'register') => void; onDeposit: () => void; }

export default function DesktopFutures({ user, onAuth, onDeposit }: Props) {
  const { markets } = useMarkets();
  const ft = useFuturesTrading();

  const tradable = useMemo(() => markets.filter(m => m.symbol !== 'USDT' && m.price > 0), [markets]);
  const [baseSymbol, setBaseSymbol] = useState<string>(() => localStorage.getItem('selectedCoinSymbol') || 'BTC');
  const [pairOpen, setPairOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState('');
  const [timeframe, setTimeframe] = useState('1D');

  const market: DeskMarket | undefined = useMemo(
    () => tradable.find(m => m.symbol === baseSymbol) || tradable[0],
    [tradable, baseSymbol],
  );
  const futuresSymbol = market ? `${market.symbol}USDT` : 'BTCUSDT';
  const binanceSymbol = market?.binanceSymbol || '';
  const price = market?.price || 0;
  const change = market?.change24h || 0;

  const { bids, asks, trades } = useOrderBook(futuresSymbol, price);

  // Order form
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit' | 'stop-market'>('market');
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross');
  const [leverage, setLeverage] = useState(20);
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tpslModal, setTpslModal] = useState<{ positionId: string; side: 'long' | 'short'; price: number } | null>(null);
  const [bottomTab, setBottomTab] = useState<'positions' | 'orders' | 'history' | 'assets'>('positions');
  const isStop = orderType === 'stop-limit' || orderType === 'stop-market';
  const [funding, setFunding] = useState(getFundingCountdown());

  useEffect(() => {
    const id = setInterval(() => setFunding(getFundingCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { if (market) localStorage.setItem('selectedCoinSymbol', market.symbol); }, [market]);
  useEffect(() => {
    const onSelect = (e: Event) => {
      const sym = (e as CustomEvent).detail;
      if (typeof sym === 'string' && sym) setBaseSymbol(sym);
    };
    window.addEventListener('desk-select-coin', onSelect);
    return () => window.removeEventListener('desk-select-coin', onSelect);
  }, []);
  useEffect(() => { if ((orderType === 'limit' || orderType === 'stop-limit') && !limitPrice && price > 0) setLimitPrice(price.toString()); }, [orderType, price, limitPrice]);
  useEffect(() => { if (isStop && !stopPrice && price > 0) setStopPrice(price.toString()); }, [isStop, price, stopPrice]);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Live mark prices + client-side trigger engine for stop orders & TP/SL.
  // Watches every symbol that has an open position or a pending stop order; when
  // a trigger price is crossed it executes through the audited money paths.
  const [markPrices, setMarkPrices] = useState<Record<string, number>>({});
  const ftRef = useRef(ft); ftRef.current = ft;
  const inFlight = useRef<Set<string>>(new Set());
  const watchSymbols = Array.from(new Set([
    ...ft.positions.map(p => p.symbol),
    ...ft.openOrders.map((o: any) => o.symbol),
  ]));
  const symbolsKey = watchSymbols.join(',');

  useEffect(() => {
    let active = true;
    if (watchSymbols.length === 0) return;
    const evaluateTriggers = async (prices: Record<string, number>) => {
      const f = ftRef.current;
      if (!f.userId) return;
      // Conditional (stop) orders → open a position when the trigger is hit.
      for (const o of f.openOrders) {
        if (o.status !== 'pending') continue;
        const mp = prices[o.symbol]; const trig = Number(o.trigger_price);
        if (!mp || !trig) continue;
        const buy = o.side === 'buy' || o.side === 'LONG';
        const hit = buy ? mp >= trig : mp <= trig;
        if (!hit || inFlight.current.has(o.id)) continue;
        inFlight.current.add(o.id);
        try {
          const r = await f.executeStopOrder(o);
          showToast(r.ok, r.ok ? `Stop order filled · ${o.symbol}` : `Stop order failed · ${o.symbol}`);
        } finally { inFlight.current.delete(o.id); }
      }
      // TP/SL → close the position when the trigger is hit.
      for (const t of f.tpslOrders) {
        if (t.status !== 'active') continue;
        const pos = f.positions.find(p => p.id === t.position_id);
        if (!pos) continue;
        const mp = prices[pos.symbol]; const trig = Number(t.trigger_price);
        if (!mp || !trig) continue;
        const isLong = pos.side === 'LONG';
        const hit = t.type === 'tp' ? (isLong ? mp >= trig : mp <= trig) : (isLong ? mp <= trig : mp >= trig);
        const key = 'tpsl-' + t.position_id;
        if (!hit || inFlight.current.has(key)) continue;
        inFlight.current.add(key);
        try {
          const res = await f.executeTpsl(t);
          showToast(res.success, res.success
            ? `${t.type === 'tp' ? 'Take Profit' : 'Stop Loss'} hit · ${pos.symbol} · PnL ${res.netPnl >= 0 ? '+' : ''}${res.netPnl.toFixed(2)}`
            : 'TP/SL close failed');
        } finally { inFlight.current.delete(key); }
      }
    };
    const tick = async () => {
      const entries = await Promise.all(watchSymbols.map(async s => [s, await fetchFreshFuturesPrice(s)] as const));
      const fresh = Object.fromEntries(entries.filter(([, v]) => v > 0));
      if (!active) return;
      setMarkPrices(prev => ({ ...prev, ...fresh }));
      await evaluateTriggers(fresh);
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { active = false; clearInterval(id); };
  }, [symbolsKey]);

  const submit = async (s: 'buy' | 'sell') => {
    if (!user) { onAuth('login'); return; }
    setSide(s);
    const res = isStop
      ? await ft.placeStopOrder({ symbol: futuresSymbol, side: s, leverage, amount, orderType: orderType as 'stop-limit' | 'stop-market', price: limitPrice, stopPrice, marginMode })
      : await ft.placeOrder({ symbol: futuresSymbol, side: s, leverage, amount, orderType: orderType as 'market' | 'limit', price: limitPrice, marginMode });
    showToast(res.ok, res.message);
    if (res.ok) { setAmount(''); setStopPrice(''); }
  };

  const cancelOrder = async (id: string) => {
    const ok = await ft.cancelOrder(id);
    showToast(ok, ok ? 'Order cancelled' : 'Failed to cancel order');
  };

  const closePos = async (id: string) => {
    const res = await ft.closePosition(id, 'market', undefined, 100);
    showToast(res.success, res.success ? `Closed ${res.symbol} · PnL ${res.netPnl >= 0 ? '+' : ''}${res.netPnl.toFixed(2)} USDT` : 'Failed to close position');
  };

  const filteredPairs = tradable.filter(m =>
    m.symbol.toLowerCase().includes(pairSearch.toLowerCase()) ||
    m.fullName.toLowerCase().includes(pairSearch.toLowerCase()));

  const marginAmt = parseFloat(amount) || 0;
  const positionSizePreview = marginAmt * leverage;
  const cost = marginAmt + positionSizePreview * 0.0004;

  return (
    <div className="bg-[#0B0E11] min-h-screen text-white">
      {/* ── Symbol header bar ───────────────────────────── */}
      <div className="border-b border-[#2B3139] bg-[#181A20]">
        <div className="flex items-center gap-6 px-4 py-2.5">
          <div className="relative shrink-0">
            <button onClick={() => setPairOpen(o => !o)} className="flex items-center gap-2 hover:bg-[#2B3139] px-2 py-1 rounded">
              {market && <CoinLogo symbol={market.symbol} dbUrl={market.logo} size={26} className="w-[26px] h-[26px] rounded-full object-cover shrink-0" />}
              <span className="font-bold text-lg">{market?.symbol}USDT</span>
              <span className="text-[10px] bg-[#2B3139] text-[#848E9C] px-1 rounded">Perp</span>
              <ChevronDown size={16} className="text-[#848E9C]" />
            </button>
            {pairOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPairOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-[#181A20] border border-[#2B3139] rounded-lg shadow-2xl max-h-[420px] overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-[#2B3139]">
                    <div className="flex items-center gap-2 bg-[#0B0E11] rounded px-2 py-1.5">
                      <Search size={14} className="text-[#848E9C]" />
                      <input autoFocus value={pairSearch} onChange={e => setPairSearch(e.target.value)} placeholder="Search"
                        className="bg-transparent text-sm outline-none flex-1 text-white" />
                    </div>
                  </div>
                  <div className="overflow-y-auto">
                    {filteredPairs.map(m => (
                      <button key={m.symbol} onClick={() => { setBaseSymbol(m.symbol); setPairOpen(false); setPairSearch(''); }}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#2B3139] text-sm">
                        <div className="flex items-center gap-2">
                          <Star size={12} className="text-[#848E9C]" />
                          <CoinLogo symbol={m.symbol} dbUrl={m.logo} size={18} className="w-[18px] h-[18px] rounded-full object-cover shrink-0" />
                          <span className="font-medium">{m.symbol}USDT</span>
                          <span className="text-[9px] bg-[#2B3139] text-[#848E9C] px-1 rounded">Perp</span>
                        </div>
                        <span className={m.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                          {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-6 overflow-x-auto min-w-0">
            <div className={`text-xl font-semibold shrink-0 ${change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {fmt(price)}
            </div>
            <Stat label="24h Change" value={`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`} pos={change >= 0} />
            <Stat label="24h High" value={fmt(market?.high24h || 0)} />
            <Stat label="24h Low" value={fmt(market?.low24h || 0)} />
            <Stat label="24h Volume (USDT)" value={fmtVol(market?.volume || 0)} />
            <Stat label="Funding / Countdown" value={funding} />
          </div>
        </div>
      </div>

      {/* ── Trading grid ───────────────────────────────── */}
      <div className="grid grid-cols-[1fr_300px_320px] gap-[1px] bg-[#2B3139]">
        {/* Chart */}
        <div className="bg-[#0B0E11] flex flex-col">
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[#2B3139]">
            {TIMEFRAMES.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs rounded ${timeframe === tf ? 'bg-[#2B3139] text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'}`}>
                {tf === 'Time' ? '1m' : tf}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-[440px]">
            {market && (
              <BinanceLightweightChart
                symbol={market.symbol}
                binanceSymbol={binanceSymbol || `${market.symbol}USDT`}
                timeframe={timeframe}
                currentPrice={price}
                change24h={change}
              />
            )}
          </div>
        </div>

        {/* Order book + trades */}
        <div className="bg-[#0B0E11] flex flex-col">
          <div className="px-3 py-2 border-b border-[#2B3139] text-xs font-medium text-[#848E9C]">Order Book</div>
          <div className="px-3 py-1 grid grid-cols-3 text-[10px] text-[#848E9C]">
            <span>Price(USDT)</span><span className="text-right">Size</span><span className="text-right">Sum</span>
          </div>
          <div className="flex flex-col">
            {asks.slice(-8).map((lv, i) => (
              <Row key={'a' + i} price={lv.price} amount={lv.amount} total={lv.total} color="#F6465D" />
            ))}
          </div>
          <div className={`px-3 py-1.5 text-lg font-bold ${change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {fmt(price)}
          </div>
          <div className="flex flex-col">
            {bids.slice(0, 8).map((lv, i) => (
              <Row key={'b' + i} price={lv.price} amount={lv.amount} total={lv.total} color="#0ECB81" />
            ))}
          </div>
          <div className="px-3 py-2 border-t border-b border-[#2B3139] text-xs font-medium text-[#848E9C]">Recent Trades</div>
          <div className="px-3 py-1 grid grid-cols-3 text-[10px] text-[#848E9C]">
            <span>Price(USDT)</span><span className="text-right">Amount</span><span className="text-right">Time</span>
          </div>
          <div className="overflow-y-auto max-h-[180px]">
            {trades.map((t, i) => (
              <div key={i} className="px-3 grid grid-cols-3 text-[11px] leading-5 font-mono">
                <span className={t.isBuy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{fmt(t.price)}</span>
                <span className="text-right text-[#EAECEF]">{formatAmount(t.amount)}</span>
                <span className="text-right text-[#848E9C]">{t.time.slice(-8)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order form */}
        <div className="bg-[#181A20] p-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <button onClick={() => setMarginMode(m => m === 'cross' ? 'isolated' : 'cross')}
              className="flex-1 bg-[#2B3139] text-xs py-1.5 rounded capitalize">{marginMode}</button>
            <div className="relative flex-1">
              <select value={leverage} onChange={e => setLeverage(Number(e.target.value))}
                className="w-full bg-[#2B3139] text-xs py-1.5 rounded text-center appearance-none cursor-pointer">
                {LEVERAGES.map(l => <option key={l} value={l}>{l}x</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm border-b border-[#2B3139]">
            {(['limit', 'market'] as const).map(t => (
              <button key={t} onClick={() => setOrderType(t)}
                className={`pb-2 capitalize ${orderType === t ? 'text-[#F0B90B] border-b-2 border-[#F0B90B]' : 'text-[#848E9C]'}`}>{t}</button>
            ))}
            <div className={`relative pb-2 ${isStop ? 'border-b-2 border-[#F0B90B]' : ''}`}>
              <select
                value={isStop ? orderType : ''}
                onChange={e => { if (e.target.value) setOrderType(e.target.value as 'stop-limit' | 'stop-market'); }}
                className={`bg-transparent text-sm cursor-pointer outline-none appearance-none pr-3 ${isStop ? 'text-[#F0B90B]' : 'text-[#848E9C]'}`}>
                <option value="" className="bg-[#181A20] text-white">Stop</option>
                <option value="stop-limit" className="bg-[#181A20] text-white">Stop-Limit</option>
                <option value="stop-market" className="bg-[#181A20] text-white">Stop-Market</option>
              </select>
              <ChevronDown size={11} className="absolute right-0 top-1.5 pointer-events-none" />
            </div>
          </div>

          <div className="text-xs text-[#848E9C] flex justify-between">
            <span>Avbl</span><span className="text-white">{ft.usdtBalance.toFixed(2)} USDT</span>
          </div>

          {isStop && (
            <Field label="Stop" suffix="USDT" value={stopPrice} onChange={setStopPrice} placeholder="Trigger price" />
          )}
          {(orderType === 'limit' || orderType === 'stop-limit') && (
            <Field label="Price" suffix="USDT" value={limitPrice} onChange={setLimitPrice} />
          )}
          <Field label="Margin" suffix="USDT" value={amount} onChange={setAmount} placeholder="Min 5" />

          <div className="flex gap-1">
            {[25, 50, 75, 100].map(pct => (
              <button key={pct} onClick={() => setAmount((ft.usdtBalance * pct / 100).toFixed(2))}
                className="flex-1 bg-[#2B3139] text-[10px] py-1 rounded text-[#848E9C] hover:text-white">{pct}%</button>
            ))}
          </div>

          <div className="text-[11px] text-[#848E9C] space-y-1">
            <div className="flex justify-between"><span>Size</span><span className="text-white">{positionSizePreview.toFixed(2)} USDT</span></div>
            <div className="flex justify-between"><span>Cost</span><span className="text-white">{cost.toFixed(2)} USDT</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => submit('buy')} disabled={ft.loading}
              className="bg-[#0ECB81] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm">
              Buy / Long
            </button>
            <button onClick={() => submit('sell')} disabled={ft.loading}
              className="bg-[#F6465D] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm">
              Sell / Short
            </button>
          </div>

          {!user && (
            <button onClick={() => onAuth('login')} className="text-xs text-[#F0B90B] underline">Log In to trade</button>
          )}
          <button onClick={onDeposit} className="text-xs text-[#848E9C] hover:text-white">Deposit</button>
        </div>
      </div>

      {/* ── Bottom tables ──────────────────────────────── */}
      <div className="bg-[#181A20] border-t border-[#2B3139]">
        <div className="flex items-center gap-5 px-4 py-2.5 text-sm border-b border-[#2B3139]">
          <Tab active={bottomTab === 'positions'} onClick={() => setBottomTab('positions')}>Positions ({ft.positions.length})</Tab>
          <Tab active={bottomTab === 'orders'} onClick={() => setBottomTab('orders')}>Open Orders ({ft.openOrders.length})</Tab>
          <Tab active={bottomTab === 'history'} onClick={() => setBottomTab('history')}>Order History</Tab>
          <Tab active={bottomTab === 'assets'} onClick={() => setBottomTab('assets')}>Assets</Tab>
        </div>

        <div className="p-2 min-h-[180px]">
          {bottomTab === 'positions' && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#848E9C] text-left">
                  <th className="py-2 px-2 font-normal">Symbol</th>
                  <th className="font-normal">Size</th>
                  <th className="font-normal">Entry Price</th>
                  <th className="font-normal">Mark Price</th>
                  <th className="font-normal">Liq. Price</th>
                  <th className="font-normal">Margin</th>
                  <th className="font-normal">PNL (ROI %)</th>
                  <th className="font-normal">TP/SL</th>
                  <th className="font-normal text-right px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {ft.positions.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-[#5E6673] py-10">No open positions</td></tr>
                )}
                {ft.positions.map(p => {
                  const mark = markPrices[p.symbol] || p.entry_price;
                  const pnl = calculateUnrealizedPNL(p.side, p.entry_price, mark, p.position_size);
                  const roi = p.margin > 0 ? (pnl / p.margin) * 100 : 0;
                  const tps = ft.tpslOrders.filter((t: any) => t.position_id === p.id && t.status === 'active');
                  const tp = tps.find((t: any) => t.type === 'tp');
                  const sl = tps.find((t: any) => t.type === 'sl');
                  return (
                    <tr key={p.id} className="border-t border-[#2B3139]">
                      <td className="py-2.5 px-2">
                        <span className={`mr-1.5 inline-block w-0.5 h-3 align-middle ${p.side === 'LONG' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`} />
                        <span className="font-medium">{p.symbol}</span>
                        <span className="ml-1.5 text-[11px] font-semibold text-[#F0B90B] bg-[#F0B90B]/10 px-1 py-0.5 rounded align-middle">{p.leverage}x</span>
                      </td>
                      <td>{(p.position_size / p.entry_price).toFixed(4)}</td>
                      <td>{fmt(p.entry_price)}</td>
                      <td>{fmt(mark)}</td>
                      <td className="text-[#F0B90B]">{fmt(p.liquidation_price)}</td>
                      <td>{p.margin.toFixed(2)} USDT</td>
                      <td className={pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({roi >= 0 ? '+' : ''}{roi.toFixed(2)}%)
                      </td>
                      <td>
                        <button onClick={() => setTpslModal({ positionId: p.id, side: p.side === 'LONG' ? 'long' : 'short', price: mark })}
                          className="text-left hover:opacity-80">
                          {tp || sl ? (
                            <span className="text-[10px] leading-tight">
                              {tp && <span className="text-[#0ECB81]">TP {fmt(Number(tp.trigger_price))}</span>}
                              {tp && sl && <span className="text-[#848E9C]"> / </span>}
                              {sl && <span className="text-[#F6465D]">SL {fmt(Number(sl.trigger_price))}</span>}
                            </span>
                          ) : (
                            <span className="text-[#F0B90B] text-xs">+ Set</span>
                          )}
                        </button>
                      </td>
                      <td className="text-right px-2">
                        <button onClick={() => closePos(p.id)} className="bg-[#F6465D]/10 hover:bg-[#F6465D]/20 text-[#F6465D] font-medium px-3 py-1 rounded text-xs">Cancel</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {bottomTab === 'orders' && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#848E9C] text-left">
                  <th className="py-2 px-2 font-normal">Symbol</th>
                  <th className="font-normal">Type</th>
                  <th className="font-normal">Side</th>
                  <th className="font-normal">Trigger</th>
                  <th className="font-normal">Price</th>
                  <th className="font-normal">Margin</th>
                  <th className="font-normal">Status</th>
                  <th className="font-normal text-right px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {ft.openOrders.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-[#5E6673] py-10">No open orders</td></tr>
                )}
                {ft.openOrders.map((o: any) => {
                  const isBuy = o.side === 'buy' || o.side === 'LONG';
                  return (
                    <tr key={o.id} className="border-t border-[#2B3139]">
                      <td className="py-2.5 px-2 font-medium">{o.symbol}</td>
                      <td className="capitalize">{String(o.type || '').replace('-', ' ')}</td>
                      <td className={isBuy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{isBuy ? 'Long' : 'Short'}</td>
                      <td className="text-[#F0B90B]">{o.trigger_price ? fmt(Number(o.trigger_price)) : '—'}</td>
                      <td>{o.price ? fmt(Number(o.price)) : 'Market'}</td>
                      <td>{Number(o.amount).toFixed(2)} USDT</td>
                      <td className="text-[#848E9C] capitalize">{o.status}</td>
                      <td className="text-right px-2">
                        <button onClick={() => cancelOrder(o.id)} className="bg-[#F6465D]/10 hover:bg-[#F6465D]/20 text-[#F6465D] font-medium px-3 py-1 rounded text-xs">Cancel</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {bottomTab === 'history' && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#848E9C] text-left">
                  <th className="py-2 px-2 font-normal">Symbol</th><th className="font-normal">Side</th>
                  <th className="font-normal">Entry</th><th className="font-normal">Close</th>
                  <th className="font-normal">Realized PNL</th><th className="font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {ft.history.length === 0 && <tr><td colSpan={6} className="text-center text-[#5E6673] py-10">No history</td></tr>}
                {ft.history.map((h: any) => (
                  <tr key={h.id} className="border-t border-[#2B3139]">
                    <td className="py-2.5 px-2 font-medium">{h.symbol}</td>
                    <td className={h.side === 'LONG' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{h.side}</td>
                    <td>{fmt(h.entry_price)}</td>
                    <td>{fmt(h.close_price)}</td>
                    <td className={(h.realized_pnl || 0) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                      {(h.realized_pnl || 0) >= 0 ? '+' : ''}{(h.realized_pnl || 0).toFixed(2)}
                    </td>
                    <td className="text-[#848E9C]">{new Date(h.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {bottomTab === 'assets' && (
            <div className="p-6 text-sm">
              <div className="flex items-center justify-between max-w-md">
                <span className="text-[#848E9C]">Futures Balance</span>
                <span className="font-bold text-lg">{ft.usdtBalance.toFixed(2)} USDT</span>
              </div>
              <button onClick={onDeposit} className="mt-4 bg-[#F0B90B] text-black font-semibold px-5 py-2 rounded text-sm">Transfer / Deposit</button>
            </div>
          )}
        </div>
      </div>

      {tpslModal && (() => {
        const tps = ft.tpslOrders.filter((t: any) => t.position_id === tpslModal.positionId && t.status === 'active');
        const tp = tps.find((t: any) => t.type === 'tp');
        const sl = tps.find((t: any) => t.type === 'sl');
        return (
          <DeskTPSLModal
            side={tpslModal.side}
            price={tpslModal.price}
            existingTP={tp ? Number(tp.trigger_price) : undefined}
            existingSL={sl ? Number(sl.trigger_price) : undefined}
            onClose={() => setTpslModal(null)}
            onSave={async (tpv, slv) => {
              const r = await ft.saveTpsl(tpslModal.positionId, tpv, slv);
              showToast(r.ok, r.ok ? 'TP/SL saved' : 'Failed to save TP/SL');
              setTpslModal(null);
            }}
          />
        );
      })()}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl text-sm max-w-sm ${toast.ok ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'} text-white`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function DeskTPSLModal({ side, price, existingTP, existingSL, onClose, onSave }: {
  side: 'long' | 'short';
  price: number;
  existingTP?: number;
  existingSL?: number;
  onClose: () => void;
  onSave: (tp: number | null, sl: number | null) => void;
}) {
  const [tp, setTp] = useState(existingTP ? String(existingTP) : '');
  const [sl, setSl] = useState(existingSL ? String(existingSL) : '');
  const pct = (v: string) => {
    const n = parseFloat(v);
    if (!n || !price) return null;
    const diff = side === 'long' ? n - price : price - n;
    return (diff / price) * 100;
  };
  const tpPct = pct(tp);
  const slPct = pct(sl);
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#181A20] w-[360px] rounded-lg p-5 border border-[#2B3139]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Take Profit / Stop Loss</h3>
          <button onClick={onClose} className="text-[#848E9C] hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="flex justify-between text-xs mb-4 bg-[#2B3139] rounded px-3 py-2">
          <span className="text-[#848E9C]">Mark Price</span>
          <span className="text-white font-medium">{fmt(price)} USDT</span>
        </div>

        <label className="text-xs text-[#848E9C] mb-1.5 block">Take Profit (USDT)</label>
        <input value={tp} onChange={e => setTp(e.target.value)} type="number" placeholder="0.00"
          className="w-full bg-[#0B0E11] border border-[#2B3139] rounded px-3 py-2.5 mb-1.5 text-sm outline-none text-white" />
        {tpPct !== null && (
          <div className="text-[11px] mb-3"><span className="text-[#848E9C]">Est. Profit: </span>
            <span className={tpPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{tpPct.toFixed(2)}%</span></div>
        )}

        <label className="text-xs text-[#848E9C] mb-1.5 block mt-2">Stop Loss (USDT)</label>
        <input value={sl} onChange={e => setSl(e.target.value)} type="number" placeholder="0.00"
          className="w-full bg-[#0B0E11] border border-[#2B3139] rounded px-3 py-2.5 mb-1.5 text-sm outline-none text-white" />
        {slPct !== null && (
          <div className="text-[11px] mb-3"><span className="text-[#848E9C]">Est. Loss: </span>
            <span className={slPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{slPct.toFixed(2)}%</span></div>
        )}

        <p className="text-[11px] text-[#5E6673] my-3">
          {side === 'long' ? 'Long: TP above Mark Price, SL below Mark Price' : 'Short: TP below Mark Price, SL above Mark Price'}
        </p>

        <button onClick={() => onSave(tp ? parseFloat(tp) : null, sl ? parseFloat(sl) : null)}
          className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold py-2.5 rounded text-sm">
          Confirm
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, pos }: { label: string; value: string; pos?: boolean }) {
  return (
    <div className="shrink-0">
      <div className="text-[10px] text-[#848E9C] whitespace-nowrap">{label}</div>
      <div className={`text-xs font-medium ${pos === undefined ? 'text-white' : pos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{value}</div>
    </div>
  );
}

function Row({ price, amount, total, color }: { price: number; amount: number; total: number; color: string }) {
  return (
    <div className="px-3 grid grid-cols-3 text-[11px] leading-5 font-mono hover:bg-[#2B3139]">
      <span style={{ color }} className="truncate">{fmt(price)}</span>
      <span className="text-right text-[#EAECEF]">{formatAmount(amount)}</span>
      <span className="text-right text-[#848E9C]">{formatAmount(total)}</span>
    </div>
  );
}

function Field({ label, suffix, value, onChange, placeholder }: { label: string; suffix: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="bg-[#0B0E11] border border-[#2B3139] rounded px-3 py-2 flex items-center">
      <span className="text-[11px] text-[#848E9C] w-14">{label}</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="bg-transparent flex-1 text-right text-sm outline-none text-white" />
      <span className="text-[11px] text-[#848E9C] ml-2">{suffix}</span>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`pb-0.5 ${active ? 'text-white border-b-2 border-[#F0B90B]' : 'text-[#848E9C] hover:text-white'}`}>
      {children}
    </button>
  );
}

function EmptyOr({ rows, cols, render, empty }: { rows: any[]; cols: string[]; render: (r: any) => any[]; empty: string }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-[#848E9C] text-left">
          {cols.map(c => <th key={c} className="py-2 px-2 font-normal">{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={cols.length} className="text-center text-[#5E6673] py-10">{empty}</td></tr>}
        {rows.map((r, i) => (
          <tr key={r.id || i} className="border-t border-[#2B3139]">
            {render(r).map((cell, j) => <td key={j} className="py-2.5 px-2">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, UTCTimestamp } from 'lightweight-charts';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ChevronDown, TrendingUp, TrendingDown, X, RefreshCw } from 'lucide-react';
import {
  calculateLiquidationPrice,
  calculateTradingFee,
} from '../lib/futures-calculator';
import { getCachedCustomFeePct } from '../lib/user-restrictions';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BDexToken {
  symbol: string;
  name: string;
  poolAddress: string;
  baseAddress: string;
  icon: string | null;
  priceUsd: number;
  priceBnb: number;
  priceChange24h: number;
  volume24h: number;
  dexUrl: string;
  pairLabel: string;
}

interface BDexPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  position_size: number;
  leverage: number;
  margin: number;
  liquidation_price: number;
  trading_fee: number;
  status: string;
  created_at: string;
}

interface BDexTradePageProps {
  token: BDexToken;
  onBack: () => void;
  userId: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPrice = (n: number): string => {
  if (n === 0) return '0.00';
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.001) return n.toFixed(6);
  if (n >= 0.000001) return n.toFixed(8);
  return n.toExponential(3);
};

const formatVolume = (v: number): string => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const getPriceDecimals = (p: number): number => {
  if (p === 0) return 4;
  if (p >= 100) return 2;
  if (p >= 1) return 4;
  if (p >= 0.01) return 5;
  if (p >= 0.0001) return 6;
  return 8;
};

// Synthetic order book around current price
function buildOrderBook(price: number, dec: number) {
  const step = price * 0.0003;
  const asks: { price: number; qty: number }[] = [];
  const bids: { price: number; qty: number }[] = [];
  const seed = Math.round(price * 1e4);
  const rng = (i: number) => {
    const x = Math.sin(seed * 127 + i * 31) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 10; i++) {
    asks.push({ price: price + step * (i + 1), qty: 5000 + rng(i) * 80000 });
    bids.push({ price: price - step * (i + 1), qty: 5000 + rng(i + 20) * 80000 });
  }
  return { asks, bids };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BDexTradePage({ token, onBack, userId }: BDexTradePageProps) {
  const BDEX_SYMBOL = `BDEX_${token.symbol}USDT`;

  // Price & chart
  const [currentPrice, setCurrentPrice] = useState(token.priceUsd);
  const [priceChange24h, setPriceChange24h] = useState(token.priceChange24h);
  const [volume24h, setVolume24h] = useState(token.volume24h);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartInterval, setChartInterval] = useState<'15m' | '1h' | '4h' | '1d'>('1h');

  // Order book
  const [activeTab, setActiveTab] = useState<'book' | 'positions'>('book');
  const [orderBook, setOrderBook] = useState(() => buildOrderBook(token.priceUsd, getPriceDecimals(token.priceUsd)));

  // Trading form
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState(10);
  const [showLeverageModal, setShowLeverageModal] = useState(false);
  const [marginInput, setMarginInput] = useState('');
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [placing, setPlacing] = useState(false);

  // Positions
  const [positions, setPositions] = useState<BDexPosition[]>([]);
  const [closing, setClosing] = useState<string | null>(null);

  // ── Fetch user balance ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    supabase.from('user_balances').select('futures_balance').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data) setUsdtBalance(data.futures_balance || 0); });
  }, [userId]);

  // ── Fetch open BDEX positions ─────────────────────────────────────────────
  const fetchPositions = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('futures_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', BDEX_SYMBOL)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (data) setPositions(data as BDexPosition[]);
  }, [userId, BDEX_SYMBOL]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  // ── Poll live price ───────────────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `https://api.geckoterminal.com/api/v2/networks/bsc/pools/${token.poolAddress}`
        );
        const d = await res.json();
        const attr = d?.data?.attributes;
        if (!attr) return;
        const p = parseFloat(attr.base_token_price_usd || '0');
        const chg = parseFloat(attr.price_change_percentage?.h24 || '0');
        const vol = parseFloat(attr.volume_usd?.h24 || '0');
        if (p > 0) {
          setCurrentPrice(p);
          setPriceChange24h(chg);
          if (vol > 0) setVolume24h(vol);
          setOrderBook(buildOrderBook(p, getPriceDecimals(p)));
          // Update chart last candle
          if (candleSeriesRef.current) {
            const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
            candleSeriesRef.current.update({ time: now, open: p, high: p, low: p, close: p });
          }
        }
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 15_000);
    return () => clearInterval(interval);
  }, [token.poolAddress]);

  // ── Fetch OHLCV and build chart ────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;
    setChartLoading(true);

    // Map interval to GeckoTerminal params
    const intervalMap: Record<string, { endpoint: string; aggregate: number; limit: number }> = {
      '15m': { endpoint: 'minute', aggregate: 15, limit: 200 },
      '1h':  { endpoint: 'hour',   aggregate: 1,  limit: 200 },
      '4h':  { endpoint: 'hour',   aggregate: 4,  limit: 200 },
      '1d':  { endpoint: 'day',    aggregate: 1,  limit: 200 },
    };
    const { endpoint, aggregate, limit } = intervalMap[chartInterval];

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#848E9C',
      },
      grid: {
        vertLines: { color: '#1E2329' },
        horzLines: { color: '#1E2329' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#2B3139' },
      timeScale: { borderColor: '#2B3139', timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderUpColor: '#0ECB81',
      borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, {
      color: '#0ECB81',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volSeriesRef.current = volSeries;

    // Fetch OHLCV
    fetch(
      `https://api.geckoterminal.com/api/v2/networks/bsc/pools/${token.poolAddress}/ohlcv/${endpoint}?aggregate=${aggregate}&limit=${limit}&currency=usd&token=base`
    )
      .then(r => r.json())
      .then(d => {
        const list: number[][] = d?.data?.attributes?.ohlcv_list || [];
        if (list.length === 0) throw new Error('no data');

        const candles = list
          .map(([ts, o, h, l, c, v]) => ({
            time: ts as UTCTimestamp,
            open: parseFloat(String(o)),
            high: parseFloat(String(h)),
            low: parseFloat(String(l)),
            close: parseFloat(String(c)),
            value: parseFloat(String(v)),
            color: parseFloat(String(c)) >= parseFloat(String(o)) ? '#0ECB81' : '#F6465D',
          }))
          .sort((a, b) => (a.time as number) - (b.time as number));

        candleSeries.setData(candles);
        volSeries.setData(candles.map(c => ({ time: c.time, value: c.value, color: c.color })));
        chart.timeScale().fitContent();
        setChartLoading(false);
      })
      .catch(() => {
        // Fallback: generate synthetic candles from current price
        const now = Math.floor(Date.now() / 1000);
        const stepSec = chartInterval === '15m' ? 900 : chartInterval === '1h' ? 3600 : chartInterval === '4h' ? 14400 : 86400;
        const synthCandles = Array.from({ length: 100 }, (_, i) => {
          const t = (now - (100 - i) * stepSec) as UTCTimestamp;
          const noise = (Math.random() - 0.5) * currentPrice * 0.02;
          const o = currentPrice + noise;
          const c = currentPrice + (Math.random() - 0.5) * currentPrice * 0.01;
          return { time: t, open: o, high: Math.max(o, c) * 1.005, low: Math.min(o, c) * 0.995, close: c, value: Math.random() * 100000, color: c >= o ? '#0ECB81' : '#F6465D' };
        });
        candleSeries.setData(synthCandles);
        volSeries.setData(synthCandles.map(c => ({ time: c.time, value: c.value, color: c.color })));
        chart.timeScale().fitContent();
        setChartLoading(false);
      });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    });
    ro.observe(container);
    return () => { ro.disconnect(); };
  }, [chartInterval, token.poolAddress, currentPrice]);

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!userId) { alert('Please log in to trade.'); return; }
    const margin = parseFloat(marginInput);
    if (!margin || margin <= 0) { alert('Enter a valid margin amount.'); return; }
    if (margin > usdtBalance) { alert(`Insufficient balance. Available: ${usdtBalance.toFixed(2)} USDT`); return; }

    const price = currentPrice;
    const positionSize = (margin * leverage) / price;
    const _customPct = getCachedCustomFeePct();
    const _feeRate = _customPct > 0 ? _customPct / 100 : 0.0004;
    const tradingFee = positionSize * price * _feeRate; // custom or 0.04% taker fee
    const totalCost = margin + tradingFee;

    if (totalCost > usdtBalance) {
      alert(`Insufficient balance including fees. Need: ${totalCost.toFixed(2)} USDT`);
      return;
    }

    const maintenanceRate = 0.005;
    const liqPrice = calculateLiquidationPrice(price, leverage, side, maintenanceRate);

    setPlacing(true);
    try {
      const { error: posErr } = await supabase.from('futures_positions').insert({
        user_id: userId,
        symbol: BDEX_SYMBOL,
        side,
        position_size: positionSize,
        entry_price: price,
        leverage,
        margin,
        liquidation_price: liqPrice,
        unrealized_pnl: 0,
        realized_pnl: 0,
        trading_fee: tradingFee,
        status: 'open',
        margin_mode: 'cross',
        maintenance_margin_rate: maintenanceRate,
      });
      if (posErr) throw posErr;

      const newBal = Math.max(0, usdtBalance - totalCost);
      await supabase.from('user_balances').update({ futures_balance: newBal }).eq('user_id', userId);
      setUsdtBalance(newBal);
      setMarginInput('');
      await fetchPositions();
      setActiveTab('positions');
    } catch (e: any) {
      alert(e.message || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  // ── Close position ────────────────────────────────────────────────────────
  const handleClosePosition = async (pos: BDexPosition) => {
    if (!userId) return;
    setClosing(pos.id);
    try {
      const exitPrice = currentPrice;
      const pnl = pos.side === 'long'
        ? (exitPrice - pos.entry_price) * pos.position_size
        : (pos.entry_price - exitPrice) * pos.position_size;
      const closeFee = pos.position_size * exitPrice * 0.0004;
      const returnAmt = Math.max(0, pos.margin + pnl - closeFee);

      await supabase.from('futures_positions').update({ status: 'closed', realized_pnl: pnl }).eq('id', pos.id);
      const newBal = usdtBalance + returnAmt;
      await supabase.from('user_balances').update({ futures_balance: newBal }).eq('user_id', userId);
      setUsdtBalance(newBal);
      await fetchPositions();
    } catch (e: any) {
      alert(e.message || 'Close failed');
    } finally {
      setClosing(null);
    }
  };

  const isUp = priceChange24h >= 0;
  const dec = getPriceDecimals(currentPrice);
  const marginNum = parseFloat(marginInput) || 0;
  const estSize = marginNum > 0 ? ((marginNum * leverage) / currentPrice).toFixed(4) : '0.0000';
  const estFee = marginNum > 0 ? (marginNum * leverage * 0.0004).toFixed(4) : '0.0000';
  const liqPrice = marginNum > 0
    ? formatPrice(calculateLiquidationPrice(currentPrice, leverage, side, 0.005))
    : '—';

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E11] flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[#2B3139] bg-[#0B0E11] flex-shrink-0">
        <button onClick={onBack} className="text-[#848E9C] hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-2 flex-1">
          {token.icon ? (
            <img src={token.icon} alt={token.symbol} className="w-6 h-6 rounded-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#F0B90B] flex items-center justify-center">
              <span className="text-[9px] font-bold text-black">{token.symbol.slice(0,2)}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-[15px]">{token.symbol}/USDT</span>
              <span className="text-[10px] text-[#848E9C] bg-[#1E2329] px-1.5 py-0.5 rounded">Perp</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`font-bold text-base ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {formatPrice(currentPrice)}
          </div>
          <div className={`text-xs ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isUp ? '+' : ''}{priceChange24h.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-b border-[#1E2329] bg-[#0B0E11] flex-shrink-0 overflow-x-auto scrollbar-hide">
        <div>
          <div className="text-[#848E9C] text-[10px]">24h Volume</div>
          <div className="text-white text-[11px] font-medium">{formatVolume(volume24h)}</div>
        </div>
        <div>
          <div className="text-[#848E9C] text-[10px]">Chain</div>
          <div className="text-[#F0B90B] text-[11px] font-medium">BSC</div>
        </div>
        <div>
          <div className="text-[#848E9C] text-[10px]">Balance</div>
          <div className="text-white text-[11px] font-medium">{usdtBalance.toFixed(2)} USDT</div>
        </div>
        <div>
          <div className="text-[#848E9C] text-[10px]">Price (BNB)</div>
          <div className="text-white text-[11px] font-medium">ł{token.priceBnb.toPrecision(4)}</div>
        </div>
      </div>

      {/* ── Chart interval tabs ── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#1E2329] bg-[#0B0E11] flex-shrink-0">
        {(['15m','1h','4h','1d'] as const).map(iv => (
          <button
            key={iv}
            onClick={() => setChartInterval(iv)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              chartInterval === iv ? 'bg-[#F0B90B] text-black' : 'text-[#848E9C] hover:text-white'
            }`}
          >
            {iv}
          </button>
        ))}
      </div>

      {/* ── Main body: chart + right column ── */}
      <div className="flex flex-1 min-h-0">
        {/* Chart */}
        <div className="flex-1 relative">
          {chartLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <RefreshCw size={20} className="text-[#F0B90B] animate-spin" />
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* Order book (right column) */}
        <div className="w-[120px] flex-shrink-0 border-l border-[#2B3139] flex flex-col bg-[#0B0E11]">
          <div className="flex border-b border-[#2B3139]">
            <button
              onClick={() => setActiveTab('book')}
              className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors ${activeTab === 'book' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-[#848E9C]'}`}
            >
              Book
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors relative ${activeTab === 'positions' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-[#848E9C]'}`}
            >
              Pos
              {positions.length > 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-[#F6465D] rounded-full text-[8px] text-white flex items-center justify-center">{positions.length}</span>
              )}
            </button>
          </div>

          {activeTab === 'book' ? (
            <div className="flex-1 overflow-hidden px-1 py-0.5 text-[10px]">
              <div className="flex justify-between text-[#848E9C] mb-0.5 px-0.5">
                <span>Price</span><span>Qty</span>
              </div>
              {/* Asks */}
              {orderBook.asks.slice().reverse().map((a, i) => (
                <div key={i} className="flex justify-between py-[1px] px-0.5">
                  <span className="text-[#F6465D] tabular-nums">{a.price.toFixed(dec)}</span>
                  <span className="text-[#848E9C] tabular-nums">{(a.qty / 1000).toFixed(1)}K</span>
                </div>
              ))}
              {/* Current price */}
              <div className={`text-center font-bold py-1 text-[11px] ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {formatPrice(currentPrice)}
              </div>
              {/* Bids */}
              {orderBook.bids.map((b, i) => (
                <div key={i} className="flex justify-between py-[1px] px-0.5">
                  <span className="text-[#0ECB81] tabular-nums">{b.price.toFixed(dec)}</span>
                  <span className="text-[#848E9C] tabular-nums">{(b.qty / 1000).toFixed(1)}K</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-1 py-1">
              {positions.length === 0 ? (
                <div className="text-center text-[#848E9C] text-[10px] mt-4">No positions</div>
              ) : positions.map(pos => {
                const pnl = pos.side === 'long'
                  ? (currentPrice - pos.entry_price) * pos.position_size
                  : (pos.entry_price - currentPrice) * pos.position_size;
                const pnlPct = (pnl / pos.margin) * 100;
                const isPnlUp = pnl >= 0;
                return (
                  <div key={pos.id} className="bg-[#1E2329] rounded p-1 mb-1">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-bold ${pos.side === 'long' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {pos.side.toUpperCase()} {pos.leverage}x
                      </span>
                      <button
                        onClick={() => handleClosePosition(pos)}
                        disabled={closing === pos.id}
                        className="text-[#848E9C] hover:text-[#F6465D]"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <div className={`text-[10px] font-bold ${isPnlUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {isPnlUp ? '+' : ''}{pnl.toFixed(3)}
                    </div>
                    <div className="text-[#848E9C] text-[9px]">{isPnlUp ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Trading form ── */}
      <div className="border-t border-[#2B3139] bg-[#0B0E11] flex-shrink-0 px-3 py-3">
        {/* Long / Short selector */}
        <div className="flex rounded overflow-hidden mb-3">
          <button
            onClick={() => setSide('long')}
            className={`flex-1 py-2 text-sm font-bold transition-all flex items-center justify-center gap-1 ${
              side === 'long' ? 'bg-[#0ECB81] text-black' : 'bg-[#1E2329] text-[#848E9C]'
            }`}
          >
            <TrendingUp size={14} /> Long
          </button>
          <button
            onClick={() => setSide('short')}
            className={`flex-1 py-2 text-sm font-bold transition-all flex items-center justify-center gap-1 ${
              side === 'short' ? 'bg-[#F6465D] text-white' : 'bg-[#1E2329] text-[#848E9C]'
            }`}
          >
            <TrendingDown size={14} /> Short
          </button>
        </div>

        <div className="flex gap-2 mb-2">
          {/* Margin input */}
          <div className="flex-1 bg-[#1E2329] rounded px-3 py-2 flex items-center gap-2">
            <input
              type="number"
              value={marginInput}
              onChange={e => setMarginInput(e.target.value)}
              placeholder="Margin (USDT)"
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-[#848E9C] min-w-0"
            />
            <span className="text-[#848E9C] text-xs flex-shrink-0">USDT</span>
          </div>

          {/* Leverage button */}
          <button
            onClick={() => setShowLeverageModal(true)}
            className="bg-[#1E2329] text-white text-sm font-bold px-3 rounded flex items-center gap-1 hover:bg-[#2B3139]"
          >
            {leverage}x <ChevronDown size={12} />
          </button>
        </div>

        {/* Quick amount buttons */}
        <div className="flex gap-1.5 mb-3">
          {[10, 25, 50, 100].map(pct => (
            <button
              key={pct}
              onClick={() => setMarginInput(((usdtBalance * pct) / 100).toFixed(2))}
              className="flex-1 py-1 bg-[#1E2329] text-[#848E9C] text-xs rounded hover:text-white"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Order summary */}
        {marginNum > 0 && (
          <div className="grid grid-cols-3 gap-1 mb-3 text-[11px]">
            <div>
              <div className="text-[#848E9C]">Est. Size</div>
              <div className="text-white">{estSize} {token.symbol}</div>
            </div>
            <div>
              <div className="text-[#848E9C]">Fee (0.04%)</div>
              <div className="text-white">{estFee} USDT</div>
            </div>
            <div>
              <div className="text-[#848E9C]">Liq. Price</div>
              <div className="text-[#F6465D]">{liqPrice}</div>
            </div>
          </div>
        )}

        {/* Place order button */}
        <button
          onClick={handlePlaceOrder}
          disabled={placing || !marginInput || parseFloat(marginInput) <= 0}
          className={`w-full py-3 rounded font-bold text-sm transition-all ${
            placing || !marginInput || parseFloat(marginInput) <= 0
              ? 'bg-[#2B3139] text-[#848E9C] cursor-not-allowed'
              : side === 'long'
              ? 'bg-[#0ECB81] text-black active:opacity-80'
              : 'bg-[#F6465D] text-white active:opacity-80'
          }`}
        >
          {placing ? 'Placing...' : side === 'long' ? `Buy / Long ${token.symbol}` : `Sell / Short ${token.symbol}`}
        </button>
      </div>

      {/* ── Leverage modal ── */}
      {showLeverageModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-end">
          <div className="w-full bg-[#1C2127] rounded-t-2xl p-5">
            <div className="text-white font-bold text-base mb-4">Leverage: {leverage}x</div>
            <input
              type="range"
              min={1} max={50} step={1}
              value={leverage}
              onChange={e => setLeverage(parseInt(e.target.value))}
              className="w-full accent-[#F0B90B] mb-4"
            />
            <div className="flex gap-2 mb-4">
              {[1, 5, 10, 20, 50].map(l => (
                <button
                  key={l}
                  onClick={() => setLeverage(l)}
                  className={`flex-1 py-1.5 rounded text-sm font-bold transition-all ${
                    leverage === l ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-[#848E9C]'
                  }`}
                >
                  {l}x
                </button>
              ))}
            </div>
            <div className="text-[#848E9C] text-xs mb-4">
              Max leverage: 50x · Higher leverage = higher risk
            </div>
            <button
              onClick={() => setShowLeverageModal(false)}
              className="w-full py-3 bg-[#F0B90B] text-black rounded font-bold"
            >
              Confirm {leverage}x
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

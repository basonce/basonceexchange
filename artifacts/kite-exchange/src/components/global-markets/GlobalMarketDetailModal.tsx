import { useState, useEffect, useRef, useMemo } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType } from 'lightweight-charts';
import {
  Star, ChevronLeft, Minus, Plus, Info, TrendingUp, TrendingDown,
  BarChart2, Activity, Clock, Target, Layers, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  GlobalAsset,
  formatGlobalPrice,
  CATEGORY_CONFIG,
} from '../../lib/global-markets-data';

interface Props {
  asset: GlobalAsset;
  onClose: () => void;
  isFav?: boolean;
  onToggleFav?: () => void;
}

type TimeRange = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W';
type ChartType = 'candles' | 'line' | 'area';
type ActiveTab = 'chart' | 'info' | 'trade';

const RANGES: TimeRange[] = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];

const RANGE_CONFIG: Record<TimeRange, { candles: number; interval: number }> = {
  '1m':  { candles: 120, interval: 60000 },
  '5m':  { candles: 100, interval: 300000 },
  '15m': { candles: 100, interval: 900000 },
  '1H':  { candles: 100, interval: 3600000 },
  '4H':  { candles: 80,  interval: 14400000 },
  '1D':  { candles: 120, interval: 86400000 },
  '1W':  { candles: 60,  interval: 604800000 },
};

function sr(s: number): number {
  const x = Math.sin(s + 7) * 10000;
  return x - Math.floor(x);
}

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number }

function genCandles(asset: GlobalAsset, range: TimeRange): Candle[] {
  const { candles } = RANGE_CONFIG[range];
  const seed = asset.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + range.charCodeAt(0) * 31;
  const volMap: Record<TimeRange, number> = {
    '1m': 0.0008, '5m': 0.0015, '15m': 0.002, '1H': 0.005, '4H': 0.01, '1D': 0.02, '1W': 0.045,
  };
  const vol = volMap[range];
  const result: Candle[] = [];
  let price = asset.price * (1 - asset.changePercent / 100) * (1 + (sr(seed) - 0.5) * 0.04);
  const now = Math.floor(Date.now() / 1000);
  const intervalSec = RANGE_CONFIG[range].interval / 1000;

  for (let i = 0; i < candles; i++) {
    const s1 = seed + i * 137;
    const s2 = seed + i * 97 + 1000;
    const s3 = seed + i * 73 + 2000;
    const s4 = seed + i * 53 + 3000;
    const open = price;
    const closeDir = sr(s1) - 0.48;
    const close = Math.max(open * 0.5, open * (1 + closeDir * vol));
    const wickUp = Math.max(open, close) * (1 + sr(s2) * vol * 0.6);
    const wickDown = Math.min(open, close) * (1 - sr(s3) * vol * 0.6);
    const candleVol = (sr(s4) * 0.8 + 0.2) * (asset.volume || 1e9) / candles;
    result.push({ time: now - (candles - i) * intervalSec, open, high: wickUp, low: wickDown, close, volume: candleVol });
    price = close;
  }
  const last = result[result.length - 1];
  last.close = asset.price;
  last.high = Math.max(last.high, asset.price);
  last.low = Math.min(last.low, asset.price);
  return result;
}

function computeMA(candles: Candle[], period: number): { time: number; value: number }[] {
  return candles.slice(period - 1).map((_, i) => {
    const slice = candles.slice(i, i + period);
    return { time: candles[i + period - 1].time, value: slice.reduce((s, c) => s + c.close, 0) / period };
  });
}

function CandlestickChart({ asset, range, livePrice, chartType, showMA, showVolume }: {
  asset: GlobalAsset;
  range: TimeRange;
  livePrice: number;
  chartType: ChartType;
  showMA: boolean;
  showVolume: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);
  const ma20Ref = useRef<any>(null);
  const ma50Ref = useRef<any>(null);
  const candlesRef = useRef<Candle[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0E1115' },
        textColor: '#4B5563',
        fontSize: 10,
        fontFamily: "'Inter', 'SF Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)', style: 0 },
        horzLines: { color: 'rgba(255,255,255,0.03)', style: 0 },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: 2, labelBackgroundColor: '#1F2937' },
        horzLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: 2, labelBackgroundColor: '#1F2937' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.04)',
        textColor: '#4B5563',
        scaleMargins: { top: 0.1, bottom: showVolume ? 0.26 : 0.08 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.04)',
        textColor: '#4B5563',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: true,
      handleScale: true,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    let mainSeries: any;

    if (chartType === 'candles') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#0ECB81',
        downColor: '#F6465D',
        borderVisible: false,
        wickUpColor: '#0ECB81',
        wickDownColor: '#F6465D',
      });
    } else if (chartType === 'line') {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#0ECB81',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#0ECB81',
        crosshairMarkerBackgroundColor: '#0E1115',
      });
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#0ECB81',
        lineWidth: 2,
        topColor: 'rgba(14,203,129,0.2)',
        bottomColor: 'rgba(14,203,129,0.02)',
        crosshairMarkerVisible: true,
      } as any);
    }

    if (showVolume) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      volSeriesRef.current = volSeries;
    }

    const candles = genCandles(asset, range);
    candlesRef.current = candles;

    if (chartType === 'candles') {
      mainSeries.setData(candles.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })));
    } else {
      mainSeries.setData(candles.map(c => ({ time: c.time as any, value: c.close })));
    }

    if (showVolume && volSeriesRef.current) {
      volSeriesRef.current.setData(
        candles.map(c => ({
          time: c.time as any,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(14,203,129,0.3)' : 'rgba(246,70,93,0.3)',
        }))
      );
    }

    if (showMA && candles.length >= 20) {
      const ma20 = chart.addSeries(LineSeries, {
        color: '#F0B90B', lineWidth: 1, lineStyle: 0,
        crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
      });
      ma20.setData(computeMA(candles, 20).map(d => ({ time: d.time as any, value: d.value })));
      ma20Ref.current = ma20;

      if (candles.length >= 50) {
        const ma50 = chart.addSeries(LineSeries, {
          color: '#3B82F6', lineWidth: 1, lineStyle: 0,
          crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
        });
        ma50.setData(computeMA(candles, 50).map(d => ({ time: d.time as any, value: d.value })));
        ma50Ref.current = ma50;
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;
    candleSeriesRef.current = mainSeries;

    const ro = new ResizeObserver(() => {
      if (chartRef.current) {
        chartRef.current.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
      ma20Ref.current = null;
      ma50Ref.current = null;
    };
  }, [asset.symbol, range, chartType, showMA, showVolume]);

  useEffect(() => {
    if (!candleSeriesRef.current || candlesRef.current.length === 0) return;
    const candles = candlesRef.current;
    const last = candles[candles.length - 1];
    const updated = { ...last, close: livePrice, high: Math.max(last.high, livePrice), low: Math.min(last.low, livePrice) };
    candlesRef.current = [...candles.slice(0, -1), updated];
    if (chartRef.current) {
      if (candleSeriesRef.current) {
        try {
          if (updated.open !== undefined) {
            candleSeriesRef.current.update({ time: updated.time as any, open: updated.open, high: updated.high, low: updated.low, close: updated.close });
          } else {
            candleSeriesRef.current.update({ time: updated.time as any, value: updated.close });
          }
        } catch {}
      }
    }
  }, [livePrice]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function AssetIcon({ asset, size = 40 }: { asset: GlobalAsset; size?: number }) {
  const [logoOk, setLogoOk] = useState(true);
  const [flagOk, setFlagOk] = useState(true);
  const radius = size * 0.2;
  if (asset.logoUrl && logoOk) {
    return (
      <div className="flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size, borderRadius: radius, background: asset.bgColor, border: `1px solid ${asset.textColor}25` }}>
        <img src={asset.logoUrl} alt={asset.displayName}
          style={{ width: size * 0.58, height: size * 0.58, objectFit: 'contain' }}
          onError={() => setLogoOk(false)} />
      </div>
    );
  }
  if (asset.flagUrl && flagOk) {
    return (
      <div className="flex-shrink-0 overflow-hidden"
        style={{ width: size, height: size, borderRadius: radius, border: '1px solid rgba(255,255,255,0.08)' }}>
        <img src={asset.flagUrl} alt={asset.displayName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setFlagOk(false)} />
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 flex items-center justify-center font-black"
      style={{ width: size, height: size, borderRadius: radius, background: asset.bgColor, color: asset.textColor, fontSize: size * 0.3, border: `1px solid ${asset.textColor}25` }}>
      {asset.displayName.slice(0, 2)}
    </div>
  );
}

function InfoPanel({ asset, livePrice, liveChange }: { asset: GlobalAsset; livePrice: number; liveChange: number }) {
  const fmt = (p: number) => formatGlobalPrice(p, asset.symbol);
  const catCfg = CATEGORY_CONFIG[asset.category];
  const rows = [
    { label: 'Bid',           val: fmt(livePrice - asset.spread / 2), color: '#F6465D' },
    { label: 'Ask',           val: fmt(livePrice + asset.spread / 2), color: '#0ECB81' },
    { label: 'Spread',        val: String(asset.spread),              color: '#D1D5DB' },
    { label: '24H High',      val: fmt(asset.high24h),                color: '#0ECB81' },
    { label: '24H Low',       val: fmt(asset.low24h),                 color: '#F6465D' },
    { label: 'Exchange',      val: asset.exchange || 'OTC',           color: '#D1D5DB' },
    { label: 'Contract Size', val: asset.contractSize ? String(asset.contractSize) : 'N/A', color: '#D1D5DB' },
    { label: 'Pip Value',     val: asset.pipValue ? `$${asset.pipValue}` : 'N/A', color: '#D1D5DB' },
    { label: 'Margin Rate',   val: asset.marginRate || 'N/A',         color: '#D1D5DB' },
    { label: 'Session',       val: asset.sessionOpen && asset.sessionClose ? `${asset.sessionOpen} - ${asset.sessionClose}` : '24/5', color: '#D1D5DB' },
  ];

  return (
    <div className="px-4 py-3 overflow-y-auto" style={{ height: '100%' }}>
      <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: catCfg.color }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: catCfg.color }}>{catCfg.label}</span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: '#9CA3AF' }}>{asset.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map(row => (
          <div key={row.label} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>{row.label}</div>
            <div className="font-black text-[12px] font-mono" style={{ color: row.color }}>{row.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const LOT_STEPS = [0.01, 0.05, 0.10, 0.25, 0.50, 1, 2, 5, 10, 20, 50];

function TradePanel({ asset, livePrice, liveChange }: { asset: GlobalAsset; livePrice: number; liveChange: number }) {
  const [lot, setLot] = useState(parseFloat(asset.defaultLot || '1'));
  const [tpPct, setTpPct] = useState('');
  const [slPct, setSlPct] = useState('');
  const positive = liveChange >= 0;
  const bid = livePrice - asset.spread / 2;
  const ask = livePrice + asset.spread / 2;
  const fmt = (p: number) => formatGlobalPrice(p, asset.symbol);

  const margin = useMemo(() => {
    const rate = parseFloat((asset.marginRate || '3.33%').replace('%', '')) / 100;
    const size = asset.contractSize || 1;
    return (livePrice * lot * size * rate).toFixed(2);
  }, [livePrice, lot, asset]);

  const decreaseLot = () => {
    const idx = LOT_STEPS.indexOf(lot);
    if (idx > 0) setLot(LOT_STEPS[idx - 1]);
    else if (idx === -1) {
      const lower = [...LOT_STEPS].reverse().find(v => v < lot);
      if (lower) setLot(lower);
    }
  };
  const increaseLot = () => {
    const idx = LOT_STEPS.indexOf(lot);
    if (idx < LOT_STEPS.length - 1) setLot(LOT_STEPS[idx + 1]);
    else if (idx === -1) {
      const higher = LOT_STEPS.find(v => v > lot);
      if (higher) setLot(higher);
    }
  };

  return (
    <div className="px-4 py-3 overflow-y-auto" style={{ height: '100%' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>Order Type</div>
        <div className="flex rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {['Market', 'Limit', 'Stop'].map(t => (
            <button key={t}
              className="px-3 py-1.5 text-[10px] font-bold"
              style={{ background: t === 'Market' ? 'rgba(255,255,255,0.1)' : 'transparent', color: t === 'Market' ? '#fff' : '#6B7280' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Lot Size</div>
        <div className="flex items-center justify-between">
          <button onClick={decreaseLot}
            className="w-9 h-9 flex items-center justify-center rounded-lg font-black text-lg"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
            <Minus className="w-4 h-4" />
          </button>
          <div className="text-center">
            <div className="font-black text-[22px] font-mono text-white">{lot.toFixed(lot < 1 ? 2 : 0)}</div>
            <div className="text-[9px]" style={{ color: '#6B7280' }}>LOTS</div>
          </div>
          <button onClick={increaseLot}
            className="w-9 h-9 flex items-center justify-center rounded-lg"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0.1, 0.5, 1, 5].map(v => (
            <button key={v} onClick={() => setLot(v)}
              className="flex-1 py-1 rounded text-[10px] font-bold"
              style={{ background: lot === v ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', color: lot === v ? '#fff' : '#6B7280' }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-3" style={{ background: 'rgba(14,203,129,0.05)', border: '1px solid rgba(14,203,129,0.15)' }}>
          <div className="text-[9px] font-bold uppercase mb-1.5 flex items-center gap-1" style={{ color: '#0ECB81' }}>
            <Target className="w-3 h-3" /> Take Profit
          </div>
          <input
            type="text"
            placeholder="e.g. +2%"
            value={tpPct}
            onChange={e => setTpPct(e.target.value)}
            className="w-full bg-transparent outline-none text-[12px] font-mono text-white placeholder-gray-600"
          />
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(246,70,93,0.05)', border: '1px solid rgba(246,70,93,0.15)' }}>
          <div className="text-[9px] font-bold uppercase mb-1.5 flex items-center gap-1" style={{ color: '#F6465D' }}>
            <AlertCircle className="w-3 h-3" /> Stop Loss
          </div>
          <input
            type="text"
            placeholder="e.g. -1%"
            value={slPct}
            onChange={e => setSlPct(e.target.value)}
            className="w-full bg-transparent outline-none text-[12px] font-mono text-white placeholder-gray-600"
          />
        </div>
      </div>

      <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: '#6B7280' }}>Required Margin</span>
          <span className="text-[11px] font-black font-mono text-white">${margin}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: '#6B7280' }}>Spread Cost</span>
          <span className="text-[11px] font-mono" style={{ color: '#F0B90B' }}>{fmt(asset.spread)}</span>
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          className="flex-1 rounded-xl py-3.5 font-black text-[15px] transition-all active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #E03249, #F6465D)', color: '#fff' }}
        >
          <div>SELL</div>
          <div className="text-[11px] font-mono opacity-90">{fmt(bid)}</div>
        </button>
        <button
          className="flex-1 rounded-xl py-3.5 font-black text-[15px] transition-all active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #0BBE76, #0ECB81)', color: '#000' }}
        >
          <div>BUY</div>
          <div className="text-[11px] font-mono opacity-80">{fmt(ask)}</div>
        </button>
      </div>
    </div>
  );
}

export default function GlobalMarketDetailModal({ asset, onClose, isFav = false, onToggleFav }: Props) {
  const [range, setRange] = useState<TimeRange>('1H');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [showMA, setShowMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const [livePrice, setLivePrice] = useState(asset.price);
  const [liveChange, setLiveChange] = useState(asset.changePercent);
  const [localFav, setLocalFav] = useState(isFav);
  const tickRef = useRef(0);

  useEffect(() => { setLocalFav(isFav); }, [isFav]);
  useEffect(() => { setLivePrice(asset.price); setLiveChange(asset.changePercent); }, [asset.symbol]);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      const seed = asset.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + tickRef.current * 997;
      const r = sr(seed);
      const vol = asset.category === 'stocks' ? 0.0009 : asset.category === 'indices' ? 0.0006 : asset.category === 'forex' ? 0.00012 : 0.0004;
      setLivePrice(prev => {
        const next = Math.max(prev * 0.5, prev + (r - 0.49) * 2 * vol * prev);
        const base = asset.price * (1 - asset.changePercent / 100);
        setLiveChange(((next - base) / base) * 100);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [asset.symbol]);

  const positive = liveChange >= 0;
  const bid = livePrice - asset.spread / 2;
  const ask = livePrice + asset.spread / 2;
  const fmt = (p: number) => formatGlobalPrice(p, asset.symbol);
  const catCfg = CATEGORY_CONFIG[asset.category];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0E1115', maxWidth: 480, margin: '0 auto', left: 0, right: 0 }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ background: '#111418', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex items-center gap-2">
          <AssetIcon asset={asset} size={36} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-[14px]">{asset.displayName}</span>
              <span
                className="text-[8px] font-black px-1.5 py-0.5 rounded"
                style={{ background: catCfg.bgColor, color: catCfg.color }}
              >
                {catCfg.label.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-[13px] font-mono">{fmt(livePrice)}</span>
              <span className="text-[11px] font-bold" style={{ color: positive ? '#0ECB81' : '#F6465D' }}>
                {positive ? '+' : ''}{liveChange.toFixed(2)}%
              </span>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0ECB81' }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setLocalFav(p => !p); onToggleFav?.(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: localFav ? 'rgba(240,185,11,0.15)' : 'rgba(255,255,255,0.06)' }}
          >
            <Star className="w-4 h-4" style={{ color: localFav ? '#F0B90B' : '#6B7280', fill: localFav ? '#F0B90B' : 'none' }} />
          </button>
        </div>
      </div>

      <div
        className="flex items-center justify-between px-4 py-1.5 flex-shrink-0"
        style={{ background: '#0A0D10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: '#6B7280' }}>
          <span>H: <span className="text-white">{fmt(asset.high24h)}</span></span>
          <span>L: <span className="text-white">{fmt(asset.low24h)}</span></span>
          <span>Spread: <span style={{ color: '#F0B90B' }}>{asset.spread}</span></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold" style={{ color: '#F6465D' }}>{fmt(bid)}</span>
          <span className="text-[9px]" style={{ color: '#374151' }}>/</span>
          <span className="text-[9px] font-bold" style={{ color: '#0ECB81' }}>{fmt(ask)}</span>
        </div>
      </div>

      <div
        className="flex items-center gap-0 flex-shrink-0"
        style={{ background: '#111418', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {([
          { id: 'chart' as ActiveTab, label: 'Chart',   icon: <BarChart2 className="w-3.5 h-3.5" /> },
          { id: 'trade' as ActiveTab, label: 'Trade',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { id: 'info'  as ActiveTab, label: 'Details', icon: <Info className="w-3.5 h-3.5" /> },
        ] as { id: ActiveTab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold relative transition-colors"
            style={{ color: activeTab === tab.id ? '#fff' : '#6B7280' }}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#0ECB81' }} />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'chart' && (
        <>
          <div
            className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
            style={{ background: '#0A0D10', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-1">
              {([
                { id: 'candles' as ChartType, label: 'Candles' },
                { id: 'line'    as ChartType, label: 'Line' },
                { id: 'area'    as ChartType, label: 'Area' },
              ] as { id: ChartType; label: string }[]).map(ct => (
                <button
                  key={ct.id}
                  onClick={() => setChartType(ct.id)}
                  className="px-2 py-1 rounded text-[9px] font-bold transition-all"
                  style={{
                    background: chartType === ct.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: chartType === ct.id ? '#fff' : '#6B7280',
                    border: chartType === ct.id ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                  }}
                >
                  {ct.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowMA(p => !p)}
                className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-bold"
                style={{
                  background: showMA ? 'rgba(240,185,11,0.15)' : 'transparent',
                  color: showMA ? '#F0B90B' : '#6B7280',
                  border: showMA ? '1px solid rgba(240,185,11,0.3)' : '1px solid transparent',
                }}
              >
                <Activity className="w-2.5 h-2.5" />
                MA
              </button>
              <button
                onClick={() => setShowVolume(p => !p)}
                className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-bold"
                style={{
                  background: showVolume ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: showVolume ? '#3B82F6' : '#6B7280',
                  border: showVolume ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                }}
              >
                <BarChart2 className="w-2.5 h-2.5" />
                Vol
              </button>
              {showMA && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <div className="w-4 h-0.5" style={{ background: '#F0B90B' }} />
                    <span className="text-[8px]" style={{ color: '#F0B90B' }}>MA20</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <div className="w-4 h-0.5" style={{ background: '#3B82F6' }} />
                    <span className="text-[8px]" style={{ color: '#3B82F6' }}>MA50</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
            <CandlestickChart
              asset={asset}
              range={range}
              livePrice={livePrice}
              chartType={chartType}
              showMA={showMA}
              showVolume={showVolume}
            />

            <div className="absolute right-2 top-2 flex flex-col gap-1">
              {[
                { icon: <Layers className="w-3 h-3" />, tip: 'Indicators' },
                { icon: <Target className="w-3 h-3" />, tip: 'Draw' },
                { icon: <Clock className="w-3 h-3" />, tip: 'Session' },
                { icon: <RefreshCw className="w-3 h-3" />, tip: 'Reset' },
              ].map((btn, i) => (
                <button
                  key={i}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{ background: 'rgba(17,20,24,0.9)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#9CA3AF')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
                >
                  {btn.icon}
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex items-center gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto"
            style={{ background: '#111418', borderTop: '1px solid rgba(255,255,255,0.06)', scrollbarWidth: 'none' }}
          >
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="flex-shrink-0 w-9 h-7 rounded text-[10px] font-black transition-all"
                style={{
                  background: range === r ? '#0ECB81' : 'rgba(255,255,255,0.05)',
                  color: range === r ? '#000' : '#6B7280',
                  border: range === r ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <div
            className="flex items-center px-4 py-3 flex-shrink-0 gap-3"
            style={{ background: '#111418', borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <button
              className="flex-1 rounded-xl py-3.5 font-black text-[14px] transition-all active:scale-[0.97] flex flex-col items-center"
              style={{ background: 'linear-gradient(135deg, #E03249, #F6465D)', color: '#fff' }}
            >
              <span>SELL</span>
              <span className="text-[10px] font-mono opacity-90">{fmt(bid)}</span>
            </button>

            <div className="flex flex-col items-center gap-1">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                onClick={() => setActiveTab('trade')}
              >
                <Layers className="w-4 h-4 text-white" />
              </button>
              <span className="text-[8px] font-bold" style={{ color: '#6B7280' }}>More</span>
            </div>

            <button
              className="flex-1 rounded-xl py-3.5 font-black text-[14px] transition-all active:scale-[0.97] flex flex-col items-center"
              style={{ background: 'linear-gradient(135deg, #0BBE76, #0ECB81)', color: '#000' }}
            >
              <span>BUY</span>
              <span className="text-[10px] font-mono opacity-80">{fmt(ask)}</span>
            </button>
          </div>
        </>
      )}

      {activeTab === 'trade' && (
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <TradePanel asset={asset} livePrice={livePrice} liveChange={liveChange} />
        </div>
      )}

      {activeTab === 'info' && (
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <InfoPanel asset={asset} livePrice={livePrice} liveChange={liveChange} />
        </div>
      )}
    </div>
  );
}

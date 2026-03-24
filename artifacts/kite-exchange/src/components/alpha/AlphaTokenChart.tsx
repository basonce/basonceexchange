import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import type { AlphaPricePoint } from '../../types/alpha';

interface Props {
  priceHistory: AlphaPricePoint[];
  currentPrice: number;
  priceChange: number;
  onTimeframeChange?: (tf: string) => void;
}

const TF_INTERVAL_MS: Record<string, number> = {
  '1M': 60000, '5M': 300000, '15M': 900000, '1H': 3600000, '4H': 14400000, '1D': 86400000,
};

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function generateSimulatedKlines(basePrice: number, count: number, intervalMs: number): KlineData[] {
  const data: KlineData[] = [];
  let price = basePrice * (0.55 + Math.random() * 0.45);
  const now = Math.floor(Date.now() / 1000);

  for (let i = count; i > 0; i--) {
    const time = now - i * (intervalMs / 1000);
    const volatility = price * 0.018;
    const trend = Math.random() - 0.46;
    const open = price;
    const close = open + trend * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.4;
    const low = Math.min(open, close) - Math.random() * volatility * 0.4;
    const volume = Math.random() * 5000 + 200;

    data.push({
      time,
      open,
      high,
      low: Math.max(low, open * 0.0001),
      close: Math.max(close, open * 0.0001),
      volume,
    });
    price = data[data.length - 1].close;
  }

  if (data.length > 0 && data[data.length - 1].close > 0) {
    const ratio = basePrice / data[data.length - 1].close;
    for (const d of data) {
      d.open *= ratio;
      d.high *= ratio;
      d.low *= ratio;
      d.close *= ratio;
    }
  }

  return data;
}

function aggregateCandles(points: AlphaPricePoint[], intervalMs: number): KlineData[] {
  if (points.length === 0) return [];
  const buckets = new Map<number, KlineData>();

  for (const p of points) {
    const ts = new Date(p.timestamp).getTime();
    const bucketTs = Math.floor(ts / intervalMs) * intervalMs;
    const time = Math.floor(bucketTs / 1000);

    const existing = buckets.get(time);
    if (!existing) {
      buckets.set(time, {
        time,
        open: Number(p.open_price),
        high: Number(p.high_price),
        low: Number(p.low_price),
        close: Number(p.close_price),
        volume: Number(p.volume),
      });
    } else {
      existing.high = Math.max(existing.high, Number(p.high_price));
      existing.low = Math.min(existing.low, Number(p.low_price));
      existing.close = Number(p.close_price);
      existing.volume += Number(p.volume);
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

function calculateMA(data: KlineData[], period: number): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calculateEMA(data: KlineData[], period: number): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j].close;
      ema = sum / period;
    } else {
      ema = (data[i].close - ema) * k + ema;
    }
    result.push({ time: data[i].time, value: ema });
  }
  return result;
}

function calculateBOLL(data: KlineData[], period = 20) {
  const upper: { time: number; value: number }[] = [];
  const middle: { time: number; value: number }[] = [];
  const lower: { time: number; value: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    const ma = sum / period;
    let variance = 0;
    for (let j = 0; j < period; j++) variance += Math.pow(data[i - j].close - ma, 2);
    const std = Math.sqrt(variance / period);
    middle.push({ time: data[i].time, value: ma });
    upper.push({ time: data[i].time, value: ma + 2 * std });
    lower.push({ time: data[i].time, value: ma - 2 * std });
  }
  return { upper, middle, lower };
}

type IndicatorType = 'MA' | 'EMA' | 'BOLL' | null;

export default function AlphaTokenChart({ priceHistory, currentPrice, priceChange, onTimeframeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<ReturnType<typeof chartRef.current.addSeries> | null>(null);
  const volumeSeriesRef = useRef<ReturnType<typeof chartRef.current.addSeries> | null>(null);
  const extraSeriesRef = useRef<ReturnType<typeof chartRef.current.addSeries>[]>([]);
  const klineDataRef = useRef<KlineData[]>([]);
  const initializedRef = useRef(false);
  const prevTimeframeRef = useRef('5M');

  const [timeframe, setTimeframe] = useState('5M');
  const [indicator, setIndicator] = useState<IndicatorType>('MA');
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(currentPrice);

  useEffect(() => {
    if (prevPriceRef.current !== currentPrice && currentPrice > 0) {
      const dir = currentPrice > prevPriceRef.current ? 'up' : 'down';
      setPriceFlash(dir);
      const t = setTimeout(() => setPriceFlash(null), 700);
      prevPriceRef.current = currentPrice;
      return () => clearTimeout(t);
    }
  }, [currentPrice]);

  useEffect(() => {
    if (!containerRef.current) return;

    const tfChanged = prevTimeframeRef.current !== timeframe;
    prevTimeframeRef.current = timeframe;

    if (!initializedRef.current || tfChanged) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
        extraSeriesRef.current = [];
        initializedRef.current = false;
      }

      const intervalMs = TF_INTERVAL_MS[timeframe] || TF_INTERVAL_MS['5M'];

      let klineData: KlineData[] = [];

      if (priceHistory.length >= 10) {
        klineData = aggregateCandles(priceHistory, intervalMs);
      }

      if (klineData.length < 20 && currentPrice > 0) {
        const limit = timeframe === '1D' ? 365 : timeframe === '4H' ? 200 : 200;
        klineData = generateSimulatedKlines(currentPrice, limit, intervalMs);
      }

      if (klineData.length === 0) return;

      klineDataRef.current = klineData;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#848E9C',
          fontSize: 10,
        },
        grid: {
          vertLines: { color: 'rgba(43, 49, 57, 0.4)' },
          horzLines: { color: 'rgba(43, 49, 57, 0.4)' },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: '#F0B90B', width: 1, style: 2, labelBackgroundColor: '#F0B90B' },
          horzLine: { color: '#F0B90B', width: 1, style: 2, labelBackgroundColor: '#F0B90B' },
        },
        rightPriceScale: {
          borderColor: 'rgba(43, 49, 57, 0.5)',
          scaleMargins: { top: 0.06, bottom: 0.26 },
          minimumWidth: 90,
          visible: true,
          textColor: '#848E9C',
        },
        timeScale: {
          borderColor: 'rgba(43, 49, 57, 0.5)',
          timeVisible: true,
          secondsVisible: timeframe === '1M',
        },
        handleScroll: { vertTouchDrag: false },
        width: containerRef.current.clientWidth,
        height: 280,
      });

      chartRef.current = chart;

      const priceFmt = (price: number): string => {
        if (price === 0) return '0';
        if (price < 0.000001)  return price.toFixed(10);
        if (price < 0.0001)    return price.toFixed(8);
        if (price < 0.001)     return price.toFixed(7);
        if (price < 0.01)      return price.toFixed(6);
        if (price < 0.1)       return price.toFixed(5);
        if (price < 1)         return price.toFixed(4);
        if (price < 100)       return price.toFixed(2);
        return price.toFixed(0);
      };

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#0ECB81',
        downColor: '#F6465D',
        borderUpColor: '#0ECB81',
        borderDownColor: '#F6465D',
        wickUpColor: '#0ECB81',
        wickDownColor: '#F6465D',
        lastValueVisible: true,
        priceLineVisible: false,
        priceFormat: {
          type: 'custom',
          minMove: 0.000000001,
          formatter: priceFmt,
        },
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });

      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      initializedRef.current = true;

      const seenTimes = new Set<number>();
      const candleData = klineData
        .filter(d => {
          if (seenTimes.has(d.time)) return false;
          seenTimes.add(d.time);
          return d.open > 0 && d.close > 0;
        })
        .sort((a, b) => a.time - b.time);

      const seenVol = new Set<number>();
      const volData = klineData
        .filter(d => {
          if (seenVol.has(d.time)) return false;
          seenVol.add(d.time);
          return true;
        })
        .sort((a, b) => a.time - b.time)
        .map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(14,203,129,0.35)' : 'rgba(246,70,93,0.35)',
        }));

      candleSeries.setData(candleData as Parameters<typeof candleSeries.setData>[0]);
      volumeSeries.setData(volData as Parameters<typeof volumeSeries.setData>[0]);

      // Add indicators
      if (indicator === 'MA' && candleData.length >= 7) {
        const ma7 = calculateMA(candleData as KlineData[], 7);
        const ma25 = calculateMA(candleData as KlineData[], Math.min(25, candleData.length));
        const ma99 = calculateMA(candleData as KlineData[], Math.min(99, candleData.length));

        const s7 = chart.addSeries(LineSeries, { color: '#F0B90B', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        const s25 = chart.addSeries(LineSeries, { color: '#0ECB81', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        const s99 = chart.addSeries(LineSeries, { color: '#3861FB', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });

        if (ma7.length) s7.setData(ma7 as Parameters<typeof s7.setData>[0]);
        if (ma25.length) s25.setData(ma25 as Parameters<typeof s25.setData>[0]);
        if (ma99.length) s99.setData(ma99 as Parameters<typeof s99.setData>[0]);
        extraSeriesRef.current = [s7, s25, s99];
      } else if (indicator === 'EMA' && candleData.length >= 7) {
        const ema7 = calculateEMA(candleData as KlineData[], 7);
        const ema25 = calculateEMA(candleData as KlineData[], Math.min(25, candleData.length));

        const s7 = chart.addSeries(LineSeries, { color: '#E8831D', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        const s25 = chart.addSeries(LineSeries, { color: '#627EEA', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });

        if (ema7.length) s7.setData(ema7 as Parameters<typeof s7.setData>[0]);
        if (ema25.length) s25.setData(ema25 as Parameters<typeof s25.setData>[0]);
        extraSeriesRef.current = [s7, s25];
      } else if (indicator === 'BOLL' && candleData.length >= 20) {
        const { upper, middle, lower } = calculateBOLL(candleData as KlineData[], 20);

        const su = chart.addSeries(LineSeries, { color: '#F0B90B', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        const sm = chart.addSeries(LineSeries, { color: '#848E9C', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        const sl = chart.addSeries(LineSeries, { color: '#3861FB', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });

        if (upper.length) su.setData(upper as Parameters<typeof su.setData>[0]);
        if (middle.length) sm.setData(middle as Parameters<typeof sm.setData>[0]);
        if (lower.length) sl.setData(lower as Parameters<typeof sl.setData>[0]);
        extraSeriesRef.current = [su, sm, sl];
      }

      chart.timeScale().fitContent();

      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          candleSeriesRef.current = null;
          volumeSeriesRef.current = null;
          extraSeriesRef.current = [];
          initializedRef.current = false;
        }
      };
    } else {
      // Live update - just update last candle
      if (!candleSeriesRef.current || currentPrice <= 0) return;
      if (klineDataRef.current.length === 0) return;

      const last = klineDataRef.current[klineDataRef.current.length - 1];
      if (!last || last.close <= 0) return;
      if (currentPrice / last.close > 50 || currentPrice / last.close < 0.02) return;

      const now = Math.floor(Date.now() / 1000);
      const intervalMs = TF_INTERVAL_MS[timeframe] || TF_INTERVAL_MS['5M'];
      const bucketTime = Math.floor(now / (intervalMs / 1000)) * (intervalMs / 1000);

      try {
        candleSeriesRef.current.update({
          time: bucketTime as Parameters<typeof candleSeriesRef.current.update>[0]['time'],
          open: last.open,
          high: Math.max(last.high, currentPrice),
          low: Math.min(last.low, currentPrice),
          close: currentPrice,
        } as Parameters<typeof candleSeriesRef.current.update>[0]);
      } catch {
        // ignore update errors
      }
    }
  }, [priceHistory, timeframe, indicator, currentPrice]);

  const handleTfChange = (tf: string) => {
    setTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  const TF = ['1M', '5M', '15M', '1H', '4H', '1D'];
  const INDICATORS: { id: IndicatorType; label: string }[] = [
    { id: 'MA', label: 'MA' },
    { id: 'EMA', label: 'EMA' },
    { id: 'BOLL', label: 'BOLL' },
    { id: null, label: 'OFF' },
  ];

  const formatPrice = (p: number) => {
    if (p < 0.000001) return p.toFixed(10);
    if (p < 0.0001) return p.toFixed(8);
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    return p.toFixed(2);
  };

  return (
    <div className="bg-[#181A20] rounded-xl border border-[#2B3139]/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-2">
          <span className={`font-bold text-base transition-colors duration-300 ${
            priceFlash === 'up' ? 'text-[#0ECB81]' :
            priceFlash === 'down' ? 'text-[#F6465D]' : 'text-white'
          }`}>
            ${formatPrice(currentPrice)}
          </span>
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
            priceChange >= 0 ? 'text-[#0ECB81] bg-[#0ECB81]/10' : 'text-[#F6465D] bg-[#F6465D]/10'
          }`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
          {priceFlash && (
            <div className={`w-1.5 h-1.5 rounded-full animate-ping flex-shrink-0 ${priceFlash === 'up' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`} />
          )}
        </div>
        <div className="flex items-center gap-0.5 bg-[#0B0E11] rounded-lg p-0.5">
          {TF.map(tf => (
            <button
              key={tf}
              onClick={() => handleTfChange(tf)}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                timeframe === tf ? 'bg-[#F0B90B] text-[#0B0E11] shadow-sm' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="w-full" style={{ minHeight: 280 }}>
        {!initializedRef.current && currentPrice <= 0 && (
          <div className="flex items-center justify-center h-[280px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-gray-500 text-xs">Loading chart...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 px-3 pb-2 pt-1 border-t border-[#2B3139]/30">
        <span className="text-[9px] text-gray-600 mr-1">Indicator:</span>
        {INDICATORS.map(ind => (
          <button
            key={String(ind.id)}
            onClick={() => setIndicator(ind.id)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
              indicator === ind.id
                ? 'bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]/30'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {ind.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {indicator === 'MA' && (
            <>
              <span className="text-[9px] font-bold" style={{ color: '#F0B90B' }}>MA7</span>
              <span className="text-[9px] font-bold" style={{ color: '#0ECB81' }}>MA25</span>
              <span className="text-[9px] font-bold" style={{ color: '#3861FB' }}>MA99</span>
            </>
          )}
          {indicator === 'EMA' && (
            <>
              <span className="text-[9px] font-bold" style={{ color: '#E8831D' }}>EMA7</span>
              <span className="text-[9px] font-bold" style={{ color: '#627EEA' }}>EMA25</span>
            </>
          )}
          {indicator === 'BOLL' && (
            <>
              <span className="text-[9px] font-bold" style={{ color: '#F0B90B' }}>Upper</span>
              <span className="text-[9px] font-bold" style={{ color: '#848E9C' }}>Mid</span>
              <span className="text-[9px] font-bold" style={{ color: '#3861FB' }}>Lower</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

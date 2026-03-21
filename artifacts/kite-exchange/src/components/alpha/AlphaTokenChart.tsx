import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { AlphaPricePoint } from '../../types/alpha';

interface Props {
  priceHistory: AlphaPricePoint[];
  currentPrice: number;
  priceChange: number;
  onTimeframeChange?: (tf: string) => void;
}

const TF_INTERVAL_MS: Record<string, number> = {
  '1M': 60000, '5M': 300000, '15M': 900000, '1H': 3600000, '4H': 14400000, '1D': 86400000
};

function aggregateCandles(points: AlphaPricePoint[], intervalMs: number) {
  if (points.length === 0) return [];
  const buckets = new Map<number, AlphaPricePoint>();

  for (const p of points) {
    const ts = new Date(p.timestamp).getTime();
    const bucketTs = Math.floor(ts / intervalMs) * intervalMs;
    const existing = buckets.get(bucketTs);
    if (!existing) {
      buckets.set(bucketTs, {
        timestamp: new Date(bucketTs).toISOString(),
        open_price: Number(p.open_price),
        high_price: Number(p.high_price),
        low_price: Number(p.low_price),
        close_price: Number(p.close_price),
        volume: Number(p.volume),
        price: Number(p.close_price),
        market_cap: Number(p.market_cap),
      });
    } else {
      existing.high_price = Math.max(existing.high_price, Number(p.high_price));
      existing.low_price = Math.min(existing.low_price, Number(p.low_price));
      existing.close_price = Number(p.close_price);
      existing.price = Number(p.close_price);
      existing.volume += Number(p.volume);
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export default function AlphaTokenChart({ priceHistory, currentPrice, priceChange, onTimeframeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<ReturnType<typeof chartRef.current.addSeries> | null>(null);
  const volumeSeriesRef = useRef<ReturnType<typeof chartRef.current.addSeries> | null>(null);
  const [timeframe, setTimeframe] = useState('5M');
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(currentPrice);
  const initializedRef = useRef(false);
  const prevTimeframeRef = useRef(timeframe);

  useEffect(() => {
    if (prevPriceRef.current !== currentPrice) {
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
      }

      if (priceHistory.length === 0) return;

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
          minimumWidth: 60,
        },
        timeScale: {
          borderColor: 'rgba(43, 49, 57, 0.5)',
          timeVisible: true,
          secondsVisible: timeframe === '1M',
        },
        handleScroll: { vertTouchDrag: false },
        width: containerRef.current.clientWidth,
        height: 260,
      });

      chartRef.current = chart;

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#0ECB81',
        downColor: '#F6465D',
        borderUpColor: '#0ECB81',
        borderDownColor: '#F6465D',
        wickUpColor: '#0ECB81',
        wickDownColor: '#F6465D',
        lastValueVisible: false,
        priceLineVisible: false,
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        lastValueVisible: false,
        priceLineVisible: false,
      });

      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });

      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      initializedRef.current = true;

      const intervalMs = TF_INTERVAL_MS[timeframe] || TF_INTERVAL_MS['5M'];
      const aggregated = aggregateCandles(priceHistory, intervalMs);

      const seenTimes = new Set<number>();
      const candleData = aggregated
        .map(p => ({
          time: Math.floor(new Date(p.timestamp).getTime() / 1000) as number,
          open: Number(p.open_price),
          high: Number(p.high_price),
          low: Number(p.low_price),
          close: Number(p.close_price),
        }))
        .filter(c => {
          if (seenTimes.has(c.time)) return false;
          seenTimes.add(c.time);
          return c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0;
        })
        .sort((a, b) => (a.time as number) - (b.time as number));

      const seenTimesVol = new Set<number>();
      const volumeData = aggregated
        .map(p => ({
          time: Math.floor(new Date(p.timestamp).getTime() / 1000) as number,
          value: Number(p.volume),
          color: Number(p.close_price) >= Number(p.open_price) ? 'rgba(14, 203, 129, 0.35)' : 'rgba(246, 70, 93, 0.35)',
        }))
        .filter(v => {
          if (seenTimesVol.has(v.time)) return false;
          seenTimesVol.add(v.time);
          return true;
        })
        .sort((a, b) => (a.time as number) - (b.time as number));

      if (candleData.length > 0) {
        candleSeries.setData(candleData as Parameters<typeof candleSeries.setData>[0]);
        volumeSeries.setData(volumeData as Parameters<typeof volumeSeries.setData>[0]);
        chart.timeScale().fitContent();
      }

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
          initializedRef.current = false;
        }
      };
    } else {
      if (!candleSeriesRef.current || !volumeSeriesRef.current || priceHistory.length === 0) return;

      const intervalMs = TF_INTERVAL_MS[timeframe] || TF_INTERVAL_MS['5M'];
      const aggregated = aggregateCandles(priceHistory, intervalMs);
      if (aggregated.length === 0) return;

      const lastPoint = aggregated[aggregated.length - 1];
      const lastTime = Math.floor(new Date(lastPoint.timestamp).getTime() / 1000);

      candleSeriesRef.current.update({
        time: lastTime as Parameters<typeof candleSeriesRef.current.update>[0]['time'],
        open: Number(lastPoint.open_price),
        high: Number(lastPoint.high_price),
        low: Number(lastPoint.low_price),
        close: Number(lastPoint.close_price),
      } as Parameters<typeof candleSeriesRef.current.update>[0]);

      volumeSeriesRef.current.update({
        time: lastTime as Parameters<typeof volumeSeriesRef.current.update>[0]['time'],
        value: Number(lastPoint.volume),
        color: Number(lastPoint.close_price) >= Number(lastPoint.open_price) ? 'rgba(14, 203, 129, 0.35)' : 'rgba(246, 70, 93, 0.35)',
      } as Parameters<typeof volumeSeriesRef.current.update>[0]);
    }
  }, [priceHistory, timeframe]);

  const handleTfChange = (tf: string) => {
    setTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  const TF = ['1M', '5M', '15M', '1H', '4H', '1D'];

  return (
    <div className="bg-[#181A20] rounded-xl border border-[#2B3139]/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2">
          <span className={`font-bold text-base transition-colors duration-300 ${
            priceFlash === 'up' ? 'text-[#0ECB81]' :
            priceFlash === 'down' ? 'text-[#F6465D]' : 'text-white'
          }`}>
            ${currentPrice < 0.01 ? currentPrice.toFixed(8) : currentPrice.toFixed(4)}
          </span>
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
            priceChange >= 0 ? 'text-[#0ECB81] bg-[#0ECB81]/10' : 'text-[#F6465D] bg-[#F6465D]/10'
          }`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
          {priceFlash && (
            <div className={`w-1.5 h-1.5 rounded-full animate-ping ${priceFlash === 'up' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`} />
          )}
        </div>
        <div className="flex items-center gap-0.5 bg-[#0B0E11] rounded-lg p-0.5">
          {TF.map(tf => (
            <button
              key={tf}
              onClick={() => handleTfChange(tf)}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                timeframe === tf
                  ? 'bg-[#F0B90B] text-[#0B0E11] shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ minHeight: 260 }}>
        {priceHistory.length === 0 && (
          <div className="flex items-center justify-center h-[260px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-gray-500 text-xs">Loading chart...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

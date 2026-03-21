import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType } from 'lightweight-charts';
import { fetchBinanceKlines } from '../lib/binance';
import { BNCPriceManager } from '../lib/bnc-price';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PayAIPriceManager } from '../lib/payai-price';
import { SGPPriceManager } from '../lib/sgp-price';
import { PowerAIPriceManager } from '../lib/powerai-price';
import { SZNPPriceManager } from '../lib/sznp-price';
import { PunchPriceManager } from '../lib/punch-price';
import { useExchangeMode } from '../lib/exchange-mode';
import { Maximize2, Snowflake } from 'lucide-react';

const CHART_INDEP_PRICES: Record<string, () => number> = {
  BNC: () => BNCPriceManager.getInstance().getPrice() || 7.12,
  EQ: () => EarnQuestPriceManager.getInstance().getPrice() || 0.055,
  PAYAI: () => PayAIPriceManager.getInstance().getPrice() || 0.003,
  SGP: () => SGPPriceManager.getInstance().getPrice() || 0.01,
  POWERAI: () => PowerAIPriceManager.getInstance().getPrice() || 0.0004,
  SZNP: () => SZNPPriceManager.getInstance().getPrice() || 0.00013,
  PUNCH: () => PunchPriceManager.getInstance().getPrice() || 0.005,
};

interface Props {
  symbol: string;
  binanceSymbol: string;
  timeframe: string;
  currentPrice: number;
  change24h: number;
}

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type IndicatorType = 'MA' | 'EMA' | 'BOLL' | 'SAR' | 'AVL' | 'SUPER' | 'VOL';

const CHART_HEIGHT = 420;

const timeframeToBinance: Record<string, string> = {
  'Time': '1m', '15m': '15m', '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w', '1M': '1M',
};

const timeframeToLimit: Record<string, number> = {
  'Time': 200, '15m': 200, '1h': 200, '4h': 200, '1D': 365, '1W': 200, '1M': 120,
};

const INTERVAL_MS: Record<string, number> = {
  '1m': 60000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000, '1w': 604800000, '1M': 2592000000,
};

function getPriceDecimals(price: number): number {
  if (price >= 10000) return 2;
  if (price >= 1000) return 2;
  if (price >= 100) return 2;
  if (price >= 10) return 3;
  if (price >= 1) return 4;
  if (price >= 0.1) return 5;
  if (price >= 0.01) return 6;
  if (price >= 0.001) return 7;
  return 8;
}

function formatChartPrice(value: number): string {
  return value.toFixed(getPriceDecimals(value));
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
  const multiplier = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j].close;
      ema = sum / period;
    } else {
      ema = (data[i].close - ema) * multiplier + ema;
    }
    result.push({ time: data[i].time, value: ema });
  }
  return result;
}

function calculateBOLL(data: KlineData[], period: number = 20) {
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

function generateSimulatedKlines(basePrice: number, count: number, intervalMs: number): KlineData[] {
  const data: KlineData[] = [];
  let price = basePrice * (0.97 + Math.random() * 0.04);
  const now = Math.floor(Date.now() / 1000);
  for (let i = count; i > 0; i--) {
    const time = now - i * (intervalMs / 1000);
    const volatility = price * 0.003;
    const open = price;
    const trend = Math.random() - 0.49;
    const close = open + trend * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;
    const volume = Math.random() * 1000 + 100;
    data.push({ time, open, high, low, close: Math.max(close, low * 1.0001), volume });
    price = data[data.length - 1].close;
  }
  if (data.length > 0) {
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

function BinanceLightweightChart({ symbol, binanceSymbol, timeframe, currentPrice }: Props) {
  const { isFrozen } = useExchangeMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const maSeriesRefs = useRef<any[]>([]);
  const klineDataRef = useRef<KlineData[]>([]);
  const currentPriceRef = useRef(currentPrice);
  const prevSymbolRef = useRef(symbol);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>('MA');
  const [maValues, setMaValues] = useState({ ma7: '--', ma25: '--', ma99: '--' });

  const prevLoadedPriceRef = useRef(0);

  if (prevSymbolRef.current !== symbol) {
    prevSymbolRef.current = symbol;
    klineDataRef.current = [];
    currentPriceRef.current = 0;
    prevLoadedPriceRef.current = 0;
  }
  currentPriceRef.current = currentPrice;

  const interval = timeframeToBinance[timeframe] || '1d';
  const limit = timeframeToLimit[timeframe] || 200;

  const clearIndicatorSeries = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const s of maSeriesRefs.current) {
      try { chart.removeSeries(s); } catch {}
    }
    maSeriesRefs.current = [];
  }, []);

  const drawIndicators = useCallback((data: KlineData[], indicator: IndicatorType) => {
    const chart = chartRef.current;
    if (!chart || data.length < 7) return;
    clearIndicatorSeries();

    const addLine = (lineData: { time: number; value: number }[], color: string, width: number = 1.5) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: width,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData(lineData.map((d: { time: number; value: number }) => ({ time: d.time as any, value: d.value })));
      maSeriesRefs.current.push(series);
      return lineData;
    };

    if (indicator === 'MA' || indicator === 'EMA') {
      const calcFn = indicator === 'MA' ? calculateMA : calculateEMA;
      const d7 = calcFn(data, 7);
      const d25 = calcFn(data, 25);
      const d99 = calcFn(data, 99);
      addLine(d7, '#F0B90B', 1.5);
      addLine(d25, '#F722C5', 1.5);
      addLine(d99, '#BE6ADF', 1.5);
      setMaValues({
        ma7: d7.length > 0 ? formatChartPrice(d7[d7.length - 1].value) : '--',
        ma25: d25.length > 0 ? formatChartPrice(d25[d25.length - 1].value) : '--',
        ma99: d99.length > 0 ? formatChartPrice(d99[d99.length - 1].value) : '--',
      });
    } else if (indicator === 'BOLL') {
      const boll = calculateBOLL(data);
      addLine(boll.upper, '#F0B90B', 1.5);
      addLine(boll.middle, '#F722C5', 1.5);
      addLine(boll.lower, '#BE6ADF', 1.5);
      setMaValues({
        ma7: boll.upper.length > 0 ? formatChartPrice(boll.upper[boll.upper.length - 1].value) : '--',
        ma25: boll.middle.length > 0 ? formatChartPrice(boll.middle[boll.middle.length - 1].value) : '--',
        ma99: boll.lower.length > 0 ? formatChartPrice(boll.lower[boll.lower.length - 1].value) : '--',
      });
    } else {
      setMaValues({ ma7: '--', ma25: '--', ma99: '--' });
    }
  }, [clearIndicatorSeries]);

  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(false);

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    maSeriesRefs.current = [];

    const container = containerRef.current;
    const width = container.clientWidth || container.offsetWidth || 400;

    const decimals = getPriceDecimals(currentPriceRef.current || 1);

    const chart = createChart(container, {
      width,
      height: CHART_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#848E9C',
        fontFamily: "'SF Pro Text', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(43, 49, 57, 0.6)' },
        horzLines: { color: 'rgba(43, 49, 57, 0.6)' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: 'rgba(240, 185, 11, 0.4)', width: 1, style: 2, labelBackgroundColor: '#2B3139' },
        horzLine: { color: 'rgba(240, 185, 11, 0.4)', width: 1, style: 2, labelBackgroundColor: '#2B3139' },
      },
      rightPriceScale: {
        borderColor: '#2B3139',
        scaleMargins: { top: 0.08, bottom: 0.2 },
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: '#2B3139',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 10,
        minBarSpacing: 4,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderUpColor: '#0ECB81',
      borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      priceFormat: {
        type: 'price',
        precision: decimals,
        minMove: Math.pow(10, -decimals),
      },
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      drawTicks: false,
    });

    const loadData = async () => {
      try {
        let klineData: KlineData[] = [];
        const intMs = INTERVAL_MS[interval] || 86400000;

        const indepGetter = CHART_INDEP_PRICES[symbol];
        if (indepGetter) {
          const price = indepGetter();
          klineData = generateSimulatedKlines(price > 0 ? price : 1, limit, intMs);
        } else {
          klineData = await fetchBinanceKlines(binanceSymbol, interval, limit);

          if (klineData.length === 0) {
            const fallbackPrice = currentPriceRef.current > 0 ? currentPriceRef.current : 1;
            klineData = generateSimulatedKlines(fallbackPrice, limit, intMs);
          }
        }

        if (!chartRef.current) return;

        if (klineData.length > 0) {
          klineDataRef.current = klineData;

          const refPrice = klineData[klineData.length - 1].close;
          const dec = getPriceDecimals(refPrice);
          candleSeries.applyOptions({
            priceFormat: {
              type: 'price',
              precision: dec,
              minMove: Math.pow(10, -dec),
            },
          });

          candleSeries.setData(
            klineData.map(k => ({ time: k.time as any, open: k.open, high: k.high, low: k.low, close: k.close }))
          );

          volumeSeries.setData(
            klineData.map(k => ({
              time: k.time as any,
              value: k.volume,
              color: k.close >= k.open ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)',
            }))
          );

          drawIndicators(klineData, activeIndicator);
          chart.timeScale().fitContent();
          setLoading(false);
        } else {
          setError(true);
          setLoading(false);
        }
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    loadData();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) chartRef.current.applyOptions({ width: w });
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [binanceSymbol, interval, symbol, limit]);

  useEffect(() => {
    if (chartRef.current && klineDataRef.current.length > 0) {
      drawIndicators(klineDataRef.current, activeIndicator);
    }
  }, [activeIndicator, drawIndicators]);

  useEffect(() => {
    const isIndep = !!CHART_INDEP_PRICES[symbol];
    if (!isIndep) return;
    if (!currentPrice || currentPrice <= 0) return;
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (prevLoadedPriceRef.current > 0) return;

    prevLoadedPriceRef.current = currentPrice;
    const intMs = INTERVAL_MS[timeframeToBinance[timeframe] || '1d'] || 86400000;
    const lim = timeframeToLimit[timeframe] || 200;
    const klineData = generateSimulatedKlines(currentPrice, lim, intMs);
    klineDataRef.current = klineData;

    const dec = getPriceDecimals(currentPrice);
    candleSeriesRef.current.applyOptions({
      priceFormat: { type: 'price', precision: dec, minMove: Math.pow(10, -dec) },
    });
    candleSeriesRef.current.setData(
      klineData.map(k => ({ time: k.time as any, open: k.open, high: k.high, low: k.low, close: k.close }))
    );
    volumeSeriesRef.current.setData(
      klineData.map(k => ({
        time: k.time as any,
        value: k.volume,
        color: k.close >= k.open ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)',
      }))
    );
    drawIndicators(klineData, activeIndicator);
    if (chartRef.current) chartRef.current.timeScale().fitContent();
    setLoading(false);
  }, [currentPrice, symbol, timeframe, activeIndicator, drawIndicators]);

  useEffect(() => {
    if (isFrozen) return;
    if (!candleSeriesRef.current || !currentPrice || currentPrice <= 0) return;
    if (klineDataRef.current.length === 0) return;
    const lastKline = klineDataRef.current[klineDataRef.current.length - 1];
    if (lastKline && lastKline.close > 0 && (currentPrice / lastKline.close > 50 || currentPrice / lastKline.close < 0.02)) return;
    const now = Math.floor(Date.now() / 1000);
    candleSeriesRef.current.update({
      time: now as any,
      open: currentPrice,
      high: currentPrice * 1.0002,
      low: currentPrice * 0.9998,
      close: currentPrice,
    });
  }, [currentPrice, symbol, isFrozen]);

  const indicators: { key: IndicatorType; label: string }[] = [
    { key: 'MA', label: 'MA' },
    { key: 'EMA', label: 'EMA' },
    { key: 'BOLL', label: 'BOLL' },
    { key: 'SAR', label: 'SAR' },
    { key: 'AVL', label: 'AVL' },
    { key: 'SUPER', label: 'SUPER' },
    { key: 'VOL', label: 'VOL' },
  ];

  const showMaBar = activeIndicator === 'MA' || activeIndicator === 'EMA' || activeIndicator === 'BOLL';
  const labels = activeIndicator === 'BOLL'
    ? ['UP', 'MID', 'DN']
    : activeIndicator === 'EMA'
    ? ['EMA(7)', 'EMA(25)', 'EMA(99)']
    : ['MA(7)', 'MA(25)', 'MA(99)'];

  return (
    <div className="w-full bg-[#0B0E11]">
      {showMaBar && (
        <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] bg-[#0B0E11]">
          <span className="text-[#F0B90B] font-medium">{labels[0]}: {maValues.ma7}</span>
          <span className="text-[#F722C5] font-medium">{labels[1]}: {maValues.ma25}</span>
          <span className="text-[#BE6ADF] font-medium">{labels[2]}: {maValues.ma99}</span>
        </div>
      )}

      <div className="relative" style={{ height: CHART_HEIGHT }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E11] z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#5E6673] text-xs">Loading chart...</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E11] z-20">
            <span className="text-[#5E6673] text-xs">Chart data unavailable</span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1, opacity: 0.06 }}>
          <div className="flex items-center gap-2">
            <img src="/BASONCE_LOGO_SON_BITEN.png" alt="" className="w-10 h-10" />
            <span className="text-white text-2xl font-bold tracking-wider">BASONCE</span>
          </div>
        </div>

        <div ref={containerRef} style={{ width: '100%', height: CHART_HEIGHT }} />

        <button className="absolute bottom-3 left-3 z-10 w-7 h-7 flex items-center justify-center rounded bg-[#2B3139]/60 hover:bg-[#2B3139] transition-colors">
          <Maximize2 size={14} className="text-[#848E9C]" />
        </button>

        {isFrozen && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#0d1f2d]/90 border border-blue-500/30 rounded-lg px-2.5 py-1.5 pointer-events-none">
            <Snowflake size={11} className="text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-blue-300 text-[10px] font-medium">FROZEN</span>
          </div>
        )}
      </div>

      <div className="flex items-center bg-[#0B0E11] border-t border-[#2B3139]/50 px-1 overflow-x-auto scrollbar-none">
        {indicators.map(ind => (
          <button
            key={ind.key}
            onClick={() => setActiveIndicator(ind.key)}
            className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap transition-colors ${
              activeIndicator === ind.key ? 'text-[#F0B90B]' : 'text-[#5E6673] hover:text-[#848E9C]'
            }`}
          >
            {ind.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(BinanceLightweightChart);

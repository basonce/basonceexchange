import { useEffect, useRef, memo } from 'react';

interface Props {
  symbol: string;
  binanceSymbol: string;
  timeframe: string;
  currentPrice: number;
  change24h: number;
}

const timeframeMap: Record<string, string> = {
  'Time': '1',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
};

const TRADFI_TV_SYMBOLS: Record<string, string> = {
  XAUUSDT: 'TVC:GOLD',
  XAGUSDT: 'TVC:SILVER',
  XPTUSDT: 'TVC:PLATINUM',
  XPDUSDT: 'TVC:PALLADIUM',
  COPPERUSDT: 'TVC:COPPER',
  TSLAUSDT: 'NASDAQ:TSLA',
  AAPLUSDT: 'NASDAQ:AAPL',
  AMZNUSDT: 'NASDAQ:AMZN',
  MSTRUSDT: 'NASDAQ:MSTR',
  HOODUSDT: 'NASDAQ:HOOD',
  INTCUSDT: 'NASDAQ:INTC',
  CRCLUSDT: 'NYSE:CRCL',
  COINUSDT: 'NASDAQ:COIN',
  PLTRUSDT: 'NASDAQ:PLTR',
  NVIDAUSDT: 'NASDAQ:NVDA',
  GOOGLUSDT: 'NASDAQ:GOOGL',
  METAUSDT: 'NASDAQ:META',
  MSFTUSDT: 'NASDAQ:MSFT',
};

const INDEP_TV_SYMBOLS: Record<string, string> = {
  BNCUSDT: 'BINANCE:BNBUSDT',
  EQUSDT: 'BINANCE:ETHUSDT',
  PAYAIUSDT: 'BINANCE:BTCUSDT',
  SGPUSDT: 'BINANCE:SOLUSDT',
  POWERAIUSDT: 'BINANCE:BTCUSDT',
  SZNPUSDT: 'BINANCE:BTCUSDT',
  PUNCHUSDT: 'BINANCE:BTCUSDT',
};

declare global {
  interface Window {
    TradingView: any;
  }
}

function getTVSymbol(symbol: string, binanceSymbol: string): string {
  if (TRADFI_TV_SYMBOLS[symbol]) return TRADFI_TV_SYMBOLS[symbol];
  if (INDEP_TV_SYMBOLS[symbol]) return INDEP_TV_SYMBOLS[symbol];
  return `BINANCE:${binanceSymbol}`;
}

function RealCandlestickChart({ symbol, binanceSymbol, timeframe }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const containerIdRef = useRef(`tradingview_${symbol}_${Date.now()}`);

  useEffect(() => {
    const containerId = containerIdRef.current;

    const initWidget = () => {
      if (!containerRef.current || !window.TradingView) return;

      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch {}
        widgetRef.current = null;
      }

      const tvSymbol = getTVSymbol(symbol, binanceSymbol);
      const tvInterval = timeframeMap[timeframe] || 'D';

      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: tvInterval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0B0E11',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: containerId,
        backgroundColor: '#0B0E11',
        gridColor: '#1E2329',
        studies: [
          'MASimple@tv-basicstudies',
        ],
        overrides: {
          'mainSeriesProperties.candleStyle.upColor': '#0ECB81',
          'mainSeriesProperties.candleStyle.downColor': '#F6465D',
          'mainSeriesProperties.candleStyle.borderUpColor': '#0ECB81',
          'mainSeriesProperties.candleStyle.borderDownColor': '#F6465D',
          'mainSeriesProperties.candleStyle.wickUpColor': '#0ECB81',
          'mainSeriesProperties.candleStyle.wickDownColor': '#F6465D',
          'paneProperties.background': '#0B0E11',
          'paneProperties.backgroundType': 'solid',
          'paneProperties.vertGridProperties.color': '#1E2329',
          'paneProperties.horzGridProperties.color': '#1E2329',
          'scalesProperties.textColor': '#848E9C',
          'scalesProperties.backgroundColor': '#0B0E11',
        },
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'create_volume_indicator_by_default',
          'header_symbol_search',
          'symbol_search_hot_key',
          'display_market_status',
          'header_compare',
          'header_undo_redo',
          'header_screenshot',
          'header_saveload',
        ],
        enabled_features: [
          'hide_left_toolbar_by_default',
        ],
        loading_screen: {
          backgroundColor: '#0B0E11',
          foregroundColor: '#F0B90B',
        },
      });
    };

    if (window.TradingView) {
      initWidget();
    } else {
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', initWidget);
      } else {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = initWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch {}
        widgetRef.current = null;
      }
    };
  }, [symbol, binanceSymbol, timeframe]);

  return (
    <div className="w-full h-[500px] bg-[#0B0E11]">
      <div
        id={containerIdRef.current}
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
}

export default memo(RealCandlestickChart);

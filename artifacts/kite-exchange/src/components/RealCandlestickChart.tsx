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
  '1M': 'M',
};

declare global {
  interface Window {
    TradingView: any;
  }
}

function RealCandlestickChart({ symbol, binanceSymbol, timeframe }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (containerRef.current && window.TradingView) {
        if (widgetRef.current) {
          widgetRef.current.remove();
        }

        const tvSymbol = `BINANCE:${binanceSymbol}`;
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
          container_id: containerRef.current.id,
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
      }
    };
    document.head.appendChild(script);

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.log('Widget cleanup:', e);
        }
      }
    };
  }, [binanceSymbol, timeframe, symbol]);

  return (
    <div className="w-full h-[500px] bg-[#0B0E11]">
      <div
        id={`tradingview_${binanceSymbol}_${timeframe}`}
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
}

export default memo(RealCandlestickChart);

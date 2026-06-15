import { useExchangeMode } from '../lib/exchange-mode';
import { Snowflake, Activity } from 'lucide-react';

export default function ExchangeModeBanner() {
  const { isFrozen, frozenAt, isTransitioning } = useExchangeMode();

  if (!isFrozen && !isTransitioning) return null;

  const timeStr = frozenAt
    ? frozenAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  if (isTransitioning && !isFrozen) {
    return (
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-50 pointer-events-none">
        <div className="mx-3 mt-2 bg-emerald-500/90 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg border border-emerald-400/30 animate-pulse">
          <Activity size={14} className="text-white flex-shrink-0" />
          <span className="text-white text-xs font-medium">Canli fiyatlara donuluyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-50 pointer-events-none">
      <div className="mx-3 mt-2 bg-[#1a2a3a]/95 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg border border-blue-500/30">
        <Snowflake size={14} className="text-blue-400 flex-shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
        <span className="text-blue-300 text-xs font-medium">Fiyatlar donduruldu</span>
        {timeStr && (
          <>
            <span className="text-[#4a5568] text-xs">|</span>
            <span className="text-[#8a9bb0] text-xs">{timeStr}</span>
          </>
        )}
        <div className="ml-auto flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

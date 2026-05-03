import { useState, useEffect } from 'react';
import { Share2, Pencil, AlertTriangle } from 'lucide-react';
import TPSLModal from './TPSLModal';
import LeverageModal from './LeverageModal';
import MarginAdjustModal from './MarginAdjustModal';
import ClosePositionModal from './ClosePositionModal';
import SharePositionCard from './SharePositionCard';
import { calculateMarginRatio } from '../lib/futures-calculator';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PriceCache } from '../lib/price-cache';
import { formatPrice } from '../lib/format-utils';
import { supabase } from '../lib/supabase';

function PnlSignalBars({ pnlPercentage }: { pnlPercentage: number }) {
  const abs = Math.abs(pnlPercentage);
  const isPositive = pnlPercentage >= 0;
  let activeCount = 0;
  if (abs >= 75) activeCount = 4;
  else if (abs >= 40) activeCount = 3;
  else if (abs >= 15) activeCount = 2;
  else if (abs > 0) activeCount = 1;
  const activeColor = isPositive ? '#0ECB81' : '#F6465D';
  const dimColor = isPositive ? '#0ECB8130' : '#F6465D30';

  return (
    <svg width="26" height="16" viewBox="0 0 26 16" fill="none">
      {[0, 1, 2, 3].map((i) => {
        const x = i * 6.5 + 1;
        const color = i < activeCount ? activeColor : dimColor;
        return (
          <g key={i}>
            {/* vertical bar */}
            <rect x={x} y={0} width={3} height={11} rx={1.5} fill={color} />
            {/* dot */}
            <rect x={x} y={13} width={3} height={3} rx={1.5} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

interface Position {
  id: string;
  symbol: string;
  side: string;
  position_size: number;
  entry_price: number;
  leverage: number;
  margin_mode?: string;
  margin: number;
  liquidation_price: number;
  unrealized_pnl: number;
  mark_price?: number;
  maintenance_margin_rate?: number;
  created_at?: string;
}

interface FuturesPositionCardProps {
  position: Position;
  onClose: (positionId: string) => void;
  onClosePosition?: (positionId: string, closeType: 'market' | 'limit', price?: number, percentage?: number) => void;
  onUpdateLeverage: (positionId: string, leverage: number, mode: 'cross' | 'isolated') => void;
  currentPrice?: number;
  currentSymbol?: string;
  availableBalance?: number;
  onMarginAdjusted?: () => void;
}

/** Strip BDEX_ prefix for display. e.g. BDEX_RAVEUSDT → RAVEUSDT */
function displaySymbol(raw: string): string {
  return raw.startsWith('BDEX_') ? raw.slice(5) : raw;
}

/** Extract base token name from symbol. e.g. RAVEUSDT → RAVE */
function baseToken(sym: string): string {
  const s = displaySymbol(sym);
  if (s.endsWith('USDT')) return s.slice(0, -4);
  if (s.endsWith('BUSD')) return s.slice(0, -4);
  if (s.endsWith('BTC'))  return s.slice(0, -3);
  return s;
}

export default function FuturesPositionCard({
  position, onClose, onClosePosition, onUpdateLeverage,
  currentPrice, currentSymbol, availableBalance = 0, onMarginAdjusted,
}: FuturesPositionCardProps) {
  const [showTPSL, setShowTPSL] = useState(false);
  const [showLeverage, setShowLeverage] = useState(false);
  const [showMarginAdjust, setShowMarginAdjust] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [localMarkPrice, setLocalMarkPrice] = useState(0);
  const [tpPrice, setTpPrice] = useState<number | null>(null);
  const [slPrice, setSlPrice] = useState<number | null>(null);

  const isCurrentSymbol = currentSymbol && position.symbol === currentSymbol;

  // Load TP/SL from DB
  const loadTPSL = async () => {
    try {
      const { data } = await supabase
        .from('futures_tpsl_orders')
        .select('type, trigger_price')
        .eq('position_id', position.id)
        .eq('status', 'active');
      if (data) {
        const tp = data.find(r => r.type === 'tp');
        const sl = data.find(r => r.type === 'sl');
        setTpPrice(tp ? tp.trigger_price : null);
        setSlPrice(sl ? sl.trigger_price : null);
      }
    } catch {}
  };

  useEffect(() => {
    loadTPSL();
  }, [position.id]);

  useEffect(() => {
    if (isCurrentSymbol) return;
    const updatePrice = async () => {
      if (position.symbol === 'EQUSDT') {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          );
          const { data } = await sb.from('earnquest_price').select('current_price').eq('id', 1).maybeSingle();
          if (data?.current_price) {
            const p = parseFloat(data.current_price);
            if (p > 0) { setLocalMarkPrice(p); return; }
          }
        } catch {}
        const eqPrice = EarnQuestPriceManager.getInstance().getPrice();
        if (eqPrice > 0) setLocalMarkPrice(eqPrice);
      } else {
        const cached = PriceCache.getInstance().get(position.symbol);
        if (cached && cached.price > 0) setLocalMarkPrice(cached.price);
      }
    };
    updatePrice();
    const interval = setInterval(updatePrice, 3000);
    return () => clearInterval(interval);
  }, [position.symbol, isCurrentSymbol]);

  const positionSide = (position.side || '').toLowerCase();
  const entryPrice = position.entry_price;
  const positionSize = position.position_size;
  const margin = position.margin;
  const quantity = positionSize / entryPrice;

  let markPrice: number;
  if (isCurrentSymbol && currentPrice && currentPrice > 0) {
    markPrice = currentPrice;
  } else if (localMarkPrice > 0) {
    markPrice = localMarkPrice;
  } else if (position.mark_price && position.mark_price > 0) {
    const ratio = position.mark_price / entryPrice;
    markPrice = (ratio > 0.01 && ratio < 100) ? position.mark_price : entryPrice;
  } else {
    markPrice = entryPrice;
  }

  const currentPnL = positionSide === 'long'
    ? (markPrice - entryPrice) * quantity
    : (entryPrice - markPrice) * quantity;

  const pnlPercentage = margin > 0 ? (currentPnL / margin) * 100 : 0;
  const isProfitable = currentPnL >= 0;
  const marginMode = (position.margin_mode || 'cross').toLowerCase();
  const maintenanceMarginRate = position.maintenance_margin_rate || 0.004;

  const marginRatio = calculateMarginRatio(
    markPrice, entryPrice, positionSize, margin,
    maintenanceMarginRate, positionSide === 'long' ? 'LONG' : 'SHORT'
  );
  const isHighRisk = marginRatio >= 80;

  const sym = displaySymbol(position.symbol);
  const base = baseToken(position.symbol);
  const pnlColor = isProfitable ? 'text-[#0ECB81]' : 'text-[#F6465D]';
  const pnlSign = isProfitable ? '+' : '';

  return (
    <>
      <div className="bg-[#181A20] rounded-xl p-4 mb-3">

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* L/S badge */}
            <div className={`w-7 h-7 rounded flex items-center justify-center text-sm font-bold ${positionSide === 'long' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'}`}>
              {positionSide === 'long' ? 'L' : 'S'}
            </div>
            {/* Symbol */}
            <span className="text-white text-[15px] font-bold">{sym}</span>
            {/* Perp tag */}
            <span className="text-[#848E9C] text-[12px] border border-[#2B3139] rounded px-1.5 py-0.5">Perp</span>
            {/* Cross/Isolated + Leverage */}
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${marginMode === 'cross' ? 'bg-[#F0B90B] text-black' : 'bg-[#0ECB81] text-black'}`}>
              {marginMode === 'cross' ? 'Cross' : 'Isolated'} {position.leverage}x
            </span>
            {/* Signal bars */}
            <PnlSignalBars pnlPercentage={pnlPercentage} />
          </div>
          <button onClick={() => setShowShareCard(true)} className="text-[#848E9C] hover:text-white">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* PNL + ROI */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[#848E9C] text-[12px] mb-1">PNL (USDT)</div>
            <div className={`text-3xl font-bold leading-tight ${pnlColor}`}>
              {pnlSign}{currentPnL.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#848E9C] text-[12px] mb-1">ROI</div>
            <div className={`text-3xl font-bold leading-tight ${pnlColor}`}>
              {pnlSign}{pnlPercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Size / Margin / Margin Ratio */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <div className="text-[#848E9C] text-[12px] mb-1">Size ({base})</div>
            <div className="text-white text-[16px] font-semibold">
              {quantity >= 1
                ? Math.floor(quantity).toLocaleString('en-US')
                : quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}
            </div>
          </div>
          <div>
            <div className="text-[#848E9C] text-[12px] mb-1">Margin (USDT)</div>
            <div className="text-white text-[16px] font-semibold">
              {margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#848E9C] text-[12px] mb-1">Margin Ratio</div>
            <div className="flex items-center justify-end gap-1">
              <div className={`text-[16px] font-semibold ${marginRatio < 50 ? 'text-[#0ECB81]' : marginRatio < 80 ? 'text-[#F0B90B]' : 'text-[#F6465D]'}`}>
                {marginRatio.toFixed(2)}%
              </div>
              {isHighRisk && <AlertTriangle className="w-3 h-3 text-[#F6465D]" />}
            </div>
          </div>
        </div>

        {/* Entry / Mark / Liq Price */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <div className="text-[#848E9C] text-[12px] mb-1">Entry Price (USDT)</div>
            <div className="text-white text-[16px] font-semibold">{formatPrice(entryPrice)}</div>
          </div>
          <div>
            <div className="text-[#848E9C] text-[12px] mb-1">Mark Price (USDT)</div>
            <div className="text-white text-[16px] font-semibold">{formatPrice(markPrice)}</div>
          </div>
          <div className="text-right">
            <div className="text-[#848E9C] text-[12px] mb-1">Liq. Price (USDT)</div>
            <div className="text-[#F0B90B] text-[16px] font-semibold">{formatPrice(position.liquidation_price)}</div>
          </div>
        </div>

        {/* Position TP/SL row */}
        <div className="flex items-center gap-2 mb-4 text-[12px]">
          <span className="text-[#848E9C]">Position TP/SL</span>
          <span className="text-[#0ECB81]">{tpPrice != null ? formatPrice(tpPrice) : '--'}</span>
          <span className="text-[#848E9C]">/</span>
          <span className="text-[#F6465D]">{slPrice != null ? formatPrice(slPrice) : '--'}</span>
          <button onClick={() => setShowTPSL(true)} className="text-[#848E9C] hover:text-white ml-1">
            <Pencil className="w-3 h-3" />
          </button>
        </div>

        {/* Action buttons */}
        <div className={`grid ${marginMode === 'isolated' ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
          <button
            onClick={() => setShowLeverage(true)}
            className="py-2.5 bg-[#2B3139] hover:bg-[#363D47] text-[13px] font-semibold rounded-lg transition-colors"
          >
            Leverage
          </button>
          <button
            onClick={() => setShowTPSL(true)}
            className="py-2.5 bg-[#2B3139] hover:bg-[#363D47] text-[13px] font-semibold rounded-lg transition-colors"
          >
            TP/SL
          </button>
          {marginMode === 'isolated' && (
            <button
              onClick={() => setShowMarginAdjust(true)}
              className="py-2.5 bg-[#2B3139] hover:bg-[#363D47] text-[13px] font-semibold rounded-lg transition-colors"
            >
              Margin
            </button>
          )}
          <button
            onClick={() => setShowCloseModal(true)}
            className="py-2.5 bg-[#F6465D] hover:bg-[#F6465D]/90 text-[13px] font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {showShareCard && (
        <SharePositionCard
          isOpen={showShareCard}
          onClose={() => setShowShareCard(false)}
          position={position}
          currentPrice={markPrice}
          pnlAmount={currentPnL}
          pnlPercentage={pnlPercentage}
        />
      )}

      {showCloseModal && (
        <ClosePositionModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          position={position}
          currentPrice={markPrice}
          onConfirm={(closeType, price, percentage) => {
            setShowCloseModal(false);
            if (onClosePosition) {
              onClosePosition(position.id, closeType, price, percentage);
            } else {
              onClose(position.id);
            }
          }}
        />
      )}

      {showTPSL && (
        <TPSLModal
          positionId={position.id}
          currentPrice={markPrice}
          side={positionSide}
          onClose={() => setShowTPSL(false)}
          onSave={(tp, sl) => {
            if (tp !== undefined) setTpPrice(tp);
            if (sl !== undefined) setSlPrice(sl);
            setShowTPSL(false);
            loadTPSL();
          }}
        />
      )}

      {showLeverage && (
        <LeverageModal
          isOpen={showLeverage}
          onClose={() => setShowLeverage(false)}
          currentLeverage={position.leverage}
          onLeverageChange={() => {}}
          marginMode={marginMode as 'cross' | 'isolated'}
          onMarginModeChange={() => {}}
        />
      )}

      {showMarginAdjust && (
        <MarginAdjustModal
          isOpen={showMarginAdjust}
          onClose={() => setShowMarginAdjust(false)}
          position={position}
          availableBalance={availableBalance}
          onSuccess={() => {
            if (onMarginAdjusted) onMarginAdjusted();
            setShowMarginAdjust(false);
          }}
        />
      )}
    </>
  );
}

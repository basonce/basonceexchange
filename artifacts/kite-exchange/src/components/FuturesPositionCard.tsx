import { useState, useEffect } from 'react';
import { Share2, MoreVertical, AlertTriangle } from 'lucide-react';
import TPSLModal from './TPSLModal';
import LeverageModal from './LeverageModal';
import MarginAdjustModal from './MarginAdjustModal';
import ClosePositionModal from './ClosePositionModal';
import SharePositionCard from './SharePositionCard';
import { calculateMarginRatio } from '../lib/futures-calculator';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PriceCache } from '../lib/price-cache';
import { formatPrice } from '../lib/format-utils';

function PnlSignalBars({ pnlPercentage }: { pnlPercentage: number }) {
  const abs = Math.abs(pnlPercentage);
  const isPositive = pnlPercentage >= 0;

  let activeCount = 0;
  if (abs >= 50) activeCount = 3;
  else if (abs >= 15) activeCount = 2;
  else if (abs > 0) activeCount = 1;

  const activeColor = isPositive ? '#0ECB81' : '#F6465D';

  return (
    <div className="flex items-end gap-[2px]" style={{ height: '14px' }}>
      {[1, 2, 3].map((bar) => {
        const isActive = bar <= activeCount;
        const barHeight = bar === 1 ? 5 : bar === 2 ? 9 : 13;
        return (
          <div
            key={bar}
            style={{
              width: '3px',
              height: `${barHeight}px`,
              borderRadius: '1px',
              backgroundColor: isActive ? activeColor : `${activeColor}22`,
              transition: 'background-color 0.4s ease',
            }}
          />
        );
      })}
    </div>
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

export default function FuturesPositionCard({ position, onClose, onClosePosition, onUpdateLeverage, currentPrice, currentSymbol, availableBalance = 0, onMarginAdjusted }: FuturesPositionCardProps) {
  const [showTPSL, setShowTPSL] = useState(false);
  const [showLeverage, setShowLeverage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMarginAdjust, setShowMarginAdjust] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [localMarkPrice, setLocalMarkPrice] = useState(0);

  const isCurrentSymbol = currentSymbol && position.symbol === currentSymbol;

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
    markPrice,
    entryPrice,
    positionSize,
    margin,
    maintenanceMarginRate,
    positionSide === 'long' ? 'LONG' : 'SHORT'
  );

  const isHighRisk = marginRatio >= 80;
  const isMediumRisk = marginRatio >= 50 && marginRatio < 80;
  const distanceToLiq = positionSide === 'long'
    ? ((markPrice - position.liquidation_price) / markPrice) * 100
    : ((position.liquidation_price - markPrice) / markPrice) * 100;

  return (
    <>
      <div className="bg-[#181A20] rounded-lg p-3 mb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {position.symbol.includes('EQ') && (
              <img src="/earnquest-logo-icon-2.png" alt="EQ" className="w-6 h-6 rounded-full" />
            )}
            <div className={`w-6 h-6 rounded flex items-center justify-center ${ positionSide === 'long' ? 'bg-[#0ECB81]' : 'bg-[#F6465D]' }`}>
              <span className="text-xs font-bold">
                {positionSide === 'long' ? 'L' : 'S'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{position.symbol}</span>
                <span className="text-gray-400">Perp</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${ marginMode === 'cross' ? 'bg-[#F0B90B] text-black' : 'bg-[#0ECB81] text-black' }`}>
                  {marginMode === 'cross' ? 'Cross' : 'Isolated'} {position.leverage}x
                </span>
                <PnlSignalBars pnlPercentage={pnlPercentage} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareCard(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[10px] mb-0.5">Unrealized PNL (USDT)</div>
            <div className={`text-2xl font-bold ${isProfitable ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isProfitable ? '+' : ''}{currentPnL.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] mb-0.5">ROI</div>
            <div className={`text-lg font-semibold ${isProfitable ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isProfitable ? '+' : ''}{pnlPercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[10px] mb-1">Size (USDT)</div>
            <div className="text-sm font-medium">
              {positionSize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-[10px] mb-1">Margin (USDT)</div>
            <div className="text-sm font-medium">
              {margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-[10px] mb-1">Margin Ratio</div>
            <div className="flex items-center gap-1">
              <div className={`text-sm font-semibold ${ marginRatio < 50 ? 'text-[#0ECB81]' : marginRatio < 80 ? 'text-[#F0B90B]' : 'text-[#F6465D]' }`}>
                {marginRatio.toFixed(2)}%
              </div>
              {isHighRisk && <AlertTriangle className="w-3 h-3 text-[#F6465D]" />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="text-[10px] mb-1">Entry Price (USDT)</div>
            <div className="text-sm font-medium">{formatPrice(entryPrice)}</div>
          </div>
          <div>
            <div className="text-[10px] mb-1">Mark Price (USDT)</div>
            <div className="text-sm font-medium">{formatPrice(markPrice)}</div>
          </div>
          <div>
            <div className="text-[10px] mb-1">Liq. Price (USDT)</div>
            <div className="text-sm font-medium text-[#F0B90B]">{formatPrice(position.liquidation_price)}</div>
          </div>
        </div>

        <div className={`grid ${marginMode === 'isolated' ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
          <button
            onClick={() => setShowLeverage(true)}
            className="py-2 bg-[#2B3139] hover:bg-[#363D47] text-xs font-medium rounded transition-colors"
          >
            Leverage
          </button>
          <button
            onClick={() => setShowTPSL(true)}
            className="py-2 bg-[#2B3139] hover:bg-[#363D47] text-xs font-medium rounded transition-colors"
          >
            TP/SL
          </button>
          {marginMode === 'isolated' && (
            <button
              onClick={() => setShowMarginAdjust(true)}
              className="py-2 bg-[#2B3139] hover:bg-[#363D47] text-xs font-medium rounded transition-colors"
            >
              Margin
            </button>
          )}
          <button
            onClick={() => setShowCloseModal(true)}
            className="py-2 bg-[#F6465D] hover:bg-[#F6465D]/90 text-xs font-medium rounded transition-colors"
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
          onSave={() => setShowTPSL(false)}
        />
      )}

      {showLeverage && (
        <LeverageModal
          isOpen={showLeverage}
          onClose={() => setShowLeverage(false)}
          currentLeverage={position.leverage}
          onLeverageChange={(lev) => {}}
          marginMode={marginMode as 'cross' | 'isolated'}
          onMarginModeChange={(mode) => {}}
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

      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowMenu(false)}>
          <div className="absolute right-4 top-20 bg-[#181A20] rounded-lg shadow-xl min-w-[150px]">
            <button className="w-full px-4 py-2.5 text-sm hover:bg-[#2B3139] transition-colors">
              Add Margin
            </button>
            <button className="w-full px-4 py-2.5 text-sm hover:bg-[#2B3139] transition-colors">
              Switch Mode
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowCloseModal(true);
              }}
              className="w-full px-4 py-2.5 text-sm hover:bg-[#2B3139] transition-colors"
            >
              Close Position
            </button>
          </div>
        </div>
      )}
    </>
  );
}

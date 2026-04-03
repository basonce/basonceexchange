import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, StopCircle, Loader2,
  Users, History, Activity, ChevronDown, ChevronUp,
  Zap, RefreshCw, Shield, Target,
  AlertTriangle, CheckCircle, ArrowDownToLine, Wallet,
  TrendingDown as TrendDown, Flame
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EarnQuestPriceManager } from '../../lib/earnquest-price';
import { BNCPriceManager } from '../../lib/bnc-price';

interface ActiveCopy {
  id: string;
  trader_id: string;
  investment_amount: number;
  current_value: number;
  pnl: number;
  roi: number;
  status: string;
  created_at: string;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
  copy_traders: {
    name: string;
    avatar_url: string;
    coin_symbol: string;
    strategy_type: string;
    roi_30d: number;
    win_rate: number;
    runtime_days?: number;
    total_pnl?: number;
  };
}

interface CopyPosition {
  id: string;
  copy_trade_id: string;
  coin_symbol: string;
  direction: string;
  leverage: number;
  entry_price: number;
  current_price: number;
  size_usdt: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  status: string;
  opened_at: string;
}

interface HistoryRecord {
  id: string;
  trader_name: string;
  trader_avatar: string;
  coin_symbol: string;
  strategy_type: string;
  investment_amount: number;
  final_value: number;
  final_pnl: number;
  final_roi: number;
  duration_hours: number;
  status: string;
  started_at: string;
  ended_at: string;
}

interface WithdrawResult {
  amount: number;
  pnl: number;
  roi: number;
  traderName: string;
}

interface Props {
  onClose: () => void;
  onBrowseTraders: () => void;
}

// Coin symbol -> Binance ticker symbol
const BINANCE_TICKER: Record<string, string> = {
  BTC: 'BTCUSDT',
  DOGE: 'DOGEUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
  SOL: 'SOLUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  AVAX: 'AVAXUSDT',
  DOT: 'DOTUSDT',
  MATIC: 'MATICUSDT',
  LINK: 'LINKUSDT',
  UNI: 'UNIUSDT',
  LTC: 'LTCUSDT',
  BCH: 'BCHUSDT',
  ATOM: 'ATOMUSDT',
  FIL: 'FILUSDT',
  TRX: 'TRXUSDT',
  NEAR: 'NEARUSDT',
  APT: 'APTUSDT',
  OP: 'OPUSDT',
  ARB: 'ARBUSDT',
  SUI: 'SUIUSDT',
  INJ: 'INJUSDT',
  TON: 'TONUSDT',
  PEPE: 'PEPEUSDT',
  WIF: 'WIFUSDT',
  FLOKI: 'FLOKIUSDT',
  BONK: 'BONKUSDT',
};

// Cache for live prices: symbol -> {price, timestamp}
// TTL: 2s for Binance coins, EQ/BNC fetched fresh each tick from their price managers
const priceCache: Record<string, { price: number; ts: number }> = {};

async function fetchLivePrice(symbol: string): Promise<number | null> {
  const sym = symbol.toUpperCase();

  // EQ and BNC use their own price managers (not on Binance)
  if (sym === 'EQ') {
    const p = EarnQuestPriceManager.getInstance().getPrice();
    return p > 0 ? p : null;
  }
  if (sym === 'BNC') {
    const p = BNCPriceManager.getInstance().getPrice();
    return p > 0 ? p : null;
  }

  const ticker = BINANCE_TICKER[sym];
  if (!ticker) return null;

  // Very short cache (2s) so price updates are visible every 3-4s interval
  const cached = priceCache[sym];
  if (cached && Date.now() - cached.ts < 2000) return cached.price;

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/binance-proxy?endpoint=ticker24hr&symbol=${ticker}`,
      { headers: { Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data?.lastPrice ?? data?.price ?? data?.c ?? '0');
      if (price > 0) {
        priceCache[sym] = { price, ts: Date.now() };
        return price;
      }
    }
  } catch { /* fall through */ }

  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${ticker}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const d = await r.json();
      const p = parseFloat(d.price ?? '0');
      if (p > 0) {
        priceCache[sym] = { price: p, ts: Date.now() };
        return p;
      }
    }
  } catch { /* ignore */ }

  if (cached) return cached.price;
  return null;
}

// Per-position virtual entry: locked in on FIRST price fetch, never changes.
// This means PNL = (livePrice - lockedEntry) / lockedEntry * leverage * size
// As price moves up/down, PNL moves accordingly - real, live fluctuation.
const virtualEntryCache: Record<string, number> = {};

// Entry offset: how much in-the-money the position starts (so it begins with small profit)
const ENTRY_OFFSET_PCT: Record<string, number> = {
  BTC: 0.55, ETH: 0.60, BNB: 0.65, SOL: 0.70, XRP: 0.55,
  DOGE: 0.75, ADA: 0.60, AVAX: 0.65, DOT: 0.60, LINK: 0.60,
  UNI: 0.65, LTC: 0.60, BCH: 0.58, ATOM: 0.62, TRX: 0.55,
  NEAR: 0.70, APT: 0.72, OP: 0.68, ARB: 0.70, SUI: 0.75,
  INJ: 0.68, PEPE: 0.80, WIF: 0.80, FLOKI: 0.80, BONK: 0.80,
  EQ: 0.65, BNC: 0.60,
};

function getEntryOffsetPct(symbol: string): number {
  return ENTRY_OFFSET_PCT[symbol.toUpperCase()] ?? 0.60;
}

function calcPositionPnl(
  pos: CopyPosition,
  livePrice: number
): { pnl: number; pct: number; pricePct: number; virtualEntry: number } {
  if (!livePrice || livePrice <= 0) return { pnl: 0, pct: 0, pricePct: 0, virtualEntry: pos.entry_price };

  const isLong = pos.direction === 'long' || pos.direction === 'LONG';
  const offsetPct = getEntryOffsetPct(pos.coin_symbol);

  // Lock the virtual entry once on first real price - never recalculate
  if (!virtualEntryCache[pos.id]) {
    virtualEntryCache[pos.id] = isLong
      ? livePrice * (1 - offsetPct / 100)
      : livePrice * (1 + offsetPct / 100);
  }
  const virtualEntry = virtualEntryCache[pos.id];

  // PNL fluctuates with every live price tick
  const pricePct = ((livePrice - virtualEntry) / virtualEntry) * 100;
  const leveragedPct = pricePct * pos.leverage * (isLong ? 1 : -1);
  const pnl = (pos.size_usdt * leveragedPct) / 100;
  return { pnl, pct: leveragedPct, pricePct, virtualEntry };
}

function formatDuration(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

function formatPrice(price: number, symbol: string): string {
  if (!price) return '--';
  if (price >= 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function MiniSparkline({ roi }: { roi: number }) {
  const isPositive = roi >= 0;
  const points = [0, roi * 0.08, roi * 0.2, roi * 0.35, roi * 0.48, roi * 0.6, roi * 0.75, roi * 0.88, roi];
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0.01);
  const range = max - min || 1;
  const w = 72;
  const h = 32;
  const pathPoints = points.map((v, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - ((v - min) / range) * h * 0.85 - h * 0.075,
  }));
  const linePath = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = linePath + ` L${w},${h} L0,${h} Z`;
  const color = isPositive ? '#0ECB81' : '#F6465D';
  const gradId = `sg-${isPositive ? 'p' : 'n'}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Real-time position row with live price & leverage PNL
function PositionRow({ pos }: { pos: CopyPosition }) {
  const [livePrice, setLivePrice] = useState<number>(0);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    let mounted = true;

    const update = async () => {
      const p = await fetchLivePrice(pos.coin_symbol);
      if (p && mounted) {
        setLivePrice(prev => {
          if (p !== prev && prev > 0) {
            setFlash(p > prev ? 'up' : 'down');
            setTimeout(() => setFlash(null), 500);
          }
          return p;
        });
      }
    };

    update();
    const iv = setInterval(update, 3000);
    return () => { mounted = false; clearInterval(iv); };
  }, [pos.coin_symbol]);

  const isLong = pos.direction === 'long' || pos.direction === 'LONG';
  const { pnl, pct, pricePct, virtualEntry } = calcPositionPnl(pos, livePrice);
  const isPnlPos = pnl >= 0;
  const pnlColor = isPnlPos ? 'text-[#0ECB81]' : 'text-[#F6465D]';

  return (
    <div className="bg-[#0B0E11] rounded-xl p-3 mb-2 border border-[#2B3139]/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            isLong ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'
          }`}>
            {isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FCD535]/15 text-[#FCD535]">
            {pos.leverage}x
          </span>
          <span className="text-[#EAECEF] text-[13px] font-semibold">{pos.coin_symbol}/USDT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
          <span className="text-[#0ECB81] text-[10px]">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-[#1E2329] rounded-lg p-2">
          <div className="text-[#5E6673] text-[9px] mb-0.5">Entry Price</div>
          <div className="text-[#848E9C] text-[11px] font-medium">
            {livePrice > 0 ? formatPrice(virtualEntry, pos.coin_symbol) : '--'}
          </div>
        </div>
        <div className="bg-[#1E2329] rounded-lg p-2">
          <div className="text-[#5E6673] text-[9px] mb-0.5">Current Price</div>
          <div className={`text-[11px] font-bold transition-colors duration-300 ${
            flash === 'up' ? 'text-[#0ECB81]' : flash === 'down' ? 'text-[#F6465D]' : 'text-[#0ECB81]'
          }`}>
            {livePrice > 0 ? formatPrice(livePrice, pos.coin_symbol) : '--'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#2B3139]/30">
        <div>
          <div className="text-[#5E6673] text-[9px] mb-0.5">Allocation</div>
          <div className="text-[#EAECEF] text-[11px] font-semibold">${pos.size_usdt.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-[#5E6673] text-[9px] mb-0.5">Price Change</div>
          <div className="text-[#0ECB81] text-[11px] font-bold">
            +{pricePct.toFixed(3)}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#5E6673] text-[9px] mb-0.5">Unrealized PNL</div>
          <div className={`text-[12px] font-bold ${pnlColor}`}>
            {isPnlPos ? '+' : ''}${pnl.toFixed(2)}
            <span className={`text-[9px] ml-1 ${pnlColor}`}>({isPnlPos ? '+' : ''}{pct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WithdrawSuccessModal({ result, onClose }: { result: WithdrawResult; onClose: () => void }) {
  const isProfit = result.pnl >= 0;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center">
      <div
        className="w-full max-w-md bg-[#181A20] rounded-t-3xl p-6"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center mb-5">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
            isProfit ? 'bg-[#0ECB81]/15' : 'bg-[#F6465D]/15'
          }`}>
            {isProfit ? (
              <CheckCircle className="w-10 h-10 text-[#0ECB81]" />
            ) : (
              <ArrowDownToLine className="w-10 h-10 text-[#F6465D]" />
            )}
          </div>
        </div>
        <div className="text-center mb-6">
          <div className="text-[#EAECEF] text-[18px] font-bold mb-1">Copy Trade Stopped</div>
          <div className="text-[#848E9C] text-[13px]">Funds returned to your wallet</div>
        </div>

        <div className="bg-[#0B0E11] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#2B3139]/40">
            <div className="text-[#848E9C] text-[12px]">Trader</div>
            <div className="text-[#EAECEF] text-[13px] font-semibold">{result.traderName}</div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[#848E9C] text-[12px]">Returned to Balance</div>
            <div className="text-[#EAECEF] text-[16px] font-bold">${result.amount.toFixed(2)} USDT</div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[#848E9C] text-[12px]">Realized PNL</div>
            <div className={`text-[15px] font-bold ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isProfit ? '+' : ''}${result.pnl.toFixed(2)} USDT
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[#848E9C] text-[12px]">ROI</div>
            <div className={`text-[14px] font-bold ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isProfit ? '+' : ''}{result.roi.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-xl p-3 mb-5">
          <Wallet className="w-4 h-4 text-[#0ECB81] flex-shrink-0" />
          <span className="text-[#0ECB81] text-[12px]">${result.amount.toFixed(2)} USDT added to your spot wallet</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl text-[15px] font-bold text-[#181A20]"
          style={{ background: 'linear-gradient(135deg, #F0B90B, #F8D12F)' }}
        >
          Done
        </button>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

function StopConfirmSheet({
  copy,
  liveValue,
  livePnl,
  liveRoi,
  onConfirm,
  onCancel,
  stopping,
}: {
  copy: ActiveCopy;
  liveValue: number;
  livePnl: number;
  liveRoi: number;
  onConfirm: () => void;
  onCancel: () => void;
  stopping: boolean;
}) {
  const isProfit = livePnl >= 0;
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-end justify-center">
      <div
        className="w-full max-w-md bg-[#181A20] rounded-t-3xl p-5"
        style={{ animation: 'slideUp 0.3s ease-out', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-1 bg-[#2B3139] rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-[#F6465D]/15 flex items-center justify-center">
            <StopCircle className="w-6 h-6 text-[#F6465D]" />
          </div>
          <div>
            <div className="text-[#EAECEF] text-[16px] font-bold">Stop Copying?</div>
            <div className="text-[#848E9C] text-[12px]">{copy.copy_traders.name}</div>
          </div>
        </div>

        <div className="bg-[#0B0E11] rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#848E9C] text-[12px]">You invested</span>
            <span className="text-[#EAECEF] text-[13px] font-semibold">${copy.investment_amount.toLocaleString()} USDT</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#848E9C] text-[12px]">Current value</span>
            <span className={`text-[14px] font-bold ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>${liveValue.toFixed(2)} USDT</span>
          </div>
          <div className="h-px bg-[#2B3139]/40" />
          <div className="flex justify-between items-center">
            <span className="text-[#848E9C] text-[12px]">PNL</span>
            <span className={`text-[15px] font-bold ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {isProfit ? '+' : ''}${livePnl.toFixed(2)} ({isProfit ? '+' : ''}{liveRoi.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-[#FCD535]/8 border border-[#FCD535]/20 rounded-xl p-3 mb-5">
          <AlertTriangle className="w-4 h-4 text-[#FCD535] flex-shrink-0 mt-0.5" />
          <span className="text-[#848E9C] text-[11px] leading-relaxed">
            All open positions will be closed and <span className="text-[#EAECEF] font-semibold">${liveValue.toFixed(2)} USDT</span> will be returned to your spot wallet.
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={stopping}
            className="flex-1 py-3.5 bg-[#2B3139] text-[#EAECEF] rounded-2xl text-[14px] font-semibold disabled:opacity-50"
          >
            Keep Copying
          </button>
          <button
            onClick={onConfirm}
            disabled={stopping}
            className="flex-1 py-3.5 bg-[#F6465D] text-white rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {stopping ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                Withdraw
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

// Deterministik seed (her trade için farklı ama tutarlı salınım)
function seededSin(seed: number, t: number, freq: number, phase = 0) {
  return Math.sin(t * freq + seed * 2.3 + phase);
}

function calcSimPnl(investment: number, roiTarget: number, createdAt: string, tradeId: string): number {
  const seed = tradeId.charCodeAt(0) * 0.137 + tradeId.charCodeAt(2) * 0.073;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageSec = ageMs / 1000;

  // Trend: 0 → hedef %  (sigmoid benzeri yaklaşım, 45 dk'da %75'e ulaşır)
  const halflife = 45 * 60; // 45 dakika
  const trend = roiTarget * (1 - Math.exp(-ageSec / halflife));

  // Gerçekçi çoklu-frekans gürültü
  const t = ageSec;
  const noise =
    seededSin(seed, t, 0.005, 0) * 2.5 +      // yavaş dalga
    seededSin(seed, t, 0.018, 1.2) * 1.2 +     // orta dalga
    seededSin(seed, t, 0.06,  2.7) * 0.5 +     // hızlı dalga
    seededSin(seed, t, 0.14,  0.4) * 0.25;     // mikro titreşim

  // Başlangıçta küçük düşüş efekti (ilk 90 sn)
  const dip = ageSec < 90 ? -roiTarget * 0.15 * Math.exp(-ageSec / 25) : 0;

  const finalPct = Math.max(-2, trend + noise * 0.6 + dip);
  return (finalPct / 100) * investment;
}

// ActiveCopyCard uses real-time position PNL (leverage-based) summed across all positions
function ActiveCopyCard({
  copy,
  onStop,
  stopping,
}: {
  copy: ActiveCopy;
  onStop: (id: string, pnl: number, roi: number, value: number) => void;
  stopping: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [positions, setPositions] = useState<CopyPosition[]>([]);
  const [loadingPos, setLoadingPos] = useState(false);
  const [showStopSheet, setShowStopSheet] = useState(false);
  const [simPnl, setSimPnl] = useState(0);

  // Live prices keyed by coin symbol
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  const trader = copy.copy_traders;

  // Load positions once on mount (or expand)
  const loadPositions = useCallback(async () => {
    if (positions.length > 0) return;
    setLoadingPos(true);
    try {
      const { data } = await supabase
        .from('copy_trade_positions')
        .select('*')
        .eq('copy_trade_id', copy.id)
        .eq('status', 'open')
        .order('opened_at');
      if (data) setPositions(data as CopyPosition[]);
    } finally {
      setLoadingPos(false);
    }
  }, [copy.id, positions.length]);

  // Load positions immediately to get live PNL even when collapsed
  useEffect(() => {
    loadPositions();
  }, []);

  // PnL simülasyonu — gerçek pozisyon yokken çalışır
  useEffect(() => {
    if (positions.length > 0) return;
    const roiTarget = Math.min((trader.roi_30d ?? 80) / 20, 15); // max %15 hedef
    const tick = () => {
      setSimPnl(calcSimPnl(copy.investment_amount, roiTarget, copy.created_at, copy.id));
    };
    tick();
    const iv = setInterval(tick, 2500);
    return () => clearInterval(iv);
  }, [positions.length, copy.investment_amount, copy.created_at, copy.id, trader.roi_30d]);

  // Poll prices for all open positions
  useEffect(() => {
    if (positions.length === 0) return;
    let mounted = true;

    const updatePrices = async () => {
      const symbols = [...new Set(positions.map(p => p.coin_symbol))];
      const updates: Record<string, number> = {};
      await Promise.all(
        symbols.map(async (sym) => {
          const p = await fetchLivePrice(sym);
          if (p) updates[sym] = p;
        })
      );
      if (mounted && Object.keys(updates).length > 0) {
        setLivePrices(prev => ({ ...prev, ...updates }));
      }
    };

    updatePrices();
    const iv = setInterval(updatePrices, 3000);
    return () => { mounted = false; clearInterval(iv); };
  }, [positions]);

  // Calculate total live PNL across all positions using real prices
  const totalPositionPnl = positions.reduce((sum, pos) => {
    const price = livePrices[pos.coin_symbol];
    if (!price || price <= 0) return sum;
    const { pnl } = calcPositionPnl(pos, price);
    return sum + pnl;
  }, 0);

  const hasPosPrice = positions.length === 0 || positions.some(p => (livePrices[p.coin_symbol] ?? 0) > 0);
  // Gerçek pozisyon varsa gerçek PnL, yoksa simülasyon
  const effectivePnl = positions.length > 0 ? totalPositionPnl : simPnl;
  const liveValue = copy.investment_amount + effectivePnl;
  const liveRoi = copy.investment_amount > 0 ? (effectivePnl / copy.investment_amount) * 100 : 0;
  const isPositive = effectivePnl >= 0;
  const pnlColor = isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]';

  const handleExpand = () => {
    if (!expanded) loadPositions();
    setExpanded(v => !v);
  };

  const dailyRate = (trader.roi_30d ?? 80) / 30;

  return (
    <>
      <div className="bg-[#1E2329] rounded-2xl mx-3 mb-3 overflow-hidden shadow-xl border border-[#2B3139]/50">
        <div className="p-4 cursor-pointer" onClick={handleExpand}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={trader.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#2B3139]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`;
                  }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#0ECB81] rounded-full border-2 border-[#1E2329]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#EAECEF] text-[14px] font-bold">{trader.name}</span>
                  <Shield className="w-3 h-3 text-[#FCD535]" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[#848E9C] text-[10px]">{trader.strategy_type}</span>
                  <span className="text-[#2B3139]">·</span>
                  <span className="text-[#FCD535] text-[10px] font-medium">{trader.coin_symbol}/USDT</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0ECB81]/10 text-[#0ECB81] font-semibold">
                    +{trader.roi_30d}% 30D
                  </span>
                  <span className="text-[10px] text-[#848E9C]">Win {trader.win_rate}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-[18px] font-bold leading-tight ${pnlColor}`}>
                  {isPositive ? '+' : ''}{liveRoi.toFixed(3)}%
                </div>
                <div className={`text-[12px] font-semibold ${pnlColor}`}>
                  {isPositive ? '+' : ''}${Math.abs(effectivePnl).toFixed(2)}
                </div>
              </div>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-[#848E9C] flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#848E9C] flex-shrink-0" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center">
              <div className="text-[#848E9C] text-[8px] mb-0.5">Invested</div>
              <div className="text-[#EAECEF] text-[11px] font-bold">${copy.investment_amount.toLocaleString()}</div>
            </div>
            <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center">
              <div className="text-[#848E9C] text-[8px] mb-0.5">Value</div>
              <div className={`text-[11px] font-bold ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                ${liveValue.toFixed(2)}
              </div>
            </div>
            <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center">
              <div className="text-[#848E9C] text-[8px] mb-0.5">Daily</div>
              <div className="text-[#0ECB81] text-[11px] font-bold">+{dailyRate.toFixed(2)}%</div>
            </div>
            <div className="bg-[#0B0E11] rounded-xl p-2.5 text-center">
              <div className="text-[#848E9C] text-[8px] mb-0.5">Running</div>
              <div className="text-[#EAECEF] text-[11px] font-bold">{formatDuration(copy.created_at)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {copy.stop_loss_pct && (
                <div className="flex items-center gap-1">
                  <TrendDown className="w-3 h-3 text-[#F6465D]" />
                  <span className="text-[#848E9C] text-[10px]">SL {copy.stop_loss_pct}%</span>
                </div>
              )}
              {copy.take_profit_pct && (
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-[#0ECB81]" />
                  <span className="text-[#848E9C] text-[10px]">TP {copy.take_profit_pct}%</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#FCD535]" />
                <span className="text-[#848E9C] text-[10px]">{formatDuration(copy.created_at)} active</span>
              </div>
            </div>
            <MiniSparkline roi={liveRoi} />
          </div>
        </div>

        {expanded && (
          <div className="border-t border-[#2B3139]/50">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#FCD535]" />
                  <span className="text-[#EAECEF] text-[12px] font-bold">Open Positions</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
                  <span className="text-[#0ECB81] text-[10px] font-medium">Live</span>
                </div>
              </div>

              {loadingPos ? (
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="w-5 h-5 text-[#FCD535] animate-spin" />
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-4 bg-[#0B0E11] rounded-xl mb-3">
                  <Activity className="w-6 h-6 text-[#5E6673] mx-auto mb-2" />
                  <div className="text-[#848E9C] text-[11px]">Waiting for new positions</div>
                  <div className="text-[#5E6673] text-[10px] mt-0.5">Trader will open positions shortly</div>
                </div>
              ) : (
                positions.map(pos => (
                  <PositionRow key={pos.id} pos={pos} />
                ))
              )}

              <div className="mt-1 grid grid-cols-2 gap-2">
                <div className="bg-[#0B0E11] rounded-xl p-3 text-center">
                  <div className="text-[#848E9C] text-[9px] mb-0.5">Projected Monthly</div>
                  <div className="text-[#0ECB81] text-[13px] font-bold">+${(copy.investment_amount * trader.roi_30d / 100).toFixed(2)}</div>
                </div>
                <div className="bg-[#0B0E11] rounded-xl p-3 text-center">
                  <div className="text-[#848E9C] text-[9px] mb-0.5">Win Rate</div>
                  <div className="text-[#FCD535] text-[13px] font-bold">{trader.win_rate}%</div>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setShowStopSheet(true); }}
                className="w-full mt-3 py-3.5 border border-[#F6465D]/40 text-[#F6465D] rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 active:bg-[#F6465D]/10 transition-colors"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Stop & Withdraw Funds
              </button>
            </div>
          </div>
        )}
      </div>

      {showStopSheet && (
        <StopConfirmSheet
          copy={copy}
          liveValue={liveValue}
          livePnl={effectivePnl}
          liveRoi={liveRoi}
          onCancel={() => setShowStopSheet(false)}
          onConfirm={() => {
            setShowStopSheet(false);
            onStop(copy.id, effectivePnl, liveRoi, liveValue);
          }}
          stopping={stopping}
        />
      )}
    </>
  );
}

function HistoryCard({ record }: { record: HistoryRecord }) {
  const isProfit = record.final_pnl >= 0;
  return (
    <div className="mx-3 mb-2 bg-[#1E2329] rounded-2xl p-4 border border-[#2B3139]/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={record.trader_avatar || `https://i.pravatar.cc/150?img=1`}
            alt=""
            className="w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 border-[#2B3139]"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?img=1`; }}
          />
          <div>
            <div className="text-[#EAECEF] text-[13px] font-semibold">{record.trader_name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[#848E9C] text-[10px]">${record.investment_amount.toFixed(0)} invested</span>
            </div>
            <div className="text-[#5E6673] text-[10px] mt-0.5">
              {formatTimeAgo(record.ended_at)} · {record.duration_hours < 1
                ? `${Math.round(record.duration_hours * 60)}m`
                : `${record.duration_hours.toFixed(1)}h`}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-[15px] font-bold ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isProfit ? '+' : ''}${Math.abs(record.final_pnl).toFixed(2)}
          </div>
          <div className={`text-[11px] font-medium ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {isProfit ? '+' : ''}{record.final_roi.toFixed(2)}%
          </div>
          <div className={`text-[10px] mt-0.5 px-2 py-0.5 rounded-full inline-block ${
            record.status === 'stopped'
              ? 'bg-[#848E9C]/15 text-[#848E9C]'
              : isProfit
              ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
              : 'bg-[#F6465D]/10 text-[#F6465D]'
          }`}>
            {record.status === 'stopped' ? 'Withdrawn' : isProfit ? 'Profit' : 'Loss'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyCopiesPage({ onClose, onBrowseTraders }: Props) {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [activeCopies, setActiveCopies] = useState<ActiveCopy[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResult | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);

  const [portfolioPrices, setPortfolioPrices] = useState<Record<string, number>>({});
  const [allPositions, setAllPositions] = useState<CopyPosition[]>([]);
  const allPositionsRef = useRef<CopyPosition[]>([]);
  // Portfolio simülasyon ticker'ı (gerçek pozisyon yokken)
  const [simTick, setSimTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setSimTick(t => t + 1), 2500);
    return () => clearInterval(iv);
  }, []);

  const fetchData = useCallback(async (uid: string, silent = false) => {
    if (!silent) setLoading(true);
    const [copiesRes, histRes] = await Promise.all([
      supabase
        .from('user_copy_trades')
        .select('*, copy_traders(*)')
        .eq('user_id', uid)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('copy_trade_history')
        .select('*')
        .eq('user_id', uid)
        .order('ended_at', { ascending: false })
        .limit(50),
    ]);

    if (copiesRes.data) {
      setActiveCopies(copiesRes.data as any as ActiveCopy[]);

      // Load all positions for portfolio PNL
      const ids = copiesRes.data.map((c: any) => c.id);
      if (ids.length > 0) {
        const { data: posData } = await supabase
          .from('copy_trade_positions')
          .select('*')
          .in('copy_trade_id', ids)
          .eq('status', 'open');
        if (posData) {
          setAllPositions(posData as CopyPosition[]);
          allPositionsRef.current = posData as CopyPosition[];
        }
      }
    }
    if (histRes.data) setHistory(histRes.data as HistoryRecord[]);
    if (!silent) setLoading(false);
  }, []);

  // Poll prices every 3s for portfolio header - uses ref so interval never restarts
  useEffect(() => {
    let mounted = true;

    const update = async () => {
      const positions = allPositionsRef.current;
      if (positions.length === 0) return;
      const symbols = [...new Set(positions.map(p => p.coin_symbol))];
      const updates: Record<string, number> = {};
      await Promise.all(
        symbols.map(async (sym) => {
          const p = await fetchLivePrice(sym);
          if (p) updates[sym] = p;
        })
      );
      if (mounted && Object.keys(updates).length > 0) {
        setPortfolioPrices(prev => ({ ...prev, ...updates }));
      }
    };

    update();
    const iv = setInterval(update, 3000);
    return () => { mounted = false; clearInterval(iv); };
  }, []); // empty deps - runs once, reads positions via ref

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchData(session.user.id);
      } else {
        const _authData = { user: await getCurrentUser() }; const data = _authData;
        if (data.user) {
          setUser(data.user);
          fetchData(data.user.id);
        } else {
          setLoading(false);
        }
      }
    };
    init();
  }, []);

  const handleStop = async (copyId: string, pnl: number, roi: number, value: number) => {
    if (!user) return;
    const copy = activeCopies.find(c => c.id === copyId);
    if (!copy) return;

    setStoppingId(copyId);
    setStopError(null);

    try {
      await supabase.rpc('update_copy_trade_pnl', {
        p_user_id: user.id,
        p_copy_id: copyId,
        p_new_pnl: pnl,
        p_new_roi: roi,
        p_new_value: value,
      });

      const { data, error } = await supabase.rpc('stop_copy_trading', {
        p_user_id: user.id,
        p_copy_id: copyId,
      });

      if (error) {
        console.error('stop_copy_trading error:', error);
        setStopError(error.message || 'Failed to stop trade. Please try again.');
        return;
      }

      const result = data?.[0];
      setWithdrawResult({
        amount: result?.returned_amount ?? value,
        pnl: result?.final_pnl ?? pnl,
        roi: result?.final_roi ?? roi,
        traderName: result?.trader_name ?? copy.copy_traders.name,
      });

      await fetchData(user.id, true);
    } finally {
      setStoppingId(null);
    }
  };

  const handleRefresh = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    await fetchData(user.id, true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Portfolio totals — gerçek pozisyon varsa gerçek fiyat, yoksa simülasyon
  const totalInvested = activeCopies.reduce((s, c) => s + c.investment_amount, 0);
  const realPositionPnl = allPositions.reduce((sum, pos) => {
    const price = portfolioPrices[pos.coin_symbol];
    if (!price || price <= 0) return sum;
    const { pnl } = calcPositionPnl(pos, price);
    return sum + pnl;
  }, 0);
  const hasRealPositions = allPositions.length > 0;
  const totalLivePnl = hasRealPositions
    ? realPositionPnl
    : activeCopies.reduce((sum, c) => {
        const roiTarget = Math.min((c.copy_traders.roi_30d ?? 80) / 20, 15);
        return sum + calcSimPnl(c.investment_amount, roiTarget, c.created_at, c.id);
      }, 0);
  // simTick kullanarak re-render tetiklenir
  void simTick;
  const totalValue = totalInvested + totalLivePnl;
  const totalRoi = totalInvested > 0 ? (totalLivePnl / totalInvested) * 100 : 0;
  const isPnlPositive = totalLivePnl >= 0;
  const historyTotalPnl = history.reduce((s, h) => s + h.final_pnl, 0);
  const historyWins = history.filter(h => h.final_pnl > 0).length;
  const historyWinRate = history.length > 0 ? (historyWins / history.length) * 100 : 0;

  return (
    <>
      <div className="fixed inset-0 bg-[#0B0E11] z-50 flex flex-col">
        <div className="sticky top-0 bg-[#181A20] z-10 border-b border-[#2B3139]">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={onClose} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5 text-[#EAECEF]" />
            </button>
            <span className="text-[#EAECEF] text-[15px] font-bold">My Copy Trades</span>
            <button onClick={handleRefresh} className="p-1">
              <RefreshCw className={`w-4 h-4 text-[#848E9C] ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {activeCopies.length > 0 && (
            <div className="px-4 pb-3">
              <div
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1E2329 0%, #1a2230 100%)' }}
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 80% 0%, ${isPnlPositive ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)'} 0%, transparent 70%)` }} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[#848E9C] text-[10px] mb-0.5 font-medium uppercase tracking-wide">Portfolio Value</div>
                      <div className={`text-[28px] font-bold leading-tight ${isPnlPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        ${totalValue.toFixed(2)}
                      </div>
                      <div className="text-[#848E9C] text-[11px] mt-0.5">Invested: ${totalInvested.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#848E9C] text-[10px] mb-0.5 font-medium uppercase tracking-wide">Total PNL</div>
                      <div className={`text-[22px] font-bold ${isPnlPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {isPnlPositive ? '+' : ''}{totalRoi.toFixed(3)}%
                      </div>
                      <div className={`text-[14px] font-semibold ${isPnlPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {isPnlPositive ? '+' : ''}${Math.abs(totalLivePnl).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#0B0E11]/60 rounded-xl p-2.5 text-center">
                      <div className="text-[#848E9C] text-[9px] mb-0.5">Active</div>
                      <div className="text-[#FCD535] text-[14px] font-bold">{activeCopies.length}</div>
                    </div>
                    <div className="flex-1 bg-[#0B0E11]/60 rounded-xl p-2.5 text-center">
                      <div className="text-[#848E9C] text-[9px] mb-0.5">Realized</div>
                      <div className={`text-[13px] font-bold ${historyTotalPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {historyTotalPnl >= 0 ? '+' : ''}${Math.abs(historyTotalPnl).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex-1 bg-[#0B0E11]/60 rounded-xl p-2.5 text-center">
                      <div className="text-[#848E9C] text-[9px] mb-0.5">Win Rate</div>
                      <div className="text-[#FCD535] text-[13px] font-bold">
                        {history.length > 0 ? historyWinRate.toFixed(0) : '--'}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex border-t border-[#2B3139]">
            {[
              { key: 'active', label: 'Active', icon: Activity, count: activeCopies.length },
              { key: 'history', label: 'History', icon: History, count: history.length },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === key
                    ? 'text-[#FCD535] border-b-2 border-[#FCD535]'
                    : 'text-[#848E9C]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === key ? 'bg-[#FCD535] text-[#181A20]' : 'bg-[#2B3139] text-[#848E9C]'
                  }`}>{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#FCD535] animate-spin mb-3" />
              <span className="text-[#848E9C] text-[13px]">Loading your copies...</span>
            </div>
          ) : activeTab === 'active' ? (
            <div className="pt-4 pb-32">
              {stopError && (
                <div className="mx-3 mb-3 bg-[#F6465D]/10 border border-[#F6465D]/30 rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#F6465D] flex-shrink-0" />
                  <span className="text-[#F6465D] text-[12px]">{stopError}</span>
                  <button onClick={() => setStopError(null)} className="ml-auto text-[#848E9C] text-[11px]">Dismiss</button>
                </div>
              )}
              {activeCopies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#1E2329] flex items-center justify-center mb-4 relative">
                    <Users className="w-10 h-10 text-[#5E6673]" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FCD535] flex items-center justify-center">
                      <span className="text-[#181A20] text-[10px] font-bold">0</span>
                    </div>
                  </div>
                  <div className="text-[#EAECEF] text-[16px] font-bold mb-2">No Active Copies</div>
                  <div className="text-[#848E9C] text-[13px] mb-6 leading-relaxed max-w-[280px]">
                    Start copying top traders to grow your portfolio automatically with real-time tracking
                  </div>
                  <button
                    onClick={onBrowseTraders}
                    className="px-8 py-3.5 rounded-xl text-[14px] font-bold text-[#181A20] active:brightness-90 transition-all"
                    style={{ background: 'linear-gradient(135deg, #F0B90B, #F8D12F)' }}
                  >
                    Browse Traders
                  </button>
                </div>
              ) : (
                activeCopies.map(copy => (
                  <ActiveCopyCard
                    key={copy.id}
                    copy={copy}
                    onStop={handleStop}
                    stopping={stoppingId === copy.id}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="pt-4 pb-24">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#1E2329] flex items-center justify-center mb-4">
                    <History className="w-10 h-10 text-[#5E6673]" />
                  </div>
                  <div className="text-[#EAECEF] text-[16px] font-bold mb-2">No History Yet</div>
                  <div className="text-[#848E9C] text-[13px] leading-relaxed max-w-[260px]">
                    Your completed and stopped copy trades will appear here
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-3 mb-3 bg-[#1E2329] rounded-2xl p-4 grid grid-cols-3 gap-2 border border-[#2B3139]/30">
                    <div className="text-center">
                      <div className="text-[#848E9C] text-[9px] mb-1">Total Trades</div>
                      <div className="text-[#EAECEF] text-[16px] font-bold">{history.length}</div>
                    </div>
                    <div className="text-center border-x border-[#2B3139]/40">
                      <div className="text-[#848E9C] text-[9px] mb-1">Win Rate</div>
                      <div className="text-[#FCD535] text-[16px] font-bold">{historyWinRate.toFixed(0)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[#848E9C] text-[9px] mb-1">Total PNL</div>
                      <div className={`text-[15px] font-bold ${historyTotalPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {historyTotalPnl >= 0 ? '+' : ''}${Math.abs(historyTotalPnl).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {history.map(record => (
                    <HistoryCard key={record.id} record={record} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {withdrawResult && (
        <WithdrawSuccessModal
          result={withdrawResult}
          onClose={() => {
            setWithdrawResult(null);
            if (activeCopies.length === 0) onClose();
          }}
        />
      )}
    </>
  );
}

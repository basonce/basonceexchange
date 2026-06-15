import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowDownUp, ChevronDown, Search, Check, Shield, Gauge, Clock, Gem } from 'lucide-react';
import { useMarkets, DeskMarket } from '../useMarkets';
import CoinLogo from '../../components/CoinLogo';
import { formatPriceWithSymbol, formatAmount } from '../../lib/format-utils';

type PageProps = { user?: any; onAuth?: (m: 'login' | 'register') => void; onDeposit?: () => void; onNavigate?: (t: any) => void };

const QUICK_USD = [100, 500, 1000, 5000] as const;

function AssetPicker({
  open, onClose, markets, onSelect, exclude,
}: {
  open: boolean;
  onClose: () => void;
  markets: DeskMarket[];
  onSelect: (m: DeskMarket) => void;
  exclude?: string;
}) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return markets.filter(m =>
      m.symbol !== exclude &&
      (t === '' || m.symbol.toLowerCase().includes(t) || m.fullName.toLowerCase().includes(t))
    );
  }, [markets, q, exclude]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute z-30 mt-2 left-0 right-0 bg-[#181A20] border border-[#2B3139] rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="p-3 border-b border-[#2B3139]">
        <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#848E9C]" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search asset"
            className="bg-transparent outline-none text-sm text-white placeholder-[#5E6673] flex-1"
          />
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {list.length === 0 ? (
          <div className="py-10 text-center text-[#5E6673] text-sm">No assets found</div>
        ) : (
          list.map(m => (
            <button
              key={m.symbol}
              onClick={() => { onSelect(m); setQ(''); onClose(); }}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#1E2329] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 shrink-0"><CoinLogo symbol={m.symbol} dbUrl={m.logo} /></div>
                <div className="min-w-0 text-left">
                  <div className="text-white text-sm font-semibold">{m.symbol}</div>
                  <div className="text-[#848E9C] text-xs truncate">{m.fullName}</div>
                </div>
              </div>
              <span className="text-[#B7BDC6] text-sm tabular-nums whitespace-nowrap">{formatPriceWithSymbol(m.price)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function DesktopConvert({ user, onAuth }: PageProps) {
  const { markets, loading } = useMarkets();

  const tradable = useMemo(() => markets.filter(m => m.price > 0), [markets]);

  const [fromSym, setFromSym] = useState('BTC');
  const [toSym, setToSym] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [openPicker, setOpenPicker] = useState<'from' | 'to' | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (tradable.length === 0) return;
    if (!tradable.find(m => m.symbol === fromSym)) {
      const first = tradable.find(m => m.symbol === 'BTC') || tradable[0];
      if (first) setFromSym(first.symbol);
    }
    if (!tradable.find(m => m.symbol === toSym)) {
      const usdt = tradable.find(m => m.symbol === 'USDT') || tradable.find(m => m.symbol !== fromSym);
      if (usdt) setToSym(usdt.symbol);
    }
  }, [tradable]); // eslint-disable-line react-hooks/exhaustive-deps

  const fromM = useMemo(() => tradable.find(m => m.symbol === fromSym), [tradable, fromSym]);
  const toM = useMemo(() => tradable.find(m => m.symbol === toSym), [tradable, toSym]);

  const rate = useMemo(() => {
    if (!fromM || !toM || toM.price <= 0) return 0;
    return fromM.price / toM.price;
  }, [fromM, toM]);

  const numAmount = parseFloat(amount) || 0;
  const toAmount = numAmount * rate;

  const flip = () => {
    setFromSym(toSym);
    setToSym(fromSym);
    setAmount('');
    setConfirmed(false);
  };

  const onAmountChange = (v: string) => {
    if (/^\d*\.?\d*$/.test(v)) {
      setAmount(v);
      setConfirmed(false);
    }
  };

  const canConvert = !!user && numAmount > 0 && rate > 0 && fromSym !== toSym;

  const handleConvert = () => {
    if (!user) { onAuth?.('login'); return; }
    if (!canConvert) return;
    setConfirmed(true);
  };

  // Block trade / OTC
  const [otcSide, setOtcSide] = useState<'buy' | 'sell'>('buy');
  const [otcAsset, setOtcAsset] = useState('BTC');
  const [otcSize, setOtcSize] = useState('');
  const [otcRequested, setOtcRequested] = useState(false);
  const [otcPicker, setOtcPicker] = useState(false);
  const otcM = useMemo(() => tradable.find(m => m.symbol === otcAsset), [tradable, otcAsset]);
  const otcNum = parseFloat(otcSize) || 0;
  const otcNotional = otcM ? otcNum * otcM.price : 0;
  const OTC_MIN = 10000;

  if (loading && tradable.length === 0) {
    return (
      <div className="bg-[#0B0E11] min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <h1 className="text-white font-bold text-3xl mb-1">Convert &amp; Block Trade</h1>
        <p className="text-[#848E9C] text-sm mb-8">Instantly swap assets at live market rates with zero slippage, or request a private OTC block quote.</p>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_460px] gap-6">
          {/* Left: info + benefits + OTC */}
          <div className="space-y-6 order-2 xl:order-1">
            {/* Benefits */}
            <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5">Why Convert</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Benefit icon={<Gauge className="w-5 h-5 text-[#F0B90B]" />} title="Zero Fees" sub="No commission on converts" />
                <Benefit icon={<Gem className="w-5 h-5 text-[#F0B90B]" />} title="Best Price Routing" sub="Aggregated from all markets" />
                <Benefit icon={<Clock className="w-5 h-5 text-[#F0B90B]" />} title="Instant Settlement" sub="Funds available immediately" />
              </div>
            </div>

            {/* Block Trade / OTC */}
            <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-[#F0B90B]" />
                <h2 className="text-white font-semibold text-lg">Block Trade / OTC</h2>
              </div>
              <p className="text-[#848E9C] text-sm mb-5">Trade large volumes off the order book with no market impact. Minimum {formatPriceWithSymbol(OTC_MIN)} per request.</p>

              <div className="flex items-center gap-1 bg-[#0B0E11] border border-[#2B3139] rounded-lg p-1 w-fit mb-4">
                {(['buy', 'sell'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setOtcSide(s); setOtcRequested(false); }}
                    className={`px-6 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize ${
                      otcSide === s
                        ? s === 'buy' ? 'bg-[#0ECB81] text-black' : 'bg-[#F6465D] text-white'
                        : 'text-[#848E9C] hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[#848E9C] text-xs mb-2">Asset</label>
                  <button
                    onClick={() => setOtcPicker(o => !o)}
                    className="w-full flex items-center justify-between gap-2 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2.5 hover:border-[#474D57] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {otcM && <div className="w-6 h-6 shrink-0"><CoinLogo symbol={otcM.symbol} dbUrl={otcM.logo} /></div>}
                      <span className="text-white font-semibold text-sm">{otcAsset}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#848E9C] shrink-0" />
                  </button>
                  <AssetPicker
                    open={otcPicker}
                    onClose={() => setOtcPicker(false)}
                    markets={tradable.filter(m => m.symbol !== 'USDT')}
                    onSelect={(m) => { setOtcAsset(m.symbol); setOtcRequested(false); }}
                  />
                </div>
                <div>
                  <label className="block text-[#848E9C] text-xs mb-2">Size ({otcAsset})</label>
                  <input
                    value={otcSize}
                    onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) { setOtcSize(e.target.value); setOtcRequested(false); } }}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2.5 text-white text-sm tabular-nums outline-none focus:border-[#F0B90B] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 py-3 border-t border-[#2B3139]">
                <span className="text-[#848E9C] text-sm">Estimated notional</span>
                <span className="text-white font-semibold tabular-nums whitespace-nowrap">{formatPriceWithSymbol(otcNotional)}</span>
              </div>

              {otcRequested ? (
                <div className="flex items-start gap-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-lg px-4 py-3">
                  <Check className="w-5 h-5 text-[#0ECB81] shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="text-[#0ECB81] font-semibold">Quote request submitted</div>
                    <div className="text-[#848E9C]">Our OTC desk will respond with a fixed price for your {otcSide} of {formatAmount(otcNum)} {otcAsset}.</div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { if (!user) { onAuth?.('login'); return; } if (otcNotional >= OTC_MIN) setOtcRequested(true); }}
                  disabled={!!user && otcNotional < OTC_MIN}
                  className="w-full py-3 rounded-lg font-semibold text-sm transition-colors bg-[#F0B90B] text-black hover:bg-[#FCD535] disabled:bg-[#2B3139] disabled:text-[#5E6673] disabled:cursor-not-allowed"
                >
                  {!user ? 'Log In to Request Quote' : otcNotional < OTC_MIN ? `Minimum ${formatPriceWithSymbol(OTC_MIN)}` : 'Request OTC Quote'}
                </button>
              )}
            </div>
          </div>

          {/* Right: Convert card */}
          <div className="order-1 xl:order-2">
            <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-6 xl:sticky xl:top-6">
              <h2 className="text-white font-semibold text-lg mb-5">Convert</h2>

              {/* From */}
              <div className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#848E9C] text-xs">From</span>
                  {fromM && (
                    <span className="text-[#848E9C] text-xs tabular-nums whitespace-nowrap">≈ {formatPriceWithSymbol(fromM.price)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <input
                    value={amount}
                    onChange={e => onAmountChange(e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="bg-transparent outline-none text-white text-2xl font-semibold tabular-nums flex-1 min-w-0"
                  />
                  <button
                    onClick={() => setOpenPicker(p => p === 'from' ? null : 'from')}
                    className="flex items-center gap-2 bg-[#1E2329] border border-[#2B3139] rounded-lg px-3 py-2 hover:border-[#474D57] transition-colors shrink-0"
                  >
                    {fromM && <div className="w-6 h-6 shrink-0"><CoinLogo symbol={fromM.symbol} dbUrl={fromM.logo} /></div>}
                    <span className="text-white font-semibold text-sm">{fromSym}</span>
                    <ChevronDown className="w-4 h-4 text-[#848E9C]" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {QUICK_USD.map(usd => (
                    <button
                      key={usd}
                      onClick={() => { if (fromM && fromM.price > 0) onAmountChange(formatAmount(usd / fromM.price)); }}
                      className="px-2.5 py-1 text-[11px] font-medium text-[#848E9C] hover:text-[#F0B90B] bg-[#1E2329] rounded-md transition-colors tabular-nums"
                    >
                      ${usd >= 1000 ? `${usd / 1000}k` : usd}
                    </button>
                  ))}
                </div>
                <AssetPicker
                  open={openPicker === 'from'}
                  onClose={() => setOpenPicker(null)}
                  markets={tradable}
                  exclude={toSym}
                  onSelect={(m) => { setFromSym(m.symbol); setConfirmed(false); }}
                />
              </div>

              {/* Flip */}
              <div className="flex justify-center -my-3 relative z-10">
                <button
                  onClick={flip}
                  className="w-10 h-10 rounded-full bg-[#1E2329] border-4 border-[#181A20] flex items-center justify-center text-[#F0B90B] hover:bg-[#2B3139] transition-colors"
                  aria-label="Swap direction"
                >
                  <ArrowDownUp className="w-4 h-4" />
                </button>
              </div>

              {/* To */}
              <div className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#848E9C] text-xs">To</span>
                  {toM && (
                    <span className="text-[#848E9C] text-xs tabular-nums whitespace-nowrap">≈ {formatPriceWithSymbol(toM.price)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-2xl font-semibold tabular-nums flex-1 min-w-0 whitespace-nowrap overflow-x-auto text-white">
                    {toAmount > 0 ? formatAmount(toAmount) : <span className="text-[#5E6673]">0.00</span>}
                  </div>
                  <button
                    onClick={() => setOpenPicker(p => p === 'to' ? null : 'to')}
                    className="flex items-center gap-2 bg-[#1E2329] border border-[#2B3139] rounded-lg px-3 py-2 hover:border-[#474D57] transition-colors shrink-0"
                  >
                    {toM && <div className="w-6 h-6 shrink-0"><CoinLogo symbol={toM.symbol} dbUrl={toM.logo} /></div>}
                    <span className="text-white font-semibold text-sm">{toSym}</span>
                    <ChevronDown className="w-4 h-4 text-[#848E9C]" />
                  </button>
                </div>
                <AssetPicker
                  open={openPicker === 'to'}
                  onClose={() => setOpenPicker(null)}
                  markets={tradable}
                  exclude={fromSym}
                  onSelect={(m) => { setToSym(m.symbol); setConfirmed(false); }}
                />
              </div>

              {/* Rate */}
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-[#848E9C]">Rate</span>
                <span className="text-white tabular-nums whitespace-nowrap">
                  {rate > 0 ? `1 ${fromSym} ≈ ${formatAmount(rate)} ${toSym}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-[#848E9C]">Fee</span>
                <span className="text-[#0ECB81] font-medium">Free</span>
              </div>

              {confirmed ? (
                <div className="mt-5 flex items-start gap-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-lg px-4 py-3">
                  <Check className="w-5 h-5 text-[#0ECB81] shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="text-[#0ECB81] font-semibold">Conversion preview confirmed</div>
                    <div className="text-[#848E9C]">
                      {formatAmount(numAmount)} {fromSym} → {formatAmount(toAmount)} {toSym} at the current market rate.
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConvert}
                  disabled={!!user && !canConvert}
                  className="w-full mt-5 py-3.5 rounded-lg font-semibold text-base transition-colors bg-[#F0B90B] text-black hover:bg-[#FCD535] disabled:bg-[#2B3139] disabled:text-[#5E6673] disabled:cursor-not-allowed"
                >
                  {!user ? 'Log In to Convert' : numAmount <= 0 ? 'Enter an amount' : 'Convert'}
                </button>
              )}

              <p className="text-[#5E6673] text-[11px] mt-3 leading-relaxed">
                Quotes reflect live market prices and refresh continuously. Final executed amount may vary slightly with market movement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Benefit({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-white font-semibold text-sm">{title}</div>
        <div className="text-[#848E9C] text-xs">{sub}</div>
      </div>
    </div>
  );
}

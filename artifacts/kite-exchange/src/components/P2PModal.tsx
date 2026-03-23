import { useState, useMemo } from 'react';
import { X, Search, Shield, ChevronDown, Star, ArrowLeft, CheckCircle, Clock, Copy, AlertCircle } from 'lucide-react';

interface P2PModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD', rate: 1 },
  { code: 'DE', name: 'Germany', currency: 'EUR', rate: 0.92 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', rate: 0.79 },
  { code: 'AE', name: 'UAE', currency: 'AED', rate: 3.67 },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', rate: 1580 },
  { code: 'IN', name: 'India', currency: 'INR', rate: 83.5 },
  { code: 'BR', name: 'Brazil', currency: 'BRL', rate: 4.97 },
  { code: 'VN', name: 'Vietnam', currency: 'VND', rate: 24500 },
  { code: 'PH', name: 'Philippines', currency: 'PHP', rate: 56.8 },
  { code: 'TR', name: 'Turkey', currency: 'TRY', rate: 32.5 },
];

const COINS = ['USDT', 'BTC', 'ETH', 'BNB'];

const BASE_PRICES: Record<string, number> = {
  USDT: 1,
  BTC: 97420,
  ETH: 3512,
  BNB: 598,
};

const PAYMENT_METHODS: Record<string, string[]> = {
  US: ['Bank Transfer', 'Zelle', 'Venmo', 'PayPal', 'Cash App'],
  DE: ['SEPA Transfer', 'N26', 'Revolut', 'PayPal', 'Wise'],
  GB: ['Bank Transfer', 'Revolut', 'Monzo', 'PayPal', 'Wise'],
  AE: ['Bank Transfer', 'Western Union', 'Remitly', 'Al Fardan', 'Wise'],
  NG: ['Bank Transfer', 'Opay', 'Kuda', 'Moniepoint', 'PalmPay'],
  IN: ['UPI', 'IMPS', 'Paytm', 'PhonePe', 'Google Pay'],
  BR: ['PIX', 'TED', 'Nubank', 'Itaú', 'Bradesco'],
  VN: ['Bank Transfer', 'MoMo', 'ZaloPay', 'ViettelPay', 'Vietcombank'],
  PH: ['GCash', 'Maya', 'Bank Transfer', 'Unionbank', 'BDO'],
  TR: ['Ziraat Bankası', 'İş Bankası', 'Garanti BBVA', 'Papara', 'Akbank'],
};

const PAYMENT_COLORS: Record<string, string> = {
  'Bank Transfer': '#F0B90B',
  'Zelle': '#6C2DC7',
  'Venmo': '#3D95CE',
  'PayPal': '#003087',
  'Cash App': '#00D64F',
  'SEPA Transfer': '#0070BA',
  'N26': '#48AC98',
  'Revolut': '#191C1F',
  'Wise': '#9FE870',
  'SEPA': '#0070BA',
  'Western Union': '#FDBB30',
  'Remitly': '#E8445A',
  'Al Fardan': '#8B0000',
  'Opay': '#00A859',
  'Kuda': '#60269E',
  'Moniepoint': '#0033A0',
  'PalmPay': '#006B3F',
  'UPI': '#097939',
  'IMPS': '#2196F3',
  'Paytm': '#00BAF2',
  'PhonePe': '#5F259F',
  'Google Pay': '#4285F4',
  'PIX': '#32BCAD',
  'TED': '#004B87',
  'Nubank': '#820AD1',
  'Itaú': '#EC7000',
  'Bradesco': '#CC0000',
  'MoMo': '#A50064',
  'ZaloPay': '#0068FF',
  'ViettelPay': '#EE0033',
  'Vietcombank': '#007B3A',
  'GCash': '#007DFF',
  'Maya': '#4ECDC4',
  'Unionbank': '#0047AB',
  'BDO': '#003087',
  'AirTM': '#00C4CC',
  'Whish MONEY': '#E30613',
  'Banco Pichincha': '#F0B90B',
  'Produbanco': '#E8445A',
  'Banco Guayaquil': '#FF6B35',
  'Banco del Pacífico': '#0070BA',
  'Banco Internacional': '#003087',
  'Monzo': '#FF6B6B',
};

const MERCHANT_DATA = [
  { name: 'GuilleTurboCrypto', pravatarId: 11, orders: 1013, rate: 99.4, completionRate: 100.0 },
  { name: 'Xaviercripto1', pravatarId: 22, orders: 500, rate: 99.54, completionRate: 99.9 },
  { name: 'PRIMEVA-Wise', pravatarId: 33, orders: 741, rate: 100.0, completionRate: 98.3 },
  { name: 'Khaled-Khadija', pravatarId: 44, orders: 1927, rate: 100.0, completionRate: 100.0 },
  { name: 'CryptoKing_Pro', pravatarId: 55, orders: 891, rate: 98.7, completionRate: 98.7 },
  { name: 'FastDeal_FX', pravatarId: 66, orders: 1580, rate: 99.1, completionRate: 99.1 },
  { name: 'SafeExchange', pravatarId: 77, orders: 3247, rate: 99.6, completionRate: 99.6 },
  { name: 'TrustSwap_VIP', pravatarId: 88, orders: 677, rate: 98.2, completionRate: 98.2 },
  { name: 'GlobalP2P_Hub', pravatarId: 12, orders: 4450, rate: 99.7, completionRate: 99.7 },
  { name: 'SwiftTrade_HQ', pravatarId: 24, orders: 543, rate: 97.5, completionRate: 97.5 },
];

function getMerchants(country: typeof COUNTRIES[0], coin: string, type: 'buy' | 'sell') {
  const base = BASE_PRICES[coin] ?? 1;
  return MERCHANT_DATA.map((m, i) => {
    const spread = type === 'buy' ? 1 + i * 0.0018 : 1 - i * 0.0018;
    const rawPrice = base * country.rate * spread;
    const price = rawPrice >= 1000 ? Math.round(rawPrice) : rawPrice >= 1 ? parseFloat(rawPrice.toFixed(2)) : parseFloat(rawPrice.toFixed(4));
    const avail = parseFloat((Math.floor((i + 3) * 12000 + 2000) / 100).toFixed(2));
    const minO = Math.floor((200 + i * 50) * country.rate);
    const maxO = Math.floor((5000 + i * 1000) * country.rate);
    const pmethods = PAYMENT_METHODS[country.code].slice(0, Math.min((i % 3) + 2, PAYMENT_METHODS[country.code].length));
    return { ...m, id: i, price, available: avail, minOrder: minO, maxOrder: maxO, payment: pmethods };
  });
}

function formatNum(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

type Screen = 'list' | 'trade' | 'payment' | 'confirm' | 'done';

interface Merchant {
  id: number;
  name: string;
  pravatarId: number;
  orders: number;
  rate: number;
  completionRate: number;
  price: number;
  available: number;
  minOrder: number;
  maxOrder: number;
  payment: string[];
}

export default function P2PModal({ isOpen, onClose }: P2PModalProps) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [selectedCoin, setSelectedCoin] = useState('USDT');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [screen, setScreen] = useState<Screen>('list');
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [selectedTradePayment, setSelectedTradePayment] = useState('');
  const [countdown, setCountdown] = useState(900);
  const [copiedOrderId] = useState(`P2P${Date.now().toString().slice(-10)}`);

  const payments = useMemo(() => ['All', ...PAYMENT_METHODS[selectedCountry.code]], [selectedCountry]);
  const merchants = useMemo(() => getMerchants(selectedCountry, selectedCoin, tab), [selectedCountry, selectedCoin, tab]);

  const filteredMerchants = useMemo(() => {
    let list = merchants;
    if (selectedPayment !== 'All') list = list.filter(m => m.payment.includes(selectedPayment));
    if (amountInput) {
      const amt = parseFloat(amountInput);
      if (!isNaN(amt)) list = list.filter(m => m.minOrder <= amt && m.maxOrder >= amt);
    }
    return list;
  }, [merchants, selectedPayment, amountInput]);

  if (!isOpen) return null;

  const openTrade = (m: Merchant) => {
    setActiveMerchant(m);
    setSelectedTradePayment(m.payment[0]);
    setTradeAmount('');
    setScreen('trade');
  };

  const handleTradeContinue = () => {
    if (!tradeAmount || parseFloat(tradeAmount) <= 0) return;
    setScreen('payment');
  };

  const handlePaymentConfirm = () => {
    setCountdown(900);
    setScreen('confirm');
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOrderConfirmed = () => setScreen('done');

  const cryptoAmount = activeMerchant && tradeAmount
    ? (parseFloat(tradeAmount) / activeMerchant.price).toFixed(selectedCoin === 'BTC' ? 6 : 2)
    : '0';

  const formatCountdown = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-50">
      <div className="bg-[#0B0E11] w-full max-w-[480px] rounded-t-2xl border-t border-x border-[#22262E] shadow-2xl flex flex-col"
        style={{ height: 'calc(100dvh - 60px)', maxHeight: 'calc(100dvh - 60px)' }}>

        {/* ========== LIST SCREEN ========== */}
        {screen === 'list' && (
          <>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-base">P2P Trading</h2>
                <span className="text-[10px] bg-[#F0B90B]/15 text-[#F0B90B] px-2 py-0.5 rounded-full font-semibold border border-[#F0B90B]/20">Zero Fee</span>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buy/Sell */}
            <div className="flex px-4 pb-3 gap-2 shrink-0">
              <button onClick={() => setTab('buy')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'buy' ? 'bg-[#0ECB81] text-black shadow-lg shadow-[#0ECB81]/20' : 'text-gray-500 hover:text-gray-300 bg-[#1C1F27]'}`}>Buy</button>
              <button onClick={() => setTab('sell')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'sell' ? 'bg-[#F6465D] text-white shadow-lg shadow-[#F6465D]/20' : 'text-gray-500 hover:text-gray-300 bg-[#1C1F27]'}`}>Sell</button>
            </div>

            {/* Coin + Currency */}
            <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
              <div className="flex gap-1.5 flex-1">
                {COINS.map(c => (
                  <button key={c} onClick={() => setSelectedCoin(c)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCoin === c ? 'bg-[#F0B90B] text-black' : 'bg-[#1C1F27] text-gray-400 hover:text-white'}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="relative shrink-0">
                <button onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="flex items-center gap-1.5 bg-[#1C1F27] hover:bg-[#22262E] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-[#2A2F3A]">
                  <span>{selectedCountry.currency}</span>
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                </button>
                {showCountryPicker && (
                  <div className="absolute right-0 top-full mt-1 bg-[#1C1F27] border border-[#2A2F3A] rounded-xl shadow-2xl z-20 w-52 py-1 max-h-56 overflow-y-auto">
                    {COUNTRIES.map(c => (
                      <button key={c.code} onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); setSelectedPayment('All'); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${selectedCountry.code === c.code ? 'text-[#F0B90B] bg-[#F0B90B]/5' : 'text-gray-300 hover:bg-[#22262E]'}`}>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs font-semibold text-gray-500">{c.currency}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment + Amount filter */}
            <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
              <div className="flex gap-1.5 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {payments.map(p => (
                  <button key={p} onClick={() => setSelectedPayment(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap font-medium transition-colors shrink-0 ${selectedPayment === p ? 'bg-[#22262E] text-white border border-[#F0B90B]/40' : 'text-gray-500 hover:text-gray-300'}`}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <input type="number" placeholder="Amount" value={amountInput} onChange={e => setAmountInput(e.target.value)}
                  className="pl-7 pr-2 py-1.5 bg-[#1C1F27] border border-[#2A2F3A] text-white text-xs rounded-lg w-24 outline-none placeholder-gray-600 focus:border-[#F0B90B]/40 transition-colors" />
              </div>
            </div>

            {/* Merchant list */}
            <div className="flex-1 overflow-y-auto pb-4">
              {filteredMerchants.length === 0 && (
                <div className="text-center py-12 text-gray-600 text-sm">No merchants match your filters</div>
              )}
              {filteredMerchants.map(m => (
                <div key={m.id} className="px-4 py-4 border-b border-[#1C1F27] hover:bg-[#12151C]/60 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: merchant info + price */}
                    <div className="flex-1 min-w-0">
                      {/* Avatar + name row */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-[#2B3139] flex items-center justify-center overflow-hidden">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                              <circle cx="10" cy="10" r="4" fill="white" fillOpacity="0.9"/>
                              <path d="M2 22c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="white" fillOpacity="0.9"/>
                              <circle cx="20" cy="10" r="3.2" fill="white" fillOpacity="0.65"/>
                              <path d="M14.5 22c0-3.038 1.96-5.636 4.7-6.66A7.97 7.97 0 0 1 22 15c3.866 0 7 2.91 7 6.5" fill="white" fillOpacity="0.65"/>
                            </svg>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#0ECB81] rounded-full border-2 border-[#0B0E11]" />
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="bg-[#1C1F27] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm truncate max-w-[130px]">{m.name}</span>
                          <div className="w-4 h-4 rounded-full bg-[#F0B90B]/20 border border-[#F0B90B]/40 flex items-center justify-center shrink-0">
                            <Star className="w-2 h-2 text-[#F0B90B] fill-[#F0B90B]" />
                          </div>
                        </div>
                      </div>
                      {/* Trade count + completion */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-gray-500 text-[11px]">Trade: <span className="text-gray-400">{formatNum(m.orders)} Trades ({m.completionRate.toFixed(2)}%)</span></span>
                        <span className="text-gray-600">|</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                          <span className="text-gray-400 text-[11px]">{m.rate}%</span>
                        </div>
                      </div>
                      {/* Price - large */}
                      <div className="mb-2">
                        <span className="text-white font-bold text-[22px] tabular-nums leading-none">
                          $ {m.price >= 10000 ? formatNum(m.price) : m.price >= 1 ? m.price.toFixed(3) : m.price.toFixed(5)}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">/{selectedCoin}</span>
                      </div>
                      {/* Limit + Available */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-gray-600">Limit</span>
                          <span className="text-gray-400">{formatNum(m.minOrder)} - {formatNum(m.maxOrder)} {selectedCountry.currency}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-gray-600">Available</span>
                          <span className="text-gray-300 font-medium">{m.available >= 10000 ? formatNum(m.available, 2) : m.available.toFixed(2)} {selectedCoin}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: payment methods + timer + button */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        {m.payment.map(p => (
                          <div key={p} className="flex items-center gap-1.5">
                            <span className="text-gray-300 text-[11px]">{p}</span>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PAYMENT_COLORS[p] ?? '#888' }} />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>15 min</span>
                      </div>
                      <button onClick={() => openTrade(m)}
                        className={`mt-1 px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${tab === 'buy' ? 'bg-[#0ECB81] hover:bg-[#00B06D] text-black' : 'bg-[#F6465D] hover:bg-[#D93A4F] text-white'}`}>
                        {tab === 'buy' ? 'Buy' : 'Sell'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 border-t border-[#1C1F27] shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#0ECB81]" />
                <span className="text-[11px] text-gray-600">Escrow Protected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-[#F0B90B] fill-[#F0B90B]" />
                <span className="text-[11px] text-gray-600">{filteredMerchants.length} merchants online</span>
              </div>
            </div>
          </>
        )}

        {/* ========== TRADE SCREEN ========== */}
        {screen === 'trade' && activeMerchant && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-[#1C1F27]">
              <button onClick={() => setScreen('list')} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-white font-bold text-sm flex-1">
                {tab === 'buy' ? 'Buy' : 'Sell'} {selectedCoin}
              </h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
              {/* Merchant card */}
              <div className="bg-[#12151C] rounded-2xl p-4 border border-[#1C1F27]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#2B3139] flex items-center justify-center ring-2 ring-[#F0B90B]/30">
                      <svg width="34" height="34" viewBox="0 0 28 28" fill="none">
                        <circle cx="10" cy="10" r="4" fill="white" fillOpacity="0.9"/>
                        <path d="M2 22c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="white" fillOpacity="0.9"/>
                        <circle cx="20" cy="10" r="3.2" fill="white" fillOpacity="0.65"/>
                        <path d="M14.5 22c0-3.038 1.96-5.636 4.7-6.66A7.97 7.97 0 0 1 22 15c3.866 0 7 2.91 7 6.5" fill="white" fillOpacity="0.65"/>
                      </svg>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#0ECB81] rounded-full border-2 border-[#12151C]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{activeMerchant.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-[#0ECB81]" />
                        <span className="text-xs text-[#0ECB81] font-semibold">{activeMerchant.rate}%</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatNum(activeMerchant.orders)} orders</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#F0B90B] font-bold text-lg tabular-nums">
                      {activeMerchant.price >= 10000 ? formatNum(activeMerchant.price) : activeMerchant.price.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-gray-500">{selectedCountry.currency}/{selectedCoin}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#0B0E11] rounded-xl p-3">
                    <div className="text-gray-500 mb-1">Available</div>
                    <div className="text-white font-semibold">{activeMerchant.available.toFixed(2)} {selectedCoin}</div>
                  </div>
                  <div className="bg-[#0B0E11] rounded-xl p-3">
                    <div className="text-gray-500 mb-1">Limit</div>
                    <div className="text-white font-semibold">{formatNum(activeMerchant.minOrder)} - {formatNum(activeMerchant.maxOrder)}</div>
                    <div className="text-gray-600 text-[10px]">{selectedCountry.currency}</div>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <div className="text-gray-400 text-xs font-medium mb-2">Payment Method</div>
                <div className="flex flex-wrap gap-2">
                  {activeMerchant.payment.map(p => (
                    <button key={p} onClick={() => setSelectedTradePayment(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${selectedTradePayment === p ? 'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/40' : 'text-gray-400 border-[#22262E] hover:border-[#2A2F3A]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div>
                <div className="text-gray-400 text-xs font-medium mb-2">
                  {tab === 'buy' ? 'I want to pay' : 'I want to receive'} ({selectedCountry.currency})
                </div>
                <div className="bg-[#12151C] border border-[#22262E] rounded-xl p-3 flex items-center gap-3 focus-within:border-[#F0B90B]/40 transition-colors">
                  <input type="number" placeholder="Enter amount"
                    value={tradeAmount}
                    onChange={e => setTradeAmount(e.target.value)}
                    className="flex-1 bg-transparent text-white text-base font-semibold outline-none placeholder-gray-600" />
                  <span className="text-gray-400 text-sm font-semibold shrink-0">{selectedCountry.currency}</span>
                </div>
                {tradeAmount && parseFloat(tradeAmount) > 0 && (
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500 px-1">
                    <span>You will {tab === 'buy' ? 'receive' : 'send'}</span>
                    <span className="text-white font-semibold">{cryptoAmount} {selectedCoin}</span>
                  </div>
                )}
                <div className="mt-1.5 text-[11px] text-gray-600 px-1">
                  Min: {formatNum(activeMerchant.minOrder)} {selectedCountry.currency} · Max: {formatNum(activeMerchant.maxOrder)} {selectedCountry.currency}
                </div>
              </div>

              {/* Info */}
              <div className="bg-[#F0B90B]/5 border border-[#F0B90B]/15 rounded-xl p-3 flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Your crypto will be held in escrow until the merchant confirms your payment. Do not release crypto before payment is confirmed.
                </p>
              </div>
            </div>

            <div className="px-4 py-3 shrink-0 border-t border-[#1C1F27]">
              <button onClick={handleTradeContinue}
                disabled={!tradeAmount || parseFloat(tradeAmount) <= 0}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                  tab === 'buy'
                    ? 'bg-[#0ECB81] hover:bg-[#00B06D] text-black disabled:opacity-40'
                    : 'bg-[#F6465D] hover:bg-[#D93A4F] text-white disabled:opacity-40'
                }`}>
                {tab === 'buy' ? 'Buy' : 'Sell'} {selectedCoin} — {tradeAmount || '0'} {selectedCountry.currency}
              </button>
            </div>
          </>
        )}

        {/* ========== PAYMENT SCREEN ========== */}
        {screen === 'payment' && activeMerchant && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-[#1C1F27]">
              <button onClick={() => setScreen('trade')} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-white font-bold text-sm flex-1">Order Details</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
              <div className="bg-[#12151C] rounded-2xl p-4 border border-[#1C1F27] space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Order Type</span>
                  <span className={`font-bold ${tab === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{tab === 'buy' ? 'Buy' : 'Sell'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Asset</span>
                  <span className="text-white font-semibold">{selectedCoin}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Price</span>
                  <span className="text-white font-semibold tabular-nums">
                    {activeMerchant.price >= 10000 ? formatNum(activeMerchant.price) : activeMerchant.price.toFixed(2)} {selectedCountry.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="text-white font-semibold tabular-nums">{tradeAmount} {selectedCountry.currency}</span>
                </div>
                <div className="h-px bg-[#22262E]" />
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">You will {tab === 'buy' ? 'receive' : 'send'}</span>
                  <span className="text-[#F0B90B] font-bold text-base tabular-nums">{cryptoAmount} {selectedCoin}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="text-white font-semibold">{selectedTradePayment}</span>
                </div>
              </div>

              <div className="bg-[#12151C] rounded-2xl p-4 border border-[#1C1F27]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2B3139] flex items-center justify-center shrink-0">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <circle cx="10" cy="10" r="4" fill="white" fillOpacity="0.9"/>
                      <path d="M2 22c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="white" fillOpacity="0.9"/>
                      <circle cx="20" cy="10" r="3.2" fill="white" fillOpacity="0.65"/>
                      <path d="M14.5 22c0-3.038 1.96-5.636 4.7-6.66A7.97 7.97 0 0 1 22 15c3.866 0 7 2.91 7 6.5" fill="white" fillOpacity="0.65"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{activeMerchant.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3 text-[#0ECB81]" />
                      <span className="text-xs text-[#0ECB81]">{activeMerchant.rate}% completion</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0ECB81]/5 border border-[#0ECB81]/20 rounded-xl p-3 flex gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  After placing the order, complete payment within 15 minutes via <strong className="text-white">{selectedTradePayment}</strong>. The crypto will be released from escrow once the merchant confirms.
                </p>
              </div>
            </div>

            <div className="px-4 py-3 shrink-0 border-t border-[#1C1F27]">
              <button onClick={handlePaymentConfirm}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${tab === 'buy' ? 'bg-[#0ECB81] hover:bg-[#00B06D] text-black' : 'bg-[#F6465D] hover:bg-[#D93A4F] text-white'}`}>
                Confirm Order
              </button>
            </div>
          </>
        )}

        {/* ========== CONFIRM (IN PROGRESS) SCREEN ========== */}
        {screen === 'confirm' && activeMerchant && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-[#1C1F27]">
              <h2 className="text-white font-bold text-sm flex-1">Awaiting Payment</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
              {/* Countdown */}
              <div className="bg-[#12151C] rounded-2xl p-5 border border-[#1C1F27] text-center">
                <Clock className="w-8 h-8 text-[#F0B90B] mx-auto mb-3" />
                <div className="text-[#F0B90B] text-3xl font-bold tabular-nums mb-1">{formatCountdown(countdown)}</div>
                <div className="text-gray-500 text-sm">Payment window remaining</div>
              </div>

              {/* Order ID */}
              <div className="bg-[#12151C] rounded-2xl p-4 border border-[#1C1F27] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Order ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-xs">{copiedOrderId}</span>
                    <button className="text-gray-500 hover:text-white transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Amount to pay</span>
                  <span className="text-white font-bold">{tradeAmount} {selectedCountry.currency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Via</span>
                  <span className="text-white font-semibold">{selectedTradePayment}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Crypto to release</span>
                  <span className="text-[#F0B90B] font-bold">{cryptoAmount} {selectedCoin}</span>
                </div>
              </div>

              {/* Merchant contact */}
              <div className="bg-[#12151C] rounded-2xl p-4 border border-[#1C1F27]">
                <div className="text-gray-500 text-xs font-medium mb-3">SELLER</div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#2B3139] flex items-center justify-center ring-2 ring-[#0ECB81]/30 shrink-0">
                    <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
                      <circle cx="10" cy="10" r="4" fill="white" fillOpacity="0.9"/>
                      <path d="M2 22c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="white" fillOpacity="0.9"/>
                      <circle cx="20" cy="10" r="3.2" fill="white" fillOpacity="0.65"/>
                      <path d="M14.5 22c0-3.038 1.96-5.636 4.7-6.66A7.97 7.97 0 0 1 22 15c3.866 0 7 2.91 7 6.5" fill="white" fillOpacity="0.65"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{activeMerchant.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{activeMerchant.orders} orders · {activeMerchant.rate}% rate</div>
                  </div>
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-[#0ECB81] rounded-full animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="bg-[#F6465D]/5 border border-[#F6465D]/20 rounded-xl p-3">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <strong className="text-[#F6465D]">Important:</strong> Only release crypto after confirming payment received in your {selectedTradePayment} account. Never release before confirmation.
                </p>
              </div>
            </div>

            <div className="px-4 py-3 shrink-0 border-t border-[#1C1F27] space-y-2">
              <button onClick={handleOrderConfirmed}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#0ECB81] hover:bg-[#00B06D] text-black transition-all active:scale-[0.98]">
                I Have {tab === 'buy' ? 'Transferred' : 'Received'} Payment
              </button>
              <button onClick={() => setScreen('list')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                Cancel Order
              </button>
            </div>
          </>
        )}

        {/* ========== DONE SCREEN ========== */}
        {screen === 'done' && activeMerchant && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#0ECB81]/15 flex items-center justify-center mb-5">
              <CheckCircle className="w-10 h-10 text-[#0ECB81]" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Order Complete!</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-2">
              Your {tab === 'buy' ? 'purchase' : 'sale'} of <strong className="text-white">{cryptoAmount} {selectedCoin}</strong> has been completed successfully.
            </p>
            <div className="bg-[#12151C] rounded-2xl p-4 border border-[#1C1F27] w-full mb-6 mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction</span>
                <span className="text-white font-mono text-xs">{copiedOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="text-[#F0B90B] font-bold">{cryptoAmount} {selectedCoin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid</span>
                <span className="text-white font-semibold">{tradeAmount} {selectedCountry.currency}</span>
              </div>
            </div>
            <button onClick={onClose}
              className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#F0B90B] hover:bg-[#E8A800] text-black transition-all active:scale-[0.98]">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

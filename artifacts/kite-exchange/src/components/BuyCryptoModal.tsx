import { useState, useEffect, useMemo } from 'react';
import { X, Search, ChevronRight, ArrowDownUp, Wallet, CreditCard, Users, ChevronLeft, Delete, Check } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { fetchCoinGeckoPrices } from '../lib/coingecko-price';
import { getCoinLogoUrl as defaultLogo } from '../lib/coin-logos';

// Doğrudan CoinMarketCap CDN — coin-logos.ts'deki fallback bazı stable'lar için yanlış URL döndürüyordu
const LOGO_MAP: Record<string, string> = {
  USDT: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
  BTC:  'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
  ETH:  'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  BNB:  'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
  SOL:  'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
  XRP:  'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
  TRX:  'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png',
  DOGE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png',
  ADA:  'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png',
  AVAX: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png',
  DOT:  'https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png',
  MATIC:'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png',
  LTC:  'https://s2.coinmarketcap.com/static/img/coins/64x64/2.png',
};
const getLogo = (s: string) => LOGO_MAP[s] || defaultLogo(s);

// Binance ile birebir aynı kart rozeti: tek koyu lacivert kart, sol üstte VISA, sağ altta gerçek Mastercard double-circle
const CardBrands = ({ size = 18 }: { size?: number }) => {
  const h = size;
  const w = h * 1.55; // kredi kartı oranı
  return (
    <svg viewBox="0 0 31 20" width={w} height={h}
         xmlns="http://www.w3.org/2000/svg"
         style={{ display: 'block', flexShrink: 0 }}>
      {/* Kart arka planı */}
      <rect width="31" height="20" rx="2.5" fill="#0E1740" />
      {/* VISA — sol üst, beyaz italik */}
      <text x="2.5" y="9" fontSize="6.2" fontWeight="900" fontStyle="italic"
            fontFamily="Arial, Helvetica, sans-serif" fill="#ffffff">VISA</text>
      {/* Mastercard — sağ alt, iki çakışan daire + ortada turuncu lens */}
      <circle cx="22" cy="14" r="3.4" fill="#EB001B" />
      <circle cx="26" cy="14" r="3.4" fill="#F79E1B" />
      <path d="M24 11.45 a3.4 3.4 0 0 1 0 5.1 a3.4 3.4 0 0 1 0 -5.1 z" fill="#FF5F00" />
    </svg>
  );
};

interface BuyCryptoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenP2P?: () => void;
  initialFiat?: string;
  initialCountry?: string;
}

const FIATS = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'AED', 'INR', 'BRL', 'MXN', 'NGN', 'TRY'];

const COIN_LIST: { symbol: string; name: string }[] = [
  { symbol: 'USDT', name: 'TetherUS' },
  { symbol: 'BTC',  name: 'Bitcoin' },
  { symbol: 'ETH',  name: 'Ethereum' },
  { symbol: 'BNB',  name: 'BNB' },
  { symbol: 'SOL',  name: 'Solana' },
  { symbol: 'XRP',  name: 'XRP' },
  { symbol: 'TRX',  name: 'TRON' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'ADA',  name: 'Cardano' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'DOT',  name: 'Polkadot' },
  { symbol: 'MATIC',name: 'Polygon' },
  { symbol: 'LTC',  name: 'Litecoin' },
];

// Yaklaşık USD→fiat kurları (CoinGecko fiat fiyatlarıyla doğru hesap için).
// Worker'dan da çekebiliriz ama burada basit/sabit hızlı tahmin yeterli — preview ekranı.
const USD_PER_FIAT_FALLBACK: Record<string, number> = {
  USD: 1,    EUR: 1.08, GBP: 1.27, AUD: 0.66, CAD: 0.74, JPY: 0.0067,
  AED: 0.27, INR: 0.012, BRL: 0.20, MXN: 0.058, NGN: 0.00065, TRY: 0.022,
};

type Side = 'BUY' | 'SELL';
type Step = 'amount' | 'coin' | 'fiat' | 'method' | 'preview';

type PaymentMethod = {
  id: string;
  label: string;
  sub: string;
  icon: 'wallet' | 'card' | 'p2p';
  feePct: number;     // tahmini ücret (yüzde)
  available: boolean;
  unavailableReason?: string;
};

export default function BuyCryptoModal({
  isOpen, onClose, onOpenP2P,
  initialFiat = 'USD', initialCountry = 'US',
}: BuyCryptoModalProps) {
  const safeInitialFiat = FIATS.includes(initialFiat) ? initialFiat : 'USD';
  const [step, setStep] = useState<Step>('amount');
  const [side] = useState<Side>('BUY'); // SELL henüz implement değil — sadece BUY
  const [amount, setAmount] = useState<string>(''); // string for input control
  const [coin, setCoin] = useState<string>('USDT');
  const [fiat, setFiat] = useState<string>(safeInitialFiat);
  const [methodId, setMethodId] = useState<string>('moonpay');
  const [coinSearch, setCoinSearch] = useState('');
  const [prices, setPrices] = useState<Map<string, { price: number; change24h: number }>>(new Map());
  const [basonceUsdt, setBasonceUsdt] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Modal açılınca state'i sıfırla, fiyatları çek
  useEffect(() => {
    if (!isOpen) return;
    setStep('amount'); setAmount('');
    setCoin('USDT'); setFiat(safeInitialFiat); setMethodId('moonpay'); setCoinSearch('');
    document.body.classList.add('deposit-modal-open');
    return () => document.body.classList.remove('deposit-modal-open');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFiat]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      // Fiyatlar — USDT sabit 1 USD, diğerleri CoinGecko
      const symbols = COIN_LIST.map(c => c.symbol).filter(s => s !== 'USDT');
      const map = await fetchCoinGeckoPrices(symbols).catch(() => new Map());
      if (cancelled) return;
      const out = new Map<string, { price: number; change24h: number }>();
      out.set('USDT', { price: 1, change24h: 0 });
      map.forEach((v, k) => out.set(k, { price: v.price, change24h: v.change24h }));
      setPrices(out);

      // basonce wallet bakiyesi (USDT)
      const user = await getCurrentUser();
      if (!user) return;
      const { data } = await supabase.from('user_balances').select('balance').eq('user_id', user.id).eq('symbol', 'USDT').maybeSingle();
      if (!cancelled) setBasonceUsdt(Number(data?.balance) || 0);
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  const usdPerFiat = USD_PER_FIAT_FALLBACK[fiat] ?? 1;
  const coinUsdPrice = prices.get(coin)?.price ?? 0;

  // Receive amount = (fiatAmount × usdPerFiat ÷ coinUsdPrice) × (1 - feePct/100)
  const calcReceive = (fiatAmount: number, feePct: number) => {
    if (!coinUsdPrice || fiatAmount <= 0) return 0;
    const usd = fiatAmount * usdPerFiat;
    const gross = usd / coinUsdPrice;
    return gross * (1 - feePct / 100);
  };

  const fiatAmount = Number(amount) || 0;

  // Ödeme yöntemleri (her birinde tahmini "alacağın" miktar var)
  const methods: PaymentMethod[] = useMemo(() => {
    const list: PaymentMethod[] = [];
    // basonce wallet sadece USDT kullanır (sahip olduğun USDT'yi başka coin'e çevir = burada kapsam dışı; SELL aksi halinde uygundur)
    list.push({
      id: 'wallet', label: 'basonce wallet', sub: `${basonceUsdt.toFixed(2)} USDT available`,
      icon: 'wallet', feePct: 0, available: side === 'BUY' ? basonceUsdt > 0 && coin !== 'USDT' : true,
      unavailableReason: side === 'BUY' && coin === 'USDT' ? 'Already USDT' : (basonceUsdt <= 0 ? 'No USDT balance' : undefined),
    });
    // Card sağlayıcılar: şu an sadece USDT/TRC20 destekli — basonce wallet TRC20 adresine teslim
    const cardAvailable = coin === 'USDT';
    list.push({
      id: 'moonpay', label: 'Card · MoonPay',
      sub: cardAvailable ? 'Visa · Mastercard · Apple Pay · Google Pay' : 'Card buys USDT only — switch coin to USDT',
      icon: 'card', feePct: 3.5, available: cardAvailable,
      unavailableReason: cardAvailable ? undefined : 'USDT only',
    });
    list.push({
      id: 'mercuryo', label: 'Card · Mercuryo',
      sub: cardAvailable ? 'Visa · Mastercard · Apple Pay · SEPA' : 'Card buys USDT only — switch coin to USDT',
      icon: 'card', feePct: 3.95, available: cardAvailable,
      unavailableReason: cardAvailable ? undefined : 'USDT only',
    });
    return list;
  }, [basonceUsdt, side, coin]);

  const selectedMethod = methods.find(m => m.id === methodId) ?? methods[0];
  const receiveAmount = calcReceive(fiatAmount, selectedMethod?.feePct ?? 3.5);

  // Numpad
  const press = (k: string) => {
    setAmount(prev => {
      if (k === 'back') return prev.slice(0, -1);
      if (k === '.') {
        if (prev.includes('.')) return prev;
        return prev === '' ? '0.' : prev + '.';
      }
      // sayı
      if (prev === '0' && k !== '.') return k;
      if (prev.length >= 12) return prev;
      return prev + k;
    });
  };

  // Confirm — sağlayıcıya yönlendir veya P2P'ye git veya basonce wallet ile çevir
  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) { alert('Please log in first.'); return; }

      if (selectedMethod.id === 'p2p') {
        onOpenP2P?.();
        onClose();
        return;
      }

      if (selectedMethod.id === 'wallet') {
        // basonce balance ile coin alımı — şu an iç swap rotası yok, P2P'ye düşür
        alert('In-app conversion from your basonce balance is not yet enabled — falling back to P2P merchants for now.');
        onOpenP2P?.();
        onClose();
        return;
      }

      // Card sağlayıcılar — gerçek TRC20 adresini al, widget'ı aç
      const fetchTrc20 = async () => {
        const { data: wallets } = await supabase.rpc('get_user_deposit_addresses', { user_id_param: user.id });
        return (wallets || []).find((w: any) => w.network === 'TRC20');
      };
      let trc20 = await fetchTrc20();
      if (!trc20) {
        const { data: assignResult, error: assignErr } = await supabase.rpc('assign_wallet_to_user', { p_user_id: user.id });
        if (assignErr) {
          console.error('assign_wallet_to_user error:', assignErr);
          alert('Could not assign a deposit wallet right now. Please try again or contact support.');
          return;
        }
        if (assignResult?.success) trc20 = await fetchTrc20();
      }
      if (!trc20?.address) {
        alert('Deposit wallet not ready yet. Please open Deposit once, then try again.');
        return;
      }

      let url = '';
      if (selectedMethod.id === 'moonpay') {
        const p = new URLSearchParams({
          currencyCode: 'usdt_trx',
          walletAddress: trc20.address,
          baseCurrencyCode: fiat.toLowerCase(),
          baseCurrencyAmount: String(fiatAmount || 100),
          lockAmount: 'true',
          externalCustomerId: user.id,
          showWalletAddressForm: 'false',
          colorCode: '#FCD535',
          theme: 'dark',
        });
        url = `https://buy.moonpay.com/?${p.toString()}`;
      } else if (selectedMethod.id === 'mercuryo') {
        // Mercuryo widget URL params: amount (fiat tutarı), currency (alınacak coin), fix_* ile kilitle
        const p = new URLSearchParams({
          type: 'buy',
          currency: 'USDT',
          network: 'TRX',
          address: trc20.address,
          fiat_currency: fiat,
          amount: String(fiatAmount || 100),
          fix_amount: 'true',
          fix_currency: 'true',
          fix_fiat_currency: 'true',
          fix_fiat_amount: 'true',
          merchant_transaction_id: `basonce_${user.id}_${Date.now()}`,
        });
        url = `https://exchange.mercuryo.io/?${p.toString()}`;
      }
      if (url && typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Could not start the order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Sub-step header (back arrow + title)
  const SubHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
      <button onClick={onBack} className="text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E]">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h2 className="text-white font-bold text-base flex-1">{title}</h2>
      <button onClick={onClose} className="text-gray-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E]">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  // Coin row
  const CoinRow = ({ symbol, name, onClick, active }: { symbol: string; name: string; onClick: () => void; active?: boolean }) => {
    const p = prices.get(symbol);
    const change = p?.change24h ?? 0;
    const changeColor = change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]';
    return (
      <button onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1C1F27] active:bg-[#22262E] transition-colors ${active ? 'bg-[#1C1F27]' : ''}`}>
        <img src={getLogo(symbol)} alt={symbol} className="w-8 h-8 rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{symbol}</span>
          </div>
          <div className="text-[11px] text-gray-500 truncate">{name}</div>
        </div>
        <div className="text-right">
          <div className="text-white text-sm font-semibold">${p?.price ? p.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</div>
          <div className={`text-[11px] font-semibold ${changeColor}`}>
            {p ? `${change >= 0 ? '↗' : '↘'} ${Math.abs(change).toFixed(2)}%` : ''}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/90">
      <div className="bg-[#0B0E11] w-full max-w-[480px] flex flex-col"
           style={{
             height: '100dvh',
             maxHeight: '100dvh',
             paddingBottom: 'env(safe-area-inset-bottom)',
           }}>

        {/* === Step: amount === */}
        {step === 'amount' && (
          <>
            {/* Header — Buy Crypto başlık + close ok */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
              <button onClick={onClose} className="text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] -ml-2">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-white font-bold text-base">Buy Crypto</h2>
              <button className="text-gray-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] -mr-2" title="History">
                <Wallet className="w-4 h-4" />
              </button>
            </div>

            {/* Tutar — kompakt, scroll edebilen orta bölüm */}
            <div className="px-4 pt-2 pb-2 shrink-0">
              <button onClick={() => setStep('fiat')} className="flex items-baseline gap-2 group">
                <span className="text-[44px] leading-none font-bold text-white tabular-nums">
                  {amount === '' ? '0' : amount}
                </span>
                <span className="text-white text-xl font-bold flex items-center gap-1">
                  {fiat}
                  <ChevronRight className="w-4 h-4 rotate-90 text-gray-400 group-hover:text-white" />
                </span>
              </button>
              <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                <ArrowDownUp className="w-3 h-3" />
                <span className="tabular-nums">{receiveAmount.toFixed(receiveAmount >= 1 ? 2 : 6)} {coin}</span>
              </div>
            </div>

            {/* Esnek boşluk — viewport büyükse aşağıyı doldurur */}
            <div className="flex-1 min-h-0" />

            {/* Coin row */}
            <button onClick={() => setStep('coin')}
              className="flex items-center gap-3 px-4 py-2.5 border-t border-[#22262E] hover:bg-[#1C1F27] transition-colors shrink-0">
              <img src={getLogo(coin)} alt={coin} className="w-7 h-7 rounded-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
              <div className="flex-1 text-left">
                <div className="text-white font-bold text-sm leading-tight">Buy</div>
                <div className="text-gray-500 text-[11px] leading-tight">{coin}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>

            {/* Payment method row */}
            <button onClick={() => setStep('method')}
              className="flex items-center gap-3 px-4 py-2.5 border-t border-[#22262E] hover:bg-[#1C1F27] transition-colors shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#22262E] flex items-center justify-center">
                {selectedMethod.icon === 'wallet' && <Wallet className="w-3.5 h-3.5 text-gray-300" />}
                {selectedMethod.icon === 'card'   && <CreditCard className="w-3.5 h-3.5 text-gray-300" />}
                {selectedMethod.icon === 'p2p'    && <Users className="w-3.5 h-3.5 text-gray-300" />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-white font-bold text-sm leading-tight">Payment method</div>
                <div className="text-gray-500 text-[11px] leading-tight truncate">{selectedMethod.label}</div>
              </div>
              {selectedMethod.icon === 'card' && <CardBrands size={14} />}
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>

            {/* Preview Order CTA */}
            <div className="px-4 py-2.5 border-t border-[#22262E] shrink-0">
              <button onClick={() => fiatAmount > 0 && setStep('preview')} disabled={fiatAmount <= 0}
                className="w-full bg-[#FCD535] disabled:bg-[#5C4A0A] disabled:text-gray-500 text-black font-bold text-sm py-3 rounded-xl transition-colors">
                Preview Order
              </button>
            </div>

            {/* Numpad — kompakt, ekrana sığacak şekilde */}
            <div className="grid grid-cols-3 gap-px bg-[#22262E] shrink-0">
              {['1','2','3','4','5','6','7','8','9','.','0','back'].map(k => (
                <button key={k} onClick={() => press(k)}
                  className="bg-[#0B0E11] hover:bg-[#1C1F27] active:bg-[#22262E] text-white text-xl font-semibold py-2.5 transition-colors flex items-center justify-center">
                  {k === 'back' ? <Delete className="w-4 h-4" /> : k}
                </button>
              ))}
            </div>
          </>
        )}

        {/* === Step: coin === */}
        {step === 'coin' && (
          <>
            <SubHeader title="Select Crypto" onBack={() => setStep('amount')} />
            <div className="px-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={coinSearch} onChange={(e) => setCoinSearch(e.target.value)} placeholder="Search"
                  className="w-full bg-[#1C1F27] text-white text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FCD535]/40" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {COIN_LIST
                .filter(c => !coinSearch || c.symbol.toLowerCase().includes(coinSearch.toLowerCase()) || c.name.toLowerCase().includes(coinSearch.toLowerCase()))
                .map(c => (
                  <CoinRow key={c.symbol} symbol={c.symbol} name={c.name}
                    active={coin === c.symbol}
                    onClick={() => { setCoin(c.symbol); setStep('amount'); }} />
                ))}
              <p className="text-[11px] text-gray-600 text-center px-4 py-4">
                Prices are real-time references; final rate is shown on Preview.
              </p>
            </div>
          </>
        )}

        {/* === Step: fiat === */}
        {step === 'fiat' && (
          <>
            <SubHeader title="Select Currency" onBack={() => setStep('amount')} />
            <div className="flex-1 overflow-y-auto">
              {FIATS.map(f => (
                <button key={f} onClick={() => { setFiat(f); setStep('amount'); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#1C1F27] active:bg-[#22262E] transition-colors ${fiat === f ? 'bg-[#1C1F27]' : ''}`}>
                  <span className="text-white font-bold text-sm">{f}</span>
                  {fiat === f && <Check className="w-4 h-4 text-[#FCD535]" />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* === Step: method === */}
        {step === 'method' && (
          <>
            <SubHeader title="Payment Method" onBack={() => setStep('amount')} />
            <p className="px-4 pb-2 text-[11px] text-gray-500 shrink-0">Recommended</p>
            <div className="px-4 pb-2 shrink-0">
              {methods.slice(0, 1).map(m => (
                <MethodRow key={m.id} m={m} active={methodId === m.id} receive={calcReceive(fiatAmount, m.feePct)} coin={coin}
                  onClick={() => { if (m.available) { setMethodId(m.id); setStep('amount'); } }} />
              ))}
            </div>
            <p className="px-4 pb-2 pt-2 text-[11px] text-gray-500 shrink-0">Others</p>
            <div className="px-4 pb-4 flex-1 overflow-y-auto space-y-2">
              {methods.slice(1).map(m => (
                <MethodRow key={m.id} m={m} active={methodId === m.id} receive={calcReceive(fiatAmount, m.feePct)} coin={coin}
                  onClick={() => { if (m.available) { setMethodId(m.id); setStep('amount'); } }} />
              ))}
            </div>
          </>
        )}

        {/* === Step: preview === */}
        {step === 'preview' && (
          <>
            <SubHeader title="Preview Order" onBack={() => setStep('amount')} />
            <div className="px-4 py-2 flex-1 overflow-y-auto">
              <div className="bg-[#1C1F27] border border-[#22262E] rounded-2xl p-5 space-y-4">
                <div className="text-center">
                  <div className="text-gray-500 text-xs">You receive</div>
                  <div className="text-white text-3xl font-bold tabular-nums mt-1">
                    {receiveAmount.toFixed(receiveAmount >= 1 ? 4 : 6)} {coin}
                  </div>
                  <div className="text-gray-400 text-sm mt-1 tabular-nums">
                    by spending {fiatAmount.toLocaleString()} {fiat}
                  </div>
                </div>
                <div className="border-t border-[#22262E] pt-4 space-y-2.5 text-sm">
                  <Row label="Pay amount"   value={`${fiatAmount.toLocaleString()} ${fiat}`} />
                  <Row label="Receive coin" value={coin} />
                  <Row label="Network"      value={coin === 'USDT' ? 'Tron (TRC20)' : 'Default'} />
                  <Row label="Method"       value={selectedMethod.label} />
                  <Row label="Provider fee" value={`~${selectedMethod.feePct}%`} />
                  <Row label="Reference rate" value={coinUsdPrice ? `1 ${coin} ≈ $${coinUsdPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'} />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 text-center mt-3 px-4">
                Funds are delivered to your basonce wallet. The provider opens in a new tab to complete payment securely.
              </p>
            </div>
            <div className="px-4 py-3 border-t border-[#22262E] shrink-0">
              <button onClick={handleConfirm} disabled={submitting || fiatAmount <= 0}
                className="w-full bg-[#FCD535] disabled:bg-[#5C4A0A] disabled:text-gray-500 text-black font-bold text-base py-3.5 rounded-xl transition-colors">
                {submitting ? 'Opening provider…' : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-medium text-right truncate">{value}</span>
    </div>
  );
}

function MethodRow({ m, active, receive, coin, onClick }: { m: PaymentMethod; active: boolean; receive: number; coin: string; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={!m.available}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
        active ? 'border-[#FCD535] bg-[#FCD535]/5'
               : m.available ? 'border-[#22262E] bg-[#1C1F27] hover:bg-[#22262E]'
                             : 'border-[#22262E] bg-[#1C1F27] opacity-50 cursor-not-allowed'
      }`}>
      <div className="w-9 h-9 rounded-lg bg-[#22262E] flex items-center justify-center shrink-0">
        {m.icon === 'wallet' && <Wallet className="w-4 h-4 text-gray-300" />}
        {m.icon === 'card'   && <CardBrands size={12} />}
        {m.icon === 'p2p'    && <Users className="w-4 h-4 text-gray-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm truncate">{m.label}</span>
        </div>
        <div className="text-[11px] text-gray-500 truncate">
          {m.available ? m.sub : (m.unavailableReason || 'Unavailable')}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[10px] text-gray-500">Receive</div>
        <div className="text-white text-sm font-semibold tabular-nums">
          {m.available ? `${receive.toFixed(receive >= 1 ? 2 : 4)} ${coin}` : '—'}
        </div>
      </div>
    </button>
  );
}

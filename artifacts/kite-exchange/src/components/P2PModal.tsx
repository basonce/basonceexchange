import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, Shield, ChevronDown, Star, Clock, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface P2PModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tüm büyük P2P fiat'ları — TRY EN SONDA, varsayılan değil
const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'EU', name: 'Eurozone', currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'AE', name: 'UAE', currency: 'AED' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
  { code: 'RU', name: 'Russia', currency: 'RUB' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'VE', name: 'Venezuela', currency: 'VES' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'PE', name: 'Peru', currency: 'PEN' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'PL', name: 'Poland', currency: 'PLN' },
  { code: 'RO', name: 'Romania', currency: 'RON' },
  { code: 'CZ', name: 'Czechia', currency: 'CZK' },
  { code: 'HU', name: 'Hungary', currency: 'HUF' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
  { code: 'IL', name: 'Israel', currency: 'ILS' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
  { code: 'OM', name: 'Oman', currency: 'OMR' },
  { code: 'JO', name: 'Jordan', currency: 'JOD' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN' },
  { code: 'GE', name: 'Georgia', currency: 'GEL' },
  { code: 'MA', name: 'Morocco', currency: 'MAD' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD' },
  { code: 'TN', name: 'Tunisia', currency: 'TND' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  // TRY en sonda — istek üzerine vurgulanmıyor
  { code: 'TR', name: 'Türkiye', currency: 'TRY' },
] as const;

const COINS = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC'] as const;

// Borsa görünümü için renk kodları
const EXCHANGE_COLORS: Record<string, { bg: string; text: string }> = {
  binance: { bg: 'bg-[#F0B90B]/15', text: 'text-[#F0B90B]' },
  bybit:   { bg: 'bg-[#FFA800]/15', text: 'text-[#FFA800]' },
  okx:     { bg: 'bg-white/15',     text: 'text-white' },
  kucoin:  { bg: 'bg-[#23AF91]/15', text: 'text-[#23AF91]' },
};

// Affiliate kodları — kullanıcı kendi kodlarıyla değiştirir (şimdilik boş)
const AFFILIATE = {
  binance: '',  // örn: 'AFF_123' → ?ref=AFF_123 eklenir
  bybit:   '',  // örn: '78901'   → ?affiliate_id=78901 eklenir
  okx:     '',  // örn: 'YOURCODE'→ ?inviterCode=YOURCODE
  kucoin:  '',  // örn: 'YOURCODE'→ ?rcode=YOURCODE
};

// Borsanın genel P2P linkine yönlendirme — affiliate destekli
function buildDeepLink(exchange: string, asset: string, fiat: string, type: 'BUY'|'SELL', advertiserNo?: string): string {
  const t = type.toLowerCase();
  switch (exchange) {
    case 'binance': {
      const ref = AFFILIATE.binance ? `&ref=${AFFILIATE.binance}` : '';
      if (advertiserNo) return `https://p2p.binance.com/en/advertiserDetail?advertiserNo=${advertiserNo}${ref}`;
      return `https://p2p.binance.com/en/trade/all-payments/${asset}?fiat=${fiat}${ref}`;
    }
    case 'bybit': {
      // actionType matches aggregator-side mapping: user BUY -> 0 (advertiser SELL ads), user SELL -> 1.
      const side = type === 'BUY' ? '0' : '1';
      const ref = AFFILIATE.bybit ? `&affiliate_id=${AFFILIATE.bybit}` : '';
      return `https://www.bybit.com/fiat/trade/otc/?actionType=${side}&token=${asset}&fiat=${fiat}${ref}`;
    }
    case 'okx': {
      const ref = AFFILIATE.okx ? `?inviterCode=${AFFILIATE.okx}` : '';
      return `https://www.okx.com/p2p-markets/${fiat.toLowerCase()}/${t}-${asset.toLowerCase()}${ref}`;
    }
    case 'kucoin': {
      const ref = AFFILIATE.kucoin ? `?rcode=${AFFILIATE.kucoin}` : '';
      return `https://www.kucoin.com/otc/${t}/${asset}-${fiat}${ref}`;
    }
    default: return '#';
  }
}

// Worker /p2p/aggregate yanıt tipi
interface AggregatedAd {
  exchange: 'binance'|'bybit'|'okx'|'kucoin';
  merchantName: string;
  price: number;
  available: number;
  minAmount: number;
  maxAmount: number;
  paymentMethods: string[];
  completionRate: number;
  orders: number;
  advertiserNo?: string;
}

// API base — replit.dev preview'dan production'a vur
const API_BASE = (() => {
  if (typeof window !== 'undefined' && /replit\.dev|localhost/.test(window.location.host)) {
    return 'https://basonce.com/api';
  }
  return '/api';
})();

function formatNum(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPrice(p: number): string {
  if (p >= 10000) return formatNum(Math.round(p));
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

export default function P2PModal({ isOpen, onClose }: P2PModalProps) {
  const [tab, setTab] = useState<'BUY'|'SELL'>('BUY');
  const [selectedCoin, setSelectedCoin] = useState<string>('USDT');
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[number]>(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [ads, setAds] = useState<AggregatedAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchedKey, setLastFetchedKey] = useState<string>('');
  const [buyingCard, setBuyingCard] = useState(false);
  const [providerPicker, setProviderPicker] = useState<{
    address: string;
    userId: string;
  } | null>(null);
  const refreshRef = useRef<number | null>(null);

  // Modal açıldığında ve filtreler değiştiğinde veri çek
  useEffect(() => {
    if (!isOpen) return;
    const key = `${selectedCoin}|${selectedCountry.currency}|${tab}`;
    let cancelled = false;
    setLoading(true);

    const url = `${API_BASE}/p2p/aggregate?fiat=${selectedCountry.currency}&asset=${selectedCoin}&type=${tab}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const list: AggregatedAd[] = Array.isArray(data?.ads) ? data.ads : [];
        setAds(list);
        setLastFetchedKey(key);
      })
      .catch(() => { if (!cancelled) setAds([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isOpen, selectedCoin, selectedCountry, tab]);

  // Otomatik 30 sn yenileme
  useEffect(() => {
    if (!isOpen) return;
    refreshRef.current = window.setInterval(() => {
      const url = `${API_BASE}/p2p/aggregate?fiat=${selectedCountry.currency}&asset=${selectedCoin}&type=${tab}`;
      fetch(url).then(r => r.json()).then(data => {
        const list: AggregatedAd[] = Array.isArray(data?.ads) ? data.ads : [];
        if (list.length > 0) setAds(list);
      }).catch(() => {});
    }, 30000);
    return () => { if (refreshRef.current) window.clearInterval(refreshRef.current); };
  }, [isOpen, selectedCoin, selectedCountry, tab]);

  // Mevcut listeden tüm ödeme yöntemlerini topla (filtre için)
  const allPaymentMethods = useMemo(() => {
    const set = new Set<string>();
    ads.forEach(a => a.paymentMethods.forEach(p => set.add(p)));
    return ['All', ...Array.from(set).slice(0, 10)];
  }, [ads]);

  const filteredAds = useMemo(() => {
    let list = ads;
    if (selectedPayment !== 'All') {
      list = list.filter(a => a.paymentMethods.some(p => p.toLowerCase() === selectedPayment.toLowerCase()));
    }
    if (amountInput) {
      const amt = parseFloat(amountInput);
      if (!isNaN(amt)) list = list.filter(a => a.minAmount <= amt && a.maxAmount >= amt);
    }
    return list;
  }, [ads, selectedPayment, amountInput]);

  if (!isOpen) return null;

  const handleTrade = (ad: AggregatedAd) => {
    const url = buildDeepLink(ad.exchange, selectedCoin, selectedCountry.currency, tab, ad.advertiserNo);
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBuyWithCard = async () => {
    if (buyingCard) return;
    setBuyingCard(true);
    try {
      // 1) Kullanıcının basonce wallet_pool'dan atanmış GERÇEK TRC20 USDT adresini bul.
      //    Yoksa wallet_pool'dan bir tane atayalım. (RealDepositModal ile aynı RPC akışı.)
      const user = await getCurrentUser();
      if (!user) {
        alert('Please log in first so we can deliver USDT to your basonce wallet.');
        return;
      }

      const fetchTrc20 = async () => {
        const { data: wallets } = await supabase
          .rpc('get_user_deposit_addresses', { user_id_param: user.id });
        return (wallets || []).find((w: any) => w.network === 'TRC20');
      };

      let trc20 = await fetchTrc20();
      if (!trc20) {
        // Havuzdan ata, sonra tekrar oku
        const { data: assignResult, error: assignError } = await supabase
          .rpc('assign_wallet_to_user', { p_user_id: user.id });
        if (assignError || !assignResult?.success) {
          alert('Could not assign a deposit wallet right now. Please try again or contact support.');
          return;
        }
        trc20 = await fetchTrc20();
      }
      if (!trc20?.address) {
        alert('No TRC20 deposit wallet available. Please open Deposit once to initialize, then try again.');
        return;
      }

      // 2) Adres + userId hazır → kullanıcının seçim yapabileceği picker'ı aç.
      //    Sağlayıcılar ülkeye göre sıralanır (Türkiye için Mercuryo/Transak öne).
      setProviderPicker({ address: trc20.address, userId: user.id });
    } catch (e) {
      console.error('Buy with card failed:', e);
      alert('Could not start card purchase. Please try again.');
    } finally {
      setBuyingCard(false);
    }
  };

  // Provider link builder'lar — hepsi USDT-TRC20'yi user'ın gerçek adresine yollar
  const buildMoonPayUrl = (address: string, userId: string, fiat: string) => {
    const p = new URLSearchParams({
      currencyCode: 'usdt_trx',
      walletAddress: address,
      baseCurrencyCode: fiat.toLowerCase(),
      externalCustomerId: userId,
      showWalletAddressForm: 'false',
    });
    return `https://buy.moonpay.com/?${p.toString()}`;
  };
  const buildTransakUrl = (address: string, userId: string, fiat: string) => {
    const p = new URLSearchParams({
      cryptoCurrencyCode: 'USDT',
      network: 'tron',
      walletAddress: address,
      fiatCurrency: fiat,
      defaultPaymentMethod: 'credit_debit_card',
      partnerCustomerId: userId,
      disableWalletAddressForm: 'true',
      hideMenu: 'true',
    });
    return `https://global.transak.com/?${p.toString()}`;
  };
  const buildMercuryoUrl = (address: string, userId: string, fiat: string) => {
    const p = new URLSearchParams({
      type: 'buy',
      currency: 'USDT',
      network: 'TRX',
      address,
      fiat_currency: fiat,
      merchant_transaction_id: userId,
      hide_address: 'true',
    });
    return `https://exchange.mercuryo.io/?${p.toString()}`;
  };

  type Provider = {
    key: string;
    name: string;
    badge: string;
    note: string;
    url: string;
  };
  const getProvidersForCountry = (address: string, userId: string, fiat: string, country: string): Provider[] => {
    const moonpay: Provider = {
      key: 'moonpay', name: 'MoonPay', badge: 'Global',
      note: '160+ countries · Apple Pay/Google Pay',
      url: buildMoonPayUrl(address, userId, fiat),
    };
    const transak: Provider = {
      key: 'transak', name: 'Transak', badge: 'Global',
      note: '150+ countries · Card / bank transfer',
      url: buildTransakUrl(address, userId, fiat),
    };
    const mercuryo: Provider = {
      key: 'mercuryo', name: 'Mercuryo', badge: 'TR ✓',
      note: 'Works in Turkey · Card / Apple Pay',
      url: buildMercuryoUrl(address, userId, fiat),
    };
    // Türkiye: Mercuryo ve Transak öne, MoonPay sona (TR'de zaten kart kabul etmiyor)
    if (country === 'TR' || fiat === 'TRY') return [mercuryo, transak, moonpay];
    return [moonpay, transak, mercuryo];
  };

  const handleManualRefresh = () => {
    if (loading) return;
    setLoading(true);
    const url = `${API_BASE}/p2p/aggregate?fiat=${selectedCountry.currency}&asset=${selectedCoin}&type=${tab}&_=${Date.now()}`;
    fetch(url).then(r => r.json()).then(data => {
      const list: AggregatedAd[] = Array.isArray(data?.ads) ? data.ads : [];
      setAds(list);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-50">
      <div className="bg-[#0B0E11] w-full max-w-[480px] rounded-t-2xl border-t border-x border-[#22262E] shadow-2xl flex flex-col"
        style={{ height: 'calc(100dvh - 60px)', maxHeight: 'calc(100dvh - 60px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-base">P2P Trading</h2>
            <span className="text-[10px] bg-[#F0B90B]/15 text-[#F0B90B] px-2 py-0.5 rounded-full font-semibold border border-[#F0B90B]/20">Live Market</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleManualRefresh} disabled={loading}
              className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* "Buy with Card" CTA */}
        <div className="px-4 pb-3 shrink-0">
          <button onClick={handleBuyWithCard} disabled={buyingCard}
            className="w-full bg-gradient-to-r from-[#F0B90B] to-[#FFD24A] hover:from-[#E0AB00] hover:to-[#F0C840] disabled:opacity-60 text-black font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#F0B90B]/20 transition-all active:scale-[0.98]">
            <CreditCard className="w-4 h-4" />
            {buyingCard ? 'Preparing…' : 'Buy USDT with Card'}
            {!buyingCard && <ExternalLink className="w-3 h-3 opacity-60" />}
          </button>
        </div>

        {/* Provider picker — kullanıcı sağlayıcısını seçer (ülkeye göre sıralı) */}
        {providerPicker && (
          <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/70 backdrop-blur-sm"
               onClick={() => setProviderPicker(null)}>
            <div className="bg-[#0B0E11] w-full max-w-[480px] rounded-t-2xl border-t border-x border-[#22262E] p-4 pb-6"
                 onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-base">Choose payment provider</h3>
                <button onClick={() => setProviderPicker(null)}
                        className="text-gray-500 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#22262E]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                USDT will be delivered to your basonce wallet on the Tron (TRC20) network.
              </p>
              <div className="space-y-2">
                {getProvidersForCountry(
                  providerPicker.address, providerPicker.userId,
                  selectedCountry.currency, selectedCountry.code,
                ).map((p) => (
                  <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer"
                     onClick={() => setProviderPicker(null)}
                     className="flex items-center justify-between gap-3 bg-[#1C1F27] hover:bg-[#22262E] border border-[#22262E] rounded-xl p-3 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{p.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${
                          p.badge.startsWith('TR')
                            ? 'bg-[#0ECB81]/15 text-[#0ECB81] border-[#0ECB81]/20'
                            : 'bg-[#F0B90B]/15 text-[#F0B90B] border-[#F0B90B]/20'
                        }`}>{p.badge}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">{p.note}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 shrink-0" />
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-3 text-center">
                All providers require ID verification by law (card networks &amp; regulator rules).
                We pick the one with the lightest KYC for your country.
              </p>
            </div>
          </div>
        )}

        {/* Buy/Sell */}
        <div className="flex px-4 pb-3 gap-2 shrink-0">
          <button onClick={() => setTab('BUY')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'BUY' ? 'bg-[#0ECB81] text-black shadow-lg shadow-[#0ECB81]/20' : 'text-gray-500 hover:text-gray-300 bg-[#1C1F27]'}`}>Buy</button>
          <button onClick={() => setTab('SELL')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'SELL' ? 'bg-[#F6465D] text-white shadow-lg shadow-[#F6465D]/20' : 'text-gray-500 hover:text-gray-300 bg-[#1C1F27]'}`}>Sell</button>
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
              <div className="absolute right-0 top-full mt-1 bg-[#1C1F27] border border-[#2A2F3A] rounded-xl shadow-2xl z-20 w-56 py-1 max-h-72 overflow-y-auto">
                {COUNTRIES.map(c => (
                  <button key={c.code} onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); setSelectedPayment('All'); }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${selectedCountry.code === c.code ? 'text-[#F0B90B] bg-[#F0B90B]/5' : 'text-gray-300 hover:bg-[#22262E]'}`}>
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-xs font-semibold text-gray-500 ml-2 shrink-0">{c.currency}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment + Amount filter */}
        <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
          <div className="flex gap-1.5 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {allPaymentMethods.map(p => (
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
          {loading && filteredAds.length === 0 && (
            <div className="px-4 py-3 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-[#12151C] border border-[#1C1F27] rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#22262E]" />
                    <div className="h-3 w-32 bg-[#22262E] rounded" />
                  </div>
                  <div className="h-6 w-24 bg-[#22262E] rounded mb-2" />
                  <div className="h-3 w-40 bg-[#22262E] rounded" />
                </div>
              ))}
            </div>
          )}

          {!loading && filteredAds.length === 0 && lastFetchedKey && (
            <div className="text-center py-12 text-gray-600 text-sm">
              No live merchants for this filter — try another currency or coin
            </div>
          )}

          {filteredAds.map((ad, idx) => {
            const exColor = EXCHANGE_COLORS[ad.exchange] || { bg: 'bg-white/10', text: 'text-white' };
            const exName = ad.exchange.charAt(0).toUpperCase() + ad.exchange.slice(1);
            return (
              <div key={`${ad.exchange}-${idx}-${ad.merchantName}`} className="px-4 py-4 border-b border-[#1C1F27] hover:bg-[#12151C]/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: merchant info + price */}
                  <div className="flex-1 min-w-0">
                    {/* Avatar + name + exchange badge */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="bg-[#1C1F27] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm truncate max-w-[130px]">{ad.merchantName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${exColor.bg} ${exColor.text}`}>{exName}</span>
                        <div className="w-4 h-4 rounded-full bg-[#F0B90B]/20 border border-[#F0B90B]/40 flex items-center justify-center shrink-0">
                          <Star className="w-2 h-2 text-[#F0B90B] fill-[#F0B90B]" />
                        </div>
                      </div>
                    </div>
                    {/* Trade count + completion */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-gray-500 text-[11px]">
                        {formatNum(ad.orders)} orders ({(ad.completionRate * 100).toFixed(1)}%)
                      </span>
                    </div>
                    {/* Price - large */}
                    <div className="mb-2">
                      <span className="text-white font-bold text-[22px] tabular-nums leading-none">
                        {fmtPrice(ad.price)}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">{selectedCountry.currency}</span>
                    </div>
                    {/* Limit + Available */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-gray-600">Limit</span>
                        <span className="text-gray-400">{formatNum(ad.minAmount)} - {formatNum(ad.maxAmount)} {selectedCountry.currency}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-gray-600">Available</span>
                        <span className="text-gray-300 font-medium">{ad.available >= 10000 ? formatNum(ad.available, 0) : ad.available.toFixed(2)} {selectedCoin}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: payment methods + button */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex flex-col items-end gap-1 max-w-[120px]">
                      {ad.paymentMethods.slice(0, 4).map(p => (
                        <span key={p} className="text-gray-300 text-[11px] truncate">{p}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>15 min</span>
                    </div>
                    <button onClick={() => handleTrade(ad)}
                      className={`mt-1 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${tab === 'BUY' ? 'bg-[#0ECB81] hover:bg-[#00B06D] text-black' : 'bg-[#F6465D] hover:bg-[#D93A4F] text-white'}`}>
                      {tab === 'BUY' ? 'Buy' : 'Sell'} {selectedCoin}
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#1C1F27] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-[#0ECB81]" />
            <span className="text-[11px] text-gray-600">Live aggregated market</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 text-[#F0B90B] fill-[#F0B90B]" />
            <span className="text-[11px] text-gray-600">{filteredAds.length} live offers</span>
          </div>
        </div>
      </div>
    </div>
  );
}

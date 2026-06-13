import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Shield, ChevronDown, Star, Clock, CreditCard, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { COUNTRIES, generateMerchantsForCountry, type Country } from '../../lib/p2p-data';
import { useMarkets } from '../useMarkets';

type PageProps = { user?: any; onAuth?: (m: 'login' | 'register') => void; onDeposit?: () => void; onNavigate?: (t: any) => void };

const COINS = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC'] as const;

const EXCHANGE_COLORS: Record<string, { bg: string; text: string }> = {
  binance: { bg: 'bg-[#F0B90B]/15', text: 'text-[#F0B90B]' },
  bybit:   { bg: 'bg-[#FFA800]/15', text: 'text-[#FFA800]' },
  okx:     { bg: 'bg-white/15',     text: 'text-white' },
  kucoin:  { bg: 'bg-[#23AF91]/15', text: 'text-[#23AF91]' },
};

const AFFILIATE = { binance: '', bybit: '', okx: '', kucoin: '' };

function buildDeepLink(exchange: string, asset: string, fiat: string, type: 'BUY' | 'SELL', advertiserNo?: string): string {
  const t = type.toLowerCase();
  switch (exchange) {
    case 'binance': {
      const ref = AFFILIATE.binance ? `&ref=${AFFILIATE.binance}` : '';
      if (advertiserNo) return `https://p2p.binance.com/en/advertiserDetail?advertiserNo=${advertiserNo}${ref}`;
      return `https://p2p.binance.com/en/trade/all-payments/${asset}?fiat=${fiat}${ref}`;
    }
    case 'bybit': {
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
    default:
      return `https://p2p.binance.com/en/trade/all-payments/${asset}?fiat=${fiat}`;
  }
}

interface AggregatedAd {
  exchange: 'binance' | 'bybit' | 'okx' | 'kucoin';
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

interface Listing {
  id: string;
  name: string;
  exchange?: string;
  price: number;
  available: number;
  minLimit: number;
  maxLimit: number;
  paymentMethods: string[];
  completion: number;
  orders: number;
  advertiserNo?: string;
  live: boolean;
}

const API_BASE = (() => {
  if (typeof window !== 'undefined' && /replit\.dev|localhost/.test(window.location.host)) {
    return 'https://basonce.com/api';
  }
  return '/api';
})();

const COIN_USD_DEFAULT: Record<string, number> = { USDT: 1, USDC: 1, BTC: 65000, ETH: 3200, BNB: 580 };

function formatNum(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPrice(p: number): string {
  if (p >= 10000) return formatNum(Math.round(p));
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

export default function DesktopP2P({ onAuth }: PageProps) {
  const { markets } = useMarkets();
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedCoin, setSelectedCoin] = useState<string>('USDT');
  const [country, setCountry] = useState<Country>(() => COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [ads, setAds] = useState<AggregatedAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const refreshRef = useRef<number | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const coinUsd = useMemo(() => {
    const m = markets.find((x) => x.symbol === selectedCoin);
    if (m && m.price > 0) return m.price;
    return COIN_USD_DEFAULT[selectedCoin] ?? 1;
  }, [markets, selectedCoin]);

  const fetchAds = (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    const url = `${API_BASE}/p2p/aggregate?fiat=${country.currency}&asset=${selectedCoin}&type=${tab}&_=${Date.now()}`;
    return fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const list: AggregatedAd[] = Array.isArray(data?.ads) ? data.ads : [];
        if (list.length > 0) {
          setAds(list);
          setIsLive(true);
        } else {
          setAds([]);
          setIsLive(false);
        }
      })
      .catch(() => {
        setAds([]);
        setIsLive(false);
      })
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = `${API_BASE}/p2p/aggregate?fiat=${country.currency}&asset=${selectedCoin}&type=${tab}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: AggregatedAd[] = Array.isArray(data?.ads) ? data.ads : [];
        if (list.length > 0) {
          setAds(list);
          setIsLive(true);
        } else {
          setAds([]);
          setIsLive(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAds([]);
          setIsLive(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoin, country, tab]);

  useEffect(() => {
    refreshRef.current = window.setInterval(() => {
      fetchAds(false);
    }, 30000);
    return () => {
      if (refreshRef.current) window.clearInterval(refreshRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoin, country, tab]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const listings = useMemo<Listing[]>(() => {
    if (isLive && ads.length > 0) {
      return ads.map((a, i) => ({
        id: `${a.exchange}-${i}-${a.merchantName}`,
        name: a.merchantName,
        exchange: a.exchange,
        price: a.price,
        available: a.available,
        minLimit: a.minAmount,
        maxLimit: a.maxAmount,
        paymentMethods: a.paymentMethods,
        completion: a.completionRate * 100,
        orders: a.orders,
        advertiserNo: a.advertiserNo,
        live: true,
      }));
    }
    const merchants = generateMerchantsForCountry(country, 24, tab === 'BUY' ? 'buy' : 'sell');
    return merchants.map((m) => ({
      id: m.id,
      name: m.username,
      price: coinUsd * country.usdRate * m.price,
      available: m.available / coinUsd,
      minLimit: m.minLimit,
      maxLimit: m.maxLimit,
      paymentMethods: [m.paymentMethod],
      completion: m.completion,
      orders: m.trades,
      live: false,
    }));
  }, [isLive, ads, country, tab, coinUsd, selectedCoin]);

  const allPaymentMethods = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => l.paymentMethods.forEach((p) => set.add(p)));
    return ['All', ...Array.from(set).slice(0, 14)];
  }, [listings]);

  const filteredListings = useMemo(() => {
    let list = listings;
    if (selectedPayment !== 'All') {
      list = list.filter((l) => l.paymentMethods.some((p) => p.toLowerCase() === selectedPayment.toLowerCase()));
    }
    if (amountInput) {
      const amt = parseFloat(amountInput);
      if (!isNaN(amt)) list = list.filter((l) => l.minLimit <= amt && l.maxLimit >= amt);
    }
    return list;
  }, [listings, selectedPayment, amountInput]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q));
  }, [countryQuery]);

  const handleTrade = (l: Listing) => {
    const url = buildDeepLink(l.exchange || 'binance', selectedCoin, country.currency, tab, l.advertiserNo);
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleManualRefresh = () => {
    if (loading) return;
    fetchAds(true);
  };

  return (
    <div className="bg-[#0B0E11] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Title block */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-white font-bold text-3xl">P2P Trading</h1>
              <span className="text-[11px] bg-[#F0B90B]/15 text-[#F0B90B] px-2.5 py-1 rounded-full font-semibold border border-[#F0B90B]/20">
                {isLive ? 'Live Market' : 'Reference Market'}
              </span>
            </div>
            <p className="text-[#848E9C] text-sm mt-1.5">
              Buy and sell crypto with local payment methods. Aggregated advertiser offers across major exchanges.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[#848E9C] hover:text-white bg-[#181A20] border border-[#2B3139] hover:border-[#474D57] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => onAuth?.('register')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-black bg-[#F0B90B] hover:bg-[#FCD535] transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Buy Crypto
            </button>
          </div>
        </div>

        {/* Controls bar */}
        <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5 mb-5">
          {/* Buy/Sell + Country */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="inline-flex bg-[#0B0E11] border border-[#2B3139] rounded-lg p-1">
                <button
                  onClick={() => setTab('BUY')}
                  className={`px-8 py-2 rounded-md text-sm font-bold transition-all ${
                    tab === 'BUY' ? 'bg-[#0ECB81] text-black' : 'text-[#848E9C] hover:text-white'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTab('SELL')}
                  className={`px-8 py-2 rounded-md text-sm font-bold transition-all ${
                    tab === 'SELL' ? 'bg-[#F6465D] text-white' : 'text-[#848E9C] hover:text-white'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Coin selector */}
              <div className="flex items-center gap-2">
                {COINS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setSelectedCoin(c); setSelectedPayment('All'); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                      selectedCoin === c ? 'bg-[#F0B90B] text-black' : 'bg-[#0B0E11] text-[#848E9C] hover:text-white border border-[#2B3139]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Country / fiat selector + amount */}
            <div className="flex items-center gap-3">
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowCountryPicker((v) => !v)}
                  className="flex items-center gap-2 bg-[#0B0E11] hover:bg-[#1E2329] text-white text-sm font-semibold px-4 py-2.5 rounded-lg border border-[#2B3139] transition-colors min-w-[180px] justify-between"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{country.flag}</span>
                    <span className="truncate">{country.name}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="text-[#848E9C] tabular-nums">{country.currency}</span>
                    <ChevronDown className={`w-4 h-4 text-[#848E9C] transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {showCountryPicker && (
                  <div className="absolute right-0 top-full mt-2 bg-[#181A20] border border-[#2B3139] rounded-xl shadow-2xl z-30 w-72">
                    <div className="p-2 border-b border-[#2B3139]">
                      <div className="flex items-center gap-2 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-[#848E9C]" />
                        <input
                          autoFocus
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          placeholder="Search country or currency"
                          className="bg-transparent outline-none text-sm text-white placeholder-[#5E6673] flex-1 min-w-0"
                        />
                      </div>
                    </div>
                    <div className="py-1 max-h-80 overflow-y-auto">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => {
                            setCountry(c);
                            setShowCountryPicker(false);
                            setCountryQuery('');
                            setSelectedPayment('All');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors ${
                            country.code === c.code ? 'text-[#F0B90B] bg-[#F0B90B]/5' : 'text-[#EAECEF] hover:bg-[#1E2329]'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{c.flag}</span>
                            <span className="font-medium truncate">{c.name}</span>
                          </span>
                          <span className="text-xs font-semibold text-[#848E9C] tabular-nums shrink-0">{c.currency}</span>
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <div className="px-4 py-6 text-center text-[#5E6673] text-sm">No match</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 bg-[#0B0E11] border border-[#2B3139] rounded-lg px-3 py-2.5">
                <Search className="w-4 h-4 text-[#848E9C]" />
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={`Amount ${country.currency}`}
                  className="bg-transparent outline-none text-sm text-white placeholder-[#5E6673] w-32"
                />
              </div>
            </div>
          </div>

          {/* Payment method filter */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#2B3139] overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
            <span className="text-[#848E9C] text-xs font-medium shrink-0 mr-1">Payment</span>
            {allPaymentMethods.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPayment(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  selectedPayment === p
                    ? 'bg-[#1E2329] text-[#F0B90B] border border-[#F0B90B]/40'
                    : 'text-[#848E9C] hover:text-white border border-transparent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant table */}
        <div className="bg-[#181A20] border border-[#2B3139] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2.2fr_1.3fr_1.6fr_1.8fr_140px] gap-4 px-6 py-3 text-xs text-[#848E9C] font-medium border-b border-[#2B3139]">
            <div>Advertiser</div>
            <div className="text-right">Price</div>
            <div className="text-right">Available / Limit</div>
            <div>Payment</div>
            <div className="text-right">Trade</div>
          </div>

          {loading && filteredListings.length === 0 ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="py-20 text-center text-[#848E9C] text-sm">
              No merchants for this filter — try another currency, coin, or payment method
            </div>
          ) : (
            filteredListings.map((l) => {
              const exColor = l.exchange ? EXCHANGE_COLORS[l.exchange] : null;
              const exName = l.exchange ? l.exchange.charAt(0).toUpperCase() + l.exchange.slice(1) : null;
              return (
                <div
                  key={l.id}
                  className="grid grid-cols-[2.2fr_1.3fr_1.6fr_1.8fr_140px] gap-4 px-6 py-5 items-center border-b border-[#2B3139]/60 last:border-0 hover:bg-[#1E2329] transition-colors"
                >
                  {/* Advertiser */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#2B3139] flex items-center justify-center overflow-hidden">
                        <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
                          <circle cx="10" cy="10" r="4" fill="white" fillOpacity="0.9" />
                          <path d="M2 22c0-4.418 3.582-8 8-8s8 3.582 8 8" fill="white" fillOpacity="0.9" />
                          <circle cx="20" cy="10" r="3.2" fill="white" fillOpacity="0.65" />
                          <path d="M14.5 22c0-3.038 1.96-5.636 4.7-6.66A7.97 7.97 0 0 1 22 15c3.866 0 7 2.91 7 6.5" fill="white" fillOpacity="0.65" />
                        </svg>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#0ECB81] rounded-full border-2 border-[#181A20]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        <span className="text-white font-semibold text-sm truncate">{l.name}</span>
                        {exName && exColor && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm shrink-0 ${exColor.bg} ${exColor.text}`}>{exName}</span>
                        )}
                        <div className="w-4 h-4 rounded-full bg-[#F0B90B]/20 border border-[#F0B90B]/40 flex items-center justify-center shrink-0">
                          <Star className="w-2 h-2 text-[#F0B90B] fill-[#F0B90B]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#848E9C]">
                        <span className="whitespace-nowrap tabular-nums">{formatNum(l.orders)} orders</span>
                        <span className="flex items-center gap-1 whitespace-nowrap tabular-nums text-[#0ECB81]">
                          <Check className="w-3 h-3" />
                          {l.completion.toFixed(1)}%
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          15 min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-white font-bold text-lg tabular-nums whitespace-nowrap leading-tight">
                      {fmtPrice(l.price)}
                    </div>
                    <div className="text-[#848E9C] text-xs whitespace-nowrap">{country.currency}</div>
                  </div>

                  {/* Available / Limit */}
                  <div className="text-right space-y-1">
                    <div className="text-[#B7BDC6] text-sm tabular-nums whitespace-nowrap">
                      {l.available >= 10000 ? formatNum(l.available, 0) : l.available.toFixed(2)} {selectedCoin}
                    </div>
                    <div className="text-[#848E9C] text-xs tabular-nums whitespace-nowrap">
                      {formatNum(l.minLimit)} - {formatNum(l.maxLimit)} {country.currency}
                    </div>
                  </div>

                  {/* Payment methods */}
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {l.paymentMethods.slice(0, 4).map((p, i) => (
                      <span
                        key={`${p}-${i}`}
                        className="inline-flex items-center text-[#B7BDC6] text-xs bg-[#0B0E11] border border-[#2B3139] rounded px-2 py-1 max-w-full truncate"
                      >
                        <span className="w-1 h-3 bg-[#F0B90B] rounded-full mr-1.5 shrink-0" />
                        <span className="truncate">{p}</span>
                      </span>
                    ))}
                  </div>

                  {/* Trade button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleTrade(l)}
                      className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                        tab === 'BUY' ? 'bg-[#0ECB81] hover:bg-[#0BB572] text-black' : 'bg-[#F6465D] hover:bg-[#E03E54] text-white'
                      }`}
                    >
                      {tab === 'BUY' ? 'Buy' : 'Sell'} {selectedCoin}
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 px-1">
          <div className="flex items-center gap-2 text-[#848E9C] text-xs">
            <Shield className="w-4 h-4 text-[#0ECB81]" />
            <span>{isLive ? 'Live aggregated market data' : 'Reference offers — connect to view live merchants'}</span>
          </div>
          <div className="flex items-center gap-2 text-[#848E9C] text-xs">
            <Star className="w-4 h-4 text-[#F0B90B] fill-[#F0B90B]" />
            <span className="tabular-nums">{filteredListings.length} offers</span>
          </div>
        </div>
      </div>
    </div>
  );
}

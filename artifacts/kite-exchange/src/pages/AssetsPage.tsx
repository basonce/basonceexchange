import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { Eye, EyeOff, Search, ScanLine, ChevronDown, X, Camera, History } from 'lucide-react';
import AssetsHistoryModal from '../components/AssetsHistoryModal';
import DepositModal from '../components/DepositModal';
import WithdrawalModal from '../components/WithdrawalModal';
import TransactionHistory from '../components/TransactionHistory';
import DepositMethodModal from '../components/DepositMethodModal';
import SendMethodModal from '../components/SendMethodModal';
import TransferModal from '../components/TransferModal';
import { WalletConnect } from '../components/WalletConnect';
import CoinLogo from '../components/CoinLogo';
import MetalIcon, { isMetalSymbol } from '../components/MetalIcon';
import TradFiIcon, { isTradFiIcon } from '../components/TradFiIcon';
import { getCachedTradFiPrice, subscribeAllTradFiPrices } from '../lib/tradfi-price-service';
import { BlockchainTransactionHistory } from '../components/BlockchainTransactionHistory';
import WelcomeChest from '../components/WelcomeChest';

import PositionsPanel from '../components/PositionsPanel';
import TradingHistory from '../components/TradingHistory';
import { TradingService } from '../lib/trading-service';
import { RealtimePnLService, RealtimePnL } from '../lib/realtime-pnl-service';

import PnLDropdown from '../components/PnLDropdown';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PriceCache } from '../lib/price-cache';
import WithdrawalProcessingBanner from '../components/WithdrawalProcessingBanner';

const TRADFI_NAMES: Record<string, string> = {
  XAU: 'Gold', XAG: 'Silver', XPT: 'Platinum', XPD: 'Palladium', COPPER: 'Copper',
  OIL: 'WTI Crude Oil', BRENT: 'Brent Crude', NATGAS: 'Natural Gas',
  COFFEE: 'Coffee', COCOA: 'Cocoa', SUGAR: 'Sugar', WHEAT: 'Wheat', CORN: 'Corn', SOYBEAN: 'Soybean',
  SPX: 'S&P 500', NDX: 'Nasdaq 100', DJI: 'Dow Jones', DAX: 'DAX 40', FTSE: 'FTSE 100', NKY: 'Nikkei 225',
};

const STOCK_INDICES = new Set(['SPX', 'NDX', 'DJI', 'DAX', 'FTSE', 'NKY']);

const BASE_TO_TRADFI: Record<string, string> = {
  OIL:     'WTIUSDT',
  SOYBEAN: 'SOYUSDT',
  SPX:     'SP500USDT',
  NDX:     'NAS100USDT',
  DJI:     'DJIA30USDT',
  FTSE:    'FTSE100USDT',
  NKY:     'NI225USDT',
};

const TRADFI_PAIR: Record<string, string> = {
  XAU: 'XAUBTC', XAG: 'XAGBTC', XPT: 'XPTBTC', XPD: 'XPDBTC', COPPER: 'COPPERBTC',
  OIL: 'OILBTC', BRENT: 'BRTBTC', NATGAS: 'NATGASBTC',
  COFFEE: 'COFFEEBTC', COCOA: 'COCOABTC', SUGAR: 'SUGARBTC',
  WHEAT: 'WHEATBTC', CORN: 'CORNBTC', SOYBEAN: 'SOYBEANBTC',
};

function getTradeSymbol(symbol: string): string | null {
  if (symbol === 'USDT') return null;
  if (STOCK_INDICES.has(symbol)) return null;
  if (TRADFI_PAIR[symbol]) return TRADFI_PAIR[symbol];
  if (symbol === 'EQ') return 'EQ';
  return `${symbol}USDT`;
}

interface Balance {
  symbol: string;
  balance: number;
  locked_balance: number;
  price: number;
  priceChange24h?: number;
}

const SUPPORTED_COINS = [
  { symbol: 'USDT', name: 'Tether', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  { symbol: 'EQ', name: 'EarnQuest', logo: '/earnquest-logo-icon-2.png' },
  { symbol: 'BTC', name: 'Bitcoin', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
  { symbol: 'ETH', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { symbol: 'BNB', name: 'BNB', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { symbol: 'SOL', name: 'Solana', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { symbol: 'XRP', name: 'Ripple', logo: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { symbol: 'ADA', name: 'Cardano', logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  { symbol: 'TRX', name: 'Tron', logo: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
];

type CurrencyType = 'USDT' | 'BTC' | 'ETH' | 'BNB';

export default function AssetsPage() {
  const [balances, setBalances] = useState<Balance[]>(() => {
    try {
      const raw = localStorage.getItem('basonce_assets_cache_v1');
      if (raw) {
        const { ts, balances: cached } = JSON.parse(raw);
        // Only use cache if 30 seconds fresh — prevents stale high values after admin reset
        if (Date.now() - ts < 30 * 1000 && Array.isArray(cached)) return cached;
      }
    } catch {}
    return [];
  });
  const [hideBalance, setHideBalance] = useState(false);
  const [activeTab, setActiveTab] = useState<'crypto' | 'account' | 'history' | 'positions' | 'trades'>('crypto');
  const ASSETS_CACHE_KEY = 'basonce_assets_cache_v1';
  const [loading, setLoading] = useState(() => {
    try {
      const raw = localStorage.getItem('basonce_assets_cache_v1');
      if (raw) {
        const { ts } = JSON.parse(raw);
        if (Date.now() - ts < 60 * 1000) return false;
      }
    } catch {}
    return true;
  });
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('USDT');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const [realtimePnL, setRealtimePnL] = useState<RealtimePnL>({
    currentTotalValue: 0,
    startingValue: 0,
    dailyPnL: 0,
    dailyPnLPercentage: 0,
    balances: []
  });
  const [depositModal, setDepositModal] = useState<{ open: boolean; coin: string; name: string }>({
    open: false,
    coin: '',
    name: ''
  });
  const [withdrawalModal, setWithdrawalModal] = useState<{
    open: boolean;
    coin: string;
    name: string;
    balance: number;
  }>({
    open: false,
    coin: '',
    name: '',
    balance: 0
  });
  const [depositMethodModal, setDepositMethodModal] = useState(false);
  const [sendMethodModal, setSendMethodModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [gbpRate, setGbpRate] = useState(0.82);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    fetchBalances();

    const pnlService = RealtimePnLService.getInstance();
    const unsubPnL = pnlService.subscribe((pnl) => {
      setRealtimePnL(pnl);
    });

    const priceCache = PriceCache.getInstance();
    const eqMgr = EarnQuestPriceManager.getInstance();

    const updateLivePrices = () => {
      const gbpUsd = priceCache.get('GBPUSDT');
      if (gbpUsd && gbpUsd.price > 0) setGbpRate(gbpUsd.price);

      setBalances(prev => prev.map(b => {
        if (b.symbol === 'USDT') return b;
        if (b.symbol === 'EQ' || b.symbol === 'EQL') {
          const p = eqMgr.getPrice();
          return p > 0 ? { ...b, price: p, priceChange24h: eqMgr.getChange() } : b;
        }
        const cryptoCached = priceCache.get(`${b.symbol}USDT`);
        if (cryptoCached && cryptoCached.price > 0) {
          return { ...b, price: cryptoCached.price, priceChange24h: cryptoCached.change24h };
        }
        const tradfiKey = BASE_TO_TRADFI[b.symbol] || (b.symbol + 'USDT');
        const tradfiCached = getCachedTradFiPrice(tradfiKey);
        if (tradfiCached && tradfiCached.price > 0) {
          return { ...b, price: tradfiCached.price, priceChange24h: tradfiCached.change24h || 0 };
        }
        return b;
      }));
    };

    const unsubCrypto = priceCache.subscribe(updateLivePrices);
    const unsubTradFi = subscribeAllTradFiPrices(updateLivePrices);
    const unsubEq = eqMgr.subscribe(updateLivePrices);

    const channel = supabase
      .channel('balance_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_balances' }, () => {
        // Clear stale caches before re-fetching so reset shows immediately
        try { localStorage.removeItem('basonce_assets_cache_v1'); } catch {}
        try { localStorage.removeItem('basonce_pnl_cache_v1'); } catch {}
        fetchBalances();
        pnlService.refresh();
      })
      .subscribe();

    return () => {
      unsubPnL();
      unsubCrypto();
      unsubTradFi();
      unsubEq();
      channel.unsubscribe();
    };
  }, []);

  const fetchBalances = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        const emptyBalances = SUPPORTED_COINS.map(coin => ({
          symbol: coin.symbol,
          balance: 0,
          locked_balance: 0,
          price: coin.symbol === 'USDT' ? 1 : 0
        }));
        setBalances(emptyBalances);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_balances')
        .select('symbol, balance, locked_balance')
        .eq('user_id', user.id);

      if (error) throw error;

      // Filter out internal sentinel rows (welcome chest, etc.) so they never appear as assets
      const SENTINEL_SYMBOLS = new Set(['WELCOME_CHEST', 'WELCOME_CHEST_SEEN']);
      const userBalanceMap = new Map(
        (data || [])
          .filter(b => !SENTINEL_SYMBOLS.has(b.symbol))
          .map(b => [b.symbol, { balance: parseFloat(b.balance) || 0, locked: parseFloat(b.locked_balance) || 0 }])
      );

      const priceCache = PriceCache.getInstance();
      const eqPriceManager = EarnQuestPriceManager.getInstance();

      const quickBalances = SUPPORTED_COINS.map((coin) => {
        const userBalance = userBalanceMap.get(coin.symbol) || { balance: 0, locked: 0 };
        let price = 0;
        let priceChange24h = 0;

        if (coin.symbol === 'USDT') {
          price = 1;
        } else if (coin.symbol === 'EQ' || coin.symbol === 'EQL') {
          price = eqPriceManager.getPrice();
          priceChange24h = eqPriceManager.getChange();
        } else {
          const cached = priceCache.get(`${coin.symbol}USDT`);
          if (cached) {
            price = cached.price;
            priceChange24h = cached.change24h;
          }
        }

        return {
          symbol: coin.symbol,
          balance: userBalance.balance,
          locked_balance: userBalance.locked,
          price,
          priceChange24h
        };
      });

      // Some base symbols don't match tradfi symbol directly (OIL→WTIUSDT, SOYBEAN→SOYUSDT, etc.)
      const supportedSet = new Set(SUPPORTED_COINS.map(c => c.symbol));
      const tradfiBalances: typeof quickBalances = [];
      userBalanceMap.forEach(({ balance, locked }, sym) => {
        if (supportedSet.has(sym)) return;
        if (balance <= 0) return;
        const lookupSym = BASE_TO_TRADFI[sym] || (sym + 'USDT');
        const cached = getCachedTradFiPrice(lookupSym);
        tradfiBalances.push({
          symbol: sym,
          balance,
          locked_balance: locked,
          price: cached?.price || 0,
          priceChange24h: cached?.change24h || 0,
        });
      });
      const allBalances = [...quickBalances, ...tradfiBalances];

      setBalances(allBalances);
      setLoading(false);
      // 1 dakika cache — sonraki açılışta anında gelir
      try {
        localStorage.setItem('basonce_assets_cache_v1', JSON.stringify({ ts: Date.now(), balances: allBalances }));
      } catch {}

      // Fetch all crypto prices in one batch from api-server (KuCoin backend — no geo-blocking)
      try {
        const cryptoRes = await fetch('/api/crypto-prices', { signal: AbortSignal.timeout(8000) });
        if (cryptoRes.ok) {
          const cryptoJson = await cryptoRes.json() as {
            success: boolean;
            data?: Record<string, { price: number; change: number }>;
          };
          if (cryptoJson.success && cryptoJson.data) {
            setBalances(prev => prev.map(b => {
              const d = cryptoJson.data![b.symbol];
              if (d && d.price > 0) return { ...b, price: d.price, priceChange24h: d.change };
              return b;
            }));
          }
        }
      } catch {
        // keep existing prices
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      setLoading(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  }, []);

  const closeQRScanner = useCallback(() => {
    stopCamera();
    setScannedResult(null);
    setShowQRScanner(false);
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScannedResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);

        const tryBarcodeDetector = async () => {
          if (!('BarcodeDetector' in window)) return false;
          try {
            const detector = new (window as unknown as { BarcodeDetector: new (opts: object) => { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ['qr_code'] });
            scanIntervalRef.current = window.setInterval(async () => {
              if (!videoRef.current || videoRef.current.readyState < 2) return;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  setScannedResult(barcodes[0].rawValue);
                  stopCamera();
                }
              } catch {
                // continue scanning
              }
            }, 300);
            return true;
          } catch {
            return false;
          }
        };

        const detected = await tryBarcodeDetector();
        if (!detected) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          scanIntervalRef.current = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2 || !ctx) return;
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            if ('BarcodeDetector' in window) return;
          }, 500);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (msg.includes('NotFound') || msg.includes('Devices')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera. ' + msg);
      }
    }
  }, [stopCamera]);

  const sortedBalances = useMemo(() => {
    const usdt = balances.find(b => b.symbol === 'USDT');
    const withBal = balances
      .filter(b => b.symbol !== 'USDT' && b.balance > 0)
      .sort((a, b) => (b.balance * b.price) - (a.balance * a.price));
    const withoutBal = balances.filter(b => b.symbol !== 'USDT' && b.balance <= 0);
    return [...(usdt ? [usdt] : []), ...withBal, ...withoutBal];
  }, [balances]);

  function handleCoinClick(coin: Balance) {
    if (coin.balance <= 0) return;
    if (coin.symbol === 'USDT') return;
    if (STOCK_INDICES.has(coin.symbol)) return;
    const isTradFi = !!TRADFI_PAIR[coin.symbol];
    localStorage.setItem('pendingTradeSelector', JSON.stringify({
      tab: isTradFi ? 'metals' : 'crypto',
      filter: coin.symbol,
    }));
    window.dispatchEvent(new CustomEvent('navigate-to-trade', {
      detail: {
        openSelector: true,
        selectorTab: isTradFi ? 'metals' : 'crypto',
        selectorFilter: coin.symbol,
      }
    }));
  }

  const totalValueUSDT = realtimePnL.currentTotalValue > 0
    ? realtimePnL.currentTotalValue
    : balances
        .filter(b => b.symbol !== 'EQ' && b.symbol !== 'EQL')
        .reduce((sum, b) => sum + (b.balance * b.price), 0);

  const getCurrencyPrice = (currency: CurrencyType): number => {
    if (currency === 'USDT') return 1;
    const currencyBalance = balances.find(b => b.symbol === currency);
    return currencyBalance?.price || 1;
  };

  const convertToSelectedCurrency = (valueInUSDT: number): number => {
    const currencyPrice = getCurrencyPrice(selectedCurrency);
    if (currencyPrice === 0) return 0;
    return valueInUSDT / currencyPrice;
  };

  const formatCurrencyValue = (value: number, currency: CurrencyType): string => {
    if (currency === 'USDT') {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (currency === 'BTC') {
      return value.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
    } else {
      return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    }
  };

  const totalValue = convertToSelectedCurrency(totalValueUSDT);
  const dailyPnL = convertToSelectedCurrency(realtimePnL.dailyPnL);

  return (
    <div className="min-h-screen bg-[#181A20] text-white pb-20 max-w-[480px] mx-auto">
      <WelcomeChest />
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm text-gray-400">Est. Total Value</h2>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="p-0.5 hover:bg-gray-800 rounded transition-colors"
            >
              {hideBalance ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors relative"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <History className="w-4 h-4 text-gray-300" />
              </div>
            </button>
            <button
              onClick={() => setShowQRScanner(true)}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ScanLine className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-baseline gap-3 mb-1">
            <div
              className="font-black tracking-tight text-white"
              style={{
                fontSize: hideBalance ? '40px' : (
                  formatCurrencyValue(totalValue, selectedCurrency).length > 18 ? '20px' :
                  formatCurrencyValue(totalValue, selectedCurrency).length > 14 ? '26px' :
                  formatCurrencyValue(totalValue, selectedCurrency).length > 10 ? '32px' :
                  '40px'
                ),
                lineHeight: 1.05,
                fontWeight: 900
              }}
            >
              {hideBalance ? '****' : formatCurrencyValue(totalValue, selectedCurrency)}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
              >
                <span className="text-base font-bold">{selectedCurrency}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showCurrencyDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyDropdown(false)} />
                  <div className="absolute top-full left-0 mt-2 bg-[#2B3139] rounded-lg shadow-xl z-50 border border-[#363D47] min-w-[120px]">
                    {(['USDT', 'BTC', 'ETH', 'BNB'] as CurrencyType[]).map((currency) => (
                      <button
                        key={currency}
                        onClick={() => { setSelectedCurrency(currency); setShowCurrencyDropdown(false); }}
                        className="w-full px-4 py-3 text-left hover:bg-[#363D47] transition-colors flex items-center justify-between first:rounded-t-lg last:rounded-b-lg"
                      >
                        <span className={selectedCurrency === currency ? 'text-[#F0B90B]' : 'text-white'}>
                          {currency}
                        </span>
                        {selectedCurrency === currency && (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-[#F0B90B]">
                            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-400 leading-tight">
            ≈ £{hideBalance ? '****' : (totalValueUSDT * gbpRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <PnLDropdown
          totalPnL={realtimePnL.dailyPnL}
          totalPnLPercentage={realtimePnL.dailyPnLPercentage}
          coins={balances.map(coin => {
            const coinInfo = SUPPORTED_COINS.find(c => c.symbol === coin.symbol);
            const valueUSDT = coin.balance * coin.price;
            const dailyChange = coin.priceChange24h || 0;
            const dailyPnL = (valueUSDT * dailyChange) / 100;
            return {
              symbol: coin.symbol,
              name: coinInfo?.name || coin.symbol,
              logo: coinInfo?.logo || '',
              balance: coin.balance,
              valueUSDT: valueUSDT,
              dailyPnL: dailyPnL,
              dailyChange: dailyChange
            };
          })}
          hideBalance={hideBalance}
        />

        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setDepositMethodModal(true)}
            className="bg-[#F0B90B] text-black font-semibold py-3 rounded-lg hover:bg-[#F0B90B]/90 transition-colors text-sm"
          >
            Add Funds
          </button>
          <button
            onClick={() => setSendMethodModal(true)}
            className="bg-[#181A20] text-gray-300 font-semibold py-3 rounded-lg hover:bg-[#2B3139] transition-colors text-sm"
          >
            Send
          </button>
          <button
            onClick={() => setTransferModal(true)}
            className="bg-[#181A20] text-gray-300 font-semibold py-3 rounded-lg hover:bg-[#2B3139] transition-colors text-sm"
          >
            Transfer
          </button>
        </div>

        <WithdrawalProcessingBanner />

        <div className="flex items-center gap-4 mb-6 border-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('crypto')}
            className={`pb-3 font-medium whitespace-nowrap ${activeTab === 'crypto' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-gray-500'}`}
          >
            Crypto
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`pb-3 font-medium whitespace-nowrap ${activeTab === 'positions' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-gray-500'}`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`pb-3 font-medium whitespace-nowrap ${activeTab === 'trades' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-gray-500'}`}
          >
            Trades
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`pb-3 font-medium whitespace-nowrap ${activeTab === 'account' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-gray-500'}`}
          >
            Wallet
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 font-medium whitespace-nowrap ${activeTab === 'history' ? 'text-white border-b-2 border-[#F0B90B]' : 'text-gray-500'}`}
          >
            Blockchain
          </button>
        </div>

        {activeTab === 'crypto' && (
          <div className="space-y-3">
            {sortedBalances.map((coin) => {
              const coinInfo = SUPPORTED_COINS.find(c => c.symbol === coin.symbol);
              const isClickable = coin.balance > 0 && coin.symbol !== 'USDT' && !STOCK_INDICES.has(coin.symbol);
              return (
                <div
                  key={coin.symbol}
                  className={`bg-[#181A20] rounded-xl p-4 transition-colors ${isClickable ? 'cursor-pointer active:bg-[#2B3139]' : ''}`}
                  onClick={() => handleCoinClick(coin)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex-shrink-0">
                        {isMetalSymbol(coin.symbol)
                          ? <MetalIcon symbol={coin.symbol} size={40} />
                          : isTradFiIcon(coin.symbol)
                          ? <TradFiIcon symbol={coin.symbol} size={40} />
                          : <CoinLogo symbol={coin.symbol} dbUrl={coinInfo?.logo} />}
                      </div>
                      <div>
                        <div className="text-white font-semibold flex items-center gap-1">
                          {coin.symbol}
                          {isClickable && <span className="text-[#F0B90B] text-xs">›</span>}
                        </div>
                        <div className="text-sm text-gray-400">
                          {hideBalance ? '****' : (coin.balance * coin.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">
                        {hideBalance ? '****' : coin.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-400">
                        {coin.symbol === 'USDT'
                          ? '1.00 USDT'
                          : coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'positions' && <PositionsPanel />}

        {activeTab === 'trades' && <TradingHistory />}

        {activeTab === 'account' && (
          <div>
            <WalletConnect />
            <div className="mt-4 text-gray-400 bg-[#181A20] rounded-xl p-4">
              <div className="font-semibold text-white mb-2">Connect Your Wallet to:</div>
              <ul className="list-inside space-y-1">
                <li>Deposit crypto directly from your wallet</li>
                <li>Withdraw to your connected wallet address</li>
                <li>View real-time blockchain transactions</li>
                <li>Secure and transparent on-chain operations</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'history' && <BlockchainTransactionHistory />}
      </div>

      <DepositModal
        isOpen={depositModal.open}
        onClose={() => setDepositModal({ open: false, coin: '', name: '' })}
        coinSymbol={depositModal.coin}
        coinName={depositModal.name}
      />

      <WithdrawalModal
        isOpen={withdrawalModal.open}
        onClose={() => setWithdrawalModal({ open: false, coin: '', name: '', balance: 0 })}
        coinSymbol={withdrawalModal.coin}
        coinName={withdrawalModal.name}
        availableBalance={withdrawalModal.balance}
      />

      <DepositMethodModal
        isOpen={depositMethodModal}
        onClose={() => setDepositMethodModal(false)}
      />

      <SendMethodModal
        isOpen={sendMethodModal}
        onClose={() => setSendMethodModal(false)}
      />

      <TransferModal
        isOpen={transferModal}
        onClose={() => setTransferModal(false)}
      />

      {showHistoryModal && (
        <AssetsHistoryModal onClose={() => setShowHistoryModal(false)} />
      )}

      {showQRScanner && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Scan QR Code</h2>
            <button
              onClick={closeQRScanner}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
            {scannedResult ? (
              <div className="w-full max-w-sm space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white font-semibold text-lg mb-1">QR Code Scanned</p>
                  <p className="text-gray-400 text-sm">Address detected</p>
                </div>
                <div className="bg-[#2B3139] rounded-xl p-4 border border-[#363D47]">
                  <p className="text-xs text-gray-400 mb-1">Scanned address:</p>
                  <p className="text-white text-sm font-mono break-all">{scannedResult}</p>
                </div>
                <button
                  onClick={closeQRScanner}
                  className="w-full bg-[#F0B90B] text-black font-semibold py-4 rounded-xl"
                >
                  Done
                </button>
                <button
                  onClick={() => { setScannedResult(null); startCamera(); }}
                  className="w-full bg-gray-800 text-gray-300 font-medium py-3 rounded-xl"
                >
                  Scan Again
                </button>
              </div>
            ) : (
              <>
                <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                    style={{ display: cameraActive ? 'block' : 'none' }}
                  />
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#181A20]">
                      <Camera className="w-20 h-20 text-gray-600" />
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#181A20] p-4">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-red-400 text-sm">{cameraError}</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-[#F0B90B] rounded-tl-xl"></div>
                    <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-[#F0B90B] rounded-tr-xl"></div>
                    <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-[#F0B90B] rounded-bl-xl"></div>
                    <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-[#F0B90B] rounded-br-xl"></div>
                    {cameraActive && (
                      <div
                        className="absolute left-4 right-4 h-0.5 bg-[#F0B90B]"
                        style={{
                          top: '50%',
                          boxShadow: '0 0 8px 2px rgba(240,185,11,0.6)',
                          animation: 'scanLine 2s ease-in-out infinite',
                        }}
                      />
                    )}
                  </div>
                </div>

                <style>{`
                  @keyframes scanLine {
                    0% { transform: translateY(-80px); opacity: 0.4; }
                    50% { transform: translateY(80px); opacity: 1; }
                    100% { transform: translateY(-80px); opacity: 0.4; }
                  }
                `}</style>

                <div className="mt-6 text-center space-y-3 w-full max-w-sm">
                  {cameraActive ? (
                    <>
                      <p className="text-gray-300 text-sm font-medium">
                        Align the QR code within the frame
                      </p>
                      <p className="text-gray-500 text-xs">Scanning automatically...</p>
                      <button
                        onClick={stopCamera}
                        className="w-full mt-4 bg-gray-800 text-gray-300 font-medium py-3 px-6 rounded-xl transition-all hover:bg-gray-700"
                      >
                        Stop Camera
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-300 text-sm font-medium">
                        Scan a wallet address or payment QR code
                      </p>
                      <button
                        onClick={startCamera}
                        className="w-full mt-4 bg-[#F0B90B] text-black font-semibold py-4 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        Activate Camera
                      </button>
                      <button
                        onClick={closeQRScanner}
                        className="w-full bg-gray-800 text-gray-300 font-medium py-3 px-6 rounded-xl transition-all hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-gray-900/50 border-t border-gray-800">
            <div className="flex items-start gap-3 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F0B90B] mt-1.5 flex-shrink-0"></div>
              <p>Supported: Wallet addresses (BTC, ETH, USDT, TRX, etc.), payment QR codes, deposit addresses</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

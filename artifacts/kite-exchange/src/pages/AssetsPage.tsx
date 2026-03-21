import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Search, ScanLine, ChevronDown, X, Camera } from 'lucide-react';
import DepositModal from '../components/DepositModal';
import WithdrawalModal from '../components/WithdrawalModal';
import TransactionHistory from '../components/TransactionHistory';
import DepositMethodModal from '../components/DepositMethodModal';
import SendMethodModal from '../components/SendMethodModal';
import TransferModal from '../components/TransferModal';
import { WalletConnect } from '../components/WalletConnect';
import CoinLogo from '../components/CoinLogo';
import { BlockchainTransactionHistory } from '../components/BlockchainTransactionHistory';
import PositionsPanel from '../components/PositionsPanel';
import TradingHistory from '../components/TradingHistory';
import { TradingService } from '../lib/trading-service';
import { RealtimePnLService, RealtimePnL } from '../lib/realtime-pnl-service';
import PnLDropdown from '../components/PnLDropdown';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { PriceCache } from '../lib/price-cache';

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
  const [balances, setBalances] = useState<Balance[]>([]);
  const [hideBalance, setHideBalance] = useState(false);
  const [activeTab, setActiveTab] = useState<'crypto' | 'account' | 'history' | 'positions' | 'trades'>('crypto');
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('USDT');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
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

  useEffect(() => {
    fetchBalances();

    const pnlService = RealtimePnLService.getInstance();
    const unsubscribe = pnlService.subscribe((pnl) => {
      setRealtimePnL(pnl);
    });

    const channel = supabase
      .channel('balance_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_balances' }, () => {
        fetchBalances();
        pnlService.refresh();
      })
      .subscribe();

    return () => {
      unsubscribe();
      channel.unsubscribe();
    };
  }, []);

  const fetchBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const userBalanceMap = new Map(
        (data || []).map(b => [b.symbol, { balance: parseFloat(b.balance) || 0, locked: parseFloat(b.locked_balance) || 0 }])
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

      setBalances(quickBalances);
      setLoading(false);

      const coinsNeedingFresh = SUPPORTED_COINS.filter(
        c => c.symbol !== 'USDT' && c.symbol !== 'EQ' && c.symbol !== 'EQL'
      );

      const freshPrices = await Promise.all(
        coinsNeedingFresh.map(async (coin) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-proxy?symbol=${coin.symbol}USDT`,
              {
                headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
                signal: controller.signal
              }
            );
            clearTimeout(timeoutId);
            const priceData = await response.json();
            return {
              symbol: coin.symbol,
              price: parseFloat(priceData.price || priceData.lastPrice || '0'),
              priceChange24h: parseFloat(priceData.priceChangePercent || '0')
            };
          } catch {
            return null;
          }
        })
      );

      setBalances(prev => prev.map(b => {
        const fresh = freshPrices.find(f => f?.symbol === b.symbol);
        if (fresh) return { ...b, price: fresh.price, priceChange24h: fresh.priceChange24h };
        return b;
      }));
    } catch (error) {
      console.error('Error fetching balances:', error);
      setLoading(false);
    }
  };

  const totalValueUSDT = realtimePnL.currentTotalValue > 0
    ? realtimePnL.currentTotalValue
    : balances.reduce((sum, b) => sum + (b.balance * b.price), 0);

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
                fontSize: hideBalance ? '48px' : (
                  formatCurrencyValue(totalValue, selectedCurrency).length > 18 ? '24px' :
                  formatCurrencyValue(totalValue, selectedCurrency).length > 14 ? '30px' :
                  formatCurrencyValue(totalValue, selectedCurrency).length > 10 ? '38px' :
                  '48px'
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
                className="flex items-center gap-1 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <span className="text-lg font-semibold">{selectedCurrency}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showCurrencyDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCurrencyDropdown(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 bg-[#2B3139] rounded-lg shadow-xl z-50 border border-[#363D47] min-w-[120px]">
                    {(['USDT', 'BTC', 'ETH', 'BNB'] as CurrencyType[]).map((currency) => (
                      <button
                        key={currency}
                        onClick={() => {
                          setSelectedCurrency(currency);
                          setShowCurrencyDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-[#363D47] transition-colors flex items-center justify-between ${
                          currency === (['USDT', 'BTC', 'ETH', 'BNB'] as CurrencyType[])[0] ? 'rounded-t-lg' : ''
                        } ${
                          currency === (['USDT', 'BTC', 'ETH', 'BNB'] as CurrencyType[])[3] ? 'rounded-b-lg' : ''
                        }`}
                      >
                        <span className={`${selectedCurrency === currency ? 'text-[#F0B90B]' : 'text-white'}`}>
                          {currency}
                        </span>
                        {selectedCurrency === currency && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#F0B90B]">
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
          <div className="text-sm text-gray-400 mt-0.5 leading-tight">
            ≈ £{hideBalance ? '****' : (totalValueUSDT * 0.82).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        <div className="grid grid-cols-3 gap-2 mb-6">
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
            {balances.map((coin) => {
              const coinInfo = SUPPORTED_COINS.find(c => c.symbol === coin.symbol);
              return (
                <div key={coin.symbol} className="bg-[#181A20] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex-shrink-0">
                        <CoinLogo symbol={coin.symbol} dbUrl={coinInfo?.logo} />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{coin.symbol}</div>
                        <div className="text-sm">
                          {hideBalance ? '****' : (coin.balance * coin.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">
                        {hideBalance ? '****' : coin.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm">
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

      {showQRScanner && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Scan QR Code</h2>
            <button
              onClick={() => setShowQRScanner(false)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="relative w-full max-w-sm aspect-square">
              <div className="absolute inset-0 border-2 border-[#F0B90B] rounded-2xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-20 h-20 text-gray-600" />
                </div>

                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#F0B90B] rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#F0B90B] rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#F0B90B] rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#F0B90B] rounded-br-2xl"></div>

                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                  <div className="h-0.5 bg-[#F0B90B]/50 animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center space-y-3 max-w-sm">
              <p className="text-gray-300 text-sm font-medium">
                Position the QR code within the frame
              </p>
              <p className="text-gray-500 text-xs">
                We'll automatically detect wallet addresses, payment codes, or deposit QR codes
              </p>

              <button
                onClick={() => {
                  alert('Camera access requested. In a production app, this would activate the device camera using the MediaDevices API to scan QR codes in real-time.');
                  setShowQRScanner(false);
                }}
                className="w-full mt-6 bg-[#F0B90B] text-black font-semibold py-4 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Activate Camera
              </button>

              <button
                onClick={() => setShowQRScanner(false)}
                className="w-full mt-3 bg-gray-800 text-gray-300 font-medium py-3 px-6 rounded-xl transition-all hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="p-4 bg-gray-900/50 border-t border-gray-800">
            <div className="flex items-start gap-3 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F0B90B] mt-1.5"></div>
              <p>
                Supported: Wallet addresses (BTC, ETH, USDT, etc.), Payment QR codes, Deposit addresses
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

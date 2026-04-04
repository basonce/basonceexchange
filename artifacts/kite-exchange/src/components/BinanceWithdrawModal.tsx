import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Trash2, ArrowUpDown, User, ScanLine, ChevronDown, Info, CheckCircle, Copy, MessageCircle } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { trackActivity } from '../lib/activity-tracker';
import { getUserRestrictions } from '../lib/user-restrictions';
import SupportModal from './SupportModal';

interface Coin {
  symbol: string;
  name: string;
  logo_url?: string;
  balance: number;
  usd_value: number;
}

interface Network {
  id: string;
  label: string;
  fee: number;
  minWithdraw: number;
}

const NETWORK_MAP: Record<string, Network[]> = {
  USDT: [
    { id: 'BEP20', label: 'BNB Smart Chain (BEP20)', fee: 1, minWithdraw: 10 },
    { id: 'TRC20', label: 'Tron (TRC20)', fee: 1, minWithdraw: 10 },
    { id: 'ERC20', label: 'Ethereum (ERC20)', fee: 4, minWithdraw: 20 },
  ],
  BTC: [
    { id: 'BTC', label: 'Bitcoin', fee: 0.0001, minWithdraw: 0.001 },
    { id: 'BEP20', label: 'BNB Smart Chain (BEP20)', fee: 0.000005, minWithdraw: 0.0001 },
  ],
  ETH: [
    { id: 'ERC20', label: 'Ethereum (ERC20)', fee: 0.001, minWithdraw: 0.01 },
    { id: 'BEP20', label: 'BNB Smart Chain (BEP20)', fee: 0.000025, minWithdraw: 0.001 },
  ],
  BNB: [
    { id: 'BEP20', label: 'BNB Smart Chain (BEP20)', fee: 0.001, minWithdraw: 0.01 },
  ],
  USDC: [
    { id: 'ERC20', label: 'Ethereum (ERC20)', fee: 4, minWithdraw: 20 },
    { id: 'BEP20', label: 'BNB Smart Chain (BEP20)', fee: 1, minWithdraw: 10 },
    { id: 'TRC20', label: 'Tron (TRC20)', fee: 1, minWithdraw: 10 },
  ],
  SOL: [
    { id: 'SOL', label: 'Solana', fee: 0.01, minWithdraw: 0.1 },
  ],
  XRP: [
    { id: 'XRP', label: 'XRP Ledger', fee: 0.25, minWithdraw: 5 },
  ],
  ADA: [
    { id: 'ADA', label: 'Cardano', fee: 1, minWithdraw: 5 },
  ],
  DOGE: [
    { id: 'DOGE', label: 'Dogecoin', fee: 5, minWithdraw: 50 },
  ],
  TRX: [
    { id: 'TRC20', label: 'Tron (TRC20)', fee: 1, minWithdraw: 10 },
  ],
  MATIC: [
    { id: 'MATIC', label: 'Polygon', fee: 0.1, minWithdraw: 1 },
    { id: 'ERC20', label: 'Ethereum (ERC20)', fee: 2, minWithdraw: 10 },
  ],
  DOT: [
    { id: 'DOT', label: 'Polkadot', fee: 0.1, minWithdraw: 1 },
  ],
  LTC: [
    { id: 'LTC', label: 'Litecoin', fee: 0.001, minWithdraw: 0.01 },
  ],
  AVAX: [
    { id: 'AVAX', label: 'Avalanche C-Chain', fee: 0.01, minWithdraw: 0.1 },
  ],
  LINK: [
    { id: 'ERC20', label: 'Ethereum (ERC20)', fee: 0.5, minWithdraw: 5 },
    { id: 'BEP20', label: 'BNB Smart Chain (BEP20)', fee: 0.05, minWithdraw: 1 },
  ],
  UNI: [
    { id: 'ERC20', label: 'Ethereum (ERC20)', fee: 0.5, minWithdraw: 5 },
    { id: 'BEP20', label: 'BNB Smart Chain (BEP20)', fee: 0.05, minWithdraw: 1 },
  ],
};

function getNetworks(symbol: string): Network[] {
  return NETWORK_MAP[symbol] || [
    { id: 'BEP20', label: 'BNB Smart Chain (BEP20)', fee: 1, minWithdraw: 10 },
  ];
}

function CoinLogo({ symbol, logoUrl, size = 36 }: { symbol: string; logoUrl?: string; size?: number }) {
  const [error, setError] = useState(false);
  const colors = ['#F0B90B', '#0ECB81', '#F6465D', '#1890FF', '#722ED1', '#13C2C2'];
  const color = colors[symbol.charCodeAt(0) % colors.length];

  if (logoUrl && !error) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-black"
      style={{ width: size, height: size, background: color, fontSize: size * 0.33 }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

type Step = 'coin' | 'form' | 'success';

interface SuccessData {
  amount: string;
  symbol: string;
  network: string;
  address: string;
  fee: number;
  receiveAmount: number;
  txId: string;
  date: string;
}

interface BinanceWithdrawModalProps {
  onClose: () => void;
}

export default function BinanceWithdrawModal({ onClose }: BinanceWithdrawModalProps) {
  const [step, setStep] = useState<Step>('coin');
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(['USDT', 'BNB', 'BTC']);
  const [sortAZ, setSortAZ] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [address, setAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [copiedTx, setCopiedTx] = useState(false);
  const [customFeeUsdt, setCustomFeeUsdt] = useState(0);
  const [usdtFrozen, setUsdtFrozen] = useState(false);
  const [withdrawalFrozen, setWithdrawalFrozen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('deposit-modal-open');
    return () => document.body.classList.remove('deposit-modal-open');
  }, []);

  useEffect(() => {
    loadCoins();
    getUserRestrictions().then(r => {
      if (r?.withdrawal_fee_usdt && r.withdrawal_fee_usdt > 0) {
        setCustomFeeUsdt(r.withdrawal_fee_usdt);
      }
      if (r?.usdt_frozen) setUsdtFrozen(true);
      if (r?.withdrawal_frozen) setWithdrawalFrozen(true);
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNetworkDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadCoins = async () => {
    setLoadingCoins(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const [{ data: supportedCoins }, { data: balances }] = await Promise.all([
        supabase.from('supported_coins').select('symbol, name, logo_url').eq('is_active', true).order('sort_order'),
        supabase.from('user_balances').select('symbol, balance').eq('user_id', user.id),
      ]);

      const balanceMap: Record<string, number> = {};
      (balances || []).forEach(b => {
        balanceMap[b.symbol] = parseFloat(b.balance || '0');
      });

      const list: Coin[] = (supportedCoins || []).map(c => ({
        symbol: c.symbol,
        name: c.name,
        logo_url: c.logo_url,
        balance: balanceMap[c.symbol] || 0,
        usd_value: balanceMap[c.symbol] || 0,
      }));

      setCoins(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCoins(false);
    }
  };

  const handleSelectCoin = (coin: Coin) => {
    setSelectedCoin(coin);
    const nets = getNetworks(coin.symbol);
    setSelectedNetwork(nets[0]);
    setAddress('');
    setAmount('');
    setFormError('');
    if (!searchHistory.includes(coin.symbol)) {
      setSearchHistory(prev => [coin.symbol, ...prev].slice(0, 5));
    }
    setStep('form');
  };

  const filteredCoins = coins
    .filter(c =>
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortAZ) return a.symbol.localeCompare(b.symbol);
      if (b.balance !== a.balance) return b.balance - a.balance;
      return a.symbol.localeCompare(b.symbol);
    });

  const networks = selectedCoin ? getNetworks(selectedCoin.symbol) : [];
  const fee = selectedNetwork?.fee || 0;
  const amountNum = parseFloat(amount || '0');
  // If admin set a custom USDT fee, the coin receive amount is full (fee deducted from USDT separately)
  const receiveAmount = customFeeUsdt > 0 ? amountNum : Math.max(0, amountNum - fee);

  const handleWithdraw = async () => {
    setFormError('');

    if (withdrawalFrozen) {
      setFormError('Withdrawals are frozen on this account. Please contact support.');
      return;
    }
    if (usdtFrozen && selectedCoin?.symbol === 'USDT') {
      setFormError('USDT withdrawals are frozen on this account. Please contact support.');
      return;
    }

    if (!address.trim()) {
      setFormError('Please enter withdrawal address');
      return;
    }
    if (!amount || amountNum <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }
    if (!selectedNetwork) {
      setFormError('Please select a network');
      return;
    }
    if (amountNum < selectedNetwork.minWithdraw) {
      setFormError(`Minimum withdrawal is ${selectedNetwork.minWithdraw} ${selectedCoin?.symbol}`);
      return;
    }
    if (amountNum > (selectedCoin?.balance || 0)) {
      setFormError('Insufficient balance');
      return;
    }

    // If custom USDT fee is set, check USDT balance
    if (customFeeUsdt > 0) {
      const user = await getCurrentUser();
      if (user) {
        const { data: usdtRow } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .eq('symbol', 'USDT')
          .maybeSingle();
        const usdtAvailable = parseFloat(usdtRow?.balance || '0');
        if (usdtAvailable < customFeeUsdt) {
          setFormError(`Insufficient USDT for service fee. Required: ${customFeeUsdt} USDT, Available: ${usdtAvailable.toFixed(2)} USDT`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Deduct coin balance
      const newBalance = (selectedCoin!.balance) - amountNum;
      await supabase.from('user_balances')
        .update({ balance: newBalance.toString() })
        .eq('user_id', user.id)
        .eq('symbol', selectedCoin!.symbol);

      // Deduct custom USDT fee from USDT balance if applicable
      if (customFeeUsdt > 0 && selectedCoin!.symbol !== 'USDT') {
        const { data: usdtRow } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .eq('symbol', 'USDT')
          .maybeSingle();
        if (usdtRow) {
          const newUsdtBal = Math.max(0, parseFloat(usdtRow.balance) - customFeeUsdt);
          await supabase.from('user_balances')
            .update({ balance: newUsdtBal.toString() })
            .eq('user_id', user.id)
            .eq('symbol', 'USDT');
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'withdrawal_fee',
            symbol: 'USDT',
            amount: customFeeUsdt,
            status: 'completed',
            description: `Service fee - ${selectedCoin!.symbol} withdrawal`,
          });
        }
      } else if (customFeeUsdt > 0 && selectedCoin!.symbol === 'USDT') {
        // For USDT withdrawals, fee is already included in the coin balance deduction
        // Adjust: deduct customFeeUsdt additionally (it replaces the network fee)
        // receiveAmount already = amountNum for customFee case, so just log the fee
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'withdrawal_fee',
          symbol: 'USDT',
          amount: customFeeUsdt,
          status: 'completed',
          description: `Service fee - USDT withdrawal`,
        });
      }

      const txId = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const now = new Date();

      await supabase.from('withdrawal_transactions').insert({
        user_id: user.id,
        coin_symbol: selectedCoin!.symbol,
        network: selectedNetwork.id,
        amount: amountNum,
        network_fee: customFeeUsdt > 0 ? 0 : fee,
        receive_amount: receiveAmount,
        destination_address: address.trim(),
        txid: txId,
        status: 'pending',
      });
      trackActivity('withdraw_submit', 'assets', {
        coin: selectedCoin!.symbol,
        amount: amountNum,
        network: selectedNetwork.id,
        address: address.trim().slice(0, 10) + '...',
      });

      setSuccessData({
        amount: amount,
        symbol: selectedCoin!.symbol,
        network: selectedNetwork.id,
        address: address.trim(),
        fee: customFeeUsdt > 0 ? customFeeUsdt : fee,
        receiveAmount,
        txId,
        date: now.toISOString().replace('T', ' ').slice(0, 19),
      });
      setStep('success');
    } catch (err: any) {
      setFormError(err.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyTx = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.txId);
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  if (step === 'success' && successData) {
    const receiveFormatted = successData.receiveAmount % 1 === 0
      ? successData.receiveAmount.toFixed(0)
      : parseFloat(successData.receiveAmount.toFixed(8)).toString();
    const estimatedTime = new Date(Date.now() + 2 * 60 * 1000)
      .toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .replace(',', '');

    return (
      <div className="fixed inset-0 bg-[#12161C] z-50 flex flex-col">
        <div className="flex items-center px-4 pt-5 pb-3">
          <button onClick={onClose} className="text-white p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-8">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="8" width="56" height="8" rx="3" fill="white" opacity="0.9"/>
              <rect x="20" y="80" width="56" height="8" rx="3" fill="white" opacity="0.9"/>
              <path d="M24 16 L48 52 L72 16 Z" fill="none" stroke="white" strokeWidth="2.5" opacity="0.8"/>
              <path d="M24 80 L48 48 L72 80 Z" fill="none" stroke="white" strokeWidth="2.5" opacity="0.8"/>
              <path d="M30 22 L48 50 L66 22 Z" fill="white" opacity="0.15"/>
              <ellipse cx="48" cy="52" rx="10" ry="6" fill="#F0B90B" opacity="0.9"/>
              <path d="M38 52 Q48 62 58 52" fill="#F0B90B" opacity="0.6"/>
              <circle cx="48" cy="56" r="3" fill="#F0B90B"/>
            </svg>
          </div>

          <h1 className="text-white text-xl font-bold mb-4">Withdrawal Processing</h1>

          <div className="text-[32px] font-black text-white mb-6 tracking-tight">
            {receiveFormatted} {successData.symbol}
          </div>

          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Estimated completion time: {estimatedTime}
            <br />
            <br />
            You will receive an email once withdrawal is completed. View history for the latest updates.
          </p>
        </div>

        <div className="px-5 pb-8">
          <button
            onClick={onClose}
            className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-bold py-4 rounded-xl text-base transition-colors"
          >
            View History
          </button>
        </div>
      </div>
    );
  }

  if (step === 'form' && selectedCoin) {
    return (
      <>
      <div className="fixed inset-0 bg-[#0B0E11] z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <button onClick={() => setStep('coin')} className="text-white p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <div className="text-white font-bold text-base">Send {selectedCoin.symbol}</div>
            <div className="text-gray-400 text-xs flex items-center justify-center gap-1 mt-0.5">
              One Time <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-gray-400">
              <Info className="w-5 h-5" />
            </button>
            <button className="text-gray-400">
              <ScanLine className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
          {formError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <div className="text-white text-sm font-medium mb-2">Address</div>
            <div className="bg-[#1E2329] rounded-xl border border-[#2B3139] flex items-center px-4 py-3.5 gap-3">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Long press to paste"
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
              />
              <button className="text-gray-500">
                <User className="w-5 h-5" />
              </button>
              <button className="text-gray-500">
                <ScanLine className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-white text-sm font-medium">Network</span>
              <Info className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNetworkDropdown(v => !v)}
                className="w-full bg-[#1E2329] rounded-xl border border-[#2B3139] flex items-center justify-between px-4 py-3.5 text-left"
              >
                <span className={`text-sm ${selectedNetwork ? 'text-white' : 'text-gray-500'}`}>
                  {selectedNetwork ? selectedNetwork.label : 'Automatically match the network'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showNetworkDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E2329] border border-[#2B3139] rounded-xl overflow-hidden z-10">
                  {networks.map(net => (
                    <button
                      key={net.id}
                      onClick={() => {
                        setSelectedNetwork(net);
                        setShowNetworkDropdown(false);
                        setFormError('');
                      }}
                      className={`w-full px-4 py-3.5 text-left flex items-center justify-between hover:bg-[#2B3139] transition-colors ${selectedNetwork?.id === net.id ? 'bg-[#2B3139]' : ''}`}
                    >
                      <div>
                        <div className="text-white text-sm font-medium">{net.id}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{net.label}</div>
                      </div>
                      <div className="text-right">
                        {customFeeUsdt > 0 ? (
                          <div className="text-orange-400 text-xs font-semibold">Fee: {customFeeUsdt} USDT</div>
                        ) : (
                          <div className="text-gray-400 text-xs">Fee: {net.fee} {selectedCoin.symbol}</div>
                        )}
                        <div className="text-gray-500 text-xs">Min: {net.minWithdraw}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-white text-sm font-medium">Withdrawal Amount</span>
              <Info className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="bg-[#1E2329] rounded-xl border border-[#2B3139] flex items-center px-4 py-3.5 gap-3">
              <input
                type="number"
                value={amount}
                onChange={e => { setAmount(e.target.value); setFormError(''); }}
                placeholder="Minimum 0"
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
                min="0"
                step="any"
              />
              <span className="text-gray-400 text-sm font-medium">{selectedCoin.symbol}</span>
              <button
                onClick={() => {
                  const maxAmount = customFeeUsdt > 0
                    ? selectedCoin.balance
                    : Math.max(0, selectedCoin.balance - fee);
                  setAmount(maxAmount.toFixed(8).replace(/\.?0+$/, '') || '0');
                }}
                className="text-[#F0B90B] text-sm font-bold"
              >
                Max
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-500 text-xs">Available</span>
              <span className="text-gray-400 text-xs">
                {selectedCoin.balance.toFixed(8).replace(/\.?0+$/, '') || '0'} {selectedCoin.symbol}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1.5 pt-2">
            <div className="flex items-start gap-2">
              <span className="text-gray-600 mt-0.5">•</span>
              <span>Do not withdraw directly to a crowdfund or ICO. We will not credit your account with tokens from that sale.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-600 mt-0.5">•</span>
              <span>
                Do not transact with Sanctioned Entities.{' '}
                <span className="text-[#F0B90B]">Learn more</span>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-[#2B3139] px-5 pt-4 pb-8 space-y-3 bg-[#0B0E11]">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Receive amount</span>
            <span className="text-white font-bold text-base">
              {amountNum > 0 ? receiveAmount.toFixed(8).replace(/\.?0+$/, '') : '0.00'} {selectedCoin.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Network fee</span>
            <span className={`text-sm ${customFeeUsdt > 0 ? 'text-orange-400 font-semibold' : 'text-gray-400'}`}>
              {customFeeUsdt > 0
                ? `${amountNum > 0 ? customFeeUsdt : '0.00'} USDT`
                : `${amountNum > 0 ? fee : '0.00'} ${selectedCoin.symbol}`
              }
            </span>
          </div>
          {withdrawalFrozen && (
            <div className="rounded-xl px-4 py-3 space-y-3" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5">🚫</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#f87171' }}>Withdrawals Suspended</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(248,113,113,0.75)' }}>All withdrawals on this account are temporarily on hold. Please contact support for assistance.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSupport(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{ background: '#F0B90B', color: '#0B0E11' }}
              >
                <MessageCircle className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          )}
          {!withdrawalFrozen && usdtFrozen && selectedCoin.symbol === 'USDT' && (
            <div className="rounded-xl px-4 py-3 space-y-3" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)' }}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5">🧊</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#60a5fa' }}>USDT Withdrawals Suspended</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(96,165,250,0.7)' }}>USDT withdrawals on this account are temporarily on hold. Please contact support for assistance.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSupport(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{ background: '#F0B90B', color: '#0B0E11' }}
              >
                <MessageCircle className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          )}
          <button
            onClick={handleWithdraw}
            disabled={submitting || withdrawalFrozen || (usdtFrozen && selectedCoin.symbol === 'USDT')}
            className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl text-base transition-colors mt-1"
          >
            {submitting ? 'Processing...' : withdrawalFrozen ? '🚫 Withdrawals Suspended' : usdtFrozen && selectedCoin.symbol === 'USDT' ? '🧊 USDT Suspended' : 'Withdraw'}
          </button>
        </div>
      </div>
      {showSupport && (
        <SupportModal
          isOpen={showSupport}
          onClose={() => setShowSupport(false)}
          prefillData={{
            customerId: '',
            email: '',
            initialMessage: 'Hello, my withdrawal request has been declined. Could you please help me?',
            skipToForm: true,
          }}
        />
      )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0B0E11] z-50 flex flex-col">
      <div className="flex items-center px-4 pt-5 pb-3 gap-4">
        <button onClick={onClose} className="text-white p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1 text-center mr-8">Select Coin</h1>
      </div>

      <div className="px-4 pb-3">
        <div className="bg-[#1E2329] rounded-xl flex items-center gap-3 px-4 py-3 border border-[#2B3139]">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Coins"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {!searchQuery && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-sm font-semibold">Search History</span>
              <button
                onClick={() => setSearchHistory([])}
                className="text-gray-500 hover:text-gray-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {searchHistory.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {searchHistory.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const coin = coins.find(c => c.symbol === s);
                      if (coin) handleSelectCoin(coin);
                    }}
                    className="bg-[#2B3139] hover:bg-[#353D47] text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-gray-600 text-sm">No search history</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-sm font-semibold">Coin List</span>
          <button
            onClick={() => setSortAZ(v => !v)}
            className={`flex items-center gap-1 text-xs ${sortAZ ? 'text-[#F0B90B]' : 'text-gray-500'} hover:text-white transition-colors`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            A-Z
          </button>
        </div>

        {loadingCoins ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCoins.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">No coins found</div>
        ) : (
          <div className="space-y-0">
            {filteredCoins.map(coin => (
              <button
                key={coin.symbol}
                onClick={() => handleSelectCoin(coin)}
                className="w-full flex items-center gap-3 py-3.5 border-b border-[#1E2329] hover:bg-[#1E2329] -mx-1 px-1 transition-colors rounded-lg"
              >
                <CoinLogo symbol={coin.symbol} logoUrl={coin.logo_url} size={36} />
                <div className="flex-1 text-left">
                  <div className="text-white font-semibold text-sm">{coin.symbol}</div>
                  <div className="text-gray-500 text-xs mt-0.5 truncate max-w-[140px]">{coin.name}</div>
                </div>
                <div className="text-right">
                  {coin.balance > 0 ? (
                    <>
                      <div className="text-white text-sm font-medium">
                        {coin.balance < 0.00001 ? coin.balance.toExponential(2) : coin.balance.toFixed(coin.balance < 1 ? 8 : 4).replace(/\.?0+$/, '')}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        ≈ ${coin.usd_value.toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-600 text-sm">0</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

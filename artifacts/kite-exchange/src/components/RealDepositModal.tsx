import { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check, AlertCircle, ArrowLeftRight, X } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import CoinSelector from './CoinSelector';
import NetworkSelector from './NetworkSelector';
import StableCoinLogo from './CoinLogo';

const MAJOR_COINS = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC', 'LTC', 'TRX'];

// COIN:NETWORK pairs with REAL per-user deposit addresses (NOWPayments).
// Must stay in sync with NOWPAY_CUR in cf-worker/_worker.js.
const NOWPAY_SUPPORTED = new Set([
  'USDT:TRC20', 'USDT:BEP20', 'USDT:ERC20', 'USDT:POLYGON',
  'USDC:ERC20', 'USDC:BEP20', 'USDC:POLYGON',
  'BTC:BTC', 'ETH:ERC20', 'ETH:ETH', 'BNB:BEP20',
  'SOL:SOL', 'TRX:TRC20', 'DOGE:DOGE', 'LTC:LTC',
  'XRP:XRP', 'ADA:ADA', 'MATIC:POLYGON',
]);

interface RealDepositModalProps {
  onClose: () => void;
  currency?: string;
  network?: string;
}

interface SelectedCoin {
  id: string;
  symbol: string;
  name: string;
  logo_url: string | null;
}

interface SelectedNetwork {
  id: string;
  network_name: string;
  network_code: string;
  chain_id: string | null;
  contract_address: string | null;
  min_deposit: number;
  confirmations_required: number;
  estimated_arrival_minutes: number;
  withdrawal_fee: number;
  is_mainnet: boolean;
}

const NETWORK_SHORT: Record<string, string> = {
  BEP20: 'BSC',
  TRC20: 'TRX',
  ERC20: 'ETH',
  Polygon: 'MATIC',
  BTC: 'BTC',
  SOL: 'SOL',
  AVAX: 'AVAX',
  ADA: 'ADA',
  XRP: 'XRP',
  DOGE: 'DOGE',
  LTC: 'LTC',
  DOT: 'DOT',
  ATOM: 'ATOM',
  ALGO: 'ALGO',
  VET: 'VET',
  FIL: 'FIL',
  ICP: 'ICP',
  NEAR: 'NEAR',
  FTM: 'FTM',
  THETA: 'THETA',
};

const NETWORK_FULL: Record<string, string> = {
  BEP20: 'BNB Smart Chain (BEP20)',
  TRC20: 'Tron (TRC20)',
  ERC20: 'Ethereum (ERC20)',
  Polygon: 'Polygon',
  BTC: 'Bitcoin',
  SOL: 'Solana',
  AVAX: 'Avalanche C-Chain',
  ADA: 'Cardano',
  XRP: 'Ripple',
  DOGE: 'Dogecoin',
  LTC: 'Litecoin',
  DOT: 'Polkadot',
  ATOM: 'Cosmos Hub',
  ALGO: 'Algorand',
  VET: 'VeChain',
  FIL: 'Filecoin',
  ICP: 'Internet Computer',
  NEAR: 'NEAR Protocol',
  FTM: 'Fantom Opera',
  THETA: 'Theta Network',
};

const BEP20_MOCK_NETWORK: SelectedNetwork = {
  id: 'bep20-default',
  network_name: 'BNB Smart Chain (BEP20)',
  network_code: 'BEP20',
  chain_id: '56',
  contract_address: null,
  min_deposit: 0.0001,
  confirmations_required: 1,
  estimated_arrival_minutes: 2,
  withdrawal_fee: 0,
  is_mainnet: true,
};

export function RealDepositModal({ onClose, currency: initialCurrency, network: initialNetwork }: RealDepositModalProps) {
  const [step, setStep] = useState<'coin' | 'network' | 'address'>('coin');
  const [selectedCoin, setSelectedCoin] = useState<SelectedCoin | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<SelectedNetwork | null>(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [tssBannerVisible, setTssBannerVisible] = useState(true);
  const [isAltcoin, setIsAltcoin] = useState(false);
  const [minAmount, setMinAmount] = useState(0);
  const [extraId, setExtraId] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('deposit-modal-open');
    return () => {
      document.body.classList.remove('deposit-modal-open');
    };
  }, []);

  useEffect(() => {
    if (selectedCoin && selectedNetwork && step === 'address') {
      generateAddress();
    }
  }, [selectedCoin, selectedNetwork, step]);

  const handleCoinSelect = (coin: SelectedCoin) => {
    setSelectedCoin(coin);
    const isMajor = MAJOR_COINS.includes(coin.symbol.toUpperCase());
    if (isMajor) {
      setIsAltcoin(false);
      setStep('network');
    } else {
      setIsAltcoin(true);
      setSelectedNetwork(BEP20_MOCK_NETWORK);
      setStep('address');
    }
  };

  const generateAddress = async () => {
    try {
      setLoading(true);
      setError('');
      setDepositAddress('');
      setExtraId(null);
      setMinAmount(0);
      const user = await getCurrentUser();
      if (!user) { setError('Please login first'); return; }

      const coin = (selectedCoin?.symbol || 'USDT').toUpperCase();
      const net = (selectedNetwork?.network_code || '').toUpperCase();

      if (!NOWPAY_SUPPORTED.has(`${coin}:${net}`)) {
        setError(`Address deposit isn't available for ${coin} (${net}) yet. Please use the Instant Crypto Deposit option instead.`);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setError('Please login first'); return; }

      const res = await fetch('/api/nowpay/deposit-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currency: coin, network: net }),
      });

      const text = await res.text();
      let j: any = null;
      try { j = JSON.parse(text); } catch {
        // Dev preview has no cf-worker — only the live site can create addresses.
        setError('Deposit addresses can only be generated on the live site (basonce.com).');
        return;
      }

      if (!res.ok || !j.address) {
        if (j?.error === 'unsupported') {
          setError(`Address deposit isn't available for ${coin} (${net}) yet. Please use the Instant Crypto Deposit option instead.`);
        } else {
          setError(j?.error || 'Could not generate a deposit address. Please try again.');
        }
        return;
      }

      setDepositAddress(j.address);
      setExtraId(j.extra_id || null);
      setMinAmount(Number(j.min_amount) || 0);
      await updateCoinHistory();
    } catch {
      setError('Failed to load deposit address');
    } finally {
      setLoading(false);
    }
  };

  const updateCoinHistory = async () => {
    if (!selectedCoin) return;
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const { data: existing } = await supabase
        .from('user_coin_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('coin_id', selectedCoin.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('user_coin_history').update({ last_used_at: new Date().toISOString(), usage_count: existing.usage_count + 1 }).eq('id', existing.id);
      } else {
        await supabase.from('user_coin_history').insert({ user_id: user.id, coin_id: selectedCoin.id, last_used_at: new Date().toISOString(), usage_count: 1 });
      }
    } catch {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = `${selectedCoin?.symbol} Deposit Address (${selectedNetwork?.network_code})\n\n${depositAddress}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Deposit Address', text }); } catch { handleCopy(); }
    } else {
      handleCopy();
    }
  };

  const handleBackFromAddress = () => {
    if (isAltcoin) {
      setStep('coin');
      setSelectedCoin(null);
      setSelectedNetwork(null);
    } else {
      setStep('network');
    }
  };

  const networkShort = selectedNetwork ? (NETWORK_SHORT[selectedNetwork.network_code] || selectedNetwork.network_code) : '';
  const networkFull = selectedNetwork ? (NETWORK_FULL[selectedNetwork.network_code] || selectedNetwork.network_code) : '';

  const highlightAddress = (addr: string) => {
    if (!addr || addr.length < 8) return <span className="text-white">{addr}</span>;
    const start = addr.slice(0, 4);
    const mid = addr.slice(4, addr.length - 4);
    const end = addr.slice(addr.length - 4);
    return (
      <>
        <span className="text-[#F0B90B]">{start}</span>
        <span className="text-white">{mid}</span>
        <span className="text-[#F0B90B]">{end}</span>
      </>
    );
  };

  if (step === 'coin') {
    return (
      <CoinSelector
        onClose={onClose}
        onSelectCoin={handleCoinSelect}
      />
    );
  }

  if (step === 'network' && selectedCoin) {
    return (
      <NetworkSelector
        coinId={selectedCoin.id}
        coinSymbol={selectedCoin.symbol}
        coinName={selectedCoin.name}
        coinIconUrl={selectedCoin.logo_url}
        onClose={onClose}
        onBack={() => setStep('coin')}
        onSelectNetwork={(network) => {
          setSelectedNetwork(network);
          setStep('address');
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0b0e11] z-[300] flex flex-col">
      <div className="flex items-center px-4 pt-12 pb-4 gap-3">
        <button onClick={handleBackFromAddress} className="p-1 text-gray-300">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-white">
          Deposit {selectedCoin?.symbol}
        </h1>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <div className="flex items-start gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        ) : (
          <>
            {isAltcoin && selectedCoin && (
              <div className="mx-4 mt-2 mb-4 p-3 bg-[#1a2535] border border-[#2a4a7f] rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#4d9fff] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-[13px] text-gray-300 leading-relaxed">
                  Send <span className="text-white font-semibold">{selectedCoin.symbol}</span> via{' '}
                  <span className="text-white font-semibold">{selectedNetwork?.network_code}</span> network to this address.
                  Only send {selectedCoin.symbol} tokens — do not send native {selectedNetwork?.network_code === 'BEP20' ? 'BNB' : 'TRX'}.
                </div>
              </div>
            )}

            {selectedNetwork?.is_mainnet && tssBannerVisible && !isAltcoin && (
              <div className="mx-4 mt-2 mb-4 p-3 bg-[#2b2a1f] border border-[#4a4520] rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#F0B90B] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-[13px] text-gray-300 leading-relaxed">
                  Your address has been updated to a TSS address.{' '}
                  <span className="text-[#F0B90B]">Learn more</span>
                </div>
                <button onClick={() => setTssBannerVisible(false)} className="text-gray-500 p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex justify-center px-4 py-4">
              <div className="bg-white p-4 rounded-2xl relative">
                <QRCodeSVG
                  value={depositAddress || 'loading'}
                  size={220}
                  level="H"
                  includeMargin={false}
                />
                {selectedCoin?.logo_url && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full p-1.5 shadow-sm">
                    <StableCoinLogo symbol={selectedCoin.symbol} dbUrl={selectedCoin.logo_url} />
                  </div>
                )}
              </div>
            </div>

            <div className="mx-4 mb-3">
              <div className="text-[13px] text-gray-500 mb-1">Network</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[16px] font-semibold text-white">{networkShort}</div>
                  <div className="text-[13px] text-gray-500">{networkFull}</div>
                  {selectedNetwork?.contract_address && (
                    <div className="text-[13px] text-gray-500 mt-0.5">
                      Contract Information{' '}
                      <span className="text-gray-400">
                        ***{selectedNetwork.contract_address.slice(-5)}
                      </span>
                    </div>
                  )}
                </div>
                {!isAltcoin && (
                  <button
                    onClick={() => setStep('network')}
                    className="w-10 h-10 rounded-full bg-[#1e2329] flex items-center justify-center"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {minAmount > 0 && (
              <div className="mx-4 mb-3 p-3 bg-[#2b2a1f] border border-[#4a4520] rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#F0B90B] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-[13px] text-gray-300 leading-relaxed">
                  Minimum deposit:{' '}
                  <span className="text-white font-semibold">
                    {minAmount} {selectedCoin?.symbol}
                  </span>
                  . Amounts below this may not be credited.
                </div>
              </div>
            )}

            {extraId && (
              <div className="mx-4 mb-3">
                <div className="text-[13px] text-gray-500 mb-1">Memo / Tag (required)</div>
                <div className="flex items-center gap-2 bg-[#1e2329] rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-[14px] font-mono text-white break-all">{extraId}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(extraId)}
                    className="text-gray-400"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[12px] text-red-400 mt-1">
                  You must include this memo/tag or your deposit will be lost.
                </div>
              </div>
            )}

            <div className="mx-4 mb-3 h-px bg-[#1e2329]" />

            <div className="mx-4 mb-4">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[13px] text-gray-500">Deposit Address</span>
                <span className="text-[13px] text-gray-500">›</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-1 text-[15px] font-mono leading-relaxed break-all">
                  {highlightAddress(depositAddress)}
                </div>
                <button
                  onClick={handleCopy}
                  className="w-10 h-10 rounded-full bg-[#1e2329] flex items-center justify-center flex-shrink-0 mt-0.5"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="mx-4 mb-6">
              <button
                onClick={() => {}}
                className="flex items-center gap-1 text-[13px] text-gray-400"
              >
                More Details
                <span className="text-gray-500">›</span>
              </button>
            </div>
          </>
        )}
      </div>

      {!loading && !error && (
        <div className="fixed left-0 right-0 px-4 pt-4 bg-[#0b0e11] border-t border-[#1e2329]" style={{ zIndex: 9999, bottom: 0, paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
          <button
            onClick={handleShare}
            className="w-full bg-[#F0B90B] hover:bg-[#d4a50a] active:bg-[#c49509] text-black font-semibold text-[16px] py-4 rounded-2xl transition-colors"
          >
            Save and Share Address
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { X, ArrowDownCircle, CreditCard, Users, Zap, Loader2 } from 'lucide-react';
import { RealDepositModal } from './RealDepositModal';
import P2PModal from './P2PModal';
import BuyCryptoModal from './BuyCryptoModal';
import { supabase } from '../lib/supabase';

interface DepositMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

export default function DepositMethodModal({ isOpen, onClose }: DepositMethodModalProps) {
  const [realDepositModal, setRealDepositModal] = useState<{ open: boolean; currency: string; network: string }>({
    open: false,
    currency: 'USDT',
    network: 'bsc_testnet'
  });
  const [showInstant, setShowInstant] = useState(false);
  const [showP2P, setShowP2P] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [amount, setAmount] = useState<string>('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const openRealDeposit = (currency: string) => {
    setRealDepositModal({
      open: true,
      currency,
      network: 'bsc'
    });
  };

  const handleInstantPay = async () => {
    setError(null);
    const amt = Number(amount);
    if (!amt || amt < 5) {
      setError('Minimum amount is 5 USD');
      return;
    }
    if (amt > 50000) {
      setError('Maximum amount is 50,000 USD');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Please sign in first');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/nowpay/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount_usd: amt }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const txt = await res.text();
        setError(
          txt.startsWith('<!DOCTYPE') || txt.startsWith('<html')
            ? 'This feature is only available on the live site (basonce.com).'
            : `Server error (${res.status})`
        );
        setLoading(false);
        return;
      }
      const j = await res.json();
      if (!res.ok || !j.invoice_url) {
        setError(j.error || `Could not create invoice (${res.status})`);
        setLoading(false);
        return;
      }
      window.location.href = j.invoice_url;
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setLoading(false);
    }
  };

  const methods = [
    {
      icon: CreditCard,
      title: 'Pay with Card',
      description: 'Buy crypto directly with Visa or Mastercard via MoonPay or Mercuryo. Best for small amounts.',
      highlight: true,
      cardLogos: true,
      action: () => setShowCard(true)
    },
    {
      icon: ArrowDownCircle,
      title: 'On-Chain Deposit',
      description: 'Deposit Crypto from other exchanges/wallets',
      action: () => openRealDeposit('USDT')
    },
    {
      icon: Users,
      title: 'P2P Trading',
      description: 'Binance, Bybit, OKX, KuCoin verified merchants. Bank, Wise, Revolut & 100+ methods.',
      action: () => setShowP2P(true)
    },
    {
      icon: Zap,
      title: 'Instant Crypto Deposit',
      description: 'Pay with BTC, ETH, USDT, BNB, SOL & 200+ coins. Auto credit on confirmation.',
      action: () => { setShowInstant(true); setError(null); }
    }
  ];

  if (realDepositModal.open) {
    return (
      <RealDepositModal
        onClose={() => {
          setRealDepositModal({ ...realDepositModal, open: false });
          onClose();
        }}
        currency={realDepositModal.currency}
        network={realDepositModal.network}
      />
    );
  }

  if (showP2P) {
    return <P2PModal isOpen={true} onClose={() => { setShowP2P(false); onClose(); }} />;
  }

  if (showCard) {
    return <BuyCryptoModal isOpen={true} onClose={() => { setShowCard(false); onClose(); }} onOpenP2P={() => { setShowCard(false); setShowP2P(true); }} />;
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#181A20] w-full max-w-[480px] rounded-2xl animate-slide-up overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">
              {showInstant ? 'Instant Crypto Deposit' : 'Select Deposit Method'}
            </h2>
            <button
              onClick={() => { if (showInstant) { setShowInstant(false); setError(null); } else { onClose(); } }}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {showInstant ? (
            <div className="space-y-4">
              <div className="bg-[#2B3139] rounded-xl p-4">
                <div className="text-[13px] text-gray-400 mb-2">Amount (USD)</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl text-gray-500">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={5}
                    max={50000}
                    className="flex-1 bg-transparent text-2xl font-semibold text-white outline-none"
                    placeholder="100"
                  />
                  <span className="text-gray-500 text-sm">USD</span>
                </div>
                <div className="flex gap-2">
                  {QUICK_AMOUNTS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className={`flex-1 py-1.5 text-xs rounded-lg border ${
                        Number(amount) === v
                          ? 'bg-[#F0B90B] text-black border-[#F0B90B]'
                          : 'bg-transparent text-gray-300 border-[#3a4047] hover:border-[#F0B90B]'
                      }`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[12px] text-gray-400 leading-[1.5] bg-[#1a1d24] rounded-lg p-3 border border-[#2B3139]">
                You will be redirected to a secure payment page where you can pay with{' '}
                <span className="text-white font-medium">BTC, ETH, USDT, BNB, SOL, USDC</span> and 200+ other coins.
                Your wallet is credited as soon as the payment confirms on-chain.
              </div>

              {error && (
                <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                  {error}
                </div>
              )}

              <button
                onClick={handleInstantPay}
                disabled={loading}
                className="w-full bg-[#F0B90B] hover:bg-[#F8D33A] text-black font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating invoice…
                  </>
                ) : (
                  <>Continue to Payment</>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto scrollbar-hide">
              {methods.map((method, index) => (
                <button
                  key={index}
                  onClick={method.action}
                  className={`w-full rounded-xl p-4 flex items-center gap-4 transition-colors text-left disabled:cursor-not-allowed ${
                    method.highlight
                      ? 'bg-gradient-to-r from-[#F0B90B]/15 to-[#F0B90B]/5 hover:from-[#F0B90B]/25 hover:to-[#F0B90B]/10 border border-[#F0B90B]/40'
                      : 'bg-[#2B3139] hover:bg-[#353D47]'
                  }`}
                  disabled={!method.action}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                    method.highlight ? 'bg-[#F0B90B]' : 'bg-[#F0B90B]/20'
                  }`}>
                    <method.icon className={`w-5 h-5 ${method.highlight ? 'text-black' : 'text-[#F0B90B]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold mb-1 text-[15px] flex items-center gap-2 flex-wrap">
                      {method.title}
                      {method.highlight && (
                        <span className="text-[10px] bg-[#F0B90B] text-black px-1.5 py-0.5 rounded font-bold">
                          INSTANT
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] leading-[1.4] text-gray-400">{method.description}</div>
                    {(method as any).cardLogos && (
                      <div className="flex items-center gap-1.5 mt-2.5">
                        {/* Visa */}
                        <div className="bg-white rounded-md px-1.5 h-[22px] flex items-center justify-center" aria-hidden="true">
                          <svg width="26" height="10" viewBox="0 0 64 22" fill="none">
                            <path d="M27.5 1.2L23.7 20.7h-4.6L22.9 1.2h4.6zm19.7 12.6l2.4-6.6 1.4 6.6h-3.8zm5.1 6.9h4.3L52.8 1.2h-4c-.9 0-1.7.5-2 1.4L39.5 20.7h4.8l1-2.7h5.9l.6 2.7zM40.7 14.3c0-4.7-6.5-5-6.4-7 0-.6.6-1.3 2-1.5.7-.1 2.5-.2 4.6.8L41.7 2c-1.1-.4-2.6-.8-4.5-.8-4.7 0-8 2.5-8 6.1 0 2.6 2.4 4.1 4.2 5 1.8.9 2.4 1.5 2.4 2.4 0 1.3-1.5 1.8-2.9 1.8-2.4 0-3.8-.6-4.9-1.2L27.2 20c1.1.5 3.2 1 5.4 1 5 0 8.2-2.5 8.2-6.4M21.5 1.2L13.9 20.7H9.1L5.4 6.5C5.2 5.6 5 5.3 4.4 4.9 3.3 4.3 1.5 3.7 0 3.4l.1-.5h7.7c1 0 1.9.7 2.1 1.8l2 10.5L16.7 1.2h4.8z" fill="#1A1F71"/>
                          </svg>
                        </div>
                        {/* Mastercard */}
                        <div className="bg-white rounded-md px-1 h-[22px] flex items-center justify-center" aria-hidden="true">
                          <svg width="22" height="14" viewBox="0 0 32 20" fill="none">
                            <circle cx="12" cy="10" r="8" fill="#EB001B"/>
                            <circle cx="20" cy="10" r="8" fill="#F79E1B"/>
                            <path d="M16 4.4a8 8 0 0 1 0 11.2 8 8 0 0 1 0-11.2z" fill="#FF5F00"/>
                          </svg>
                        </div>
                        {/* MoonPay wordmark */}
                        <div className="bg-[#7D00FF] rounded-md px-1.5 h-[22px] flex items-center justify-center" aria-hidden="true">
                          <span className="text-[10px] font-extrabold text-white tracking-tight">MoonPay</span>
                        </div>
                        {/* Mercuryo wordmark */}
                        <div className="bg-[#0A0A23] border border-white/20 rounded-md px-1.5 h-[22px] flex items-center justify-center" aria-hidden="true">
                          <span className="text-[10px] font-extrabold text-white tracking-tight">Mercuryo</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

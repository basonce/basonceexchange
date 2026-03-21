import { useState } from 'react';
import { X, ArrowDownCircle, Send, CreditCard, Users } from 'lucide-react';
import { RealDepositModal } from './RealDepositModal';

interface DepositMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositMethodModal({ isOpen, onClose }: DepositMethodModalProps) {
  const [realDepositModal, setRealDepositModal] = useState<{ open: boolean; currency: string; network: string }>({
    open: false,
    currency: 'USDT',
    network: 'bsc_testnet'
  });

  if (!isOpen) return null;

  const openRealDeposit = (currency: string) => {
    setRealDepositModal({
      open: true,
      currency,
      network: 'bsc'
    });
  };

  const methods = [
    {
      icon: ArrowDownCircle,
      title: 'On-Chain Deposit',
      description: 'Deposit Crypto from other exchanges/wallets',
      action: () => openRealDeposit('USDT')
    },
    {
      icon: Send,
      title: 'Receive Via Crypto Pay',
      description: 'Receive crypto from other users'
    },
    {
      icon: CreditCard,
      title: 'Deposit USD',
      description: 'Deposit USD via SWIFT, card, Apple/Google Pay'
    },
    {
      icon: Users,
      title: 'P2P Trading',
      description: 'Buy directly from users. Competitive pricing'
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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#181A20] w-full max-w-[480px] rounded-2xl animate-slide-up overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">Select Deposit Method</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto scrollbar-hide">
            {methods.map((method, index) => (
              <button
                key={index}
                onClick={method.action}
                className="w-full bg-[#2B3139] hover:bg-[#353D47] rounded-xl p-4 flex items-center gap-4 transition-colors text-left disabled:cursor-not-allowed"
                disabled={!method.action}
              >
                <div className="w-11 h-11 bg-[#F0B90B]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <method.icon className="w-5 h-5 text-[#F0B90B]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1 text-[15px]">{method.title}</div>
                  <div className="text-[13px] leading-[1.4]">{method.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

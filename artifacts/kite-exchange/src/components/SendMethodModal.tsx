import { useState } from 'react';
import { X, Send, ArrowUpCircle, DollarSign, Users } from 'lucide-react';
import BinanceWithdrawModal from './BinanceWithdrawModal';
import P2PModal from './P2PModal';
import SellToUSDModal from './SellToUSDModal';
import SendToUsersModal from './SendToUsersModal';

interface SendMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveModal = 'withdraw' | 'p2p' | 'sell' | 'send' | null;

export default function SendMethodModal({ isOpen, onClose }: SendMethodModalProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  if (!isOpen) return null;

  if (activeModal === 'withdraw') {
    return <BinanceWithdrawModal onClose={() => { setActiveModal(null); onClose(); }} />;
  }

  if (activeModal === 'p2p') {
    return <P2PModal isOpen={true} onClose={() => { setActiveModal(null); onClose(); }} />;
  }

  if (activeModal === 'sell') {
    return <SellToUSDModal isOpen={true} onClose={() => { setActiveModal(null); onClose(); }} />;
  }

  if (activeModal === 'send') {
    return <SendToUsersModal isOpen={true} onClose={() => { setActiveModal(null); onClose(); }} />;
  }

  const methods = [
    {
      icon: Send,
      title: 'Send to users',
      description: 'Internal transfer, send via\nEmail/Phone/ID',
      action: () => setActiveModal('send'),
    },
    {
      icon: ArrowUpCircle,
      title: 'On-Chain Withdraw',
      description: 'Withdraw Crypto to other\nexchanges/wallets',
      action: () => setActiveModal('withdraw'),
      highlight: true,
    },
    {
      icon: DollarSign,
      title: 'Sell to USD',
      description: 'Sell crypto easily to your account',
      action: () => setActiveModal('sell'),
    },
    {
      icon: Users,
      title: 'P2P Trading',
      description: 'Sell directly to users. Competitive\npricing',
      action: () => setActiveModal('p2p'),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#181A20] w-full max-w-[480px] rounded-2xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">Select Withdraw Method</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-2.5">
            {methods.map((method, index) => (
              <button
                key={index}
                onClick={method.action}
                className={`w-full rounded-xl p-4 flex items-center gap-4 transition-colors text-left ${
                  method.highlight ? 'bg-[#353D47]' : 'bg-[#2B3139] hover:bg-[#353D47]'
                }`}
              >
                <div className="w-11 h-11 bg-[#F0B90B]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <method.icon className="w-5 h-5 text-[#F0B90B]" />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold mb-1 text-[15px] ${method.highlight ? 'text-white' : 'text-gray-300'}`}>
                    {method.title}
                  </div>
                  <div className="text-[13px] leading-[1.4] text-gray-500 whitespace-pre-line">
                    {method.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

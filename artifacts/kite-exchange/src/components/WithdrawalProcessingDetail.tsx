import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, CheckCircle, AlertCircle, MessageCircle, Shield, Clock, Headset, ExternalLink } from 'lucide-react';
import SupportModal from './SupportModal';
import { supabase, getCurrentUser } from '../lib/supabase';

interface WithdrawalTransaction {
  id: string;
  coin_symbol: string;
  amount: number;
  receive_amount: number;
  network: string;
  status: string;
  destination_address: string;
  created_at: string;
  completed_at?: string;
  admin_notes?: string;
  txid?: string;
}

interface Props {
  withdrawal: WithdrawalTransaction;
  onClose: () => void;
  onViewHistory?: () => void;
}

function NetworkFee(props: { symbol: string }) {
  const fees: Record<string, string> = {
    BEP20: '1.00000000',
    TRC20: '0.00000000',
    ERC20: '2.50000000',
    BTC: '0.00005000',
    SOL: '0.00100000',
  };
  return <>{fees[props.symbol] ?? '1.00000000'} {props.symbol === 'TRC20' ? 'TRX' : props.symbol === 'BEP20' ? 'USDT' : props.symbol}</>;
}

export default function WithdrawalProcessingDetail({ withdrawal, onClose, onViewHistory }: Props) {
  const [showSupport, setShowSupport] = useState(false);
  const [userInfo, setUserInfo] = useState<{ userId: string; email: string } | null>(null);
  const [copied, setCopied] = useState<'address' | 'txid' | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        setUserInfo({ userId: String(profile.user_id || ''), email: profile.email || user.email || '' });
      } else {
        setUserInfo({ userId: '', email: user.email || '' });
      }
    };
    fetchUser();
  }, []);

  const isProcessing = withdrawal.status === 'pending' || withdrawal.status === 'processing';
  const isCompleted = withdrawal.status === 'completed';
  const isRejected = withdrawal.status === 'rejected';

  const handleCopy = (text: string, type: 'address' | 'txid') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const shortTxid = withdrawal.txid
    ? `${withdrawal.txid.slice(0, 14)}...${withdrawal.txid.slice(-4)}`
    : null;

  const supportInitialMessage = `Hello, my withdrawal request was not processed.\n\nAmount: ${withdrawal.receive_amount.toFixed(8)} ${withdrawal.coin_symbol}\nNetwork: ${withdrawal.network}\nAddress: ${withdrawal.destination_address}\nDate: ${new Date(withdrawal.created_at).toLocaleString()}\n\nCould you please help me?`;

  return (
    <>
      <div className="fixed inset-0 bg-[#0B0E11] z-[100] flex flex-col">
        <div className="flex items-center px-4 pt-12 pb-4">
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="flex flex-col items-center text-center pt-4 pb-8">
            <p className="text-3xl font-bold text-white mb-3 tracking-tight">
              -{withdrawal.receive_amount % 1 === 0
                ? withdrawal.receive_amount.toFixed(2)
                : withdrawal.receive_amount.toFixed(8).replace(/\.?0+$/, '')} {withdrawal.coin_symbol}
            </p>

            {isCompleted && (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-[#0ECB81]" />
                <span className="text-[#0ECB81] text-base font-semibold">Completed</span>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border-2 border-[#F0B90B] border-t-transparent animate-spin" />
                <span className="text-[#F0B90B] text-base font-semibold">Processing</span>
              </div>
            )}
            {isRejected && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-[#F6465D]" />
                <span className="text-[#F6465D] text-base font-semibold">Rejected</span>
              </div>
            )}

            {isCompleted && (
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs mt-3">
                Crypto has been transferred out. Please contact the recipient platform for the transaction receipt.
              </p>
            )}
            {isProcessing && (
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs mt-3">
                Your withdrawal is being processed. This usually takes a few minutes. You will receive a notification when it's complete.
              </p>
            )}
            {isRejected && (
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs mt-3">
                Your withdrawal could not be processed. The amount has been returned to your balance.
              </p>
            )}
          </div>

          <div className="bg-[#1A1D22] rounded-2xl overflow-hidden border border-[#2B3139]/60">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#2B3139]/60">
              <span className="text-[#848E9C] text-sm">Network</span>
              <span className="text-xs font-bold text-[#B8860B] bg-[#F0B90B]/20 px-2.5 py-0.5 rounded">
                {withdrawal.network}
              </span>
            </div>

            <div className="flex items-start justify-between px-4 py-4 border-b border-[#2B3139]/60 gap-4">
              <span className="text-[#848E9C] text-sm flex-shrink-0">Address</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white text-sm font-mono text-right break-all leading-relaxed">
                  {withdrawal.destination_address}
                </span>
                <button
                  onClick={() => handleCopy(withdrawal.destination_address, 'address')}
                  className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                >
                  {copied === 'address'
                    ? <CheckCircle className="w-4 h-4 text-[#0ECB81]" />
                    : <Copy className="w-4 h-4 text-[#848E9C]" />
                  }
                </button>
              </div>
            </div>

            {isCompleted && withdrawal.txid && (
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#2B3139]/60 gap-4">
                <span className="text-[#848E9C] text-sm flex-shrink-0">TxID</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#F0B90B] text-sm font-mono underline underline-offset-2">
                    {shortTxid}
                  </span>
                  <button
                    onClick={() => handleCopy(withdrawal.txid!, 'txid')}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    {copied === 'txid'
                      ? <CheckCircle className="w-4 h-4 text-[#0ECB81]" />
                      : <Copy className="w-4 h-4 text-[#848E9C]" />
                    }
                  </button>
                  <ExternalLink className="w-3.5 h-3.5 text-[#848E9C]" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-4 py-4 border-b border-[#2B3139]/60">
              <span className="text-[#848E9C] text-sm">Amount</span>
              <span className="text-white text-sm font-semibold">
                {withdrawal.receive_amount % 1 === 0
                  ? withdrawal.receive_amount.toFixed(2)
                  : withdrawal.receive_amount.toFixed(8).replace(/\.?0+$/, '')} {withdrawal.coin_symbol}
              </span>
            </div>

            {isCompleted && (
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#2B3139]/60">
                <span className="text-[#848E9C] text-sm">Network fee</span>
                <span className="text-white text-sm">
                  <NetworkFee symbol={withdrawal.network} />
                </span>
              </div>
            )}

            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-[#848E9C] text-sm">Wallet</span>
              <span className="text-white text-sm">Spot Wallet</span>
            </div>
          </div>

          {isRejected && (
            <div className="mt-4 bg-[#1A1D22] border border-[#2B3139]/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Headset className="w-4 h-4 text-[#F0B90B]" />
                <span className="text-white text-sm font-bold">Need Help?</span>
              </div>
              <p className="text-[#848E9C] text-xs leading-relaxed">
                Our support team is available 24/7. A specialist will review your case immediately.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#0ECB81] rounded-full animate-pulse" />
                  <span className="text-[#0ECB81] text-xs font-semibold">Agents Online</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#848E9C] text-xs">
                  <Clock className="w-3 h-3" />
                  <span>~45s response</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#848E9C] text-xs">
                  <Shield className="w-3 h-3" />
                  <span>Secure</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-10">
          {isRejected ? (
            <div className="space-y-3">
              <button
                onClick={() => setShowSupport(true)}
                className="w-full py-4 bg-[#F0B90B] hover:bg-[#d4a200] text-[#0B0E11] font-black rounded-2xl text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Contact Support
              </button>
              <button
                onClick={onViewHistory || onClose}
                className="w-full py-3 bg-[#1E2329] hover:bg-[#2B3139] text-[#848E9C] font-semibold rounded-2xl text-sm transition-colors active:scale-[0.98]"
              >
                View History
              </button>
            </div>
          ) : (
            <button
              onClick={isCompleted ? (onViewHistory || onClose) : onClose}
              className="w-full py-4 bg-[#F0B90B] hover:bg-[#d4a200] text-[#0B0E11] font-black rounded-2xl text-base transition-all active:scale-[0.98]"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {showSupport && (
        <SupportModal
          isOpen={showSupport}
          onClose={() => setShowSupport(false)}
          prefillData={{
            customerId: userInfo?.userId || '',
            email: userInfo?.email || '',
            initialMessage: supportInitialMessage,
            skipToForm: true,
          }}
        />
      )}
    </>
  );
}

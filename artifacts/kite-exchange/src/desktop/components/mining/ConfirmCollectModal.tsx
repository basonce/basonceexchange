import { X, Pickaxe, Zap } from 'lucide-react';
import AnimatedCounter from '../../../components/AnimatedCounter';

interface ConfirmCollectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionUsdtTotal: number;
  collecting: boolean;
}

export default function ConfirmCollectModal({ isOpen, onClose, onConfirm, sessionUsdtTotal, collecting }: ConfirmCollectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 overflow-hidden animate-scaleIn">
        <div className="flex items-center justify-between p-5 border-b border-[#2B3139]">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Pickaxe className="w-5 h-5 text-[#F0B90B]" />
            Collect Earnings
          </h2>
          <button onClick={onClose} disabled={collecting} className="text-[#848E9C] hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-[#848E9C] text-sm mb-2">Total Session Earnings</div>
            <div className="text-4xl font-bold text-[#0ECB81] tabular-nums flex justify-center items-end gap-1">
              +<AnimatedCounter value={sessionUsdtTotal} decimals={4} />
              <span className="text-xl text-[#0ECB81] mb-1">USDT</span>
            </div>
            <p className="text-[#5E6673] text-xs mt-3">This amount will be added to your available balance.</p>
          </div>

          <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-[#0ECB81]/10 rounded-lg p-2 shrink-0">
                <Zap className="w-4 h-4 text-[#0ECB81]" />
              </div>
              <p className="text-[#848E9C] text-xs leading-relaxed">
                Collecting will stop your currently active session for time-limited devices. You can start them again afterwards if they have remaining time.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={collecting}
              className="flex-1 py-3 rounded-xl font-semibold text-[#EAECEF] bg-[#2B3139] hover:bg-[#363E48] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={collecting}
              className="flex-1 py-3 rounded-xl font-semibold text-black bg-[#F0B90B] hover:bg-[#FCD535] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {collecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Collecting...
                </>
              ) : (
                'Confirm Collect'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

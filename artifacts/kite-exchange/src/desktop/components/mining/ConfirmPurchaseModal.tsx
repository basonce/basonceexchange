import { X, ShoppingCart, ArrowRight } from 'lucide-react';
import type { ShopEquipment } from '../../hooks/useDesktopMining';
import DeviceImage from '../../../components/DeviceImage';

interface ConfirmPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: ShopEquipment | null;
  chest?: { img: string; glow: string };
  purchasing: boolean;
  currentBalance: number;
  currentLevel: number;
}

export default function ConfirmPurchaseModal({ isOpen, onClose, onConfirm, item, chest, purchasing, currentBalance, currentLevel }: ConfirmPurchaseModalProps) {
  if (!isOpen || !item) return null;

  const isLevelUp = item.level > currentLevel;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 overflow-hidden animate-scaleIn">
        <div className="flex items-center justify-between p-5 border-b border-[#2B3139]">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#F0B90B]" />
            Confirm Purchase
          </h2>
          <button onClick={onClose} disabled={purchasing} className="text-[#848E9C] hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {isLevelUp && (
            <div className="bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-xl p-3 mb-5 text-center">
              <span className="text-[#F0B90B] font-bold text-sm">LEVEL UP TO LEVEL {item.level}</span>
              <p className="text-[#848E9C] text-xs mt-1">This will deactivate your lower level equipment.</p>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-20 h-20 rounded-xl border border-[#2B3139] flex items-center justify-center text-3xl shrink-0 overflow-hidden"
              style={{ background: chest ? `radial-gradient(circle at 50% 35%, ${chest.glow}26, #0B0E11 70%)` : '#1E2329' }}
            >
              {chest ? (
                <DeviceImage img={chest.img} glow={chest.glow} alt={item.name} />
              ) : (
                item.icon
              )}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{item.name}</h3>
              <p className="text-[#848E9C] text-sm">Level {item.level} Equipment</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center bg-[#1E2329] rounded-lg px-4 py-3">
              <span className="text-[#848E9C] text-sm">Price</span>
              <span className="text-white font-semibold">${item.price.toLocaleString()} USDT</span>
            </div>
            <div className="flex justify-between items-center bg-[#1E2329] rounded-lg px-4 py-3">
              <span className="text-[#848E9C] text-sm">Earning Rate</span>
              <span className="text-[#0ECB81] font-semibold">+${(item.daily_earning / 24).toFixed(2)}/hr</span>
            </div>
            <div className="flex justify-between items-center bg-[#1E2329] rounded-lg px-4 py-3">
              <span className="text-[#848E9C] text-sm">Withdrawal Limit</span>
              <span className="text-white font-semibold">${item.withdrawal_limit.toLocaleString()} USDT</span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6 px-1">
            <span className="text-[#5E6673] text-sm">Your Balance</span>
            <span className={`text-sm font-semibold ${currentBalance >= item.price ? 'text-white' : 'text-[#F6465D]'}`}>
              ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={purchasing}
              className="flex-1 py-3 rounded-xl font-semibold text-[#EAECEF] bg-[#2B3139] hover:bg-[#363E48] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={purchasing || currentBalance < item.price}
              className="flex-1 py-3 rounded-xl font-semibold text-black bg-[#F0B90B] hover:bg-[#FCD535] transition-colors disabled:opacity-50 disabled:bg-[#2B3139] disabled:text-[#5E6673] flex justify-center items-center gap-2"
            >
              {purchasing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Processing...
                </>
              ) : currentBalance < item.price ? (
                'Insufficient Balance'
              ) : (
                'Confirm Purchase'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface LeverageModalProps {
  symbol: string;
  currentLeverage: number;
  currentMode: 'cross' | 'isolated';
  positionMode?: 'one-way' | 'hedge';
  onClose: () => void;
  onUpdate: (leverage: number, mode: 'cross' | 'isolated') => void;
  onPositionModeChange?: (mode: 'one-way' | 'hedge') => void;
}

export default function LeverageModal({
  symbol,
  currentLeverage,
  currentMode,
  positionMode = 'one-way',
  onClose,
  onUpdate,
  onPositionModeChange
}: LeverageModalProps) {
  const [leverage, setLeverage] = useState(currentLeverage);
  const [mode, setMode] = useState<'cross' | 'isolated'>(currentMode);
  const [selectedPositionMode, setSelectedPositionMode] = useState<'one-way' | 'hedge'>(positionMode);
  const [isLoading, setIsLoading] = useState(false);

  const maxLeverage = 125;
  const leverageOptions = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125];

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No user found');
        alert('Please login first');
        return;
      }

      const { error } = await supabase
        .from('leverage_settings')
        .upsert({
          user_id: user.id,
          symbol,
          leverage,
          margin_mode: mode,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,symbol'
        });

      if (error) {
        console.error('Supabase error:', error);
        alert(`Error: ${error.message}`);
        throw error;
      }

      onUpdate(leverage, mode);
      if (onPositionModeChange) {
        onPositionModeChange(selectedPositionMode);
      }
      onClose();
    } catch (error) {
      console.error('Error saving leverage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskLevel = (lev: number) => {
    if (lev <= 10) return { text: 'Low Risk', color: 'text-[#0ECB81]' };
    if (lev <= 50) return { text: 'Medium Risk', color: 'text-[#F0B90B]' };
    return { text: 'High Risk', color: 'text-[#F6465D]' };
  };

  const risk = getRiskLevel(leverage);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-[60]" onClick={onClose}>
      <div className="bg-[#181A20] w-full rounded-t-2xl max-h-[85vh] overflow-y-auto pb-20" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-base">Adjust Leverage</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-[#EAECEF]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 pb-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Leverage</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{leverage}x</span>
                <span className={`text-xs font-medium ${risk.color}`}>{risk.text}</span>
              </div>
            </div>

            <div className="relative mb-6">
              <input
                type="range"
                min="1"
                max={maxLeverage}
                value={Math.min(leverage, maxLeverage)}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full h-1 bg-[#2B3139] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #F0B90B ${((Math.min(leverage, maxLeverage) - 1) / (maxLeverage - 1)) * 100}%, #2B3139 ${((Math.min(leverage, maxLeverage) - 1) / (maxLeverage - 1)) * 100}%)`
                }}
              />
            </div>

            <div className="grid grid-cols-6 gap-2 mb-6">
              {leverageOptions.map((lev) => (
                <button
                  key={lev}
                  onClick={() => setLeverage(lev)}
                  className={`py-2 rounded text-xs font-medium transition-all ${ leverage === lev ? 'bg-[#F0B90B] text-[#181A20]' : 'bg-[#2B3139] text-gray-400 hover:text-[#EAECEF]' }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="text-sm mb-3">Position Mode</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedPositionMode('one-way')}
                className={`p-3 rounded border transition-all ${ selectedPositionMode === 'one-way' ? 'bg-[#F0B90B]/10 border-[#F0B90B]' : 'bg-[#2B3139] border-[#2B3139] hover:border-[#474D57]' }`}
              >
                <div className={`text-sm font-medium mb-1 ${selectedPositionMode === 'one-way' ? 'text-[#F0B90B]' : 'text-[#EAECEF]'}`}>
                  One-Way
                </div>
                <div className="text-gray-400">
                  One position at a time
                </div>
              </button>

              <button
                onClick={() => setSelectedPositionMode('hedge')}
                className={`p-3 rounded border transition-all ${ selectedPositionMode === 'hedge' ? 'bg-[#F0B90B]/10 border-[#F0B90B]' : 'bg-[#2B3139] border-[#2B3139] hover:border-[#474D57]' }`}
              >
                <div className={`text-sm font-medium mb-1 ${selectedPositionMode === 'hedge' ? 'text-[#F0B90B]' : 'text-[#EAECEF]'}`}>
                  Hedge
                </div>
                <div className="text-gray-400">
                  Long & short simultaneously
                </div>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-sm mb-3">Margin Mode</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setMode('cross');
                  if (leverage > 20) setLeverage(20);
                }}
                className={`p-3 rounded border transition-all ${ mode === 'cross' ? 'bg-[#F0B90B]/10 border-[#F0B90B]' : 'bg-[#2B3139] border-[#2B3139] hover:border-[#474D57]' }`}
              >
                <div className={`text-sm font-medium mb-1 ${mode === 'cross' ? 'text-[#F0B90B]' : 'text-[#EAECEF]'}`}>
                  Cross
                </div>
                <div className="text-gray-400">
                  All cross positions share margin (Max 20x)
                </div>
              </button>

              <button
                onClick={() => setMode('isolated')}
                className={`p-3 rounded border transition-all ${ mode === 'isolated' ? 'bg-[#F0B90B]/10 border-[#F0B90B]' : 'bg-[#2B3139] border-[#2B3139] hover:border-[#474D57]' }`}
              >
                <div className={`text-sm font-medium mb-1 ${mode === 'isolated' ? 'text-[#F0B90B]' : 'text-[#EAECEF]'}`}>
                  Isolated
                </div>
                <div className="text-gray-400">
                  Margin limited to position (Max 125x)
                </div>
              </button>
            </div>
          </div>

          <div className="bg-[#2B3139] rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="text-xs mt-0.5">⚠️</div>
              <div className="text-xs leading-relaxed">
                Higher leverage means higher risk. Make sure you understand the risks before trading with high leverage.
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full py-3 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#181A20] font-semibold rounded transition-all disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

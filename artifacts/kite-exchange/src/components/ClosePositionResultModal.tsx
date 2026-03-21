import { CheckCircle2, XCircle } from 'lucide-react';

interface ClosePositionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    symbol: string;
    side: string;
    entryPrice: number;
    closePrice: number;
    positionSize: number;
    sizePnl: number;
    fees: number;
    netPnl: number;
    pnlPercentage: number;
  } | null;
}

export default function ClosePositionResultModal({
  isOpen,
  onClose,
  result,
}: ClosePositionResultModalProps) {
  if (!isOpen || !result) return null;

  const isProfit = result.netPnl >= 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#181A20] rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            {result.success ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-[#0ECB81] mb-3" />
                <h3 className="text-xl font-semibold mb-1">Position Closed!</h3>
                <p className="text-sm">Your position has been successfully closed</p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-[#F6465D] mb-3" />
                <h3 className="text-xl font-semibold mb-1">Close Failed</h3>
                <p className="text-sm">Unable to close position</p>
              </>
            )}
          </div>

          {result.success && (
            <>
              <div className="bg-[#2B3139] rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3 pb-3 border-[#363D47]">
                  <div className={`px-2 py-0.5 rounded text-xs font-semibold ${ result.side.toLowerCase() === 'long' ? 'bg-[#0ECB81] text-black' : 'bg-[#F6465D] text-white' }`}>
                    {result.side}
                  </div>
                  <span className="text-[#EAECEF] font-semibold">{result.symbol}</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Entry</span>
                    <span className="text-[#EAECEF] font-medium">{result.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Close</span>
                    <span className="text-[#EAECEF] font-medium">{result.closePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Size</span>
                    <span className="text-[#EAECEF] font-medium">{result.positionSize.toFixed(2)} USDT</span>
                  </div>

                  <div className="h-px bg-[#363D47]"></div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Size PNL</span>
                    <span className={`font-medium ${result.sizePnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {result.sizePnl >= 0 ? '+' : ''}{result.sizePnl.toFixed(2)} USDT
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Fees</span>
                    <span className="text-[#EAECEF]">{result.fees.toFixed(2)} USDT</span>
                  </div>

                  <div className="h-px bg-[#363D47]"></div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#EAECEF] font-semibold">Net PNL</span>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {isProfit ? '+' : ''}{result.netPnl.toFixed(2)} USDT
                      </div>
                      <div className={`text-sm ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        ({isProfit ? '+' : ''}{result.pnlPercentage.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg mb-4 ${ isProfit ? 'bg-[#0ECB81]/10' : 'bg-[#F6465D]/10' }`}>
                <div className="text-center">
                  <div className="text-xs mb-1">
                    {isProfit ? 'Congratulations!' : 'Better luck next time'}
                  </div>
                  <div className={`text-2xl font-bold ${isProfit ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                    {isProfit ? '+' : ''}{result.netPnl.toFixed(2)} USDT
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-semibold rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

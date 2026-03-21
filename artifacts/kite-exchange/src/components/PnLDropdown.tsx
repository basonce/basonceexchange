
interface CoinPnL {
  symbol: string;
  name: string;
  logo: string;
  balance: number;
  valueUSDT: number;
  dailyPnL: number;
  dailyChange: number;
}

interface PnLDropdownProps {
  totalPnL: number;
  totalPnLPercentage: number;
  coins: CoinPnL[];
  hideBalance: boolean;
}

export default function PnLDropdown({ totalPnL, totalPnLPercentage, coins, hideBalance }: PnLDropdownProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 px-1 flex-wrap">
        <span className="text-base text-gray-400 border-b border-dotted border-gray-600 pb-0.5 shrink-0">Today's PNL</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-lg font-bold ${totalPnL >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {totalPnL >= 0 ? '+' : ''}{hideBalance ? '****' : totalPnL.toFixed(2)} USDT
          </span>
          <span className={`text-lg font-semibold ${totalPnL >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            ({totalPnLPercentage >= 0 ? '+' : ''}{hideBalance ? '**' : totalPnLPercentage.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

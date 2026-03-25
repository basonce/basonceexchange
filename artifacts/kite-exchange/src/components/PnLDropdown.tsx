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

export default function PnLDropdown({ totalPnL, totalPnLPercentage, hideBalance }: PnLDropdownProps) {
  const isPositive = totalPnL >= 0;
  const color = isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]';

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-xs text-gray-400 border-b border-dashed border-gray-600 shrink-0">Today's PNL</span>
        <span className={`text-sm font-bold ${color}`}>
          {isPositive ? '+' : ''}{hideBalance ? '****' : totalPnL.toFixed(2)} USDT
        </span>
        <span className={`text-sm font-bold ${color}`}>
          ({totalPnLPercentage >= 0 ? '+' : ''}{hideBalance ? '**' : totalPnLPercentage.toFixed(2)}%)
        </span>
        <span className="text-gray-500 text-xs">›</span>
      </div>
    </div>
  );
}

import { useState } from "react";
import { coinIconUrl } from "@/lib/markets";

export function CoinIcon({ symbol, size = 40, className = "" }: { symbol: string; size?: number; className?: string }) {
  const [error, setError] = useState(false);
  const isBNC = symbol.toUpperCase() === 'BNC';

  if (isBNC || error) {
    return (
      <div 
        style={{ width: size, height: size, backgroundColor: isBNC ? '#F0B90B' : '#2A2E39' }} 
        className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      >
        {symbol.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img 
      src={coinIconUrl(symbol)} 
      alt={symbol} 
      style={{ width: size, height: size }} 
      className={`rounded-full shrink-0 object-cover ${className}`}
      onError={() => setError(true)} 
    />
  );
}

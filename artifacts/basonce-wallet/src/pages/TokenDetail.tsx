import { useParams } from "wouter";
import { useMarkets, useBalances, useBncPrice } from "@/lib/hooks";
import { CoinIcon } from "@/components/CoinIcon";
import { Sparkline } from "@/components/Sparkline";
import { formatUsd, formatAmount } from "@/lib/format";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Star } from "lucide-react";
import { Link } from "wouter";

export function TokenDetail() {
  const { symbol = "BNC" } = useParams();
  const { data: markets = [] } = useMarkets();
  const { data: balances = [] } = useBalances();
  const bncLive = useBncPrice();

  const isBnc = symbol.toUpperCase() === 'BNC';
  
  let market = markets.find(m => m.symbol.toUpperCase() === symbol.toUpperCase());
  if (!market && isBnc) {
    market = {
      symbol: 'BNC', name: 'Basonce', iconUrl: '', color: '#F0B90B',
      price: bncLive.price, change24h: bncLive.change, marketCapUsd: 0, volumeUsd: 0, sparkline: []
    };
  }

  const balance = balances.find(b => b.symbol.toUpperCase() === symbol.toUpperCase())?.balance || 0;

  if (!market) return <div className="p-8">Token not found</div>;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between sticky top-0 z-10 bg-background">
        <Link href="/" className="p-2"><ArrowLeft className="w-6 h-6" /></Link>
        <div className="font-bold text-lg">{market.name} ({market.symbol})</div>
        <button className="p-2"><Star className="w-6 h-6 text-muted-foreground" /></button>
      </div>

      <div className="p-6 text-center">
        <div className="text-4xl font-bold">{formatUsd(market.price)}</div>
        <div className={`font-medium mt-1 ${market.change24h >= 0 ? 'text-primary' : 'text-destructive'}`}>
          {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
        </div>
      </div>

      <div className="h-40 px-4 mt-4">
        {market.sparkline && <Sparkline data={market.sparkline} width={380} height={150} />}
      </div>

      <div className="p-6 mt-4">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Your Balance</div>
          <div className="text-2xl font-bold">{formatAmount(balance)} {market.symbol}</div>
          <div className="text-sm text-muted-foreground mt-1">≈ {formatUsd(balance * market.price)}</div>
        </div>

        <div className="flex gap-4 mt-8">
          <Link href="/send" className="flex-1 flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center"><ArrowUpRight /></div>
            <span className="text-xs font-medium">Send</span>
          </Link>
          <Link href="/receive" className="flex-1 flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center"><ArrowDownLeft /></div>
            <span className="text-xs font-medium">Receive</span>
          </Link>
          <Link href="/swap" className="flex-1 flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center"><ArrowLeftRight /></div>
            <span className="text-xs font-medium">Swap</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

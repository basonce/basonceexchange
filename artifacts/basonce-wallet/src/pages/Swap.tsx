import { useState } from "react";
import { useMarkets, useBalances, useSwap as useSwapMutation } from "@/lib/hooks";
import { formatUsd, formatAmount } from "@/lib/format";
import { estimateSwap } from "@/lib/markets";
import { CoinIcon } from "@/components/CoinIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function Swap() {
  const { data: markets = [] } = useMarkets();
  const { data: balances = [] } = useBalances();
  const swapMutation = useSwapMutation();

  const [fromSymbol, setFromSymbol] = useState("BNC");
  const [toSymbol, setToSymbol] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);

  const fromMarket = markets.find(m => m.symbol === fromSymbol) || { price: 1, symbol: fromSymbol };
  const toMarket = markets.find(m => m.symbol === toSymbol) || { price: 1, symbol: toSymbol };
  
  const fromBalance = balances.find(b => b.symbol === fromSymbol)?.balance || 0;

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (amt > fromBalance) {
      toast.error("Insufficient balance");
      return;
    }

    const res = await swapMutation.mutateAsync({ from: fromSymbol, to: toSymbol, fromAmount: amt });
    if (res.ok) {
      toast.success("Swap successful");
      setSuccess(true);
    } else {
      toast.error(res.error || "Swap failed");
    }
  };

  const receiveEst = estimateSwap(parseFloat(amount) || 0, fromMarket.price, toMarket.price);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center space-y-6">
        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Swap Complete!</h2>
          <p className="text-muted-foreground text-lg">Successfully swapped {amount} {fromSymbol}</p>
        </div>
        <Button className="w-full h-14" onClick={() => { setSuccess(false); setAmount(""); }}>Swap Again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-card border-b border-border sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Swap</h1>
      </div>
      
      <div className="flex-1 p-4">
        <form onSubmit={handleSwap} className="space-y-4 relative">
          {/* From */}
          <div className="bg-card p-4 rounded-2xl border border-border">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="text-sm text-muted-foreground">Balance: {formatAmount(fromBalance)}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-xl">
                <CoinIcon symbol={fromSymbol} size={24} />
                <select className="bg-transparent font-bold outline-none appearance-none" value={fromSymbol} onChange={e => setFromSymbol(e.target.value)}>
                  {markets.map(m => <option key={m.symbol} value={m.symbol}>{m.symbol}</option>)}
                  <option value="USDT">USDT</option>
                </select>
              </div>
              <Input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="flex-1 h-12 text-right text-2xl font-bold border-none bg-transparent" />
            </div>
            <div className="mt-2 text-right">
              <Button type="button" variant="outline" size="sm" onClick={() => setAmount(fromBalance.toString())}>MAX</Button>
            </div>
          </div>

          <div className="absolute left-1/2 top-[120px] -translate-x-1/2 z-10">
            <button type="button" className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center border-4 border-background" onClick={() => {
              setFromSymbol(toSymbol);
              setToSymbol(fromSymbol);
            }}>
              <ArrowDownUp className="w-5 h-5" />
            </button>
          </div>

          {/* To */}
          <div className="bg-card p-4 rounded-2xl border border-border">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">To</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-xl">
                <CoinIcon symbol={toSymbol} size={24} />
                <select className="bg-transparent font-bold outline-none appearance-none" value={toSymbol} onChange={e => setToSymbol(e.target.value)}>
                  {markets.map(m => <option key={m.symbol} value={m.symbol}>{m.symbol}</option>)}
                  <option value="USDT">USDT</option>
                </select>
              </div>
              <div className="flex-1 text-right text-2xl font-bold text-muted-foreground">
                {receiveEst > 0 ? receiveEst.toFixed(6) : '0'}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground mt-2">≈ {formatUsd(receiveEst * toMarket.price)}</div>
          </div>

          <div className="text-center text-xs text-muted-foreground">Rate: 1 {fromSymbol} = {(fromMarket.price / toMarket.price).toFixed(6)} {toSymbol} (0.5% fee)</div>

          <Button type="submit" disabled={!amount || swapMutation.isPending} className="w-full h-14 mt-8">
            {swapMutation.isPending ? "Swapping..." : "Swap"}
          </Button>
        </form>
      </div>
    </div>
  );
}

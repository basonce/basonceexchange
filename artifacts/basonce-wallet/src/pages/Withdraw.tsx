import { useState, useEffect } from "react";
import { useBalances, useBncPrice, queryKeys } from "@/lib/hooks";
import { submitWithdrawal } from "@/lib/wallet";
import { CRYPTO_NETWORKS } from "@/lib/networks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, AlertCircle, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export function Withdraw() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: balances = [] } = useBalances();
  const { price: bncPrice } = useBncPrice();

  const withdrawableCoins = Object.keys(CRYPTO_NETWORKS);
  const [coin, setCoin] = useState(withdrawableCoins[0] || "");
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);

  const networksForCoin = CRYPTO_NETWORKS[coin] || [];
  const selectedNetwork = networksForCoin.find(n => n.id === network);
  const availableBalance = balances.find(b => b.symbol === coin)?.balance || 0;

  useEffect(() => {
    if (!networksForCoin.find(n => n.id === network)) {
      setNetwork(networksForCoin[0]?.id || "");
    }
  }, [coin]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !coin || !network || !amount || !destination) return;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Invalid amount"); return; }
    if (!selectedNetwork) return;
    if (amt < selectedNetwork.minWithdraw) { toast.error(`Minimum withdrawal is ${selectedNetwork.minWithdraw} ${coin}`); return; }
    if (amt > availableBalance) { toast.error("Insufficient balance"); return; }

    let usdValue = 0;
    if (coin === 'BNC') usdValue = amt * bncPrice;
    if (coin === 'USDT') usdValue = amt;

    setLoading(true);
    const res = await submitWithdrawal({
      userId: user.id, coinSymbol: coin, networkId: network, amount: amt, destinationAddress: destination, usdValue
    });
    setLoading(false);

    if (res.ok) {
      if (res.status === 'hold') toast.success("Withdrawal submitted. Large amounts require manual review for security.");
      else toast.success("Withdrawal submitted successfully");
      setAmount(""); setDestination("");
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.history(user.id) });
    } else {
      toast.error(res.error || "Withdrawal failed");
    }
  };

  const receiveAmount = selectedNetwork && parseFloat(amount) > 0 
    ? Math.max(0, parseFloat(amount) - selectedNetwork.withdrawFee) 
    : 0;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-background sticky top-0 z-10 flex items-center gap-4">
        <Link href="/" className="p-2"><ChevronLeft className="w-6 h-6" /></Link>
        <h1 className="text-2xl font-bold">Withdraw</h1>
      </div>

      <form onSubmit={handleWithdraw} className="flex-1 px-4 space-y-6">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Coin</label>
            <select value={coin} onChange={e => setCoin(e.target.value)} className="w-full h-14 bg-card rounded-md px-4 outline-none">
              {withdrawableCoins.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Network</label>
            <select value={network} onChange={e => setNetwork(e.target.value)} className="w-full h-14 bg-card rounded-md px-4 outline-none">
              {networksForCoin.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-medium">Address</label>
          <Input 
            value={destination} onChange={(e) => setDestination(e.target.value)}
            placeholder="0x..." className="h-14 bg-card border-none px-4 font-mono"
          />
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-medium">Amount (Avail: {availableBalance})</label>
          <Input 
            type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00" className="h-16 bg-card border-none text-2xl font-bold px-4"
          />
          <button type="button" onClick={() => setAmount(availableBalance.toString())} className="absolute right-4 top-10 text-primary font-bold">MAX</button>
        </div>

        {selectedNetwork && (
          <div className="bg-secondary/30 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="font-medium">{selectedNetwork.withdrawFee} {coin}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minimum</span>
              <span className="font-medium">{selectedNetwork.minWithdraw} {coin}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between items-center">
              <span className="font-medium">You Receive</span>
              <span className="font-bold text-xl text-primary">{receiveAmount.toFixed(4)} {coin}</span>
            </div>
          </div>
        )}

        <Button type="submit" disabled={loading || !amount || !destination || !coin || !network} className="w-full h-14 rounded-full mt-8 bg-primary">
          {loading ? "Processing..." : "Submit"}
        </Button>
      </form>
    </div>
  );
}

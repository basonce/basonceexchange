import { useState, useEffect } from "react";
import { useBalances, useBncPrice, queryKeys } from "@/lib/hooks";
import { submitWithdrawal } from "@/lib/wallet";
import { CRYPTO_NETWORKS } from "@/lib/networks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, AlertCircle } from "lucide-react";

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
    if (isNaN(amt) || amt <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (!selectedNetwork) return;
    if (amt < selectedNetwork.minWithdraw) {
      toast.error(`Minimum withdrawal is ${selectedNetwork.minWithdraw} ${coin}`);
      return;
    }

    if (amt > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    let usdValue = 0;
    if (coin === 'BNC') usdValue = amt * bncPrice;
    if (coin === 'USDT') usdValue = amt;

    setLoading(true);
    const res = await submitWithdrawal({
      userId: user.id,
      coinSymbol: coin,
      networkId: network,
      amount: amt,
      destinationAddress: destination,
      usdValue
    });
    setLoading(false);

    if (res.ok) {
      if (res.status === 'hold') {
        toast.success("Withdrawal submitted. Large amounts require manual review for security.");
      } else {
        toast.success("Withdrawal submitted successfully");
      }
      setAmount("");
      setDestination("");
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
    <div className="px-6 pt-12 pb-20 flex flex-col h-full">
      <div className="mb-8">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4">
          <Upload className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Withdraw</h1>
        <p className="text-muted-foreground mt-1">Send crypto to an external wallet</p>
      </div>

      <form onSubmit={handleWithdraw} className="space-y-6 flex-1">
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Coin</Label>
            <Select value={coin} onValueChange={setCoin}>
              <SelectTrigger className="h-14 bg-card border-border text-lg px-4">
                <SelectValue placeholder="Select coin" />
              </SelectTrigger>
              <SelectContent>
                {withdrawableCoins.map(c => (
                  <SelectItem key={c} value={c}>{c} (Avail: {balances.find(b=>b.symbol===c)?.balance||0})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Network</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger className="h-14 bg-card border-border text-lg px-4">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {networksForCoin.map(n => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Destination Address</Label>
          <Input 
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="0x..."
            className="h-14 bg-card border-border px-4 font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>Amount</Label>
          <div className="relative">
            <Input 
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-16 bg-card border-border text-2xl font-bold px-4"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="font-bold text-muted-foreground">{coin}</span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => setAmount(availableBalance.toString())}
              >
                MAX
              </Button>
            </div>
          </div>
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

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3 text-sm text-primary">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>Large withdrawals (≥ $500 USD value) are subject to manual security review and may be delayed.</p>
        </div>

        <Button 
          type="submit" 
          disabled={loading || !amount || !destination || !coin || !network}
          className="w-full h-14 text-lg mt-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Processing..." : "Submit Withdrawal"}
        </Button>
      </form>
    </div>
  );
}

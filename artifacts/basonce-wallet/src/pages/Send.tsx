import { useState } from "react";
import { useBalances, queryKeys } from "@/lib/hooks";
import { sendToUser } from "@/lib/wallet";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export function Send() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: balances = [] } = useBalances();
  
  const [recipient, setRecipient] = useState("");
  const [symbol, setSymbol] = useState("BNC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const availableTokens = balances.filter(b => b.balance > 0);
  const selectedToken = availableTokens.find(b => b.symbol === symbol);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || !symbol) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Invalid amount"); return; }
    if (selectedToken && amt > selectedToken.balance) { toast.error("Insufficient balance"); return; }

    setLoading(true);
    const res = await sendToUser(recipient, symbol, amt);
    setLoading(false);

    if (res.ok) {
      toast.success("Transfer successful");
      setAmount(""); setRecipient("");
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.history(user?.id) });
    } else {
      toast.error(res.error || "Transfer failed");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-background sticky top-0 z-10 flex items-center gap-4">
        <Link href="/" className="p-2"><ChevronLeft className="w-6 h-6" /></Link>
        <h1 className="text-2xl font-bold">Send</h1>
      </div>

      <form onSubmit={handleSend} className="flex-1 px-4 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">To</label>
          <Input 
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Address or Pay ID"
            className="h-14 bg-card border-none text-base px-4"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Asset</label>
          <select 
            value={symbol} 
            onChange={e => setSymbol(e.target.value)}
            className="w-full h-14 bg-card border-none rounded-md px-4 text-base outline-none"
          >
            {availableTokens.map(b => (
              <option key={b.symbol} value={b.symbol}>{b.symbol} ({b.balance})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-medium">Amount</label>
          <Input 
            type="number" step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="h-16 bg-card border-none text-2xl font-bold px-4"
          />
          <button type="button" onClick={() => setAmount(selectedToken?.balance.toString() || "0")} className="absolute right-4 top-10 text-primary font-bold">MAX</button>
        </div>

        <Button type="submit" disabled={loading || !amount || !recipient} className="w-full h-14 rounded-full mt-8">
          {loading ? "Sending..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}

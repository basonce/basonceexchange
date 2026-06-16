import { useState } from "react";
import { useBalances, queryKeys } from "@/lib/hooks";
import { sendToUser } from "@/lib/wallet";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function Send() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: balances = [] } = useBalances();
  
  const [recipient, setRecipient] = useState("");
  const [symbol, setSymbol] = useState("BNC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableTokens = balances.filter(b => b.balance > 0);
  const selectedToken = availableTokens.find(b => b.symbol === symbol);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || !symbol) return;
    
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (selectedToken && amt > selectedToken.balance) {
      toast.error("Insufficient balance");
      return;
    }

    setLoading(true);
    const res = await sendToUser(recipient, symbol, amt);
    setLoading(false);

    if (res.ok) {
      toast.success("Transfer successful");
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.history(user?.id) });
    } else {
      toast.error(res.error || "Transfer failed");
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </motion.div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Sent!</h2>
          <p className="text-muted-foreground text-lg">
            Successfully sent {amount} {symbol} to {recipient}
          </p>
        </div>
        <Button 
          className="w-full h-14 bg-card text-foreground hover:bg-card/90" 
          onClick={() => {
            setSuccess(false);
            setAmount("");
            setRecipient("");
          }}
        >
          Send Another
        </Button>
      </div>
    );
  }

  return (
    <div className="px-6 pt-12 pb-20 flex flex-col h-full">
      <div className="mb-8">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4">
          <ArrowUpRight className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Send Crypto</h1>
        <p className="text-muted-foreground mt-1">Send instantly to any Basonce user</p>
      </div>

      <form onSubmit={handleSend} className="space-y-6 flex-1">
        <div className="space-y-2">
          <Label>Recipient (Email / Username / Pay ID)</Label>
          <Input 
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="friend@example.com"
            className="h-14 bg-card border-border text-lg px-4"
          />
        </div>

        <div className="space-y-2">
          <Label>Asset</Label>
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="h-14 bg-card border-border text-lg px-4">
              <SelectValue placeholder="Select asset" />
            </SelectTrigger>
            <SelectContent>
              {availableTokens.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No assets available</div>
              ) : (
                availableTokens.map(b => (
                  <SelectItem key={b.symbol} value={b.symbol}>
                    {b.symbol} (Available: {b.balance})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
              className="h-20 bg-card border-border text-3xl font-bold px-4"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xl font-bold text-muted-foreground">{symbol}</span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => setAmount(selectedToken?.balance.toString() || "")}
              >
                MAX
              </Button>
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={loading || !recipient || !amount || availableTokens.length === 0}
          className="w-full h-14 text-lg mt-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Sending..." : "Confirm Send"}
        </Button>
      </form>
    </div>
  );
}

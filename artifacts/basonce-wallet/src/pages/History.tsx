import { useHistory } from "@/lib/hooks";
import { formatRelative, formatAmount, formatDateTime } from "@/lib/format";
import { Clock, ArrowUpRight, ArrowDownLeft, Download, Upload } from "lucide-react";

export function History() {
  const { data: history = [], isLoading } = useHistory();

  return (
    <div className="px-6 pt-12 pb-20 flex flex-col h-full min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground mt-1">Your transaction records</p>
      </div>

      <div className="flex-1 space-y-4">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />
          ))
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">No transactions yet</p>
          </div>
        ) : (
          history.map(tx => {
            const isPositive = tx.amount > 0;
            const Icon = tx.kind === 'send' ? ArrowUpRight : 
                         tx.kind === 'receive' ? ArrowDownLeft : 
                         tx.kind === 'deposit' ? Download : 
                         tx.kind === 'withdrawal' ? Upload : Clock;
                         
            return (
              <div key={tx.id} className="p-4 bg-card rounded-2xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold capitalize text-lg leading-tight">{tx.kind}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg leading-tight ${isPositive ? 'text-green-500' : 'text-foreground'}`}>
                    {isPositive ? '+' : ''}{formatAmount(tx.amount)} {tx.symbol}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                    {tx.status || 'Completed'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}

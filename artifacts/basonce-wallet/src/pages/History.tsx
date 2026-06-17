import { useState } from "react";
import { useHistory } from "@/lib/hooks";
import { formatRelative, formatAmount, formatDateTime } from "@/lib/format";
import { Clock, ArrowUpRight, ArrowDownLeft, Download, Upload, ChevronLeft, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Link } from "wouter";

export function History() {
  const { data: history = [], isLoading } = useHistory();
  const [activeTab, setActiveTab] = useState("txs");

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <div className="px-4 pt-12 pb-4 bg-background sticky top-0 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="p-2"><ChevronLeft className="w-6 h-6" /></Link>
          <h1 className="text-2xl font-bold">History</h1>
          <div className="w-10" />
        </div>
        <div className="flex items-center gap-6 border-b border-border/50">
          <Tab active={activeTab === "txs"} onClick={() => setActiveTab("txs")}>Transaction History</Tab>
          <Tab active={activeTab === "orders"} onClick={() => setActiveTab("orders")}>Orders</Tab>
          <Tab active={activeTab === "order_history"} onClick={() => setActiveTab("order_history")}>Order History</Tab>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs font-medium bg-secondary px-3 py-1.5 rounded-lg">
            All networks <ChevronDown className="w-3 h-3" />
          </button>
          <button className="p-1.5 bg-secondary rounded-lg ml-auto">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4">
        {activeTab !== "txs" ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No {activeTab === "orders" ? "active orders" : "order history"}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                 {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-xl" />)}
              </div>
            ) : history.length === 0 ? (
               <div className="text-center py-20 text-muted-foreground font-medium">No transactions</div>
            ) : (
              history.map(tx => {
                const isPositive = tx.amount > 0;
                const Icon = tx.kind === 'send' ? ArrowUpRight : 
                             tx.kind === 'receive' ? ArrowDownLeft : 
                             tx.kind === 'deposit' ? Download : 
                             tx.kind === 'withdrawal' ? Upload : Clock;
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${isPositive ? 'text-primary' : 'text-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-bold capitalize">{tx.kind === 'send' ? 'Transfer' : tx.kind}</p>
                        <p className="text-xs text-muted-foreground">{tx.destination ? tx.destination.substring(0,6)+'...' : 'Completed'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isPositive ? 'text-primary' : 'text-foreground'}`}>
                        {isPositive ? '+' : ''}{formatAmount(tx.amount)} {tx.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRelative(tx.createdAt)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
      
      <div className="p-4 text-center pb-24">
        <a href="#" className="text-primary text-sm font-medium">Can't find your transaction? Check explorer</a>
      </div>
    </div>
  );
}

function Tab({ active, children, onClick }: any) {
  return (
    <button onClick={onClick} className={`pb-2 text-sm font-semibold whitespace-nowrap border-b-2 ${active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
      {children}
    </button>
  );
}

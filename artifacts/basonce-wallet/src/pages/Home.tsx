import { useBncPrice, useBalances, useHistory } from "@/lib/hooks";
import { formatUsd, formatAmount, formatRelative } from "@/lib/format";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Download, Upload, Clock, Zap } from "lucide-react";
import { Link } from "wouter";

export function Home() {
  const { price, change } = useBncPrice();
  const { data: balances = [], isLoading: balancesLoading } = useBalances();
  const { data: history = [], isLoading: historyLoading } = useHistory();

  const isPositive = change >= 0;

  // Calculate total USD
  const totalUsd = balances.reduce((sum, b) => {
    if (b.symbol === 'BNC') return sum + (b.balance * price);
    if (b.symbol === 'USDT') return sum + b.balance;
    return sum;
  }, 0);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header / Total Balance */}
      <div className="pt-12 px-6 pb-8 bg-card rounded-b-[40px] shadow-sm relative z-10 border-b border-border">
        <div className="flex items-center justify-between mb-8">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <p className="text-muted-foreground font-medium text-sm">Total Balance</p>
          <h1 className="text-5xl font-bold tracking-tighter">
            {balancesLoading ? "---" : formatUsd(totalUsd)}
          </h1>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4 mt-8">
          <ActionBtn href="/send" icon={ArrowUpRight} label="Send" />
          <ActionBtn href="/receive" icon={ArrowDownLeft} label="Receive" />
          <ActionBtn href="/receive" icon={Download} label="Deposit" />
          <ActionBtn href="/withdraw" icon={Upload} label="Withdraw" />
        </div>
      </div>

      <div className="px-6 pt-6 pb-20 space-y-8 flex-1 bg-background relative z-0 -mt-4">
        {/* Token List */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-foreground/90">Assets</h2>
          <div className="space-y-3">
            {/* BNC is always featured */}
            <TokenCard 
              symbol="BNC" 
              name="Basonce" 
              balance={balances.find(b => b.symbol === 'BNC')?.balance || 0}
              priceUsd={price}
              change={change}
              isPrimary
            />
            {/* USDT is standard */}
            <TokenCard 
              symbol="USDT" 
              name="Tether" 
              balance={balances.find(b => b.symbol === 'USDT')?.balance || 0}
              priceUsd={1}
            />
            {/* Other Balances */}
            {balances.filter(b => b.symbol !== 'BNC' && b.symbol !== 'USDT' && b.balance > 0).map(b => (
              <TokenCard 
                key={b.symbol}
                symbol={b.symbol} 
                name={b.symbol} 
                balance={b.balance}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground/90">Recent Activity</h2>
            <Link href="/history" className="text-primary text-sm font-medium">See all</Link>
          </div>
          
          <div className="space-y-4">
            {historyLoading ? (
              <div className="h-20 bg-card rounded-2xl animate-pulse" />
            ) : history.length === 0 ? (
              <div className="bg-card rounded-2xl p-6 text-center border border-border">
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              history.slice(0, 3).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{tx.kind}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount > 0 ? 'text-green-500' : ''}`}>
                      {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)} {tx.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.status || 'completed'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 outline-none group">
      <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center group-active:scale-95 transition-transform">
        <Icon className="w-6 h-6 text-foreground" />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </Link>
  );
}

function TokenCard({ symbol, name, balance, priceUsd, change, isPrimary }: any) {
  const isPositive = change && change >= 0;
  
  return (
    <div className={`p-4 rounded-3xl flex items-center justify-between border ${isPrimary ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isPrimary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
          {symbol[0]}
        </div>
        <div>
          <p className="font-semibold text-lg">{symbol}</p>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-lg">{formatAmount(balance)}</p>
        {priceUsd !== undefined && (
          <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
            {formatUsd(balance * priceUsd)}
            {change !== undefined && (
              <span className={`text-xs ml-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{change}%
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

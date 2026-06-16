import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useToken, useTokenHolders, useTokenTransfers } from '@/hooks/use-chain';
import { formatNumber, formatCurrency, formatAddress, formatHash, formatBSO, formatAge } from '@/lib/format';
import { Coins, Globe, Copy, Info } from 'lucide-react';

type TokenTab = 'transfers' | 'holders' | 'info';

export default function TokenDetail() {
  const { address } = useParams<{ address: string }>();
  const { data: token, isLoading } = useToken(address || '');
  const [tab, setTab] = useState<TokenTab>('transfers');
  const { data: transfersPage } = useTokenTransfers(address || '', 1, 25);
  const transfers = transfersPage?.data;
  const { data: holders } = useTokenHolders(address || '', 1, 25);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
        <Link href="/" className="mt-6 inline-block text-primary hover:underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Token <span className="text-muted-foreground text-lg font-normal">{token.name} ({token.symbol})</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-bold">{formatCurrency(token.price)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Overview Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-border font-medium flex items-center justify-between">
            Overview
            <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded">ERC-20</span>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Max Total Supply</div>
              <div className="text-xl font-bold font-mono">
                {formatNumber(token.totalSupply)} <span className="text-base text-muted-foreground font-sans">{token.symbol}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Holders</div>
                <div className="text-foreground font-medium">
                  {formatNumber(token.holders)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Transfers</div>
                <div className="text-foreground font-medium">
                  {formatNumber(token.transfers)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-border font-medium">
            Profile Summary
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-[120px_1fr] gap-4 text-sm">
              <div className="text-muted-foreground font-medium flex items-center gap-1">
                Contract <Info className="w-3 h-3" />
              </div>
              <div className="font-mono text-primary flex items-start gap-2 min-w-0">
                <span className="break-all">{token.address}</span>
                <button className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"><Copy className="w-3 h-3" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-[120px_1fr] gap-4 text-sm">
              <div className="text-muted-foreground font-medium">Decimals</div>
              <div className="font-mono">{token.decimals}</div>
            </div>
            
            <div className="grid grid-cols-[120px_1fr] gap-4 text-sm">
              <div className="text-muted-foreground font-medium">Official Site</div>
              <div>
                <a href="#" className="text-primary hover:underline flex items-center gap-1">
                  <Globe className="w-3 h-3" /> https://basonce.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl shadow-sm min-h-[400px]">
        <div className="px-6 py-0 border-b border-border flex gap-6 overflow-x-auto">
          {([
            { id: 'transfers', label: 'Transfers' },
            { id: 'holders', label: 'Holders' },
            { id: 'info', label: 'Info' },
          ] as { id: TokenTab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'transfers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">Txn Hash</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">Age</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">From</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">To</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {(transfers ?? []).map((tx) => (
                  <tr key={tx.hash} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/tx/${tx.hash}`} className="font-mono text-primary hover:underline">{formatHash(tx.hash)}</Link>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{formatAge(tx.timestamp)}</td>
                    <td className="px-6 py-3">
                      <Link href={`/address/${tx.from}`} className="font-mono text-primary hover:underline">{formatAddress(tx.from)}</Link>
                    </td>
                    <td className="px-6 py-3">
                      {tx.to ? (
                        <Link href={`/address/${tx.to}`} className="font-mono text-primary hover:underline">{formatAddress(tx.to)}</Link>
                      ) : (
                        <span className="text-muted-foreground">Contract Creation</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-mono whitespace-nowrap">{formatBSO(tx.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'holders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">Rank</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">Address</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider text-right">Quantity ({token.symbol})</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {(holders?.data ?? []).map((h, i) => (
                  <tr key={h.address} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-6 py-3">
                      <Link href={`/address/${h.address}`} className="font-mono text-primary hover:underline">{formatAddress(h.address)}</Link>
                    </td>
                    <td className="px-6 py-3 text-right font-mono whitespace-nowrap">{formatNumber(h.balance)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden hidden sm:block">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(h.percentage, 100)}%` }} />
                        </div>
                        <span className="font-mono tabular-nums w-16 text-right">{h.percentage.toFixed(4)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'info' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="text-muted-foreground font-medium">Token Name</div>
              <div className="font-medium">{token.name}</div>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="text-muted-foreground font-medium">Symbol</div>
              <div className="font-mono">{token.symbol}</div>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="text-muted-foreground font-medium">Standard</div>
              <div>ERC-20</div>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="text-muted-foreground font-medium">Decimals</div>
              <div className="font-mono">{token.decimals}</div>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="text-muted-foreground font-medium">Max Total Supply</div>
              <div className="font-mono">{formatNumber(token.totalSupply)} {token.symbol}</div>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="text-muted-foreground font-medium">Holders</div>
              <div className="font-mono">{formatNumber(token.holders)}</div>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="text-muted-foreground font-medium">Total Transfers</div>
              <div className="font-mono">{formatNumber(token.transfers)}</div>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="text-muted-foreground font-medium">Price</div>
              <div className="font-mono">{formatCurrency(token.price)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

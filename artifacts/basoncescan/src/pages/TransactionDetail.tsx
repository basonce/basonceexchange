import { useParams, Link } from 'wouter';
import { useTransaction } from '@/hooks/use-chain';
import { formatAddress, formatBNC, formatNumber } from '@/lib/format';
import { format } from 'date-fns';
import { ArrowRightLeft, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react';

function InfoRow({ label, value, help }: { label: string, value: React.ReactNode, help?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 border-b border-border last:border-0">
      <div className="md:col-span-1 text-muted-foreground text-sm font-medium flex items-center gap-2">
        {help && <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[10px] cursor-help" title={help}>?</span>}
        {label}
      </div>
      <div className="md:col-span-3 text-sm text-foreground break-all">
        {value}
      </div>
    </div>
  );
}

export default function TransactionDetail() {
  const { hash } = useParams<{ hash: string }>();
  const { data: tx, isLoading } = useTransaction(hash || '');

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!tx) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Transaction Not Found</h1>
        <p className="text-muted-foreground">This transaction hash does not exist on our records.</p>
        <Link href="/" className="mt-6 inline-block text-link hover:underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          Transaction Details
        </h1>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="px-6 py-2 border-b border-border bg-secondary/30 font-medium text-sm">
          Overview
        </div>
        <div className="p-6">
          <InfoRow 
            label="Transaction Hash:" 
            value={<span className="tabular-nums font-medium">{tx.hash}</span>} 
          />
          
          <InfoRow 
            label="Status:" 
            value={
              tx.status === 'success' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Success
                </span>
              ) : tx.status === 'failed' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                  <XCircle className="w-3.5 h-3.5" />
                  Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Pending
                </span>
              )
            } 
          />

          <InfoRow 
            label="Block:" 
            value={
              <Link href={`/block/${tx.blockNumber}`} className="text-link hover:text-link/80 tabular-nums">
                {tx.blockNumber}
              </Link>
            } 
          />
          
          <InfoRow 
            label="Timestamp:" 
            value={
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {format(new Date(tx.timestamp), "MMM-dd-yyyy hh:mm:ss a 'UTC'XXX")}
              </div>
            } 
          />

          <hr className="my-4 border-border" />
          
          <InfoRow 
            label="From:" 
            value={
              <Link href={`/address/${tx.from}`} className="text-link hover:text-link/80 tabular-nums">
                {tx.from}
              </Link>
            } 
          />
          
          <InfoRow 
            label="To:" 
            value={
              tx.to ? (
                <Link href={`/address/${tx.to}`} className="text-link hover:text-link/80 tabular-nums">
                  {tx.to}
                </Link>
              ) : (
                <span className="text-muted-foreground">Contract Creation</span>
              )
            } 
          />
          
          <hr className="my-4 border-border" />

          <InfoRow 
            label="Value:" 
            value={
              <span className="tabular-nums bg-secondary px-2 py-1 rounded border border-border">
                {formatBNC(tx.value)}
              </span>
            } 
          />
          
          <InfoRow 
            label="Transaction Fee:" 
            value={<span className="tabular-nums text-muted-foreground">{tx.fee.toFixed(8)} BNC</span>} 
          />
          
          <InfoRow 
            label="Gas Price:" 
            value={<span className="tabular-nums">{tx.gasPrice.toFixed(2)} Gwei</span>} 
          />
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-lg shadow-sm">
        <div className="px-6 py-3 border-b border-border bg-secondary/30 font-medium text-sm">
          More Details
        </div>
        <div className="p-6">
          <InfoRow 
            label="Gas Limit & Usage:" 
            value={
              <span className="tabular-nums">
                {formatNumber(tx.gasLimit)} &nbsp;|&nbsp; {formatNumber(tx.gasUsed)} ({(tx.gasUsed / tx.gasLimit * 100).toFixed(2)}%)
              </span>
            } 
          />
          <InfoRow 
            label="Nonce:" 
            value={<span className="tabular-nums">{tx.nonce}</span>} 
          />
          <InfoRow 
            label="Input Data:" 
            value={
              <div className="bg-secondary/50 rounded-md p-4 border border-border">
                <div className="tabular-nums text-xs text-muted-foreground break-all whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {tx.input}
                </div>
              </div>
            } 
          />
        </div>
      </div>
    </div>
  );
}

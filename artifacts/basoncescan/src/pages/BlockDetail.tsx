import { useParams, Link } from 'wouter';
import { useBlock } from '@/hooks/use-chain';
import { formatAddress, formatBSO, formatNumber } from '@/lib/format';
import { format } from 'date-fns';
import { Box, Clock, Hash, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function BlockDetail() {
  const { number } = useParams<{ number: string }>();
  const { data: block, isLoading } = useBlock(number || '');

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!block) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Block Not Found</h1>
        <p className="text-muted-foreground">The block you are looking for does not exist or has not been indexed yet.</p>
        <Link href="/" className="mt-6 inline-block text-primary hover:underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Box className="w-6 h-6 text-muted-foreground" />
          Block
          <span className="text-muted-foreground ml-2 font-mono">#{block.number}</span>
        </h1>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="px-6 py-2 border-b border-border bg-secondary/30 font-medium text-sm">
          Overview
        </div>
        <div className="p-6">
          <InfoRow 
            label="Block Height:" 
            value={
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium">{block.number}</span>
                <div className="flex gap-1">
                  <Link href={`/block/${block.number - 1}`} className="p-1 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                  <Link href={`/block/${block.number + 1}`} className="p-1 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            } 
          />
          
          <InfoRow 
            label="Status:" 
            value={
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Unfinalized
              </span>
            } 
          />
          
          <InfoRow 
            label="Timestamp:" 
            value={
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {format(new Date(block.timestamp), "MMM-dd-yyyy hh:mm:ss a 'UTC'XXX")}
              </div>
            } 
          />
          
          <InfoRow 
            label="Transactions:" 
            value={
              <Link href={`/txs?block=${block.number}`} className="inline-flex items-center px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium">
                {block.txCount} transactions
              </Link>
            } 
          />
          
          <InfoRow 
            label="Validated By:" 
            value={
              <Link href={`/address/${block.validator}`} className="text-primary hover:text-primary/80 font-mono">
                {block.validator}
              </Link>
            } 
          />
          
          <InfoRow 
            label="Block Reward:" 
            value={<span className="font-mono">{block.reward.toFixed(6)} BSO</span>} 
          />
          
          <InfoRow 
            label="Size:" 
            value={`${formatNumber(block.size)} bytes`} 
          />
          
          <InfoRow 
            label="Gas Used:" 
            value={
              <div>
                <span className="font-mono">{formatNumber(block.gasUsed)}</span>
                <span className="text-muted-foreground ml-2">
                  ({((block.gasUsed / block.gasLimit) * 100).toFixed(2)}%)
                </span>
              </div>
            } 
          />
          
          <InfoRow 
            label="Gas Limit:" 
            value={<span className="font-mono">{formatNumber(block.gasLimit)}</span>} 
          />
          
          <InfoRow 
            label="Hash:" 
            value={<span className="font-mono text-muted-foreground">{block.hash}</span>} 
          />
        </div>
      </div>
    </div>
  );
}

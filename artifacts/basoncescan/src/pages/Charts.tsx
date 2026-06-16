import { useHomeAnalytics } from '@/hooks/use-chain';
import { Analytics } from '@/components/home/analytics';

export default function Charts() {
  const { data, isLoading } = useHomeAnalytics();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Charts & Statistics</h1>
        <p className="text-muted-foreground mt-1">
          On-chain analytics for the Basonce Chain — prices, transactions, value locked and supply.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <Analytics data={data} />
      )}
    </div>
  );
}

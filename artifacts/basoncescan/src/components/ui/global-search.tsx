import { useState } from 'react';
import { useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { chainData } from '@/lib/chain';
import { useToast } from '@/hooks/use-toast';

export function GlobalSearch({ className = '' }: { className?: string }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const result = await chainData.search(query);
      if (result.type === 'block') {
        setLocation(`/block/${result.id}`);
      } else if (result.type === 'transaction') {
        setLocation(`/tx/${result.id}`);
      } else if (result.type === 'address') {
        setLocation(`/address/${result.id}`);
      } else {
        toast({
          title: "Not Found",
          description: "No matching block, transaction, or address found.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className={`relative flex w-full items-center ${className}`}>
      <select 
        className="hidden md:block absolute left-1 h-9 rounded-md border-0 bg-transparent py-0 pl-3 pr-7 text-muted-foreground focus:ring-0 sm:text-sm outline-none"
        aria-label="Filter search"
      >
        <option>All Filters</option>
        <option>Addresses</option>
        <option>Tokens</option>
        <option>Names Tags</option>
        <option>Labels</option>
        <option>Websites</option>
      </select>
      <div className="hidden md:block absolute left-[105px] h-6 w-px bg-border" />
      <input
        type="text"
        placeholder="Search by Address / Txn Hash / Block / Token"
        className="w-full h-11 rounded-md border border-border bg-card px-4 md:pl-[120px] pr-12 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button 
        type="submit" 
        disabled={isSearching}
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

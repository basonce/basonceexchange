import { useState, useEffect } from 'react';
import { CheckCircle, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SuccessFeedItem {
  id: string;
  username: string;
  avatar_url: string;
  type: 'withdrawal' | 'earning' | 'mining_claim';
  amount: number;
  coin: string;
  network: string | null;
  wallet_address: string | null;
  tx_id: string | null;
  message: string;
  status: string;
  created_at: string;
}

export default function MiningSuccessFeed() {
  const [successFeed, setSuccessFeed] = useState<SuccessFeedItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    fetchSuccessFeed();

    const channel = supabase
      .channel('mining_success_feed_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mining_success_feed'
        },
        () => {
          fetchSuccessFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSuccessFeed = async () => {
    const { data } = await supabase
      .from('mining_success_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setSuccessFeed(data);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const loadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  return (
    <div className="space-y-3">
      {successFeed.slice(0, visibleCount).map((item) => (
        <div
          key={item.id}
          className="bg-[#181A20] rounded-lg border border-[#2B3139]"
        >
          <div className="bg-gradient-to-b from-[#2B3139] to-[#1E2329] px-4 py-3 border-[#2B3139] flex items-center justify-center relative">
            <div className="font-black text-white">
              {item.type === 'withdrawal' ? '-' : '+'}{item.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {item.coin}
            </div>
            <div className="absolute right-3 top-3 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/30">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Completed</span>
            </div>
          </div>

          <div className="p-4 space-y-2.5 text-xs">
            {item.type === 'withdrawal' && (
              <>
                <p className="text-center mb-3">
                  Crypto, transferred from Basonce. Please contact the recipient platform's customer service if the amount does not arrive.
                </p>
                <p className="text-center font-medium mb-3">
                  Why didn't my withdrawal amount arrive?
                </p>
              </>
            )}

            {item.type === 'withdrawal' && item.network && (
              <div className="flex justify-between items-center py-2 border-[#2B3139]">
                <span className="text-gray-400">Network</span>
                <span className="text-[#F0B90B] font-bold">{item.network}</span>
              </div>
            )}

            {item.type === 'withdrawal' && item.wallet_address && (
              <div className="flex justify-between items-start py-2 border-[#2B3139]">
                <span className="text-gray-400">Address</span>
                <div className="flex items-center gap-2 max-w-[60%]">
                  <span className="font-mono break-all text-right">{item.wallet_address}</span>
                  <button onClick={() => copyToClipboard(item.wallet_address!)} className="text-gray-400 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {item.type === 'withdrawal' && item.tx_id && (
              <div className="flex justify-between items-start py-2 border-[#2B3139]">
                <span className="text-gray-400">TxID</span>
                <div className="flex items-center gap-2 max-w-[60%]">
                  <span className="font-mono break-all text-right underline">{item.tx_id}</span>
                  <button onClick={() => copyToClipboard(item.tx_id!)} className="text-gray-400 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-[#2B3139]">
              <span className="text-gray-400">Amount</span>
              <span className="text-white font-bold">{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {item.coin}</span>
            </div>

            {item.type === 'withdrawal' && (
              <div className="flex justify-between items-center py-2 border-[#2B3139]">
                <span className="text-gray-400">Network Fee</span>
                <span className="text-white font-bold">{(item.amount * 0.001).toFixed(8)} {item.coin}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-[#2B3139]">
              <span className="text-gray-400">Wallet</span>
              <span className="text-white font-medium">Spot Wallet</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400">Date</span>
              <span className="font-mono text-xs">{formatDate(item.created_at)}</span>
            </div>
          </div>
        </div>
      ))}

      {visibleCount < successFeed.length && (
        <button
          onClick={loadMore}
          className="w-full py-3 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] font-medium rounded-lg transition-all text-sm"
        >
          Load More
        </button>
      )}
    </div>
  );
}

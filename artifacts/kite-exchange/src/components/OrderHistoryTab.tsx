import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, Download } from 'lucide-react';

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  price: number;
  amount: number;
  filled: number;
  total: number;
  status: 'open' | 'filled' | 'cancelled' | 'partially_filled';
  created_at: string;
}

export default function OrderHistoryTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'filled' | 'cancelled'>('all');
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    fetchOrders();
  }, [filter, timeRange]);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('futures_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      if (timeRange !== 'all') {
        const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
        const date = new Date();
        date.setDate(date.getDate() - days);
        query = query.gte('created_at', date.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'text-[#0ECB81]';
      case 'cancelled': return 'text-gray-400';
      case 'partially_filled': return 'text-[#F0B90B]';
      default: return 'text-white';
    }
  };

  const exportOrders = () => {
    const csv = [
      ['Time', 'Symbol', 'Side', 'Type', 'Price', 'Amount', 'Filled', 'Total', 'Status'],
      ...orders.map(o => [
        new Date(o.created_at).toLocaleString(),
        o.symbol,
        o.side.toUpperCase(),
        o.type,
        o.price,
        o.amount,
        o.filled,
        o.total,
        o.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="bg-[#181A20] rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-2 py-1 bg-[#2B3139] rounded text-white">
            <Filter className="w-3 h-3" />
            Filters
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-2 py-1 bg-[#2B3139] rounded text-white border-none focus:outline-none"
          >
            <option value="all">All Orders</option>
            <option value="open">Open</option>
            <option value="filled">Filled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-2 py-1 bg-[#2B3139] rounded text-white border-none focus:outline-none"
          >
            <option value="1d">1 Day</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <button
          onClick={exportOrders}
          className="flex items-center gap-1 px-2 py-1 bg-[#2B3139] rounded text-white hover:bg-[#3B4149]"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="text-gray-400 border-[#2B3139]">
            <tr>
              <th className="text-left py-2 font-normal">Time</th>
              <th className="text-left py-2 font-normal">Symbol</th>
              <th className="text-left py-2 font-normal">Side</th>
              <th className="text-right py-2 font-normal">Price</th>
              <th className="text-right py-2 font-normal">Amount</th>
              <th className="text-right py-2 font-normal">Filled</th>
              <th className="text-right py-2 font-normal">Total</th>
              <th className="text-center py-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-[#2B3139] hover:bg-[#2B3139]/50">
                <td className="py-2 text-white">
                  {new Date(order.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="py-2 text-white font-medium">{order.symbol}</td>
                <td className={`py-2 ${order.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                  {order.side.toUpperCase()}
                </td>
                <td className="py-2 text-white">{order.price.toFixed(2)}</td>
                <td className="py-2 text-white">{order.amount.toFixed(4)}</td>
                <td className="py-2 text-white">{order.filled.toFixed(4)}</td>
                <td className="py-2 text-white">{order.total.toFixed(2)}</td>
                <td className={`py-2 text-center ${getStatusColor(order.status)}`}>
                  {order.status.replace('_', ' ').toUpperCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="py-8 text-xs">
            No orders found
          </div>
        )}
      </div>
    </div>
  );
}

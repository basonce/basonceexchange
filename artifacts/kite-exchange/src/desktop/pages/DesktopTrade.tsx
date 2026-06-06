import { useState, useEffect, useMemo } from 'react';
import { Search, Star } from 'lucide-react';
import BinanceLightweightChart from '../../components/BinanceLightweightChart';
import CoinLogo from '../../components/CoinLogo';
import { useMarkets, DeskMarket } from '../useMarkets';
import { useSpotTrading } from '../hooks/useSpotTrading';
import { useOrderBook } from '../hooks/useOrderBook';

const TIMEFRAMES = ['Time', '15m', '1h', '4h', '1D', '1W'];

function fmt(n: number, d = 2): string {
  if (!isFinite(n)) return '0';
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(d);
  return n.toPrecision(4);
}
function fmtVol(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}

interface Props { user: any; onAuth: (m: 'login' | 'register') => void; onDeposit: () => void; }

export default function DesktopTrade({ user, onAuth, onDeposit }: Props) {
  const { markets } = useMarkets();
  const tradable = useMemo(() => markets.filter(m => m.symbol !== 'USDT' && m.price > 0), [markets]);
  const [baseSymbol, setBaseSymbol] = useState<string>(() => localStorage.getItem('selectedCoinSymbol') || 'BTC');
  const [pairSearch, setPairSearch] = useState('');
  const [timeframe, setTimeframe] = useState('1D');

  const market: DeskMarket | undefined = useMemo(
    () => tradable.find(m => m.symbol === baseSymbol) || tradable[0],
    [tradable, baseSymbol],
  );
  const symbol = market?.symbol || 'BTC';
  const binanceSymbol = market?.binanceSymbol || '';
  const price = market?.price || 0;
  const change = market?.change24h || 0;

  const st = useSpotTrading(symbol);
  const { bids, asks, trades } = useOrderBook(binanceSymbol || null, price);

  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [bottomTab, setBottomTab] = useState<'open' | 'history'>('open');

  useEffect(() => { if (market) localStorage.setItem('selectedCoinSymbol', market.symbol); }, [market]);
  useEffect(() => {
    if (price > 0) {
      setBuyPrice(p => p || price.toString());
      setSellPrice(p => p || price.toString());
    }
  }, [price]);
  // Reset prices when symbol changes.
  useEffect(() => { setBuyPrice(price > 0 ? price.toString() : ''); setSellPrice(price > 0 ? price.toString() : ''); /* eslint-disable-next-line */ }, [symbol]);

  const showToast = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 4000); };

  const submit = async (side: 'buy' | 'sell') => {
    if (!user) { onAuth('login'); return; }
    const res = await st.trade({
      side, orderType,
      amount: side === 'buy' ? buyAmount : sellAmount,
      price: side === 'buy' ? buyPrice : sellPrice,
      unit: side === 'buy' ? 'usdt' : 'coin',
      currentPrice: price,
    });
    showToast(res.ok, res.message);
    if (res.ok) { side === 'buy' ? setBuyAmount('') : setSellAmount(''); }
  };

  const filteredPairs = tradable.filter(m =>
    m.symbol.toLowerCase().includes(pairSearch.toLowerCase()) ||
    m.fullName.toLowerCase().includes(pairSearch.toLowerCase()));

  return (
    <div className="bg-[#0B0E11] min-h-screen text-white">
      <div className="grid grid-cols-[240px_1fr_300px] gap-[1px] bg-[#2B3139]">
        {/* Pairs sidebar */}
        <div className="bg-[#181A20] flex flex-col">
          <div className="p-2 border-b border-[#2B3139]">
            <div className="flex items-center gap-2 bg-[#0B0E11] rounded px-2 py-1.5">
              <Search size={14} className="text-[#848E9C]" />
              <input value={pairSearch} onChange={e => setPairSearch(e.target.value)} placeholder="Search"
                className="bg-transparent text-sm outline-none flex-1 text-white" />
            </div>
          </div>
          <div className="px-3 py-1.5 grid grid-cols-2 text-[10px] text-[#848E9C]">
            <span>Pair</span><span className="text-right">Price / Change</span>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[640px]">
            {filteredPairs.map(m => (
              <button key={m.symbol} onClick={() => setBaseSymbol(m.symbol)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-[#2B3139] ${m.symbol === symbol ? 'bg-[#2B3139]' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <Star size={11} className="text-[#5E6673]" />
                  <CoinLogo symbol={m.symbol} dbUrl={m.logo} size={16} className="w-4 h-4 rounded-full object-cover shrink-0" />
                  <span className="font-medium">{m.symbol}<span className="text-[#848E9C]">/USDT</span></span>
                </div>
                <div className="text-right">
                  <div>{fmt(m.price)}</div>
                  <div className={m.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                    {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: header + chart + form */}
        <div className="bg-[#0B0E11] flex flex-col">
          {/* header */}
          <div className="flex items-center gap-6 px-4 py-2.5 border-b border-[#2B3139] overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              {market && <CoinLogo symbol={market.symbol} dbUrl={market.logo} size={26} className="w-[26px] h-[26px] rounded-full object-cover shrink-0" />}
              <span className="font-bold text-lg">{symbol}/USDT</span>
            </div>
            <div className={`text-xl font-semibold shrink-0 ${change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{fmt(price)}</div>
            <Stat label="24h Change" value={`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`} pos={change >= 0} />
            <Stat label="24h High" value={fmt(market?.high24h || 0)} />
            <Stat label="24h Low" value={fmt(market?.low24h || 0)} />
            <Stat label="24h Volume" value={fmtVol(market?.volume || 0)} />
          </div>

          {/* timeframes + chart */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[#2B3139]">
            {TIMEFRAMES.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs rounded ${timeframe === tf ? 'bg-[#2B3139] text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'}`}>
                {tf === 'Time' ? '1m' : tf}
              </button>
            ))}
          </div>
          <div className="min-h-[440px]">
            {market && (
              <BinanceLightweightChart symbol={symbol} binanceSymbol={binanceSymbol || `${symbol}USDT`}
                timeframe={timeframe} currentPrice={price} change24h={change} />
            )}
          </div>

          {/* Buy / Sell forms */}
          <div className="border-t border-[#2B3139] p-3">
            <div className="flex gap-3 text-sm border-b border-[#2B3139] mb-3">
              {(['limit', 'market'] as const).map(t => (
                <button key={t} onClick={() => setOrderType(t)}
                  className={`pb-2 capitalize ${orderType === t ? 'text-[#F0B90B] border-b-2 border-[#F0B90B]' : 'text-[#848E9C]'}`}>{t}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* BUY */}
              <div className="space-y-2">
                <div className="text-xs text-[#848E9C] flex justify-between">
                  <span>Avbl</span><span className="text-white">{st.usdtBalance.toFixed(2)} USDT</span>
                </div>
                {orderType === 'limit' && <Field label="Price" suffix="USDT" value={buyPrice} onChange={setBuyPrice} />}
                <Field label="Amount" suffix="USDT" value={buyAmount} onChange={setBuyAmount} placeholder="Total to spend" />
                <div className="flex gap-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button key={pct} onClick={() => setBuyAmount((st.usdtBalance * pct / 100).toFixed(2))}
                      className="flex-1 bg-[#2B3139] text-[10px] py-1 rounded text-[#848E9C] hover:text-white">{pct}%</button>
                  ))}
                </div>
                <button onClick={() => submit('buy')} disabled={st.loading}
                  className="w-full bg-[#0ECB81] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm">
                  Buy {symbol}
                </button>
              </div>
              {/* SELL */}
              <div className="space-y-2">
                <div className="text-xs text-[#848E9C] flex justify-between">
                  <span>Avbl</span><span className="text-white">{st.coinBalance.toFixed(6)} {symbol}</span>
                </div>
                {orderType === 'limit' && <Field label="Price" suffix="USDT" value={sellPrice} onChange={setSellPrice} />}
                <Field label="Amount" suffix={symbol} value={sellAmount} onChange={setSellAmount} placeholder={`Amount of ${symbol}`} />
                <div className="flex gap-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button key={pct} onClick={() => setSellAmount((st.coinBalance * pct / 100).toFixed(6))}
                      className="flex-1 bg-[#2B3139] text-[10px] py-1 rounded text-[#848E9C] hover:text-white">{pct}%</button>
                  ))}
                </div>
                <button onClick={() => submit('sell')} disabled={st.loading}
                  className="w-full bg-[#F6465D] hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm">
                  Sell {symbol}
                </button>
              </div>
            </div>
            {!user && <button onClick={() => onAuth('login')} className="mt-2 text-xs text-[#F0B90B] underline">Log In to trade</button>}
          </div>
        </div>

        {/* Order book + trades */}
        <div className="bg-[#0B0E11] flex flex-col">
          <div className="px-3 py-2 border-b border-[#2B3139] text-xs font-medium text-[#848E9C]">Order Book</div>
          <div className="px-3 py-1 grid grid-cols-3 text-[10px] text-[#848E9C]">
            <span>Price(USDT)</span><span className="text-right">Amount</span><span className="text-right">Total</span>
          </div>
          {asks.slice(-10).map((lv, i) => <Row key={'a' + i} price={lv.price} amount={lv.amount} total={lv.total} color="#F6465D" />)}
          <div className={`px-3 py-1.5 text-lg font-bold ${change >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{fmt(price)}</div>
          {bids.slice(0, 10).map((lv, i) => <Row key={'b' + i} price={lv.price} amount={lv.amount} total={lv.total} color="#0ECB81" />)}
          <div className="px-3 py-2 border-t border-b border-[#2B3139] text-xs font-medium text-[#848E9C]">Recent Trades</div>
          <div className="overflow-y-auto max-h-[200px]">
            {trades.map((t, i) => (
              <div key={i} className="px-3 grid grid-cols-3 text-[11px] leading-5 font-mono">
                <span className={t.isBuy ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{fmt(t.price)}</span>
                <span className="text-right text-[#EAECEF]">{t.amount}</span>
                <span className="text-right text-[#848E9C]">{t.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: open orders / history */}
      <div className="bg-[#181A20] border-t border-[#2B3139]">
        <div className="flex items-center gap-5 px-4 py-2.5 text-sm border-b border-[#2B3139]">
          <Tab active={bottomTab === 'open'} onClick={() => setBottomTab('open')}>Open Orders ({st.openOrders.length})</Tab>
          <Tab active={bottomTab === 'history'} onClick={() => setBottomTab('history')}>Order History</Tab>
        </div>
        <div className="p-2 min-h-[160px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#848E9C] text-left">
                <th className="py-2 px-2 font-normal">Pair</th><th className="font-normal">Type</th>
                <th className="font-normal">Side</th><th className="font-normal">Price</th>
                <th className="font-normal">Amount</th><th className="font-normal">Status</th>
                {bottomTab === 'open' && <th className="font-normal text-right px-2">Action</th>}
              </tr>
            </thead>
            <tbody>
              {(bottomTab === 'open' ? st.openOrders : st.orderHistory).length === 0 && (
                <tr><td colSpan={7} className="text-center text-[#5E6673] py-10">No orders</td></tr>
              )}
              {(bottomTab === 'open' ? st.openOrders : st.orderHistory).map((o: any) => (
                <tr key={o.id} className="border-t border-[#2B3139]">
                  <td className="py-2.5 px-2 font-medium">{o.symbol}/USDT</td>
                  <td className="capitalize">{o.type || o.order_type || 'market'}</td>
                  <td className={o.side === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>{o.side}</td>
                  <td>{fmt(parseFloat(o.price))}</td>
                  <td>{parseFloat(o.quantity).toFixed(6)}</td>
                  <td className="text-[#848E9C] capitalize">{o.status}</td>
                  {bottomTab === 'open' && (
                    <td className="text-right px-2">
                      <button onClick={() => st.cancelOrder(o.id)} className="text-[#F6465D] hover:underline">Cancel</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl text-sm max-w-sm ${toast.ok ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'} text-white`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, pos }: { label: string; value: string; pos?: boolean }) {
  return (
    <div className="shrink-0">
      <div className="text-[10px] text-[#848E9C] whitespace-nowrap">{label}</div>
      <div className={`text-xs font-medium ${pos === undefined ? 'text-white' : pos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{value}</div>
    </div>
  );
}
function Row({ price, amount, total, color }: { price: number; amount: number; total: number; color: string }) {
  return (
    <div className="px-3 grid grid-cols-3 text-[11px] leading-5 font-mono hover:bg-[#2B3139]">
      <span style={{ color }}>{fmt(price)}</span>
      <span className="text-right text-[#EAECEF]">{amount.toFixed(3)}</span>
      <span className="text-right text-[#848E9C]">{total.toFixed(2)}</span>
    </div>
  );
}
function Field({ label, suffix, value, onChange, placeholder }: { label: string; suffix: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="bg-[#0B0E11] border border-[#2B3139] rounded px-3 py-2 flex items-center">
      <span className="text-[11px] text-[#848E9C] w-14">{label}</span>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="bg-transparent flex-1 text-right text-sm outline-none text-white" />
      <span className="text-[11px] text-[#848E9C] ml-2">{suffix}</span>
    </div>
  );
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`pb-0.5 ${active ? 'text-white border-b-2 border-[#F0B90B]' : 'text-[#848E9C] hover:text-white'}`}>{children}</button>
  );
}

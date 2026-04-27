import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, ChevronDown, Star, Shield, Clock, Plus, ArrowLeft,
  CreditCard, Trash2, AlertCircle, CheckCircle, Send, Wallet, Copy
} from 'lucide-react';
import { p2pApi, type P2PAd, type P2POrder, type P2PMessage, type P2PPaymentMethod } from '../lib/p2p-api';

interface P2PModalProps { isOpen: boolean; onClose: () => void; }

const COINS = ['USDT', 'BTC', 'ETH', 'BNB'];
const NETWORKS: Record<string, string[]> = {
  USDT: ['BEP20', 'TRC20', 'ERC20'],
  BTC: ['BTC'],
  ETH: ['ERC20'],
  BNB: ['BEP20'],
};
const FIAT = ['USD', 'TRY', 'EUR', 'GBP', 'NGN', 'INR', 'BRL', 'PHP', 'AED', 'IDR', 'VND', 'MXN', 'PKR', 'EGP', 'ZAR', 'KES'];
const FIAT_SYMBOLS: Record<string, string> = {
  USD: '$', TRY: '₺', EUR: '€', GBP: '£', NGN: '₦', INR: '₹', BRL: 'R$',
  PHP: '₱', AED: 'AED', IDR: 'Rp', VND: '₫', MXN: '$', PKR: '₨', EGP: 'E£', ZAR: 'R', KES: 'KSh',
};
const PAYMENT_METHODS = [
  'Bank Transfer', 'Zelle', 'Venmo', 'PayPal', 'Cash App', 'Wise', 'Revolut',
  'Papara', 'Garanti BBVA', 'İş Bankası', 'Akbank', 'Ziraat Bankası',
  'PIX', 'UPI', 'GCash', 'Maya', 'M-Pesa', 'Opay', 'Mobile Money',
];

type View = 'list' | 'order' | 'post' | 'my-ads' | 'my-orders' | 'payment-methods';

export default function P2PModal({ isOpen, onClose }: P2PModalProps) {
  const [view, setView] = useState<View>('list');
  const [adType, setAdType] = useState<'buy'|'sell'>('buy');
  const [coin, setCoin] = useState('USDT');
  const [fiat, setFiat] = useState('USD');
  const [pmFilter, setPmFilter] = useState('');
  const [amountFilter, setAmountFilter] = useState('');

  const [ads, setAds] = useState<P2PAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [activeOrder, setActiveOrder] = useState<P2POrder | null>(null);
  const [orderMessages, setOrderMessages] = useState<P2PMessage[]>([]);
  const [myId, setMyId] = useState<string>('');

  const [showPlaceModal, setShowPlaceModal] = useState<P2PAd | null>(null);

  // İlanları yükle
  const loadAds = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      // 'buy' tab => kullanıcı ALMAK istiyor → satıcıların 'sell' ilanlarını göster
      // 'sell' tab => kullanıcı SATMAK istiyor → alıcıların 'buy' ilanlarını göster
      const showAdType: 'buy'|'sell' = adType === 'buy' ? 'sell' : 'buy';
      const r = await p2pApi.listAds({
        type: showAdType, symbol: coin, currency: fiat,
        payment_method: pmFilter || undefined,
        amount: amountFilter ? Number(amountFilter) : undefined,
      });
      setAds(r.ads);
    } catch (e: any) {
      setErr(e.message || 'failed to load');
      setAds([]);
    } finally { setLoading(false); }
  }, [adType, coin, fiat, pmFilter, amountFilter]);

  useEffect(() => { if (isOpen && view === 'list') loadAds(); }, [isOpen, view, loadAds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="w-full max-w-md md:max-w-2xl h-[100dvh] md:h-[90vh] md:rounded-2xl bg-[#0B0E11] border border-[#1E2329] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2329] bg-[#0B0E11]">
          {view !== 'list' && view !== 'my-ads' && view !== 'my-orders' && view !== 'payment-methods' ? (
            <button onClick={() => { setView('list'); setActiveOrder(null); }} className="text-[#F5F5F5] p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : <div className="w-7" />}
          <div className="flex items-center gap-2">
            <h2 className="text-[#F5F5F5] font-bold text-lg">P2P Trading</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#02C076]/15 text-[#02C076] text-[10px] font-semibold">Zero Fee</span>
          </div>
          <button onClick={onClose} className="text-[#848E9C] hover:text-[#F5F5F5] p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {view === 'list' && (
            <ListView
              adType={adType} setAdType={setAdType}
              coin={coin} setCoin={setCoin}
              fiat={fiat} setFiat={setFiat}
              pmFilter={pmFilter} setPmFilter={setPmFilter}
              amountFilter={amountFilter} setAmountFilter={setAmountFilter}
              ads={ads} loading={loading} err={err}
              onPlace={(ad: P2PAd) => setShowPlaceModal(ad)}
              onGotoMyAds={() => setView('my-ads')}
              onGotoMyOrders={() => setView('my-orders')}
              onGotoPost={() => setView('post')}
              onGotoPaymentMethods={() => setView('payment-methods')}
            />
          )}
          {view === 'post' && (
            <PostAdView onDone={() => { setView('list'); loadAds(); }} />
          )}
          {view === 'my-ads' && (
            <MyAdsView onClose={() => setView('list')} />
          )}
          {view === 'my-orders' && (
            <MyOrdersView onOpen={async (oid) => {
              try {
                const r = await p2pApi.getOrder(oid);
                setActiveOrder(r.order); setOrderMessages(r.messages); setMyId(r.my_id); setView('order');
              } catch (e:any) { alert(e.message); }
            }} />
          )}
          {view === 'payment-methods' && (
            <PaymentMethodsView />
          )}
          {view === 'order' && activeOrder && (
            <OrderView
              order={activeOrder} messages={orderMessages} myId={myId}
              onRefresh={async () => {
                try {
                  const r = await p2pApi.getOrder(activeOrder.id);
                  setActiveOrder(r.order); setOrderMessages(r.messages);
                } catch {}
              }}
            />
          )}
        </div>

        {/* Place order modal */}
        {showPlaceModal && (
          <PlaceOrderModal
            ad={showPlaceModal}
            onClose={() => setShowPlaceModal(null)}
            onCreated={async (oid) => {
              setShowPlaceModal(null);
              try {
                const r = await p2pApi.getOrder(oid);
                setActiveOrder(r.order); setOrderMessages(r.messages); setMyId(r.my_id); setView('order');
              } catch (e:any) { alert(e.message); }
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════ LIST VIEW ════════════════════════════════ */
function ListView(p: any) {
  return (
    <div>
      {/* Buy / Sell switch */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <button onClick={() => p.setAdType('buy')}
          className={`py-3 rounded-xl font-bold transition ${p.adType==='buy' ? 'bg-[#02C076] text-black' : 'bg-[#1E2329] text-[#F5F5F5]'}`}>
          Buy
        </button>
        <button onClick={() => p.setAdType('sell')}
          className={`py-3 rounded-xl font-bold transition ${p.adType==='sell' ? 'bg-[#F84960] text-white' : 'bg-[#1E2329] text-[#F5F5F5]'}`}>
          Sell
        </button>
      </div>

      {/* Coin + Fiat */}
      <div className="px-3 flex flex-wrap gap-2">
        {COINS.map(c => (
          <button key={c} onClick={() => p.setCoin(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${p.coin===c ? 'bg-[#F0B90B] text-black' : 'bg-[#1E2329] text-[#F5F5F5]'}`}>{c}</button>
        ))}
        <select value={p.fiat} onChange={e => p.setFiat(e.target.value)}
          className="ml-auto bg-[#1E2329] text-[#F5F5F5] rounded-lg px-3 py-1.5 text-sm font-semibold border border-[#2B3139]">
          {FIAT.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Filters */}
      <div className="px-3 mt-3 flex gap-2">
        <select value={p.pmFilter} onChange={e => p.setPmFilter(e.target.value)}
          className="flex-1 bg-[#1E2329] text-[#F5F5F5] rounded-lg px-3 py-2 text-sm border border-[#2B3139]">
          <option value="">All payments</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="number" placeholder={`Amount (${p.fiat})`} value={p.amountFilter}
          onChange={e => p.setAmountFilter(e.target.value)}
          className="w-32 bg-[#1E2329] text-[#F5F5F5] rounded-lg px-3 py-2 text-sm border border-[#2B3139]"/>
      </div>

      {/* Quick links */}
      <div className="px-3 mt-3 flex gap-2 flex-wrap">
        <button onClick={p.onGotoPost} className="text-xs px-3 py-1.5 rounded-lg bg-[#F0B90B] text-black font-bold flex items-center gap-1">
          <Plus className="w-3 h-3"/>Post Ad
        </button>
        <button onClick={p.onGotoMyAds} className="text-xs px-3 py-1.5 rounded-lg bg-[#1E2329] text-[#F5F5F5]">My Ads</button>
        <button onClick={p.onGotoMyOrders} className="text-xs px-3 py-1.5 rounded-lg bg-[#1E2329] text-[#F5F5F5]">My Orders</button>
        <button onClick={p.onGotoPaymentMethods} className="text-xs px-3 py-1.5 rounded-lg bg-[#1E2329] text-[#F5F5F5] flex items-center gap-1">
          <CreditCard className="w-3 h-3"/>Payments
        </button>
      </div>

      {/* Ad list */}
      <div className="p-3 space-y-2">
        {p.loading && <div className="text-[#848E9C] text-center py-8">Loading...</div>}
        {p.err && <div className="text-[#F84960] text-center py-4 text-sm">{p.err}</div>}
        {!p.loading && p.ads.length === 0 && (
          <div className="text-center py-12">
            <div className="text-[#848E9C] mb-3">No ads found.</div>
            <button onClick={p.onGotoPost} className="px-4 py-2 rounded-lg bg-[#F0B90B] text-black font-bold text-sm">
              Be the first — post an ad
            </button>
          </div>
        )}
        {p.ads.map((ad: P2PAd) => (
          <AdCard key={ad.id} ad={ad} fiat={p.fiat} adType={p.adType} onPlace={() => p.onPlace(ad)} />
        ))}
      </div>
    </div>
  );
}

function AdCard({ ad, fiat, adType, onPlace }: { ad: P2PAd; fiat: string; adType: 'buy'|'sell'; onPlace: () => void; }) {
  const m = ad.merchant!;
  const fsym = FIAT_SYMBOLS[fiat] || '';
  return (
    <div className="bg-[#1E2329] rounded-xl p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2B3139] flex items-center justify-center text-[#F5F5F5] text-xs font-bold">
            {m.username.slice(0,1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[#F5F5F5] font-bold text-sm">{m.username}</span>
              {m.verified && <Shield className="w-3 h-3 text-[#F0B90B]"/>}
              {m.merchant_badge && <Star className="w-3 h-3 text-[#F0B90B] fill-[#F0B90B]"/>}
            </div>
            <div className="text-[10px] text-[#848E9C]">
              {m.completed} trades · {m.completion}% · 👍 {m.like}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#F0B90B] font-bold text-base leading-none">{fsym} {Number(ad.price).toFixed(2)}</div>
          <div className="text-[10px] text-[#848E9C] mt-0.5">/ {ad.crypto_symbol}</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="text-[#848E9C]">
          <div>Available: <span className="text-[#F5F5F5]">{Number(ad.available_crypto).toFixed(4)} {ad.crypto_symbol}</span></div>
          <div>Limit: <span className="text-[#F5F5F5]">{fsym}{Number(ad.min_amount).toFixed(0)}-{Number(ad.max_amount).toFixed(0)}</span></div>
          <div className="mt-1 flex flex-wrap gap-1">
            {ad.payment_methods.slice(0,3).map(pm => (
              <span key={pm} className="px-1.5 py-0.5 rounded bg-[#2B3139] text-[#F5F5F5] text-[10px]">{pm}</span>
            ))}
            {ad.payment_methods.length > 3 && <span className="text-[10px] text-[#848E9C]">+{ad.payment_methods.length-3}</span>}
          </div>
        </div>
        <button onClick={onPlace}
          className={`px-4 py-2 rounded-lg font-bold text-sm ${adType==='buy' ? 'bg-[#02C076] text-black' : 'bg-[#F84960] text-white'}`}>
          {adType==='buy' ? 'Buy' : 'Sell'} {ad.crypto_symbol}
        </button>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-[#848E9C]">
        <Clock className="w-3 h-3"/>{ad.payment_window_minutes} min · {ad.crypto_network}
      </div>
    </div>
  );
}

/* ════════════════════════════ PLACE ORDER MODAL ════════════════════════════ */
function PlaceOrderModal({ ad, onClose, onCreated }: { ad: P2PAd; onClose: () => void; onCreated: (oid: string) => void; }) {
  const [amount, setAmount] = useState('');
  const [pm, setPm] = useState(ad.payment_methods[0] || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fsym = FIAT_SYMBOLS[ad.fiat_currency] || '';
  const cryptoAmt = useMemo(() => {
    const fa = Number(amount);
    if (!fa || !ad.price) return 0;
    return fa / Number(ad.price);
  }, [amount, ad.price]);
  const limitOK = useMemo(() => {
    const fa = Number(amount);
    return fa >= Number(ad.min_amount) && fa <= Number(ad.max_amount);
  }, [amount, ad]);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await p2pApi.createOrder({ ad_id: ad.id, fiat_amount: Number(amount), payment_method: pm });
      onCreated(r.order.id);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center">
      <div className="w-full md:max-w-md bg-[#1E2329] rounded-t-2xl md:rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#F5F5F5] font-bold">Place order — {ad.merchant?.username}</h3>
          <button onClick={onClose} className="text-[#848E9C]"><X className="w-5 h-5"/></button>
        </div>
        <div className="text-xs text-[#848E9C] mb-3">
          Price: <span className="text-[#F0B90B]">{fsym}{Number(ad.price).toFixed(2)}/{ad.crypto_symbol}</span>
          · Limit {fsym}{ad.min_amount}-{ad.max_amount}
        </div>
        <label className="block text-xs text-[#848E9C] mb-1">Amount ({ad.fiat_currency})</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder={`${ad.min_amount} - ${ad.max_amount}`}
          className="w-full bg-[#0B0E11] text-[#F5F5F5] rounded-lg px-3 py-2 mb-3 border border-[#2B3139]"/>
        <div className="text-xs text-[#848E9C] mb-3">
          You will receive: <span className="text-[#F5F5F5] font-bold">{cryptoAmt.toFixed(6)} {ad.crypto_symbol}</span>
        </div>
        <label className="block text-xs text-[#848E9C] mb-1">Payment Method</label>
        <select value={pm} onChange={e => setPm(e.target.value)}
          className="w-full bg-[#0B0E11] text-[#F5F5F5] rounded-lg px-3 py-2 mb-4 border border-[#2B3139]">
          {ad.payment_methods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {err && <div className="text-[#F84960] text-xs mb-2">{err}</div>}
        <button onClick={submit} disabled={busy || !limitOK || !amount}
          className="w-full py-3 rounded-xl bg-[#F0B90B] text-black font-bold disabled:opacity-50">
          {busy ? 'Creating...' : 'Confirm Order'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════ POST AD ════════════════════════════════ */
function PostAdView({ onDone }: { onDone: () => void; }) {
  const [adType, setAdType] = useState<'buy'|'sell'>('sell');
  const [coin, setCoin] = useState('USDT');
  const [network, setNetwork] = useState('BEP20');
  const [fiat, setFiat] = useState('USD');
  const [price, setPrice] = useState('1.00');
  const [minA, setMinA] = useState('50');
  const [maxA, setMaxA] = useState('1000');
  const [total, setTotal] = useState('500');
  const [pms, setPms] = useState<string[]>(['Bank Transfer']);
  const [window, setWindow] = useState('15');
  const [terms, setTerms] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await p2pApi.createAd({
        ad_type: adType, crypto_symbol: coin, crypto_network: network,
        fiat_currency: fiat, price: Number(price) as any,
        min_amount: Number(minA) as any, max_amount: Number(maxA) as any,
        total_crypto: Number(total) as any,
        payment_methods: pms, payment_window_minutes: Number(window) as any,
        terms: terms || null as any,
      });
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const togglePm = (m: string) => setPms(p => p.includes(m) ? p.filter(x=>x!==m) : [...p, m]);

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-[#F5F5F5] font-bold mb-2">Post New Ad</h3>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setAdType('sell')}
          className={`py-2 rounded-lg font-bold ${adType==='sell' ? 'bg-[#F84960] text-white' : 'bg-[#1E2329] text-[#F5F5F5]'}`}>
          I want to SELL
        </button>
        <button onClick={() => setAdType('buy')}
          className={`py-2 rounded-lg font-bold ${adType==='buy' ? 'bg-[#02C076] text-black' : 'bg-[#1E2329] text-[#F5F5F5]'}`}>
          I want to BUY
        </button>
      </div>
      <Field label="Crypto"><select value={coin} onChange={e=>{setCoin(e.target.value); setNetwork(NETWORKS[e.target.value][0]);}} className={inp}>
        {COINS.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
      <Field label="Network"><select value={network} onChange={e=>setNetwork(e.target.value)} className={inp}>
        {(NETWORKS[coin]||['BEP20']).map(n=><option key={n} value={n}>{n}</option>)}</select></Field>
      <Field label="Fiat Currency"><select value={fiat} onChange={e=>setFiat(e.target.value)} className={inp}>
        {FIAT.map(f=><option key={f} value={f}>{f}</option>)}</select></Field>
      <Field label={`Price (${fiat} per 1 ${coin})`}><input type="number" step="0.0001" value={price} onChange={e=>setPrice(e.target.value)} className={inp}/></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={`Min (${fiat})`}><input type="number" value={minA} onChange={e=>setMinA(e.target.value)} className={inp}/></Field>
        <Field label={`Max (${fiat})`}><input type="number" value={maxA} onChange={e=>setMaxA(e.target.value)} className={inp}/></Field>
      </div>
      <Field label={`Total ${coin} amount`}>
        <input type="number" value={total} onChange={e=>setTotal(e.target.value)} className={inp}/>
        {adType==='sell' && <div className="text-[10px] text-[#F0B90B] mt-1">⚠️ This amount will be locked from your balance into escrow.</div>}
      </Field>
      <Field label="Payment Methods (select multiple)">
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_METHODS.map(m => (
            <button key={m} onClick={()=>togglePm(m)}
              className={`px-2 py-1 rounded text-[11px] ${pms.includes(m)?'bg-[#F0B90B] text-black font-semibold':'bg-[#2B3139] text-[#F5F5F5]'}`}>
              {m}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Payment window (minutes)"><input type="number" value={window} onChange={e=>setWindow(e.target.value)} className={inp}/></Field>
      <Field label="Terms (optional)"><textarea value={terms} onChange={e=>setTerms(e.target.value)} className={inp+' min-h-[60px]'}/></Field>

      {err && <div className="text-[#F84960] text-sm">{err}</div>}
      <button onClick={submit} disabled={busy || pms.length===0}
        className="w-full py-3 rounded-xl bg-[#F0B90B] text-black font-bold disabled:opacity-50">
        {busy ? 'Posting...' : 'Post Ad'}
      </button>
    </div>
  );
}
const inp = "w-full bg-[#0B0E11] text-[#F5F5F5] rounded-lg px-3 py-2 text-sm border border-[#2B3139]";
function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return <div><label className="block text-xs text-[#848E9C] mb-1">{label}</label>{children}</div>;
}

/* ════════════════════════════ MY ADS ════════════════════════════ */
function MyAdsView({ onClose }: { onClose: () => void; }) {
  const [ads, setAds] = useState<P2PAd[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const r = await p2pApi.myAds(); setAds(r.ads); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="p-3 space-y-2">
      <h3 className="text-[#F5F5F5] font-bold mb-2">My Ads</h3>
      {loading ? <div className="text-[#848E9C] text-center py-8">Loading...</div> :
       ads.length === 0 ? <div className="text-[#848E9C] text-center py-8">No ads yet.</div> :
       ads.map(ad => (
        <div key={ad.id} className="bg-[#1E2329] rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-bold ${ad.ad_type==='sell'?'text-[#F84960]':'text-[#02C076]'}`}>{ad.ad_type.toUpperCase()}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded ${ad.status==='active'?'bg-[#02C076]/20 text-[#02C076]':'bg-[#2B3139] text-[#848E9C]'}`}>{ad.status}</span>
          </div>
          <div className="text-[#F5F5F5] text-sm">{ad.crypto_symbol} {ad.crypto_network} · {FIAT_SYMBOLS[ad.fiat_currency]||''}{Number(ad.price).toFixed(2)}/{ad.crypto_symbol}</div>
          <div className="text-xs text-[#848E9C]">Available: {Number(ad.available_crypto).toFixed(4)} / {Number(ad.total_crypto).toFixed(4)}</div>
          <div className="text-xs text-[#848E9C]">Trades: {ad.trade_count}</div>
          <div className="flex gap-2 mt-2">
            {ad.status === 'active' && (
              <button onClick={async ()=>{ await p2pApi.updateAd(ad.id,{status:'paused' as any}); load(); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#2B3139] text-[#F5F5F5]">Pause</button>
            )}
            {ad.status === 'paused' && (
              <button onClick={async ()=>{ await p2pApi.updateAd(ad.id,{status:'active' as any}); load(); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#02C076] text-black font-bold">Resume</button>
            )}
            {ad.status !== 'cancelled' && ad.status !== 'completed' && (
              <button onClick={async ()=>{ if(confirm('Cancel ad and refund escrow?')){ await p2pApi.deleteAd(ad.id); load(); } }}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#F84960] text-white">Cancel & Refund</button>
            )}
          </div>
        </div>
       ))}
    </div>
  );
}

/* ════════════════════════════ MY ORDERS ════════════════════════════ */
function MyOrdersView({ onOpen }: { onOpen: (oid: string) => void; }) {
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [myId, setMyId] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { const r = await p2pApi.myOrders(); setOrders(r.orders); setMyId(r.my_id); }
      catch {}
      setLoading(false);
    })();
  }, []);
  const colorFor = (s: string) => ({
    pending_payment: 'text-[#F0B90B]', paid: 'text-[#3B82F6]',
    completed: 'text-[#02C076]', cancelled: 'text-[#848E9C]',
    disputed: 'text-[#F84960]', expired: 'text-[#848E9C]',
  } as Record<string,string>)[s] || 'text-[#F5F5F5]';

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-[#F5F5F5] font-bold mb-2">My Orders</h3>
      {loading ? <div className="text-[#848E9C] text-center py-8">Loading...</div> :
       orders.length === 0 ? <div className="text-[#848E9C] text-center py-8">No orders yet.</div> :
       orders.map(o => (
        <button key={o.id} onClick={() => onOpen(o.id)} className="w-full text-left bg-[#1E2329] rounded-xl p-3 hover:bg-[#2B3139]">
          <div className="flex items-center justify-between">
            <span className="text-[#F5F5F5] font-bold text-sm">
              {o.buyer_id===myId?'BUY':'SELL'} {Number(o.crypto_amount).toFixed(4)} {o.crypto_symbol}
            </span>
            <span className={`text-xs font-bold ${colorFor(o.status)}`}>{o.status.replace('_',' ')}</span>
          </div>
          <div className="text-xs text-[#848E9C] mt-1">{o.order_number} · {FIAT_SYMBOLS[o.fiat_currency]||''}{Number(o.fiat_amount).toFixed(2)} · {o.payment_method}</div>
        </button>
       ))}
    </div>
  );
}

/* ════════════════════════════ ORDER DETAIL ════════════════════════════ */
function OrderView({ order, messages, myId, onRefresh }:
  { order: P2POrder; messages: P2PMessage[]; myId: string; onRefresh: () => Promise<void>; }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState<number>(0);
  const isBuyer = myId === order.buyer_id;
  const fsym = FIAT_SYMBOLS[order.fiat_currency] || '';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(order.payment_deadline).getTime() - Date.now())/1000));
      setSecs(left);
    };
    tick(); const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order.payment_deadline]);

  useEffect(() => {
    const id = setInterval(onRefresh, 5000);
    return () => clearInterval(id);
  }, [onRefresh]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    if (!msg.trim()) return;
    try { await p2pApi.sendMessage(order.id, msg); setMsg(''); onRefresh(); } catch {}
  };
  const action = async (fn: () => Promise<any>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    try { await fn(); await onRefresh(); } catch (e:any) { alert(e.message); }
    setBusy(false);
  };

  const pmd = order.payment_method_details;
  const mins = Math.floor(secs/60), ss = secs%60;

  return (
    <div className="flex flex-col h-full">
      {/* Top: status + countdown */}
      <div className="bg-[#1E2329] p-3 border-b border-[#2B3139]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#F5F5F5] font-bold">{order.order_number}</span>
          <span className={`text-xs font-bold ${
            order.status==='completed'?'text-[#02C076]':
            order.status==='disputed'?'text-[#F84960]':
            order.status==='cancelled'?'text-[#848E9C]':
            order.status==='paid'?'text-[#3B82F6]':'text-[#F0B90B]'
          }`}>{order.status.replace('_',' ').toUpperCase()}</span>
        </div>
        <div className="text-xs text-[#848E9C]">
          {isBuyer?'You BUY':'You SELL'} {Number(order.crypto_amount).toFixed(6)} {order.crypto_symbol} ({order.crypto_network}) for {fsym}{Number(order.fiat_amount).toFixed(2)}
        </div>
        {order.status==='pending_payment' && (
          <div className="mt-2 text-center text-[#F0B90B] font-bold text-lg">⏱ {String(mins).padStart(2,'0')}:{String(ss).padStart(2,'0')}</div>
        )}
      </div>

      {/* Payment instructions */}
      {(order.status==='pending_payment' || order.status==='paid') && pmd && (
        <div className="bg-[#0B0E11] p-3 border-b border-[#2B3139]">
          <div className="text-xs font-bold text-[#F0B90B] mb-2">📋 PAYMENT DETAILS — {order.payment_method}</div>
          <PmDetailRow label="Account Name" value={pmd.account_name} />
          {pmd.account_number && <PmDetailRow label="Account / IBAN / Email" value={pmd.account_number} />}
          {pmd.bank_name && <PmDetailRow label="Bank" value={pmd.bank_name} />}
          {pmd.notes && <PmDetailRow label="Notes" value={pmd.notes} />}
          <div className="mt-2 text-[10px] text-[#F0B90B]">
            ⚠️ Send EXACTLY {fsym}{Number(order.fiat_amount).toFixed(2)} via {order.payment_method}.
            Do NOT include "crypto" or "USDT" in the payment description.
          </div>
        </div>
      )}
      {(order.status==='pending_payment' || order.status==='paid') && !pmd && (
        <div className="bg-[#1E2329] p-3 border-b border-[#2B3139] text-xs text-[#F0B90B]">
          ⚠️ Seller has not added payment details for {order.payment_method}. Ask them in chat.
        </div>
      )}

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#0B0E11]">
        {messages.map(m => (
          <div key={m.id} className={`max-w-[80%] ${m.is_system ? 'mx-auto text-center' : m.sender_id===myId?'ml-auto':'mr-auto'}`}>
            <div className={`rounded-lg px-3 py-2 text-sm ${
              m.is_system ? 'bg-[#1E2329]/50 text-[#848E9C] text-xs italic' :
              m.sender_id===myId ? 'bg-[#F0B90B] text-black' : 'bg-[#1E2329] text-[#F5F5F5]'
            }`}>{m.message}</div>
            <div className="text-[9px] text-[#848E9C] mt-0.5 px-1">
              {new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
            </div>
          </div>
        ))}
      </div>

      {/* Input + actions */}
      <div className="border-t border-[#2B3139] p-3 bg-[#0B0E11] space-y-2">
        {!['completed','cancelled','expired'].includes(order.status) && (
          <div className="flex gap-2">
            <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Message..." onKeyDown={e=>e.key==='Enter'&&send()}
              className="flex-1 bg-[#1E2329] text-[#F5F5F5] rounded-lg px-3 py-2 text-sm border border-[#2B3139]"/>
            <button onClick={send} disabled={!msg.trim()} className="px-3 rounded-lg bg-[#F0B90B] text-black"><Send className="w-4 h-4"/></button>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {isBuyer && order.status==='pending_payment' && (
            <button onClick={()=>action(()=>p2pApi.markPaid(order.id),'I have completed the payment. Mark as paid?')} disabled={busy}
              className="flex-1 py-2 rounded-lg bg-[#02C076] text-black font-bold text-sm">✓ Mark as Paid</button>
          )}
          {!isBuyer && (order.status==='paid' || order.status==='pending_payment') && (
            <button onClick={()=>action(()=>p2pApi.confirm(order.id),'Confirm payment received and release crypto?')} disabled={busy}
              className="flex-1 py-2 rounded-lg bg-[#02C076] text-black font-bold text-sm">🔓 Confirm Received</button>
          )}
          {(order.status==='pending_payment' || (order.status==='paid' && isBuyer)) && (
            <button onClick={()=>action(()=>p2pApi.cancel(order.id, prompt('Cancel reason?') || ''))}
              disabled={busy} className="px-3 py-2 rounded-lg bg-[#2B3139] text-[#F5F5F5] text-sm">Cancel</button>
          )}
          {(order.status==='pending_payment' || order.status==='paid') && (
            <button onClick={()=>action(()=>p2pApi.dispute(order.id, prompt('Describe the issue:') || 'no reason given'),'Open dispute? Admin will review.')}
              disabled={busy} className="px-3 py-2 rounded-lg bg-[#F84960] text-white text-sm">🚨 Dispute</button>
          )}
        </div>
      </div>
    </div>
  );
}

function PmDetailRow({ label, value }: { label: string; value: string; }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-[#848E9C]">{label}:</span>
      <div className="flex items-center gap-1">
        <span className="text-[#F5F5F5] font-mono">{value}</span>
        <button onClick={()=>navigator.clipboard?.writeText(value)} className="text-[#848E9C] hover:text-[#F0B90B]">
          <Copy className="w-3 h-3"/>
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════ PAYMENT METHODS ════════════════════════════ */
function PaymentMethodsView() {
  const [pms, setPms] = useState<P2PPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const load = async () => { try { const r = await p2pApi.listPaymentMethods(); setPms(r.payment_methods); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[#F5F5F5] font-bold">Saved Payment Methods</h3>
        <button onClick={()=>setShowAdd(true)} className="text-xs px-3 py-1.5 rounded-lg bg-[#F0B90B] text-black font-bold flex items-center gap-1">
          <Plus className="w-3 h-3"/>Add
        </button>
      </div>
      <div className="text-[10px] text-[#F0B90B] bg-[#F0B90B]/10 rounded-lg p-2 mb-3">
        💡 Buyers will see these details ONLY when they place an order on your SELL ads.
      </div>
      {loading ? <div className="text-[#848E9C] text-center py-8">Loading...</div> :
       pms.length === 0 ? <div className="text-[#848E9C] text-center py-8 text-sm">No payment methods. Add one to start selling.</div> :
       <div className="space-y-2">
         {pms.map(pm => (
           <div key={pm.id} className="bg-[#1E2329] rounded-xl p-3">
             <div className="flex items-center justify-between mb-1">
               <span className="text-[#F0B90B] font-bold text-sm">{pm.method_type}</span>
               <button onClick={async ()=>{ if(confirm('Delete?')){ await p2pApi.deletePaymentMethod(pm.id); load(); } }}
                 className="text-[#F84960]"><Trash2 className="w-4 h-4"/></button>
             </div>
             <div className="text-[#F5F5F5] text-sm">{pm.account_name}</div>
             {pm.account_number && <div className="text-xs text-[#848E9C] font-mono">{pm.account_number}</div>}
             {pm.bank_name && <div className="text-xs text-[#848E9C]">{pm.bank_name}</div>}
             {pm.notes && <div className="text-xs text-[#848E9C] italic mt-1">{pm.notes}</div>}
           </div>
         ))}
       </div>
      }
      {showAdd && <AddPaymentMethodModal onClose={()=>setShowAdd(false)} onAdded={()=>{setShowAdd(false); load();}}/>}
    </div>
  );
}

function AddPaymentMethodModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void; }) {
  const [type, setType] = useState('Bank Transfer');
  const [name, setName] = useState('');
  const [num, setNum] = useState('');
  const [bank, setBank] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await p2pApi.addPaymentMethod({ method_type: type, account_name: name, account_number: num, bank_name: bank, notes });
      onAdded();
    } catch (e:any) { alert(e.message); setBusy(false); }
  };
  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center">
      <div className="w-full md:max-w-md bg-[#1E2329] rounded-t-2xl md:rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#F5F5F5] font-bold">Add Payment Method</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#848E9C]"/></button>
        </div>
        <Field label="Type"><select value={type} onChange={e=>setType(e.target.value)} className={inp}>
          {PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></Field>
        <div className="h-2"/>
        <Field label="Account Name (Full Name)"><input value={name} onChange={e=>setName(e.target.value)} className={inp}/></Field>
        <div className="h-2"/>
        <Field label="Account / IBAN / Email / Phone"><input value={num} onChange={e=>setNum(e.target.value)} className={inp}/></Field>
        <div className="h-2"/>
        <Field label="Bank Name (optional)"><input value={bank} onChange={e=>setBank(e.target.value)} className={inp}/></Field>
        <div className="h-2"/>
        <Field label="Notes (optional)"><input value={notes} onChange={e=>setNotes(e.target.value)} className={inp}/></Field>
        <button onClick={submit} disabled={busy || !name} className="w-full mt-4 py-3 rounded-xl bg-[#F0B90B] text-black font-bold disabled:opacity-50">
          {busy ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

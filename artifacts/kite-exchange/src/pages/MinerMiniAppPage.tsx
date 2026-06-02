import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Sparkles, Users, Settings, X, ChevronRight, Zap, Gift, Share2, UserPlus, Send } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { computeBncMarket, seededRand } from '../lib/bncMarket';
import { minerApi, hasTelegram, type ServerMinerState } from '../lib/miner-api';

type Tab = 'home' | 'upgrade' | 'friends';

interface MinerState {
  hash_rate: number;
  bsc_balance: number;
  total_claimed: number;
  last_claim_at: number;
  boxes_owned: string[];
  tasks_done: string[];
  ref_by: string | null;
  invited_count: number;
  linked?: boolean;
}

const DEFAULT_STATE: MinerState = {
  hash_rate: 0.000000163,
  bsc_balance: 0,
  total_claimed: 0,
  last_claim_at: Date.now(),
  boxes_owned: [],
  tasks_done: [],
  ref_by: null,
  invited_count: 0,
  linked: false,
};

const BOXES = [
  { id: 'core',    name: 'BNC Core',    price: 1,   yield: 0.0187488, img: '/miner/box-core.png' },
  { id: 'flux',    name: 'BNC Flux',    price: 2,   yield: 0.0375840, img: '/miner/box-flux.png' },
  { id: 'pulse',   name: 'BNC Pulse',   price: 5,   yield: 0.0563328, img: '/miner/box-pulse.png' },
  { id: 'vector',  name: 'BNC Vector',  price: 10,  yield: 0.0750816, img: '/miner/box-vector.png' },
  { id: 'matrix',  name: 'BNC Matrix',  price: 20,  yield: 0.1126656, img: '/miner/box-matrix.png' },
  { id: 'quantum', name: 'BNC Quantum', price: 50,  yield: 0.2252448, img: '/miner/box-quantum.png' },
  { id: 'hyper',   name: 'BNC Hyper',   price: 100, yield: 0.4827168, img: '/miner/box-hyper.png' },
  { id: 'prime',   name: 'BNC Prime',   price: 200, yield: 1.1262240, img: '/miner/box-prime.png' },
];

const TASKS = [
  { id: 'basonce_channel',  title: 'Basonce Channel',  reward: 0.01,  url: 'https://t.me/basonce', emoji: '⚡', bg: 'from-yellow-500 to-orange-600' },
  { id: 'boost_channel',    title: 'Boost Channel',    reward: 0.01,  url: 'https://t.me/boost/basonce', emoji: '⭐', bg: 'from-pink-500 to-purple-600' },
  { id: 'share_story',      title: 'Share Story',      reward: 0.01,  url: '', emoji: '🎬', bg: 'from-purple-500 to-pink-500' },
  { id: 'invite_5',         title: 'Invite friends',   reward: 0.1,   url: '', emoji: '👥', bg: 'from-white to-gray-200', isInvite: true },
  { id: 'earntether',       title: 'EarnTether',       reward: 0.001, url: 'https://basonce.com/#assets', emoji: '💎', bg: 'from-green-500 to-emerald-600' },
  { id: 'eth_miner',        title: 'ETH Miner',        reward: 0.001, url: 'https://basonce.com/#mining', emoji: '⛏️', bg: 'from-blue-600 to-cyan-600' },
  { id: 'ton_power_mine',   title: 'TON Power Mine',   reward: 0.001, url: 'https://t.me/wallet', emoji: '🔋', bg: 'from-cyan-500 to-blue-700' },
  { id: 'facebook',         title: 'Facebook',         reward: 0.001, url: 'https://facebook.com/basonce', emoji: '📘', bg: 'from-blue-500 to-blue-700' },
  { id: 'to_new',           title: 'To New',           reward: 0.001, url: 'https://basonce.com', emoji: '⭐', bg: 'from-red-500 to-orange-500' },
  { id: 'surprise_unbox',   title: 'Surprise Unboxing', reward: 0.001, url: '', emoji: '🎁', bg: 'from-blue-400 to-cyan-500' },
];

const SPONSORS = [
  { name: 'HashKey',      logo: 'https://logo.clearbit.com/hashkey.com',          url: 'https://hashkey.com' },
  { name: 'Arrington',    logo: 'https://logo.clearbit.com/arringtoncapital.com', url: 'https://arringtoncapital.com' },
  { name: 'Cogitent',     logo: 'https://logo.clearbit.com/cogitent.ventures',    url: 'https://cogitent.ventures' },
  { name: 'Y Combinator', logo: 'https://logo.clearbit.com/ycombinator.com',      url: 'https://ycombinator.com' },
  { name: 'PancakeSwap',  logo: 'https://logo.clearbit.com/pancakeswap.finance',  url: 'https://pancakeswap.finance' },
  { name: 'Ledger',       logo: 'https://logo.clearbit.com/ledger.com',           url: 'https://ledger.com' },
  { name: 'NEAR',         logo: 'https://logo.clearbit.com/near.org',             url: 'https://near.org' },
  { name: 'Alchemy',      logo: 'https://logo.clearbit.com/alchemy.com',          url: 'https://alchemy.com' },
  { name: 'MetaMask',     logo: 'https://logo.clearbit.com/metamask.io',          url: 'https://metamask.io' },
];

const OPERATOR_WALLET = 'UQCeytNeGzjIuutg5vZJETyrlg7Mqp0Vm4a0iU7RRTihqh6n';
const BOT_USERNAME = 'Basonce_Miner_Bot';
const WITHDRAW_MIN = 100;
const USDT_RATE = 0.001; // USDT credited per BNC (must match worker MINER_USDT_RATE)

function serverToState(s: ServerMinerState): MinerState {
  return {
    hash_rate: Number(s.hash_rate) || DEFAULT_STATE.hash_rate,
    bsc_balance: Number(s.bsc_balance) || 0,
    total_claimed: Number(s.total_claimed) || 0,
    last_claim_at: Number(s.last_claim_at) || Date.now(),
    boxes_owned: Array.isArray(s.boxes_owned) ? s.boxes_owned : [],
    tasks_done: Array.isArray(s.tasks_done) ? s.tasks_done : [],
    ref_by: s.ref_by || null,
    invited_count: Number(s.invited_count) || 0,
    linked: !!s.linked,
  };
}

// Telegram CloudStorage helpers with localStorage fallback
const tg: any = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

// Only use Telegram CloudStorage when we are REALLY inside Telegram —
// telegram-web-app.js stubs CloudStorage in regular browsers but its
// callback never fires there, which would freeze the UI on "Loading…".
function inTelegramContext(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as any).__IS_TELEGRAM_MINIAPP__ === true) return true;
  return !!(window as any).Telegram?.WebApp?.initData;
}

function loadState(): Promise<MinerState> {
  return new Promise((resolve) => {
    const useCloud = inTelegramContext() && tg?.CloudStorage;
    // Hard timeout: even if CloudStorage misbehaves, we never hang.
    let done = false;
    const finish = (s: MinerState) => { if (!done) { done = true; resolve(s); } };
    setTimeout(() => {
      try {
        const v = localStorage.getItem('miner_state');
        if (!v) return finish({ ...DEFAULT_STATE });
        finish({ ...DEFAULT_STATE, ...JSON.parse(v) });
      } catch { finish({ ...DEFAULT_STATE }); }
    }, 1200);
    if (useCloud) {
      tg.CloudStorage.getItem('miner_state', (err: any, val: string) => {
        if (err || !val) return finish({ ...DEFAULT_STATE });
        try { finish({ ...DEFAULT_STATE, ...JSON.parse(val) }); } catch { finish({ ...DEFAULT_STATE }); }
      });
    } else {
      try {
        const v = localStorage.getItem('miner_state');
        if (!v) return finish({ ...DEFAULT_STATE });
        finish({ ...DEFAULT_STATE, ...JSON.parse(v) });
      } catch { finish({ ...DEFAULT_STATE }); }
    }
  });
}

function saveState(s: MinerState): Promise<void> {
  return new Promise((resolve) => {
    const v = JSON.stringify(s);
    try { localStorage.setItem('miner_state', v); } catch {}
    if (inTelegramContext() && tg?.CloudStorage) {
      try { tg.CloudStorage.setItem('miner_state', v, () => resolve()); } catch { resolve(); }
    } else {
      resolve();
    }
  });
}

function getTelegramUser(): { id: number; username?: string; first_name?: string } | null {
  return tg?.initDataUnsafe?.user || null;
}

export default function MinerMiniAppPage() {
  const [tab, setTab] = useState<Tab>('home');
  const [state, setState] = useState<MinerState | null>(null);
  const [liveBalance, setLiveBalance] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [withdrawEmail, setWithdrawEmail] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  // Deterministic market data — same numbers for every user worldwide
  const [market, setMarket] = useState(() => computeBncMarket());
  const bncPrice = market.price;
  const bncChange = market.change24h;
  const bncVol = market.volumeMillions;
  const priceDir = market.dir;
  const [showBook, setShowBook] = useState(false);
  const [trades, setTrades] = useState<{ id: number; side: 'buy' | 'sell' | 'hold'; price: number; amount: number; time: string }[]>([]);

  useEffect(() => {
    const id = setInterval(() => setMarket(computeBncMarket()), 450);
    return () => clearInterval(id);
  }, []);

  // Telegram native BackButton: shown whenever we are NOT on Home; click returns Home.
  useEffect(() => {
    const wtg: any = (window as any).Telegram?.WebApp;
    if (!wtg?.BackButton) return;
    const handler = () => setTab('home');
    if (tab === 'home') {
      try { wtg.BackButton.hide(); } catch {}
    } else {
      try { wtg.BackButton.show(); } catch {}
    }
    try { wtg.BackButton.onClick(handler); } catch {}
    return () => { try { wtg.BackButton.offClick(handler); } catch {} };
  }, [tab]);

  // Live trade stream — slower, deterministic-ish per global second bucket
  useEffect(() => {
    if (!showBook) return;
    const tick = () => {
      const bucket = Math.floor(Date.now() / 3500);
      const r = seededRand(bucket);
      // Heavy buy bias: 70% buy, 22% sell, 8% hold
      const side: 'buy' | 'sell' | 'hold' = r < 0.70 ? 'buy' : r < 0.92 ? 'sell' : 'hold';
      const jitter = (seededRand(bucket + 17) - 0.5) * 0.04;
      const m = computeBncMarket();
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const amount = +(seededRand(bucket + 31) * 950 + 12).toFixed(2);
      setTrades((prev) => [
        { id: bucket, side, price: Math.max(0.01, m.price + jitter), amount, time: `${hh}:${mm}:${ss}` },
        ...prev.filter(t => t.id !== bucket),
      ].slice(0, 14));
    };
    tick();
    const id = setInterval(tick, 600);
    return () => clearInterval(id);
  }, [showBook]);

  // Order book: bids MASSIVE (giant buy wall), asks tiny (almost no sellers).
  // Deterministic per ~4s bucket so all users see the same wall.
  const bookLevels = 8;
  const bookBucket = Math.floor(Date.now() / 700);
  const asks = Array.from({ length: bookLevels }).map((_, i) => {
    const price = bncPrice + (i + 1) * 0.008 + seededRand(bookBucket + i * 7 + 1) * 0.003;
    const amount = +(seededRand(bookBucket + i * 11 + 2) * 350 + 40).toFixed(2);
    return { price, amount };
  }).reverse();
  const bids = Array.from({ length: bookLevels }).map((_, i) => {
    const price = Math.max(0.01, bncPrice - (i + 1) * 0.008 - seededRand(bookBucket + i * 13 + 3) * 0.003);
    const amount = +(seededRand(bookBucket + i * 17 + 4) * 7500 + 5500).toFixed(2);
    return { price, amount };
  });
  const maxAmt = Math.max(...asks.map(a => a.amount), ...bids.map(b => b.amount));
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const stateRef = useRef<MinerState | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Init Telegram WebApp
  useEffect(() => {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0a0a14');
        tg.setBackgroundColor('#0a0a14');
      } catch {}
    }
    // Ref code from URL or Telegram start_param
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || tg?.initDataUnsafe?.start_param || null;
    (async () => {
      if (hasTelegram()) {
        try {
          const { state: s } = await minerApi.init(ref);
          if (s) { setState(serverToState(s)); return; }
        } catch { /* fall through to local cache */ }
      }
      const s = await loadState();
      if (ref && !s.ref_by) s.ref_by = ref;
      setState(s);
    })();
  }, []);

  // Live balance ticker (visual only)
  useEffect(() => {
    if (!state) return;
    const update = () => {
      const elapsedSec = (Date.now() - state.last_claim_at) / 1000;
      const earned = state.hash_rate * elapsedSec;
      setLiveBalance(state.bsc_balance + earned);
    };
    update();
    const i = setInterval(update, 100);
    return () => clearInterval(i);
  }, [state]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const handleClaim = async () => {
    if (!state || claiming) return;
    setClaiming(true);
    try {
      if (hasTelegram()) {
        const { earned, state: s } = await minerApi.claim();
        setState(serverToState(s));
        showToast(earned > 0 ? `+${Number(earned).toFixed(8)} BNC claimed` : 'Nothing to claim yet');
      } else {
        const now = Date.now();
        const earned = state.hash_rate * ((now - state.last_claim_at) / 1000);
        if (earned <= 0) { setClaiming(false); return; }
        const next: MinerState = {
          ...state,
          bsc_balance: state.bsc_balance + earned,
          total_claimed: state.total_claimed + earned,
          last_claim_at: now,
        };
        await saveState(next);
        setState(next);
        showToast(`+${earned.toFixed(8)} BNC claimed`);
      }
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    } catch (e: any) {
      showToast(e?.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  const handleBuyBox = useCallback(async (box: typeof BOXES[0]) => {
    if (!state || buying) return;
    if (!tonAddress) {
      tonConnectUI.openModal();
      return;
    }
    setBuying(box.id);
    try {
      // Build TON transaction (nanotons: 1 TON = 1_000_000_000)
      const amountNano = BigInt(Math.floor(box.price * 1_000_000_000)).toString();
      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [{
          address: OPERATOR_WALLET,
          amount: amountNano,
          payload: undefined,
        }],
      });
      if (hasTelegram()) {
        // Server verifies the on-chain payment before crediting hash power.
        showToast('Confirming payment on-chain…');
        let confirmed: ServerMinerState | null = null;
        for (let i = 0; i < 8; i++) {
          try {
            const r = await minerApi.upgrade(box.id, tonAddress);
            confirmed = r.state;
            break;
          } catch (err: any) {
            if (err?.status === 402) { await new Promise((res) => setTimeout(res, 4000)); continue; }
            throw err;
          }
        }
        if (confirmed) {
          setState(serverToState(confirmed));
          showToast(`✓ ${box.name} activated! +${box.yield.toFixed(4)} BNC/day`);
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
          showToast('Payment sent — it will activate automatically once confirmed.');
        }
      } else {
        // Browser (no Telegram): local-only optimistic update
        const txHash = result.boc.slice(0, 32);
        const next: MinerState = {
          ...state,
          hash_rate: state.hash_rate + (box.yield / 86400), // daily yield → per-second
          boxes_owned: [...state.boxes_owned, `${box.id}:${Date.now()}:${txHash}`],
        };
        await saveState(next);
        setState(next);
        showToast(`✓ ${box.name} activated! +${box.yield.toFixed(4)} BNC/day`);
      }
    } catch (e: any) {
      showToast(e?.message?.includes('UserReject') ? 'Transaction cancelled' : 'Payment failed');
    } finally {
      setBuying(null);
    }
  }, [state, buying, tonAddress, tonConnectUI]);

  const openExternal = (url: string) => {
    if (!url) return;
    if (tg?.openTelegramLink && url.startsWith('https://t.me/')) {
      tg.openTelegramLink(url);
    } else if (tg?.openLink) {
      tg.openLink(url, { try_instant_view: false });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  };

  const handleTask = async (task: typeof TASKS[0]) => {
    if (!state || state.tasks_done.includes(task.id)) return;
    if (task.url) openExternal(task.url);
    if (task.id === 'invite_5' && state.invited_count < 5) {
      showToast(`${state.invited_count}/5 friends invited`);
      return;
    }
    if (hasTelegram()) {
      setTimeout(async () => {
        try {
          const { state: s } = await minerApi.task(task.id);
          setState(serverToState(s));
          showToast(`+${task.reward} BNC reward`);
        } catch (e: any) {
          showToast(e?.message || 'Could not verify task');
        }
      }, 3000);
      return;
    }
    setTimeout(async () => {
      const cur = stateRef.current;
      if (!cur || cur.tasks_done.includes(task.id)) return;
      const next: MinerState = {
        ...cur,
        bsc_balance: cur.bsc_balance + task.reward,
        tasks_done: [...cur.tasks_done, task.id],
      };
      await saveState(next);
      setState(next);
      showToast(`+${task.reward} BNC reward`);
    }, 3000);
  };

  const doWithdraw = async (email?: string) => {
    setWithdrawing(true);
    try {
      const r = await minerApi.withdraw(email);
      setShowLink(false);
      setWithdrawEmail('');
      setState(serverToState(r.state));
      showToast(`✓ ${Number(r.usdt_credited).toFixed(4)} USDT credited to basonce.com`);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch (e: any) {
      if (e?.data?.need_link) setShowLink(true);
      else showToast(e?.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!state) return;
    if (liveBalance < WITHDRAW_MIN) {
      showToast(`Min withdrawal: ${WITHDRAW_MIN} BNC. You have ${liveBalance.toFixed(6)}`);
      return;
    }
    if (!hasTelegram()) { showToast('Open in Telegram to withdraw'); return; }
    await doWithdraw();
  };

  const tgUser = getTelegramUser();
  const refLink = `https://t.me/${BOT_USERNAME}?startapp=${tgUser?.id || 'web'}`;
  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink).then(() => showToast('Link copied!'));
  };

  if (!state) {
    return (
      <div className="fixed inset-0 bg-[#0a0a14] flex items-center justify-center text-white">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a14] text-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white text-black">
        <button
          type="button"
          onClick={() => setTab('home')}
          className="font-bold text-lg active:opacity-60"
        >
          BNC MINER
        </button>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setTab('home')} aria-label="Settings" className="p-1 active:opacity-60">
            <Settings className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setTab('home')}
            aria-label="Back to home"
            className="p-1 active:opacity-60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'home' && (
          <div className="p-4 space-y-4">
            <div className="text-center pt-6">
              <div className="text-blue-400 text-sm font-semibold mb-2">BNC</div>
              <div className="text-blue-400 text-4xl font-bold tabular-nums">{liveBalance.toFixed(8)}</div>
            </div>
            <div className="flex justify-center my-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 blur-3xl opacity-50 animate-pulse" />
                <div className="relative w-36 h-36 rounded-full bg-black overflow-hidden flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.7)] ring-2 ring-blue-500/40">
                  <img src="/miner/bnc-coin.png" alt="BNC" className="w-full h-full object-cover" style={{ transform: 'scale(1.7)' }} />
                </div>
              </div>
            </div>
            <div className="text-center text-blue-300 text-sm">
              Total Power: <span className="font-mono">{state.hash_rate.toFixed(9)} BNC/s</span>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition"
            >
              {claiming ? 'Claiming…' : 'Claim'}
            </button>
            <button
              onClick={() => setTab('upgrade')}
              className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg active:scale-95 transition"
            >
              Upgrade
            </button>

            {/* Live BNC Price Ticker — click to open order book */}
            <button
              type="button"
              onClick={() => setShowBook(true)}
              className="w-full mt-4 bg-[#13131f] rounded-xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition hover:bg-[#181826]"
            >
              <div className="w-10 h-10 rounded-full bg-black overflow-hidden flex items-center justify-center ring-1 ring-yellow-500/40 shrink-0">
                <img src="/miner/bnc-coin.png" alt="BNC" className="w-full h-full object-cover" style={{ transform: 'scale(1.7)' }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-bold leading-tight">
                  BNC <span className="text-gray-500 font-normal">/USDT</span>
                </div>
                <div className="text-[10px] text-gray-500 leading-tight">Vol ${bncVol.toFixed(1)}M</div>
              </div>
              <div
                key={bncPrice.toFixed(4)}
                className={`text-base font-bold tabular-nums px-2 py-0.5 rounded transition-colors duration-300 ${
                  priceDir === 'up' ? 'text-emerald-400 bg-emerald-500/15' : priceDir === 'down' ? 'text-red-400 bg-red-500/15' : 'text-white'
                }`}
              >
                ${bncPrice.toFixed(4)}
              </div>
              <div className="bg-emerald-500 text-black text-xs font-bold px-2 py-1 rounded-md tabular-nums">
                +{bncChange.toFixed(2)}%
              </div>
            </button>

            <div className="mt-4 bg-[#13131f] rounded-xl p-4">
              <div className="text-sm font-semibold mb-3">Wallet Balance</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-black overflow-hidden flex items-center justify-center ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                    <img src="/miner/bnc-coin.png" alt="BNC" className="w-full h-full object-cover" style={{ transform: 'scale(1.7)' }} />
                  </div>
                  <div>
                    <div className="text-lg font-bold">{liveBalance.toFixed(4)}</div>
                    <div className="text-xs text-gray-400">≈ ${(liveBalance * USDT_RATE).toFixed(4)}</div>
                  </div>
                </div>
                <button
                  onClick={handleWithdraw}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold ${liveBalance >= WITHDRAW_MIN ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-500'}`}
                >
                  Withdraw
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Min withdrawal: {WITHDRAW_MIN} BNC → credited as USDT to your basonce.com wallet
              </div>
            </div>

            {/* Sponsors */}
            <div className="mt-6">
              <div className="text-center text-sm font-semibold mb-3 text-gray-400">Sponsors and Partners</div>
              <div className="grid grid-cols-3 gap-2">
                {SPONSORS.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => openExternal(s.url)}
                    className="bg-white rounded-lg h-16 flex items-center justify-center px-2 active:scale-95 transition"
                  >
                    <img
                      src={s.logo}
                      alt={s.name}
                      className="max-h-10 max-w-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        const parent = el.parentElement;
                        if (parent && !parent.querySelector('.fallback-name')) {
                          const span = document.createElement('span');
                          span.className = 'fallback-name text-xs font-bold text-gray-800 uppercase';
                          span.textContent = s.name;
                          parent.appendChild(span);
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'upgrade' && (
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-gray-400">Buy with TON</div>
              <TonConnectButton />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BOXES.map((box) => {
                const owned = state.boxes_owned.filter((b) => b.startsWith(box.id + ':')).length;
                return (
                  <div key={box.id} className="bg-[#13131f] rounded-xl overflow-hidden border border-gray-800 relative">
                    <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 text-[10px] font-bold text-blue-400 bg-black/60 rounded">{owned}/1</div>
                    {owned > 0 && <div className="absolute top-1 right-1 z-10 text-[10px] bg-green-500 rounded-full w-5 h-5 flex items-center justify-center font-bold">✓</div>}
                    <div className="aspect-square bg-gradient-radial from-gray-800 via-[#13131f] to-black flex items-center justify-center p-2">
                      <img src={box.img} alt={box.name} className="w-full h-full object-contain drop-shadow-2xl" loading="lazy" />
                    </div>
                    <div className="px-2 pb-2 text-center bg-[#1a1a26]">
                      <div className="font-bold text-sm text-white">{box.name}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Daily yield</div>
                      <div className="text-blue-400 font-mono text-xs">{box.yield.toFixed(7)} <span className="text-gray-500 text-[10px]">BNC</span></div>
                      <button
                        onClick={() => handleBuyBox(box)}
                        disabled={buying === box.id}
                        className="w-full mt-2 py-2 rounded-lg bg-black text-white text-sm font-bold border border-gray-700 active:bg-blue-600 transition disabled:opacity-50"
                      >
                        {buying === box.id ? '⏳ Processing…' : `${box.price} TON`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {!tonAddress && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-200">
                💡 Connect your TON wallet (Tonkeeper, MyTonWallet) to purchase boxes. Payments are instant, on-chain.
              </div>
            )}
          </div>
        )}

        {tab === 'friends' && (
          <div className="p-3 space-y-2">
            <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-700/30 rounded-xl p-4">
              <div className="text-sm font-semibold mb-2">Your invite link</div>
              <div className="bg-black/40 rounded-lg p-2 text-[11px] font-mono break-all text-blue-300">{refLink}</div>
              <button onClick={copyRefLink} className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 font-bold text-sm shadow-lg shadow-blue-500/30">
                📋 Copy & Share Link
              </button>
              <div className="text-xs text-gray-300 mt-2 text-center">
                Invited <span className="text-blue-400 font-bold">{state.invited_count}</span> friends • +0.1 BNC per friend
              </div>
            </div>

            {TASKS.map((t) => {
              const done = state.tasks_done.includes(t.id);
              const showCount = t.id === 'invite_5';
              return (
                <button
                  key={t.id}
                  onClick={() => handleTask(t)}
                  disabled={done}
                  className="w-full bg-[#1a1a26] rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition disabled:opacity-60"
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.bg} flex items-center justify-center text-2xl shadow-lg shrink-0`}>
                    {t.emoji}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-semibold text-sm text-white truncate">
                      {t.title}{showCount && ` (${state.invited_count}/5)`}
                    </div>
                    <div className="text-xs text-blue-400 font-semibold">+{t.reward} $BNC</div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 ${done ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-blue-500/30'}`}>
                    {done ? '✓' : 'GO'}
                  </div>
                </button>
              );
            })}

            {/* basonce.com promo banner */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); openExternal('https://basonce.com'); }}
              className="block w-full mt-4 rounded-2xl overflow-hidden relative active:scale-[0.99] transition shadow-2xl shadow-purple-900/40 text-left"
            >
              <img src="/miner/promo-instant.png" alt="basonce instant payments" className="w-full h-auto block" />
              <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                <div className="text-white text-base font-black tracking-tight">TRADE ON BASONCE.COM</div>
                <div className="text-blue-300 text-xs">Withdraw BNC → USDT instantly</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a14] border-t border-gray-800 grid grid-cols-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'upgrade', label: 'Upgrade', icon: Sparkles },
          { id: 'friends', label: 'Friends', icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id as Tab)} className={`py-3 flex flex-col items-center gap-1 ${active ? 'text-white' : 'text-gray-500'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{t.label}</span>
              {active && <div className="w-6 h-0.5 bg-white rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Order Book Modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowBook(false)}>
          <div
            className="w-full max-w-md bg-[#0f0f1a] rounded-t-2xl sm:rounded-2xl border border-white/10 max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-black overflow-hidden flex items-center justify-center ring-1 ring-yellow-500/40">
                  <img src="/miner/bnc-coin.png" alt="BNC" className="w-full h-full object-cover" style={{ transform: 'scale(1.7)' }} />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">BNC <span className="text-gray-500 font-normal">/USDT</span></div>
                  <div className="text-[10px] text-gray-500 leading-tight">Vol ${bncVol.toFixed(1)}M · 24h</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <div className={`text-lg font-bold tabular-nums leading-tight ${priceDir === 'down' ? 'text-red-400' : 'text-emerald-400'}`}>${bncPrice.toFixed(4)}</div>
                  <div className="bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums leading-none">
                    +{bncChange.toFixed(2)}%
                  </div>
                </div>
                <button onClick={() => setShowBook(false)} className="text-gray-400 text-2xl leading-none px-2">×</button>
              </div>
            </div>

            {/* Body: order book + trades */}
            <div className="flex-1 overflow-y-auto">
              {/* Order book */}
              <div className="px-3 py-2">
                <div className="grid grid-cols-3 text-[10px] text-gray-500 uppercase tracking-wide pb-1 border-b border-white/5">
                  <div>Price (USDT)</div>
                  <div className="text-right">Amount (BNC)</div>
                  <div className="text-right">Total (USDT)</div>
                </div>
                {/* Asks (red) */}
                <div className="py-1">
                  {asks.map((a, i) => {
                    const pct = (a.amount / maxAmt) * 100;
                    return (
                      <div key={`a${i}`} className="relative grid grid-cols-3 text-xs tabular-nums py-0.5">
                        <div className="absolute inset-y-0 right-0 bg-red-500/10" style={{ width: `${pct}%` }} />
                        <div className="relative text-red-400 font-medium">{a.price.toFixed(4)}</div>
                        <div className="relative text-right text-gray-300">{a.amount.toFixed(2)}</div>
                        <div className="relative text-right text-gray-500">{(a.price * a.amount).toFixed(1)}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Spread / last price */}
                <div className={`text-center py-2 text-lg font-bold tabular-nums border-y border-white/5 ${priceDir === 'up' ? 'text-emerald-400' : priceDir === 'down' ? 'text-red-400' : 'text-white'}`}>
                  ${bncPrice.toFixed(4)} <span className="text-[10px] text-gray-500 font-normal">↕ last</span>
                </div>
                {/* Bids (green) */}
                <div className="py-1">
                  {bids.map((b, i) => {
                    const pct = (b.amount / maxAmt) * 100;
                    return (
                      <div key={`b${i}`} className="relative grid grid-cols-3 text-xs tabular-nums py-0.5">
                        <div className="absolute inset-y-0 right-0 bg-emerald-500/10" style={{ width: `${pct}%` }} />
                        <div className="relative text-emerald-400 font-medium">{b.price.toFixed(4)}</div>
                        <div className="relative text-right text-gray-300">{b.amount.toFixed(2)}</div>
                        <div className="relative text-right text-gray-500">{(b.price * b.amount).toFixed(1)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent trades */}
              <div className="px-3 py-2 border-t border-white/10">
                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Recent Trades</div>
                <div className="grid grid-cols-4 text-[10px] text-gray-500 uppercase pb-1">
                  <div>Side</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Time</div>
                </div>
                <div>
                  {trades.length === 0 && (
                    <div className="text-center text-gray-500 text-xs py-4">Loading trades…</div>
                  )}
                  {trades.map((t) => (
                    <div key={t.id} className="grid grid-cols-4 text-xs tabular-nums py-0.5">
                      <div className={
                        t.side === 'buy'  ? 'text-emerald-400 font-bold' :
                        t.side === 'sell' ? 'text-red-400 font-bold'    :
                                            'text-white/80 font-bold'
                      }>
                        {t.side === 'buy' ? 'BUY' : t.side === 'sell' ? 'SELL' : 'HOLD'}
                      </div>
                      <div className={`text-right ${t.side === 'buy' ? 'text-emerald-400' : t.side === 'sell' ? 'text-red-400' : 'text-white/70'}`}>{t.price.toFixed(4)}</div>
                      <div className="text-right text-gray-300">{t.amount.toFixed(2)}</div>
                      <div className="text-right text-gray-500">{t.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer buy/sell buttons */}
            <div className="grid grid-cols-2 gap-2 p-3 border-t border-white/10">
              <button
                onClick={() => { setShowBook(false); openExternal('https://basonce.com/?coin=BNC&side=buy'); }}
                className="py-3 rounded-xl bg-emerald-500 text-black font-bold active:scale-95"
              >
                BUY BNC
              </button>
              <button
                onClick={() => { setShowBook(false); openExternal('https://basonce.com/?coin=BNC&side=sell'); }}
                className="py-3 rounded-xl bg-red-500 text-white font-bold active:scale-95"
              >
                SELL BNC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw account-link modal */}
      {showLink && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLink(false)}>
          <div className="w-full max-w-sm bg-[#0f0f1a] rounded-2xl border border-white/10 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold mb-1">Link your basonce.com account</div>
            <div className="text-xs text-gray-400 mb-3">
              Enter the email of your basonce.com account. Your BNC will be credited there as USDT.
            </div>
            <input
              value={withdrawEmail}
              onChange={(e) => setWithdrawEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="you@email.com"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-blue-500"
            />
            <button
              disabled={withdrawing || !withdrawEmail.trim()}
              onClick={() => doWithdraw(withdrawEmail.trim())}
              className="w-full py-3 rounded-xl bg-blue-500 font-bold text-sm disabled:opacity-50"
            >
              {withdrawing ? 'Processing…' : 'Link & Withdraw'}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 bg-black/90 text-white text-center py-3 px-4 rounded-xl text-sm font-medium z-50">
          {toast}
        </div>
      )}

      {/* Bot username footer */}
      <div className="absolute bottom-16 left-0 right-0 text-center text-xs text-gray-500 pointer-events-none">
        @{BOT_USERNAME}
      </div>
    </div>
  );
}

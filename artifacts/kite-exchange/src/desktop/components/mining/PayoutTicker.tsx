import React, { useEffect, useRef, useState } from 'react';
import { Banknote } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Payout {
  id: number;
  name: string;
  country: string;
  avatar: string;
  amount: number;
  action: string;
}

interface PoolUser {
  name: string;
  country: string;
  avatar: string;
}

const FALLBACK_NAMES = ['Emma S.', 'James B.', 'Sofia M.', 'Lucas W.', 'Olivia K.', 'Noah T.', 'Ava P.', 'Ethan R.', 'Isabella D.', 'Mason H.', 'Liam C.', 'Mia G.'];
const FALLBACK_COUNTRIES = ['🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇯🇵', '🇨🇦', '🇦🇺', '🇮🇹', '🇪🇸', '🇧🇷'];
const WITHDRAW_ACTIONS = ['Withdrew', 'Cashed out', 'Got paid', 'Received payout', 'Collected'];

const BATCH_SIZE = 40;

const randomAmount = (min: number, max: number) => Math.floor((Math.random() * (max - min) + min) * 100) / 100;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const loadUsers = async (): Promise<PoolUser[]> => {
  try {
    const { data, error } = await supabase
      .from('anonymous_profiles')
      .select('username, country, avatar_url')
      .limit(5000);
    if (!error && data && data.length > 0) {
      const seen = new Set<string>();
      const users: PoolUser[] = [];
      for (const u of data as any[]) {
        if (!u.username || seen.has(u.username)) continue;
        seen.add(u.username);
        users.push({
          name: u.username,
          country: u.country || '🌐',
          avatar: u.avatar_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(u.username)}`,
        });
      }
      if (users.length > 0) return users;
    }
  } catch {
    // fall through to fallback
  }
  return FALLBACK_NAMES.map((name, i) => ({
    name,
    country: FALLBACK_COUNTRIES[i % FALLBACK_COUNTRIES.length],
    avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
  }));
};

let payoutIdSeq = 1;
const toPayouts = (users: PoolUser[]): Payout[] =>
  users.map((u) => ({
    id: payoutIdSeq++,
    name: u.name,
    country: u.country,
    avatar: u.avatar,
    amount: randomAmount(150, 15000),
    action: WITHDRAW_ACTIONS[Math.floor(Math.random() * WITHDRAW_ACTIONS.length)],
  }));

export default function PayoutTicker() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const deckRef = useRef<PoolUser[]>([]);
  const cursorRef = useRef(0);

  // Draw the next BATCH_SIZE unique users from the shuffled deck.
  // Reshuffle and restart only after the entire pool is exhausted, so the
  // same profile is never shown twice until everyone has appeared.
  const nextBatch = (): PoolUser[] => {
    if (deckRef.current.length === 0) return [];
    const target = Math.min(BATCH_SIZE, deckRef.current.length);
    const out: PoolUser[] = [];
    const picked = new Set<string>();
    let guard = 0;
    const maxIterations = deckRef.current.length * 2 + BATCH_SIZE;
    while (out.length < target && guard < maxIterations) {
      guard += 1;
      if (cursorRef.current >= deckRef.current.length) {
        deckRef.current = shuffle(deckRef.current);
        cursorRef.current = 0;
      }
      const user = deckRef.current[cursorRef.current];
      cursorRef.current += 1;
      // Skip anyone already shown in this same cycle (only possible right
      // after a mid-batch reshuffle); all deck names are unique, so a full
      // batch of distinct users is always reachable.
      if (picked.has(user.name)) continue;
      picked.add(user.name);
      out.push(user);
    }
    return out;
  };

  useEffect(() => {
    let active = true;

    loadUsers().then((users) => {
      if (!active) return;
      deckRef.current = shuffle(users);
      cursorRef.current = 0;
      setPayouts(toPayouts(nextBatch()));
    });

    const refresh = setInterval(() => {
      if (!active || deckRef.current.length === 0) return;
      setPayouts(toPayouts(nextBatch()));
    }, 25000);

    return () => {
      active = false;
      clearInterval(refresh);
    };
  }, []);

  if (payouts.length === 0) return null;

  return (
    <div className="bg-[#0B0E11] border-b border-[#2B3139] overflow-hidden whitespace-nowrap relative py-2.5">
      <div className="flex items-center w-max animate-marquee-x">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center gap-3 pr-3" aria-hidden={dup === 1}>
            <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#0ECB81] pl-3 uppercase">
              <Banknote className="w-3.5 h-3.5" /> Latest Payouts
            </span>
            {payouts.map((p) => (
              <div
                key={`${dup}-${p.id}`}
                className="flex items-center gap-2 bg-[#181A20] border border-[#2B3139] rounded-full pl-1 pr-3 py-1"
              >
                <img
                  src={p.avatar}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-[#2B3139]"
                  loading="lazy"
                />
                <span className="text-xs font-semibold text-white">{p.country} {p.name}</span>
                <span className="text-xs text-[#848E9C]">{p.action}</span>
                <span className="text-xs font-bold text-[#0ECB81]">${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="w-1 h-1 rounded-full bg-[#0ECB81] animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

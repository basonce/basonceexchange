import React, { useEffect, useState } from 'react';
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

const FALLBACK_NAMES = ['Emma S.', 'James B.', 'Sofia M.', 'Lucas W.', 'Olivia K.', 'Noah T.', 'Ava P.', 'Ethan R.', 'Isabella D.', 'Mason H.', 'Liam C.', 'Mia G.'];
const FALLBACK_COUNTRIES = ['🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇯🇵', '🇨🇦', '🇦🇺', '🇮🇹', '🇪🇸', '🇧🇷'];
const WITHDRAW_ACTIONS = ['Withdrew', 'Cashed out', 'Got paid', 'Received payout', 'Collected'];

const randomAmount = (min: number, max: number) => Math.floor((Math.random() * (max - min) + min) * 100) / 100;

const loadUsers = async (): Promise<{ name: string; country: string; avatar: string }[]> => {
  try {
    const { data, error } = await supabase
      .from('anonymous_profiles')
      .select('username, country, avatar_url')
      .limit(2000);
    if (!error && data && data.length > 0) {
      return data.map((u: any) => ({ name: u.username, country: u.country, avatar: u.avatar_url }));
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

const buildPayouts = (users: { name: string; country: string; avatar: string }[], count: number): Payout[] => {
  const list: Payout[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(Math.random() * users.length);
    let guard = 0;
    while (used.has(idx) && used.size < users.length && guard < 50) {
      idx = Math.floor(Math.random() * users.length);
      guard++;
    }
    used.add(idx);
    const u = users[idx];
    list.push({
      id: Date.now() + i,
      name: u.name,
      country: u.country,
      avatar: u.avatar,
      amount: randomAmount(150, 15000),
      action: WITHDRAW_ACTIONS[Math.floor(Math.random() * WITHDRAW_ACTIONS.length)],
    });
  }
  return list;
};

export default function PayoutTicker() {
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    let active = true;
    loadUsers().then((users) => {
      if (!active) return;
      setPayouts(buildPayouts(users, 14));
    });

    const refresh = setInterval(() => {
      loadUsers().then((users) => {
        if (!active) return;
        setPayouts(buildPayouts(users, 14));
      });
    }, 30000);

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

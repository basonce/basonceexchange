import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SUPABASE_URL = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ADMIN_UUIDS = new Set([
  '88292f59-898a-4fef-a1c8-8813d7b60b61',
]);

/* ══════════════════════════════════════════════════════════
   MATCH CONTROLS — in-memory store
══════════════════════════════════════════════════════════ */
interface MatchControl {
  id: string;
  homeTeam: string;
  awayTeam: string;
  targetResult?: '1' | 'X' | '2';
  targetScore?: { h: number; a: number };
  pinned: boolean;
  createdAt: number;
}

const matchControls = new Map<string, MatchControl>();

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

/* GET /admin/match-controls — public (kite-exchange reads this) */
router.get('/admin/match-controls', (_req, res) => {
  return res.json(Array.from(matchControls.values()));
});

/* POST /admin/match-controls — admin only */
router.post('/admin/match-controls', (req, res) => {
  const requesterId = req.headers['x-requester-id'] as string;
  if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { homeTeam, awayTeam, targetResult, targetScore, pinned } = req.body;
  if (!homeTeam || !awayTeam) {
    return res.status(400).json({ error: 'homeTeam and awayTeam required' });
  }

  const key = `${homeTeam.trim()}:${awayTeam.trim()}`;
  const existing = matchControls.get(key);
  const ctrl: MatchControl = {
    id: existing?.id || genId(),
    homeTeam: homeTeam.trim(),
    awayTeam: awayTeam.trim(),
    targetResult: targetResult || undefined,
    targetScore: targetScore || undefined,
    pinned: !!pinned,
    createdAt: existing?.createdAt || Date.now(),
  };
  matchControls.set(key, ctrl);
  return res.json({ ok: true, ctrl });
});

/* DELETE /admin/match-controls/:id — admin only */
router.delete('/admin/match-controls/:id', (req, res) => {
  const requesterId = req.headers['x-requester-id'] as string;
  if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { id } = req.params;
  let deleted = false;
  for (const [key, ctrl] of matchControls.entries()) {
    if (ctrl.id === id) {
      matchControls.delete(key);
      deleted = true;
      break;
    }
  }
  return res.json({ ok: deleted });
});

/* ══════════════════════════════════════════════════════════
   USER LEVEL
══════════════════════════════════════════════════════════ */
router.post('/admin/set-user-level', async (req, res) => {
  try {
    const requesterId = req.headers['x-requester-id'] as string;
    if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { userId, level } = req.body;
    if (!userId || level === undefined) {
      return res.status(400).json({ error: 'userId and level required' });
    }
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ user_level: Number(level) }),
      }
    );
    const data = await resp.json();
    return res.json({ ok: true, data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/admin/users', async (req, res) => {
  try {
    const requesterId = req.headers['x-requester-id'] as string;
    if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?select=id,email,full_name,is_admin,is_active,is_real_user,is_deleted,created_at,updated_at,verification_status,user_level&is_deleted=eq.false&is_real_user=eq.true&order=updated_at.desc.nullslast&limit=500`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(500).json({ error: err });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/* ══════════════════════════════════════════════════════════
   SPORT BETS — in-memory store (per server session)
   Cleared when server restarts (fine: matches are short-lived)
══════════════════════════════════════════════════════════ */
interface SportBet {
  id: string;
  userId: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  betType: string;
  odds: number;
  stake: number;
  potentialWin: number;
  ouLine?: number;
  status: 'open' | 'won' | 'lost';
  createdAt: number;
}

const sportBets = new Map<string, SportBet>();

/* POST /sport-bets — any authenticated user can record their bet */
router.post('/sport-bets', (req, res) => {
  const { id, userId, matchId, homeTeam, awayTeam, betType, odds, stake, potentialWin, ouLine } = req.body;
  if (!id || !userId || !matchId || !homeTeam || !awayTeam || !betType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const bet: SportBet = {
    id, userId, matchId, homeTeam, awayTeam, betType,
    odds: Number(odds), stake: Number(stake),
    potentialWin: Number(potentialWin),
    ouLine: ouLine ? Number(ouLine) : undefined,
    status: 'open', createdAt: Date.now(),
  };
  sportBets.set(id, bet);
  return res.json({ ok: true });
});

/* PATCH /sport-bets/:id — update bet status */
router.patch('/sport-bets/:id', (req, res) => {
  const { id } = req.params;
  const bet = sportBets.get(id);
  if (!bet) return res.status(404).json({ error: 'Not found' });
  const { status } = req.body;
  if (status === 'won' || status === 'lost') {
    bet.status = status;
    sportBets.set(id, bet);
  }
  return res.json({ ok: true });
});

/* GET /admin/bet-exposure — aggregate open bets per match */
router.get('/admin/bet-exposure', (req, res) => {
  const requesterId = req.headers['x-requester-id'] as string;
  if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const openBets = Array.from(sportBets.values()).filter(b => b.status === 'open');

  const map = new Map<string, {
    homeTeam: string; awayTeam: string;
    bets: Record<string, { count: number; totalStake: number }>;
    totalStake: number; totalBets: number; uniqueUsers: Set<string>;
  }>();

  for (const bet of openBets) {
    const key = `${bet.homeTeam}:${bet.awayTeam}`;
    if (!map.has(key)) {
      map.set(key, { homeTeam: bet.homeTeam, awayTeam: bet.awayTeam, bets: {}, totalStake: 0, totalBets: 0, uniqueUsers: new Set() });
    }
    const entry = map.get(key)!;
    if (!entry.bets[bet.betType]) entry.bets[bet.betType] = { count: 0, totalStake: 0 };
    entry.bets[bet.betType].count++;
    entry.bets[bet.betType].totalStake += bet.stake;
    entry.totalStake += bet.stake;
    entry.totalBets++;
    entry.uniqueUsers.add(bet.userId);
  }

  const result = Array.from(map.values())
    .sort((a, b) => b.totalStake - a.totalStake)
    .map(e => ({
      homeTeam: e.homeTeam,
      awayTeam: e.awayTeam,
      bets: e.bets,
      totalStake: +e.totalStake.toFixed(2),
      totalBets: e.totalBets,
      uniqueUsers: e.uniqueUsers.size,
    }));

  return res.json(result);
});

export default router;

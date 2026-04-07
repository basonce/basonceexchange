import { Router, type IRouter } from "express";
import { db, sportBetsTable } from "@workspace/db";
import { eq, gte } from "drizzle-orm";

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
   SPORT BETS — PostgreSQL (shared across all server instances)
══════════════════════════════════════════════════════════ */

/* POST /sport-bets — any user can record their bet */
router.post('/sport-bets', async (req, res) => {
  try {
    const { id, userId, matchId, homeTeam, awayTeam, betType, odds, stake, potentialWin, ouLine } = req.body;
    if (!id || !userId || !matchId || !homeTeam || !awayTeam || !betType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await db.insert(sportBetsTable).values({
      id,
      userId,
      matchId,
      homeTeam,
      awayTeam,
      betType,
      odds: String(odds),
      stake: String(stake),
      potentialWin: String(potentialWin),
      ouLine: ouLine != null ? String(ouLine) : null,
      status: 'open',
    }).onConflictDoNothing();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/* PATCH /sport-bets/:id — update bet status */
router.patch('/sport-bets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['won', 'lost', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'status must be won, lost, or refunded' });
    }
    await db.update(sportBetsTable)
      .set({ status, settledAt: new Date() })
      .where(eq(sportBetsTable.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/* GET /admin/bet-exposure — aggregate last-2h bets per match (all statuses) */
router.get('/admin/bet-exposure', async (req, res) => {
  try {
    const requesterId = req.headers['x-requester-id'] as string;
    if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Show ALL bets from the last 2 hours — regardless of status
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentBets = await db.select()
      .from(sportBetsTable)
      .where(gte(sportBetsTable.createdAt, twoHoursAgo));

    const map = new Map<string, {
      homeTeam: string; awayTeam: string;
      bets: Record<string, { count: number; totalStake: number }>;
      totalStake: number; totalBets: number; uniqueUsers: Set<string>;
      openCount: number; wonCount: number; lostCount: number; refundedCount: number;
    }>();

    for (const bet of recentBets) {
      const key = `${bet.homeTeam}:${bet.awayTeam}`;
      if (!map.has(key)) {
        map.set(key, {
          homeTeam: bet.homeTeam, awayTeam: bet.awayTeam,
          bets: {}, totalStake: 0, totalBets: 0, uniqueUsers: new Set(),
          openCount: 0, wonCount: 0, lostCount: 0, refundedCount: 0,
        });
      }
      const entry = map.get(key)!;

      // Only count stake distribution for OPEN bets (for admin decision purposes)
      if (bet.status === 'open') {
        if (!entry.bets[bet.betType]) entry.bets[bet.betType] = { count: 0, totalStake: 0 };
        entry.bets[bet.betType].count++;
        entry.bets[bet.betType].totalStake += Number(bet.stake);
        entry.totalStake += Number(bet.stake);
      }

      entry.totalBets++;
      entry.uniqueUsers.add(bet.userId);
      if (bet.status === 'open') entry.openCount++;
      else if (bet.status === 'won') entry.wonCount++;
      else if (bet.status === 'lost') entry.lostCount++;
      else entry.refundedCount++;
    }

    const result = Array.from(map.values())
      .sort((a, b) => b.totalBets - a.totalBets)
      .map(e => ({
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        bets: e.bets,
        totalStake: +e.totalStake.toFixed(2),
        totalBets: e.totalBets,
        uniqueUsers: e.uniqueUsers.size,
        openCount: e.openCount,
        wonCount: e.wonCount,
        lostCount: e.lostCount,
        refundedCount: e.refundedCount,
      }));

    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;

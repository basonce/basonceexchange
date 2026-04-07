import { Router, type IRouter } from "express";
import pg from "pg";

const router: IRouter = Router();

const SUPABASE_URL = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ADMIN_UUIDS = new Set([
  '88292f59-898a-4fef-a1c8-8813d7b60b61',
]);

/* ══════════════════════════════════════════════════════════
   DB pool — lazy init so server doesn't crash if DB unavailable
══════════════════════════════════════════════════════════ */
let _pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    _pool = new pg.Pool({ connectionString: url, max: 5 });
    _pool.on('error', (err) => console.error('[pool] idle error', err.message));
  }
  return _pool;
}

/* Ensure tables exist — run once on first use */
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sport_bets (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      match_id     TEXT NOT NULL,
      home_team    TEXT NOT NULL,
      away_team    TEXT NOT NULL,
      bet_type     TEXT NOT NULL,
      odds         NUMERIC NOT NULL,
      stake        NUMERIC NOT NULL,
      potential_win NUMERIC NOT NULL,
      ou_line      NUMERIC,
      status       TEXT NOT NULL DEFAULT 'open',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      settled_at   TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sport_match_controls (
      team_key     TEXT PRIMARY KEY,
      id           TEXT NOT NULL,
      home_team    TEXT NOT NULL,
      away_team    TEXT NOT NULL,
      target_result TEXT,
      target_score  JSONB,
      target_total  NUMERIC,
      started_at    BIGINT,
      pinned        BOOLEAN NOT NULL DEFAULT false,
      created_at    BIGINT NOT NULL
    )
  `);
  // Grant anon/authenticated access so Supabase REST API works from frontend
  await pool.query(`GRANT ALL ON TABLE sport_match_controls TO anon, authenticated`).catch(() => {});
  await pool.query(`ALTER TABLE sport_match_controls ENABLE ROW LEVEL SECURITY`).catch(() => {});
  await pool.query(`
    DO $$ BEGIN
      BEGIN
        CREATE POLICY "smc_select_all" ON sport_match_controls FOR SELECT USING (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        CREATE POLICY "smc_all_admin" ON sport_match_controls FOR ALL USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$
  `).catch(() => {});
  // Notify PostgREST to reload schema so Supabase REST API can see the table
  await pool.query(`NOTIFY pgrst, 'reload schema'`).catch(() => {});
  // Set up storage policies for sport-controls bucket (allow authenticated writes, public reads)
  await pool.query(`
    DO $$ BEGIN
      BEGIN
        CREATE POLICY "sport_controls_read" ON storage.objects
          FOR SELECT USING (bucket_id = 'sport-controls');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        CREATE POLICY "sport_controls_write" ON storage.objects
          FOR INSERT TO authenticated
          WITH CHECK (bucket_id = 'sport-controls');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        CREATE POLICY "sport_controls_update" ON storage.objects
          FOR UPDATE TO authenticated
          USING (bucket_id = 'sport-controls')
          WITH CHECK (bucket_id = 'sport-controls');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN
        CREATE POLICY "sport_controls_delete" ON storage.objects
          FOR DELETE TO authenticated
          USING (bucket_id = 'sport-controls');
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END $$
  `).catch(() => {});
  tableReady = true;
}

/* ══════════════════════════════════════════════════════════
   MATCH CONTROLS — DB-backed store
══════════════════════════════════════════════════════════ */
interface MatchControl {
  id: string;
  homeTeam: string;
  awayTeam: string;
  targetResult?: '1' | 'X' | '2';
  targetScore?: { h: number; a: number };
  targetTotal?: number;
  startedAt?: number;
  pinned: boolean;
  createdAt: number;
}

const matchControls = new Map<string, MatchControl>();
let controlsLoaded = false;

async function loadControlsFromDB() {
  if (controlsLoaded) return;
  try {
    await ensureTable();
    const { rows } = await getPool().query('SELECT * FROM sport_match_controls ORDER BY created_at ASC');
    matchControls.clear();
    for (const r of rows) {
      const ctrl: MatchControl = {
        id: r.id,
        homeTeam: r.home_team,
        awayTeam: r.away_team,
        targetResult: r.target_result || undefined,
        targetScore: r.target_score || undefined,
        targetTotal: r.target_total ? Number(r.target_total) : undefined,
        startedAt: r.started_at ? Number(r.started_at) : undefined,
        pinned: !!r.pinned,
        createdAt: Number(r.created_at),
      };
      matchControls.set(r.team_key, ctrl);
    }
    controlsLoaded = true;
  } catch (e) {
    console.error('[match-controls] loadFromDB error', e);
  }
}

async function saveControlToDB(key: string, ctrl: MatchControl) {
  try {
    await getPool().query(`
      INSERT INTO sport_match_controls
        (team_key, id, home_team, away_team, target_result, target_score, target_total, started_at, pinned, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (team_key) DO UPDATE SET
        id = EXCLUDED.id,
        target_result = EXCLUDED.target_result,
        target_score = EXCLUDED.target_score,
        target_total = EXCLUDED.target_total,
        started_at = EXCLUDED.started_at,
        pinned = EXCLUDED.pinned
    `, [
      key, ctrl.id, ctrl.homeTeam, ctrl.awayTeam,
      ctrl.targetResult ?? null,
      ctrl.targetScore ? JSON.stringify(ctrl.targetScore) : null,
      ctrl.targetTotal ?? null,
      ctrl.startedAt ?? null,
      ctrl.pinned,
      ctrl.createdAt,
    ]);
  } catch (e) {
    console.error('[match-controls] saveToDB error', e);
  }
}

async function deleteControlFromDB(key: string) {
  try {
    await getPool().query('DELETE FROM sport_match_controls WHERE team_key = $1', [key]);
  } catch (e) {
    console.error('[match-controls] deleteFromDB error', e);
  }
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

/* GET /admin/match-controls — public (kite-exchange reads this) */
router.get('/admin/match-controls', async (_req, res) => {
  await loadControlsFromDB();
  return res.json(Array.from(matchControls.values()));
});

/* POST /admin/match-controls — admin only */
router.post('/admin/match-controls', async (req, res) => {
  const requesterId = req.headers['x-requester-id'] as string;
  if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { homeTeam, awayTeam, targetResult, targetScore, targetTotal, pinned, resetMatch } = req.body;
  if (!homeTeam || !awayTeam) {
    return res.status(400).json({ error: 'homeTeam and awayTeam required' });
  }

  await loadControlsFromDB();
  const key = `${homeTeam.trim()}:${awayTeam.trim()}`;
  const existing = matchControls.get(key);

  // Compute targetScore from targetTotal + targetResult if targetTotal supplied
  let computedScore: { h: number; a: number } | undefined = targetScore || undefined;
  if (targetTotal && Number(targetTotal) > 0) {
    const tot = Number(targetTotal);
    const res2 = targetResult || 'X';
    if (res2 === 'X') {
      const half = Math.floor(tot / 2);
      computedScore = { h: half, a: half };
    } else if (res2 === '1') {
      const a = Math.max(0, Math.floor((tot - 1) / 2));
      computedScore = { h: tot - a, a };
    } else {
      const h = Math.max(0, Math.floor((tot - 1) / 2));
      computedScore = { h, a: tot - h };
    }
  }

  const ctrl: MatchControl = {
    id: existing?.id || genId(),
    homeTeam: homeTeam.trim(),
    awayTeam: awayTeam.trim(),
    targetResult: targetResult || undefined,
    targetScore: computedScore,
    targetTotal: targetTotal ? Number(targetTotal) : undefined,
    startedAt: resetMatch ? Date.now() : (existing?.startedAt),
    pinned: !!pinned,
    createdAt: existing?.createdAt || Date.now(),
  };
  matchControls.set(key, ctrl);
  await saveControlToDB(key, ctrl);
  return res.json({ ok: true, ctrl });
});

/* DELETE /admin/match-controls/:id — admin only */
router.delete('/admin/match-controls/:id', async (req, res) => {
  const requesterId = req.headers['x-requester-id'] as string;
  if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await loadControlsFromDB();
  const { id } = req.params;
  let deleted = false;
  for (const [key, ctrl] of matchControls.entries()) {
    if (ctrl.id === id) {
      matchControls.delete(key);
      await deleteControlFromDB(key);
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
   SPORT BETS — Raw SQL via pg (works on any instance)
══════════════════════════════════════════════════════════ */

/* POST /sport-bets — record a bet */
router.post('/sport-bets', async (req, res) => {
  try {
    await ensureTable();
    const { id, userId, matchId, homeTeam, awayTeam, betType, odds, stake, potentialWin, ouLine } = req.body;
    if (!id || !userId || !matchId || !homeTeam || !awayTeam || !betType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await getPool().query(
      `INSERT INTO sport_bets (id, user_id, match_id, home_team, away_team, bet_type, odds, stake, potential_win, ou_line, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open')
       ON CONFLICT (id) DO NOTHING`,
      [id, userId, matchId, homeTeam, awayTeam, betType,
       Number(odds), Number(stake), Number(potentialWin),
       ouLine != null ? Number(ouLine) : null]
    );
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[sport-bets POST]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

/* PATCH /sport-bets/:id — settle a bet */
router.patch('/sport-bets/:id', async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    const { status } = req.body;
    if (!['won', 'lost', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'status must be won, lost, or refunded' });
    }
    await getPool().query(
      `UPDATE sport_bets SET status=$1, settled_at=now() WHERE id=$2`,
      [status, id]
    );
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[sport-bets PATCH]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

/* GET /admin/bet-exposure — all bets from last 2 hours */
router.get('/admin/bet-exposure', async (req, res) => {
  try {
    const requesterId = req.headers['x-requester-id'] as string;
    if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await ensureTable();

    const { rows } = await getPool().query<{
      id: string; user_id: string; match_id: string;
      home_team: string; away_team: string;
      bet_type: string; odds: string; stake: string;
      potential_win: string; ou_line: string | null;
      status: string; created_at: Date;
    }>(
      `SELECT * FROM sport_bets WHERE created_at >= now() - INTERVAL '2 hours' ORDER BY created_at DESC`
    );

    const map = new Map<string, {
      homeTeam: string; awayTeam: string;
      bets: Record<string, { count: number; totalStake: number }>;
      totalStake: number; totalBets: number; uniqueUsers: Set<string>;
      openCount: number; wonCount: number; lostCount: number; refundedCount: number;
    }>();

    for (const row of rows) {
      const key = `${row.home_team}:${row.away_team}`;
      if (!map.has(key)) {
        map.set(key, {
          homeTeam: row.home_team, awayTeam: row.away_team,
          bets: {}, totalStake: 0, totalBets: 0, uniqueUsers: new Set(),
          openCount: 0, wonCount: 0, lostCount: 0, refundedCount: 0,
        });
      }
      const entry = map.get(key)!;

      if (row.status === 'open') {
        if (!entry.bets[row.bet_type]) entry.bets[row.bet_type] = { count: 0, totalStake: 0 };
        entry.bets[row.bet_type].count++;
        entry.bets[row.bet_type].totalStake += Number(row.stake);
        entry.totalStake += Number(row.stake);
      }

      entry.totalBets++;
      entry.uniqueUsers.add(row.user_id);
      if (row.status === 'open') entry.openCount++;
      else if (row.status === 'won') entry.wonCount++;
      else if (row.status === 'lost') entry.lostCount++;
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
    console.error('[bet-exposure GET]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

export default router;

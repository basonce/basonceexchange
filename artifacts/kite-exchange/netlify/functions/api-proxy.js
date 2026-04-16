'use strict';
const webpush = require('web-push');

/* ═══════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════ */
const SUPABASE_URL = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_UUIDS  = new Set(['88292f59-898a-4fef-a1c8-8813d7b60b61']);

const VAPID_PUB  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIV = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJ = process.env.VAPID_SUBJECT     || 'mailto:admin@basonce.com';

if (VAPID_PUB && VAPID_PRIV) {
  try { webpush.setVapidDetails(VAPID_SUBJ, VAPID_PUB, VAPID_PRIV); } catch {}
}

/* ═══════════════════════════════════════════════
   SUPABASE STORAGE HELPERS
═══════════════════════════════════════════════ */
const STO = `${SUPABASE_URL}/storage/v1`;
const stoHeaders = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };

async function stoDownload(bucket, path) {
  const r = await fetch(`${STO}/object/${bucket}/${path}`, { headers: stoHeaders });
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

async function stoUpload(bucket, path, data) {
  const body = JSON.stringify(data);
  const r = await fetch(`${STO}/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { ...stoHeaders, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body,
  });
  if (!r.ok) {
    await fetch(`${STO}/object/${bucket}/${path}`, {
      method: 'PUT',
      headers: { ...stoHeaders, 'Content-Type': 'application/json' },
      body,
    });
  }
}

async function stoDelete(bucket, path) {
  await fetch(`${STO}/object/${bucket}/${path}`, { method: 'DELETE', headers: stoHeaders });
}

async function stoList(bucket, prefix) {
  const r = await fetch(`${STO}/object/list/${bucket}`, {
    method: 'POST',
    headers: { ...stoHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000 }),
  });
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

/* Ensure bucket exists */
async function ensureBucket(name) {
  const r = await fetch(`${STO}/bucket/${name}`, {
    method: 'POST',
    headers: { ...stoHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: name, name, public: false }),
  });
  return r.status === 200 || r.status === 409;
}

/* ═══════════════════════════════════════════════
   SUPABASE REST HELPERS
═══════════════════════════════════════════════ */
const REST = `${SUPABASE_URL}/rest/v1`;
const restHeaders = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };

async function sbGet(table, query = '') {
  const r = await fetch(`${REST}/${table}${query}`, { headers: restHeaders });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbPatch(table, query, body) {
  const r = await fetch(`${REST}/${table}${query}`, {
    method: 'PATCH',
    headers: { ...restHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function sbRpc(fn, body) {
  const r = await fetch(`${REST}/rpc/${fn}`, {
    method: 'POST',
    headers: { ...restHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ═══════════════════════════════════════════════
   CRYPTO PRICES  (KuCoin)
═══════════════════════════════════════════════ */
let _cryptoCache = null;
let _cryptoCacheTs = 0;
const CRYPTO_TTL = 15000;

async function getAllKuCoinPrices() {
  const now = Date.now();
  if (_cryptoCache && now - _cryptoCacheTs < CRYPTO_TTL) return _cryptoCache;
  const r = await fetch('https://api.kucoin.com/api/v1/market/allTickers', { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`KuCoin ${r.status}`);
  const json = await r.json();
  const result = {};
  for (const t of (json?.data?.ticker || [])) {
    if (!t.symbol.endsWith('-USDT')) continue;
    const sym = t.symbol.replace('-USDT', '');
    const price = parseFloat(t.last);
    if (price > 0) result[sym] = { price, change: parseFloat(t.changeRate) * 100 };
  }
  _cryptoCache = result;
  _cryptoCacheTs = now;
  return result;
}

/* ═══════════════════════════════════════════════
   TRADFI PRICES  (Yahoo Finance direct API)
═══════════════════════════════════════════════ */
const YAHOO_MAP = {
  XAUUSDT:'GC=F', XAGUSDT:'SI=F', XPTUSDT:'PL=F', XPDUSDT:'PA=F', COPPERUSDT:'HG=F',
  TSLAUSDT:'TSLA', AAPLUSDT:'AAPL', AMZNUSDT:'AMZN', MSTRUSDT:'MSTR', HOODUSDT:'HOOD',
  INTCUSDT:'INTC', CRCLUSDT:'CRCL', COINUSDT:'COIN', PLTRUSDT:'PLTR', NVIDAUSDT:'NVDA',
  GOOGLUSDT:'GOOGL', METAUSDT:'META', MSFTUSDT:'MSFT', AMDUSDT:'AMD', NFLXUSDT:'NFLX',
  DISNUSDT:'DIS', JPMUSDT:'JPM', BACUSDT:'BAC', GSUSDT:'GS', BRKBUSDT:'BRK-B',
  VISAUSDT:'V', MAUSDT:'MA', UBERUSDT:'UBER', SPOTUSDT:'SPOT', SNAPUSDT:'SNAP',
  JNJUSDT:'JNJ', WMTUSDT:'WMT', XOMUSDT:'XOM', KOUSDT:'KO', PFEUSDT:'PFE',
  SAPUSDT:'SAP', ASMUSDT:'ASML', NESNUSDT:'NSRGY', LVMHUSDT:'LVMUY', SHUSDT:'SH',
  OILUSDT:'CL=F', NGASUSDT:'NG=F', WHEATUSDT:'ZW=F', CORNUSDT:'ZC=F', SOYUSDT:'ZS=F',
};

let _tradfiCache = null;
let _tradfiCacheTs = 0;
const TRADFI_TTL = 60000;

async function fetchYahooQuote(yahooSym) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=2d`,
      { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    const prev  = meta.chartPreviousClose || meta.previousClose;
    if (!price) return null;
    const change = prev ? ((price - prev) / prev) * 100 : 0;
    return { price, change };
  } catch { return null; }
}

async function getAllTradfiPrices(symbols) {
  const now = Date.now();
  if (_tradfiCache && now - _tradfiCacheTs < TRADFI_TTL) {
    if (!symbols) return _tradfiCache;
    const out = {};
    for (const s of symbols) if (_tradfiCache[s]) out[s] = _tradfiCache[s];
    return out;
  }
  const pairs = Object.entries(YAHOO_MAP);
  const results = await Promise.allSettled(pairs.map(([k, v]) => fetchYahooQuote(v).then(d => [k, d])));
  const out = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value[1]) out[r.value[0]] = r.value[1];
  }
  _tradfiCache = out;
  _tradfiCacheTs = now;
  if (!symbols) return out;
  const filtered = {};
  for (const s of symbols) if (out[s]) filtered[s] = out[s];
  return filtered;
}

/* ═══════════════════════════════════════════════
   MATCH CONTROLS  (Supabase Storage)
═══════════════════════════════════════════════ */
const CTRL_BUCKET = 'sport-controls';
const CTRL_FILE   = 'controls.json';

async function loadControls() {
  const data = await stoDownload(CTRL_BUCKET, CTRL_FILE);
  if (!Array.isArray(data)) return [];
  return data;
}

async function saveControls(controls) {
  await ensureBucket(CTRL_BUCKET);
  await stoUpload(CTRL_BUCKET, CTRL_FILE, controls);
}

function genId() { return Math.random().toString(36).slice(2, 10); }

/* ═══════════════════════════════════════════════
   SPORT BETS  (Supabase Storage — individual files)
═══════════════════════════════════════════════ */
const BETS_BUCKET = 'sport-bets-data';

async function loadBet(id) {
  return stoDownload(BETS_BUCKET, `${id}.json`);
}

async function saveBet(bet) {
  await ensureBucket(BETS_BUCKET);
  await stoUpload(BETS_BUCKET, `${bet.id}.json`, bet);
}

async function loadAllBets() {
  await ensureBucket(BETS_BUCKET);
  const files = await stoList(BETS_BUCKET, '');
  if (!files.length) return [];
  const results = await Promise.allSettled(files.map(f => stoDownload(BETS_BUCKET, f.name)));
  return results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
}

/* ═══════════════════════════════════════════════
   ANON SESSIONS  (Supabase Storage — single JSON)
═══════════════════════════════════════════════ */
const SESS_BUCKET = 'visitor-sessions';
const SESS_FILE   = 'sessions.json';

async function loadSessions() {
  const data = await stoDownload(SESS_BUCKET, SESS_FILE);
  if (!data || typeof data !== 'object') return {};
  return data;
}

async function saveSessions(map) {
  await ensureBucket(SESS_BUCKET);
  await stoUpload(SESS_BUCKET, SESS_FILE, map);
}

/* ═══════════════════════════════════════════════
   PUSH SUBSCRIPTIONS  (Supabase Storage)
═══════════════════════════════════════════════ */
const PUSH_BUCKET = 'push-data';
const PUSH_FILE   = 'subscriptions.json';

async function loadSubs() {
  const data = await stoDownload(PUSH_BUCKET, PUSH_FILE);
  return Array.isArray(data) ? data : [];
}

async function saveSubs(subs) {
  await ensureBucket(PUSH_BUCKET);
  await stoUpload(PUSH_BUCKET, PUSH_FILE, subs);
}

/* ═══════════════════════════════════════════════
   TEAM LOGO  (TheSportsDB)
═══════════════════════════════════════════════ */
async function resolveBadge(name) {
  const variants = [name];
  const s = name.replace(/\s+(FC|SC|AC|CF|United|City|Club|Rovers|Athletic|Sporting|Racing)$/i, '').trim();
  if (s && s !== name) variants.push(s);
  for (const v of variants) {
    try {
      const r = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(v)}`, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const data = await r.json();
      const url = data?.teams?.[0]?.strBadge;
      if (url) return url;
    } catch {}
  }
  return null;
}

/* ═══════════════════════════════════════════════
   WALLET GENERATION
═══════════════════════════════════════════════ */
function genBep20(userId) {
  const hex = '0123456789abcdef';
  let h = 5381;
  for (let i = 0; i < `bep20__${userId}`.length; i++) h = (((h << 5) + h) ^ `bep20__${userId}`.charCodeAt(i)) >>> 0;
  let addr = '0x';
  for (let i = 0; i < 40; i++) { h = ((h * 1664525 + 1013904223) >>> 0); addr += hex[h % 16]; }
  return addr;
}
function genTrc20(userId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let h = 5381;
  for (let i = 0; i < `trc20__${userId}`.length; i++) h = (((h << 5) + h) ^ `trc20__${userId}`.charCodeAt(i)) >>> 0;
  let addr = 'T';
  for (let i = 0; i < 33; i++) { h = ((h * 1664525 + 1013904223) >>> 0); addr += chars[h % chars.length]; }
  return addr;
}

/* ═══════════════════════════════════════════════
   GEO LOOKUP
═══════════════════════════════════════════════ */
async function lookupGeo(ip) {
  if (!ip || ['127.0.0.1', '::1'].includes(ip) || ip.startsWith('172.') || ip.startsWith('10.') || ip.startsWith('192.168.')) return { country: null, city: null };
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return { country: null, city: null };
    const d = await r.json();
    return d.status === 'success' ? { country: d.country || null, city: d.city || null } : { country: null, city: null };
  } catch { return { country: null, city: null }; }
}

/* ═══════════════════════════════════════════════
   RESPONSE HELPERS
═══════════════════════════════════════════════ */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

function json(statusCode, body) {
  return { statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function ok(data) { return json(200, data); }
function err(code, msg) { return json(code, { error: msg }); }
function isAdmin(headers) {
  const id = headers['x-requester-id'];
  return id && ADMIN_UUIDS.has(id);
}

/* ═══════════════════════════════════════════════
   MAIN HANDLER
═══════════════════════════════════════════════ */
exports.handler = async (event) => {
  const method = event.httpMethod;

  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  // Strip /api/ prefix
  let path = event.path.replace(/^\/api-server\/api\//, '/').replace(/^\/api\//, '/');

  let body = {};
  if (event.body) {
    try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body); } catch {}
  }
  const q = event.queryStringParameters || {};
  const headers = event.headers || {};

  try {
    /* ── HEALTH ── */
    if (method === 'GET' && path === '/healthz') return ok({ status: 'ok' });

    /* ── CRYPTO PRICES ── */
    if (method === 'GET' && path === '/crypto-prices') {
      const all = await getAllKuCoinPrices();
      const syms = q.symbols ? q.symbols.split(',').map(s => s.trim().toUpperCase()) : null;
      if (!syms) return ok(all);
      const out = {};
      for (const s of syms) if (all[s]) out[s] = all[s];
      return ok(out);
    }

    /* ── TRADFI PRICES ── */
    if (method === 'GET' && path === '/tradfi-prices') {
      const syms = q.symbols ? q.symbols.split(',').map(s => s.trim().toUpperCase()) : null;
      const data = await getAllTradfiPrices(syms);
      return ok(data);
    }

    /* ── TEAM LOGO (JSON) ── */
    if (method === 'GET' && path === '/team-logo') {
      const name = (q.name || '').trim();
      if (!name) return ok({ badgeUrl: null });
      const badgeUrl = await resolveBadge(name);
      return ok({ badgeUrl });
    }

    /* ── TEAM LOGO (image proxy) ── */
    if (method === 'GET' && path === '/team-logo-img') {
      const name = (q.name || '').trim();
      if (!name) return err(400, 'name required');
      const badgeUrl = await resolveBadge(name);
      if (!badgeUrl) return { statusCode: 404, headers: CORS, body: '' };
      const r = await fetch(badgeUrl, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return { statusCode: 404, headers: CORS, body: '' };
      const ct = r.headers.get('content-type') || 'image/png';
      const buf = Buffer.from(await r.arrayBuffer());
      return { statusCode: 200, headers: { ...CORS, 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' }, body: buf.toString('base64'), isBase64Encoded: true };
    }

    /* ── MATCH CONTROLS ── */
    if (method === 'GET' && path === '/admin/match-controls') {
      const controls = await loadControls();
      return ok(controls);
    }
    if (method === 'POST' && path === '/admin/match-controls') {
      if (!isAdmin(headers)) return err(403, 'Forbidden');
      const { homeTeam, awayTeam, targetResult, targetScore, targetTotal, pinned, resetMatch } = body;
      if (!homeTeam || !awayTeam) return err(400, 'homeTeam and awayTeam required');
      const controls = await loadControls();
      const key = `${homeTeam.trim()}:${awayTeam.trim()}`;
      const existing = controls.find(c => `${c.homeTeam.trim()}:${c.awayTeam.trim()}` === key);
      let computedScore = targetScore || undefined;
      if (targetTotal && Number(targetTotal) > 0) {
        const tot = Number(targetTotal), res2 = targetResult || 'X';
        if (res2 === 'X') { const h2 = Math.floor(tot / 2); computedScore = { h: h2, a: h2 }; }
        else if (res2 === '1') { const a = Math.max(0, Math.floor((tot - 1) / 2)); computedScore = { h: tot - a, a }; }
        else { const h = Math.max(0, Math.floor((tot - 1) / 2)); computedScore = { h, a: tot - h }; }
      }
      const ctrl = { id: existing?.id || genId(), homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), targetResult: targetResult || undefined, targetScore: computedScore, targetTotal: targetTotal ? Number(targetTotal) : undefined, startedAt: resetMatch ? Date.now() : existing?.startedAt, pinned: !!pinned, createdAt: existing?.createdAt || Date.now() };
      const newControls = existing ? controls.map(c => `${c.homeTeam}:${c.awayTeam}` === key ? ctrl : c) : [...controls, ctrl];
      await saveControls(newControls);
      return ok({ ok: true, ctrl });
    }
    if (method === 'DELETE' && /^\/admin\/match-controls\//.test(path)) {
      if (!isAdmin(headers)) return err(403, 'Forbidden');
      const id = path.split('/').pop();
      const controls = await loadControls();
      const newControls = controls.filter(c => c.id !== id);
      await saveControls(newControls);
      return ok({ ok: true });
    }
    if (method === 'PUT' && path === '/sport/controls') {
      if (!isAdmin(headers)) return err(403, 'Forbidden');
      if (!Array.isArray(body)) return err(400, 'body must be array');
      await saveControls(body);
      return ok({ ok: true });
    }

    /* ── SPORT BETS ── */
    if (method === 'POST' && path === '/sport-bets') {
      const { id, userId, matchId, homeTeam, awayTeam, betType, odds, stake, potentialWin, ouLine } = body;
      if (!id || !userId || !matchId || !homeTeam || !awayTeam || !betType) return err(400, 'Missing required fields');
      const existing = await loadBet(id);
      if (!existing) {
        await saveBet({ id, userId, matchId, homeTeam, awayTeam, betType, odds: Number(odds), stake: Number(stake), potentialWin: Number(potentialWin), ouLine: ouLine != null ? Number(ouLine) : null, status: 'open', createdAt: Date.now() });
      }
      return ok({ ok: true });
    }
    if (method === 'PATCH' && /^\/sport-bets\//.test(path)) {
      const id = path.split('/').pop();
      const { status } = body;
      if (!['won', 'lost', 'refunded'].includes(status)) return err(400, 'status must be won, lost, or refunded');
      const bet = await loadBet(id);
      if (bet) { bet.status = status; bet.settledAt = Date.now(); await saveBet(bet); }
      return ok({ ok: true });
    }
    if (method === 'GET' && path === '/admin/bet-exposure') {
      if (!isAdmin(headers)) return err(403, 'Forbidden');
      const allBets = await loadAllBets();
      const cutoff = Date.now() - 2 * 60 * 60 * 1000;
      const rows = allBets.filter(b => b.createdAt >= cutoff);
      const map = new Map();
      for (const row of rows) {
        const key = `${row.homeTeam}:${row.awayTeam}`;
        if (!map.has(key)) map.set(key, { homeTeam: row.homeTeam, awayTeam: row.awayTeam, bets: {}, totalStake: 0, totalBets: 0, uniqueUsers: new Set(), openCount: 0, wonCount: 0, lostCount: 0, refundedCount: 0 });
        const e = map.get(key);
        if (row.status === 'open') { if (!e.bets[row.betType]) e.bets[row.betType] = { count: 0, totalStake: 0 }; e.bets[row.betType].count++; e.bets[row.betType].totalStake += row.stake; e.totalStake += row.stake; }
        e.totalBets++; e.uniqueUsers.add(row.userId);
        if (row.status === 'open') e.openCount++; else if (row.status === 'won') e.wonCount++; else if (row.status === 'lost') e.lostCount++; else e.refundedCount++;
      }
      const result = Array.from(map.values()).sort((a, b) => b.totalBets - a.totalBets).map(e => ({ homeTeam: e.homeTeam, awayTeam: e.awayTeam, bets: e.bets, totalStake: +e.totalStake.toFixed(2), totalBets: e.totalBets, uniqueUsers: e.uniqueUsers.size, openCount: e.openCount, wonCount: e.wonCount, lostCount: e.lostCount, refundedCount: e.refundedCount }));
      return ok(result);
    }

    /* ── ADMIN: USERS ── */
    if (method === 'GET' && path === '/admin/users') {
      if (!isAdmin(headers)) return err(403, 'Forbidden');
      const data = await sbGet('user_profiles', '?select=id,email,full_name,is_admin,is_active,is_real_user,is_deleted,created_at,updated_at,verification_status,user_level&is_deleted=eq.false&is_real_user=eq.true&order=updated_at.desc.nullslast&limit=500');
      return ok(data);
    }
    if (method === 'POST' && path === '/admin/set-user-level') {
      if (!isAdmin(headers)) return err(403, 'Forbidden');
      const { userId, level } = body;
      if (!userId || level === undefined) return err(400, 'userId and level required');
      const data = await sbPatch('user_profiles', `?id=eq.${userId}`, { user_level: Number(level) });
      return ok({ ok: true, data });
    }

    /* ── ADMIN: WALLETS ── */
    if (method === 'POST' && path === '/admin/auto-assign-wallets') {
      if (!isAdmin(headers)) return err(403, 'Forbidden');
      const walletData = await sbRpc('admin_get_real_users_with_wallets', {});
      const walletless = (walletData || []).filter(u => !u.bep20_address && !u.trc20_address);
      let assigned = 0, failed = 0;
      const now = new Date().toISOString();
      for (const user of walletless) {
        const uid = user.user_id;
        try {
          const r1 = await fetch(`${REST}/wallet_pool`, { method: 'POST', headers: { ...restHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ network: 'BEP20', address: genBep20(uid), is_assigned: true, assigned_at: now, assigned_to_user_id: uid }) });
          const r2 = await fetch(`${REST}/wallet_pool`, { method: 'POST', headers: { ...restHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ network: 'TRC20', address: genTrc20(uid), is_assigned: true, assigned_at: now, assigned_to_user_id: uid }) });
          if (r1.ok && r2.ok) assigned++; else failed++;
        } catch { failed++; }
      }
      return ok({ ok: true, assigned, failed, total: walletless.length });
    }
    if (method === 'POST' && path === '/admin/assign-wallet-single') {
      if (!isAdmin(headers)) return err(403, 'Forbidden');
      const { userId } = body;
      if (!userId) return err(400, 'userId required');
      const now = new Date().toISOString();
      const r1 = await fetch(`${REST}/wallet_pool`, { method: 'POST', headers: { ...restHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ network: 'BEP20', address: genBep20(userId), is_assigned: true, assigned_at: now, assigned_to_user_id: userId }) });
      const r2 = await fetch(`${REST}/wallet_pool`, { method: 'POST', headers: { ...restHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ network: 'TRC20', address: genTrc20(userId), is_assigned: true, assigned_at: now, assigned_to_user_id: userId }) });
      if (!r1.ok || !r2.ok) return err(500, 'Wallet assignment failed');
      return ok({ ok: true, bep20: genBep20(userId), trc20: genTrc20(userId) });
    }

    /* ── ANON SESSIONS ── */
    if (method === 'GET' && (path === '/anon-sessions' || path === '/anon-sessions/stream')) {
      const sessMap = await loadSessions();
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const active = Object.values(sessMap).filter(s => s.last_active >= cutoff).sort((a, b) => b.last_active.localeCompare(a.last_active)).slice(0, 100);
      if (path === '/anon-sessions/stream') {
        return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }, body: `data: ${JSON.stringify(active)}\n\n` };
      }
      return ok(active);
    }
    if (method === 'POST' && path === '/anon-sessions') {
      const { visitor_id, session_id, current_page, device_type, browser, os } = body;
      if (!visitor_id || !session_id) return err(400, 'visitor_id and session_id required');
      const ip = (headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
      const sessMap = await loadSessions();
      const existing = sessMap[visitor_id];
      let country = existing?.country || null, city = existing?.city || null;
      if (!country && ip) { const geo = await lookupGeo(ip); country = geo.country; city = geo.city; }
      const now = new Date().toISOString();
      sessMap[visitor_id] = { id: existing?.id || crypto.randomUUID(), visitor_id, session_id, current_page: current_page || 'Exchange', ip_address: ip, country, city, device_type: device_type || 'desktop', browser: browser || 'Unknown', os: os || 'Unknown', last_active: now, created_at: existing?.created_at || now };
      await saveSessions(sessMap);
      return ok({ ok: true });
    }
    if (method === 'DELETE' && /^\/anon-sessions\//.test(path)) {
      const visitor_id = path.split('/').pop();
      if (!visitor_id) return err(400, 'visitor_id required');
      const sessMap = await loadSessions();
      delete sessMap[visitor_id];
      await saveSessions(sessMap);
      return ok({ ok: true });
    }

    /* ── PUSH NOTIFICATIONS ── */
    if (method === 'GET' && path === '/push/vapid-key') {
      if (!VAPID_PUB) return err(503, 'Push devre dışı');
      return ok({ publicKey: VAPID_PUB });
    }
    if (method === 'POST' && path === '/push/subscribe') {
      const { endpoint, keys } = body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) return err(400, 'Geçersiz abonelik');
      const subs = await loadSubs();
      const exists = subs.some(s => s.endpoint === endpoint);
      if (!exists) { subs.push({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }); await saveSubs(subs); }
      return ok({ ok: true, total: subs.length + (exists ? 0 : 1) });
    }
    if (method === 'DELETE' && path === '/push/subscribe') {
      const { endpoint } = body;
      if (!endpoint) return err(400, 'endpoint required');
      const subs = (await loadSubs()).filter(s => s.endpoint !== endpoint);
      await saveSubs(subs);
      return ok({ ok: true });
    }
    if (method === 'POST' && path === '/push/send') {
      const { title, body: msgBody, severity, tag } = body;
      if (!title || !msgBody) return err(400, 'title ve body gerekli');
      if (!VAPID_PUB || !VAPID_PRIV) return err(503, 'VAPID not configured');
      const subs = await loadSubs();
      let sent = 0;
      await Promise.allSettled(subs.map(async sub => {
        try { await webpush.sendNotification(sub, JSON.stringify({ title, body: msgBody, severity: severity || 'high', tag })); sent++; } catch {}
      }));
      return ok({ ok: true, sent });
    }
    if (method === 'GET' && path === '/push/status') {
      const subs = await loadSubs();
      return ok({ subscriptions: subs.length, vapid: !!VAPID_PUB });
    }
    if (method === 'POST' && path === '/push/clear') {
      await saveSubs([]);
      return ok({ ok: true });
    }

    return err(404, `Not found: ${method} ${path}`);
  } catch (e) {
    console.error('[api-proxy]', e.message);
    return err(500, e.message || 'Internal server error');
  }
};

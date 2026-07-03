'use strict';

/* ═══════════════════════════════════════════════
   CONFIG  (env vars come from Cloudflare Pages settings)
═══════════════════════════════════════════════ */
const SUPABASE_URL  = 'https://jfjjymprvjfltpvmfptj.supabase.co';
const ADMIN_UUIDS   = new Set(['88292f59-898a-4fef-a1c8-8813d7b60b61']);

/* ═══════════════════════════════════════════════
   BASE64 URL HELPERS  (no Buffer needed)
═══════════════════════════════════════════════ */
function b64urlToBytes(b64) {
  const b = b64.replace(/-/g,'+').replace(/_/g,'/');
  const p = b.padEnd(Math.ceil(b.length/4)*4,'=');
  return Uint8Array.from(atob(p), c => c.charCodeAt(0));
}
function bytesToB64url(bytes) {
  let s='';
  for (let i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function concatBytes(...arrs) {
  const total = arrs.reduce((n,a)=>n+a.length,0);
  const out = new Uint8Array(total);
  let off=0;
  for (const a of arrs){out.set(a,off);off+=a.length;}
  return out;
}

/* ═══════════════════════════════════════════════
   WEB PUSH — implemented with Web Crypto API (RFC 8291 + RFC 8292)
═══════════════════════════════════════════════ */
async function hmac256(key, data) {
  const k = await crypto.subtle.importKey('raw', key, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
// HMAC-SHA512 hex (used by NOWPayments IPN signature verification)
async function hmacSha512Hex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC',hash:'SHA-512'}, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
  let hex = '';
  for (const b of sig) hex += b.toString(16).padStart(2, '0');
  return hex;
}
// Recursively sort object keys (NOWPayments IPN canonical JSON)
function sortObjDeep(o) {
  if (Array.isArray(o)) return o.map(sortObjDeep);
  if (o && typeof o === 'object') {
    const out = {};
    for (const k of Object.keys(o).sort()) out[k] = sortObjDeep(o[k]);
    return out;
  }
  return o;
}
async function hkdf(salt, ikm, info, len) {
  const prk = await hmac256(salt, ikm);
  const out  = []; let prev = new Uint8Array(0);
  for (let i=1; out.reduce((s,a)=>s+a.length,0)<len; i++) {
    prev = await hmac256(prk, concatBytes(prev, info, new Uint8Array([i])));
    out.push(prev);
  }
  return concatBytes(...out).slice(0, len);
}
const enc = new TextEncoder();
function lenPrefix(bytes) {
  const b = new Uint8Array(2+bytes.length);
  b[0]=bytes.length>>8; b[1]=bytes.length&0xff;
  b.set(bytes,2); return b;
}

async function encryptPush(payloadStr, p256dhB64, authB64) {
  const payload   = enc.encode(payloadStr);
  const authSecret = b64urlToBytes(authB64);
  const subPubRaw  = b64urlToBytes(p256dhB64);

  const subPubKey = await crypto.subtle.importKey('raw', subPubRaw,{name:'ECDH',namedCurve:'P-256'},true,[]);
  const ephKey    = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const ephPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ephKey.publicKey));

  const sharedBits = await crypto.subtle.deriveBits({name:'ECDH',public:subPubKey}, ephKey.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedBits);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // RFC 8291 key info
  const keyInfo  = concatBytes(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([0]),
    enc.encode('P-256\0'), lenPrefix(subPubRaw), lenPrefix(ephPubRaw));
  const nonceInfo= concatBytes(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([0]),
    enc.encode('P-256\0'), lenPrefix(subPubRaw), lenPrefix(ephPubRaw));

  const prk = await hkdf(authSecret, sharedSecret,
    concatBytes(enc.encode('WebPush: info\0'), subPubRaw, ephPubRaw), 32);

  const cek   = await hkdf(salt, prk, keyInfo,  16);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // pad to 3993 bytes (recommended record size=4096)
  const padLen = Math.max(0, 3993-payload.length);
  const padded = concatBytes(payload, new Uint8Array([2]), new Uint8Array(padLen));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce}, aesKey, padded));

  // aes128gcm header: 16-byte salt, 4-byte record size, 1-byte key-id length, key-id
  const header = new Uint8Array(21+ephPubRaw.length);
  header.set(salt, 0);
  const rs = 4096;
  header[16]=rs>>24; header[17]=(rs>>16)&0xff; header[18]=(rs>>8)&0xff; header[19]=rs&0xff;
  header[20]=ephPubRaw.length;
  header.set(ephPubRaw, 21);

  return { body: concatBytes(header, ciphertext), ephPubB64: bytesToB64url(ephPubRaw) };
}

async function vapidJwt(endpoint, vapidPubB64, vapidPrivB64, subject) {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now()/1000);
  const jwtHeader  = bytesToB64url(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const jwtPayload = bytesToB64url(enc.encode(JSON.stringify({aud,exp:now+43200,sub:subject})));
  const msg        = `${jwtHeader}.${jwtPayload}`;

  const pubBytes = b64urlToBytes(vapidPubB64);
  const x = bytesToB64url(pubBytes.slice(1,33));
  const y = bytesToB64url(pubBytes.slice(33,65));
  const privKey = await crypto.subtle.importKey('jwk',
    {kty:'EC',crv:'P-256',d:vapidPrivB64,x,y,key_ops:['sign']},
    {name:'ECDSA',namedCurve:'P-256'}, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'}, privKey, enc.encode(msg)));
  return `vapid t=${msg}.${bytesToB64url(sig)},k=${vapidPubB64}`;
}

async function sendPushNotification(sub, payloadStr, env) {
  const vapidPub  = env.VAPID_PUBLIC_KEY;
  const vapidPriv = env.VAPID_PRIVATE_KEY;
  const vapidSubj = env.VAPID_SUBJECT || 'mailto:admin@basonce.com';
  if (!vapidPub || !vapidPriv) throw new Error('VAPID not configured');

  const auth    = await vapidJwt(sub.endpoint, vapidPub, vapidPriv, vapidSubj);
  const { body } = await encryptPush(payloadStr, sub.keys.p256dh, sub.keys.auth);

  const r = await fetch(sub.endpoint, {
    method:'POST',
    headers:{
      'Authorization': auth,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body,
  });
  if (!r.ok && r.status !== 201) throw new Error(`Push failed: ${r.status}`);
}

/* ═══════════════════════════════════════════════
   SUPABASE STORAGE HELPERS
═══════════════════════════════════════════════ */
function stoHeaders(env) {
  return { Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey:env.SUPABASE_SERVICE_ROLE_KEY };
}
const STO = `${SUPABASE_URL}/storage/v1`;

async function stoDownload(bucket, path, env) {
  const r = await fetch(`${STO}/object/${bucket}/${path}`, { headers:stoHeaders(env) });
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}
async function stoUpload(bucket, path, data, env) {
  const body = JSON.stringify(data);
  const h = { ...stoHeaders(env), 'Content-Type':'application/json', 'x-upsert':'true' };
  const r = await fetch(`${STO}/object/${bucket}/${path}`, { method:'POST', headers:h, body });
  if (!r.ok) await fetch(`${STO}/object/${bucket}/${path}`, { method:'PUT', headers:h, body });
}
async function stoList(bucket, prefix, env) {
  const r = await fetch(`${STO}/object/list/${bucket}`, {
    method:'POST',
    headers:{ ...stoHeaders(env), 'Content-Type':'application/json' },
    body: JSON.stringify({ prefix, limit:1000 }),
  });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}
async function ensureBucket(name, env) {
  await fetch(`${STO}/bucket/${name}`, {
    method:'POST',
    headers:{ ...stoHeaders(env), 'Content-Type':'application/json' },
    body: JSON.stringify({ id:name, name, public:false }),
  });
}

/* ═══════════════════════════════════════════════
   SUPABASE REST HELPERS
═══════════════════════════════════════════════ */
const REST = `${SUPABASE_URL}/rest/v1`;
function restHeaders(env) {
  return { Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey:env.SUPABASE_SERVICE_ROLE_KEY };
}
async function sbGet(table, query, env) {
  const r = await fetch(`${REST}/${table}${query||''}`, { headers:restHeaders(env) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbPatch(table, query, body, env) {
  const r = await fetch(`${REST}/${table}${query}`, {
    method:'PATCH',
    headers:{ ...restHeaders(env), 'Content-Type':'application/json', Prefer:'return=representation' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbRpc(fn, body, env) {
  const r = await fetch(`${REST}/rpc/${fn}`, {
    method:'POST',
    headers:{ ...restHeaders(env), 'Content-Type':'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Verify a Supabase user JWT by asking the auth server who it belongs to.
// Returns the user UUID on success, null otherwise. No JWT secret needed.
async function getAuthedUserId(request, env) {
  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u.id : null;
  } catch { return null; }
}

/* ═══════════════════════════════════════════════
   3D CASINO GAMES — server-authoritative betting
   Outcomes are computed HERE (never trust client).
   casino_play RPC applies the result atomically.
═══════════════════════════════════════════════ */
const CASINO_GAMES   = new Set(['dice', 'coinflip', 'crash', 'plinko', 'lootbox', 'bonanza']);
const CASINO_RTP     = 0.97;    // return-to-player → 3% house edge
const CASINO_MIN_BET = 0.1;     // USDT
const CASINO_MAX_BET = 1000;    // USDT
const CASINO_MAX_MULT = 1000;   // hard cap on payout multiplier

// Plinko payout tables — 16 rows → 17 buckets (Stake-style). Designed so the
// binomial(16, 0.5) landing distribution yields ~3% house edge.
const PLINKO_TABLES = {
  low:  [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  med:  [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
};
// Loot box rewards (payout multiplier + probability weight). Expected value
// ≈ 0.97 → 3% house edge. Weights sum to 1.
const LOOTBOX_REWARDS = [
  { m: 0,   w: 0.2052 },
  { m: 0.4, w: 0.40 },
  { m: 1,   w: 0.28 },
  { m: 2,   w: 0.08 },
  { m: 5,   w: 0.03 },
  { m: 25,  w: 0.004 },
  { m: 150, w: 0.0008 },
];
// Plinko bucket (0..16) = popcount of 16 random bits from the seed → binomial.
function casinoPlinkoBucket(seedHex) {
  const n = parseInt(seedHex.slice(0, 4), 16) & 0xffff;
  let c = 0;
  for (let i = 0; i < 16; i++) if (n & (1 << i)) c++;
  return c;
}

// 16 random bytes → 32-char hex seed. The outcome float is derived from it,
// so the round is reproducible/auditable from the stored server_seed.
function casinoSeed() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
// Deterministic float in [0,1) from the seed (first 52 bits).
function casinoRandFloat(seedHex) {
  const n = parseInt(seedHex.slice(0, 13), 16);
  return n / 0x10000000000000; // 2^52
}

/* ── SWEET CANDY (Sweet Bonanza-style) — 6x5 pay-anywhere tumble slot ──
   Mechanics: 8+ of a symbol anywhere pays; winning symbols tumble away and
   refill; 4+ scatters trigger 10 free spins; in free spins, multiplier bombs
   on a winning sequence sum up and multiply that spin's win.
   See HIGH-WIN-FREQUENCY PROFILE below; hard-capped at CASINO_MAX_MULT (1000x). */
// HIGH-WIN-FREQUENCY PROFILE (promotional): ~73-75% of spins return a payout,
// RTP ~0.94 (Monte-Carlo tuned over 600k rounds). Weights concentrate on the
// low-pay candies so wins are frequent but mostly small; cascade + free-spin
// amplification kept in check (max ~16 tumbles, no 1000x caps in sim).
const BONANZA_PAY = {            // [8-9, 10-11, 12+] as multiple of total bet
  0: [3, 7.2, 15], 1: [0.9, 2.4, 7.2], 2: [0.48, 1.2, 4.2], 3: [0.24, 0.48, 1.8],
  4: [0.12, 0.24, 0.9], 5: [0.09, 0.18, 0.6], 6: [0.06, 0.12, 0.3], 7: [0.05, 0.09, 0.24], 8: [0.03, 0.06, 0.15],
};
const BONANZA_W      = { 0: 1.8, 1: 2.6, 2: 3.6, 3: 5.5, 4: 8.5, 5: 12, 6: 16.5, 7: 20, 8: 23.5 };
const BONANZA_WSCAT  = 3.0;      // scatter reel weight (controls free-spin frequency)
const BONANZA_WMULT  = 18;       // multiplier-bomb weight (free spins only)
const BONANZA_SCAT_PAY = { 4: 1, 5: 2, 6: 10 };  // x total bet
const BONANZA_MV = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100];
const BONANZA_MW = [40, 28, 16, 8, 4, 2, 1, 0.6, 0.3, 0.15, 0.05, 0.02, 0.005];
const BONANZA_FS_START = 10;
const BONANZA_FS_RETRIGGER = 5;
const BONANZA_MAX_FS = 60;       // safety cap on total free spins per round

// Deterministic PRNG (mulberry32) seeded from the audited server seed.
function casinoPRNG(seedHex) {
  let a = (parseInt(seedHex.slice(0, 8), 16) >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function bonanzaTier(c) { return c >= 12 ? 2 : (c >= 10 ? 1 : 0); }
function bonanzaPicker(scat, mult) {
  const it = []; let t = 0;
  for (const s in BONANZA_W) { it.push([+s, BONANZA_W[s]]); t += BONANZA_W[s]; }
  if (scat) { it.push([9, BONANZA_WSCAT]); t += BONANZA_WSCAT; }
  if (mult) { it.push([10, BONANZA_WMULT]); t += BONANZA_WMULT; }
  return { it, t };
}
function bonanzaPick(p, r) { let x = r * p.t; for (const [s, w] of p.it) { if (x < w) return s; x -= w; } return p.it[p.it.length - 1][0]; }
function bonanzaMultValue(rng) {
  let tw = 0; for (const w of BONANZA_MW) tw += w;
  let x = rng() * tw;
  for (let j = 0; j < BONANZA_MV.length; j++) { if (x < BONANZA_MW[j]) return BONANZA_MV[j]; x -= BONANZA_MW[j]; }
  return BONANZA_MV[0];
}
// One spin: initial 6x5 fill, then resolve tumbles until no win.
function bonanzaSpin(rng, freeMode) {
  const p = bonanzaPicker(true, freeMode);
  const g = new Array(30);
  for (let i = 0; i < 30; i++) g[i] = bonanzaPick(p, rng());
  let win = 0; const tumbles = [];
  while (true) {
    const cnt = {};
    for (let i = 0; i < 30; i++) cnt[g[i]] = (cnt[g[i]] || 0) + 1;
    let w = 0; const removeSym = new Set(); const wins = [];
    for (let s = 0; s <= 8; s++) {
      const c = cnt[s] || 0;
      if (c >= 8) { const pay = BONANZA_PAY[s][bonanzaTier(c)]; w += pay; removeSym.add(s); const pos = []; for (let i = 0; i < 30; i++) if (g[i] === s) pos.push(i); wins.push({ sym: s, count: c, pay, pos }); }
    }
    const removed = []; if (w > 0) for (let i = 0; i < 30; i++) if (removeSym.has(g[i])) removed.push(i);
    tumbles.push({ cells: g.slice(), wins, removed });
    win += w;
    if (w > 0) {
      for (let col = 0; col < 6; col++) {
        const keep = [];
        for (let row = 0; row < 5; row++) { const v = g[row * 6 + col]; if (!removeSym.has(v)) keep.push(v); }
        const miss = 5 - keep.length; const nc = [];
        for (let k = 0; k < miss; k++) nc.push(bonanzaPick(p, rng()));
        for (const v of keep) nc.push(v);
        for (let row = 0; row < 5; row++) g[row * 6 + col] = nc[row];
      }
    } else break;
  }
  const mults = [];
  if (freeMode) for (let i = 0; i < 30; i++) if (g[i] === 10) mults.push({ pos: i, value: bonanzaMultValue(rng) });
  let multSum = 0; for (const m of mults) multSum += m.value;
  if (freeMode && win > 0 && multSum > 0) win *= multSum;
  let scat = 0; const scatPos = [];
  for (let i = 0; i < 30; i++) if (g[i] === 9) { scat++; scatPos.push(i); }
  return { win, scat, scatPos, tumbles, mults, multSum: (freeMode ? multSum : 0) };
}
// Full round: base game + (if 4+ scatters) free spins. Returns final multiplier
// (capped) plus the full animatable sequence for the client.
function bonanzaPlay(seedHex) {
  const rng = casinoPRNG(seedHex);
  let total = 0; const spins = [];
  const base = bonanzaSpin(rng, false);
  spins.push({ type: 'base', tumbles: base.tumbles, scat: base.scat, scatPos: base.scatPos, mults: [], multSum: 0, win: base.win, scatPay: 0 });
  total += base.win;
  let freeSpinsCount = 0, scatPay = 0;
  if (base.scat >= 4) {
    scatPay = BONANZA_SCAT_PAY[Math.min(6, base.scat)] || BONANZA_SCAT_PAY[6];
    spins[0].scatPay = scatPay; total += scatPay;
    let remaining = BONANZA_FS_START, used = 0;
    while (remaining-- > 0 && used < BONANZA_MAX_FS) {
      used++;
      const fs = bonanzaSpin(rng, true);
      spins.push({ type: 'free', index: used, tumbles: fs.tumbles, scat: fs.scat, scatPos: fs.scatPos, mults: fs.mults, multSum: fs.multSum, win: fs.win, scatPay: 0 });
      total += fs.win;
      if (fs.scat >= 3) remaining += BONANZA_FS_RETRIGGER;
    }
    // Report the number of free spins actually executed (capped), so UI never
    // announces more spins than were played.
    freeSpinsCount = used;
  }
  const totalMult = Math.min(CASINO_MAX_MULT, Math.round(total * 1e6) / 1e6);
  return { totalMult, rawMult: total, freeSpinsCount, scatPay, baseScatters: base.scat, spins };
}

// Welcome chest constants — kept in worker so no DB DDL is required
const CHEST_REWARD_AMOUNT = 100;
const CHEST_REWARD_SYMBOL = 'EQ';
const CHEST_WINDOW_MS = 10 * 60 * 1000;            // 10 minutes from first view
const CHEST_CAMPAIGN_END_MS = Date.parse('2026-07-19T23:59:59Z');
const CHEST_ELIGIBILITY_DAYS = 30;                 // rolling: user must have signed up within last 30 days
const CHEST_SENTINEL_CLAIMED = 'WELCOME_CHEST';        // exists => already claimed
const CHEST_SENTINEL_SEEN = 'WELCOME_CHEST_SEEN';      // exists => first-view recorded; balance col = window_start_ms

// Get-or-create a "first viewed" sentinel row in user_balances. Returns window_start_ms.
// Note: user_balances has no UNIQUE(user_id, symbol) constraint, so we read first to avoid duplicates.
async function chestUpsertSeen(uid, env) {
  const nowMs = Date.now();
  // Check if a SEEN row already exists
  const existR = await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.${CHEST_SENTINEL_SEEN}&select=balance&limit=1`, { headers: restHeaders(env) });
  if (existR.ok) {
    const rows = await existR.json();
    if (rows.length > 0) return Number(rows[0].balance) || nowMs;
  }
  // Insert new SEEN row
  await fetch(`${SUPABASE_URL}/rest/v1/user_balances`, {
    method: 'POST',
    headers: { ...restHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: uid,
      symbol: CHEST_SENTINEL_SEEN,
      balance: nowMs,
      locked_balance: 0,
      eq_amount: 0,
    }),
  });
  return nowMs;
}

/* ═══════════════════════════════════════════════
   CRYPTO PRICES (KuCoin) — in-memory cache per isolate
═══════════════════════════════════════════════ */
// EPOCH-ALIGNED cache: every device worldwide sees the SAME snapshot
// in any given 15-second time slot. Slot boundaries are fixed at
// floor(epoch_ms / 15000) so two devices calling at any time within
// the same slot get the identical price snapshot.
const CRYPTO_SLOT_MS = 15000;
let _cryptoCache=null, _cryptoSlot=-1, _cryptoInflight=null;
async function getAllKuCoinPrices() {
  const slot = Math.floor(Date.now() / CRYPTO_SLOT_MS);
  if (_cryptoCache && _cryptoSlot === slot) return _cryptoCache;
  if (_cryptoInflight) return _cryptoInflight;
  _cryptoInflight = (async () => {
    try {
      const r = await fetch('https://api.kucoin.com/api/v1/market/allTickers',{signal:AbortSignal.timeout(8000)});
      if (!r.ok) throw new Error(`KuCoin ${r.status}`);
      const json = await r.json();
      const result={};
      for (const t of (json?.data?.ticker||[])) {
        if (!t.symbol.endsWith('-USDT')) continue;
        const sym=t.symbol.replace('-USDT','');
        const price=parseFloat(t.last);
        if (price>0) result[sym]={price,change:parseFloat(t.changeRate)*100};
      }
      _cryptoCache=result; _cryptoSlot=slot;
      return result;
    } finally {
      _cryptoInflight=null;
    }
  })();
  return _cryptoInflight;
}

/* ═══════════════════════════════════════════════
   TRADFI PRICES (Yahoo Finance)
═══════════════════════════════════════════════ */
const YAHOO_MAP = {
  XAUUSDT:'GC=F',XAGUSDT:'SI=F',XPTUSDT:'PL=F',XPDUSDT:'PA=F',COPPERUSDT:'HG=F',
  TSLAUSDT:'TSLA',AAPLUSDT:'AAPL',AMZNUSDT:'AMZN',MSTRUSDT:'MSTR',HOODUSDT:'HOOD',
  INTCUSDT:'INTC',CRCLUSDT:'CRCL',COINUSDT:'COIN',PLTRUSDT:'PLTR',NVIDAUSDT:'NVDA',
  GOOGLUSDT:'GOOGL',METAUSDT:'META',MSFTUSDT:'MSFT',AMDUSDT:'AMD',NFLXUSDT:'NFLX',
  DISNUSDT:'DIS',JPMUSDT:'JPM',BACUSDT:'BAC',GSUSDT:'GS',BRKBUSDT:'BRK-B',
  VISAUSDT:'V',MAUSDT:'MA',UBERUSDT:'UBER',SPOTUSDT:'SPOT',SNAPUSDT:'SNAP',
  JNJUSDT:'JNJ',WMTUSDT:'WMT',XOMUSDT:'XOM',KOUSDT:'KO',PFEUSDT:'PFE',
  SAPUSDT:'SAP',ASMUSDT:'ASML',NESNUSDT:'NSRGY',LVMHUSDT:'LVMUY',SHUSDT:'SH',
  OILUSDT:'CL=F',NGASUSDT:'NG=F',WHEATUSDT:'ZW=F',CORNUSDT:'ZC=F',SOYUSDT:'ZS=F',
};
// EPOCH-aligned 60s slots — global single snapshot
const TRADFI_SLOT_MS = 60000;
let _tradfiCache=null, _tradfiSlot=-1, _tradfiInflight=null;
async function fetchYahooQuote(sym) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`,
      {signal:AbortSignal.timeout(8000),headers:{'User-Agent':'Mozilla/5.0'}});
    if (!r.ok) return null;
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price=meta.regularMarketPrice||meta.previousClose;
    const prev=meta.chartPreviousClose||meta.previousClose;
    if (!price) return null;
    return {price, change:prev?((price-prev)/prev)*100:0};
  } catch { return null; }
}
async function getAllTradfiPrices(symbols) {
  const slot = Math.floor(Date.now() / TRADFI_SLOT_MS);
  if (_tradfiCache && _tradfiSlot === slot) {
    if (!symbols) return _tradfiCache;
    const out={}; for (const s of symbols) if (_tradfiCache[s]) out[s]=_tradfiCache[s];
    return out;
  }
  if (_tradfiInflight) {
    const cache = await _tradfiInflight;
    if (!symbols) return cache;
    const out={}; for (const s of symbols) if (cache[s]) out[s]=cache[s];
    return out;
  }
  _tradfiInflight = (async () => {
    try {
      const pairs=Object.entries(YAHOO_MAP);
      const results=await Promise.allSettled(pairs.map(([k,v])=>fetchYahooQuote(v).then(d=>[k,d])));
      const out={};
      for (const r of results) if (r.status==='fulfilled'&&r.value[1]) out[r.value[0]]=r.value[1];
      _tradfiCache=out; _tradfiSlot=slot;
      return out;
    } finally {
      _tradfiInflight=null;
    }
  })();
  const fresh = await _tradfiInflight;
  if (!symbols) return fresh;
  const filtered={}; for (const s of symbols) if (fresh[s]) filtered[s]=fresh[s];
  return filtered;
}

/* ═══════════════════════════════════════════════
   MATCH CONTROLS
═══════════════════════════════════════════════ */
const CTRL_BUCKET='sport-controls', CTRL_FILE='controls.json';
async function loadControls(env) { const d=await stoDownload(CTRL_BUCKET,CTRL_FILE,env); return Array.isArray(d)?d:[]; }
async function saveControls(controls,env) { await ensureBucket(CTRL_BUCKET,env); await stoUpload(CTRL_BUCKET,CTRL_FILE,controls,env); }
function genId() { return Math.random().toString(36).slice(2,10); }

/* ═══════════════════════════════════════════════
   SPORT ENGINE — server-side single source of truth
   All devices fetch identical match list / scores / odds
═══════════════════════════════════════════════ */
const SPORT_STATE_FILE='live_state.json';
const SPORT_EPOCH_MS = 2 * 60 * 60 * 1000; // 2-hour epoch
const SPORT_LEAGUES = [
  ['RSA','South Africa Premier Soccer League','South Africa','🇿🇦','#007a4d'],
  ['EGY','Egyptian Premier League','Egypt','🇪🇬','#c8102e'],
  ['MAR','Morocco Botola Pro','Morocco','🇲🇦','#c1272d'],
  ['NGA','Nigeria Professional Football League','Nigeria','🇳🇬','#008751'],
  ['TUN','Tunisia Ligue Professionnelle 1','Tunisia','🇹🇳','#e70013'],
  ['ALG','Algeria Ligue Professionnelle 1','Algeria','🇩🇿','#006233'],
  ['GHA','Ghana Premier League','Ghana','🇬🇭','#006b3f'],
  ['KEN','Kenya Premier League','Kenya','🇰🇪','#006600'],
  ['UGA','Uganda Premier League','Uganda','🇺🇬','#000000'],
  ['TAN','Tanzania Ligi Kuu','Tanzania','🇹🇿','#1d9bf0'],
  ['ETH','Ethiopian Premier League','Ethiopia','🇪🇹','#078930'],
  ['RWA','Rwanda National League','Rwanda','🇷🇼','#20603d'],
  ['ZAM','Zambia Super League','Zambia','🇿🇲','#198a00'],
  ['SEN','Senegal Ligue 1','Senegal','🇸🇳','#00853f'],
  ['MOZ','Mozambique Liga Moçambicana','Mozambique','🇲🇿','#009a44'],
  ['ZIM','Zimbabwe Premier Soccer League','Zimbabwe','🇿🇼','#006400'],
  ['MAL','Malawi Super League','Malawi','🇲🇼','#000080'],
  ['ANG','Angola Girabola','Angola','🇦🇴','#cc0000'],
  ['COD','DR Congo Linafoot','DR Congo','🇨🇩','#007fff'],
  ['BUR','Burundi Primus League','Burundi','🇧🇮','#ce1126'],
];
const SPORT_TEAMS = {
  RSA: [['Kaizer Chiefs','KCH'],['Orlando Pirates','ORL'],['Mamelodi Sundowns','SUN'],['SuperSport United','SSU'],['Cape Town City FC','CTC'],['Stellenbosch FC','STB'],['TS Galaxy','TSG'],['Sekhukhune United','SEK'],['Golden Arrows','GDA'],['Maritzburg United','MRZ']],
  EGY: [['Al Ahly SC','AHL'],['Zamalek SC','ZAM'],['Pyramids FC','PYR'],['Ismaily SC','ISM'],['Future FC','FUT'],['Ceramica Cleopatra','CER'],['Smouha SC','SMH'],['National Bank of Egypt','NBE'],['El Entag El Harby','ENT'],['El Gouna FC','GON']],
  MAR: [['Wydad AC','WAC'],['Raja Casablanca','RAJ'],['FUS Rabat','FUS'],['RS Berkane','RSB'],['Mouloudia Oujda','MOU'],['Hassania Agadir','HAS'],['Renaissance Berkane','RNB'],['Moghreb Tetouan','MOG'],['Difaa El Jadidi','DEJ'],['Ittihad Tanger','ITT']],
  NGA: [['Rivers United','RVU'],['Plateau United','PLU'],['Kano Pillars','KNP'],['Shooting Stars','SHS'],['Lobi Stars','LBS'],['Remo Stars','RMS'],['Sunshine Stars','SUS'],['Akwa United','AKW'],['Rangers International','RNG'],['Nasarawa United','NSU']],
  TUN: [['Espérance de Tunis','EST'],['Club Africain','CAF'],['CS Sfaxien','CSS'],['US Monastir','USM'],['Étoile du Sahel','EDS'],['Stade Tunisien','STT'],['Olympique Béja','OLB'],['AS Gabès','ASG'],['JS Kairouan','JSK'],['AS Marsa','ASM']],
  ALG: [['CR Belouizdad','CRB'],['USM Alger','USM'],['MC Alger','MCA'],['JS Kabylie','JSK'],['ES Sétif','ESS'],['MC Oran','MCO'],['CS Constantine','CSC'],['Paradou AC','PAR'],['ASO Chlef','ASO'],['USM Bel-Abbès','UBA']],
  GHA: [['Asante Kotoko SC','KOT'],['Hearts of Oak SC','HOA'],['Great Olympics FC','OLY'],['Medeama SC','MED'],['Aduana Stars','ADU'],['Legon Cities','LGN'],['King Faisal FC','KNF'],['Dreams FC','DRM'],['Bechem United','BEC'],['RTU FC','RTU']],
  KEN: [['Gor Mahia FC','GOR'],['AFC Leopards','LEP'],['Tusker FC','TUS'],['Mathare United','MAT'],['Kakamega Homeboyz','KAK'],['Sofapaka FC','SOF'],['Bandari FC','BAN'],['KCB FC','KCB'],['Western Stima','WST'],['Posta Rangers','POS']],
  UGA: [['KCCA FC','KCC'],['SC Villa','VIL'],['Vipers SC','VIP'],['Express FC','EXP'],['Wakiso Giants','WAK'],['Police FC','POL'],['Maroons FC','MAR'],['BUL FC','BUL'],['Mbarara City','MBA'],['MYDA FC','MYD']],
  TAN: [['Simba SC','SIM'],['Young Africans SC','YNG'],['Azam FC','AZA'],['Coastal Union','CST'],['Biashara United','BIA'],['Singida United','SIN'],['Mtibwa Sugar','MTI'],['Ihefu FC','IHE'],['Mbeya City','MBY'],['Alliance FC','ALL']],
  ETH: [['Ethiopian Coffee SC','ECF'],['St. George SC','STG'],['Fasil Kenema','FAS'],['Adama City FC','ADM'],['Dire Dawa Ketema','DDK'],['Wolaitta Dicha','WOL'],['Jimma AbaJifar','JIM'],['Sebeta Ketema','SEB'],['Hawassa Ketema','HAW'],['Dedebit FC','DED']],
  RWA: [['APR FC','APR'],['Rayon Sports FC','RAY'],['AS Kigali','ASK'],['Police FC Rwanda','POR'],['Espoir FC','ESP'],['Bugesera FC','BUG'],['Gorilla FC','GRL'],['Marines FC','MRN'],['Etincelles FC','ETI'],['Sunrise FC','SRS']],
  ZAM: [['Zesco United','ZES'],['Nkana FC','NKN'],['Forest Rangers','FOR'],['Green Eagles','GRE'],['Power Dynamos','POW'],['Buildcon FC','BLD'],['Lusaka Dynamos','LDA'],['Red Arrows','RDA'],['Zanaco FC','ZAN'],['Napsa Stars','NAP']],
  SEN: [['AS Pikine','PIK'],['Jaraaf FC','JAR'],['Génération Foot','GEN'],['Casa Sports','CAS'],['Diambars FC','DIA'],['US Gorée','GOR'],['Teungueth FC','TEU'],['ASC Diaraf','DRF'],['Dakar Sacré-Cœur','DSC'],['AS Douanes','DOU']],
  MOZ: [['Costa do Sol','COS'],['Ferroviário Maputo','FER'],['Black Bulls','BLK'],['UD do Songo','SON'],['Ferroviário Beira','FEB'],['Desportivo Maputo','DSP'],['Matchedje FC','MTC'],['Maxaquene FC','MAX'],['Vilankulo FC','VLK'],['Tete FC','TET']],
  ZIM: [['Dynamos FC','DYN'],['CAPS United','CAP'],['Highlanders FC','HIG'],['Triangle United','TRI'],['FC Platinum','PLT'],['Manica Diamonds','MAN'],['Cranborne Bullets','CRN'],['Chicken Inn FC','CHK'],['Bulawayo Chiefs','BUL'],['Herentals FC','HER']],
  MAL: [['Be Forward Wanderers','WAN'],['Nyasa Big Bullets','BIG'],['Silver Strikers','SIL'],['Mighty Wanderers','MMW'],['Blantyre United','BLU'],['Blue Eagles','BEG'],['Kamuzu Barracks','KAB'],['Rumphi United','RUM'],['Karonga United','KAR'],['Total Stars','TTS']],
  ANG: [['Petro de Luanda','PET'],['Primeiro de Agosto','AGO'],['Sagrada Esperança','SAG'],['Recreativo do Libolo','REC'],['Interclube FC','INT'],['1º de Maio','MAI'],['Santa Rita de Cássia','SRC'],['Desportivo da Huíla','HUI'],['Kabuscorp SC','KAB'],['Wiliete FC','WIL']],
  COD: [['TP Mazembe','TPM'],['AS Vita Club','VIT'],['AS Dragons','DRG'],['DC Motema Pembe','MTP'],['CS Don Bosco','DON'],['Saint-Eloi Lupopo','LUP'],['OC Bukavu Dawa','OCD'],['AS Nyuki','NYK'],['Sanga Balende','SNG'],['Renaissance du Congo','REN']],
  BUR: [['Le Messager Ngozi','MNG'],['Vital-O FC','VTO'],['Athletic Club Gitega','ACG'],['Aigle Noir','AGL'],['Inter Star','INS'],['Prince Louis','PRL'],['Bujumbura City FC','BCF'],['Flambeau du Centre','FLC'],['KAC Kiremba','KAK'],['LLB Athletic','LLB']],
};

function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

function generateSportEpoch(epoch) {
  const rng = mulberry32(epoch * 1009 + 7);
  const all = [];
  for (const [lid] of SPORT_LEAGUES) {
    const teams = SPORT_TEAMS[lid] || [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        all.push({ leagueId: lid, h: teams[i], a: teams[j] });
      }
    }
  }
  // Shuffle deterministically
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  // Pick up to 30, ensuring no team appears twice in this epoch
  const used = new Set();
  const picked = [];
  for (const m of all) {
    if (used.has(m.h[0]) || used.has(m.a[0])) continue;
    used.add(m.h[0]); used.add(m.a[0]);
    picked.push(m);
    if (picked.length >= 30) break;
  }
  const epochStart = epoch * SPORT_EPOCH_MS;
  return picked.map((m, idx) => {
    const seed = ((epoch * 1000 + idx) * 2654435761) >>> 0;
    const rngM = mulberry32(seed);
    // Stagger across a 130-minute window centered before epoch start so the snapshot
    // ALWAYS shows matches in mixed phases (early, mid, late, recently finished) —
    // never all 0-0 / minute 0 at the moment a fresh epoch begins.
    const offsetMs = Math.floor(rngM() * 130 * 60 * 1000) - 75 * 60 * 1000;
    return {
      id: `e${epoch}_${idx}`,
      seed,
      leagueId: m.leagueId,
      homeTeam: m.h[0],
      homeAbbr: m.h[1],
      awayTeam: m.a[0],
      awayAbbr: m.a[1],
      startedAt: epochStart + offsetMs,
    };
  });
}

function computeLiveMatch(meta, nowMs, ctrlMap) {
  const rng = mulberry32(meta.seed);
  // Pre-decide goal counts (Poisson-like distribution matching real football stats).
  // Home avg ~1.55 goals, away avg ~1.25 goals → total ~2.8 (real EPL avg is 2.7).
  // Distribution: 0=20%, 1=35%, 2=25%, 3=13%, 4+=7%. Away slightly weaker.
  const goalCount = (r, awayBias) => {
    const adj = awayBias ? r + 0.05 : r;
    if (adj < 0.22) return 0;
    if (adj < 0.58) return 1;
    if (adj < 0.82) return 2;
    if (adj < 0.94) return 3;
    return 4 + Math.floor(rng() * 2); // 4 or 5
  };
  const baseHome = goalCount(rng(), false);
  const baseAway = goalCount(rng(), true);
  // Pre-schedule goal minutes
  let scheduled = [];
  for (let i = 0; i < baseHome; i++) scheduled.push({ minute: 1 + Math.floor(rng() * 89), side: 'home' });
  for (let i = 0; i < baseAway; i++) scheduled.push({ minute: 1 + Math.floor(rng() * 89), side: 'away' });
  scheduled.sort((a, b) => a.minute - b.minute);

  const ctrlKey = `${meta.homeTeam}:${meta.awayTeam}`;
  const ctrl = ctrlMap.get(ctrlKey);

  // Apply admin targetScore override
  if (ctrl?.targetScore) {
    const ts = ctrl.targetScore;
    scheduled = [];
    const ctrlRng = mulberry32(meta.seed ^ ((ts.h + 1) * 31 + (ts.a + 1) * 17 + (ctrl.startedAt || 0)));
    for (let i = 0; i < ts.h; i++) scheduled.push({ minute: 5 + Math.floor(ctrlRng() * 80), side: 'home' });
    for (let i = 0; i < ts.a; i++) scheduled.push({ minute: 5 + Math.floor(ctrlRng() * 80), side: 'away' });
    scheduled.sort((a, b) => a.minute - b.minute);
  }

  // Compute clock from real elapsed time
  const startedAt = ctrl?.startedAt || meta.startedAt;
  const elapsedMin = (nowMs - startedAt) / 60000;
  let minute, phase, status = 'live', finishedAt = null;
  if (elapsedMin < 0)        { minute = 0; phase = 'first_half'; }
  else if (elapsedMin < 45)  { minute = Math.floor(elapsedMin); phase = 'first_half'; }
  else if (elapsedMin < 48)  { minute = 45; phase = 'ht_break'; }
  else if (elapsedMin < 93)  { minute = 45 + Math.floor(elapsedMin - 48); phase = 'second_half'; }
  else if (elapsedMin < 96)  { minute = 90; phase = 'ft_stoppage'; }
  else                       { minute = 90; phase = 'finished'; status = 'finished'; finishedAt = startedAt + 96 * 60000; }

  // Effective minute for goal counting: pause during HT break
  const effMin = phase === 'ht_break' ? 45 : (phase === 'finished' || phase === 'ft_stoppage' ? 90 : minute);
  let homeScore = 0, awayScore = 0;
  const visibleEvents = [];
  for (const g of scheduled) {
    if (g.minute <= effMin) {
      if (g.side === 'home') homeScore++; else awayScore++;
      visibleEvents.push({ minute: g.minute, side: g.side, score: `${homeScore}–${awayScore}` });
    }
  }

  // Apply targetResult late-game guarantee
  if (ctrl?.targetResult && minute >= 88) {
    if (ctrl.targetResult === '1' && homeScore <= awayScore) homeScore = awayScore + 1;
    else if (ctrl.targetResult === '2' && awayScore <= homeScore) awayScore = homeScore + 1;
    else if (ctrl.targetResult === 'X' && homeScore !== awayScore) {
      const lo = Math.min(homeScore, awayScore);
      homeScore = lo; awayScore = lo;
    }
  }

  // Odds derived from seed + score state (changes when score changes)
  const oddsRng = mulberry32((meta.seed ^ (homeScore * 7919 + awayScore * 6151 + Math.floor(minute / 10) * 521)) >>> 0);
  const baseW1 = 1.4 + oddsRng() * 2.8;
  const baseX  = 2.8 + oddsRng() * 2.2;
  const baseW2 = 1.4 + oddsRng() * 2.8;
  const lead = homeScore - awayScore;
  const w1 = +(baseW1 * (lead > 0 ? 0.55 + 0.15 * Math.min(2, lead) : (lead < 0 ? 1.6 + 0.3 * Math.min(2, -lead) : 1))).toFixed(2);
  const w2 = +(baseW2 * (lead < 0 ? 0.55 + 0.15 * Math.min(2, -lead) : (lead > 0 ? 1.6 + 0.3 * Math.min(2, lead) : 1))).toFixed(2);
  const x  = +(baseX  * (Math.abs(lead) > 0 ? 1.6 : 1)).toFixed(2);

  const total = homeScore + awayScore;
  const line = total >= 4 ? 4.5 : total >= 3 ? 3.5 : total >= 1 ? 2.5 : 1.5;
  const over  = +(1.55 + oddsRng() * 1.8).toFixed(2);
  const under = +(1.55 + oddsRng() * 1.8).toFixed(2);

  return {
    id: meta.id,
    leagueId: meta.leagueId,
    homeTeam: meta.homeTeam, homeAbbr: meta.homeAbbr,
    awayTeam: meta.awayTeam, awayAbbr: meta.awayAbbr,
    startedAt, minute, phase, status,
    homeScore, awayScore, finishedAt,
    odds: { w1: Math.max(1.05, w1), x: Math.max(1.5, x), w2: Math.max(1.05, w2) },
    totalOdds: { line, over: Math.max(1.1, over), under: Math.max(1.1, under) },
    goalEvents: visibleEvents,
    pinned: !!ctrl?.pinned,
    hasAdminCtrl: !!ctrl,
  };
}

async function getSportSnapshot(env) {
  const now = Date.now();
  const epoch = Math.floor(now / SPORT_EPOCH_MS);
  const STATE_VERSION = 2; // bump to invalidate cached epochs after stagger-window change
  let state = await stoDownload(CTRL_BUCKET, SPORT_STATE_FILE, env);
  if (!state || state.epoch !== epoch || state.version !== STATE_VERSION || !Array.isArray(state.matches)) {
    state = { version: STATE_VERSION, epoch, matches: generateSportEpoch(epoch) };
    await ensureBucket(CTRL_BUCKET, env);
    await stoUpload(CTRL_BUCKET, SPORT_STATE_FILE, state, env);
  }
  const controls = await loadControls(env);
  const ctrlMap = new Map();
  for (const c of controls) ctrlMap.set(`${c.homeTeam}:${c.awayTeam}`, c);
  return state.matches.map(m => computeLiveMatch(m, now, ctrlMap));
}

/* ═══════════════════════════════════════════════
   SPORT BETS
═══════════════════════════════════════════════ */
const BETS_BUCKET='sport-bets-data';
async function loadBet(id,env) { return stoDownload(BETS_BUCKET,`${id}.json`,env); }
async function saveBet(bet,env) { await ensureBucket(BETS_BUCKET,env); await stoUpload(BETS_BUCKET,`${bet.id}.json`,bet,env); }
async function loadAllBets(env) {
  await ensureBucket(BETS_BUCKET,env);
  const files=await stoList(BETS_BUCKET,'',env);
  if (!files.length) return [];
  const results=await Promise.allSettled(files.map(f=>stoDownload(BETS_BUCKET,f.name,env)));
  return results.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value);
}

/* ═══════════════════════════════════════════════
   ANON SESSIONS — per-visitor file (concurrent-safe)
═══════════════════════════════════════════════ */
const SESS_BUCKET='visitor-sessions';
function sessPath(vid) { return `v/${vid}.json`; }
async function loadOneSession(vid,env) { return stoDownload(SESS_BUCKET,sessPath(vid),env); }
async function saveOneSession(vid,data,env) { await ensureBucket(SESS_BUCKET,env); await stoUpload(SESS_BUCKET,sessPath(vid),data,env); }
async function deleteOneSession(vid,env) {
  await fetch(`${STO}/object/${SESS_BUCKET}/${sessPath(vid)}`,{method:'DELETE',headers:stoHeaders(env)});
}
async function loadAllSessions(env) {
  await ensureBucket(SESS_BUCKET,env);
  const files=await stoList(SESS_BUCKET,'v/',env);
  if (!files.length) return [];
  const results=await Promise.allSettled(files.map(f=>stoDownload(SESS_BUCKET,`v/${f.name}`,env)));
  return results.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value);
}

/* ═══════════════════════════════════════════════
   PUSH SUBSCRIPTIONS
═══════════════════════════════════════════════ */
const PUSH_BUCKET='push-data', PUSH_FILE='subscriptions.json';
async function loadSubs(env) { const d=await stoDownload(PUSH_BUCKET,PUSH_FILE,env); return Array.isArray(d)?d:[]; }
async function saveSubs(subs,env) { await ensureBucket(PUSH_BUCKET,env); await stoUpload(PUSH_BUCKET,PUSH_FILE,subs,env); }

/* ═══════════════════════════════════════════════
   TEAM LOGO (TheSportsDB)
═══════════════════════════════════════════════ */
async function resolveBadge(name) {
  const variants=[name];
  const s=name.replace(/\s+(FC|SC|AC|CF|United|City|Club|Rovers|Athletic|Sporting|Racing)$/i,'').trim();
  if (s&&s!==name) variants.push(s);
  for (const v of variants) {
    try {
      const r=await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(v)}`,{signal:AbortSignal.timeout(6000)});
      if (!r.ok) continue;
      const d=await r.json();
      const url=d?.teams?.[0]?.strBadge;
      if (url) return url;
    } catch {}
  }
  return null;
}

/* ═══════════════════════════════════════════════
   WALLET GENERATION
═══════════════════════════════════════════════ */
function genBep20(userId) {
  const hex='0123456789abcdef'; let h=5381;
  for (let i=0;i<`bep20__${userId}`.length;i++) h=(((h<<5)+h)^`bep20__${userId}`.charCodeAt(i))>>>0;
  let addr='0x';
  for (let i=0;i<40;i++){h=((h*1664525+1013904223)>>>0);addr+=hex[h%16];}
  return addr;
}
function genTrc20(userId) {
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'; let h=5381;
  for (let i=0;i<`trc20__${userId}`.length;i++) h=(((h<<5)+h)^`trc20__${userId}`.charCodeAt(i))>>>0;
  let addr='T';
  for (let i=0;i<33;i++){h=((h*1664525+1013904223)>>>0);addr+=chars[h%chars.length];}
  return addr;
}

/* ═══════════════════════════════════════════════
   GEO LOOKUP
═══════════════════════════════════════════════ */
async function lookupGeo(ip) {
  if (!ip||['127.0.0.1','::1'].includes(ip)||ip.startsWith('172.')||ip.startsWith('10.')||ip.startsWith('192.168.')) return {country:null,city:null};
  try {
    const r=await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`,{signal:AbortSignal.timeout(3000)});
    if (!r.ok) return {country:null,city:null};
    const d=await r.json();
    return d.status==='success'?{country:d.country||null,city:d.city||null}:{country:null,city:null};
  } catch { return {country:null,city:null}; }
}

/* ═══════════════════════════════════════════════
   RESPONSE HELPERS
═══════════════════════════════════════════════ */
const CORS = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'*',
  'Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};
function jsonRes(status, body) {
  return new Response(JSON.stringify(body), { status, headers:{...CORS,'Content-Type':'application/json'} });
}
function ok(data) { return jsonRes(200, data); }
function err(code, msg) { return jsonRes(code, {error:msg}); }
function isAdmin(headers) {
  const id = headers.get('x-requester-id');
  return id && ADMIN_UUIDS.has(id);
}

/* NOWPayments currency codes: "COIN:NETWORK" → NOWPayments pay_currency.
   Only confidently-mapped pairs — anything else must go through the hosted
   invoice flow or manual NOWPayments panel handling. */
const NOWPAY_CUR = {
  '1INCH:ERC20': '1inch',
  'AAVE:ERC20': 'aave',
  'ADA:ADA': 'ada',
  'ALGO:ALGO': 'algo',
  'APE:ERC20': 'ape',
  'APT:APT': 'apt',
  'ARB:ARBITRUM': 'arb',
  'ARPA:BEP20': 'arpabsc',
  'ARPA:ERC20': 'arpa',
  'AXS:ERC20': 'axs',
  'BABYDOGE:BEP20': 'babydoge',
  'BAT:ERC20': 'bat',
  'BCH:BCH': 'bch',
  'BEL:BEP20': 'belbsc',
  'BEL:ERC20': 'bel',
  'BNB:BEP20': 'bnbbsc',
  'BOBA:ERC20': 'boba',
  'BTC:BTC': 'btc',
  'BTTC:TRC20': 'bttc',
  'C98:BEP20': 'c98',
  'CAKE:BEP20': 'cake',
  'CFX:BEP20': 'cfx',
  'CHZ:ERC20': 'chz',
  'COTI:ERC20': 'coti',
  'CTSI:ERC20': 'ctsi',
  'DAI:ARBITRUM': 'daiarb',
  'DAI:ERC20': 'dai',
  'DOGE:DOGE': 'doge',
  'EGLD:BEP20': 'egldbsc',
  'EGLD:EGLD': 'egld',
  'ETC:ETC': 'etc',
  'ETH:ARBITRUM': 'etharb',
  'ETH:BASE': 'ethbase',
  'ETH:BEP20': 'ethbsc',
  'ETH:ERC20': 'eth',
  'ETH:ETH': 'eth',
  'FIL:FIL': 'fil',
  'FLOKI:BEP20': 'flokibsc',
  'FLOKI:ERC20': 'floki',
  'FUN:ERC20': 'fun',
  'GALA:ERC20': 'galaerc20',
  'GMX:ARBITRUM': 'gmxarb',
  'GMX:AVAXC': 'gmx',
  'GRT:ERC20': 'grt',
  'HOT:ERC20': 'hot',
  'ILV:ERC20': 'ilv',
  'INJ:BEP20': 'inj',
  'INJ:ERC20': 'injerc20',
  'INJ:INJ': 'injmainnet',
  'KNC:ERC20': 'knc',
  'LINK:ERC20': 'link',
  'LTC:LTC': 'ltc',
  'MANA:ERC20': 'mana',
  'MATIC:ERC20': 'matic',
  'MATIC:POLYGON': 'maticmainnet',
  'NEAR:NEAR': 'near',
  'OKB:ERC20': 'okb',
  'OMG:ERC20': 'omg',
  'ONT:ONT': 'ont',
  'PEPE:ERC20': 'pepe',
  'QTUM:QTUM': 'qtum',
  'SAND:ERC20': 'sand',
  'SHIB:BEP20': 'shibbsc',
  'SHIB:ERC20': 'shib',
  'SOL:SOL': 'sol',
  'SUI:SUI': 'sui',
  'SUPER:ERC20': 'super',
  'TRX:TRC20': 'trx',
  'TUSD:ERC20': 'tusd',
  'TUSD:TRC20': 'tusdtrc20',
  'UNI:ERC20': 'uni',
  'USDC:ALGO': 'usdcalgo',
  'USDC:ARBITRUM': 'usdcarb',
  'USDC:AVAXC': 'usdcarc20',
  'USDC:BASE': 'usdcbase',
  'USDC:BEP20': 'usdcbsc',
  'USDC:ERC20': 'usdc',
  'USDC:OPTIMISM': 'usdcop',
  'USDC:POLYGON': 'usdcmatic',
  'USDC:SOL': 'usdcsol',
  'USDT:ARBITRUM': 'usdtarb',
  'USDT:AVAXC': 'usdtarc20',
  'USDT:BEP20': 'usdtbsc',
  'USDT:CELO': 'usdtcelo',
  'USDT:ERC20': 'usdterc20',
  'USDT:OPTIMISM': 'usdtop',
  'USDT:POLYGON': 'usdtmatic',
  'USDT:SOL': 'usdtsol',
  'USDT:TRC20': 'usdttrc20',
  'VET:VET': 'vet',
  'WAVES:WAVES': 'waves',
  'WBTC:POLYGON': 'wbtcmatic',
  'WIN:TRC20': 'wintrc20',
  'XMR:XMR': 'xmr',
  'XRP:XRP': 'xrp',
  'YFI:ERC20': 'yfi',
  'ZEC:ZEC': 'zec',
  'ZIL:ZIL': 'zil',
};

// USD value of an amount in a NOWPayments currency (usdt* ≈ 1:1, else live estimate).
// Returns 0 on failure — caller must treat 0 as "cannot value, do not credit".
async function npUsdValue(env, amount, cur) {
  const amt = Number(amount) || 0;
  if (amt <= 0) return 0;
  const c = String(cur || '').toLowerCase();
  if (c.startsWith('usdt') || c.startsWith('usdc')) return amt;
  try {
    const r = await fetch(`https://api.nowpayments.io/v1/estimate?amount=${amt}&currency_from=${c}&currency_to=usd`,
      { headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY } });
    const j = await r.json();
    const v = Number(j.estimated_amount || 0);
    return v > 0 ? v : 0;
  } catch { return 0; }
}

/* ═══════════════════════════════════════════════
   BSC / TRC-20 PARA RADARI
═══════════════════════════════════════════════ */
const USDT_BEP20 = '0x55d398326f99059fF775485246999027B3197955';
const USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// BSC public RPC — no API key needed. Fallback list for reliability.
// RPCs that allow eth_getLogs WITH `address` filter and 5000-block range.
// Ordered by reliability for large eth_getLogs queries.
const BSC_RPCS = [
  'https://bsc.drpc.org',
  'https://1rpc.io/bnb',
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed.binance.org',
];

// We accept ANY BEP-20 token transfer (USDT, BUSD, USDC, EARN, EQ, BNC,
// or any custom token the user receives). The scanner does not pre-filter
// by token contract; it captures every Transfer event going to the
// watched wallet addresses and resolves the symbol/decimals on the fly.
// Reserved address-list (used only as a fallback retry on RPCs that
// require an `address` field, e.g. publicnode.com).
const BSC_FALLBACK_TOKENS = [
  '0x55d398326f99059fF775485246999027B3197955', // USDT
  '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
];
let rpcDebug = [];
async function bscRpc(method, params, opts={}) {
  // For eth_getLogs we accept empty arrays as valid; for other methods a defined result is enough.
  const expectArray = opts.expectArray === true;
  for (const url of BSC_RPCS) {
    try {
      const r = await fetch(url, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) { rpcDebug.push({url, method, http: r.status}); continue; }
      const j = await r.json().catch(()=>({}));
      if (j.error) { rpcDebug.push({url, method, error: j.error?.message || 'rpc error'}); continue; }
      if (expectArray) {
        if (Array.isArray(j.result)) return j.result;
        rpcDebug.push({url, method, error: 'expected array, got '+typeof j.result});
        continue;
      }
      if (j.result !== undefined && j.result !== null) return j.result;
      rpcDebug.push({url, method, error: 'no result'});
    } catch (e) { rpcDebug.push({url, method, fetchError: e.message}); }
  }
  return expectArray ? [] : null;
}

// Token symbol/decimals cache (per worker invocation)
const tokenInfoCache = new Map();
async function getTokenInfo(contract) {
  if (tokenInfoCache.has(contract)) return tokenInfoCache.get(contract);
  const [symHex, decHex] = await Promise.all([
    bscRpc('eth_call', [{to: contract, data: '0x95d89b41'}, 'latest']), // symbol()
    bscRpc('eth_call', [{to: contract, data: '0x313ce567'}, 'latest']), // decimals()
  ]);
  let symbol = 'UNKNOWN', decimals = 18;
  if (symHex && symHex !== '0x') {
    try {
      // ABI-encoded string: offset(32) + length(32) + data
      const len = parseInt(symHex.slice(66, 130), 16);
      const dataHex = symHex.slice(130, 130 + len*2);
      symbol = decodeURIComponent(dataHex.match(/.{2}/g).map(b=>'%'+b).join('')).replace(/\0/g,'').trim();
      if (!symbol || /[^\x20-\x7E]/.test(symbol)) symbol = 'UNKNOWN';
    } catch { symbol = 'UNKNOWN'; }
  }
  if (decHex && decHex !== '0x') decimals = parseInt(decHex, 16) || 18;
  const info = {symbol: symbol.toUpperCase(), decimals};
  tokenInfoCache.set(contract, info);
  return info;
}

const blockTimeCache = new Map();
async function getBlockTime(blockHex) {
  if (blockTimeCache.has(blockHex)) return blockTimeCache.get(blockHex);
  const b = await bscRpc('eth_getBlockByNumber', [blockHex, false]);
  const ts = b?.timestamp ? new Date(parseInt(b.timestamp, 16) * 1000).toISOString() : null;
  blockTimeCache.set(blockHex, ts);
  return ts;
}

const TRANSFER_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Batch scan: ALL BSC addresses in a single eth_getLogs call per chunk
async function scanBscWalletsBatch(addresses, env) {
  if (!addresses.length) return new Map();
  const addrToOriginal = new Map();
  const paddedList = addresses.map(a => {
    const lc = a.toLowerCase();
    const padded = '0x' + '0'.repeat(24) + lc.slice(2);
    addrToOriginal.set(lc, a);
    return padded;
  });
  const currentHex = await bscRpc('eth_blockNumber', []);
  if (!currentHex) return new Map();
  const currentBlock = parseInt(currentHex, 16);
  // Public BSC RPCs accept ~5000 blocks per call.
  // 5 chunks × 4500 = 22500 blocks ≈ 18.75 hours of coverage.
  const TOTAL_BLOCKS = 22500, CHUNK = 4500;
  const logs = [];
  for (let off = 0; off < TOTAL_BLOCKS; off += CHUNK) {
    const hi = Math.max(currentBlock - off, 0);
    const lo = Math.max(hi - CHUNK, 0);
    if (hi <= 0) break;
    // First try without `address` filter — captures EVERY token transfer
    // (USDT, BUSD, EARN, EQ, BNC, custom tokens). Works on drpc.org and 1rpc.io.
    let part = await bscRpc('eth_getLogs', [{
      fromBlock: '0x' + lo.toString(16),
      toBlock: '0x' + hi.toString(16),
      topics: [TRANSFER_SIG, null, paddedList],
    }], { expectArray: true });
    // Fallback: some RPCs (publicnode) require an `address` field. If the
    // first call returned nothing, retry with the stablecoin allow-list so
    // we still catch USDT/BUSD/USDC even if those RPCs are the only working ones.
    if (!Array.isArray(part) || part.length === 0) {
      const partB = await bscRpc('eth_getLogs', [{
        fromBlock: '0x' + lo.toString(16),
        toBlock: '0x' + hi.toString(16),
        address: BSC_FALLBACK_TOKENS,
        topics: [TRANSFER_SIG, null, paddedList],
      }], { expectArray: true });
      if (Array.isArray(partB) && partB.length) part = partB;
    }
    if (Array.isArray(part) && part.length) logs.push(...part);
  }
  // Resolve unique tokens
  const uniq = [...new Set(logs.map(l => l.address.toLowerCase()))];
  for (const c of uniq) await getTokenInfo(c);
  // Group by recipient address
  const byAddr = new Map();
  for (const a of addresses) byAddr.set(a, []);
  for (const log of logs) {
    try {
      const toLc = '0x' + log.topics[2].slice(26).toLowerCase();
      const original = addrToOriginal.get(toLc);
      if (!original) continue;
      const info = await getTokenInfo(log.address.toLowerCase());
      const valueWei = BigInt(log.data || '0x0');
      const amount = Number(valueWei) / Math.pow(10, info.decimals);
      if (amount <= 0) continue;
      byAddr.get(original).push({
        tx_hash: log.transactionHash,
        from_address: '0x' + log.topics[1].slice(26),
        to_address: original,
        currency: info.symbol,
        contract: log.address,
        amount,
        block_number: parseInt(log.blockNumber, 16),
        block_time: log.blockTimestamp ? new Date(parseInt(log.blockTimestamp,16)*1000).toISOString() : null,
        confirmations: currentBlock - parseInt(log.blockNumber, 16),
      });
    } catch {}
  }
  return byAddr;
}

async function scanTronWallet(address, env, mode='trc20') {
  const headers = env.TRONGRID_API_KEY ? {'TRON-PRO-API-KEY': env.TRONGRID_API_KEY} : {};
  const url = mode === 'trx'
    ? `https://api.trongrid.io/v1/accounts/${address}/transactions?limit=50&only_to=true`
    : `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=50&only_to=true`;
  try {
    const res = await fetch(url, {headers, signal: AbortSignal.timeout(10000)}).then(r=>r.json()).catch(()=>({data:[]}));
    const out = [];
    if (!Array.isArray(res.data)) return out;
    if (mode === 'trx') {
      for (const tx of res.data) {
        const c = tx.raw_data?.contract?.[0];
        if (!c || c.type !== 'TransferContract') continue;
        const v = c.parameter?.value;
        if (!v || !v.amount) continue;
        out.push({
          tx_hash: tx.txID, from_address: v.owner_address, to_address: v.to_address,
          currency: 'TRX', contract: null,
          amount: Number(v.amount) / 1e6,
          block_number: null,
          block_time: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : null,
          confirmations: 1,
        });
      }
    } else {
      for (const tx of res.data) {
        out.push({
          tx_hash: tx.transaction_id, from_address: tx.from, to_address: tx.to,
          currency: (tx.token_info?.symbol || 'UNKNOWN').toUpperCase(),
          contract: tx.token_info?.address,
          amount: Number(tx.value) / Math.pow(10, Number(tx.token_info?.decimals||6)),
          block_number: null,
          block_time: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : null,
          confirmations: 1,
        });
      }
    }
    return out;
  } catch (e) { console.error('TRON scan error', address, e.message); return []; }
}

async function sendTelegramAlert(text, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) return;
  const partnerId = env.TELEGRAM_PARTNER_CHAT_ID || '-1003760482893';
  const targets = [env.TELEGRAM_ADMIN_CHAT_ID];
  if (partnerId && String(partnerId) !== String(env.TELEGRAM_ADMIN_CHAT_ID)) {
    targets.push(partnerId);
  }
  await Promise.all(targets.map(cid =>
    fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        chat_id: cid,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    }).catch(e => console.error('Telegram error', cid, e.message))
  ));
}

async function scanAllWallets(env, part='main', opts={}) {
  const headers = {Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey:env.SUPABASE_SERVICE_ROLE_KEY};
  const offset = Math.max(0, Number(opts.offset) || 0);
  const limit  = Math.max(1, Math.min(50, Number(opts.limit) || 12));

  // Load all assigned wallets (filtered by network for the requested part)
  const wRes = await fetch(`${SUPABASE_URL}/rest/v1/wallet_pool?is_assigned=eq.true&select=id,address,network,assigned_to_user_id&order=id.asc`, {headers});
  const allWallets = await wRes.json();
  if (!Array.isArray(allWallets)) return {error:'failed to load wallets', detail: allWallets};

  // Filter to relevant network for this `part`
  const relevant = allWallets.filter(w => {
    if (part === 'main') return w.network === 'BEP20' || w.network === 'BSC' || w.network === 'TRC20' || w.network === 'TRON';
    if (part === 'trx')  return w.network === 'TRC20' || w.network === 'TRON';
    return false;
  });
  const total = relevant.length;
  const wallets = relevant.slice(offset, offset + limit);
  const nextOffset = offset + wallets.length;
  const done = nextOffset >= total;

  if (!wallets.length) {
    return {ok:true, scanned:0, found:0, inserted:0, errors:0, new_deposits:0,
            offset, next_offset: nextOffset, total, done:true};
  }

  // Load existing tx hashes (most recent 2000 deposits) for dedupe.
  // Single fetch, covers all chunks reliably regardless of address casing.
  const exRes = await fetch(
    `${SUPABASE_URL}/rest/v1/blockchain_deposits?select=tx_hash&order=created_at.desc&limit=2000`,
    {headers}
  );
  const existing = new Set(((await exRes.json())||[]).map(r=>r.tx_hash));

  rpcDebug = [];
  let scanned=0, found=0, inserted=0, errors=0;
  const newOnes = [];
  const toInsert = [];

  const doBsc   = part === 'main';
  const doTrc20 = part === 'main';
  const doTrx   = part === 'trx';

  // Batch BSC (single eth_getLogs covers all BSC addresses in this chunk)
  let bscMap = new Map();
  if (doBsc) {
    const bscWallets = wallets.filter(w => w.network === 'BEP20' || w.network === 'BSC');
    if (bscWallets.length) {
      bscMap = await scanBscWalletsBatch(bscWallets.map(w => w.address), env);
    }
  }

  for (const w of wallets) {
    scanned++;
    let txs = [];
    if ((w.network === 'BEP20' || w.network === 'BSC') && doBsc) txs = bscMap.get(w.address) || [];
    else if ((w.network === 'TRC20' || w.network === 'TRON') && doTrc20) txs = await scanTronWallet(w.address, env, 'trc20');
    else if ((w.network === 'TRC20' || w.network === 'TRON') && doTrx)   txs = await scanTronWallet(w.address, env, 'trx');
    else continue;

    found += txs.length;
    for (const tx of txs) {
      if (existing.has(tx.tx_hash)) continue;
      existing.add(tx.tx_hash);
      toInsert.push({
        user_id: w.assigned_to_user_id,
        wallet_address_id: w.id,
        tx_hash: tx.tx_hash,
        network: w.network,
        currency: tx.currency || 'USDT',
        amount: tx.amount,
        from_address: tx.from_address,
        to_address: tx.to_address,
        confirmations: tx.confirmations,
        required_confirmations: w.network==='BEP20'?12:1,
        status: 'new',
        block_number: tx.block_number,
      });
      newOnes.push({...tx, network:w.network, wallet:w.address, user_id:w.assigned_to_user_id});
    }
    // Pacing only for TRON (TronGrid 1 req/sec free tier)
    const isTron = (w.network === 'TRC20' || w.network === 'TRON');
    if (isTron) await new Promise(r=>setTimeout(r, 1100));
  }

  // BULK INSERT — single subrequest instead of N
  if (toInsert.length) {
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/blockchain_deposits`, {
      method:'POST',
      headers:{...headers,'Content-Type':'application/json','Prefer':'return=minimal,resolution=ignore-duplicates'},
      body: JSON.stringify(toInsert),
    });
    if (ins.ok) inserted = toInsert.length;
    else { errors = toInsert.length; }
  }

  // Telegram batch alert (only on chunks that found new deposits)
  if (newOnes.length && env.TELEGRAM_BOT_TOKEN) {
    const userIds = [...new Set(newOnes.map(d=>d.user_id).filter(Boolean))];
    let emails = {};
    if (userIds.length) {
      const uRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=in.(${userIds.join(',')})&select=id,email`, {headers});
      const users = await uRes.json();
      if (Array.isArray(users)) for (const u of users) emails[u.id] = u.email;
    }
    const totalAmt = newOnes.reduce((s,d)=>s+d.amount,0).toFixed(2);
    let msg = `🔔 <b>Yeni Para Geldi!</b>\n\n${newOnes.length} işlem · Toplam <b>${totalAmt} USDT</b>\n\n`;
    for (const d of newOnes.slice(0, 10)) {
      const email = emails[d.user_id] || 'atanmamış';
      msg += `💰 <b>${d.amount.toFixed(2)} USDT</b> (${d.network})\n👤 ${email}\n📥 <code>${d.wallet.slice(0,12)}...${d.wallet.slice(-6)}</code>\n\n`;
    }
    if (newOnes.length > 10) msg += `... ve ${newOnes.length-10} işlem daha`;
    await sendTelegramAlert(msg, env);
  }

  return {ok:true, scanned, found, inserted, errors,
          new_deposits: newOnes.length,
          offset, next_offset: nextOffset, total, done};
}

/* ═══════════════════════════════════════════════
   TELEGRAM BOT — KOMUT + BUTON + REPLY + GÜNLÜK ÖZET
═══════════════════════════════════════════════ */
async function tgApi(env, method, payload) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok:false, reason:'no_token' };
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload),
  });
  return r.json().catch(()=>({}));
}
// ── Otomatik İngilizce → Türkçe çeviri (Google Translate ücretsiz endpoint) ──
const TR_CACHE = new Map();
async function translateToTurkish(text) {
  try {
    if (!text) return text;
    const trimmed = String(text).slice(0, 3500);
    if (TR_CACHE.has(trimmed)) return TR_CACHE.get(trimmed);
    // HTML etiketlerini ve emojileri koru — sadece düz metin parçalarını gönder
    // Google translate HTML'i tanır, etiketleri korur
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(trimmed)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return text;
    const j = await r.json();
    // j[0] = [[ "translated", "original", ... ], ...]
    const out = (j[0] || []).map(seg => seg[0] || '').join('');
    const result = out || text;
    if (TR_CACHE.size > 500) TR_CACHE.clear();
    TR_CACHE.set(trimmed, result);
    return result;
  } catch { return text; }
}

async function tgSendMessage(env, text, opts={}) {
  // 'feed' kanalı varsa oraya, yoksa main'e yolla
  let chat_id = opts.chatId;
  let isAdminBroadcast = false;
  if (!chat_id) {
    if (opts.channel === 'feed' && env.TELEGRAM_FEED_CHAT_ID) {
      chat_id = env.TELEGRAM_FEED_CHAT_ID;
    } else {
      chat_id = env.TELEGRAM_ADMIN_CHAT_ID;
      isAdminBroadcast = true;
    }
  }
  if (!chat_id) return { ok:false, reason:'no_chat_id' };
  const buildPayload = (cid) => {
    const p = {
      chat_id: cid,
      text: String(text).slice(0, 3900),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (opts.keyboard) p.reply_markup = opts.keyboard;
    if (opts.replyTo) p.reply_to_message_id = opts.replyTo;
    if (opts.silent) p.disable_notification = true;
    return p;
  };
  // Fan-out to partner channel(s) when sending to admin
  const partnerId = env.TELEGRAM_PARTNER_CHAT_ID || '-1003760482893';
  if (isAdminBroadcast && partnerId && String(partnerId) !== String(chat_id)) {
    // fire-and-forget partner copy (don't block main send)
    tgApi(env, 'sendMessage', buildPayload(partnerId)).catch(() => {});
  }
  return tgApi(env, 'sendMessage', buildPayload(chat_id));
}
async function tgAnswerCallback(env, callback_query_id, text='', alert=false) {
  return tgApi(env, 'answerCallbackQuery', { callback_query_id, text, show_alert: alert });
}
async function tgEditMessageText(env, chat_id, message_id, text, keyboard) {
  const payload = { chat_id, message_id, text: String(text).slice(0,3900), parse_mode:'HTML', disable_web_page_preview:true };
  if (keyboard) payload.reply_markup = keyboard;
  return tgApi(env, 'editMessageText', payload);
}

// Supabase REST helper (service-role)
async function sb(env, path, opts={}) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (opts.prefer) headers.Prefer = opts.prefer;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!r.ok) return null;
    return r.json().catch(()=>null);
  } catch { return null; }
}

// Kullanıcıyı email veya UUID ile bul
async function findUser(env, query) {
  const q = String(query||'').trim();
  if (!q) return null;
  // UUID mi?
  if (/^[0-9a-f-]{30,}$/i.test(q)) {
    const r = await sb(env, `/user_profiles?id=eq.${encodeURIComponent(q)}&select=*&limit=1`);
    return r && r[0] ? r[0] : null;
  }
  // Email
  const r = await sb(env, `/user_profiles?email=eq.${encodeURIComponent(q)}&select=*&limit=1`);
  return r && r[0] ? r[0] : null;
}

// Telegram update'i route et (komut, callback, reply)
async function handleTelegramUpdate(update, env) {
  // Sadece admin chat ID'sinden gelenler
  const adminChatId = String(env.TELEGRAM_ADMIN_CHAT_ID || '');

  // 1) Buton tıklamaları
  if (update.callback_query) {
    const cb = update.callback_query;
    const fromChat = String(cb.message?.chat?.id || '');
    if (adminChatId && fromChat !== adminChatId) {
      return tgAnswerCallback(env, cb.id, '⛔ Yetkin yok', true);
    }
    return handleTgCallback(cb, env);
  }

  // 2) Mesajlar
  const msg = update.message || update.edited_message;
  if (!msg) return;
  const fromChat = String(msg.chat?.id || '');
  if (adminChatId && fromChat !== adminChatId) {
    return tgSendMessage(env, '⛔ Bu bot sadece yöneticiye açık.', { chatId: fromChat });
  }

  // 2a) Reply (admin destek mesajına cevap yazıyor)
  if (msg.reply_to_message?.text) {
    const orig = msg.reply_to_message.text;
    const ticketMatch = orig.match(/Ticket:\s*([0-9a-f-]{30,})/i);
    if (ticketMatch && msg.text) {
      return handleSupportReply(ticketMatch[1], msg.text, env, msg);
    }
  }

  // 2b) Komut
  const text = String(msg.text || '').trim();
  if (text.startsWith('/')) {
    return handleTgCommand(text, msg, env);
  }
}

// === KOMUT İŞLEYİCİSİ ===
async function handleTgCommand(text, msg, env) {
  const [cmd, ...args] = text.split(/\s+/);
  const argStr = args.join(' ');
  const c = cmd.toLowerCase().split('@')[0]; // /lock@MyBot → /lock

  if (c === '/start' || c === '/help') {
    return tgSendMessage(env,
`🤖 <b>BASONCE KONTROL BOTU</b>\n
<b>📋 SORGU KOMUTLARI:</b>
/users — son 10 kayıt
/user &lt;email&gt; — kullanıcı detayı
/balance — sistem bakiye toplamı
/today — bugünün özeti
/stats — 24 saatlik istatistik
/online — son 5 dk aktif kullanıcı
/withdrawals — bekleyen çekimler
/deposits — son 10 deposit
/tickets — açık destek talepleri
\n<b>⚙️ YÖNETİM KOMUTLARI:</b>
/lock &lt;email&gt; — hesabı kilitle
/unlock &lt;email&gt; — kilidi aç
/bonus &lt;email&gt; &lt;miktar&gt; — bonus ver (USDT)
/balance_set &lt;email&gt; &lt;sembol&gt; &lt;miktar&gt; — bakiye ayarla
/scan — wallet radar (BSC) tetikle
/scan_trx — wallet radar (TRON) tetikle
\n<b>💬 DESTEK:</b>
Destek bildirimine <b>"Reply"</b> ile cevap yazarsan kullanıcıya gider.`);
  }

  if (c === '/users') {
    const list = await sb(env, '/user_profiles?is_real_user=eq.true&order=created_at.desc&limit=10&select=email,full_name,created_at,is_active,user_id_display');
    if (!list || !list.length) return tgSendMessage(env, '📭 Kullanıcı bulunamadı.');
    const rows = list.map((u,i) => {
      const t = new Date(u.created_at).toLocaleString('tr-TR', {timeZone:'Europe/Istanbul'});
      const lock = u.is_active === false ? '🔒' : '✅';
      return `${i+1}. ${lock} <code>${u.email}</code>\n   ${t}`;
    }).join('\n');
    return tgSendMessage(env, `👥 <b>SON 10 KAYIT</b>\n\n${rows}`);
  }

  if (c === '/user') {
    if (!argStr) return tgSendMessage(env, '⚠️ Kullanım: /user &lt;email&gt;');
    const user = await findUser(env, argStr);
    if (!user) return tgSendMessage(env, `❌ Bulunamadı: ${argStr}`);
    const [bals, lastAct, deps] = await Promise.all([
      sb(env, `/user_balances?user_id=eq.${user.id}&select=symbol,balance`),
      sb(env, `/activity_log?user_id=eq.${user.id}&order=created_at.desc&limit=1&select=action,page,country,city,ip_address,created_at`),
      sb(env, `/blockchain_deposits?user_id=eq.${user.id}&select=amount,coin,created_at&order=created_at.desc&limit=3`),
    ]);
    const balStr = (bals||[]).map(b=>`  ${b.symbol}: <b>${parseFloat(b.balance).toFixed(4)}</b>`).join('\n') || '  (yok)';
    const last = lastAct && lastAct[0] ? lastAct[0] : null;
    const lastStr = last ? `${last.action} @ ${last.page} — ${last.country||''} ${last.city||''}\n${new Date(last.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}` : '(yok)';
    const depStr = (deps||[]).map(d=>`  ${parseFloat(d.amount).toFixed(2)} ${d.coin}`).join('\n') || '  (yok)';
    const lock = user.is_active === false ? '🔒 KİLİTLİ' : '✅ AKTİF';
    return tgSendMessage(env,
`👤 <b>${user.email}</b> ${lock}
🆔 <code>${user.id}</code>
📛 ${user.full_name || '-'}
📅 ${new Date(user.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}

💰 <b>Bakiye:</b>
${balStr}

💵 <b>Son Deposit'ler:</b>
${depStr}

🕒 <b>Son Aktivite:</b>
${lastStr}`,
      { keyboard: { inline_keyboard: [[
        { text: user.is_active === false ? '🔓 Kilidi Aç' : '🔒 Kilitle', callback_data: `${user.is_active===false?'unlock':'lock'}:${user.id}` },
        { text: '🎁 Bonus Ver', callback_data: `bonushint:${user.email}` },
      ]]}});
  }

  if (c === '/balance') {
    const r = await sb(env, '/user_balances?select=symbol,balance');
    if (!r) return tgSendMessage(env, '❌ Sorgu başarısız');
    const totals = {};
    for (const b of r) {
      const k = b.symbol;
      totals[k] = (totals[k] || 0) + parseFloat(b.balance);
    }
    const sorted = Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const txt = sorted.map(([s,v])=>`  ${s}: <b>${v.toFixed(4)}</b>`).join('\n');
    return tgSendMessage(env, `💰 <b>SİSTEM BAKİYE TOPLAMI</b>\n\n${txt}`);
  }

  if (c === '/today' || c === '/stats') {
    const since = c === '/today'
      ? new Date(new Date().setHours(0,0,0,0)).toISOString()
      : new Date(Date.now() - 24*3600*1000).toISOString();
    const [users, deps, withd, acts] = await Promise.all([
      sb(env, `/user_profiles?is_real_user=eq.true&created_at=gte.${since}&select=id`),
      sb(env, `/blockchain_deposits?created_at=gte.${since}&select=amount,coin`),
      sb(env, `/blockchain_withdrawals?created_at=gte.${since}&select=amount,coin,status`),
      sb(env, `/activity_log?created_at=gte.${since}&select=user_id`),
    ]);
    const uniqUsers = new Set((acts||[]).map(a=>a.user_id).filter(Boolean)).size;
    const depTot = (deps||[]).reduce((s,d)=>s+parseFloat(d.amount||0),0);
    const wTot = (withd||[]).reduce((s,d)=>s+parseFloat(d.amount||0),0);
    const label = c === '/today' ? 'BUGÜN' : 'SON 24 SAAT';
    return tgSendMessage(env,
`📊 <b>${label} ÖZET</b>\n
🆕 Yeni kayıt: <b>${users?.length || 0}</b>
💵 Deposit: <b>${(deps||[]).length}</b> işlem / <b>$${depTot.toFixed(2)}</b>
💸 Çekim: <b>${(withd||[]).length}</b> işlem / <b>$${wTot.toFixed(2)}</b>
👥 Aktif kullanıcı: <b>${uniqUsers}</b>
📈 Toplam aktivite: <b>${(acts||[]).length}</b>`);
  }

  if (c === '/online') {
    const since = new Date(Date.now() - 5*60*1000).toISOString();
    const acts = await sb(env, `/activity_log?created_at=gte.${since}&select=user_id,country,city,page,created_at&order=created_at.desc&limit=50`);
    if (!acts || !acts.length) return tgSendMessage(env, '😴 Şu an aktif kimse yok.');
    const uniq = new Map();
    for (const a of acts) if (a.user_id && !uniq.has(a.user_id)) uniq.set(a.user_id, a);
    const ids = [...uniq.keys()].slice(0,15);
    const profs = ids.length ? await sb(env, `/user_profiles?id=in.(${ids.join(',')})&select=id,email`) : [];
    const map = new Map((profs||[]).map(p=>[p.id, p.email]));
    const rows = [...uniq.values()].slice(0,15).map((a,i) => {
      const e = map.get(a.user_id) || a.user_id.slice(0,8);
      return `${i+1}. <code>${e}</code> — ${a.country||'?'}/${a.city||'?'} @ ${a.page}`;
    }).join('\n');
    return tgSendMessage(env, `🟢 <b>SON 5 DK AKTİF (${uniq.size})</b>\n\n${rows}`);
  }

  if (c === '/withdrawals') {
    const list = await sb(env, '/blockchain_withdrawals?status=eq.pending&order=created_at.desc&limit=10&select=id,user_id,amount,coin,to_address,created_at');
    if (!list || !list.length) return tgSendMessage(env, '✅ Bekleyen çekim yok.');
    for (const w of list) {
      const u = w.user_id ? await sb(env, `/user_profiles?id=eq.${w.user_id}&select=email&limit=1`) : null;
      const email = u && u[0] ? u[0].email : w.user_id;
      await tgSendMessage(env,
`💸 <b>BEKLEYEN ÇEKİM</b>
👤 <code>${email}</code>
💰 <b>${parseFloat(w.amount).toFixed(4)} ${w.coin}</b>
📍 <code>${w.to_address}</code>
📅 ${new Date(w.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}`,
        { keyboard: { inline_keyboard: [[
          { text:'✅ Onayla', callback_data: `wapprove:${w.id}` },
          { text:'❌ Reddet', callback_data: `wreject:${w.id}` },
        ]]}});
    }
    return;
  }

  if (c === '/deposits') {
    const list = await sb(env, '/blockchain_deposits?order=created_at.desc&limit=10&select=user_id,amount,coin,from_address,tx_hash,created_at');
    if (!list || !list.length) return tgSendMessage(env, '📭 Henüz deposit yok.');
    const rows = list.map((d,i)=>`${i+1}. <b>${parseFloat(d.amount).toFixed(2)} ${d.coin}</b>\n   ${new Date(d.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}`).join('\n');
    return tgSendMessage(env, `💵 <b>SON 10 DEPOSIT</b>\n\n${rows}`);
  }

  if (c === '/tickets') {
    const list = await sb(env, '/support_tickets?status=eq.open&order=created_at.desc&limit=10&select=id,user_id,subject,created_at');
    if (!list || !list.length) return tgSendMessage(env, '✅ Açık destek talebi yok.');
    const rows = list.map((t,i)=>`${i+1}. <code>${t.id.slice(0,8)}</code> — ${t.subject||'(konu yok)'}`).join('\n');
    return tgSendMessage(env, `💬 <b>AÇIK DESTEK TALEPLERİ</b>\n\n${rows}`);
  }

  if (c === '/lock' || c === '/unlock') {
    if (!argStr) return tgSendMessage(env, `⚠️ Kullanım: ${c} &lt;email&gt;`);
    const user = await findUser(env, argStr);
    if (!user) return tgSendMessage(env, `❌ Bulunamadı: ${argStr}`);
    const newState = c === '/unlock';
    await sb(env, `/user_profiles?id=eq.${user.id}`, {
      method:'PATCH',
      body: { is_active: newState, updated_at: new Date().toISOString() },
    });
    return tgSendMessage(env, `${newState ? '🔓 KİLİT AÇILDI' : '🔒 KİLİTLENDİ'}: <code>${user.email}</code>`);
  }

  if (c === '/bonus') {
    const m = argStr.match(/^(\S+)\s+([\d.]+)$/);
    if (!m) return tgSendMessage(env, '⚠️ Kullanım: /bonus &lt;email&gt; &lt;miktar&gt;');
    const [, email, amtStr] = m;
    const amt = parseFloat(amtStr);
    if (!amt || amt <= 0) return tgSendMessage(env, '❌ Miktar geçersiz');
    const user = await findUser(env, email);
    if (!user) return tgSendMessage(env, `❌ Bulunamadı: ${email}`);
    // USDT bakiyesini artır
    const cur = await sb(env, `/user_balances?user_id=eq.${user.id}&symbol=eq.USDT&limit=1`);
    if (cur && cur[0]) {
      const nb = parseFloat(cur[0].balance) + amt;
      await sb(env, `/user_balances?user_id=eq.${user.id}&symbol=eq.USDT`, {
        method:'PATCH', body:{ balance: nb, updated_at: new Date().toISOString() },
      });
    } else {
      await sb(env, '/user_balances', {
        method:'POST',
        body:{ user_id: user.id, symbol:'USDT', balance: amt },
      });
    }
    // Wagering kaydı
    await sb(env, '/activity_log', {
      method:'POST',
      body:{
        user_id: user.id, action:'bonus_received', page:'system',
        metadata:{ amount_usdt: amt, bonus_type:'admin_telegram', wagering_required: amt*5 },
      },
    });
    return tgSendMessage(env, `🎁 <b>${amt} USDT bonus verildi</b>\n👤 ${user.email}\n📊 Wagering şartı: $${(amt*5).toFixed(2)}`);
  }

  if (c === '/balance_set') {
    const m = argStr.match(/^(\S+)\s+(\S+)\s+([\d.]+)$/);
    if (!m) return tgSendMessage(env, '⚠️ Kullanım: /balance_set &lt;email&gt; &lt;sembol&gt; &lt;miktar&gt;');
    const [, email, symRaw, amtStr] = m;
    const sym = symRaw.toUpperCase();
    const amt = parseFloat(amtStr);
    const user = await findUser(env, email);
    if (!user) return tgSendMessage(env, `❌ Bulunamadı: ${email}`);
    const cur = await sb(env, `/user_balances?user_id=eq.${user.id}&symbol=eq.${sym}&limit=1`);
    if (cur && cur[0]) {
      await sb(env, `/user_balances?user_id=eq.${user.id}&symbol=eq.${sym}`, {
        method:'PATCH', body:{ balance: amt, updated_at: new Date().toISOString() },
      });
    } else {
      await sb(env, '/user_balances', { method:'POST', body:{ user_id: user.id, symbol: sym, balance: amt } });
    }
    return tgSendMessage(env, `✅ <code>${user.email}</code> ${sym} = <b>${amt}</b>`);
  }

  if (c === '/scan' || c === '/scan_trx') {
    const which = c === '/scan_trx' ? 'trx' : 'main';
    const r = await scanAllWallets(env, which);
    return tgSendMessage(env, `🛰️ <b>${which.toUpperCase()} TARAMA</b>\nTarandı: ${r.scanned}\nBulundu: ${r.found}\nYeni: ${r.new_deposits}\nHata: ${r.errors||0}`);
  }

  return tgSendMessage(env, `❓ Bilinmeyen komut: ${cmd}\n/help → komut listesi`);
}

// === BUTON İŞLEYİCİSİ ===
async function handleTgCallback(cb, env) {
  const data = String(cb.data || '');
  const [action, ...rest] = data.split(':');
  const id = rest.join(':');

  if (action === 'lock' || action === 'unlock') {
    const newState = action === 'unlock';
    await sb(env, `/user_profiles?id=eq.${id}`, {
      method:'PATCH', body: { is_active: newState, updated_at: new Date().toISOString() },
    });
    await tgAnswerCallback(env, cb.id, newState ? '🔓 Açıldı' : '🔒 Kilitlendi');
    return tgSendMessage(env, `${newState ? '🔓 KİLİT AÇILDI' : '🔒 KİLİTLENDİ'}: <code>${id.slice(0,8)}</code>`);
  }

  if (action === 'wapprove') {
    await sb(env, `/blockchain_withdrawals?id=eq.${id}`, {
      method:'PATCH', body: { status:'approved', approved_at: new Date().toISOString() },
    });
    await tgAnswerCallback(env, cb.id, '✅ Onaylandı');
    return tgEditMessageText(env, cb.message.chat.id, cb.message.message_id,
      `${cb.message.text}\n\n<b>✅ ONAYLANDI</b> (${new Date().toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})})`);
  }

  if (action === 'wreject') {
    await sb(env, `/blockchain_withdrawals?id=eq.${id}`, {
      method:'PATCH', body: { status:'rejected', rejected_at: new Date().toISOString() },
    });
    await tgAnswerCallback(env, cb.id, '❌ Reddedildi');
    return tgEditMessageText(env, cb.message.chat.id, cb.message.message_id,
      `${cb.message.text}\n\n<b>❌ REDDEDİLDİ</b> (${new Date().toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})})`);
  }

  if (action === 'mute') {
    await tgAnswerCallback(env, cb.id, '🔕 Susturuldu');
    return tgEditMessageText(env, cb.message.chat.id, cb.message.message_id,
      `${cb.message.text}\n\n<i>🔕 Alarm susturuldu</i>`);
  }

  if (action === 'bonushint') {
    await tgAnswerCallback(env, cb.id, '');
    return tgSendMessage(env, `Şu komutu yaz:\n<code>/bonus ${id} 50</code>`);
  }

  return tgAnswerCallback(env, cb.id, '❓ Bilinmeyen aksiyon');
}

// === DESTEK CEVABI ===
async function handleSupportReply(ticketId, replyText, env, msg) {
  // support_messages tablosuna admin cevabı ekle
  const r = await sb(env, '/support_messages', {
    method:'POST',
    prefer:'return=representation',
    body: {
      ticket_id: ticketId,
      sender_type: 'admin',
      sender_name: 'Admin',
      message: replyText,
      original_message: replyText,
      original_language: 'tr',
      read: false,
    },
  });
  if (r) {
    return tgSendMessage(env, `✅ Cevap gönderildi → ticket <code>${ticketId.slice(0,8)}</code>`, { replyTo: msg.message_id });
  }
  return tgSendMessage(env, `❌ Cevap gönderilemedi (ticket bulunamadı)`, { replyTo: msg.message_id });
}

// === GÜNLÜK ÖZET (cron) ===
async function sendDailySummary(env) {
  const since = new Date(new Date().setHours(0,0,0,0)).toISOString();
  const [users, deps, withd, acts] = await Promise.all([
    sb(env, `/user_profiles?is_real_user=eq.true&created_at=gte.${since}&select=id,email,country`),
    sb(env, `/blockchain_deposits?created_at=gte.${since}&select=amount,coin`),
    sb(env, `/blockchain_withdrawals?created_at=gte.${since}&select=amount,coin,status`),
    sb(env, `/activity_log?created_at=gte.${since}&select=user_id`),
  ]);
  const uniqUsers = new Set((acts||[]).map(a=>a.user_id).filter(Boolean)).size;
  const depTot = (deps||[]).reduce((s,d)=>s+parseFloat(d.amount||0),0);
  const wTot = (withd||[]).reduce((s,d)=>s+parseFloat(d.amount||0),0);
  return tgSendMessage(env,
`🌙 <b>GÜNLÜK ÖZET</b>\n
🆕 Yeni kayıt: <b>${users?.length || 0}</b>
💵 Deposit: <b>${(deps||[]).length}</b> / <b>$${depTot.toFixed(2)}</b>
💸 Çekim: <b>${(withd||[]).length}</b> / <b>$${wTot.toFixed(2)}</b>
👥 Aktif: <b>${uniqUsers}</b>
📈 Aktivite: <b>${(acts||[]).length}</b>

🔗 https://basonce.com`);
}

/* ═══════════════════════════════════════════════
   MAIN CLOUDFLARE WORKER
═══════════════════════════════════════════════ */
// Internal helper used by both HTTP /cron/scan-all and native scheduled() handler.
// CF Workers free plan = 50 subrequests per invocation. Each scan chunk of N wallets
// costs roughly: 2 (load wallets + dedupe) + 1 (BSC batched logs) or N (TRON 1-per-wallet)
// + 1 (bulk insert) = ~5 for BSC, ~N+3 for TRON. To stay safely under 50, we scan ONE
// small chunk per part per cron tick and rotate the offset deterministically using the
// current minute. With chunkSize=8 and ~68 wallets, the entire pool cycles in ~9 minutes
// at a 1-min cron interval (or ~17 min at 2-min interval).
async function runFullScan(env, _budgetMs = 24000) {
  const startedAt = Date.now();
  const aggregate = { started_at: new Date(startedAt).toISOString(), parts: {} };
  const chunkSize = 8;
  // Use a coarse 2-minute time bucket so back-to-back invocations don't repeat the same chunk.
  const bucket = Math.floor(Date.now() / 120000);
  for (const part of ['main','trx']) {
    const partStart = Date.now();
    // Quick total-count probe so we know how many chunks exist (1 subrequest, head-only).
    const baseUrl = `${SUPABASE_URL}/rest/v1/wallet_pool?is_assigned=eq.true&select=id`;
    const filter = part === 'trx'
      ? `&network=in.(TRC20,TRON)`
      : `&network=in.(BEP20,BSC,TRC20,TRON)`;
    const headHeaders = {
      Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey:env.SUPABASE_SERVICE_ROLE_KEY,
      Range: '0-0', Prefer: 'count=exact',
    };
    let total = 0;
    try {
      const head = await fetch(baseUrl + filter, { method:'HEAD', headers: headHeaders });
      const cr = head.headers.get('content-range') || '*/0';
      total = parseInt(cr.split('/')[1] || '0', 10) || 0;
    } catch {}
    const chunks = Math.max(1, Math.ceil(total / chunkSize));
    const chunkIndex = ((bucket % chunks) + chunks) % chunks;
    const offset = chunkIndex * chunkSize;
    const r = await scanAllWallets(env, part, { offset, limit: chunkSize });
    aggregate.parts[part] = {
      total_assigned: total, chunks, chunk_index: chunkIndex,
      scanned: r?.scanned || 0, new_deposits: r?.new_deposits || 0,
      inserted: r?.inserted || 0, errors: r?.errors || 0,
      offset, part_ms: Date.now() - partStart,
      ...(r?.error ? { error: r.error } : {}),
    };
  }
  aggregate.elapsed_ms = Date.now() - startedAt;
  aggregate.bucket = bucket;
  return aggregate;
}

/* ═══════════════════════════════════════════════
   BNC MINER (Telegram Mini App) — MSOL-clone backend
═══════════════════════════════════════════════ */
const MINER_OPERATOR_WALLET = 'UQCeytNeGzjIuutg5vZJETyrlg7Mqp0Vm4a0iU7RRTihqh6n';
const MINER_BASE_HASH   = 0.000000163; // BNC per second (starting power)
const MINER_WITHDRAW_MIN = 100;        // BNC threshold
const MINER_USDT_RATE    = 0.001;      // USDT credited per BNC
const MINER_REF_REWARD   = 0.1;        // BNC to referrer per new invitee
// Purchase-intent amount binding (anti front-run). Each box purchase reserves a
// unique on-chain amount = box price + (1..KMAX)*GRID nanotons. Amounts sit on a
// 0.0001-TON grid (>> TOL) so distinct intents never overlap; max surcharge is
// KMAX*GRID = 0.02 TON. TOL absorbs any wallet fwd-fee dust on the received value.
const MINER_INTENT_GRID = 100000;      // 0.0001 TON per slot (nanotons)
const MINER_INTENT_KMAX = 200;         // up to +0.02 TON surcharge, 200 slots/tier
const MINER_INTENT_TOL  = 40000;       // ±0.00004 TON match tolerance (< grid/2)
const MINER_INTENT_TTL  = 3600;        // intent valid 60 min (> 30-min tx window)
const MINER_BOXES = {
  core:    { price: 1,   yield: 0.0187488 },
  flux:    { price: 2,   yield: 0.0375840 },
  pulse:   { price: 5,   yield: 0.0563328 },
  vector:  { price: 10,  yield: 0.0750816 },
  matrix:  { price: 20,  yield: 0.1126656 },
  quantum: { price: 50,  yield: 0.2252448 },
  hyper:   { price: 100, yield: 0.4827168 },
  prime:   { price: 200, yield: 1.1262240 },
};
const MINER_TASKS = {
  basonce_channel: 0.01, boost_channel: 0.01, share_story: 0.01, invite_5: 0.1,
  earntether: 0.001, eth_miner: 0.001, ton_power_mine: 0.001,
  facebook: 0.001, to_new: 0.001, surprise_unbox: 0.001,
};

async function hmacSha256(keyBytes, msgStr) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msgStr));
  return new Uint8Array(sig);
}

// Validate Telegram WebApp initData. Returns the user object on success, else null.
async function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const pairs = [];
    for (const [k, v] of params) pairs.push(`${k}=${v}`);
    pairs.sort();
    const dcs = pairs.join('\n');
    const enc = new TextEncoder();
    const secret = await hmacSha256(enc.encode('WebAppData'), botToken);
    const computed = await hmacSha256(secret, dcs);
    const computedHex = [...computed].map(b => b.toString(16).padStart(2, '0')).join('');
    if (computedHex !== hash) return null;
    const authDate = Number(params.get('auth_date') || 0);
    if (authDate && (Date.now() / 1000 - authDate) > 86400) return null; // stale > 24h
    const userJson = params.get('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch { return null; }
}

async function sbInsert(table, row, env, prefer) {
  const r = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: { ...restHeaders(env), 'Content-Type':'application/json', Prefer: prefer || 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`${r.status}:${await r.text()}`);
  return r.json().catch(() => []);
}

async function minerGetState(tgId, env) {
  const rows = await sbGet('tg_miner_state', `?telegram_user_id=eq.${tgId}&select=*&limit=1`, env);
  return rows[0] || null;
}

async function minerEnsureState(tgUser, refByRaw, env) {
  const tgId = Number(tgUser.id);
  let s = await minerGetState(tgId, env);
  if (s) return s;
  let refBy = null;
  const rb = Number(refByRaw);
  if (rb && rb !== tgId && Number.isFinite(rb)) {
    const refRow = await minerGetState(rb, env);
    if (refRow) refBy = rb;
  }
  const row = {
    telegram_user_id: tgId,
    telegram_username: tgUser.username || null,
    hash_rate: MINER_BASE_HASH,
    bsc_balance: 0, total_claimed: 0, invited_count: 0,
    last_claim_at: new Date().toISOString(),
    ref_code: String(tgId),
    ref_by: refBy,
  };
  try {
    const ins = await sbInsert('tg_miner_state', row, env);
    s = Array.isArray(ins) ? ins[0] : ins;
  } catch {
    // Race / duplicate PK — row already created concurrently
    return await minerGetState(tgId, env);
  }
  if (refBy) {
    const ref = await minerGetState(refBy, env);
    if (ref) {
      await sbPatch('tg_miner_state', `?telegram_user_id=eq.${refBy}`, {
        invited_count: Number(ref.invited_count || 0) + 1,
        bsc_balance: Number(ref.bsc_balance || 0) + MINER_REF_REWARD,
      }, env);
    }
  }
  return s;
}

async function minerPublicState(tgId, env) {
  const s = await minerGetState(tgId, env);
  if (!s) return null;
  const [boxes, tasks] = await Promise.all([
    sbGet('tg_miner_boxes', `?telegram_user_id=eq.${tgId}&select=box_tier,tx_hash,purchased_at`, env),
    sbGet('tg_miner_tasks', `?telegram_user_id=eq.${tgId}&select=task_key`, env),
  ]);
  return {
    hash_rate: Number(s.hash_rate),
    bsc_balance: Number(s.bsc_balance),
    total_claimed: Number(s.total_claimed),
    last_claim_at: Date.parse(s.last_claim_at),
    boxes_owned: boxes.map(b => `${b.box_tier}:${Date.parse(b.purchased_at)}:${(b.tx_hash || '').slice(0, 8)}`),
    tasks_done: tasks.map(t => t.task_key),
    ref_by: s.ref_by ? String(s.ref_by) : null,
    invited_count: Number(s.invited_count || 0),
    linked: !!s.linked_user_id,
  };
}

// Look for a recent incoming TON payment to the operator wallet matching the exact
// per-intent amount (nanotons). Because each active intent reserves a unique amount,
// an exact-amount match maps a payment to exactly one intent/owner. Returns candidate
// txs (most recent first); tx_hash uniqueness in miner_upgrade prevents double-credit.
async function minerVerifyTon(expectedNano, env) {
  const url = `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(MINER_OPERATOR_WALLET)}&limit=40&archival=false`;
  const headers = env.TONCENTER_API_KEY ? { 'X-API-Key': env.TONCENTER_API_KEY } : {};
  const r = await fetch(url, { headers });
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  if (!j || !j.ok || !Array.isArray(j.result)) return [];
  const nowSec = Date.now() / 1000;
  const targetNano = Number(expectedNano);
  const matches = [];
  for (const tx of j.result) {
    const inMsg = tx.in_msg;
    if (!inMsg) continue;
    const val = Number(inMsg.value || 0);
    if (Math.abs(val - targetNano) > MINER_INTENT_TOL) continue;
    const utime = Number(tx.utime || 0);
    if (nowSec - utime > 1800) continue; // within last 30 min
    const hash = tx.transaction_id && tx.transaction_id.hash;
    if (!hash) continue;
    matches.push({ hash, utime, source: inMsg.source || '' });
  }
  matches.sort((a, b) => b.utime - a.utime);
  return matches;
}

/* ═══════════════════════════════════════════════
   BASONCE MARKET — Polymarket prediction markets
   Real markets via the public Gamma API (no auth).
   Parimutuel pools settled from Polymarket's real
   resolution. Basonce bears zero counterparty risk.
═══════════════════════════════════════════════ */
const PM_GAMMA = 'https://gamma-api.polymarket.com';
const PM_UA = { 'User-Agent': 'basonce-market/1.0', 'Accept': 'application/json' };

function pmParseArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
  return [];
}

/* ── UP/DOWN 5-minute parimutuel rounds ──────────────────────────────
   All coins share one clock: a 310s cycle = 300s OPEN betting + 10s
   RESOLVE gap. round_index = floor(epoch/310). Settlement is server
   authoritative: open/close prices are Coinbase spot captured by THIS
   worker, never trusted from the client. */
const UOD_COINS = { BTC:'BTC-USD', ETH:'ETH-USD', SOL:'SOL-USD', XRP:'XRP-USD', DOGE:'DOGE-USD' };
const UOD_ROUND_SECS = 300;
const UOD_CYCLE = 310;            // 300s betting + 10s resolve
const UOD_TICK_THROTTLE = 3;      // at most one global tick every N seconds
const UOD_BET_CUTOFF = 20;        // betting closes this many seconds before lock

function uodClock(nowSec) {
  const idx = Math.floor(nowSec / UOD_CYCLE);
  const openAt = idx * UOD_CYCLE;
  const lockAt = openAt + UOD_ROUND_SECS;
  const pos = nowSec - openAt;     // 0..310
  const phase = pos < UOD_ROUND_SECS ? 'open' : 'resolving';
  const countdown = phase === 'open' ? (UOD_ROUND_SECS - pos) : (UOD_CYCLE - pos);
  return { idx, openAt, lockAt, phase, countdown };
}

async function uodSpotPrices() {
  const out = {};
  await Promise.all(Object.entries(UOD_COINS).map(async ([coin, prod]) => {
    try {
      const r = await fetch(`https://api.exchange.coinbase.com/products/${prod}/ticker`, { headers: PM_UA });
      if (!r.ok) return;
      const j = await r.json();
      const p = Number(j.price);
      if (Number.isFinite(p) && p > 0) out[coin] = p;
    } catch {}
  }));
  return out;
}

// Pull top active events (grouped markets) by 24h volume and upsert every binary
// Yes/No market into pm_markets via the pm_sync_market RPC (metadata only — never
// touches pools or resolved markets).
async function pmSyncMarkets(env, limit = 80) {
  const url = `${PM_GAMMA}/events?closed=false&active=true&archived=false&order=volume24hr&ascending=false&limit=${limit}`;
  const r = await fetch(url, { headers: PM_UA });
  if (!r.ok) throw new Error('gamma events ' + r.status);
  const events = await r.json();
  let synced = 0;
  for (let ei = 0; ei < (Array.isArray(events) ? events.length : 0); ei++) {
    const ev = events[ei];
    const category = (ev.tags && ev.tags.length ? (ev.tags[0].label || ev.tags[0].slug) : null) || 'Trending';
    const markets = Array.isArray(ev.markets) ? ev.markets : [];
    let mi = 0;
    for (const m of markets) {
      if (m.closed || m.archived || m.active === false) continue;
      const outcomes = pmParseArr(m.outcomes).map((s) => String(s));
      const prices = pmParseArr(m.outcomePrices).map(Number);
      if (outcomes.length !== 2) continue;
      const yi = outcomes.findIndex((o) => o.toLowerCase() === 'yes');
      const ni = outcomes.findIndex((o) => o.toLowerCase() === 'no');
      if (yi < 0 || ni < 0) continue; // only binary Yes/No markets
      const liveYes = Number.isFinite(prices[yi]) ? prices[yi] : null;
      const liveNo = Number.isFinite(prices[ni]) ? prices[ni] : null;
      const question = String(m.question || m.groupItemTitle || ev.title || '').trim();
      if (!question) continue;
      const image = m.image || m.icon || ev.image || ev.icon || null;
      const endDate = m.endDate || ev.endDate || null;
      const volume = Number(m.volume || m.volumeNum || m.volume24hr || 0) || 0;
      const featured = ei < 8 && mi === 0; // a handful of hero markets
      try {
        await sbRpc('pm_sync_market', {
          p_source_id: String(m.id),
          p_condition_id: m.conditionId || null,
          p_slug: m.slug || ev.slug || null,
          p_question: question,
          p_category: category,
          p_image: image,
          p_end_date: endDate,
          p_live_yes: liveYes,
          p_live_no: liveNo,
          p_volume: volume,
          p_featured: featured,
        }, env);
        synced++;
        mi++;
      } catch { /* skip individual market failures */ }
    }
  }
  return synced;
}

// Check our OPEN markets against Polymarket and settle the ones that resolved.
// A market is resolved when Polymarket reports closed=true AND outcome prices
// have collapsed to ~[1,0] / ~[0,1] (a clear winner).
async function pmSettleResolved(env, maxPages = 30, pageSize = 100) {
  let checked = 0, settled = 0, cursor = '';
  // Page through EVERY open market by ascending id cursor. Using a cursor (not
  // a bare limit/offset) guarantees full coverage and avoids skips even as rows
  // leave the open set when they get settled mid-run — so funds never stay stuck.
  for (let page = 0; page < maxPages; page++) {
    let q = `?status=eq.open&select=id,source_id&order=id.asc&limit=${pageSize}`;
    if (cursor) q += `&id=gt.${encodeURIComponent(cursor)}`;
    const open = await sbGet('pm_markets', q, env);
    if (!Array.isArray(open) || !open.length) break;
    cursor = open[open.length - 1].id; // advance by id regardless of settlement

    const ids = open.map((o) => o.source_id).filter(Boolean);
    const byId = {};
    for (let i = 0; i < ids.length; i += 20) {
      const chunk = ids.slice(i, i + 20);
      const qs = chunk.map((id) => 'id=' + encodeURIComponent(id)).join('&');
      try {
        const r = await fetch(`${PM_GAMMA}/markets?${qs}&limit=20`, { headers: PM_UA });
        if (!r.ok) continue;
        const arr = await r.json();
        for (const m of (Array.isArray(arr) ? arr : [])) byId[String(m.id)] = m;
      } catch { /* ignore chunk errors */ }
    }

    for (const row of open) {
      const m = byId[String(row.source_id)];
      if (!m) continue;
      checked++;
      const closed = m.closed === true || m.closed === 'true';
      if (!closed) continue;
      const outcomes = pmParseArr(m.outcomes).map((s) => String(s));
      const prices = pmParseArr(m.outcomePrices).map(Number);
      if (outcomes.length !== 2 || prices.length !== 2) continue;
      let winIdx = -1;
      if (prices[0] >= 0.99 && prices[1] <= 0.01) winIdx = 0;
      else if (prices[1] >= 0.99 && prices[0] <= 0.01) winIdx = 1;
      if (winIdx < 0) continue; // closed but not cleanly resolved yet
      const w = outcomes[winIdx].toLowerCase();
      const winner = w === 'yes' ? 'Yes' : (w === 'no' ? 'No' : null);
      if (!winner) continue;
      try {
        await sbRpc('pm_settle_market', { p_market_id: row.id, p_winning_outcome: winner }, env);
        settled++;
      } catch { /* ALREADY_SETTLED or transient — retried next run */ }
    }

    if (open.length < pageSize) break;
  }
  return { checked, settled };
}

async function pmRunSyncAndSettle(env) {
  const out = { synced: 0, checked: 0, settled: 0, errors: [] };
  try { out.synced = await pmSyncMarkets(env, 80); } catch (e) { out.errors.push('sync:' + (e.message || e)); }
  try { const s = await pmSettleResolved(env, 60); out.checked = s.checked; out.settled = s.settled; } catch (e) { out.errors.push('settle:' + (e.message || e)); }
  return out;
}

export default {
  // Native Cloudflare Cron Trigger handler — fires whenever wrangler cron schedule hits.
  // For Pages Functions deployments without cron triggers, /cron/scan-all is the fallback
  // (hit it from cron-job.org or UptimeRobot every 1-2 minutes).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runFullScan(env, 25000).then(async (res) => {
      if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID) {
        const m = res.parts?.main || {}, t = res.parts?.trx || {};
        const totalNew = (m.new_deposits||0) + (t.new_deposits||0);
        if (totalNew > 0) {
          await sendTelegramAlert(`🤖 <b>Otomatik tarama tamamlandı</b>\nYeni: ${totalNew} işlem · BSC ${m.scanned||0} cüzdan, TRON ${t.scanned||0} cüzdan · ${res.elapsed_ms}ms`, env);
        }
      }
    }).catch(()=>{}));
    // Basonce Market: refresh Polymarket markets + auto-settle resolved ones.
    ctx.waitUntil(pmRunSyncAndSettle(env).catch(()=>{}));
  },
  async fetch(request, env) {
    const method = request.method;

    if (method === 'OPTIONS') return new Response('', {status:204, headers:CORS});

    const url = new URL(request.url);
    let path = url.pathname.replace(/^\/api\//, '/').replace(/^\/api-server\/api\//, '/');

    // Only handle /api/* routes; everything else = static assets
    if (!url.pathname.startsWith('/api/')) {
      const assetRes = await env.ASSETS.fetch(request);
      const ct = assetRes.headers.get('content-type') || '';
      // Never cache HTML at the edge — otherwise users keep loading old chunks after deploys
      // and end up stuck on the "Güncelleniyor..." spinner. Hashed JS/CSS in /assets/ stay cached.
      if (ct.includes('text/html')) {
        const h = new Headers(assetRes.headers);
        h.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        h.set('CDN-Cache-Control', 'no-store');
        h.set('Cloudflare-CDN-Cache-Control', 'no-store');
        h.set('Pragma', 'no-cache');
        h.set('Expires', '0');
        return new Response(assetRes.body, { status: assetRes.status, headers: h });
      }
      return assetRes;
    }

    let body = {};
    if (!['GET','HEAD','OPTIONS'].includes(method)) {
      try { body = await request.json(); } catch {}
    }

    const q = Object.fromEntries(url.searchParams);

    try {
      /* ── HEALTH ── */
      if (method==='GET' && path==='/healthz') return ok({status:'ok',platform:'cloudflare'});

      /* ── BASONCE MARKET — prediction markets (parimutuel, real Polymarket) ── */
      if (path==='/predictions/markets' && method==='GET') {
        const sel = 'id,source_id,question,category,image,end_date,status,winning_outcome,live_yes,live_no,volume,yes_pool,no_pool,bet_count,featured';
        let query = `?status=eq.open&select=${sel}&order=featured.desc,volume.desc&limit=150`;
        const cat = q.category && q.category !== 'All' ? q.category : '';
        if (cat) query += `&category=eq.${encodeURIComponent(cat)}`;
        if (q.q) query += `&question=ilike.${encodeURIComponent('*' + q.q + '*')}`;
        const markets = await sbGet('pm_markets', query, env);
        let categories = [];
        try {
          const cats = await sbGet('pm_markets', '?status=eq.open&select=category', env);
          categories = [...new Set((cats || []).map((c) => c.category).filter(Boolean))].sort();
        } catch {}
        return ok({ markets: markets || [], categories });
      }
      if (path==='/predictions/my-bets' && method==='GET') {
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Sign in to view your bets');
        const bets = await sbGet('pm_bets', `?user_id=eq.${uid}&select=*,pm_markets(question,image,status,winning_outcome,category)&order=created_at.desc&limit=100`, env);
        return ok({ bets: bets || [] });
      }
      if (path==='/predictions/activity' && method==='GET') {
        // Public live tape of REAL recent bets across the platform. No user
        // identity is exposed — only side, amount, time and the market — so it
        // mirrors Polymarket's public trade tape without leaking who bet.
        let bets = [];
        try {
          bets = await sbGet('pm_bets', `?select=id,market_id,outcome,amount,created_at,pm_markets(question,image,category)&order=created_at.desc&limit=50`, env);
        } catch {}
        return ok({ bets: bets || [] });
      }
      if (path.startsWith('/predictions/history/') && method==='GET') {
        // REAL Polymarket price history for the Yes outcome: resolve the market's
        // Gamma source -> clobTokenIds[Yes] -> CLOB prices-history. Never fabricated;
        // on any upstream failure we honestly return an empty series.
        const id = path.slice('/predictions/history/'.length);
        if (!id) return err(400, 'market id required');
        const rows = await sbGet('pm_markets', `?id=eq.${encodeURIComponent(id)}&select=source_id&limit=1`, env);
        const src = rows && rows[0] && rows[0].source_id;
        if (!src) return err(404, 'Market not found');
        const interval = ['1h','6h','1d','1w','max'].includes(q.interval) ? q.interval : '1w';
        const fidelity = interval==='1h'?1:interval==='6h'?10:interval==='1d'?30:interval==='1w'?180:720;
        try {
          const gr = await fetch(`${PM_GAMMA}/markets?id=${encodeURIComponent(src)}&limit=1`, { headers: PM_UA });
          if (!gr.ok) return ok({ points: [] });
          const arr = await gr.json();
          const m = Array.isArray(arr) ? arr[0] : null;
          if (!m) return ok({ points: [] });
          const outcomes = pmParseArr(m.outcomes).map((s) => String(s).toLowerCase());
          const toks = pmParseArr(m.clobTokenIds);
          const yi = outcomes.findIndex((o) => o === 'yes');
          if (yi < 0) return ok({ points: [] });
          const tok = toks[yi];
          if (!tok) return ok({ points: [] });
          const cr = await fetch(`https://clob.polymarket.com/prices-history?market=${encodeURIComponent(tok)}&interval=${interval}&fidelity=${fidelity}`, { headers: PM_UA });
          if (!cr.ok) return ok({ points: [] });
          const cj = await cr.json();
          const points = (cj && Array.isArray(cj.history) ? cj.history : [])
            .map((h) => ({ t: Number(h.t), p: Number(h.p) }))
            .filter((h) => Number.isFinite(h.t) && Number.isFinite(h.p));
          return ok({ points });
        } catch { return ok({ points: [] }); }
      }
      if (path.startsWith('/predictions/market/') && method==='GET') {
        const id = path.slice('/predictions/market/'.length);
        if (!id) return err(400, 'market id required');
        const rows = await sbGet('pm_markets', `?id=eq.${encodeURIComponent(id)}&limit=1`, env);
        const market = rows && rows[0];
        if (!market) return err(404, 'Market not found');
        let myBets = [];
        const uid = await getAuthedUserId(request, env);
        if (uid) {
          try { myBets = await sbGet('pm_bets', `?market_id=eq.${encodeURIComponent(id)}&user_id=eq.${uid}&order=created_at.desc`, env); } catch {}
        }
        return ok({ market, myBets: myBets || [] });
      }
      if (path==='/predictions/bet' && method==='POST') {
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Sign in to place a bet');
        const marketId = String(body.market_id || '');
        const outcome = String(body.outcome || '');
        const amount = Number(body.amount);
        if (!marketId) return err(400, 'market_id required');
        if (outcome !== 'Yes' && outcome !== 'No') return err(400, 'Outcome must be Yes or No');
        if (!Number.isFinite(amount) || amount < 1) return err(400, 'Minimum bet is 1 USDT');
        if (amount > 100000) return err(400, 'Maximum bet is 100000 USDT');
        try {
          const res = await sbRpc('pm_place_bet', { p_user_id: uid, p_market_id: marketId, p_outcome: outcome, p_amount: Math.round(amount * 1e8) / 1e8 }, env);
          return ok(res);
        } catch (e) {
          const msg = String(e.message || e);
          if (msg.includes('INSUFFICIENT_BALANCE')) return err(400, 'Insufficient USDT balance');
          if (msg.includes('MARKET_CLOSED') || msg.includes('MARKET_ENDED')) return err(400, 'This market is closed');
          if (msg.includes('MARKET_NOT_FOUND')) return err(404, 'Market not found');
          if (msg.includes('INVALID_AMOUNT')) return err(400, 'Invalid bet amount');
          if (msg.includes('INVALID_OUTCOME')) return err(400, 'Invalid outcome');
          return err(500, 'Bet failed, please try again');
        }
      }

      /* ── UP/DOWN 5-min parimutuel rounds (server-authoritative) ── */
      if (path==='/predictions/updown' && method==='GET') {
        const nowSec = Math.floor(Date.now()/1000);
        const clk = uodClock(nowSec);
        // throttled global tick: only one caller every UOD_TICK_THROTTLE seconds
        let doTick = false;
        try {
          const cutoff = new Date((nowSec - UOD_TICK_THROTTLE) * 1000).toISOString();
          const won = await sbPatch('uod_meta', `?id=eq.1&last_tick_at=lt.${cutoff}`, { last_tick_at: new Date().toISOString() }, env);
          doTick = Array.isArray(won) && won.length > 0;
        } catch {}
        if (!doTick) {
          // cold-start safety: if the current round rows don't exist yet, force a tick
          try {
            const cur0 = await sbGet('uod_rounds', `?round_index=eq.${clk.idx}&select=id&limit=1`, env);
            if (!cur0 || cur0.length === 0) doTick = true;
          } catch {}
        }
        if (doTick) {
          const prices = await uodSpotPrices();
          if (Object.keys(prices).length) {
            try {
              await sbRpc('uod_sync', {
                p_idx: clk.idx,
                p_open_at: new Date(clk.openAt * 1000).toISOString(),
                p_lock_at: new Date(clk.lockAt * 1000).toISOString(),
                p_prices: prices,
              }, env);
            } catch {}
          }
        }
        let cur = [], recent = [], activity = [];
        try { cur = await sbGet('uod_rounds', `?round_index=eq.${clk.idx}&select=id,coin,status,open_at,lock_at,open_price,up_pool,down_pool,bet_count`, env); } catch {}
        try { recent = await sbGet('uod_rounds', `?status=eq.settled&select=coin,round_index,open_price,close_price,winning_side,up_pool,down_pool,settled_at&order=round_index.desc&limit=40`, env); } catch {}
        try { activity = await sbGet('uod_bets', `?select=coin,side,amount,created_at&order=created_at.desc&limit=24`, env); } catch {}
        const coins = {};
        for (const r of (cur || [])) coins[r.coin] = r;
        const lastResult = {};
        for (const r of (recent || [])) { if (!lastResult[r.coin]) lastResult[r.coin] = r; }
        return ok({ now: nowSec, idx: clk.idx, open_at: clk.openAt, lock_at: clk.lockAt, phase: clk.phase, countdown: clk.countdown, coins, last_result: lastResult, activity: activity || [] });
      }
      if (path==='/predictions/updown/bet' && method==='POST') {
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Sign in to place a bet');
        const coin = String(body.coin || '').toUpperCase();
        const side = String(body.side || '').toLowerCase();
        const amount = Number(body.amount);
        if (!UOD_COINS[coin]) return err(400, 'Invalid coin');
        if (side !== 'up' && side !== 'down') return err(400, 'Side must be up or down');
        if (!Number.isFinite(amount) || amount < 1) return err(400, 'Minimum bet is 1 USDT');
        if (amount > 100000) return err(400, 'Maximum bet is 100000 USDT');
        const nowSec = Math.floor(Date.now()/1000);
        const clk = uodClock(nowSec);
        if (clk.phase !== 'open') return err(400, 'Round is locked — settling');
        // Anti-snipe: refuse bets in the final UOD_BET_CUTOFF seconds before lock.
        if (clk.lockAt - nowSec <= UOD_BET_CUTOFF) return err(400, 'Betting closed — round is locking');
        // resolve the round's open_price (spot at creation) for first-bet-of-round
        let openPrice = null;
        try {
          const ex = await sbGet('uod_rounds', `?coin=eq.${coin}&round_index=eq.${clk.idx}&select=open_price&limit=1`, env);
          if (ex && ex[0] && ex[0].open_price != null) openPrice = Number(ex[0].open_price);
        } catch {}
        if (openPrice == null) {
          const prices = await uodSpotPrices();
          if (prices[coin] != null) openPrice = prices[coin];
        }
        if (openPrice == null) return err(503, 'Price feed unavailable, please try again');
        try {
          const res = await sbRpc('uod_place_bet', {
            p_user_id: uid, p_coin: coin, p_round_index: clk.idx,
            p_open_at: new Date(clk.openAt * 1000).toISOString(),
            p_lock_at: new Date(clk.lockAt * 1000).toISOString(),
            p_open_price: openPrice, p_side: side,
            p_amount: Math.round(amount * 1e8) / 1e8,
          }, env);
          return ok(res);
        } catch (e) {
          const msg = String(e.message || e);
          if (msg.includes('INSUFFICIENT_BALANCE')) return err(400, 'Insufficient USDT balance');
          if (msg.includes('ROUND_LOCKED')) return err(400, 'Round is locked — settling');
          if (msg.includes('INVALID_AMOUNT')) return err(400, 'Invalid bet amount');
          if (msg.includes('INVALID_SIDE')) return err(400, 'Invalid side');
          if (msg.includes('INVALID_COIN')) return err(400, 'Invalid coin');
          return err(500, 'Bet failed, please try again');
        }
      }
      if (path==='/predictions/updown/my-bets' && method==='GET') {
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Sign in to view your bets');
        let bets = [];
        try {
          bets = await sbGet('uod_bets', `?user_id=eq.${uid}&select=id,coin,side,amount,status,payout,created_at,settled_at,round_id,uod_rounds(round_index,open_price,close_price,winning_side,lock_at,status)&order=created_at.desc&limit=60`, env);
        } catch {}
        return ok({ bets: bets || [] });
      }

      /* ── 3D CASINO GAMES (logged-in web users, USDT) ── */
      if (method==='POST' && path.startsWith('/games/')) {
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Sign in to play');

        if (path === '/games/play') {
          const game = String(body.game || '');
          const bet = Number(body.bet);
          if (!CASINO_GAMES.has(game)) return err(400, 'Unknown game');
          if (!Number.isFinite(bet) || bet < CASINO_MIN_BET) return err(400, `Minimum bet is ${CASINO_MIN_BET} USDT`);
          if (bet > CASINO_MAX_BET) return err(400, `Maximum bet is ${CASINO_MAX_BET} USDT`);
          const betR = Math.round(bet * 1e8) / 1e8;

          const seed = casinoSeed();
          const rng = casinoRandFloat(seed);
          let won = false, multiplier = 0, outcome = {}, extra = null;

          if (game === 'dice') {
            const dir = body.dir === 'over' ? 'over' : 'under';
            let target = Number(body.target);
            if (!Number.isFinite(target)) return err(400, 'Invalid target');
            target = Math.min(98, Math.max(2, Math.round(target)));
            const rollVal = Math.floor(rng * 10000) / 100; // 0.00 .. 99.99
            const p = dir === 'under' ? target / 100 : (100 - target) / 100;
            won = dir === 'under' ? rollVal < target : rollVal > target;
            multiplier = won ? Math.floor((CASINO_RTP / p) * 100) / 100 : 0;
            outcome = { roll: rollVal, target, dir };
          } else if (game === 'coinflip') {
            const side = body.side === 'tails' ? 'tails' : 'heads';
            const result = rng < 0.5 ? 'heads' : 'tails';
            won = result === side;
            multiplier = won ? Math.floor((CASINO_RTP / 0.5) * 100) / 100 : 0;
            outcome = { result, side };
          } else if (game === 'crash') {
            let cashout = Number(body.cashout);
            if (!Number.isFinite(cashout) || cashout < 1.01) return err(400, 'Auto cashout must be at least 1.01');
            cashout = Math.min(CASINO_MAX_MULT, Math.floor(cashout * 100) / 100);
            const e = 1 - CASINO_RTP;
            let crash;
            if (rng < e) crash = 1.00;
            else { const r2 = (rng - e) / (1 - e); crash = Math.floor((1 / (1 - r2)) * 100) / 100; }
            crash = Math.min(CASINO_MAX_MULT, Math.max(1, crash));
            won = cashout <= crash;
            multiplier = won ? cashout : 0;
            outcome = { crash, cashout };
          } else if (game === 'plinko') {
            const risk = ['low', 'med', 'high'].includes(body.risk) ? body.risk : 'med';
            const bucket = casinoPlinkoBucket(seed);
            multiplier = PLINKO_TABLES[risk][bucket];
            outcome = { bucket, risk, multiplier };
          } else if (game === 'lootbox') {
            let acc = 0; let m = 0;
            for (const rwd of LOOTBOX_REWARDS) { acc += rwd.w; if (rng <= acc) { m = rwd.m; break; } }
            multiplier = m;
            outcome = { multiplier: m };
          } else if (game === 'bonanza') {
            const r = bonanzaPlay(seed);
            multiplier = r.totalMult;
            // Compact summary for DB; the full animatable sequence goes only in the HTTP response.
            outcome = { totalMult: r.totalMult, freeSpins: r.freeSpinsCount, scatters: r.baseScatters };
            extra = { spins: r.spins, freeSpinsCount: r.freeSpinsCount, scatPay: r.scatPay, totalMult: r.totalMult };
          }

          const payout = multiplier > 0 ? Math.round(betR * multiplier * 1e8) / 1e8 : 0;
          won = payout > betR + 1e-9;   // net profit drives win/lose colouring
          let balance;
          try {
            const res = await sbRpc('casino_play', {
              p_user_id: uid, p_game: game, p_symbol: 'USDT',
              p_bet: betR, p_multiplier: multiplier, p_payout: payout,
              p_won: won, p_outcome: outcome, p_seed: seed,
            }, env);
            balance = typeof res === 'number' ? res : Number(res);
          } catch (e) {
            const msg = String((e && e.message) || e);
            if (/insufficient/i.test(msg)) return err(400, 'Insufficient USDT balance');
            return err(500, 'Bet failed, please try again');
          }
          return ok({ won, multiplier, payout, balance, outcome, sequence: extra });
        }

        if (path === '/games/history') {
          const rows = await sbGet('casino_bets',
            `?user_id=eq.${uid}&select=game,bet_amount,multiplier,payout,won,outcome,created_at&order=created_at.desc&limit=20`, env);
          return ok({ bets: rows });
        }

        return err(404, `Unknown game route: ${path}`);
      }

      /* ── BNC MINER (Telegram Mini App) ── */
      if (method==='POST' && path.startsWith('/miner/')) {
        const tgUser = await validateTelegramInitData(body.initData || '', env.TELEGRAM_BOT_TOKEN);
        if (!tgUser || !tgUser.id) return err(401, 'Invalid Telegram session');
        const tgId = Number(tgUser.id);

        if (path === '/miner/init') {
          await minerEnsureState(tgUser, body.ref_code, env);
          return ok({ state: await minerPublicState(tgId, env) });
        }

        if (path === '/miner/claim') {
          await minerEnsureState(tgUser, null, env);
          const res = await sbRpc('miner_claim', { p_tg: tgId }, env);
          if (res && res.error) return err(400, 'Claim failed');
          return ok({ earned: Number(res?.earned || 0), state: await minerPublicState(tgId, env) });
        }

        // Step 1 of a box purchase: reserve a unique payment amount bound to this
        // user. The client then pays EXACTLY this amount; only this user can later
        // claim the matching on-chain tx, so payments cannot be front-run/hijacked.
        if (path === '/miner/upgrade/intent') {
          const tier = String(body.box_tier || '');
          const box = MINER_BOXES[tier];
          if (!box) return err(400, 'Unknown box');
          await minerEnsureState(tgUser, null, env);
          const baseNano = Math.round(box.price * 1e9);
          const res = await sbRpc('miner_create_intent', {
            p_tg: tgId, p_tier: tier, p_base_nano: baseNano,
            p_grid: MINER_INTENT_GRID, p_kmax: MINER_INTENT_KMAX, p_ttl: MINER_INTENT_TTL,
          }, env);
          if (!res || res.error) return err(503, 'Could not create payment intent, try again');
          return ok({
            intent_id: res.intent_id,
            expected_nano: String(res.expected_nano),
            expected_ton: Number(res.expected_nano) / 1e9,
            operator_wallet: MINER_OPERATOR_WALLET,
            expires_at: res.expires_at,
          });
        }

        // Step 2: after paying, claim the box. The exact reserved amount maps the
        // on-chain payment to this intent; ownership is enforced server-side.
        if (path === '/miner/upgrade') {
          const intentId = String(body.intent_id || '');
          if (!intentId) return err(400, 'intent_id required');
          const rows = await sbGet('tg_miner_intents',
            `?id=eq.${encodeURIComponent(intentId)}&select=telegram_user_id,box_tier,expected_nano,status,expires_at&limit=1`, env);
          if (!rows.length) return err(404, 'Payment intent not found');
          const intent = rows[0];
          if (String(intent.telegram_user_id) !== String(tgId)) return err(403, 'Intent does not belong to you');
          if (intent.status !== 'pending') return err(409, 'Payment intent already used');
          if (Date.parse(intent.expires_at) < Date.now()) return err(410, 'Payment intent expired — start the purchase again');
          const box = MINER_BOXES[intent.box_tier];
          if (!box) return err(400, 'Unknown box');
          const matches = await minerVerifyTon(Number(intent.expected_nano), env);
          if (!matches.length) return err(402, 'TON payment not detected yet. Wait a few seconds and retry.');
          await minerEnsureState(tgUser, null, env);
          // Try each matching tx; tx_used means that tx was already consumed, so skip
          // to the next candidate (handles an old freed-amount tx still in the window).
          let res = null;
          for (const m of matches) {
            const r = await sbRpc('miner_upgrade', {
              p_tg: tgId, p_tier: intent.box_tier, p_price: box.price, p_yield: box.yield, p_tx: m.hash,
            }, env);
            if (r && r.error === 'tx_used') continue;
            res = r; break;
          }
          if (!res) return err(402, 'TON payment not detected yet. Wait a few seconds and retry.');
          if (res.error) return err(400, 'Upgrade failed');
          // Best-effort: mark the intent consumed so its amount frees for reuse.
          try { await sbPatch('tg_miner_intents', `?id=eq.${encodeURIComponent(intentId)}`, { status: 'consumed', consumed_tx: 'done' }, env); } catch {}
          return ok({ state: await minerPublicState(tgId, env) });
        }

        if (path === '/miner/task') {
          const key = String(body.task_key || '');
          if (!(key in MINER_TASKS)) return err(400, 'Unknown task');
          const s = await minerEnsureState(tgUser, null, env);
          if (key === 'invite_5' && Number(s.invited_count || 0) < 5) return err(400, 'Need 5 invited friends first');
          const reward = MINER_TASKS[key];
          const res = await sbRpc('miner_task', { p_tg: tgId, p_key: key, p_reward: reward }, env);
          if (res && res.error === 'already') return err(409, 'Task already claimed');
          if (res && res.error) return err(400, 'Task failed');
          return ok({ reward, state: await minerPublicState(tgId, env) });
        }

        if (path === '/miner/link') {
          const email = String(body.email || '').trim().toLowerCase();
          if (!email) return err(400, 'Email required');
          const prof = await sbGet('user_profiles', `?email=eq.${encodeURIComponent(email)}&select=id&limit=1`, env);
          if (!prof.length) return err(404, 'No basonce.com account with that email');
          await minerEnsureState(tgUser, null, env);
          await sbPatch('tg_miner_state', `?telegram_user_id=eq.${tgId}`, { linked_user_id: prof[0].id }, env);
          return ok({ linked: true, state: await minerPublicState(tgId, env) });
        }

        if (path === '/miner/withdraw') {
          const s = await minerEnsureState(tgUser, null, env);
          // Resolve the basonce.com account to credit (identity = user_profiles.id).
          // If already linked, the RPC uses the stored link. If an email is supplied,
          // validate it now so we can return a clear 404. The threshold check happens
          // inside the RPC first, so a below-minimum user gets the "need 100 BNC"
          // message rather than a premature link prompt.
          let linked = s.linked_user_id || null;
          const email = String(body.email || '').trim().toLowerCase();
          if (!linked && email) {
            const prof = await sbGet('user_profiles', `?email=eq.${encodeURIComponent(email)}&select=id&limit=1`, env);
            if (!prof.length) return err(404, 'No basonce.com account with that email');
            linked = prof[0].id;
          }
          // Atomic: lock state, sum BNC incl. pending accrual, credit USDT, log,
          // zero balance — all in one transaction so a concurrent claim cannot
          // resurrect the withdrawn balance.
          const res = await sbRpc('miner_withdraw', {
            p_tg: tgId, p_min: MINER_WITHDRAW_MIN, p_rate: MINER_USDT_RATE, p_linked: linked,
          }, env);
          if (res && res.error === 'below_min') return err(400, `Minimum ${MINER_WITHDRAW_MIN} BNC required`);
          if (res && res.error === 'link_required') return jsonRes(400, { error: 'link_required', need_link: true });
          if (res && res.error) return err(400, 'Withdraw failed');
          return ok({ ok: true, usdt_credited: Number(res.usdt_credited), bsc_withdrawn: Number(res.bsc_withdrawn), state: await minerPublicState(tgId, env) });
        }

        return err(404, 'Unknown miner route');
      }

      /* ── WHOAMI: real IP + geo from Cloudflare edge headers ── */
      if (method==='GET' && path==='/whoami') {
        const cf = request.cf || {};
        const ip = request.headers.get('CF-Connecting-IP')
                || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
                || request.headers.get('X-Real-IP')
                || 'N/A';
        const country = cf.country || request.headers.get('CF-IPCountry') || null;
        const cc = country && country.length === 2 ? country : '';
        const flag = cc ? String.fromCodePoint(0x1F1E6 - 0x41 + cc.toUpperCase().charCodeAt(0))
                        + String.fromCodePoint(0x1F1E6 - 0x41 + cc.toUpperCase().charCodeAt(1)) : '🌍';
        return ok({
          ip,
          country,
          country_code: cc,
          flag,
          city: cf.city || null,
          region: cf.region || null,
          postalCode: cf.postalCode || null,
          timezone: cf.timezone || null,
          latitude: cf.latitude || null,
          longitude: cf.longitude || null,
          asOrganization: cf.asOrganization || null,
          asn: cf.asn || null,
          continent: cf.continent || null,
        });
      }

      // Telegram bot self-test (admin only) — verifies bot delivers messages
      if (method==='POST' && path==='/telegram-test') {
        const auth = request.headers.get('Authorization') || '';
        const bearer = auth.replace(/^Bearer\s+/i, '');
        const isServiceRole = bearer && bearer === env.SUPABASE_SERVICE_ROLE_KEY;
        if (!isServiceRole) {
          const uid = await getAuthedUserId(request, env);
          if (!uid || !ADMIN_UUIDS.has(uid)) return err(401, 'Admin only');
        }
        if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) {
          return ok({ success:false, message:'Bot token or chat id missing in worker env' });
        }
        let body = {};
        try { body = await request.json(); } catch {}
        const text = (body && body.text) || '🟢 BASONCE bot test — alarmlar normal modda çalışıyor.';
        const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text, parse_mode: 'HTML' }),
        });
        const j = await r.json().catch(()=>({}));
        return ok({ success: !!j.ok, telegram_response: j });
      }

      /* ── WELCOME CHEST: status ──
         GET /api/welcome-chest/status  (Authorization: Bearer <user_jwt>)
         Pure-worker implementation — no DB DDL needed. State derived from:
         - user_profiles.created_at (window start)
         - user_balances row with symbol=WELCOME_CHEST as the "claimed" sentinel
      */
      if (method==='GET' && path==='/welcome-chest/status') {
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Unauthorized');
        const nowMs = Date.now();
        const campaignOpen = nowMs < CHEST_CAMPAIGN_END_MS;

        // Get signup time + check if already claimed (in parallel)
        const [profR, claimR] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${uid}&select=created_at&limit=1`, { headers: restHeaders(env) }),
          fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.${CHEST_SENTINEL_CLAIMED}&select=symbol&limit=1`, { headers: restHeaders(env) }),
        ]);
        const profRows = profR.ok ? await profR.json() : [];
        const claimRows = claimR.ok ? await claimR.json() : [];
        const created = profRows[0]?.created_at ? Date.parse(profRows[0].created_at) : nowMs;
        const claimed = Array.isArray(claimRows) && claimRows.length > 0;

        // Eligibility: rolling 30 days from signup. Both brand-new and recent users qualify.
        const eligibilityCutoff = nowMs - (CHEST_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000);
        const eligible = campaignOpen && created > eligibilityCutoff;

        // Window starts at MAX(signup, first-view). For brand new users this is ~signup time;
        // for users who signed up days ago, the 10-min timer starts the moment they first see the chest.
        let windowStart = created;
        if (eligible && !claimed) {
          const seenStart = await chestUpsertSeen(uid, env);
          windowStart = Math.max(created, seenStart);
        }
        const expiresAt = windowStart + CHEST_WINDOW_MS;
        const secondsLeft = Math.max(0, Math.floor((expiresAt - nowMs) / 1000));

        let status = 'pending';
        if (claimed) status = 'claimed';
        else if (!eligible) status = 'expired';
        else if (nowMs > expiresAt) status = 'expired';

        return ok({
          status,
          expires_at: new Date(expiresAt).toISOString(),
          seconds_left: secondsLeft,
          reward_amount: CHEST_REWARD_AMOUNT,
          reward_symbol: CHEST_REWARD_SYMBOL,
          claimed_at: null,
          locked: true,
          campaign_open: eligible,
        });
      }

      /* ── WELCOME CHEST: claim ──
         POST /api/welcome-chest/claim  (Authorization: Bearer <user_jwt>)
         Atomic: relies on PRIMARY KEY (user_id, symbol) on user_balances.
         Inserting the WELCOME_CHEST sentinel row is the lock — only one
         insert can ever succeed per user. If insert succeeds, we then add
         100 EQ to the user's locked_balance.
      */
      if (method==='POST' && path==='/welcome-chest/claim') {
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Unauthorized');

        const nowMs = Date.now();
        if (nowMs > CHEST_CAMPAIGN_END_MS) return ok({ success:false, message:'Campaign ended' });

        // Verify eligibility (rolling 30 days from signup)
        const profR = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${uid}&select=created_at&limit=1`, { headers: restHeaders(env) });
        const profRows = profR.ok ? await profR.json() : [];
        if (!profRows[0]?.created_at) return ok({ success:false, message:'Profile not found' });
        const created = Date.parse(profRows[0].created_at);
        const eligibilityCutoff = nowMs - (CHEST_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000);
        if (created <= eligibilityCutoff) return ok({ success:false, message:'Not eligible' });

        // Window: max(signup, first-view) + 10min — must have viewed (status endpoint sets this)
        const seenStart = await chestUpsertSeen(uid, env);
        const windowStart = Math.max(created, seenStart);
        if (nowMs > windowStart + CHEST_WINDOW_MS) return ok({ success:false, message:'Chest expired' });

        // Check if already claimed (no UNIQUE constraint on (user_id, symbol), so we read first)
        const existingR = await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.${CHEST_SENTINEL_CLAIMED}&select=symbol&limit=1`, { headers: restHeaders(env) });
        const existingRows = existingR.ok ? await existingR.json() : [];
        if (Array.isArray(existingRows) && existingRows.length > 0) {
          return ok({ success:false, message:'Already claimed' });
        }

        // Insert claimed-sentinel
        const claimRes = await fetch(`${SUPABASE_URL}/rest/v1/user_balances`, {
          method: 'POST',
          headers: { ...restHeaders(env), 'Content-Type': 'application/json', Prefer:'return=representation' },
          body: JSON.stringify({
            user_id: uid,
            symbol: CHEST_SENTINEL_CLAIMED,
            balance: 0,
            locked_balance: 0,
            eq_amount: 0,
          }),
        });
        if (!claimRes.ok) {
          const t = await claimRes.text();
          return ok({ success:false, message:'Claim failed: ' + t.slice(0, 200) });
        }

        // Credit 100 EQ directly to free balance (withdrawal rules enforce abuse prevention)
        const eqGet = await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.${CHEST_REWARD_SYMBOL}&select=balance&limit=1`, { headers: restHeaders(env) });
        const eqRows = eqGet.ok ? await eqGet.json() : [];
        if (eqRows.length > 0) {
          const newBalance = (Number(eqRows[0].balance) || 0) + CHEST_REWARD_AMOUNT;
          await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.${CHEST_REWARD_SYMBOL}`, {
            method: 'PATCH',
            headers: { ...restHeaders(env), 'Content-Type':'application/json' },
            body: JSON.stringify({ balance: newBalance }),
          });
        } else {
          await fetch(`${SUPABASE_URL}/rest/v1/user_balances`, {
            method: 'POST',
            headers: { ...restHeaders(env), 'Content-Type':'application/json' },
            body: JSON.stringify({
              user_id: uid,
              symbol: CHEST_REWARD_SYMBOL,
              balance: CHEST_REWARD_AMOUNT,
              locked_balance: 0,
              eq_amount: 0,
            }),
          });
        }

        return ok({
          success: true,
          message: 'Claimed',
          reward_amount: CHEST_REWARD_AMOUNT,
          reward_symbol: CHEST_REWARD_SYMBOL,
          locked: false,
        });
      }

      /* ── NOWPAYMENTS: hosted invoice creation ──
         User clicks "Crypto Card / Instant" → we create a NOWPayments hosted
         invoice for $amount USD → return invoice_url → frontend redirects.
         No KYB needed. Funds settle to NOWPayments custody until payout wallet
         is configured in NOWPayments dashboard. */
      if (method==='POST' && path==='/nowpay/invoice') {
        if (!env.NOWPAYMENTS_API_KEY) return err(503, 'NOWPayments not configured');
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Unauthorized');
        const amount = Number(body.amount_usd || body.amount || 0);
        if (!amount || amount < 5 || amount > 50000) return err(400, 'amount must be 5-50000 USD');
        const orderId = `bsc:${uid}:${Date.now()}`;
        const r = await fetch('https://api.nowpayments.io/v1/invoice', {
          method: 'POST',
          headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            price_amount: amount,
            price_currency: 'usd',
            order_id: orderId,
            order_description: `Basonce wallet top-up ${amount} USD`,
            ipn_callback_url: 'https://basonce.com/api/nowpay/ipn',
            success_url: 'https://basonce.com/?nowpay=success#wallet',
            cancel_url: 'https://basonce.com/?nowpay=cancel#wallet',
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.invoice_url) {
          return err(502, 'NOWPayments error: ' + JSON.stringify(j).slice(0, 300));
        }
        return ok({ invoice_url: j.invoice_url, invoice_id: j.id, order_id: orderId });
      }

      /* ── NOWPAYMENTS: IPN webhook ──
         NOWPayments POSTs payment status updates here. Validate HMAC-SHA512
         signature using IPN secret over sorted-key JSON, then on `finished`
         credit USDT to user balance (idempotent via NOWPAY sentinel). */
      if (method === 'POST' && path === '/nowpay/ipn') {
        if (!env.NOWPAYMENTS_IPN_SECRET) return err(503, 'IPN not configured');
        const sigHeader = request.headers.get('x-nowpayments-sig') || request.headers.get('X-Nowpayments-Sig') || '';
        // Body is already parsed by the global handler at the top of fetch()
        const parsed = body;
        if (!parsed || typeof parsed !== 'object') return err(400, 'bad json');
        const sortedJson = JSON.stringify(sortObjDeep(parsed));
        const expected = await hmacSha512Hex(env.NOWPAYMENTS_IPN_SECRET, sortedJson);
        if (sigHeader.toLowerCase() !== expected.toLowerCase()) {
          // Telegram alert on bad sig — possible attack
          if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID) {
            fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
                text: `⚠️ NOWPay IPN bad signature\norder=${parsed.order_id}\nstatus=${parsed.payment_status}` })
            }).catch(()=>{});
          }
          return err(401, 'bad signature');
        }
        const status = String(parsed.payment_status || '').toLowerCase();
        const orderId = String(parsed.order_id || '');
        const paymentId = String(parsed.payment_id || parsed.invoice_id || '');

        // Parse uid from order_id. Formats:
        //   "bsc:{uid}:{ts}"  → hosted invoice deposit (fixed USD price)
        //   "bscd:{uid}:{ts}" → address-based deposit (variable amount)
        const parts = orderId.split(':');
        const isAddrDep = parts[0] === 'bscd';
        const uid = (parts[0] === 'bsc' || parts[0] === 'bscd') && parts[1] ? parts[1] : null;

        // Amount to credit (USDT):
        //  - invoice: user paid the fixed USD price → actually_paid (usdt pay) or price_amount
        //  - address deposit: whatever actually arrived, valued in USD (usdt* 1:1, else estimate)
        const payCur = String(parsed.pay_currency || '').toLowerCase();
        let paid = 0;
        if (isAddrDep) {
          paid = await npUsdValue(env, Number(parsed.actually_paid || 0), payCur);
        } else {
          paid = Number(parsed.actually_paid || parsed.price_amount || 0);
        }

        // Credit states: invoice → finished/confirmed only.
        // Address deposits also credit on partially_paid (user sends an arbitrary
        // amount below our tiny reference price — funds are still real & confirmed).
        const creditable = (status === 'finished' || status === 'confirmed' || (isAddrDep && status === 'partially_paid'));

        if (uid && isAddrDep && creditable && Number(parsed.actually_paid || 0) > 0 && paid <= 0) {
          // Real funds arrived but we could not value them — force NOWPayments retry.
          return err(500, 'usd valuation failed');
        }

        if (uid && paid > 0 && creditable) {
          // Idempotency: NOWPAY_<paymentId> sentinel in user_balances.
          // Insert FIRST and require success — if sentinel insert fails we abort
          // before crediting (prevents lost-state). NOWPayments will retry IPN.
          const sentinel = `NOWPAY_${paymentId}`;
          const dupR = await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.${sentinel}&select=symbol,balance&limit=1`, { headers: restHeaders(env) });
          const dupRows = dupR.ok ? await dupR.json() : [];
          if (Array.isArray(dupRows) && dupRows.length > 0) {
            // Address deposits: same payment can progress partially_paid → finished
            // with a HIGHER total. Credit only the delta, once.
            const creditedRaw = dupRows[0].balance;
            const credited = Number(creditedRaw) || 0;
            const delta = paid - credited;
            if (!isAddrDep || delta <= 0.01) return ok({ ok:true, dedup:true });
            // COMPARE-AND-SWAP on the sentinel: only update if balance still equals
            // the value we read. Concurrent/retried IPNs lose the race → dedup.
            const casR = await fetch(
              `${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.${sentinel}&balance=eq.${encodeURIComponent(String(creditedRaw))}`,
              {
                method:'PATCH',
                headers:{...restHeaders(env),'Content-Type':'application/json','Prefer':'return=representation'},
                body: JSON.stringify({ balance: paid })
              },
            );
            const casRows = casR.ok ? await casR.json() : [];
            if (!Array.isArray(casRows) || casRows.length === 0) {
              return ok({ ok:true, dedup:true, cas_lost:true });
            }
            const bR = await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.USDT&select=balance&limit=1`, { headers: restHeaders(env) });
            const bRows = bR.ok ? await bR.json() : [];
            if (bRows.length > 0) {
              await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.USDT`, {
                method:'PATCH', headers:{...restHeaders(env),'Content-Type':'application/json'},
                body: JSON.stringify({ balance: (Number(bRows[0].balance)||0) + delta })
              });
            } else {
              await fetch(`${SUPABASE_URL}/rest/v1/user_balances`, {
                method:'POST', headers:{...restHeaders(env),'Content-Type':'application/json'},
                body: JSON.stringify({ user_id: uid, symbol:'USDT', balance: delta, locked_balance: 0, eq_amount: 0 })
              });
            }
            return ok({ ok:true, delta_credited: delta });
          }
          const sentRes = await fetch(`${SUPABASE_URL}/rest/v1/user_balances`, {
            method:'POST',
            headers:{...restHeaders(env), 'Content-Type':'application/json'},
            body: JSON.stringify({ user_id: uid, symbol: sentinel, balance: paid, locked_balance: 0, eq_amount: 0 })
          });
          if (!sentRes.ok) {
            // Surface to admin — DO NOT credit (NOWPayments will retry the IPN)
            if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID) {
              fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
                  text: `⚠️ NOWPay sentinel insert FAILED — credit aborted, will retry\norder=${orderId}\npay_id=${paymentId}` })
              }).catch(()=>{});
            }
            return err(500, 'sentinel insert failed');
          }
          // Credit USDT
          const balR = await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.USDT&select=balance&limit=1`, { headers: restHeaders(env) });
          const balRows = balR.ok ? await balR.json() : [];
          if (balRows.length > 0) {
            const newBal = (Number(balRows[0].balance) || 0) + paid;
            await fetch(`${SUPABASE_URL}/rest/v1/user_balances?user_id=eq.${uid}&symbol=eq.USDT`, {
              method:'PATCH',
              headers:{...restHeaders(env),'Content-Type':'application/json'},
              body: JSON.stringify({ balance: newBal })
            });
          } else {
            await fetch(`${SUPABASE_URL}/rest/v1/user_balances`, {
              method:'POST',
              headers:{...restHeaders(env),'Content-Type':'application/json'},
              body: JSON.stringify({ user_id: uid, symbol:'USDT', balance: paid, locked_balance: 0, eq_amount: 0 })
            });
          }
          // Telegram alert
          if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID) {
            const partnerId = env.TELEGRAM_PARTNER_CHAT_ID || '-1003760482893';
            const targets = [env.TELEGRAM_ADMIN_CHAT_ID];
            if (String(partnerId) !== String(env.TELEGRAM_ADMIN_CHAT_ID)) targets.push(partnerId);
            const msg = `💸 <b>NOWPayments DEPOSIT</b>\n💰 ${paid.toFixed(2)} USDT credited\n👤 user=<code>${uid.slice(0,8)}</code>\n🧾 order=<code>${orderId}</code>\n💳 pay_id=${paymentId}\n📊 status=${status}`;
            for (const t of targets) {
              fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ chat_id: t, text: msg, parse_mode:'HTML' })
              }).catch(()=>{});
            }
          }
        }
        return ok({ ok:true, status });
      }

      /* ── NOWPAYMENTS: real per-user deposit address ──
         User picks coin+network → we create a NOWPayments payment with a tiny
         reference price → returns a REAL on-chain address. Whatever the user
         sends there is detected by NOWPayments and credited via /nowpay/ipn
         (order prefix "bscd" → variable-amount crediting). */
      if (method==='POST' && path==='/nowpay/deposit-address') {
        if (!env.NOWPAYMENTS_API_KEY) return err(503, 'NOWPayments not configured');
        const uid = await getAuthedUserId(request, env);
        if (!uid) return err(401, 'Unauthorized');
        const coin = String(body.currency || 'USDT').toUpperCase();
        const net = String(body.network || '').toUpperCase();
        const payCur = NOWPAY_CUR[`${coin}:${net}`];
        if (!payCur) return err(400, 'unsupported');
        // Minimum deposit for this currency (informational + reference price)
        let minAmount = 0;
        try {
          const mr = await fetch(`https://api.nowpayments.io/v1/min-amount?currency_from=${payCur}&fiat_equivalent=usd`,
            { headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY } });
          const mj = await mr.json();
          minAmount = Number(mj.min_amount || 0);
        } catch {}
        const refAmount = Math.max(minAmount * 2, 0.00000001);
        const orderId = `bscd:${uid}:${Date.now()}`;
        const r = await fetch('https://api.nowpayments.io/v1/payment', {
          method: 'POST',
          headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            price_amount: refAmount,
            price_currency: payCur,
            pay_currency: payCur,
            is_fixed_rate: false,
            is_fee_paid_by_user: false,
            order_id: orderId,
            order_description: `Basonce deposit ${coin} ${net}`,
            ipn_callback_url: 'https://basonce.com/api/nowpay/ipn',
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.pay_address) {
          return err(502, 'NOWPayments error: ' + JSON.stringify(j).slice(0, 300));
        }
        return ok({
          address: j.pay_address,
          extra_id: j.payin_extra_id || null,
          payment_id: String(j.payment_id || ''),
          coin, network: net,
          min_amount: minAmount,
          valid_until: j.valid_until || j.expiration_estimate_date || null,
        });
      }

      /* ── NOWPAYMENTS: payout — send an APPROVED withdrawal on-chain ──
         Admin-gated. Row must be status='completed' (fully approved via
         admin_approve_withdrawal RPC) and not already sent. NOWPayments
         requires account JWT (email+password) for payouts — API key alone
         is not accepted for outbound money. */
      if (method==='POST' && path==='/nowpay/payout') {
        // Defense in depth: x-requester-id must be an admin UUID AND the request
        // must carry a valid Supabase JWT belonging to that same admin. A forged
        // header alone cannot trigger real money movement.
        if (!isAdmin(request.headers)) return err(403, 'Forbidden');
        const authedAdmin = await getAuthedUserId(request, env);
        if (!authedAdmin || !ADMIN_UUIDS.has(authedAdmin)) return err(403, 'Forbidden — valid admin session required');
        if (!env.NOWPAYMENTS_API_KEY || !env.NOWPAYMENTS_EMAIL || !env.NOWPAYMENTS_PASSWORD) {
          return err(503, 'Payout credentials not configured (NOWPAYMENTS_EMAIL/PASSWORD)');
        }
        const wid = String(body.withdrawal_id || '');
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wid)) {
          return err(400, 'valid withdrawal_id required');
        }
        const wr = await fetch(`${SUPABASE_URL}/rest/v1/withdrawal_transactions?id=eq.${wid}&select=*&limit=1`, { headers: restHeaders(env) });
        const wrows = wr.ok ? await wr.json() : [];
        const w = Array.isArray(wrows) ? wrows[0] : null;
        if (!w) return err(404, 'withdrawal not found');
        if (w.status !== 'completed') return err(400, `withdrawal status is '${w.status}' — approve it first`);
        if (w.payout_batch_id) return err(409, `payout already started (batch ${w.payout_batch_id}, status ${w.payout_status || '?'})`);
        const coin = String(w.coin_symbol || 'USDT').toUpperCase();
        const net = String(w.network || '').toUpperCase();
        const payCur = NOWPAY_CUR[`${coin}:${net}`];
        if (!payCur) return err(400, `unsupported coin/network ${coin}/${net} — send manually from the NOWPayments panel`);
        const amt = Number(w.receive_amount) > 0
          ? Number(w.receive_amount)
          : (Number(w.amount || 0) - Number(w.network_fee || 0));
        if (!(amt > 0)) return err(400, 'invalid payout amount');
        if (!w.destination_address) return err(400, 'missing destination address');
        // ATOMIC CLAIM: conditional PATCH — only ONE caller can flip
        // payout_status from NULL to 'initiating'. Prevents concurrent
        // double-sends (check-then-act race).
        const claimR = await fetch(
          `${SUPABASE_URL}/rest/v1/withdrawal_transactions?id=eq.${wid}&status=eq.completed&payout_batch_id=is.null&payout_status=is.null`,
          {
            method: 'PATCH',
            headers: { ...restHeaders(env), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify({ payout_status: 'initiating' }),
          },
        );
        const claimed = claimR.ok ? await claimR.json() : [];
        if (!Array.isArray(claimed) || claimed.length === 0) {
          return err(409, 'payout already in progress for this withdrawal');
        }
        const releaseClaim = async () => {
          await fetch(`${SUPABASE_URL}/rest/v1/withdrawal_transactions?id=eq.${wid}&payout_batch_id=is.null`, {
            method: 'PATCH', headers: { ...restHeaders(env), 'Content-Type': 'application/json' },
            body: JSON.stringify({ payout_status: null }),
          }).catch(() => {});
        };
        // 1) Account JWT
        const ar = await fetch('https://api.nowpayments.io/v1/auth', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: env.NOWPAYMENTS_EMAIL, password: env.NOWPAYMENTS_PASSWORD }),
        });
        const aj = await ar.json().catch(() => ({}));
        if (!ar.ok || !aj.token) {
          await releaseClaim();
          return err(502, 'NOWPayments login failed: ' + JSON.stringify({ code: aj.code, message: aj.message }).slice(0, 250));
        }
        // 2) Create payout batch
        const pr = await fetch('https://api.nowpayments.io/v1/payout', {
          method: 'POST',
          headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY, 'Authorization': `Bearer ${aj.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ipn_callback_url: 'https://basonce.com/api/nowpay/payout-ipn',
            withdrawals: [{
              address: String(w.destination_address),
              currency: payCur,
              amount: String(amt),
              unique_external_id: wid,
            }],
          }),
        });
        const pj = await pr.json().catch(() => ({}));
        if (!pr.ok || !pj.id) {
          await releaseClaim();
          return err(502, 'NOWPayments payout error: ' + JSON.stringify(pj).slice(0, 300));
        }
        const pStatus = String((pj.withdrawals && pj.withdrawals[0] && pj.withdrawals[0].status) || 'creating').toLowerCase();
        await fetch(`${SUPABASE_URL}/rest/v1/withdrawal_transactions?id=eq.${wid}`, {
          method: 'PATCH', headers: { ...restHeaders(env), 'Content-Type': 'application/json' },
          body: JSON.stringify({ payout_batch_id: String(pj.id), payout_status: pStatus }),
        });
        if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID) {
          fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
              text: `📤 NOWPayments PAYOUT started\n💰 ${amt} ${coin} (${net})\n📍 ${String(w.destination_address).slice(0,10)}…\n🧾 wid=${wid.slice(0,8)} batch=${pj.id}\n📊 ${pStatus}` }),
          }).catch(() => {});
        }
        return ok({ ok: true, batch_id: String(pj.id), payout_status: pStatus });
      }

      /* ── NOWPAYMENTS: payout IPN — status updates for outbound sends ── */
      if (method === 'POST' && path === '/nowpay/payout-ipn') {
        if (!env.NOWPAYMENTS_IPN_SECRET) return err(503, 'IPN not configured');
        const sigHeader = request.headers.get('x-nowpayments-sig') || request.headers.get('X-Nowpayments-Sig') || '';
        const parsed = body;
        if (!parsed || typeof parsed !== 'object') return err(400, 'bad json');
        const sortedJson = JSON.stringify(sortObjDeep(parsed));
        const expected = await hmacSha512Hex(env.NOWPAYMENTS_IPN_SECRET, sortedJson);
        if (sigHeader.toLowerCase() !== expected.toLowerCase()) return err(401, 'bad signature');
        const items = Array.isArray(parsed) ? parsed
          : (Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [parsed]);
        for (const p of items) {
          const st = String(p.status || '').toUpperCase();
          if (!st) continue;
          const extId = p.unique_external_id ? String(p.unique_external_id) : null;
          const batchId = p.batch_withdrawal_id ? String(p.batch_withdrawal_id) : null;
          let q = null;
          if (extId && /^[0-9a-f-]{36}$/i.test(extId)) q = `id=eq.${extId}`;
          else if (batchId && /^[0-9a-zA-Z_-]+$/.test(batchId)) q = `payout_batch_id=eq.${batchId}`;
          if (!q) continue;
          const patch = { payout_status: st.toLowerCase() };
          if (st === 'FINISHED') {
            if (p.hash) patch.txid = String(p.hash);
            patch.completed_at = new Date().toISOString();
          }
          await fetch(`${SUPABASE_URL}/rest/v1/withdrawal_transactions?${q}`, {
            method: 'PATCH', headers: { ...restHeaders(env), 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID && (st === 'FINISHED' || st === 'FAILED' || st === 'REJECTED')) {
            const icon = st === 'FINISHED' ? '✅' : '❌';
            fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
                text: `${icon} NOWPayments PAYOUT ${st}\n💰 ${p.amount || '?'} ${p.currency || ''}\n🔗 ${p.hash || '-'}\n🧾 ${extId ? 'wid=' + extId.slice(0,8) : 'batch=' + (batchId || '?')}` }),
            }).catch(() => {});
          }
        }
        return ok({ ok: true });
      }

      /* ── SECURITY: SCAN MULTI-ACCOUNT (3+ signups from same IP in last 7 days) ──
         Auto-locks all accounts from the offending IP, registers IP block,
         sends Telegram alert. Called periodically by admin-monitor.
         GATED: requires x-requester-id of an admin UUID. */
      if (method==='POST' && path==='/security/scan-multi-account') {
        if (!isAdmin(request.headers)) return err(403, 'Forbidden');
        const sinceIso = new Date(Date.now() - 7*24*60*60*1000).toISOString();
        // Pull recent signup-like activity rows that have an IP — wide net to catch all signal
        const r = await fetch(
          `${REST}/activity_log?created_at=gte.${encodeURIComponent(sinceIso)}&ip_address=not.is.null&select=user_id,ip_address,created_at&limit=10000`,
          { headers: restHeaders(env) }
        );
        const rows = await r.json().catch(()=>[]);
        if (!Array.isArray(rows)) return ok({ scanned: 0, locked: 0, ips: 0 });

        // Group: ip → Set<user_id>
        const ipToUsers = new Map();
        for (const row of rows) {
          if (!row.ip_address || !row.user_id) continue;
          if (!ipToUsers.has(row.ip_address)) ipToUsers.set(row.ip_address, new Set());
          ipToUsers.get(row.ip_address).add(row.user_id);
        }

        // Find IPs with 3+ distinct users (filter out admin UUIDs from locking pool)
        const offendingIps = [];
        for (const [ip, users] of ipToUsers.entries()) {
          const nonAdminUsers = Array.from(users).filter(uid => !ADMIN_UUIDS.has(uid));
          if (nonAdminUsers.length >= 3) {
            offendingIps.push({ ip, count: nonAdminUsers.length, users: nonAdminUsers });
          }
        }

        if (offendingIps.length === 0) return ok({ scanned: rows.length, locked: 0, ips: 0 });

        // Skip ones already blocked recently
        const existingBlocks = await fetch(
          `${REST}/blocked_ips?is_active=eq.true&select=ip_address`,
          { headers: restHeaders(env) }
        ).then(x => x.json()).catch(() => []);
        const alreadyBlocked = new Set((existingBlocks || []).map(b => b.ip_address));
        const newOffenders = offendingIps.filter(o => !alreadyBlocked.has(o.ip));
        if (newOffenders.length === 0) return ok({ scanned: rows.length, locked: 0, ips: 0, note: 'all already blocked' });

        // Lock all the user accounts
        let lockedCount = 0;
        for (const offender of newOffenders) {
          for (const uid of offender.users) {
            const ur = await fetch(`${REST}/user_profiles?id=eq.${uid}`, {
              method: 'PATCH',
              headers: { ...restHeaders(env), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
              body: JSON.stringify({ is_active: false }),
            });
            if (ur.ok) lockedCount++;
          }
          // Register IP block
          await fetch(`${REST}/blocked_ips`, {
            method: 'POST',
            headers: { ...restHeaders(env), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({
              ip_address: offender.ip,
              reason: `Auto-blocked: ${offender.count} accounts from same IP in 7 days`,
              is_active: true,
              created_at: new Date().toISOString(),
            }),
          });
          // Admin action log
          await fetch(`${REST}/admin_actions`, {
            method: 'POST',
            headers: { ...restHeaders(env), 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action_type: 'auto_lock_multi_account',
              details: { ip: offender.ip, account_count: offender.count, user_ids: offender.users },
            }),
          }).catch(() => {});
        }

        // Telegram alert
        const lines = newOffenders.map(o =>
          `🔒 <code>${o.ip}</code> — ${o.count} hesap`
        ).join('\n');
        await sendTelegramAlert(
          `🚨 <b>OTOMATİK GÜVENLİK: Çoklu Hesap Tespit</b>\n\n${lines}\n\nToplam ${lockedCount} hesap kilitlendi, ${newOffenders.length} IP bloklandı.`,
          env
        );

        return ok({ scanned: rows.length, locked: lockedCount, ips: newOffenders.length, offenders: newOffenders });
      }

      /* ── SECURITY: NOTIFY WITHDRAWAL ──
         Called from kite-exchange right after a withdrawal_transactions insert.
         GATED: requires the user's Supabase JWT in Authorization: Bearer <token>.
         The worker independently verifies ownership of the withdrawal,
         recomputes the USD value server-side, and FORCES status='hold' if >=$500.
         Client-supplied status is ignored — server is the source of truth. */
      if (method==='POST' && path==='/security/notify-withdrawal') {
        const auth = request.headers.get('authorization') || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!token) return err(401, 'Missing auth token');

        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY },
          signal: AbortSignal.timeout(8000),
        });
        if (!userRes.ok) return err(401, 'Invalid token');
        const userData = await userRes.json();
        const callerId = userData?.id;
        const callerEmail = userData?.email;
        if (!callerId) return err(401, 'Invalid user');

        const { withdrawal_id } = body || {};
        if (!withdrawal_id) return err(400, 'withdrawal_id required');

        // Pull the actual withdrawal row from DB (don't trust client)
        const wRows = await fetch(
          `${REST}/withdrawal_transactions?id=eq.${encodeURIComponent(withdrawal_id)}&select=id,user_id,coin_symbol,amount,destination_address,status&limit=1`,
          { headers: restHeaders(env) }
        ).then(x => x.json()).catch(() => []);
        const w = Array.isArray(wRows) ? wRows[0] : null;
        if (!w) return err(404, 'Withdrawal not found');
        if (w.user_id !== callerId) return err(403, 'Not your withdrawal');

        // Server-side USD computation — single source of truth
        const STABLES = new Set(['USDT','USDC','BUSD','DAI','TUSD','USDP']);
        const sym = String(w.coin_symbol || '').toUpperCase();
        const amount = Number(w.amount || 0);
        let price = 1;
        if (!STABLES.has(sym)) {
          try {
            const all = await getAllKuCoinPrices();
            price = Number(all?.[sym]?.price || 0);
          } catch {}
        }
        const usdValue = price * amount;

        // ── RISK ENGINE: rule chain runs in the DB (blacklist, account age,
        //    velocity, daily/weekly limits, large amount). It updates the row
        //    status to 'hold' itself and logs an append-only risk_event. ──
        let riskDecision = null;
        try {
          const rcRes = await fetch(`${REST}/rpc/risk_check_withdrawal`, {
            method: 'POST',
            headers: { ...restHeaders(env), 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_withdrawal_id: withdrawal_id, p_usd_value: usdValue }),
            signal: AbortSignal.timeout(10000),
          });
          if (rcRes.ok) riskDecision = await rcRes.json();
        } catch {}

        // Fallback: if the risk engine is unreachable, keep the old ≥$500 hard hold
        const shouldHold = riskDecision
          ? riskDecision.decision === 'hold'
          : usdValue >= 500;
        if (!riskDecision && shouldHold && w.status !== 'hold') {
          await fetch(`${REST}/withdrawal_transactions?id=eq.${encodeURIComponent(withdrawal_id)}`, {
            method: 'PATCH',
            headers: { ...restHeaders(env), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'hold' }),
          }).catch(() => {});
        }

        const riskReasons = Array.isArray(riskDecision?.reasons) ? riskDecision.reasons : [];
        const dualApproval = riskDecision?.dual_approval_required === true;
        const finalStatus = shouldHold ? 'hold' : (w.status || 'pending');
        const emoji = shouldHold ? '⏸️' : '💸';
        const tag = shouldHold ? '<b>RİSK MOTORU: BEKLEMEDE</b>' : 'Çekim Talebi';

        const msg = `${emoji} <b>${tag}</b>\n\n` +
          `👤 ${callerEmail || 'unknown'}\n` +
          `💰 ${amount} ${sym} ≈ $${usdValue.toFixed(2)}\n` +
          `📍 <code>${String(w.destination_address || '').slice(0, 50)}</code>\n` +
          `🆔 <code>${String(withdrawal_id).slice(0, 8)}</code>\n` +
          (riskReasons.length ? `\n⚠️ Sebep: ${riskReasons.join(', ')}` : '') +
          (dualApproval ? '\n👥 Çift admin onayı gerekli (≥ limit).' : '') +
          (shouldHold ? '\n⏸️ Onayınız bekleniyor — admin panelden inceleyin.' : '');

        // ── ADMIN STEALTH: never alert on admin's own withdrawals ──
        const ADMIN_EMAIL_W = 'ecoprin1332@gmail.com';
        const ADMIN_UUID_W = '88292f59-898a-4fef-a1c8-8813d7b60b61';
        if (callerId === ADMIN_UUID_W || (callerEmail || '').toLowerCase() === ADMIN_EMAIL_W) {
          return ok({ notified: false, hold: shouldHold, usd_value: usdValue, suppressed: 'admin' });
        }

        await sendTelegramAlert(msg, env);

        await fetch(`${REST}/admin_actions`, {
          method: 'POST',
          headers: { ...restHeaders(env), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action_type: shouldHold ? 'auto_hold_withdrawal' : 'large_withdrawal_notice',
            details: { withdrawal_id, user_email: callerEmail, amount, coin_symbol: sym, usd_value: usdValue, status: finalStatus },
          }),
        }).catch(() => {});

        return ok({ notified: true, hold: shouldHold, usd_value: usdValue });
      }

      /* ── SECURITY: DAILY TELEGRAM SUMMARY (idempotent, fires once between 09:00-09:30 server-time) ──
         Called frequently by admin-monitor; only acts in the morning window AND
         only if today's summary hasn't been logged in admin_actions yet. */
      if (method==='POST' && path==='/security/daily-summary') {
        // ── ADMIN GATE: only admin-monitor (with x-requester-id) may trigger ──
        if (!isAdmin(request.headers)) return err(403, 'Forbidden');

        const now = new Date();
        const hour = now.getUTCHours();
        // Server time is UTC; Turkey = UTC+3 → 09:00-09:30 TR = 06:00-06:30 UTC
        const inWindow = (hour === 6 && now.getUTCMinutes() < 30);
        const force = body?.force === true; // admin-only by virtue of gate above
        if (!inWindow && !force) return ok({ skipped: true, reason: 'outside_window', utc_hour: hour });

        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);
        const dateStr = now.toISOString().slice(0, 10);

        // ── Pre-check: short-circuit if today's summary already exists ──
        const existing = await fetch(
          `${REST}/admin_actions?action_type=eq.daily_telegram_summary&created_at=gte.${encodeURIComponent(todayStart.toISOString())}&select=id,created_at&order=created_at.asc&limit=5`,
          { headers: restHeaders(env) }
        ).then(x => x.ok ? x.json() : []).catch(() => []);
        if (Array.isArray(existing) && existing.length > 0 && !force) {
          return ok({ skipped: true, reason: 'already_sent_today' });
        }

        // ── ATOMIC CLAIM: insert a claim row FIRST, then verify we won the race ──
        const claimResp = await fetch(`${REST}/admin_actions?select=id,created_at`, {
          method: 'POST',
          headers: { ...restHeaders(env), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            action_type: 'daily_telegram_summary',
            details: { date: dateStr, status: 'claiming' },
          }),
        });
        if (!claimResp.ok) {
          const t = await claimResp.text().catch(() => '');
          return ok({ skipped: true, reason: 'claim_insert_failed', status: claimResp.status, body: t.slice(0, 200) });
        }
        const claimRows = await claimResp.json().catch(() => []);
        const myClaim = Array.isArray(claimRows) ? claimRows[0] : null;
        if (!myClaim?.id) return ok({ skipped: true, reason: 'no_claim_id' });

        // Re-query and abort if another row beat us (lower created_at OR lower id at same ts)
        const allToday = await fetch(
          `${REST}/admin_actions?action_type=eq.daily_telegram_summary&created_at=gte.${encodeURIComponent(todayStart.toISOString())}&select=id,created_at&order=created_at.asc,id.asc&limit=5`,
          { headers: restHeaders(env) }
        ).then(x => x.ok ? x.json() : []).catch(() => []);
        const winner = Array.isArray(allToday) && allToday.length > 0 ? allToday[0] : null;
        if (!winner || winner.id !== myClaim.id) {
          return ok({ skipped: true, reason: 'lost_race', winner_id: winner?.id });
        }

        // ── Pull metrics in parallel with strict status checks ──
        const safeJson = async (url) => {
          try {
            const r = await fetch(url, { headers: restHeaders(env) });
            if (!r.ok) return { ok: false, data: null, status: r.status };
            return { ok: true, data: await r.json() };
          } catch (e) { return { ok: false, data: null, error: String(e) }; }
        };
        const [signupsR, kycR, depositsR, pendingR, completedR, topR] = await Promise.all([
          safeJson(`${REST}/user_profiles?created_at=gte.${encodeURIComponent(todayStart.toISOString())}&is_real_user=eq.true&select=id&limit=1000`),
          safeJson(`${REST}/user_profiles?verification_status=eq.verified&updated_at=gte.${encodeURIComponent(todayStart.toISOString())}&select=id&limit=1000`),
          safeJson(`${REST}/transactions?type=eq.deposit&status=eq.completed&created_at=gte.${encodeURIComponent(todayStart.toISOString())}&select=amount,user_id&limit=2000`),
          safeJson(`${REST}/withdrawal_transactions?status=in.(pending,hold)&select=id,amount,coin_symbol&limit=500`),
          safeJson(`${REST}/withdrawal_transactions?status=eq.completed&reviewed_at=gte.${encodeURIComponent(todayStart.toISOString())}&select=amount,coin_symbol&limit=500`),
          safeJson(`${REST}/transactions?type=eq.deposit&status=eq.completed&created_at=gte.${encodeURIComponent(todayStart.toISOString())}&select=amount,user_id&order=amount.desc&limit=5`),
        ]);

        const errs = [signupsR, kycR, depositsR, pendingR, completedR, topR].filter(r => !r.ok).length;
        const sumAmt = (r) => r.ok && Array.isArray(r.data) ? r.data.reduce((s, x) => s + Number(x?.amount || 0), 0) : 0;
        const cnt = (r) => r.ok && Array.isArray(r.data) ? r.data.length : 0;
        const depositsUsd = sumAmt(depositsR);
        const withdrawalsCompletedUsd = sumAmt(completedR);
        const pendingUsd = sumAmt(pendingR);
        const signupsCount = cnt(signupsR);
        const kycCount = cnt(kycR);
        const depositCount = cnt(depositsR);
        const pendingCount = cnt(pendingR);

        // Top depositors: separate query for emails (relationship embed not guaranteed)
        let topLines = '—';
        if (topR.ok && Array.isArray(topR.data) && topR.data.length > 0) {
          const userIds = [...new Set(topR.data.map(d => d.user_id).filter(Boolean))];
          const emailsR = userIds.length > 0
            ? await safeJson(`${REST}/user_profiles?id=in.(${userIds.join(',')})&select=id,email`)
            : { ok: true, data: [] };
          const emailMap = {};
          if (emailsR.ok && Array.isArray(emailsR.data)) {
            for (const u of emailsR.data) emailMap[u.id] = u.email;
          }
          topLines = topR.data.slice(0, 5)
            .map((d, i) => `${i + 1}. ${emailMap[d.user_id] || (d.user_id || '?').slice(0, 8)} — $${Number(d?.amount || 0).toFixed(2)}`)
            .join('\n');
        }

        const errLine = errs > 0 ? `\n\n⚠️ <b>${errs}</b> sorgu başarısız oldu — sayılar eksik olabilir.` : '';
        const msg = `📊 <b>GÜNLÜK ÖZET</b> — ${dateStr}\n\n` +
          `👥 Yeni kayıt: <b>${signupsCount}</b>\n` +
          `✅ KYC tamamlanan: <b>${kycCount}</b>\n` +
          `💰 Yatırım: <b>${depositCount}</b> işlem / <b>$${depositsUsd.toFixed(2)}</b>\n` +
          `💸 Çekim (tamamlanan): <b>$${withdrawalsCompletedUsd.toFixed(2)}</b>\n` +
          `⏸️ Bekleyen çekim: <b>${pendingCount}</b> talep / <b>$${pendingUsd.toFixed(2)}</b>\n\n` +
          `🏆 <b>TOP 5 YATIRIMCI</b>\n${topLines}\n\n` +
          (pendingCount > 0 ? `⚠️ ${pendingCount} bekleyen çekim onayınızı bekliyor.` : '✨ Onay bekleyen çekim yok.') +
          errLine;

        await sendTelegramAlert(msg, env);

        // Update claim row with final metrics
        await fetch(`${REST}/admin_actions?id=eq.${myClaim.id}`, {
          method: 'PATCH',
          headers: { ...restHeaders(env), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            details: { date: dateStr, status: 'sent', signups: signupsCount, kyc: kycCount, deposits_usd: depositsUsd, withdrawals_completed_usd: withdrawalsCompletedUsd, pending_count: pendingCount, pending_usd: pendingUsd, query_errors: errs },
          }),
        }).catch(() => {});

        return ok({ sent: true, signups: signupsCount, kyc: kycCount, deposits_usd: depositsUsd, pending: pendingCount, query_errors: errs });
      }

      /* ── AI TOGGLE ENFORCEMENT (server-side guard against cached clients) ──
         Deletes any AI-flagged admin messages inserted while the global toggle is OFF.
         Called by admin-monitor every few seconds. */
      if (method==='POST' && path==='/ai-cleanup') {
        const setting = await sbGet('exchange_settings', `?key=eq.global_ai_support&select=value`, env).catch(()=>[]);
        const enabled = setting?.[0]?.value?.enabled;
        if (enabled === false) {
          // Delete recent AI replies from the last 5 minutes (covers any cached client that bypasses the check)
          const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const r = await fetch(
            `${REST}/support_messages?sender_type=eq.admin&original_language=eq.ai&created_at=gte.${encodeURIComponent(since)}`,
            { method: 'DELETE', headers: { ...restHeaders(env), Prefer: 'return=representation' } }
          );
          if (r.ok) {
            const deleted = await r.json().catch(()=>[]);
            return ok({ enforced: true, deleted: Array.isArray(deleted) ? deleted.length : 0 });
          }
          return ok({ enforced: true, deleted: 0, error: await r.text().catch(()=>'unknown') });
        }
        return ok({ enforced: false, ai_enabled: true });
      }

      /* ── CRYPTO PRICES ── */
      if (method==='GET' && path==='/crypto-prices') {
        const all = await getAllKuCoinPrices();
        const syms = q.symbols ? q.symbols.split(',').map(s=>s.trim().toUpperCase()) : null;
        if (!syms) return ok(all);
        const out={}; for (const s of syms) if (all[s]) out[s]=all[s];
        return ok(out);
      }

      /* ── TRADFI PRICES ── */
      if (method==='GET' && path==='/tradfi-prices') {
        const syms = q.symbols ? q.symbols.split(',').map(s=>s.trim().toUpperCase()) : null;
        return ok(await getAllTradfiPrices(syms));
      }

      /* ── SPORT SNAPSHOT (single source of truth across all devices) ── */
      if (method==='GET' && path==='/sport/snapshot') {
        const matches = await getSportSnapshot(env);
        return ok({ matches, serverTime: Date.now() });
      }

      /* ── PORTFOLIO VALUE (single source of truth across devices) ── */
      if (method==='GET' && path==='/portfolio-value') {
        const auth = request.headers.get('authorization') || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!token) return err(401, 'Missing auth token');

        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY },
          signal: AbortSignal.timeout(8000),
        });
        if (!userRes.ok) return err(401, 'Invalid auth token');
        const userJson = await userRes.json();
        const userId = userJson?.id;
        if (!userId) return err(401, 'Invalid user');

        const [balanceRows, positions, cryptoPrices, tradfiPrices] = await Promise.all([
          sbGet('user_balances', `?user_id=eq.${userId}&select=symbol,balance,futures_balance`, env).catch(()=>[]),
          sbGet('futures_positions', `?user_id=eq.${userId}&status=eq.open&select=symbol,side,entry_price,position_size`, env).catch(()=>[]),
          getAllKuCoinPrices().catch(()=>({})),
          getAllTradfiPrices(null).catch(()=>({})),
        ]);

        const rows = balanceRows || [];
        const spotBalances = rows.map(r => ({ symbol: r.symbol, balance: parseFloat(r.balance) || 0 }));
        const usdtRow = rows.find(r => r.symbol === 'USDT');
        const futuresWallet = parseFloat(usdtRow?.futures_balance || '0') || 0;

        const getPrice = (sym) => {
          if (sym === 'USDT') return 1;
          if (sym === 'EQ' || sym === 'EQL') return 0;
          if (cryptoPrices[sym]) return cryptoPrices[sym].price;
          if (tradfiPrices[sym]) return tradfiPrices[sym].price;
          return 0;
        };

        let spotTotal = 0;
        const missingPrices = [];
        for (const b of spotBalances) {
          if (b.symbol === 'EQ' || b.symbol === 'EQL') continue;
          if (b.balance <= 0) continue;
          const p = getPrice(b.symbol);
          if (p <= 0 && b.symbol !== 'USDT') { missingPrices.push(b.symbol); continue; }
          spotTotal += b.balance * p;
        }

        let futuresUnrealizedPnL = 0;
        for (const pos of (positions || [])) {
          const coin = String(pos.symbol).replace(/usdt$/i, '');
          const cur = getPrice(coin);
          const entry = parseFloat(pos.entry_price) || 0;
          const sz = parseFloat(pos.position_size) || 0;
          if (entry <= 0 || sz <= 0 || cur <= 0) continue;
          const qty = sz / entry;
          const pnl = pos.side === 'LONG' ? (cur - entry) * qty : (entry - cur) * qty;
          futuresUnrealizedPnL += pnl;
        }

        const total = spotTotal + futuresWallet + futuresUnrealizedPnL;

        // ── Today's PnL (Binance-style, resets every day at 04:00 TR / 01:00 UTC) ──
        // Trading day: subtract 1h from UTC so the rollover happens at UTC 01:00 = TR 04:00.
        const tradingDay = new Date(Date.now() - 3600_000).toISOString().split('T')[0];
        let startingValue = total;
        let dailyPnL = 0;
        let dailyPnLPercentage = 0;
        try {
          const existing = await sbGet(
            'daily_portfolio_snapshots',
            `?user_id=eq.${userId}&snapshot_date=eq.${tradingDay}&select=total_value_usdt&limit=1`,
            env
          ).catch(() => []);
          if (existing && existing[0] && parseFloat(existing[0].total_value_usdt) > 0) {
            startingValue = parseFloat(existing[0].total_value_usdt);
          } else if (total > 0) {
            // Lazy snapshot: first request of the trading day creates the baseline.
            await fetch(`${SUPABASE_URL}/rest/v1/daily_portfolio_snapshots`, {
              method: 'POST',
              headers: {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=minimal',
              },
              body: JSON.stringify({
                user_id: userId,
                snapshot_date: tradingDay,
                total_value_usdt: total,
                balances: { __formula_v2__: true },
              }),
              signal: AbortSignal.timeout(5000),
            }).catch(() => null);
            startingValue = total;
          }
          dailyPnL = total - startingValue;
          dailyPnLPercentage = startingValue > 0
            ? Math.max(-100, Math.min(100000, (dailyPnL / startingValue) * 100))
            : 0;
        } catch (e) {
          startingValue = total;
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            total, spotTotal, futuresWallet, futuresUnrealizedPnL,
            spotBalances, missingPrices,
            startingValue, dailyPnL, dailyPnLPercentage, tradingDay,
          },
        }), {
          status: 200,
          headers: {
            ...CORS,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'CDN-Cache-Control': 'no-store',
            'Cloudflare-CDN-Cache-Control': 'no-store',
          },
        });
      }

      /* ── TEAM LOGO (JSON) ── */
      if (method==='GET' && path==='/team-logo') {
        const name=(q.name||'').trim();
        if (!name) return ok({badgeUrl:null});
        return ok({badgeUrl: await resolveBadge(name)});
      }

      /* ── TEAM LOGO (image proxy) ── */
      if (method==='GET' && path==='/team-logo-img') {
        const name=(q.name||'').trim();
        if (!name) return err(400,'name required');
        const badgeUrl = await resolveBadge(name);
        if (!badgeUrl) return new Response('',{status:404,headers:CORS});
        const r = await fetch(badgeUrl,{signal:AbortSignal.timeout(8000)});
        if (!r.ok) return new Response('',{status:404,headers:CORS});
        const ct = r.headers.get('content-type')||'image/png';
        const buf = await r.arrayBuffer();
        return new Response(buf,{status:200,headers:{...CORS,'Content-Type':ct,'Cache-Control':'public, max-age=86400'}});
      }

      /* ── MATCH CONTROLS ── */
      if (method==='GET' && path==='/admin/match-controls') return ok(await loadControls(env));
      if (method==='POST' && path==='/admin/match-controls') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const {homeTeam,awayTeam,targetResult,targetScore,targetTotal,pinned,resetMatch}=body;
        if (!homeTeam||!awayTeam) return err(400,'homeTeam and awayTeam required');
        const controls=await loadControls(env);
        const key=`${homeTeam.trim()}:${awayTeam.trim()}`;
        const existing=controls.find(c=>`${c.homeTeam.trim()}:${c.awayTeam.trim()}`===key);
        let computedScore=targetScore||undefined;
        if (targetTotal&&Number(targetTotal)>0) {
          const tot=Number(targetTotal),res2=targetResult||'X';
          if (res2==='X'){const h2=Math.floor(tot/2);computedScore={h:h2,a:h2};}
          else if (res2==='1'){const a=Math.max(0,Math.floor((tot-1)/2));computedScore={h:tot-a,a};}
          else {const h=Math.max(0,Math.floor((tot-1)/2));computedScore={h,a:tot-h};}
        }
        const ctrl={id:existing?.id||genId(),homeTeam:homeTeam.trim(),awayTeam:awayTeam.trim(),targetResult:targetResult||undefined,targetScore:computedScore,targetTotal:targetTotal?Number(targetTotal):undefined,startedAt:resetMatch?Date.now():existing?.startedAt,pinned:!!pinned,createdAt:existing?.createdAt||Date.now()};
        const newControls=existing?controls.map(c=>`${c.homeTeam}:${c.awayTeam}`===key?ctrl:c):[...controls,ctrl];
        await saveControls(newControls,env);
        return ok({ok:true,ctrl});
      }
      if (method==='DELETE' && /^\/admin\/match-controls\//.test(path)) {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const id=path.split('/').pop();
        const controls=await loadControls(env);
        await saveControls(controls.filter(c=>c.id!==id),env);
        return ok({ok:true});
      }
      if (method==='PUT' && path==='/sport/controls') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        if (!Array.isArray(body)) return err(400,'body must be array');
        await saveControls(body,env); return ok({ok:true});
      }

      /* ── SPORT BETS ── */
      if (method==='POST' && path==='/sport-bets') {
        const {id,userId,matchId,homeTeam,awayTeam,betType,odds,stake,potentialWin,ouLine}=body;
        if (!id||!userId||!matchId||!homeTeam||!awayTeam||!betType) return err(400,'Missing required fields');
        if (!await loadBet(id,env)) await saveBet({id,userId,matchId,homeTeam,awayTeam,betType,odds:Number(odds),stake:Number(stake),potentialWin:Number(potentialWin),ouLine:ouLine!=null?Number(ouLine):null,status:'open',createdAt:Date.now()},env);
        return ok({ok:true});
      }
      if (method==='PATCH' && /^\/sport-bets\//.test(path)) {
        const id=path.split('/').pop();
        const {status}=body;
        if (!['won','lost','refunded'].includes(status)) return err(400,'status must be won, lost, or refunded');
        const bet=await loadBet(id,env);
        if (bet){bet.status=status;bet.settledAt=Date.now();await saveBet(bet,env);}
        return ok({ok:true});
      }
      if (method==='GET' && path==='/admin/bet-exposure') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const allBets=await loadAllBets(env);
        const cutoff=Date.now()-2*60*60*1000;
        const rows=allBets.filter(b=>b.createdAt>=cutoff);
        const map=new Map();
        for (const row of rows) {
          const key=`${row.homeTeam}:${row.awayTeam}`;
          if (!map.has(key)) map.set(key,{homeTeam:row.homeTeam,awayTeam:row.awayTeam,bets:{},totalStake:0,totalBets:0,uniqueUsers:new Set(),openCount:0,wonCount:0,lostCount:0,refundedCount:0});
          const e=map.get(key);
          if (row.status==='open'){if (!e.bets[row.betType])e.bets[row.betType]={count:0,totalStake:0};e.bets[row.betType].count++;e.bets[row.betType].totalStake+=row.stake;e.totalStake+=row.stake;}
          e.totalBets++;e.uniqueUsers.add(row.userId);
          if (row.status==='open')e.openCount++;else if (row.status==='won')e.wonCount++;else if (row.status==='lost')e.lostCount++;else e.refundedCount++;
        }
        const result=Array.from(map.values()).sort((a,b)=>b.totalBets-a.totalBets).map(e=>({homeTeam:e.homeTeam,awayTeam:e.awayTeam,bets:e.bets,totalStake:+e.totalStake.toFixed(2),totalBets:e.totalBets,uniqueUsers:e.uniqueUsers.size,openCount:e.openCount,wonCount:e.wonCount,lostCount:e.lostCount,refundedCount:e.refundedCount}));
        return ok(result);
      }

      /* ── ADMIN: USERS ── */
      if (method==='GET' && path==='/admin/users') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        return ok(await sbGet('user_profiles','?select=id,email,full_name,is_admin,is_active,is_real_user,is_deleted,created_at,updated_at,verification_status,user_level&is_deleted=eq.false&is_real_user=eq.true&order=updated_at.desc.nullslast&limit=500',env));
      }
      if (method==='POST' && path==='/admin/set-user-level') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const {userId,level}=body;
        if (!userId||level===undefined) return err(400,'userId and level required');
        return ok({ok:true,data:await sbPatch('user_profiles',`?id=eq.${userId}`,{user_level:Number(level)},env)});
      }
      if (method==='GET' && path==='/admin/user-counters') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const userId = url.searchParams.get('userId');
        if (!userId) return err(400,'userId required');
        try {
          // wallet_transactions: kronolojik sırayla, her adımda 0'ın altına
          // düşmemek üzere topla. Böylece eski "−14242" gibi büyük sıfırlamalar
          // sayacı negatif tutmaz; yeni eklenenler hemen görünür.
          const txRes = await fetch(`${REST}/wallet_transactions?user_id=eq.${userId}&status=eq.confirmed&select=amount,amount_usd,token_symbol,network,from_address,created_at&order=created_at.asc`, { headers: restHeaders(env) });
          const txs = txRes.ok ? await txRes.json() : [];
          let depositTotal = 0;
          for (const t of txs) {
            const sym = String(t.token_symbol || '').toUpperCase();
            const isAdj = String(t.network || '').toLowerCase() === 'admin_adjust'
              || String(t.from_address || '').toLowerCase() === 'admin_manual_counter_adjust';
            const usd = parseFloat(t.amount_usd ?? 0);
            let delta = 0;
            if (isAdj) {
              if (!isNaN(usd) && usd !== 0) delta = usd;
              else {
                const amt = parseFloat(t.amount ?? 0);
                if (!isNaN(amt)) delta = amt;
              }
            } else if (!isNaN(usd) && usd > 0) {
              delta = usd;
            } else if (sym === 'USDT' || sym === 'USDC' || sym === 'BUSD' || sym === 'DAI') {
              const amt = parseFloat(t.amount ?? 0);
              if (!isNaN(amt) && amt > 0) delta = amt;
            }
            depositTotal = Math.max(0, depositTotal + delta);
          }

          // user_trades: aynı mantık — kronolojik, her adımda min 0
          const trRes = await fetch(`${REST}/user_trades?user_id=eq.${userId}&select=symbol,total,created_at&order=created_at.asc`, { headers: restHeaders(env) });
          const trs = trRes.ok ? await trRes.json() : [];
          let volumeTotal = 0;
          for (const r of trs) {
            const t = parseFloat(r.total ?? 0);
            if (isNaN(t)) continue;
            volumeTotal = Math.max(0, volumeTotal + t);
          }
          return ok({ ok:true, depositTotal, volumeTotal });
        } catch (e) {
          return err(500, 'user-counters failed: ' + (e?.message || String(e)));
        }
      }
      if (method==='POST' && path==='/admin/counter-adjust') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const {userId, kind, amount} = body;
        if (!userId || !kind || amount === undefined || amount === null) {
          return err(400,'userId, kind (deposit|volume), amount required');
        }
        const amt = Number(amount);
        if (!isFinite(amt) || amt === 0) return err(400,'amount must be a non-zero number');
        const rh = {...restHeaders(env),'Content-Type':'application/json',Prefer:'return=representation'};
        try {
          if (kind === 'deposit') {
            const r = await fetch(`${REST}/wallet_transactions`, {
              method:'POST', headers: rh,
              body: JSON.stringify({
                user_id: userId,
                token_symbol: 'USDT',
                amount: amt,
                amount_usd: amt,
                status: 'confirmed',
                network: 'admin_adjust',
                from_address: 'admin_manual_counter_adjust',
              })
            });
            if (!r.ok) return err(500, 'wallet_transactions insert failed: ' + (await r.text()).slice(0,300));
            const data = await r.json().catch(()=>null);
            try {
              await fetch(`${REST}/admin_actions`, {
                method:'POST', headers: rh,
                body: JSON.stringify({ action_type:'counter_adjust', target_user_id:userId, details:{ amount_usd:amt, direction: amt>=0?'add':'subtract' } })
              });
            } catch {}
            return ok({ ok:true, kind, amount:amt, row:data });
          }
          if (kind === 'volume') {
            const r = await fetch(`${REST}/user_trades`, {
              method:'POST', headers: rh,
              body: JSON.stringify({
                user_id: userId,
                symbol: 'ADMIN_ADJUST',
                side: amt >= 0 ? 'buy' : 'sell',
                total: amt,
                price: 1,
                quantity: Math.abs(amt),
                fee: 0,
                realized_pnl: 0,
              })
            });
            if (!r.ok) return err(500, 'user_trades insert failed: ' + (await r.text()).slice(0,300));
            const data = await r.json().catch(()=>null);
            try {
              await fetch(`${REST}/admin_actions`, {
                method:'POST', headers: rh,
                body: JSON.stringify({ action_type:'volume_adjust', target_user_id:userId, details:{ amount_usdt:amt, direction: amt>=0?'add':'subtract' } })
              });
            } catch {}
            return ok({ ok:true, kind, amount:amt, row:data });
          }
          return err(400, 'kind must be "deposit" or "volume"');
        } catch (e) {
          return err(500, 'counter-adjust failed: ' + (e?.message || String(e)));
        }
      }

      /* ── ADMIN: WALLETS ── */
      if (method==='POST' && path==='/admin/auto-assign-wallets') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const walletData=await sbRpc('admin_get_real_users_with_wallets',{},env);
        const walletless=(walletData||[]).filter(u=>!u.bep20_address&&!u.trc20_address);
        let assigned=0,failed=0;
        const now=new Date().toISOString();
        for (const user of walletless) {
          const uid=user.user_id;
          try {
            const rh={...restHeaders(env),'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'};
            const r1=await fetch(`${REST}/wallet_pool`,{method:'POST',headers:rh,body:JSON.stringify({network:'BEP20',address:genBep20(uid),is_assigned:true,assigned_at:now,assigned_to_user_id:uid})});
            const r2=await fetch(`${REST}/wallet_pool`,{method:'POST',headers:rh,body:JSON.stringify({network:'TRC20',address:genTrc20(uid),is_assigned:true,assigned_at:now,assigned_to_user_id:uid})});
            if (r1.ok&&r2.ok)assigned++;else failed++;
          } catch {failed++;}
        }
        return ok({ok:true,assigned,failed,total:walletless.length});
      }
      // Self-service: any authenticated user gets their BSC + TRC wallet auto-assigned
      if (method==='POST' && path==='/assign-wallet-self') {
        const uid = request.headers.get('x-requester-id');
        if (!uid) return err(401,'Login required');
        try {
          const exHeaders = {...restHeaders(env)};
          const exRes = await fetch(`${REST}/wallet_pool?assigned_to_user_id=eq.${uid}&select=network,address`, {headers: exHeaders});
          const existing = exRes.ok ? await exRes.json() : [];
          const has = {BEP20: existing.find(w=>w.network==='BEP20'), TRC20: existing.find(w=>w.network==='TRC20')};
          const now = new Date().toISOString();
          const rh = {...restHeaders(env),'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'};
          if (!has.BEP20) await fetch(`${REST}/wallet_pool`,{method:'POST',headers:rh,body:JSON.stringify({network:'BEP20',address:genBep20(uid),is_assigned:true,assigned_at:now,assigned_to_user_id:uid})});
          if (!has.TRC20) await fetch(`${REST}/wallet_pool`,{method:'POST',headers:rh,body:JSON.stringify({network:'TRC20',address:genTrc20(uid),is_assigned:true,assigned_at:now,assigned_to_user_id:uid})});
          return ok({ok:true, bep20: has.BEP20?.address || genBep20(uid), trc20: has.TRC20?.address || genTrc20(uid), created: !has.BEP20 || !has.TRC20});
        } catch (e) {
          return err(500, 'Wallet assign failed: ' + (e.message || e));
        }
      }
      if (method==='POST' && path==='/admin/assign-wallet-single') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const {userId}=body;
        if (!userId) return err(400,'userId required');
        const now=new Date().toISOString();
        const rh={...restHeaders(env),'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'};
        const r1=await fetch(`${REST}/wallet_pool`,{method:'POST',headers:rh,body:JSON.stringify({network:'BEP20',address:genBep20(userId),is_assigned:true,assigned_at:now,assigned_to_user_id:userId})});
        const r2=await fetch(`${REST}/wallet_pool`,{method:'POST',headers:rh,body:JSON.stringify({network:'TRC20',address:genTrc20(userId),is_assigned:true,assigned_at:now,assigned_to_user_id:userId})});
        if (!r1.ok||!r2.ok) return err(500,'Wallet assignment failed');
        return ok({ok:true,bep20:genBep20(userId),trc20:genTrc20(userId)});
      }

      /* ── ANON SESSIONS ── */
      if (method==='GET' && (path==='/anon-sessions'||path==='/anon-sessions/stream')) {
        const all=await loadAllSessions(env);
        const cutoff=new Date(Date.now()-30*60*1000).toISOString();
        const active=all.filter(s=>s&&s.last_active>=cutoff).sort((a,b)=>b.last_active.localeCompare(a.last_active)).slice(0,100);
        if (path==='/anon-sessions/stream') {
          return new Response(`data: ${JSON.stringify(active)}\n\n`,{status:200,headers:{...CORS,'Content-Type':'text/event-stream','Cache-Control':'no-cache'}});
        }
        return ok(active);
      }
      if (method==='POST' && path==='/anon-sessions') {
        const {visitor_id,session_id,current_page,device_type,browser,os}=body;
        if (!visitor_id||!session_id) return err(400,'visitor_id and session_id required');
        const ip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||null;
        const existing=await loadOneSession(visitor_id,env);
        let country=existing?.country||null,city=existing?.city||null;
        if (!country&&ip){const geo=await lookupGeo(ip);country=geo.country;city=geo.city;}
        const now=new Date().toISOString();
        const rec={id:existing?.id||crypto.randomUUID(),visitor_id,session_id,current_page:current_page||'Exchange',ip_address:ip,country,city,device_type:device_type||'desktop',browser:browser||'Unknown',os:os||'Unknown',last_active:now,created_at:existing?.created_at||now};
        await saveOneSession(visitor_id,rec,env);
        return ok({ok:true});
      }
      if (method==='DELETE' && /^\/anon-sessions\//.test(path)) {
        const visitor_id=path.split('/').pop();
        if (!visitor_id) return err(400,'visitor_id required');
        await deleteOneSession(visitor_id,env);
        return ok({ok:true});
      }

      /* ── PUSH NOTIFICATIONS ── */
      if (method==='GET' && path==='/push/vapid-key') {
        if (!env.VAPID_PUBLIC_KEY) return err(503,'Push devre dışı');
        return ok({publicKey:env.VAPID_PUBLIC_KEY});
      }
      if (method==='POST' && path==='/push/subscribe') {
        const {endpoint,keys}=body;
        if (!endpoint||!keys?.p256dh||!keys?.auth) return err(400,'Geçersiz abonelik');
        const subs=await loadSubs(env);
        const exists=subs.some(s=>s.endpoint===endpoint);
        if (!exists){subs.push({endpoint,keys:{p256dh:keys.p256dh,auth:keys.auth}});await saveSubs(subs,env);}
        return ok({ok:true,total:subs.length+(exists?0:1)});
      }
      if (method==='DELETE' && path==='/push/subscribe') {
        const {endpoint}=body;
        if (!endpoint) return err(400,'endpoint required');
        await saveSubs((await loadSubs(env)).filter(s=>s.endpoint!==endpoint),env);
        return ok({ok:true});
      }
      if (method==='POST' && path==='/push/send') {
        const {title,body:msgBody,severity,tag}=body;
        if (!title||!msgBody) return err(400,'title ve body gerekli');
        if (!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY) return err(503,'VAPID not configured');
        const subs=await loadSubs(env);
        let sent=0;
        await Promise.allSettled(subs.map(async sub=>{
          try{await sendPushNotification(sub,JSON.stringify({title,body:msgBody,severity:severity||'high',tag}),env);sent++;}catch{}
        }));
        return ok({ok:true,sent});
      }
      if (method==='GET' && path==='/push/status') {
        return ok({subscriptions:(await loadSubs(env)).length,vapid:!!env.VAPID_PUBLIC_KEY});
      }
      if (method==='POST' && path==='/push/clear') {
        await saveSubs([],env); return ok({ok:true});
      }

      /* ═════════════════════════════════════════════
         TELEGRAM KONTROL SİSTEMİ — bildirim + komut + buton + reply
         ═════════════════════════════════════════════ */
      if (method==='POST' && path==='/notify-event') {
        try {
          let text = String(body?.text || '').slice(0, 3900);
          if (!text) return err(400, 'text required');

          /* Admin stealth disabled on request — admin activity is now broadcast
             to Telegram like any other user. */
          const keyboard = body?.keyboard || null;
          const silent = body?.silent === true;
          const channel = body?.channel || 'main'; // 'main' | 'feed'

          /* ── 🌍 GERÇEK KONUM — Cloudflare edge'den AUTHORITATIVE geo ──
             Tarayıcı ipapi.co'dan veri alamasa bile bu HER ZAMAN doğru.
             Bilinmeyen ziyaretçi olmaz: IP, ülke, şehir, ASN garanti. */
          const cf = request.cf || {};
          const realIP = request.headers.get('CF-Connecting-IP')
                      || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
                      || request.headers.get('X-Real-IP')
                      || null;
          const realCountry = cf.country || request.headers.get('CF-IPCountry') || null;
          const realCity = cf.city || null;
          const realRegion = cf.region || null;
          const realASN = cf.asOrganization || (cf.asn ? `AS${cf.asn}` : null);
          const realTZ = cf.timezone || null;
          const cc2 = realCountry && realCountry.length === 2 ? realCountry.toUpperCase() : '';
          const realFlag = cc2
            ? String.fromCodePoint(0x1F1E6 - 0x41 + cc2.charCodeAt(0))
            + String.fromCodePoint(0x1F1E6 - 0x41 + cc2.charCodeAt(1))
            : '🌍';

          // 1) Mesajdaki "?/?" ve "?" placeholder'larını GERÇEK veriyle değiştir
          if (realCountry || realCity) {
            const realLoc = `${realCountry || '?'} / ${realCity || '?'}`;
            text = text.replace(/🌍\s*\?\s*\/\s*\?/g, `🌍 ${realLoc}`);
            text = text.replace(/🌍\s*\?/g, `🌍 ${realCountry || realCity || '?'}`);
          }
          if (realIP) {
            text = text.replace(/📡\s*\?/g, `📡 ${realIP}`);
          }

          // Otomatik Türkçeye çevir (İngilizce UI metinleri için)
          if (body?.translate !== false) {
            text = await translateToTurkish(text);
          }

          // 2) Her bildirimin altına KESİN edge bilgisini ekle (asla "bilinmiyor" olmaz)
          const edgeFooterParts = [];
          if (realFlag !== '🌍' || realCountry) edgeFooterParts.push(`${realFlag} ${realCountry || ''}${realCity ? ' / ' + realCity : ''}${realRegion && realRegion !== realCity ? ' (' + realRegion + ')' : ''}`);
          if (realIP) edgeFooterParts.push(`📡 <code>${realIP}</code>`);
          if (realASN) edgeFooterParts.push(`🏢 ${realASN}`);
          if (realTZ) edgeFooterParts.push(`🕐 ${realTZ}`);
          if (edgeFooterParts.length > 0) {
            text += `\n\n━━━━━━━━━━━━\n📍 <b>EDGE DOĞRULAMA</b>\n` + edgeFooterParts.join('\n');
          }

          const result = await tgSendMessage(env, text, { keyboard, silent, channel });
          return ok({ok: result.ok === true, telegram: result });
        } catch (e) { return err(500, String(e?.message||e)); }
      }

      // Telegram'dan gelen güncellemeler (komut, buton, reply)
      if (method==='POST' && path==='/telegram-webhook') {
        try {
          // Güvenlik: secret_token header doğrula (eğer set edilmişse)
          const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET;
          if (expectedSecret) {
            const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
            if (got !== expectedSecret) return err(403, 'forbidden');
          }
          await handleTelegramUpdate(body, env);
          return ok({ok:true});
        } catch (e) {
          console.error('TG webhook error', e);
          return ok({ok:true}); // her zaman 200 dön ki Telegram retry yapmasın
        }
      }

      // Cron tarafından çağrılır → günlük özet gönder
      if (method==='POST' && path==='/telegram-daily-summary') {
        try {
          await sendDailySummary(env);
          return ok({ok:true});
        } catch (e) { return err(500, String(e?.message||e)); }
      }

      /* ── BSC / TRC-20 PARA RADARI ── */
      if (method==='POST' && path==='/scan-deposits') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const result = await scanAllWallets(env, 'main', {
          offset: body?.offset, limit: body?.limit,
        });
        return ok(result);
      }
      if (method==='POST' && path==='/scan-deposits-trx') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const result = await scanAllWallets(env, 'trx', {
          offset: body?.offset, limit: body?.limit,
        });
        return ok(result);
      }

      /* ── PUBLIC CRON ENDPOINT — to be hit every 1-2 min by cron-job.org ──
         Token guarded so random bots cannot spam it.
         Loops through ALL assigned wallets (BEP20 + TRC20) in a single call,
         respecting a ~22s CPU budget. Returns aggregate stats + Telegram fires
         automatically inside scanAllWallets when new deposits are found. */
      if ((method==='GET' || method==='POST') && (path==='/cron/scan-all' || path==='/cron/scan')) {
        const tokenIn = url.searchParams.get('token') || request.headers.get('x-cron-token') || '';
        const expected = env.CRON_SECRET || env.SUPABASE_SERVICE_ROLE_KEY?.slice(-12) || '';
        if (!expected || tokenIn !== expected) return err(403, 'Forbidden — pass ?token=<CRON_SECRET>');
        const aggregate = await runFullScan(env, 24000);
        // Piggyback the prediction-market refresh on the already-configured cron.
        try { aggregate.predictions = await pmRunSyncAndSettle(env); } catch {}
        aggregate.ok = true;
        return ok(aggregate);
      }
      /* Basonce Market cron: refresh Polymarket markets + auto-settle resolved.
         Hit from cron-job.org/UptimeRobot every few minutes, or relies on the
         native scheduled() handler / the scan-all piggyback above. */
      if ((method==='GET' || method==='POST') && path==='/cron/predictions-sync') {
        const tokenIn = url.searchParams.get('token') || request.headers.get('x-cron-token') || '';
        const expected = env.CRON_SECRET || env.SUPABASE_SERVICE_ROLE_KEY?.slice(-12) || '';
        if (!expected || tokenIn !== expected) return err(403, 'Forbidden — pass ?token=<CRON_SECRET>');
        const res = await pmRunSyncAndSettle(env);
        res.ok = true;
        return ok(res);
      }
      if (method==='GET' && path==='/debug-scan') {
        const addr = url.searchParams.get('addr') || '';
        if (!addr) return err(400,'addr required');
        const debug = {addr, rpcs: BSC_RPCS, results: []};
        for (const u of BSC_RPCS) {
          try {
            const r = await fetch(u, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_blockNumber',params:[]}),signal:AbortSignal.timeout(8000)});
            const j = await r.json();
            debug.results.push({rpc:u, blockNumber:j.result, error:j.error});
          } catch (e) { debug.results.push({rpc:u, fetchError:e.message}); }
        }
        const txs = await scanBscWallet(addr, env);
        return ok({...debug, scannedTxs: txs.length, sample: txs.slice(0,5)});
      }

      /* ════════════════════════════════════════════════════════════════
         BRANDED EMAIL — bypass Supabase default mail, send via Brevo
         POST /api/branded-email  body:{type:'recovery'|'magiclink', email}
         ════════════════════════════════════════════════════════════════ */
      if (path === '/branded-email' && method === 'POST') {
        try {
          const t = String(body?.type || '');
          const email = String(body?.email || '').trim().toLowerCase();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, 'invalid email');
          if (!['recovery','magiclink'].includes(t)) return err(400, 'invalid type');
          if (!env.BREVO_API_KEY) return err(500, 'BREVO_API_KEY not configured');

          const redirectTo = t === 'recovery'
            ? 'https://basonce.com/#reset-password'
            : 'https://basonce.com/';

          const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: env.SUPABASE_SERVICE_ROLE_KEY },
            body: JSON.stringify({ type: t, email, options: { redirect_to: redirectTo } }),
          });
          const linkData = await linkRes.json().catch(()=>null);
          if (!linkRes.ok) {
            // Don't leak whether email exists - silently succeed for user_not_found
            if (linkData?.error_code === 'user_not_found' || linkRes.status === 404) {
              return ok({ ok:true });
            }
            return err(linkRes.status, 'link gen failed: ' + JSON.stringify(linkData).slice(0,300));
          }
          // Build OUR OWN link bypassing Supabase's verify endpoint (avoids Site URL redirect issues).
          // Frontend ResetPasswordModal will read token_hash from URL hash and call verifyOtp.
          const props = linkData?.properties || linkData || {};
          const hashedToken = props.hashed_token || props.token_hash;
          if (!hashedToken) {
            // Fallback to default action_link if hashed_token absent (older Supabase responses)
            const fallback = linkData?.action_link || props.action_link;
            if (!fallback) return ok({ ok:true, skipped:'no_link' });
            var actionLink = fallback;
          } else {
            var actionLink = t === 'recovery'
              ? `https://basonce.com/#reset-password&token_hash=${encodeURIComponent(hashedToken)}&type=recovery`
              : `https://basonce.com/#token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;
          }

          const subject = t === 'recovery' ? 'Reset Your BASONCE Password' : 'Your BASONCE Sign-In Link';
          const heading = t === 'recovery' ? '🔐 Reset Your Password' : '✨ Sign In to BASONCE';
          const intro = t === 'recovery'
            ? 'We received a request to reset the password for your BASONCE account. Click the button below to choose a new password.'
            : 'Click the button below to securely sign in to your BASONCE account. No password required.';
          const cta = t === 'recovery' ? 'Reset Password' : 'Sign In Now';
          const expiry = t === 'recovery' ? '60 minutes' : '15 minutes';

          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0B0E11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0E11;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#181A20;border:1px solid #2B3139;border-radius:16px;overflow:hidden;">
<tr><td align="center" style="padding:32px 24px 16px 24px;background:linear-gradient(180deg,#1E2329 0%,#181A20 100%);">
<img src="https://basonce.com/basonce_logo_son_biten.png" width="64" height="64" alt="BASONCE" style="display:block;border-radius:12px;">
<h1 style="margin:16px 0 4px 0;color:#F0B90B;font-size:24px;letter-spacing:1px;font-weight:700;">BASONCE</h1>
<p style="margin:0;color:#848E9C;font-size:11px;letter-spacing:3px;">EXCHANGE</p>
</td></tr>
<tr><td style="padding:32px 32px 8px 32px;">
<h2 style="margin:0 0 16px 0;color:#EAECEF;font-size:22px;font-weight:600;">${heading}</h2>
<p style="color:#B7BDC6;font-size:15px;line-height:1.6;margin:0 0 12px 0;">${intro}</p>
<p style="color:#B7BDC6;font-size:15px;line-height:1.6;margin:0;">This link expires in <strong style="color:#F0B90B;">${expiry}</strong>.</p>
</td></tr>
<tr><td align="center" style="padding:24px 32px 8px 32px;">
<a href="${actionLink}" style="display:inline-block;padding:14px 36px;background:#F0B90B;color:#0B0E11;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${cta}</a>
</td></tr>
<tr><td style="padding:8px 32px 32px 32px;">
<p style="color:#848E9C;font-size:12px;line-height:1.6;margin:16px 0 0 0;">Or copy this link to your browser:<br><span style="color:#5E6673;word-break:break-all;">${actionLink}</span></p>
<div style="border-top:1px solid #2B3139;margin:24px 0 0 0;padding-top:16px;">
<p style="color:#5E6673;font-size:12px;line-height:1.6;margin:0;">If you did not request this, please ignore this email. Your account remains secure.</p>
</div></td></tr></table>
<p style="color:#5E6673;font-size:11px;margin:16px 0 0 0;">© 2026 BASONCE Exchange · <a href="https://basonce.com" style="color:#848E9C;text-decoration:none;">basonce.com</a><br>Sent to ${email} · Do not reply to this email</p>
</td></tr></table></body></html>`;

          const sendRes = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
              sender: { name: 'BASONCE Exchange', email: 'basonce@basonce.com' },
              to: [{ email }],
              subject,
              htmlContent: html,
            }),
          });
          if (!sendRes.ok) {
            const tx = await sendRes.text().catch(()=>'');
            return err(500, 'brevo send failed: ' + tx.slice(0,300));
          }
          return ok({ ok:true });
        } catch (e) { return err(500, String(e?.message || e)); }
      }

      /* ════════════════════════════════════════════════════════════════
         SOCIAL MEDIA — single composer, multi-platform publishing
         ════════════════════════════════════════════════════════════════ */
      if (path === '/social/credentials' && method === 'GET') {
        if (!isAdmin(request.headers)) return err(403, 'Forbidden');
        const r = await fetch(`${REST}/social_credentials?id=eq.1&select=credentials`, { headers: restHeaders(env) });
        const rows = await r.json().catch(() => []);
        return ok({ credentials: rows?.[0]?.credentials || {} });
      }
      if (path === '/social/credentials' && method === 'POST') {
        if (!isAdmin(request.headers)) return err(403, 'Forbidden');
        const credentials = body?.credentials || {};
        const r = await fetch(`${REST}/social_credentials?id=eq.1`, {
          method: 'PATCH',
          headers: { ...restHeaders(env), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ credentials, updated_at: new Date().toISOString() }),
        });
        if (!r.ok) {
          const t = await r.text().catch(() => '');
          return err(500, 'Failed to save: ' + t.slice(0, 200));
        }
        return ok({ ok: true });
      }
      if (path === '/social/history' && method === 'GET') {
        if (!isAdmin(request.headers)) return err(403, 'Forbidden');
        const r = await fetch(`${REST}/social_posts?select=id,content,image_url,platforms,results,created_at&order=created_at.desc&limit=50`, { headers: restHeaders(env) });
        const posts = await r.json().catch(() => []);
        return ok({ posts: Array.isArray(posts) ? posts : [] });
      }
      if (path === '/social/post' && method === 'POST') {
        if (!isAdmin(request.headers)) return err(403, 'Forbidden');
        const { content, imageUrl, platforms } = body || {};
        if (!content || !Array.isArray(platforms) || platforms.length === 0) {
          return err(400, 'content and platforms[] required');
        }
        // Load credentials
        const cRes = await fetch(`${REST}/social_credentials?id=eq.1&select=credentials`, { headers: restHeaders(env) });
        const cRows = await cRes.json().catch(() => []);
        const creds = cRows?.[0]?.credentials || {};

        const results = {};
        for (const plat of platforms) {
          try {
            results[plat] = await postToPlatform(plat, content, imageUrl, creds, env);
          } catch (e) {
            results[plat] = { ok: false, message: e?.message || 'Unknown error' };
          }
        }
        const allOk = Object.values(results).every(r => r.ok);

        // Persist history (best-effort)
        const requesterId = request.headers.get('x-requester-id');
        await fetch(`${REST}/social_posts`, {
          method: 'POST',
          headers: { ...restHeaders(env), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ content, image_url: imageUrl || null, platforms, results, posted_by: requesterId }),
        }).catch(() => {});

        return ok({ allOk, results });
      }

      /* ╔══════════════════════════════════════════════════════════════╗
         ║  P2P TRADING — gerçek emanet (escrow) tabanlı sistem         ║
         ╚══════════════════════════════════════════════════════════════╝ */

      // P2P helper'ları
      const p2pAuthUid = async () => {
        const uid = await getAuthedUserId(request, env);
        if (uid) return uid;
        // Fallback: x-requester-id header (frontend'in halen kullandığı pattern)
        return request.headers.get('x-requester-id') || null;
      };
      const p2pSbInsert = async (table, body, returning = true) => {
        const r = await fetch(`${REST}/${table}`, {
          method: 'POST',
          headers: { ...restHeaders(env), 'Content-Type': 'application/json',
                     Prefer: returning ? 'return=representation' : 'return=minimal' },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`insert ${table}: ${await r.text()}`);
        return returning ? r.json() : null;
      };
      const p2pSbDelete = async (table, query) => {
        const r = await fetch(`${REST}/${table}${query}`, {
          method: 'DELETE',
          headers: { ...restHeaders(env), Prefer: 'return=minimal' },
        });
        if (!r.ok) throw new Error(`delete ${table}: ${await r.text()}`);
      };
      const p2pNum = (v) => v == null ? 0 : Number(v);
      const p2pOrderNumber = () => 'BAS-P2P-' +
        (Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase()).slice(-10);

      const p2pTgAlert = (text) => {
        // Sessiz değil — bu önemli olaylar
        tgSendMessage(env, text, { silent: false }).catch(()=>{});
      };

      /* ── GET /p2p/aggregate — Binance/Bybit/OKX/KuCoin public P2P aggregator ── */
      if (method === 'GET' && path === '/p2p/aggregate') {
        const fiat  = (url.searchParams.get('fiat') || 'USD').toUpperCase();
        const asset = (url.searchParams.get('asset') || 'USDT').toUpperCase();
        const type  = (url.searchParams.get('type') || 'BUY').toUpperCase(); // BUY = user wants to buy crypto
        const page  = Number(url.searchParams.get('page') || 1);

        // Module-level cache (30s)
        if (!globalThis.__p2pAggCache) globalThis.__p2pAggCache = new Map();
        const cacheKey = `${fiat}|${asset}|${type}|${page}`;
        const cached = globalThis.__p2pAggCache.get(cacheKey);
        const now = Date.now();
        if (cached && (now - cached.t) < 30000) {
          return new Response(JSON.stringify({ ads: cached.ads, cached: true }),
            { status: 200, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } });
        }

        const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';
        const timeout = (ms) => AbortSignal.timeout(ms);

        // ── Binance ───────────────────────────────────────────────
        const fetchBinance = async () => {
          // Binance tradeType is advertiser perspective: SELL = advertiser sells crypto (user buys),
          //                                              BUY  = advertiser buys crypto  (user sells)
          // So user BUY → tradeType=SELL, user SELL → tradeType=BUY
          const tradeType = type === 'BUY' ? 'SELL' : 'BUY';
          const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Accept': 'application/json' },
            body: JSON.stringify({
              asset, fiat, tradeType, page, rows: 10, payTypes: [], publisherType: null,
            }),
            signal: timeout(8000),
          });
          if (!r.ok) throw new Error(`binance ${r.status}`);
          const j = await r.json();
          if (!Array.isArray(j?.data)) return [];
          return j.data.map(it => ({
            exchange: 'binance',
            merchantName: it.advertiser?.nickName || 'Anonymous',
            price: Number(it.adv?.price) || 0,
            available: Number(it.adv?.surplusAmount) || 0,
            minAmount: Number(it.adv?.minSingleTransAmount) || 0,
            maxAmount: Number(it.adv?.dynamicMaxSingleTransAmount || it.adv?.maxSingleTransAmount) || 0,
            paymentMethods: (it.adv?.tradeMethods || []).map(t => t.tradeMethodName || t.identifier).filter(Boolean),
            completionRate: Number(it.advertiser?.monthFinishRate) || 0,
            orders: Number(it.advertiser?.monthOrderCount) || 0,
            advertiserNo: it.advertiser?.userNo || it.adv?.advNo || undefined,
          })).filter(a => a.price > 0);
        };

        // ── Bybit ─────────────────────────────────────────────────
        // Bybit payment method ID → name map (most common ~60 methods)
        const BYBIT_PM = {
          '1':'Bank Transfer','2':'Alipay','3':'WeChat','5':'Sberbank','6':'Tinkoff','7':'QIWI',
          '8':'Yandex.Money','11':'Rosbank','14':'Bank Transfer','18':'Cash Deposit','19':'Cash in Person',
          '24':'Mercado Pago','25':'PayPal','27':'Skrill','29':'Neteller','30':'WebMoney',
          '31':'Perfect Money','32':'Advcash','33':'Payeer','34':'PaySera','35':'Wise','36':'Revolut',
          '37':'PayPal','38':'Zelle','39':'Cash App','40':'SWIFT','41':'IMPS','42':'UPI','43':'Paytm',
          '44':'PhonePe','45':'GooglePay','46':'BHIM','47':'PIX','48':'TED','49':'DOC','50':'Nubank',
          '51':'Itaú','52':'Banco do Brasil','53':'Caixa','54':'Bradesco','55':'Santander','56':'GCash',
          '57':'Maya','58':'PalmPay','59':'OPay','60':'Kuda','61':'Moniepoint','62':'Bank Transfer (NGN)',
          '63':'Naira Bank Transfer','64':'Wise','65':'Revolut','66':'Monzo','67':'N26','68':'Western Union',
          '69':'MoneyGram','70':'Remitly','71':'Xoom','72':'Venmo','73':'Cash App','74':'Apple Pay',
          '75':'Google Pay','76':'Cash App','77':'Zelle','78':'Chase QuickPay','79':'PopMoney','80':'TransferWise',
          '85':'Yoomoney','86':'Faster Payments','87':'BACS','88':'Telebanco Popular','89':'CashWyre','90':'Astropay',
          '95':'IDEAL','96':'Bizum','97':'BLIK','98':'Trustly','99':'Sofort','100':'GiroPay',
          '116':'Vakıfbank','117':'Garanti BBVA','118':'SEPA','119':'SEPA Instant','120':'IBAN','121':'Faster Payments',
          '122':'CHAPS','123':'Volkswagen Bank','124':'BBVA','125':'Santander','126':'CaixaBank','127':'Bankia',
          '136':'OXXO','137':'Spei','138':'SEPA Instant','139':'SEPA Bank Transfer','140':'Bank Transfer (USD)','141':'Bank Transfer (EUR)',
          '155':'Cashapp','156':'Western Union','157':'MoneyGram','158':'Cash Deposit','159':'Cash in Person',
          '186':'Halkbank','187':'İş Bankası','188':'Yapı Kredi','189':'Akbank','190':'Ziraat Bankası',
          '191':'Kuveyt Türk','192':'Papara','193':'Ininal','194':'Pay Fix',
          '226':'M-Pesa','227':'Airtel Money','228':'MTN Mobile Money','229':'Orange Money','230':'EcoCash',
          '291':'Trust Wallet','292':'MetaMask','293':'Crypto Wallet',
          '303':'N26','304':'Vivid','305':'TransferWise','306':'Klarna',
          '371':'Toss','372':'KakaoPay','373':'Naver Pay',
          '465':'Cash App','466':'Apple Pay','467':'Google Pay','468':'Venmo','469':'Zelle','470':'PayPal',
          '550':'IDR Bank Transfer','551':'OVO','552':'Dana','553':'Gopay','554':'ShopeePay',
          '602':'Local Bank Transfer','603':'Mobile Money','604':'Crypto Transfer',
          '650':'PromptPay','651':'TrueMoney','652':'Rabbit Line Pay',
          '700':'AliPay','701':'WeChat Pay','702':'UnionPay','703':'JD Pay',
          '750':'PayMe','751':'FPS','752':'Bank Transfer','753':'Octopus',
        };
        const fetchBybit = async () => {
          // Bybit side from advertiser perspective: 0 = BUY (advertiser wants to buy crypto, user sells),
          //                                        1 = SELL (advertiser sells crypto, user buys)
          // Empirically: side=1 returns BUY ads (low prices, advertisers buying). So flipped:
          // user BUY → side=0 (advertiser SELL ads), user SELL → side=1 (advertiser BUY ads)
          const side = type === 'BUY' ? '0' : '1';
          const r = await fetch('https://api2.bybit.com/fiat/otc/item/online', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Accept': 'application/json' },
            body: JSON.stringify({
              userId: '', tokenId: asset, currencyId: fiat, payment: [],
              side, size: '10', page: String(page),
            }),
            signal: timeout(8000),
          });
          if (!r.ok) throw new Error(`bybit ${r.status}`);
          const j = await r.json();
          const items = j?.result?.items || [];
          return items.map(it => ({
            exchange: 'bybit',
            merchantName: it.nickName || 'Anonymous',
            price: Number(it.price) || 0,
            available: Number(it.lastQuantity) || 0,
            minAmount: Number(it.minAmount) || 0,
            maxAmount: Number(it.maxAmount) || 0,
            paymentMethods: (it.payments || []).map(p => {
              if (typeof p === 'object' && p !== null) return p.paymentName || p.name || BYBIT_PM[String(p.paymentType||'')] || '';
              const id = String(p);
              return BYBIT_PM[id] || `Method ${id}`;
            }).filter(Boolean),
            completionRate: Number(it.recentExecuteRate) / 100 || 0,
            orders: Number(it.recentOrderNum) || 0,
            advertiserNo: it.userId || it.id || undefined,
          })).filter(a => a.price > 0);
        };

        // ── OKX ───────────────────────────────────────────────────
        // Helper: completion rate may arrive as 0..1 fractional, 0..100 percentage, or a "98.09%" string.
        const normRate = (v) => {
          if (v == null) return 0;
          const s = String(v).replace('%', '').trim();
          const n = Number(s);
          if (!isFinite(n) || n <= 0) return 0;
          return n > 1 ? n / 100 : n;
        };

        const fetchOKX = async () => {
          const side = type === 'BUY' ? 'sell' : 'buy'; // OKX side from advertiser perspective
          const u = `https://www.okx.com/v3/c2c/tradingOrders/books?quoteCurrency=${encodeURIComponent(fiat)}&baseCurrency=${encodeURIComponent(asset)}&side=${side}&paymentMethod=all&userType=all&showTrade=false&showFollow=false&showAlreadyTraded=false&isAbleFilter=false&limit=10`;
          const r = await fetch(u, {
            headers: { 'User-Agent': UA, 'Accept': 'application/json', 'x-locale': 'en_US' },
            signal: timeout(8000),
          });
          if (!r.ok) throw new Error(`okx ${r.status}`);
          const j = await r.json();
          const items = j?.data?.[side] || j?.data?.buy || j?.data?.sell || [];
          return items.map(it => ({
            exchange: 'okx',
            merchantName: it.nickName || it.merchantName || 'Anonymous',
            price: Number(it.price) || 0,
            available: Number(it.availableAmount || it.amount) || 0,
            minAmount: Number(it.minCompletedOrderQuantity || it.minAmountPerOrder) || 0,
            maxAmount: Number(it.maxCompletedOrderQuantity || it.maxAmountPerOrder || it.amount) || 0,
            paymentMethods: (it.paymentMethods || []).map(p => p?.name || p).filter(Boolean),
            // OKX returns completedRate already fractional (0..1) — normalize handles both cases.
            completionRate: normRate(it.completedRate || it.merchantCompletedRate),
            orders: Number(it.completedOrderQuantity || it.merchantCompletedOrderNum) || 0,
            advertiserNo: it.publicUserId || it.uid || undefined,
          })).filter(a => a.price > 0);
        };

        // ── KuCoin ────────────────────────────────────────────────
        const fetchKuCoin = async () => {
          const side = type === 'BUY' ? 'SELL' : 'BUY'; // KuCoin side from advertiser perspective
          const u = `https://www.kucoin.com/_api/otc/ad/list?currency=${encodeURIComponent(asset)}&legal=${encodeURIComponent(fiat)}&side=${side}&page=${page}&pageSize=10&status=PUTON`;
          const r = await fetch(u, {
            headers: { 'User-Agent': UA, 'Accept': 'application/json' },
            signal: timeout(8000),
          });
          if (!r.ok) throw new Error(`kucoin ${r.status}`);
          const j = await r.json();
          const items = j?.items || j?.data?.items || [];
          return items.map(it => {
            // KuCoin uses adPayTypes[].payTypeNameEn for method names; fallback to legacy fields.
            const pmRaw = it.adPayTypes || it.payTypes || it.paymentTypes || [];
            const paymentMethods = pmRaw.map(p => {
              if (typeof p === 'string') return p;
              return p?.payTypeNameEn || p?.payTypeName || p?.name || '';
            }).filter(Boolean);
            return {
              exchange: 'kucoin',
              merchantName: it.nickName || it.adOwner || 'Anonymous',
              price: Number(it.floatPrice || it.price) || 0,
              available: Number(it.currencyQuantity || it.amount) || 0,
              minAmount: Number(it.limitMinQuote || it.minQuoteAmount) || 0,
              maxAmount: Number(it.limitMaxQuote || it.maxQuoteAmount) || 0,
              paymentMethods,
              completionRate: normRate(
                it.dealOrderRate ?? it.adOwnerStat?.tradeFinishRate ?? it.dealRatio
              ),
              orders: Number(it.dealOrderNum || it.adOwnerStat?.tradeOrderCount || it.tradeCount) || 0,
              advertiserNo: it.adOwnerId || it.userId || undefined,
            };
          }).filter(a => a.price > 0);
        };

        // Track per-source success/error truthfully. Wrap each fetch so allSettled sees real outcome,
        // not a swallowed catch returning []. We then build sources[] from results directly.
        const results = await Promise.allSettled([
          fetchBinance(),
          fetchBybit(),
          fetchOKX(),
          fetchKuCoin(),
        ]);

        const sourceNames = ['binance','bybit','okx','kucoin'];
        results.forEach((r, i) => {
          if (r.status === 'rejected') console.log(`${sourceNames[i]} fail`, r.reason?.message || r.reason);
        });

        let merged = [];
        results.forEach(r => { if (r.status === 'fulfilled' && Array.isArray(r.value)) merged = merged.concat(r.value); });

        // Sıralama: alıcıya en düşük fiyat avantaj, satıcıya en yüksek fiyat avantaj
        merged.sort((a, b) => type === 'BUY' ? a.price - b.price : b.price - a.price);

        // En fazla 50 ilan
        merged = merged.slice(0, 50);

        globalThis.__p2pAggCache.set(cacheKey, { t: now, ads: merged });
        // Eski girdileri temizle (basit LRU)
        if (globalThis.__p2pAggCache.size > 200) {
          const firstKey = globalThis.__p2pAggCache.keys().next().value;
          globalThis.__p2pAggCache.delete(firstKey);
        }

        return new Response(JSON.stringify({ ads: merged, cached: false, sources: results.map((r, i) => ({
          name: ['binance','bybit','okx','kucoin'][i],
          ok: r.status === 'fulfilled',
          count: r.status === 'fulfilled' ? r.value.length : 0,
        })) }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } });
      }

      /* ── GET /p2p/ads — aktif ilanları listele (filtreli) ── */
      if (method === 'GET' && path === '/p2p/ads') {
        const adType = url.searchParams.get('type') || 'sell';            // alıcı görüyorsa 'sell' satıcıları
        const sym    = url.searchParams.get('symbol') || 'USDT';
        const fiat   = url.searchParams.get('currency') || 'USD';
        const pmFilter = url.searchParams.get('payment_method') || '';
        const fiatAmt  = Number(url.searchParams.get('amount') || 0);
        let q = `?status=eq.active&ad_type=eq.${encodeURIComponent(adType)}` +
                `&crypto_symbol=eq.${encodeURIComponent(sym)}&fiat_currency=eq.${encodeURIComponent(fiat)}` +
                `&available_crypto=gt.0&order=price.${adType==='sell'?'asc':'desc'}&limit=80`;
        const ads = await sbGet('p2p_advertisements', q, env);

        // Tüccar bilgilerini ve istatistikleri çek
        const advIds = [...new Set(ads.map(a => a.advertiser_id))];
        let profilesMap = {}, statsMap = {};
        if (advIds.length > 0) {
          const idList = advIds.map(i => `"${i}"`).join(',');
          const profiles = await sbGet('user_profiles',
            `?id=in.(${idList})&select=id,email,full_name`, env).catch(()=>[]);
          profiles.forEach(p => {
            profilesMap[p.id] = {
              email: p.email,
              username: (p.full_name || p.email || '').split('@')[0].slice(0,20),
            };
          });
          const stats = await sbGet('p2p_user_stats',
            `?user_id=in.(${idList})`, env).catch(()=>[]);
          stats.forEach(s => { statsMap[s.user_id] = s; });
        }

        // Sonuçları zenginleştir + filtrele
        const result = ads
          .filter(a => !pmFilter || (a.payment_methods || []).includes(pmFilter))
          .filter(a => !fiatAmt || (fiatAmt >= p2pNum(a.min_amount) && fiatAmt <= p2pNum(a.max_amount)))
          .map(a => {
            const prof = profilesMap[a.advertiser_id] || {};
            const st = statsMap[a.advertiser_id] || {};
            return {
              ...a,
              merchant: {
                username: st.display_name || prof.username || 'Trader',
                trades: st.total_trades || 0,
                completed: st.completed_trades || 0,
                completion: st.total_trades > 0 ? (st.completed_trades / st.total_trades * 100).toFixed(1) : '0.0',
                like: st.like_count || 0,
                dislike: st.dislike_count || 0,
                verified: !!st.is_verified,
                merchant_badge: st.badge || null,
              },
            };
          });
        return ok({ ads: result });
      }

      /* ── POST /p2p/ads — yeni ilan oluştur (SELL ise emaneti kilitle) ── */
      if (method === 'POST' && path === '/p2p/ads') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const b = body || {};
        const adType = b.ad_type;
        const sym = b.crypto_symbol;
        const network = b.crypto_network;
        const fiat = b.fiat_currency;
        const price = Number(b.price);
        const minA = Number(b.min_amount);
        const maxA = Number(b.max_amount);
        const totalCrypto = Number(b.total_crypto);
        const pms = Array.isArray(b.payment_methods) ? b.payment_methods : [];
        const window = Math.min(120, Math.max(5, Number(b.payment_window_minutes || 15)));

        if (!['buy','sell'].includes(adType)) return err(400, 'ad_type invalid');
        if (!sym || !network || !fiat) return err(400, 'symbol/network/currency required');
        if (!(price > 0)) return err(400, 'price invalid');
        if (!(minA > 0) || !(maxA >= minA)) return err(400, 'limits invalid');
        if (!(totalCrypto > 0)) return err(400, 'total_crypto invalid');
        if (pms.length === 0) return err(400, 'at least one payment method required');

        // SELL ilanı: kullanıcıdan crypto'yu emanete kilitle
        if (adType === 'sell') {
          try {
            await sbRpc('p2p_lock_escrow',
              { p_user_id: uid, p_symbol: sym, p_amount: totalCrypto }, env);
          } catch (e) {
            return err(400, `escrow lock failed: ${String(e.message||e)}`);
          }
        }

        const adRow = await p2pSbInsert('p2p_advertisements', {
          advertiser_id: uid, ad_type: adType, crypto_symbol: sym, crypto_network: network,
          fiat_currency: fiat, price, min_amount: minA, max_amount: maxA,
          total_crypto: totalCrypto, available_crypto: totalCrypto,
          payment_methods: pms, payment_window_minutes: window,
          terms: b.terms || null, country_code: b.country_code || null,
        });
        await sbRpc('p2p_ensure_stats', { p_user_id: uid }, env).catch(()=>{});

        const ad = adRow[0];
        p2pTgAlert(`📢 <b>YENİ P2P İLAN</b>\n\n${adType==='sell'?'🟢 SAT':'🔴 AL'}: ${totalCrypto} ${sym} (${network})\n💱 ${price} ${fiat}/${sym}\n💵 Limit: ${minA}-${maxA} ${fiat}\n💳 ${pms.join(', ')}\n🆔 <code>${ad.id.slice(0,8)}</code>`);
        return ok({ ad });
      }

      /* ── PATCH /p2p/ads/:id — ilan güncelle (durumu, fiyat, terms) ── */
      const adIdMatch = path.match(/^\/p2p\/ads\/([0-9a-f-]{36})$/);
      if (method === 'PATCH' && adIdMatch) {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const adId = adIdMatch[1];
        const cur = await sbGet('p2p_advertisements', `?id=eq.${adId}&limit=1`, env);
        if (!cur[0]) return err(404, 'ad not found');
        if (cur[0].advertiser_id !== uid) return err(403, 'not owner');

        const allowed = {};
        const b = body || {};
        if (b.status && ['active','paused'].includes(b.status)) allowed.status = b.status;
        if (b.price && Number(b.price) > 0) allowed.price = Number(b.price);
        if (b.terms !== undefined) allowed.terms = b.terms;
        if (b.payment_methods && Array.isArray(b.payment_methods)) allowed.payment_methods = b.payment_methods;
        if (Number(b.min_amount) > 0) allowed.min_amount = Number(b.min_amount);
        if (Number(b.max_amount) > 0) allowed.max_amount = Number(b.max_amount);

        const updated = await sbPatch('p2p_advertisements', `?id=eq.${adId}`, allowed, env);
        return ok({ ad: updated[0] });
      }

      /* ── DELETE /p2p/ads/:id — ilanı iptal et + emaneti iade ── */
      if (method === 'DELETE' && adIdMatch) {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const adId = adIdMatch[1];
        const cur = await sbGet('p2p_advertisements', `?id=eq.${adId}&limit=1`, env);
        if (!cur[0]) return err(404, 'ad not found');
        if (cur[0].advertiser_id !== uid) return err(403, 'not owner');
        if (cur[0].status === 'cancelled') return ok({ ok: true, already: true });

        // SELL ilanı ise kalan crypto'yu iade et
        if (cur[0].ad_type === 'sell' && p2pNum(cur[0].available_crypto) > 0) {
          await sbRpc('p2p_refund_escrow',
            { p_seller_id: uid, p_symbol: cur[0].crypto_symbol, p_amount: p2pNum(cur[0].available_crypto) }, env)
            .catch(()=>{});
        }
        await sbPatch('p2p_advertisements', `?id=eq.${adId}`, { status: 'cancelled' }, env);
        return ok({ ok: true });
      }

      /* ── GET /p2p/my-ads — kendi ilanlarım ── */
      if (method === 'GET' && path === '/p2p/my-ads') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const ads = await sbGet('p2p_advertisements',
          `?advertiser_id=eq.${uid}&order=created_at.desc&limit=100`, env);
        return ok({ ads });
      }

      /* ── POST /p2p/orders — ilandan sipariş başlat ── */
      if (method === 'POST' && path === '/p2p/orders') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const b = body || {};
        const adId = b.ad_id;
        const fiatAmt = Number(b.fiat_amount);
        const pmChosen = String(b.payment_method || '');
        if (!adId || !(fiatAmt > 0) || !pmChosen) return err(400, 'ad_id/fiat_amount/payment_method required');

        const ads = await sbGet('p2p_advertisements', `?id=eq.${adId}&limit=1`, env);
        const ad = ads[0];
        if (!ad) return err(404, 'ad not found');
        if (ad.status !== 'active') return err(400, 'ad not active');
        if (ad.advertiser_id === uid) return err(400, 'cannot trade with yourself');
        if (fiatAmt < p2pNum(ad.min_amount) || fiatAmt > p2pNum(ad.max_amount))
          return err(400, `amount out of limits (${ad.min_amount}-${ad.max_amount})`);
        if (!(ad.payment_methods || []).includes(pmChosen))
          return err(400, 'payment method not supported by this ad');

        const cryptoAmt = Number((fiatAmt / p2pNum(ad.price)).toFixed(8));

        // ATOMİK: ilanın available'ından düş — race condition önler. Başarısızsa atomik hata döner.
        try {
          await sbRpc('p2p_consume_ad_available',
            { p_ad_id: adId, p_amount: cryptoAmt }, env);
        } catch (e) {
          return err(400, `ad allocation failed: ${String(e.message||e)}`);
        }

        // SELL ilanından alıyorsak: satıcı ilan açarken kilitlemişti, ek kilit yok.
        // BUY ilanından satıyorsak: biz (uid) satıcı olarak şimdi crypto'yu kilitliyoruz.
        let buyerId, sellerId;
        if (ad.ad_type === 'sell') {
          buyerId = uid; sellerId = ad.advertiser_id;
        } else {
          buyerId = ad.advertiser_id; sellerId = uid;
          try {
            await sbRpc('p2p_lock_escrow',
              { p_user_id: uid, p_symbol: ad.crypto_symbol, p_amount: cryptoAmt }, env);
          } catch (e) {
            // Lock başarısız: atomik consume'u geri al
            await sbRpc('p2p_restore_ad_available',
              { p_ad_id: adId, p_amount: cryptoAmt }, env).catch(()=>{});
            return err(400, `escrow lock failed: ${String(e.message||e)}`);
          }
        }

        // Satıcının ödeme yöntemi detaylarını kopyala (snapshot)
        let pmDetails = null;
        const pms = await sbGet('p2p_payment_methods',
          `?user_id=eq.${sellerId}&method_type=eq.${encodeURIComponent(pmChosen)}&is_active=eq.true&limit=1`, env)
          .catch(()=>[]);
        if (pms[0]) pmDetails = {
          method_type: pms[0].method_type,
          account_name: pms[0].account_name,
          account_number: pms[0].account_number,
          bank_name: pms[0].bank_name,
          notes: pms[0].notes,
        };

        const deadline = new Date(Date.now() + (ad.payment_window_minutes || 15) * 60 * 1000).toISOString();
        const orderRow = await p2pSbInsert('p2p_orders', {
          order_number: p2pOrderNumber(),
          ad_id: adId, buyer_id: buyerId, seller_id: sellerId,
          crypto_symbol: ad.crypto_symbol, crypto_network: ad.crypto_network,
          fiat_currency: ad.fiat_currency,
          crypto_amount: cryptoAmt, fiat_amount: fiatAmt, price: ad.price,
          payment_method: pmChosen, payment_method_details: pmDetails,
          payment_deadline: deadline,
        });
        const order = orderRow[0];

        // (available_crypto + trade_count zaten p2p_consume_ad_available içinde atomik düşüldü)

        // Sistem mesajı
        await p2pSbInsert('p2p_messages', {
          order_id: order.id, sender_id: buyerId, is_system: true,
          message: `Sipariş oluşturuldu. Alıcı ${ad.payment_window_minutes||15} dk içinde ${pmChosen} ile ${fiatAmt} ${ad.fiat_currency} ödemeli.`,
        }, false).catch(()=>{});

        // İstatistik artır
        await sbRpc('p2p_ensure_stats', { p_user_id: buyerId }, env).catch(()=>{});
        await sbRpc('p2p_ensure_stats', { p_user_id: sellerId }, env).catch(()=>{});

        p2pTgAlert(`🤝 <b>YENİ P2P SİPARİŞ</b>\n\n📋 ${order.order_number}\n💰 ${cryptoAmt} ${ad.crypto_symbol} (${ad.crypto_network})\n💱 ${fiatAmt} ${ad.fiat_currency}\n💳 ${pmChosen}\n⏱️ ${ad.payment_window_minutes||15} dk`);
        return ok({ order });
      }

      /* ── GET /p2p/orders — siparişlerim (alıcı veya satıcı) ── */
      if (method === 'GET' && path === '/p2p/orders') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const status = url.searchParams.get('status'); // optional
        let q = `?or=(buyer_id.eq.${uid},seller_id.eq.${uid})&order=created_at.desc&limit=100`;
        if (status) q += `&status=eq.${encodeURIComponent(status)}`;
        const orders = await sbGet('p2p_orders', q, env);
        return ok({ orders, my_id: uid });
      }

      /* ── GET /p2p/orders/:id — tek sipariş detayı (mesajlarla) ── */
      const orderIdMatch = path.match(/^\/p2p\/orders\/([0-9a-f-]{36})(\/(mark-paid|confirm|cancel|dispute|messages))?$/);
      if (method === 'GET' && orderIdMatch && !orderIdMatch[2]) {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const oid = orderIdMatch[1];
        const ords = await sbGet('p2p_orders', `?id=eq.${oid}&limit=1`, env);
        const o = ords[0];
        if (!o) return err(404, 'order not found');
        if (o.buyer_id !== uid && o.seller_id !== uid) return err(403, 'not party to order');
        const msgs = await sbGet('p2p_messages',
          `?order_id=eq.${oid}&order=created_at.asc&limit=200`, env).catch(()=>[]);
        return ok({ order: o, messages: msgs, my_id: uid });
      }

      /* ── POST /p2p/orders/:id/messages — mesaj gönder ── */
      if (method === 'POST' && orderIdMatch && orderIdMatch[3] === 'messages') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const oid = orderIdMatch[1];
        const ords = await sbGet('p2p_orders', `?id=eq.${oid}&limit=1`, env);
        const o = ords[0];
        if (!o) return err(404, 'order not found');
        if (o.buyer_id !== uid && o.seller_id !== uid) return err(403, 'not party to order');
        const text = String((body && body.message) || '').trim().slice(0, 1000);
        if (!text) return err(400, 'empty message');
        const msg = await p2pSbInsert('p2p_messages',
          { order_id: oid, sender_id: uid, message: text }, true);
        return ok({ message: msg[0] });
      }

      /* ── GET /p2p/orders/:id/messages — sadece mesajları çek ── */
      if (method === 'GET' && orderIdMatch && orderIdMatch[3] === 'messages') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const oid = orderIdMatch[1];
        const ords = await sbGet('p2p_orders', `?id=eq.${oid}&limit=1`, env);
        const o = ords[0];
        if (!o) return err(404, 'order not found');
        if (o.buyer_id !== uid && o.seller_id !== uid) return err(403, 'not party to order');
        const msgs = await sbGet('p2p_messages',
          `?order_id=eq.${oid}&order=created_at.asc&limit=500`, env);
        return ok({ messages: msgs });
      }

      /* ── POST /p2p/orders/:id/mark-paid — alıcı ödemeyi yaptığını bildirir ── */
      if (method === 'POST' && orderIdMatch && orderIdMatch[3] === 'mark-paid') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const oid = orderIdMatch[1];
        const ords = await sbGet('p2p_orders', `?id=eq.${oid}&limit=1`, env);
        const o = ords[0];
        if (!o) return err(404, 'order not found');
        if (o.buyer_id !== uid) return err(403, 'only buyer can mark paid');
        if (o.status !== 'pending_payment') return err(400, `cannot mark-paid (status=${o.status})`);

        await sbPatch('p2p_orders', `?id=eq.${oid}`,
          { status: 'paid', buyer_marked_paid_at: new Date().toISOString() }, env);
        await p2pSbInsert('p2p_messages',
          { order_id: oid, sender_id: uid, is_system: true,
            message: `Alıcı ödemeyi yaptığını bildirdi. Satıcı onayı bekleniyor.` }, false).catch(()=>{});
        p2pTgAlert(`💸 <b>P2P ÖDEME BİLDİRİLDİ</b>\n\n📋 ${o.order_number}\n💵 ${o.fiat_amount} ${o.fiat_currency}\n💳 ${o.payment_method}\n👀 Satıcı onayı bekleniyor`);
        return ok({ ok: true });
      }

      /* ── POST /p2p/orders/:id/confirm — satıcı parayı aldığını onaylar → emanet açılır ── */
      if (method === 'POST' && orderIdMatch && orderIdMatch[3] === 'confirm') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const oid = orderIdMatch[1];
        const ords = await sbGet('p2p_orders', `?id=eq.${oid}&limit=1`, env);
        const o = ords[0];
        if (!o) return err(404, 'order not found');
        if (o.seller_id !== uid) return err(403, 'only seller can confirm');
        if (!['paid','pending_payment'].includes(o.status))
          return err(400, `cannot confirm (status=${o.status})`);

        // Emaneti aç: satıcının kilitli miktarını alıcıya transfer et
        try {
          await sbRpc('p2p_release_escrow', {
            p_seller_id: o.seller_id, p_buyer_id: o.buyer_id,
            p_symbol: o.crypto_symbol, p_amount: p2pNum(o.crypto_amount),
          }, env);
        } catch (e) {
          return err(500, `escrow release failed: ${String(e.message||e)}`);
        }

        const nowIso = new Date().toISOString();
        await sbPatch('p2p_orders', `?id=eq.${oid}`,
          { status: 'completed', seller_confirmed_at: nowIso, completed_at: nowIso }, env);

        // İstatistikleri güncelle
        const updateStats = async (uid2) => {
          const sts = await sbGet('p2p_user_stats', `?user_id=eq.${uid2}&limit=1`, env);
          if (sts[0]) {
            await sbPatch('p2p_user_stats', `?user_id=eq.${uid2}`, {
              total_trades: (sts[0].total_trades || 0) + 1,
              completed_trades: (sts[0].completed_trades || 0) + 1,
            }, env);
          }
        };
        await updateStats(o.buyer_id).catch(()=>{});
        await updateStats(o.seller_id).catch(()=>{});

        await p2pSbInsert('p2p_messages',
          { order_id: oid, sender_id: uid, is_system: true,
            message: `✅ Satıcı ödemeyi onayladı. ${o.crypto_amount} ${o.crypto_symbol} alıcıya aktarıldı. İşlem tamamlandı.` }, false).catch(()=>{});

        p2pTgAlert(`✅ <b>P2P TAMAMLANDI</b>\n\n📋 ${o.order_number}\n💰 ${o.crypto_amount} ${o.crypto_symbol}\n💵 ${o.fiat_amount} ${o.fiat_currency}\n🔓 Emanet alıcıya aktarıldı`);
        return ok({ ok: true });
      }

      /* ── POST /p2p/orders/:id/cancel — siparişi iptal et ── */
      if (method === 'POST' && orderIdMatch && orderIdMatch[3] === 'cancel') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const oid = orderIdMatch[1];
        const ords = await sbGet('p2p_orders', `?id=eq.${oid}&limit=1`, env);
        const o = ords[0];
        if (!o) return err(404, 'order not found');
        if (o.buyer_id !== uid && o.seller_id !== uid) return err(403, 'not party');
        if (!['pending_payment','paid'].includes(o.status)) return err(400, `cannot cancel (status=${o.status})`);
        if (o.status === 'paid' && uid === o.seller_id)
          return err(400, 'seller cannot cancel after payment marked — open dispute instead');

        // İptal: emanetteki crypto'yu satıcıya iade et + ad.available'ı atomik geri arttır
        await sbRpc('p2p_refund_escrow', {
          p_seller_id: o.seller_id, p_symbol: o.crypto_symbol, p_amount: p2pNum(o.crypto_amount),
        }, env).catch(()=>{});
        await sbRpc('p2p_restore_ad_available',
          { p_ad_id: o.ad_id, p_amount: p2pNum(o.crypto_amount) }, env).catch(()=>{});

        await sbPatch('p2p_orders', `?id=eq.${oid}`, {
          status: 'cancelled', cancelled_at: new Date().toISOString(),
          cancelled_by: uid, cancel_reason: (body && body.reason) || null,
        }, env);
        await p2pSbInsert('p2p_messages',
          { order_id: oid, sender_id: uid, is_system: true,
            message: `Sipariş iptal edildi. Sebep: ${(body && body.reason) || 'belirtilmedi'}` }, false).catch(()=>{});
        return ok({ ok: true });
      }

      /* ── POST /p2p/orders/:id/dispute — anlaşmazlık aç ── */
      if (method === 'POST' && orderIdMatch && orderIdMatch[3] === 'dispute') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const oid = orderIdMatch[1];
        const ords = await sbGet('p2p_orders', `?id=eq.${oid}&limit=1`, env);
        const o = ords[0];
        if (!o) return err(404, 'order not found');
        if (o.buyer_id !== uid && o.seller_id !== uid) return err(403, 'not party');
        if (!['pending_payment','paid'].includes(o.status))
          return err(400, `cannot dispute (status=${o.status})`);

        const reason = String((body && body.reason) || '').slice(0, 500);
        await sbPatch('p2p_orders', `?id=eq.${oid}`, {
          status: 'disputed', dispute_opened_at: new Date().toISOString(),
          dispute_opened_by: uid, dispute_reason: reason,
        }, env);
        await p2pSbInsert('p2p_messages',
          { order_id: oid, sender_id: uid, is_system: true,
            message: `🚨 ANLAŞMAZLIK AÇILDI: ${reason || 'sebep belirtilmedi'}` }, false).catch(()=>{});
        p2pTgAlert(`🚨🚨🚨 <b>P2P ANLAŞMAZLIK</b> 🚨🚨🚨\n\n📋 ${o.order_number}\n💰 ${o.crypto_amount} ${o.crypto_symbol}\n💵 ${o.fiat_amount} ${o.fiat_currency}\n📝 ${reason}\n🆔 <code>${oid.slice(0,8)}</code>\n\n⚠️ Admin panelinden çözülmesi gerekiyor!`);
        return ok({ ok: true });
      }

      /* ── ADMIN: POST /p2p/admin/resolve-dispute ── */
      if (method === 'POST' && path === '/p2p/admin/resolve-dispute') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        // Admin kontrolü
        const prof = await sbGet('user_profiles', `?id=eq.${uid}&select=is_admin&limit=1`, env);
        if (!prof[0] || prof[0].is_admin !== true) return err(403, 'admin only');

        const oid = body?.order_id;
        const winner = body?.winner; // 'buyer' or 'seller'
        const note = String(body?.note || '').slice(0, 500);
        if (!oid || !['buyer','seller'].includes(winner)) return err(400, 'order_id + winner required');

        const ords = await sbGet('p2p_orders', `?id=eq.${oid}&limit=1`, env);
        const o = ords[0];
        if (!o) return err(404, 'order not found');
        if (o.status !== 'disputed') return err(400, 'not disputed');

        if (winner === 'buyer') {
          // Alıcı kazandı → emaneti alıcıya aktar
          await sbRpc('p2p_release_escrow', {
            p_seller_id: o.seller_id, p_buyer_id: o.buyer_id,
            p_symbol: o.crypto_symbol, p_amount: p2pNum(o.crypto_amount),
          }, env);
        } else {
          // Satıcı kazandı → emaneti iade et
          await sbRpc('p2p_refund_escrow', {
            p_seller_id: o.seller_id, p_symbol: o.crypto_symbol, p_amount: p2pNum(o.crypto_amount),
          }, env);
        }

        await sbPatch('p2p_orders', `?id=eq.${oid}`, {
          status: winner === 'buyer' ? 'completed' : 'cancelled',
          dispute_resolved_at: new Date().toISOString(),
          dispute_winner: winner, dispute_admin_note: note,
          completed_at: winner === 'buyer' ? new Date().toISOString() : null,
          cancelled_at:  winner === 'seller' ? new Date().toISOString() : null,
        }, env);
        await p2pSbInsert('p2p_messages',
          { order_id: oid, sender_id: uid, is_system: true,
            message: `⚖️ Admin kararı: ${winner === 'buyer' ? 'ALICI' : 'SATICI'} kazandı.\nNot: ${note}` }, false).catch(()=>{});
        p2pTgAlert(`⚖️ <b>P2P ANLAŞMAZLIK ÇÖZÜLDÜ</b>\n\n📋 ${o.order_number}\n🏆 Kazanan: ${winner === 'buyer' ? 'ALICI' : 'SATICI'}\n📝 ${note}`);
        return ok({ ok: true });
      }

      /* ── ADMIN: GET /p2p/admin/disputes ── */
      if (method === 'GET' && path === '/p2p/admin/disputes') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const prof = await sbGet('user_profiles', `?id=eq.${uid}&select=is_admin&limit=1`, env);
        if (!prof[0] || prof[0].is_admin !== true) return err(403, 'admin only');
        const orders = await sbGet('p2p_orders',
          `?status=eq.disputed&order=dispute_opened_at.desc&limit=100`, env);
        return ok({ orders });
      }

      /* ── GET /p2p/payment-methods — kayıtlı ödeme yöntemlerim ── */
      if (method === 'GET' && path === '/p2p/payment-methods') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const pms = await sbGet('p2p_payment_methods',
          `?user_id=eq.${uid}&order=created_at.desc`, env);
        return ok({ payment_methods: pms });
      }

      /* ── POST /p2p/payment-methods — yeni ödeme yöntemi ekle ── */
      if (method === 'POST' && path === '/p2p/payment-methods') {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const b = body || {};
        if (!b.method_type || !b.account_name) return err(400, 'method_type + account_name required');
        const pm = await p2pSbInsert('p2p_payment_methods', {
          user_id: uid, method_type: b.method_type, account_name: b.account_name,
          account_number: b.account_number || null, bank_name: b.bank_name || null,
          notes: b.notes || null,
        });
        return ok({ payment_method: pm[0] });
      }

      /* ── DELETE /p2p/payment-methods/:id ── */
      const pmIdMatch = path.match(/^\/p2p\/payment-methods\/([0-9a-f-]{36})$/);
      if (method === 'DELETE' && pmIdMatch) {
        const uid = await p2pAuthUid();
        if (!uid) return err(401, 'auth required');
        const cur = await sbGet('p2p_payment_methods', `?id=eq.${pmIdMatch[1]}&limit=1`, env);
        if (!cur[0]) return err(404, 'pm not found');
        if (cur[0].user_id !== uid) return err(403, 'not owner');
        await p2pSbDelete('p2p_payment_methods', `?id=eq.${pmIdMatch[1]}`);
        return ok({ ok: true });
      }

      /* ── GET /p2p/user-stats/:userId — herkese açık tüccar bilgisi ── */
      const userStatsMatch = path.match(/^\/p2p\/user-stats\/([0-9a-f-]{36})$/);
      if (method === 'GET' && userStatsMatch) {
        const sts = await sbGet('p2p_user_stats', `?user_id=eq.${userStatsMatch[1]}&limit=1`, env);
        const prof = await sbGet('user_profiles',
          `?id=eq.${userStatsMatch[1]}&select=email,full_name&limit=1`, env);
        return ok({
          stats: sts[0] || null,
          profile: prof[0] ? { email: prof[0].email, username: (prof[0].full_name || prof[0].email || '').split('@')[0] } : null,
        });
      }

      return err(404, `Not found: ${method} ${path}`);
    } catch(e) {
      console.error('[worker]', e.message);
      return err(500, e.message||'Internal server error');
    }
  }
};

/* ════════════════════════════════════════════════════════════════════════
   Social platform posting helpers
   Each returns: { ok: boolean, message: string, url?: string }
   ════════════════════════════════════════════════════════════════════════ */
async function postToPlatform(platform, content, imageUrl, creds, env) {
  if (platform === 'telegram') return postTelegram(content, imageUrl, creds.telegram, env);
  if (platform === 'x')        return postX(content, imageUrl, creds.x);
  if (platform === 'facebook') return postFacebook(content, imageUrl, creds.facebook);
  if (platform === 'linkedin') return postLinkedIn(content, imageUrl, creds.linkedin);
  if (platform === 'youtube')  return postYouTube(content, imageUrl, creds.youtube);
  if (platform === 'medium')   return postMedium(content, imageUrl, creds.medium);
  return { ok: false, message: 'Unknown platform' };
}

async function postTelegram(content, imageUrl, c, env) {
  const token = env?.TELEGRAM_BOT_TOKEN;
  const chatId = c?.chat_id;
  if (!token)  return { ok: false, message: 'TELEGRAM_BOT_TOKEN secret not set on server' };
  if (!chatId) return { ok: false, message: 'Telegram chat_id not configured' };
  const api = `https://api.telegram.org/bot${token}`;
  const endpoint = imageUrl ? `${api}/sendPhoto` : `${api}/sendMessage`;
  const payload = imageUrl
    ? { chat_id: chatId, photo: imageUrl, caption: content.slice(0, 1024) }
    : { chat_id: chatId, text: content, disable_web_page_preview: false };
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) return { ok: false, message: j.description || `HTTP ${r.status}` };
  const msgId = j.result?.message_id;
  return { ok: true, message: 'Posted', url: msgId ? `https://t.me/c/${String(chatId).replace('-100','')}/${msgId}` : undefined };
}

async function postX(content, imageUrl, c) {
  if (!c?.api_key || !c?.api_secret || !c?.access_token || !c?.access_secret) {
    return { ok: false, message: 'X credentials missing — go to Bağlantılar' };
  }
  // OAuth 1.0a signing — implement when first credentials arrive
  try {
    const oauth = await buildOAuth1Header('POST', 'https://api.twitter.com/2/tweets', {}, c);
    const r = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { 'Authorization': oauth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content.slice(0, 280) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, message: j?.detail || j?.title || `HTTP ${r.status}` };
    const tweetId = j?.data?.id;
    return { ok: true, message: 'Tweeted', url: tweetId ? `https://x.com/i/status/${tweetId}` : undefined };
  } catch (e) {
    return { ok: false, message: e?.message || 'X post failed' };
  }
}

async function postFacebook(content, imageUrl, c) {
  if (!c?.page_id || !c?.access_token) return { ok: false, message: 'Facebook credentials missing — go to Bağlantılar' };
  const base = `https://graph.facebook.com/v20.0/${c.page_id}`;
  const url = imageUrl ? `${base}/photos` : `${base}/feed`;
  const payload = imageUrl
    ? { url: imageUrl, caption: content, access_token: c.access_token }
    : { message: content, access_token: c.access_token };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.error) return { ok: false, message: j?.error?.message || `HTTP ${r.status}` };
  const id = j?.post_id || j?.id;
  return { ok: true, message: 'Posted to Facebook', url: id ? `https://facebook.com/${id}` : undefined };
}

async function postLinkedIn(content, imageUrl, c) {
  if (!c?.author_urn || !c?.access_token) return { ok: false, message: 'LinkedIn credentials missing — go to Bağlantılar' };
  const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: c.author_urn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
          ...(imageUrl ? { media: [{ status: 'READY', originalUrl: imageUrl }] } : {}),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, message: j?.message || `HTTP ${r.status}` };
  const id = j?.id;
  return { ok: true, message: 'Posted to LinkedIn', url: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
}

async function postYouTube(_content, _imageUrl, c) {
  if (!c?.refresh_token || !c?.client_id || !c?.client_secret) {
    return { ok: false, message: 'YouTube OAuth not configured — go to Bağlantılar' };
  }
  // YouTube Community Posts API requires a non-public partner endpoint.
  // Public Data API v3 does NOT yet support creating community posts programmatically.
  return { ok: false, message: 'YouTube Community Posts API is not publicly available — manual post required' };
}

async function postMedium(content, _imageUrl, c) {
  if (!c?.user_id || !c?.integration_token) return { ok: false, message: 'Medium credentials missing — go to Bağlantılar' };
  const r = await fetch(`https://api.medium.com/v1/users/${c.user_id}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.integration_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      title: content.split('\n')[0].slice(0, 100) || 'BASONCE Update',
      contentFormat: 'markdown',
      content: content,
      publishStatus: 'public',
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, message: j?.errors?.[0]?.message || `HTTP ${r.status}` };
  const url = j?.data?.url;
  return { ok: true, message: 'Published to Medium', url };
}

/* ── OAuth 1.0a header builder for X (Twitter) ─────────────────────── */
async function buildOAuth1Header(method, url, params, c) {
  const oauthParams = {
    oauth_consumer_key: c.api_key,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: c.access_token,
    oauth_version: '1.0',
  };
  const allParams = { ...oauthParams, ...params };
  const paramString = Object.keys(allParams).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`).join('&');
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(c.api_secret)}&${encodeURIComponent(c.access_secret)}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(signingKey), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  oauthParams.oauth_signature = sigB64;
  return 'OAuth ' + Object.keys(oauthParams).sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`).join(', ');
}

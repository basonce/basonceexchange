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

// Welcome chest constants — kept in worker so no DB DDL is required
const CHEST_REWARD_AMOUNT = 100;
const CHEST_REWARD_SYMBOL = 'EQ';
const CHEST_WINDOW_MS = 10 * 60 * 1000;            // 10 minutes from first view
const CHEST_CAMPAIGN_END_MS = Date.parse('2026-05-19T23:59:59Z');
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
    // Stagger starts within first 25 minutes of epoch so all matches stay live during the 2h window
    const offsetMs = Math.floor(rngM() * 25 * 60 * 1000);
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
  let state = await stoDownload(CTRL_BUCKET, SPORT_STATE_FILE, env);
  if (!state || state.epoch !== epoch || !Array.isArray(state.matches)) {
    state = { epoch, matches: generateSportEpoch(epoch) };
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

/* ═══════════════════════════════════════════════
   BSC / TRC-20 PARA RADARI
═══════════════════════════════════════════════ */
const USDT_BEP20 = '0x55d398326f99059fF775485246999027B3197955';
const USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// BSC public RPC — no API key needed. Fallback list for reliability.
// RPCs that allow eth_getLogs without API key (verified)
const BSC_RPCS = [
  'https://bsc-pokt.nodies.app',
  'https://bsc.drpc.org',
  'https://1rpc.io/bnb',
  'https://bsc-dataseed.binance.org/',
];
let rpcDebug = [];
async function bscRpc(method, params) {
  for (const url of BSC_RPCS) {
    try {
      const r = await fetch(url, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
        signal: AbortSignal.timeout(10000),
      });
      const j = await r.json();
      if (j.result !== undefined) return j.result;
      rpcDebug.push({url, method, error: j.error?.message || 'no result'});
    } catch (e) { rpcDebug.push({url, method, fetchError: e.message}); }
  }
  return null;
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
  const TOTAL_BLOCKS = 30000, CHUNK = 9900;
  const logs = [];
  for (let off = 0; off < TOTAL_BLOCKS; off += CHUNK) {
    const hi = Math.max(currentBlock - off, 0);
    const lo = Math.max(hi - CHUNK, 0);
    if (hi <= 0) break;
    const part = await bscRpc('eth_getLogs', [{
      fromBlock: '0x' + lo.toString(16),
      toBlock: '0x' + hi.toString(16),
      topics: [TRANSFER_SIG, null, paddedList],
    }]);
    if (Array.isArray(part)) logs.push(...part);
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
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) { console.error('Telegram error', e.message); }
}

async function scanAllWallets(env, part='main') {
  const headers = {Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey:env.SUPABASE_SERVICE_ROLE_KEY};

  // Load all assigned wallets
  const wRes = await fetch(`${SUPABASE_URL}/rest/v1/wallet_pool?is_assigned=eq.true&select=id,address,network,assigned_to_user_id`, {headers});
  const wallets = await wRes.json();
  if (!Array.isArray(wallets)) return {error:'failed to load wallets', detail: wallets};

  // Load existing tx hashes to dedupe
  const exRes = await fetch(`${SUPABASE_URL}/rest/v1/blockchain_deposits?select=tx_hash`, {headers: {...headers, 'Range':'0-9999'}});
  const existing = new Set(((await exRes.json())||[]).map(r=>r.tx_hash));

  rpcDebug = [];
  let scanned=0, found=0, inserted=0, errors=0;
  const newOnes = [];

  // part='main'  → BSC + TRC-20 tokens (default)
  // part='trx'   → only native TRX
  const doBsc   = part === 'main';
  const doTrc20 = part === 'main';
  const doTrx   = part === 'trx';

  // Batch BSC: one call covers all BSC addresses
  let bscMap = new Map();
  if (doBsc) {
    const bscWallets = wallets.filter(w => w.network === 'BEP20' || w.network === 'BSC');
    bscMap = await scanBscWalletsBatch(bscWallets.map(w => w.address), env);
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
      // Insert new deposit
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/blockchain_deposits`, {
        method:'POST',
        headers:{...headers,'Content-Type':'application/json','Prefer':'return=representation'},
        body: JSON.stringify({
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
        }),
      });
      if (ins.ok) {
        inserted++;
        existing.add(tx.tx_hash);
        newOnes.push({...tx, network:w.network, wallet:w.address, user_id:w.assigned_to_user_id});
      } else {
        errors++;
      }
    }
    // Pacing: TronGrid free tier = 1 req/sec. Use 1100ms for TRC/TRX wallets.
    const isTron = (w.network === 'TRC20' || w.network === 'TRON');
    await new Promise(r=>setTimeout(r, isTron ? 1100 : 50));
  }

  // Telegram batch alert
  if (newOnes.length && env.TELEGRAM_BOT_TOKEN) {
    // Resolve emails
    const userIds = [...new Set(newOnes.map(d=>d.user_id).filter(Boolean))];
    let emails = {};
    if (userIds.length) {
      const uRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=in.(${userIds.join(',')})&select=id,email`, {headers});
      const users = await uRes.json();
      if (Array.isArray(users)) for (const u of users) emails[u.id] = u.email;
    }
    const total = newOnes.reduce((s,d)=>s+d.amount,0).toFixed(2);
    let msg = `🔔 <b>Yeni Para Geldi!</b>\n\n${newOnes.length} işlem · Toplam <b>${total} USDT</b>\n\n`;
    for (const d of newOnes.slice(0, 10)) {
      const email = emails[d.user_id] || 'atanmamış';
      msg += `💰 <b>${d.amount.toFixed(2)} USDT</b> (${d.network})\n👤 ${email}\n📥 <code>${d.wallet.slice(0,12)}...${d.wallet.slice(-6)}</code>\n\n`;
    }
    if (newOnes.length > 10) msg += `... ve ${newOnes.length-10} işlem daha`;
    await sendTelegramAlert(msg, env);
  }

  return {ok:true, scanned, found, inserted, errors, new_deposits: newOnes.length};
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
async function tgSendMessage(env, text, opts={}) {
  // 'feed' kanalı varsa oraya, yoksa main'e yolla
  let chat_id = opts.chatId;
  if (!chat_id) {
    if (opts.channel === 'feed' && env.TELEGRAM_FEED_CHAT_ID) {
      chat_id = env.TELEGRAM_FEED_CHAT_ID;
    } else {
      chat_id = env.TELEGRAM_ADMIN_CHAT_ID;
    }
  }
  if (!chat_id) return { ok:false, reason:'no_chat_id' };
  const payload = {
    chat_id,
    text: String(text).slice(0, 3900),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (opts.keyboard) payload.reply_markup = opts.keyboard;
  if (opts.replyTo) payload.reply_to_message_id = opts.replyTo;
  if (opts.silent) payload.disable_notification = true;
  return tgApi(env, 'sendMessage', payload);
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
export default {
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
        const shouldHold = usdValue >= 500;

        // FORCE the status server-side if needed
        if (shouldHold && w.status !== 'hold') {
          await fetch(`${REST}/withdrawal_transactions?id=eq.${encodeURIComponent(withdrawal_id)}`, {
            method: 'PATCH',
            headers: { ...restHeaders(env), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'hold' }),
          }).catch(() => {});
        }

        const finalStatus = shouldHold ? 'hold' : (w.status || 'pending');
        const emoji = shouldHold ? '⏸️' : '💸';
        const tag = shouldHold ? '<b>OTOMATİK BEKLEMEDE</b> (≥$500)' : 'Çekim Talebi';

        const msg = `${emoji} <b>${tag}</b>\n\n` +
          `👤 ${callerEmail || 'unknown'}\n` +
          `💰 ${amount} ${sym} ≈ $${usdValue.toFixed(2)}\n` +
          `📍 <code>${String(w.destination_address || '').slice(0, 50)}</code>\n` +
          `🆔 <code>${String(withdrawal_id).slice(0, 8)}</code>\n` +
          (shouldHold ? '\n⏸️ Onayınız bekleniyor — admin panelden inceleyin.' : '');

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
        return ok({ total, spotTotal, futuresWallet, futuresUnrealizedPnL, spotBalances, missingPrices });
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
          const text = String(body?.text || '').slice(0, 3900);
          if (!text) return err(400, 'text required');
          const keyboard = body?.keyboard || null;
          const silent = body?.silent === true;
          const channel = body?.channel || 'main'; // 'main' | 'feed'
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
        const result = await scanAllWallets(env, 'main');
        return ok(result);
      }
      if (method==='POST' && path==='/scan-deposits-trx') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const result = await scanAllWallets(env, 'trx');
        return ok(result);
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

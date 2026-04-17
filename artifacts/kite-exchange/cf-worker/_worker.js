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
  // Pre-decide goal counts (skewed towards low scores)
  const baseHome = Math.floor(rng() * rng() * 4.2);
  const baseAway = Math.floor(rng() * rng() * 3.8);
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

async function scanTronWallet(address, env) {
  const headers = env.TRONGRID_API_KEY ? {'TRON-PRO-API-KEY': env.TRONGRID_API_KEY} : {};
  // 1) ALL TRC-20 token transfers
  const trc20Url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=50&only_to=true`;
  // 2) NATIVE TRX transfers
  const trxUrl = `https://api.trongrid.io/v1/accounts/${address}/transactions?limit=50&only_to=true`;
  try {
    const [trc20Res, trxRes] = await Promise.all([
      fetch(trc20Url, {headers, signal: AbortSignal.timeout(10000)}).then(r=>r.json()).catch(()=>({data:[]})),
      fetch(trxUrl,   {headers, signal: AbortSignal.timeout(10000)}).then(r=>r.json()).catch(()=>({data:[]})),
    ]);
    const out = [];
    if (Array.isArray(trc20Res.data)) {
      for (const tx of trc20Res.data) {
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
    if (Array.isArray(trxRes.data)) {
      for (const tx of trxRes.data) {
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

async function scanAllWallets(env) {
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

  // Batch BSC: one call covers all BSC addresses
  const bscWallets = wallets.filter(w => w.network === 'BEP20' || w.network === 'BSC');
  const bscMap = await scanBscWalletsBatch(bscWallets.map(w => w.address), env);

  for (const w of wallets) {
    scanned++;
    let txs = [];
    if (w.network === 'BEP20' || w.network === 'BSC') txs = bscMap.get(w.address) || [];
    else if (w.network === 'TRC20' || w.network === 'TRON') txs = await scanTronWallet(w.address, env);
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
    // Small pacing
    await new Promise(r=>setTimeout(r, 250));
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

  return {ok:true, scanned, found, inserted, errors, new_deposits: newOnes.length, rpcErrors: rpcDebug.slice(0, 20), rpcErrorCount: rpcDebug.length};
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
      return env.ASSETS.fetch(request);
    }

    let body = {};
    if (!['GET','HEAD','OPTIONS'].includes(method)) {
      try { body = await request.json(); } catch {}
    }

    const q = Object.fromEntries(url.searchParams);

    try {
      /* ── HEALTH ── */
      if (method==='GET' && path==='/healthz') return ok({status:'ok',platform:'cloudflare'});

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

      /* ── BSC / TRC-20 PARA RADARI ── */
      if (method==='POST' && path==='/scan-deposits') {
        if (!isAdmin(request.headers)) return err(403,'Forbidden');
        const result = await scanAllWallets(env);
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

      return err(404, `Not found: ${method} ${path}`);
    } catch(e) {
      console.error('[worker]', e.message);
      return err(500, e.message||'Internal server error');
    }
  }
};

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
let _cryptoCache=null, _cryptoCacheTs=0;
async function getAllKuCoinPrices() {
  const now=Date.now();
  if (_cryptoCache && now-_cryptoCacheTs<15000) return _cryptoCache;
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
  _cryptoCache=result; _cryptoCacheTs=now;
  return result;
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
let _tradfiCache=null, _tradfiCacheTs=0;
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
  const now=Date.now();
  if (_tradfiCache && now-_tradfiCacheTs<60000) {
    if (!symbols) return _tradfiCache;
    const out={}; for (const s of symbols) if (_tradfiCache[s]) out[s]=_tradfiCache[s];
    return out;
  }
  const pairs=Object.entries(YAHOO_MAP);
  const results=await Promise.allSettled(pairs.map(([k,v])=>fetchYahooQuote(v).then(d=>[k,d])));
  const out={};
  for (const r of results) if (r.status==='fulfilled'&&r.value[1]) out[r.value[0]]=r.value[1];
  _tradfiCache=out; _tradfiCacheTs=now;
  if (!symbols) return out;
  const filtered={}; for (const s of symbols) if (out[s]) filtered[s]=out[s];
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

async function scanBscWallet(address, env) {
  const apiKey = env.BSCSCAN_API_KEY || '';
  const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${USDT_BEP20}&address=${address}&page=1&offset=20&sort=desc${apiKey?`&apikey=${apiKey}`:''}`;
  try {
    const r = await fetch(url, {signal: AbortSignal.timeout(10000)});
    const data = await r.json();
    if (data.status !== '1' || !Array.isArray(data.result)) return [];
    return data.result
      .filter(tx => tx.to && tx.to.toLowerCase() === address.toLowerCase())
      .map(tx => ({
        tx_hash: tx.hash,
        from_address: tx.from,
        to_address: tx.to,
        amount: Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal||18)),
        block_number: Number(tx.blockNumber),
        block_time: new Date(Number(tx.timeStamp)*1000).toISOString(),
        confirmations: Number(tx.confirmations||0),
      }));
  } catch (e) { console.error('BSC scan error', address, e.message); return []; }
}

async function scanTronWallet(address, env) {
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?contract_address=${USDT_TRC20}&limit=20&only_to=true`;
  try {
    const headers = env.TRONGRID_API_KEY ? {'TRON-PRO-API-KEY': env.TRONGRID_API_KEY} : {};
    const r = await fetch(url, {headers, signal: AbortSignal.timeout(10000)});
    const data = await r.json();
    if (!Array.isArray(data.data)) return [];
    return data.data.map(tx => ({
      tx_hash: tx.transaction_id,
      from_address: tx.from,
      to_address: tx.to,
      amount: Number(tx.value) / Math.pow(10, Number(tx.token_info?.decimals||6)),
      block_number: tx.block_timestamp ? null : null,
      block_time: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : null,
      confirmations: 1,
    }));
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

  let scanned=0, found=0, inserted=0, errors=0;
  const newOnes = [];

  // Throttle: BscScan free = 5 req/sec; TRC has 15. Process serially with small delay.
  for (const w of wallets) {
    scanned++;
    let txs = [];
    if (w.network === 'BEP20' || w.network === 'BSC') txs = await scanBscWallet(w.address, env);
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
          currency: 'USDT',
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

  return {ok:true, scanned, found, inserted, errors, new_deposits: newOnes.length};
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

      return err(404, `Not found: ${method} ${path}`);
    } catch(e) {
      console.error('[worker]', e.message);
      return err(500, e.message||'Internal server error');
    }
  }
};

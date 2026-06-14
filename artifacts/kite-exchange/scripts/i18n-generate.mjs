// Build-time translation generator for the Basonce desktop exchange.
//
// Reads the English source catalog (src/desktop/i18n/source/en.json) and, for
// each target language, fills in any MISSING keys by asking Gemini for a
// professional UI translation. Existing keys in a locale file are PRESERVED
// (never overwritten) so hand-verified fixes are safe across re-runs.
//
// Requires the Replit Gemini AI integration env vars:
//   AI_INTEGRATIONS_GEMINI_BASE_URL, AI_INTEGRATIONS_GEMINI_API_KEY
//
// Usage:
//   node scripts/i18n-generate.mjs              # fill missing keys, all langs
//   node scripts/i18n-generate.mjs --force      # retranslate every key
//   node scripts/i18n-generate.mjs tr es ja     # only these languages

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N = path.resolve(__dirname, '../src/desktop/i18n');

function flagValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const SRC = path.resolve(I18N, flagValue('--source', 'source/en.json'));
const LOCDIR = path.resolve(I18N, flagValue('--out', 'locales'));

// Languages come from the shared catalog so UI and generation never drift.
const ALL_LANGS = JSON.parse(fs.readFileSync(path.join(I18N, 'languages.json'), 'utf8'))
  .filter((l) => l.code !== 'en')
  .map((l) => ({ code: l.code, name: l.name || l.native }));

const BASE = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
if (!BASE || !KEY) {
  console.error('Missing AI_INTEGRATIONS_GEMINI_BASE_URL / AI_INTEGRATIONS_GEMINI_API_KEY.');
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const FLAGS_WITH_VALUE = new Set(['--source', '--out']);
const onlyCodes = args.filter((a, i) => !a.startsWith('--') && !FLAGS_WITH_VALUE.has(args[i - 1]));
const langs = (onlyCodes.length
  ? ALL_LANGS.filter((l) => onlyCodes.includes(l.code))
  : ALL_LANGS
).filter((l) => l.code !== 'en');

const CHUNK = 50;
const CONCURRENCY = 6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function translateChunk(langName, entries) {
  const prompt =
    `You are a professional UI localizer for a Binance-style crypto exchange. ` +
    `Translate the VALUES of the following JSON object into ${langName}.\n` +
    `Rules:\n` +
    `- Return ONLY a JSON object with the EXACT same keys.\n` +
    `- These are short UI labels; keep them concise and natural for a finance app.\n` +
    `- Keep product, ticker and brand names unchanged: Bitcoin, Ethereum, USDT, BTC, ETH, BNB, Spot, Futures, PnL, Basonce.\n` +
    `- Preserve any text inside parentheses tokens like "(USDT)" and symbols like "/" or "%".\n` +
    `- Do not add or remove punctuation relative to the source.\n` +
    `- Use the formal/standard register a major exchange would use.\n\n` +
    JSON.stringify(entries, null, 2);

  const url = `${BASE}/models/gemini-2.5-flash:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty model response');
  return JSON.parse(text);
}

async function main() {
  const en = readJson(SRC, null);
  if (!en) {
    console.error(`Cannot read source catalog at ${SRC}`);
    process.exit(1);
  }
  fs.mkdirSync(LOCDIR, { recursive: true });
  const enKeys = Object.keys(en);

  // Build a flat job list (one job = one chunk for one language). Each language
  // accumulates into `out` and is written to disk as soon as all its chunks are
  // done, so progress survives even if the run is interrupted.
  const state = new Map(); // code -> { lang, file, out, remaining }
  const jobs = [];
  for (const lang of langs) {
    const file = path.join(LOCDIR, `${lang.code}.json`);
    const existing = readJson(file, {});
    const missing = force ? enKeys : enKeys.filter((k) => !(k in existing));
    if (missing.length === 0) {
      console.log(`${lang.code}: up to date (${enKeys.length} keys)`);
      continue;
    }
    const chunks = [];
    for (let i = 0; i < missing.length; i += CHUNK) chunks.push(missing.slice(i, i + CHUNK));
    state.set(lang.code, { lang, file, out: { ...existing }, remaining: chunks.length });
    console.log(`${lang.code}: queued ${missing.length} string(s) in ${chunks.length} chunk(s)`);
    for (const slice of chunks) jobs.push({ code: lang.code, lang, slice });
  }
  if (jobs.length === 0) { console.log('Done. Nothing to do.'); return; }

  function writeLang(st) {
    const ordered = {};
    for (const k of enKeys) if (k in st.out) ordered[k] = st.out[k];
    fs.writeFileSync(st.file, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
    console.log(`${st.lang.code}: wrote -> ${path.relative(process.cwd(), st.file)}`);
  }

  let idx = 0;
  async function worker() {
    while (idx < jobs.length) {
      const job = jobs[idx++];
      const entries = Object.fromEntries(job.slice.map((k) => [k, en[k]]));
      let attempt = 0;
      while (true) {
        try {
          const got = await translateChunk(job.lang.name, entries);
          const st = state.get(job.code);
          for (const k of job.slice) if (typeof got[k] === 'string') st.out[k] = got[k];
          break;
        } catch (e) {
          attempt += 1;
          if (attempt >= 8) { console.error(`${job.code}: chunk failed: ${String(e.message).slice(0, 80)}`); break; }
          const is429 = /429|RATELIMIT/i.test(String(e.message));
          await sleep(is429 ? 4000 + 2000 * attempt : 1500 * attempt);
        }
      }
      const st = state.get(job.code);
      st.remaining -= 1;
      // Persist after every chunk so partial progress survives interruption.
      writeLang(st);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

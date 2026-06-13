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
const SRC = path.join(I18N, 'source', 'en.json');
const LOCDIR = path.join(I18N, 'locales');

const ALL_LANGS = [
  { code: 'tr', name: 'Turkish' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese (Brazil)' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Simplified Chinese' },
  { code: 'zh-TW', name: 'Traditional Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'uk', name: 'Ukrainian' },
];

const BASE = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
if (!BASE || !KEY) {
  console.error('Missing AI_INTEGRATIONS_GEMINI_BASE_URL / AI_INTEGRATIONS_GEMINI_API_KEY.');
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyCodes = args.filter((a) => !a.startsWith('--'));
const langs = onlyCodes.length
  ? ALL_LANGS.filter((l) => onlyCodes.includes(l.code))
  : ALL_LANGS;

const CHUNK = 40;
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

  for (const lang of langs) {
    const file = path.join(LOCDIR, `${lang.code}.json`);
    const existing = readJson(file, {});
    const missing = force ? enKeys : enKeys.filter((k) => !(k in existing));
    if (missing.length === 0) {
      console.log(`${lang.code}: up to date (${enKeys.length} keys)`);
      continue;
    }
    const out = { ...existing };
    for (let i = 0; i < missing.length; i += CHUNK) {
      const slice = missing.slice(i, i + CHUNK);
      const entries = Object.fromEntries(slice.map((k) => [k, en[k]]));
      let attempt = 0;
      while (true) {
        try {
          const got = await translateChunk(lang.name, entries);
          for (const k of slice) if (typeof got[k] === 'string') out[k] = got[k];
          break;
        } catch (e) {
          attempt += 1;
          if (attempt >= 3) throw e;
          await sleep(1500 * attempt);
        }
      }
      await sleep(300);
    }
    // Write keys in source order for stable diffs.
    const ordered = {};
    for (const k of enKeys) if (k in out) ordered[k] = out[k];
    fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
    console.log(`${lang.code}: wrote ${missing.length} key(s) -> ${path.relative(process.cwd(), file)}`);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';

const LOGOS_DIR = 'public/logos';
if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Major teams known to be in TheSportsDB + alt search names
const TEAMS = [
  // South Africa
  ['Kaizer Chiefs', 'Kaizer Chiefs FC', 'Chiefs'],
  ['Orlando Pirates', 'Pirates FC'],
  ['Mamelodi Sundowns', 'Sundowns FC'],
  ['SuperSport United', 'Supersport United FC'],
  ['Cape Town City FC', 'Cape Town City'],
  ['Stellenbosch FC', 'Stellenbosch'],
  ['Golden Arrows', 'Golden Arrows FC', 'Lamontville Golden Arrows'],
  ['Maritzburg United', 'Team of Choice'],
  ['TS Galaxy', 'TS Galaxy FC'],
  ['Sekhukhune United', 'Sekhukhune United FC'],
  // Egypt
  ['Al Ahly SC', 'Al-Ahly', 'Al Ahly'],
  ['Zamalek SC', 'Zamalek', 'Zamalek FC'],
  ['Pyramids FC', 'Pyramids', 'Arab Contractors'],
  ['Ismaily SC', 'Ismaily', 'Ismaily Sporting Club'],
  ['Future FC', 'Wadi Degla'],
  ['Smouha SC', 'Smouha'],
  ['El Gouna FC', 'El Gouna'],
  ['Ceramica Cleopatra', 'Ceramica FC'],
  // Morocco
  ['Wydad AC', 'Wydad Casablanca', 'WAC'],
  ['Raja Casablanca', 'Raja Club Athletic'],
  ['FUS Rabat', 'FUS de Rabat', 'Fus Rabat'],
  ['RS Berkane', 'Renaissance Berkane'],
  ['Hassania Agadir', 'Hassania US Agadir'],
  ['Moghreb Tetouan', 'MAT Tetouan'],
  ['Difaa El Jadidi', 'Difaa Hassani El Jadidi'],
  ['Ittihad Tanger', 'Ittihad Tangier'],
  // Kenya
  ['Gor Mahia FC', 'Gor Mahia', 'K\'ogalo'],
  ['AFC Leopards', 'Leopards'],
  ['Tusker FC', 'AFC Tusker', 'Kenya Breweries'],
  ['Mathare United'],
  ['Kakamega Homeboyz', 'Homeboyz'],
  ['Bandari FC'],
  ['Sofapaka FC'],
  ['KCB FC', 'Kenya Commercial Bank'],
  ['Posta Rangers'],
  // Zambia
  ['Zesco United', 'ZESCO United FC'],
  ['Nkana FC', 'Nkana Red Devils'],
  ['Forest Rangers', 'Green Buffaloes'],
  ['Power Dynamos', 'Power Dynamos FC'],
  ['Buildcon FC'],
  ['Red Arrows', 'Red Arrows Zambia'],
  ['Zanaco FC'],
  ['Napsa Stars'],
  // Ghana
  ['Medeama SC', 'Medeama'],
  ['Great Olympics FC', 'Accra Great Olympics'],
  ['King Faisal FC'],
  ['Bechem United'],
  // Rwanda
  ['APR FC', 'APR Football Club Rwanda'],
  ['Rayon Sports FC', 'AS Rayon Sports'],
  ['AS Kigali'],
  ['Espoir FC'],
  // Zimbabwe
  ['Dynamos FC', 'Dynamos Zimbabwe'],
  ['CAPS United', 'CAPS United Zimbabwe'],
  ['Highlanders FC', 'Bulawayo Highlanders'],
  ['FC Platinum', 'FC Platinum Zimbabwe'],
  ['Triangle United'],
  ['Chicken Inn FC'],
  ['Herentals FC'],
  // Angola
  ['Petro de Luanda', 'Atletico Petroleos de Luanda'],
  ['Primeiro de Agosto', 'GD Primeiro de Agosto'],
  ['Sagrada Esperanca'],
  ['Recreativo do Libolo'],
  ['Kabuscorp SC'],
  // DR Congo
  ['TP Mazembe', 'Tout Puissant Mazembe'],
  ['AS Vita Club', 'Vita Club'],
  ['DC Motema Pembe', 'DC Motema Pembe'],
  ['Saint-Eloi Lupopo', 'TS Lupopo'],
  ['CS Don Bosco'],
  // Senegal
  ['AS Pikine', 'AS Pikine Senegal'],
  ['Jaraaf FC', 'AS Jaraaf', 'Jaraaf'],
  ['Casa Sports', 'Casa Sports Senegal'],
  ['Diambars FC'],
  ['Teungueth FC'],
  ['Generation Foot', 'Generation Foot Senegal'],
  // Malawi
  ['Be Forward Wanderers', 'Mighty Wanderers'],
  ['Nyasa Big Bullets', 'Big Bullets'],
  ['Silver Strikers', 'Silver Strikers Malawi'],
  ['Blue Eagles', 'Blue Eagles Malawi'],
  // Burundi
  ['Vital-O FC', 'Vital O'],
  ['Le Messager Ngozi'],
  ['Aigle Noir', 'Aigle Noir Burundi'],
  // Tanzania (missed)
  ['Azam FC', 'Azam'],
  ['Singida United'],
  ['Ihefu FC'],
  // Ethiopia (missed)
  ['Ethiopian Coffee SC', 'Ethiopian Coffee'],
  ['St. George SC', 'Saint George SC', 'Saint George Ethiopia'],
  ['Adama City FC'],
  ['Dedebit FC'],
  // Uganda (missed)
  ['KCCA FC', 'Kampala City Council'],
  ['Express FC', 'Express FC Uganda'],
  ['Vipers SC', 'Vipers Uganda'],
];

async function fetchBadge(name) {
  try {
    const encoded = encodeURIComponent(name);
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encoded}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.teams?.[0]?.strBadge || null;
  } catch { return null; }
}

async function downloadImage(url, filename) {
  const path = `${LOGOS_DIR}/${filename}`;
  if (existsSync(path)) return true;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    await writeFile(path, Buffer.from(buf));
    return true;
  } catch { return false; }
}

function toFilename(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.png';
}

let existing = {};
try {
  const f = await import('fs');
  const t = f.readFileSync('scripts/logo-results.json', 'utf8');
  existing = JSON.parse(t);
} catch {}

const results = { ...existing };
let found = 0, skipped = 0, missing = 0;

for (const names of TEAMS) {
  const primary = names[0];

  // Skip already downloaded
  if (results[primary]) { skipped++; continue; }

  let badgeUrl = null;
  for (const name of names) {
    await sleep(2000);
    badgeUrl = await fetchBadge(name);
    if (badgeUrl) break;
  }

  if (badgeUrl) {
    const filename = toFilename(primary);
    const saved = await downloadImage(badgeUrl, filename);
    if (saved) {
      results[primary] = `/logos/${filename}`;
      found++;
      console.log(`✓ ${primary}`);
    } else {
      missing++;
      console.log(`✗ DL: ${primary}`);
    }
  } else {
    missing++;
    console.log(`✗ ${primary}`);
  }
}

console.log(`\n✓ ${found} new | ⊘ ${skipped} cached | ✗ ${missing} missing`);
await writeFile('scripts/logo-results.json', JSON.stringify(results, null, 2));

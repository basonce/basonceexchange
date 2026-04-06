import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';

const LOGOS_DIR = 'public/logos';
if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// All teams with their search names and any alternate names
const TEAMS = [
  // Uganda
  ['Kampala City Council FC', 'KCCA FC'],
  ['KCCA FC'],
  ['Vipers SC'],
  ['Express FC', 'Express FC Uganda'],
  ['SC Villa', 'Villa SC Uganda'],
  ['Wakiso Giants'],
  ['Maroons FC'],
  ['Mbarara City'],
  // Tanzania
  ['Simba SC'],
  ['Young Africans SC', 'Young Africans', 'Yanga SC'],
  ['Azam FC'],
  ['Coastal Union', 'Coastal Union FC'],
  ['Biashara United'],
  ['Singida United'],
  // Ethiopia
  ['Ethiopian Coffee SC', 'Ethiopian Coffee'],
  ['St. George SC', 'Saint George SC Ethiopia'],
  ['Fasil Kenema'],
  ['Wolaitta Dicha'],
  ['Hawassa Ketema', 'Hawassa City'],
  // Ghana
  ['Asante Kotoko SC', 'Asante Kotoko', 'Kumasi Asante Kotoko'],
  ['Hearts of Oak SC', 'Hearts of Oak', 'Accra Hearts of Oak'],
  ['Great Olympics FC', 'Accra Great Olympics'],
  ['Medeama SC'],
  ['Aduana Stars', 'Aduana FC'],
  ['Legon Cities', 'Legon Cities FC'],
  ['King Faisal FC', 'King Faisal Babes'],
  ['Dreams FC'],
  ['Bechem United'],
  // Kenya
  ['Gor Mahia FC', 'Gor Mahia'],
  ['AFC Leopards'],
  ['Tusker FC', 'AFC Tusker'],
  ['Mathare United', 'Mathare United FC'],
  ['Kakamega Homeboyz'],
  ['Sofapaka FC'],
  ['Bandari FC'],
  ['KCB FC'],
  ['Posta Rangers'],
  // Rwanda
  ['APR FC', 'APR Football Club'],
  ['Rayon Sports FC', 'Rayon Sports'],
  ['AS Kigali', 'AS Kigali FC'],
  // Zambia
  ['Zesco United', 'ZESCO United'],
  ['Nkana FC', 'Nkana Red Devils'],
  ['Forest Rangers', 'Forest Rangers FC'],
  ['Green Eagles'],
  ['Power Dynamos'],
  ['Buildcon FC'],
  ['Red Arrows', 'Red Arrows FC Zambia'],
  ['Zanaco FC'],
  // Senegal
  ['AS Pikine'],
  ['Jaraaf FC', 'AS Jaraaf'],
  ['Casa Sports'],
  ['Diambars FC'],
  ['Teungueth FC'],
  // Zimbabwe
  ['Dynamos FC', 'Dynamos Zimbabwe'],
  ['CAPS United', 'CAPS United FC'],
  ['Highlanders FC', 'Bulawayo Highlanders'],
  ['FC Platinum'],
  ['Triangle United'],
  ['Chicken Inn FC'],
  // Malawi
  ['Be Forward Wanderers', 'Wanderers FC Malawi'],
  ['Nyasa Big Bullets', 'Big Bullets'],
  ['Silver Strikers'],
  ['Blue Eagles'],
  // Angola
  ['Petro de Luanda', 'Atletico Petroleos de Luanda', 'Petro Atletico'],
  ['Primeiro de Agosto', 'GD Primeiro de Agosto'],
  ['Recreativo do Libolo'],
  ['Kabuscorp SC'],
  // DR Congo
  ['TP Mazembe', 'Tout Puissant Mazembe'],
  ['AS Vita Club', 'Vita Club Congo'],
  ['DC Motema Pembe'],
  ['Saint-Eloi Lupopo'],
  // Burundi
  ['Vital-O FC', 'Vital O FC'],
  ['Le Messager Ngozi'],
  // South Africa
  ['Kaizer Chiefs', 'Kaizer Chiefs FC'],
  ['Orlando Pirates', 'Orlando Pirates FC'],
  ['Mamelodi Sundowns', 'Mamelodi Sundowns FC'],
  ['SuperSport United', 'SuperSport United FC'],
  ['Cape Town City FC', 'Cape Town City'],
  ['Stellenbosch FC'],
  ['TS Galaxy', 'TS Galaxy FC'],
  ['Sekhukhune United'],
  ['Golden Arrows', 'Golden Arrows FC'],
  ['Maritzburg United'],
  // Egypt
  ['Al Ahly SC', 'Al Ahly'],
  ['Zamalek SC', 'Zamalek'],
  ['Pyramids FC', 'Pyramids FC Egypt'],
  ['Ismaily SC'],
  ['Future FC'],
  ['Smouha SC'],
  ['El Gouna FC'],
  // Morocco
  ['Wydad AC', 'Wydad Casablanca', 'Wydad Athletic Club'],
  ['Raja Casablanca', 'Raja Club Athletic'],
  ['FUS Rabat', 'FUS de Rabat'],
  ['RS Berkane', 'Renaissance Sportive Berkane'],
  ['Hassania Agadir', 'Hassania US Agadir'],
  ['Moghreb Tetouan', 'Moghreb Athletic Tetouan'],
  ['Difaa El Jadidi'],
  ['Ittihad Tanger', 'Ittihad Tanger FC'],
];

async function fetchBadge(name) {
  try {
    const encoded = encodeURIComponent(name);
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encoded}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' }
    });
    const data = await res.json();
    const badge = data.teams?.[0]?.strBadge;
    return badge || null;
  } catch { return null; }
}

async function downloadImage(url, filename) {
  const path = `${LOGOS_DIR}/${filename}`;
  if (existsSync(path)) return path;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    await writeFile(path, Buffer.from(buf));
    return path;
  } catch { return null; }
}

function toFilename(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.png';
}

const results = {};
let found = 0, notFound = 0;

for (const names of TEAMS) {
  const primary = names[0];
  let badgeUrl = null;

  for (const name of names) {
    await sleep(1100); // 1.1s delay between requests
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
      notFound++;
      console.log(`✗ DL_FAIL: ${primary}`);
    }
  } else {
    notFound++;
    console.log(`✗ ${primary}`);
  }
}

console.log(`\n=== ${found} found, ${notFound} not found ===`);
await writeFile('scripts/logo-results.json', JSON.stringify(results, null, 2));
console.log('Saved to scripts/logo-results.json');

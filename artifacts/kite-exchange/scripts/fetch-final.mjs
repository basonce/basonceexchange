import { existsSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const TEAMS = [
  // Confirmed from direct test
  { name: 'TP Mazembe', s: 'TP Mazembe' },
  { name: 'CAPS United', s: 'CAPS United' },
  { name: 'Rayon Sports FC', s: 'Rayon Sports' },
  // More Ghana
  { name: 'Great Olympics FC', s: 'Great Olympics' },
  { name: 'Medeama SC', s: 'Medeama SC' },
  { name: 'King Faisal FC', s: 'King Faisal Babes' },
  { name: 'Bechem United', s: 'Bechem United' },
  { name: 'RTU FC', s: 'RTU FC' },
  // More Kenya
  { name: 'Tusker FC', s: 'Tusker FC' },
  { name: 'Kakamega Homeboyz', s: 'Homeboyz' },
  { name: 'Bandari FC', s: 'Bandari FC' },
  { name: 'KCB FC', s: 'Kenya Commercial Bank' },
  { name: 'Western Stima', s: 'Western Stima' },
  // More Uganda  
  { name: 'Express FC', s: 'Express FC' },
  { name: 'Vipers SC', s: 'Vipers SC' },
  { name: 'Maroons FC', s: 'Maroons FC' },
  { name: 'BUL FC', s: 'BUL FC Uganda' },
  // More Tanzania
  { name: 'Azam FC', s: 'Azam FC' },
  { name: 'Singida United', s: 'Singida United' },
  // More Ethiopia
  { name: 'Ethiopian Coffee SC', s: 'Ethiopian Coffee' },
  { name: 'St. George SC', s: 'Saint George SC' },
  { name: 'Adama City FC', s: 'Adama City' },
  { name: 'Hawassa Ketema', s: 'Hawassa City' },
  // Zambia
  { name: 'Nkana FC', s: 'Nkana FC' },
  { name: 'Forest Rangers', s: 'Forest Rangers FC' },
  { name: 'Green Eagles', s: 'Green Eagles FC' },
  { name: 'Buildcon FC', s: 'Buildcon FC' },
  { name: 'Lusaka Dynamos', s: 'Lusaka Dynamos' },
  { name: 'Red Arrows', s: 'Red Arrows FC' },
  { name: 'Zanaco FC', s: 'Zanaco FC' },
  { name: 'Napsa Stars', s: 'NAPSA Stars' },
  // Zimbabwe
  { name: 'Dynamos FC', s: 'Dynamos FC' },
  { name: 'Highlanders FC', s: 'Highlanders FC' },
  { name: 'Triangle United', s: 'Triangle United' },
  { name: 'FC Platinum', s: 'FC Platinum' },
  { name: 'Chicken Inn FC', s: 'Chicken Inn FC' },
  { name: 'Manica Diamonds', s: 'Manica Diamonds' },
  { name: 'Herentals FC', s: 'Herentals FC' },
  { name: 'Bulawayo Chiefs', s: 'Bulawayo Chiefs' },
  // Angola
  { name: 'Petro de Luanda', s: 'Atletico Petroleos de Luanda' },
  { name: 'Primeiro de Agosto', s: 'GD Primeiro de Agosto' },
  { name: 'Sagrada Esperanca', s: 'Sagrada Esperanca' },
  { name: 'Recreativo do Libolo', s: 'Libolo' },
  { name: 'Kabuscorp SC', s: 'Kabuscorp' },
  // DR Congo remaining
  { name: 'AS Vita Club', s: 'AS Vita Club' },
  { name: 'DC Motema Pembe', s: 'DC Motema Pembe' },
  { name: 'AS Dragons', s: 'AS Dragons Congo' },
  { name: 'CS Don Bosco', s: 'Don Bosco FC' },
  { name: 'Saint-Eloi Lupopo', s: 'TS Lupopo' },
  // Rwanda
  { name: 'APR FC', s: 'APR FC' },
  { name: 'AS Kigali', s: 'AS Kigali' },
  { name: 'Police FC Rwanda', s: 'Police FC Rwanda' },
  { name: 'Espoir FC', s: 'Espoir FC Rwanda' },
  // Senegal
  { name: 'AS Pikine', s: 'AS Pikine' },
  { name: 'Jaraaf FC', s: 'ASC Jaraaf' },
  { name: 'Generation Foot', s: 'Generation Foot' },
  { name: 'Casa Sports', s: 'Casa Sports' },
  { name: 'Diambars FC', s: 'Diambars' },
  { name: 'US Goree', s: 'US Goree' },
  { name: 'Teungueth FC', s: 'Teungueth FC' },
  // Malawi
  { name: 'Be Forward Wanderers', s: 'Wanderers FC Malawi' },
  { name: 'Nyasa Big Bullets', s: 'Big Bullets' },
  { name: 'Silver Strikers', s: 'Silver Strikers' },
  { name: 'Blue Eagles', s: 'Blue Eagles Malawi' },
  // Burundi
  { name: 'Vital-O FC', s: 'Vital O FC' },
  { name: 'Le Messager Ngozi', s: 'Le Messager' },
  // Egypt remaining
  { name: 'Pyramids FC', s: 'Pyramids FC' },
  { name: 'Ismaily SC', s: 'Ismaily SC' },
  { name: 'Smouha SC', s: 'Smouha SC' },
  { name: 'Future FC', s: 'Future FC' },
  { name: 'Ceramica Cleopatra', s: 'Ceramica Cleopatra' },
  // Morocco remaining
  { name: 'Mouloudia Oujda', s: 'Mouloudia Oujda' },
  { name: 'Renaissance Berkane', s: 'Renaissance Berkane' },
  { name: 'Moghreb Tetouan', s: 'MAT Tetouan' },
  { name: 'Difaa El Jadidi', s: 'Difaa El Jadidi' },
  { name: 'Ittihad Tanger', s: 'Ittihad Tangier' },
  // South Africa remaining
  { name: 'Stellenbosch FC', s: 'Stellenbosch FC' },
  { name: 'TS Galaxy', s: 'TS Galaxy FC' },
  { name: 'Golden Arrows', s: 'Lamontville Golden Arrows' },
];

const existing = JSON.parse(await readFile('scripts/logo-results.json', 'utf8').catch(() => '{}'));
const results = { ...existing };

let found = 0, missing = 0, skipped = 0;

for (const { name, s } of TEAMS) {
  const fname = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.png';
  const path = `public/logos/${fname}`;

  if (results[name] || existsSync(path)) {
    results[name] = `/logos/${fname}`;
    skipped++;
    continue;
  }

  await sleep(1800);

  let badge = null;
  try {
    const r = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(s)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/122' }
    });
    const d = await r.json();
    badge = d.teams?.[0]?.strBadge;
  } catch {}

  if (badge) {
    try {
      const r2 = await fetch(badge, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r2.ok) {
        await writeFile(path, Buffer.from(await r2.arrayBuffer()));
        results[name] = `/logos/${fname}`;
        found++;
        console.log(`✓ ${name}`);
      } else { missing++; process.stdout.write(`✗ DL ${name}\n`); }
    } catch { missing++; process.stdout.write(`✗ ${name}\n`); }
  } else {
    missing++;
    process.stdout.write(`✗ ${name}\n`);
  }
}

await writeFile('scripts/logo-results.json', JSON.stringify(results, null, 2));
console.log(`\n✓ ${found} new | ⊘ ${skipped} cached | ✗ ${missing} missing`);
console.log('Total:', Object.keys(results).length);

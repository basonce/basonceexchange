import { existsSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const MAJOR = [
  // South Africa — confirmed in TheSportsDB
  { name: 'Kaizer Chiefs', search: 'Kaizer Chiefs' },
  { name: 'Orlando Pirates', search: 'Orlando Pirates' },
  { name: 'Mamelodi Sundowns', search: 'Mamelodi Sundowns' },
  { name: 'SuperSport United', search: 'SuperSport United' },
  { name: 'Cape Town City FC', search: 'Cape Town City' },
  { name: 'Stellenbosch FC', search: 'Stellenbosch FC' },
  { name: 'Golden Arrows', search: 'Golden Arrows FC' },
  { name: 'Maritzburg United', search: 'Maritzburg United' },
  { name: 'TS Galaxy', search: 'TS Galaxy FC' },
  { name: 'Sekhukhune United', search: 'Sekhukhune United' },
  // Egypt
  { name: 'Al Ahly SC', search: 'Al Ahly' },
  { name: 'Zamalek SC', search: 'Zamalek' },
  { name: 'Pyramids FC', search: 'Pyramids FC' },
  { name: 'Ismaily SC', search: 'Ismaily SC' },
  { name: 'Smouha SC', search: 'Smouha SC' },
  { name: 'El Gouna FC', search: 'El Gouna' },
  // Morocco
  { name: 'Wydad AC', search: 'Wydad Casablanca' },
  { name: 'Raja Casablanca', search: 'Raja Casablanca' },
  { name: 'FUS Rabat', search: 'FUS Rabat' },
  { name: 'RS Berkane', search: 'RS Berkane' },
  { name: 'Hassania Agadir', search: 'Hassania Agadir' },
  // Kenya
  { name: 'Gor Mahia FC', search: 'Gor Mahia' },
  { name: 'AFC Leopards', search: 'AFC Leopards' },
  { name: 'Tusker FC', search: 'Tusker FC' },
  { name: 'Mathare United', search: 'Mathare United' },
  { name: 'Bandari FC', search: 'Bandari FC' },
  { name: 'Sofapaka FC', search: 'Sofapaka' },
  { name: 'KCB FC', search: 'KCB FC' },
  { name: 'Posta Rangers', search: 'Posta Rangers' },
  // Zambia
  { name: 'Zesco United', search: 'ZESCO United' },
  { name: 'Nkana FC', search: 'Nkana FC' },
  { name: 'Power Dynamos', search: 'Power Dynamos' },
  { name: 'Buildcon FC', search: 'Buildcon FC' },
  { name: 'Red Arrows', search: 'Red Arrows FC' },
  { name: 'Zanaco FC', search: 'Zanaco FC' },
  // Ghana
  { name: 'Asante Kotoko SC', search: 'Asante Kotoko' },
  { name: 'Hearts of Oak SC', search: 'Hearts of Oak' },
  { name: 'Medeama SC', search: 'Medeama SC' },
  { name: 'Dreams FC', search: 'Dreams FC' },
  // DR Congo
  { name: 'TP Mazembe', search: 'TP Mazembe' },
  { name: 'AS Vita Club', search: 'AS Vita Club' },
  { name: 'DC Motema Pembe', search: 'DC Motema Pembe' },
  // Zimbabwe
  { name: 'Dynamos FC', search: 'Dynamos FC' },
  { name: 'CAPS United', search: 'CAPS United' },
  { name: 'Highlanders FC', search: 'Highlanders Bulawayo' },
  { name: 'FC Platinum', search: 'FC Platinum' },
  // Angola
  { name: 'Petro de Luanda', search: 'Atletico Petroleos de Luanda' },
  { name: 'Primeiro de Agosto', search: 'Primeiro de Agosto' },
  // Rwanda
  { name: 'APR FC', search: 'APR FC' },
  { name: 'Rayon Sports FC', search: 'Rayon Sports' },
  // Senegal
  { name: 'Jaraaf FC', search: 'ASC Jaraaf' },
  // Malawi
  { name: 'Nyasa Big Bullets', search: 'Big Bullets' },
  { name: 'Be Forward Wanderers', search: 'Wanderers Malawi' },
  // Uganda
  { name: 'Express FC', search: 'Express FC' },
  { name: 'Vipers SC', search: 'Vipers SC' },
];

const existing = JSON.parse(await readFile('scripts/logo-results.json', 'utf8').catch(() => '{}'));
const results = { ...existing };

let found = 0, missing = 0, skipped = 0;

for (const { name, search } of MAJOR) {
  const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.png';
  const path = `public/logos/${filename}`;

  if (results[name] || existsSync(path)) {
    skipped++;
    process.stdout.write(`⊘ ${name}\n`);
    continue;
  }

  await sleep(1500);

  let badge = null;
  try {
    const r = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(search)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0' }
    });
    const d = await r.json();
    badge = d.teams?.[0]?.strBadge || null;
  } catch {}

  if (badge) {
    try {
      const r2 = await fetch(badge, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r2.ok) {
        const buf = await r2.arrayBuffer();
        await writeFile(path, Buffer.from(buf));
        results[name] = `/logos/${filename}`;
        found++;
        console.log(`✓ ${name}`);
      } else { missing++; console.log(`✗ DL ${name}`); }
    } catch { missing++; console.log(`✗ DL ${name}`); }
  } else {
    missing++;
    console.log(`✗ ${name}`);
  }
}

await writeFile('scripts/logo-results.json', JSON.stringify(results, null, 2));
console.log(`\n✓ ${found} new | ⊘ ${skipped} already have | ✗ ${missing} not found`);
console.log('Total with logos:', Object.keys(results).length);

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { pipeline } from 'stream/promises';

const LOGOS_DIR = 'public/logos';
if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });

const ALL_TEAMS = [
  // Uganda
  'Kampala City Council FC','KCCA FC','Vipers SC','Express FC','SC Villa',
  'Police FC','Wakiso Giants','Maroons FC','BUL FC','Mbarara City',
  // Tanzania
  'Simba SC','Young Africans SC','Azam FC','Coastal Union','Biashara United',
  'Singida United','Mtibwa Sugar','Ihefu FC','Mbeya City','Alliance FC',
  // Ethiopia
  'Ethiopian Coffee SC','St. George SC','Fasil Kenema','Adama City FC',
  'Dire Dawa Ketema','Wolaitta Dicha','Jimma AbaJifar','Sebeta Ketema',
  'Hawassa Ketema','Dedebit FC',
  // Ghana
  'Asante Kotoko SC','Hearts of Oak SC','Great Olympics FC','Medeama SC',
  'Aduana Stars','Legon Cities','King Faisal FC','Dreams FC','Bechem United','RTU FC',
  // Kenya
  'Gor Mahia FC','AFC Leopards','Tusker FC','Mathare United','Kakamega Homeboyz',
  'Sofapaka FC','Bandari FC','KCB FC','Western Stima','Posta Rangers',
  // Rwanda
  'APR FC','Rayon Sports FC','AS Kigali','Police FC Rwanda','Espoir FC',
  'Bugesera FC','Gorilla FC','Marines FC','Etincelles FC','Sunrise FC',
  // Zambia
  'Zesco United','Nkana FC','Forest Rangers','Green Eagles','Power Dynamos',
  'Buildcon FC','Lusaka Dynamos','Red Arrows','Zanaco FC','Napsa Stars',
  // Senegal
  'AS Pikine','Jaraaf FC','Generation Foot','Casa Sports','Diambars FC',
  'US Goree','Teungueth FC','ASC Diaraf','Dakar SC','ASC Ngor',
  // Mozambique
  'Costa do Sol','Ferroviario Maputo','Black Bulls','UD do Songo',
  'Ferroviario Beira','Desportivo Maputo','Matchedje FC','Maxaquene FC',
  'Vilankulo FC','Tete FC',
  // Zimbabwe
  'Dynamos FC','CAPS United','Highlanders FC','Triangle United','FC Platinum',
  'Manica Diamonds','Cranborne Bullets','Chicken Inn FC','Bulawayo Chiefs','Herentals FC',
  // Malawi
  'Be Forward Wanderers','Nyasa Big Bullets','Silver Strikers',
  'Mighty Mukuru Wanderers','Blantyre United','Blue Eagles',
  'Kamuzu Barracks','Rumphi United','Karonga United','Total Stars',
  // Angola
  'Petro de Luanda','Primeiro de Agosto','Sagrada Esperanca','Recreativo do Libolo',
  'Interclube FC','Kabuscorp SC',
  // DR Congo
  'TP Mazembe','AS Vita Club','AS Dragons','DC Motema Pembe','CS Don Bosco',
  'Saint-Eloi Lupopo','OC Bukavu Dawa','AS Nyuki','Sanga Balende',
  // Burundi
  'Le Messager Ngozi','Vital-O FC','Athletic Club Gitega','Aigle Noir','Inter Star',
  'Bujumbura City FC',
  // Somalia
  'Elman FC','Horseed FC','Benadir Club','Hargeisa SC','Mogadishu City','Jubba SC',
  // South Sudan
  'Al-Nil FC','Atlabara FC','Kator FC','Juba City',
  // South Africa (RSA)
  'Kaizer Chiefs','Orlando Pirates','Mamelodi Sundowns','SuperSport United',
  'Cape Town City FC','Stellenbosch FC','TS Galaxy','Sekhukhune United',
  'Golden Arrows','Maritzburg United',
  // Egypt (EGY)
  'Al Ahly SC','Zamalek SC','Pyramids FC','Ismaily SC','Future FC',
  'Ceramica Cleopatra','Smouha SC','El Gouna FC',
  // Morocco (MAR)
  'Wydad AC','Raja Casablanca','FUS Rabat','RS Berkane','Hassania Agadir',
  'Moghreb Tetouan','Difaa El Jadidi','Ittihad Tanger',
];

// Alternative names to try if primary fails
const ALT_NAMES = {
  'Young Africans SC': 'Young Africans',
  'Gor Mahia FC': 'Gor Mahia',
  'KCCA FC': 'KCCA',
  'Ethiopian Coffee SC': 'Ethiopian Coffee',
  'Asante Kotoko SC': 'Asante Kotoko',
  'Hearts of Oak SC': 'Hearts of Oak',
  'Generation Foot': 'Generation Foot Senegal',
  'Zesco United': 'ZESCO United',
  'FC Platinum': 'FC Platinum Zimbabwe',
  'Dynamos FC': 'Dynamos Zimbabwe',
  'Petro de Luanda': 'Atletico Petroleos de Luanda',
  'Primeiro de Agosto': 'Primeiro de Agosto Angola',
  'TP Mazembe': 'TP Mazembe Congo',
  'AS Vita Club': 'AS Vita Club Congo',
  'Kaizer Chiefs': 'Kaizer Chiefs FC',
  'Orlando Pirates': 'Orlando Pirates FC',
  'Al Ahly SC': 'Al Ahly',
  'Zamalek SC': 'Zamalek',
  'Wydad AC': 'Wydad Casablanca',
  'Raja Casablanca': 'Raja Club Athletic',
  'Tusker FC': 'Kenya Breweries',
  'Vital-O FC': 'Vital O',
  'Elman FC': 'Elman',
  'Atlabara FC': 'Atlabara',
  'Aigle Noir': 'Aigle Noir Burundi',
  'Cape Town City FC': 'Cape Town City',
  'Golden Arrows': 'Golden Arrows FC',
  'Maritzburg United': 'Maritzburg United FC',
  'Sekhukhune United': 'Sekhukhune United FC',
  'Stellenbosch FC': 'Stellenbosch',
  'TS Galaxy': 'TS Galaxy FC',
};

async function fetchBadge(name) {
  const encoded = encodeURIComponent(name);
  const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encoded}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.teams?.[0]?.strBadge || null;
  } catch { return null; }
}

async function downloadImage(url, filename) {
  const path = `${LOGOS_DIR}/${filename}`;
  if (existsSync(path)) return path;
  try {
    const res = await fetch(url);
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
const notFound = [];

for (const team of ALL_TEAMS) {
  let badgeUrl = await fetchBadge(team);

  // Try alt name
  if (!badgeUrl && ALT_NAMES[team]) {
    badgeUrl = await fetchBadge(ALT_NAMES[team]);
  }

  if (badgeUrl) {
    const filename = toFilename(team);
    const saved = await downloadImage(badgeUrl, filename);
    if (saved) {
      results[team] = `/logos/${filename}`;
      process.stdout.write(`✓ ${team}\n`);
    } else {
      notFound.push(team);
      process.stdout.write(`✗ DL_FAIL: ${team}\n`);
    }
  } else {
    notFound.push(team);
    process.stdout.write(`✗ NOT_FOUND: ${team}\n`);
  }

  // Small delay to avoid rate limiting
  await new Promise(r => setTimeout(r, 150));
}

console.log('\n=== SUMMARY ===');
console.log(`Found: ${Object.keys(results).length}/${ALL_TEAMS.length}`);
console.log('Not found:', notFound.join(', '));

// Write results map
await writeFile('scripts/logo-results.json', JSON.stringify(results, null, 2));
console.log('\nResults saved to scripts/logo-results.json');

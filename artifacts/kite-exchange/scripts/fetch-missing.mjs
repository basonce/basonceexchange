import { existsSync, writeFileSync, readdirSync, statSync } from 'fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const WP = { 'User-Agent': 'Wikipedia/1.0 (https://en.wikipedia.org/; logos@app.org)', 'Accept': '*/*' };
const MOZ = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'image/webp,image/png,image/*,*/*' };

async function wpGet(title, file) {
  const path = 'public/logos/' + file + '.png';
  if (existsSync(path) && statSync(path).size > 800) return 'exists';
  await sleep(700);
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=300&format=json&formatversion=2`;
  const r = await fetch(url, { headers: WP });
  const d = await r.json();
  const pg = d.query?.pages?.[0];
  const src = pg?.thumbnail?.source;
  if (!src) return null;
  await sleep(400);
  const ir = await fetch(src, { headers: WP });
  const buf = Buffer.from(await ir.arrayBuffer());
  const h = buf.slice(0, 4).toString('hex');
  const ok = h.startsWith('89504e47') || h.startsWith('ffd8ff') || h === '52494646';
  if (!ok || buf.length < 500) return null;
  writeFileSync(path, buf);
  return buf.length + 'b';
}

async function dlUrl(imgUrl, file) {
  const path = 'public/logos/' + file + '.png';
  if (existsSync(path) && statSync(path).size > 800) return 'exists';
  await sleep(500);
  const r = await fetch(imgUrl, { headers: MOZ });
  const buf = Buffer.from(await r.arrayBuffer());
  const h = buf.slice(0, 4).toString('hex');
  const ok = h.startsWith('89504e47') || h.startsWith('ffd8ff') || h === '52494646' || h.startsWith('47494638');
  if (!ok || buf.length < 500) return null;
  writeFileSync(path, buf);
  return buf.length + 'b';
}

async function fetchWikiPage(title, file) {
  // First try Wikipedia thumbnail
  const r1 = await wpGet(title, file);
  if (r1 && r1 !== null) return r1;
  // Then try Wikimedia Commons via Wikipedia API
  await sleep(400);
  const url2 = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=original&format=json&formatversion=2`;
  const r = await fetch(url2, { headers: WP });
  const d = await r.json();
  const pg = d.query?.pages?.[0];
  const src = pg?.original?.source;
  if (!src) return null;
  await sleep(400);
  const ir = await fetch(src, { headers: WP });
  const buf = Buffer.from(await ir.arrayBuffer());
  const h = buf.slice(0, 4).toString('hex');
  const ok = h.startsWith('89504e47') || h.startsWith('ffd8ff') || h === '52494646';
  const path = 'public/logos/' + file + '.png';
  if (!ok || buf.length < 500) return null;
  writeFileSync(path, buf);
  return buf.length + 'b (original)';
}

// Direct image URLs gathered from manual research
const directUrls = [
  // Future FC - thesportsdb direct
  ['future_fc', 'https://www.thesportsdb.com/images/media/team/badge/future-fc-egypt.png'],
  // National Bank of Egypt - football-logos.cc
  ['national_bank_of_egypt', 'https://football-logos.cc/wp-content/uploads/2022/05/national-bank-of-egypt-fc-logo.png'],
  // Be Forward Wanderers official site image
  ['be_forward_wanderers', 'https://beforwardwanderers.com/wp-content/uploads/2020/03/bfw-logo.png'],
  // Blue Eagles FC Malawi - direct
  ['blue_eagles', 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Blue_Eagles_FC_Logo.png/200px-Blue_Eagles_FC_Logo.png'],
  // Blantyre United
  ['blantyre_united', 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Blantyre_United_FC.png/200px-Blantyre_United_FC.png'],
  // Total Stars Malawi
  ['total_stars', 'https://upload.wikimedia.org/wikipedia/en/thumb/9/96/Total_Stars_FC_logo.png/200px-Total_Stars_FC_logo.png'],
  // 1 de Maio Angola
  ['1_de_maio', 'https://upload.wikimedia.org/wikipedia/en/thumb/6/68/1_de_Maio_logo.png/200px-1_de_Maio_logo.png'],
  // BUL FC Uganda
  ['bul_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/5/51/BUL_FC_Uganda.png/200px-BUL_FC_Uganda.png'],
  // Ihefu FC
  ['ihefu_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Ihefu_FC.png/200px-Ihefu_FC.png'],
  // Alliance FC Tanzania
  ['alliance_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/Alliance_FC_Tanzania.png/200px-Alliance_FC_Tanzania.png'],
  // Dire Dawa Ketema
  ['dire_dawa_ketema', 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2e/Dire_Dawa_City_SC.png/200px-Dire_Dawa_City_SC.png'],
  // Jimma AbaJifar
  ['jimma_abajifar', 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/Jimma_AbaJifar_FC.png/200px-Jimma_AbaJifar_FC.png'],
  // Espoir FC Rwanda
  ['espoir_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Espoir_FC_Rwanda.png/200px-Espoir_FC_Rwanda.png'],
  // Sunrise FC Rwanda
  ['sunrise_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a3/Sunrise_FC_Rwanda.png/200px-Sunrise_FC_Rwanda.png'],
  // Gorilla FC
  ['gorilla_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/c/ca/Gorilla_FC_Rwanda.png/200px-Gorilla_FC_Rwanda.png'],
  // Marines FC Rwanda
  ['marines_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9f/Marines_FC_Rwanda.png/200px-Marines_FC_Rwanda.png'],
  // Tete FC Mozambique
  ['tete_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/7/76/Tete_FC_Mozambique.png/200px-Tete_FC_Mozambique.png'],
  // CS Don Bosco
  ['cs_don_bosco', 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5f/CS_Don_Bosco.png/200px-CS_Don_Bosco.png'],
  // OC Bukavu Dawa
  ['oc_bukavu_dawa', 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6e/OC_Bukavu_Dawa.png/200px-OC_Bukavu_Dawa.png'],
  // Athletic Club Gitega
  ['athletic_club_gitega', 'https://upload.wikimedia.org/wikipedia/en/thumb/9/92/Athletic_Club_Gitega.png/200px-Athletic_Club_Gitega.png'],
  // Prince Louis
  ['prince_louis', 'https://upload.wikimedia.org/wikipedia/en/thumb/c/ce/Prince_Louis_FC_Burundi.png/200px-Prince_Louis_FC_Burundi.png'],
  // KAC Kiremba
  ['kac_kiremba', 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/KAC_Kiremba.png/200px-KAC_Kiremba.png'],
  // LLB Athletic
  ['llb_athletic', 'https://upload.wikimedia.org/wikipedia/en/thumb/4/43/LLB_Athletic_Club_Bujumbura.png/200px-LLB_Athletic_Club_Bujumbura.png'],
  // AS Nyuki
  ['as_nyuki', 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1c/AS_Nyuki_DRC.png/200px-AS_Nyuki_DRC.png'],
  // AS Dragons DR Congo
  ['as_dragons', 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/AS_Dragons_DRC.png/200px-AS_Dragons_DRC.png'],
  // Costa do Sol
  ['costa_do_sol', 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/CD_Costa_do_Sol_logo.png/200px-CD_Costa_do_Sol_logo.png'],
  // Black Bulls Mozambique
  ['black_bulls', 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bc/Associacao_Black_Bulls_logo.png/200px-Associacao_Black_Bulls_logo.png'],
  // Wiliete
  ['wiliete_fc', 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/Wiliete_SC_logo.png/200px-Wiliete_SC_logo.png'],
  // Renaissance Berkane
  ['renaissance_berkane', 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7e/RS_Berkane_logo.png/200px-RS_Berkane_logo.png'],
];

// Wikipedia page lookups (known page titles)
const wpTargets = [
  ['Express FC', 'express_fc'],
  ['RS Berkane', 'renaissance_berkane'],
  ['Dire Dawa City S.C.', 'dire_dawa_ketema'],
  ['Jimma Aba Jifar F.C.', 'jimma_abajifar'],
  ['Gorilla F.C. (Rwanda)', 'gorilla_fc'],
  ['Marines F.C.', 'marines_fc'],
  ['Espoir F.C. (Rwanda)', 'espoir_fc'],
  ['CD Costa do Sol', 'costa_do_sol'],
  ['Associação Black Bulls', 'black_bulls'],
  ['Blue Eagles FC', 'blue_eagles'],
  ['Wiliete S.C.', 'wiliete_fc'],
  ['CS Don Bosco', 'cs_don_bosco'],
  ['OC Bukavu Dawa', 'oc_bukavu_dawa'],
  ['AS Inter Star', 'inter_star'],
  ['National Bank of Egypt SC', 'national_bank_of_egypt'],
  ['Future FC (Egypt)', 'future_fc'],
  ['BUL FC', 'bul_fc'],
  ['Be Forward Wanderers FC', 'be_forward_wanderers'],
  ['Blantyre United FC', 'blantyre_united'],
  ['Total Stars FC', 'total_stars'],
  ['1.º de Maio (Angolan football club)', '1_de_maio'],
  ['Sunrise FC (Rwanda)', 'sunrise_fc'],
  ['Ihefu FC', 'ihefu_fc'],
  ['Alliance FC (Tanzania)', 'alliance_fc'],
  ['Athletic Club Gitega', 'athletic_club_gitega'],
  ['AS Nyuki', 'as_nyuki'],
  ['AS Dragons (DR Congo)', 'as_dragons'],
];

let found = 0;
console.log('=== Phase 1: Wikipedia API ===');
for (const [title, file] of wpTargets) {
  const r = await fetchWikiPage(title, file);
  if (r === 'exists') continue;
  if (r) { console.log('✓ WP:', title, r); found++; }
  else console.log('✗ WP:', title);
}

console.log('\n=== Phase 2: Direct URLs (fallback) ===');
for (const [file, url] of directUrls) {
  const r = await dlUrl(url, file);
  if (r === 'exists') continue;
  if (r) { console.log('✓ URL:', file, r); found++; }
}

console.log('\n✓ New logos added:', found);
console.log('Total files:', readdirSync('public/logos').filter(f => !f.startsWith('.')).length);

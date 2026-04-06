/* ─────────────────────────────────────────────────────────
   African Sports Data — 28 leagues · 200+ teams · 700+ unique matchups
   Same matchup can't repeat for 10 hours (localStorage timestamp guard)
──────────────────────────────────────────────────────────── */

export interface League {
  id: string;
  name: string;
  country: string;
  flag: string;
  color: string;
}

export interface Team {
  name: string;
  abbr: string;
  color: string;
  alt?: string;
  logoUrl?: string;
}

export interface MatchTemplate {
  leagueId: string;
  homeTeam: Team;
  awayTeam: Team;
}

/* Verified logo URLs from TheSportsDB CDN — HTTP 200 confirmed */
const DB = 'https://r2.thesportsdb.com/images/media/team/badge/';
export const TEAM_LOGOS: Record<string, string> = {
  // Tanzania
  'Simba SC':           DB + '9y8t6g1673938603.png',
  'Young Africans SC':  DB + '50evgz1673938693.png',
  // Kenya
  'Gor Mahia FC':       DB + '8hqogn1583765598.png',
  'AFC Leopards':       DB + '4taj3p1583767536.png',
  // Ghana
  'Asante Kotoko SC':   DB + 'u1mppc1578401554.png',
  'Hearts of Oak SC':   DB + 'v3eyvw1617287212.png',
  // DR Congo
  'TP Mazembe':         DB + 'niib4k1761259428.png',
  // Zambia
  'Zesco United':       DB + 'poicn31721323924.png',
  // Egypt
  'Al Ahly SC':         DB + 'x8753q1751421890.png',
  'Zamalek SC':         DB + 'tgekj81580930027.png',
  // South Africa
  'Kaizer Chiefs':      DB + 'akwtlr1583614121.png',
  'Orlando Pirates':    DB + 'y6dbv61583616330.png',
  'Mamelodi Sundowns':  DB + 'uswgw01642709783.png',
  'SuperSport United':  DB + 'abtgn31754525186.png',
  // Morocco
  'Wydad AC':           DB + 'vio4271750784379.png',
  'Raja Casablanca':    DB + '1cg64m1551428003.png',
};

// ── 28 African Leagues ─────────────────────────────────────
export const LEAGUES: League[] = [
  { id: 'UGA', name: 'Uganda Premier League', country: 'Uganda', flag: '🇺🇬', color: '#000000' },
  { id: 'TAN', name: 'Tanzania Ligi Kuu', country: 'Tanzania', flag: '🇹🇿', color: '#1d9bf0' },
  { id: 'ETH', name: 'Ethiopian Premier League', country: 'Ethiopia', flag: '🇪🇹', color: '#078930' },
  { id: 'GHA', name: 'Ghana Premier League', country: 'Ghana', flag: '🇬🇭', color: '#006b3f' },
  { id: 'KEN', name: 'Kenya Premier League', country: 'Kenya', flag: '🇰🇪', color: '#006600' },
  { id: 'RWA', name: 'Rwanda National League', country: 'Rwanda', flag: '🇷🇼', color: '#20603d' },
  { id: 'ZAM', name: 'Zambia Super League', country: 'Zambia', flag: '🇿🇲', color: '#198a00' },
  { id: 'SEN', name: 'Senegal Ligue 1', country: 'Senegal', flag: '🇸🇳', color: '#00853f' },
  { id: 'MOZ', name: 'Mozambique Liga Moçambicana', country: 'Mozambique', flag: '🇲🇿', color: '#009a44' },
  { id: 'ZIM', name: 'Zimbabwe Premier Soccer League', country: 'Zimbabwe', flag: '🇿🇼', color: '#006400' },
  { id: 'MAL', name: 'Malawi Super League', country: 'Malawi', flag: '🇲🇼', color: '#000080' },
  { id: 'ANG', name: 'Angola Girabola', country: 'Angola', flag: '🇦🇴', color: '#cc0000' },
  { id: 'COD', name: 'DR Congo Linafoot', country: 'DR Congo', flag: '🇨🇩', color: '#007fff' },
  { id: 'ZAN', name: 'Zanzibar Football Federation', country: 'Zanzibar', flag: '🌊', color: '#0033cc' },
  { id: 'BUR', name: 'Burundi Primus League', country: 'Burundi', flag: '🇧🇮', color: '#ce1126' },
  { id: 'SOM', name: 'Somalia Premier League', country: 'Somalia', flag: '🇸🇴', color: '#4189dd' },
  { id: 'SSD', name: 'South Sudan League', country: 'South Sudan', flag: '🇸🇸', color: '#078930' },
  { id: 'ERI', name: 'Eritrea National League', country: 'Eritrea', flag: '🇪🇷', color: '#4189dd' },
  { id: 'DJI', name: 'Djibouti Premier League', country: 'Djibouti', flag: '🇩🇯', color: '#6ab2e7' },
  { id: 'COM', name: 'Comoros Super Coupe', country: 'Comoros', flag: '🇰🇲', color: '#3a75c4' },
  { id: 'SWZ', name: 'Eswatini Premier League', country: 'Eswatini', flag: '🇸🇿', color: '#3e5eb9' },
  { id: 'LSO', name: 'Lesotho Premier League', country: 'Lesotho', flag: '🇱🇸', color: '#009543' },
  { id: 'MAU', name: 'Mauritius League', country: 'Mauritius', flag: '🇲🇺', color: '#ea2839' },
  { id: 'SEY', name: 'Seychelles League', country: 'Seychelles', flag: '🇸🇨', color: '#003f87' },
  { id: 'CAF', name: 'CECAFA Club Championship', country: 'East Africa', flag: '🌍', color: '#f0b90b' },
  { id: 'COF', name: 'COSAFA Cup Qualifying', country: 'Southern Africa', flag: '🌍', color: '#ff6600' },
  { id: 'WAF', name: 'WAFU-B Zone League', country: 'West Africa', flag: '🌍', color: '#9b59b6' },
  { id: 'EAF', name: 'East Africa Community League', country: 'East Africa', flag: '🌍', color: '#e74c3c' },
  { id: 'RSA', name: 'South Africa Premier Soccer League', country: 'South Africa', flag: '🇿🇦', color: '#007a4d' },
  { id: 'EGY', name: 'Egyptian Premier League', country: 'Egypt', flag: '🇪🇬', color: '#c8102e' },
  { id: 'MAR', name: 'Morocco Botola Pro', country: 'Morocco', flag: '🇲🇦', color: '#c1272d' },
];

const COLORS = ['#1a56db','#e02424','#057a55','#9f1239','#7e3af2','#d97706','#0e9f6e','#be185d','#0284c7','#4f46e5','#dc2626','#16a34a','#7c3aed','#c2410c','#0891b2','#0d9488','#9333ea','#db2777','#65a30d','#ca8a04'];

// ── Teams by league ─────────────────────────────────────────
const RAW_TEAMS: Record<string, [string, string][]> = {
  UGA: [['Kampala City Council FC','KCC'],['KCCA FC','KCCA'],['Vipers SC','VIP'],['Express FC','EXP'],['SC Villa','VIL'],['Police FC','POL'],['Wakiso Giants','WAK'],['Maroons FC','MAR'],['BUL FC','BUL'],['Mbarara City','MBA']],
  TAN: [['Simba SC','SIM'],['Young Africans SC','YNG'],['Azam FC','AZA'],['Coastal Union','CST'],['Biashara United','BIA'],['Singida United','SIN'],['Mtibwa Sugar','MTI'],['Ihefu FC','IHE'],['Mbeya City','MBY'],['Alliance FC','ALL']],
  ETH: [['Ethiopian Coffee SC','ECF'],['St. George SC','STG'],['Fasil Kenema','FAS'],['Adama City FC','ADM'],['Dire Dawa Ketema','DDK'],['Wolaitta Dicha','WOL'],['Jimma AbaJifar','JIM'],['Sebeta Ketema','SEB'],['Hawassa Ketema','HAW'],['Dedebit FC','DED']],
  GHA: [['Asante Kotoko SC','KOT'],['Hearts of Oak SC','HOA'],['Great Olympics FC','OLY'],['Medeama SC','MED'],['Aduana Stars','ADU'],['Legon Cities','LGN'],['King Faisal FC','KNF'],['Dreams FC','DRM'],['Bechem United','BEC'],['RTU FC','RTU']],
  KEN: [['Gor Mahia FC','GOR'],['AFC Leopards','LEP'],['Tusker FC','TUS'],['Mathare United','MAT'],['Kakamega Homeboyz','KAK'],['Sofapaka FC','SOF'],['Bandari FC','BAN'],['KCB FC','KCB'],['Western Stima','WST'],['Posta Rangers','POS']],
  RWA: [['APR FC','APR'],['Rayon Sports FC','RAY'],['AS Kigali','ASK'],['Police FC Rwanda','POR'],['Espoir FC','ESP'],['Bugesera FC','BUG'],['Gorilla FC','GRL'],['Marines FC','MRN'],['Etincelles FC','ETI'],['Sunrise FC','SRS']],
  ZAM: [['Zesco United','ZES'],['Nkana FC','NKN'],['Forest Rangers','FOR'],['Green Eagles','GRE'],['Power Dynamos','POW'],['Buildcon FC','BLD'],['Lusaka Dynamos','LDA'],['Red Arrows','RDA'],['Zanaco FC','ZAN'],['Napsa Stars','NAP']],
  SEN: [['AS Pikine','PIK'],['Jaraaf FC','JAR'],['Génération Foot','GEN'],['Casa Sports','CAS'],['Diambars FC','DIA'],['US Gorée','GOR'],['Teungueth FC','TEU'],['ASC Diaraf','DRF'],['Dakar SC','DAK'],['ASC Ngor','NGR']],
  MOZ: [['Costa do Sol','COS'],['Ferroviário Maputo','FER'],['Black Bulls','BLK'],['UD do Songo','SON'],['Ferroviário Beira','FEB'],['Desportivo Maputo','DSP'],['Matchedje FC','MTC'],['Maxaquene FC','MAX'],['Vilankulo FC','VLK'],['Tete FC','TET']],
  ZIM: [['Dynamos FC','DYN'],['CAPS United','CAP'],['Highlanders FC','HIG'],['Triangle United','TRI'],['FC Platinum','PLT'],['Manica Diamonds','MAN'],['Cranborne Bullets','CRN'],['Chicken Inn FC','CHK'],['Bulawayo Chiefs','BUL'],['Herentals FC','HER']],
  MAL: [['Be Forward Wanderers','WAN'],['Nyasa Big Bullets','BIG'],['Silver Strikers','SIL'],['Mighty Mukuru Wanderers','MMW'],['Blantyre United','BLU'],['Blue Eagles','BEG'],['Kamuzu Barracks','KAB'],['Rumphi United','RUM'],['Karonga United','KAR'],['Total Stars','TTS']],
  ANG: [['Petro de Luanda','PET'],['Primeiro de Agosto','AGO'],['Sagrada Esperança','SAG'],['Recreativo do Libolo','REC'],['Interclube FC','INT'],['1º de Maio','MAI'],['Santa Rita de Cássia','SRC'],['Desportivo da Huíla','HUI'],['Kabuscorp SC','KAB'],['Wiliete FC','WIL']],
  COD: [['TP Mazembe','TPM'],['AS Vita Club','VIT'],['AS Dragons','DRG'],['DC Motema Pembe','MTP'],['CS Don Bosco','DON'],['Saint-Eloi Lupopo','LUP'],['OC Bukavu Dawa','OCD'],['AS Nyuki','NYK'],['Sanga Balende','SNG'],['Renaissance du Congo','REN']],
  ZAN: [['Mtendaji FC','MTD'],['Azam Zanzibar','AZZ'],['Manga Stars','MGA'],['Malindi Sporty','MLN'],['Pemba FC','PMB'],['Stone Town SC','STN'],['Jambiani FC','JAM'],['Fumba United','FMB'],['Micheweni FC','MCH'],['Tumbatu SC','TMB']],
  BUR: [['Le Messager Ngozi','MNG'],['Vital-O FC','VTO'],['Athletic Club Gitega','ACG'],['Aigle Noir','AGL'],['Inter Star','INS'],['Prince Louis','PRL'],['Bujumbura City FC','BCF'],['Flambeau du Centre','FLC'],['KAC Kiremba','KAK'],['LLB Athletic','LLB']],
  SOM: [['Elman FC','ELM'],['Horseed FC','HRS'],['Benadir Club','BND'],['Hargeisa SC','HRG'],['Mogadishu City','MGD'],['Jubba SC','JUB'],['Galbeedi FC','GLB'],['Somali Heroes','SHR'],['Port FC','PRT'],['National Security FC','NSF']],
  SSD: [['Al-Nil FC','ANL'],['Atlabara FC','ATL'],['Kator FC','KTR'],['New Site United','NSU'],['Abyei Stars','ABS'],['Gondokoro FC','GON'],['Nimule United','NIU'],['Juba City','JBA'],['Wau FC','WAU'],['Rumbek FC','RMB']],
  ERI: [['Adulis FC','ADU'],['Hintset SC','HNT'],['Weyzero Sihul FC','WSH'],['Red Sea FC','RDS'],['Asmara United','ASU'],['Keren City','KER'],['Massawa FC','MSW'],['Dekemhare SC','DEK'],['Mendefera Stars','MDS'],['Denden FC','DND']],
  DJI: [['AS Arta Solar 7','ART'],['Gendarmerie Nationale','GEN'],['Djibouti Telecom FC','DTF'],['Port FC','PRT'],['AS Ali Sabieh','ALI'],['Dikhil SC','DIK'],['Tadjourah FC','TAD'],['Obock United','OBK'],['AS Balbala','BAL'],['AS Centre','CEN']],
  COM: [['Fomboni SC','FOM'],['AS Bandrani','BND'],['Volcan Club','VCL'],['AS Ngwena','NGW'],['Étoile du Matin','ETM'],['AS Domoni','DOM'],['Coin-Nord United','CNU'],['Foumbouni SC','FOU'],['Mwali Stars','MWL'],['Ngazidja FC','NGZ']],
  SWZ: [['Mbabane Highlanders','MBH'],['Eleven Men in Flight','EMF'],['Mbabane Swallows','MBS'],['Manzini Wanderers','MWN'],['Manzini Sea Birds','MSB'],['Young Buffaloes','YNB'],['Malkerns United','MLK'],['Royal Leopards','RLP'],['Green Mamba FC','GRM'],['Sithobela FC','STB']],
  LSO: [['Bantu FC','BAN'],['Likhopo FC','LIK'],['Matlama FC','MTL'],['LCS FC','LCS'],['Linare FC','LIN'],['Arsenal Maseru','ARM'],['Kick4Life FC','K4L'],['Lesotho Correctional Service','LCR'],['Lifofane FC','LFF'],['Thoteng FC','THT']],
  MAU: [['Pamplemousses SC','PAM'],['AS Port-Louis 2000','POL'],['Cercle de Joachim','CJO'],['AS Rivière du Rempart','RRP'],['Chamarel SC','CHM'],['Club M','CLM'],['Petite Rivière Noire','PRN'],['Mahebourg FC','MAH'],['La Cure Sylvester','LCS'],['AS Plaisance','PLA']],
  SEY: [['St. Michel United','STM'],['La Passe','LAP'],['Beau Vallon Bay FC','BVB'],['Red Star','RDS'],['Cote dOr FC','CDO'],['Anse Reunion','ANR'],['Foresters','FOR'],['North East Lions','NEL'],['Praslin FC','PRS'],['Anse Boileau FC','ANB']],
  CAF: [['Kampala All Stars','KAS'],['Dar All Stars','DAS'],['Nairobi Select','NAS'],['Addis Select','ADS'],['Kigali Elite','KGE'],['Lusaka United','LSU'],['Harare Select','HAS'],['Accra All Stars','ACA'],['Lagos Select','LGS'],['Dakar Elite','DKE']],
  COF: [['Southern Stars','SST'],['Cape All Stars','CAS'],['Windhoek United','WNU'],['Maputo Select','MPS'],['Harare Rovers','HRV'],['Lusaka Rangers','LSR'],['Gaborone FC','GBR'],['Blantyre Elite','BLE'],['Mbabane Select','MBS'],['Victoria Falls','VCF']],
  WAF: [['Dakar Warriors','DKW'],['Abidjan Select','ABS'],['Accra Warriors','ACW'],['Lagos City','LGC'],['Bamako Stars','BMS'],['Conakry Elite','CNE'],['Ouagadougou FC','OGD'],['Niamey Select','NMS'],['Lomé Warriors','LMW'],['Cotonou Elite','CNT']],
  EAF: [['Nairobi City Stars','NCS'],['Dar City','DAC'],['Kampala Lions','KPL'],['Kigali City','KGC'],['Bujumbura United','BJU'],['Juba Lions','JBL'],['Asmara City','ASC'],['Djibouti City','DJC'],['Mogadishu Stars','MGS'],['Hargeisa United','HGU']],
  RSA: [['Kaizer Chiefs','KCH'],['Orlando Pirates','ORL'],['Mamelodi Sundowns','SUN'],['SuperSport United','SSU'],['Cape Town City FC','CTC'],['Stellenbosch FC','STB'],['TS Galaxy','TSG'],['Sekhukhune United','SEK'],['Golden Arrows','GDA'],['Maritzburg United','MRZ']],
  EGY: [['Al Ahly SC','AHL'],['Zamalek SC','ZAM'],['Pyramids FC','PYR'],['Ismaily SC','ISM'],['Future FC','FUT'],['Ceramica Cleopatra','CER'],['Smouha SC','SMH'],['National Bank of Egypt','NBE'],['El Entag El Harby','ENT'],['El Gouna FC','GON']],
  MAR: [['Wydad AC','WAC'],['Raja Casablanca','RAJ'],['FUS Rabat','FUS'],['RS Berkane','RSB'],['Mouloudia Oujda','MOU'],['Hassania Agadir','HAS'],['Renaissance Berkane','RNB'],['Moghreb Tetouan','MOG'],['Difaa El Jadidi','DEJ'],['Ittihad Tanger','ITT']],
};

// ── Build team objects ──────────────────────────────────────
function buildTeam(name: string, abbr: string, idx: number): Team {
  return { name, abbr, color: COLORS[idx % COLORS.length], logoUrl: TEAM_LOGOS[name] };
}

const LEAGUE_TEAMS: Record<string, Team[]> = {};
Object.entries(RAW_TEAMS).forEach(([lid, raw]) => {
  LEAGUE_TEAMS[lid] = raw.map(([name, abbr], idx) => buildTeam(name, abbr, idx));
});

// ── Build all matchup templates (700+) ─────────────────────
export const ALL_MATCHUPS: MatchTemplate[] = [];
LEAGUES.forEach(league => {
  const teams = LEAGUE_TEAMS[league.id] || [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      ALL_MATCHUPS.push({ leagueId: league.id, homeTeam: teams[i], awayTeam: teams[j] });
    }
  }
});

// ── Fisher-Yates shuffle ────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── localStorage keys ───────────────────────────────────────
const LS_KEY = 'bsports_played_matches';
const COOLDOWN_MS = 10 * 60 * 60 * 1000; // 10 hours

function getPlayedMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch { return {}; }
}

function markPlayed(key: string) {
  const map = getPlayedMap();
  map[key] = Date.now();
  // Prune old entries
  const now = Date.now();
  Object.keys(map).forEach(k => { if (now - map[k] > COOLDOWN_MS) delete map[k]; });
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

export function isOnCooldown(key: string): boolean {
  const map = getPlayedMap();
  if (!map[key]) return false;
  return Date.now() - map[key] < COOLDOWN_MS;
}

function matchKey(t: MatchTemplate): string {
  return `${t.leagueId}_${t.homeTeam.abbr}_${t.awayTeam.abbr}`;
}

// ── Pick N fresh matchups ───────────────────────────────────
export function pickFreshMatchups(n: number): MatchTemplate[] {
  const shuffled = shuffle(ALL_MATCHUPS);
  const fresh = shuffled.filter(t => !isOnCooldown(matchKey(t)));
  const picked = fresh.slice(0, n);
  // If not enough fresh, fill with least-recently-played
  if (picked.length < n) {
    const map = getPlayedMap();
    const stale = shuffled.filter(t => isOnCooldown(matchKey(t)))
      .sort((a, b) => (map[matchKey(a)] || 0) - (map[matchKey(b)] || 0));
    picked.push(...stale.slice(0, n - picked.length));
  }
  picked.forEach(t => markPlayed(matchKey(t)));
  return picked.slice(0, n);
}

export function getLeague(id: string): League | undefined {
  return LEAGUES.find(l => l.id === id);
}

export function ri(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function rf(min: number, max: number, dp = 2) { return +(Math.random() * (max - min) + min).toFixed(dp); }

/* ─────────────────────────────────────────────────────────
   African Sports Data — 20 leagues · 200 teams · 800+ matchups
   All leagues feature real African clubs from active competitions.
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

/* ── Local logo files downloaded from TheSportsDB ─────── */
export const TEAM_LOGOS: Record<string, string> = {
  // Nigeria NPFL — all 10 with logos
  'Rivers United':         '/logos/rivers_united.png',
  'Plateau United':        '/logos/plateau_united.png',
  'Kano Pillars':          '/logos/kano_pillars.png',
  'Shooting Stars':        '/logos/shooting_stars.png',
  'Lobi Stars':            '/logos/lobi_stars.png',
  'Remo Stars':            '/logos/remo_stars.png',
  'Sunshine Stars':        '/logos/sunshine_stars.png',
  'Akwa United':           '/logos/akwa_united.png',
  'Rangers International': '/logos/rangers_international.png',
  'Nasarawa United':       '/logos/nasarawa_united.png',
  // Tunisia Ligue Pro — all 10 with logos
  'Espérance de Tunis':    '/logos/esperance_de_tunis.png',
  'Club Africain':         '/logos/club_africain.png',
  'CS Sfaxien':            '/logos/cs_sfaxien.png',
  'US Monastir':           '/logos/us_monastir.png',
  'Étoile du Sahel':       '/logos/etoile_du_sahel.png',
  'Stade Tunisien':        '/logos/stade_tunisien.png',
  'Olympique Béja':        '/logos/olympique_beja.png',
  'AS Gabès':              '/logos/as_gabes.png',
  'JS Kairouan':           '/logos/js_kairouan.png',
  'AS Marsa':              '/logos/as_marsa.png',
  // Algeria Ligue Pro — all 10 with logos
  'CR Belouizdad':         '/logos/cr_belouizdad.png',
  'USM Alger':             '/logos/usm_alger.png',
  'MC Alger':              '/logos/mc_alger.png',
  'JS Kabylie':            '/logos/js_kabylie.png',
  'ES Sétif':              '/logos/es_setif.png',
  'MC Oran':               '/logos/mc_oran.png',
  'CS Constantine':        '/logos/cs_constantine.png',
  'Paradou AC':            '/logos/paradou_ac.png',
  'ASO Chlef':             '/logos/aso_chlef.png',
  'USM Bel-Abbès':         '/logos/usm_bel_abbes.png',
  // South Africa
  'Kaizer Chiefs':         '/logos/kaizer_chiefs.png',
  'Orlando Pirates':       '/logos/orlando_pirates.png',
  'Mamelodi Sundowns':     '/logos/mamelodi_sundowns.png',
  'SuperSport United':     '/logos/supersport_united.png',
  'Cape Town City FC':     '/logos/cape_town_city_fc.png',
  'Maritzburg United':     '/logos/maritzburg_united.png',
  'Sekhukhune United':     '/logos/sekhukhune_united.png',
  'TS Galaxy':             '/logos/ts_galaxy.png',
  // Egypt
  'Al Ahly SC':            '/logos/al_ahly_sc.png',
  'Zamalek SC':            '/logos/zamalek_sc.png',
  'El Gouna FC':           '/logos/el_gouna_fc.png',
  'Ceramica Cleopatra':    '/logos/ceramica_cleopatra.png',
  // Morocco
  'Wydad AC':              '/logos/wydad_ac.png',
  'Raja Casablanca':       '/logos/raja_casablanca.png',
  'FUS Rabat':             '/logos/fus_rabat.png',
  'RS Berkane':            '/logos/rs_berkane.png',
  'Hassania Agadir':       '/logos/hassania_agadir.png',
  'Mouloudia Oujda':       '/logos/mouloudia_oujda.png',
  'Moghreb Tetouan':       '/logos/moghreb_tetouan.png',
  // Ghana
  'Asante Kotoko SC':      '/logos/asante_kotoko_sc.png',
  'Hearts of Oak SC':      '/logos/hearts_of_oak_sc.png',
  'Great Olympics FC':     '/logos/great_olympics_fc.png',
  'Aduana Stars':          '/logos/aduana_stars.png',
  'Legon Cities':          '/logos/legon_cities.png',
  'Dreams FC':             '/logos/dreams_fc.png',
  'Bechem United':         '/logos/bechem_united.png',
  // Kenya
  'Gor Mahia FC':          '/logos/gor_mahia_fc.png',
  'AFC Leopards':          '/logos/afc_leopards.png',
  'Mathare United':        '/logos/mathare_united.png',
  'Sofapaka FC':           '/logos/sofapaka_fc.png',
  'Western Stima':         '/logos/western_stima.png',
  'Posta Rangers':         '/logos/posta_rangers.png',
  // Uganda
  'KCCA FC':               '/logos/kcca_fc.png',
  'SC Villa':              '/logos/sc_villa.png',
  'Wakiso Giants':         '/logos/wakiso_giants.png',
  'Mbarara City':          '/logos/mbarara_city.png',
  // Tanzania
  'Simba SC':              '/logos/simba_sc.png',
  'Young Africans SC':     '/logos/young_africans_sc.png',
  'Coastal Union':         '/logos/coastal_union.png',
  'Biashara United':       '/logos/biashara_united.png',
  // Ethiopia
  'Fasil Kenema':          '/logos/fasil_kenema.png',
  'Wolaitta Dicha':        '/logos/wolaitta_dicha.png',
  'Sebeta Ketema':         '/logos/sebeta_ketema.png',
  // Rwanda
  'Rayon Sports FC':       '/logos/rayon_sports_fc.png',
  // Zambia
  'Zesco United':          '/logos/zesco_united.png',
  'Power Dynamos':         '/logos/power_dynamos.png',
  'Lusaka Dynamos':        '/logos/lusaka_dynamos.png',
  'Napsa Stars':           '/logos/napsa_stars.png',
  // Zimbabwe
  'CAPS United':           '/logos/caps_united.png',
  'Triangle United':       '/logos/triangle_united.png',
  // Malawi
  'Nyasa Big Bullets':     '/logos/nyasa_big_bullets.png',
  // Angola
  'Petro de Luanda':       '/logos/petro_de_luanda.png',
  // DR Congo
  'TP Mazembe':            '/logos/tp_mazembe.png',
  'AS Vita Club':          '/logos/as_vita_club.png',
};

// ── 20 African Leagues (all real, active competitions) ───
export const LEAGUES: League[] = [
  { id: 'RSA', name: 'South Africa Premier Soccer League', country: 'South Africa',  flag: '🇿🇦', color: '#007a4d' },
  { id: 'EGY', name: 'Egyptian Premier League',            country: 'Egypt',          flag: '🇪🇬', color: '#c8102e' },
  { id: 'MAR', name: 'Morocco Botola Pro',                  country: 'Morocco',        flag: '🇲🇦', color: '#c1272d' },
  { id: 'NGA', name: 'Nigeria Professional Football League',country: 'Nigeria',        flag: '🇳🇬', color: '#008751' },
  { id: 'TUN', name: 'Tunisia Ligue Professionnelle 1',    country: 'Tunisia',        flag: '🇹🇳', color: '#e70013' },
  { id: 'ALG', name: 'Algeria Ligue Professionnelle 1',    country: 'Algeria',        flag: '🇩🇿', color: '#006233' },
  { id: 'GHA', name: 'Ghana Premier League',               country: 'Ghana',          flag: '🇬🇭', color: '#006b3f' },
  { id: 'KEN', name: 'Kenya Premier League',               country: 'Kenya',          flag: '🇰🇪', color: '#006600' },
  { id: 'UGA', name: 'Uganda Premier League',              country: 'Uganda',         flag: '🇺🇬', color: '#000000' },
  { id: 'TAN', name: 'Tanzania Ligi Kuu',                  country: 'Tanzania',       flag: '🇹🇿', color: '#1d9bf0' },
  { id: 'ETH', name: 'Ethiopian Premier League',           country: 'Ethiopia',       flag: '🇪🇹', color: '#078930' },
  { id: 'RWA', name: 'Rwanda National League',             country: 'Rwanda',         flag: '🇷🇼', color: '#20603d' },
  { id: 'ZAM', name: 'Zambia Super League',                country: 'Zambia',         flag: '🇿🇲', color: '#198a00' },
  { id: 'SEN', name: 'Senegal Ligue 1',                    country: 'Senegal',        flag: '🇸🇳', color: '#00853f' },
  { id: 'MOZ', name: 'Mozambique Liga Moçambicana',        country: 'Mozambique',     flag: '🇲🇿', color: '#009a44' },
  { id: 'ZIM', name: 'Zimbabwe Premier Soccer League',     country: 'Zimbabwe',       flag: '🇿🇼', color: '#006400' },
  { id: 'MAL', name: 'Malawi Super League',                country: 'Malawi',         flag: '🇲🇼', color: '#000080' },
  { id: 'ANG', name: 'Angola Girabola',                    country: 'Angola',         flag: '🇦🇴', color: '#cc0000' },
  { id: 'COD', name: 'DR Congo Linafoot',                  country: 'DR Congo',       flag: '🇨🇩', color: '#007fff' },
  { id: 'BUR', name: 'Burundi Primus League',              country: 'Burundi',        flag: '🇧🇮', color: '#ce1126' },
];

const COLORS = ['#1a56db','#e02424','#057a55','#9f1239','#7e3af2','#d97706','#0e9f6e','#be185d','#0284c7','#4f46e5','#dc2626','#16a34a','#7c3aed','#c2410c','#0891b2','#0d9488','#9333ea','#db2777','#65a30d','#ca8a04'];

// ── Teams by league ───────────────────────────────────────
const RAW_TEAMS: Record<string, [string, string][]> = {
  RSA: [['Kaizer Chiefs','KCH'],['Orlando Pirates','ORL'],['Mamelodi Sundowns','SUN'],['SuperSport United','SSU'],['Cape Town City FC','CTC'],['Stellenbosch FC','STB'],['TS Galaxy','TSG'],['Sekhukhune United','SEK'],['Golden Arrows','GDA'],['Maritzburg United','MRZ']],
  EGY: [['Al Ahly SC','AHL'],['Zamalek SC','ZAM'],['Pyramids FC','PYR'],['Ismaily SC','ISM'],['Future FC','FUT'],['Ceramica Cleopatra','CER'],['Smouha SC','SMH'],['National Bank of Egypt','NBE'],['El Entag El Harby','ENT'],['El Gouna FC','GON']],
  MAR: [['Wydad AC','WAC'],['Raja Casablanca','RAJ'],['FUS Rabat','FUS'],['RS Berkane','RSB'],['Mouloudia Oujda','MOU'],['Hassania Agadir','HAS'],['Renaissance Berkane','RNB'],['Moghreb Tetouan','MOG'],['Difaa El Jadidi','DEJ'],['Ittihad Tanger','ITT']],
  NGA: [['Rivers United','RVU'],['Plateau United','PLU'],['Kano Pillars','KNP'],['Shooting Stars','SHS'],['Lobi Stars','LBS'],['Remo Stars','RMS'],['Sunshine Stars','SUS'],['Akwa United','AKW'],['Rangers International','RNG'],['Nasarawa United','NSU']],
  TUN: [['Espérance de Tunis','EST'],['Club Africain','CAF'],['CS Sfaxien','CSS'],['US Monastir','USM'],['Étoile du Sahel','EDS'],['Stade Tunisien','STT'],['Olympique Béja','OLB'],['AS Gabès','ASG'],['JS Kairouan','JSK'],['AS Marsa','ASM']],
  ALG: [['CR Belouizdad','CRB'],['USM Alger','USM'],['MC Alger','MCA'],['JS Kabylie','JSK'],['ES Sétif','ESS'],['MC Oran','MCO'],['CS Constantine','CSC'],['Paradou AC','PAR'],['ASO Chlef','ASO'],['USM Bel-Abbès','UBA']],
  GHA: [['Asante Kotoko SC','KOT'],['Hearts of Oak SC','HOA'],['Great Olympics FC','OLY'],['Medeama SC','MED'],['Aduana Stars','ADU'],['Legon Cities','LGN'],['King Faisal FC','KNF'],['Dreams FC','DRM'],['Bechem United','BEC'],['RTU FC','RTU']],
  KEN: [['Gor Mahia FC','GOR'],['AFC Leopards','LEP'],['Tusker FC','TUS'],['Mathare United','MAT'],['Kakamega Homeboyz','KAK'],['Sofapaka FC','SOF'],['Bandari FC','BAN'],['KCB FC','KCB'],['Western Stima','WST'],['Posta Rangers','POS']],
  UGA: [['KCCA FC','KCC'],['SC Villa','VIL'],['Vipers SC','VIP'],['Express FC','EXP'],['Wakiso Giants','WAK'],['Police FC','POL'],['Maroons FC','MAR'],['BUL FC','BUL'],['Mbarara City','MBA'],['MYDA FC','MYD']],
  TAN: [['Simba SC','SIM'],['Young Africans SC','YNG'],['Azam FC','AZA'],['Coastal Union','CST'],['Biashara United','BIA'],['Singida United','SIN'],['Mtibwa Sugar','MTI'],['Ihefu FC','IHE'],['Mbeya City','MBY'],['Alliance FC','ALL']],
  ETH: [['Ethiopian Coffee SC','ECF'],['St. George SC','STG'],['Fasil Kenema','FAS'],['Adama City FC','ADM'],['Dire Dawa Ketema','DDK'],['Wolaitta Dicha','WOL'],['Jimma AbaJifar','JIM'],['Sebeta Ketema','SEB'],['Hawassa Ketema','HAW'],['Dedebit FC','DED']],
  RWA: [['APR FC','APR'],['Rayon Sports FC','RAY'],['AS Kigali','ASK'],['Police FC Rwanda','POR'],['Espoir FC','ESP'],['Bugesera FC','BUG'],['Gorilla FC','GRL'],['Marines FC','MRN'],['Etincelles FC','ETI'],['Sunrise FC','SRS']],
  ZAM: [['Zesco United','ZES'],['Nkana FC','NKN'],['Forest Rangers','FOR'],['Green Eagles','GRE'],['Power Dynamos','POW'],['Buildcon FC','BLD'],['Lusaka Dynamos','LDA'],['Red Arrows','RDA'],['Zanaco FC','ZAN'],['Napsa Stars','NAP']],
  SEN: [['AS Pikine','PIK'],['Jaraaf FC','JAR'],['Génération Foot','GEN'],['Casa Sports','CAS'],['Diambars FC','DIA'],['US Gorée','GOR'],['Teungueth FC','TEU'],['ASC Diaraf','DRF'],['Dakar Sacré-Cœur','DSC'],['AS Douanes','DOU']],
  MOZ: [['Costa do Sol','COS'],['Ferroviário Maputo','FER'],['Black Bulls','BLK'],['UD do Songo','SON'],['Ferroviário Beira','FEB'],['Desportivo Maputo','DSP'],['Matchedje FC','MTC'],['Maxaquene FC','MAX'],['Vilankulo FC','VLK'],['Tete FC','TET']],
  ZIM: [['Dynamos FC','DYN'],['CAPS United','CAP'],['Highlanders FC','HIG'],['Triangle United','TRI'],['FC Platinum','PLT'],['Manica Diamonds','MAN'],['Cranborne Bullets','CRN'],['Chicken Inn FC','CHK'],['Bulawayo Chiefs','BUL'],['Herentals FC','HER']],
  MAL: [['Be Forward Wanderers','WAN'],['Nyasa Big Bullets','BIG'],['Silver Strikers','SIL'],['Mighty Wanderers','MMW'],['Blantyre United','BLU'],['Blue Eagles','BEG'],['Kamuzu Barracks','KAB'],['Rumphi United','RUM'],['Karonga United','KAR'],['Total Stars','TTS']],
  ANG: [['Petro de Luanda','PET'],['Primeiro de Agosto','AGO'],['Sagrada Esperança','SAG'],['Recreativo do Libolo','REC'],['Interclube FC','INT'],['1º de Maio','MAI'],['Santa Rita de Cássia','SRC'],['Desportivo da Huíla','HUI'],['Kabuscorp SC','KAB'],['Wiliete FC','WIL']],
  COD: [['TP Mazembe','TPM'],['AS Vita Club','VIT'],['AS Dragons','DRG'],['DC Motema Pembe','MTP'],['CS Don Bosco','DON'],['Saint-Eloi Lupopo','LUP'],['OC Bukavu Dawa','OCD'],['AS Nyuki','NYK'],['Sanga Balende','SNG'],['Renaissance du Congo','REN']],
  BUR: [['Le Messager Ngozi','MNG'],['Vital-O FC','VTO'],['Athletic Club Gitega','ACG'],['Aigle Noir','AGL'],['Inter Star','INS'],['Prince Louis','PRL'],['Bujumbura City FC','BCF'],['Flambeau du Centre','FLC'],['KAC Kiremba','KAK'],['LLB Athletic','LLB']],
};

// ── Build team objects ────────────────────────────────────
function buildTeam(name: string, abbr: string, idx: number): Team {
  return { name, abbr, color: COLORS[idx % COLORS.length], logoUrl: TEAM_LOGOS[name] };
}

const LEAGUE_TEAMS: Record<string, Team[]> = {};
Object.entries(RAW_TEAMS).forEach(([lid, raw]) => {
  LEAGUE_TEAMS[lid] = raw.map(([name, abbr], idx) => buildTeam(name, abbr, idx));
});

// ── Build all matchup templates (800+) ───────────────────
export const ALL_MATCHUPS: MatchTemplate[] = [];
LEAGUES.forEach(league => {
  const teams = LEAGUE_TEAMS[league.id] || [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      ALL_MATCHUPS.push({ leagueId: league.id, homeTeam: teams[i], awayTeam: teams[j] });
    }
  }
});

// ── Fisher-Yates shuffle ─────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── localStorage keys ────────────────────────────────────
const LS_KEY = 'bsports_played_matches';
const COOLDOWN_MS = 10 * 60 * 60 * 1000;

function getPlayedMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function markPlayed(key: string) {
  const map = getPlayedMap();
  map[key] = Date.now();
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

// ── Pick N fresh matchups ────────────────────────────────
export function pickFreshMatchups(n: number): MatchTemplate[] {
  const shuffled = shuffle(ALL_MATCHUPS);
  const fresh = shuffled.filter(t => !isOnCooldown(matchKey(t)));
  const picked = fresh.slice(0, n);
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

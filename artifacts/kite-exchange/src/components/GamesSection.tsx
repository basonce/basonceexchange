import { useState, useEffect, useRef } from 'react';

interface Match {
  id: string;
  league: string;
  country: string;
  flagEmoji: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: 'live' | 'finished';
  goalFlash: null | 'home' | 'away';
  locked: boolean;
  lockedUntil: number;
  flashPhase: 'red' | 'green' | null;
  finishedAt: number | null;
}

const LEAGUES = [
  { name: 'Uganda Premier League', country: 'Uganda', flag: '🇺🇬' },
  { name: 'Tanzania Ligi Kuu', country: 'Tanzania', flag: '🇹🇿' },
  { name: 'Ethiopian Premier League', country: 'Ethiopia', flag: '🇪🇹' },
  { name: 'Ghana Premier League', country: 'Ghana', flag: '🇬🇭' },
  { name: 'Kenya Premier League', country: 'Kenya', flag: '🇰🇪' },
  { name: 'Rwanda National League', country: 'Rwanda', flag: '🇷🇼' },
  { name: 'Zambia Super League', country: 'Zambia', flag: '🇿🇲' },
  { name: 'Senegal Ligue 1', country: 'Senegal', flag: '🇸🇳' },
  { name: 'Mozambique Liga', country: 'Mozambique', flag: '🇲🇿' },
  { name: 'Zimbabwe PSL', country: 'Zimbabwe', flag: '🇿🇼' },
];

const TEAMS_BY_COUNTRY: Record<string, string[][]> = {
  Uganda: [
    ['Kampala FC', 'K'], ['Victoria Bulls', 'VB'], ['Nile Stars', 'NS'],
    ['Gulu United', 'GU'], ['Pearl City', 'PC'], ['Entebbe Eagles', 'EE'],
  ],
  Tanzania: [
    ['Dar Stars', 'DS'], ['Kilimanjaro SC', 'KS'], ['Zanzibar FC', 'ZF'],
    ['Serengeti United', 'SU'], ['Mwanza City', 'MC'], ['Dodoma Red', 'DR'],
  ],
  Ethiopia: [
    ['Addis Blue', 'AB'], ['Coffee FC', 'CF'], ['Rift Valley', 'RV'],
    ['Dire Dawa', 'DD'], ['Hawassa United', 'HU'], ['Gondar Lions', 'GL'],
  ],
  Ghana: [
    ['Accra Hearts', 'AH'], ['Gold Stars', 'GS'], ['Kumasi Kings', 'KK'],
    ['Cape Heroes', 'CH'], ['Tamale Rovers', 'TR'], ['Takoradi SC', 'TS'],
  ],
  Kenya: [
    ['Nairobi City', 'NC'], ['Rift Wanderers', 'RW'], ['Mombasa Marina', 'MM'],
    ['Lake Victoria', 'LV'], ['Kisumu Stars', 'KS'], ['Nakuru FC', 'NF'],
  ],
  Rwanda: [
    ['Kigali FC', 'KF'], ['Volcano Stars', 'VS'], ['Muhazi United', 'MU'],
    ['Musanze Eagles', 'ME'], ['Huye Lions', 'HL'], ['Butare City', 'BC'],
  ],
  Zambia: [
    ['Lusaka Dynamos', 'LD'], ['Copper Kings', 'CK'], ['Victoria Falls', 'VF'],
    ['Ndola United', 'NU'], ['Kitwe Rangers', 'KR'], ['Livingstone SC', 'LS'],
  ],
  Senegal: [
    ['Dakar Warriors', 'DW'], ['Teranga Lions', 'TL'], ['Saint-Louis', 'SL'],
    ['Thiès City', 'TC'], ['Kaolack Stars', 'KS'], ['Ziguinchor FC', 'ZF'],
  ],
  Mozambique: [
    ['Maputo City', 'MP'], ['Beira United', 'BU'], ['Nampula Stars', 'NS'],
    ['Tete FC', 'TF'], ['Pemba Rovers', 'PR'], ['Quelimane SC', 'QS'],
  ],
  Zimbabwe: [
    ['Harare City', 'HC'], ['Bulawayo Stars', 'BS'], ['Mutare United', 'MU'],
    ['Kwekwe FC', 'KF'], ['Gweru Lions', 'GL'], ['Masvingo SC', 'MS'],
  ],
};

const TEAM_COLORS = [
  '#F0B90B', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6',
  '#F97316', '#EC4899', '#14B8A6', '#6366F1', '#84CC16',
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickTwo<T>(arr: T[]): [T, T] {
  const i = rand(0, arr.length - 1);
  let j = rand(0, arr.length - 1);
  while (j === i) j = rand(0, arr.length - 1);
  return [arr[i], arr[j]];
}

function generateMatch(id: string): Match {
  const league = LEAGUES[rand(0, LEAGUES.length - 1)];
  const teams = TEAMS_BY_COUNTRY[league.country];
  const [homeTeamData, awayTeamData] = pickTwo(teams);
  const minute = rand(5, 75);
  const maxGoals = Math.floor(minute / 20);
  const homeScore = rand(0, maxGoals);
  const awayScore = rand(0, maxGoals);
  const colorH = TEAM_COLORS[rand(0, TEAM_COLORS.length - 1)];
  const colorA = TEAM_COLORS[rand(0, TEAM_COLORS.length - 1)];

  return {
    id,
    league: league.name,
    country: league.country,
    flagEmoji: league.flag,
    homeTeam: homeTeamData[0],
    awayTeam: awayTeamData[0],
    homeLogo: colorH,
    awayLogo: colorA,
    homeScore,
    awayScore,
    minute,
    status: 'live',
    goalFlash: null,
    locked: false,
    lockedUntil: 0,
    flashPhase: null,
    finishedAt: null,
  };
}

function TeamBadge({ abbr, color, size = 36 }: { abbr: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}33 0%, ${color}22 100%)`,
        border: `1.5px solid ${color}66`,
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size < 36 ? 9 : 11,
        fontWeight: 900,
        color,
        letterSpacing: '-0.5px',
        flexShrink: 0,
      }}
    >
      {abbr}
    </div>
  );
}

function getAbbr(country: string, teamName: string): string {
  const teams = TEAMS_BY_COUNTRY[country] || [];
  const found = teams.find(t => t[0] === teamName);
  return found ? found[1] : teamName.slice(0, 2).toUpperCase();
}

export default function GamesSection() {
  const [matches, setMatches] = useState<Match[]>(() =>
    Array.from({ length: 8 }, (_, i) => generateMatch(`m${i}-${Date.now()}`))
  );
  const idCounter = useRef(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setMatches(prev => {
        const now = Date.now();
        let next = prev.map(m => {
          if (m.status === 'finished') return m;

          let match = { ...m, minute: m.minute + 1 };

          if (match.locked && now >= match.lockedUntil) {
            match = { ...match, locked: false, goalFlash: null, flashPhase: null };
          }

          if (match.minute >= 90) {
            return { ...match, status: 'finished' as const, finishedAt: now };
          }

          if (!match.locked) {
            const goalProb = 0.07;
            if (Math.random() < goalProb) {
              const isHome = Math.random() < 0.5;
              match = {
                ...match,
                homeScore: isHome ? match.homeScore + 1 : match.homeScore,
                awayScore: !isHome ? match.awayScore + 1 : match.awayScore,
                goalFlash: isHome ? 'home' : 'away',
                flashPhase: 'red',
                locked: true,
                lockedUntil: now + 10000,
              };
            }
          }

          if (match.flashPhase === 'red' && now - (match.lockedUntil - 10000) > 500) {
            match = { ...match, flashPhase: 'green' };
          }
          if (match.flashPhase === 'green' && now - (match.lockedUntil - 10000) > 1200) {
            match = { ...match, flashPhase: null };
          }

          return match;
        });

        next = next.filter(m => !(m.status === 'finished' && m.finishedAt && now - m.finishedAt > 8000));
        while (next.length < 8) {
          idCounter.current += 1;
          next.push(generateMatch(`m${idCounter.current}-${Date.now()}`));
        }

        return next;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const live = matches.filter(m => m.status === 'live');
  const finished = matches.filter(m => m.status === 'finished');

  return (
    <div className="bg-[#0B0E11] min-h-[60vh] pb-8">
      <style>{`
        @keyframes flashRed {
          0%,100% { background-color: rgba(239,68,68,0.18); }
          50%      { background-color: rgba(239,68,68,0.32); }
        }
        @keyframes flashGreen {
          0%,100% { background-color: rgba(16,185,129,0.18); }
          50%      { background-color: rgba(16,185,129,0.32); }
        }
        @keyframes goalPop {
          0%   { transform: scale(0.7); opacity:0; }
          50%  { transform: scale(1.15); opacity:1; }
          100% { transform: scale(1); opacity:1; }
        }
        .flash-red   { animation: flashRed   0.5s ease-in-out 2; }
        .flash-green { animation: flashGreen 0.5s ease-in-out 2; }
        .goal-pop    { animation: goalPop 0.35s cubic-bezier(.17,.67,.38,1.2) forwards; }
      `}</style>

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest"
            style={{ background: 'linear-gradient(135deg,#1a2a1a,#0d1f0d)', border: '1px solid #16a34a55', color: '#4ade80' }}
          >
            BASONCE SPORTS
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] text-gray-400 font-semibold">{live.length} LIVE</span>
          </div>
        </div>
        <span className="text-[11px] text-gray-500">Simulated · Updates every 10s</span>
      </div>

      {/* Live Matches */}
      <div className="px-3 space-y-2.5 mt-1">
        {live.map(m => {
          const flashClass = m.flashPhase === 'red' ? 'flash-red' : m.flashPhase === 'green' ? 'flash-green' : '';
          const abbrevH = getAbbr(m.country, m.homeTeam);
          const abbrevA = getAbbr(m.country, m.awayTeam);

          return (
            <div
              key={m.id}
              className={`rounded-2xl overflow-hidden ${flashClass}`}
              style={{
                background: 'linear-gradient(145deg,#161A1F,#1C2128)',
                border: '1px solid #2B3139',
              }}
            >
              {/* League header */}
              <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{m.flagEmoji}</span>
                  <span className="text-[11px] text-gray-400 font-semibold">{m.league}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {m.locked && m.goalFlash && (
                    <span
                      className="goal-pop text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: '#16a34a22', color: '#4ade80', border: '1px solid #16a34a55' }}
                    >
                      ⚽ GOAL!
                    </span>
                  )}
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: '#ef444422', border: '1px solid #ef444444' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-red-400 font-black">{m.minute}'</span>
                  </div>
                </div>
              </div>

              {/* Match row */}
              <div className="flex items-center px-3.5 pb-3">
                {/* Home */}
                <div className="flex-1 flex items-center gap-2.5 min-w-0">
                  <TeamBadge abbr={abbrevH} color={m.homeLogo} />
                  <p className="text-white text-[13px] font-bold truncate leading-tight">{m.homeTeam}</p>
                </div>

                {/* Score */}
                <div
                  className="mx-3 px-4 py-2 rounded-xl flex-none"
                  style={{ background: '#0B0E11', border: '1px solid #2B3139', minWidth: 72 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="text-xl font-black leading-none"
                      style={{
                        color: m.goalFlash === 'home' && m.flashPhase ? '#4ade80' : '#F0B90B',
                        transition: 'color 0.3s',
                      }}
                    >
                      {m.homeScore}
                    </span>
                    <span className="text-gray-600 text-base font-bold">—</span>
                    <span
                      className="text-xl font-black leading-none"
                      style={{
                        color: m.goalFlash === 'away' && m.flashPhase ? '#4ade80' : '#F0B90B',
                        transition: 'color 0.3s',
                      }}
                    >
                      {m.awayScore}
                    </span>
                  </div>
                </div>

                {/* Away */}
                <div className="flex-1 flex items-center gap-2.5 justify-end min-w-0">
                  <p className="text-white text-[13px] font-bold truncate leading-tight text-right">{m.awayTeam}</p>
                  <TeamBadge abbr={abbrevA} color={m.awayLogo} />
                </div>
              </div>

              {/* Half time indicator */}
              <div
                className="px-3.5 pb-2.5 flex items-center gap-2"
                style={{ borderTop: '1px solid #2B313955' }}
              >
                <span className="text-[10px] text-gray-600 font-semibold">
                  {m.minute <= 45 ? '1st Half' : '2nd Half'}
                </span>
                {m.locked && (
                  <span className="text-[10px] text-amber-400/70 font-semibold ml-auto">
                    🔒 Updating...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Finished */}
      {finished.length > 0 && (
        <div className="px-3 mt-4">
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-2 px-1">Completed</p>
          <div className="space-y-2">
            {finished.map(m => (
              <div
                key={m.id}
                className="rounded-xl px-3.5 py-2.5 flex items-center gap-3 opacity-50"
                style={{ background: '#161A1F', border: '1px solid #2B3139' }}
              >
                <span className="text-sm">{m.flagEmoji}</span>
                <span className="text-gray-400 text-xs font-semibold flex-1 truncate">{m.homeTeam}</span>
                <span className="text-white text-sm font-black px-2">
                  {m.homeScore} — {m.awayScore}
                </span>
                <span className="text-gray-400 text-xs font-semibold flex-1 truncate text-right">{m.awayTeam}</span>
                <span className="text-gray-600 text-[10px] font-bold ml-1">FT</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-[10px] text-gray-600 mt-6 px-6">
        Basonce Sports · Simulated League Events · For entertainment purposes only
      </p>
    </div>
  );
}

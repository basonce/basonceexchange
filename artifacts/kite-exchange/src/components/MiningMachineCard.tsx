import { useState, useEffect } from 'react';
import { Play, Pause, Cpu } from 'lucide-react';
import DeviceImage from './DeviceImage';

interface MiningMachineCardProps {
  minerId: string;
  name: string;
  icon?: string;
  image?: string;
  imageGlow?: string;
  hashRate: number;
  hourlyRate: number;
  sessionEarned: number;
  totalEarned: number;
  isActive: boolean;
  onToggle: () => void;
  level?: number;
  miningDurationSeconds?: number;
  miningDurationHours?: number;
  timesUsed?: number;
  maxUses?: number;
  hasTimeLimit?: boolean;
  remainingSeconds?: number;
  usagePercentage?: number;
  onShopClick?: () => void;
}

const LEVEL_THEMES = {
  0: {
    name: 'FREE',
    bgGradient: 'from-slate-800/50 to-slate-900/50',
    borderColor: 'border-slate-700',
    iconBg: 'from-slate-600 to-slate-700',
    accentColor: '#64748b',
    progressGradient: 'from-slate-500 to-slate-400',
    glowColor: 'slate-500/20',
    earningsColor: 'text-slate-400'
  },
  1: {
    name: 'ASIC PRO',
    bgGradient: 'from-yellow-900/30 to-orange-900/30',
    borderColor: 'border-yellow-600/50',
    iconBg: 'from-yellow-500 to-orange-500',
    accentColor: '#F0B90B',
    progressGradient: 'from-yellow-500 to-orange-400',
    glowColor: 'yellow-500/30',
    earningsColor: 'text-yellow-400'
  },
  2: {
    name: 'FARM',
    bgGradient: 'from-emerald-900/30 to-teal-900/30',
    borderColor: 'border-emerald-600/50',
    iconBg: 'from-emerald-500 to-teal-500',
    accentColor: '#10b981',
    progressGradient: 'from-emerald-500 to-teal-400',
    glowColor: 'emerald-500/30',
    earningsColor: 'text-emerald-400'
  },
  3: {
    name: 'INDUSTRIAL',
    bgGradient: 'from-purple-900/30 to-fuchsia-900/30',
    borderColor: 'border-purple-600/50',
    iconBg: 'from-purple-500 to-fuchsia-500',
    accentColor: '#a855f7',
    progressGradient: 'from-purple-500 to-fuchsia-400',
    glowColor: 'purple-500/30',
    earningsColor: 'text-purple-400'
  },
  4: {
    name: 'DATA CENTER',
    bgGradient: 'from-rose-900/30 to-pink-900/30',
    borderColor: 'border-rose-600/50',
    iconBg: 'from-rose-500 to-pink-500',
    accentColor: '#f43f5e',
    progressGradient: 'from-rose-500 to-pink-400',
    glowColor: 'rose-500/30',
    earningsColor: 'text-rose-400'
  },
  5: {
    name: 'QUANTUM',
    bgGradient: 'from-cyan-900/30 via-blue-900/30 to-indigo-900/30',
    borderColor: 'border-cyan-400/50',
    iconBg: 'from-cyan-400 via-blue-500 to-indigo-500',
    accentColor: '#06b6d4',
    progressGradient: 'from-cyan-400 via-blue-500 to-indigo-500',
    glowColor: 'cyan-400/40',
    earningsColor: 'text-cyan-400'
  }
};

export default function MiningMachineCard({
  minerId,
  name,
  icon = '💻',
  image,
  imageGlow = '#F0B90B',
  hashRate,
  hourlyRate,
  sessionEarned,
  totalEarned,
  isActive,
  onToggle,
  level = 0,
  miningDurationSeconds = 0,
  miningDurationHours = 0,
  timesUsed = 0,
  maxUses = 999,
  hasTimeLimit = false,
  remainingSeconds = 0,
  usagePercentage = 0,
  onShopClick
}: MiningMachineCardProps) {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [outputRate, setOutputRate] = useState(0);

  const theme = LEVEL_THEMES[level as keyof typeof LEVEL_THEMES] || LEVEL_THEMES[0];

  const isExpired = hasTimeLimit && (remainingSeconds !== undefined && remainingSeconds <= 0) && !isActive;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  useEffect(() => {
    if (isActive) {
      const animSpeed = Math.max(300, 1500 - (level * 250));
      const interval = setInterval(() => {
        setCpuUsage(Math.random() * 20 + 60 + (level * 4));
        setOutputRate(hourlyRate / 3600);
      }, animSpeed);
      return () => clearInterval(interval);
    } else {
      setCpuUsage(0);
      setOutputRate(0);
    }
  }, [isActive, hourlyRate, level]);

  return (
    <div className={`overflow-hidden rounded-2xl transition-all duration-500 ${isExpired ? 'opacity-40 grayscale' : ''}`}>
      {isExpired && (
        <div className="bg-red-900/40 border border-red-500/60 rounded-t-xl px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-red-300">⛔ EXPIRED — Mining time is over</span>
          {onShopClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onShopClick(); }}
              className="text-[11px] font-bold bg-[#F0B90B] hover:bg-[#FCD535] text-black px-3 py-1 rounded-md transition-colors"
            >
              🛒 Buy New Device
            </button>
          )}
        </div>
      )}
      <div className={`bg-gradient-to-br ${isExpired ? 'from-gray-900 to-gray-950' : theme.bgGradient} border-2 ${isExpired ? 'border-gray-700' : theme.borderColor} ${isExpired ? 'rounded-b-2xl' : 'rounded-2xl'} p-5 relative overflow-hidden transition-all duration-500 ${
        isActive ? `shadow-2xl shadow-${theme.glowColor}` : ''
      }`}>
        {isActive && (
          <div className={`absolute inset-0 bg-gradient-to-br from-${theme.glowColor} to-transparent pointer-events-none ${level >= 3 ? 'animate-pulse' : ''}`}
          style={{
            animation: level >= 4 ? 'pulse 1s ease-in-out infinite' : undefined
          }} />
        )}

        {isActive && (
          <>
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              <div
                className="absolute h-[2px] w-2/3 opacity-70"
                style={{
                  background: 'linear-gradient(90deg, transparent, #0ECB81, #0ECB81, transparent)',
                  animation: 'miningBeam1 2.5s linear infinite',
                  top: '25%',
                  filter: 'blur(1px)'
                }}
              />
              <div
                className="absolute h-[1px] w-1/2 opacity-50"
                style={{
                  background: 'linear-gradient(90deg, transparent, #F0B90B, transparent)',
                  animation: 'miningBeam2 3.5s linear infinite',
                  top: '60%',
                  filter: 'blur(0.5px)'
                }}
              />
              <div
                className="absolute h-[1.5px] w-3/4 opacity-40"
                style={{
                  background: 'linear-gradient(90deg, transparent, #0ECB81, transparent)',
                  animation: 'miningBeam3 4.2s linear infinite',
                  top: '80%',
                  filter: 'blur(1px)'
                }}
              />
            </div>
          </>
        )}

        {level >= 3 && isActive && (
          <>
            <div className="absolute top-0 right-0 w-40 h-40 opacity-30 pointer-events-none overflow-hidden">
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${theme.iconBg} blur-3xl`} />
            </div>
            <div className="absolute bottom-0 left-0 w-40 h-40 opacity-20 pointer-events-none overflow-hidden">
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${theme.iconBg} blur-3xl`} />
            </div>
          </>
        )}


      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <div
                className={`${level >= 3 ? 'w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl' : 'w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-3xl'} rounded-2xl flex items-center justify-center transition-all relative overflow-hidden border ${
                  image
                    ? (isActive ? 'border-white/10' : 'border-[#2B3139]')
                    : isActive
                      ? `bg-gradient-to-br ${theme.iconBg} shadow-lg shadow-${theme.glowColor} border-transparent`
                      : 'bg-[#2B3139] border-transparent'
                }`}
                style={image ? {
                  background: `radial-gradient(circle at 50% 35%, ${imageGlow}26, #0B0E11 72%)`,
                  boxShadow: isActive ? `0 0 18px ${imageGlow}55` : undefined,
                } : undefined}
              >
                {level >= 4 && isActive && !image && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                )}
                {image ? (
                  <DeviceImage img={image} glow={imageGlow} alt={name} active={isActive} />
                ) : (
                  <div className="relative z-10">{icon}</div>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-xl font-bold text-white mb-1 flex items-center gap-1.5 flex-wrap">
                <span className="truncate">{name}</span>
                {level > 0 && (
                  <span className={`px-1.5 py-0.5 ${theme.earningsColor} text-[10px] sm:text-xs font-bold border ${theme.borderColor} rounded-full flex-shrink-0`}>
                    Lv.{level}
                  </span>
                )}
                {hasTimeLimit && remainingSeconds > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#F0B90B]/20 text-[#F0B90B] text-[10px] sm:text-xs font-bold border border-[#F0B90B]/30 rounded-full flex-shrink-0 flex items-center gap-1">
                    ⏱️ {formatTime(remainingSeconds)} left
                  </span>
                )}
                {hasTimeLimit && remainingSeconds === 0 && !isActive && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] sm:text-xs font-bold border border-red-500 rounded-full flex-shrink-0 flex items-center gap-1">
                    🔒 TIME EXPIRED
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-sm text-gray-400">{hashRate} TH/s</span>
                {isActive && (
                  <span className={`px-1.5 sm:px-2 py-0.5 ${theme.earningsColor} bg-opacity-10 text-[10px] sm:text-xs font-bold rounded-full`}
                    style={{ backgroundColor: `${theme.accentColor}20` }}>
                    MINING
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={!isExpired ? onToggle : undefined}
            disabled={isExpired}
            className={`px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl flex items-center justify-center gap-1 sm:gap-2 transition-all font-black whitespace-nowrap shadow-lg flex-shrink-0 ${
              isExpired
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : isActive
                  ? 'bg-red-500 hover:bg-red-600 text-white active:scale-95'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-sm sm:text-lg">Stop</span>
              </>
            ) : isExpired ? (
              <>
                <span className="text-sm sm:text-lg">Collect</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-sm sm:text-lg">Start</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-[#0D0E12]/80 border border-[#2B3139] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 overflow-hidden">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#2B3139"
                    strokeWidth="6"
                    fill="none"
                  />
                  {isActive && (
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="url(#gradient)"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${(cpuUsage / 100) * 176} 176`}
                      className="transition-all duration-1000"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-[#F0B90B] animate-pulse' : 'bg-gray-600'}`} />
                </div>
                <svg width="0" height="0">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F0B90B" />
                      <stop offset="100%" stopColor="#0ECB81" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">HASH POWER</div>
                <div className="text-2xl font-bold text-white">{hashRate} TH/s</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">POWER</div>
              <div className={`text-2xl font-bold ${theme.earningsColor}`}>{cpuUsage.toFixed(0)}%</div>
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className={`${level >= 4 ? 'h-3' : 'h-2'} bg-[#1A1B23] rounded-full overflow-hidden relative`}>
              <div
                className={`h-full bg-gradient-to-r ${theme.progressGradient} transition-all duration-1000`}
                style={{
                  width: isActive ? `${cpuUsage}%` : '0%',
                  boxShadow: isActive && level >= 4 ? `0 0 10px ${theme.accentColor}` : undefined
                }}
              />
            </div>
            <div className="flex gap-2">
              {[...Array(level === 5 ? 12 : level >= 3 ? 8 : level === 2 ? 6 : 4)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 ${level >= 4 ? 'h-2' : 'h-1.5'} bg-[#1A1B23] rounded-full overflow-hidden relative`}
                >
                  <div
                    className={`h-full transition-all ${level >= 4 ? 'duration-300' : 'duration-500'} ${
                      isActive ? `bg-gradient-to-r ${theme.progressGradient}` : 'bg-transparent'
                    }`}
                    style={{
                      width: isActive ? `${Math.random() * 30 + 70}%` : '0%',
                      transitionDelay: `${i * (level >= 4 ? 30 : level >= 3 ? 50 : 100)}ms`,
                      boxShadow: isActive && level >= 4 ? `0 0 5px ${theme.accentColor}` : undefined
                    }}
                  />
                </div>
              ))}
            </div>
            {level >= 3 && isActive && (
              <div className="flex gap-1 mt-1">
                {[...Array(level >= 5 ? 16 : 12)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 bg-[#1A1B23] rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full bg-gradient-to-r ${theme.progressGradient}`}
                      style={{
                        width: isActive ? `${Math.random() * 40 + 60}%` : '0%',
                        transition: `all ${level >= 5 ? '200ms' : '400ms'}`,
                        transitionDelay: `${i * (level >= 5 ? 20 : 40)}ms`
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">OUTPUT RATE</div>
            <div className={`text-xl font-bold ${isActive ? theme.earningsColor : 'text-gray-600'}`}>
              ${outputRate.toFixed(4)}/sec
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className={`bg-[#0D0E12]/60 border ${theme.borderColor} rounded-xl p-2`}>
            <div className="text-xs text-gray-500 mb-0.5">Hourly Rate</div>
            <div className={`text-sm font-bold ${theme.earningsColor} truncate`}>
              ${hourlyRate >= 10 ? hourlyRate.toFixed(0) : hourlyRate.toFixed(hourlyRate >= 1 ? 2 : 4)}
            </div>
          </div>

          <div className={`bg-[#0D0E12]/60 border ${theme.borderColor} rounded-xl p-2`}>
            <div className="text-xs text-gray-500 mb-0.5">Session</div>
            <div className="text-sm font-bold text-white truncate">
              ${sessionEarned >= 10 ? sessionEarned.toFixed(0) : sessionEarned.toFixed(sessionEarned >= 1 ? 2 : 4)}
            </div>
          </div>

          <div className={`bg-[#0D0E12]/60 border ${theme.borderColor} rounded-xl p-2`}>
            <div className="text-xs text-gray-500 mb-0.5">All-Time</div>
            <div className={`text-sm font-bold ${theme.earningsColor} truncate`}>
              ${totalEarned >= 10 ? totalEarned.toFixed(0) : totalEarned.toFixed(totalEarned >= 1 ? 2 : 4)}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

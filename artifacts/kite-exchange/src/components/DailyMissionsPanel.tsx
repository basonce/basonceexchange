import { useEffect, useState } from 'react';
import { Target, Check, Gift, Clock } from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

export default function DailyMissionsPanel() {
  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 'daily_login',
      title: 'Daily Check-In',
      description: 'Log in today',
      progress: 1,
      target: 1,
      reward: 0.5,
      completed: true,
      claimed: false
    },
    {
      id: 'earn_5',
      title: 'Earn $5 Today',
      description: 'Mine $5 USDT in 24 hours',
      progress: 2.34,
      target: 5,
      reward: 2,
      completed: false,
      claimed: false
    },
    {
      id: 'keep_active',
      title: 'Stay Active',
      description: 'Keep miners running for 6 hours',
      progress: 3.2,
      target: 6,
      reward: 1,
      completed: false,
      claimed: false
    },
    {
      id: 'refer_friend',
      title: 'Invite a Friend',
      description: 'Share your referral code',
      progress: 0,
      target: 1,
      reward: 5,
      completed: false,
      claimed: false
    }
  ]);

  const [timeLeft, setTimeLeft] = useState('23:45:12');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const claimReward = (missionId: string) => {
    setMissions(prev =>
      prev.map(m =>
        m.id === missionId && m.completed && !m.claimed
          ? { ...m, claimed: true }
          : m
      )
    );
  };

  const completedCount = missions.filter(m => m.completed).length;
  const totalRewards = missions
    .filter(m => m.completed && !m.claimed)
    .reduce((sum, m) => sum + m.reward, 0);

  return (
    <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#F0B90B]" />
          <h3 className="font-bold text-white">Daily Missions</h3>
        </div>
        <div className="flex items-center gap-2 bg-[#181A20] px-3 py-1 rounded-lg">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs font-mono text-gray-400">{timeLeft}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-400">
            {completedCount}/{missions.length} Completed
          </span>
          {totalRewards > 0 && (
            <span className="text-emerald-400 font-bold">
              ${totalRewards.toFixed(2)} Available
            </span>
          )}
        </div>
        <div className="h-2 bg-[#2B3139] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#F0B90B] to-emerald-500 transition-all duration-500"
            style={{ width: `${(completedCount / missions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {missions.map(mission => {
          const progress = Math.min((mission.progress / mission.target) * 100, 100);

          return (
            <div
              key={mission.id}
              className={`border rounded-lg p-3 transition-all ${
                mission.completed
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-[#181A20] border-[#2B3139]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {mission.completed && (
                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-sm font-bold text-white">{mission.title}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{mission.description}</div>
                  {!mission.completed && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#2B3139] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#F0B90B] to-amber-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {mission.progress.toFixed(1)}/{mission.target}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  {mission.completed && !mission.claimed ? (
                    <button
                      onClick={() => claimReward(mission.id)}
                      className="bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1"
                    >
                      <Gift className="w-3 h-3" />
                      ${mission.reward}
                    </button>
                  ) : mission.claimed ? (
                    <div className="text-xs text-gray-500 font-bold">CLAIMED</div>
                  ) : (
                    <div className="text-sm font-bold text-[#F0B90B]">
                      +${mission.reward}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-gradient-to-r from-[#F0B90B]/10 to-amber-600/10 border border-[#F0B90B]/30 rounded-lg p-3">
        <div className="text-xs font-bold text-[#F0B90B] mb-1">
          Complete all missions to unlock bonus reward!
        </div>
        <div className="text-xs text-gray-400">Extra $10 USDT + Mystery Box</div>
      </div>
    </div>
  );
}

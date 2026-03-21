import React from 'react';
import { Trophy, Zap, Star, Award, Target, Flame } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  target: number;
  reward: string;
  isUnlocked: boolean;
  color: string;
}

interface AchievementBadgesProps {
  balance: number;
  totalEarned: number;
  daysActive: number;
  equipmentCount: number;
}

export default function AchievementBadges({
  balance,
  totalEarned,
  daysActive,
  equipmentCount
}: AchievementBadgesProps) {
  const achievements: Achievement[] = [
    {
      id: 'first_earn',
      title: 'First Earnings',
      description: 'Earn your first $1',
      icon: <Star className="w-6 h-6" />,
      progress: Math.min(balance, 1),
      target: 1,
      reward: '+1 Spin',
      isUnlocked: balance >= 1,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      id: 'speed_demon',
      title: 'Speed Demon',
      description: 'Own 3+ mining devices',
      icon: <Zap className="w-6 h-6" />,
      progress: equipmentCount,
      target: 3,
      reward: '+2 Spins',
      isUnlocked: equipmentCount >= 3,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'week_warrior',
      title: 'Week Warrior',
      description: 'Mine for 7 days',
      icon: <Flame className="w-6 h-6" />,
      progress: daysActive,
      target: 7,
      reward: '+5 Spins',
      isUnlocked: daysActive >= 7,
      color: 'from-red-500 to-orange-500'
    },
    {
      id: 'hundred_club',
      title: '$100 Club',
      description: 'Earn $100 total',
      icon: <Trophy className="w-6 h-6" />,
      progress: Math.min(totalEarned, 100),
      target: 100,
      reward: '+10 Spins',
      isUnlocked: totalEarned >= 100,
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          <h3 className="font-bold text-white">Achievements</h3>
        </div>
        <div className="bg-slate-700/50 rounded-lg px-3 py-1">
          <span className="text-xs font-semibold text-white">
            {unlockedCount}/{achievements.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {achievements.map((achievement) => {
          const progressPercent = (achievement.progress / achievement.target) * 100;

          return (
            <div
              key={achievement.id}
              className={`relative rounded-xl p-3 transition-all ${
                achievement.isUnlocked
                  ? `bg-gradient-to-br ${achievement.color} border-2 border-white/20 shadow-lg`
                  : 'bg-slate-800/30 border border-slate-700/50'
              }`}
            >
              {achievement.isUnlocked && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                  <Award className="w-3 h-3 text-white" />
                </div>
              )}

              <div className={`mb-2 ${achievement.isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                {achievement.icon}
              </div>

              <h4 className={`text-xs font-bold mb-1 ${
                achievement.isUnlocked ? 'text-white' : 'text-gray-400'
              }`}>
                {achievement.title}
              </h4>

              <p className={`text-[10px] mb-2 ${
                achievement.isUnlocked ? 'text-white/80' : 'text-gray-500'
              }`}>
                {achievement.description}
              </p>

              {!achievement.isUnlocked && (
                <>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500">
                    {achievement.progress.toFixed(0)}/{achievement.target}
                  </p>
                </>
              )}

              {achievement.isUnlocked && (
                <div className="bg-white/20 rounded-lg px-2 py-1 text-center">
                  <p className="text-[10px] font-bold text-white">{achievement.reward}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
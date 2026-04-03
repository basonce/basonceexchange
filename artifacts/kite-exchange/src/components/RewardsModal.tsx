import { useState, useEffect } from 'react';
import { X, Gift, Trophy, Target, Star, CheckCircle, Lock, ChevronRight, TrendingUp } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DailyTask {
  id: number;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  completed: boolean;
  icon: any;
}

export default function RewardsModal({ isOpen, onClose }: RewardsModalProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'achievements' | 'bonuses'>('tasks');
  const [userLevel, setUserLevel] = useState(1);
  const [totalRewards, setTotalRewards] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchUserStats();
    }
  }, [isOpen]);

  const fetchUserStats = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserLevel(Math.floor((profile.trading_volume || 0) / 10000) + 1);
        }
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  if (!isOpen) return null;

  const dailyTasks: DailyTask[] = [
    {
      id: 1,
      title: 'Daily Login',
      description: 'Login to your account',
      reward: 5,
      progress: 1,
      target: 1,
      completed: true,
      icon: CheckCircle
    },
    {
      id: 2,
      title: 'Complete 3 Trades',
      description: 'Make 3 successful trades',
      reward: 10,
      progress: 1,
      target: 3,
      completed: false,
      icon: TrendingUp
    },
    {
      id: 3,
      title: 'Trade Volume $1000',
      description: 'Reach $1000 trading volume',
      reward: 25,
      progress: 450,
      target: 1000,
      completed: false,
      icon: Target
    },
    {
      id: 4,
      title: 'Refer a Friend',
      description: 'Invite friends and earn rewards',
      reward: 50,
      progress: 0,
      target: 1,
      completed: false,
      icon: Gift
    }
  ];

  const achievements = [
    {
      id: 1,
      title: 'First Trade',
      description: 'Complete your first trade',
      reward: 100,
      unlocked: true,
      date: '2026-01-15'
    },
    {
      id: 2,
      title: 'Trading Master',
      description: 'Complete 100 trades',
      reward: 500,
      unlocked: false,
      progress: 45,
      target: 100
    },
    {
      id: 3,
      title: 'High Roller',
      description: 'Trade volume over $100,000',
      reward: 1000,
      unlocked: false,
      progress: 32500,
      target: 100000
    },
    {
      id: 4,
      title: 'Profit King',
      description: 'Earn $10,000 in profits',
      reward: 2000,
      unlocked: false,
      progress: 2450,
      target: 10000
    }
  ];

  const bonuses = [
    {
      id: 1,
      title: 'Welcome Bonus',
      description: '50 USDT for new users',
      reward: 50,
      expires: '2026-02-15',
      claimed: true
    },
    {
      id: 2,
      title: 'Weekly Trading Bonus',
      description: 'Trade $10,000 this week',
      reward: 100,
      expires: '2026-02-08',
      claimed: false,
      progress: 6500,
      target: 10000
    },
    {
      id: 3,
      title: 'Futures Master',
      description: 'Open 20 futures positions',
      reward: 200,
      expires: '2026-02-28',
      claimed: false,
      progress: 8,
      target: 20
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-[#181A20] w-full max-w-[480px] rounded-t-2xl h-[95vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Rewards</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-[#F0B90B]/20 to-transparent border-[#2B3139] px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-[#F0B90B]" />
                <span className="font-bold text-lg">Level {userLevel}</span>
              </div>
              <p className="text-xs">Keep trading to level up!</p>
            </div>
            <div className="text-right">
              <div className="font-bold text-2xl">{totalRewards}</div>
              <p className="text-xs">Total Rewards</p>
            </div>
          </div>

          <div className="bg-[#181A20] rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F0B90B]/20 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-[#F0B90B]" />
              </div>
              <div>
                <div className="font-medium text-sm">{dailyStreak} Day Streak</div>
                <p className="text-xs">Login daily for bonuses</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-[#181A20] px-4 py-3 border-[#2B3139]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${ activeTab === 'tasks' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Daily Tasks
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${ activeTab === 'achievements' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Achievements
            </button>
            <button
              onClick={() => setActiveTab('bonuses')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${ activeTab === 'bonuses' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Bonuses
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {activeTab === 'tasks' && (
            <div className="p-4 space-y-3 pb-4">
              {dailyTasks.map((task) => {
                const Icon = task.icon;
                const progressPercent = (task.progress / task.target) * 100;

                return (
                  <div
                    key={task.id}
                    className={`bg-[#181A20] border rounded-xl p-4 ${ task.completed ? 'border-[#0ECB81]/30 bg-[#0ECB81]/5' : 'border-[#2B3139]' }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ task.completed ? 'bg-[#0ECB81]/20' : 'bg-[#2B3139]' }`}>
                        <Icon className={`w-5 h-5 ${ task.completed ? 'text-[#0ECB81]' : 'text-[#F0B90B]' }`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm">{task.title}</h3>
                          <div className="flex items-center gap-1">
                            <Gift className="w-3 h-3 text-[#F0B90B]" />
                            <span className="font-bold text-xs">+{task.reward}</span>
                          </div>
                        </div>
                        <p className="text-xs mb-3">{task.description}</p>

                        {!task.completed && (
                          <>
                            <div className="bg-[#2B3139] rounded-full h-2 mb-2 overflow-hidden">
                              <div
                                className="bg-[#F0B90B] h-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs">
                                {task.progress} / {task.target}
                              </span>
                              <span className="text-xs">
                                {progressPercent.toFixed(0)}%
                              </span>
                            </div>
                          </>
                        )}

                        {task.completed && (
                          <div className="flex items-center gap-1 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </div>
                        )}
                      </div>
                    </div>

                    {!task.completed && (
                      <button className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 font-bold py-2 rounded-lg text-xs transition-all">
                        Continue
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="p-4 space-y-3 pb-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`bg-[#181A20] border rounded-xl p-4 ${ achievement.unlocked ? 'border-[#F0B90B]/30 bg-[#F0B90B]/5' : 'border-[#2B3139]' }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ achievement.unlocked ? 'bg-gradient-to-br from-[#F0B90B] to-[#F8D12F]' : 'bg-[#2B3139]' }`}>
                      {achievement.unlocked ? (
                        <Trophy className="w-6 h-6 text-black" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm">{achievement.title}</h3>
                        <div className="flex items-center gap-1">
                          <Gift className="w-3 h-3 text-[#F0B90B]" />
                          <span className="font-bold text-xs">+{achievement.reward}</span>
                        </div>
                      </div>
                      <p className="text-xs mb-2">{achievement.description}</p>

                      {achievement.unlocked && achievement.date && (
                        <div className="text-xs font-medium">
                          Unlocked on {new Date(achievement.date).toLocaleDateString()}
                        </div>
                      )}

                      {!achievement.unlocked && achievement.progress !== undefined && (
                        <>
                          <div className="bg-[#2B3139] rounded-full h-2 mb-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] h-full transition-all duration-300"
                              style={{ width: `${(achievement.progress / achievement.target!) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs">
                            {achievement.progress?.toLocaleString()} / {achievement.target?.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'bonuses' && (
            <div className="p-4 space-y-3 pb-4">
              {bonuses.map((bonus) => {
                const progressPercent = bonus.progress ? (bonus.progress / bonus.target!) * 100 : 0;
                const daysLeft = Math.ceil((new Date(bonus.expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={bonus.id}
                    className={`bg-[#181A20] border rounded-xl p-4 ${ bonus.claimed ? 'border-[#848E9C]/30 opacity-60' : 'border-[#F0B90B]/30 bg-gradient-to-br from-[#F0B90B]/5 to-transparent' }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ bonus.claimed ? 'bg-[#2B3139]' : 'bg-gradient-to-br from-[#F0B90B]/20 to-transparent' }`}>
                        <Gift className={`w-5 h-5 ${ bonus.claimed ? 'text-gray-400' : 'text-[#F0B90B]' }`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm">{bonus.title}</h3>
                          <span className="font-bold text-sm">+{bonus.reward}</span>
                        </div>
                        <p className="text-xs mb-2">{bonus.description}</p>

                        {bonus.progress !== undefined && !bonus.claimed && (
                          <>
                            <div className="bg-[#2B3139] rounded-full h-2 mb-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] h-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs">
                                ${bonus.progress?.toLocaleString()} / ${bonus.target?.toLocaleString()}
                              </span>
                              <span className="text-xs">
                                {progressPercent.toFixed(0)}%
                              </span>
                            </div>
                          </>
                        )}

                        <div className="flex items-center justify-between">
                          {!bonus.claimed && (
                            <span className="text-xs">
                              {daysLeft} days left
                            </span>
                          )}
                          {bonus.claimed && (
                            <span className="text-xs flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Claimed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!bonus.claimed && (
                      <button className="w-full bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] hover:opacity-90 font-bold py-2 rounded-lg text-xs transition-all">
                        {bonus.progress && bonus.progress >= bonus.target! ? 'Claim Reward' : 'View Details'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

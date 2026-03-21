import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Circle, Trophy, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Mission {
  id: string;
  mission_name: string;
  mission_description: string;
  target_value: number;
  spin_reward: number;
  icon: string;
  mission_type: string;
}

interface MissionProgress {
  mission_id: string;
  current_progress: number;
  is_completed: boolean;
}

interface DailyMissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyMissionsModal({ isOpen, onClose }: DailyMissionsModalProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<Record<string, MissionProgress>>({});

  useEffect(() => {
    if (isOpen) {
      loadMissions();
    }
  }, [isOpen]);

  const loadMissions = async () => {
    const { data: missionsData, error: missionsError } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (!missionsError && missionsData) {
      setMissions(missionsData);
      await loadProgress(missionsData.map(m => m.id));
    }
  };

  const loadProgress = async (missionIds: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('user_mission_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('reset_date', today);

    if (!error && data) {
      const progressMap: Record<string, MissionProgress> = {};
      data.forEach(p => {
        progressMap[p.mission_id] = p;
      });
      setProgress(progressMap);
    }
  };

  const getProgressPercentage = (missionId: string, targetValue: number) => {
    const missionProgress = progress[missionId];
    if (!missionProgress) return 0;
    return Math.min((missionProgress.current_progress / targetValue) * 100, 100);
  };

  const isCompleted = (missionId: string) => {
    return progress[missionId]?.is_completed || false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border border-blue-500/30 shadow-2xl shadow-blue-500/20">

        <div className="sticky top-0 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 px-6 py-4 border-b border-blue-500/30 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <Trophy className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Daily Missions
              </h2>
              <p className="text-xs text-gray-400">Complete missions to earn free spins!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            <p className="text-sm text-gray-300">
              Complete missions to earn <span className="font-bold text-yellow-400">FREE SPINS</span> for the reward wheel!
            </p>
          </div>

          {missions.map((mission) => {
            const progressPercent = getProgressPercentage(mission.id, mission.target_value);
            const completed = isCompleted(mission.id);
            const currentProgress = progress[mission.id]?.current_progress || 0;

            return (
              <div
                key={mission.id}
                className={`bg-gradient-to-br ${
                  completed
                    ? 'from-green-500/10 to-emerald-500/10 border-green-500/50'
                    : 'from-slate-800/50 to-slate-900/50 border-slate-700'
                } border rounded-xl p-4 transition-all hover:scale-102`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`text-3xl p-3 rounded-lg ${
                      completed
                        ? 'bg-green-500/20'
                        : 'bg-slate-700/50'
                    }`}
                  >
                    {mission.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-white text-lg">{mission.mission_name}</h3>
                        <p className="text-sm text-gray-400">{mission.mission_description}</p>
                      </div>

                      {completed ? (
                        <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-1">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-sm font-semibold text-green-400">Completed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/50 rounded-lg px-3 py-1">
                          <Circle className="w-5 h-5 text-blue-400" />
                          <span className="text-sm font-semibold text-blue-400">In Progress</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                        <span>Progress: {currentProgress.toFixed(1)} / {mission.target_value}</span>
                        <span>{progressPercent.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            completed
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-gray-300">
                          Reward: <span className="font-bold text-yellow-400">{mission.spin_reward} {mission.spin_reward === 1 ? 'Spin' : 'Spins'}</span>
                        </span>
                      </div>

                      {completed && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <Sparkles className="w-3 h-3" />
                          <span>Spins claimed!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
            <p className="text-sm text-yellow-400">
              Missions reset daily at midnight. Complete them every day for maximum rewards!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Clock, Trophy, Zap, Gift } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';

interface Prize {
  id: string;
  prize_name: string;
  prize_value: number;
  prize_type: string;
  color: string;
  icon: string;
  probability: number;
}

interface RewardWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RewardWheelModal({ isOpen, onClose }: RewardWheelModalProps) {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinBalance, setSpinBalance] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<any>(null);
  const [isLuckyHour, setIsLuckyHour] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const wheelSegments = [
    { label: '1.5X', value: 1.5, color: '#ef4444', type: 'multiplier' },
    { label: '250K', value: 250000, color: '#ec4899', type: 'eq_tokens' },
    { label: '500M', value: 500000000, color: '#a855f7', type: 'eq_tokens' },
    { label: '1,000', value: 1000, color: '#6366f1', type: 'eq_tokens' },
    { label: '$1,000', value: 1000, color: '#14b8a6', type: 'futures_bonus' },
    { label: '250,000', value: 250000, color: '#22c55e', type: 'eq_tokens' },
    { label: '$100k', value: 100000, color: '#eab308', type: 'futures_bonus' },
    { label: '2.5X', value: 2.5, color: '#f97316', type: 'multiplier' },
  ];

  useEffect(() => {
    if (isOpen) {
      loadSpinBalance();
      checkLuckyHour();
    }
  }, [isOpen]);

  const loadSpinBalance = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_spin_balance')
      .select('available_spins')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSpinBalance(data.available_spins);
    } else {
      setSpinBalance(3);
    }
  };

  const checkLuckyHour = async () => {
    const currentHour = new Date().getHours();
    setIsLuckyHour(currentHour >= 20 && currentHour <= 23);
  };

  const handleSpin = async () => {
    if (isSpinning || spinBalance < 1) return;

    setIsSpinning(true);
    setWonPrize(null);

    const randomIndex = Math.floor(Math.random() * wheelSegments.length);
    const selectedPrize = wheelSegments[randomIndex];

    const degreesPerSlice = 360 / wheelSegments.length;
    const targetDegree = (randomIndex * degreesPerSlice) + (degreesPerSlice / 2);
    const spinRotations = 360 * 8;
    const finalRotation = spinRotations + (360 - targetDegree);

    setRotation(finalRotation);

    setTimeout(() => {
      setWonPrize(selectedPrize);
      setShowConfetti(true);
      setSpinBalance(prev => Math.max(0, prev - 1));

      applyPrize(selectedPrize);

      setTimeout(() => {
        setShowConfetti(false);
        setIsSpinning(false);
      }, 3000);
    }, 5000);
  };

  const applyPrize = async (prize: any) => {
    const user = await getCurrentUser();
    if (!user) return;

    if (prize.type === 'eq_tokens') {
      await supabase.rpc('add_mining_balance', {
        p_user_id: user.id,
        p_amount: prize.value
      });
    } else if (prize.type === 'futures_bonus') {
      await supabase.rpc('add_futures_balance', {
        p_user_id: user.id,
        p_amount: prize.value
      });
    }
  };

  const handleClaimDailySpin = async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const lastClaim = localStorage.getItem('lastDailySpinClaim');
    const today = new Date().toDateString();

    if (lastClaim === today) {
      alert('Already claimed today! Come back tomorrow.');
      return;
    }

    localStorage.setItem('lastDailySpinClaim', today);
    setSpinBalance(prev => prev + 1);
    alert('Daily spin claimed!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border border-yellow-500/30 shadow-2xl shadow-yellow-500/20">

        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-3xl">
            {Array.from({ length: 80 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti text-3xl"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                {['💰', '🎁', '⭐', '💎', '🔥'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="sticky top-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-orange-500 px-6 py-4 border-b border-yellow-400/50 flex items-center justify-between z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-white animate-bounce" />
            <div>
              <h2 className="text-2xl font-black text-white drop-shadow-lg">
                DAILY & HOURLY BONUSES
              </h2>
              <p className="text-xs text-white/90 font-semibold">Spin to win BIG rewards!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 transition-colors p-2 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {isLuckyHour && (
            <div className="bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500 rounded-xl p-4 flex items-center gap-3 animate-pulse">
              <Zap className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="font-black text-yellow-400 text-lg">LUCKY HOUR ACTIVE!</p>
                <p className="text-sm text-yellow-300 font-semibold">5x chance for MEGA prizes!</p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-300 font-semibold">Available Spins</p>
                <p className="text-3xl font-black text-white">{spinBalance}</p>
              </div>
            </div>
            <button
              onClick={handleClaimDailySpin}
              className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg"
            >
              <Clock className="w-5 h-5" />
              Daily Free
            </button>
          </div>

          <div className="relative">

            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
              <div className="w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-t-[50px] border-t-red-500 drop-shadow-2xl" />
            </div>

            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 via-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" />

              <div
                className="relative w-full h-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
                }}
              >
                <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
                  {wheelSegments.map((segment, index) => {
                    const angle = (360 / wheelSegments.length) * index;
                    const nextAngle = (360 / wheelSegments.length) * (index + 1);
                    const midAngle = angle + (nextAngle - angle) / 2;

                    const startAngleRad = (angle - 90) * (Math.PI / 180);
                    const endAngleRad = (nextAngle - 90) * (Math.PI / 180);

                    const x1 = 200 + 190 * Math.cos(startAngleRad);
                    const y1 = 200 + 190 * Math.sin(startAngleRad);
                    const x2 = 200 + 190 * Math.cos(endAngleRad);
                    const y2 = 200 + 190 * Math.sin(endAngleRad);

                    const textAngleRad = (midAngle - 90) * (Math.PI / 180);
                    const textRadius = 130;
                    const textX = 200 + textRadius * Math.cos(textAngleRad);
                    const textY = 200 + textRadius * Math.sin(textAngleRad);

                    return (
                      <g key={index}>
                        <path
                          d={`M 200 200 L ${x1} ${y1} A 190 190 0 0 1 ${x2} ${y2} Z`}
                          fill={segment.color}
                          stroke="#0f172a"
                          strokeWidth="3"
                        />
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="font-black fill-white drop-shadow-lg"
                          style={{
                            fontSize: segment.label.length > 4 ? '22px' : '28px',
                            transform: `rotate(${midAngle}deg)`,
                            transformOrigin: `${textX}px ${textY}px`,
                            textShadow: '0 2px 8px rgba(0,0,0,0.8)'
                          }}
                        >
                          {segment.label}
                        </text>
                      </g>
                    );
                  })}

                  <circle cx="200" cy="200" r="60" fill="#0f172a" stroke="#fbbf24" strokeWidth="6" />
                  <circle cx="200" cy="200" r="50" fill="url(#goldGradient)" className="drop-shadow-2xl" />

                  <defs>
                    <radialGradient id="goldGradient">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </radialGradient>
                  </defs>

                  <text
                    x="200"
                    y="200"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-black fill-white"
                    style={{ fontSize: '32px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    SPIN
                  </text>
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={isSpinning || spinBalance < 1}
            className={`w-full py-5 rounded-2xl font-black text-2xl transition-all transform relative overflow-hidden ${
              isSpinning || spinBalance < 1
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-500 via-yellow-400 to-orange-500 hover:from-yellow-600 hover:via-yellow-500 hover:to-orange-600 text-white hover:scale-105 shadow-2xl shadow-yellow-500/50'
            }`}
          >
            {!isSpinning && spinBalance >= 1 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
            <span className="relative z-10 drop-shadow-lg">
              {isSpinning ? '🎰 SPINNING...' : spinBalance < 1 ? 'NO SPINS AVAILABLE' : '🎯 SPIN THE WHEEL!'}
            </span>
          </button>

          {spinBalance < 1 && (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Get more spins:</p>
              <div className="flex gap-2 justify-center">
                <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold">
                  Complete Missions
                </button>
                <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold">
                  Achievements
                </button>
              </div>
            </div>
          )}
        </div>

        {wonPrize && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-[60] animate-fade-in">
            <div className="bg-gradient-to-br from-yellow-500/30 via-orange-500/30 to-yellow-500/30 border-4 border-yellow-400 rounded-3xl p-10 max-w-md mx-4 text-center shadow-2xl animate-scale-in relative overflow-hidden">

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

              <div className="relative z-10">
                <div className="text-8xl mb-6 animate-bounce">🎉</div>
                <h3 className="text-4xl font-black text-white mb-4 drop-shadow-lg">
                  CONGRATULATIONS!
                </h3>
                <div className="bg-white/10 rounded-2xl p-6 mb-6 border-2 border-yellow-400/50">
                  <p className="text-6xl font-black mb-2" style={{ color: wonPrize.color }}>
                    {wonPrize.label}
                  </p>
                  <p className="text-white font-bold text-lg">
                    {wonPrize.type === 'futures_bonus' && '💰 Added to Futures Balance!'}
                    {wonPrize.type === 'eq_tokens' && '⚡ Added to Mining Balance!'}
                    {wonPrize.type === 'multiplier' && '🚀 Multiplier Applied!'}
                  </p>
                </div>
                <button
                  onClick={() => setWonPrize(null)}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-black text-xl transition-all transform hover:scale-110 shadow-2xl"
                >
                  🎊 AWESOME!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes scale-in {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
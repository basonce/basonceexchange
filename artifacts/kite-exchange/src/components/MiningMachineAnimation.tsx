import { useEffect, useState } from 'react';

interface MiningMachineAnimationProps {
  isActive: boolean;
  hashRate: number;
  earningRate: number;
}

export default function MiningMachineAnimation({
  isActive,
  hashRate,
  earningRate
}: MiningMachineAnimationProps) {
  const [coins, setCoins] = useState<{ id: number; x: number; delay: number }[]>([]);
  const [power, setPower] = useState(0);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        const newCoin = {
          id: Date.now(),
          x: Math.random() * 80 + 10,
          delay: Math.random() * 0.5
        };
        setCoins(prev => [...prev, newCoin].slice(-8));
      }, 2000 / (hashRate / 10));

      return () => clearInterval(interval);
    } else {
      setCoins([]);
    }
  }, [isActive, hashRate]);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setPower(prev => (prev + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setPower(0);
    }
  }, [isActive]);

  return (
    <div className="relative w-full h-32 bg-gradient-to-br from-[#1E2329] to-[#0F1114] rounded-xl overflow-hidden border border-[#2B3139]">
      <div className="absolute inset-0">
        <div className="absolute top-4 left-4 right-4 flex items-center gap-3">
          <div className="relative w-16 h-16">
            <div
              className={`absolute inset-0 rounded-full border-4 border-[#F0B90B] ${
                isActive ? 'animate-spin' : ''
              }`}
              style={{
                borderTopColor: 'transparent',
                borderRightColor: 'transparent',
                animationDuration: '2s'
              }}
            />
            <div
              className={`absolute inset-2 rounded-full border-4 border-emerald-500 ${
                isActive ? 'animate-spin' : ''
              }`}
              style={{
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
                animationDuration: '1.5s',
                animationDirection: 'reverse'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-4 h-4 rounded-full ${
                  isActive ? 'bg-[#F0B90B]' : 'bg-gray-600'
                } ${isActive ? 'animate-pulse' : ''}`}
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-xs font-bold text-gray-400">HASH POWER</div>
              {isActive && (
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1 h-3 bg-[#F0B90B] rounded-full"
                      style={{
                        animation: `pulse 1s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {hashRate.toFixed(1)} TH/s
            </div>
            <div className="mt-1 h-1.5 bg-[#2B3139] rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-[#F0B90B] via-amber-500 to-emerald-500 ${
                  isActive ? 'animate-pulse' : ''
                }`}
                style={{ width: isActive ? `${power}%` : '0%', transition: 'width 0.05s linear' }}
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5">OUTPUT RATE</div>
            <div className="text-sm font-bold text-emerald-400">
              ${earningRate.toFixed(4)}/sec
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-8 h-1 rounded-full ${
                    isActive && power > i * 25 ? 'bg-emerald-500' : 'bg-[#2B3139]'
                  }`}
                  style={{ transition: 'background-color 0.2s' }}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500">
              {isActive ? Math.min(Math.floor(power), 99) : 0}%
            </div>
          </div>
        </div>
      </div>

      {coins.map(coin => (
        <div
          key={coin.id}
          className="absolute top-20 w-6 h-6 text-2xl pointer-events-none"
          style={{
            left: `${coin.x}%`,
            animation: `coinFall 2s ease-in forwards`,
            animationDelay: `${coin.delay}s`,
            filter: 'drop-shadow(0 0 4px rgba(240, 185, 11, 0.5))'
          }}
        >
          💰
        </div>
      ))}

      <style>{`
        @keyframes coinFall {
          0% {
            transform: translateY(0) scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(20px) scale(1) rotate(180deg);
            opacity: 1;
          }
          100% {
            transform: translateY(60px) scale(0.5) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scaleY(0.6);
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}

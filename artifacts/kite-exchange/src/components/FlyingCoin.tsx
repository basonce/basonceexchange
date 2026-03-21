import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';

interface CoinBag {
  id: number;
  x: number;
  delay: number;
}

export default function FlyingCoin() {
  const [bags, setBags] = useState<CoinBag[]>([]);

  useEffect(() => {
    const newBags: CoinBag[] = [];
    for (let i = 0; i < 5; i++) {
      newBags.push({
        id: Math.random(),
        x: Math.random() * 60 + 20,
        delay: Math.random() * 200
      });
    }
    setBags(newBags);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {bags.map((bag) => (
        <div
          key={bag.id}
          className="absolute animate-coin-drop"
          style={{
            left: `${bag.x}%`,
            top: '-100px',
            animationDelay: `${bag.delay}ms`,
          }}
        >
          <div className="relative">
            <div className="w-12 h-14 bg-gradient-to-br from-[#F0B90B] via-[#FCD535] to-[#F0B90B] rounded-full rounded-t-sm relative shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-[#1A1B23] font-bold" strokeWidth={3} />
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-2 bg-[#D4960B] rounded-full"></div>
              <div
                className="absolute inset-0 rounded-full rounded-t-sm"
                style={{
                  boxShadow: '0 0 20px rgba(240, 185, 11, 0.6), inset -2px -2px 8px rgba(0,0,0,0.2), inset 2px 2px 8px rgba(255,255,255,0.3)',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

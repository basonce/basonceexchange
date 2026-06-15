import React, { useState } from 'react';
import { X, ChevronRight, Pickaxe, DollarSign, TrendingUp, Gift, CheckCircle } from 'lucide-react';

interface MiningOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function MiningOnboarding({ isOpen, onClose, onComplete }: MiningOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Free Mining!",
      description: "Earn real money 24/7 without investment",
      icon: <Gift className="w-16 h-16 text-yellow-400" />,
      image: "🎁",
      highlights: [
        "100% FREE to start",
        "No deposit required",
        "Withdraw anytime",
        "24/7 automatic earnings"
      ],
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "How It Works",
      description: "3 Simple Steps to Start Earning",
      icon: <Pickaxe className="w-16 h-16 text-blue-400" />,
      image: "•",
      highlights: [
        "1. Get FREE mining device",
        "2. Watch earnings grow live",
        "3. Claim & withdraw profits"
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Real-Time Earnings",
      description: "Watch your balance grow every second",
      icon: <DollarSign className="w-16 h-16 text-green-400" />,
      image: "💰",
      highlights: [
        "Live balance updates",
        "Earn while you sleep",
        "No electricity costs",
        "Professional equipment"
      ],
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Upgrade & Earn More",
      description: "Buy better devices with your earnings",
      icon: <TrendingUp className="w-16 h-16 text-purple-400" />,
      image: "📈",
      highlights: [
        "FREE device: $0.01/day",
        "GPU Rig: $1.20/day",
        "ASIC Miner: $7.20/day",
        "Quantum Rig: $360/month!"
      ],
      color: "from-purple-500 to-pink-500"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl max-w-md w-full border border-slate-700 shadow-2xl overflow-hidden">

        <div className="relative">
          <div className={`absolute inset-0 bg-gradient-to-r ${step.color} opacity-20`} />

          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white p-2 bg-black/30 rounded-full backdrop-blur-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative px-6 pt-12 pb-8 text-center">
            <div className="text-8xl mb-4 animate-bounce">{step.image}</div>

            <div className="mb-2 flex items-center justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-gradient-to-r ' + step.color
                      : index < currentStep
                      ? 'w-4 bg-green-500'
                      : 'w-4 bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
            <p className="text-gray-400 text-sm">{step.description}</p>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {step.highlights.map((highlight, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`p-2 rounded-lg bg-gradient-to-r ${step.color} opacity-20`}>
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-white font-medium text-sm flex-1">{highlight}</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-1 py-3 bg-gradient-to-r ${step.color} hover:opacity-90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg`}
          >
            {currentStep < steps.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Start Mining!
                <Pickaxe className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        <div className="px-6 pb-6 text-center">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
          >
            Skip tutorial ({currentStep + 1}/{steps.length})
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
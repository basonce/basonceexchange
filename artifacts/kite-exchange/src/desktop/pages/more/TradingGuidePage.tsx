import { useState } from 'react';
import {
  ArrowRight,
  GraduationCap,
  Clock,
  CheckCircle2,
  Wallet,
  LineChart,
  ShieldCheck,
  TrendingUp,
  Target,
  Layers,
  Compass,
} from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

type Level = 'Beginner' | 'Intermediate' | 'Advanced';

interface Lesson {
  title: string;
  duration: string;
  lessons: number;
  progress: number;
}

const PATH: Record<Level, { blurb: string; lessons: Lesson[] }> = {
  Beginner: {
    blurb: 'Start from zero. Understand what crypto is, how to fund your account, and how to make your first safe trade.',
    lessons: [
      { title: 'What is Cryptocurrency?', duration: '20m', lessons: 4, progress: 100 },
      { title: 'Setting Up & Securing Your Account', duration: '25m', lessons: 5, progress: 60 },
      { title: 'Making Your First Deposit', duration: '15m', lessons: 3, progress: 30 },
      { title: 'Spot Trading Basics', duration: '40m', lessons: 6, progress: 0 },
    ],
  },
  Intermediate: {
    blurb: 'Build real skill. Read charts, manage risk, and understand the order types professionals use every day.',
    lessons: [
      { title: 'Reading Candlestick Charts', duration: '45m', lessons: 7, progress: 0 },
      { title: 'Limit, Market & Stop Orders', duration: '35m', lessons: 5, progress: 0 },
      { title: 'Risk Management Essentials', duration: '50m', lessons: 8, progress: 0 },
      { title: 'Introduction to Technical Analysis', duration: '1h 10m', lessons: 9, progress: 0 },
    ],
  },
  Advanced: {
    blurb: 'Trade like a pro. Master leverage, derivatives, and disciplined strategy for volatile markets.',
    lessons: [
      { title: 'Futures & Perpetual Contracts', duration: '1h', lessons: 8, progress: 0 },
      { title: 'Leverage & Margin Mechanics', duration: '55m', lessons: 7, progress: 0 },
      { title: 'Building a Trading Strategy', duration: '1h 20m', lessons: 10, progress: 0 },
      { title: 'Portfolio & Position Sizing', duration: '45m', lessons: 6, progress: 0 },
    ],
  },
};

const LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced'];

const FIRST_TRADE_STEPS = [
  {
    icon: Wallet,
    title: 'Fund your account',
    desc: 'Deposit crypto or buy with a card. Funds land in your Spot wallet, ready to trade in minutes.',
  },
  {
    icon: Compass,
    title: 'Choose a market',
    desc: 'Open the trade screen and select a pair such as BTC/USDT. Review the live price and order book.',
  },
  {
    icon: Target,
    title: 'Set your order',
    desc: 'Pick a Market order for instant execution or a Limit order to set your exact price, then enter the amount.',
  },
  {
    icon: CheckCircle2,
    title: 'Confirm & track',
    desc: 'Review the total, confirm the trade, and monitor your filled position in the Orders tab.',
  },
];

const CONCEPTS = [
  {
    icon: LineChart,
    title: 'Market structure',
    desc: 'Learn how price, volume, and the order book interact so you can read momentum before you act.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk first',
    desc: 'Position sizing and stop-losses protect your capital. Survival is the foundation of every strategy.',
  },
  {
    icon: TrendingUp,
    title: 'Trend & timing',
    desc: 'Identify trends and key levels with indicators, and avoid trading against the dominant direction.',
  },
  {
    icon: Layers,
    title: 'Diversification',
    desc: 'Spread exposure across assets and strategies to reduce the impact of any single bad trade.',
  },
];

export default function TradingGuidePage({ onNavigate }: MorePageProps) {
  const [activeLevel, setActiveLevel] = useState<Level>('Beginner');
  const active = PATH[activeLevel];

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Hero */}
      <section className="border-b border-[#2B3139] bg-[#0B0E11] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-[#F0B90B] blur-[120px]" />
        </div>
        <div className="max-w-[1200px] mx-auto px-6 pt-20 pb-16 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2B3139] mb-6">
            <GraduationCap className="w-4 h-4 text-[#F0B90B]" />
            <span className="text-xs font-bold tracking-wider uppercase">Trading Guide</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-5 max-w-3xl">
            Learn to trade, <span className="text-[#F0B90B]">step by step</span>
          </h1>
          <p className="text-[#848E9C] text-lg leading-relaxed max-w-2xl mb-8">
            A clear path from your very first deposit to confident, disciplined trading. Follow structured levels,
            bite-sized lessons, and a hands-on walkthrough for your first trade.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={openAuthRegister}
              className="px-8 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              Start Learning
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('academy')}
              className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-[#2B3139] text-[#EAECEF] font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Browse Academy
            </button>
          </div>
        </div>
      </section>

      {/* Learning path */}
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-3">Your learning path</h2>
          <p className="text-[#848E9C] max-w-xl mx-auto">
            Three levels, designed to be taken in order. Pick where you are today.
          </p>
        </div>

        {/* Level selector */}
        <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
          {LEVELS.map((lvl, i) => (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                activeLevel === lvl
                  ? 'bg-[#F0B90B] text-black'
                  : 'bg-[#181A20] text-[#B7BDC6] hover:text-[#EAECEF] border border-[#2B3139]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold tabular-nums ${
                  activeLevel === lvl ? 'bg-black/20 text-black' : 'bg-[#2B3139] text-[#848E9C]'
                }`}
              >
                {i + 1}
              </span>
              {lvl}
            </button>
          ))}
        </div>

        <p className="text-center text-[#B7BDC6] max-w-2xl mx-auto mb-10 leading-relaxed">{active.blurb}</p>

        {/* Lesson cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {active.lessons.map((lesson, i) => (
            <div
              key={lesson.title}
              onClick={openAuthRegister}
              className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5 hover:border-[#F0B90B]/50 transition-colors cursor-pointer flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#F0B90B] uppercase tracking-wider">
                  Lesson {i + 1}
                </span>
                <span className="flex items-center gap-1 text-xs text-[#848E9C] whitespace-nowrap tabular-nums">
                  <Clock className="w-3.5 h-3.5" /> {lesson.duration}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 leading-snug">{lesson.title}</h3>
              <p className="text-xs text-[#848E9C] mb-5 tabular-nums">{lesson.lessons} lessons</p>

              <div className="mt-auto">
                <div className="flex items-center justify-between text-xs text-[#848E9C] mb-1.5">
                  <span>Progress</span>
                  <span className="tabular-nums">{lesson.progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#2B3139] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0ECB81] transition-all"
                    style={{ width: `${lesson.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* First trade walkthrough */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-3">
              How to place your first trade
            </h2>
            <p className="text-[#848E9C] max-w-xl mx-auto">Four simple steps from funding to filled order.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {FIRST_TRADE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative">
                  {i < FIRST_TRADE_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-7 left-[58%] right-[-42%] h-px border-t border-dashed border-[#2B3139]" />
                  )}
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-[#F0B90B]" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#848E9C] tabular-nums">
                        STEP {i + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-[#B7BDC6] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key concepts */}
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-3">Key concepts to master</h2>
          <p className="text-[#848E9C] max-w-xl mx-auto">
            The pillars every successful trader returns to, again and again.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONCEPTS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6 hover:border-[#F0B90B]/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[#F0B90B]/10 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-[#F0B90B]" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{c.title}</h3>
                <p className="text-sm text-[#848E9C] leading-relaxed">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-[1200px] mx-auto px-6">
        <div className="bg-gradient-to-r from-[#1E2329] to-[#181A20] border border-[#2B3139] rounded-2xl p-10 md:p-16 text-center">
          <GraduationCap className="w-12 h-12 text-[#F0B90B] mx-auto mb-6" />
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-4">
            Ready to trade with confidence?
          </h2>
          <p className="text-[#848E9C] max-w-xl mx-auto mb-8 leading-relaxed">
            Create your Basonce account and apply everything you have learned on a real, professional trading platform.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={openAuthRegister}
              className="px-8 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              Start Learning
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('academy')}
              className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-[#2B3139] text-[#EAECEF] font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Explore Academy
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

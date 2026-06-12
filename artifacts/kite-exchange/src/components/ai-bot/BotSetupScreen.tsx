import { useState, useId } from 'react';
import { ChevronRight, Info } from 'lucide-react';
import { STRATEGY_CONFIGS, TOP_BOT_COINS, BotConfig } from '../../lib/ai-bot-engine';

interface BotSetupScreenProps {
  config: BotConfig;
  onConfigChange: (config: BotConfig) => void;
  onStart: () => void;
  realUsdtBalance?: number;
}

/* ===== Premium animated strategy icons (bespoke per strategy) ===== */
function BotIconStyles() {
  return (
    <style>{`
      @keyframes setupBarPulse { 0%,100% { transform: scaleY(.32); } 50% { transform: scaleY(1); } }
      @keyframes setupFlame { 0%,100% { transform: scale(1) translateY(0); opacity: .9; } 45% { transform: scale(1.14) translateY(-1px); opacity: 1; } 72% { transform: scale(.95) translateY(.5px); opacity: .95; } }
      @keyframes setupBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    `}</style>
  );
}

function ScalperIcon({ color, size = 24 }: { color: string; size?: number }) {
  const bars = [{ x: 3, d: 0 }, { x: 8.5, d: 0.12 }, { x: 14, d: 0.24 }, { x: 19.5, d: 0.36 }];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible' }}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={3} width={2.4} height={18} rx={1.2} fill={color}
          style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animation: `setupBarPulse 0.8s ease-in-out ${b.d}s infinite` }} />
      ))}
    </svg>
  );
}

function SwingIcon({ color, size = 24 }: { color: string; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const pid = `setup-swing-${uid}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible' }}>
      <path id={pid} d="M2 17 Q6.5 6 11 12 T22 6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
      <circle r={2.4} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
        <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${pid}`} xlinkHref={`#${pid}`} />
        </animateMotion>
      </circle>
    </svg>
  );
}

function ShieldIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
      style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'setupBreathe 2.6s ease-in-out infinite' }}>
      <path d="M12 2 L20 5.2 V11 C20 16 16.4 19.6 12 21.5 C7.6 19.6 4 16 4 11 V5.2 Z" fill={`${color}22`} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M8.4 12 l2.5 2.5 L15.8 8.8" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AggressiveIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible' }}>
      <path d="M12 2 C13.6 6.4 18 8 18 13.2 A6 6 0 0 1 6 13.2 C6 9.9 8.4 9 9.3 6.6 C11 7.8 11.4 9.5 11 11 C12.7 10.4 12.9 6.6 12 2 Z"
        fill={color} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animation: 'setupFlame 1.1s ease-in-out infinite' }} />
      <path d="M12 10 C12.8 11.8 14 12.8 14 14.8 A2.4 2.4 0 0 1 9.2 14.8 C9.2 13.1 10.5 12.6 11 11.5 C11.6 12.1 11.7 12.9 11.5 13.6 C12.4 13.2 12.6 11.4 12 10 Z"
        fill="rgba(255,236,205,0.92)" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animation: 'setupFlame 0.8s ease-in-out 0.15s infinite' }} />
    </svg>
  );
}

function StrategyIcon({ kind, color, size = 24 }: { kind: string; color: string; size?: number }) {
  if (kind === 'swing') return <SwingIcon color={color} size={size} />;
  if (kind === 'conservative') return <ShieldIcon color={color} size={size} />;
  if (kind === 'aggressive') return <AggressiveIcon color={color} size={size} />;
  return <ScalperIcon color={color} size={size} />;
}

export default function BotSetupScreen({ config, onConfigChange, onStart, realUsdtBalance = 0 }: BotSetupScreenProps) {
  const [step, setStep] = useState<'strategy' | 'coins' | 'risk'>('strategy');

  const strategyKeys = Object.keys(STRATEGY_CONFIGS) as Array<keyof typeof STRATEGY_CONFIGS>;

  return (
    <div className="flex flex-col h-full">
      <BotIconStyles />
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-xl font-bold text-white mb-1">Configure Your AI Bot</h2>
        <p className="text-sm text-gray-400">Set up your trading strategy and risk preferences</p>

        <div className="flex gap-1 mt-4">
          {(['strategy', 'coins', 'risk'] as const).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${step === s || (i === 0 && step !== 'strategy' ? false : false) ? 'bg-[#F0B90B]' : 'bg-[#2B3139]'}`}
              style={{ opacity: ['strategy', 'coins', 'risk'].indexOf(step) >= i ? 1 : 0.3 }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {step === 'strategy' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Choose Strategy</h3>
            {strategyKeys.map((key) => {
              const s = STRATEGY_CONFIGS[key];
              const isSelected = config.strategy === key;
              return (
                <button
                  key={key}
                  onClick={() => onConfigChange({ ...config, strategy: key as any, leverage: s.leverage })}
                  className={`w-full p-4 rounded-2xl border transition-all text-left ${isSelected ? 'border-[#F0B90B] bg-[#F0B90B]/10' : 'border-[#2B3139] bg-[#1E2026] hover:border-[#3B4049]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${s.color}2E, ${s.color}0D)`, border: `1px solid ${s.color}45`, boxShadow: isSelected ? `0 0 16px ${s.color}55` : 'none' }}>
                      <StrategyIcon kind={key as string} color={s.color} size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{s.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                            {s.timeframe}
                          </span>
                          <span className="text-xs text-gray-500">{s.leverage}x</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => setStep('coins')}
              className="w-full mt-4 py-4 rounded-2xl bg-[#F0B90B] text-black font-bold text-base flex items-center justify-center gap-2"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 'coins' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Select Coins</h3>
              <span className="text-xs text-gray-500">{config.selectedCoins.length} selected</span>
            </div>
            <div className="bg-[#1E2026] rounded-2xl p-3 flex items-start gap-2 mb-4">
              <Info className="w-4 h-4 text-[#F0B90B] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-400">Bot will analyze selected coins and generate signals. Select 1-5 coins for best performance.</p>
            </div>
            {TOP_BOT_COINS.map((coin) => {
              const isSelected = config.selectedCoins.includes(coin.symbol);
              return (
                <button
                  key={coin.symbol}
                  onClick={() => {
                    const updated = isSelected
                      ? config.selectedCoins.filter(c => c !== coin.symbol)
                      : [...config.selectedCoins, coin.symbol].slice(0, 5);
                    onConfigChange({ ...config, selectedCoins: updated });
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${isSelected ? 'border-[#F0B90B] bg-[#F0B90B]/10' : 'border-[#2B3139] bg-[#1E2026]'}`}
                >
                  <img
                    src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${getCMCId(coin.base)}.png`}
                    alt={coin.base}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${coin.base}&background=f0b90b&color=000&size=64`; }}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white text-sm">{coin.base}</div>
                    <div className="text-xs text-gray-400">{coin.name}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[#F0B90B] bg-[#F0B90B]' : 'border-[#3B4049]'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                </button>
              );
            })}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('strategy')} className="flex-1 py-4 rounded-2xl border border-[#2B3139] text-gray-300 font-semibold">Back</button>
              <button
                onClick={() => setStep('risk')}
                disabled={config.selectedCoins.length === 0}
                className="flex-1 py-4 rounded-2xl bg-[#F0B90B] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 'risk' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Risk Management</h3>

            <div>
              <label className="text-sm text-gray-400 mb-3 block">Risk Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => {
                  const colors = { low: '#3B82F6', medium: '#F59E0B', high: '#EF4444' };
                  const labels = { low: 'Low', medium: 'Medium', high: 'High' };
                  const descs = { low: '5% per trade', medium: '10% per trade', high: '20% per trade' };
                  const isSelected = config.riskLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => onConfigChange({ ...config, riskLevel: level })}
                      className={`p-3 rounded-2xl border transition-all text-center ${isSelected ? 'border-[#F0B90B] bg-[#F0B90B]/10' : 'border-[#2B3139] bg-[#1E2026]'}`}
                    >
                      <div className="text-sm font-semibold" style={{ color: isSelected ? '#F0B90B' : colors[level] }}>{labels[level]}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{descs[level]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Max Daily Loss Limit: <span className="text-[#F0B90B]">{config.maxDailyLossPct}%</span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={config.maxDailyLossPct}
                onChange={(e) => onConfigChange({ ...config, maxDailyLossPct: Number(e.target.value) })}
                className="w-full accent-[#F0B90B]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1%</span>
                <span>20%</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Starting Balance: <span className="text-[#F0B90B]">${config.simBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </label>
              {realUsdtBalance > 0 && (
                <div className="mb-3 p-3 bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Your USDT Balance</div>
                    <div className="text-sm font-bold text-[#F0B90B]">${realUsdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <button
                    onClick={() => onConfigChange({ ...config, simBalance: Math.floor(realUsdtBalance * 100) / 100 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${Math.abs(config.simBalance - realUsdtBalance) < 0.01 ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-300 hover:bg-[#3B4049]'}`}
                  >
                    Use All
                  </button>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 5000, 10000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => onConfigChange({ ...config, simBalance: amount })}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${config.simBalance === amount ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-[#F0B90B]' : 'border-[#2B3139] bg-[#1E2026] text-gray-300'}`}
                  >
                    ${amount >= 1000 ? `${amount / 1000}K` : amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#1E2026] rounded-2xl p-4 border border-[#2B3139]">
              <h4 className="text-sm font-semibold text-white mb-3">Configuration Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Strategy</span>
                  <span className="text-white font-medium">{STRATEGY_CONFIGS[config.strategy]?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Coins</span>
                  <span className="text-white font-medium">{config.selectedCoins.length} selected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Level</span>
                  <span className="text-white font-medium capitalize">{config.riskLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Leverage</span>
                  <span className="text-white font-medium">{config.leverage}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Starting Balance</span>
                  <span className="text-[#F0B90B] font-medium">${config.simBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('coins')} className="flex-1 py-4 rounded-2xl border border-[#2B3139] text-gray-300 font-semibold">Back</button>
              <button
                onClick={onStart}
                className="flex-1 py-4 rounded-2xl bg-[#F0B90B] text-black font-bold text-base"
              >
                Start Bot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getCMCId(symbol: string): number {
  const map: Record<string, number> = {
    BTC: 1, ETH: 1027, BNB: 1839, SOL: 5426, XRP: 52,
    ADA: 2010, DOGE: 74, AVAX: 5805, LINK: 1975, DOT: 6636,
  };
  return map[symbol] || 1;
}

import { UserPlus, TrendingUp, DollarSign, Award } from 'lucide-react';

export default function ReferralHowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      color: 'text-[#F0B90B]',
      bg: 'bg-[#F0B90B]/15',
      title: 'Invite Friends',
      desc: 'Share your unique referral link or code with friends',
    },
    {
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
      title: 'They Trade',
      desc: 'Your friends sign up and start trading on BASONCE',
    },
    {
      icon: DollarSign,
      color: 'text-[#0ECB81]',
      bg: 'bg-[#0ECB81]/15',
      title: 'Earn USDT',
      desc: 'Get 20% of their trading fees paid to you in USDT instantly',
    },
  ];

  return (
    <div className="px-4 space-y-3">
      <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-[#F0B90B]" />
          <span className="font-bold text-white">How It Works</span>
        </div>

        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl ${step.bg} flex items-center justify-center flex-shrink-0`}>
                <step.icon className={`w-4.5 h-4.5 ${step.color}`} />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="font-bold text-white text-sm mb-0.5">{step.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{step.desc}</div>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#2B3139] flex items-center justify-center flex-shrink-0 mt-1.5">
                <span className="text-xs font-black text-gray-300">{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#F0B90B]/10 to-[#0ECB81]/10 border border-[#F0B90B]/20 rounded-2xl p-4">
        <div className="text-xs font-bold text-[#F0B90B] mb-2 uppercase tracking-wider">VIP Bonus</div>
        <div className="text-sm text-white font-bold mb-1">Refer 10+ Active Traders</div>
        <div className="text-xs text-gray-400">
          Unlock VIP status and earn up to <span className="text-[#F0B90B] font-bold">25% commission</span> on all future trades
        </div>
      </div>

      <div className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-4">
        <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Commission Tiers</div>
        <div className="space-y-2">
          {[
            { label: 'Standard', range: '0-9 referrals', rate: '20%', color: 'text-gray-300' },
            { label: 'Silver', range: '10-49 referrals', rate: '22%', color: 'text-gray-300' },
            { label: 'Gold', range: '50-99 referrals', rate: '23%', color: 'text-[#F0B90B]' },
            { label: 'Platinum', range: '100+ referrals', rate: '25%', color: 'text-[#0ECB81]' },
          ].map((tier) => (
            <div key={tier.label} className="flex items-center justify-between">
              <div>
                <span className={`text-sm font-bold ${tier.color}`}>{tier.label}</span>
                <span className="text-xs text-gray-500 ml-2">{tier.range}</span>
              </div>
              <span className={`font-black text-sm ${tier.color}`}>{tier.rate}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

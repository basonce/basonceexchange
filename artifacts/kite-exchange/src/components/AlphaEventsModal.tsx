import { X, Gift, Trophy, Zap, TrendingUp, Clock } from 'lucide-react';

interface AlphaEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlphaEventsModal({ isOpen, onClose }: AlphaEventsModalProps) {
  if (!isOpen) return null;

  const campaigns = [
    {
      id: 1,
      title: '38,000,000 FOGO Reward Pool',
      description: 'Trade FOGO and win from massive prize pool',
      prize: '38M FOGO',
      endDate: '2026-02-15',
      participants: '125,430',
      icon: Gift,
      gradient: 'from-orange-500 to-red-500',
      status: 'hot'
    },
    {
      id: 2,
      title: 'EarnQuest (EQ) Launch Airdrop',
      description: 'First 10,000 traders get free EQ tokens',
      prize: '100M EQ',
      endDate: '2026-02-20',
      participants: '8,542',
      icon: Zap,
      gradient: 'from-yellow-400 to-orange-500',
      status: 'new'
    },
    {
      id: 3,
      title: 'Trading Competition',
      description: 'Highest volume traders win premium rewards',
      prize: '$50,000 USDT',
      endDate: '2026-02-28',
      participants: '45,892',
      icon: Trophy,
      gradient: 'from-blue-500 to-purple-500',
      status: 'ongoing'
    },
    {
      id: 4,
      title: 'New Listing Celebration',
      description: 'Trade new listed tokens for bonus rewards',
      prize: '$25,000 USDT',
      endDate: '2026-02-10',
      participants: '32,109',
      icon: TrendingUp,
      gradient: 'from-green-500 to-teal-500',
      status: 'hot'
    }
  ];

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const distance = end - now;
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    return `${days} days left`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-[#181A20] w-full rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Alpha Events</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="px-4 pt-4 space-y-4">
            {campaigns.map((campaign) => {
              const Icon = campaign.icon;
              return (
                <div
                  key={campaign.id}
                  className="bg-[#181A20] rounded-xl overflow-hidden border border-[#2B3139] hover:border-[#F0B90B]/50 transition-all"
                >
                  <div className={`h-2 bg-gradient-to-r ${campaign.gradient}`} />

                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${campaign.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm">{campaign.title}</h3>
                          {campaign.status === 'hot' && (
                            <span className="font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">HOT</span>
                          )}
                          {campaign.status === 'new' && (
                            <span className="font-bold bg-[#F0B90B] text-black px-1.5 py-0.5 rounded">NEW</span>
                          )}
                        </div>
                        <p className="text-xs mb-2">{campaign.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-[#2B3139] rounded-lg p-2">
                        <div className="text-[10px] mb-1">Prize Pool</div>
                        <div className="font-bold text-xs">{campaign.prize}</div>
                      </div>
                      <div className="bg-[#2B3139] rounded-lg p-2">
                        <div className="text-[10px] mb-1">Participants</div>
                        <div className="font-bold text-xs">{campaign.participants}</div>
                      </div>
                      <div className="bg-[#2B3139] rounded-lg p-2">
                        <div className="text-[10px] mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Ends In
                        </div>
                        <div className="font-bold text-xs">{getTimeRemaining(campaign.endDate)}</div>
                      </div>
                    </div>

                    <button className={`w-full bg-gradient-to-r ${campaign.gradient} text-white font-bold py-2.5 rounded-lg hover:opacity-90 transition-all`}>
                      Join Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 mt-6">
            <div className="bg-gradient-to-br from-[#F0B90B]/10 to-transparent border border-[#F0B90B]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-[#F0B90B]" />
                <h3 className="font-bold text-sm">More Rewards Coming Soon!</h3>
              </div>
              <p className="text-xs">
                Stay tuned for exclusive airdrops, trading competitions, and special events. Follow us to never miss an opportunity!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

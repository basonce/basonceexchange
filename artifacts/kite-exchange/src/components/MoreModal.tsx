import { X, Crown, Code, Shield, FileText, GraduationCap, Gift, Settings, Bell, HelpCircle, Globe, Moon, ChevronRight } from 'lucide-react';

interface MoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MoreModal({ isOpen, onClose }: MoreModalProps) {
  if (!isOpen) return null;

  const menuSections = [
    {
      title: 'Account & Services',
      items: [
        {
          id: 1,
          title: 'VIP Program',
          description: 'Exclusive benefits & lower fees',
          icon: Crown,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          badge: 'Premium'
        },
        {
          id: 2,
          title: 'API Management',
          description: 'Connect trading bots & apps',
          icon: Code,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10'
        },
        {
          id: 3,
          title: 'Security Center',
          description: '2FA, passwords & verification',
          icon: Shield,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10'
        },
        {
          id: 4,
          title: 'Tax Reports',
          description: 'Download your trading history',
          icon: FileText,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10'
        }
      ]
    },
    {
      title: 'Rewards & Bonuses',
      items: [
        {
          id: 5,
          title: 'Learn & Earn',
          description: 'Complete courses, earn crypto',
          icon: GraduationCap,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          badge: 'New'
        },
        {
          id: 6,
          title: 'Gift Cards',
          description: 'Buy & redeem gift cards',
          icon: Gift,
          color: 'text-pink-400',
          bgColor: 'bg-pink-500/10'
        }
      ]
    },
    {
      title: 'Settings & Support',
      items: [
        {
          id: 7,
          title: 'App Settings',
          description: 'Preferences & configurations',
          icon: Settings,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10'
        },
        {
          id: 8,
          title: 'Notifications',
          description: 'Manage alerts & notifications',
          icon: Bell,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10'
        },
        {
          id: 9,
          title: 'Help Center',
          description: 'FAQs & support articles',
          icon: HelpCircle,
          color: 'text-teal-400',
          bgColor: 'bg-teal-500/10'
        },
        {
          id: 10,
          title: 'Language',
          description: 'English',
          icon: Globe,
          color: 'text-indigo-400',
          bgColor: 'bg-indigo-500/10'
        },
        {
          id: 11,
          title: 'Dark Mode',
          description: 'Always on',
          icon: Moon,
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/10'
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-[#181A20] w-full rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">More</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-4">
              <div className="px-4 py-3">
                <h3 className="text-xs font-bold uppercase">{section.title}</h3>
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className="w-full bg-[#181A20] hover:bg-[#2B3139] px-4 py-3 flex items-center gap-3 transition-all"
                    >
                      <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{item.title}</span>
                          {item.badge && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${ item.badge === 'Premium' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' : 'bg-[#F0B90B] text-black' }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs">{item.description}</p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="px-4 mt-6">
            <div className="bg-gradient-to-br from-[#F0B90B]/20 to-transparent border border-[#F0B90B]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-[#F0B90B]" />
                <h3 className="font-bold text-sm">Upgrade to VIP</h3>
              </div>
              <p className="text-xs mb-3">
                Get lower trading fees, priority support, and exclusive rewards
              </p>
              <button className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 font-bold py-2 rounded-lg text-sm hover:opacity-90 transition-all">
                Learn More
              </button>
            </div>
          </div>

          <div className="px-4 mt-4 pb-2">
            <div className="text-center space-y-1">
              <p className="text-[10px]">Version 2.5.0</p>
              <p className="text-[10px]">© 2026 BASONCE. All rights reserved.</p>
              <div className="flex items-center justify-center gap-3 text-gray-400 pt-2">
                <button className="hover:text-white">Terms</button>
                <span>•</span>
                <button className="hover:text-white">Privacy</button>
                <span>•</span>
                <button className="hover:text-white">About</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

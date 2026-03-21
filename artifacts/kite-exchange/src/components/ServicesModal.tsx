import { useState, useMemo } from 'react';
import {
  ArrowLeft, Search, ArrowLeftRight, ShoppingCart, Wallet,
  FileText, Rocket, Download, UserPlus, CreditCard, ClipboardList,
  Shield, RefreshCw, TrendingUp, Bot, BarChart2, Copy,
  Users, Repeat, BarChart, Coins, Cpu, Zap, Percent,
  PiggyBank, Trophy, Gift, BookOpen, Package, Headphones,
  AlertTriangle, CheckCircle, HelpCircle, HandMetal,
  Layers, Star, Grid, Sparkles, Activity, DollarSign,
  MessageSquare, Heart, Globe, Tag, Award, Target
} from 'lucide-react';
import ServiceSubPage from './service-pages/ServiceSubPage';

interface ServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeposit?: () => void;
  onOpenReferral?: () => void;
  onOpenEarn?: () => void;
  onOpenP2P?: () => void;
  onOpenPay?: () => void;
  onNavigate?: (tab: string) => void;
  onOpenSupport?: () => void;
}

interface ServiceItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  key: string;
  accent?: boolean;
}

interface ServiceSection {
  id: string;
  title: string;
  items: ServiceItem[];
}

const SECTIONS: ServiceSection[] = [
  {
    id: 'common',
    title: 'Common Function',
    items: [
      { icon: ArrowLeftRight, label: 'Transfer', key: 'transfer' },
      { icon: ShoppingCart, label: 'Buy Crypto', key: 'buy-crypto', accent: true },
      { icon: Wallet, label: 'Basonce Wallet', key: 'wallet' },
      { icon: Package, label: 'Buy Crypto', key: 'buy-crypto-2', accent: true },
      { icon: FileText, label: 'Account Statement', key: 'statement' },
      { icon: Rocket, label: 'Launchpool', key: 'launchpool', accent: true },
      { icon: Download, label: 'Deposit', key: 'deposit' },
      { icon: UserPlus, label: 'Referral', key: 'referral' },
      { icon: CreditCard, label: 'Pay', key: 'pay' },
      { icon: ClipboardList, label: 'Orders', key: 'orders' },
      { icon: Shield, label: 'Security', key: 'security' },
    ],
  },
  {
    id: 'activities',
    title: 'Activities and Awards',
    items: [
      { icon: Grid, label: 'WOTD', key: 'wotd', accent: true },
      { icon: Trophy, label: 'Spot Colosseum', key: 'spot-colosseum', accent: true },
      { icon: Sparkles, label: 'Basonce Junior', key: 'junior', accent: true },
      { icon: Target, label: 'Monthly Missions', key: 'missions', accent: true },
      { icon: Gift, label: 'Rewards Hub', key: 'rewards' },
      { icon: Package, label: 'My Gifts', key: 'gifts' },
      { icon: BookOpen, label: 'Learn & Earn', key: 'learn-earn' },
      { icon: Tag, label: 'Red Packet', key: 'red-packet' },
      { icon: Award, label: 'Alpha Events', key: 'alpha-events', accent: true },
    ],
  },
  {
    id: 'trade',
    title: 'Trade',
    items: [
      { icon: RefreshCw, label: 'Convert', key: 'convert' },
      { icon: BarChart2, label: 'Spot', key: 'spot' },
      { icon: Bot, label: 'Trading Bots', key: 'ai-bot', accent: true },
      { icon: Sparkles, label: 'Alpha', key: 'alpha', accent: true },
      { icon: TrendingUp, label: 'Margin', key: 'margin' },
      { icon: Activity, label: 'Futures', key: 'futures' },
      { icon: Copy, label: 'Copy Trading', key: 'copy' },
      { icon: Globe, label: 'OTC', key: 'otc' },
      { icon: Users, label: 'P2P', key: 'p2p' },
      { icon: Repeat, label: 'Convert Recurring', key: 'recurring' },
      { icon: BarChart, label: 'Options', key: 'options' },
    ],
  },
  {
    id: 'earn',
    title: 'Earn',
    items: [
      { icon: Coins, label: 'ETH Staking', key: 'eth-staking', accent: true },
      { icon: PiggyBank, label: 'Earn', key: 'earn' },
      { icon: Zap, label: 'SOL Staking', key: 'sol-staking', accent: true },
      { icon: Cpu, label: 'Smart Arbitrage', key: 'arbitrage', accent: true },
      { icon: DollarSign, label: 'On-chain Yields', key: 'onchain' },
      { icon: Trophy, label: 'Yield Arena', key: 'yield-arena', accent: true },
      { icon: Target, label: 'Super Mine', key: 'super-mine', accent: true },
      { icon: Percent, label: 'Discount Buy', key: 'discount' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    items: [
      { icon: Wallet, label: 'Spot Wallet', key: 'spot-wallet' },
      { icon: TrendingUp, label: 'Futures Wallet', key: 'futures-wallet' },
      { icon: BarChart2, label: 'Overview', key: 'overview' },
      { icon: FileText, label: 'History', key: 'history' },
      { icon: ArrowLeftRight, label: 'Transfer', key: 'finance-transfer' },
      { icon: Download, label: 'Deposit', key: 'finance-deposit' },
      { icon: CreditCard, label: 'Withdraw', key: 'withdraw' },
    ],
  },
  {
    id: 'news',
    title: 'News',
    items: [
      { icon: MessageSquare, label: 'Square', key: 'square' },
      { icon: Activity, label: 'Market Updates', key: 'market-updates' },
      { icon: Sparkles, label: 'Alpha News', key: 'alpha-news', accent: true },
      { icon: BookOpen, label: 'Research', key: 'research' },
      { icon: Globe, label: 'Global News', key: 'global-news' },
    ],
  },
  {
    id: 'support',
    title: 'Help & Support',
    items: [
      { icon: AlertTriangle, label: 'Action Required', key: 'action' },
      { icon: CheckCircle, label: 'Basonce Verify', key: 'verify' },
      { icon: HelpCircle, label: 'FAQ', key: 'faq' },
      { icon: Headphones, label: 'Customer Service', key: 'support' },
      { icon: HandMetal, label: 'Self Service', key: 'self-service' },
    ],
  },
  {
    id: 'other',
    title: 'Other',
    items: [
      { icon: Layers, label: 'Basonce NFT', key: 'nft', accent: true },
      { icon: Heart, label: 'Megadrop', key: 'megadrop', accent: true },
      { icon: Gift, label: 'Gift Card', key: 'gift-card' },
      { icon: TrendingUp, label: 'Trading Insight', key: 'insight' },
      { icon: Activity, label: 'API Management', key: 'api' },
      { icon: Star, label: 'Fan Token', key: 'fan-token', accent: true },
      { icon: Grid, label: 'Marketplace', key: 'marketplace' },
      { icon: CheckCircle, label: 'BABT', key: 'babt' },
      { icon: DollarSign, label: 'Send Cash', key: 'send-cash' },
      { icon: Heart, label: 'Charity', key: 'charity', accent: true },
    ],
  },
];

const TAB_IDS = ['common', 'activities', 'trade', 'earn', 'finance', 'news', 'support', 'other'];
const TAB_LABELS: Record<string, string> = {
  common: 'Common Function',
  activities: 'Activities and Awards',
  trade: 'Trade',
  earn: 'Earn',
  finance: 'Finance',
  news: 'News',
  support: 'Help & Support',
  other: 'Other',
};

function ServiceIcon({ Icon, accent }: { Icon: React.ComponentType<{ className?: string }>; accent?: boolean }) {
  return (
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-active:scale-95 ${accent ? 'bg-[#1E2329]' : 'bg-[#1E2329]'}`}>
      <Icon className={`w-6 h-6 ${accent ? 'text-[#F0B90B]' : 'text-white'}`} />
    </div>
  );
}

export default function ServicesModal({
  isOpen,
  onClose,
  onOpenDeposit,
  onOpenReferral,
  onOpenEarn,
  onOpenP2P,
  onOpenPay,
  onNavigate,
  onOpenSupport,
}: ServicesModalProps) {
  const [activeTab, setActiveTab] = useState('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeService, setActiveService] = useState<string | null>(null);

  const DIRECT_ACTIONS = ['deposit', 'finance-deposit', 'referral', 'earn', 'p2p', 'pay', 'support', 'futures', 'spot', 'ai-bot', 'copy', 'buy-crypto', 'buy-crypto-2'];

  const handleAction = (key: string) => {
    if (DIRECT_ACTIONS.includes(key)) {
      onClose();
      setTimeout(() => {
        if (key === 'deposit' || key === 'finance-deposit') onOpenDeposit?.();
        else if (key === 'referral') onOpenReferral?.();
        else if (key === 'earn') onOpenEarn?.();
        else if (key === 'p2p') onOpenP2P?.();
        else if (key === 'pay') onOpenPay?.();
        else if (key === 'support') onOpenSupport?.();
        else if (key === 'futures') onNavigate?.('futures');
        else if (key === 'spot') onNavigate?.('trade');
        else if (key === 'ai-bot') onNavigate?.('ai-bot');
        else if (key === 'copy') onNavigate?.('trade');
        else if (key === 'buy-crypto' || key === 'buy-crypto-2') onOpenDeposit?.();
      }, 200);
    } else {
      setActiveService(key);
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: ServiceItem[] = [];
    SECTIONS.forEach(s => {
      s.items.forEach(item => {
        if (item.label.toLowerCase().includes(q)) results.push(item);
      });
    });
    return results;
  }, [searchQuery]);

  const activeSection = SECTIONS.find(s => s.id === activeTab);

  if (!isOpen) return null;

  return (
    <>
    {activeService && (
      <ServiceSubPage
        serviceKey={activeService}
        onClose={() => setActiveService(null)}
        onOpenDeposit={onOpenDeposit}
        onOpenReferral={onOpenReferral}
        onOpenEarn={onOpenEarn}
        onOpenP2P={onOpenP2P}
        onOpenPay={onOpenPay}
        onOpenSupport={onOpenSupport}
        onNavigate={onNavigate}
      />
    )}
    <div className="fixed inset-0 bg-[#0B0E11] z-[60] flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1E2329] transition-colors text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-xl flex-1 text-center pr-9">Services</h1>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search more services"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#1E2329] text-white text-sm pl-10 pr-4 py-3 rounded-xl outline-none placeholder-gray-600 border border-transparent focus:border-[#F0B90B]/30 transition-colors"
          />
        </div>
      </div>

      {/* Tabs */}
      {!searchQuery && (
        <div className="px-4 pb-3 shrink-0">
          <div className="flex gap-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TAB_IDS.map(id => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative text-sm font-semibold whitespace-nowrap pb-2.5 transition-colors shrink-0 ${
                  activeTab === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {TAB_LABELS[id]}
                {activeTab === id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F0B90B] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8" style={{ scrollbarWidth: 'none' }}>
        {searchResults !== null ? (
          <>
            <p className="text-gray-500 text-xs mb-4">{searchResults.length} results</p>
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search className="w-10 h-10 text-gray-700" />
                <p className="text-gray-500 text-sm">No services found</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-x-2 gap-y-5">
                {searchResults.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleAction(item.key)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <ServiceIcon Icon={Icon} accent={item.accent} />
                      <span className="text-gray-300 text-[11px] text-center leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : activeSection ? (
          <>
            <h2 className="text-white font-bold text-[17px] mb-4">{activeSection.title}</h2>
            <div className="grid grid-cols-4 gap-x-2 gap-y-5">
              {activeSection.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleAction(item.key)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <ServiceIcon Icon={Icon} accent={item.accent} />
                    <span className="text-gray-300 text-[11px] text-center leading-tight px-1">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
    </>
  );
}

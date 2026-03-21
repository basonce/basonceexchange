import { X, CreditCard, Building2, Users, ArrowRightLeft, Shield, Clock } from 'lucide-react';

interface DepositUSDModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositUSDModal({ isOpen, onClose }: DepositUSDModalProps) {
  if (!isOpen) return null;

  const depositMethods = [
    {
      id: 1,
      title: 'Credit/Debit Card',
      description: 'Instant deposit with Visa, Mastercard',
      icon: CreditCard,
      fee: '2.5%',
      limit: '$50,000',
      processingTime: 'Instant',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      recommended: true
    },
    {
      id: 2,
      title: 'Bank Transfer',
      description: 'Wire transfer from your bank account',
      icon: Building2,
      fee: '$15',
      limit: '$1,000,000',
      processingTime: '1-3 Days',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      id: 3,
      title: 'P2P Trading',
      description: 'Buy crypto from verified merchants',
      icon: Users,
      fee: '0%',
      limit: '$100,000',
      processingTime: '5-30 Min',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      popular: true
    },
    {
      id: 4,
      title: 'Crypto Swap',
      description: 'Deposit other cryptocurrencies',
      icon: ArrowRightLeft,
      fee: '0.1%',
      limit: 'Unlimited',
      processingTime: '10-30 Min',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    }
  ];

  const popularCoins = [
    { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
    { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
    { symbol: 'USDT', name: 'Tether', color: '#26A17B' },
    { symbol: 'BNB', name: 'BNB', color: '#F0B90B' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-[#181A20] w-full rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Deposit Funds</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          <div className="bg-gradient-to-br from-[#F0B90B]/20 to-transparent p-6 mb-4">
            <h3 className="text-xl font-bold mb-2">Fund Your Account</h3>
            <p className="text-sm">Choose your preferred deposit method</p>
          </div>

          <div className="px-4 space-y-3 mb-6">
            {depositMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div
                  key={method.id}
                  className="bg-[#181A20] rounded-xl p-4 border border-[#2B3139] hover:border-[#F0B90B]/50 transition-all cursor-pointer"
                >
                  {(method.recommended || method.popular) && (
                    <div className="mb-3 flex items-center gap-2">
                      {method.recommended && (
                        <span className="font-bold bg-[#F0B90B] text-black px-2 py-1 rounded">
                          RECOMMENDED
                        </span>
                      )}
                      {method.popular && (
                        <span className="font-bold bg-purple-500 text-white px-2 py-1 rounded">
                          POPULAR
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl ${method.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${method.color}`} />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-white font-bold mb-1">{method.title}</h3>
                      <p className="text-xs">{method.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[#2B3139] rounded-lg p-2">
                      <div className="text-[10px] mb-1">Fee</div>
                      <div className="font-bold text-xs">{method.fee}</div>
                    </div>
                    <div className="bg-[#2B3139] rounded-lg p-2">
                      <div className="text-[10px] mb-1">Limit</div>
                      <div className="font-bold text-xs">{method.limit}</div>
                    </div>
                    <div className="bg-[#2B3139] rounded-lg p-2">
                      <div className="text-[10px] mb-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Time
                      </div>
                      <div className="font-bold text-xs">{method.processingTime}</div>
                    </div>
                  </div>

                  <button className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 font-bold py-2 rounded-lg text-sm transition-all">
                    Deposit Now
                  </button>
                </div>
              );
            })}
          </div>

          <div className="px-4 mb-6">
            <h3 className="font-bold mb-3 text-sm">Quick Crypto Deposit</h3>
            <div className="grid grid-cols-4 gap-2">
              {popularCoins.map((coin) => (
                <button
                  key={coin.symbol}
                  className="bg-[#181A20] rounded-xl p-3 border border-[#2B3139] hover:border-[#F0B90B]/50 transition-all flex flex-col items-center"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center mb-1.5 text-white font-black text-[11px]"
                    style={{ background: `linear-gradient(135deg, ${coin.color}ee, ${coin.color}88)` }}
                  >
                    {coin.symbol === 'BTC' ? '₿' : coin.symbol === 'ETH' ? 'Ξ' : coin.symbol.slice(0, 2)}
                  </div>
                  <div className="text-[10px] font-bold text-white">{coin.symbol}</div>
                  <div className="text-[9px] text-gray-500 truncate w-full text-center">{coin.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4">
            <div className="bg-[#181A20] rounded-xl p-4 border border-[#2B3139]">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-[#0ECB81]" />
                <h3 className="text-white font-bold">Secure & Protected</h3>
              </div>
              <div className="space-y-2 text-gray-400">
                <p>• All transactions are encrypted with SSL technology</p>
                <p>• Your payment information is never stored</p>
                <p>• 24/7 fraud monitoring and protection</p>
                <p>• Compliance with international financial regulations</p>
                <p>• Instant KYC verification for faster processing</p>
              </div>
            </div>
          </div>

          <div className="px-4 mt-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/30 rounded-xl p-4">
              <h3 className="font-bold mb-2 text-sm">First Deposit Bonus</h3>
              <p className="text-xs mb-2">
                Get 20 USDT bonus on your first deposit of $100 or more!
              </p>
              <button className="text-xs font-bold">Learn More →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

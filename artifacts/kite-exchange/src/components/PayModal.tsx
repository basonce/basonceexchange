import { useState } from 'react';
import { X, QrCode, Send, Clock, Copy, CheckCircle, Smartphone, Scan } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PayModal({ isOpen, onClose }: PayModalProps) {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [sendMethod, setSendMethod] = useState<'phone' | 'address'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('USDT');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const myAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9';

  const handleCopy = () => {
    navigator.clipboard.writeText(myAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recentTransactions = [
    {
      id: 1,
      type: 'sent',
      name: 'John Doe',
      phone: '+1 234 567 8900',
      amount: 150.50,
      crypto: 'USDT',
      time: '2 hours ago',
      status: 'completed'
    },
    {
      id: 2,
      type: 'received',
      name: 'Sarah Smith',
      phone: '+1 234 567 8901',
      amount: 500.00,
      crypto: 'USDT',
      time: '5 hours ago',
      status: 'completed'
    },
    {
      id: 3,
      type: 'sent',
      name: 'Mike Johnson',
      phone: '+1 234 567 8902',
      amount: 75.25,
      crypto: 'USDT',
      time: '1 day ago',
      status: 'completed'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
      <div className="bg-[#181A20] w-full max-w-[480px] rounded-t-2xl h-[95vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-[#181A20] border-[#2B3139] px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Pay</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-[#181A20] px-4 py-3 border-[#2B3139]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${ activeTab === 'send' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Send
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${ activeTab === 'receive' ? 'bg-[#F0B90B] text-black' : 'bg-[#2B3139] text-gray-400' }`}
            >
              Receive
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {activeTab === 'send' && (
            <div className="px-4 py-6">
              <div className="bg-[#181A20] rounded-xl p-4 mb-4 border border-[#2B3139]">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setSendMethod('phone')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${ sendMethod === 'phone' ? 'bg-[#2B3139] text-white' : 'text-gray-400' }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Phone Number
                  </button>
                  <button
                    onClick={() => setSendMethod('address')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${ sendMethod === 'address' ? 'bg-[#2B3139] text-white' : 'text-gray-400' }`}
                  >
                    <QrCode className="w-4 h-4" />
                    Address
                  </button>
                </div>

                {sendMethod === 'phone' ? (
                  <div className="mb-4">
                    <label className="text-xs mb-2 block">Phone Number</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-[#2B3139] pl-10 pr-3 py-3 rounded-lg text-sm placeholder-[#5E6673] focus:ring-[#F0B90B]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="text-xs mb-2 block">Recipient Address</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0x..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-[#2B3139] pl-3 pr-20 py-3 rounded-lg text-sm placeholder-[#5E6673] focus:ring-[#F0B90B]"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#F0B90B] px-3 py-1.5 rounded text-xs font-bold hover:bg-[#F0B90B]/90 transition-all">
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="text-xs mb-2 block">Select Crypto</label>
                  <select
                    value={selectedCrypto}
                    onChange={(e) => setSelectedCrypto(e.target.value)}
                    className="w-full bg-[#2B3139] px-3 py-3 rounded-lg text-sm focus:ring-[#F0B90B]"
                  >
                    <option value="USDT">USDT</option>
                    <option value="BTC">Bitcoin</option>
                    <option value="ETH">Ethereum</option>
                    <option value="BNB">BNB</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="text-xs mb-2 block">Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#2B3139] px-3 py-3 rounded-lg text-sm placeholder-[#5E6673] focus:ring-[#F0B90B]"
                  />
                </div>

                <button className="w-full bg-[#F0B90B] hover:bg-[#F0B90B]/90 font-bold py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Send {selectedCrypto}
                </button>
              </div>

              <div className="mb-4">
                <h3 className="font-medium text-sm mb-3">Recent Transactions</h3>
                <div className="space-y-2">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-[#181A20] border border-[#2B3139] rounded-lg p-3 hover:border-[#F0B90B]/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ tx.type === 'sent' ? 'bg-[#F6465D]/10' : 'bg-[#0ECB81]/10' }`}>
                            <Send className={`w-4 h-4 ${ tx.type === 'sent' ? 'text-[#F6465D]' : 'text-[#0ECB81] rotate-180' }`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{tx.name}</div>
                            <div className="text-xs">{tx.phone}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${ tx.type === 'sent' ? 'text-[#F6465D]' : 'text-[#0ECB81]' }`}>
                            {tx.type === 'sent' ? '-' : '+'}{tx.amount} {tx.crypto}
                          </div>
                          <div className="text-xs">{tx.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'receive' && (
            <div className="px-4 py-6 pb-24">
              <div className="bg-[#181A20] rounded-xl p-6 mb-4 border border-[#2B3139] text-center">
                <h3 className="font-medium text-sm mb-4">Your Payment QR Code</h3>

                <div className="bg-white p-4 rounded-xl mb-4 inline-block">
                  <QRCodeSVG
                    value={myAddress}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="mb-4">
                  <label className="text-xs mb-2 block">Your Address</label>
                  <div className="bg-[#2B3139] rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs font-mono">
                      {myAddress.slice(0, 12)}...{myAddress.slice(-10)}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="text-[#F0B90B] hover:text-[#F0B90B] transition-all"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs">
                  Share this QR code or address to receive payments
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#F0B90B]/10 to-transparent border border-[#F0B90B]/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#F0B90B]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#F0B90B]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Instant Payments</h4>
                    <p className="text-xs">
                      Receive crypto payments instantly with zero fees using phone numbers or QR codes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

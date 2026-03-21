import { useState } from 'react';
import { Wallet, Copy, Check } from 'lucide-react';

export function WalletConnect() {
  const [copied, setCopied] = useState(false);
  const [address] = useState<string | null>(null);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (address) {
    return (
      <div className="bg-[#2B3139] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#F0B90B] rounded-full flex items-center justify-center">
              <Wallet className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="text-gray-400">Connected Wallet</div>
              <div className="font-semibold text-white">{formatAddress(address)}</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full bg-[#353D47] hover:bg-[#3D454F] py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Address
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#2B3139] rounded-xl p-4">
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-[#F0B90B]/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <Wallet className="w-8 h-8 text-[#F0B90B]" />
        </div>
        <h3 className="text-white font-semibold mb-1">Connect Your Wallet</h3>
        <p className="text-sm text-gray-400">
          Connect your wallet to deposit and withdraw crypto
        </p>
      </div>
    </div>
  );
}

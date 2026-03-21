import { useState } from 'react';
import { Copy, Check, Share2, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ReferralShareCardProps {
  referralCode: string;
  commissionRate: number;
}

export default function ReferralShareCard({ referralCode, commissionRate }: ReferralShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BASONCE Exchange',
          text: `Trade crypto on BASONCE and we both earn! Use my referral code: ${referralCode}`,
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="px-4">
      <div className="bg-gradient-to-br from-[#F0B90B]/10 via-[#181A20] to-[#181A20] border border-[#F0B90B]/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Commission Rate</div>
            <div className="text-3xl font-black text-[#F0B90B]">{(commissionRate * 100).toFixed(0)}%</div>
            <div className="text-xs text-gray-500 mt-0.5">per trade fee · paid in USDT</div>
          </div>
          <button
            onClick={() => setShowQR(true)}
            className="w-12 h-12 bg-[#2B3139] rounded-xl flex items-center justify-center hover:bg-[#363D47] transition-colors"
          >
            <QrCode className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="bg-[#0B0E11] rounded-xl p-3 mb-3 border border-[#2B3139]">
          <div className="text-xs text-gray-500 mb-1.5">Your Referral Code</div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-black text-white tracking-widest">{referralCode}</div>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 text-xs text-[#F0B90B] hover:text-[#F0B90B]/80 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-[#0B0E11] rounded-xl p-3 mb-4 border border-[#2B3139]">
          <div className="text-xs text-gray-500 mb-1.5">Referral Link</div>
          <div className="text-xs text-gray-300 break-all leading-relaxed">{referralLink}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={copyLink}
            className="flex items-center justify-center gap-2 py-3 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-black font-bold rounded-xl text-sm transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={shareLink}
            className="flex items-center justify-center gap-2 py-3 bg-[#2B3139] hover:bg-[#363D47] text-white font-bold rounded-xl text-sm transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-[#181A20] rounded-2xl p-6 border border-[#2B3139] w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-white">Scan QR Code</div>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={referralLink} size={200} />
              </div>
            </div>
            <div className="text-center text-xs text-gray-400">
              Scan to join with your referral code
            </div>
            <div className="mt-2 text-center text-sm font-bold text-[#F0B90B] tracking-widest">{referralCode}</div>
          </div>
        </div>
      )}
    </div>
  );
}

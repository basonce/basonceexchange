import { useState, useRef, useEffect } from 'react';
import { X, Download, Copy, Check, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { supabase, getCurrentUser } from '../../lib/supabase';

interface DesktopSharePositionCardProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    symbol: string;
    side: string;
    leverage: number;
    entry_price: number;
    position_size: number;
    margin: number;
  };
  currentPrice: number;
  pnlAmount: number;
  pnlPercentage: number;
}

/** Strip BDEX_ prefix for display */
function displaySymbol(raw: string): string {
  return raw.startsWith('BDEX_') ? raw.slice(5) : raw;
}

export default function DesktopSharePositionCard({
  isOpen,
  onClose,
  position,
  currentPrice,
  pnlAmount,
  pnlPercentage,
}: DesktopSharePositionCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referralCode, setReferralCode] = useState('BASONCE');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.referral_code) setReferralCode(data.referral_code);
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isProfitable = pnlAmount >= 0;
  const side = (position.side || '').toUpperCase();
  const sideLabel = side === 'LONG' ? 'Long' : 'Short';
  const sideColor = side === 'LONG' ? '#0ECB81' : '#F6465D';
  const pnlColor = isProfitable ? '#0ECB81' : '#F6465D';
  const pnlSign = isProfitable ? '+' : '';

  const formatPrice = (p: number) =>
    p < 1
      ? p.toFixed(6)
      : p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });

  const entryFmt = formatPrice(position.entry_price);
  const lastFmt = formatPrice(currentPrice);

  const pnlAmtFmt = (() => {
    const abs = Math.abs(pnlAmount);
    const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${pnlSign}${formatted}`;
  })();

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Auto-fit %: scale font to the string length so long values never clip.
  // Usable width inside the 520px card ≈ 440px.
  const pnlPctText = `${pnlSign}${pnlPercentage.toFixed(2)}%`;
  const pnlPctLen = pnlPctText.length;
  const pnlFontSize =
    pnlPctLen <= 6 ? 112 :  // e.g. "5.32%"
    pnlPctLen === 7 ? 96 :  // e.g. "+25.39%"
    pnlPctLen === 8 ? 82 :  // e.g. "+125.39%"
    pnlPctLen === 9 ? 70 :  // e.g. "+1234.56%"
    60;                     // very large (>=10 chars)

  const referralUrl = `https://basonce.com?ref=${referralCode}`;

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0B0E11',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 10000,
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `basonce-${displaySymbol(position.symbol)}-${dateStr.replace(/[: ]/g, '-')}.png`;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0B0E11',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const sym = displaySymbol(position.symbol);
        const file = new File([blob], `basonce-${sym}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Basonce ${sym} ${pnlSign}${pnlPercentage.toFixed(2)}%` });
        } else {
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = url;
          link.download = `basonce-${sym}.png`;
          link.click();
        }
      }, 'image/png');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    const text = `${displaySymbol(position.symbol)} Perpetual\n${sideLabel} | ${position.leverage}x\n${pnlSign}${pnlPercentage.toFixed(2)}%\n${pnlAmtFmt} USDT\nEntry: ${entryFmt} | Last: ${lastFmt}\nbasonce.com?ref=${referralCode}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div className="w-full max-w-[560px] my-auto" onClick={(e) => e.stopPropagation()}>

        {/* Action toolbar */}
        <div className="flex items-center justify-end mb-4 gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-[#2B3139] hover:bg-[#363D47] text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-[#0ECB81]" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleShare}
            disabled={saving}
            className="flex items-center gap-2 bg-[#2B3139] hover:bg-[#363D47] text-white text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={handleSaveImage}
            disabled={saving}
            className="flex items-center gap-2 bg-[#F0B90B] hover:bg-[#d4a50a] text-black text-sm font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="bg-[#2B3139] hover:bg-[#363D47] text-white p-2.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* The card that gets captured */}
        <div
          ref={cardRef}
          style={{
            background: '#0B0E11',
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative',
            width: '520px',
            margin: '0 auto',
            border: '1px solid #1E2329',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {/* Large watermark logo */}
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-80px',
              width: '440px',
              height: '440px',
              backgroundImage: `url('/BASONCE_LOGO_SON_BITEN.png')`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.07,
              filter: 'grayscale(100%) brightness(3)',
            }}
          />

          {/* Card content */}
          <div style={{ padding: '40px 44px 0 44px', position: 'relative', zIndex: 1 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#1E2329',
                border: '2px solid #1E2329',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                <img
                  src="/BASONCE_LOGO_SON_BITEN.png"
                  alt="Basonce"
                  style={{ width: '54px', height: '54px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                />
              </div>
              <div>
                <div style={{ color: '#EAECEF', fontWeight: 700, fontSize: '20px', lineHeight: '1.2' }}>
                  Basonce
                </div>
                <div style={{ color: '#5E6673', fontSize: '14px', marginTop: '3px' }}>
                  {dateStr}
                </div>
              </div>
            </div>

            {/* Symbol + side + leverage */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: '#EAECEF', fontWeight: 700, fontSize: '28px', marginBottom: '14px', letterSpacing: '-0.4px' }}>
                {displaySymbol(position.symbol)} Perpetual
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ color: sideColor, fontWeight: 700, fontSize: '19px' }}>
                  {sideLabel}
                </span>
                <span style={{ color: '#3D4350', fontSize: '22px', lineHeight: 1 }}>|</span>
                <span style={{ color: '#EAECEF', fontSize: '19px', fontWeight: 500 }}>
                  {position.leverage}x
                </span>
              </div>
            </div>

            {/* Big PnL % */}
            <div style={{ margin: '28px 0 6px 0' }}>
              <div style={{
                color: pnlColor,
                fontWeight: 900,
                fontSize: `${pnlFontSize}px`,
                lineHeight: 1.15,
                letterSpacing: '-1.5px',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}>
                {pnlPctText}
              </div>
              {/* USDT amount */}
              <div style={{
                color: pnlColor,
                fontWeight: 700,
                fontSize: '28px',
                marginTop: '14px',
                letterSpacing: '-0.5px',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {pnlAmtFmt} USDT
              </div>
            </div>

            {/* Spacer */}
            <div style={{ height: '32px' }} />

            {/* Separator */}
            <div style={{ height: '1px', background: '#1E2329', marginBottom: '26px' }} />

            {/* Entry / Last Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '36px' }}>
              <div>
                <div style={{ color: '#848E9C', fontSize: '14px', marginBottom: '8px' }}>Entry Price</div>
                <div style={{ color: '#EAECEF', fontWeight: 600, fontSize: '20px', fontVariantNumeric: 'tabular-nums' }}>{entryFmt}</div>
              </div>
              <div>
                <div style={{ color: '#848E9C', fontSize: '14px', marginBottom: '8px' }}>Last Price</div>
                <div style={{ color: '#EAECEF', fontWeight: 600, fontSize: '20px', fontVariantNumeric: 'tabular-nums' }}>{lastFmt}</div>
              </div>
            </div>

          </div>

          {/* Footer divider */}
          <div style={{ height: '1px', background: '#1E2329' }} />

          {/* Footer */}
          <div style={{
            padding: '22px 28px 24px 32px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            background: '#0B0E11',
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Left: logo + BASONCE FUTURES + referral */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <img
                  src="/BASONCE_LOGO_SON_BITEN.png"
                  alt="Basonce"
                  style={{ width: '34px', height: '34px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                />
                <div>
                  <div style={{ color: '#F0B90B', fontWeight: 900, fontSize: '16px', letterSpacing: '2.5px', lineHeight: '1.1' }}>
                    BASONCE
                  </div>
                  <div style={{ color: '#EAECEF', fontWeight: 700, fontSize: '13px', letterSpacing: '1.5px', marginTop: '2px' }}>
                    FUTURES
                  </div>
                </div>
              </div>
              <div style={{ color: '#848E9C', fontSize: '13px', fontWeight: 500 }}>
                Referral Code{' '}
                <span style={{ color: '#EAECEF', fontWeight: 700 }}>{referralCode}</span>
              </div>
            </div>

            {/* Right: QR + basonce.com */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
              <div style={{
                background: '#FFFFFF',
                padding: '7px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <QRCodeSVG
                  value={referralUrl}
                  size={88}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  level="M"
                />
              </div>
              <div style={{
                color: '#F0B90B',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textAlign: 'center',
              }}>
                basonce.com
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

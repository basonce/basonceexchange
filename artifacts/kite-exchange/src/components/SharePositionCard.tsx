import { useState, useRef, useEffect } from 'react';
import { X, Download, Copy, Check, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';

interface SharePositionCardProps {
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

export default function SharePositionCard({
  isOpen,
  onClose,
  position,
  currentPrice,
  pnlAmount,
  pnlPercentage,
}: SharePositionCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referralCode, setReferralCode] = useState('BASONCE');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.referral_code) setReferralCode(data.referral_code);
    })();
  }, [isOpen]);

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

  const absPercent = Math.abs(pnlPercentage);
  const pnlFontSize = absPercent >= 1000 ? 52 : absPercent >= 100 ? 64 : 80;

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
      link.download = `basonce-${position.symbol}-${dateStr.replace(/[: ]/g, '-')}.png`;
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
        const file = new File([blob], `basonce-${position.symbol}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Basonce ${position.symbol} ${pnlSign}${pnlPercentage.toFixed(2)}%` });
        } else {
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = url;
          link.download = `basonce-${position.symbol}.png`;
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
    const text = `${position.symbol} Perpetual\n${sideLabel} | ${position.leverage}x\n${pnlSign}${pnlPercentage.toFixed(2)}%\n${pnlAmtFmt} USDT\nEntry: ${entryFmt} | Last: ${lastFmt}\nbasonce.com?ref=${referralCode}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <div className="w-full max-w-[360px] my-auto" onClick={(e) => e.stopPropagation()}>

        {/* Action buttons - clean, no Turkish */}
        <div className="flex items-center justify-end mb-3 gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-[#2B3139] hover:bg-[#363D47] text-white text-xs px-3 py-2 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleShare}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#2B3139] hover:bg-[#363D47] text-white text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <button
            onClick={handleSaveImage}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#F0B90B] hover:bg-[#d4a50a] text-black text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="bg-[#2B3139] hover:bg-[#363D47] text-white p-2 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The card that gets captured */}
        <div
          ref={cardRef}
          style={{
            background: '#0B0E11',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            width: '360px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {/* Big watermark logo - full height, top right, much bigger */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              right: '-60px',
              width: '320px',
              height: '320px',
              backgroundImage: `url('/BASONCE_LOGO_SON_BITEN.png')`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.08,
              filter: 'grayscale(100%) brightness(3)',
            }}
          />

          {/* Card content */}
          <div style={{ padding: '28px 28px 0 28px', position: 'relative', zIndex: 1 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{
                width: '52px',
                height: '52px',
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
                  style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                />
              </div>
              <div>
                <div style={{ color: '#EAECEF', fontWeight: 700, fontSize: '16px', lineHeight: '1.2' }}>
                  Basonce
                </div>
                <div style={{ color: '#5E6673', fontSize: '12px', marginTop: '2px' }}>
                  {dateStr}
                </div>
              </div>
            </div>

            {/* Symbol + side + leverage */}
            <div style={{ marginBottom: '6px' }}>
              <div style={{ color: '#EAECEF', fontWeight: 700, fontSize: '22px', marginBottom: '10px', letterSpacing: '-0.3px' }}>
                {position.symbol} Perpetual
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: sideColor, fontWeight: 700, fontSize: '15px' }}>
                  {sideLabel}
                </span>
                <span style={{ color: '#3D4350', fontSize: '18px', lineHeight: 1 }}>|</span>
                <span style={{ color: '#EAECEF', fontSize: '15px', fontWeight: 500 }}>
                  {position.leverage}x
                </span>
              </div>
            </div>

            {/* Big PnL % */}
            <div style={{ margin: '20px 0 4px 0' }}>
              <div style={{
                color: pnlColor,
                fontWeight: 900,
                fontSize: `${pnlFontSize}px`,
                lineHeight: 1,
                letterSpacing: '-2px',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {pnlSign}{pnlPercentage.toFixed(2)}%
              </div>
              {/* USDT amount - bigger, with separator */}
              <div style={{
                color: pnlColor,
                fontWeight: 700,
                fontSize: '22px',
                marginTop: '10px',
                letterSpacing: '-0.5px',
              }}>
                {pnlAmtFmt} USDT
              </div>
            </div>

            {/* Spacer */}
            <div style={{ height: '24px' }} />

            {/* Thin separator line before prices */}
            <div style={{ height: '1px', background: '#1E2329', marginBottom: '20px' }} />

            {/* Entry / Last Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
              <div>
                <div style={{ color: '#848E9C', fontSize: '12px', marginBottom: '6px' }}>Entry Price</div>
                <div style={{ color: '#EAECEF', fontWeight: 600, fontSize: '16px' }}>{entryFmt}</div>
              </div>
              <div>
                <div style={{ color: '#848E9C', fontSize: '12px', marginBottom: '6px' }}>Last Price</div>
                <div style={{ color: '#EAECEF', fontWeight: 600, fontSize: '16px' }}>{lastFmt}</div>
              </div>
            </div>

          </div>

          {/* Footer divider */}
          <div style={{ height: '1px', background: '#1E2329' }} />

          {/* Footer - Binance style: left logo+name+referral, right QR */}
          <div style={{
            padding: '16px 20px 18px 22px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            background: '#0B0E11',
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Left: logo + BASONCE FUTURES + referral code */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <img
                  src="/BASONCE_LOGO_SON_BITEN.png"
                  alt="Basonce"
                  style={{ width: '26px', height: '26px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                />
                <div>
                  <div style={{ color: '#F0B90B', fontWeight: 900, fontSize: '13px', letterSpacing: '2px', lineHeight: '1.1' }}>
                    BASONCE
                  </div>
                  <div style={{ color: '#EAECEF', fontWeight: 700, fontSize: '11px', letterSpacing: '1px', marginTop: '1px' }}>
                    FUTURES
                  </div>
                </div>
              </div>
              <div style={{ color: '#848E9C', fontSize: '11px', fontWeight: 500 }}>
                Referral Code{' '}
                <span style={{ color: '#EAECEF', fontWeight: 700 }}>{referralCode}</span>
              </div>
            </div>

            {/* Right: QR code + basonce.com */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div style={{
                background: '#FFFFFF',
                padding: '5px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <QRCodeSVG
                  value={referralUrl}
                  size={64}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  level="M"
                />
              </div>
              <div style={{
                color: '#F0B90B',
                fontSize: '10px',
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

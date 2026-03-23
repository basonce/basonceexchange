import { useEffect, useRef } from 'react';

export interface AvatarColorTheme {
  ring1: string;
  ring2: string;
  ring3: string;
  glow: string;
  border: string;
}

export const AVATAR_COLOR_THEMES: AvatarColorTheme[] = [
  { ring1: '#F0B90B', ring2: '#F8C832', ring3: '#E6A800', glow: 'rgba(240,185,11,0.6)', border: '#F0B90B' },
  { ring1: '#0ECB81', ring2: '#06B96E', ring3: '#059669', glow: 'rgba(14,203,129,0.6)', border: '#0ECB81' },
  { ring1: '#F6465D', ring2: '#FF6B7A', ring3: '#D63848', glow: 'rgba(246,70,93,0.6)', border: '#F6465D' },
  { ring1: '#3B82F6', ring2: '#60A5FA', ring3: '#2563EB', glow: 'rgba(59,130,246,0.6)', border: '#3B82F6' },
  { ring1: '#F97316', ring2: '#FB923C', ring3: '#EA580C', glow: 'rgba(249,115,22,0.6)', border: '#F97316' },
  { ring1: '#06B6D4', ring2: '#22D3EE', ring3: '#0891B2', glow: 'rgba(6,182,212,0.6)', border: '#06B6D4' },
  { ring1: '#EC4899', ring2: '#F472B6', ring3: '#DB2777', glow: 'rgba(236,72,153,0.6)', border: '#EC4899' },
  { ring1: '#84CC16', ring2: '#A3E635', ring3: '#65A30D', glow: 'rgba(132,204,22,0.6)', border: '#84CC16' },
  { ring1: '#EF4444', ring2: '#F87171', ring3: '#DC2626', glow: 'rgba(239,68,68,0.6)', border: '#EF4444' },
  { ring1: '#8B5CF6', ring2: '#A78BFA', ring3: '#7C3AED', glow: 'rgba(139,92,246,0.6)', border: '#8B5CF6' },
  { ring1: '#14B8A6', ring2: '#2DD4BF', ring3: '#0D9488', glow: 'rgba(20,184,166,0.6)', border: '#14B8A6' },
  { ring1: '#F59E0B', ring2: '#FCD34D', ring3: '#D97706', glow: 'rgba(245,158,11,0.6)', border: '#F59E0B' },
  { ring1: '#10B981', ring2: '#34D399', ring3: '#059669', glow: 'rgba(16,185,129,0.6)', border: '#10B981' },
  { ring1: '#6366F1', ring2: '#818CF8', ring3: '#4F46E5', glow: 'rgba(99,102,241,0.6)', border: '#6366F1' },
  { ring1: '#D946EF', ring2: '#E879F9', ring3: '#C026D3', glow: 'rgba(217,70,239,0.6)', border: '#D946EF' },
  { ring1: '#0EA5E9', ring2: '#38BDF8', ring3: '#0284C7', glow: 'rgba(14,165,233,0.6)', border: '#0EA5E9' },
  { ring1: '#FF8C00', ring2: '#FFA500', ring3: '#FF6600', glow: 'rgba(255,140,0,0.6)', border: '#FF8C00' },
  { ring1: '#00CED1', ring2: '#20E8EB', ring3: '#009999', glow: 'rgba(0,206,209,0.6)', border: '#00CED1' },
  { ring1: '#FF4500', ring2: '#FF6347', ring3: '#CC3700', glow: 'rgba(255,69,0,0.6)', border: '#FF4500' },
  { ring1: '#32CD32', ring2: '#7FFF00', ring3: '#228B22', glow: 'rgba(50,205,50,0.6)', border: '#32CD32' },
  { ring1: '#FF1493', ring2: '#FF69B4', ring3: '#C0006A', glow: 'rgba(255,20,147,0.6)', border: '#FF1493' },
  { ring1: '#00BFFF', ring2: '#87CEEB', ring3: '#0099CC', glow: 'rgba(0,191,255,0.6)', border: '#00BFFF' },
  { ring1: '#FFD700', ring2: '#FFEC6E', ring3: '#CCA800', glow: 'rgba(255,215,0,0.6)', border: '#FFD700' },
  { ring1: '#7CFC00', ring2: '#ADFF2F', ring3: '#5CCB00', glow: 'rgba(124,252,0,0.6)', border: '#7CFC00' },
  { ring1: '#DC143C', ring2: '#FF3366', ring3: '#A50028', glow: 'rgba(220,20,60,0.6)', border: '#DC143C' },
  { ring1: '#4169E1', ring2: '#6495ED', ring3: '#2A4DB5', glow: 'rgba(65,105,225,0.6)', border: '#4169E1' },
  { ring1: '#FF6347', ring2: '#FF8566', ring3: '#CC3A27', glow: 'rgba(255,99,71,0.6)', border: '#FF6347' },
  { ring1: '#20B2AA', ring2: '#3DD5CD', ring3: '#178C84', glow: 'rgba(32,178,170,0.6)', border: '#20B2AA' },
  { ring1: '#FF7F50', ring2: '#FFA07A', ring3: '#CC5A30', glow: 'rgba(255,127,80,0.6)', border: '#FF7F50' },
  { ring1: '#9370DB', ring2: '#B48FE8', ring3: '#7045C0', glow: 'rgba(147,112,219,0.6)', border: '#9370DB' },
  { ring1: '#00FA9A', ring2: '#7FFFD4', ring3: '#00C87A', glow: 'rgba(0,250,154,0.6)', border: '#00FA9A' },
  { ring1: '#FF00FF', ring2: '#FF66FF', ring3: '#CC00CC', glow: 'rgba(255,0,255,0.6)', border: '#FF00FF' },
  { ring1: '#40E0D0', ring2: '#66FFEE', ring3: '#2ABDB0', glow: 'rgba(64,224,208,0.6)', border: '#40E0D0' },
  { ring1: '#FF8000', ring2: '#FFAB4D', ring3: '#CC6200', glow: 'rgba(255,128,0,0.6)', border: '#FF8000' },
  { ring1: '#00E5FF', ring2: '#66F0FF', ring3: '#00BBCC', glow: 'rgba(0,229,255,0.6)', border: '#00E5FF' },
  { ring1: '#ADFF2F', ring2: '#CCFF66', ring3: '#88CC00', glow: 'rgba(173,255,47,0.6)', border: '#ADFF2F' },
  { ring1: '#FF4081', ring2: '#FF80AB', ring3: '#CC0052', glow: 'rgba(255,64,129,0.6)', border: '#FF4081' },
  { ring1: '#1DE9B6', ring2: '#64FFDA', ring3: '#00B686', glow: 'rgba(29,233,182,0.6)', border: '#1DE9B6' },
  { ring1: '#FFAB40', ring2: '#FFD180', ring3: '#CC7700', glow: 'rgba(255,171,64,0.6)', border: '#FFAB40' },
  { ring1: '#69F0AE', ring2: '#B9F6CA', ring3: '#00C853', glow: 'rgba(105,240,174,0.6)', border: '#69F0AE' },
  { ring1: '#EA80FC', ring2: '#F3B3FF', ring3: '#BB00E6', glow: 'rgba(234,128,252,0.6)', border: '#EA80FC' },
  { ring1: '#40C4FF', ring2: '#80D8FF', ring3: '#0091EA', glow: 'rgba(64,196,255,0.6)', border: '#40C4FF' },
  { ring1: '#FF6D00', ring2: '#FF9E40', ring3: '#CC4A00', glow: 'rgba(255,109,0,0.6)', border: '#FF6D00' },
  { ring1: '#CCFF90', ring2: '#E6FFCC', ring3: '#76FF03', glow: 'rgba(204,255,144,0.6)', border: '#CCFF90' },
  { ring1: '#FF80AB', ring2: '#FFB3C6', ring3: '#FF1744', glow: 'rgba(255,128,171,0.6)', border: '#FF80AB' },
  { ring1: '#00B0FF', ring2: '#80D8FF', ring3: '#0091EA', glow: 'rgba(0,176,255,0.6)', border: '#00B0FF' },
  { ring1: '#FFD740', ring2: '#FFE680', ring3: '#FFAB00', glow: 'rgba(255,215,64,0.6)', border: '#FFD740' },
  { ring1: '#64DD17', ring2: '#B2FF59', ring3: '#33691E', glow: 'rgba(100,221,23,0.6)', border: '#64DD17' },
  { ring1: '#E040FB', ring2: '#F09FFF', ring3: '#AA00FF', glow: 'rgba(224,64,251,0.6)', border: '#E040FB' },
  { ring1: '#00E676', ring2: '#69F0AE', ring3: '#00C853', glow: 'rgba(0,230,118,0.6)', border: '#00E676' },
  // 50 more unique combos
  { ring1: '#FF5722', ring2: '#FF8A65', ring3: '#BF360C', glow: 'rgba(255,87,34,0.6)', border: '#FF5722' },
  { ring1: '#607D8B', ring2: '#90A4AE', ring3: '#37474F', glow: 'rgba(96,125,139,0.6)', border: '#78909C' },
  { ring1: '#795548', ring2: '#A1887F', ring3: '#4E342E', glow: 'rgba(121,85,72,0.5)', border: '#A1887F' },
  { ring1: '#E91E63', ring2: '#F06292', ring3: '#AD1457', glow: 'rgba(233,30,99,0.6)', border: '#E91E63' },
  { ring1: '#9C27B0', ring2: '#CE93D8', ring3: '#6A1B9A', glow: 'rgba(156,39,176,0.6)', border: '#9C27B0' },
  { ring1: '#3F51B5', ring2: '#7986CB', ring3: '#283593', glow: 'rgba(63,81,181,0.6)', border: '#3F51B5' },
  { ring1: '#2196F3', ring2: '#64B5F6', ring3: '#1565C0', glow: 'rgba(33,150,243,0.6)', border: '#2196F3' },
  { ring1: '#03A9F4', ring2: '#4FC3F7', ring3: '#01579B', glow: 'rgba(3,169,244,0.6)', border: '#03A9F4' },
  { ring1: '#009688', ring2: '#4DB6AC', ring3: '#004D40', glow: 'rgba(0,150,136,0.6)', border: '#009688' },
  { ring1: '#4CAF50', ring2: '#81C784', ring3: '#1B5E20', glow: 'rgba(76,175,80,0.6)', border: '#4CAF50' },
  { ring1: '#8BC34A', ring2: '#AED581', ring3: '#33691E', glow: 'rgba(139,195,74,0.6)', border: '#8BC34A' },
  { ring1: '#CDDC39', ring2: '#DCE775', ring3: '#827717', glow: 'rgba(205,220,57,0.6)', border: '#CDDC39' },
  { ring1: '#FFEB3B', ring2: '#FFF176', ring3: '#F57F17', glow: 'rgba(255,235,59,0.6)', border: '#FFEB3B' },
  { ring1: '#FFC107', ring2: '#FFD54F', ring3: '#E65100', glow: 'rgba(255,193,7,0.6)', border: '#FFC107' },
  { ring1: '#FF9800', ring2: '#FFB74D', ring3: '#E65100', glow: 'rgba(255,152,0,0.6)', border: '#FF9800' },
  { ring1: '#FF5252', ring2: '#FF8A80', ring3: '#B71C1C', glow: 'rgba(255,82,82,0.6)', border: '#FF5252' },
  { ring1: '#448AFF', ring2: '#82B1FF', ring3: '#2962FF', glow: 'rgba(68,138,255,0.6)', border: '#448AFF' },
  { ring1: '#18FFFF', ring2: '#B2EBF2', ring3: '#006064', glow: 'rgba(24,255,255,0.6)', border: '#18FFFF' },
  { ring1: '#69F0AE', ring2: '#CCFF90', ring3: '#1B5E20', glow: 'rgba(105,240,174,0.6)', border: '#69F0AE' },
  { ring1: '#EEFF41', ring2: '#F4FF81', ring3: '#827717', glow: 'rgba(238,255,65,0.6)', border: '#EEFF41' },
  { ring1: '#FFD180', ring2: '#FFE57F', ring3: '#FF6D00', glow: 'rgba(255,209,128,0.6)', border: '#FFD180' },
  { ring1: '#FF9E80', ring2: '#FCCFA8', ring3: '#DD2C00', glow: 'rgba(255,158,128,0.6)', border: '#FF9E80' },
  { ring1: '#80D8FF', ring2: '#B3E5FC', ring3: '#0091EA', glow: 'rgba(128,216,255,0.6)', border: '#80D8FF' },
  { ring1: '#A7FFEB', ring2: '#E0F7FA', ring3: '#1DE9B6', glow: 'rgba(167,255,235,0.6)', border: '#A7FFEB' },
  { ring1: '#B9F6CA', ring2: '#E8F5E9', ring3: '#00C853', glow: 'rgba(185,246,202,0.6)', border: '#B9F6CA' },
  { ring1: '#F4FF81', ring2: '#FFFDE7', ring3: '#AEEA00', glow: 'rgba(244,255,129,0.6)', border: '#F4FF81' },
  { ring1: '#FF6E40', ring2: '#FFCCBC', ring3: '#BF360C', glow: 'rgba(255,110,64,0.6)', border: '#FF6E40' },
  { ring1: '#B388FF', ring2: '#EDE7F6', ring3: '#6200EA', glow: 'rgba(179,136,255,0.6)', border: '#B388FF' },
  { ring1: '#82B1FF', ring2: '#E8EAF6', ring3: '#2962FF', glow: 'rgba(130,177,255,0.6)', border: '#82B1FF' },
  { ring1: '#FF4081', ring2: '#FCE4EC', ring3: '#C51162', glow: 'rgba(255,64,129,0.6)', border: '#FF4081' },
  { ring1: '#7C4DFF', ring2: '#D1C4E9', ring3: '#6200EA', glow: 'rgba(124,77,255,0.6)', border: '#7C4DFF' },
  { ring1: '#00BCD4', ring2: '#B2EBF2', ring3: '#006064', glow: 'rgba(0,188,212,0.6)', border: '#00BCD4' },
  { ring1: '#26C6DA', ring2: '#80DEEA', ring3: '#006064', glow: 'rgba(38,198,218,0.6)', border: '#26C6DA' },
  { ring1: '#26A69A', ring2: '#80CBC4', ring3: '#004D40', glow: 'rgba(38,166,154,0.6)', border: '#26A69A' },
  { ring1: '#66BB6A', ring2: '#A5D6A7', ring3: '#1B5E20', glow: 'rgba(102,187,106,0.6)', border: '#66BB6A' },
  { ring1: '#9CCC65', ring2: '#C5E1A5', ring3: '#33691E', glow: 'rgba(156,204,101,0.6)', border: '#9CCC65' },
  { ring1: '#D4E157', ring2: '#E6EE9C', ring3: '#827717', glow: 'rgba(212,225,87,0.6)', border: '#D4E157' },
  { ring1: '#FFCA28', ring2: '#FFF9C4', ring3: '#F57F17', glow: 'rgba(255,202,40,0.6)', border: '#FFCA28' },
  { ring1: '#FFA726', ring2: '#FFCC80', ring3: '#E65100', glow: 'rgba(255,167,38,0.6)', border: '#FFA726' },
  { ring1: '#FF7043', ring2: '#FFAB91', ring3: '#BF360C', glow: 'rgba(255,112,67,0.6)', border: '#FF7043' },
  { ring1: '#EF5350', ring2: '#FFCDD2', ring3: '#B71C1C', glow: 'rgba(239,83,80,0.6)', border: '#EF5350' },
  { ring1: '#EC407A', ring2: '#F48FB1', ring3: '#880E4F', glow: 'rgba(236,64,122,0.6)', border: '#EC407A' },
  { ring1: '#AB47BC', ring2: '#CE93D8', ring3: '#4A148C', glow: 'rgba(171,71,188,0.6)', border: '#AB47BC' },
  { ring1: '#7E57C2', ring2: '#B39DDB', ring3: '#311B92', glow: 'rgba(126,87,194,0.6)', border: '#7E57C2' },
  { ring1: '#5C6BC0', ring2: '#9FA8DA', ring3: '#1A237E', glow: 'rgba(92,107,192,0.6)', border: '#5C6BC0' },
  { ring1: '#42A5F5', ring2: '#90CAF9', ring3: '#0D47A1', glow: 'rgba(66,165,245,0.6)', border: '#42A5F5' },
  { ring1: '#29B6F6', ring2: '#81D4FA', ring3: '#01579B', glow: 'rgba(41,182,246,0.6)', border: '#29B6F6' },
  { ring1: '#26C6DA', ring2: '#80DEEA', ring3: '#006064', glow: 'rgba(38,198,218,0.55)', border: '#26C6DA' },
  { ring1: '#66BB6A', ring2: '#A5D6A7', ring3: '#2E7D32', glow: 'rgba(102,187,106,0.55)', border: '#66BB6A' },
  { ring1: '#FFA000', ring2: '#FFD54F', ring3: '#FF6F00', glow: 'rgba(255,160,0,0.6)', border: '#FFA000' },
  { ring1: '#F57C00', ring2: '#FFCC02', ring3: '#E65100', glow: 'rgba(245,124,0,0.6)', border: '#F57C00' },
];

interface AnimatedLiveAvatarProps {
  src: string;
  alt?: string;
  size?: number;
  themeIndex: number;
  showLive?: boolean;
  isLive?: boolean;
  className?: string;
}

export default function AnimatedLiveAvatar({
  src,
  alt = '',
  size = 64,
  themeIndex,
  showLive = true,
  isLive = true,
  className = '',
}: AnimatedLiveAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const theme = AVATAR_COLOR_THEMES[themeIndex % AVATAR_COLOR_THEMES.length];

  useEffect(() => {
    if (!isLive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const s = size * dpr;
    canvas.width = s;
    canvas.height = s;

    const cx = s / 2;
    const cy = s / 2;
    const baseR = (size / 2 - 4) * dpr;

    let t = 0;
    const speed = 0.018 + (themeIndex % 10) * 0.002;

    function hex2rgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }

    const c1 = hex2rgb(theme.ring1);
    const c2 = hex2rgb(theme.ring2);
    const c3 = hex2rgb(theme.ring3);

    function drawRing(radius: number, alpha: number, color: { r: number; g: number; b: number }, width: number) {
      ctx!.beginPath();
      ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
      ctx!.lineWidth = width;
      ctx!.stroke();
    }

    function frame() {
      ctx!.clearRect(0, 0, s, s);
      t += speed;

      const wave1 = 0.5 + 0.5 * Math.sin(t);
      const wave2 = 0.5 + 0.5 * Math.sin(t + 1.2);
      const wave3 = 0.5 + 0.5 * Math.sin(t + 2.4);

      const r1 = baseR * (1 + wave1 * 0.12);
      const r2 = baseR * (1 + wave2 * 0.22);
      const r3 = baseR * (1 + wave3 * 0.35);

      drawRing(r3, wave3 * 0.25, c3, 2 * dpr);
      drawRing(r2, wave2 * 0.45, c2, 2.5 * dpr);
      drawRing(r1, 0.5 + wave1 * 0.5, c1, 3 * dpr);

      animRef.current = requestAnimationFrame(frame);
    }

    frame();
    return () => cancelAnimationFrame(animRef.current);
  }, [isLive, size, themeIndex, theme]);

  const containerSize = size + 20;

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`} style={{ width: containerSize, height: containerSize }}>
      {isLive && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: containerSize,
            height: containerSize,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: `2.5px solid ${theme.border}`,
          boxShadow: isLive ? `0 0 16px ${theme.glow}` : 'none',
          position: 'relative',
          zIndex: 1,
        }}
      />
      {showLive && isLive && (
        <span
          style={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#F6465D',
            color: '#fff',
            fontSize: 9,
            fontWeight: 900,
            padding: '1px 5px',
            borderRadius: 4,
            letterSpacing: '0.04em',
            zIndex: 2,
            lineHeight: 1.5,
          }}
        >
          LIVE
        </span>
      )}
    </div>
  );
}

interface DeviceImageProps {
  img: string;
  glow: string;
  alt?: string;
  /** true while the device is actively mining -> full "working" animation */
  active?: boolean;
  className?: string;
  /** extra classes applied to the <img> (e.g. group-hover scale) */
  imgClassName?: string;
}

/**
 * Renders a mining device render with a signature glow and a subtle "alive"
 * animation. Idle devices gently float; an actively-mining device spins a
 * turbine-style energy ring and pulses, so users can see it is working.
 * Fills its parent box (parent supplies size / background / border).
 */
export default function DeviceImage({
  img,
  glow,
  alt = '',
  active = false,
  className = '',
  imgClassName = '',
}: DeviceImageProps) {
  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      {/* ambient glow — pulses while working, steady when idle */}
      <div
        className={`absolute inset-0 rounded-full pointer-events-none ${active ? 'animate-device-pulse' : 'opacity-40'}`}
        style={{ background: `radial-gradient(circle at 50% 50%, ${glow}55, transparent 68%)` }}
      />

      {/* spinning turbine / energy ring — only while working */}
      {active && (
        <div
          className="absolute inset-[10%] rounded-full animate-device-spin pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${glow}00 170deg, ${glow}aa 300deg, ${glow} 350deg, transparent 360deg)`,
            WebkitMaskImage:
              'radial-gradient(circle, transparent 55%, #000 58%, #000 70%, transparent 73%)',
            maskImage:
              'radial-gradient(circle, transparent 55%, #000 58%, #000 70%, transparent 73%)',
          }}
        />
      )}

      <img
        src={img}
        alt={alt}
        draggable={false}
        className={`relative z-10 w-[88%] h-[88%] object-contain ${active ? 'animate-device-bob' : 'animate-device-float'} ${imgClassName}`}
        style={{ filter: `drop-shadow(0 0 8px ${glow}88)` }}
      />
    </div>
  );
}

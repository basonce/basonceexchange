interface BasonceLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function BasonceLogo({ size = 32, showText = true, className = '' }: BasonceLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="basonce-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="50%" stopColor="#0099FF" />
            <stop offset="100%" stopColor="#0066FF" />
          </linearGradient>
          <linearGradient id="basonce-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0066FF" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#glow)">
          <path
            d="M 20 80 L 20 20 L 55 20 C 65 20 72 27 72 37 C 72 43 69 48 65 51 C 71 54 75 60 75 68 C 75 78 68 80 58 80 L 20 80 Z M 35 45 L 50 45 C 54 45 57 42 57 38 C 57 34 54 31 50 31 L 35 31 L 35 45 Z M 35 69 L 53 69 C 57 69 60 66 60 62 C 60 58 57 55 53 55 L 35 55 L 35 69 Z"
            fill="url(#basonce-gradient)"
          />

          <path
            d="M 78 30 L 88 50 L 78 70"
            stroke="url(#basonce-gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          <circle cx="87" cy="50" r="3" fill="url(#basonce-glow)" />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-bold from-[#00D4FF] via-[#0099FF] to-[#0066FF] bg-clip-text text-transparent">
            BASONCE
          </span>
          <span className="text-gray-400 tracking-widest">EXCHANGE</span>
        </div>
      )}
    </div>
  );
}

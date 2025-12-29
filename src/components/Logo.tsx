export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {/* Stage/platform */}
      <rect
        x="4"
        y="20"
        width="24"
        height="4"
        rx="2"
        fill="url(#gradient1)"
      />
      {/* Microphone stand */}
      <rect
        x="14"
        y="8"
        width="2"
        height="12"
        rx="1"
        fill="url(#gradient2)"
      />
      {/* Microphone head */}
      <circle
        cx="15"
        cy="8"
        r="3"
        fill="url(#gradient2)"
      />
      {/* Sound waves */}
      <path
        d="M8 12 Q10 10 12 12 Q14 14 16 12 Q18 10 20 12 Q22 14 24 12"
        stroke="url(#gradient3)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f093fb" />
          <stop offset="100%" stopColor="#f5576c" />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#667eea" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#764ba2" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}


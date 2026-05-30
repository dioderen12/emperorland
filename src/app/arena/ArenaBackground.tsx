// Self-made battle-arena backdrop (pure SVG — crisp, no licensing concerns).
// Dusk sky + glowing disc + layered hills + a perspective grid floor: a retro
// "stage" look. Swap for a raster image later by replacing this component.
export function ArenaBackground({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arena-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b1740" />
          <stop offset="45%" stopColor="#3b2a63" />
          <stop offset="70%" stopColor="#9b4f6b" />
          <stop offset="100%" stopColor="#e2935a" />
        </linearGradient>
        <radialGradient id="arena-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe7a8" />
          <stop offset="55%" stopColor="#ffb24d" />
          <stop offset="100%" stopColor="#ffb24d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="arena-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3320" />
          <stop offset="100%" stopColor="#2a1c12" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect width="400" height="160" fill="url(#arena-sky)" />

      {/* stars */}
      <g fill="#ffffff" opacity="0.6">
        <circle cx="40" cy="22" r="1" />
        <circle cx="95" cy="40" r="0.8" />
        <circle cx="150" cy="18" r="1" />
        <circle cx="320" cy="28" r="1" />
        <circle cx="360" cy="50" r="0.8" />
        <circle cx="250" cy="14" r="0.8" />
      </g>

      {/* setting sun */}
      <circle cx="200" cy="120" r="58" fill="url(#arena-sun)" />
      <circle cx="200" cy="120" r="26" fill="#ffd27a" opacity="0.9" />

      {/* far mountains */}
      <polygon points="0,160 60,96 120,160" fill="#2c2350" opacity="0.85" />
      <polygon points="80,160 170,82 250,160" fill="#2c2350" opacity="0.85" />
      <polygon points="220,160 300,100 400,160" fill="#2c2350" opacity="0.85" />
      {/* near hills */}
      <polygon points="0,160 90,120 200,160" fill="#241b3e" />
      <polygon points="170,160 280,118 400,160" fill="#241b3e" />

      {/* ground */}
      <rect y="160" width="400" height="60" fill="url(#arena-ground)" />
      {/* perspective grid */}
      <g stroke="#000000" strokeOpacity="0.25" strokeWidth="1">
        <line x1="0" y1="172" x2="400" y2="172" />
        <line x1="0" y1="188" x2="400" y2="188" />
        <line x1="0" y1="206" x2="400" y2="206" />
        <line x1="200" y1="160" x2="40" y2="220" />
        <line x1="200" y1="160" x2="150" y2="220" />
        <line x1="200" y1="160" x2="250" y2="220" />
        <line x1="200" y1="160" x2="360" y2="220" />
      </g>
      <rect y="160" width="400" height="3" fill="#6b4a2b" opacity="0.6" />
    </svg>
  );
}

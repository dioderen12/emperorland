// Tier-specific booster-pack illustrations — pure SVG so they're crisp, themed,
// and free of licensing concerns (no real TCG art). Each variant shares a foil-
// pouch silhouette with a crimped top seal, then swaps gradient + centre emblem:
//   purple → Mystery (?)   sky → Premium (gem)   amber → Elite (crown + rays)
//
// Animated via CSS keyframes in globals.css (foilSweep / packTwinkle / packGlow /
// packBob) + a SMIL spin on the Elite rays — gives the "living GIF" feel without
// shipping any raster frames. The bob lives on the root <svg> so the foil clip
// stays aligned while the whole pouch drifts.

type Variant = "purple" | "sky" | "amber";

const VARIANTS: Record<
  Variant,
  { stops: [string, string, string]; light: string; crimp: string; glow: string; bob: string }
> = {
  purple: { stops: ["#8b5cf6", "#5b21b6", "#2e1065"], light: "#ddd6fe", crimp: "#4c1d95", glow: "#a78bfa", bob: "0s" },
  sky: { stops: ["#38bdf8", "#0369a1", "#082f49"], light: "#bae6fd", crimp: "#0c4a6e", glow: "#7dd3fc", bob: "-1.3s" },
  amber: { stops: ["#fbbf24", "#ea580c", "#7c2d12"], light: "#fde68a", crimp: "#92400e", glow: "#fcd34d", bob: "-2.6s" },
};

// Zigzag bottom edge of the crimped seal. Built as a path so tooth count is tunable.
function crimpPath(left: number, right: number, top: number, baseY: number, teeth: number) {
  const w = (right - left) / teeth;
  let d = `M${left} ${top} H${right} V${baseY}`;
  for (let i = 0; i < teeth; i++) {
    const x = right - i * w;
    d += ` L${(x - w / 2).toFixed(1)} ${baseY + 5} L${(x - w).toFixed(1)} ${baseY}`;
  }
  d += ` V${top} Z`;
  return d;
}

const SPARKLE = "M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z";

// [x, y, scale, duration(s), delay(s)]
const SPARKLES: [number, number, number, number, number][] = [
  [34, 44, 1.1, 2.1, 0],
  [90, 60, 0.7, 1.7, 0.5],
  [82, 132, 0.9, 2.4, 1.1],
  [32, 124, 0.6, 1.9, 0.8],
];

export function PackArt({ variant, className = "" }: { variant: Variant; className?: string }) {
  const v = VARIANTS[variant];
  const cx = 60;
  const cy = 88;
  const uid = variant; // gradient ids must differ across the 3 packs on one page

  return (
    <svg
      viewBox="0 0 120 168"
      className={`pack-art ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${variant} pack`}
      style={{ animation: "packBob 4s ease-in-out infinite", animationDelay: v.bob }}
    >
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={v.stops[0]} />
          <stop offset="55%" stopColor={v.stops[1]} />
          <stop offset="100%" stopColor={v.stops[2]} />
        </linearGradient>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={v.glow} stopOpacity="0.9" />
          <stop offset="100%" stopColor={v.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`shine-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <rect x="18" y="12" width="84" height="144" rx="13" />
        </clipPath>
      </defs>

      {/* Pack body */}
      <rect x="18" y="12" width="84" height="144" rx="13" fill={`url(#body-${uid})`} stroke={v.light} strokeOpacity="0.35" strokeWidth="1.5" />

      {/* Foil shine (static stripes + animated sweep) + emblem glow, clipped to the pouch */}
      <g clipPath={`url(#clip-${uid})`}>
        <polygon points="20,12 52,12 30,156 18,156" fill="#ffffff" opacity="0.10" />
        <polygon points="60,12 72,12 50,156 42,156" fill="#ffffff" opacity="0.06" />
        <circle cx={cx} cy={cy} r="40" fill={`url(#glow-${uid})`} style={{ animation: "packGlow 2.8s ease-in-out infinite" }} />
        {variant === "amber" && (
          <g>
            {Array.from({ length: 12 }).map((_, i) => (
              <polygon
                key={i}
                points={`${cx},${cy - 4} ${cx},${cy + 4} ${cx + 60},${cy}`}
                fill={v.light}
                opacity="0.12"
                transform={`rotate(${i * 30} ${cx} ${cy})`}
              />
            ))}
            <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="22s" repeatCount="indefinite" />
          </g>
        )}
        {/* Sweeping foil light */}
        <g style={{ animation: "foilSweep 3.6s ease-in-out infinite" }}>
          <polygon points="6,10 30,10 12,158 -12,158" fill={`url(#shine-${uid})`} />
        </g>
      </g>

      {/* Crimped top seal */}
      <path d={crimpPath(18, 102, 12, 30, 9)} fill={v.crimp} clipPath={`url(#clip-${uid})`} />
      <rect x="18" y="12" width="84" height="6" rx="3" fill="#ffffff" opacity="0.18" clipPath={`url(#clip-${uid})`} />

      {/* Centre emblem badge */}
      <circle cx={cx} cy={cy} r="25" fill={v.stops[2]} fillOpacity="0.55" stroke={v.light} strokeWidth="2" />

      {/* Tier motif */}
      {variant === "purple" && (
        <>
          <path
            d={`M${cx - 9} ${cy - 8} Q${cx - 9} ${cy - 17} ${cx} ${cy - 17} Q${cx + 10} ${cy - 17} ${cx + 10} ${cy - 7} Q${cx + 10} ${cy + 1} ${cx + 1} ${cy + 4} L${cx + 1} ${cy + 9}`}
            fill="none"
            stroke={v.light}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={cx + 1} cy={cy + 16} r="3.2" fill={v.light} />
        </>
      )}
      {variant === "sky" && (
        <g stroke={v.light} strokeWidth="1.6" strokeLinejoin="round">
          <polygon points={`${cx},${cy - 16} ${cx - 13},${cy - 1} ${cx},${cy + 17} ${cx + 13},${cy - 1}`} fill={v.light} fillOpacity="0.85" />
          <line x1={cx - 13} y1={cy - 1} x2={cx + 13} y2={cy - 1} stroke={v.stops[1]} />
          <line x1={cx - 6} y1={cy - 1} x2={cx} y2={cy - 16} stroke={v.stops[1]} />
          <line x1={cx + 6} y1={cy - 1} x2={cx} y2={cy - 16} stroke={v.stops[1]} />
          <line x1={cx - 6} y1={cy - 1} x2={cx} y2={cy + 17} stroke={v.stops[1]} />
          <line x1={cx + 6} y1={cy - 1} x2={cx} y2={cy + 17} stroke={v.stops[1]} />
        </g>
      )}
      {variant === "amber" && (
        <>
          <path
            d={`M${cx - 16} ${cy + 12} L${cx - 16} ${cy - 10} L${cx - 7} ${cy + 1} L${cx} ${cy - 14} L${cx + 7} ${cy + 1} L${cx + 16} ${cy - 10} L${cx + 16} ${cy + 12} Z`}
            fill={v.light}
            stroke={v.stops[2]}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx={cx - 16} cy={cy - 12} r="2.6" fill={v.light} />
          <circle cx={cx} cy={cy - 16} r="2.6" fill={v.light} />
          <circle cx={cx + 16} cy={cy - 12} r="2.6" fill={v.light} />
        </>
      )}

      {/* Sparkles — translate on the group, twinkle on the centred path */}
      {SPARKLES.map(([x, y, s, dur, delay], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path
            d={SPARKLE}
            fill="#ffffff"
            style={{ animation: `packTwinkle ${dur}s ease-in-out ${delay}s infinite` }}
          />
        </g>
      ))}
    </svg>
  );
}

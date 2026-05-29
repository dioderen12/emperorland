// Manga-style hero banner: a halftone (screentone) sky with clouds and a flock of
// gull silhouettes, fading into the dark theme at the bottom edge. Pure SVG/CSS —
// no image files, scales to any width. Evokes the black-and-white manga reference
// without needing a raster photo.

// A single distant-gull silhouette ("M" shape). Drawn centred on (0,0); placed via
// transform so we can scatter many at different scales/positions.
const GULL = "M-20 4 Q-10 -9 0 0 Q10 -9 20 4 Q10 -3 0 1 Q-10 -3 -20 4 Z";

// Flock layout: [x, y, scale, opacity]. Hand-placed for a natural scatter — a few
// big birds in front, many small ones receding toward the horizon.
const FLOCK: [number, number, number, number][] = [
  [120, 70, 1.5, 0.92],
  [300, 45, 1.0, 0.85],
  [470, 95, 0.7, 0.7],
  [620, 55, 1.2, 0.88],
  [780, 110, 0.55, 0.6],
  [900, 70, 0.9, 0.8],
  [1040, 40, 0.65, 0.7],
  [1130, 100, 1.35, 0.9],
  [210, 130, 0.5, 0.55],
  [560, 150, 0.45, 0.5],
  [700, 30, 0.55, 0.6],
  [990, 140, 0.5, 0.5],
  [400, 180, 0.4, 0.45],
  [850, 180, 0.42, 0.45],
];

export function SkyBanner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="A flock of birds over a halftone sky"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Screentone: a dot grid that fakes the manga halftone shading. */}
        <pattern id="halftone" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="#64748b" fillOpacity="0.5" />
        </pattern>
        {/* Sky gradient — light at the top, darker toward the horizon. */}
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="55%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        {/* Soft blur for cloud blobs. */}
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        {/* Fade the whole panel into the dark page at the bottom. */}
        <linearGradient id="fadeOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020617" stopOpacity="0" />
          <stop offset="78%" stopColor="#020617" stopOpacity="0" />
          <stop offset="100%" stopColor="#020617" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Sky + screentone overlay */}
      <rect width="1200" height="320" fill="url(#sky)" />
      <rect width="1200" height="320" fill="url(#halftone)" />

      {/* Clouds — soft white blobs, denser halftone implied by overlap */}
      <g filter="url(#soft)" fill="#f8fafc" fillOpacity="0.9">
        <ellipse cx="240" cy="90" rx="150" ry="48" />
        <ellipse cx="350" cy="120" rx="120" ry="40" />
        <ellipse cx="820" cy="70" rx="170" ry="52" />
        <ellipse cx="950" cy="110" rx="120" ry="42" />
        <ellipse cx="600" cy="200" rx="200" ry="60" />
      </g>

      {/* The flock */}
      <g fill="#1e293b">
        {FLOCK.map(([x, y, s, o], i) => (
          <path key={i} d={GULL} transform={`translate(${x} ${y}) scale(${s})`} fillOpacity={o} />
        ))}
      </g>

      {/* Blend into the dark theme */}
      <rect width="1200" height="320" fill="url(#fadeOut)" />
    </svg>
  );
}

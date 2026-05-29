// EmperorLand emblem — an angular four-point crest with a bold forward chevron
// cut out of the centre. Pure vector, monochrome (uses currentColor) so it reads
// crisp at any size and adapts to whatever text colour it sits in. Replaces the
// old 👑 emoji. The `fillRule="evenodd"` turns the inner chevron into a true hole
// so the page background shows through (works over the blurred nav, gradients, etc).
export function Logo({
  className = "",
  title = "EmperorLand",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Crest body + chevron hole */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 18 Q60 42 110 10 Q86 60 112 110 Q60 84 12 114 Q30 60 10 18 Z
           M30 34 L80 60 L30 86 L30 74 L60 60 L30 46 Z"
      />
      {/* Inset detail line echoing the crest edge — the 'double-blade' feel */}
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.35"
        d="M22 28 Q60 47 102 21 Q83 60 103 102 Q60 79 22 105 Q37 60 22 28 Z"
      />
    </svg>
  );
}

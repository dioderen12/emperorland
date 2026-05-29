import Image from "next/image";
import { RARITY_BADGE, RARITY_BORDER, RARITY_GLOW, TYPE_COLOR, type Rarity } from "@/lib/constants";

type Props = {
  spriteUrl: string;
  name: string;
  rarity: string;
  typeCode?: string;
  subtitle?: string; // optional override (e.g. "×3" in inventory grouping)
  size?: "sm" | "md" | "lg";
};

export function AnimalCard({
  spriteUrl,
  name,
  rarity,
  typeCode,
  subtitle,
  size = "md",
}: Props) {
  const r = rarity as Rarity;
  const padding = size === "lg" ? "p-3" : size === "sm" ? "p-2" : "p-2.5";
  // Native sprite size is 96×96; integer-multiples scale cleanest for pixel art.
  const imgSize = size === "lg" ? 128 : size === "sm" ? 64 : 96;
  const nameClass = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";

  return (
    <div
      className={[
        "bg-[var(--panel)] border-[3px] border-[var(--ink)] flex flex-col items-center text-center",
        "shadow-[4px_4px_0_0_var(--ink)]",
        RARITY_GLOW[r] ?? RARITY_GLOW.common,
        padding,
      ].join(" ")}
    >
      {/* rarity color strip along the top — pixel "card header" */}
      <div className={`-mt-2.5 -mx-2.5 mb-1 h-1.5 w-[calc(100%+1.25rem)] ${RARITY_BORDER[r] ?? RARITY_BORDER.common} border-b-[3px]`} />
      <div className={`${nameClass} font-bold text-white truncate w-full leading-tight`}>{name}</div>
      <div className="my-1.5 flex items-center justify-center" style={{ minHeight: imgSize }}>
        <Image
          src={spriteUrl}
          alt={name}
          width={imgSize}
          height={imgSize}
          className="drop-shadow-md"
          style={{ imageRendering: "pixelated", width: imgSize, height: imgSize }}
          unoptimized
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <span
          className={`${RARITY_BADGE[r] ?? RARITY_BADGE.common} pixel-badge text-[8px] uppercase tracking-wide px-1.5 py-0.5`}
        >
          {rarity}
        </span>
        {typeCode && (
          <span
            className={`${TYPE_COLOR[typeCode] ?? TYPE_COLOR.NOR} pixel-badge text-[8px] uppercase tracking-wide px-1.5 py-0.5`}
          >
            {typeCode}
          </span>
        )}
      </div>
      {subtitle && <div className="mt-1 text-sm text-white/60">{subtitle}</div>}
    </div>
  );
}

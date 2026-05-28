import Image from "next/image";
import { RARITY_BADGE, RARITY_BORDER, RARITY_GLOW, TYPE_COLOR, type Rarity } from "@/lib/constants";

type Props = {
  spriteUrl: string;
  name: string;
  rarity: string;
  typeCode?: string;
  power?: number;
  subtitle?: string; // optional override (e.g. "×3" in inventory grouping)
  size?: "sm" | "md" | "lg";
};

export function AnimalCard({
  spriteUrl,
  name,
  rarity,
  typeCode,
  power,
  subtitle,
  size = "md",
}: Props) {
  const r = rarity as Rarity;
  const padding = size === "lg" ? "p-4" : size === "sm" ? "p-2" : "p-3";
  // Native sprite size is 96×96; integer-multiples scale cleanest for pixel art.
  const imgSize = size === "lg" ? 128 : size === "sm" ? 64 : 96;
  const nameClass = size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={[
        "rounded-xl bg-slate-900/80 border-2 flex flex-col items-center text-center transition-all",
        RARITY_BORDER[r] ?? RARITY_BORDER.common,
        RARITY_GLOW[r] ?? RARITY_GLOW.common,
        padding,
      ].join(" ")}
    >
      <div className={`${nameClass} font-bold text-white truncate w-full`}>{name}</div>
      <div className="my-2 flex items-center justify-center" style={{ minHeight: imgSize }}>
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
      <div
        className={`${RARITY_BADGE[r] ?? RARITY_BADGE.common} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded`}
      >
        {rarity}
      </div>
      {typeCode && (
        <div
          className={`${TYPE_COLOR[typeCode] ?? TYPE_COLOR.NOR} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1`}
        >
          {typeCode}
        </div>
      )}
      {typeof power === "number" && (
        <div className="mt-2 pt-2 border-t border-white/10 w-full text-white">
          <span className="font-mono font-bold">{power}</span>
          <span className="text-[10px] text-white/60 ml-1">PWR</span>
        </div>
      )}
      {subtitle && <div className="mt-1 text-[10px] text-white/60">{subtitle}</div>}
    </div>
  );
}

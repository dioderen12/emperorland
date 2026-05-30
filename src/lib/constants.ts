// Tunable game economy. Tweak PACKS to balance the loop.

export const STARTING_POINTS = 500;

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

// Rarity badge color — matches the pill in the new card design.
export const RARITY_BADGE: Record<Rarity, string> = {
  common: "bg-slate-600 text-slate-100",
  uncommon: "bg-emerald-600 text-emerald-50",
  rare: "bg-sky-600 text-sky-50",
  epic: "bg-purple-600 text-purple-50",
  legendary: "bg-amber-500 text-amber-950",
};

// Border around the whole card — only uncommon+ gets a colored ring, common
// stays neutral so the rare pulls visually pop.
export const RARITY_BORDER: Record<Rarity, string> = {
  common: "border-slate-700",
  uncommon: "border-emerald-400",
  rare: "border-sky-400",
  epic: "border-purple-400",
  legendary: "border-amber-400",
};

export const RARITY_GLOW: Record<Rarity, string> = {
  common: "shadow-none",
  uncommon: "shadow-md shadow-emerald-500/30",
  rare: "shadow-md shadow-sky-500/40",
  epic: "shadow-lg shadow-purple-500/50",
  legendary: "shadow-xl shadow-amber-400/60",
};

// Elemental type. 3-letter codes match Pokemon TCG aesthetics on the card UI.
export type TypeCode =
  | "NOR" | "FIR" | "WTR" | "GRS" | "ELC" | "PSY"
  | "BUG" | "FLY" | "DRA" | "GHO" | "ICE" | "FIG"
  | "POI" | "ROC" | "GRD" | "FAI" | "STE" | "DAR";

export const TYPE_COLOR: Record<string, string> = {
  NOR: "bg-stone-500 text-stone-50",
  FIR: "bg-red-600 text-red-50",
  WTR: "bg-blue-600 text-blue-50",
  GRS: "bg-green-600 text-green-50",
  ELC: "bg-yellow-500 text-yellow-950",
  PSY: "bg-pink-500 text-pink-50",
  BUG: "bg-lime-600 text-lime-50",
  FLY: "bg-sky-500 text-sky-50",
  DRA: "bg-indigo-600 text-indigo-50",
  GHO: "bg-violet-700 text-violet-50",
  ICE: "bg-cyan-500 text-cyan-50",
  FIG: "bg-rose-600 text-rose-50",
  POI: "bg-purple-700 text-purple-50",
  ROC: "bg-amber-700 text-amber-50",
  GRD: "bg-yellow-700 text-yellow-50",
  FAI: "bg-pink-400 text-pink-950",
  STE: "bg-slate-400 text-slate-950",
  DAR: "bg-neutral-800 text-neutral-50",
};

export type PackConfig = {
  id: string;
  name: string;
  price: number;
  cardsPerPack: number;
  // Each row of weights must sum to 1.0 — every card rolls independently.
  rarityWeights: Record<Rarity, number>;
  accent: "purple" | "sky" | "amber";
  tagline: string;
};

export const PACKS: PackConfig[] = [
  {
    id: "basic",
    name: "Mystery Pack",
    price: 100,
    cardsPerPack: 3,
    rarityWeights: {
      common: 0.60,
      uncommon: 0.30,
      rare: 0.086,
      epic: 0.012,
      legendary: 0.002,
    },
    accent: "purple",
    tagline: "Starter pack. Balanced odds across all tiers.",
  },
  {
    id: "premium",
    name: "Premium Pack",
    price: 400,
    cardsPerPack: 5,
    rarityWeights: {
      common: 0.34,
      uncommon: 0.38,
      rare: 0.249,
      epic: 0.025,
      legendary: 0.006,
    },
    accent: "sky",
    tagline: "5 cards. Heavy uncommon+rare bias.",
  },
  {
    id: "elite",
    name: "Elite Pack",
    price: 1000,
    cardsPerPack: 5,
    rarityWeights: {
      common: 0.00,
      uncommon: 0.33,
      rare: 0.56,
      epic: 0.09,
      legendary: 0.02,
    },
    accent: "amber",
    tagline: "5 cards. Zero commons, epic-heavy, best legendary odds.",
  },
];

export function getPack(id: string): PackConfig {
  const p = PACKS.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown pack id: ${id}`);
  return p;
}

// Dungeon = staking destination. Each Pokemon deploys to one dungeon and earns
// at base_rate × multiplier × (type matches ? 1.5 : 1.0). Deploy costs points
// upfront; recall is free. This gates Volcano deployments to high-value pulls.
export type DungeonConfig = {
  id: string;
  name: string;
  emoji: string;
  multiplier: number;
  deployCost: number;
  preferredTypes: string[]; // type codes that get the synergy bonus
  accent: "emerald" | "sky" | "rose";
  description: string;
};

export const DUNGEONS: DungeonConfig[] = [
  {
    id: "grasslands",
    name: "Grasslands",
    emoji: "🌿",
    multiplier: 1,
    deployCost: 1,
    preferredTypes: ["GRS", "BUG", "NOR"],
    accent: "emerald",
    description: "1× rewards · 1 pt to deploy · safe starting ground",
  },
  {
    id: "cave",
    name: "Cave",
    emoji: "🪨",
    multiplier: 2,
    deployCost: 5,
    preferredTypes: ["ROC", "GHO", "BUG", "DRA"],
    accent: "sky",
    description: "2× rewards · 5 pts to deploy · moderate-risk run",
  },
  {
    id: "volcano",
    name: "Volcano",
    emoji: "🌋",
    multiplier: 4,
    deployCost: 20,
    preferredTypes: ["FIR", "DRA", "ROC"],
    accent: "rose",
    description: "4× rewards · 20 pts to deploy · only worth it for epic+",
  },
];

export const TYPE_BONUS_MULTIPLIER = 1.5;

// Global earning tuning — lower = slower economy. STAKE scales the continuous
// dungeon stake rate; EVENT scales idle exploration-event rewards. Both feed the
// same balance, so nerf them together. Tune freely; nothing else depends on them.
export const STAKE_RATE_MULTIPLIER = 0.4;
export const EVENT_REWARD_MULTIPLIER = 0.4;

// Idle exploration tick. One RNG event per Pokemon every 5 minutes.
export const EVENT_TICK_MS = 5 * 60 * 1000;
// Cap how many missed ticks resolve in a single page-load — prevents
// pathological cases (e.g. user gone for a week → 2000 events to process).
export const MAX_EVENTS_PER_RESOLVE = 30;

// Per-event display config used by the event log UI.
export const EVENT_KIND_META: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  treasure:  { label: "Treasure",    emoji: "💰", color: "text-amber-300" },
  mob_win:   { label: "Mob Defeated",emoji: "⚔️", color: "text-emerald-300" },
  mob_loss:  { label: "Retreated",   emoji: "🏳️", color: "text-slate-400" },
  rare_drop: { label: "Rare Drop",   emoji: "💎", color: "text-sky-300" },
  boss_win:  { label: "BOSS DOWN",   emoji: "👑", color: "text-amber-300 font-bold" },
  boss_loss: { label: "Boss Wipe",   emoji: "💀", color: "text-rose-400" },
};

export function getDungeon(id: string): DungeonConfig {
  const d = DUNGEONS.find((d) => d.id === id);
  if (!d) throw new Error(`Unknown dungeon id: ${id}`);
  return d;
}

// Effective rate for an animal deployed to a dungeon.
// Returns { rate, bonusApplied } so the UI can show the breakdown.
export function calculateDungeonRate(
  baseRatePerHour: number,
  animalTypeCode: string,
  dungeon: DungeonConfig,
): { rate: number; bonusApplied: boolean } {
  const bonusApplied = dungeon.preferredTypes.includes(animalTypeCode);
  const multiplier = dungeon.multiplier * (bonusApplied ? TYPE_BONUS_MULTIPLIER : 1);
  return { rate: baseRatePerHour * multiplier * STAKE_RATE_MULTIPLIER, bonusApplied };
}

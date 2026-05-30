// Move database. Each type has a small movepool (canon move names) and every move
// maps to a visual archetype chosen to mirror how that move actually looks in the
// games (research: Bulbapedia move-animation notes):
//   beam       — sustained ray (Flamethrower, Hydro Pump, Hyper Beam)
//   bolt       — lightning strike (Thunderbolt, Thunder)
//   orb        — a charged ball that flies across (Shadow Ball, Energy Ball)
//   blast      — a big burst/explosion at the target (Fire Blast, Stone Edge)
//   barrage    — several projectiles in a row (Bullet Seed, Rock Blast, Pin Missile)
//   rain       — objects fall onto the target from above (Rock Slide, Blizzard)
//   slash      — one melee arc (Leaf Blade, Air Slash, Night Slash)
//   multislash — several quick strikes (Close Combat, Crunch, Play Rough)
//   quake      — the ground shakes (Earthquake, Bulldoze)
//   dash       — the attacker charges in and rams (Flare Blitz, Aqua Jet, Iron Head)

export type MoveKind =
  | "beam" | "bolt" | "orb" | "blast" | "barrage" | "rain" | "slash" | "multislash" | "quake" | "dash";

export type Move = { id: string; name: string; kind: MoveKind; color: string };

// type color used for every move of that type (keeps the palette readable).
const C: Record<string, string> = {
  FIR: "#f97316", WTR: "#38bdf8", GRS: "#84cc16", ELC: "#facc15", ICE: "#67e8f9",
  PSY: "#ec4899", DRA: "#818cf8", DAR: "#a78bfa", GHO: "#8b5cf6", STE: "#cbd5e1",
  FAI: "#f9a8d4", NOR: "#fde68a", FIG: "#f43f5e", FLY: "#93c5fd", BUG: "#a3e635",
  POI: "#c084fc", ROC: "#d97706", GRD: "#ca8a04",
};

// [type]: [ [name, kind], ... ]
const POOLS: Record<string, [string, MoveKind][]> = {
  FIR: [["Flamethrower", "beam"], ["Fire Blast", "blast"], ["Flare Blitz", "dash"], ["Ember", "orb"]],
  WTR: [["Hydro Pump", "beam"], ["Surf", "blast"], ["Aqua Jet", "dash"], ["Bubble Beam", "barrage"]],
  GRS: [["Solar Beam", "beam"], ["Leaf Blade", "slash"], ["Bullet Seed", "barrage"], ["Energy Ball", "orb"]],
  ELC: [["Thunderbolt", "bolt"], ["Thunder", "bolt"], ["Volt Tackle", "dash"], ["Charge Beam", "beam"]],
  ICE: [["Ice Beam", "beam"], ["Blizzard", "rain"], ["Icicle Spear", "barrage"], ["Avalanche", "blast"]],
  PSY: [["Psychic", "beam"], ["Psybeam", "beam"], ["Future Sight", "blast"], ["Zen Headbutt", "dash"]],
  DRA: [["Dragon Pulse", "orb"], ["Draco Meteor", "rain"], ["Dragon Claw", "slash"], ["Outrage", "multislash"]],
  DAR: [["Dark Pulse", "beam"], ["Crunch", "multislash"], ["Night Slash", "slash"], ["Foul Play", "dash"]],
  GHO: [["Shadow Ball", "orb"], ["Shadow Sneak", "dash"], ["Night Shade", "beam"], ["Hex", "blast"]],
  STE: [["Flash Cannon", "beam"], ["Iron Head", "dash"], ["Bullet Punch", "multislash"], ["Meteor Mash", "slash"]],
  FAI: [["Moonblast", "orb"], ["Dazzling Gleam", "blast"], ["Play Rough", "multislash"], ["Fairy Wind", "beam"]],
  NOR: [["Hyper Beam", "beam"], ["Body Slam", "dash"], ["Tri Attack", "barrage"], ["Slash", "slash"]],
  FIG: [["Close Combat", "multislash"], ["Focus Blast", "orb"], ["Dynamic Punch", "dash"], ["Aura Sphere", "orb"]],
  FLY: [["Air Slash", "slash"], ["Hurricane", "blast"], ["Brave Bird", "dash"], ["Aeroblast", "beam"]],
  BUG: [["Bug Buzz", "blast"], ["Pin Missile", "barrage"], ["X-Scissor", "slash"], ["Megahorn", "dash"]],
  POI: [["Sludge Bomb", "orb"], ["Sludge Wave", "blast"], ["Poison Jab", "multislash"], ["Acid Spray", "barrage"]],
  ROC: [["Rock Slide", "rain"], ["Rock Blast", "barrage"], ["Stone Edge", "blast"], ["Head Smash", "dash"]],
  GRD: [["Earthquake", "quake"], ["Bulldoze", "quake"], ["Earth Power", "blast"], ["Bone Rush", "barrage"]],
};

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export const MOVE_LIST: Move[] = Object.entries(POOLS).flatMap(([type, moves]) =>
  moves.map(([name, kind]) => ({ id: slug(name), name, kind, color: C[type] ?? C.NOR })),
);

export const MOVES_BY_ID: Record<string, Move> = Object.fromEntries(MOVE_LIST.map((m) => [m.id, m]));

export const POOL_IDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(POOLS).map(([type, moves]) => [type, moves.map(([name]) => slug(name))]),
);

// Pick a move id from a type's pool using an externally-supplied random [0,1)
// (so selection happens at battle-sim time and is stored in the log).
export function pickMoveId(typeCode: string, rnd: number): string {
  const pool = POOL_IDS[typeCode] ?? POOL_IDS.NOR;
  return pool[Math.floor(rnd * pool.length)] ?? pool[0];
}

// Fallback for old logs that predate per-event move ids.
export function firstMoveFor(typeCode: string): Move {
  const id = (POOL_IDS[typeCode] ?? POOL_IDS.NOR)[0];
  return MOVES_BY_ID[id];
}

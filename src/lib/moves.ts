// Iconic signature move + a visual archetype per type, so each attack reads as a
// real Pokémon move (e.g. Charizard → Flamethrower beam). Move names are canon
// (Bulbapedia); the VFX are coded SVG/CSS effects, not the games' actual art.

export type MoveKind = "beam" | "bolt" | "projectile" | "slash" | "quake";

export type MoveFx = { move: string; kind: MoveKind; color: string };

export const MOVES: Record<string, MoveFx> = {
  FIR: { move: "Flamethrower", kind: "beam", color: "#f97316" },
  WTR: { move: "Hydro Pump", kind: "beam", color: "#38bdf8" },
  GRS: { move: "Solar Beam", kind: "beam", color: "#84cc16" },
  ELC: { move: "Thunderbolt", kind: "bolt", color: "#facc15" },
  PSY: { move: "Psychic", kind: "beam", color: "#ec4899" },
  ICE: { move: "Ice Beam", kind: "beam", color: "#67e8f9" },
  DRA: { move: "Dragon Pulse", kind: "beam", color: "#818cf8" },
  DAR: { move: "Dark Pulse", kind: "beam", color: "#a78bfa" },
  STE: { move: "Flash Cannon", kind: "beam", color: "#cbd5e1" },
  FAI: { move: "Moonblast", kind: "beam", color: "#f9a8d4" },
  NOR: { move: "Hyper Beam", kind: "beam", color: "#fde68a" },
  FIG: { move: "Close Combat", kind: "slash", color: "#f43f5e" },
  FLY: { move: "Air Slash", kind: "slash", color: "#93c5fd" },
  BUG: { move: "Bug Buzz", kind: "projectile", color: "#a3e635" },
  GHO: { move: "Shadow Ball", kind: "projectile", color: "#8b5cf6" },
  POI: { move: "Sludge Bomb", kind: "projectile", color: "#c084fc" },
  ROC: { move: "Rock Slide", kind: "projectile", color: "#d97706" },
  GRD: { move: "Earthquake", kind: "quake", color: "#ca8a04" },
};

export function moveFor(typeCode: string): MoveFx {
  return MOVES[typeCode] ?? MOVES.NOR;
}

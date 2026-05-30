// One-time catalog generator. Fetches Pokemon #1-386 (Gen 1-3) from PokeAPI,
// keeps only those with a Gen-V Black/White ANIMATED sprite, and derives the
// game fields (rarity / power / stake rate) from each species' base-stat total.
// Output: prisma/pokedex.json — a static catalog the seed reads (no network at
// seed time). Re-run with `node scripts/generate-pokedex.mjs` to refresh.
import { writeFileSync } from "node:fs";

const MAX_DEX = 649; // Gen 1-5 — the full range with B/W animated sprites.

// PokeAPI type name → the game's 3-letter TypeCode.
const TYPE_MAP = {
  normal: "NOR", fire: "FIR", water: "WTR", grass: "GRS", electric: "ELC",
  psychic: "PSY", bug: "BUG", flying: "FLY", dragon: "DRA", ghost: "GHO",
  ice: "ICE", fighting: "FIG", poison: "POI", rock: "ROC", ground: "GRD",
  fairy: "FAI", steel: "STE", dark: "DAR",
};

// Legendaries + mythicals across Gen 1-3 — forced to the legendary tier
// regardless of base-stat total.
const LEGENDARY = new Set([
  144, 145, 146, 150, 151,                 // Gen 1
  243, 244, 245, 249, 250, 251,            // Gen 2
  377, 378, 379, 380, 381, 382, 383, 384, 385, 386, // Gen 3
  480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, // Gen 4
  494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,      // Gen 5
]);

// Per-tier base-stat-total bounds → PWR range. Power interpolates within the tier.
const TIERS = {
  common:    { bMin: 180, bMax: 329, pMin: 40,  pMax: 110 },
  uncommon:  { bMin: 330, bMax: 439, pMin: 120, pMax: 210 },
  rare:      { bMin: 440, bMax: 524, pMin: 220, pMax: 350 },
  epic:      { bMin: 525, bMax: 609, pMin: 400, pMax: 560 },
  legendary: { bMin: 580, bMax: 720, pMin: 700, pMax: 900 },
};

function rarityFor(dex, bst) {
  if (LEGENDARY.has(dex)) return "legendary";
  if (bst >= 525) return "epic";
  if (bst >= 440) return "rare";
  if (bst >= 330) return "uncommon";
  return "common";
}

function powerFor(rarity, bst) {
  const t = TIERS[rarity];
  const b = Math.max(t.bMin, Math.min(t.bMax, bst));
  const frac = (b - t.bMin) / (t.bMax - t.bMin || 1);
  return Math.round(t.pMin + frac * (t.pMax - t.pMin));
}

function titleCase(name) {
  return name
    .replace(/-normal$/, "") // Deoxys default form, etc.
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");
}

async function fetchOne(id) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) return null;
  const d = await res.json();
  const sprite = d.sprites?.versions?.["generation-v"]?.["black-white"]?.animated?.front_default;
  if (!sprite) return null; // no animated art → skip
  const bst = d.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const typeName = d.types[0].type.name;
  const typeCode = TYPE_MAP[typeName] ?? "NOR";
  const rarity = rarityFor(d.id, bst);
  const power = powerFor(rarity, bst);
  return {
    name: titleCase(d.name),
    rarity,
    typeCode,
    power,
    spriteUrl: sprite,
    packWeight: 1,
    stakeRatePerHour: Math.max(2, Math.round(power / 20)),
  };
}

async function main() {
  const out = [];
  const BATCH = 20;
  for (let start = 1; start <= MAX_DEX; start += BATCH) {
    const ids = [];
    for (let i = start; i < start + BATCH && i <= MAX_DEX; i++) ids.push(i);
    const batch = await Promise.all(ids.map(fetchOne));
    for (const s of batch) if (s) out.push(s);
    process.stdout.write(`\rFetched ${Math.min(start + BATCH - 1, MAX_DEX)}/${MAX_DEX} (kept ${out.length})`);
  }
  console.log("");

  const byTier = out.reduce((acc, s) => ((acc[s.rarity] = (acc[s.rarity] || 0) + 1), acc), {});
  console.log("Tier distribution:", byTier);

  writeFileSync(
    new URL("../prisma/pokedex.json", import.meta.url),
    JSON.stringify(out, null, 2) + "\n",
  );
  console.log(`Wrote ${out.length} species to prisma/pokedex.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

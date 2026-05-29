import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { STARTING_POINTS } from "../src/lib/constants";

const url = process.env.DATABASE_URL || "file:./dev.db";
console.log(`Seed target: ${url}`);

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});

// 37 Gen 1 Pokemon across 5 rarity tiers. Sprites are Gen V (Black/White)
// animated pixel art GIFs — pinned to PokeAPI's master branch (stable).
// Rarities follow canon convention (basic = common, fully-evolved = epic, legendaries = legendary).
// PWR scales with rarity; stakeRatePerHour ≈ PWR / 20.
const SPRITE = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;

type Species = {
  name: string;
  rarity: string;
  typeCode: string;
  power: number;
  spriteUrl: string;
  packWeight: number;
  stakeRatePerHour: number;
};

const SPECIES: Species[] = [
  // ── Common (PWR 40-100, rate 2-5/hr) ─────────────────────────────
  { name: "Pidgey",    rarity: "common", typeCode: "FLY", power: 80,  spriteUrl: SPRITE(16),  packWeight: 1, stakeRatePerHour: 4 },
  { name: "Rattata",   rarity: "common", typeCode: "NOR", power: 75,  spriteUrl: SPRITE(19),  packWeight: 1, stakeRatePerHour: 4 },
  { name: "Caterpie",  rarity: "common", typeCode: "BUG", power: 60,  spriteUrl: SPRITE(10),  packWeight: 1, stakeRatePerHour: 3 },
  { name: "Weedle",    rarity: "common", typeCode: "BUG", power: 65,  spriteUrl: SPRITE(13),  packWeight: 1, stakeRatePerHour: 3 },
  { name: "Magikarp",  rarity: "common", typeCode: "WTR", power: 40,  spriteUrl: SPRITE(129), packWeight: 1, stakeRatePerHour: 2 },
  { name: "Spearow",   rarity: "common", typeCode: "FLY", power: 85,  spriteUrl: SPRITE(21),  packWeight: 1, stakeRatePerHour: 4 },
  { name: "Zubat",     rarity: "common", typeCode: "FLY", power: 70,  spriteUrl: SPRITE(41),  packWeight: 1, stakeRatePerHour: 3 },
  { name: "Geodude",   rarity: "common", typeCode: "ROC", power: 95,  spriteUrl: SPRITE(74),  packWeight: 1, stakeRatePerHour: 5 },

  // ── Uncommon (PWR 120-200, rate 6-10/hr) ─────────────────────────
  { name: "Bulbasaur", rarity: "uncommon", typeCode: "GRS", power: 145, spriteUrl: SPRITE(1),   packWeight: 1, stakeRatePerHour: 7 },
  { name: "Charmander",rarity: "uncommon", typeCode: "FIR", power: 150, spriteUrl: SPRITE(4),   packWeight: 1, stakeRatePerHour: 7 },
  { name: "Squirtle",  rarity: "uncommon", typeCode: "WTR", power: 140, spriteUrl: SPRITE(7),   packWeight: 1, stakeRatePerHour: 7 },
  { name: "Pikachu",   rarity: "uncommon", typeCode: "ELC", power: 170, spriteUrl: SPRITE(25),  packWeight: 1, stakeRatePerHour: 8 },
  { name: "Eevee",     rarity: "uncommon", typeCode: "NOR", power: 160, spriteUrl: SPRITE(133), packWeight: 1, stakeRatePerHour: 8 },
  { name: "Abra",      rarity: "uncommon", typeCode: "PSY", power: 130, spriteUrl: SPRITE(63),  packWeight: 1, stakeRatePerHour: 6 },
  { name: "Machop",    rarity: "uncommon", typeCode: "FIG", power: 175, spriteUrl: SPRITE(66),  packWeight: 1, stakeRatePerHour: 9 },
  { name: "Ponyta",    rarity: "uncommon", typeCode: "FIR", power: 190, spriteUrl: SPRITE(77),  packWeight: 1, stakeRatePerHour: 10 },

  // ── Rare (PWR 220-340, rate 11-17/hr) ────────────────────────────
  { name: "Ivysaur",   rarity: "rare", typeCode: "GRS", power: 240, spriteUrl: SPRITE(2),   packWeight: 1, stakeRatePerHour: 12 },
  { name: "Charmeleon",rarity: "rare", typeCode: "FIR", power: 250, spriteUrl: SPRITE(5),   packWeight: 1, stakeRatePerHour: 12 },
  { name: "Wartortle", rarity: "rare", typeCode: "WTR", power: 245, spriteUrl: SPRITE(8),   packWeight: 1, stakeRatePerHour: 12 },
  { name: "Raichu",    rarity: "rare", typeCode: "ELC", power: 280, spriteUrl: SPRITE(26),  packWeight: 1, stakeRatePerHour: 14 },
  { name: "Vulpix",    rarity: "rare", typeCode: "FIR", power: 220, spriteUrl: SPRITE(37),  packWeight: 1, stakeRatePerHour: 11 },
  { name: "Growlithe", rarity: "rare", typeCode: "FIR", power: 260, spriteUrl: SPRITE(58),  packWeight: 1, stakeRatePerHour: 13 },
  { name: "Onix",      rarity: "rare", typeCode: "ROC", power: 320, spriteUrl: SPRITE(95),  packWeight: 1, stakeRatePerHour: 16 },
  { name: "Tauros",    rarity: "rare", typeCode: "NOR", power: 340, spriteUrl: SPRITE(128), packWeight: 1, stakeRatePerHour: 17 },

  // ── Epic (PWR 400-540, rate 20-27/hr) ────────────────────────────
  { name: "Venusaur",  rarity: "epic", typeCode: "GRS", power: 470, spriteUrl: SPRITE(3),   packWeight: 1, stakeRatePerHour: 23 },
  { name: "Charizard", rarity: "epic", typeCode: "FIR", power: 490, spriteUrl: SPRITE(6),   packWeight: 1, stakeRatePerHour: 24 },
  { name: "Blastoise", rarity: "epic", typeCode: "WTR", power: 480, spriteUrl: SPRITE(9),   packWeight: 1, stakeRatePerHour: 24 },
  { name: "Alakazam",  rarity: "epic", typeCode: "PSY", power: 430, spriteUrl: SPRITE(65),  packWeight: 1, stakeRatePerHour: 21 },
  { name: "Lapras",    rarity: "epic", typeCode: "WTR", power: 450, spriteUrl: SPRITE(131), packWeight: 1, stakeRatePerHour: 22 },
  { name: "Gyarados",  rarity: "epic", typeCode: "WTR", power: 500, spriteUrl: SPRITE(130), packWeight: 1, stakeRatePerHour: 25 },
  { name: "Snorlax",   rarity: "epic", typeCode: "NOR", power: 460, spriteUrl: SPRITE(143), packWeight: 1, stakeRatePerHour: 23 },
  { name: "Dragonite", rarity: "epic", typeCode: "DRA", power: 530, spriteUrl: SPRITE(149), packWeight: 1, stakeRatePerHour: 26 },

  // ── Legendary (PWR 700-900, rate 35-45/hr) ───────────────────────
  { name: "Articuno",  rarity: "legendary", typeCode: "ICE", power: 750, spriteUrl: SPRITE(144), packWeight: 1, stakeRatePerHour: 37 },
  { name: "Zapdos",    rarity: "legendary", typeCode: "ELC", power: 780, spriteUrl: SPRITE(145), packWeight: 1, stakeRatePerHour: 39 },
  { name: "Moltres",   rarity: "legendary", typeCode: "FIR", power: 780, spriteUrl: SPRITE(146), packWeight: 1, stakeRatePerHour: 39 },
  { name: "Mewtwo",    rarity: "legendary", typeCode: "PSY", power: 880, spriteUrl: SPRITE(150), packWeight: 1, stakeRatePerHour: 44 },
  { name: "Mew",       rarity: "legendary", typeCode: "PSY", power: 820, spriteUrl: SPRITE(151), packWeight: 1, stakeRatePerHour: 41 },
];

async function main() {
  for (const s of SPECIES) {
    await prisma.animalSpecies.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });
  }

  const existing = await prisma.user.findFirst({ where: { username: "demo" } });
  if (!existing) {
    await prisma.user.create({ data: { username: "demo", points: STARTING_POINTS } });
  }

  const speciesCount = await prisma.animalSpecies.count();
  const userCount = await prisma.user.count();
  console.log(`Seeded ${speciesCount} species, ${userCount} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { STARTING_POINTS } from "../src/lib/constants";

const url = process.env.DATABASE_URL || "file:./dev.db";
console.log(`Seed target: ${url}`);

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});

type Species = {
  name: string;
  rarity: string;
  typeCode: string;
  power: number;
  spriteUrl: string;
  packWeight: number;
  stakeRatePerHour: number;
};

// 386 Pokemon (Gen 1-3) across 5 rarity tiers. Generated from PokeAPI by
// `scripts/generate-pokedex.mjs` — sprites are Gen V (Black/White) animated
// pixel-art GIFs from the PokeAPI CDN; rarity/power/stake-rate are derived from
// each species' base-stat total. Re-run that script to refresh the catalog.
const SPECIES: Species[] = JSON.parse(
  readFileSync(new URL("./pokedex.json", import.meta.url), "utf8"),
);

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

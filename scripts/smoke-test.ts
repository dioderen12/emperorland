// Statistical sanity check: opens 1000 virtual packs of each tier and prints
// the empirical rarity distribution per tier. Run: `npx tsx scripts/smoke-test.ts`
// Each tier should land within ~1% of its configured weights.

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { rollSpecies } from "../src/lib/game";
import { PACKS, RARITY_ORDER } from "../src/lib/constants";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" }),
});

async function main() {
  const catalog = await prisma.animalSpecies.findMany();
  if (catalog.length === 0) {
    console.error("Catalog empty — run `npm run db:seed` first.");
    process.exit(1);
  }

  const TRIALS = 1000;
  for (const pack of PACKS) {
    const counts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < TRIALS; i++) {
      for (let j = 0; j < pack.cardsPerPack; j++) {
        const s = rollSpecies(catalog, pack.rarityWeights);
        counts[s.rarity] = (counts[s.rarity] ?? 0) + 1;
      }
    }
    const total = TRIALS * pack.cardsPerPack;
    console.log(`\n── ${pack.name} (${pack.price} pts, ${total} rolls) ──`);
    console.log("rarity        expected   actual    Δ");
    for (const r of RARITY_ORDER) {
      const expected = pack.rarityWeights[r] * 100;
      const actual = (counts[r] / total) * 100;
      const delta = actual - expected;
      console.log(
        `${r.padEnd(13)} ${expected.toFixed(0).padStart(5)}%   ${actual.toFixed(1).padStart(5)}%   ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`,
      );
    }
  }
}

main().finally(() => prisma.$disconnect());

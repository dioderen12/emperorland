// Admin: airdrop points to every user + log it to their activity feed.
// Each user gets +AMOUNT points and a Transaction row that shows up in
// "Recent activity" as: <REASON>  +<AMOUNT>.
//
// Run on the VPS (back up first):
//   cp prod.db prod.db.backup-$(date +%Y%m%d-%H%M%S)
//   npx tsx scripts/airdrop.ts
//
// ⚠️ Runs once per invocation — running twice airdrops twice.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const AMOUNT = 500;
const REASON = "Airdrop point from GE";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" }),
});

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: u.id }, data: { points: { increment: AMOUNT } } }),
      prisma.transaction.create({
        data: { userId: u.id, kind: "airdrop", delta: AMOUNT, reason: REASON },
      }),
    ]);
  }
  console.log(`✅ Airdropped +${AMOUNT} to ${users.length} user(s) — logged as "${REASON}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

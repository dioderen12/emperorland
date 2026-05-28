// One-off admin tool: add points to the demo user.
// Usage: npx tsx scripts/grant-points.ts <amount>
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const amount = Number(process.argv[2] ?? 1000);
  if (!Number.isFinite(amount)) {
    console.error("Usage: npx tsx scripts/grant-points.ts <amount>");
    process.exit(1);
  }
  const user = await prisma.user.findFirstOrThrow({ where: { username: "demo" } });
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { points: { increment: amount } } }),
    prisma.transaction.create({
      data: { userId: user.id, kind: "admin_adjust", delta: amount, reason: "Bonus dari admin" },
    }),
  ]);
  const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  console.log(`+${amount} pts → balance ${after.points}`);
}

main().finally(() => prisma.$disconnect());

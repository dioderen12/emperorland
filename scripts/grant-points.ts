// Admin tool: add points to a user.
// Usage:
//   npx tsx scripts/grant-points.ts <amount>             → grants to demo user
//   npx tsx scripts/grant-points.ts <amount> <username>  → grants to Discord username (matches `name` field)
//   npx tsx scripts/grant-points.ts <amount> --discord <discordId>
//   npx tsx scripts/grant-points.ts <amount> --all       → grants to all users
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" }),
});

async function main() {
  const amount = Number(process.argv[2] ?? 1000);
  const target = process.argv[3]; // username | --discord <id> | --all | undefined
  const targetValue = process.argv[4]; // value for flag-based targets

  if (!Number.isFinite(amount)) {
    console.error("Usage: npx tsx scripts/grant-points.ts <amount> [username | --discord <id> | --all]");
    process.exit(1);
  }

  // Resolve which users to grant.
  let users: { id: string; name: string | null; username: string; points: number }[];
  if (target === "--all") {
    users = await prisma.user.findMany();
  } else if (target === "--discord" && targetValue) {
    users = await prisma.user.findMany({ where: { discordId: targetValue } });
  } else if (target) {
    // Match either `name` (Discord display) or legacy `username` field.
    users = await prisma.user.findMany({
      where: { OR: [{ name: target }, { username: target }] },
    });
  } else {
    users = await prisma.user.findMany({ where: { username: "demo" } });
  }

  if (users.length === 0) {
    console.error(`No users matched. List all users:`);
    const all = await prisma.user.findMany({ select: { name: true, username: true, discordId: true, points: true } });
    console.error(all);
    process.exit(1);
  }

  for (const u of users) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: u.id }, data: { points: { increment: amount } } }),
      prisma.transaction.create({
        data: { userId: u.id, kind: "admin_adjust", delta: amount, reason: "Bonus dari admin" },
      }),
    ]);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    console.log(`+${amount} pts → ${u.name ?? u.username} balance ${after.points}`);
  }
}

main().finally(() => prisma.$disconnect());

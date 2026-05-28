// Wipe owned animals + set points to a fresh balance. Useful for demo resets.
// Usage: npx tsx scripts/reset-player.ts [points]   (default: 100000)
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const points = Number(process.argv[2] ?? 100000);
  if (!Number.isFinite(points)) {
    console.error("Usage: npx tsx scripts/reset-player.ts [points]");
    process.exit(1);
  }
  const user = await prisma.user.findFirstOrThrow({ where: { username: "demo" } });

  const result = await prisma.$transaction(async (tx) => {
    // Drop all dungeon events first (FK to OwnedAnimal would cascade anyway,
    // but explicit avoids surprises if cascade behavior changes).
    await tx.dungeonEvent.deleteMany({ where: { userId: user.id } });
    // Drop all owned animals (cascade clears dungeon deployment state too).
    const deleted = await tx.ownedAnimal.deleteMany({ where: { userId: user.id } });
    // Hard-set balance (not increment) so multiple resets are idempotent.
    await tx.user.update({ where: { id: user.id }, data: { points } });
    // Audit log entry so the dashboard "Recent activity" reflects the reset.
    await tx.transaction.create({
      data: {
        userId: user.id,
        kind: "admin_adjust",
        delta: points - user.points,
        reason: "Player reset (clean slate + balance refresh)",
      },
    });
    return deleted.count;
  });

  console.log(`Cleared ${result} owned animals. Balance set to ${points.toLocaleString()} pts.`);
}

main().finally(() => prisma.$disconnect());

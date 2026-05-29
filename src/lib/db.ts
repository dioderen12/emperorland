import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// SQLite via better-sqlite3 — synchronous, file-based, perfect for VPS where
// the app and DB live on the same machine with a persistent disk.
// DATABASE_URL defaults to ./dev.db locally; on VPS set it to /data/prod.db
// (or wherever your persistent volume mounts) via .env.
function makeClient() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

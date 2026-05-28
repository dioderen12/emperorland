import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

// Two-mode database client:
//  - PRODUCTION (Turso): TURSO_DATABASE_URL is set → libSQL over HTTPS, perfect
//    for Vercel-style serverless. No connection pool needed.
//  - LOCAL DEV: fall back to better-sqlite3 against ./dev.db (file-based).
//
// Schema is shared because libSQL is SQLite-dialect compatible — no migration
// needed when moving between the two modes.
function makeClient() {
  if (process.env.TURSO_DATABASE_URL) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSql(libsql);
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

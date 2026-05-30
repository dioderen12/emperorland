// Admin: full fresh-start reset. Sets every player's points back to 500 and
// wipes all progress (owned Pokemon, dungeon state, history, raid) — but keeps
// the accounts themselves and the AnimalSpecies catalog. A new boss auto-spawns
// on the next Raid visit.
//
// Run on the VPS:  node scripts/reset-players.mjs
// Back up first:   cp prod.db prod.db.backup-$(date +%Y%m%d-%H%M%S)
import Database from "better-sqlite3";

const url = (process.env.DATABASE_URL || "file:./prod.db").replace(/^file:/, "");
const db = new Database(url);
db.pragma("foreign_keys = OFF");

const run = db.transaction(() => {
  db.prepare("DELETE FROM DungeonEvent").run();
  db.prepare("DELETE FROM BossAttack").run();
  db.prepare("DELETE FROM PackOpening").run();
  db.prepare('DELETE FROM "Transaction"').run();
  db.prepare("DELETE FROM OwnedAnimal").run();
  db.prepare("DELETE FROM Boss").run();
  return db.prepare("UPDATE User SET points = 500, lastBossAttackAt = NULL").run().changes;
});

const users = run();
console.log("✅ Users reset to 500 pts:", users);
console.log("   OwnedAnimal left:", db.prepare("SELECT COUNT(*) c FROM OwnedAnimal").get().c);
console.log("   Boss left:", db.prepare("SELECT COUNT(*) c FROM Boss").get().c);
console.log("   AnimalSpecies (catalog, should stay 386):", db.prepare("SELECT COUNT(*) c FROM AnimalSpecies").get().c);

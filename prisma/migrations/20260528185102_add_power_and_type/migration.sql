-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnimalSpecies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "spriteUrl" TEXT NOT NULL,
    "packWeight" INTEGER NOT NULL,
    "stakeRatePerHour" INTEGER NOT NULL,
    "power" INTEGER NOT NULL DEFAULT 0,
    "typeCode" TEXT NOT NULL DEFAULT 'NOR'
);
INSERT INTO "new_AnimalSpecies" ("id", "name", "packWeight", "rarity", "spriteUrl", "stakeRatePerHour") SELECT "id", "name", "packWeight", "rarity", "spriteUrl", "stakeRatePerHour" FROM "AnimalSpecies";
DROP TABLE "AnimalSpecies";
ALTER TABLE "new_AnimalSpecies" RENAME TO "AnimalSpecies";
CREATE UNIQUE INDEX "AnimalSpecies_name_key" ON "AnimalSpecies"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

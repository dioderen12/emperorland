-- AlterTable
ALTER TABLE "OwnedAnimal" ADD COLUMN "cooldownUntil" DATETIME;
ALTER TABLE "OwnedAnimal" ADD COLUMN "lastEventAt" DATETIME;

-- CreateTable
CREATE TABLE "DungeonEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ownedAnimalId" TEXT NOT NULL,
    "dungeonId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "cooldownMs" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DungeonEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DungeonEvent_ownedAnimalId_fkey" FOREIGN KEY ("ownedAnimalId") REFERENCES "OwnedAnimal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DungeonEvent_userId_occurredAt_idx" ON "DungeonEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "DungeonEvent_ownedAnimalId_idx" ON "DungeonEvent"("ownedAnimalId");

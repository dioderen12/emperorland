"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireUser } from "./user";
import { rollSpecies, pointsEarnedSince } from "./game";
import { getPack, getDungeon, calculateDungeonRate } from "./constants";
import { resolveEventsForUser } from "./events";

export type PackResult = {
  animals: Array<{
    id: string;
    speciesName: string;
    rarity: string;
    spriteUrl: string;
    power: number;
    typeCode: string;
  }>;
  newBalance: number;
};

// Atomically: deduct pack price, roll cards, create OwnedAnimal rows, log opening.
export async function openPack(packId: string): Promise<PackResult> {
  const user = await requireUser();
  const pack = getPack(packId);
  const catalog = await prisma.animalSpecies.findMany();
  if (catalog.length === 0) throw new Error("Animal catalog is empty");

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (current.points < pack.price) {
      throw new Error(`Need ${pack.price} points, have ${current.points}`);
    }

    const rolled = Array.from({ length: pack.cardsPerPack }, () =>
      rollSpecies(catalog, pack.rarityWeights),
    );

    await tx.user.update({
      where: { id: user.id },
      data: { points: { decrement: pack.price } },
    });

    const owned = await Promise.all(
      rolled.map((s) =>
        tx.ownedAnimal.create({
          data: { userId: user.id, speciesId: s.id },
          include: { species: true },
        }),
      ),
    );

    await tx.packOpening.create({
      data: {
        userId: user.id,
        cost: pack.price,
        resultJson: JSON.stringify({ packId: pack.id, species: rolled.map((s) => s.id) }),
      },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        kind: "pack_purchase",
        delta: -pack.price,
        reason: `${pack.name} opened`,
      },
    });

    const updated = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    return { owned, newBalance: updated.points };
  });

  revalidatePath("/");
  revalidatePath("/packs");
  revalidatePath("/inventory");

  return {
    animals: result.owned.map((o) => ({
      id: o.id,
      speciesName: o.species.name,
      rarity: o.species.rarity,
      spriteUrl: o.species.spriteUrl,
      power: o.species.power,
      typeCode: o.species.typeCode,
    })),
    newBalance: result.newBalance,
  };
}

// Deploy one or more animals to a dungeon. Charges deployCost × N points up front.
// Validates: each animal must be in party (dungeonId == null) and owned by user.
export async function deployToDungeon(animalIds: string[], dungeonId: string) {
  if (animalIds.length === 0) return;
  const user = await requireUser();
  const dungeon = getDungeon(dungeonId);
  const totalCost = dungeon.deployCost * animalIds.length;

  await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (current.points < totalCost) {
      throw new Error(`Deploy needs ${totalCost} pts, have ${current.points}`);
    }
    // Validate all animals belong to user and are not already deployed.
    const animals = await tx.ownedAnimal.findMany({
      where: { id: { in: animalIds }, userId: user.id, dungeonId: null },
    });
    if (animals.length !== animalIds.length) {
      throw new Error("Some animals can't be deployed (not owned or already deployed)");
    }

    await tx.user.update({
      where: { id: user.id },
      data: { points: { decrement: totalCost } },
    });
    await tx.ownedAnimal.updateMany({
      where: { id: { in: animalIds }, userId: user.id },
      data: { dungeonId, isStaked: true, stakedAt: new Date() },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        kind: "dungeon_deploy",
        delta: -totalCost,
        reason: `Deployed ${animals.length} to ${dungeon.name}`,
      },
    });
  });

  revalidatePath("/staking");
  revalidatePath("/inventory");
  revalidatePath("/");
}

// Recall — pause earning. Resolves pending events first so player doesn't
// lose accumulated drops by recalling. Earned-so-far gets banked into
// unclaimedPoints for explicit later claim.
export async function recallFromDungeon(animalIds: string[]) {
  if (animalIds.length === 0) return;
  const user = await requireUser();

  await prisma.$transaction(async (tx) => {
    await resolveEventsForUser(tx, user.id);

    const animals = await tx.ownedAnimal.findMany({
      where: { id: { in: animalIds }, userId: user.id, dungeonId: { not: null } },
      include: { species: true },
    });
    const now = new Date();
    for (const a of animals) {
      if (!a.stakedAt || !a.dungeonId) continue;
      const { rate } = calculateDungeonRate(a.species.stakeRatePerHour, a.species.typeCode, getDungeon(a.dungeonId));
      const earned = pointsEarnedSince(a.stakedAt, rate, now);
      await tx.ownedAnimal.update({
        where: { id: a.id },
        data: {
          dungeonId: null,
          isStaked: false,
          stakedAt: null,
          lastEventAt: null,
          cooldownUntil: null,
          unclaimedPoints: { increment: earned },
        },
      });
    }
  });

  revalidatePath("/staking");
  revalidatePath("/inventory");
}

// Claim all accumulated rewards across every deployed animal. Resolves pending
// events first to capture any newly-rolled drops. Resets per-animal stake clocks
// but keeps animals deployed.
export async function claimAllRewards() {
  const user = await requireUser();
  return await prisma.$transaction(async (tx) => {
    await resolveEventsForUser(tx, user.id);

    const deployed = await tx.ownedAnimal.findMany({
      where: { userId: user.id, dungeonId: { not: null } },
      include: { species: true },
    });
    const allUnclaimed = await tx.ownedAnimal.findMany({
      where: { userId: user.id, unclaimedPoints: { gt: 0 } },
    });
    const now = new Date();
    let total = 0;
    for (const a of deployed) {
      if (!a.stakedAt || !a.dungeonId) continue;
      const { rate } = calculateDungeonRate(a.species.stakeRatePerHour, a.species.typeCode, getDungeon(a.dungeonId));
      total += pointsEarnedSince(a.stakedAt, rate, now);
    }
    for (const a of allUnclaimed) {
      total += a.unclaimedPoints;
    }
    if (total <= 0) return { claimed: 0 };

    await tx.user.update({
      where: { id: user.id },
      data: { points: { increment: total } },
    });
    // Reset stake clocks for deployed animals; clear unclaimed on all rows.
    await tx.ownedAnimal.updateMany({
      where: { userId: user.id, dungeonId: { not: null } },
      data: { stakedAt: now, unclaimedPoints: 0 },
    });
    await tx.ownedAnimal.updateMany({
      where: { userId: user.id, dungeonId: null, unclaimedPoints: { gt: 0 } },
      data: { unclaimedPoints: 0 },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        kind: "stake_claim",
        delta: total,
        reason: `Collected from ${deployed.length} dungeon(s)`,
      },
    });

    revalidatePath("/staking");
    revalidatePath("/");
    return { claimed: total };
  });
}

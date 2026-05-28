// Idle exploration event system. Each deployed Pokemon rolls one RNG event
// per EVENT_TICK_MS. Events are resolved lazily on page load / action call.

import {
  EVENT_TICK_MS,
  MAX_EVENTS_PER_RESOLVE,
  getDungeon,
  type DungeonConfig,
} from "./constants";
import type { AnimalSpecies } from "@/generated/prisma/client";
import type { TransactionClient } from "@/generated/prisma/internal/prismaNamespace";

export type RolledEvent = {
  kind: string;
  pointsDelta: number;
  cooldownMs: number;
  description: string;
};

// Roll a single event for one Pokemon at one tick. Weighted distribution per
// dungeon multiplier — higher tier dungeons have richer treasure AND more
// dangerous mobs/bosses.
export function rollDungeonEvent(species: AnimalSpecies, dungeon: DungeonConfig): RolledEvent {
  const r = Math.random();
  const mult = dungeon.multiplier;
  // Type bonus also boosts effective combat power.
  const typeBoost = dungeon.preferredTypes.includes(species.typeCode) ? 1.3 : 1.0;
  const effectivePower = species.power * typeBoost;

  // 65% — small treasure find
  if (r < 0.65) {
    const reward = 2 * mult + Math.floor(Math.random() * 3 * mult);
    return {
      kind: "treasure",
      pointsDelta: reward,
      cooldownMs: 0,
      description: `${species.name} found a treasure (+${reward})`,
    };
  }

  // 15% — mob encounter, PWR vs random threshold
  if (r < 0.80) {
    const threshold = 100 + mult * 70 + Math.floor(Math.random() * 150);
    if (effectivePower >= threshold) {
      const reward = 8 * mult + Math.floor(Math.random() * 5 * mult);
      return {
        kind: "mob_win",
        pointsDelta: reward,
        cooldownMs: 0,
        description: `${species.name} defeated a wild encounter (+${reward})`,
      };
    }
    return {
      kind: "mob_loss",
      pointsDelta: 0,
      cooldownMs: 10 * 60 * 1000, // 10 min cooldown
      description: `${species.name} retreated from a tough mob (10m rest)`,
    };
  }

  // 15% — rare drop
  if (r < 0.95) {
    const reward = 25 * mult + Math.floor(Math.random() * 15 * mult);
    return {
      kind: "rare_drop",
      pointsDelta: reward,
      cooldownMs: 0,
      description: `${species.name} discovered a rare cache (+${reward})`,
    };
  }

  // 5% — boss. High risk, high reward. Requires substantial PWR for higher tiers.
  const bossThreshold = 250 + mult * 120;
  if (effectivePower >= bossThreshold) {
    const reward = 80 * mult + Math.floor(Math.random() * 40 * mult);
    return {
      kind: "boss_win",
      pointsDelta: reward,
      cooldownMs: 5 * 60 * 1000, // brief recovery
      description: `${species.name} downed a BOSS! (+${reward})`,
    };
  }
  return {
    kind: "boss_loss",
    pointsDelta: 0,
    cooldownMs: 45 * 60 * 1000, // 45 min — boss losses HURT
    description: `${species.name} got wrecked by a boss (45m down)`,
  };
}

// For each currently-deployed animal, resolve any RNG events that should have
// fired since lastEventAt. Updates animal state and creates DungeonEvent rows.
// Returns total points delta (sum of all event rewards) to add to user balance
// via unclaimedPoints accumulation.
export async function resolveEventsForUser(
  tx: TransactionClient,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  const deployed = await tx.ownedAnimal.findMany({
    where: { userId, dungeonId: { not: null } },
    include: { species: true },
  });

  for (const animal of deployed) {
    if (!animal.dungeonId || !animal.stakedAt) continue;
    const dungeon = getDungeon(animal.dungeonId);
    let cursor = animal.lastEventAt ?? animal.stakedAt;
    let cooldownUntil = animal.cooldownUntil;
    let totalReward = 0;
    const eventsToCreate: Array<RolledEvent & { occurredAt: Date }> = [];

    let ticksProcessed = 0;
    while (ticksProcessed < MAX_EVENTS_PER_RESOLVE) {
      const nextTick = new Date(cursor.getTime() + EVENT_TICK_MS);
      if (nextTick > now) break;

      // Skip ticks that fall inside an active cooldown — exploration paused.
      if (cooldownUntil && cooldownUntil > nextTick) {
        cursor = nextTick;
        ticksProcessed++;
        continue;
      }

      const event = rollDungeonEvent(animal.species, dungeon);
      totalReward += event.pointsDelta;
      if (event.cooldownMs > 0) {
        cooldownUntil = new Date(nextTick.getTime() + event.cooldownMs);
      }
      eventsToCreate.push({ ...event, occurredAt: nextTick });

      cursor = nextTick;
      ticksProcessed++;
    }

    if (eventsToCreate.length === 0) continue;

    // Bulk insert events for this animal.
    await tx.dungeonEvent.createMany({
      data: eventsToCreate.map((e) => ({
        userId,
        ownedAnimalId: animal.id,
        dungeonId: animal.dungeonId!,
        kind: e.kind,
        pointsDelta: e.pointsDelta,
        cooldownMs: e.cooldownMs,
        description: e.description,
        occurredAt: e.occurredAt,
      })),
    });

    await tx.ownedAnimal.update({
      where: { id: animal.id },
      data: {
        lastEventAt: cursor,
        cooldownUntil,
        unclaimedPoints: { increment: totalReward },
      },
    });
  }
}

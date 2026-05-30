import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { DUNGEONS, calculateDungeonRate, getDungeon } from "@/lib/constants";
import { resolveEventsForUser } from "@/lib/events";
import { DungeonView, type AnimalItem, type EventEntry } from "./DungeonView";
import { SignInGate } from "@/components/SignInGate";
import { AccessGate } from "@/components/AccessGate";
import { userHasAccess } from "@/lib/access";

export default async function StakingPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to deploy Pokemon into dungeons and earn points." />;
  if (!userHasAccess(user)) return <AccessGate username={user.username} />;

  // Resolve any RNG events that should have fired since last visit. This is
  // the "tick" — lazy, computed on read. Wrapped in a tx so partial failures
  // don't corrupt animal state.
  await prisma.$transaction(async (tx) => {
    await resolveEventsForUser(tx, user.id);
  });

  const [animals, recentEvents, freshUser] = await Promise.all([
    prisma.ownedAnimal.findMany({
      where: { userId: user.id, isListed: false },
      include: { species: true },
      orderBy: [{ dungeonId: "asc" }, { obtainedAt: "desc" }],
    }),
    prisma.dungeonEvent.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: "desc" },
      take: 25,
      include: { ownedAnimal: { include: { species: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
  ]);

  const items: AnimalItem[] = animals.map((a) => {
    const dungeon = a.dungeonId ? getDungeon(a.dungeonId) : null;
    const calc = dungeon
      ? calculateDungeonRate(a.species.stakeRatePerHour, a.species.typeCode, dungeon)
      : null;
    return {
      id: a.id,
      name: a.species.name,
      rarity: a.species.rarity,
      typeCode: a.species.typeCode,
      power: a.species.power,
      spriteUrl: a.species.spriteUrl,
      baseRatePerHour: a.species.stakeRatePerHour,
      dungeonId: a.dungeonId,
      stakedAtIso: a.stakedAt?.toISOString() ?? null,
      lastEventAtIso: a.lastEventAt?.toISOString() ?? null,
      cooldownUntilIso: a.cooldownUntil?.toISOString() ?? null,
      unclaimedPoints: a.unclaimedPoints,
      currentRate: calc?.rate ?? 0,
      typeBonus: calc?.bonusApplied ?? false,
    };
  });

  const events: EventEntry[] = recentEvents.map((e) => ({
    id: e.id,
    kind: e.kind,
    description: e.description,
    pointsDelta: e.pointsDelta,
    occurredAtIso: e.occurredAt.toISOString(),
    spriteUrl: e.ownedAnimal.species.spriteUrl,
    speciesName: e.ownedAnimal.species.name,
    dungeonId: e.dungeonId,
  }));

  return (
    <DungeonView
      balance={freshUser.points}
      items={items}
      events={events}
      dungeons={DUNGEONS.map((d) => ({ ...d }))}
    />
  );
}

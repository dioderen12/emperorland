import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { SignInGate } from "@/components/SignInGate";
import { AccessGate } from "@/components/AccessGate";
import { userHasAccess } from "@/lib/access";
import {
  getActiveBoss,
  getBossLeaderboard,
  estimateDamage,
  effectivenessOf,
  ATTACK_COOLDOWN_MS,
} from "@/lib/boss";
import { BossView, type Attacker } from "./BossView";

export default async function BossPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to join the community raid." />;
  if (!userHasAccess(user)) return <AccessGate username={user.username} />;

  const boss = await getActiveBoss();

  const [owned, leaderboard] = await Promise.all([
    prisma.ownedAnimal.findMany({ where: { userId: user.id }, include: { species: true } }),
    getBossLeaderboard(boss.id, user.id),
  ]);

  // Collapse duplicates → one attacker entry per species (any instance can hit).
  const bySpecies = new Map<string, Attacker>();
  for (const o of owned) {
    const existing = bySpecies.get(o.speciesId);
    if (existing) {
      existing.count += 1;
      continue;
    }
    bySpecies.set(o.speciesId, {
      ownedId: o.id,
      name: o.species.name,
      spriteUrl: o.species.spriteUrl,
      typeCode: o.species.typeCode,
      cp: o.species.power,
      est: estimateDamage(o.species.power, boss.element, o.species.typeCode),
      eff: effectivenessOf(boss.element, o.species.typeCode),
      count: 1,
    });
  }
  const attackers = [...bySpecies.values()].sort((a, b) => b.est - a.est);

  const cooldownRemainingMs = user.lastBossAttackAt
    ? Math.max(0, ATTACK_COOLDOWN_MS - (Date.now() - user.lastBossAttackAt.getTime()))
    : 0;

  return (
    <BossView
      boss={{
        name: boss.name,
        spriteUrl: boss.spriteUrl,
        element: boss.element,
        currentHp: boss.currentHp,
        maxHp: boss.maxHp,
        endsAtIso: boss.endsAt.toISOString(),
      }}
      attackers={attackers}
      leaderboard={leaderboard}
      cooldownRemainingMs={cooldownRemainingMs}
      cooldownTotalMs={ATTACK_COOLDOWN_MS}
    />
  );
}

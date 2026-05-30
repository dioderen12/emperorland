import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { SignInGate } from "@/components/SignInGate";
import { AccessGate } from "@/components/AccessGate";
import { userHasAccess } from "@/lib/access";
import { RankingView, type RankRow } from "./RankingView";

// Power ranking: the whole catalog sorted by CP (the stat that drives Arena/Raid
// damage), with an "owned" marker so it doubles as a chase-list.
export default async function RankingPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to see the power ranking." />;
  if (!userHasAccess(user)) return <AccessGate username={user.username} />;

  const [species, owned] = await Promise.all([
    prisma.animalSpecies.findMany(),
    prisma.ownedAnimal.findMany({ where: { userId: user.id }, select: { speciesId: true } }),
  ]);
  const ownedSet = new Set(owned.map((o) => o.speciesId));

  const rows: RankRow[] = species
    .map((s) => ({
      id: s.id,
      name: s.name,
      rarity: s.rarity,
      typeCode: s.typeCode,
      cp: s.power,
      staticUrl: s.spriteUrl.replace("/animated/", "/").replace(".gif", ".png"),
      owned: ownedSet.has(s.id),
    }))
    .sort((a, b) => b.cp - a.cp)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return <RankingView rows={rows} ownedCount={ownedSet.size} />;
}

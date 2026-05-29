import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { AnimalCard } from "@/components/AnimalCard";
import { RARITY_ORDER } from "@/lib/constants";
import { SignInGate } from "@/components/SignInGate";
import Link from "next/link";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to start your Pokemon collection." />;

  const animals = await prisma.ownedAnimal.findMany({
    where: { userId: user.id },
    include: { species: true },
    orderBy: { obtainedAt: "desc" },
  });

  // Group by species so duplicates collapse into a single card with a count.
  // This is how Pokemon TCG / similar games typically display large collections.
  const grouped = new Map<
    string,
    { species: (typeof animals)[number]["species"]; count: number; stakedCount: number }
  >();
  for (const a of animals) {
    const g = grouped.get(a.speciesId) ?? { species: a.species, count: 0, stakedCount: 0 };
    g.count += 1;
    if (a.isStaked) g.stakedCount += 1;
    grouped.set(a.speciesId, g);
  }

  // Sort by rarity (legendary first) then by name.
  const cards = Array.from(grouped.values()).sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.species.rarity as never);
    const rb = RARITY_ORDER.indexOf(b.species.rarity as never);
    if (ra !== rb) return rb - ra;
    return a.species.name.localeCompare(b.species.name);
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-xl sm:text-2xl text-[var(--accent)]">Bag</h1>
        <p className="text-slate-400 mt-2 text-lg">
          {animals.length} Pokemon across {grouped.size} species
        </p>
      </section>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-slate-400">No Pokemon yet.</p>
          <Link
            href="/packs"
            className="mt-3 inline-block text-purple-300 hover:text-purple-200 underline"
          >
            Open your first pack →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {cards.map((c) => (
            <AnimalCard
              key={c.species.id}
              spriteUrl={c.species.spriteUrl}
              name={c.species.name}
              rarity={c.species.rarity}
              typeCode={c.species.typeCode}
              subtitle={
                c.count > 1
                  ? `×${c.count}${c.stakedCount ? ` · ${c.stakedCount} staked` : ""}`
                  : c.stakedCount > 0
                    ? "staked"
                    : `${c.species.stakeRatePerHour}/hr staked`
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

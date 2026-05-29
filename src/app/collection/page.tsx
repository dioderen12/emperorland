import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { SignInGate } from "@/components/SignInGate";
import { CollectionView, type CollectionEntry } from "./CollectionView";

// Pokédex-style collection: shows ALL species. Owned ones are revealed; the rest
// are silhouettes — the "gotta catch 'em all" hook that gives the Discord
// something to chase and talk about.
export default async function CollectionPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to start filling out your Pokédex." />;

  const [species, ownedRows] = await Promise.all([
    prisma.animalSpecies.findMany(),
    prisma.ownedAnimal.findMany({
      where: { userId: user.id },
      select: { speciesId: true },
    }),
  ]);

  // How many of each species the player owns (duplicates count toward the badge).
  const countBySpecies = new Map<string, number>();
  for (const row of ownedRows) {
    countBySpecies.set(row.speciesId, (countBySpecies.get(row.speciesId) ?? 0) + 1);
  }

  // Dex number lives in the sprite filename (…/animated/25.gif). Use it for the
  // classic Pokédex ordering + the "#025" label, and to derive a lightweight
  // static (non-animated) sprite for the blacked-out silhouettes.
  const entries: CollectionEntry[] = species
    .map((s) => {
      const dex = Number(s.spriteUrl.match(/\/(\d+)\.gif$/)?.[1] ?? 0);
      return {
        id: s.id,
        dex,
        name: s.name,
        rarity: s.rarity,
        typeCode: s.typeCode,
        spriteUrl: s.spriteUrl,
        staticUrl: s.spriteUrl.replace("/animated/", "/").replace(".gif", ".png"),
        count: countBySpecies.get(s.id) ?? 0,
      };
    })
    .sort((a, b) => a.dex - b.dex);

  return <CollectionView entries={entries} />;
}

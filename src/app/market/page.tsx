import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { SignInGate } from "@/components/SignInGate";
import { AccessGate } from "@/components/AccessGate";
import { userHasAccess } from "@/lib/access";
import { FEE_PERCENT, MIN_PRICE } from "@/lib/market";
import { MarketView, type SellMon } from "./MarketView";

export default async function MarketPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to trade in the marketplace." />;
  if (!userHasAccess(user)) return <AccessGate username={user.username} />;

  const [owned, browse, mine] = await Promise.all([
    prisma.ownedAnimal.findMany({
      where: { userId: user.id, isListed: false, dungeonId: null },
      include: { species: true },
    }),
    prisma.listing.findMany({
      where: { status: "active", sellerId: { not: user.id } },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { ownedAnimal: { include: { species: true } }, seller: { select: { username: true } } },
    }),
    prisma.listing.findMany({
      where: { status: "active", sellerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { ownedAnimal: { include: { species: true } } },
    }),
  ]);

  // Sell picker: distinct sellable species + how many free copies.
  const bySpecies = new Map<string, SellMon>();
  for (const o of owned) {
    const ex = bySpecies.get(o.speciesId);
    if (ex) {
      ex.count += 1;
      continue;
    }
    bySpecies.set(o.speciesId, {
      speciesId: o.species.id,
      name: o.species.name,
      spriteUrl: o.species.spriteUrl,
      typeCode: o.species.typeCode,
      rarity: o.species.rarity,
      cp: o.species.power,
      count: 1,
    });
  }
  const sellMons = [...bySpecies.values()].sort((a, b) => b.cp - a.cp);

  const base = (m: { id: string; price: number; ownedAnimal: { species: { name: string; rarity: string; typeCode: string; power: number; spriteUrl: string } } }) => ({
    id: m.id,
    price: m.price,
    name: m.ownedAnimal.species.name,
    rarity: m.ownedAnimal.species.rarity,
    typeCode: m.ownedAnimal.species.typeCode,
    cp: m.ownedAnimal.species.power,
    spriteUrl: m.ownedAnimal.species.spriteUrl,
  });

  return (
    <MarketView
      balance={user.points}
      feePercent={FEE_PERCENT}
      minPrice={MIN_PRICE}
      sellMons={sellMons}
      browse={browse.map((m) => ({ ...base(m), seller: m.seller?.username || "player" }))}
      mine={mine.map((m) => ({ ...base(m), seller: null }))}
    />
  );
}

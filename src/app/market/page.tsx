import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { SignInGate } from "@/components/SignInGate";
import { AccessGate } from "@/components/AccessGate";
import { userHasAccess } from "@/lib/access";
import { FEE_PERCENT, MIN_PRICE } from "@/lib/market";
import { MarketView, type SellMon, type Sale } from "./MarketView";

export default async function MarketPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to trade in the marketplace." />;
  if (!userHasAccess(user)) return <AccessGate username={user.username} />;

  const [owned, active, sold, soldAgg] = await Promise.all([
    prisma.ownedAnimal.findMany({
      where: { userId: user.id, isListed: false, dungeonId: null },
      include: { species: true },
    }),
    // All active listings (own ones are shown too, just not buyable).
    prisma.listing.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: { ownedAnimal: { include: { species: true } }, seller: { select: { username: true } } },
    }),
    // Recent completed sales for the history feed.
    prisma.listing.findMany({
      where: { status: "sold" },
      orderBy: { soldAt: "desc" },
      take: 30,
      include: { ownedAnimal: { include: { species: true } }, seller: { select: { username: true } } },
    }),
    // All-time market volume + total sales.
    prisma.listing.aggregate({ where: { status: "sold" }, _sum: { price: true }, _count: true }),
  ]);

  const volume = soldAgg._sum.price ?? 0;
  const totalSales = soldAgg._count ?? 0;

  // Resolve buyer usernames (buyerId is a plain id, not a relation).
  const buyerIds = [...new Set(sold.map((s) => s.buyerId).filter(Boolean))] as string[];
  const buyers = buyerIds.length
    ? await prisma.user.findMany({ where: { id: { in: buyerIds } }, select: { id: true, username: true } })
    : [];
  const buyerName = new Map(buyers.map((b) => [b.id, b.username || "player"]));

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

  const listings = active.map((m) => ({
    ...base(m),
    seller: m.seller?.username || "player",
    mine: m.sellerId === user.id,
  }));

  const history: Sale[] = sold.map((m) => ({
    ...base(m),
    seller: m.seller?.username || "player",
    buyer: (m.buyerId && buyerName.get(m.buyerId)) || "player",
    soldAtIso: (m.soldAt ?? m.createdAt).toISOString(),
  }));

  return (
    <MarketView
      balance={user.points}
      feePercent={FEE_PERCENT}
      minPrice={MIN_PRICE}
      sellMons={sellMons}
      listings={listings}
      history={history}
      volume={volume}
      totalSales={totalSales}
    />
  );
}

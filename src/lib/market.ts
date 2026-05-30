import { prisma } from "./db";

// ── Tunables ─────────────────────────────────────────────────────────────
export const MIN_PRICE = 10;
export const FEE_PERCENT = 5; // % of sale taken by the house
// Account that collects market fees (matched on Discord name or username).
export const FEE_ACCOUNT = process.env.MARKET_FEE_ACCOUNT || "GuarEmperor";

export function feeFor(price: number) {
  return Math.ceil((price * FEE_PERCENT) / 100);
}

// List one owned Pokemon of a species for sale. Escrows it (isListed) so it
// can't be deployed / used in PvP / raid while on the market.
export async function listAnimal(userId: string, speciesId: string, price: number) {
  if (!Number.isFinite(price) || price < MIN_PRICE) throw new Error(`Minimum price is ${MIN_PRICE}.`);
  return prisma.$transaction(async (tx) => {
    const animal = await tx.ownedAnimal.findFirst({
      where: { userId, speciesId, isListed: false, dungeonId: null },
      include: { species: true },
    });
    if (!animal) throw new Error("No free copy to sell (it may be deployed or already listed).");
    await tx.ownedAnimal.update({ where: { id: animal.id }, data: { isListed: true } });
    return tx.listing.create({
      data: { ownedAnimalId: animal.id, sellerId: userId, price: Math.floor(price), status: "active" },
    });
  });
}

export async function cancelListing(userId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "active") throw new Error("Listing is no longer active.");
    if (listing.sellerId !== userId) throw new Error("Not your listing.");
    await tx.ownedAnimal.update({ where: { id: listing.ownedAnimalId }, data: { isListed: false } });
    return tx.listing.update({ where: { id: listingId }, data: { status: "cancelled" } });
  });
}

// Buy a listing: buyer pays the price, the Pokemon transfers to them, the seller
// gets price − fee, and the fee is credited to the house account (GuarEmperor).
export async function buyListing(userId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: listingId },
      include: { ownedAnimal: { include: { species: true } } },
    });
    if (!listing || listing.status !== "active") throw new Error("Listing is no longer available.");
    if (listing.sellerId === userId) throw new Error("You can't buy your own listing.");

    const buyer = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (buyer.points < listing.price) throw new Error("Not enough points.");

    const name = listing.ownedAnimal.species.name;
    const fee = feeFor(listing.price);
    const net = listing.price - fee;

    // buyer pays
    await tx.user.update({ where: { id: userId }, data: { points: { decrement: listing.price } } });
    await tx.transaction.create({
      data: { userId, kind: "market_buy", delta: -listing.price, reason: `Bought ${name}` },
    });
    // seller receives net
    await tx.user.update({ where: { id: listing.sellerId }, data: { points: { increment: net } } });
    await tx.transaction.create({
      data: { userId: listing.sellerId, kind: "market_sale", delta: net, reason: `Sold ${name} (−${fee} fee)` },
    });
    // house fee → GuarEmperor
    const house = await tx.user.findFirst({
      where: { OR: [{ name: FEE_ACCOUNT }, { username: FEE_ACCOUNT }] },
      select: { id: true },
    });
    if (house && fee > 0) {
      await tx.user.update({ where: { id: house.id }, data: { points: { increment: fee } } });
      await tx.transaction.create({
        data: { userId: house.id, kind: "market_fee", delta: fee, reason: `Market fee · ${name}` },
      });
    }
    // transfer the Pokemon to the buyer + reset its state
    await tx.ownedAnimal.update({
      where: { id: listing.ownedAnimalId },
      data: {
        userId,
        isListed: false,
        dungeonId: null,
        isStaked: false,
        stakedAt: null,
        unclaimedPoints: 0,
        lastEventAt: null,
        cooldownUntil: null,
      },
    });
    return tx.listing.update({
      where: { id: listingId },
      data: { status: "sold", soldAt: new Date(), buyerId: userId },
    });
  });
}

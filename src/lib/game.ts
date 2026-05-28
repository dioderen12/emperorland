import type { Rarity } from "./constants";
import type { AnimalSpecies } from "@/generated/prisma/client";

// Two-step roll: pick a rarity tier by the pack's weights, then a species
// within that tier weighted by packWeight. Tier percentages stay exactly as
// configured no matter how many species we add to the catalog.
export function rollSpecies(
  catalog: AnimalSpecies[],
  rarityWeights: Record<Rarity, number>,
): AnimalSpecies {
  const rarity = rollRarity(rarityWeights);
  const pool = catalog.filter((s) => s.rarity === rarity);
  if (pool.length === 0) {
    // Fallback if a rarity tier is empty (e.g. Elite pack with 0% common but
    // weights tail off) — fall back to any species. In practice this won't fire
    // unless the catalog is mis-seeded, but it keeps the roll safe.
    return weightedPick(catalog);
  }
  return weightedPick(pool);
}

function rollRarity(weights: Record<Rarity, number>): Rarity {
  const r = Math.random();
  let cum = 0;
  for (const [rarity, weight] of Object.entries(weights) as [Rarity, number][]) {
    cum += weight;
    if (r < cum) return rarity;
  }
  // Numerical guard — `weights` may not sum exactly to 1.0 due to floats.
  // Fall through to the last non-zero rarity.
  const ordered = (Object.entries(weights) as [Rarity, number][])
    .filter(([, w]) => w > 0)
    .map(([k]) => k);
  return ordered[ordered.length - 1] ?? "common";
}

function weightedPick<T extends { packWeight: number }>(items: T[]): T {
  const total = items.reduce((a, b) => a + b.packWeight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.packWeight;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

// Points earned by a single animal since its current stake began.
// Caller is responsible for adding `unclaimedPoints` from prior sessions.
export function pointsEarnedSince(stakedAt: Date, ratePerHour: number, now = new Date()): number {
  const hours = (now.getTime() - stakedAt.getTime()) / (1000 * 60 * 60);
  return Math.floor(hours * ratePerHour);
}

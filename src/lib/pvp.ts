import { prisma } from "./db";
import { effectivenessOf, type Effectiveness } from "./boss";
import { pickMoveId } from "./moves";
import type { TransactionClient } from "@/generated/prisma/internal/prismaNamespace";

// ── Tunables ─────────────────────────────────────────────────────────────
export const MIN_WAGER = 10;
const HP_MULT = 3.2; // fighter HP = cp × this → ~3 hits per KO
const CRIT_CHANCE = 0.1;
const CRIT_MULT = 1.8;

export type Fighter = {
  speciesId: string;
  name: string;
  spriteUrl: string;
  typeCode: string;
  cp: number;
};

export type BattleEvent =
  | {
      t: "attack";
      side: "a" | "b"; // attacker side
      atk: number; // attacker index in its team
      def: number; // defender index in its team
      move: string; // move id used (drives the VFX + name callout)
      dmg: number;
      crit: boolean;
      eff: Effectiveness;
      defHp: number; // defender HP remaining after the hit
    }
  | { t: "faint"; side: "a" | "b"; idx: number };

export type BattleLog = {
  teamA: (Fighter & { maxHp: number })[];
  teamB: (Fighter & { maxHp: number })[];
  events: BattleEvent[];
  winner: "a" | "b";
};

function hpFor(cp: number) {
  return Math.max(1, Math.round(cp * HP_MULT));
}

// Deterministic-ish 3v3 auto-battle with RNG. Active leads trade blows (higher
// CP strikes first); a fainted slot brings in the next fighter; side with
// Pokemon left wins. Produces an ordered event log for animated playback.
export function simulate(teamA: Fighter[], teamB: Fighter[]): BattleLog {
  const A = teamA.map((f) => ({ ...f, maxHp: hpFor(f.cp), hp: hpFor(f.cp) }));
  const B = teamB.map((f) => ({ ...f, maxHp: hpFor(f.cp), hp: hpFor(f.cp) }));
  const events: BattleEvent[] = [];
  let ai = 0;
  let bi = 0;
  let guard = 0;

  while (ai < A.length && bi < B.length && guard < 400) {
    guard++;
    const fa = A[ai];
    const fb = B[bi];
    const aFirst = fa.cp > fb.cp || (fa.cp === fb.cp && Math.random() < 0.5);
    const order: ("a" | "b")[] = aFirst ? ["a", "b"] : ["b", "a"];

    for (const side of order) {
      const atkF = side === "a" ? A[ai] : B[bi];
      const defF = side === "a" ? B[bi] : A[ai];
      if (atkF.hp <= 0 || defF.hp <= 0) continue;

      const eff = effectivenessOf(defF.typeCode, atkF.typeCode);
      const mult = eff === "strong" ? 1.5 : eff === "weak" ? 0.6 : 1;
      const crit = Math.random() < CRIT_CHANCE;
      const dmg = Math.max(
        1,
        Math.round(atkF.cp * mult * (0.8 + Math.random() * 0.4) * (crit ? CRIT_MULT : 1)),
      );
      defF.hp = Math.max(0, defF.hp - dmg);
      events.push({
        t: "attack",
        side,
        atk: side === "a" ? ai : bi,
        def: side === "a" ? bi : ai,
        move: pickMoveId(atkF.typeCode, Math.random()),
        dmg,
        crit,
        eff,
        defHp: defF.hp,
      });

      if (defF.hp <= 0) {
        const faintSide = side === "a" ? "b" : "a";
        events.push({ t: "faint", side: faintSide, idx: faintSide === "a" ? ai : bi });
        if (faintSide === "a") ai++;
        else bi++;
        break; // exchange ends on a faint
      }
    }
  }

  const totalHp = (t: typeof A) => t.reduce((s, f) => s + Math.max(0, f.hp), 0);
  const winner: "a" | "b" =
    bi >= B.length ? "a" : ai >= A.length ? "b" : totalHp(A) >= totalHp(B) ? "a" : "b";

  return {
    teamA: A.map(({ hp: _hp, ...rest }) => rest),
    teamB: B.map(({ hp: _hp, ...rest }) => rest),
    events,
    winner,
  };
}

// Validate the picker selection and snapshot the 3 fighters from the catalog.
async function buildTeam(
  tx: TransactionClient,
  userId: string,
  speciesIds: string[],
): Promise<Fighter[]> {
  if (speciesIds.length !== 3) throw new Error("Pick exactly 3 Pokemon.");
  if (new Set(speciesIds).size !== 3) throw new Error("Pick 3 different Pokemon.");
  const fighters: Fighter[] = [];
  for (const sid of speciesIds) {
    const owned = await tx.ownedAnimal.findFirst({
      where: { userId, speciesId: sid },
      include: { species: true },
    });
    if (!owned) throw new Error("You don't own one of those Pokemon.");
    const s = owned.species;
    fighters.push({ speciesId: s.id, name: s.name, spriteUrl: s.spriteUrl, typeCode: s.typeCode, cp: s.power });
  }
  return fighters;
}

// Create a match. opponentId = a specific user (directed challenge) or null (open
// lobby). Escrows the wager from the challenger immediately.
export async function createMatch(
  userId: string,
  speciesIds: string[],
  wager: number,
  opponentId: string | null,
) {
  if (!Number.isFinite(wager) || wager < MIN_WAGER) throw new Error(`Minimum wager is ${MIN_WAGER}.`);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.points < wager) throw new Error("Not enough points for that wager.");
    if (opponentId) {
      if (opponentId === userId) throw new Error("You can't challenge yourself.");
      const opp = await tx.user.findUnique({ where: { id: opponentId } });
      if (!opp) throw new Error("Opponent not found.");
    }
    const team = await buildTeam(tx, userId, speciesIds);
    await tx.user.update({ where: { id: userId }, data: { points: { decrement: wager } } });
    await tx.transaction.create({
      data: { userId, kind: "pvp_stake", delta: -wager, reason: "PvP wager staked" },
    });
    return tx.match.create({
      data: {
        status: "open",
        wager,
        directed: Boolean(opponentId),
        challengerId: userId,
        opponentId: opponentId ?? null,
        challengerTeam: JSON.stringify(team),
      },
    });
  });
}

// Accept an open match with your own team, then resolve the battle and settle
// the pot to the winner. Returns the resolved match (with logJson for playback).
export async function acceptMatch(userId: string, matchId: string, speciesIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "open") throw new Error("Match is no longer available.");
    if (match.challengerId === userId) throw new Error("You can't accept your own challenge.");
    if (match.directed && match.opponentId !== userId) throw new Error("This challenge isn't for you.");

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.points < match.wager) throw new Error("Not enough points to match the wager.");

    const teamB = await buildTeam(tx, userId, speciesIds);
    await tx.user.update({ where: { id: userId }, data: { points: { decrement: match.wager } } });
    await tx.transaction.create({
      data: { userId, kind: "pvp_stake", delta: -match.wager, reason: "PvP wager staked" },
    });

    const teamA = JSON.parse(match.challengerTeam) as Fighter[];
    const log = simulate(teamA, teamB);
    const winnerId = log.winner === "a" ? match.challengerId : userId;
    const pot = match.wager * 2;

    await tx.user.update({ where: { id: winnerId }, data: { points: { increment: pot } } });
    await tx.transaction.create({
      data: { userId: winnerId, kind: "pvp_win", delta: pot, reason: "PvP victory — pot won" },
    });

    return tx.match.update({
      where: { id: matchId },
      data: {
        status: "resolved",
        opponentId: userId,
        opponentTeam: JSON.stringify(teamB),
        winnerId,
        logJson: JSON.stringify(log),
        resolvedAt: new Date(),
        challengerSeen: false, // challenger gets notified + auto-play next visit
      },
    });
  });
}

// Challenger cancels their still-open match → refund the escrowed wager.
export async function cancelMatch(userId: string, matchId: string) {
  return prisma.$transaction(async (tx) => {
    const m = await tx.match.findUnique({ where: { id: matchId } });
    if (!m || m.status !== "open") throw new Error("This match can't be cancelled.");
    if (m.challengerId !== userId) throw new Error("Not your match.");
    await tx.user.update({ where: { id: userId }, data: { points: { increment: m.wager } } });
    await tx.transaction.create({
      data: { userId, kind: "pvp_refund", delta: m.wager, reason: "PvP wager refunded" },
    });
    return tx.match.update({ where: { id: matchId }, data: { status: "cancelled" } });
  });
}

// Mark a resolved match as watched by its challenger (stops the notification +
// auto-play). No-op if the caller isn't the challenger.
export async function markChallengerSeen(userId: string, matchId: string) {
  await prisma.match.updateMany({
    where: { id: matchId, challengerId: userId },
    data: { challengerSeen: true },
  });
}

// Directed target declines a challenge → refund the challenger.
export async function declineMatch(userId: string, matchId: string) {
  return prisma.$transaction(async (tx) => {
    const m = await tx.match.findUnique({ where: { id: matchId } });
    if (!m || m.status !== "open" || !m.directed) throw new Error("Nothing to decline.");
    if (m.opponentId !== userId) throw new Error("This challenge isn't for you.");
    await tx.user.update({ where: { id: m.challengerId }, data: { points: { increment: m.wager } } });
    await tx.transaction.create({
      data: {
        userId: m.challengerId,
        kind: "pvp_refund",
        delta: m.wager,
        reason: "PvP challenge declined — refunded",
      },
    });
    return tx.match.update({ where: { id: matchId }, data: { status: "declined" } });
  });
}

import { prisma } from "./db";

// ── Tunables ─────────────────────────────────────────────────────────────
export const BOSS_MAX_HP = 120_000; // total community HP — ~2-3 days for a small-mid raid
export const BOSS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // boss lives a week
export const ATTACK_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between a user's hits
export const REWARD_POOL = 50_000; // points split among raiders by damage share
export const PARTICIPATION_REWARD = 200; // floor for anyone who landed a hit
export const CRIT_CHANCE = 0.12;
export const CRIT_MULT = 2;

const SPRITE = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;

// Boss roster — iconic Gen 1-3 legendaries, each with an element.
const ROSTER = [
  { name: "Mewtwo", element: "PSY", dex: 150 },
  { name: "Rayquaza", element: "DRA", dex: 384 },
  { name: "Groudon", element: "GRD", dex: 383 },
  { name: "Kyogre", element: "WTR", dex: 382 },
  { name: "Moltres", element: "FIR", dex: 146 },
  { name: "Zapdos", element: "ELC", dex: 145 },
  { name: "Articuno", element: "ICE", dex: 144 },
  { name: "Ho-Oh", element: "FIR", dex: 250 },
  { name: "Lugia", element: "PSY", dex: 249 },
];

// Attacker TYPES that are super-effective (1.5×) / resisted (0.6×) vs a boss element.
const STRONG_VS: Record<string, string[]> = {
  FIR: ["WTR", "ROC", "GRD"],
  WTR: ["GRS", "ELC"],
  ELC: ["GRD"],
  PSY: ["BUG", "GHO", "DAR"],
  ICE: ["FIR", "FIG", "ROC", "STE"],
  DRA: ["ICE", "DRA", "FAI"],
  GRD: ["WTR", "GRS", "ICE"],
};
const WEAK_VS: Record<string, string[]> = {
  FIR: ["FIR", "GRS", "ICE", "BUG", "STE", "FAI"],
  WTR: ["WTR", "FIR", "ICE", "STE"],
  ELC: ["ELC", "FLY", "STE"],
  PSY: ["PSY", "FIG"],
  ICE: ["ICE"],
  DRA: ["FIR", "WTR", "GRS", "ELC"],
  GRD: ["POI", "ROC"],
};

export type Effectiveness = "strong" | "normal" | "weak";

export function effectivenessOf(bossElement: string, attackerType: string): Effectiveness {
  if (STRONG_VS[bossElement]?.includes(attackerType)) return "strong";
  if (WEAK_VS[bossElement]?.includes(attackerType)) return "weak";
  return "normal";
}

export function typeMultiplier(bossElement: string, attackerType: string): number {
  const e = effectivenessOf(bossElement, attackerType);
  return e === "strong" ? 1.5 : e === "weak" ? 0.6 : 1;
}

// Expected (no-variance, no-crit) hit — shown to the player as the estimate.
export function estimateDamage(cp: number, bossElement: string, attackerType: string): number {
  return Math.max(1, Math.round(cp * typeMultiplier(bossElement, attackerType)));
}

async function spawnBoss() {
  const pick = ROSTER[Math.floor(Math.random() * ROSTER.length)];
  return prisma.boss.create({
    data: {
      name: pick.name,
      element: pick.element,
      spriteUrl: SPRITE(pick.dex),
      maxHp: BOSS_MAX_HP,
      currentHp: BOSS_MAX_HP,
      endsAt: new Date(Date.now() + BOSS_DURATION_MS),
    },
  });
}

// The current boss, spawning a fresh one if none is active. Lazy — no cron.
export async function getActiveBoss() {
  const boss = await prisma.boss.findFirst({
    where: { status: "active" },
    orderBy: { spawnedAt: "desc" },
  });
  if (boss && boss.currentHp > 0) return boss;
  return spawnBoss();
}

// Damage leaderboard for a boss: top raiders + the caller's own rank.
export async function getBossLeaderboard(bossId: string, meId: string) {
  const attacks = await prisma.bossAttack.findMany({
    where: { bossId },
    select: { userId: true, damage: true },
  });
  const byUser = new Map<string, number>();
  for (const a of attacks) byUser.set(a.userId, (byUser.get(a.userId) ?? 0) + a.damage);
  const ranked = [...byUser.entries()].sort((a, b) => b[1] - a[1]);

  const wantIds = ranked.slice(0, 10).map((r) => r[0]);
  if (meId && byUser.has(meId) && !wantIds.includes(meId)) wantIds.push(meId);
  const users = await prisma.user.findMany({
    where: { id: { in: wantIds } },
    select: { id: true, username: true, image: true },
  });
  const umap = new Map(users.map((u) => [u.id, u]));

  const row = (uid: string, dmg: number, i: number) => ({
    rank: i + 1,
    userId: uid,
    username: umap.get(uid)?.username || "player",
    image: umap.get(uid)?.image ?? null,
    damage: dmg,
  });

  const top = ranked.slice(0, 10).map(([uid, dmg], i) => row(uid, dmg, i));
  const meIdx = ranked.findIndex(([uid]) => uid === meId);
  const me = meIdx >= 0 ? row(meId, ranked[meIdx][1], meIdx) : null;

  return {
    top,
    me,
    raiders: ranked.length,
    totalDamage: ranked.reduce((s, r) => s + r[1], 0),
  };
}

export type AttackResult = {
  damage: number;
  crit: boolean;
  effectiveness: Effectiveness;
  newHp: number;
  maxHp: number;
  bossName: string;
  defeated: boolean;
  reward: number; // points this user earned if their hit was the killing blow
};

// Land one hit. Validates cooldown + ownership, applies damage atomically, and
// on the killing blow distributes the reward pool to every raider by damage share.
export async function attackBoss(userId: string, ownedAnimalId: string): Promise<AttackResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.lastBossAttackAt) {
      const left = ATTACK_COOLDOWN_MS - (Date.now() - user.lastBossAttackAt.getTime());
      if (left > 0) throw new Error(`On cooldown — back in ${Math.ceil(left / 60000)} min.`);
    }

    const owned = await tx.ownedAnimal.findFirst({
      where: { id: ownedAnimalId, userId, isListed: false },
      include: { species: true },
    });
    if (!owned) throw new Error("You don't own that Pokemon (or it's listed for sale).");

    const boss = await tx.boss.findFirst({
      where: { status: "active" },
      orderBy: { spawnedAt: "desc" },
    });
    if (!boss || boss.currentHp <= 0) throw new Error("No active boss right now — refresh.");

    const eff = effectivenessOf(boss.element, owned.species.typeCode);
    const mult = eff === "strong" ? 1.5 : eff === "weak" ? 0.6 : 1;
    const crit = Math.random() < CRIT_CHANCE;
    const variance = 0.85 + Math.random() * 0.3;
    const damage = Math.max(
      1,
      Math.round(owned.species.power * mult * variance * (crit ? CRIT_MULT : 1)),
    );
    const newHp = Math.max(0, boss.currentHp - damage);

    await tx.boss.update({ where: { id: boss.id }, data: { currentHp: newHp } });
    await tx.bossAttack.create({ data: { bossId: boss.id, userId, damage, crit } });
    await tx.user.update({ where: { id: userId }, data: { lastBossAttackAt: new Date() } });

    let reward = 0;
    if (newHp <= 0) {
      const attacks = await tx.bossAttack.findMany({
        where: { bossId: boss.id },
        select: { userId: true, damage: true },
      });
      const byUser = new Map<string, number>();
      for (const a of attacks) byUser.set(a.userId, (byUser.get(a.userId) ?? 0) + a.damage);
      const total = [...byUser.values()].reduce((s, d) => s + d, 0) || 1;
      const ranked = [...byUser.entries()].sort((a, b) => b[1] - a[1]);

      for (let i = 0; i < ranked.length; i++) {
        const [uid, dmg] = ranked[i];
        let pts = PARTICIPATION_REWARD + Math.round((REWARD_POOL * dmg) / total);
        if (i === 0) pts = Math.round(pts * 1.5);
        else if (i === 1) pts = Math.round(pts * 1.25);
        else if (i === 2) pts = Math.round(pts * 1.1);
        await tx.user.update({ where: { id: uid }, data: { points: { increment: pts } } });
        await tx.transaction.create({
          data: { userId: uid, kind: "boss_reward", delta: pts, reason: `${boss.name} raid defeated` },
        });
        if (uid === userId) reward = pts;
      }
      await tx.boss.update({
        where: { id: boss.id },
        data: { status: "defeated", defeatedAt: new Date() },
      });
    }

    return {
      damage,
      crit,
      effectiveness: eff,
      newHp,
      maxHp: boss.maxHp,
      bossName: boss.name,
      defeated: newHp <= 0,
      reward,
    };
  });
}

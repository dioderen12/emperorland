"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { attackBoss } from "@/lib/actions";
import { TYPE_COLOR } from "@/lib/constants";

export type Attacker = {
  ownedId: string;
  name: string;
  spriteUrl: string;
  typeCode: string;
  cp: number;
  est: number;
  eff: "strong" | "normal" | "weak";
  count: number;
};

type LbRow = { rank: number; userId: string; username: string; image: string | null; damage: number };
type Leaderboard = { top: LbRow[]; me: LbRow | null; raiders: number; totalDamage: number };

type Boss = {
  name: string;
  spriteUrl: string;
  element: string;
  currentHp: number;
  maxHp: number;
  endsAtIso: string;
};

const EFF_BADGE: Record<Attacker["eff"], { label: string; cls: string }> = {
  strong: { label: "▲ 1.5×", cls: "bg-emerald-500 text-emerald-950" },
  normal: { label: "1×", cls: "bg-slate-600 text-slate-100" },
  weak: { label: "▼ 0.6×", cls: "bg-rose-600 text-rose-50" },
};

function fmtDuration(ms: number) {
  if (ms <= 0) return "00:00";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function BossView({
  boss,
  attackers,
  leaderboard,
  cooldownRemainingMs,
  cooldownTotalMs,
}: {
  boss: Boss;
  attackers: Attacker[];
  leaderboard: Leaderboard;
  cooldownRemainingMs: number;
  cooldownTotalMs: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cooldownMs, setCooldownMs] = useState(cooldownRemainingMs);
  const [now, setNow] = useState(0); // 0 until mounted — avoids SSR/client time mismatch
  const [hit, setHit] = useState<{ damage: number; crit: boolean; eff: Attacker["eff"] } | null>(null);
  const [defeated, setDefeated] = useState<{ name: string; reward: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1s ticker for cooldown + boss expiry countdown.
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => {
      setCooldownMs((ms) => (ms > 0 ? Math.max(0, ms - 1000) : 0));
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const endsInMs = Math.max(0, Date.parse(boss.endsAtIso) - now);
  const hpPct = Math.max(0, Math.round((boss.currentHp / boss.maxHp) * 100));
  const onCooldown = cooldownMs > 0;

  function attack(ownedId: string) {
    if (onCooldown || pending) return;
    setError(null);
    setHit(null);
    startTransition(async () => {
      try {
        const r = await attackBoss(ownedId);
        setHit({ damage: r.damage, crit: r.crit, eff: r.effectiveness });
        setCooldownMs(cooldownTotalMs);
        if (r.defeated) setDefeated({ name: r.bossName, reward: r.reward });
        router.refresh(); // resync HP / leaderboard / (new boss if defeated)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Attack failed");
      }
    });
  }

  const meId = leaderboard.me?.userId;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-xl sm:text-2xl text-[var(--accent-3)]">Raid Boss</h1>
        <p className="text-slate-400 mt-2 text-lg">
          Whole community vs one boss. Hit it, climb the leaderboard, split the loot when it drops.
        </p>
      </section>

      {/* Boss panel */}
      <section className="pixel-panel p-5">
        <div className="flex items-center gap-4">
          <div className="shrink-0 border-[3px] border-[var(--ink)] bg-black/40 p-2">
            <Image
              src={boss.spriteUrl}
              alt={boss.name}
              width={96}
              height={96}
              unoptimized
              style={{ imageRendering: "pixelated", width: 96, height: 96 }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-base text-white">{boss.name}</span>
              <span className={`pixel-badge text-[8px] uppercase px-1.5 py-0.5 ${TYPE_COLOR[boss.element] ?? TYPE_COLOR.NOR}`}>
                {boss.element}
              </span>
            </div>
            {/* HP bar */}
            <div className="mt-2 h-5 w-full border-2 border-[var(--ink)] bg-black/60 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-500"
                style={{ width: `${hpPct}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()} HP
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-slate-400">
              <span>👥 {leaderboard.raiders} raiders</span>
              <span>⚔️ {leaderboard.totalDamage.toLocaleString()} dmg</span>
              <span>⏳ ends in {now ? fmtDuration(endsInMs) : "…"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Defeated celebration */}
      {defeated && (
        <section className="pixel-panel p-5 text-center border-t-[6px] border-t-amber-400">
          <p className="font-display text-sm text-amber-300">🎉 FINAL BLOW!</p>
          <p className="text-lg text-slate-200 mt-2">
            You took down <span className="font-bold">{defeated.name}</span> and earned{" "}
            <span className="text-[var(--accent)] font-bold">+{defeated.reward.toLocaleString()}</span> coins.
            A fresh boss has spawned!
          </p>
        </section>
      )}

      {/* Hit result */}
      {hit && !defeated && (
        <p className="text-center text-lg">
          <span className="text-[var(--accent)] font-bold">−{hit.damage.toLocaleString()}</span>
          {hit.crit && <span className="text-amber-300 font-bold"> CRIT!</span>}
          {hit.eff === "strong" && <span className="text-emerald-400"> super effective!</span>}
          {hit.eff === "weak" && <span className="text-rose-400"> not very effective…</span>}
        </p>
      )}
      {error && <p className="text-center text-[var(--accent-3)] text-base">{error}</p>}

      {/* Attack picker */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-xs text-slate-300 uppercase">Choose attacker</h2>
          {onCooldown ? (
            <span className="text-base text-slate-400">cooldown {fmtDuration(cooldownMs)}</span>
          ) : (
            <span className="text-base text-emerald-400">ready!</span>
          )}
        </div>

        {attackers.length === 0 ? (
          <p className="pixel-panel p-6 text-center text-slate-400 text-lg">
            No Pokemon yet — open a pack first.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {attackers.map((a) => {
              const badge = EFF_BADGE[a.eff];
              return (
                <button
                  key={a.ownedId}
                  onClick={() => attack(a.ownedId)}
                  disabled={onCooldown || pending}
                  className="pixel-panel p-2 flex flex-col items-center text-center disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:translate-x-[2px] enabled:hover:translate-y-[2px] enabled:hover:shadow-[3px_3px_0_0_rgba(0,0,0,0.5)] transition-all"
                >
                  <Image
                    src={a.spriteUrl}
                    alt={a.name}
                    width={56}
                    height={56}
                    unoptimized
                    style={{ imageRendering: "pixelated", width: 56, height: 56 }}
                  />
                  <span className="text-sm text-white truncate w-full leading-tight">{a.name}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`pixel-badge text-[7px] uppercase px-1 py-0.5 ${TYPE_COLOR[a.typeCode] ?? TYPE_COLOR.NOR}`}>
                      {a.typeCode}
                    </span>
                    <span className={`pixel-badge text-[7px] px-1 py-0.5 ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 leading-none">CP {a.cp}</span>
                  <span className="text-sm text-[var(--accent)] leading-none mt-0.5">~{a.est}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section>
        <h2 className="font-display text-xs text-slate-300 uppercase mb-3">Top Raiders</h2>
        {leaderboard.top.length === 0 ? (
          <p className="pixel-panel p-6 text-center text-slate-400 text-lg">
            No hits yet. Be the first to strike!
          </p>
        ) : (
          <ul className="pixel-panel divide-y-[3px] divide-[var(--ink)] overflow-hidden">
            {leaderboard.top.map((r) => (
              <LbItem key={r.userId} row={r} me={r.userId === meId} />
            ))}
            {leaderboard.me && leaderboard.me.rank > 10 && (
              <LbItem row={leaderboard.me} me />
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function LbItem({ row, me }: { row: LbRow; me: boolean }) {
  const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`;
  return (
    <li className={`flex items-center gap-3 px-4 py-2 ${me ? "bg-[var(--accent)]/15" : ""}`}>
      <span className="w-8 text-center text-base text-slate-300">{medal}</span>
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.image} alt="" width={24} height={24} className="rounded-full" />
      ) : (
        <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs">
          {row.username.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className={`flex-1 truncate text-lg ${me ? "text-[var(--accent)] font-bold" : "text-slate-200"}`}>
        {row.username}
        {me && " (you)"}
      </span>
      <span className="text-lg text-slate-300 tabular-nums">{row.damage.toLocaleString()}</span>
    </li>
  );
}

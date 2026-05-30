import Link from "next/link";
import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { PACKS } from "@/lib/constants";
import { SignInGate } from "@/components/SignInGate";
import { SkyBanner } from "@/components/SkyBanner";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate title="Welcome to EmperorLand" />;

  const [ownedCount, stakedCount, lastTx] = await Promise.all([
    prisma.ownedAnimal.count({ where: { userId: user.id } }),
    prisma.ownedAnimal.count({ where: { userId: user.id, isStaked: true } }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Manga sky hero */}
      <section className="relative -mt-8 -mx-4 mb-2 h-40 sm:h-48 overflow-hidden">
        <SkyBanner className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="font-clean text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 drop-shadow-[0_1px_6px_rgba(255,255,255,0.8)]">
            Welcome, {user.username}
          </h1>
          <p className="font-clean text-slate-900 mt-1.5 text-base font-medium drop-shadow-[0_1px_5px_rgba(255,255,255,0.9)]">
            Open packs · deploy Pokemon · earn points.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Coins" value={user.points.toLocaleString()} accent="amber" />
        <Stat label="Caught" value={ownedCount.toString()} accent="indigo" />
        <Stat label="Deployed" value={stakedCount.toString()} accent="emerald" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/packs"
          className="pixel-panel p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,0.5)] transition-all"
        >
          <h2 className="font-display text-sm text-purple-300">🎴 Open a Pack</h2>
          <p className="text-lg text-slate-300 mt-2 leading-snug">
            From {PACKS[0].price} coins · {PACKS.length} tiers, biased odds
          </p>
        </Link>
        <Link
          href="/staking"
          className="pixel-panel p-6 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,0.5)] transition-all"
        >
          <h2 className="font-display text-sm text-emerald-300">⚔️ Enter Dungeon</h2>
          <p className="text-lg text-slate-300 mt-2 leading-snug">
            Deploy Pokemon into 3 risk tiers · type bonus +50%
          </p>
        </Link>
      </section>

      {lastTx.length > 0 && (
        <section>
          <h2 className="font-display text-xs text-slate-300 mb-3 uppercase">Recent activity</h2>
          <ul className="pixel-panel divide-y-[3px] divide-[var(--ink)] overflow-hidden">
            {lastTx.map((t) => (
              <li key={t.id} className="flex items-center px-4 py-2 text-lg">
                <span className="flex-1 text-slate-300">{t.reason ?? t.kind}</span>
                <span className={t.delta > 0 ? "text-emerald-400" : "text-[var(--accent-3)]"}>
                  {t.delta > 0 ? "+" : ""}
                  {t.delta}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "amber" | "indigo" | "emerald" }) {
  const ring = {
    amber: "border-t-amber-400",
    indigo: "border-t-indigo-400",
    emerald: "border-t-emerald-400",
  }[accent];
  return (
    <div className={`pixel-panel border-t-[6px] ${ring} p-4`}>
      <div className="text-sm uppercase tracking-wider text-slate-400">{label}</div>
      <div className="font-display text-base sm:text-lg mt-2 text-white">{value}</div>
    </div>
  );
}

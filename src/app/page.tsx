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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
            Welcome back, {user.username}.
          </h1>
          <p className="text-slate-200/90 mt-1 text-sm drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
            Open packs · deploy Pokemon · earn community points.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Points" value={user.points.toLocaleString()} accent="amber" />
        <Stat label="Pokemon owned" value={ownedCount.toString()} accent="indigo" />
        <Stat label="In dungeons" value={stakedCount.toString()} accent="emerald" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/packs"
          className="rounded-2xl border border-purple-400/40 bg-purple-500/20 p-6 hover:bg-purple-500/30 transition"
        >
          <h2 className="font-bold text-xl">🎴 Open a Pack</h2>
          <p className="text-sm text-purple-100/80 mt-1">
            From {PACKS[0].price} pts · {PACKS.length} tiers, biased odds
          </p>
        </Link>
        <Link
          href="/staking"
          className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 p-6 hover:bg-emerald-500/30 transition"
        >
          <h2 className="font-bold text-xl">⚔️ Enter Dungeon</h2>
          <p className="text-sm text-emerald-100/80 mt-1">
            Deploy Pokemon into 3 risk tiers · type bonus +50%
          </p>
        </Link>
      </section>

      {lastTx.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent activity</h2>
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
            {lastTx.map((t) => (
              <li key={t.id} className="flex items-center px-4 py-2 text-sm">
                <span className="flex-1 text-slate-300">{t.reason ?? t.kind}</span>
                <span className={t.delta > 0 ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>
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
  const colors = {
    amber: "from-amber-500/20 to-amber-500/5 border-amber-400/30",
    indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-400/30",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30",
  }[accent];
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colors} p-5`}>
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-3xl font-bold font-mono mt-1">{value}</div>
    </div>
  );
}

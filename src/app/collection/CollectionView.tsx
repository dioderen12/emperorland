"use client";

import { useMemo, useState } from "react";
import { AnimalCard } from "@/components/AnimalCard";
import { RARITY_BADGE, RARITY_ORDER, type Rarity } from "@/lib/constants";

export type CollectionEntry = {
  id: string;
  dex: number;
  name: string;
  rarity: string;
  typeCode: string;
  power: number;
  spriteUrl: string;
  staticUrl: string;
  count: number;
};

type Tab = "all" | "owned" | "missing";

const RARITY_DOT: Record<Rarity, string> = {
  common: "bg-slate-400",
  uncommon: "bg-emerald-400",
  rare: "bg-sky-400",
  epic: "bg-purple-400",
  legendary: "bg-amber-400",
};

export function CollectionView({ entries }: { entries: CollectionEntry[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");

  const total = entries.length;
  const ownedTotal = useMemo(() => entries.filter((e) => e.count > 0).length, [entries]);
  const pct = total ? Math.round((ownedTotal / total) * 100) : 0;

  // Owned / total per rarity — drives the filter chips and the breakdown.
  const byRarity = useMemo(() => {
    const m: Record<string, { owned: number; total: number }> = {};
    for (const r of RARITY_ORDER) m[r] = { owned: 0, total: 0 };
    for (const e of entries) {
      const b = m[e.rarity] ?? (m[e.rarity] = { owned: 0, total: 0 });
      b.total += 1;
      if (e.count > 0) b.owned += 1;
    }
    return m;
  }, [entries]);

  const visible = useMemo(
    () =>
      entries.filter((e) => {
        if (tab === "owned" && e.count === 0) return false;
        if (tab === "missing" && e.count > 0) return false;
        if (rarity !== "all" && e.rarity !== rarity) return false;
        return true;
      }),
    [entries, tab, rarity],
  );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Collection</h1>
        <p className="text-slate-400 mt-1">
          Your Pokédex — {ownedTotal} of {total} caught. Hunt the silhouettes.
        </p>
      </section>

      {/* Overall progress */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-400">Completion</span>
          <span className="font-mono font-bold text-lg">{pct}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {RARITY_ORDER.map((r) => (
            <span key={r} className="inline-flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${RARITY_DOT[r]}`} />
              <span className="capitalize">{r}</span>
              <span className="font-mono text-white/70">
                {byRarity[r].owned}/{byRarity[r].total}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(["all", "owned", "missing"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition ${
                tab === t ? "bg-indigo-500 text-white" : "bg-transparent text-slate-300 hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip active={rarity === "all"} onClick={() => setRarity("all")}>
            All
          </Chip>
          {RARITY_ORDER.map((r) => (
            <Chip key={r} active={rarity === r} onClick={() => setRarity(r)}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${RARITY_DOT[r]} mr-1`} />
              <span className="capitalize">{r}</span>
            </Chip>
          ))}
        </div>
      </section>

      {/* Grid */}
      {visible.length === 0 ? (
        <p className="text-center text-slate-500 py-12">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {visible.map((e) =>
            e.count > 0 ? (
              <div key={e.id} className="relative">
                <DexTag dex={e.dex} />
                <AnimalCard
                  spriteUrl={e.spriteUrl}
                  name={e.name}
                  rarity={e.rarity}
                  typeCode={e.typeCode}
                  power={e.power}
                  subtitle={e.count > 1 ? `×${e.count}` : undefined}
                  size="sm"
                />
              </div>
            ) : (
              <LockedCard key={e.id} entry={e} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition ${
        active
          ? "border-white/40 bg-white/10 text-white"
          : "border-white/10 text-slate-400 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function DexTag({ dex }: { dex: number }) {
  return (
    <span className="absolute top-1 left-1 z-10 font-mono text-[9px] text-white/40 bg-black/40 rounded px-1">
      #{String(dex).padStart(3, "0")}
    </span>
  );
}

// Blacked-out silhouette for un-owned species — static (non-animated) sprite so a
// full "missing" view doesn't pull hundreds of GIFs. Shows dex # + rarity, never
// the name, so players can ask "who's #149?" in chat.
function LockedCard({ entry }: { entry: CollectionEntry }) {
  const r = entry.rarity as Rarity;
  return (
    <div className="relative rounded-xl border-2 border-slate-700/80 bg-gradient-to-br from-slate-700/40 via-slate-800 to-slate-900 p-2 flex flex-col items-center text-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
      <DexTag dex={entry.dex} />
      <div className="text-xs font-bold text-slate-500 w-full">???</div>
      <div className="my-2 flex items-center justify-center" style={{ minHeight: 64 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.staticUrl}
          alt="Unknown Pokémon"
          width={64}
          height={64}
          loading="lazy"
          style={{
            width: 64,
            height: 64,
            imageRendering: "pixelated",
            filter: "brightness(0)",
            opacity: 0.7,
          }}
        />
      </div>
      <div
        className={`${RARITY_BADGE[r] ?? RARITY_BADGE.common} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded`}
      >
        {entry.rarity}
      </div>
    </div>
  );
}

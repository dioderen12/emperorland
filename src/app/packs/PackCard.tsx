"use client";

import { useState, useTransition } from "react";
import { openPack, type PackResult } from "@/lib/actions";
import { PackReveal } from "@/components/PackReveal";
import { PackArt } from "@/components/PackArt";
import type { PackConfig, Rarity } from "@/lib/constants";

// Static maps keep Tailwind's JIT scanner happy — dynamic class strings get
// purged at build time, so we can't template ${accent}-500 directly.
const ACCENT: Record<PackConfig["accent"], { border: string; bg: string; btn: string; bar: string }> = {
  purple: {
    border: "border-purple-400/40",
    bg: "bg-gradient-to-br from-purple-600/30 to-indigo-700/30",
    btn: "bg-purple-500 hover:bg-purple-400",
    bar: "bg-purple-400",
  },
  sky: {
    border: "border-sky-400/40",
    bg: "bg-gradient-to-br from-sky-600/30 to-cyan-700/30",
    btn: "bg-sky-500 hover:bg-sky-400",
    bar: "bg-sky-400",
  },
  amber: {
    border: "border-amber-400/40",
    bg: "bg-gradient-to-br from-amber-500/30 to-orange-600/30",
    btn: "bg-amber-500 hover:bg-amber-400",
    bar: "bg-amber-400",
  },
};

export function PackCard({ pack, balance }: { pack: PackConfig; balance: number }) {
  const [pending, startTransition] = useTransition();
  const [reveal, setReveal] = useState<PackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const c = ACCENT[pack.accent];
  const canAfford = balance >= pack.price;

  function handleOpen() {
    setError(null);
    startTransition(async () => {
      try {
        setReveal(await openPack(pack.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to open pack");
      }
    });
  }

  return (
    <>
      <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 flex flex-col`}>
        <div className="text-center">
          <PackArt variant={pack.accent} className="mx-auto h-32 w-auto drop-shadow-lg" />
          <h2 className="text-xl font-bold mt-2">{pack.name}</h2>
          <p className="text-xs text-white/70 mt-1 min-h-[2.5em]">{pack.tagline}</p>
          <div className="mt-2 font-mono text-sm text-white/80">
            {pack.price} pts · {pack.cardsPerPack} cards
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {(Object.entries(pack.rarityWeights) as [Rarity, number][]).map(([rarity, w]) => (
            <div key={rarity} className="flex items-center gap-2 text-xs">
              <span className="w-16 capitalize text-white/70">{rarity}</span>
              <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div className={`h-full ${c.bar}`} style={{ width: `${w * 100}%` }} />
              </div>
              <span className="font-mono text-white/80 w-9 text-right">{(w * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleOpen}
          disabled={!canAfford || pending}
          className={`mt-4 w-full ${c.btn} disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition`}
        >
          {pending ? "Opening…" : canAfford ? "Open" : `Need ${pack.price - balance} more`}
        </button>

        {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
      </div>

      {reveal && (
        <PackReveal
          result={reveal}
          rarityWeights={pack.rarityWeights}
          onClose={() => setReveal(null)}
        />
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { openPack, type PackResult } from "@/lib/actions";
import { PackReveal } from "@/components/PackReveal";
import { PackArt } from "@/components/PackArt";
import type { PackConfig, Rarity } from "@/lib/constants";

// Static maps keep Tailwind's JIT scanner happy — dynamic class strings get
// purged at build time, so we can't template ${accent}-500 directly.
const ACCENT: Record<PackConfig["accent"], { name: string; btn: string; bar: string }> = {
  purple: { name: "text-purple-300", btn: "bg-purple-500", bar: "bg-purple-400" },
  sky: { name: "text-sky-300", btn: "bg-sky-500", bar: "bg-sky-400" },
  amber: { name: "text-amber-300", btn: "bg-amber-500", bar: "bg-amber-400" },
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
      <div className="pixel-panel p-4 flex flex-col">
        <div className="text-center">
          <PackArt variant={pack.accent} className="mx-auto h-32 w-auto drop-shadow-lg" />
          <h2 className={`font-display text-xs mt-3 ${c.name}`}>{pack.name}</h2>
          <p className="text-sm text-white/60 mt-1.5 min-h-[2.5em] leading-tight">{pack.tagline}</p>
          <div className="mt-2 font-display text-[10px] text-[var(--accent)]">
            {pack.price}p · {pack.cardsPerPack} cards
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {(Object.entries(pack.rarityWeights) as [Rarity, number][]).map(([rarity, w]) => (
            <div key={rarity} className="flex items-center gap-2 text-sm">
              <span className="w-16 capitalize text-white/60 leading-none">{rarity}</span>
              <div className="flex-1 h-2.5 bg-black/50 border-2 border-[var(--ink)] overflow-hidden">
                <div className={`h-full ${c.bar}`} style={{ width: `${w * 100}%` }} />
              </div>
              <span className="text-white/70 w-9 text-right leading-none">{(w * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleOpen}
          disabled={!canAfford || pending}
          className={`pixel-btn mt-4 w-full py-2.5 text-[10px] text-[var(--ink)] ${canAfford ? c.btn : "bg-slate-600"} disabled:cursor-not-allowed`}
        >
          {pending ? "OPENING…" : canAfford ? "OPEN" : `NEED ${pack.price - balance}`}
        </button>

        {error && <p className="text-[var(--accent-3)] text-sm mt-2">{error}</p>}
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

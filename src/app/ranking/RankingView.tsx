"use client";

import { useMemo, useState } from "react";
import { RARITY_BADGE, RARITY_ORDER, TYPE_COLOR, type Rarity } from "@/lib/constants";

export type RankRow = {
  rank: number;
  id: string;
  name: string;
  rarity: string;
  typeCode: string;
  cp: number;
  staticUrl: string;
  owned: boolean;
};

const RARITY_DOT: Record<Rarity, string> = {
  common: "bg-slate-400",
  uncommon: "bg-emerald-400",
  rare: "bg-sky-400",
  epic: "bg-purple-400",
  legendary: "bg-amber-400",
};

export function RankingView({ rows, ownedCount }: { rows: RankRow[]; ownedCount: number }) {
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [ownedOnly, setOwnedOnly] = useState(false);

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (rarity !== "all" && r.rarity !== rarity) return false;
        if (ownedOnly && !r.owned) return false;
        return true;
      }),
    [rows, rarity, ownedOnly],
  );

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-xl sm:text-2xl text-[var(--accent)]">Power Ranking</h1>
        <p className="text-slate-400 mt-2 text-lg">
          All {rows.length} Pokemon by CP — the stat that powers Arena &amp; Raid. You own {ownedCount}.
        </p>
      </section>

      {/* filters */}
      <section className="flex flex-wrap items-center gap-2">
        <Chip active={rarity === "all"} onClick={() => setRarity("all")}>All</Chip>
        {RARITY_ORDER.map((r) => (
          <Chip key={r} active={rarity === r} onClick={() => setRarity(r)}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${RARITY_DOT[r]} mr-1`} />
            <span className="capitalize">{r}</span>
          </Chip>
        ))}
        <Chip active={ownedOnly} onClick={() => setOwnedOnly((v) => !v)}>✓ Owned only</Chip>
      </section>

      <ul className="pixel-panel divide-y-[3px] divide-[var(--ink)] overflow-hidden">
        {visible.map((r) => {
          const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`;
          const rr = r.rarity as Rarity;
          return (
            <li key={r.id} className={`flex items-center gap-3 px-3 py-2 ${r.owned ? "bg-emerald-500/10" : ""}`}>
              <span className="w-9 text-center text-base text-slate-300 shrink-0">{medal}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.staticUrl}
                alt={r.name}
                width={40}
                height={40}
                loading="lazy"
                style={{ width: 40, height: 40, imageRendering: "pixelated" }}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-lg text-white truncate leading-tight">
                  {r.name}
                  {r.owned && <span className="text-emerald-400 text-sm ml-2">✓ owned</span>}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`${RARITY_BADGE[rr] ?? RARITY_BADGE.common} pixel-badge text-[8px] uppercase px-1.5 py-0.5`}>{r.rarity}</span>
                  <span className={`${TYPE_COLOR[r.typeCode] ?? TYPE_COLOR.NOR} pixel-badge text-[8px] uppercase px-1.5 py-0.5`}>{r.typeCode}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-display text-sm text-[var(--accent)]">{r.cp}</span>
                <div className="text-[10px] text-slate-500 uppercase leading-none">CP</div>
              </div>
            </li>
          );
        })}
        {visible.length === 0 && <li className="px-4 py-8 text-center text-slate-500 text-lg">Nothing matches.</li>}
      </ul>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 text-base uppercase border-2 border-[var(--ink)] transition ${
        active ? "bg-[var(--accent)] text-[var(--ink)]" : "bg-[var(--panel)] text-slate-400 hover:bg-[var(--panel-2)]"
      }`}
    >
      {children}
    </button>
  );
}

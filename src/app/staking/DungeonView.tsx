"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  type DungeonConfig,
  calculateDungeonRate,
  RARITY_BADGE,
  TYPE_COLOR,
  TYPE_BONUS_MULTIPLIER,
  EVENT_TICK_MS,
  EVENT_KIND_META,
  type Rarity,
} from "@/lib/constants";
import { deployToDungeon, recallFromDungeon, claimAllRewards } from "@/lib/actions";

export type AnimalItem = {
  id: string;
  name: string;
  rarity: string;
  typeCode: string;
  power: number;
  spriteUrl: string;
  baseRatePerHour: number;
  dungeonId: string | null;
  stakedAtIso: string | null;
  lastEventAtIso: string | null;
  cooldownUntilIso: string | null;
  unclaimedPoints: number;
  currentRate: number;
  typeBonus: boolean;
};

export type EventEntry = {
  id: string;
  kind: string;
  description: string;
  pointsDelta: number;
  occurredAtIso: string;
  spriteUrl: string;
  speciesName: string;
  dungeonId: string;
};

const TIER: Record<
  DungeonConfig["accent"],
  { border: string; bg: string; ring: string; text: string }
> = {
  emerald: { border: "border-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-400", text: "text-emerald-300" },
  sky:     { border: "border-sky-500",     bg: "bg-sky-500/10",     ring: "ring-sky-400",     text: "text-sky-300" },
  rose:    { border: "border-rose-500",    bg: "bg-rose-500/10",    ring: "ring-rose-400",    text: "text-rose-300" },
};

function liveEarnedSince(stakedAtIso: string | null, ratePerHour: number, now: number) {
  if (!stakedAtIso) return 0;
  const hours = (now - new Date(stakedAtIso).getTime()) / (1000 * 60 * 60);
  return hours * ratePerHour;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "now";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTimeAgo(ms: number) {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

export function DungeonView({
  balance,
  items,
  events,
  dungeons,
}: {
  balance: number;
  items: AnimalItem[];
  events: EventEntry[];
  dungeons: DungeonConfig[];
}) {
  const [selectedDungeon, setSelectedDungeon] = useState(dungeons[0].id);
  const [partySelected, setPartySelected] = useState<Set<string>>(new Set());
  const [exploringSelected, setExploringSelected] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const party = items.filter((i) => !i.dungeonId);
  const exploring = items.filter((i) => i.dungeonId);
  const activeDungeon = dungeons.find((d) => d.id === selectedDungeon)!;
  const tier = TIER[activeDungeon.accent];

  const totalEarningHr = exploring.reduce((sum, i) => sum + i.currentRate, 0);
  const liveLoot =
    exploring.reduce((sum, i) => sum + liveEarnedSince(i.stakedAtIso, i.currentRate, now), 0) +
    items.reduce((sum, i) => sum + i.unclaimedPoints, 0);

  const deployCostTotal = partySelected.size * activeDungeon.deployCost;
  const canAffordDeploy = balance >= deployCostTotal && partySelected.size > 0;

  function togglePartySelect(id: string) {
    setPartySelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleExploringSelect(id: string) {
    setExploringSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function selectAllParty() {
    setPartySelected(new Set(party.map((p) => p.id)));
  }
  function selectAllExploring() {
    setExploringSelected(new Set(exploring.map((e) => e.id)));
  }

  function call(fn: () => Promise<unknown>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        onDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  function handleDeploy() {
    call(
      () => deployToDungeon(Array.from(partySelected), selectedDungeon),
      () => setPartySelected(new Set()),
    );
  }
  function handleRecall() {
    call(
      () => recallFromDungeon(Array.from(exploringSelected)),
      () => setExploringSelected(new Set()),
    );
  }
  function handleClaim() {
    call(() => claimAllRewards());
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Dungeon</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Deploy Pokemon. Random encounters fire every {EVENT_TICK_MS / 60000} minutes — treasures, mob fights, rare drops, bosses.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {dungeons.map((d) => {
          const t = TIER[d.accent];
          const selected = d.id === selectedDungeon;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDungeon(d.id)}
              className={`text-left rounded-xl border-2 p-4 transition ${
                selected ? `${t.border} ${t.bg} ring-2 ${t.ring}/40` : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div className={`font-bold text-xl ${selected ? t.text : "text-white"}`}>
                  {d.emoji} {d.name}
                </div>
                <span className="font-mono text-sm text-white/70">{d.multiplier}×</span>
              </div>
              <div className="text-xs text-white/60 mt-1">{d.multiplier}× rate · deploy {d.deployCost} pt{d.deployCost === 1 ? "" : "s"}/Pokemon</div>
              <div className="text-[10px] uppercase tracking-wider text-white/50 mt-2">
                Bonus types: {d.preferredTypes.join(" · ")}
              </div>
            </button>
          );
        })}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatBox label="In Dungeon" value={exploring.length.toString()} />
        <StatBox label="Loot Found" value={liveLoot.toFixed(3)} accent="amber" />
        <StatBox label="Earning / hr" value={totalEarningHr.toFixed(2)} accent="emerald" />
      </section>

      <section
        className={`rounded-2xl border p-4 flex items-center gap-4 ${
          liveLoot > 0 ? "border-amber-400/40 bg-amber-500/10" : "border-white/10 bg-white/5"
        }`}
      >
        <div className="flex-1">
          <div className="font-bold text-amber-200">
            {liveLoot.toFixed(3)} pts loot ready to collect
          </div>
          <div className="text-xs text-white/60 mt-0.5">
            {exploring.length} Pokemon exploring · +{totalEarningHr.toFixed(2)} pts/hr · events every {EVENT_TICK_MS / 60000}m
          </div>
        </div>
        <button
          onClick={handleClaim}
          disabled={pending || liveLoot < 1}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-lg transition"
        >
          Collect Rewards
        </button>
      </section>

      <section className="rounded-xl border border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          <span className="text-white/50">Your pts:</span>{" "}
          <span className="font-mono font-bold">{balance.toLocaleString()}</span>
        </div>
        <div className={canAffordDeploy || partySelected.size === 0 ? "text-white/60" : "text-rose-400"}>
          Deploy cost: <span className="font-mono">{deployCostTotal}</span> pts
          {partySelected.size > 0 && !canAffordDeploy && " (insufficient)"}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Column
          title="Party"
          count={party.length}
          selectedCount={partySelected.size}
          onSelectAll={selectAllParty}
          onClear={() => setPartySelected(new Set())}
          actionLabel={`Deploy to ${activeDungeon.name}`}
          actionEnabled={canAffordDeploy && !pending}
          onAction={handleDeploy}
          actionAccentClass={tier.text}
          emptyMessage="No Pokemon in party — open packs first"
        >
          {party.map((it) => (
            <PartyRow
              key={it.id}
              item={it}
              selected={partySelected.has(it.id)}
              onToggle={() => togglePartySelect(it.id)}
              dungeon={activeDungeon}
              pending={pending}
              onQuickDeploy={() =>
                call(
                  () => deployToDungeon([it.id], selectedDungeon),
                  () => {
                    const next = new Set(partySelected);
                    next.delete(it.id);
                    setPartySelected(next);
                  },
                )
              }
            />
          ))}
        </Column>

        <Column
          title="Exploring"
          count={exploring.length}
          selectedCount={exploringSelected.size}
          onSelectAll={selectAllExploring}
          onClear={() => setExploringSelected(new Set())}
          actionLabel="Recall Selected"
          actionEnabled={exploringSelected.size > 0 && !pending}
          onAction={handleRecall}
          actionAccentClass="text-rose-300"
          emptyMessage="No Pokemon deployed — pick from party and deploy"
        >
          {exploring.map((it) => (
            <ExploringRow
              key={it.id}
              item={it}
              selected={exploringSelected.has(it.id)}
              onToggle={() => toggleExploringSelect(it.id)}
              now={now}
              pending={pending}
              onQuickRecall={() =>
                call(
                  () => recallFromDungeon([it.id]),
                  () => {
                    const next = new Set(exploringSelected);
                    next.delete(it.id);
                    setExploringSelected(next);
                  },
                )
              }
            />
          ))}
        </Column>
      </section>

      {/* Event log — reverse-chronological feed of all RNG events */}
      <section className="rounded-2xl border border-white/10 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Recent Encounters</h2>
          <span className="text-xs text-white/40">last {Math.min(events.length, 25)} events</span>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-white/40">
            No encounters yet. Deploy a Pokemon — events fire every {EVENT_TICK_MS / 60000}m.
          </p>
        ) : (
          <ul className="space-y-1.5 max-h-80 overflow-y-auto">
            {events.map((e) => {
              const meta = EVENT_KIND_META[e.kind] ?? { label: e.kind, emoji: "❔", color: "text-white" };
              const ago = formatTimeAgo(now - new Date(e.occurredAtIso).getTime());
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-sm"
                >
                  <span className="text-base shrink-0">{meta.emoji}</span>
                  <Image src={e.spriteUrl} alt={e.speciesName} width={28} height={28} unoptimized className="shrink-0" style={{ imageRendering: "pixelated" }} />
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-white/70"> · {e.description}</span>
                  </div>
                  {e.pointsDelta > 0 && (
                    <span className="font-mono text-emerald-300 shrink-0">+{e.pointsDelta}</span>
                  )}
                  <span className="text-[10px] text-white/40 shrink-0 w-12 text-right">{ago}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "emerald";
}) {
  const valueColor =
    accent === "amber" ? "text-amber-300" : accent === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className={`text-2xl font-bold font-mono mt-0.5 ${valueColor}`}>{value}</div>
    </div>
  );
}

function Column({
  title,
  count,
  selectedCount,
  onSelectAll,
  onClear,
  actionLabel,
  actionEnabled,
  onAction,
  actionAccentClass,
  emptyMessage,
  children,
}: {
  title: string;
  count: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  actionLabel: string;
  actionEnabled: boolean;
  onAction: () => void;
  actionAccentClass: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">
          {title} <span className="text-white/40 font-normal">({count})</span>
        </h2>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="text-white/60">{selectedCount}/{count} selected</div>
        <div className="flex gap-1.5">
          <button
            onClick={onSelectAll}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80"
          >
            All
          </button>
          <button
            onClick={onClear}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80"
          >
            Clear
          </button>
        </div>
      </div>
      {selectedCount > 0 && (
        <button
          onClick={onAction}
          disabled={!actionEnabled}
          className={`w-full text-xs font-bold uppercase tracking-wider py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition ${actionAccentClass}`}
        >
          {actionLabel}
        </button>
      )}
      <div className="space-y-2">
        {count === 0 ? (
          <div className="rounded-xl border border-white/10 p-6 text-center text-sm text-white/40">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function PartyRow({
  item,
  selected,
  onToggle,
  dungeon,
  pending,
  onQuickDeploy,
}: {
  item: AnimalItem;
  selected: boolean;
  onToggle: () => void;
  dungeon: DungeonConfig;
  pending: boolean;
  onQuickDeploy: () => void;
}) {
  const r = item.rarity as Rarity;
  const preview = calculateDungeonRate(item.baseRatePerHour, item.typeCode, dungeon);
  return (
    <div
      className={`rounded-xl border bg-slate-900/60 p-2.5 flex items-center gap-3 transition ${
        selected ? "border-white/40 bg-white/5" : "border-white/10"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="w-4 h-4 accent-emerald-500 cursor-pointer"
      />
      <div className="w-12 h-12 shrink-0">
        <Image src={item.spriteUrl} alt={item.name} width={48} height={48} unoptimized style={{ imageRendering: "pixelated" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{item.name}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`${RARITY_BADGE[r] ?? RARITY_BADGE.common} text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`}>
            {item.rarity}
          </span>
          <span className={`${TYPE_COLOR[item.typeCode] ?? TYPE_COLOR.NOR} text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`}>
            {item.typeCode}
          </span>
          <span className="text-[9px] text-white/50 ml-1">{item.power} PWR</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono text-emerald-300">+{preview.rate.toFixed(2)}/hr</div>
        {preview.bonusApplied && (
          <div className="text-[9px] text-amber-300 font-bold">+{((TYPE_BONUS_MULTIPLIER - 1) * 100).toFixed(0)}% TYPE</div>
        )}
        <button
          onClick={onQuickDeploy}
          disabled={pending}
          className="mt-1 text-[10px] font-bold uppercase bg-emerald-600/40 hover:bg-emerald-500/60 disabled:opacity-40 text-emerald-100 px-2 py-0.5 rounded"
        >
          Deploy
        </button>
      </div>
    </div>
  );
}

function ExploringRow({
  item,
  selected,
  onToggle,
  now,
  pending,
  onQuickRecall,
}: {
  item: AnimalItem;
  selected: boolean;
  onToggle: () => void;
  now: number;
  pending: boolean;
  onQuickRecall: () => void;
}) {
  const r = item.rarity as Rarity;
  const earned = liveEarnedSince(item.stakedAtIso, item.currentRate, now);

  // Next-event countdown: time until lastEventAt + TICK fires. Clamps to 0 when
  // overdue (the server will resolve it next page-load or action).
  const lastTick = item.lastEventAtIso
    ? new Date(item.lastEventAtIso).getTime()
    : item.stakedAtIso
      ? new Date(item.stakedAtIso).getTime()
      : now;
  const nextEventMs = lastTick + EVENT_TICK_MS - now;

  // Active cooldown — Pokemon paused from rolling events.
  const cooldownMs = item.cooldownUntilIso
    ? new Date(item.cooldownUntilIso).getTime() - now
    : 0;
  const inCooldown = cooldownMs > 0;

  return (
    <div
      className={`rounded-xl border bg-slate-900/60 p-2.5 flex items-center gap-3 transition ${
        selected ? "border-white/40 bg-white/5" : "border-white/10"
      } ${inCooldown ? "opacity-70" : ""}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="w-4 h-4 accent-rose-500 cursor-pointer"
      />
      <div className="w-12 h-12 shrink-0 relative">
        <Image src={item.spriteUrl} alt={item.name} width={48} height={48} unoptimized style={{ imageRendering: "pixelated" }} />
        {inCooldown && (
          <div className="absolute inset-0 bg-slate-900/60 rounded flex items-center justify-center text-[10px]">
            💤
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{item.name}</div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className={`${RARITY_BADGE[r] ?? RARITY_BADGE.common} text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`}>
            {item.rarity}
          </span>
          {item.dungeonId && (
            <span className="text-[9px] font-bold uppercase bg-white/10 text-white/80 px-1.5 py-0.5 rounded">
              {item.dungeonId}
            </span>
          )}
          {item.typeBonus && (
            <span className="text-[9px] font-bold uppercase bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded">
              +TYPE
            </span>
          )}
        </div>
        <div className="text-[10px] text-white/50 mt-1">
          {inCooldown ? (
            <span className="text-rose-300">Resting · {formatCountdown(cooldownMs)}</span>
          ) : nextEventMs > 0 ? (
            <span>Next event in {formatCountdown(nextEventMs)}</span>
          ) : (
            <span className="text-amber-300">Event pending…</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono text-emerald-300">+{earned.toFixed(3)}</div>
        <div className="text-[9px] text-white/50">{item.currentRate.toFixed(2)}/hr</div>
        <button
          onClick={onQuickRecall}
          disabled={pending}
          className="mt-1 text-[10px] font-bold uppercase bg-rose-600/40 hover:bg-rose-500/60 disabled:opacity-40 text-rose-100 px-2 py-0.5 rounded"
        >
          Recall
        </button>
      </div>
    </div>
  );
}

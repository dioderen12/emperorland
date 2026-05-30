"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleLog, BattleEvent } from "@/lib/pvp";
import { TYPE_COLOR } from "@/lib/constants";

type Side = "a" | "b";

// Replay the final HP / fainted state by folding all events (used for "skip").
function foldFinal(log: BattleLog) {
  const hpA = log.teamA.map((f) => f.maxHp);
  const hpB = log.teamB.map((f) => f.maxHp);
  for (const e of log.events) {
    if (e.t === "attack") {
      const defSide: Side = e.side === "a" ? "b" : "a";
      (defSide === "a" ? hpA : hpB)[e.def] = e.defHp;
    }
  }
  return { hpA, hpB };
}

export function BattlePlayback({
  log,
  iAmSide,
  onClose,
}: {
  log: BattleLog;
  iAmSide: Side;
  onClose: () => void;
}) {
  const [hpA, setHpA] = useState(log.teamA.map((f) => f.maxHp));
  const [hpB, setHpB] = useState(log.teamB.map((f) => f.maxHp));
  const [step, setStep] = useState(-1); // -1 = VS intro
  const [done, setDone] = useState(false);
  const [popup, setPopup] = useState<{ side: Side; idx: number; dmg: number; crit: boolean; eff: string } | null>(null);
  const refsA = useRef<(HTMLDivElement | null)[]>([]);
  const refsB = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (done) return;
    if (step >= log.events.length) {
      setDone(true);
      return;
    }
    const isIntro = step === -1;
    const ev = isIntro ? null : log.events[step];
    const delay = isIntro ? 900 : ev!.t === "faint" ? 420 : 720;
    const id = setTimeout(() => {
      if (ev) applyEvent(ev);
      setStep((s) => s + 1);
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, done]);

  function applyEvent(ev: BattleEvent) {
    if (ev.t === "attack") {
      const defSide: Side = ev.side === "a" ? "b" : "a";
      (defSide === "a" ? setHpA : setHpB)((prev) => {
        const next = [...prev];
        next[ev.def] = ev.defHp;
        return next;
      });
      const defRef = (defSide === "a" ? refsA : refsB).current[ev.def];
      defRef?.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }],
        { duration: 300 },
      );
      const atkRef = (ev.side === "a" ? refsA : refsB).current[ev.atk];
      atkRef?.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-7px)" }, { transform: "translateY(0)" }],
        { duration: 240 },
      );
      setPopup({ side: defSide, idx: ev.def, dmg: ev.dmg, crit: ev.crit, eff: ev.eff });
      setTimeout(() => setPopup(null), 600);
    }
  }

  function skip() {
    const f = foldFinal(log);
    setHpA(f.hpA);
    setHpB(f.hpB);
    setPopup(null);
    setStep(log.events.length);
    setDone(true);
  }

  const won = log.winner === iAmSide;
  // Display: my side on the left, rival on the right.
  const leftTeam = iAmSide === "a" ? log.teamA : log.teamB;
  const rightTeam = iAmSide === "a" ? log.teamB : log.teamA;
  const leftHp = iAmSide === "a" ? hpA : hpB;
  const rightHp = iAmSide === "a" ? hpB : hpA;
  const leftRefs = iAmSide === "a" ? refsA : refsB;
  const rightRefs = iAmSide === "a" ? refsB : refsA;
  const leftSide: Side = iAmSide;
  const rightSide: Side = iAmSide === "a" ? "b" : "a";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="pixel-panel w-full max-w-3xl p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <span className="font-display text-xs text-[var(--accent-3)]">⚔ BATTLE</span>
          {!done ? (
            <button onClick={skip} className="text-base text-slate-400 hover:text-white uppercase">skip →</button>
          ) : (
            <button onClick={onClose} className="text-base text-slate-400 hover:text-white uppercase">close ✕</button>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-center">
          <Team team={leftTeam} hp={leftHp} side={leftSide} refs={leftRefs} popup={popup} label="YOU" align="left" />
          <div className="font-display text-sm text-slate-500">VS</div>
          <Team team={rightTeam} hp={rightHp} side={rightSide} refs={rightRefs} popup={popup} label="RIVAL" align="right" />
        </div>

        {step === -1 && (
          <p className="text-center font-display text-base text-white mt-4 animate-pulse">FIGHT!</p>
        )}

        {done && (
          <div className="mt-5 text-center">
            <p className={`font-display text-lg ${won ? "text-[var(--accent)]" : "text-rose-400"}`}>
              {won ? "🏆 VICTORY" : "💀 DEFEAT"}
            </p>
            <button onClick={onClose} className="pixel-btn mt-4 bg-[var(--accent)] text-[var(--ink)] text-[10px] px-6 py-2.5">
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Team({
  team,
  hp,
  side,
  refs,
  popup,
  label,
  align,
}: {
  team: (BattleLog["teamA"][number])[];
  hp: number[];
  side: Side;
  refs: React.RefObject<(HTMLDivElement | null)[]>;
  popup: { side: Side; idx: number; dmg: number; crit: boolean; eff: string } | null;
  label: string;
  align: "left" | "right";
}) {
  return (
    <div className={`flex flex-col gap-2 ${align === "right" ? "items-end" : "items-start"}`}>
      <span className="font-display text-[9px] text-slate-400">{label}</span>
      {team.map((f, i) => {
        const fainted = hp[i] <= 0;
        const pct = Math.max(0, Math.round((hp[i] / f.maxHp) * 100));
        const showPopup = popup && popup.side === side && popup.idx === i;
        return (
          <div
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`relative flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""} ${fainted ? "opacity-30 grayscale" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.spriteUrl}
              alt={f.name}
              width={48}
              height={48}
              style={{ width: 48, height: 48, imageRendering: "pixelated", transform: align === "right" ? "scaleX(-1)" : undefined }}
            />
            <div className={`w-20 ${align === "right" ? "text-right" : ""}`}>
              <div className="flex items-center gap-1" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
                <span className="text-xs text-white truncate">{f.name}</span>
                <span className={`pixel-badge text-[6px] uppercase px-1 ${TYPE_COLOR[f.typeCode] ?? TYPE_COLOR.NOR}`}>{f.typeCode}</span>
              </div>
              <div className="mt-0.5 h-2 w-full border border-[var(--ink)] bg-black/60 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-rose-600"}`}
                  style={{ width: `${pct}%`, marginLeft: align === "right" ? "auto" : 0 }}
                />
              </div>
            </div>
            {showPopup && (
              <span
                className="pointer-events-none absolute -top-3 left-1/2 font-display text-[11px] whitespace-nowrap"
                style={{ animation: "dmgFloat 0.6s ease-out forwards", color: popup!.crit ? "#fcd34d" : "#fff", textShadow: "0 1px 2px #000" }}
              >
                -{popup!.dmg}
                {popup!.crit ? "!" : ""}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

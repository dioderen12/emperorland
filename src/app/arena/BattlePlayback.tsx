"use client";

import { useEffect, useRef, useState, forwardRef } from "react";
import type { BattleLog, BattleEvent } from "@/lib/pvp";
import { moveFor, type MoveKind } from "@/lib/moves";
import { ArenaBackground } from "./ArenaBackground";

type Side = "a" | "b";
type Fx = { kind: MoveKind; color: string; move: string; attacker: string; dir: "lr" | "rl"; key: number };

export function BattlePlayback({
  log,
  iAmSide,
  onClose,
}: {
  log: BattleLog;
  iAmSide: Side;
  onClose: () => void;
}) {
  const A = log.teamA;
  const B = log.teamB;
  const [hpA, setHpA] = useState(A.map((f) => f.maxHp));
  const [hpB, setHpB] = useState(B.map((f) => f.maxHp));
  const [activeA, setActiveA] = useState(0);
  const [activeB, setActiveB] = useState(0);
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const [popup, setPopup] = useState<{ pos: "left" | "right"; dmg: number; crit: boolean; eff: string } | null>(null);

  const [fx, setFx] = useState<Fx | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftFlash = useRef<HTMLDivElement>(null);
  const rightFlash = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fxKey = useRef(0);

  useEffect(() => {
    if (done) return;
    if (step >= log.events.length) {
      setDone(true);
      return;
    }
    const ev = step === -1 ? null : log.events[step];
    const delay = step === -1 ? 850 : ev!.t === "faint" ? 520 : 950;
    const id = setTimeout(() => {
      if (ev) apply(ev);
      setStep((s) => s + 1);
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, done]);

  function apply(ev: BattleEvent) {
    if (ev.t === "attack") {
      const defSide: Side = ev.side === "a" ? "b" : "a";
      (defSide === "a" ? setHpA : setHpB)((prev) => {
        const n = [...prev];
        n[ev.def] = ev.defHp;
        return n;
      });
      const attackerOnLeft = ev.side === iAmSide;
      const atk = attackerOnLeft ? leftRef : rightRef;
      const def = attackerOnLeft ? rightRef : leftRef;
      const flash = attackerOnLeft ? rightFlash : leftFlash;
      const lunge = attackerOnLeft ? 46 : -46;
      atk.current?.animate(
        [{ transform: "translateX(0)" }, { transform: `translateX(${lunge}px)` }, { transform: "translateX(0)" }],
        { duration: 300, easing: "ease-out" },
      );
      def.current?.animate(
        [{ transform: "translateX(0)" }, { transform: `translateX(${attackerOnLeft ? 12 : -12}px)` }, { transform: "translateX(0)" }],
        { duration: 320, delay: 130 },
      );
      flash.current?.animate([{ opacity: 0 }, { opacity: 0.75 }, { opacity: 0 }], { duration: 340, delay: 130 });

      // Type-based move VFX + name callout.
      const atkFighter = (ev.side === "a" ? A : B)[ev.atk];
      const mv = moveFor(atkFighter.typeCode);
      fxKey.current += 1;
      setFx({ kind: mv.kind, color: mv.color, move: mv.move, attacker: atkFighter.name, dir: attackerOnLeft ? "lr" : "rl", key: fxKey.current });
      if (mv.kind === "quake") {
        stageRef.current?.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }],
          { duration: 420 },
        );
      }
      setTimeout(() => setFx(null), 820);

      setPopup({ pos: attackerOnLeft ? "right" : "left", dmg: ev.dmg, crit: ev.crit, eff: ev.eff });
      setTimeout(() => setPopup(null), 640);
    } else {
      if (ev.side === "a") setActiveA((i) => i + 1);
      else setActiveB((i) => i + 1);
    }
  }

  function skip() {
    const fa = A.map((f) => f.maxHp);
    const fb = B.map((f) => f.maxHp);
    let aF = 0;
    let bF = 0;
    for (const e of log.events) {
      if (e.t === "attack") {
        const d: Side = e.side === "a" ? "b" : "a";
        (d === "a" ? fa : fb)[e.def] = e.defHp;
      } else if (e.side === "a") aF++;
      else bF++;
    }
    setHpA(fa);
    setHpB(fb);
    setActiveA(aF);
    setActiveB(bF);
    setPopup(null);
    setFx(null);
    setStep(log.events.length);
    setDone(true);
  }

  const leftIsA = iAmSide === "a";
  const leftTeam = leftIsA ? A : B;
  const rightTeam = leftIsA ? B : A;
  const leftHp = leftIsA ? hpA : hpB;
  const rightHp = leftIsA ? hpB : hpA;
  const li = leftIsA ? activeA : activeB;
  const ri = leftIsA ? activeB : activeA;
  const won = log.winner === iAmSide;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="pixel-panel w-full max-w-3xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2 border-b-[3px] border-[var(--ink)]">
          <span className="font-display text-[10px] text-[var(--accent-3)]">⚔ BATTLE</span>
          {!done ? (
            <button onClick={skip} className="text-base text-slate-400 hover:text-white uppercase">skip →</button>
          ) : (
            <button onClick={onClose} className="text-base text-slate-400 hover:text-white uppercase">close ✕</button>
          )}
        </div>

        {/* roster bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/40">
          <Roster team={leftTeam} hp={leftHp} active={li} align="left" />
          <span className="font-display text-[10px] text-slate-500">VS</span>
          <Roster team={rightTeam} hp={rightHp} active={ri} align="right" />
        </div>

        {/* arena stage */}
        <div ref={stageRef} className="relative h-60 sm:h-72">
          <ArenaBackground className="absolute inset-0 h-full w-full" />

          {li < leftTeam.length && (
            <Combatant
              key={`L-${li}`}
              ref={leftRef}
              flashRef={leftFlash}
              fighter={leftTeam[li]}
              hp={leftHp[li]}
              side="left"
              popup={popup?.pos === "left" ? popup : null}
            />
          )}
          {ri < rightTeam.length && (
            <Combatant
              key={`R-${ri}`}
              ref={rightRef}
              flashRef={rightFlash}
              fighter={rightTeam[ri]}
              hp={rightHp[ri]}
              side="right"
              popup={popup?.pos === "right" ? popup : null}
            />
          )}

          {fx && <MoveFx key={fx.key} fx={fx} />}

          {step === -1 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-xl text-white drop-shadow-[0_2px_4px_#000] animate-pulse">FIGHT!</span>
            </div>
          )}

          {done && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55">
              <p className={`font-display text-2xl ${won ? "text-[var(--accent)]" : "text-rose-400"} drop-shadow-[0_2px_4px_#000]`}>
                {won ? "🏆 VICTORY" : "💀 DEFEAT"}
              </p>
              <button onClick={onClose} className="pixel-btn mt-4 bg-[var(--accent)] text-[var(--ink)] text-[10px] px-6 py-2.5">
                CLOSE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Roster({
  team,
  hp,
  active,
  align,
}: {
  team: BattleLog["teamA"];
  hp: number[];
  active: number;
  align: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-1.5 ${align === "right" ? "flex-row-reverse" : ""}`}>
      {team.map((f, i) => {
        const fainted = hp[i] <= 0;
        return (
          <div
            key={i}
            className={`w-8 h-8 border-2 ${i === active && !fainted ? "border-[var(--accent)]" : "border-[var(--ink)]"} bg-black/40 flex items-center justify-center ${fainted ? "opacity-30 grayscale" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.spriteUrl} alt={f.name} width={28} height={28} style={{ width: 28, height: 28, imageRendering: "pixelated" }} />
          </div>
        );
      })}
    </div>
  );
}

type CombatantProps = {
  fighter: BattleLog["teamA"][number];
  hp: number;
  side: "left" | "right";
  flashRef: React.RefObject<HTMLDivElement | null>;
  popup: { dmg: number; crit: boolean; eff: string } | null;
};

// The type-based move effect: a name callout + a beam / bolt / projectile /
// slash traveling attacker→defender, plus an impact shockwave at the target.
function MoveFx({ fx }: { fx: Fx }) {
  const fromLeft = fx.dir === "lr";
  const { kind, color, move, attacker } = fx;
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* move name */}
      <div
        className="absolute top-2 left-1/2 font-display text-[9px] text-white px-2 py-1 bg-black/60 border-2 border-[var(--ink)] whitespace-nowrap"
        style={{ animation: "mvCallout 0.85s ease-out forwards" }}
      >
        {attacker} used {move}!
      </div>

      {/* travelling effect */}
      <div className="absolute left-[22%] right-[22%]" style={{ top: "58%" }}>
        {kind === "beam" && (
          <div
            className="h-3 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, #ffffff, ${color})`,
              transformOrigin: fromLeft ? "left center" : "right center",
              boxShadow: `0 0 14px ${color}`,
              animation: "mvBeam 0.55s ease-out forwards",
            }}
          />
        )}
        {kind === "bolt" && (
          <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-7" style={{ animation: "mvBolt 0.5s ease-out forwards" }}>
            <polyline points="0,10 14,3 28,16 44,4 60,15 76,3 90,14 100,8" fill="none" stroke={color} strokeWidth="2.5" />
            <polyline points="0,10 14,3 28,16 44,4 60,15 76,3 90,14 100,8" fill="none" stroke="#ffffff" strokeWidth="0.9" />
          </svg>
        )}
        {kind === "projectile" && (
          <span
            className="absolute w-4 h-4 rounded-full"
            style={{
              top: "-6px",
              background: color,
              boxShadow: `0 0 12px ${color}`,
              animation: `${fromLeft ? "mvProjLR" : "mvProjRL"} 0.5s ease-in forwards`,
            }}
          />
        )}
      </div>

      {/* slash sits on the defender */}
      {kind === "slash" && (
        <svg
          viewBox="0 0 40 40"
          className="absolute w-16 h-16"
          style={{
            top: "48%",
            right: fromLeft ? "10%" : undefined,
            left: fromLeft ? undefined : "10%",
            animation: "mvSlash 0.45s ease-out forwards",
          }}
        >
          <path d="M4 30 Q20 4 36 12" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <path d="M8 36 Q24 14 38 22" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {/* impact shockwave at the defender (beam/bolt/projectile/quake) */}
      {kind !== "slash" && (
        <div
          className="absolute rounded-full"
          style={{
            top: "55%",
            right: fromLeft ? "11%" : undefined,
            left: fromLeft ? undefined : "11%",
            width: 36,
            height: 36,
            border: `3px solid ${color}`,
            boxShadow: `0 0 12px ${color}`,
            animation: "mvImpact 0.5s ease-out 0.18s both",
          }}
        />
      )}
    </div>
  );
}

const Combatant = forwardRef<HTMLDivElement, CombatantProps>(function Combatant(
  { fighter, hp, side, flashRef, popup },
  ref,
) {
  const pct = Math.max(0, Math.round((hp / fighter.maxHp) * 100));
  const isLeft = side === "left";
  return (
    <div
      className={`absolute bottom-7 ${isLeft ? "left-[10%]" : "right-[10%]"} flex flex-col items-center`}
      style={{ animation: "fighterIn 0.35s ease-out" }}
    >
        {/* name + HP plate */}
        <div className="w-28 mb-1">
          <div className="text-sm text-white text-center truncate drop-shadow-[0_1px_2px_#000]">{fighter.name}</div>
          <div className="h-2.5 w-full border-2 border-[var(--ink)] bg-black/70 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-rose-600"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-white/80 text-center tabular-nums drop-shadow-[0_1px_2px_#000]">
            {Math.max(0, hp)}/{fighter.maxHp}
          </div>
        </div>

        {/* sprite */}
        <div ref={ref} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fighter.spriteUrl}
            alt={fighter.name}
            width={88}
            height={88}
            style={{ width: 88, height: 88, imageRendering: "pixelated", transform: isLeft ? undefined : "scaleX(-1)" }}
          />
          <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: 0 }} />
          {popup && (
            <span
              className="pointer-events-none absolute -top-2 left-1/2 font-display text-sm whitespace-nowrap"
              style={{ animation: "dmgFloat 0.64s ease-out forwards", color: popup.crit ? "#fcd34d" : "#fff", textShadow: "0 1px 2px #000" }}
            >
              -{popup.dmg}
              {popup.crit ? "!" : ""}
            </span>
          )}
        </div>
      </div>
    );
});

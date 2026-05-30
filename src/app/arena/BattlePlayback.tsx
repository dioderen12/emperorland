"use client";

import { useEffect, useRef, useState, forwardRef } from "react";
import type { BattleLog, BattleEvent } from "@/lib/pvp";
import { MOVES_BY_ID, firstMoveFor, type MoveKind } from "@/lib/moves";
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
    // Paced so each hit has a beat to enjoy without dragging.
    const delay = step === -1 ? 1000 : ev!.t === "faint" ? 750 : 1350;
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
      const atkFighter = (ev.side === "a" ? A : B)[ev.atk];
      const mv = (ev.move && MOVES_BY_ID[ev.move]) || firstMoveFor(atkFighter.typeCode);
      const atk = attackerOnLeft ? leftRef : rightRef;
      const def = attackerOnLeft ? rightRef : leftRef;
      const flash = attackerOnLeft ? rightFlash : leftFlash;

      // Melee moves charge in; ranged casters barely step. Dash goes the furthest.
      const melee = mv.kind === "dash" || mv.kind === "slash" || mv.kind === "multislash";
      const dist = (attackerOnLeft ? 1 : -1) * (mv.kind === "dash" ? 150 : melee ? 88 : 34);
      // Attacker winds up (slight pull-back + glow) then strikes.
      atk.current?.animate(
        [
          { transform: `translateX(${attackerOnLeft ? -8 : 8}px)`, filter: "brightness(1)" },
          { transform: `translateX(${dist * 0.35}px)`, filter: "brightness(1.6)" },
          { transform: `translateX(${dist}px)`, filter: "brightness(1.3)" },
          { transform: "translateX(0)", filter: "brightness(1)" },
        ],
        { duration: melee ? 420 : 340, easing: "ease-out" },
      );
      // Defender reacts when the hit lands (beams hit fast, melee/projectiles later).
      const hitDelay = mv.kind === "beam" || mv.kind === "bolt" ? 120 : mv.kind === "dash" ? 240 : 300;
      const kb = attackerOnLeft ? 22 : -22;
      def.current?.animate(
        [
          { transform: "translateX(0) rotate(0deg)" },
          { transform: `translateX(${kb}px) rotate(${attackerOnLeft ? 7 : -7}deg)`, offset: 0.3 },
          { transform: `translateX(${kb * 0.4}px) rotate(0deg)`, offset: 0.6 },
          { transform: "translateX(0) rotate(0deg)" },
        ],
        { duration: 420, delay: hitDelay, easing: "ease-out" },
      );
      flash.current?.animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: 360, delay: hitDelay });

      fxKey.current += 1;
      setFx({ kind: mv.kind, color: mv.color, move: mv.name, attacker: atkFighter.name, dir: attackerOnLeft ? "lr" : "rl", key: fxKey.current });
      if (mv.kind === "quake") {
        stageRef.current?.animate(
          [
            { transform: "translate(0,0)" },
            { transform: "translate(-4px,-3px)" },
            { transform: "translate(4px,3px)" },
            { transform: "translate(-3px,2px)" },
            { transform: "translate(0,0)" },
          ],
          { duration: 480 },
        );
      }
      setTimeout(() => setFx(null), 1250);

      setPopup({ pos: attackerOnLeft ? "right" : "left", dmg: ev.dmg, crit: ev.crit, eff: ev.eff });
      setTimeout(() => setPopup(null), 1000);
    } else {
      // Faint: flash white, then topple + fade, then bring in the next Pokemon.
      const faintRef = ev.side === iAmSide ? leftRef : rightRef;
      faintRef.current?.animate(
        [
          { transform: "translateY(0) rotate(0deg)", opacity: 1, filter: "brightness(1)" },
          { transform: "translateY(-5px) rotate(0deg)", opacity: 1, filter: "brightness(3)", offset: 0.25 },
          { transform: "translateY(48px) rotate(20deg)", opacity: 0, filter: "brightness(1)" },
        ],
        { duration: 600, easing: "ease-in", fill: "forwards" },
      );
      setTimeout(() => {
        if (ev.side === "a") setActiveA((i) => i + 1);
        else setActiveB((i) => i + 1);
      }, 560);
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

// The move effect — a name callout plus one of ten archetypes chosen to mirror
// how that kind of move actually looks, traveling attacker→defender.
function MoveFx({ fx }: { fx: Fx }) {
  const fromLeft = fx.dir === "lr";
  const { kind, color, move, attacker } = fx;
  const slashArc = (
    <>
      <path d="M4 30 Q20 4 36 12" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <path d="M8 36 Q24 14 38 22" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
  const showImpact = kind === "beam" || kind === "bolt" || kind === "orb" || kind === "barrage" || kind === "dash";

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* move name — big, readable, holds for ~1s */}
      <div
        className="absolute top-3 left-1/2 flex flex-col items-center text-center whitespace-nowrap"
        style={{ animation: "mvCallout 1.25s ease-out forwards" }}
      >
        <span className="font-display text-[9px] text-white/90" style={{ textShadow: "1px 1px 0 #000" }}>
          {attacker}
        </span>
        <span
          className="font-display text-sm sm:text-base mt-1"
          style={{ color, textShadow: `2px 2px 0 #000, -1px -1px 0 #000, 0 0 12px ${color}` }}
        >
          {move}!
        </span>
      </div>

      {/* travelling effects between the fighters */}
      {(kind === "beam" || kind === "bolt" || kind === "orb" || kind === "barrage") && (
        <div className="absolute left-[22%] right-[22%]" style={{ top: "58%" }}>
          {kind === "beam" && (
            <div
              className="h-3 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${color}, #ffffff, ${color})`,
                transformOrigin: fromLeft ? "left center" : "right center",
                boxShadow: `0 0 16px ${color}`,
                animation: "mvBeam 0.55s ease-out forwards",
              }}
            />
          )}
          {kind === "bolt" && (
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-8" style={{ animation: "mvBolt 0.5s ease-out forwards" }}>
              <polyline points="0,10 14,2 28,17 44,3 60,16 76,2 90,15 100,8" fill="none" stroke={color} strokeWidth="3" />
              <polyline points="0,10 14,2 28,17 44,3 60,16 76,2 90,15 100,8" fill="none" stroke="#ffffff" strokeWidth="1" />
            </svg>
          )}
          {kind === "orb" && (
            <span
              className="absolute w-5 h-5 rounded-full"
              style={{
                top: "-8px",
                background: `radial-gradient(circle at 35% 35%, #fff, ${color})`,
                boxShadow: `0 0 18px ${color}`,
                animation: `${fromLeft ? "mvProjLR" : "mvProjRL"} 0.55s ease-in forwards`,
              }}
            />
          )}
          {kind === "barrage" &&
            [0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full"
                style={{
                  top: `${-5 + i * 3}px`,
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                  animation: `${fromLeft ? "mvProjLR" : "mvProjRL"} 0.4s ease-in ${i * 0.11}s forwards`,
                }}
              />
            ))}
        </div>
      )}

      {/* explosion / burst at the target */}
      {kind === "blast" && (
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: "55%", right: fromLeft ? "8%" : undefined, left: fromLeft ? undefined : "8%" }}>
          <svg viewBox="0 0 60 60" className="w-24 h-24" style={{ animation: "mvBlast 0.55s ease-out forwards" }}>
            <polygon points="30,1 37,22 59,22 41,35 47,58 30,44 13,58 19,35 1,22 23,22" fill={color} opacity="0.9" />
            <circle cx="30" cy="30" r="9" fill="#ffffff" />
          </svg>
        </div>
      )}

      {/* objects raining onto the target */}
      {kind === "rain" && (
        <div className="absolute" style={{ top: "8%", width: 64, right: fromLeft ? "8%" : undefined, left: fromLeft ? undefined : "8%" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="absolute rounded-sm"
              style={{
                left: `${i * 13}px`,
                width: 8,
                height: 13,
                background: color,
                boxShadow: `0 0 6px ${color}`,
                animation: `mvRain 0.5s ease-in ${i * 0.09}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* one or several slashes on the target */}
      {(kind === "slash" || kind === "multislash") && (
        <div className="absolute w-16 h-16" style={{ top: "46%", right: fromLeft ? "9%" : undefined, left: fromLeft ? undefined : "9%" }}>
          {(kind === "slash" ? [0] : [0, 1, 2]).map((i) => (
            <svg
              key={i}
              viewBox="0 0 40 40"
              className="absolute inset-0 w-full h-full"
              style={{ animation: `mvSlash 0.4s ease-out ${i * 0.13}s forwards`, transform: i % 2 ? "scaleY(-1)" : undefined }}
            >
              {slashArc}
            </svg>
          ))}
        </div>
      )}

      {/* ground crack + dust for quake */}
      {kind === "quake" && (
        <>
          <svg viewBox="0 0 200 24" preserveAspectRatio="none" className="absolute left-[10%] right-[10%] h-6" style={{ bottom: "10%", animation: "mvBolt 0.5s ease-out forwards" }}>
            <polyline points="0,8 30,18 55,5 90,20 120,7 150,22 180,9 200,15" fill="none" stroke={color} strokeWidth="3" />
          </svg>
          <div
            className="absolute rounded-full"
            style={{ bottom: "16%", left: "40%", width: 56, height: 20, background: `radial-gradient(${color}, transparent)`, animation: "mvBlast 0.5s ease-out forwards" }}
          />
        </>
      )}

      {/* impact shockwave at the target */}
      {showImpact && (
        <div
          className="absolute rounded-full"
          style={{
            top: "54%",
            right: fromLeft ? "11%" : undefined,
            left: fromLeft ? undefined : "11%",
            width: 36,
            height: 36,
            border: `3px solid ${color}`,
            boxShadow: `0 0 12px ${color}`,
            animation: "mvImpact 0.5s ease-out 0.2s both",
          }}
        />
      )}

      {/* spark burst at the point of contact — on every move */}
      <div className="absolute" style={{ top: "58%", right: fromLeft ? "14%" : undefined, left: fromLeft ? undefined : "14%" }}>
        <SparkBurst color={color} delay={showImpact ? 0.22 : 0.05} />
      </div>
    </div>
  );
}

function SparkBurst({ color, delay }: { color: string; delay: number }) {
  const angles = [10, 55, 100, 145, 200, 250, 305, 340];
  return (
    <>
      {angles.map((a, i) => (
        <span key={i} className="absolute left-0 top-0" style={{ transform: `rotate(${a}deg)`, transformOrigin: "left center" }}>
          <span
            className="block h-[3px] w-3 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 6px ${color}`,
              animation: `mvSpark 0.5s ease-out ${delay + (i % 3) * 0.04}s both`,
            }}
          />
        </span>
      ))}
    </>
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

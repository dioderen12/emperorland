"use client";

import { useEffect, useRef, useState } from "react";
import { tsParticles } from "@tsparticles/engine";
import { loadFireworksPreset } from "@tsparticles/preset-fireworks";
import { loadConfettiPreset } from "@tsparticles/preset-confetti";
import { AnimalCard } from "@/components/AnimalCard";
import { ClawMachine3D } from "@/components/ClawMachine3D";
import { RARITY_ORDER, type Rarity } from "@/lib/constants";
import type { PackResult } from "@/lib/actions";

const RARITY_RANK: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

const ODDS_DOT_COLOR: Record<Rarity, string> = {
  common: "bg-slate-400",
  uncommon: "bg-emerald-400",
  rare: "bg-sky-400",
  epic: "bg-purple-400",
  legendary: "bg-amber-400",
};

type Stage = "anticipation" | "burst" | "reveal" | "complete";

const ANTICIPATION_MS = 2000;
const SHAKE_MS = 600;
const BURST_MS = 700;
const CARD_REVEAL_GAP_MS = 600;

let particlesReady: Promise<void> | null = null;
function ensureParticles() {
  if (!particlesReady) {
    particlesReady = Promise.all([
      loadFireworksPreset(tsParticles),
      loadConfettiPreset(tsParticles),
    ]).then(() => undefined);
  }
  return particlesReady;
}

// Web Audio synth — short tactile tone per card flip. Different timbre per rarity.
function playRevealTone(rarity: Rarity) {
  if (typeof window === "undefined") return;
  try {
    const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq =
      rarity === "legendary" ? 880 :
      rarity === "epic" ? 740 :
      rarity === "rare" ? 587 :
      rarity === "uncommon" ? 494 :
      392;
    osc.type = rarity === "legendary" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    /* silently degrade */
  }
}

export function PackReveal({
  result,
  rarityWeights,
  onClose,
}: {
  result: PackResult;
  rarityWeights: Record<Rarity, number>;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("anticipation");
  const [revealedCount, setRevealedCount] = useState(0);
  const [shaking, setShaking] = useState(false);
  const skipped = useRef(false);

  const highestRarity = result.animals.reduce<Rarity>(
    (max, a) =>
      RARITY_RANK[a.rarity as Rarity] > RARITY_RANK[max] ? (a.rarity as Rarity) : max,
    "common",
  );

  const stage3d =
    stage === "burst" ? "burst" : shaking ? "shake" : stage === "anticipation" ? "anticipation" : "idle";

  useEffect(() => {
    ensureParticles();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) =>
      timers.push(setTimeout(() => !skipped.current && fn(), ms));

    at(ANTICIPATION_MS - SHAKE_MS, () => setShaking(true));
    at(ANTICIPATION_MS, () => {
      setStage("burst");
      fireBurstParticles(highestRarity);
    });
    at(ANTICIPATION_MS + BURST_MS, () => setStage("reveal"));

    return () => {
      timers.forEach(clearTimeout);
      cleanupParticles();
    };
  }, [highestRarity]);

  useEffect(() => {
    if (stage !== "reveal") return;
    if (revealedCount >= result.animals.length) {
      const t = setTimeout(() => setStage("complete"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      const animal = result.animals[revealedCount];
      playRevealTone(animal.rarity as Rarity);
      if (animal.rarity === "legendary") fireCardLegendary();
      setRevealedCount((n) => n + 1);
    }, CARD_REVEAL_GAP_MS);
    return () => clearTimeout(t);
  }, [stage, revealedCount, result.animals]);

  function handleSkip() {
    skipped.current = true;
    cleanupParticles();
    setStage("complete");
    setRevealedCount(result.animals.length);
  }

  function handlePackClick() {
    if (stage !== "anticipation") return;
    // Cancel auto-progression timers — otherwise the t=ANTICIPATION_MS auto-burst
    // would fire AFTER we've already entered reveal, snapping stage back to
    // burst and re-mounting the 3D scene (the "box appears 2x" bug).
    skipped.current = true;
    setStage("burst");
    fireBurstParticles(highestRarity);
    setTimeout(() => setStage("reveal"), BURST_MS);
  }

  function handleClose() {
    cleanupParticles();
    onClose();
  }

  const showCanvas = stage === "anticipation" || stage === "burst";
  const showResults = stage === "reveal" || stage === "complete";
  const cardCount = result.animals.length;

  // 5 cards → 5 columns at md+, 2-3 at smaller screens. 3-card packs use 3 cols.
  const gridCols =
    cardCount === 5 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
    : cardCount === 3 ? "grid-cols-3"
    : "grid-cols-2 sm:grid-cols-3";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && stage === "complete" && handleClose()}
    >
      <div id="pack-particles" className="absolute inset-0 pointer-events-none" />

      {showCanvas && (
        <div className="absolute inset-0">
          <ClawMachine3D rarity={highestRarity} stage={stage3d} onPackClick={handlePackClick} />
        </div>
      )}

      {stage === "burst" && (
        <div className="absolute inset-0 bg-white pointer-events-none animate-[screenFlash_700ms_ease-out_forwards]" />
      )}

      {/* Close [X] top-right — only enabled once reveal is complete */}
      {showResults && (
        <button
          onClick={handleClose}
          disabled={stage !== "complete"}
          aria-label="Close"
          className="absolute top-4 right-4 text-white/40 hover:text-white text-xl font-mono disabled:cursor-not-allowed z-10"
        >
          [X]
        </button>
      )}

      {/* Anticipation hint + skip */}
      {stage === "anticipation" && (
        <>
          <p className="absolute bottom-12 left-0 right-0 text-center text-white/40 text-xs tracking-widest uppercase pointer-events-none">
            Tap pack to open · or wait
          </p>
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/40 hover:text-white/80 text-xs z-10"
          >
            Skip →
          </button>
        </>
      )}

      {/* Reveal: title + grid + odds footer + close */}
      {showResults && (
        <div className="relative w-full max-w-4xl mx-auto my-auto bg-slate-950/80 rounded-3xl border border-white/10 p-6 sm:p-8 z-0">
          {/* Title */}
          <h2
            className={`text-center text-3xl sm:text-4xl font-extrabold tracking-tight ${
              highestRarity === "legendary"
                ? "text-amber-300 drop-shadow-[0_0_24px_rgba(252,211,77,0.6)]"
                : highestRarity === "epic"
                  ? "text-purple-300"
                  : "text-white"
            }`}
          >
            ×{cardCount} HATCHED!
          </h2>

          {/* Card grid */}
          <div className={`grid ${gridCols} gap-3 sm:gap-4 mt-6`}>
            {result.animals.map((a, i) => (
              <div
                key={a.id}
                className={`relative ${i < revealedCount ? "" : "invisible"}`}
                style={
                  i < revealedCount
                    ? { animation: "flipIn 700ms cubic-bezier(0.34, 1.56, 0.64, 1)" }
                    : undefined
                }
              >
                {i < revealedCount && (
                  <span
                    className={`absolute -top-2 -right-2 z-10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border-2 border-[var(--ink)] ${
                      a.isNew ? "bg-emerald-400 text-emerald-950" : "bg-slate-500 text-slate-50"
                    }`}
                  >
                    {a.isNew ? "NEW!" : "Dupe"}
                  </span>
                )}
                <AnimalCard
                  spriteUrl={a.spriteUrl}
                  name={a.speciesName}
                  rarity={a.rarity}
                  typeCode={a.typeCode}
                  size="md"
                />
              </div>
            ))}
          </div>

          {/* Odds footer */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-white/60">
            {RARITY_ORDER.map((r) => {
              const w = rarityWeights[r];
              if (w === 0) return null;
              return (
                <span key={r} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${ODDS_DOT_COLOR[r]}`} />
                  <span className="capitalize">{r}</span>
                  <span className="font-mono">{(w * 100).toFixed(0)}%</span>
                </span>
              );
            })}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={stage !== "complete"}
            className="mt-6 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold tracking-wider py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CLOSE
          </button>

          {/* Balance shown below */}
          <p className="text-center text-white/50 text-xs mt-3">
            Balance: <span className="font-mono">{result.newBalance.toLocaleString()}</span> pts
          </p>
        </div>
      )}
    </div>
  );
}

// Particle bursts. `sounds: { enable: false }` prevents the fireworks audio
// plugin from continuing past container.destroy().
async function fireBurstParticles(rarity: Rarity) {
  await ensureParticles();
  if (rarity === "legendary") {
    await tsParticles.load({
      id: "pack-particles",
      options: {
        preset: "fireworks",
        background: { color: "transparent" },
        fullScreen: { enable: false },
        sounds: { enable: false },
      },
    });
  } else if (rarity === "epic") {
    await tsParticles.load({
      id: "pack-particles",
      options: {
        preset: "confetti",
        background: { color: "transparent" },
        fullScreen: { enable: false },
        sounds: { enable: false },
        particles: { color: { value: ["#c084fc", "#a855f7", "#7e22ce", "#fbbf24"] } },
      },
    });
  } else if (rarity === "rare") {
    await tsParticles.load({
      id: "pack-particles",
      options: {
        preset: "confetti",
        background: { color: "transparent" },
        fullScreen: { enable: false },
        sounds: { enable: false },
        particles: { color: { value: ["#7dd3fc", "#0ea5e9"] }, number: { value: 30 } },
      },
    });
  } else if (rarity === "uncommon") {
    await tsParticles.load({
      id: "pack-particles",
      options: {
        preset: "confetti",
        background: { color: "transparent" },
        fullScreen: { enable: false },
        sounds: { enable: false },
        particles: { color: { value: ["#86efac", "#22c55e"] }, number: { value: 20 } },
      },
    });
  }
}

async function fireCardLegendary() {
  await ensureParticles();
  await tsParticles.load({
    id: "pack-particles",
    options: {
      preset: "fireworks",
      background: { color: "transparent" },
      fullScreen: { enable: false },
      sounds: { enable: false },
    },
  });
}

function cleanupParticles() {
  // tsParticles v4: Engine.items returns Container[]. Destroy any container
  // we created under the "pack-particles" id. Engine.load() can replace by id,
  // so usually there's at most one to clean up.
  tsParticles.items.forEach((c) => c.destroy());
}

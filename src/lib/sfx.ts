// Procedural battle SFX via the Web Audio API — synthesized in code, no audio
// files needed. Each move archetype gets a distinct sound. Fails silently if the
// browser blocks audio (no user gesture yet).

let actx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    actx =
      actx ||
      new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (actx.state === "suspended") void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

type ToneOpts = { freq: number; freq2?: number; type?: OscillatorType; dur?: number; gain?: number; delay?: number };

function tone(ctx: AudioContext, { freq, freq2, type = "sine", dur = 0.2, gain = 0.18, delay = 0 }: ToneOpts) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

type NoiseOpts = { dur?: number; gain?: number; type?: BiquadFilterType; freq?: number; delay?: number };

function noise(ctx: AudioContext, { dur = 0.3, gain = 0.2, type = "lowpass", freq = 1000, delay = 0 }: NoiseOpts) {
  const t0 = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

export function playMoveSfx(kind: string, crit: boolean) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    switch (kind) {
      case "beam":
        tone(ctx, { freq: 280, freq2: 900, type: "sawtooth", dur: 0.42, gain: 0.15 });
        break;
      case "bolt":
        tone(ctx, { freq: 1300, freq2: 280, type: "square", dur: 0.14, gain: 0.13 });
        noise(ctx, { dur: 0.18, gain: 0.12, type: "highpass", freq: 2200 });
        break;
      case "orb":
        tone(ctx, { freq: 720, freq2: 180, type: "sine", dur: 0.3, gain: 0.16 });
        break;
      case "blast":
        noise(ctx, { dur: 0.45, gain: 0.3, type: "lowpass", freq: 700 });
        tone(ctx, { freq: 120, freq2: 40, type: "sine", dur: 0.4, gain: 0.2 });
        break;
      case "barrage":
        for (let i = 0; i < 4; i++) tone(ctx, { freq: 620, freq2: 420, type: "square", dur: 0.07, gain: 0.09, delay: i * 0.09 });
        break;
      case "rain":
        for (let i = 0; i < 4; i++) tone(ctx, { freq: 950, freq2: 300, type: "triangle", dur: 0.12, gain: 0.09, delay: i * 0.08 });
        break;
      case "slash":
        noise(ctx, { dur: 0.16, gain: 0.2, type: "bandpass", freq: 2600 });
        break;
      case "multislash":
        for (let i = 0; i < 3; i++) noise(ctx, { dur: 0.11, gain: 0.16, type: "bandpass", freq: 2600, delay: i * 0.12 });
        break;
      case "quake":
        noise(ctx, { dur: 0.6, gain: 0.28, type: "lowpass", freq: 180 });
        tone(ctx, { freq: 60, freq2: 30, type: "sine", dur: 0.5, gain: 0.18 });
        break;
      case "dash":
        tone(ctx, { freq: 200, freq2: 80, type: "sine", dur: 0.16, gain: 0.2 });
        noise(ctx, { dur: 0.12, gain: 0.16, type: "lowpass", freq: 500, delay: 0.05 });
        break;
      default:
        tone(ctx, { freq: 420, freq2: 200, dur: 0.2, gain: 0.14 });
    }
    if (crit) tone(ctx, { freq: 1700, freq2: 2300, type: "sine", dur: 0.16, gain: 0.12, delay: 0.06 });
  } catch {
    /* ignore */
  }
}

export function playFaintSfx() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    tone(ctx, { freq: 420, freq2: 55, type: "sawtooth", dur: 0.55, gain: 0.18 });
  } catch {
    /* ignore */
  }
}

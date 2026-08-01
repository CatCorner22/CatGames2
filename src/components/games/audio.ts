/** Soft, non-scary synth sounds. Unlocked only after a user gesture. */

let ctx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on && ctx) {
    void ctx.suspend();
  } else if (on && ctx?.state === "suspended") {
    void ctx.resume();
  }
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.04) {
  if (!enabled || !ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playPop() {
  tone(520, 0.12, "triangle", 0.03);
  tone(780, 0.08, "sine", 0.02);
}

export function playSoftChime() {
  tone(392, 0.18, "sine", 0.025);
  setTimeout(() => tone(523, 0.2, "sine", 0.02), 60);
}

export function playTap() {
  tone(240, 0.06, "sine", 0.02);
}

/**
 * Position-aware tone for Walle's Chirp Chase. `pan` is -1 (left) to 1 (right).
 * `force` bypasses the global sound toggle — for a blind cat the sound IS the
 * game, so Walle's chirps stay audible even when UI sounds are off.
 */
function spatialTone(
  freq: number,
  duration: number,
  pan: number,
  type: OscillatorType = "sine",
  gain = 0.04,
  force = false,
) {
  if (!ctx && force) unlockAudio();
  if (!ctx) return;
  if (!enabled && !force) return;
  if (force && ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g);
  if (typeof ctx.createStereoPanner === "function") {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p);
    p.connect(ctx.destination);
  } else {
    g.connect(ctx.destination);
  }
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Pending multi-note timers, so leaving/pausing Walle's game can silence the tail notes. */
const spatialTimers: ReturnType<typeof setTimeout>[] = [];
function later(fn: () => void, ms: number) {
  const id = setTimeout(() => {
    const i = spatialTimers.indexOf(id);
    if (i >= 0) spatialTimers.splice(i, 1);
    fn();
  }, ms);
  spatialTimers.push(id);
}

export function cancelSpatialSounds() {
  for (const id of spatialTimers) clearTimeout(id);
  spatialTimers.length = 0;
}

/** Cricket chirp from a screen position; higher on screen = slightly higher pitch. */
export function playChirp(pan: number, pitch = 1) {
  spatialTone(1500 * pitch, 0.055, pan, "sine", 0.035, true);
  later(() => spatialTone(1700 * pitch, 0.05, pan, "sine", 0.028, true), 70);
}

/** Happy rising trill when Walle catches the critter. */
export function playTrill(pan: number) {
  spatialTone(660, 0.1, pan, "triangle", 0.035, true);
  later(() => spatialTone(880, 0.1, pan, "triangle", 0.03, true), 90);
  later(() => spatialTone(1174, 0.16, pan, "sine", 0.03, true), 180);
}

/** Audible scamper as the critter relocates — pans from its old spot to the new one. */
export function playScurry(fromPan: number, toPan: number) {
  for (let i = 0; i < 5; i++) {
    const p = fromPan + ((toPan - fromPan) * i) / 4;
    later(() => spatialTone(900 + i * 70, 0.04, p, "triangle", 0.02, true), i * 60);
  }
}

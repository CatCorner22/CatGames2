/** Soft, non-scary synth sounds. Unlocked only after a user gesture. */

import type { GameId } from "./types";

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
 * Melodic toolkit for the per-game sounds. Everything is scheduled on the
 * audio clock with a slow ~35ms attack so no sound ever snaps on — gentle for
 * sensitive kitten ears (mid-range pitches, tiny gains, short tails).
 */
function note(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.025, delayMs = 0, attack = 0.035) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** A note whose pitch glides from f0 to f1 — bloops, boings, squeaks, whooshes. */
function slide(f0: number, f1: number, dur: number, type: OscillatorType = "sine", gain = 0.025, delayMs = 0, attack = 0.03) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, f0), t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** Each game answers a successful bat with its own tiny, characterful sound. */
export function playScore(game: GameId) {
  switch (game) {
    case "laser": // bright little blip-blip
      note(660, 0.09, "sine", 0.028); note(880, 0.08, "sine", 0.02, 45); break;
    case "butterfly": // fluttery grace notes
      note(523, 0.07, "triangle", 0.018); note(622, 0.07, "triangle", 0.018, 60); note(587, 0.09, "triangle", 0.016, 120); break;
    case "mouse": // tiny squeak-squeak
      slide(680, 1000, 0.1, "sine", 0.02); slide(900, 700, 0.08, "sine", 0.014, 110); break;
    case "bubbles": // soft pop
      note(520, 0.1, "triangle", 0.026); note(780, 0.07, "sine", 0.018, 30); break;
    case "yarn": // cushioned boing
      slide(440, 300, 0.16, "sine", 0.028); break;
    case "fireflies": // twinkle
      note(784, 0.1, "sine", 0.02); note(1046, 0.14, "sine", 0.015, 70); break;
    case "fish": // watery bloop
      slide(520, 240, 0.15, "sine", 0.028); break;
    case "treats": // happy yum (C then E)
      note(523, 0.1, "triangle", 0.024); note(659, 0.14, "triangle", 0.02, 80); break;
    case "orion": // three rising stars, like the belt
      note(494, 0.1, "sine", 0.02); note(587, 0.1, "sine", 0.02, 70); note(740, 0.14, "sine", 0.018, 140); break;
    case "eclipse": // warm low halo
      note(330, 0.18, "sine", 0.024); note(415, 0.22, "sine", 0.016, 100); break;
    case "comet": // falling whoosh with a spark
      slide(950, 520, 0.2, "sine", 0.018); note(1046, 0.08, "sine", 0.012, 40); break;
    case "nebula": // dreamy hum
      note(392, 0.18, "sine", 0.02); note(587, 0.2, "sine", 0.014, 90); break;
    case "starshower": // wishing star streak
      slide(1046, 620, 0.16, "sine", 0.016); note(784, 0.1, "sine", 0.014, 130); break;
    case "saturn": // ring chime
      note(587, 0.09, "triangle", 0.02); note(880, 0.12, "sine", 0.016, 60); break;
    case "aurora": // the slowest, softest shimmer
      note(440, 0.3, "sine", 0.014, 0, 0.06); note(554, 0.34, "sine", 0.011, 130, 0.06); break;
    case "moonmoth": // moth-wing flutter
      note(622, 0.07, "triangle", 0.016); note(740, 0.09, "triangle", 0.014, 70); break;
    case "constellation":
      playSoftChime(); break;
    case "lunabounce": // low-gravity boop-up
      slide(392, 494, 0.11, "triangle", 0.024); break;
    case "ribbon": // silky sparkle
      note(740, 0.08, "sine", 0.02); note(988, 0.1, "sine", 0.016, 55); break;
    case "phoenix": // warm ember bell
      note(523, 0.14, "triangle", 0.024); note(784, 0.18, "sine", 0.016, 90); break;
    case "walle": // walle's catches use the spatial trill in-game; centered here
      playTrill(0); break;
    default:
      playTap();
  }
}

/** Little upward rainbow arpeggio for Phoenix's every-fifth-catch shower. */
export function playRainbowArp() {
  [523, 659, 784, 1046].forEach((f, i) => note(f, 0.14, "sine", 0.018, i * 85));
}

/** The whole kitten constellation lights up in the sky. */
export function playConstellationDone() {
  [392, 494, 587, 784].forEach((f, i) => note(f, 0.2, "sine", 0.02, i * 110));
  note(1175, 0.3, "sine", 0.012, 460);
}

/** Cushioned floor thud for bouncing toys — low, quiet, never sharp. */
export function playBounce(soft = false) {
  slide(soft ? 200 : 240, 120, 0.09, "sine", soft ? 0.016 : 0.02, 0, 0.012);
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

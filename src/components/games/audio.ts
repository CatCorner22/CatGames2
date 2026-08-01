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

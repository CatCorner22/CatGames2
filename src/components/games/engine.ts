import type { GameId, GameSettings } from "./types";
import { sizeMultiplier, speedMultiplier } from "./types";
import { playChirp, playPop, playScurry, playSoftChime, playTap, playTrill } from "./audio";

export interface PointerState { x: number; y: number; down: boolean; active: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }
interface Entity {
  x: number; y: number; vx: number; vy: number; r: number; phase: number; hue: number; kind: string;
  life?: number; maxLife?: number; angle?: number; state?: string; timer?: number; scale?: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const fract = (v: number) => v - Math.floor(v);

/** Kitten-face constellation: outline stars in normalized [0..1] space, tapped in order. */
const CAT_STARS: [number, number][] = [
  [0.5, 0.8], // chin
  [0.3, 0.63], // left cheek
  [0.24, 0.38], // left ear base
  [0.34, 0.15], // left ear tip
  [0.44, 0.3], // left brow
  [0.56, 0.3], // right brow
  [0.66, 0.15], // right ear tip
  [0.76, 0.38], // right ear base
  [0.7, 0.63], // right cheek
];
const CAT_EYES: [number, number][] = [
  [0.42, 0.46],
  [0.58, 0.46],
];

const SPACE_BG_GAMES: GameId[] = [
  "orion", "eclipse", "comet", "nebula",
  "starshower", "saturn", "aurora", "moonmoth", "constellation", "lunabounce", "ribbon",
];

const GAME_BGS: Record<string, [string, string]> = {
  laser: ["#0b1020", "#151a2e"], butterfly: ["#1a1430", "#2a1f45"], mouse: ["#1c1814", "#2a241c"],
  bubbles: ["#0c1a28", "#123048"], yarn: ["#1a1420", "#261828"], fireflies: ["#0a1210", "#122018"],
  fish: ["#0a2030", "#0f3550"], treats: ["#141820", "#1c2430"],
  orion: ["#050814", "#0c1228"], comet: ["#04060f", "#0a1424"], eclipse: ["#06050c", "#12101c"], nebula: ["#0a0614", "#1a0f28"],
  starshower: ["#050b1e", "#101b38"], saturn: ["#0b0a1a", "#191430"], aurora: ["#04101c", "#0a2030"],
  moonmoth: ["#0a0a18", "#141228"], constellation: ["#060a1c", "#0e1630"], lunabounce: ["#0b0f1d", "#161d33"],
  ribbon: ["#0a071c", "#1a1035"], walle: ["#0e1409", "#1d2a13"],
};

export class KittenGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: GameId = "laser";
  private settings: GameSettings;
  private pointer: PointerState = { x: 0, y: 0, down: false, active: false };
  private particles: Particle[] = [];
  private entities: Entity[] = [];
  private main: Entity | null = null;
  private w = 1; private h = 1; private dpr = 1;
  private time = 0; private wanderT = 0; private wanderX = 0; private wanderY = 0;
  private score = 0; private lastPop = 0; private running = false; private raf = 0; private lastTs = 0;
  private initialized = false;
  private vignette: CanvasGradient | null = null;
  private onScore?: (n: number) => void;
  // Kitten Constellation round state
  private constProgress = 0; private constCelebrate = 0; private constAuto = 0;
  private constJx = 0; private constJy = 0; private lastAdvance = 0;
  // Phoenix's Rainbow Bridge state
  private phxSpawnT = 0; private phxTumbleT = 0; private phxSide = 1; private emberT = 0;
  // Stardust Ribbon: trailing segment chain behind the head (`main`)
  private ribbon: { x: number; y: number }[] = [];
  // Walle's Chirp Chase: time since the critter last relocated
  private walleMoveT = 0;

  constructor(canvas: HTMLCanvasElement, settings: GameSettings, onScore?: (n: number) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx; this.settings = settings; this.onScore = onScore; this.resize();
  }

  setSettings(s: GameSettings) { this.settings = s; }
  setGame(id: GameId) { this.game = id; this.reset(); }
  setPointer(p: Partial<PointerState>) { Object.assign(this.pointer, p); }
  getScore() { return this.score; }

  resize() {
    const parent = this.canvas.parentElement;
    const rect = parent?.getBoundingClientRect() ?? this.canvas.getBoundingClientRect();
    const nw = Math.max(1, Math.floor(rect.width));
    const nh = Math.max(1, Math.floor(rect.height));
    const ndpr = Math.min(window.devicePixelRatio || 1, 2);
    // Reallocating the backing store clears the canvas — skip no-op calls
    // (window listener + ResizeObserver both fire for the same layout change).
    if (this.initialized && nw === this.w && nh === this.h && ndpr === this.dpr) return;
    this.dpr = ndpr;
    this.w = nw;
    this.h = nh;
    this.vignette = null;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // First layout initializes; later resizes only re-clamp so score/entities survive
    // orientation changes and browser-chrome show/hide.
    if (!this.initialized) {
      this.reset();
    } else {
      if (this.main) {
        this.main.x = clamp(this.main.x, this.main.r, Math.max(this.main.r, this.w - this.main.r));
        this.main.y = clamp(this.main.y, this.main.r, Math.max(this.main.r, this.h - this.main.r));
      }
      for (const e of this.entities) {
        e.x = clamp(e.x, -80, this.w + 80);
        e.y = clamp(e.y, -80, this.h + 80);
      }
      for (const seg of this.ribbon) {
        seg.x = clamp(seg.x, -40, this.w + 40);
        seg.y = clamp(seg.y, -40, this.h + 40);
      }
      this.wanderX = clamp(this.wanderX, 50, Math.max(50, this.w - 50));
      this.wanderY = clamp(this.wanderY, 50, Math.max(50, this.h - 50));
    }
  }

  start() {
    if (this.running) return;
    this.running = true; this.lastTs = performance.now();
    const loop = (ts: number) => {
      if (!this.running) return;
      const dt = Math.min((ts - this.lastTs) / 1000, 0.1);
      this.lastTs = ts; this.update(dt); this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  destroy() { this.stop(); }
  private sm() { return speedMultiplier(this.settings.speed); }
  private zm() { return sizeMultiplier(this.settings.size); }

  private target() {
    const m = this.settings.control; const p = this.pointer;
    if ((m === "follow" && p.active) || (m === "mixed" && p.down)) return { x: p.x, y: p.y };
    return { x: this.wanderX, y: this.wanderY };
  }

  reset() {
    this.initialized = true;
    this.entities = []; this.particles = []; this.score = 0; this.time = 0;
    this.wanderT = 0; this.wanderX = this.w * 0.5; this.wanderY = this.h * 0.5;
    this.pointer.down = false; this.pointer.active = false;
    this.constProgress = 0; this.constCelebrate = 0; this.constAuto = 0;
    this.constJx = rand(-0.04, 0.04); this.constJy = rand(-0.03, 0.03);
    this.phxSpawnT = 0.4; this.phxTumbleT = rand(1.5, 3); this.phxSide = 1; this.emberT = 0;
    this.onScore?.(0);
    const z = this.zm(); const cx = this.w * 0.5; const cy = this.h * 0.5;
    if (["laser", "orion", "comet"].includes(this.game)) {
      const r = this.game === "comet" ? 16 : 13;
      const hue = this.game === "comet" ? 190 : this.game === "orion" ? 220 : 0;
      this.main = { x: cx, y: cy, vx: 40, vy: 20, r: r * z, phase: 0, hue, kind: this.game };
    } else if (this.game === "eclipse") {
      this.main = { x: cx, y: cy, vx: 30, vy: 20, r: 34 * z, phase: 0, hue: 45, kind: "eclipse" };
    } else if (this.game === "butterfly") {
      this.main = { x: cx * 0.8, y: cy * 0.9, vx: 40, vy: 20, r: 22 * z, phase: 0, hue: 280, kind: "butterfly", angle: 0 };
    } else if (this.game === "mouse") {
      this.main = { x: cx, y: cy * 1.2, vx: 0, vy: 0, r: 20 * z, phase: 0, hue: 35, kind: "mouse", state: "idle", timer: 1.2, angle: 0 };
    } else if (this.game === "yarn") {
      this.main = { x: cx, y: cy * 0.8, vx: rand(-80, 80), vy: rand(-40, 40), r: 28 * z, phase: 0, hue: 350, kind: "yarn", angle: 0 };
    } else if (this.game === "lunabounce") {
      this.main = { x: cx, y: cy * 0.7, vx: rand(-60, 60), vy: rand(-30, 10), r: 30 * z, phase: 0, hue: 210, kind: "luna", angle: 0 };
    } else if (this.game === "bubbles") {
      this.main = null;
      for (let i = 0; i < 10; i++) this.spawnBubble(true);
    } else if (this.game === "fireflies" || this.game === "nebula") {
      this.main = null;
      const n = this.game === "nebula" ? 9 : 14;
      for (let i = 0; i < n; i++) {
        this.entities.push({
          x: rand(40, this.w - 40), y: rand(40, this.h - 40), vx: rand(-25, 25), vy: rand(-25, 25),
          r: rand(this.game === "nebula" ? 18 : 4, this.game === "nebula" ? 34 : 9) * z,
          phase: rand(0, Math.PI * 2),
          hue: this.game === "nebula" ? [280, 320, 200, 30, 160, 250, 340, 210, 190][i]! : rand(70, 140),
          kind: this.game === "nebula" ? "nebula" : "firefly",
        });
      }
    } else if (this.game === "fish") {
      this.main = null;
      for (let i = 0; i < 6; i++) {
        this.entities.push({ x: rand(50, this.w - 50), y: rand(50, this.h - 50), vx: rand(-50, 50), vy: rand(-30, 30), r: rand(16, 28) * z, phase: rand(0, Math.PI * 2), hue: [200, 20, 160, 45, 300, 180][i % 6]!, kind: "fish", angle: 0 });
      }
    } else if (this.game === "treats") {
      this.main = null; this.spawnTreat();
    } else if (this.game === "starshower") {
      this.main = null;
      for (let i = 0; i < 6; i++) this.spawnShootingStar(true);
    } else if (this.game === "saturn") {
      this.main = { x: cx, y: cy, vx: 0, vy: 0, r: 40 * z, phase: 0, hue: 35, kind: "saturn" };
      for (let i = 0; i < 6; i++) {
        this.entities.push({
          x: cx, y: cy,
          // vx = angular velocity (rad/s), life = orbit radius multiplier of planet r
          vx: rand(0.35, 0.8), vy: 0, r: rand(7, 10) * z,
          phase: rand(0, Math.PI * 2), hue: [50, 180, 320, 30, 210, 280][i]!,
          kind: "ringmoon", angle: (Math.PI * 2 * i) / 6, life: 1.7 + i * 0.26,
        });
      }
    } else if (this.game === "aurora") {
      this.main = null;
      for (let i = 0; i < 5; i++) {
        this.entities.push({
          x: rand(30, this.w - 30), y: 0, vx: rand(22, 46) * (i % 2 === 0 ? 1 : -1), vy: 0,
          r: rand(10, 14) * z, phase: rand(0, Math.PI * 2), hue: [160, 190, 130, 210, 170][i]!,
          kind: "auroraorb", timer: i % 3,
        });
      }
    } else if (this.game === "moonmoth") {
      this.main = null;
      for (let i = 0; i < 5; i++) {
        this.entities.push({
          x: rand(this.w * 0.3, this.w * 0.9), y: rand(this.h * 0.1, this.h * 0.6),
          vx: rand(-30, 30), vy: rand(-30, 30), r: rand(11, 15) * z,
          phase: rand(0, Math.PI * 2), hue: [270, 290, 250, 300, 260][i]!,
          kind: "moth", angle: rand(0, Math.PI * 2), timer: rand(0.35, 0.6),
        });
      }
    } else if (this.game === "constellation") {
      this.main = null;
    } else if (this.game === "ribbon") {
      this.main = { x: cx, y: cy * 0.6, vx: 30, vy: 10, r: 12 * z, phase: 0, hue: 300, kind: "ribbonhead", angle: 0 };
      this.ribbon = Array.from({ length: 24 }, (_, i) => ({ x: cx, y: cy * 0.6 + (i + 1) * 11 * z }));
    } else if (this.game === "walle") {
      this.main = null;
      this.walleMoveT = 0;
      this.spawnCritter();
    } else if (this.game === "phoenix") {
      this.main = { x: cx, y: this.h * 0.3, vx: 0, vy: 0, r: 26 * z, phase: 0, hue: 28, kind: "phoenix", angle: 0, timer: 0 };
      this.spawnGoodie(); this.spawnGoodie();
    }
  }

  private spawnBubble(anywhere = false) {
    const z = this.zm();
    this.entities.push({
      x: anywhere ? rand(30, this.w - 30) : rand(40, this.w - 40),
      y: anywhere ? rand(this.h * 0.4, this.h + 20) : this.h + rand(10, 80),
      vx: rand(-25, 25), vy: rand(-55, -25) * this.sm(), r: rand(16, 36) * z,
      phase: rand(0, Math.PI * 2), hue: rand(180, 220), kind: "bubble",
    });
  }

  private spawnTreat() {
    const z = this.zm();
    this.entities.push({ x: rand(60, this.w - 60), y: rand(60, this.h - 60), vx: 0, vy: 0, r: 26 * z, phase: 0, hue: rand(20, 50), kind: "treat", life: 0, maxLife: rand(2.8, 4.5), scale: 0, state: "in" });
  }

  private spawnShootingStar(anywhere = false) {
    const z = this.zm(); const sm = this.sm();
    this.entities.push({
      x: rand(20, this.w - 20), y: anywhere ? rand(-40, this.h * 0.7) : rand(-70, -20),
      vx: rand(-38, 38) * sm, vy: rand(55, 95) * sm, r: rand(5, 8) * z,
      phase: rand(0, Math.PI * 2), hue: rand(45, 60), kind: "shootstar",
    });
  }

  /** Phoenix game: a treat (60%) or catnip sprig (40%) that fades in, lingers, fades out. */
  private spawnGoodie() {
    const z = this.zm();
    const nip = Math.random() < 0.4;
    this.entities.push({
      x: rand(50, this.w - 50), y: rand(this.h * 0.42, this.h * 0.86),
      vx: 0, vy: 0, r: (nip ? 20 : 17) * z, phase: rand(0, Math.PI * 2),
      hue: nip ? 100 : rand(28, 42), kind: nip ? "nip" : "kibble",
      life: 0, maxLife: rand(4.2, 6.5) / Math.max(0.8, this.sm()), scale: 0, state: "in",
    });
  }

  /** Stereo pan (-1..1) for an x position — how Walle "sees" the screen. */
  private panOf(x: number) { return clamp((x / Math.max(1, this.w)) * 2 - 1, -1, 1); }

  private spawnCritter() {
    const z = this.zm();
    this.entities.push({
      x: rand(100, Math.max(140, this.w - 100)), y: rand(100, Math.max(140, this.h - 100)),
      vx: 0, vy: 0, r: 15 * z, phase: rand(0, Math.PI * 2), hue: 90, kind: "critter",
      life: 0, timer: 0.6,
    });
  }

  private relocateCritter(c: Entity) {
    const from = this.panOf(c.x);
    c.x = rand(100, Math.max(140, this.w - 100));
    c.y = rand(100, Math.max(140, this.h - 100));
    c.life = 0; c.timer = 0.55; this.walleMoveT = 0;
    playScurry(from, this.panOf(c.x));
  }

  private spawnTumbleweed() {
    const z = this.zm(); const sm = this.sm();
    this.phxSide *= -1;
    const fromLeft = this.phxSide > 0;
    this.entities.push({
      x: fromLeft ? -50 : this.w + 50, y: rand(this.h * 0.55, this.h * 0.85),
      vx: (fromLeft ? 1 : -1) * rand(45, 85) * sm, vy: 0, r: rand(24, 34) * z,
      phase: rand(0, Math.PI * 2), hue: 30, kind: "tumble", angle: 0,
    });
  }

  private burst(x: number, y: number, color: string, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rand(-0.2, 0.2); const sp = rand(40, 140);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.35, 0.7), max: 0.7, color, size: rand(2, 5) * this.zm() });
    }
  }

  private rainbowBurst(x: number, y: number, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2); const sp = rand(30, 130);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        life: rand(0.4, 0.9), max: 0.9,
        color: `hsla(${Math.floor(rand(0, 360))}, 80%, 68%, 0.9)`, size: rand(2, 4.5) * this.zm(),
      });
    }
  }

  private maybeScore(x: number, y: number, color: string, cd = 220): boolean {
    const now = performance.now(); if (now - this.lastPop < cd) return false;
    this.lastPop = now; this.burst(x, y, color); playTap(); this.score += 1; this.onScore?.(this.score);
    return true;
  }

  /** Positions of the three Orion's Belt stars (center follows `main`). */
  private orionStars(): { x: number; y: number }[] {
    const m = this.main!;
    const a = this.time * 0.35;
    const off = m.r * 2.8;
    return [
      { x: m.x - Math.cos(a) * off, y: m.y - Math.sin(a) * off },
      { x: m.x, y: m.y },
      { x: m.x + Math.cos(a) * off, y: m.y + Math.sin(a) * off },
    ];
  }

  private constellationLayout() {
    const s = Math.min(this.w, this.h) * 0.74;
    const ox = this.w * (0.5 + this.constJx) - s * 0.5;
    const oy = this.h * (0.5 + this.constJy) - s * 0.48;
    const map = ([nx, ny]: [number, number]) => ({ x: ox + nx * s, y: oy + ny * s });
    return { stars: CAT_STARS.map(map), eyes: CAT_EYES.map(map) };
  }

  private update(dt: number) {
    this.time += dt;
    this.wanderT -= dt;
    if (this.wanderT <= 0) { this.wanderT = rand(0.6, 2.2) / this.sm(); this.wanderX = rand(50, this.w - 50); this.wanderY = rand(50, this.h - 50); }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    const t = this.target(); const sm = this.sm();
    if (this.main && ["laser", "orion", "comet", "eclipse", "butterfly"].includes(this.game)) {
      const m = this.main; const k = this.game === "butterfly" ? 1.8 : 3.2;
      const fx = this.game === "butterfly" ? Math.sin(this.time * 10) * 40 * sm : 0;
      const fy = this.game === "butterfly" ? Math.cos(this.time * 7.5) * 30 * sm : 0;
      m.vx += (t.x + fx - m.x) * k * sm * dt; m.vy += (t.y + fy - m.y) * k * sm * dt;
      m.vx *= 0.9; m.vy *= 0.9;
      if (Math.random() < 0.9 * sm * dt) { m.vx += rand(-200, 200) * sm; m.vy += rand(-200, 200) * sm; }
      m.x = clamp(m.x + m.vx * dt, m.r, this.w - m.r);
      m.y = clamp(m.y + m.vy * dt, m.r, this.h - m.r);
      m.phase += dt * 6; m.angle = Math.atan2(m.vy, m.vx);
      if (this.pointer.down) {
        if (this.game === "orion") {
          for (const s of this.orionStars()) {
            if (dist(this.pointer.x, this.pointer.y, s.x, s.y) < m.r * 2.2) {
              this.maybeScore(s.x, s.y, "#a5b4fc");
              break;
            }
          }
        } else if (dist(this.pointer.x, this.pointer.y, m.x, m.y) < m.r * 2) {
          const cols: Record<string, string> = { laser: "#fb7185", comet: "#67e8f9", eclipse: "#fde68a", butterfly: "#c4b5fd" };
          this.maybeScore(m.x, m.y, cols[this.game] || "#fb7185");
        }
      }
    }
    if (this.main && this.game === "mouse") {
      const m = this.main; m.timer = (m.timer ?? 0) - dt;
      if (m.state === "idle") {
        m.vx *= 0.85; m.vy *= 0.85;
        if ((m.timer ?? 0) <= 0) {
          m.state = "run"; m.timer = rand(0.5, 1.1) / sm;
          const a = Math.atan2(t.y - m.y, t.x - m.x) + rand(-0.5, 0.5);
          const sp = rand(180, 320) * sm; m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
        }
      } else if ((m.timer ?? 0) <= 0) { m.state = "idle"; m.timer = rand(0.7, 1.8) / sm; m.vx *= 0.2; m.vy *= 0.2; }
      m.x = clamp(m.x + m.vx * dt, m.r, this.w - m.r); m.y = clamp(m.y + m.vy * dt, m.r, this.h - m.r);
      if (m.x <= m.r || m.x >= this.w - m.r) m.vx *= -1;
      if (m.y <= m.r || m.y >= this.h - m.r) m.vy *= -1;
      m.angle = Math.atan2(m.vy, m.vx);
      if (this.pointer.down && dist(this.pointer.x, this.pointer.y, m.x, m.y) < m.r * 1.6) {
        this.maybeScore(m.x, m.y, "#fbbf24"); m.state = "run"; m.timer = 0.8 / sm;
        const a = Math.atan2(m.y - this.pointer.y, m.x - this.pointer.x);
        m.vx = Math.cos(a) * 360 * sm; m.vy = Math.sin(a) * 360 * sm;
      }
    }
    if (this.main && (this.game === "yarn" || this.game === "lunabounce")) {
      const luna = this.game === "lunabounce";
      const m = this.main; m.vy += (luna ? 60 : 180) * dt;
      if (this.pointer.down) {
        const d = dist(this.pointer.x, this.pointer.y, m.x, m.y);
        if (d < m.r * 2.5) {
          m.vx += (this.pointer.x - m.x) * 8 * dt * sm;
          m.vy += (this.pointer.y - m.y) * 8 * dt * sm - 80 * dt;
          if (d < m.r * 1.3 && this.maybeScore(m.x, m.y, luna ? "#e2e8f0" : "#fb7185", luna ? 260 : 180) && luna) {
            m.vy -= rand(90, 150) * sm; m.vx += rand(-80, 80) * sm;
          }
        }
      }
      const drag = luna ? 0.999 : 0.992;
      m.vx *= drag; m.vy *= drag; m.x += m.vx * dt; m.y += m.vy * dt;
      const floor = this.h - m.r - 8;
      const bounce = luna ? -0.78 : -0.62;
      if (m.y > floor) { m.y = floor; m.vy *= bounce; m.vx *= luna ? 0.985 : 0.92; }
      if (m.y < m.r) { m.y = m.r; m.vy *= -0.7; }
      if (m.x < m.r || m.x > this.w - m.r) m.vx *= -0.7;
      m.x = clamp(m.x, m.r, this.w - m.r);
      m.angle = (m.angle ?? 0) + (m.vx / Math.max(10, m.r)) * dt;
      if (luna && Math.abs(m.vx) + Math.abs(m.vy) < 22 && Math.random() < 0.5 * sm * dt) {
        m.vx += rand(-90, 90) * sm; m.vy -= rand(60, 120) * sm;
      }
    }
    if (this.game === "bubbles") {
      while (this.entities.filter(e => e.kind === "bubble").length < 10) this.spawnBubble();
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i]!; if (e.kind !== "bubble") continue;
        e.phase += dt * 3; e.x += Math.sin(e.phase) * 18 * dt + e.vx * dt; e.y += e.vy * dt;
        if (e.y < -60) { this.entities.splice(i, 1); continue; }
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 1.15) {
          this.burst(e.x, e.y, "rgba(125,211,252,0.9)", 14); playPop(); this.score += 1; this.onScore?.(this.score); this.entities.splice(i, 1);
        }
      }
    }
    if (this.game === "fireflies" || this.game === "nebula") {
      for (const e of this.entities) {
        e.phase += dt * 2;
        if (this.settings.control === "follow" || (this.settings.control === "mixed" && this.pointer.down)) {
          e.vx += (t.x - e.x) * 0.3 * sm * dt; e.vy += (t.y - e.y) * 0.3 * sm * dt;
        }
        e.vx += Math.sin(this.time + e.phase) * 10 * dt; e.vy += Math.cos(this.time + e.phase) * 10 * dt;
        e.vx *= 0.98; e.vy *= 0.98;
        e.x = clamp(e.x + e.vx * dt, 10, this.w - 10); e.y = clamp(e.y + e.vy * dt, 10, this.h - 10);
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * (e.kind === "nebula" ? 1.2 : 3)) {
          if (e.kind === "nebula") {
            this.burst(e.x, e.y, `hsla(${e.hue},80%,70%,0.8)`, 12); playPop(); this.score += 1; this.onScore?.(this.score);
            e.x = rand(50, this.w - 50); e.y = rand(50, this.h - 50);
          } else { this.maybeScore(e.x, e.y, "#6ee7b7", 400); e.vx += rand(-40, 40); e.vy += rand(-40, 40); }
        }
      }
    }
    if (this.game === "fish") {
      for (const e of this.entities) {
        e.phase += dt * 4;
        if ((this.settings.control === "follow" || (this.settings.control === "mixed" && this.pointer.down)) && Math.random() < 0.4) {
          e.vx += (t.x - e.x) * 0.9 * sm * dt; e.vy += (t.y - e.y) * 0.9 * sm * dt;
        } else { e.vx += Math.sin(this.time + e.phase) * 30 * dt * sm; e.vy += Math.cos(this.time * 0.8 + e.phase) * 20 * dt * sm; }
        e.vx *= 0.99; e.vy *= 0.99;
        e.x = clamp(e.x + e.vx * dt, e.r, this.w - e.r); e.y = clamp(e.y + e.vy * dt, e.r, this.h - e.r);
        if (e.x <= e.r || e.x >= this.w - e.r) e.vx *= -1;
        if (e.y <= e.r || e.y >= this.h - e.r) e.vy *= -1;
        e.angle = Math.atan2(e.vy, e.vx);
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 1.4) this.maybeScore(e.x, e.y, `hsl(${e.hue} 80% 65%)`, 250);
      }
    }
    if (this.game === "treats") {
      if (this.entities.length === 0) this.spawnTreat();
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i]!; e.life = (e.life ?? 0) + dt; const max = e.maxLife ?? 3;
        if (e.state === "in") { e.scale = clamp((e.life ?? 0) / 0.35, 0, 1); if ((e.life ?? 0) > 0.35) e.state = "idle"; }
        else if (e.state === "out") { e.scale = clamp(1 - ((e.life ?? 0) - max) / 0.4, 0, 1); if ((e.scale ?? 0) <= 0) { this.entities.splice(i, 1); continue; } }
        else if ((e.life ?? 0) > max) e.state = "out";
        e.phase += dt * 3;
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 1.5) {
          this.burst(e.x, e.y, "#fcd34d", 16); playSoftChime(); this.score += 1; this.onScore?.(this.score); this.entities.splice(i, 1);
        }
      }
    }
    if (this.game === "starshower") {
      while (this.entities.length < 6) this.spawnShootingStar();
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i]!;
        e.phase += dt * 5;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.y > this.h + 50 || e.x < -60 || e.x > this.w + 60) { this.entities.splice(i, 1); continue; }
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 3.2) {
          this.burst(e.x, e.y, "#fde047", 14); playPop(); this.score += 1; this.onScore?.(this.score);
          this.entities.splice(i, 1);
        }
      }
    }
    if (this.game === "saturn" && this.main) {
      const m = this.main;
      m.vx += (t.x - m.x) * 0.5 * sm * dt; m.vy += (t.y - m.y) * 0.5 * sm * dt;
      m.vx *= 0.95; m.vy *= 0.95;
      // Keep the widest moon orbit (3.0 * r plus the moon itself) fully on screen
      // even when the planet is pinned at the clamp bound.
      const mx = Math.min(m.r * 3.3, this.w * 0.45);
      const my = Math.min(m.r * 1.75, this.h * 0.45);
      m.x = clamp(m.x + m.vx * dt, mx, this.w - mx);
      m.y = clamp(m.y + m.vy * dt, my, this.h - my);
      m.phase += dt;
      for (const e of this.entities) {
        if (e.kind !== "ringmoon") continue;
        e.angle = (e.angle ?? 0) + e.vx * sm * dt;
        e.phase += dt * 3;
        const orbitR = m.r * (e.life ?? 2);
        e.x = m.x + Math.cos(e.angle ?? 0) * orbitR;
        e.y = m.y + Math.sin(e.angle ?? 0) * orbitR * 0.42;
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 2.4) {
          if (this.maybeScore(e.x, e.y, `hsl(${e.hue} 85% 70%)`, 250)) {
            e.angle = (e.angle ?? 0) + rand(Math.PI / 3, Math.PI);
          }
        }
      }
    }
    if (this.game === "aurora") {
      for (const e of this.entities) {
        e.phase += dt * 2;
        e.x += e.vx * sm * dt;
        if (e.x < -30) e.x = this.w + 20;
        if (e.x > this.w + 30) e.x = -20;
        e.y = this.ribbonY((e.timer ?? 0), e.x) + Math.sin(e.phase) * 6;
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 2.6) {
          if (this.maybeScore(e.x, e.y, `hsl(${e.hue} 80% 70%)`, 300)) e.vx *= -1;
        }
      }
    }
    if (this.game === "moonmoth") {
      const moonX = this.w * 0.74; const moonY = this.h * 0.28;
      for (const e of this.entities) {
        e.phase += dt * 10;
        e.angle = (e.angle ?? 0) + dt * (0.3 + (e.timer ?? 0.4));
        const follow = this.settings.control === "follow" || (this.settings.control === "mixed" && this.pointer.down);
        const hx = follow ? t.x : moonX + Math.cos(e.angle ?? 0) * this.w * 0.16;
        const hy = follow ? t.y : moonY + Math.sin(e.angle ?? 0) * this.h * 0.14;
        e.vx += (hx - e.x) * 1.1 * sm * dt; e.vy += (hy - e.y) * 1.1 * sm * dt;
        e.vx += Math.sin(this.time * 6 + e.phase) * 14 * dt;
        e.vy += Math.cos(this.time * 5 + e.phase) * 14 * dt;
        e.vx *= 0.96; e.vy *= 0.96;
        e.x = clamp(e.x + e.vx * dt, 12, this.w - 12); e.y = clamp(e.y + e.vy * dt, 12, this.h - 12);
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 2.4) {
          if (this.maybeScore(e.x, e.y, "#d8b4fe", 300)) {
            const a = Math.atan2(e.y - this.pointer.y, e.x - this.pointer.x);
            e.vx = Math.cos(a) * 220 * sm; e.vy = Math.sin(a) * 220 * sm;
          }
        }
      }
    }
    if (this.game === "constellation") {
      const { stars } = this.constellationLayout();
      if (this.constCelebrate > 0) {
        this.constCelebrate -= dt;
        if (Math.random() < 15 * dt) {
          const s = stars[Math.floor(rand(0, stars.length))]!;
          this.burst(s.x, s.y, "#93c5fd", 4);
        }
        if (this.constCelebrate <= 0) {
          this.constProgress = 0;
          this.constJx = rand(-0.05, 0.05); this.constJy = rand(-0.04, 0.04);
        }
      } else if (this.constProgress < stars.length) {
        const active = stars[this.constProgress]!;
        const hitR = Math.max(34, 30 * this.zm());
        const now = performance.now();
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, active.x, active.y) < hitR * 1.6 && now - this.lastAdvance > 350) {
          this.lastAdvance = now;
          this.burst(active.x, active.y, "#bfdbfe", 12); playSoftChime();
          this.score += 1; this.onScore?.(this.score);
          this.constProgress += 1; this.constAuto = 0;
        } else {
          // Batting any other star answers back with a soft sparkle (no score),
          // so paws never get dead silence.
          if (this.pointer.down && now - this.lastAdvance > 350) {
            for (const s of stars) {
              if (s === active) continue;
              if (dist(this.pointer.x, this.pointer.y, s.x, s.y) < hitR) {
                this.lastAdvance = now;
                this.burst(s.x, s.y, "rgba(147,197,253,0.55)", 4);
                break;
              }
            }
          }
          // Assist in every mode so the sky never stalls; brisker when the whole
          // game is hands-free.
          this.constAuto += dt;
          const assistAfter = (this.settings.control === "auto" ? 3.2 : 7) / sm;
          if (this.constAuto > assistAfter) {
            this.constAuto = 0;
            this.burst(active.x, active.y, "#bfdbfe", 8);
            this.constProgress += 1;
          }
        }
        if (this.constProgress >= stars.length) {
          this.constCelebrate = 2.6;
          playSoftChime();
          for (const s of stars) this.burst(s.x, s.y, "#93c5fd", 3);
        }
      }
    }
    if (this.main && this.game === "ribbon") {
      const m = this.main;
      // Head swims toward the target with a sinuous wiggle, like a wand toy being drawn
      const wig = Math.sin(this.time * 5.2) * 60 * sm;
      const na = Math.atan2(t.y - m.y, t.x - m.x) + Math.PI / 2;
      m.vx += ((t.x - m.x) * 2.6 + Math.cos(na) * wig) * sm * dt;
      m.vy += ((t.y - m.y) * 2.6 + Math.sin(na) * wig) * sm * dt;
      m.vx *= 0.92; m.vy *= 0.92;
      if (Math.random() < 0.5 * sm * dt) { m.vx += rand(-150, 150) * sm; m.vy += rand(-150, 150) * sm; }
      m.x = clamp(m.x + m.vx * dt, m.r, this.w - m.r);
      m.y = clamp(m.y + m.vy * dt, m.r, this.h - m.r);
      m.phase += dt * 6;
      // Chain constraint: each segment trails the one ahead at fixed spacing
      const spacing = 11 * this.zm();
      let px = m.x, py = m.y;
      for (const seg of this.ribbon) {
        const d = dist(px, py, seg.x, seg.y) || 1;
        if (d > spacing) {
          const f = (d - spacing) / d;
          seg.x += (px - seg.x) * f;
          seg.y += (py - seg.y) * f;
        }
        px = seg.x; py = seg.y;
      }
      if (this.pointer.down) {
        const tip = this.ribbon[this.ribbon.length - 1]!;
        const hitR = Math.max(30, 26 * this.zm());
        if (dist(this.pointer.x, this.pointer.y, tip.x, tip.y) < hitR * 1.7 &&
            this.maybeScore(tip.x, tip.y, "#f0abfc", 300)) {
          // Playful flick: the ribbon darts away like a teased wand toy
          m.vx += rand(-320, 320); m.vy += rand(-280, -140);
        }
      }
    }

    if (this.game === "walle") {
      const c = this.entities[0];
      if (c) {
        c.phase += dt * 5;
        c.life = (c.life ?? 0) + dt;
        c.timer = (c.timer ?? 0.6) - dt;
        if (c.timer <= 0) {
          // Chirp from where the critter sits: pan follows x, pitch rises with height
          c.timer = rand(1.3, 2.1) / Math.max(0.7, sm);
          c.life = 0;
          playChirp(this.panOf(c.x), 1.25 - (c.y / Math.max(1, this.h)) * 0.45);
        }
        this.walleMoveT += dt;
        if (this.walleMoveT > (this.settings.control === "auto" ? 7 : 11) / sm) this.relocateCritter(c);
        if (this.pointer.down) {
          // Very forgiving target — precision isn't the point, tracking by ear is
          const hitR = Math.max(85, 70 * this.zm());
          const now = performance.now();
          if (dist(this.pointer.x, this.pointer.y, c.x, c.y) < hitR && now - this.lastPop > 400) {
            this.lastPop = now;
            this.burst(c.x, c.y, "#fcd34d", 14);
            playTrill(this.panOf(c.x));
            this.score += 1; this.onScore?.(this.score);
            this.relocateCritter(c);
          }
        }
      }
    }

    if (this.game === "phoenix" && this.main) {
      const m = this.main;
      // The phoenix soars: a slow figure-eight in auto mode, or follows the finger.
      const follow = (this.settings.control === "follow" && this.pointer.active) || (this.settings.control === "mixed" && this.pointer.down);
      const tx = follow ? this.pointer.x : this.w * 0.5 + Math.sin(this.time * 0.32 * sm) * this.w * 0.34;
      const ty = follow ? this.pointer.y : this.h * 0.28 + Math.sin(this.time * 0.64 * sm) * this.h * 0.1;
      const px = m.x; const py = m.y;
      m.x += (tx - m.x) * Math.min(1, 1.6 * dt);
      m.y += (ty - m.y) * Math.min(1, 1.6 * dt);
      const mvx = m.x - px; const mvy = m.y - py;
      if (Math.abs(mvx) + Math.abs(mvy) > 0.3) m.angle = Math.atan2(mvy, mvx);
      m.phase += dt * 7;
      m.timer = Math.max(0, (m.timer ?? 0) - dt);
      this.emberT -= dt;
      if (this.emberT <= 0) {
        this.emberT = 0.09;
        this.particles.push({
          x: m.x - Math.cos(m.angle ?? 0) * m.r * 1.4, y: m.y - Math.sin(m.angle ?? 0) * m.r * 1.4,
          vx: rand(-12, 12), vy: rand(-4, 18), life: rand(0.3, 0.6), max: 0.6,
          color: `hsla(${Math.floor(rand(18, 45))}, 95%, 62%, 0.7)`, size: rand(1.5, 3),
        });
      }
      // Goodies fade in / linger / fade out; tumbleweeds can sweep them away.
      this.phxSpawnT -= dt;
      const goodies = this.entities.filter(e => e.kind === "kibble" || e.kind === "nip");
      if (this.phxSpawnT <= 0 && goodies.length < 3) {
        this.phxSpawnT = rand(0.7, 1.7);
        this.spawnGoodie();
      }
      this.phxTumbleT -= dt;
      const tumbles = this.entities.filter(e => e.kind === "tumble");
      if (this.phxTumbleT <= 0 && tumbles.length < 2) {
        this.phxTumbleT = rand(2.2, 4.5) / sm;
        this.spawnTumbleweed();
      }
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i]!;
        if (e.kind === "tumble") {
          e.x += e.vx * dt;
          e.y += Math.sin(this.time * 2.6 + e.phase) * 14 * dt;
          e.angle = (e.angle ?? 0) + (e.vx / e.r) * dt;
          if (e.x < -80 || e.x > this.w + 80) { this.entities.splice(i, 1); continue; }
          for (const g of this.entities) {
            if ((g.kind === "kibble" || g.kind === "nip") && g.state !== "swept" && dist(e.x, e.y, g.x, g.y) < e.r + g.r * 0.9) {
              g.state = "swept"; g.vx = e.vx * 1.05; g.vy = -26;
              this.burst(g.x, g.y, "rgba(176,137,105,0.75)", 6);
            }
          }
          continue;
        }
        if (e.kind !== "kibble" && e.kind !== "nip") continue;
        e.phase += dt * 3;
        if (e.state === "swept") {
          e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 60 * dt;
          e.scale = (e.scale ?? 1) - dt * 1.8;
          if ((e.scale ?? 0) <= 0) this.entities.splice(i, 1);
          continue;
        }
        e.life = (e.life ?? 0) + dt; const max = e.maxLife ?? 5;
        if (e.state === "in") { e.scale = clamp((e.life ?? 0) / 0.4, 0, 1); if ((e.life ?? 0) > 0.4) e.state = "idle"; }
        else if (e.state === "out") { e.scale = clamp(1 - ((e.life ?? 0) - max) / 0.5, 0, 1); if ((e.scale ?? 0) <= 0) { this.entities.splice(i, 1); continue; } }
        else if ((e.life ?? 0) > max) e.state = "out";
        if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < Math.max(30, e.r * 1.9)) {
          this.rainbowBurst(e.x, e.y, 14); playSoftChime();
          this.score += 1; this.onScore?.(this.score);
          m.timer = 1.1;
          if (this.score % 5 === 0) {
            // Every fifth catch: a soft rainbow shower drifts down from the bridge.
            for (let s = 0; s < 22; s++) {
              this.particles.push({
                x: rand(this.w * 0.1, this.w * 0.9), y: rand(this.h * 0.08, this.h * 0.3),
                vx: rand(-14, 14), vy: rand(24, 60), life: rand(0.8, 1.5), max: 1.5,
                color: `hsla(${Math.floor(rand(0, 360))}, 85%, 70%, 0.85)`, size: rand(2, 4),
              });
            }
          }
          this.entities.splice(i, 1);
        }
      }
    }
  }

  /** Aurora ribbon centerline for ribbon k (0..2) at screen x. */
  private ribbonY(k: number, x: number) {
    const base = this.h * (0.26 + k * 0.2);
    const amp = this.h * 0.055;
    return base
      + Math.sin(x * 0.004 + this.time * (0.4 + k * 0.16) + k * 2.1) * amp
      + Math.sin(x * 0.011 + this.time * 0.7 + k) * amp * 0.4;
  }

  private drawStarfield(n = 44) {
    const ctx = this.ctx;
    for (let i = 0; i < n; i++) {
      const sx = fract(Math.sin((i + 1) * 12.9898) * 43758.5453);
      const sy = fract(Math.sin((i + 1) * 78.233) * 12543.123);
      const tw = 0.22 + 0.18 * Math.sin(this.time * 1.4 + i * 1.7);
      ctx.globalAlpha = clamp(tw, 0.06, 0.4);
      ctx.fillStyle = "#dbeafe";
      const r = 0.8 + fract(Math.sin((i + 7) * 31.7) * 151.3) * 1.2;
      ctx.beginPath(); ctx.arc(sx * this.w, sy * this.h * 0.96, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private starPath(x: number, y: number, r: number, rot = 0) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2 + rot; const a2 = a + Math.PI / 5;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
  }

  private drawGlowStar(x: number, y: number, r: number, core: string, halo: string) {
    const ctx = this.ctx;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    rg.addColorStop(0, halo); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  private drawSedonaScene() {
    const ctx = this.ctx; const w = this.w; const h = this.h;
    // Warm twilight sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#221037");
    sky.addColorStop(0.45, "#5b2440");
    sky.addColorStop(0.78, "#b35322");
    sky.addColorStop(1, "#8a3416");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // A few early stars in the twilight
    for (let i = 0; i < 16; i++) {
      const sx = fract(Math.sin((i + 3) * 12.9898) * 43758.5453);
      const sy = fract(Math.sin((i + 3) * 78.233) * 12543.123) * 0.34;
      ctx.globalAlpha = 0.18 + 0.14 * Math.sin(this.time * 1.2 + i * 2.3);
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath(); ctx.arc(sx * w, sy * h, 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Rainbow bridge arcing across the sky
    const cy = h * 1.32; const rBase = h * 0.94;
    const bands = ["#f87171", "#fb923c", "#fde047", "#4ade80", "#38bdf8", "#818cf8", "#c084fc"];
    ctx.lineWidth = Math.max(6, h * 0.016);
    for (let i = 0; i < bands.length; i++) {
      ctx.strokeStyle = bands[i]!;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(w * 0.5, cy, rBase + i * ctx.lineWidth * 0.95, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Far mesas
    const mesa = (x: number, top: number, wid: number, color: string, baseY: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - wid * 0.62, baseY);
      ctx.lineTo(x - wid * 0.38, top);
      ctx.lineTo(x + wid * 0.38, top);
      ctx.lineTo(x + wid * 0.62, baseY);
      ctx.closePath(); ctx.fill();
    };
    mesa(w * 0.12, h * 0.52, w * 0.24, "rgba(120,44,20,0.55)", h * 0.8);
    mesa(w * 0.38, h * 0.6, w * 0.16, "rgba(120,44,20,0.45)", h * 0.8);
    mesa(w * 0.66, h * 0.5, w * 0.26, "rgba(120,44,20,0.55)", h * 0.8);
    mesa(w * 0.92, h * 0.58, w * 0.18, "rgba(120,44,20,0.45)", h * 0.8);
    // Near buttes + desert floor
    mesa(w * 0.24, h * 0.64, w * 0.2, "rgba(84,26,10,0.85)", h * 0.86);
    mesa(w * 0.82, h * 0.66, w * 0.22, "rgba(84,26,10,0.85)", h * 0.86);
    const ground = ctx.createLinearGradient(0, h * 0.78, 0, h);
    ground.addColorStop(0, "#571f0c");
    ground.addColorStop(1, "#2a1007");
    ctx.fillStyle = ground;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
  }

  /**
   * Phoenix himself — drawn from his photo: a gray-brown mackerel tabby with
   * big green-hazel eyes, a pink nose, forehead stripes, a freckled muzzle, and
   * long white whiskers — soaring on soft flame wings under the rainbow bridge.
   */
  private drawPhoenixCat(m: Entity) {
    const ctx = this.ctx;
    const glow = 0.45 + ((m.timer ?? 0) > 0 ? 0.35 : 0) + Math.sin(m.phase * 0.7) * 0.08;
    const rg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3.4);
    rg.addColorStop(0, `rgba(251,146,60,${glow * 0.5})`);
    rg.addColorStop(1, "rgba(251,146,60,0)");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(m.x, m.y);
    // Face travel direction (with a deadband so he doesn't flip-flop), bank gently with climb/dive
    if (m.vx > 20) m.scale = 1; else if (m.vx < -20) m.scale = -1;
    const flip = m.scale ?? 1;
    ctx.scale(flip, 1);
    ctx.rotate(clamp((m.vy ?? 0) / 600, -0.3, 0.3) * flip);
    const r = m.r;
    // Flame wings behind the body (soft flap)
    const flap = Math.sin(m.phase) * 0.5;
    for (const side of [-1, 1] as const) {
      const wg = ctx.createLinearGradient(0, 0, -r * 1.6, side * r * 1.4);
      wg.addColorStop(0, "rgba(251,146,60,0.95)"); wg.addColorStop(1, "rgba(250,204,21,0.3)");
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(-r * 0.25, side * (r * 0.6 + flap * r * 0.45), r * 1.25, r * 0.4, side * (0.55 + flap * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
    // Striped tabby tail streaming behind, tipped with flame
    const tw = Math.sin(m.phase * 1.3) * r * 0.3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#4a4238"; ctx.lineWidth = r * 0.3;
    ctx.beginPath(); ctx.moveTo(-r * 0.85, 0); ctx.quadraticCurveTo(-r * 1.9, tw, -r * 2.6, tw * 1.6); ctx.stroke();
    ctx.strokeStyle = "#26211b"; ctx.setLineDash([r * 0.2, r * 0.24]);
    ctx.beginPath(); ctx.moveTo(-r * 0.85, 0); ctx.quadraticCurveTo(-r * 1.9, tw, -r * 2.6, tw * 1.6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(251,146,60,0.85)"; ctx.lineWidth = r * 0.16;
    ctx.beginPath(); ctx.moveTo(-r * 2.55, tw * 1.6); ctx.quadraticCurveTo(-r * 2.9, tw * 1.6 - r * 0.3, -r * 3.1, tw * 1.6 + r * 0.1); ctx.stroke();
    // Body — dark charcoal tabby loaf, mid-soar
    const body = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
    body.addColorStop(0, "#5a5240"); body.addColorStop(0.5, "#3a352c"); body.addColorStop(1, "#2a251f");
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(-r * 0.05, 0, r * 1.05, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // Mackerel stripes with pale silvery ticking between them
    ctx.strokeStyle = "rgba(18,15,11,0.75)"; ctx.lineWidth = r * 0.09;
    for (let i = 0; i < 5; i++) {
      const bx = -r * 0.78 + i * r * 0.32;
      ctx.beginPath();
      ctx.moveTo(bx, -r * 0.5);
      ctx.quadraticCurveTo(bx + r * 0.12, 0, bx, r * 0.52);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(196,178,142,0.4)"; ctx.lineWidth = r * 0.035;
    for (let i = 0; i < 4; i++) {
      const bx = -r * 0.62 + i * r * 0.32;
      ctx.beginPath();
      ctx.moveTo(bx, -r * 0.42);
      ctx.quadraticCurveTo(bx + r * 0.1, 0, bx, r * 0.45);
      ctx.stroke();
    }
    // Front paws reaching into the flight
    ctx.fillStyle = "#3a352c";
    ctx.beginPath(); ctx.ellipse(r * 0.74, r * 0.32, r * 0.3, r * 0.14, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.62, r * 0.5, r * 0.28, r * 0.13, 0.2, 0, Math.PI * 2); ctx.fill();
    // Head
    const hx = r * 0.95; const hy = -r * 0.18; const hr = r * 0.54;
    // Wide-set ears with warm pink centers
    for (const side of [-1, 1] as const) {
      ctx.save();
      ctx.translate(hx + side * hr * 0.62, hy - hr * 0.7);
      ctx.rotate(side * 0.32);
      ctx.fillStyle = "#4a4238";
      ctx.beginPath(); ctx.moveTo(-hr * 0.34, hr * 0.3); ctx.lineTo(0, -hr * 0.62); ctx.lineTo(hr * 0.34, hr * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#c99a86";
      ctx.beginPath(); ctx.moveTo(-hr * 0.17, hr * 0.2); ctx.lineTo(0, -hr * 0.36); ctx.lineTo(hr * 0.17, hr * 0.2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Face
    const fgrad = ctx.createRadialGradient(hx, hy, hr * 0.2, hx, hy, hr);
    fgrad.addColorStop(0, "#6b6250"); fgrad.addColorStop(1, "#453e33");
    ctx.fillStyle = fgrad;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
    // The tabby 'M' — parallel forehead stripes from his photo
    ctx.strokeStyle = "rgba(18,15,11,0.8)"; ctx.lineWidth = hr * 0.09; ctx.lineCap = "round";
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * hr * 0.18, hy - hr * 0.92);
      ctx.quadraticCurveTo(hx + i * hr * 0.15, hy - hr * 0.6, hx + i * hr * 0.22, hy - hr * 0.35);
      ctx.stroke();
    }
    // Pale muzzle
    ctx.fillStyle = "#8d8471";
    ctx.beginPath(); ctx.ellipse(hx + hr * 0.14, hy + hr * 0.38, hr * 0.42, hr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // Big green-hazel eyes, dark-lined, with wide dark pupils and a glint
    for (const side of [-1, 1] as const) {
      const ex = hx + side * hr * 0.32 + hr * 0.05; const ey = hy - hr * 0.06;
      ctx.strokeStyle = "#14100c"; ctx.lineWidth = hr * 0.055;
      ctx.fillStyle = "#96ad80";
      ctx.beginPath(); ctx.ellipse(ex, ey, hr * 0.21, hr * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#c2d4a4";
      ctx.beginPath(); ctx.ellipse(ex, ey + hr * 0.05, hr * 0.15, hr * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0d0b08";
      ctx.beginPath(); ctx.ellipse(ex, ey, hr * 0.1, hr * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.arc(ex - hr * 0.05, ey - hr * 0.08, hr * 0.045, 0, Math.PI * 2); ctx.fill();
    }
    // Pink nose with a dark outline, philtrum, and a soft smile
    ctx.fillStyle = "#d9848c"; ctx.strokeStyle = "#14100c"; ctx.lineWidth = hr * 0.035;
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.1 - hr * 0.09, hy + hr * 0.27);
    ctx.lineTo(hx + hr * 0.1 + hr * 0.09, hy + hr * 0.27);
    ctx.lineTo(hx + hr * 0.1, hy + hr * 0.4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(18,15,11,0.6)"; ctx.lineWidth = hr * 0.04;
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.1, hy + hr * 0.4); ctx.lineTo(hx + hr * 0.1, hy + hr * 0.48); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + hr * 0.0, hy + hr * 0.5, hr * 0.08, Math.PI * 1.9, Math.PI * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + hr * 0.2, hy + hr * 0.5, hr * 0.08, Math.PI * 0.3, Math.PI * 1.1, true); ctx.stroke();
    // Freckled muzzle — his little whisker-spot dots
    ctx.fillStyle = "rgba(18,15,11,0.7)";
    for (const [fx2, fy2] of [[-0.12, 0.48], [0.0, 0.55], [0.3, 0.5], [-0.02, 0.42], [0.24, 0.4]] as const) {
      ctx.beginPath(); ctx.arc(hx + fx2 * hr, hy + fy2 * hr, hr * 0.026, 0, Math.PI * 2); ctx.fill();
    }
    // Long white whiskers sweeping past his cheeks
    ctx.strokeStyle = "rgba(245,245,240,0.85)"; ctx.lineWidth = hr * 0.028;
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(hx + hr * 0.12 + side * hr * 0.12, hy + hr * (0.3 + i * 0.08));
        ctx.quadraticCurveTo(
          hx + side * hr * (0.9 + i * 0.1), hy + hr * (0.22 + i * 0.12),
          hx + side * hr * (1.5 + i * 0.12), hy + hr * (0.05 + i * 0.24),
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** The chirping cricket Walle hunts by ear. */
  private drawCritter(e: Entity) {
    const ctx = this.ctx;
    const rg = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, e.r * 2.6);
    rg.addColorStop(0, "rgba(190,242,100,0.32)"); rg.addColorStop(1, "rgba(190,242,100,0)");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(e.x, e.y + Math.sin(e.phase) * e.r * 0.12);
    // Body + head
    ctx.fillStyle = "#a3e635";
    ctx.beginPath(); ctx.ellipse(0, 0, e.r, e.r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#84cc16";
    ctx.beginPath(); ctx.arc(e.r * 0.85, -e.r * 0.15, e.r * 0.42, 0, Math.PI * 2); ctx.fill();
    // Wing lifts while it sings
    if ((e.life ?? 9) < 0.35) {
      ctx.strokeStyle = "rgba(253,224,71,0.9)";
      ctx.lineWidth = e.r * 0.16; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-e.r * 0.5, -e.r * 0.5); ctx.quadraticCurveTo(0, -e.r * 1.1, e.r * 0.4, -e.r * 0.55); ctx.stroke();
    }
    // Legs, eye, antenna
    ctx.strokeStyle = "#65a30d"; ctx.lineWidth = e.r * 0.12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-e.r * 0.2, e.r * 0.4); ctx.lineTo(-e.r * 0.8, e.r * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(e.r * 0.25, e.r * 0.45); ctx.lineTo(e.r * 0.7, e.r * 0.95); ctx.stroke();
    ctx.fillStyle = "#1a2e05";
    ctx.beginPath(); ctx.arc(e.r * 1.0, -e.r * 0.22, e.r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#84cc16"; ctx.lineWidth = e.r * 0.09;
    ctx.beginPath(); ctx.moveTo(e.r * 1.05, -e.r * 0.5); ctx.quadraticCurveTo(e.r * 1.5, -e.r * 1.05, e.r * 1.9, -e.r * 0.95); ctx.stroke();
    ctx.restore();
  }

  /**
   * Walle himself rests in the bottom corner — white face and chest, gray-brown
   * tabby saddle and crown, peacefully closed eyes. His ears swivel toward the
   * critter and perk up on every chirp, the way a blind cat really listens.
   */
  private drawWalleCat(c: Entity | null) {
    const ctx = this.ctx;
    const s = Math.min(this.w, this.h) * 0.13;
    const x = s * 1.25; const y = this.h - s * 0.85;
    const toward = c ? clamp((c.x - x) / this.w, -1, 1) : 0;
    const perk = c && (c.life ?? 9) < 0.5 ? 1 - (c.life ?? 0) / 0.5 : 0;
    ctx.save();
    ctx.translate(x, y);
    // Body loaf — white chest and front
    ctx.fillStyle = "#f2ecdf";
    ctx.beginPath(); ctx.ellipse(s * 0.3, s * 0.5, s * 1.2, s * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    // Gray-brown tabby saddle over the back
    ctx.fillStyle = "#8a7a62";
    ctx.beginPath(); ctx.ellipse(s * 0.8, s * 0.22, s * 0.82, s * 0.42, -0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(74,62,48,0.55)"; ctx.lineWidth = s * 0.06; ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(s * (0.45 + i * 0.24), -s * 0.05);
      ctx.quadraticCurveTo(s * (0.55 + i * 0.24), s * 0.25, s * (0.42 + i * 0.24), s * 0.5);
      ctx.stroke();
    }
    // Tail curled around the front
    ctx.strokeStyle = "#8a7a62"; ctx.lineWidth = s * 0.22;
    ctx.beginPath(); ctx.moveTo(s * 1.3, s * 0.75); ctx.quadraticCurveTo(s * 0.7, s * 1.15, -s * 0.1, s * 1.0); ctx.stroke();
    const hx = -s * 0.45; const hy = -s * 0.25;
    // Ears — swivel toward the chirp, perk taller when it sounds
    const earTilt = toward * 0.35;
    const earH = 1 + perk * 0.22;
    for (const side of [-1, 1] as const) {
      ctx.save();
      ctx.translate(hx + side * s * 0.5, hy - s * 0.48);
      ctx.rotate(side * 0.18 + earTilt);
      ctx.fillStyle = "#9b8a70";
      ctx.beginPath();
      ctx.moveTo(-s * 0.26, s * 0.18); ctx.lineTo(0, -s * 0.6 * earH); ctx.lineTo(s * 0.26, s * 0.18);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e0aa9c";
      ctx.beginPath();
      ctx.moveTo(-s * 0.13, s * 0.1); ctx.lineTo(0, -s * 0.38 * earH); ctx.lineTo(s * 0.13, s * 0.1);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Tabby crown between the ears, white face below
    ctx.fillStyle = "#9b8a70";
    ctx.beginPath(); ctx.ellipse(hx, hy - s * 0.48, s * 0.56, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f7f2e7";
    ctx.beginPath(); ctx.arc(hx, hy, s * 0.62, 0, Math.PI * 2); ctx.fill();
    // Crown stripes reaching down the forehead
    ctx.strokeStyle = "rgba(94,80,62,0.7)"; ctx.lineWidth = s * 0.05;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * s * 0.17, hy - s * 0.72);
      ctx.lineTo(hx + i * s * 0.13, hy - s * 0.42);
      ctx.stroke();
    }
    // Peaceful closed eyes — gentle healed lids, always at rest
    ctx.strokeStyle = "#6b5d49"; ctx.lineWidth = s * 0.055; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(hx - s * 0.24, hy - s * 0.1, s * 0.14, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + s * 0.24, hy - s * 0.1, s * 0.14, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    // Pink nose, mouth, little brown chin spot
    ctx.fillStyle = "#e8a0a8";
    ctx.beginPath();
    ctx.moveTo(hx - s * 0.07, hy + s * 0.14); ctx.lineTo(hx + s * 0.07, hy + s * 0.14); ctx.lineTo(hx, hy + s * 0.24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(107,93,73,0.6)"; ctx.lineWidth = s * 0.035;
    ctx.beginPath(); ctx.moveTo(hx, hy + s * 0.24); ctx.lineTo(hx, hy + s * 0.32); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx - s * 0.09, hy + s * 0.34, s * 0.09, Math.PI * 1.15, Math.PI * 1.95, true); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + s * 0.09, hy + s * 0.34, s * 0.09, Math.PI * 1.05, Math.PI * 1.85, true); ctx.stroke();
    ctx.fillStyle = "#a9825e";
    ctx.beginPath(); ctx.arc(hx - s * 0.06, hy + s * 0.44, s * 0.055, 0, Math.PI * 2); ctx.fill();
    // Whiskers
    ctx.strokeStyle = "rgba(250,247,240,0.8)"; ctx.lineWidth = s * 0.025;
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(hx + side * s * 0.18, hy + s * (0.12 + i * 0.07));
        ctx.quadraticCurveTo(
          hx + side * s * 0.7, hy + s * (0.05 + i * 0.12),
          hx + side * s * 1.05, hy + s * (-0.05 + i * 0.2),
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawTumbleweed(e: Entity) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle ?? 0);
    ctx.strokeStyle = "rgba(196,154,108,0.85)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9 + e.phase;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * e.r * 0.35, Math.sin(a) * e.r * 0.35, e.r * 0.62, a, a + 2.2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(163,124,82,0.6)";
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - e.phase * 0.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.r * 0.9, Math.sin(a) * e.r * 0.9);
      ctx.lineTo(Math.cos(a + Math.PI) * e.r * 0.7, Math.sin(a + Math.PI) * e.r * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGoodie(e: Entity) {
    const ctx = this.ctx;
    const s = clamp(e.scale ?? 1, 0, 1);
    if (s <= 0) return;
    const wob = 1 + Math.sin(e.phase) * 0.06;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(s * wob, s * wob);
    if (e.kind === "nip") {
      // Catnip sprig: stem + three soft leaves
      ctx.strokeStyle = "#3f6212"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, e.r * 0.9); ctx.quadraticCurveTo(2, 0, 0, -e.r * 0.7); ctx.stroke();
      ctx.fillStyle = "#65a30d";
      for (const [ang, ly] of [[-0.9, -0.1], [0.9, 0.05], [0, -0.75]] as [number, number][]) {
        ctx.save();
        ctx.translate(Math.sin(ang) * e.r * 0.4, ly * e.r);
        ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.34, e.r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(190,242,100,0.5)";
      ctx.beginPath(); ctx.arc(0, -e.r * 0.75, e.r * 0.16, 0, Math.PI * 2); ctx.fill();
    } else {
      // Star-shaped treat kibble
      const rg = ctx.createRadialGradient(0, 0, 1, 0, 0, e.r * 1.6);
      rg.addColorStop(0, "rgba(253,224,71,0.4)"); rg.addColorStop(1, "rgba(253,224,71,0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, e.r * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fbbf24";
      this.starPath(0, 0, e.r, e.phase * 0.3);
      ctx.fill();
      ctx.fillStyle = "rgba(146,64,14,0.55)";
      ctx.beginPath(); ctx.arc(-e.r * 0.2, -e.r * 0.05, e.r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.r * 0.22, e.r * 0.16, e.r * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private draw() {
    const ctx = this.ctx; const w = this.w; const h = this.h;
    if (this.game === "phoenix") {
      this.drawSedonaScene();
    } else {
      const bg = GAME_BGS[this.game] || GAME_BGS.laser!;
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (SPACE_BG_GAMES.includes(this.game)) this.drawStarfield(this.game === "aurora" ? 24 : 44);
    }

    if (this.main && ["laser", "comet"].includes(this.game)) {
      const m = this.main; const pulse = 1 + Math.sin(m.phase) * 0.08; const r = m.r * pulse;
      const cols: Record<string, [string, string]> = { laser: ["rgba(251,113,133,0.3)", "#fff5f5"], comet: ["rgba(103,232,249,0.35)", "#ecfeff"] };
      const c = cols[this.game] || cols.laser!;
      if (this.game === "comet") {
        // Silky tail behind the head
        const a = Math.atan2(m.vy, m.vx) + Math.PI;
        const grad = ctx.createLinearGradient(m.x, m.y, m.x + Math.cos(a) * r * 9, m.y + Math.sin(a) * r * 9);
        grad.addColorStop(0, "rgba(103,232,249,0.4)"); grad.addColorStop(1, "rgba(103,232,249,0)");
        ctx.strokeStyle = grad; ctx.lineWidth = r * 1.1; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + Math.cos(a) * r * 9, m.y + Math.sin(a) * r * 9);
        ctx.stroke();
      }
      this.drawGlowStar(m.x, m.y, r, c[1], c[0]);
    }
    if (this.main && this.game === "orion") {
      const m = this.main; const pulse = 1 + Math.sin(m.phase) * 0.08;
      const stars = this.orionStars();
      ctx.strokeStyle = "rgba(165,180,252,0.28)"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(stars[0]!.x, stars[0]!.y);
      ctx.lineTo(stars[1]!.x, stars[1]!.y);
      ctx.lineTo(stars[2]!.x, stars[2]!.y);
      ctx.stroke();
      stars.forEach((s, i) => {
        const r = m.r * pulse * (i === 1 ? 1.1 : 0.85);
        this.drawGlowStar(s.x, s.y, r, "#eef2ff", "rgba(165,180,252,0.35)");
      });
    }
    if (this.main && this.game === "eclipse") {
      const m = this.main; const r = m.r * (1 + Math.sin(m.phase) * 0.06);
      const corona = ctx.createRadialGradient(m.x, m.y, r * 0.7, m.x, m.y, r * 2.2);
      corona.addColorStop(0, "rgba(253,230,138,0.5)"); corona.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(m.x, m.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0a0912"; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(253,230,138,0.45)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.main && this.game === "butterfly") {
      const m = this.main; const flap = 0.55 + Math.sin(m.phase) * 0.45;
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.angle ?? 0);
      ctx.fillStyle = "rgba(196,181,253,0.85)";
      ctx.beginPath(); ctx.ellipse(-8, -10, 16 * flap, 12, -0.4, 0, Math.PI * 2); ctx.ellipse(-8, 10, 16 * flap, 12, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (this.main && this.game === "mouse") {
      const m = this.main;
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.angle ?? 0);
      ctx.fillStyle = "#e7e5e4"; ctx.beginPath(); ctx.ellipse(0, 0, m.r * 1.1, m.r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1c1917"; ctx.beginPath(); ctx.arc(m.r * 0.75, -m.r * 0.2, m.r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (this.main && this.game === "yarn") {
      const m = this.main;
      const rg = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 2, m.x, m.y, m.r);
      rg.addColorStop(0, "#fda4af"); rg.addColorStop(1, "#e11d48");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    }
    if (this.main && this.game === "lunabounce") {
      const m = this.main;
      const halo = ctx.createRadialGradient(m.x, m.y, m.r * 0.6, m.x, m.y, m.r * 2.2);
      halo.addColorStop(0, "rgba(226,232,240,0.28)"); halo.addColorStop(1, "rgba(226,232,240,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(m.x, m.y); ctx.rotate(m.angle ?? 0);
      const rg = ctx.createRadialGradient(-m.r * 0.3, -m.r * 0.3, 2, 0, 0, m.r);
      rg.addColorStop(0, "#f8fafc"); rg.addColorStop(1, "#94a3b8");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, m.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(100,116,139,0.5)";
      for (const [cx2, cy2, cr] of [[-0.35, 0.1, 0.2], [0.25, -0.28, 0.14], [0.2, 0.35, 0.11]] as [number, number, number][]) {
        ctx.beginPath(); ctx.arc(cx2 * m.r, cy2 * m.r, cr * m.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (this.main && this.game === "saturn") {
      const m = this.main;
      const halo = ctx.createRadialGradient(m.x, m.y, m.r * 0.5, m.x, m.y, m.r * 2);
      halo.addColorStop(0, "rgba(253,186,116,0.3)"); halo.addColorStop(1, "rgba(253,186,116,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 2, 0, Math.PI * 2); ctx.fill();
      // Rings behind the moons
      ctx.strokeStyle = "rgba(253,186,116,0.3)";
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 2.4 - i * 0.6;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.r * (1.75 + i * 0.28), m.r * (1.75 + i * 0.28) * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const rg = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 2, m.x, m.y, m.r);
      rg.addColorStop(0, "#fed7aa"); rg.addColorStop(1, "#c2712c");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(146,64,14,0.25)";
      ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.25, m.r * 0.85, m.r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (this.game === "aurora") {
      // Flowing ribbons
      for (let k = 0; k < 3; k++) {
        const hue = 150 + k * 35;
        for (const [width, alpha] of [[Math.max(20, h * 0.05), 0.13], [Math.max(8, h * 0.018), 0.2]] as [number, number][]) {
          ctx.strokeStyle = `hsla(${hue}, 75%, 62%, ${alpha})`;
          ctx.lineWidth = width;
          ctx.lineCap = "round";
          ctx.beginPath();
          for (let x = -20; x <= w + 20; x += 26) {
            const y = this.ribbonY(k, x);
            if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    }
    if (this.game === "moonmoth") {
      // Crescent moon
      const mx = w * 0.74; const my = h * 0.28; const mr = Math.min(w, h) * 0.11;
      const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 2.6);
      halo.addColorStop(0, "rgba(226,232,240,0.22)"); halo.addColorStop(1, "rgba(226,232,240,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, mr * 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#141228";
      ctx.beginPath(); ctx.arc(mx - mr * 0.42, my - mr * 0.18, mr * 0.86, 0, Math.PI * 2); ctx.fill();
    }
    if (this.game === "constellation") {
      const { stars, eyes } = this.constellationLayout();
      const done = this.constProgress;
      // Connected lines so far
      if (done > 1) {
        ctx.strokeStyle = "rgba(147,197,253,0.4)"; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(stars[0]!.x, stars[0]!.y);
        for (let i = 1; i < done; i++) ctx.lineTo(stars[i]!.x, stars[i]!.y);
        if (done >= stars.length) ctx.closePath();
        ctx.stroke();
      }
      const z = this.zm();
      stars.forEach((s, i) => {
        if (i < done) {
          this.drawGlowStar(s.x, s.y, 9 * z, "#eff6ff", "rgba(147,197,253,0.4)");
        } else if (i === done && this.constCelebrate <= 0) {
          // The active star twinkles brightly
          const pulse = 1 + Math.sin(this.time * 5) * 0.25;
          this.drawGlowStar(s.x, s.y, 13 * z * pulse, "#ffffff", "rgba(191,219,254,0.55)");
          ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.4;
          const sp = 20 * z * pulse;
          ctx.beginPath();
          ctx.moveTo(s.x - sp, s.y); ctx.lineTo(s.x + sp, s.y);
          ctx.moveTo(s.x, s.y - sp); ctx.lineTo(s.x, s.y + sp);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(147,197,253,0.3)";
          ctx.beginPath(); ctx.arc(s.x, s.y, 3.4 * z, 0, Math.PI * 2); ctx.fill();
        }
      });
      if (this.constCelebrate > 0) {
        for (const e of eyes) this.drawGlowStar(e.x, e.y, 8 * z, "#fef9c3", "rgba(253,224,71,0.45)");
      }
    }
    for (const e of this.entities) {
      if (e.kind === "bubble") {
        const rg = ctx.createRadialGradient(e.x - e.r * 0.3, e.y - e.r * 0.3, 1, e.x, e.y, e.r);
        rg.addColorStop(0, "rgba(255,255,255,0.55)"); rg.addColorStop(1, "rgba(56,189,248,0.12)");
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === "firefly" || e.kind === "nebula") {
        const pulse = 0.5 + 0.5 * Math.sin(e.phase * 2);
        const r = e.r * (e.kind === "nebula" ? 1 : 0.8 + pulse * 0.5);
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * (e.kind === "nebula" ? 1 : 4));
        rg.addColorStop(0, `hsla(${e.hue}, 80%, 65%, ${e.kind === "nebula" ? 0.4 : 0.55 * pulse})`);
        rg.addColorStop(1, `hsla(${e.hue}, 80%, 50%, 0)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(e.x, e.y, r * (e.kind === "nebula" ? 1 : 4), 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === "fish") {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle ?? 0);
        ctx.fillStyle = `hsl(${e.hue} 75% 55%)`;
        ctx.beginPath(); ctx.ellipse(0, 0, e.r, e.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (e.kind === "treat") {
        const s = e.scale ?? 1;
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(s, s);
        ctx.fillStyle = "#fbbf24";
        this.starPath(0, 0, e.r);
        ctx.fill(); ctx.restore();
      } else if (e.kind === "shootstar") {
        const sp = Math.max(1, Math.hypot(e.vx, e.vy));
        const tx = -e.vx / sp; const ty = -e.vy / sp;
        const trail = ctx.createLinearGradient(e.x, e.y, e.x + tx * e.r * 9, e.y + ty * e.r * 9);
        trail.addColorStop(0, "rgba(253,224,71,0.5)"); trail.addColorStop(1, "rgba(253,224,71,0)");
        ctx.strokeStyle = trail; ctx.lineWidth = e.r * 0.9; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + tx * e.r * 9, e.y + ty * e.r * 9); ctx.stroke();
        const tw = 1 + Math.sin(e.phase) * 0.15;
        this.drawGlowStar(e.x, e.y, e.r * tw, "#fefce8", "rgba(253,224,71,0.45)");
      } else if (e.kind === "ringmoon") {
        const pulse = 0.75 + 0.25 * Math.sin(e.phase);
        this.drawGlowStar(e.x, e.y, e.r * pulse, `hsl(${e.hue} 90% 88%)`, `hsla(${e.hue}, 85%, 70%, 0.4)`);
      } else if (e.kind === "auroraorb") {
        const pulse = 0.8 + 0.2 * Math.sin(e.phase * 2);
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 3 * pulse);
        rg.addColorStop(0, `hsla(${e.hue}, 80%, 70%, 0.6)`);
        rg.addColorStop(1, `hsla(${e.hue}, 80%, 60%, 0)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 3 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsl(${e.hue} 85% 88%)`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.45, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === "moth") {
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
        const flap = 0.5 + Math.abs(Math.sin(e.phase)) * 0.5;
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 2.4);
        rg.addColorStop(0, `hsla(${e.hue}, 70%, 75%, 0.35)`); rg.addColorStop(1, `hsla(${e.hue}, 70%, 65%, 0)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, e.r * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${e.hue}, 65%, 82%, 0.9)`;
        ctx.beginPath();
        ctx.ellipse(-e.r * 0.55 * flap, 0, e.r * 0.8 * flap, e.r * 0.5, -0.3, 0, Math.PI * 2);
        ctx.ellipse(e.r * 0.55 * flap, 0, e.r * 0.8 * flap, e.r * 0.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef3c7";
        ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.22, e.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (e.kind === "tumble") {
        this.drawTumbleweed(e);
      } else if (e.kind === "kibble" || e.kind === "nip") {
        this.drawGoodie(e);
      }
    }
    if (this.main && this.game === "ribbon") {
      const m = this.main;
      const pts = [{ x: m.x, y: m.y }, ...this.ribbon];
      // Two passes: wide soft glow underneath, bright silky core on top
      for (const [wMul, alpha] of [[2.6, 0.14], [1, 0.85]] as const) {
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1]!; const p1 = pts[i]!;
          const f = i / pts.length;
          const hue = 265 + f * 70; // violet at the head -> pink at the tassel
          ctx.strokeStyle = `hsla(${hue}, 85%, ${62 + f * 12}%, ${alpha * (1 - f * 0.3)})`;
          ctx.lineWidth = Math.max(1.5, (10 - f * 7) * this.zm()) * wMul;
          ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        }
      }
      const tip = this.ribbon[this.ribbon.length - 1]!;
      const pulse = 1 + Math.sin(m.phase) * 0.15;
      this.drawGlowStar(tip.x, tip.y, 10 * this.zm() * pulse, "#fdf4ff", "rgba(240,171,252,0.4)");
    }

    if (this.game === "walle") {
      const c = this.entities[0];
      if (c) {
        // Visible echo of each chirp — ripple rings for sighted playmates
        const since = c.life ?? 99;
        for (let k = 0; k < 3; k++) {
          const tt = since - k * 0.14;
          if (tt >= 0 && tt < 1.1) {
            ctx.globalAlpha = (1 - tt / 1.1) * 0.34;
            ctx.strokeStyle = "#bef264";
            ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 1.4 + tt * 150, 0, Math.PI * 2); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        this.drawCritter(c);
      }
      this.drawWalleCat(c ?? null);
    }

    if (this.main && this.game === "phoenix") this.drawPhoenixCat(this.main);
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.settings.softGlow) {
      if (!this.vignette) {
        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.22)");
        this.vignette = vg;
      }
      ctx.fillStyle = this.vignette; ctx.fillRect(0, 0, w, h);
    }
  }
}

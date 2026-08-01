import type { ControlMode, GameId, GameSettings } from "./types";
import { sizeMultiplier, speedMultiplier } from "./types";
import { playPop, playSoftChime, playTap } from "./audio";

export interface PointerState { x: number; y: number; down: boolean; active: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }
interface Entity {
  x: number; y: number; vx: number; vy: number; r: number; phase: number; hue: number; kind: string;
  life?: number; maxLife?: number; angle?: number; state?: string; timer?: number; scale?: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

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
  private onScore?: (n: number) => void;

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
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.floor(rect.width));
    this.h = Math.max(1, Math.floor(rect.height));
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.main) this.reset();
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
    this.entities = []; this.particles = []; this.score = 0; this.time = 0;
    this.wanderT = 0; this.wanderX = this.w * 0.5; this.wanderY = this.h * 0.5;
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

  private burst(x: number, y: number, color: string, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rand(-0.2, 0.2); const sp = rand(40, 140);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.35, 0.7), max: 0.7, color, size: rand(2, 5) * this.zm() });
    }
  }

  private maybeScore(x: number, y: number, color: string, cd = 220) {
    const now = performance.now(); if (now - this.lastPop < cd) return;
    this.lastPop = now; this.burst(x, y, color); playTap(); this.score += 1; this.onScore?.(this.score);
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
      if (Math.random() < 0.015 * sm) { m.vx += rand(-200, 200) * sm; m.vy += rand(-200, 200) * sm; }
      m.x = clamp(m.x + m.vx * dt, m.r, this.w - m.r);
      m.y = clamp(m.y + m.vy * dt, m.r, this.h - m.r);
      m.phase += dt * 6; m.angle = Math.atan2(m.vy, m.vx);
      if (this.pointer.down && dist(this.pointer.x, this.pointer.y, m.x, m.y) < m.r * 2) {
        const cols: Record<string, string> = { laser: "#fb7185", orion: "#a5b4fc", comet: "#67e8f9", eclipse: "#fde68a", butterfly: "#c4b5fd" };
        this.maybeScore(m.x, m.y, cols[this.game] || "#fb7185");
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
    if (this.main && this.game === "yarn") {
      const m = this.main; m.vy += 180 * dt;
      if (this.pointer.down) {
        const d = dist(this.pointer.x, this.pointer.y, m.x, m.y);
        if (d < m.r * 2.5) { m.vx += (this.pointer.x - m.x) * 8 * dt * sm; m.vy += (this.pointer.y - m.y) * 8 * dt * sm - 80 * dt; if (d < m.r * 1.2) this.maybeScore(m.x, m.y, "#fb7185", 180); }
      }
      m.vx *= 0.992; m.vy *= 0.992; m.x += m.vx * dt; m.y += m.vy * dt;
      const floor = this.h - m.r - 8;
      if (m.y > floor) { m.y = floor; m.vy *= -0.62; m.vx *= 0.92; }
      if (m.x < m.r || m.x > this.w - m.r) m.vx *= -0.7;
      m.x = clamp(m.x, m.r, this.w - m.r);
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
  }

  private draw() {
    const ctx = this.ctx; const w = this.w; const h = this.h;
    const bgs: Record<string, [string, string]> = {
      laser: ["#0b1020", "#151a2e"], butterfly: ["#1a1430", "#2a1f45"], mouse: ["#1c1814", "#2a241c"],
      bubbles: ["#0c1a28", "#123048"], yarn: ["#1a1420", "#261828"], fireflies: ["#0a1210", "#122018"],
      fish: ["#0a2030", "#0f3550"], treats: ["#141820", "#1c2430"],
      orion: ["#050814", "#0c1228"], comet: ["#04060f", "#0a1424"], eclipse: ["#06050c", "#12101c"], nebula: ["#0a0614", "#1a0f28"],
    };
    const bg = bgs[this.game] || bgs.laser!;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    if (this.main && ["laser", "orion", "comet"].includes(this.game)) {
      const m = this.main; const pulse = 1 + Math.sin(m.phase) * 0.08; const r = m.r * pulse;
      const cols: Record<string, [string, string]> = { laser: ["rgba(251,113,133,0.3)", "#fff5f5"], orion: ["rgba(165,180,252,0.35)", "#eef2ff"], comet: ["rgba(103,232,249,0.35)", "#ecfeff"] };
      const c = cols[this.game] || cols.laser!;
      let rg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 3); rg.addColorStop(0, c[0]); rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(m.x, m.y, r * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(m.x, m.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
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
        ctx.fillStyle = "#fbbf24"; ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2; const a2 = a + Math.PI / 5;
          if (i === 0) ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r); else ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r);
          ctx.lineTo(Math.cos(a2) * e.r * 0.45, Math.sin(a2) * e.r * 0.45);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.settings.softGlow) {
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    }
  }
}

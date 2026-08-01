import type { ControlMode, GameId, GameSettings } from "./types";
import { sizeMultiplier, speedMultiplier } from "./types";
import { playPop, playSoftChime, playTap } from "./audio";

export interface PointerState {
  x: number;
  y: number;
  down: boolean;
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  hue: number;
  kind: string;
  life?: number;
  maxLife?: number;
  angle?: number;
  spin?: number;
  state?: string;
  timer?: number;
  targetX?: number;
  targetY?: number;
  scale?: number;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function softBg(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bot: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export class KittenGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: GameId = "laser";
  private settings: GameSettings;
  private pointer: PointerState = { x: 0, y: 0, down: false, active: false };
  private particles: Particle[] = [];
  private entities: Entity[] = [];
  private main: Entity | null = null;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private time = 0;
  private wanderT = 0;
  private wanderX = 0;
  private wanderY = 0;
  private score = 0;
  private lastPop = 0;
  private running = false;
  private raf = 0;
  private lastTs = 0;
  private onScore?: (n: number) => void;

  constructor(canvas: HTMLCanvasElement, settings: GameSettings, onScore?: (n: number) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.settings = settings;
    this.onScore = onScore;
    this.resize();
  }

  setSettings(s: GameSettings) {
    this.settings = s;
  }

  setGame(id: GameId) {
    this.game = id;
    this.reset();
  }

  setPointer(p: Partial<PointerState>) {
    Object.assign(this.pointer, p);
  }

  getScore() {
    return this.score;
  }

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
    this.running = true;
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      if (!this.running) return;
      let dt = (ts - this.lastTs) / 1000;
      this.lastTs = ts;
      dt = Math.min(dt, 0.1);
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
  }

  private sm() {
    return speedMultiplier(this.settings.speed);
  }

  private zm() {
    return sizeMultiplier(this.settings.size);
  }

  private control(): ControlMode {
    return this.settings.control;
  }

  reset() {
    this.entities = [];
    this.particles = [];
    this.score = 0;
    this.time = 0;
    this.wanderT = 0;
    this.wanderX = this.w * 0.5;
    this.wanderY = this.h * 0.5;
    this.onScore?.(0);
    const z = this.zm();

    switch (this.game) {
      case "laser":
        this.main = {
          x: this.w * 0.5,
          y: this.h * 0.5,
          vx: 0,
          vy: 0,
          r: 14 * z,
          phase: 0,
          hue: 0,
          kind: "laser",
        };
        break;
      case "butterfly":
        this.main = {
          x: this.w * 0.4,
          y: this.h * 0.45,
          vx: 40,
          vy: 20,
          r: 22 * z,
          phase: 0,
          hue: 280,
          kind: "butterfly",
          angle: 0,
        };
        break;
      case "mouse":
        this.main = {
          x: this.w * 0.5,
          y: this.h * 0.6,
          vx: 0,
          vy: 0,
          r: 20 * z,
          phase: 0,
          hue: 35,
          kind: "mouse",
          state: "idle",
          timer: 1.2,
          angle: 0,
        };
        break;
      case "bubbles":
        this.main = null;
        for (let i = 0; i < 10; i++) this.spawnBubble(true);
        break;
      case "yarn":
        this.main = {
          x: this.w * 0.5,
          y: this.h * 0.4,
          vx: rand(-80, 80),
          vy: rand(-40, 40),
          r: 28 * z,
          phase: 0,
          hue: 350,
          kind: "yarn",
          spin: 0,
          angle: 0,
        };
        break;
      case "fireflies":
        this.main = null;
        for (let i = 0; i < 14; i++) {
          this.entities.push({
            x: rand(40, this.w - 40),
            y: rand(40, this.h - 40),
            vx: rand(-20, 20),
            vy: rand(-20, 20),
            r: rand(4, 9) * z,
            phase: rand(0, Math.PI * 2),
            hue: rand(70, 140),
            kind: "firefly",
          });
        }
        break;
      case "fish":
        this.main = null;
        for (let i = 0; i < 6; i++) {
          this.entities.push({
            x: rand(50, this.w - 50),
            y: rand(50, this.h - 50),
            vx: rand(-50, 50),
            vy: rand(-30, 30),
            r: rand(16, 28) * z,
            phase: rand(0, Math.PI * 2),
            hue: [200, 20, 160, 45, 300, 180][i % 6],
            kind: "fish",
            angle: 0,
          });
        }
        break;
      case "treats":
        this.main = null;
        this.spawnTreat();
        break;
    }
  }

  private spawnBubble(anywhere = false) {
    const z = this.zm();
    this.entities.push({
      x: anywhere ? rand(30, this.w - 30) : rand(40, this.w - 40),
      y: anywhere ? rand(this.h * 0.4, this.h + 20) : this.h + rand(10, 80),
      vx: rand(-25, 25),
      vy: rand(-55, -25) * this.sm(),
      r: rand(16, 36) * z,
      phase: rand(0, Math.PI * 2),
      hue: rand(180, 220),
      kind: "bubble",
      life: 1,
      maxLife: 1,
    });
  }

  private spawnTreat() {
    const z = this.zm();
    this.entities.push({
      x: rand(60, this.w - 60),
      y: rand(60, this.h - 60),
      vx: 0,
      vy: 0,
      r: 26 * z,
      phase: 0,
      hue: rand(20, 50),
      kind: "treat",
      life: 0,
      maxLife: rand(2.8, 4.5),
      scale: 0,
      state: "in",
    });
  }

  private burst(x: number, y: number, color: string, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rand(-0.2, 0.2);
      const sp = rand(40, 140);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.35, 0.7),
        max: 0.7,
        color,
        size: rand(2, 5) * this.zm(),
      });
    }
  }

  private updateWander(dt: number) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = rand(0.6, 2.2) / this.sm();
      const margin = 50;
      this.wanderX = rand(margin, this.w - margin);
      this.wanderY = rand(margin, this.h - margin);
    }
  }

  private desiredTarget(): { x: number; y: number } {
    const mode = this.control();
    const p = this.pointer;
    if (mode === "follow" && p.active) return { x: p.x, y: p.y };
    if (mode === "mixed" && p.down) return { x: p.x, y: p.y };
    if (mode === "mixed" && p.active && Math.random() < 0.002) {
      /* occasional glance toward pointer while roaming */
    }
    return { x: this.wanderX, y: this.wanderY };
  }

  private update(dt: number) {
    this.time += dt;
    this.updateWander(dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    switch (this.game) {
      case "laser":
        this.updateLaser(dt);
        break;
      case "butterfly":
        this.updateButterfly(dt);
        break;
      case "mouse":
        this.updateMouse(dt);
        break;
      case "bubbles":
        this.updateBubbles(dt);
        break;
      case "yarn":
        this.updateYarn(dt);
        break;
      case "fireflies":
        this.updateFireflies(dt);
        break;
      case "fish":
        this.updateFish(dt);
        break;
      case "treats":
        this.updateTreats(dt);
        break;
    }
  }

  private updateLaser(dt: number) {
    const m = this.main!;
    const t = this.desiredTarget();
    const sm = this.sm();
    // Smooth chase with occasional darts
    const k = 3.2 * sm;
    m.vx += (t.x - m.x) * k * dt;
    m.vy += (t.y - m.y) * k * dt;
    m.vx *= 0.9;
    m.vy *= 0.9;
    if (Math.random() < 0.015 * sm) {
      m.vx += rand(-280, 280) * sm;
      m.vy += rand(-280, 280) * sm;
    }
    m.x = clamp(m.x + m.vx * dt, m.r, this.w - m.r);
    m.y = clamp(m.y + m.vy * dt, m.r, this.h - m.r);
    m.phase += dt * 6;
    if (this.pointer.down && dist(this.pointer.x, this.pointer.y, m.x, m.y) < m.r * 2.2) {
      this.maybeScore(m.x, m.y, "#fb7185");
    }
  }

  private updateButterfly(dt: number) {
    const m = this.main!;
    const t = this.desiredTarget();
    const sm = this.sm();
    const flutter = Math.sin(this.time * 10) * 40 * sm;
    const flutterY = Math.cos(this.time * 7.5) * 30 * sm;
    const tx = t.x + flutter;
    const ty = t.y + flutterY;
    m.vx += (tx - m.x) * 1.8 * sm * dt;
    m.vy += (ty - m.y) * 1.8 * sm * dt;
    m.vx *= 0.94;
    m.vy *= 0.94;
    m.x = clamp(m.x + m.vx * dt, 30, this.w - 30);
    m.y = clamp(m.y + m.vy * dt, 30, this.h - 30);
    m.angle = Math.atan2(m.vy, m.vx);
    m.phase += dt * 14;
    if (this.pointer.down && dist(this.pointer.x, this.pointer.y, m.x, m.y) < m.r * 1.8) {
      this.maybeScore(m.x, m.y, "#c4b5fd");
      m.vx += rand(-120, 120);
      m.vy += rand(-120, 120);
    }
  }

  private updateMouse(dt: number) {
    const m = this.main!;
    const sm = this.sm();
    m.timer = (m.timer ?? 0) - dt;
    if (m.state === "idle") {
      m.vx *= 0.85;
      m.vy *= 0.85;
      if (m.timer <= 0) {
        m.state = "run";
        m.timer = rand(0.5, 1.1) / sm;
        const t = this.desiredTarget();
        // run AWAY from target-ish for natural prey feel, or toward wander
        const away = Math.random() < 0.45 && this.pointer.active;
        if (away) {
          const a = Math.atan2(m.y - this.pointer.y, m.x - this.pointer.x) + rand(-0.4, 0.4);
          const sp = rand(220, 380) * sm;
          m.vx = Math.cos(a) * sp;
          m.vy = Math.sin(a) * sp;
        } else {
          const a = Math.atan2(t.y - m.y, t.x - m.x) + rand(-0.5, 0.5);
          const sp = rand(180, 320) * sm;
          m.vx = Math.cos(a) * sp;
          m.vy = Math.sin(a) * sp;
        }
      }
    } else {
      if (m.timer <= 0) {
        m.state = "idle";
        m.timer = rand(0.7, 1.8) / sm;
        m.vx *= 0.2;
        m.vy *= 0.2;
      }
    }
    m.x = clamp(m.x + m.vx * dt, m.r, this.w - m.r);
    m.y = clamp(m.y + m.vy * dt, m.r, this.h - m.r);
    if (m.x <= m.r || m.x >= this.w - m.r) m.vx *= -1;
    if (m.y <= m.r || m.y >= this.h - m.r) m.vy *= -1;
    m.angle = Math.atan2(m.vy, m.vx);
    if (this.pointer.down && dist(this.pointer.x, this.pointer.y, m.x, m.y) < m.r * 1.6) {
      this.maybeScore(m.x, m.y, "#fbbf24");
      m.state = "run";
      m.timer = 0.8 / sm;
      const a = Math.atan2(m.y - this.pointer.y, m.x - this.pointer.x);
      m.vx = Math.cos(a) * 360 * sm;
      m.vy = Math.sin(a) * 360 * sm;
    }
  }

  private updateBubbles(dt: number) {
    while (this.entities.filter((e) => e.kind === "bubble").length < 10) this.spawnBubble();
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i]!;
      if (e.kind !== "bubble") continue;
      e.phase += dt * 3;
      e.x += Math.sin(e.phase) * 18 * dt + e.vx * dt;
      e.y += e.vy * dt;
      if (e.y < -60) {
        this.entities.splice(i, 1);
        continue;
      }
      if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 1.15) {
        this.burst(e.x, e.y, "rgba(125,211,252,0.9)", 14);
        playPop();
        this.score += 1;
        this.onScore?.(this.score);
        this.entities.splice(i, 1);
      }
    }
  }

  private updateYarn(dt: number) {
    const m = this.main!;
    const sm = this.sm();
    const g = 520;
    m.vy += g * dt * 0.35;
    if (this.pointer.down) {
      const d = dist(this.pointer.x, this.pointer.y, m.x, m.y);
      if (d < m.r * 2.5) {
        m.vx += (this.pointer.x - m.x) * 8 * dt * sm;
        m.vy += (this.pointer.y - m.y) * 8 * dt * sm - 80 * dt;
        if (d < m.r * 1.2) this.maybeScore(m.x, m.y, "#fb7185", 180);
      }
    } else if (this.control() !== "follow") {
      // gentle auto nudge
      const t = this.desiredTarget();
      m.vx += (t.x - m.x) * 0.4 * dt;
    }
    m.vx *= 0.992;
    m.vy *= 0.992;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    const floor = this.h - m.r - 8;
    if (m.y > floor) {
      m.y = floor;
      m.vy *= -0.62;
      m.vx *= 0.92;
      if (Math.abs(m.vy) < 30) m.vy = 0;
    }
    if (m.x < m.r) {
      m.x = m.r;
      m.vx *= -0.7;
    }
    if (m.x > this.w - m.r) {
      m.x = this.w - m.r;
      m.vx *= -0.7;
    }
    m.angle = (m.angle ?? 0) + m.vx * dt * 0.04;
  }

  private updateFireflies(dt: number) {
    const sm = this.sm();
    for (const e of this.entities) {
      e.phase += dt * rand(1.5, 3);
      const t = this.desiredTarget();
      if (this.control() === "follow" || (this.control() === "mixed" && this.pointer.down)) {
        e.vx += (t.x - e.x) * 0.35 * sm * dt;
        e.vy += (t.y - e.y) * 0.35 * sm * dt;
      }
      e.vx += Math.sin(this.time * 0.7 + e.phase) * 12 * dt;
      e.vy += Math.cos(this.time * 0.9 + e.phase) * 12 * dt;
      e.vx *= 0.98;
      e.vy *= 0.98;
      e.x = clamp(e.x + e.vx * dt, 10, this.w - 10);
      e.y = clamp(e.y + e.vy * dt, 10, this.h - 10);
      if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 3) {
        this.maybeScore(e.x, e.y, "#6ee7b7", 400);
        e.vx += rand(-40, 40);
        e.vy += rand(-40, 40);
      }
    }
  }

  private updateFish(dt: number) {
    const sm = this.sm();
    for (const e of this.entities) {
      e.phase += dt * 4;
      const t = this.desiredTarget();
      const attract = this.control() === "follow" || (this.control() === "mixed" && this.pointer.down);
      if (attract && Math.random() < 0.4) {
        e.vx += (t.x - e.x) * 0.9 * sm * dt;
        e.vy += (t.y - e.y) * 0.9 * sm * dt;
      } else {
        e.vx += Math.sin(this.time + e.phase) * 30 * dt * sm;
        e.vy += Math.cos(this.time * 0.8 + e.phase) * 20 * dt * sm;
      }
      e.vx *= 0.99;
      e.vy *= 0.99;
      const maxSp = 140 * sm;
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > maxSp) {
        e.vx = (e.vx / sp) * maxSp;
        e.vy = (e.vy / sp) * maxSp;
      }
      e.x = clamp(e.x + e.vx * dt, e.r, this.w - e.r);
      e.y = clamp(e.y + e.vy * dt, e.r, this.h - e.r);
      if (e.x <= e.r || e.x >= this.w - e.r) e.vx *= -1;
      if (e.y <= e.r || e.y >= this.h - e.r) e.vy *= -1;
      e.angle = Math.atan2(e.vy, e.vx);
      if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 1.4) {
        this.maybeScore(e.x, e.y, `hsl(${e.hue} 80% 65%)`, 250);
      }
    }
  }

  private updateTreats(dt: number) {
    if (this.entities.length === 0) this.spawnTreat();
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i]!;
      e.life = (e.life ?? 0) + dt;
      const max = e.maxLife ?? 3;
      if (e.state === "in") {
        e.scale = clamp((e.life ?? 0) / 0.35, 0, 1);
        if ((e.life ?? 0) > 0.35) e.state = "idle";
      } else if (e.state === "out") {
        e.scale = clamp(1 - ((e.life ?? 0) - max) / 0.4, 0, 1);
        if ((e.scale ?? 0) <= 0) {
          this.entities.splice(i, 1);
          continue;
        }
      } else if ((e.life ?? 0) > max) {
        e.state = "out";
      }
      e.phase += dt * 3;
      if (this.pointer.down && dist(this.pointer.x, this.pointer.y, e.x, e.y) < e.r * 1.5) {
        this.burst(e.x, e.y, "#fcd34d", 16);
        playSoftChime();
        this.score += 1;
        this.onScore?.(this.score);
        this.entities.splice(i, 1);
      }
    }
  }

  private maybeScore(x: number, y: number, color: string, cooldownMs = 220) {
    const now = performance.now();
    if (now - this.lastPop < cooldownMs) return;
    this.lastPop = now;
    this.burst(x, y, color, 10);
    playTap();
    this.score += 1;
    this.onScore?.(this.score);
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    switch (this.game) {
      case "laser":
        softBg(ctx, w, h, "#0b1020", "#151a2e");
        this.drawVignette();
        this.drawLaser();
        break;
      case "butterfly":
        softBg(ctx, w, h, "#1a1430", "#2a1f45");
        this.drawSoftOrbs();
        this.drawButterfly();
        break;
      case "mouse":
        softBg(ctx, w, h, "#1c1814", "#2a241c");
        this.drawFloorHint();
        this.drawMouse();
        break;
      case "bubbles":
        softBg(ctx, w, h, "#0c1a28", "#123048");
        this.drawBubbles();
        break;
      case "yarn":
        softBg(ctx, w, h, "#1a1420", "#261828");
        this.drawFloorHint();
        this.drawYarn();
        break;
      case "fireflies":
        softBg(ctx, w, h, "#0a1210", "#122018");
        this.drawFireflies();
        break;
      case "fish":
        softBg(ctx, w, h, "#0a2030", "#0f3550");
        this.drawWaterShimmer();
        this.drawFish();
        break;
      case "treats":
        softBg(ctx, w, h, "#141820", "#1c2430");
        this.drawTreats();
        break;
    }

    this.drawParticles();
    if (this.settings.softGlow) this.drawVignette(0.22);
  }

  private drawVignette(strength = 0.35) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(
      this.w / 2,
      this.h / 2,
      Math.min(this.w, this.h) * 0.25,
      this.w / 2,
      this.h / 2,
      Math.max(this.w, this.h) * 0.72,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  private drawSoftOrbs() {
    const ctx = this.ctx;
    for (let i = 0; i < 5; i++) {
      const x = ((Math.sin(this.time * 0.15 + i) + 1) / 2) * this.w;
      const y = ((Math.cos(this.time * 0.12 + i * 1.3) + 1) / 2) * this.h;
      const r = 40 + i * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(196,181,253,0.08)");
      g.addColorStop(1, "rgba(196,181,253,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFloorHint() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, this.h * 0.78, this.w, this.h * 0.22);
  }

  private drawWaterShimmer() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 8; i++) {
      const y = ((this.time * 20 + i * 40) % (this.h + 40)) - 20;
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(0, y, this.w, 2);
    }
    ctx.restore();
  }

  private drawLaser() {
    const m = this.main!;
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(m.phase) * 0.08;
    const r = m.r * pulse;

    // soft trail
    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 3.2, 0, Math.PI * 2);
    const g1 = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 3.2);
    g1.addColorStop(0, "rgba(251,113,133,0.28)");
    g1.addColorStop(1, "rgba(251,113,133,0)");
    ctx.fillStyle = g1;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 1.5, 0, Math.PI * 2);
    const g2 = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 1.5);
    g2.addColorStop(0, "rgba(254,202,202,0.95)");
    g2.addColorStop(0.45, "rgba(251,113,133,0.9)");
    g2.addColorStop(1, "rgba(251,113,133,0)");
    ctx.fillStyle = g2;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = "#fff5f5";
    ctx.fill();
  }

  private drawButterfly() {
    const m = this.main!;
    const ctx = this.ctx;
    const flap = 0.55 + Math.sin(m.phase) * 0.45;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle ?? 0);

    // wings
    ctx.fillStyle = "rgba(196,181,253,0.85)";
    ctx.beginPath();
    ctx.ellipse(-8, -10, 16 * flap, 12, -0.4, 0, Math.PI * 2);
    ctx.ellipse(-8, 10, 16 * flap, 12, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(251,113,133,0.55)";
    ctx.beginPath();
    ctx.ellipse(6, -8, 12 * flap, 9, 0.3, 0, Math.PI * 2);
    ctx.ellipse(6, 8, 12 * flap, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // glow
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 2.5);
    g.addColorStop(0, "rgba(196,181,253,0.2)");
    g.addColorStop(1, "rgba(196,181,253,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMouse() {
    const m = this.main!;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle ?? 0);

    // tail
    ctx.strokeStyle = "rgba(251,191,36,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-m.r * 0.6, 0);
    ctx.quadraticCurveTo(-m.r * 1.6, Math.sin(this.time * 8) * 8, -m.r * 2.1, Math.sin(this.time * 6) * 10);
    ctx.stroke();

    // body
    ctx.fillStyle = "#e7e5e4";
    ctx.beginPath();
    ctx.ellipse(0, 0, m.r * 1.1, m.r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fafaf9";
    ctx.beginPath();
    ctx.ellipse(m.r * 0.55, -m.r * 0.15, m.r * 0.45, m.r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // ear
    ctx.fillStyle = "#d6d3d1";
    ctx.beginPath();
    ctx.arc(m.r * 0.35, -m.r * 0.55, m.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fda4af";
    ctx.beginPath();
    ctx.arc(m.r * 0.35, -m.r * 0.55, m.r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    // eye
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    ctx.arc(m.r * 0.75, -m.r * 0.2, m.r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (m.state === "idle") {
      // soft attention ring
      ctx.strokeStyle = "rgba(251,191,36,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 1.6 + Math.sin(this.time * 3) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawBubbles() {
    const ctx = this.ctx;
    for (const e of this.entities) {
      if (e.kind !== "bubble") continue;
      const g = ctx.createRadialGradient(e.x - e.r * 0.3, e.y - e.r * 0.3, 1, e.x, e.y, e.r);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.4, "rgba(125,211,252,0.28)");
      g.addColorStop(1, "rgba(56,189,248,0.12)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(186,230,253,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(e.x - e.r * 0.3, e.y - e.r * 0.35, e.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawYarn() {
    const m = this.main!;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle ?? 0);

    const g = ctx.createRadialGradient(-m.r * 0.3, -m.r * 0.3, 2, 0, 0, m.r);
    g.addColorStop(0, "#fda4af");
    g.addColorStop(1, "#e11d48");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, m.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, m.r * 0.85, m.r * (0.25 + i * 0.08), i * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // soft shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(m.x, this.h - 10, m.r * 0.9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFireflies() {
    const ctx = this.ctx;
    for (const e of this.entities) {
      const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(e.phase * 2));
      const r = e.r * (0.8 + pulse * 0.5);
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 4);
      g.addColorStop(0, `hsla(${e.hue}, 85%, 65%, ${0.55 * pulse})`);
      g.addColorStop(0.4, `hsla(${e.hue}, 85%, 55%, ${0.18 * pulse})`);
      g.addColorStop(1, `hsla(${e.hue}, 85%, 50%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${e.hue}, 90%, 80%, ${0.9 * pulse})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFish() {
    const ctx = this.ctx;
    for (const e of this.entities) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle ?? 0);
      const body = ctx.createLinearGradient(-e.r, 0, e.r, 0);
      body.addColorStop(0, `hsl(${e.hue} 70% 45%)`);
      body.addColorStop(1, `hsl(${e.hue} 80% 62%)`);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r, e.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // tail
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.85, 0);
      ctx.lineTo(-e.r * 1.45, -e.r * 0.45 + Math.sin(e.phase) * 3);
      ctx.lineTo(-e.r * 1.45, e.r * 0.45 + Math.cos(e.phase) * 3);
      ctx.closePath();
      ctx.fill();
      // eye
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(e.r * 0.45, -e.r * 0.1, e.r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(e.r * 0.48, -e.r * 0.14, e.r * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawTreats() {
    const ctx = this.ctx;
    for (const e of this.entities) {
      const s = e.scale ?? 1;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(s, s);
      ctx.rotate(Math.sin(e.phase) * 0.15);

      // star-like treat
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const a2 = a + Math.PI / 5;
        const r1 = e.r;
        const r2 = e.r * 0.45;
        if (i === 0) ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        else ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.arc(-e.r * 0.15, -e.r * 0.15, e.r * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // glow
      ctx.globalCompositeOperation = "screen";
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, e.r * 2);
      g.addColorStop(0, "rgba(252,211,77,0.35)");
      g.addColorStop(1, "rgba(252,211,77,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

import { InputManager } from "./input";
import { clamp, lerp } from "./math";
import { renderFrame, type FrameStats } from "./render";
import { SquishyBlob } from "./simulation";

class RNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >>> 17;
    this.seed ^= this.seed << 5;
    return ((this.seed >>> 0) % 0x100000000) / 0x100000000;
  }
}

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input: InputManager;
  private readonly rng: RNG;

  private blob: SquishyBlob;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private readonly fixedStep = 1 / 120;

  private score = 0;
  private squishes = 0;
  private combo = 0;
  private comboTime = 0;
  private comboWindow = 0.95;
  private flash = 0;
  private highScore = 0;
  private timeSinceSpawn = 0;
  private roundSquisher = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas context is not available.");
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.rng = new RNG((Math.random() * 0xffffffff) >>> 0);
    this.input = new InputManager(canvas);
    this.blob = new SquishyBlob(0, 0, () => this.rng.next());
    this.resize();
    this.bindResize();
  }

  start(): void {
    this.last = performance.now();
    const tick = (now: number): void => {
      const rawDt = clamp((now - this.last) / 1000, 0, 1 / 20);
      this.last = now;
      this.update(rawDt, now);
      this.render();
      this.raf = window.requestAnimationFrame(tick);
    };
    this.raf = window.requestAnimationFrame(tick);
  }

  stop(): void {
    window.cancelAnimationFrame(this.raf);
  }

  private update(dt: number, now: number): void {
    this.accumulator += dt;
    this.timeSinceSpawn += dt;
    if (this.comboTime > 0) {
      this.comboTime = Math.max(0, this.comboTime - dt);
      if (this.comboTime === 0) {
        this.combo = 0;
      }
    }
    this.flash = Math.max(0, this.flash - dt * 2.6);

    while (this.accumulator >= this.fixedStep) {
      const pointers: PointerSnapshot[] = [];
      for (const pointer of this.input.active.values()) {
        pointers.push(pointer);
      }
      const metrics = this.blob.step(this.fixedStep, pointers, this.width, this.height);
      for (const pointer of pointers) {
        pointer.peakCompression = Math.max(
          pointer.peakCompression,
          this.localCompression(pointer.x, pointer.y, metrics.compression)
        );
      }
      this.roundSquisher = Math.max(this.roundSquisher, metrics.compression);
      this.accumulator -= this.fixedStep;
    }

    for (const released of this.input.released) {
      if (released.peakCompression > 0.14 || this.roundSquisher > 0.16) {
        this.registerSquish(released.peakCompression > 0 ? released.peakCompression : this.roundSquisher);
      }
    }

    if (this.input.released.length > 0) {
      this.input.clearReleased();
      if (this.input.active.size === 0) {
        this.roundSquisher = 0;
      }
    }

    if (this.timeSinceSpawn > 18 && this.blob.compression < 0.03) {
      this.spawnBlob();
    }
  }

  private render(): void {
    const stats: FrameStats = {
      score: this.score,
      squishes: this.squishes,
      combo: this.combo,
      comboTime: this.comboTime,
      comboWindow: this.comboWindow,
      flash: this.flash,
      highScore: this.highScore
    };
    renderFrame(this.ctx, this.width, this.height, this.blob, stats);
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, Math.floor(window.innerWidth));
    this.height = Math.max(1, Math.floor(window.innerHeight));
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.blob) {
      this.blob.resetPosition(this.width * 0.5, this.height * 0.56);
    }
  }

  private bindResize(): void {
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => this.resize());
  }

  private spawnBlob(): void {
    this.blob.respawn(this.width * 0.5, this.height * 0.56, () => this.rng.next());
    this.timeSinceSpawn = 0;
    this.roundSquisher = 0;
  }

  private registerSquish(amount: number): void {
    const quality = clamp(amount, 0.1, 1);
    this.squishes += 1;
    this.combo = this.combo > 0 ? this.combo + 1 : 1;
    this.comboTime = this.comboWindow;
    const comboBonus = 1 + (this.combo - 1) * 0.35;
    const points = Math.round(100 * quality * comboBonus);
    this.score += points;
    this.highScore = Math.max(this.highScore, this.score);
    this.flash = Math.min(1, this.flash + 0.2 + quality * 0.15);
    this.timeSinceSpawn = 0;
    if (this.combo >= 4 && this.squishes % 3 === 0) {
      this.spawnBlob();
    }
  }

  private localCompression(x: number, y: number, globalCompression: number): number {
    const center = this.blob.points[0];
    const dx = x - center.x;
    const dy = y - center.y;
    const dist = Math.hypot(dx, dy);
    const radius = this.blob.baseRadius * 1.35;
    if (dist > radius) {
      return globalCompression * 0.25;
    }
    const falloff = 1 - dist / radius;
    return clamp(globalCompression * (0.5 + falloff * 0.8), 0, 1);
  }
}

type PointerSnapshot = {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  pressure: number;
  peakCompression: number;
};

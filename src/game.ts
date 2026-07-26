import { InputManager } from "./input";
import { clamp } from "./math";
import { renderFrame, type FrameStats } from "./render";
import { EVOLUTION_STAGES, pickGachaItem } from "./progression";
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

const STORAGE_KEY = "tapandsquish.collection.v1";

function readCollection(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function writeCollection(collection: Set<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...collection]));
  } catch {
    // Local storage can be unavailable in private contexts; the game still works without persistence.
  }
}

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input: InputManager;
  private readonly rng: RNG;

  private readonly pointerBuffer: PointerContact[] = [];
  private readonly collection = readCollection();

  private blob: SquishyBlob;
  private width = 0;
  private height = 0;
  private centerX = 0;
  private centerY = 0;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private readonly fixedStep = 1 / 120;

  private stageIndex = 0;
  private stageProgress = 0;
  private squishes = 0;
  private gachaTickets = 0;
  private pendingGachaOpen = false;
  private toastText = "Touch. Squish. Smile. Repeat.";
  private toastTime = 2.5;
  private flash = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas context is not available.");
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.rng = new RNG((Math.random() * 0xffffffff) >>> 0);
    this.input = new InputManager(canvas);
    this.blob = new SquishyBlob(0, 0, () => this.rng.next(), this.stageIndex);
    this.resize();
    this.bindResize();
  }

  start(): void {
    this.last = performance.now();
    const tick = (now: number): void => {
      const rawDt = clamp((now - this.last) / 1000, 0, 1 / 20);
      this.last = now;
      this.update(rawDt);
      this.render();
      this.raf = window.requestAnimationFrame(tick);
    };
    this.raf = window.requestAnimationFrame(tick);
  }

  stop(): void {
    window.cancelAnimationFrame(this.raf);
  }

  private update(dt: number): void {
    // Keep the fixed-step loop bounded after tab switching or a burst of input.
    this.accumulator = Math.min(this.accumulator + dt, this.fixedStep * 8);
    this.toastTime = Math.max(0, this.toastTime - dt);
    this.flash = Math.max(0, this.flash - dt * 2.4);

    if (this.input.pressed.length > 0) {
      for (const pressed of this.input.pressed) {
        this.showPressFeedback(this.pressImpulse(pressed));
      }
      this.input.clearPressed();
    }

    let stepCount = 0;
    while (this.accumulator >= this.fixedStep && stepCount < 8) {
      this.pointerBuffer.length = 0;
      for (const pointer of this.input.active.values()) {
        this.pointerBuffer.push(pointer);
      }

      const metrics = this.blob.step(this.fixedStep, this.pointerBuffer, this.width, this.height);
      for (let i = 0; i < this.pointerBuffer.length; i += 1) {
        const pointer = this.pointerBuffer[i];
        pointer.peakCompression = Math.max(
          pointer.peakCompression,
          this.localCompression(pointer.x, pointer.y, metrics.compression)
        );
      }
      this.accumulator -= this.fixedStep;
      stepCount += 1;
    }
    if (stepCount === 8) {
      this.accumulator = 0;
    }

    if (this.input.released.length > 0) {
      for (const released of this.input.released) {
        this.handleSquish(released.peakCompression);
      }
      this.input.clearReleased();
    }

    if (this.pendingGachaOpen && this.input.active.size === 0) {
      this.openGacha();
    }
  }

  private render(): void {
    const stats: FrameStats = {
      stageName: EVOLUTION_STAGES[this.stageIndex].name,
      stageProgress: this.stageProgress,
      squishes: this.squishes,
      gachaTickets: this.gachaTickets,
      collectionCount: this.collection.size,
      collectionTotal: 10,
      toastText: this.toastText,
      toastTime: this.toastTime,
      flash: this.flash
    };
    renderFrame(this.ctx, this.width, this.height, this.blob, stats);
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, Math.floor(window.innerWidth));
    this.height = Math.max(1, Math.floor(window.innerHeight));
    this.centerX = this.width * 0.5;
    this.centerY = this.height * 0.56;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.blob.resetPosition(this.centerX, this.centerY);
  }

  private bindResize(): void {
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => this.resize());
  }

  private handleSquish(amount: number): void {
    const quality = clamp(amount, 0.34, 1);
    this.squishes += 1;
    this.flash = Math.min(1, this.flash + 0.14 + quality * 0.16);

    const stageWeight = 0.28 + quality * 0.34;
    this.stageProgress = Math.min(1, this.stageProgress + stageWeight);
    if (this.stageProgress >= 0.88) {
      this.stageProgress = 1;
    }

    if (this.stageIndex < EVOLUTION_STAGES.length - 1 && this.stageProgress >= 1) {
      this.stageProgress -= 1;
      this.stageIndex += 1;
      this.toastText = `${EVOLUTION_STAGES[this.stageIndex].name}`;
      this.toastTime = 1.2;
      this.rebuildBlob();
      return;
    }

    if (this.stageIndex === EVOLUTION_STAGES.length - 1 && this.stageProgress >= 1) {
      this.stageProgress = 1;
      if (!this.pendingGachaOpen) {
        this.gachaTickets += 1;
        this.pendingGachaOpen = true;
        this.toastText = "Gacha ready";
        this.toastTime = 1.2;
      }
    } else {
      this.toastText = `${EVOLUTION_STAGES[this.stageIndex].name} ${Math.min(100, Math.round(this.stageProgress * 100))}%`;
      this.toastTime = 0.9;
    }
  }

  private showPressFeedback(amount: number): void {
    this.flash = Math.min(1, this.flash + 0.08 + amount * 0.08);
    this.toastText = "Squish!";
    this.toastTime = 0.45;
  }

  private openGacha(): void {
    if (this.gachaTickets <= 0 || !this.pendingGachaOpen) {
      return;
    }
    this.gachaTickets -= 1;
    this.pendingGachaOpen = false;

    const item = pickGachaItem(() => this.rng.next(), this.collection);
    const beforeSize = this.collection.size;
    this.collection.add(item.id);
    if (this.collection.size !== beforeSize) {
      writeCollection(this.collection);
    }

    this.toastText = this.collection.size === beforeSize ? item.name : `${item.name} unlocked`;
    this.toastTime = 1.5;
    this.flash = 1;

    this.stageIndex = 0;
    this.stageProgress = 0;
    this.rebuildBlob();
  }

  private rebuildBlob(): void {
    this.blob.respawn(this.centerX, this.centerY, () => this.rng.next(), this.stageIndex);
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
    return clamp(globalCompression * (0.45 + falloff * 0.85), 0, 1);
  }

  private pressImpulse(pointer: PointerContact): number {
    const center = this.blob.points[0];
    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;
    const dist = Math.hypot(dx, dy);
    const radius = this.blob.baseRadius * 1.45;
    const proximity = dist >= radius ? 0 : 1 - dist / radius;
    const pressure = clamp(pointer.pressure, 0.25, 1);
    return clamp(0.22 + proximity * 0.34 + pressure * 0.16, 0.18, 0.92);
  }
}

type PointerContact = {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  pressure: number;
  peakCompression: number;
};

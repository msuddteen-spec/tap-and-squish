import { SoftBody, type PointerState } from "./softbody";
import { renderSoftBody } from "./render";
import { clamp } from "./math";

export class Engine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  readonly body: SoftBody;
  private readonly pointer: PointerState = {
    active: false,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    pressure: 1
  };
  private raf = 0;
  private lastTime = 0;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context is not available.");
    }
    this.canvas = canvas;
    this.ctx = context;
    this.body = new SoftBody(0, 0);
    this.resize();
    this.bindEvents();
  }

  start(): void {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTime) / 1000;
      const dt = clamp(rawDt, 1 / 240, 1 / 30);
      this.lastTime = now;
      this.step(dt);
      this.render();
      this.raf = window.requestAnimationFrame(tick);
    };
    this.raf = window.requestAnimationFrame(tick);
  }

  stop(): void {
    window.cancelAnimationFrame(this.raf);
  }

  private step(dt: number): void {
    this.body.step(dt, this.pointer);
  }

  private render(): void {
    renderSoftBody({ ctx: this.ctx, width: this.width, height: this.height }, this.body);
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = Math.floor(window.innerWidth);
    this.height = Math.floor(window.innerHeight);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.body.moveTo(this.width * 0.5, this.height * 0.54);
  }

  private bindEvents(): void {
    window.addEventListener("resize", () => this.resize());
    const updatePointer = (event: PointerEvent): void => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = event.clientX - rect.left;
      this.pointer.y = event.clientY - rect.top;
    };

    this.canvas.addEventListener("pointerdown", (event) => {
      this.canvas.setPointerCapture(event.pointerId);
      updatePointer(event);
      this.pointer.active = true;
      this.pointer.prevX = this.pointer.x;
      this.pointer.prevY = this.pointer.y;
      this.pointer.pressure = 1;
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (this.pointer.active) {
        this.pointer.prevX = this.pointer.x;
        this.pointer.prevY = this.pointer.y;
      }
      updatePointer(event);
      if (this.pointer.active) {
        this.pointer.pressure = event.pressure > 0 ? event.pressure : 1;
      }
    });

    const release = (event: PointerEvent): void => {
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
      this.pointer.active = false;
      this.pointer.pressure = 0.6;
      this.pointer.prevX = this.pointer.x;
      this.pointer.prevY = this.pointer.y;
    };

    this.canvas.addEventListener("pointerup", release);
    this.canvas.addEventListener("pointercancel", release);
    this.canvas.addEventListener("lostpointercapture", release);
  }
}

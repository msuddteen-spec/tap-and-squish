import { areaToPressure, applyAreaConstraint, computeArea } from "./volume";
import { applyPropagation, applyPressure } from "./pressure";
import { applyForce, createParticle, integrate, setPosition, type Particle } from "./verlet";
import {
  buildAngles,
  clampNodeRadius,
  solveCenterCoupling,
  solveCenterSpring,
  solveDistance,
  solveRadialMemory,
  solveRing,
  solveShear
} from "./constraints";
import { centroid, distance, fromAngle } from "./math";

export interface PointerState {
  active: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  pressure: number;
}

export class SoftBody {
  readonly center: Particle;
  readonly inner: Particle[];
  readonly outer: Particle[];

  readonly restInnerRadius: number;
  readonly restOuterRadius: number;
  readonly restInnerArea: number;
  readonly restOuterArea: number;
  readonly innerAngles: number[];
  readonly outerAngles: number[];
  readonly restInnerRadii: number[];
  readonly restOuterRadii: number[];

  compression = 0;
  avgOuterRadius = 0;

  private readonly all: Particle[];
  private homeX: number;
  private homeY: number;

  constructor(x: number, y: number) {
    this.center = createParticle(x, y, 0.45);
    this.restInnerRadius = 54;
    this.restOuterRadius = 94;
    this.innerAngles = buildAngles(32);
    this.outerAngles = buildAngles(32);
    this.inner = this.innerAngles.map((angle, index) => {
      const wobble = 1 + Math.sin(angle * 3.2) * 0.03 + Math.cos(index * 1.7) * 0.02;
      const offset = fromAngle(angle, this.restInnerRadius * wobble);
      return createParticle(x + offset.x, y + offset.y, 0.7);
    });
    this.outer = this.outerAngles.map((angle, index) => {
      const wobble = 1 + Math.sin(angle * 4.1) * 0.02 + Math.cos(index * 1.3) * 0.015;
      const offset = fromAngle(angle, this.restOuterRadius * wobble);
      return createParticle(x + offset.x, y + offset.y, 0.55);
    });
    this.restInnerRadii = this.inner.map((node) => distance({ x, y }, node));
    this.restOuterRadii = this.outer.map((node) => distance({ x, y }, node));
    this.restInnerArea = Math.abs(computeArea(this.inner));
    this.restOuterArea = Math.abs(computeArea(this.outer));
    this.all = [this.center, ...this.inner, ...this.outer];
    this.homeX = x;
    this.homeY = y;
  }

  moveTo(x: number, y: number): void {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    for (const node of this.all) {
      node.x += dx;
      node.y += dy;
      node.px += dx;
      node.py += dy;
    }
    this.homeX += dx;
    this.homeY += dy;
  }

  step(dt: number, pointer: PointerState): void {
    const damping = 0.985;
    const gravity = 12;

    for (const node of this.all) {
      if (node !== this.center) {
        applyForce(node, 0, gravity);
      }
    }

    if (pointer.active) {
    this.applyPointer(pointer.x, pointer.y, pointer.prevX, pointer.prevY, pointer.pressure);
    }

    for (const node of this.all) {
      integrate(node, dt, damping);
    }

    const iterations = 7;
    for (let i = 0; i < iterations; i += 1) {
      solveCenterCoupling(this.center, this.inner, this.restInnerRadius, 0.58);
      solveRing(this.inner, 0.76, this.restInnerRadius * (Math.PI * 2) / this.inner.length);
      solveRing(this.outer, 0.68, this.restOuterRadius * (Math.PI * 2) / this.outer.length);
      for (let j = 0; j < this.inner.length; j += 1) {
        solveDistance(this.inner[j], this.outer[j], this.restOuterRadius - this.restInnerRadius, 0.72);
        solveDistance(this.inner[j], this.outer[(j + 1) % this.outer.length], this.restOuterRadius - this.restInnerRadius, 0.18);
        solveDistance(this.inner[j], this.outer[(j + this.outer.length - 1) % this.outer.length], this.restOuterRadius - this.restInnerRadius, 0.18);
      }
      solveShear(this.inner, this.outer, 0, 0.14, 1);
      solveShear(this.inner, this.outer, 1, 0.08, 1);
      solveRadialMemory(this.center, this.inner, this.innerAngles, this.restInnerRadii, 0.15);
      solveRadialMemory(this.center, this.outer, this.outerAngles, this.restOuterRadii, 0.1);
      clampNodeRadius(this.center, this.inner[0], this.restInnerRadius * 0.6, this.restOuterRadius * 1.02);
      applyAreaConstraint(this.outer, this.restOuterArea, 0.7);
      applyAreaConstraint(this.inner, this.restInnerArea, 0.28);
      const outerArea = Math.abs(computeArea(this.outer));
      this.compression = areaToPressure(this.restOuterArea, outerArea);
      applyPressure(this.outer, this.compression, 18);
      applyPropagation(this.outer, 0.6);
      applyPressure(this.inner, this.compression * 0.5, 7);
      if (!pointer.active) {
        solveCenterSpring(this.center, this.homeX, this.homeY, 0.02);
      }
    }

    this.syncCenter();
    this.computeRadii();
  }

  private applyPointer(x: number, y: number, prevX: number, prevY: number, pressure: number): void {
    const cursor = { x, y };
    const deltaX = x - prevX;
    const deltaY = y - prevY;
    const targets = [...this.inner, ...this.outer];
    const radius = 140;
    for (const node of targets) {
      const dx = node.x - cursor.x;
      const dy = node.y - cursor.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        continue;
      }
      const falloff = Math.pow(1 - dist / radius, 2.2);
      const follow = pressure * falloff * 0.08;
      const squeeze = pressure * falloff * 0.16;
      node.x += deltaX * follow;
      node.y += deltaY * follow;
      node.x += (cursor.x - node.x) * squeeze;
      node.y += (cursor.y - node.y) * squeeze;
    }
    this.center.x += deltaX * 0.004;
    this.center.y += deltaY * 0.004;
  }

  private syncCenter(): void {
    const center = centroid(this.outer);
    this.center.x += (center.x - this.center.x) * 0.06;
    this.center.y += (center.y - this.center.y) * 0.06;
  }

  private computeRadii(): void {
    let sum = 0;
    for (const node of this.outer) {
      sum += distance(this.center, node);
    }
    this.avgOuterRadius = sum / this.outer.length;
  }
}
